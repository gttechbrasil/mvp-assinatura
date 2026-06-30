import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Token de autenticação não fornecido", 401);
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError("Configuração de autenticação inválida", 500);
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    request.user = decoded;
  } catch {
    throw new AppError("Token inválido ou expirado", 401);
  }
}

export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.user) {
    throw new AppError("Acesso não autorizado. Usuário não autenticado.", 401);
  }

  if (request.user.role !== "ADMIN") {
    throw new AppError("Acesso não autorizado. Apenas administradores.", 403);
  }
}
