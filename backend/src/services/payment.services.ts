import {
  PrismaClient,
  TransactionType,
  TransactionStatus,
  WithdrawalStatus,
  MemberStatus,
} from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { asaas } from "../lib/asaas.js";

export class PaymentServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Obtém ou cria uma carteira para o usuário
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0.0,
        },
      });
    }

    return wallet;
  }

  /**
   * Obtém o saldo e o histórico de transações da carteira do usuário
   */
  async getWalletDetails(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);

    // Soma das mensalidades dos grupos ativos que o usuário participa (como membro, não dono)
    const memberships = await this.prisma.groupMember.findMany({
      where: {
        userId,
        status: MemberStatus.ACTIVE,
      },
      include: {
        group: true,
      },
    });
    const activeSubscriptions = memberships.filter(
      (m) => m.group.ownerId !== userId,
    );
    const lockedInGroups = activeSubscriptions.reduce(
      (sum, m) => sum + Number(m.group.pricePerSlot),
      0,
    );

    const transactions = await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const withdrawals = await this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Pix pendente gerado pelo usuário (pendente de pagamento)
    const pendingDeposits = transactions
      .filter(
        (t: any) =>
          t.type === TransactionType.CREDIT &&
          t.status === TransactionStatus.PENDING,
      )
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    return {
      balance: Number(wallet.balance),
      lockedInGroups,
      pendingDeposits,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        pixKey: w.pixKey,
        status: w.status,
        createdAt: w.createdAt,
      })),
    };
  }

  /**
   * Solicita a inserção de créditos via Asaas (PIX)
   */
  async addCreditsRequest(userId: string, amount: number) {
    if (amount <= 0) {
      throw new AppError("O valor deve ser maior que zero", 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    if (!user.document) {
      throw new AppError(
        "CPF ou CNPJ é obrigatório no perfil para realizar recargas.",
        400,
      );
    }

    // 1. Garantir que o usuário tem um Customer ID no Asaas
    let asaasCustomerId = user.asaasCustomerId;
    if (!asaasCustomerId) {
      const customer = await asaas.createCustomer({
        name: user.name || user.email.split("@")[0],
        email: user.email,
        phone: user.phone || undefined,
        cpfCnpj: user.document,
      });
      asaasCustomerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { asaasCustomerId },
      });
    } else {
      // Sempre atualizar o cadastro do cliente no Asaas para garantir que o CPF esteja atualizado.
      // Enviamos apenas o cpfCnpj para evitar que números de telefone inválidos/de teste causem falha na atualização.
      try {
        await asaas.updateCustomer(asaasCustomerId, {
          cpfCnpj: user.document,
        });
      } catch (err) {
        console.warn(
          `⚠️ Erro ao atualizar o cliente ${asaasCustomerId} no Asaas:`,
          err,
        );
      }
    }

    // 2. Criar a cobrança no Asaas
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vence amanhã

    const payment = await asaas.createPayment({
      customerId: asaasCustomerId,
      amount,
      billingType: "PIX",
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Recarga de créditos - Plataforma MVP`,
    });

    // 3. Obter dados do QR Code do Pix
    const pixData = await asaas.getPixQrCode(payment.id);

    // 4. Criar transação pendente no banco de dados
    const wallet = await this.getOrCreateWallet(userId);
    await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: TransactionType.CREDIT,
        status: TransactionStatus.PENDING,
        description: `Recarga de créditos (Pix)`,
        asaasPaymentId: payment.id,
      },
    });

    return {
      paymentId: payment.id,
      amount,
      invoiceUrl: payment.invoiceUrl,
      pixCopyPaste: pixData.payload,
      pixQrCodeBase64: pixData.encodedImage,
    };
  }

  /**
   * Confirmação de recebimento de pagamento via webhook
   */
  async confirmCredit(asaasPaymentId: string, amount: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { asaasPaymentId, status: TransactionStatus.PENDING },
    });

    if (!transaction) {
      console.warn(
        `⚠️ Transação pendente não encontrada para o pagamento Asaas: ${asaasPaymentId}`,
      );
      return;
    }

    // Validar se o valor recebido no webhook bate com o valor da transação no banco
    if (Math.abs(Number(transaction.amount) - amount) > 0.01) {
      throw new AppError(
        `Divergência de valor no pagamento: esperado R$ ${Number(transaction.amount).toFixed(2)}, recebido R$ ${amount.toFixed(2)}`,
        400,
      );
    }

    await this.prisma.$transaction([
      // Confirmar a transação
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.CONFIRMED },
      }),
      // Incrementar o saldo da carteira correspondente
      this.prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: amount } },
      }),
    ]);

    console.log(
      `✅ Saldo creditado com sucesso para a transação ${transaction.id}. Valor: R$ ${amount}`,
    );

    // Reativação automática pós-recarga
    try {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: transaction.walletId },
      });
      if (wallet) {
        await this.reactivateBlockedMembershipsForUser(wallet.userId);
      }
    } catch (err) {
      console.error("Erro na reativação automática pós-recarga:", err);
    }
  }

  async reactivateBlockedMembershipsForUser(userId: string) {
    const blockedMemberships = await this.prisma.groupMember.findMany({
      where: {
        userId,
        status: MemberStatus.BLOCKED,
      },
      include: {
        group: true,
      },
      orderBy: { joinedAt: "asc" },
    });

    if (blockedMemberships.length === 0) return;

    console.log(
      `[Reativação] Detectadas ${blockedMemberships.length} assinaturas bloqueadas para o usuário ${userId}`,
    );

    for (const member of blockedMemberships) {
      const price = Number(member.group.pricePerSlot);
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.balance) < price) {
        console.log(
          `[Reativação] Saldo insuficiente para reativar o grupo ${member.group.name}. Saldo: ${wallet?.balance}, Requerido: ${price}`,
        );
        break;
      }

      const leaderWallet = await this.getOrCreateWallet(member.group.ownerId);
      const now = new Date();
      const commissionRate = 0.1;
      const platformFee = price * commissionRate;
      const leaderAmount = price - platformFee;

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: price } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: wallet.id,
            amount: price,
            type: TransactionType.DEBIT,
            status: TransactionStatus.CONFIRMED,
            description: `Mensalidade grupo: ${member.group.name} (Reativação automática)`,
          },
        }),
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
            description: `Repasse mensalidade membro (Reativação automática) - Grupo: ${member.group.name}`,
          },
        }),
        this.prisma.groupMember.update({
          where: { id: member.id },
          data: {
            status: MemberStatus.ACTIVE,
            lastBillingDate: now,
            nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      await this.prisma.notification.create({
        data: {
          userId,
          title: "Assinatura Reativada",
          message: `Sua assinatura do grupo ${member.group.name} foi reativada com sucesso.`,
          type: "INFO",
          link: `/groups/${member.groupId}`,
        },
      });

      console.log(
        `[Reativação] Assinatura do grupo ${member.group.name} reativada com sucesso para o usuário ${userId}`,
      );
    }
  }

  async reactivateBlockedMembership(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: { group: true },
    });

    if (!member) {
      throw new AppError("Membro não encontrado neste grupo", 404);
    }

    if (member.status !== MemberStatus.BLOCKED) {
      throw new AppError("Esta assinatura não está suspensa ou bloqueada", 400);
    }

    const price = Number(member.group.pricePerSlot);
    const memberWallet = await this.getOrCreateWallet(userId);
    const leaderWallet = await this.getOrCreateWallet(member.group.ownerId);

    if (Number(memberWallet.balance) < price) {
      throw new AppError(
        `Saldo insuficiente para reativação. Você possui R$ ${Number(memberWallet.balance).toFixed(2)} e precisa de R$ ${price.toFixed(2)}.`,
        402,
      );
    }

    const now = new Date();
    const commissionRate = 0.1;
    const platformFee = price * commissionRate;
    const leaderAmount = price - platformFee;

    await this.prisma.$transaction([
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
          description: `Mensalidade grupo: ${member.group.name} (Reativação manual)`,
        },
      }),
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
          description: `Repasse mensalidade membro (Reativação manual) - Grupo: ${member.group.name}`,
        },
      }),
      this.prisma.groupMember.update({
        where: { id: member.id },
        data: {
          status: MemberStatus.ACTIVE,
          lastBillingDate: now,
          nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { success: true };
  }

  /**
   * Solicitação de Saque pelo líder
   */
  async requestWithdrawal(userId: string, amount: number, pixKey: string) {
    if (amount <= 0) {
      throw new AppError("O valor de saque deve ser maior que zero", 400);
    }

    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < amount) {
      throw new AppError("Saldo insuficiente para saque", 400);
    }

    // Criar solicitação e debitar provisoriamente da carteira
    const [request] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.create({
        data: {
          userId,
          amount,
          pixKey,
          status: WithdrawalStatus.PENDING,
        },
      }),
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.DEBIT,
          status: TransactionStatus.CONFIRMED,
          description: `Solicitação de saque PIX (Pendente)`,
        },
      }),
    ]);

    return request;
  }

  /**
   * Listagem de saques pendentes (para Admin)
   */
  async listPendingWithdrawals() {
    return this.prisma.withdrawalRequest.findMany({
      where: { status: WithdrawalStatus.PENDING },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Aprovação de Saque (efetiva transferência)
   */
  async approveWithdrawal(requestId: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new AppError("Solicitação de saque não encontrada", 404);
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new AppError("Esta solicitação já foi processada", 400);
    }

    let transferId: string | null = null;

    try {
      // Disparar transferência PIX real via Asaas Sandbox
      // Chave tipo EVP como padrão ou adivinhar pelo formato
      let keyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP" = "EVP";
      const cleanedKey = request.pixKey.trim();
      if (cleanedKey.includes("@")) keyType = "EMAIL";
      else if (/^\d{11}$/.test(cleanedKey)) keyType = "CPF";
      else if (/^\d{14}$/.test(cleanedKey)) keyType = "CNPJ";
      else if (/^\+?\d{10,13}$/.test(cleanedKey)) keyType = "PHONE";

      const transfer = await asaas.createTransfer(
        Number(request.amount),
        cleanedKey,
        keyType,
      );
      transferId = transfer.id;
    } catch (error) {
      console.error(
        "Falha ao automatizar transferência no Asaas. Marcando aprovação manual.",
        error,
      );
    }

    return this.prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: WithdrawalStatus.APPROVED,
        asaasTransferId: transferId,
      },
    });
  }

  /**
   * Rejeição de Saque (devolve o dinheiro à carteira)
   */
  async rejectWithdrawal(requestId: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new AppError("Solicitação de saque não encontrada", 404);
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new AppError("Esta solicitação já foi processada", 400);
    }

    const wallet = await this.getOrCreateWallet(request.userId);

    await this.prisma.$transaction([
      // Devolver o saldo para a carteira
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: request.amount } },
      }),
      // Criar transação de estorno
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: request.amount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.CONFIRMED,
          description: `Estorno de saque rejeitado`,
        },
      }),
      // Alterar status da requisição
      this.prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: { status: WithdrawalStatus.REJECTED },
      }),
    ]);
  }

  /**
   * Executa a cobrança mensal das assinaturas ativas de grupos
   */
  async processRecurringSubscriptions() {
    const now = new Date();

    // Selecionar todos os membros ativos que já passaram da data de cobrança
    const allMembersToCharge = await this.prisma.groupMember.findMany({
      where: {
        status: { in: [MemberStatus.ACTIVE, MemberStatus.BLOCKED] },
        nextBillingDate: { lte: now },
      },
      include: {
        group: true,
      },
    });

    const membersToCharge = allMembersToCharge.filter(
      (m) =>
        m.userId !== m.group.ownerId &&
        (m.status as string) !== "PENDING_CREDENTIALS" &&
        (m.status as string) !== "PENDING_PAYMENT",
    );

    let successCount = 0;
    let blockCount = 0;

    for (const member of membersToCharge) {
      const price = Number(member.group.pricePerSlot);

      const memberWallet = await this.getOrCreateWallet(member.userId);
      const leaderWallet = await this.getOrCreateWallet(member.group.ownerId);

      if (Number(memberWallet.balance) >= price) {
        // Possui saldo: Cobrar e repassar ao líder
        const commissionRate = 0.1; // Taxa da plataforma de 10%
        const platformFee = price * commissionRate;
        const leaderAmount = price - platformFee;

        await this.prisma.$transaction([
          // Debita do membro
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
              description: `Mensalidade grupo: ${member.group.name}`,
            },
          }),
          // Credita ao líder
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
              description: `Repasse mensalidade membro - Grupo: ${member.group.name}`,
            },
          }),
          // Atualiza status do membro e estende a próxima cobrança por 30 dias
          this.prisma.groupMember.update({
            where: { id: member.id },
            data: {
              status: MemberStatus.ACTIVE,
              lastBillingDate: now,
              nextBillingDate: new Date(
                now.getTime() + 30 * 24 * 60 * 60 * 1000,
              ), // +30 dias
            },
          }),
        ]);

        successCount++;
      } else {
        // Saldo insuficiente: Bloqueia o membro
        await this.prisma.$transaction([
          this.prisma.groupMember.update({
            where: { id: member.id },
            data: {
              status: MemberStatus.BLOCKED,
            },
          }),
          this.prisma.notification.create({
            data: {
              userId: member.userId,
              title: "Assinatura Suspensa",
              message: `Sua assinatura do grupo ${member.group.name} foi suspensa por falta de saldo. Recarregue sua carteira para reativar o acesso.`,
              type: "URGENT",
              link: `/groups/${member.groupId}`,
            },
          }),
        ]);

        blockCount++;
      }
    }

    return {
      totalProcessed: membersToCharge.length,
      success: successCount,
      blocked: blockCount,
    };
  }

  /**
   * Cancelamento de Saque pelo próprio usuário (devolve o dinheiro à carteira)
   */
  async cancelWithdrawal(requestId: string, userId: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new AppError("Solicitação de saque não encontrada", 404);
    }

    if (request.userId !== userId) {
      throw new AppError(
        "Apenas o próprio usuário pode cancelar esta solicitação",
        403,
      );
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new AppError(
        "Esta solicitação já foi processada e não pode ser cancelada",
        400,
      );
    }

    const wallet = await this.getOrCreateWallet(userId);

    await this.prisma.$transaction([
      // Devolver o saldo para a carteira
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: request.amount } },
      }),
      // Criar transação de estorno
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: request.amount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.CONFIRMED,
          description: `Estorno de saque cancelado pelo usuário`,
        },
      }),
      // Alterar status da requisição
      this.prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: { status: WithdrawalStatus.CANCELLED },
      }),
    ]);
  }

  /**
   * Obtém o status de uma transação pelo ID do Asaas
   */
  async getTransactionStatusByAsaasId(asaasPaymentId: string): Promise<string> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { asaasPaymentId },
      select: { status: true },
    });
    return transaction ? transaction.status : "NOT_FOUND";
  }
}
