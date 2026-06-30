import { FastifyReply, FastifyRequest } from "fastify";
import { GroupServices } from "../services/group.services.js";
import { GroupStatus } from "@prisma/client";

interface CreateGroupBody {
  name: string;
  description?: string;
  service: string;
  maxSlots: number;
  pricePerSlot: number;
}

interface UpdateGroupBody {
  name?: string;
  description?: string;
  service?: string;
  maxSlots?: number;
  pricePerSlot?: number;
  status?: GroupStatus;
}

interface GroupParams {
  id: string;
}

export class GroupController {
  private groupServices: GroupServices;

  constructor(groupServices: GroupServices) {
    this.groupServices = groupServices;
  }

  create = async (
    request: FastifyRequest<{ Body: CreateGroupBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const group = await this.groupServices.createGroup(userId, request.body);
    return reply.status(201).send({ group });
  };

  listAll = async (
    request: FastifyRequest<{ Querystring: { categoryId?: string } }>,
    reply: FastifyReply,
  ) => {
    const { categoryId } = request.query;
    const groups = await this.groupServices.listAllActiveGroups(categoryId);
    return reply.status(200).send({ groups });
  };

  listOwned = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user;
    const groups = await this.groupServices.listGroupsByOwner(userId);
    return reply.status(200).send({ groups });
  };

  listJoined = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user;
    const groups = await this.groupServices.listGroupsByMember(userId);
    return reply.status(200).send({ groups });
  };

  getById = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const group = await this.groupServices.getGroupById(
      request.params.id,
      userId,
    );
    return reply.status(200).send({ group });
  };

  update = async (
    request: FastifyRequest<{ Params: GroupParams; Body: UpdateGroupBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const group = await this.groupServices.updateGroup(
      request.params.id,
      userId,
      request.body,
    );
    return reply.status(200).send({ group });
  };

  delete = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    await this.groupServices.deleteGroup(request.params.id, userId);
    return reply.status(204).send();
  };

  recordView = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    await this.groupServices.recordView(userId, request.params.id);
    return reply.status(204).send();
  };

  listRecentlyViewed = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const groups = await this.groupServices.getRecentlyViewed(userId);
    return reply.status(200).send({ groups });
  };

  updateCredentials = async (
    request: FastifyRequest<{ Params: GroupParams; Body: { credentials: string } }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const result = await this.groupServices.updateCredentials(
      request.params.id,
      userId,
      request.body.credentials,
    );
    return reply.status(200).send(result);
  };
}

