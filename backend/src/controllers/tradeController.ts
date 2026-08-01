import type { Request, Response } from "express";
import { tradeService } from "../services/tradeService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export class TradeController {
  async crops(_: Request, response: Response): Promise<void> {
    sendSuccess(response, await tradeService.getCropTrade(), "U.S. crop trade retrieved.");
  }
}

export const tradeController = new TradeController();
