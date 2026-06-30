import { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { groupRoutes } from "./groups.js";
import { userRoutes } from "./users.js";
import { categoryRoutes } from "./categories.js";
import { adminRoutes } from "./admin.js";

export function appRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: "/auth" });
  app.register(groupRoutes, { prefix: "/groups" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(categoryRoutes, { prefix: "/categories" });
  app.register(adminRoutes, { prefix: "/admin" });
}
