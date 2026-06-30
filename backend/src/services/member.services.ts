import { PrismaClient, MemberStatus, TransactionType, TransactionStatus } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { resend } from "../lib/resend.js";

export class MemberServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listMembers(groupId: string, requesterId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== requesterId) {
      throw new AppError("Apenas o líder pode ver a lista de membros", 403);
    }

    return this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });
  }

  async updateMemberStatus(
    groupId: string,
    memberId: string,
    ownerId: string,
    status: MemberStatus,
  ) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode alterar o status dos membros", 403);
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.groupId !== groupId) {
      throw new AppError("Membro não encontrado neste grupo", 404);
    }

    if (member.userId === ownerId) {
      throw new AppError("O líder não pode alterar seu próprio status", 400);
    }

    return this.prisma.groupMember.update({
      where: { id: memberId },
      data: { status },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async removeMember(groupId: string, memberId: string, ownerId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.ownerId !== ownerId) {
      throw new AppError("Apenas o líder pode remover membros", 403);
    }

    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { email: true } } },
    });

    if (!member || member.groupId !== groupId) {
      throw new AppError("Membro não encontrado neste grupo", 404);
    }

    if (member.userId === ownerId) {
      throw new AppError("O líder não pode remover a si mesmo do grupo", 400);
    }

    const price = Number(group.pricePerSlot);
    const inEscrow = member.status === "PENDING_CREDENTIALS" || 
                     (member.status === "ACTIVE" && member.escrowReleasedAt !== null);

    if (inEscrow) {
      // Estorna o saldo para o membro
      let memberWallet = await this.prisma.wallet.findUnique({
        where: { userId: member.userId },
      });

      if (!memberWallet) {
        memberWallet = await this.prisma.wallet.create({
          data: { userId: member.userId, balance: 0 },
        });
      }

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: memberWallet.id },
          data: { balance: { increment: price } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: memberWallet.id,
            amount: price,
            type: TransactionType.CREDIT,
            status: TransactionStatus.CONFIRMED,
            description: `Estorno de entrada (removido pelo líder) — Grupo: ${group.name}`,
          },
        }),
        this.prisma.groupMember.delete({ where: { id: memberId } }),
        this.prisma.notification.create({
          data: {
            userId: member.userId,
            title: "Removido do Grupo",
            message: `Você foi removido do grupo "${group.name}". Como a transação ainda estava sob custódia de 48h, o valor de R$ ${price.toFixed(2)} foi estornado para sua carteira.`,
            type: "URGENT",
          },
        }),
      ]);
    } else {
      // Remoção simples (período de custódia já passou)
      await this.prisma.$transaction([
        this.prisma.groupMember.delete({ where: { id: memberId } }),
        this.prisma.notification.create({
          data: {
            userId: member.userId,
            title: "Assinatura Encerrada",
            message: `Sua assinatura no grupo "${group.name}" foi encerrada pelo líder do grupo.`,
            type: "INFO",
          },
        }),
      ]);
    }
  }

  /**
   * Entrar em grupo via token de convite — com verificação de saldo e escrow
   */
  async joinGroup(token: string, userId: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: {
          include: {
            _count: { select: { members: { where: { status: "ACTIVE" } } } },
          },
        },
      },
    });

    if (!invite) {
      throw new AppError("Convite inválido", 404);
    }

    if (invite.usedAt) {
      throw new AppError("Este convite já foi utilizado", 400);
    }

    if (invite.expiresAt < new Date()) {
      throw new AppError("Este convite expirou", 400);
    }

    if (invite.group._count.members >= invite.group.maxSlots) {
      throw new AppError("Este grupo não possui vagas disponíveis", 400);
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId } },
    });

    if (existingMember) {
      throw new AppError("Você já é membro deste grupo", 400);
    }

    return this._processJoin(
      userId,
      invite.groupId,
      Number(invite.group.pricePerSlot),
      invite.group.name,
      invite.group.ownerId,
      invite.id,
    );
  }

  /**
   * Entrar diretamente em um grupo — com verificação de saldo e escrow
   */
  async joinGroupDirectly(groupId: string, userId: string) {
    const group = await this.prisma.subscriptionGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    });

    if (!group) {
      throw new AppError("Grupo não encontrado", 404);
    }

    if (group.status !== "ACTIVE") {
      throw new AppError("Este grupo não está ativo", 400);
    }

    if (group.ownerId === userId) {
      throw new AppError("O líder não pode entrar no próprio grupo como membro", 400);
    }

    if (group._count.members >= group.maxSlots) {
      throw new AppError("Este grupo não possui vagas disponíveis", 400);
    }

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (existingMember) {
      throw new AppError("Você já é membro deste grupo", 400);
    }

    return this._processJoin(
      userId,
      groupId,
      Number(group.pricePerSlot),
      group.name,
      group.ownerId,
      null,
    );
  }

  /**
   * Lógica central de entrada: debita saldo, cria membro em custódia, notifica líder
   */
  private async _processJoin(
    userId: string,
    groupId: string,
    price: number,
    groupName: string,
    ownerId: string,
    inviteId: string | null,
  ) {
    // 1. Verificar saldo do membro
    let memberWallet = await this.prisma.wallet.findUnique({ where: { userId } });

    // Criar carteira se não existir
    if (!memberWallet) {
      memberWallet = await this.prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    const balance = Number(memberWallet.balance);

    if (balance < price) {
      throw new AppError(
        `Saldo insuficiente. Você possui R$ ${balance.toFixed(2)} e precisa de R$ ${price.toFixed(2)} para entrar neste grupo.`,
        402,
      );
    }

    // 2. Definir datas
    const now = new Date();
    const escrowReleasedAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h
    const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dias

    // 3. Transação atômica: debita saldo + cria membro
    const [, , member] = await this.prisma.$transaction([
      // Debita saldo do membro (custódia — não repassa ao líder ainda)
      this.prisma.wallet.update({
        where: { id: memberWallet.id },
        data: { balance: { decrement: price } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: memberWallet.id,
          amount: price,
          type: TransactionType.DEBIT,
          status: TransactionStatus.CONFIRMED,
          description: `Entrada no grupo "${groupName}" (em custódia por 48h)`,
        },
      }),
      // Cria membro com status PENDING_CREDENTIALS
      this.prisma.groupMember.create({
        data: {
          groupId,
          userId,
          status: "PENDING_CREDENTIALS" as MemberStatus,
          nextBillingDate,
          escrowReleasedAt,
        } as Parameters<typeof this.prisma.groupMember.create>[0]["data"],
        include: { group: true },
      }),
    ]);

    // 4. Se entrou via convite, marcar como usado (separado para evitar erros de tipo no $transaction)
    if (inviteId) {
      await this.prisma.groupInvite.update({
        where: { id: inviteId },
        data: { usedAt: now },
      });
    }

    // 5. Notificar o líder via e-mail (fire-and-forget)
    const [owner, newMemberUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: ownerId }, select: { email: true, name: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);

    if (owner?.email) {
      const appUrl = process.env.APP_URL ?? "http://localhost:5173";
      resend.emails.send({
        from: "noreply@resend.dev",
        to: owner.email,
        subject: `🎉 Novo membro no grupo "${groupName}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #1a1a1a;">Novo membro entrou no seu grupo!</h2>
            <p>O usuário <strong>${newMemberUser?.email ?? "Desconhecido"}</strong> acabou de entrar no grupo <strong>"${groupName}"</strong>.</p>
            <p>O pagamento de <strong>R$ ${price.toFixed(2)}</strong> foi recebido e está em <strong>custódia por 48 horas</strong>.</p>
            <p>Para liberar o pagamento para sua carteira, <strong>cadastre as credenciais de acesso</strong> (e-mail/senha ou link de convite) no painel do grupo. O membro terá 48h para confirmar o acesso.</p>
            <a href="${appUrl}/groups/${groupId}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Cadastrar Credenciais Agora →
            </a>
            <p style="margin-top: 24px; font-size: 12px; color: #999;">Se o membro não receber acesso dentro de 48h, o valor será estornado automaticamente.</p>
          </div>
        `,
      }).catch((err: unknown) => {
        console.error("Erro ao enviar e-mail ao líder:", err);
      });

      // Adicionar notificação no app para o líder
      await this.prisma.notification.create({
        data: {
          userId: ownerId,
          title: "Novo Membro",
          message: `O usuário ${newMemberUser?.email ?? "Desconhecido"} entrou no grupo "${groupName}". Cadastre as credenciais para liberar o pagamento de R$ ${price.toFixed(2)}.`,
          type: "URGENT",
          link: `/groups/${groupId}`,
        },
      });
    }

    return member;
  }

  async leaveGroup(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: {
        group: true,
        user: { select: { email: true } },
      },
    });

    if (!member) {
      throw new AppError("Você não é membro deste grupo", 404);
    }

    if (member.group.ownerId === userId) {
      throw new AppError("O líder não pode sair do grupo. Se desejar, você pode excluir o grupo.", 400);
    }

    const price = Number(member.group.pricePerSlot);
    const inEscrow = member.status === "PENDING_CREDENTIALS" || 
                     (member.status === "ACTIVE" && member.escrowReleasedAt !== null);

    if (inEscrow) {
      // Estorna 100% do valor para o membro
      let memberWallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      if (!memberWallet) {
        memberWallet = await this.prisma.wallet.create({
          data: { userId, balance: 0 },
        });
      }

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: memberWallet.id },
          data: { balance: { increment: price } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: memberWallet.id,
            amount: price,
            type: TransactionType.CREDIT,
            status: TransactionStatus.CONFIRMED,
            description: `Reembolso por cancelamento (saída voluntária) — Grupo: ${member.group.name}`,
          },
        }),
        this.prisma.groupMember.delete({
          where: { id: member.id },
        }),
        // Notificação para o próprio membro
        this.prisma.notification.create({
          data: {
            userId,
            title: "Assinatura Cancelada",
            message: `Você saiu do grupo "${member.group.name}". Como o acesso ainda estava em período de custódia, o valor de R$ ${price.toFixed(2)} foi estornado para sua carteira.`,
            type: "URGENT",
          },
        }),
        // Notificação para o líder
        this.prisma.notification.create({
          data: {
            userId: member.group.ownerId,
            title: "Membro saiu do grupo",
            message: `O membro ${member.user.email} cancelou a assinatura do grupo "${member.group.name}" durante a custódia. O valor correspondente foi devolvido a ele.`,
            type: "INFO",
          },
        }),
      ]);
    } else {
      // Apenas cancela a assinatura para o próximo ciclo (sem reembolso)
      await this.prisma.$transaction([
        this.prisma.groupMember.delete({
          where: { id: member.id },
        }),
        this.prisma.notification.create({
          data: {
            userId,
            title: "Assinatura Cancelada",
            message: `Você saiu do grupo "${member.group.name}". A sua assinatura foi encerrada com sucesso e não haverá novas cobranças.`,
            type: "INFO",
          },
        }),
        this.prisma.notification.create({
          data: {
            userId: member.group.ownerId,
            title: "Membro saiu do grupo",
            message: `O membro ${member.user.email} cancelou a assinatura do grupo "${member.group.name}". A vaga dele está disponível para novos membros.`,
            type: "INFO",
          },
        }),
      ]);
    }
  }
}
