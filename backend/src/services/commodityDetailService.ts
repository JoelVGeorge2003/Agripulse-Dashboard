import type { CommodityDetail } from "@agripulse/shared";
import { commodityService } from "./commodityService.js";
import { priceService } from "./priceService.js";
import { productionService } from "./productionService.js";

export class CommodityDetailService {
  async get(idOrSlug: string): Promise<CommodityDetail> {
    const [commodity, latestPrice, priceHistory, production] = await Promise.all([
      commodityService.getByIdOrSlug(idOrSlug),
      priceService.getLatestForCommodity(idOrSlug),
      priceService.getHistory(idOrSlug, { limit: 24 }),
      productionService.getMapData(idOrSlug)
    ]);

    return { commodity, latestPrice, priceHistory, production };
  }
}

export const commodityDetailService = new CommodityDetailService();
