import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

interface PlatformServiceData {
  name: string;
  categoryId: string;
  description?: string;
}

export class PlatformServiceServices {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listAllServices() {
    return this.prisma.platformService.findMany({
      orderBy: { name: "asc" },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
  }

  async createService(data: PlatformServiceData) {
    const existing = await this.prisma.platformService.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError("Já existe um serviço com este nome", 400);
    }

    return this.prisma.platformService.create({
      data,
    });
  }

  async updateService(id: string, data: Partial<PlatformServiceData>) {
    const service = await this.prisma.platformService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new AppError("Serviço não encontrado", 404);
    }

    if (data.name && data.name !== service.name) {
      const existing = await this.prisma.platformService.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new AppError("Já existe outro serviço com este nome", 400);
      }
    }

    return this.prisma.platformService.update({
      where: { id },
      data,
    });
  }

  async deleteService(id: string) {
    const service = await this.prisma.platformService.findUnique({
      where: { id },
    });

    if (!service) {
      throw new AppError("Serviço não encontrado", 404);
    }

    return this.prisma.platformService.delete({
      where: { id },
    });
  }
}
