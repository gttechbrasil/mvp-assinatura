import { AppError } from "../errors/AppError.js";

interface AsaasCustomerInput {
  name: string;
  email: string;
  phone?: string;
  cpfCnpj: string;
}

interface AsaasPaymentInput {
  customerId: string;
  amount: number;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  dueDate: string;
  description?: string;
}

export class AsaasClient {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || "";
    this.apiUrl = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";

    if (!this.apiKey) {
      console.warn("⚠️ ASAAS_API_KEY não configurada no arquivo .env");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "access_token": this.apiKey,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = (await response.json().catch(() => ({}))) as any;

      if (!response.ok) {
        console.error(`Asaas API Error on ${endpoint}:`, data);
        const errorMessage = data.errors?.[0]?.description || "Erro de comunicação com o gateway Asaas";
        throw new AppError(errorMessage, response.status);
      }

      return data as T;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error(`Network or system error on Asaas request to ${endpoint}:`, error);
      throw new AppError("Falha ao se conectar com o servidor de pagamentos", 502);
    }
  }

  /**
   * Cria um cliente no painel do Asaas
   */
  async createCustomer(input: AsaasCustomerInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        phone: input.phone,
        cpfCnpj: input.cpfCnpj,
        notificationDisabled: true, // Desativa notificações do próprio Asaas para a plataforma controlar
      }),
    });
  }

  /**
   * Atualiza um cliente no painel do Asaas
   */
  async updateCustomer(customerId: string, input: Partial<AsaasCustomerInput>): Promise<{ id: string }> {
    return this.request<{ id: string }>(`/customers/${customerId}`, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        phone: input.phone,
        cpfCnpj: input.cpfCnpj,
      }),
    });
  }

  /**
   * Cria um pagamento no Asaas (Pix, Boleto, etc.)
   */
  async createPayment(input: AsaasPaymentInput): Promise<{ id: string; invoiceUrl: string; value: number }> {
    return this.request<{ id: string; invoiceUrl: string; value: number }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: input.customerId,
        billingType: input.billingType,
        value: input.amount,
        dueDate: input.dueDate,
        description: input.description,
      }),
    });
  }

  /**
   * Obtém QR Code e cópia-cola para pagamento do tipo PIX
   */
  async getPixQrCode(paymentId: string): Promise<{ success: boolean; encodedImage: string; payload: string }> {
    return this.request<{ success: boolean; encodedImage: string; payload: string }>(
      `/payments/${paymentId}/pixQrCode`
    );
  }

  /**
   * Dispara uma transferência PIX para realizar um saque
   */
  async createTransfer(
    amount: number,
    pixKey: string,
    pixKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP"
  ): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>("/transfers", {
      method: "POST",
      body: JSON.stringify({
        value: amount,
        pixAddressKey: pixKey,
        pixAddressKeyType: pixKeyType,
      }),
    });
  }
}

export const asaas = new AsaasClient();
