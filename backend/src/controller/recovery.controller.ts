import { FastifyReply, FastifyRequest } from "fastify";
import { RecoveryServices } from "../services/recovery.services.js";

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  email: string;
  code: string;
  password: string;
}

export class RecoveryController {
  private recoveryService: RecoveryServices;

  constructor(recoveryService: RecoveryServices) {
    this.recoveryService = recoveryService;
  }

  handleForgotPassword = async (
    request: FastifyRequest<{ Body: ForgotPasswordBody }>,
    reply: FastifyReply,
  ) => {
    const { email } = request.body;

    const result = await this.recoveryService.forgotPassword({ email });

    return reply.status(200).send(result);
  };

  handleResetPassword = async (
    request: FastifyRequest<{ Body: ResetPasswordBody }>,
    reply: FastifyReply,
  ) => {
    const { email, code, password } = request.body;

    const result = await this.recoveryService.resetPassword({
      email,
      code,
      password,
    });

    return reply.status(200).send(result);
  };

  handleVerifyCode = async (
    request: FastifyRequest<{ Body: { email: string; code: string } }>,
    reply: FastifyReply,
  ) => {
    const { email, code } = request.body;

    const result = await this.recoveryService.verifyCode({ email, code });

    return reply.status(200).send(result);
  };
}
