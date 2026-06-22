import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { fastifySwagger } from "@fastify/swagger";
import { fastifySwaggerUi } from "@fastify/swagger-ui";
import { appRoutes } from "./routes/index.js";
import { AppError } from "./errors/AppError.js";
import { ZodError } from "zod";

const app = fastify();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      status: "error",
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      status: "validation_error",
      message: "Erro de validação",
      errors: error.flatten().fieldErrors,
    });
  }

  return reply.status(500).send({
    status: "error",
    message: "Internal server error",
  });
});

app.register(fastifyCors, {
  origin: "*",
  // methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Assistent App API",
      description: "",
      version: "1.0.0",
    },
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

app.register(appRoutes, { prefix: "/api/v1" });

app
  .listen({
    port: Number(process.env.PORT) || 3000,
  })
  .then(() => {
    console.log(
      `💥Server is running at http://localhost:${Number(process.env.PORT)}`,
    );

    console.log(
      `📚 Docs available at http://localhost:${Number(process.env.PORT)}/docs`,
    );
  });
