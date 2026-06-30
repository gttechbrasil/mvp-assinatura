import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware.js";
import { PlatformServiceServices } from "../services/service.services.js";
import { PlatformServiceController } from "../controller/service.controller.js";

const serviceServices = new PlatformServiceServices(prisma);
const serviceController = new PlatformServiceController(serviceServices);

const serviceBodySchema = z.object({
  name: z.string().min(2).describe("Nome do serviço"),
  categoryId: z.string().uuid().describe("ID da Categoria relacionada"),
  description: z.string().optional().describe("Descrição do serviço"),
});

export function serviceRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Todas as rotas exigem login
  app.addHook("preHandler", authMiddleware);

  // GET /services - Qualquer usuário logado pode ver
  typedApp.get(
    "/",
    {
      schema: {
        tags: ["services"],
        summary: "Listar todos os serviços disponíveis na plataforma",
      },
    },
    serviceController.list,
  );

  // POST /services - Apenas ADMIN
  typedApp.post(
    "/",
    {
      schema: {
        tags: ["services", "admin"],
        summary: "Criar novo serviço na plataforma",
        body: serviceBodySchema,
      },
      preHandler: [adminMiddleware],
    },
    serviceController.create,
  );

  // PUT /services/:id - Apenas ADMIN
  typedApp.put(
    "/:id",
    {
      schema: {
        tags: ["services", "admin"],
        summary: "Atualizar serviço da plataforma",
        params: z.object({ id: z.string().uuid() }),
        body: serviceBodySchema.partial(),
      },
      preHandler: [adminMiddleware],
    },
    serviceController.update,
  );

  // DELETE /services/:id - Apenas ADMIN
  typedApp.delete(
    "/:id",
    {
      schema: {
        tags: ["services", "admin"],
        summary: "Excluir serviço da plataforma",
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [adminMiddleware],
    },
    serviceController.delete,
  );
}
