import { FastifyReply, FastifyRequest } from "fastify";
import { MemberServices } from "../services/member.services.js";
import { PaymentServices } from "../services/payment.services.js";
import { MemberStatus } from "@prisma/client";

interface GroupParams {
  id: string;
}

interface MemberParams {
  id: string;
  memberId: string;
}

interface TokenParams {
  token: string;
}

interface UpdateStatusBody {
  status: MemberStatus;
}

export class MemberController {
  private memberServices: MemberServices;
  private paymentServices: PaymentServices;

  constructor(memberServices: MemberServices, paymentServices: PaymentServices) {
    this.memberServices = memberServices;
    this.paymentServices = paymentServices;
  }

  list = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const members = await this.memberServices.listMembers(
      request.params.id,
      userId,
    );
    return reply.status(200).send({ members });
  };

  updateStatus = async (
    request: FastifyRequest<{ Params: MemberParams; Body: UpdateStatusBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const member = await this.memberServices.updateMemberStatus(
      request.params.id,
      request.params.memberId,
      userId,
      request.body.status,
    );
    return reply.status(200).send({ member });
  };

  remove = async (
    request: FastifyRequest<{ Params: MemberParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    await this.memberServices.removeMember(
      request.params.id,
      request.params.memberId,
      userId,
    );
    return reply.status(204).send();
  };

  leave = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    await this.memberServices.leaveGroup(
      request.params.id,
      userId,
    );
    return reply.status(204).send();
  };

  join = async (
    request: FastifyRequest<{ Params: TokenParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const member = await this.memberServices.joinGroup(
      request.params.token,
      userId,
    );
    return reply.status(201).send({ member });
  };

  joinDirectly = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const member = await this.memberServices.joinGroupDirectly(
      request.params.id,
      userId,
    );
    return reply.status(201).send({ member });
  };

  reactivate = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const result = await this.paymentServices.reactivateBlockedMembership(
      request.params.id,
      userId,
    );
    return reply.status(200).send(result);
  };
}
