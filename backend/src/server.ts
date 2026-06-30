import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import {
  validatorCompiler,
  serializerCompiler,
} from "fastify-type-provider-zod";
import { fastifySwagger } from "@fastify/swagger";
import { fastifySwaggerUi } from "@fastify/swagger-ui";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { groupRoutes } from "./routes/groups.js";
import { categoryRoutes } from "./routes/categories.js";
import { serviceRoutes } from "./routes/services.js";
import { adminRoutes } from "./routes/admin.js";
import { paymentRoutes } from "./routes/payments.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { AppError } from "./errors/AppError.js";
import { ZodError } from "zod";
import { prisma } from "./lib/prisma.js";
import { PaymentServices } from "./services/payment.services.js";

const app = fastify({
  bodyLimit: 5 * 1024 * 1024, // 5MB limit for large payloads like base64 images
});

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

  console.error("Unhandled server error:", error);

  return reply.status(500).send({
    status: "error",
    message: error instanceof Error ? error.message : "Internal server error",
  });
});

app.register(fastifyCors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Assinaturas-mvp API",
      description: "",
      version: "1.0.0",
    },
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

app.register(authRoutes, { prefix: "/api/v1/auth" });
app.register(userRoutes, { prefix: "/api/v1/users" });
app.register(groupRoutes, { prefix: "/api/v1/groups" });
app.register(categoryRoutes, { prefix: "/api/v1/categories" });
app.register(serviceRoutes, { prefix: "/api/v1/services" });
app.register(adminRoutes, { prefix: "/api/v1/admin" });
app.register(paymentRoutes, { prefix: "/api/v1/payments" });
app.register(webhookRoutes, { prefix: "/api/v1/webhooks" });
app.register(notificationsRoutes, { prefix: "/api/v1/notifications" });

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

    // Iniciar agendamento em background para processar cobranças recorrentes e inadimplências de assinaturas
    const paymentServices = new PaymentServices(prisma);
    
    // Execução inicial após 10 segundos para não atrasar o boot do servidor
    setTimeout(async () => {
      try {
        console.log("[Background Job] Executando verificação de cobrança recorrente inicial...");
        const results = await paymentServices.processRecurringSubscriptions();
        if (results.totalProcessed > 0) {
          console.log(`[Background Job] Cobranças processadas: ${results.totalProcessed} | Sucesso: ${results.success} | Bloqueados por inadimplência: ${results.blocked}`);
        }
      } catch (err) {
        console.error("[Background Job] Erro ao processar cobranças periódicas:", err);
      }
    }, 10000);

    // Execução periódica a cada 1 hora
    setInterval(async () => {
      try {
        console.log("[Background Job] Executando verificação periódica de cobrança recorrente...");
        const results = await paymentServices.processRecurringSubscriptions();
        if (results.totalProcessed > 0) {
          console.log(`[Background Job] Cobranças processadas: ${results.totalProcessed} | Sucesso: ${results.success} | Bloqueados por inadimplência: ${results.blocked}`);
        }
      } catch (err) {
        console.error("[Background Job] Erro ao processar cobranças periódicas:", err);
      }
    }, 60 * 60 * 1000);
  });
