import type { Response } from "express";
import type { ApiSuccess } from "@agripulse/shared";

export function sendSuccess<T>(
  response: Response,
  data: T,
  message = "Request completed successfully",
  statusCode = 200
): void {
  const payload: ApiSuccess<T> = { success: true, data, message };
  response.status(statusCode).json(payload);
}
