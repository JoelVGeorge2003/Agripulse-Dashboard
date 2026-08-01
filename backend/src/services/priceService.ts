import type { CropPriceGrowth, LatestPrice, PricePoint } from "@agripulse/shared";
import { priceRepository } from "../repositories/priceRepository.js";
import { commodityService } from "./commodityService.js";
import { decimalToNumber } from "../utils/number.js";

const STALE_AFTER_DAYS = 45;

function isStale(date: Date): boolean {
  return Date.now() - date.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export class PriceService {
  async getLatest(limit = 10, commoditySlug?: string): Promise<LatestPrice[]> {
    const rows = await priceRepository.findRecent(300);
    const unique = new Map<string, (typeof rows)[number]>();

    for (const row of rows) {
      if (row.stateCode !== "US") continue;
      if (commoditySlug && row.commodity.slug !== commoditySlug) continue;
      if (!unique.has(row.commodityId)) unique.set(row.commodityId, row);
      if (unique.size >= limit) break;
    }

    return [...unique.values()].map((row) => ({
      id: row.id,
      commodityId: row.commodityId,
      commoditySlug: row.commodity.slug,
      commodityName: row.commodity.name,
      symbol: row.commodity.symbol,
      value: row.value.toNumber(),
      previousValue: decimalToNumber(row.previousValue),
      changePercent: decimalToNumber(row.changePercent),
      unit: row.unit,
      stateCode: row.stateCode === "US" ? null : row.stateCode,
      priceDate: row.priceDate.toISOString(),
      source: row.source,
      isStale: isStale(row.priceDate)
    }));
  }

  async getHistory(
    commodityIdOrSlug: string,
    options: { stateCode?: string; limit: number }
  ): Promise<PricePoint[]> {
    const commodity = await commodityService.getRecordByIdOrSlug(commodityIdOrSlug);
    const rows = await priceRepository.findHistory(
      commodity.id,
      options.stateCode,
      options.limit
    );

    return rows.reverse().map((row) => ({
      id: row.id,
      value: row.value.toNumber(),
      previousValue: decimalToNumber(row.previousValue),
      changePercent: decimalToNumber(row.changePercent),
      unit: row.unit,
      stateCode: row.stateCode === "US" ? null : row.stateCode,
      priceDate: row.priceDate.toISOString(),
      source: row.source
    }));
  }

  async getLatestForCommodity(commodityIdOrSlug: string): Promise<LatestPrice | null> {
    const commodity = await commodityService.getRecordByIdOrSlug(commodityIdOrSlug);
    const row = await priceRepository.findLatestForCommodity(commodity.id);
    if (!row) return null;

    return {
      id: row.id,
      commodityId: row.commodityId,
      commoditySlug: row.commodity.slug,
      commodityName: row.commodity.name,
      symbol: row.commodity.symbol,
      value: row.value.toNumber(),
      previousValue: decimalToNumber(row.previousValue),
      changePercent: decimalToNumber(row.changePercent),
      unit: row.unit,
      stateCode: row.stateCode === "US" ? null : row.stateCode,
      priceDate: row.priceDate.toISOString(),
      source: row.source,
      isStale: isStale(row.priceDate)
    };
  }

  async latestObservationDate(): Promise<string | null> {
    const date = await priceRepository.findLatestObservationDate();
    return date?.toISOString() ?? null;
  }

  async getGrowth(years = 5): Promise<CropPriceGrowth[]> {
    const since = new Date();
    since.setUTCFullYear(since.getUTCFullYear() - years);
    const rows = await priceRepository.findNationalSince(since);
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      if (row.commodity.category === "LIVESTOCK" || row.unit !== row.commodity.defaultUnit) continue;
      grouped.set(row.commodityId, [...(grouped.get(row.commodityId) ?? []), row]);
    }

    return [...grouped.values()]
      .filter((items) => items.length >= 2 && items[0]!.value.toNumber() > 0 &&
        items.at(-1)!.priceDate.getTime() - items[0]!.priceDate.getTime() >= 365 * 24 * 60 * 60 * 1000)
      .map((items) => {
        const first = items[0]!;
        const latest = items.at(-1)!;
        const firstValue = first.value.toNumber();
        const latestValue = latest.value.toNumber();
        return {
          commoditySlug: latest.commodity.slug,
          commodityName: latest.commodity.name,
          color: latest.commodity.color,
          unit: latest.unit,
          firstValue,
          latestValue,
          growthPercent: ((latestValue - firstValue) / firstValue) * 100,
          firstDate: first.priceDate.toISOString(),
          latestDate: latest.priceDate.toISOString(),
          observations: items.map((item) => ({ date: item.priceDate.toISOString(), value: item.value.toNumber() })),
          source: latest.source
        };
      })
      .sort((a, b) => b.growthPercent - a.growthPercent);
  }
}

export const priceService = new PriceService();
