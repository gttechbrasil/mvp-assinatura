import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

interface LoginRequest {
  email: string;
  password: string;
}

export class LoginServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute({ email, password }: LoginRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError("Configuração de autenticação inválida", 500);
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
    };
  }
}
