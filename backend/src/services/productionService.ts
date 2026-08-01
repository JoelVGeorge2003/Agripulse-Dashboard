import type { MapDatum } from "@agripulse/shared";
import { productionRepository } from "../repositories/productionRepository.js";
import { stateNames } from "../utils/stateNames.js";
import { commodityService } from "./commodityService.js";

export class ProductionService {
  async getMapData(commodityIdOrSlug: string, requestedYear?: number): Promise<MapDatum[]> {
    const commodity = await commodityService.getRecordByIdOrSlug(commodityIdOrSlug);
    const year =
      requestedYear ?? (await productionRepository.findLatestYear(commodity.id));

    if (!year) return [];

    const rows = await productionRepository.findMapRows(commodity.id, year);
    const total = rows.reduce((sum, row) => sum + row.value.toNumber(), 0);

    return rows.map((row, index) => ({
      stateCode: row.stateCode,
      stateName: stateNames[row.stateCode] ?? row.stateCode,
      commoditySlug: row.commodity.slug,
      commodityName: row.commodity.name,
      year: row.year,
      value: row.value.toNumber(),
      unit: row.unit,
      rank: index + 1,
      sharePercent: total > 0 ? (row.value.toNumber() / total) * 100 : 0
    }));
  }

  async countStates(): Promise<number> {
    return productionRepository.countDistinctStates();
  }
}

export const productionService = new ProductionService();
