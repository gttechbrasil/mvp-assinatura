import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { PaymentServices } from "../services/payment.services.js";
import fs from "fs";
import path from "path";

const paymentServices = new PaymentServices(prisma);

export function webhookRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/asaas",
    {
      schema: {
        tags: ["webhooks"],
        summary: "Webhook para notificações do Asaas",
        headers: z
          .object({
            "asaas-access-token": z.string().optional(),
          })
          .passthrough(),
      },
    },
    async (request, reply) => {
      try {
        const logMsg = `[${new Date().toISOString()}] Webhook trigger. Headers: ${JSON.stringify(request.headers)} | Body: ${JSON.stringify(request.body)}\n`;
        fs.appendFileSync(path.join(process.cwd(), "webhook-logs.txt"), logMsg);
      } catch (err) {
        console.error("Falha ao gravar log do webhook:", err);
      }

      const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
      const receivedToken = request.headers["asaas-access-token"];

      if (!webhookToken || receivedToken !== webhookToken) {
        console.warn("Tentativa de acesso não autorizada ao webhook do Asaas.");
        return reply.status(401).send({ error: "Não autorizado" });
      }

      const body = request.body as any;
      const event = body.event;
      const payment = body.payment;

      console.log(
        `Webhook do Asaas recebido: Evento = ${event}, PaymentID = ${payment?.id}`,
      );

      if (event === "PAYMENT_RECEIVED" && payment) {
        try {
          const paymentId = payment.id;
          const value = Number(payment.value);

          await paymentServices.confirmCredit(paymentId, value);
        } catch (error) {
          console.error(
            "Erro ao processar confirmação de pagamento do webhook:",
            error,
          );
        }
      }

      return reply.status(200).send({ received: true });
    },
  );
}
