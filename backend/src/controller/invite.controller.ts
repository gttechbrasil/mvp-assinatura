import { FastifyReply, FastifyRequest } from "fastify";
import { InviteServices } from "../services/invite.services.js";

interface GroupParams {
  id: string;
}

interface InviteParams {
  id: string;
  inviteId: string;
}

interface TokenParams {
  token: string;
}

interface CreateInviteBody {
  email?: string;
}

export class InviteController {
  private inviteServices: InviteServices;

  constructor(inviteServices: InviteServices) {
    this.inviteServices = inviteServices;
  }

  create = async (
    request: FastifyRequest<{ Params: GroupParams; Body: CreateInviteBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const invite = await this.inviteServices.createInvite(
      request.params.id,
      userId,
      request.body.email,
    );
    return reply.status(201).send({ invite });
  };

  list = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const invites = await this.inviteServices.listInvites(
      request.params.id,
      userId,
    );
    return reply.status(200).send({ invites });
  };

  getByToken = async (
    request: FastifyRequest<{ Params: TokenParams }>,
    reply: FastifyReply,
  ) => {
    const invite = await this.inviteServices.getInviteByToken(
      request.params.token,
    );
    return reply.status(200).send({ invite });
  };

  revoke = async (
    request: FastifyRequest<{ Params: InviteParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    await this.inviteServices.revokeInvite(request.params.inviteId, userId);
    return reply.status(204).send();
  };
}
