import type { Request, Response } from "express";
import { usdaNassService } from "../services/usdaNassService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getValidatedBody } from "../utils/validatedRequest.js";

interface SyncRequestBody {
  commodities?: string[];
  pricesOnly: boolean;
}

export class AdminController {
  async syncUsda(request: Request, response: Response): Promise<void> {
    const body = getValidatedBody<SyncRequestBody>(request);
    const data = await usdaNassService.sync(body.commodities, body.pricesOnly);
    sendSuccess(response, data, "USDA synchronization finished.");
  }
}

export const adminController = new AdminController();
