import type { Request, Response } from "express";
import { priceService } from "../services/priceService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getValidatedParams, getValidatedQuery } from "../utils/validatedRequest.js";

interface PriceParams {
  idOrSlug: string;
}

interface LatestPriceQuery {
  limit: number;
  commodity?: string;
}

interface PriceHistoryQuery {
  stateCode?: string;
  limit: number;
}

interface PriceGrowthQuery { years: number; }

export class PriceController {
  async latest(request: Request, response: Response): Promise<void> {
    const query = getValidatedQuery<LatestPriceQuery>(request);
    const data = await priceService.getLatest(query.limit, query.commodity);
    sendSuccess(response, data, "Latest stored prices retrieved.");
  }

  async history(request: Request, response: Response): Promise<void> {
    const { idOrSlug } = getValidatedParams<PriceParams>(request);
    const query = getValidatedQuery<PriceHistoryQuery>(request);
    const data = await priceService.getHistory(idOrSlug, query);
    sendSuccess(response, data, "Price history retrieved.");
  }

  async growth(request: Request, response: Response): Promise<void> {
    const { years } = getValidatedQuery<PriceGrowthQuery>(request);
    sendSuccess(response, await priceService.getGrowth(years), `${years}-year crop price growth retrieved.`);
  }
}

export const priceController = new PriceController();
