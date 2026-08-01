import type { Request, Response } from "express";
import type { CommodityCategory } from "@prisma/client";
import type { CommodityInput } from "@agripulse/shared";
import { commodityService } from "../services/commodityService.js";
import { commodityDetailService } from "../services/commodityDetailService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery
} from "../utils/validatedRequest.js";

interface CommodityListQuery {
  search?: string;
  category?: CommodityCategory;
  page: number;
  pageSize: number;
}

interface CommodityParams {
  idOrSlug: string;
}

export class CommodityController {
  async list(request: Request, response: Response): Promise<void> {
    const query = getValidatedQuery<CommodityListQuery>(request);
    const data = await commodityService.list(query);
    sendSuccess(response, data, "Commodities retrieved.");
  }

  async get(request: Request, response: Response): Promise<void> {
    const { idOrSlug } = getValidatedParams<CommodityParams>(request);
    const data = await commodityDetailService.get(idOrSlug);
    sendSuccess(response, data, "Commodity details retrieved.");
  }

  async create(request: Request, response: Response): Promise<void> {
    const data = await commodityService.create(getValidatedBody<CommodityInput>(request));
    sendSuccess(response, data, "Commodity created.", 201);
  }

  async update(request: Request, response: Response): Promise<void> {
    const { idOrSlug } = getValidatedParams<CommodityParams>(request);
    const data = await commodityService.update(
      idOrSlug,
      getValidatedBody<Partial<CommodityInput>>(request)
    );
    sendSuccess(response, data, "Commodity updated.");
  }

  async delete(request: Request, response: Response): Promise<void> {
    const { idOrSlug } = getValidatedParams<CommodityParams>(request);
    const data = await commodityService.delete(idOrSlug);
    sendSuccess(response, data, "Commodity deleted.");
  }
}

export const commodityController = new CommodityController();
