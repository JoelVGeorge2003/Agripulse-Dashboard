import type { ApiResponse } from "@/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api").replace(/\/$/, "");

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly details?: Record<string, string[]>;

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { admin?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.admin) {
    const key = window.localStorage.getItem("agripulse-admin-key");
    if (key) headers.set("x-admin-key", key);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const payload = (await response.json().catch(() => ({
    success: false,
    message: "The server returned an unreadable response."
  }))) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new ApiClientError(
      payload.success ? `Request failed with HTTP ${response.status}.` : payload.message,
      response.status,
      payload.success ? undefined : payload.details
    );
  }

  return payload.data;
}
