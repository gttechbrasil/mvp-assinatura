import { FastifyInstance } from "fastify";
import { loginRoutes } from "./login.js";

export function appRoutes(app: FastifyInstance) {
  app.register(loginRoutes, { prefix: "/auth" });
}
