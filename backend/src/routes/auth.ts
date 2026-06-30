import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";

// Import Services
import { LoginServices } from "../services/login.services.js";
import { RegisterServices } from "../services/register.services.js";
import { RecoveryServices } from "../services/recovery.services.js";

// Import Controllers
import { LoginController } from "../controller/login.controller.js";
import { RegisterController } from "../controller/register.controller.js";
import { RecoveryController } from "../controller/recovery.controller.js";

// Instantiate Services
const loginServices = new LoginServices(prisma);
const registerServices = new RegisterServices(prisma);
const recoveryServices = new RecoveryServices(prisma);

// Instantiate Controllers
const loginController = new LoginController(loginServices);
const registerController = new RegisterController(registerServices);
const recoveryController = new RecoveryController(recoveryServices);

export function authRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Register
  typedApp.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Cadastra um novo usuário",
        body: z.object({
          email: z.string().email().describe("E-mail do usuário"),
          password: z.string().min(6).describe("Senha do usuário (mínimo 6 caracteres)"),
        }),
      },
    },
    registerController.handle,
  );

  // Login
  typedApp.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Realiza o login do usuário",
        body: z.object({
          email: z.string().email().describe("E-mail do usuário"),
          password: z.string().min(6).describe("Senha do usuário"),
        }),
      },
    },
    loginController.handle,
  );

  // Forgot Password
  typedApp.post(
    "/forgot-password",
    {
      schema: {
        tags: ["auth"],
        summary: "Solicita recuperação de senha",
        body: z.object({
          email: z.string().email().describe("E-mail do usuário para recuperação"),
        }),
      },
    },
    recoveryController.handleForgotPassword,
  );

  // Reset Password
  typedApp.post(
    "/reset-password",
    {
      schema: {
        tags: ["auth"],
        summary: "Redefine a senha do usuário",
        body: z.object({
          email: z.string().email().describe("E-mail do usuário"),
          code: z.string().length(6).describe("Código de verificação de 6 dígitos"),
          password: z.string().min(6).describe("Nova senha (mínimo 6 caracteres)"),
        }),
      },
    },
    recoveryController.handleResetPassword,
  );

  // Verify Code
  typedApp.post(
    "/verify-code",
    {
      schema: {
        tags: ["auth"],
        summary: "Verifica se o código de recuperação é válido",
        body: z.object({
          email: z.string().email().describe("E-mail do usuário"),
          code: z.string().length(6).describe("Código de verificação de 6 dígitos"),
        }),
      },
    },
    recoveryController.handleVerifyCode,
  );
}
