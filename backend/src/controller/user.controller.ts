import { FastifyReply, FastifyRequest } from "fastify";
import { UserServices } from "../services/user.services.js";

interface UpdateProfileBody {
  name?: string | null;
  email?: string;
  phone?: string | null;
  document?: string | null;
  avatarUrl?: string | null;
}

interface UpdatePasswordBody {
  currentPassword?: string;
  newPassword?: string;
}

export class UserController {
  private userServices: UserServices;

  constructor(userServices: UserServices) {
    this.userServices = userServices;
  }

  getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user;
    const profile = await this.userServices.getUserProfile(userId);
    return reply.status(200).send({ user: profile });
  };

  updateProfile = async (
    request: FastifyRequest<{ Body: UpdateProfileBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    const profile = await this.userServices.updateUserProfile(userId, request.body);
    return reply.status(200).send({ user: profile });
  };

  updatePassword = async (
    request: FastifyRequest<{ Body: UpdatePasswordBody }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.user;
    await this.userServices.updateUserPassword(userId, request.body);
    return reply.status(204).send();
  };
}
