import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware.js";
import { CategoryServices } from "../services/category.services.js";
import { CategoryController } from "../controller/category.controller.js";

const categoryServices = new CategoryServices(prisma);
const categoryController = new CategoryController(categoryServices);

const categoryBodySchema = z.object({
  name: z.string().min(2).describe("Nome da categoria"),
  icon: z.string().describe("Imagem do ícone em formato Base64"),
});

export function categoryRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Todas as rotas de categoria exigem login
  app.addHook("preHandler", authMiddleware);

  // GET /categories - Qualquer usuário logado pode ver
  typedApp.get(
    "/",
    {
      schema: {
        tags: ["categories"],
        summary: "Listar todas as categorias",
      },
    },
    categoryController.list,
  );

  // POST /categories - Apenas ADMIN
  typedApp.post(
    "/",
    {
      schema: {
        tags: ["categories", "admin"],
        summary: "Criar uma nova categoria",
        body: categoryBodySchema,
      },
      preHandler: [adminMiddleware],
    },
    categoryController.create,
  );

  // PUT /categories/:id - Apenas ADMIN
  typedApp.put(
    "/:id",
    {
      schema: {
        tags: ["categories", "admin"],
        summary: "Atualizar uma categoria",
        params: z.object({ id: z.string().uuid() }),
        body: categoryBodySchema.partial(),
      },
      preHandler: [adminMiddleware],
    },
    categoryController.update,
  );

  // DELETE /categories/:id - Apenas ADMIN
  typedApp.delete(
    "/:id",
    {
      schema: {
        tags: ["categories", "admin"],
        summary: "Excluir uma categoria",
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [adminMiddleware],
    },
    categoryController.delete,
  );
}
