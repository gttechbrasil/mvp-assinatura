import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { resend } from "../lib/resend.js";

export class InviteServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createInvite(groupId: string, ownerId: string, email?: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode criar convites", 403);
    }

    if (group._count.members >= group.maxSlots) {
      throw new AppError(
        "O grupo não possui vagas disponíveis para novos convites",
        400,
      );
    }

    // Expiração: 7 dias
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.groupInvite.create({
      data: {
        groupId,
        email: email ?? null,
        expiresAt,
      },
    });

    if (email) {
      try {
        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: `Convite para o grupo "${group.name}"`,
          html: `<p>Você foi convidado para o grupo <strong>${group.name}</strong>!</p><p>Acesse o link para participar: <a href="${process.env.APP_URL}/join/${invite.token}">${process.env.APP_URL}/join/${invite.token}</a></p>`,
        });
      } catch (err) {
        console.error("Erro ao enviar e-mail de convite com Resend:", err);
      }
    }

    return invite;
  }

  async listInvites(groupId: string, ownerId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode ver os convites", 403);
    }

    return this.prisma.groupInvite.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: {
          include: {
            owner: { select: { id: true, email: true } },
            _count: { select: { members: { where: { status: "ACTIVE" } } } },
          },
        },
      },
    });

    if (!invite) {
      throw new AppError("Convite não encontrado", 404);
    }

    return invite;
  }

  async revokeInvite(inviteId: string, ownerId: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { id: inviteId },
      include: { group: true },
    });

    if (!invite) {
      throw new AppError("Convite não encontrado", 404);
    }

    if (invite.group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode revogar convites", 403);
    }

    await this.prisma.groupInvite.delete({ where: { id: inviteId } });
  }
}
