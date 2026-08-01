import type { Request, Response } from "express";

export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json({
    success: false,
    message: `Route ${request.method} ${request.originalUrl} was not found.`
  });
}
