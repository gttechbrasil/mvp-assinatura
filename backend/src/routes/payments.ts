import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { PaymentServices } from "../services/payment.services.js";

const paymentServices = new PaymentServices(prisma);

export function paymentRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Aplica o middleware de auth em todas as rotas deste plugin
  app.addHook("preHandler", authMiddleware);

  // ─── Rotas do Usuário ──────────────────────────────────────────────────────

  // Obter saldo e histórico financeiro
  typedApp.get(
    "/balance",
    {
      schema: {
        tags: ["payments"],
        summary: "Obter saldo e histórico financeiro da conta",
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const details = await paymentServices.getWalletDetails(userId);
      return reply.send(details);
    }
  );

  // Iniciar recarga de créditos (Pix)
  typedApp.post(
    "/add-credits",
    {
      schema: {
        tags: ["payments"],
        summary: "Inserir créditos via Pix",
        body: z.object({
          amount: z.number().positive("O valor deve ser maior que zero"),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { amount } = request.body;

      const paymentData = await paymentServices.addCreditsRequest(userId, amount);
      return reply.send(paymentData);
    }
  );

  // Obter status de um pagamento específico
  typedApp.get(
    "/status/:paymentId",
    {
      schema: {
        tags: ["payments"],
        summary: "Obter status de um pagamento Pix específico",
        params: z.object({
          paymentId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { paymentId } = request.params;
      const status = await paymentServices.getTransactionStatusByAsaasId(paymentId);
      return reply.send({ status });
    }
  );

  // Solicitar saque de saldo
  typedApp.post(
    "/withdraw",
    {
      schema: {
        tags: ["payments"],
        summary: "Solicitar saque do saldo acumulado",
        body: z.object({
          amount: z.number().positive("O valor de saque deve ser maior que zero"),
          pixKey: z.string().min(4, "Chave Pix inválida"),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { amount, pixKey } = request.body;

      const requestWithdrawal = await paymentServices.requestWithdrawal(userId, amount, pixKey);
      return reply.send({
        message: "Solicitação de saque criada com sucesso",
        id: requestWithdrawal.id,
      });
    }
  );

  // Cancelar solicitação de saque
  typedApp.post(
    "/withdraw/:id/cancel",
    {
      schema: {
        tags: ["payments"],
        summary: "Cancelar uma solicitação de saque pendente",
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params;

      await paymentServices.cancelWithdrawal(id, userId);
      return reply.send({
        message: "Solicitação de saque cancelada com sucesso",
      });
    }
  );

  // ─── Rotas de Admin ────────────────────────────────────────────────────────

  // Listar solicitações de saque pendentes (Apenas Admins)
  typedApp.get(
    "/admin/withdrawals",
    {
      schema: {
        tags: ["payments-admin"],
        summary: "Listar solicitações de saque pendentes",
      },
    },
    async (request, reply) => {
      if (request.user.role !== "ADMIN") {
        return reply.status(403).send({ error: "Acesso restrito a administradores" });
      }

      const list = await paymentServices.listPendingWithdrawals();
      return reply.send(list);
    }
  );

  // Aprovar saque (Apenas Admins)
  typedApp.post(
    "/admin/withdrawals/:id/approve",
    {
      schema: {
        tags: ["payments-admin"],
        summary: "Aprovar uma solicitação de saque",
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      if (request.user.role !== "ADMIN") {
        return reply.status(403).send({ error: "Acesso restrito a administradores" });
      }

      const { id } = request.params;
      await paymentServices.approveWithdrawal(id);
      return reply.send({ message: "Saque aprovado e transferência realizada com sucesso" });
    }
  );

  // Rejeitar saque (Apenas Admins)
  typedApp.post(
    "/admin/withdrawals/:id/reject",
    {
      schema: {
        tags: ["payments-admin"],
        summary: "Rejeitar uma solicitação de saque",
        params: z.object({
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      if (request.user.role !== "ADMIN") {
        return reply.status(403).send({ error: "Acesso restrito a administradores" });
      }

      const { id } = request.params;
      await paymentServices.rejectWithdrawal(id);
      return reply.send({ message: "Saque rejeitado e saldo estornado para a carteira do usuário" });
    }
  );

  // Executar motor de cobrança de assinaturas recorrentes manualmente (Apenas Admins / Cron)
  typedApp.post(
    "/admin/subscriptions/process",
    {
      schema: {
        tags: ["payments-admin"],
        summary: "Processar cobranças periódicas de assinaturas",
      },
    },
    async (request, reply) => {
      if (request.user.role !== "ADMIN") {
        return reply.status(403).send({ error: "Acesso restrito a administradores" });
      }

      const results = await paymentServices.processRecurringSubscriptions();
      return reply.send({
        message: "Motor de cobrança executado com sucesso",
        ...results,
      });
    }
  );
}
