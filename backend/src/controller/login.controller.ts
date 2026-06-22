import { FastifyReply, FastifyRequest } from "fastify";
import { LoginServices } from "../services/login.services.js";

interface LoginBody {
  email: string;
  password: string;
}

export class LoginController {
  private loginService: LoginServices;

  constructor(loginService: LoginServices) {
    this.loginService = loginService;
  }

  async handle(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply,
  ) {
    const { email, password } = request.body;

    await this.loginService.execute({ email, password });

    return reply.status(200).send({ message: "Login realizado com sucesso!" });
  }
}
