import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { sendSuccess } from "../utils/apiResponse.js";

export class HealthController {
  async check(_request: Request, response: Response): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(
      response,
      {
        status: "ok",
        service: "agripulse-api",
        timestamp: new Date().toISOString()
      },
      "Service is healthy."
    );
  }
}

export const healthController = new HealthController();
