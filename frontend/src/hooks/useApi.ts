import { useAuth } from "../contexts/AuthContext.js";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export function useApi() {
  const { token, logout } = useAuth();

  async function request<T>(
    path: string,
    method: HttpMethod = "GET",
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      logout();
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(
        (error as { message?: string }).message ?? "Erro na requisição",
      );
    }

    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  }

  return { request };
}
