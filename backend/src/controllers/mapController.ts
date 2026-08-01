import type { Request, Response } from "express";
import { productionService } from "../services/productionService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getValidatedQuery } from "../utils/validatedRequest.js";

interface MapQuery {
  commodity: string;
  year?: number;
}

export class MapController {
  async production(request: Request, response: Response): Promise<void> {
    const query = getValidatedQuery<MapQuery>(request);
    const data = await productionService.getMapData(query.commodity, query.year);
    sendSuccess(response, data, "Production map data retrieved.");
  }
}

export const mapController = new MapController();
