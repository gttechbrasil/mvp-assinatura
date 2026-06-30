import { FastifyInstance } from "fastify";
import { NotificationController } from "../controller/notification.controller.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export async function notificationsRoutes(app: FastifyInstance) {
  const notificationController = new NotificationController(prisma);

  // Exigir autenticação para todas as rotas
  app.addHook("preHandler", authMiddleware);

  app.get("/", notificationController.list.bind(notificationController));
  
  app.patch(
    "/:id/read",
    notificationController.markAsRead.bind(notificationController)
  );

  app.patch(
    "/read-all",
    notificationController.markAllAsRead.bind(notificationController)
  );
}
