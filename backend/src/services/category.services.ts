import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

interface CategoryData {
  name: string;
  icon: string;
}

export class CategoryServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createCategory(data: CategoryData) {
    const existing = await this.prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError("Já existe uma categoria com este nome", 400);
    }

    return this.prisma.category.create({
      data,
    });
  }

  async listAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  async updateCategory(id: string, data: Partial<CategoryData>) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError("Categoria não encontrada", 404);
    }

    if (data.name && data.name !== category.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new AppError("Já existe uma categoria com este nome", 400);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError("Categoria não encontrada", 404);
    }

    await this.prisma.category.delete({
      where: { id },
    });
  }
}
