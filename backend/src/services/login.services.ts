import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import bcrypt from "bcrypt";

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

    return user;
  }
}
