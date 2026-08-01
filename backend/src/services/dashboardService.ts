import type { CommoditySnapshot, DashboardOverview, DashboardSummary } from "@agripulse/shared";
import { commodityRepository } from "../repositories/commodityRepository.js";
import { syncRepository } from "../repositories/syncRepository.js";
import { commodityService } from "./commodityService.js";
import { priceService } from "./priceService.js";
import { productionService } from "./productionService.js";
import { stateService } from "./stateService.js";

export class DashboardService {
  async getOverview(): Promise<DashboardOverview> {
    const featured = await commodityRepository.findFeatured(5);
    const snapshots: CommoditySnapshot[] = [];
    for (const commodity of featured) {
      const [latestPrice, production, derivedUnitValue] = await Promise.all([
        priceService.getLatestForCommodity(commodity.slug),
        stateService.nationalVolume(commodity.id),
        stateService.nationalUnitValue(commodity.id)
      ]);
      if (!latestPrice) continue;
      const isBushelPrice = latestPrice.unit === "USD / bushel";
      if (!isBushelPrice && derivedUnitValue === null) continue;
      snapshots.push({
        ...latestPrice,
        value: isBushelPrice ? latestPrice.value : derivedUnitValue!,
        previousValue: isBushelPrice ? latestPrice.previousValue : null,
        changePercent: isBushelPrice ? latestPrice.changePercent : null,
        unit: "USD / bushel",
        commodityColor: commodity.color,
        productionVolume: production.value,
        productionUnit: production.unit,
        productionYear: production.year
      });
    }

    const [states, lastSync] = await Promise.all([
      stateService.listSummaries(),
      syncRepository.findLatestSuccessful()
    ]);

    const defaultStateCode = states.find((state) => state.stateCode === "IA")?.stateCode ?? states[0]?.stateCode ?? "IA";
    const dataAsOf = snapshots.length
      ? snapshots.reduce((latest, item) => item.priceDate > latest ? item.priceDate : latest, snapshots[0]!.priceDate)
      : null;

    return {
      featuredCommodities: snapshots,
      states,
      defaultStateCode,
      dataAsOf,
      lastSyncAt: lastSync?.finishedAt?.toISOString() ?? null
    };
  }

  async getSummary(): Promise<DashboardSummary> {
    const [commodityCount, statesCovered, latestObservation, latestPrices, mapData, lastSync] = await Promise.all([
      commodityService.count(),
      productionService.countStates(),
      priceService.latestObservationDate(),
      priceService.getLatest(10),
      productionService.getMapData("corn"),
      syncRepository.findLatestSuccessful()
    ]);
    return {
      commodityCount,
      statesCovered,
      latestObservation,
      lastSyncAt: lastSync?.finishedAt?.toISOString() ?? null,
      latestPrices,
      topProductionStates: mapData.slice(0, 8)
    };
  }
}

export const dashboardService = new DashboardService();
