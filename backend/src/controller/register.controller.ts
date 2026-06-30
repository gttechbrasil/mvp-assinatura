import { FastifyReply, FastifyRequest } from "fastify";
import { RegisterServices } from "../services/register.services.js";

interface RegisterBody {
  email: string;
  password: string;
}

export class RegisterController {
  private registerService: RegisterServices;

  constructor(registerService: RegisterServices) {
    this.registerService = registerService;
  }

  handle = async (
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply,
  ) => {
    const { email, password } = request.body;

    const user = await this.registerService.execute({ email, password });

    return reply.status(201).send({
      message: "Usuário cadastrado com sucesso!",
      user,
    });
  };
}
