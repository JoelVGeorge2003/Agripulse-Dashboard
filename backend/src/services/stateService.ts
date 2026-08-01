import type { StateCommodityProduction, StateDetail, StateSummary } from "@agripulse/shared";
import { productionRepository } from "../repositories/productionRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { stateMetadata, validStateCodes } from "../utils/stateMetadata.js";

const OFFICIAL_SOURCE = "USDA NASS Quick Stats";

function commodityKey(commodity: { slug: string; name: string }): string {
  return commodity.name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isCanonicalCommodity(commodity: { slug: string; name: string }): boolean {
  return commodity.slug.replace(/[^a-z0-9]/g, "") === commodityKey(commodity);
}

function isOfficial(row: { source: string }): boolean {
  return row.source === OFFICIAL_SOURCE;
}

function dedupeByCommodity<T extends { commodity: { id: string; slug: string; name: string; color: string; category: string }; value: { toNumber(): number }; totalValueUsd: { toNumber(): number } | null; unitPriceUsd: { toNumber(): number } | null; yieldValue: { toNumber(): number } | null; unit: string; year: number; source: string }>(rows: T[]): T[] {
  const byCommodity = new Map<string, T>();

  for (const row of rows) {
    const key = commodityKey(row.commodity);
    const current = byCommodity.get(key);
    const rowIsCanonical = isCanonicalCommodity(row.commodity);
    const currentIsCanonical = current ? isCanonicalCommodity(current.commodity) : false;
    const sameSourcePriority = current ? isOfficial(row) === isOfficial(current) : false;
    if (
      !current ||
      (isOfficial(row) && !isOfficial(current)) ||
      (sameSourcePriority && rowIsCanonical && !currentIsCanonical) ||
      (sameSourcePriority && rowIsCanonical === currentIsCanonical && row.year > current.year) ||
      (sameSourcePriority && rowIsCanonical === currentIsCanonical && row.year === current.year && row.value.toNumber() > current.value.toNumber())
    ) {
      byCommodity.set(key, row);
    }
  }

  return [...byCommodity.values()].sort((left, right) => {
    const categoryOrder = Number(left.commodity.category === "LIVESTOCK") - Number(right.commodity.category === "LIVESTOCK");
    return categoryOrder ||
      (right.totalValueUsd?.toNumber() ?? -1) - (left.totalValueUsd?.toNumber() ?? -1) ||
      right.value.toNumber() - left.value.toNumber();
  });
}

export class StateService {
  async listSummaries(): Promise<StateSummary[]> {
    const rows = await productionRepository.findRowsForSource(OFFICIAL_SOURCE);
    if (!rows.length) return [];
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const values = grouped.get(row.stateCode) ?? [];
      values.push(row);
      grouped.set(row.stateCode, values);
    }

    return [...grouped.entries()]
      .map(([stateCode, stateRows]) => {
        const uniqueRows = dedupeByCommodity(stateRows);
        const top = uniqueRows[0]!;
        const year = Math.max(...uniqueRows.map((row) => row.year));
        return {
          stateCode,
          stateName: stateMetadata[stateCode]?.name ?? stateCode,
          topCommoditySlug: top.commodity.slug,
          topCommodityName: top.commodity.name,
          topCommodityColor: top.commodity.color,
          topVolume: top.value.toNumber(),
          unit: top.unit,
          year,
          cropCount: uniqueRows.length
        };
      })
      .sort((left, right) => left.stateName.localeCompare(right.stateName));
  }

  async getDetail(stateCodeInput: string): Promise<StateDetail> {
    const stateCode = stateCodeInput.toUpperCase();
    if (!validStateCodes.has(stateCode)) throw new ApiError(400, "A valid two-letter U.S. state code is required.");
    const rows = await productionRepository.findStateRowsForSource(stateCode, OFFICIAL_SOURCE);
    if (!rows.length) throw new ApiError(404, `No production records are available for ${stateCode}.`);

    const uniqueRows = dedupeByCommodity(rows);
    const year = Math.max(...uniqueRows.map((row) => row.year));
    const totalVolume = uniqueRows.reduce((sum, row) => sum + row.value.toNumber(), 0);
    const production: StateCommodityProduction[] = uniqueRows.map((row) => ({
      commoditySlug: row.commodity.slug,
      commodityName: row.commodity.name,
      category: row.commodity.category,
      color: row.commodity.color,
      value: row.value.toNumber(),
      unit: row.unit,
      year: row.year,
      sharePercent: totalVolume > 0 ? (row.value.toNumber() / totalVolume) * 100 : 0,
      source: row.source,
      totalValueUsd: row.totalValueUsd?.toNumber() ?? null,
      unitPriceUsd: row.unitPriceUsd?.toNumber() ?? null
      ,yieldValue: row.yieldValue?.toNumber() ?? null
    }));

    return {
      stateCode,
      stateName: stateMetadata[stateCode]!.name,
      year,
      topCommodity: production[0]!,
      production,
      totalVolume,
      volumeUnit: production[0]!.unit,
      source: [...new Set(production.map((item) => item.source))].join(", "),
      totalProductionValueUsd: production.reduce((sum, item) => sum + (item.totalValueUsd ?? 0), 0)
    };
  }

  async nationalVolume(commodityId: string): Promise<{ value: number; unit: string; year: number | null }> {
    const year = await productionRepository.findLatestYear(commodityId);
    if (!year) return { value: 0, unit: "bushels", year: null };
    const rows = await productionRepository.findMapRows(commodityId, year);
    return {
      value: rows.reduce((sum, row) => sum + row.value.toNumber(), 0),
      unit: rows[0]?.unit ?? "bushels",
      year
    };
  }

  async nationalUnitValue(commodityId: string): Promise<number | null> {
    const year = await productionRepository.findLatestYear(commodityId, undefined, OFFICIAL_SOURCE);
    if (!year) return null;
    const rows = await productionRepository.findMapRows(commodityId, year, OFFICIAL_SOURCE);
    const quantity = rows.reduce((sum, row) => sum + row.value.toNumber(), 0);
    const totalValue = rows.reduce((sum, row) => sum + (row.totalValueUsd?.toNumber() ?? 0), 0);
    return quantity > 0 && totalValue > 0 ? totalValue / quantity : null;
  }
}

export const stateService = new StateService();
