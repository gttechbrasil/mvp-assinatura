import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import {
  authMiddleware,
  adminMiddleware,
} from "../middleware/auth.middleware.js";
import { AdminServices } from "../services/admin.services.js";
import { AdminController } from "../controller/admin.controller.js";

const adminServices = new AdminServices(prisma);
const adminController = new AdminController(adminServices);

export function adminRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Todas as rotas deste grupo exigem autenticação e cargo de ADMIN
  app.addHook("preHandler", authMiddleware);
  app.addHook("preHandler", adminMiddleware);

  // GET /admin/stats
  typedApp.get(
    "/stats",
    {
      schema: {
        tags: ["admin"],
        summary: "Estatísticas gerais do sistema",
      },
    },
    adminController.getStats,
  );

  // GET /admin/users
  typedApp.get(
    "/users",
    {
      schema: {
        tags: ["admin"],
        summary: "Listar todos os usuários do sistema",
      },
    },
    adminController.listUsers,
  );

  // PATCH /admin/users/:id/role
  typedApp.patch(
    "/users/:id/role",
    {
      schema: {
        tags: ["admin"],
        summary: "Atualizar cargo (role) de um usuário",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          role: z.enum(["ADMIN", "USER"]),
        }),
      },
    },
    adminController.updateUserRole,
  );

  // GET /admin/groups
  typedApp.get(
    "/groups",
    {
      schema: {
        tags: ["admin"],
        summary: "Listar todos os grupos de assinatura do sistema",
      },
    },
    adminController.listGroups,
  );

  // DELETE /admin/groups/:id
  typedApp.delete(
    "/groups/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "Excluir qualquer grupo de assinatura (Moderação)",
        params: z.object({ id: z.string().uuid() }),
      },
    },
    adminController.deleteGroup,
  );
}
