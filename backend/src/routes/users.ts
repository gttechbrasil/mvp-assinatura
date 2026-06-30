import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { UserServices } from "../services/user.services.js";
import { UserController } from "../controller/user.controller.js";

const userServices = new UserServices(prisma);
const userController = new UserController(userServices);

export function userRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Protect all user profile routes
  app.addHook("preHandler", authMiddleware);

  // Get Profile
  typedApp.get(
    "/profile",
    {
      schema: {
        tags: ["users"],
        summary: "Obtém os dados do perfil do usuário logado",
      },
    },
    userController.getProfile,
  );

  // Update Profile
  typedApp.put(
    "/profile",
    {
      schema: {
        tags: ["users"],
        summary: "Atualiza os dados de perfil do usuário",
        body: z.object({
          name: z.string().min(2).optional().nullable().describe("Nome do usuário"),
          email: z.string().email().optional().describe("E-mail do usuário"),
          phone: z.string().optional().nullable().describe("Telefone do usuário"),
          document: z.string().min(11, "CPF deve ter no mínimo 11 caracteres").max(14, "CPF deve ter no máximo 14 caracteres").optional().nullable().describe("CPF do usuário"),
          avatarUrl: z.string().optional().nullable().describe("URL base64 do avatar do usuário"),
        }),
      },
    },
    userController.updateProfile,
  );

  // Update Password
  typedApp.put(
    "/password",
    {
      schema: {
        tags: ["users"],
        summary: "Altera a senha do usuário",
        body: z.object({
          currentPassword: z.string().describe("Senha atual"),
          newPassword: z.string().min(6).describe("Nova senha (mínimo 6 caracteres)"),
        }),
      },
    },
    userController.updatePassword,
  );
}
