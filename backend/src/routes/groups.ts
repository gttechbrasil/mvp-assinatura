import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware.js";

import { GroupServices } from "../services/group.services.js";
import { MemberServices } from "../services/member.services.js";
import { InviteServices } from "../services/invite.services.js";
import { EscrowServices } from "../services/escrow.services.js";

import { GroupController } from "../controller/group.controller.js";
import { MemberController } from "../controller/member.controller.js";
import { InviteController } from "../controller/invite.controller.js";
import { EscrowController } from "../controller/escrow.controller.js";
import { PaymentServices } from "../services/payment.services.js";

const groupServices = new GroupServices(prisma);
const memberServices = new MemberServices(prisma);
const inviteServices = new InviteServices(prisma);
const escrowServices = new EscrowServices(prisma);

const paymentServices = new PaymentServices(prisma);

const groupController = new GroupController(groupServices);
const memberController = new MemberController(memberServices, paymentServices);
const inviteController = new InviteController(inviteServices);
const escrowController = new EscrowController(escrowServices);

const groupBodySchema = z.object({
  name: z.string().min(2).describe("Nome do grupo"),
  description: z.string().optional().describe("Descrição opcional do grupo"),
  service: z.string().min(2).describe("Nome do serviço (ex: Netflix, Spotify)"),
  maxSlots: z.number().int().min(2).describe("Número máximo de vagas"),
  pricePerSlot: z.number().positive().describe("Preço por vaga (informativo)"),
  categoryId: z.string().uuid().optional().describe("ID da categoria correspondente"),
});

export function groupRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Aplica o middleware de auth em todas as rotas deste plugin
  app.addHook("preHandler", authMiddleware);

  // ─── Groups CRUD ──────────────────────────────────────────────────────────

  typedApp.post(
    "/",
    {
      schema: {
        tags: ["groups"],
        summary: "Criar um novo grupo de assinatura",
        body: groupBodySchema,
      },
    },
    groupController.create,
  );

  typedApp.get(
    "/",
    {
      schema: {
        tags: ["groups"],
        summary: "Listar todos os grupos ativos com filtro por categoria",
        querystring: z.object({
          categoryId: z.string().uuid().optional().describe("ID da categoria para filtro"),
        }),
      },
    },
    groupController.listAll,
  );

  typedApp.get(
    "/my",
    {
      schema: {
        tags: ["groups"],
        summary: "Listar grupos onde sou líder",
      },
    },
    groupController.listOwned,
  );

  typedApp.get(
    "/joined",
    {
      schema: {
        tags: ["groups"],
        summary: "Listar grupos onde sou membro",
      },
    },
    groupController.listJoined,
  );

  // ─── Recently Viewed ──────────────────────────────────────────────────────
  // IMPORTANT: must be registered BEFORE /:id to avoid param capture

  typedApp.get(
    "/recently-viewed",
    {
      schema: {
        tags: ["groups"],
        summary: "Listar grupos visualizados recentemente pelo usuário",
      },
    },
    groupController.listRecentlyViewed,
  );

  typedApp.get(
    "/:id",
    {
      schema: {
        tags: ["groups"],
        summary: "Detalhes de um grupo",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    groupController.getById,
  );

  typedApp.put(
    "/:id",
    {
      schema: {
        tags: ["groups"],
        summary: "Atualizar dados de um grupo",
        params: z.object({ id: z.string().uuid() }),
        body: groupBodySchema.partial(),
      },
    },
    groupController.update,
  );

  typedApp.delete(
    "/:id",
    {
      schema: {
        tags: ["groups"],
        summary: "Excluir um grupo",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    groupController.delete,
  );

  typedApp.post(
    "/:id/view",
    {
      schema: {
        tags: ["groups"],
        summary: "Registrar visualização de um grupo",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    groupController.recordView,
  );

  // ─── Members ──────────────────────────────────────────────────────────────

  typedApp.get(
    "/:id/members",
    {
      schema: {
        tags: ["members"],
        summary: "Listar membros de um grupo",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    memberController.list,
  );

  typedApp.patch(
    "/:id/members/:memberId/status",
    {
      schema: {
        tags: ["members"],
        summary: "Atualizar status de um membro",
        params: z.object({ id: z.string().uuid(), memberId: z.string().uuid() }),
        body: z.object({
          status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
        }),
      },
    },
    memberController.updateStatus,
  );

  typedApp.delete(
    "/:id/members/:memberId",
    {
      schema: {
        tags: ["members"],
        summary: "Remover membro de um grupo",
        params: z.object({ id: z.string().uuid(), memberId: z.string().uuid() }),
      },
    },
    memberController.remove,
  );

  typedApp.post(
    "/:id/leave",
    {
      schema: {
        tags: ["members"],
        summary: "Membro sai do grupo voluntariamente (cancelar assinatura)",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    memberController.leave,
  );

  typedApp.post(
    "/join/:token",
    {
      schema: {
        tags: ["members"],
        summary: "Entrar em um grupo via token de convite",
        params: z.object({ token: z.string().uuid() }),
      },
    },
    memberController.join,
  );

  typedApp.post(
    "/:id/join",
    {
      schema: {
        tags: ["members"],
        summary: "Entrar em um grupo ativo diretamente",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    memberController.joinDirectly,
  );

  typedApp.post(
    "/:id/reactivate",
    {
      schema: {
        tags: ["members"],
        summary: "Reativar assinatura suspensa por inadimplência",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    memberController.reactivate,
  );

  // ─── Invites ──────────────────────────────────────────────────────────────

  typedApp.post(
    "/:id/invites",
    {
      schema: {
        tags: ["invites"],
        summary: "Criar convite para um grupo",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ email: z.string().email().optional() }),
      },
    },
    inviteController.create,
  );

  typedApp.get(
    "/:id/invites",
    {
      schema: {
        tags: ["invites"],
        summary: "Listar convites de um grupo",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    inviteController.list,
  );

  typedApp.get(
    "/invites/token/:token",
    {
      schema: {
        tags: ["invites"],
        summary: "Buscar convite por token (rota pública para preview)",
        params: z.object({ token: z.string().uuid() }),
      },
    },
    inviteController.getByToken,
  );

  typedApp.delete(
    "/:id/invites/:inviteId",
    {
      schema: {
        tags: ["invites"],
        summary: "Revogar um convite",
        params: z.object({
          id: z.string().uuid(),
          inviteId: z.string().uuid(),
        }),
      },
    },
    inviteController.revoke,
  );

  // ─── Credentials ──────────────────────────────────────────────────────────

  typedApp.patch(
    "/:id/credentials",
    {
      schema: {
        tags: ["groups"],
        summary: "Líder cadastra/atualiza as credenciais de acesso do grupo",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          credentials: z.string().min(1).describe("Credenciais de acesso (e-mail/senha, link de convite, etc.)"),
        }),
      },
    },
    groupController.updateCredentials,
  );

  // ─── Escrow ───────────────────────────────────────────────────────────────

  typedApp.post(
    "/escrow/release",
    {
      schema: {
        tags: ["admin"],
        summary: "[Admin] Libera pagamentos em custódia com prazo vencido",
      },
      preHandler: [adminMiddleware],
    },
    escrowController.releaseAll,
  );
}
