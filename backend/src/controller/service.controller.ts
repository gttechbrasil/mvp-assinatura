import { FastifyReply, FastifyRequest } from "fastify";
import { PlatformServiceServices } from "../services/service.services.js";

interface CreateServiceBody {
  name: string;
  categoryId: string;
  description?: string;
}

interface UpdateServiceBody {
  name?: string;
  categoryId?: string;
  description?: string;
}

interface ServiceParams {
  id: string;
}

export class PlatformServiceController {
  private serviceServices: PlatformServiceServices;

  constructor(serviceServices: PlatformServiceServices) {
    this.serviceServices = serviceServices;
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const services = await this.serviceServices.listAllServices();
    return reply.status(200).send({ services });
  };

  create = async (
    request: FastifyRequest<{ Body: CreateServiceBody }>,
    reply: FastifyReply,
  ) => {
    const service = await this.serviceServices.createService(request.body);
    return reply.status(201).send({ service });
  };

  update = async (
    request: FastifyRequest<{ Params: ServiceParams; Body: UpdateServiceBody }>,
    reply: FastifyReply,
  ) => {
    const service = await this.serviceServices.updateService(
      request.params.id,
      request.body,
    );
    return reply.status(200).send({ service });
  };

  delete = async (
    request: FastifyRequest<{ Params: ServiceParams }>,
    reply: FastifyReply,
  ) => {
    await this.serviceServices.deleteService(request.params.id);
    return reply.status(204).send();
  };
}
