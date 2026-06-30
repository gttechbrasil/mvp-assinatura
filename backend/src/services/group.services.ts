import { PrismaClient, GroupStatus, MemberStatus } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { resend } from "../lib/resend.js";

interface CreateGroupData {
  name: string;
  description?: string;
  service: string;
  maxSlots: number;
  pricePerSlot: number;
  categoryId?: string;
}

interface UpdateGroupData {
  name?: string;
  description?: string;
  service?: string;
  maxSlots?: number;
  pricePerSlot?: number;
  status?: GroupStatus;
  categoryId?: string;
}

export class GroupServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createGroup(ownerId: string, data: CreateGroupData) {
    if (data.categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!categoryExists) {
        throw new AppError("Categoria selecionada inválida", 400);
      }
    }

    const group = await this.prisma.subscriptionGroup.create({
      data: {
        ...data,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            status: "ACTIVE",
          },
        },
      },
      include: {
        members: true,
        category: true,
      },
    });

    return group;
  }

  async listGroupsByOwner(ownerId: string) {
    return this.prisma.subscriptionGroup.findMany({
      where: { ownerId },
      include: {
        category: true,
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async listGroupsByMember(userId: string) {
    return this.prisma.subscriptionGroup.findMany({
      where: {
        members: {
          some: { userId, status: "ACTIVE" },
        },
        ownerId: { not: userId },
      },
      include: {
        owner: { select: { id: true, email: true } },
        category: true,
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getGroupById(groupId: string, requesterId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: { id: true, email: true, name: true, phone: true, created_at: true, avatarUrl: true } },
        category: true,
        members: {
          include: { user: { select: { id: true, email: true, avatarUrl: true } } },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    const isMember = group.members.some((m) => m.userId === requesterId);
    const isOwner = group.ownerId === requesterId;
    const myMembership = group.members.find((m) => m.userId === requesterId);
    // Credentials only visible to owner or ACTIVE members (not PENDING_CREDENTIALS)
    const canSeeCredentials = isOwner || myMembership?.status === "ACTIVE";

    if (!isMember && !isOwner && group.status !== "ACTIVE") {
      throw new AppError("Acesso não autorizado a este grupo", 403);
    }

    const cleanMembers = (isMember || isOwner)
      ? group.members
      : group.members.map((m) => ({
          ...m,
          user: {
            id: m.user.id,
            email: m.user.email.replace(/(..)(.*)(@.*)/, "$1***$3"),
            avatarUrl: m.user.avatarUrl,
          },
        }));

    return {
      ...group,
      // Hide credentials from visitors and PENDING_CREDENTIALS members
      credentials: canSeeCredentials ? (group as typeof group & { credentials?: string | null }).credentials : null,
      members: cleanMembers,
      isOwner,
      isMember,
      myMemberStatus: myMembership?.status ?? null,
    };
  }

  async updateGroup(groupId: string, ownerId: string, data: UpdateGroupData) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: { where: { status: { not: "INACTIVE" } } } } },
      },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode editar este grupo", 403);
    }

    if (
      data.pricePerSlot !== undefined &&
      Number(data.pricePerSlot) !== Number(group.pricePerSlot) &&
      group._count.members > 0
    ) {
      throw new AppError("O valor da mensalidade não pode ser alterado após a entrada de membros", 400);
    }

    if (data.categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!categoryExists) {
        throw new AppError("Categoria selecionada inválida", 400);
      }
    }

    return this.prisma.subscriptionGroup.update({
      where: { id: groupId },
      data,
      include: {
        category: true,
      },
    });
  }

  async deleteGroup(groupId: string, ownerId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: { where: { status: { not: "INACTIVE" }, userId: { not: ownerId } } } } },
      },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode excluir este grupo", 403);
    }

    if (group._count.members > 0) {
      throw new AppError(
        "Não é possível excluir um grupo que possui membros ativos ou pendentes. Remova-os primeiro.",
        400,
      );
    }

    await this.prisma.subscriptionGroup.delete({ where: { id: groupId } });
  }

  async listAllActiveGroups(categoryId?: string) {
    return this.prisma.subscriptionGroup.findMany({
      where: {
        status: "ACTIVE",
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        owner: { select: { id: true, email: true } },
        category: true,
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async recordView(userId: string, groupId: string) {
    return this.prisma.groupView.upsert({
      where: { userId_groupId: { userId, groupId } },
      create: { userId, groupId },
      update: { viewedAt: new Date() },
    });
  }

  async getRecentlyViewed(userId: string, limit = 10) {
    const views = await this.prisma.groupView.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: limit,
      include: {
        group: {
          include: {
            category: true,
            _count: { select: { members: { where: { status: "ACTIVE" } } } },
          },
        },
      },
    });
    return views.map((v) => v.group);
  }

  /**
   * O líder cadastra as credenciais de acesso do grupo.
   * Ao salvar, todos os membros PENDING_CREDENTIALS são ativados e notificados.
   */
  async updateCredentials(groupId: string, ownerId: string, credentials: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode cadastrar as credenciais", 403);
    }

    // Salvar as credenciais
    await this.prisma.subscriptionGroup.update({
      where: { id: groupId },
      data: { credentials } as Parameters<typeof this.prisma.subscriptionGroup.update>[0]["data"],
    });

    // Ativar todos os membros PENDING_CREDENTIALS deste grupo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingMembers = await (this.prisma.groupMember as any).findMany({
      where: {
        groupId,
        status: "PENDING_CREDENTIALS",
      },
      include: { user: { select: { id: true, email: true } } },
    }) as Array<{ id: string; user: { id: string; email: string } }>;

    if (pendingMembers.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma.groupMember as any).updateMany({
        where: {
          groupId,
          status: "PENDING_CREDENTIALS",
        },
        data: { status: "ACTIVE" },
      });

      // Notificar cada membro que as credenciais estão disponíveis
      const appUrl = process.env.APP_URL ?? "http://localhost:5173";
      for (const member of pendingMembers) {
        resend.emails.send({
          from: "noreply@resend.dev",
          to: member.user.email,
          subject: `🔑 Credenciais disponíveis — Grupo "${group.name}"`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
              <h2 style="color: #1a1a1a;">Suas credenciais de acesso estão prontas!</h2>
              <p>O líder do grupo <strong>"${group.name}"</strong> acabou de cadastrar as credenciais de acesso.</p>
              <p>Você já pode visualizar os dados de acesso e começar a usar sua assinatura compartilhada.</p>
              <a href="${appUrl}/groups/${groupId}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Ver Credenciais Agora →
              </a>
              <p style="margin-top: 24px; font-size: 12px; color: #999;">Se você tiver algum problema com o acesso, entre em contato através da plataforma.</p>
            </div>
          `,
        }).catch((err: unknown) => {
          console.error(`Erro ao notificar membro ${member.user.email}:`, err);
        });

        // Adicionar notificação no app
        await this.prisma.notification.create({
          data: {
            userId: member.user.id,
            title: "Credenciais Disponíveis",
            message: `O líder do grupo "${group.name}" cadastrou as credenciais de acesso.`,
            type: "URGENT",
            link: `/groups/${groupId}`,
          },
        });
      }
    }

    return { activatedCount: pendingMembers.length };
  }
}

