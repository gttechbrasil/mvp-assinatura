import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import bcrypt from "bcrypt";

interface RegisterRequest {
  email: string;
  password: string;
}

export class RegisterServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute({ email, password }: RegisterRequest) {
    const userAlreadyExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userAlreadyExists) {
      throw new AppError("E-mail já cadastrado", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });

    return user;
  }
}
