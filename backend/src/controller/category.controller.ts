import { FastifyReply, FastifyRequest } from "fastify";
import { CategoryServices } from "../services/category.services.js";

interface CreateCategoryBody {
  name: string;
  icon: string;
}

interface UpdateCategoryBody {
  name?: string;
  icon?: string;
}

interface CategoryParams {
  id: string;
}

export class CategoryController {
  private categoryServices: CategoryServices;

  constructor(categoryServices: CategoryServices) {
    this.categoryServices = categoryServices;
  }

  create = async (
    request: FastifyRequest<{ Body: CreateCategoryBody }>,
    reply: FastifyReply,
  ) => {
    const category = await this.categoryServices.createCategory(request.body);
    return reply.status(201).send({ category });
  };

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const categories = await this.categoryServices.listAllCategories();
    return reply.status(200).send({ categories });
  };

  update = async (
    request: FastifyRequest<{ Params: CategoryParams; Body: UpdateCategoryBody }>,
    reply: FastifyReply,
  ) => {
    const category = await this.categoryServices.updateCategory(
      request.params.id,
      request.body,
    );
    return reply.status(200).send({ category });
  };

  delete = async (
    request: FastifyRequest<{ Params: CategoryParams }>,
    reply: FastifyReply,
  ) => {
    await this.categoryServices.deleteCategory(request.params.id);
    return reply.status(204).send();
  };
}
