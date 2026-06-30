import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../errors/AppError.js";

function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, "");

  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

export class UserServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        document: true,
        avatarUrl: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return user;
  }

  async updateUserProfile(
    userId: string,
    data: { name?: string | null; email?: string; phone?: string | null; document?: string | null; avatarUrl?: string | null },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    // Validação matemática do CPF se fornecido
    if (data.document !== undefined && data.document !== null && data.document !== "") {
      const cleanCPF = data.document.replace(/\D/g, "");
      if (cleanCPF.length === 14) {
        throw new AppError("CNPJ não é aceito. Por favor, insira um CPF válido.", 400);
      }
      if (cleanCPF.length !== 11) {
        throw new AppError("CPF deve conter exatamente 11 dígitos.", 400);
      }
      if (!validateCPF(cleanCPF)) {
        throw new AppError("CPF inválido. Verifique os dígitos verificadores.", 400);
      }

      // Verificar se este CPF já pertence a outro usuário
      const cpfExists = await this.prisma.user.findFirst({
        where: {
          document: cleanCPF,
          NOT: {
            id: userId,
          },
        },
      });

      if (cpfExists) {
        throw new AppError("Este CPF já está cadastrado por outro usuário", 400);
      }

      data.document = cleanCPF; // Salva limpo
    }

    // Check email uniqueness if email is changing
    if (data.email && data.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new AppError("Este e-mail já está em uso", 400);
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        document: data.document !== undefined ? data.document : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        document: true,
        avatarUrl: true,
        role: true,
        created_at: true,
      },
    });

    return updatedUser;
  }

  async updateUserPassword(
    userId: string,
    data: { currentPassword?: string; newPassword?: string },
  ) {
    if (!data.currentPassword || !data.newPassword) {
      throw new AppError("Senha atual e nova senha são obrigatórias", 400);
    }

    if (data.newPassword.length < 6) {
      throw new AppError("A nova senha deve ter no mínimo 6 caracteres", 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const passwordMatch = await bcrypt.compare(
      data.currentPassword,
      user.password,
    );

    if (!passwordMatch) {
      throw new AppError("Senha atual incorreta", 400);
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
