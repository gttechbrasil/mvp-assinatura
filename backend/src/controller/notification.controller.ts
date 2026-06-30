import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

export class NotificationController {
  constructor(private prisma: PrismaClient) {}

  // Buscar notificações do usuário
  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({ message: "Não autorizado" });
    }

    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50, // Limite para não sobrecarregar
    });

    return { notifications };
  }

  // Marcar uma notificação como lida
  async markAsRead(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({ message: "Não autorizado" });
    }

    const { id } = request.params;

    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return reply.status(404).send({ message: "Notificação não encontrada" });
    }

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { message: "Notificação marcada como lida" };
  }

  // Marcar todas como lidas
  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user?.userId;
    if (!userId) {
      return reply.status(401).send({ message: "Não autorizado" });
    }

    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: "Todas as notificações marcadas como lidas" };
  }
}
