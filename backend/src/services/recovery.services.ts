import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import bcrypt from "bcrypt";
import { resend } from "../lib/resend.js";

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
}

export class RecoveryServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async forgotPassword({ email }: ForgotPasswordRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("E-mail não cadastrado", 404);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiration: 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete existing reset codes for this user
    await this.prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Save code
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    // Log the code to the console for mock email delivery
    console.log(`\n🔑 [RECUPERAÇÃO DE SENHA] Código para ${email}: ${code}\n`);

    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Recuperação de Senha - Plataforma MVP",
        html: `<p>Você solicitou a recuperação de senha de sua conta.</p><p>Seu código de verificação de 6 dígitos é: <strong>${code}</strong></p><p>Este código expira em 15 minutos.</p>`,
      });
    } catch (err) {
      console.error("Erro ao enviar e-mail de recuperação de senha com Resend:", err);
    }

    return { message: "Código de recuperação enviado!" };
  }

  async resetPassword({ email, code, password }: ResetPasswordRequest) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("E-mail não cadastrado", 404);
    }

    const resetRequest = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
      },
    });

    if (!resetRequest) {
      throw new AppError("Código de verificação inválido", 400);
    }

    if (resetRequest.expiresAt < new Date()) {
      // Clean up expired code
      await this.prisma.passwordReset.delete({
        where: { id: resetRequest.id },
      });
      throw new AppError("Código de verificação expirado", 400);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the reset code
    await this.prisma.passwordReset.delete({
      where: { id: resetRequest.id },
    });

    return { message: "Senha redefinida com sucesso!" };
  }

  async verifyCode({ email, code }: { email: string; code: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError("E-mail não cadastrado", 404);
    }

    const resetRequest = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        code,
      },
    });

    if (!resetRequest) {
      throw new AppError("Código de verificação inválido", 400);
    }

    if (resetRequest.expiresAt < new Date()) {
      await this.prisma.passwordReset.delete({
        where: { id: resetRequest.id },
      });
      throw new AppError("Código de verificação expirado", 400);
    }

    return { valid: true };
  }
}
