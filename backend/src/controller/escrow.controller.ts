import { FastifyReply, FastifyRequest } from "fastify";
import { EscrowServices } from "../services/escrow.services.js";

export class EscrowController {
  private escrowServices: EscrowServices;

  constructor(escrowServices: EscrowServices) {
    this.escrowServices = escrowServices;
  }

  releaseAll = async (_request: FastifyRequest, reply: FastifyReply) => {
    const release = await this.escrowServices.releaseEscrow();
    const timeout = await this.escrowServices.handleEscrowTimeouts();
    return reply.status(200).send({
      release,
      timeout,
    });
  };
}
