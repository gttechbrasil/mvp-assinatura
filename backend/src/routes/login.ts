import { FastifyInstance } from "fastify";
import { LoginController } from "../controller/login.controller.js";
import { LoginServices } from "../services/login.services.js";
import { prisma } from "../lib/prisma.js";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const services = new LoginServices(prisma);
const controller = new LoginController(services);

export const loginSchema = {
  tags: ["auth"],
  summary: "Realiza o login do usuário",
  description: "Autentica um usuário e retorna uma mensagem de sucesso",
  body: z.object({
    email: z.string().email().describe("E-mail do usuário"),
    password: z.string().min(6),
  }),
};

export function loginRoutes(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .post("/login", { schema: loginSchema }, controller.handle);
}
