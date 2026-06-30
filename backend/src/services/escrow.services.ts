import { PrismaClient, TransactionType, TransactionStatus } from "@prisma/client";
import { resend } from "../lib/resend.js";

const PLATFORM_FEE_RATE = 0.10; // 10% de comissão da plataforma

export class EscrowServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Libera os pagamentos em custódia cujo prazo de 48h já venceu.
   * Deve ser executado periodicamente (ex: via job agendado ou endpoint admin).
   */
  async releaseEscrow() {
    const now = new Date();

    // Buscar membros ATIVOS com escrow ainda pendente (escrowReleasedAt <= agora)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersToRelease = await (this.prisma.groupMember as any).findMany({
      where: {
        status: "ACTIVE",
        escrowReleasedAt: { lte: now, not: null },
      },
      include: {
        group: { select: { id: true, name: true, pricePerSlot: true, ownerId: true } },
        user: { select: { id: true, email: true } },
      },
    }) as Array<{
      id: string;
      status: string;
      escrowReleasedAt: Date | null;
      group: { id: string; name: string; pricePerSlot: unknown; ownerId: string };
      user: { id: string; email: string };
    }>;

    const eligible = membersToRelease;

    let releasedCount = 0;

    for (const member of eligible) {
      const price = Number(member.group.pricePerSlot);
      const platformFee = price * PLATFORM_FEE_RATE;
      const leaderAmount = price - platformFee;

      // Obter ou criar carteira do líder
      let leaderWallet = await this.prisma.wallet.findUnique({
        where: { userId: member.group.ownerId },
      });

      if (!leaderWallet) {
        leaderWallet = await this.prisma.wallet.create({
          data: { userId: member.group.ownerId, balance: 0 },
        });
      }

      // Creditar líder + limpar escrowReleasedAt atomicamente
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: leaderWallet.id },
          data: { balance: { increment: leaderAmount } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: leaderWallet.id,
            amount: leaderAmount,
            type: TransactionType.CREDIT,
            status: TransactionStatus.CONFIRMED,
            description: `Repasse de entrada (custódia liberada) — Grupo: ${member.group.name}`,
          },
        }),
        // Limpar o campo escrowReleasedAt para evitar processamento duplo
        this.prisma.groupMember.update({
          where: { id: member.id },
          data: { escrowReleasedAt: null } as Parameters<typeof this.prisma.groupMember.update>[0]["data"],
        }),
      ]);

      releasedCount++;
      console.log(
        `✅ Escrow liberado — Grupo: "${member.group.name}" | Membro: ${member.user.email} | ` +
        `Repassado ao líder: R$ ${leaderAmount.toFixed(2)} (taxa da plataforma: R$ ${platformFee.toFixed(2)})`,
      );
    }

    return {
      processed: eligible.length,
      released: releasedCount,
    };
  }

  /**
   * Varre membros com status PENDING_CREDENTIALS com mais de 48h (escrowReleasedAt vencido)
   * e realiza o estorno automático para a carteira.
   */
  async handleEscrowTimeouts() {
    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersToTimeout = await (this.prisma.groupMember as any).findMany({
      where: {
        status: "PENDING_CREDENTIALS",
        escrowReleasedAt: { lte: now, not: null },
      },
      include: {
        group: { select: { id: true, name: true, pricePerSlot: true, ownerId: true } },
        user: { select: { id: true, email: true } },
      },
    }) as Array<{
      id: string;
      userId: string;
      group: { id: string; name: string; pricePerSlot: unknown; ownerId: string };
      user: { id: string; email: string };
    }>;

    let timeoutCount = 0;

    for (const member of membersToTimeout) {
      const price = Number(member.group.pricePerSlot);

      // Obter ou criar carteira do membro
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
            description: `Estorno automático: Líder não entregou credenciais no prazo — Grupo: ${member.group.name}`,
          },
        }),
        this.prisma.groupMember.delete({
          where: { id: member.id },
        }),
        this.prisma.notification.create({
          data: {
            userId: member.userId,
            title: "Compra Cancelada",
            message: `A sua entrada no grupo "${member.group.name}" foi cancelada e o valor de R$ ${price.toFixed(2)} foi estornado para sua carteira porque o líder não cadastrou as credenciais dentro do prazo de 48h.`,
            type: "URGENT",
          },
        }),
        this.prisma.notification.create({
          data: {
            userId: member.group.ownerId,
            title: "Entrada de Membro Cancelada",
            message: `A entrada do membro ${member.user.email} no grupo "${member.group.name}" foi cancelada e o valor reembolsado porque você não cadastrou as credenciais dentro do prazo de 48h.`,
            type: "URGENT",
          },
        }),
      ]);

      // Enviar e-mail de estorno para o membro (fire-and-forget)
      resend.emails.send({
        from: "noreply@resend.dev",
        to: member.user.email,
        subject: `⚠️ Compra cancelada por inatividade do líder — Grupo "${member.group.name}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <h2 style="color: #ea580c;">Sua compra foi cancelada e o valor estornado</h2>
            <p>Olá,</p>
            <p>Como o líder do grupo <strong>"${member.group.name}"</strong> não cadastrou as credenciais de acesso em até 48 horas após sua entrada, cancelamos a operação por segurança.</p>
            <p>O valor de <strong>R$ ${price.toFixed(2)}</strong> foi estornado integralmente para sua carteira digital na plataforma.</p>
            <p>Você pode usar esse saldo para entrar em outro grupo ou solicitar o saque de volta.</p>
            <p style="margin-top: 24px; font-size: 12px; color: #999;">Esta é uma mensagem automática de segurança do sistema.</p>
          </div>
        `,
      }).catch((err: unknown) => {
        console.error(`Erro ao notificar membro ${member.user.email} sobre timeout:`, err);
      });

      timeoutCount++;
    }

    return {
      processed: membersToTimeout.length,
      timedOut: timeoutCount,
    };
  }
}
