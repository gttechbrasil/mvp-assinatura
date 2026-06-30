import { FastifyReply, FastifyRequest } from "fastify";
import { AdminServices } from "../services/admin.services.js";

interface UpdateRoleBody {
  role: string;
}

interface UserParams {
  id: string;
}

interface GroupParams {
  id: string;
}

export class AdminController {
  private adminServices: AdminServices;

  constructor(adminServices: AdminServices) {
    this.adminServices = adminServices;
  }

  getStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await this.adminServices.getStats();
    return reply.status(200).send({ stats });
  };

  listUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    const users = await this.adminServices.listAllUsers();
    return reply.status(200).send({ users });
  };

  updateUserRole = async (
    request: FastifyRequest<{ Params: UserParams; Body: UpdateRoleBody }>,
    reply: FastifyReply,
  ) => {
    const user = await this.adminServices.updateUserRole(
      request.params.id,
      request.body.role,
    );
    return reply.status(200).send({ user });
  };

  listGroups = async (request: FastifyRequest, reply: FastifyReply) => {
    const groups = await this.adminServices.listAllGroups();
    return reply.status(200).send({ groups });
  };

  deleteGroup = async (
    request: FastifyRequest<{ Params: GroupParams }>,
    reply: FastifyReply,
  ) => {
    await this.adminServices.deleteGroup(request.params.id);
    return reply.status(204).send();
  };
}
