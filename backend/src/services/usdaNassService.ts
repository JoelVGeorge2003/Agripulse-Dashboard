import type { CountyProductionDetail, SyncResult } from "@agripulse/shared";
import type { Commodity } from "@prisma/client";
import { env } from "../config/env.js";
import type { NassResponse, NassRow } from "../models/usda.types.js";
import { commodityRepository } from "../repositories/commodityRepository.js";
import { priceRepository } from "../repositories/priceRepository.js";
import { productionRepository } from "../repositories/productionRepository.js";
import { syncRepository } from "../repositories/syncRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { parseNassNumber } from "../utils/number.js";
import { stateMetadata, validStateCodes } from "../utils/stateMetadata.js";

const USDA_SOURCE = "USDA NASS Quick Stats";
const REQUEST_PACING_MS = 750;
let nextRequestAt = 0;
const countyCache = new Map<string, { expiresAt: number; value: CountyProductionDetail }>();

async function paceRequest(): Promise<void> {
  const waitMs = Math.max(0, nextRequestAt - Date.now());
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  nextRequestAt = Date.now() + REQUEST_PACING_MS;
}

interface NassCommodityProfile {
  sector: "CROPS" | "ANIMALS & PRODUCTS";
  group: string;
  commodity?: string;
  statistic: "PRODUCTION" | "INVENTORY";
  shortDescription?: string;
  unit: string;
  priceDescription?: string;
  priceFrequency?: "MONTHLY" | "ANNUAL";
}

const nassProfiles: Record<string, NassCommodityProfile> = {
  corn: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  soybeans: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  wheat: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  sorghum: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU", priceDescription: "SORGHUM, GRAIN - PRICE RECEIVED, MEASURED IN $ / BU" },
  barley: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  rice: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "CWT" },
  cotton: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BALES", priceDescription: "COTTON, UPLAND - PRICE RECEIVED, MEASURED IN $ / LB" },
  peanuts: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "LB" },
  tobacco: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "LB", priceFrequency: "ANNUAL" },
  sugarcane: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "TONS", priceFrequency: "ANNUAL" },
  oats: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  rye: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  canola: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "LB" },
  sunflower: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "LB" },
  "dry-beans": { sector: "CROPS", group: "FIELD CROPS", commodity: "BEANS, DRY EDIBLE", statistic: "PRODUCTION", shortDescription: "BEANS, DRY EDIBLE - PRODUCTION", unit: "CWT" },
  potatoes: { sector: "CROPS", group: "VEGETABLES", statistic: "PRODUCTION", unit: "CWT" },
  sugarbeets: { sector: "CROPS", group: "FIELD CROPS", commodity: "SUGARBEETS", statistic: "PRODUCTION", unit: "TONS" },
  hay: { sector: "CROPS", group: "FIELD CROPS", commodity: "HAY", statistic: "PRODUCTION", shortDescription: "HAY - PRODUCTION", unit: "TONS" },
  "proso-millet": { sector: "CROPS", group: "FIELD CROPS", commodity: "MILLET, PROSO", statistic: "PRODUCTION", shortDescription: "MILLET, PROSO - PRODUCTION", unit: "BU" },
  flaxseed: { sector: "CROPS", group: "FIELD CROPS", statistic: "PRODUCTION", unit: "BU" },
  cattle: { sector: "ANIMALS & PRODUCTS", group: "LIVESTOCK", statistic: "INVENTORY", shortDescription: "CATTLE, INCL CALVES - INVENTORY", unit: "HEAD" },
  hogs: { sector: "ANIMALS & PRODUCTS", group: "LIVESTOCK", statistic: "INVENTORY", shortDescription: "HOGS - INVENTORY", unit: "HEAD" },
  broilers: { sector: "ANIMALS & PRODUCTS", group: "POULTRY", commodity: "CHICKENS", statistic: "PRODUCTION", shortDescription: "CHICKENS, BROILERS - PRODUCTION", unit: "HEAD" },
  milk: { sector: "ANIMALS & PRODUCTS", group: "DAIRY", statistic: "PRODUCTION", shortDescription: "MILK - PRODUCTION", unit: "LB" },
  eggs: { sector: "ANIMALS & PRODUCTS", group: "POULTRY", statistic: "PRODUCTION", shortDescription: "EGGS - PRODUCTION", unit: "EGGS" }
};

const monthByLabel: Record<string, number> = {
  JAN: 1, JANUARY: 1, FEB: 2, FEBRUARY: 2, MAR: 3, MARCH: 3,
  APR: 4, APRIL: 4, MAY: 5, JUN: 6, JUNE: 6, JUL: 7, JULY: 7,
  AUG: 8, AUGUST: 8, SEP: 9, SEPTEMBER: 9, OCT: 10, OCTOBER: 10,
  NOV: 11, NOVEMBER: 11, DEC: 12, DECEMBER: 12
};

function normalizeUnit(unit: string | undefined, fallback: string): string {
  if (!unit) return fallback;
  const normalized = unit.trim().toUpperCase();
  if (
    normalized === "$ / BU" ||
    normalized === "$ / BUSHEL" ||
    normalized === "$ / BUSHELS" ||
    normalized === "DOLLARS / BU" ||
    normalized === "DOLLARS PER BUSHEL"
  ) return "USD / bushel";
  if (normalized === "$ / CWT" || normalized === "DOLLARS / CWT") return "USD / cwt";
  if (normalized === "$ / LB" || normalized === "$ / POUND" || normalized === "DOLLARS / LB") return "USD / pound";
  if (normalized === "$ / TON" || normalized === "DOLLARS / TON") return "USD / ton";
  if (normalized === "BU") return "bushels";
  return unit;
}

function rowDate(row: NassRow): Date {
  const year = Number(row.year ?? new Date().getUTCFullYear());
  const beginMonth = Number(row.begin_code?.slice(0, 2));
  const periodLabel = row.reference_period_desc?.toUpperCase().split(" ")[0] ?? "";
  const month =
    beginMonth >= 1 && beginMonth <= 12
      ? beginMonth
      : monthByLabel[periodLabel] ?? 1;
  return new Date(Date.UTC(year, month - 1, 1));
}

export class UsdaNassService {
  private priceDescription(commodity: Commodity, profile: NassCommodityProfile): string {
    if (profile.priceDescription) return profile.priceDescription;
    const suffix = commodity.defaultUnit === "USD / bushel" ? "BU"
      : commodity.defaultUnit === "USD / cwt" ? "CWT"
      : commodity.defaultUnit === "USD / pound" ? "LB"
      : commodity.defaultUnit === "USD / ton" ? "TON" : "";
    return `${commodity.name.toUpperCase()} - PRICE RECEIVED, MEASURED IN $ / ${suffix}`;
  }

  private async fetchRows(parameters: Record<string, string>): Promise<NassRow[]> {
    if (!env.NASS_API_KEY) {
      throw new ApiError(
        503,
        "NASS_API_KEY is not configured. Add a USDA NASS Quick Stats API key to backend/.env."
      );
    }

    const search = new URLSearchParams({ key: env.NASS_API_KEY, format: "JSON", ...parameters });
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await paceRequest();
      response = await fetch(`${env.NASS_API_BASE_URL}?${search.toString()}`, { signal: AbortSignal.timeout(30_000) });
      if (response.ok || ![403, 429].includes(response.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
    }
    if (!response?.ok) throw new Error(`USDA NASS request failed with HTTP ${response?.status ?? "unknown"}`);

    const payload = (await response.json()) as NassResponse;
    if (payload.error) {
      const message = Array.isArray(payload.error) ? payload.error.join("; ") : payload.error;
      throw new Error(message);
    }
    return payload.data ?? [];
  }

  private async fetchLatestPriceRows(commodity: Commodity): Promise<NassRow[]> {
    const profile = nassProfiles[commodity.slug];
    if (!profile) return [];
    const description = this.priceDescription(commodity, profile);
    return this.fetchRows({
      source_desc: "SURVEY",
      sector_desc: profile.sector,
      group_desc: profile.group,
      commodity_desc: profile.commodity ?? commodity.name.toUpperCase(),
      statisticcat_desc: "PRICE RECEIVED",
      agg_level_desc: "NATIONAL",
      freq_desc: profile.priceFrequency ?? "MONTHLY",
      domain_desc: "TOTAL",
      short_desc: description,
      year__GE: String(new Date().getUTCFullYear() - 20)
    });
  }

  private async syncPrices(commodity: Commodity): Promise<number> {
    const profile = nassProfiles[commodity.slug];
    if (!profile) return 0;
    const description = this.priceDescription(commodity, profile);
    const rows = await this.fetchLatestPriceRows(commodity);
    const observations = rows
      .map((row) => ({ row, value: parseNassNumber(row.Value), date: rowDate(row) }))
      .filter((item): item is { row: NassRow; value: number; date: Date } =>
        item.value !== null &&
        item.row.domain_desc === "TOTAL" &&
        item.row.short_desc?.toUpperCase() === description &&
        normalizeUnit(item.row.unit_desc, commodity.defaultUnit) === commodity.defaultUnit
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (observations.length > 0) await priceRepository.deleteSourceForCommodity(commodity.id, USDA_SOURCE);
    let upserted = 0;
    for (let index = 0; index < observations.length; index += 1) {
      const observation = observations[index]!;
      const previous = index > 0 ? observations[index - 1]!.value : null;
      const changePercent = previous
        ? ((observation.value - previous) / previous) * 100
        : null;

      await priceRepository.upsert({
        commodityId: commodity.id,
        stateCode: "US",
        value: observation.value,
        previousValue: previous,
        changePercent,
        unit: normalizeUnit(observation.row.unit_desc, commodity.defaultUnit),
        priceDate: observation.date,
        source: USDA_SOURCE,
        sourceRecordId: observation.row.short_desc
      });
      upserted += 1;
    }
    if (upserted > 0) await priceRepository.deleteSourceForCommodity(commodity.id, "Demo market feed");
    return upserted;
  }

  private async syncProduction(commodity: Commodity): Promise<number> {
    const profile = nassProfiles[commodity.slug];
    if (!profile) return 0;
    let year = new Date().getUTCFullYear() - 1;
    let rows: NassRow[] = [];
    for (const candidateYear of [year, year - 1]) {
      const parameters: Record<string, string> = {
        source_desc: "SURVEY",
        sector_desc: profile.sector,
        group_desc: profile.group,
        commodity_desc: profile.commodity ?? commodity.name.toUpperCase(),
        statisticcat_desc: profile.statistic,
        agg_level_desc: "STATE",
        year: String(candidateYear)
      };
      if (profile.statistic === "PRODUCTION") parameters.freq_desc = "ANNUAL";
      try {
        rows = await this.fetchRows(parameters);
      } catch {
        rows = [];
      }
      if (rows.length) {
        year = candidateYear;
        break;
      }
    }

    const bestByState = new Map<string, { row: NassRow; value: number }>();
    const valueByState = new Map<string, number>();
    for (const row of rows) {
      const stateCode = row.state_alpha;
      const value = parseNassNumber(row.Value);
      const unit = row.unit_desc?.toUpperCase() ?? "";
      const shortDescription = row.short_desc?.toUpperCase() ?? "";
      if (!stateCode || value === null) continue;
      if (profile.shortDescription && !shortDescription.includes(profile.shortDescription)) continue;
      if (shortDescription.includes("IRRIGATED") || shortDescription.includes("NON-IRRIGATED")) continue;
      if (shortDescription.includes("UTILIZED") || shortDescription.includes("MARKETINGS")) continue;
      if (row.domain_desc && row.domain_desc !== "TOTAL") continue;

      if (unit.startsWith("$")) {
        const dollarValue = unit.includes("1,000") || unit.includes("THOUSAND") ? value * 1_000 : value;
        const currentValue = valueByState.get(stateCode) ?? 0;
        if (dollarValue > currentValue) valueByState.set(stateCode, dollarValue);
        continue;
      }
      if (unit !== profile.unit) continue;

      const current = bestByState.get(stateCode);
      if (!current || value > current.value) bestByState.set(stateCode, { row, value });
    }

    const acreageByStatistic = new Map<string, Map<string, number>>();
    if (profile.sector === "CROPS") {
      for (const statistic of ["AREA PLANTED", "AREA HARVESTED"]) {
        try {
          const acreageRows = await this.fetchRows({
            source_desc: "SURVEY",
            sector_desc: profile.sector,
            group_desc: profile.group,
            commodity_desc: profile.commodity ?? commodity.name.toUpperCase(),
            statisticcat_desc: statistic,
            agg_level_desc: "STATE",
            freq_desc: "ANNUAL",
            year: String(year)
          });
          const values = new Map<string, number>();
          for (const row of acreageRows) {
            const stateCode = row.state_alpha;
            const amount = parseNassNumber(row.Value);
            const description = row.short_desc?.toUpperCase() ?? "";
            if (!stateCode || amount === null || row.unit_desc?.toUpperCase() !== "ACRES") continue;
            if (row.domain_desc && row.domain_desc !== "TOTAL") continue;
            if (description.includes("IRRIGATED") || description.includes("NON-IRRIGATED")) continue;
            const current = values.get(stateCode) ?? 0;
            if (amount > current) values.set(stateCode, amount);
          }
          acreageByStatistic.set(statistic, values);
        } catch {
          // Preserve production synchronization when optional acreage statistics are unavailable.
        }
      }
    }

    const acreageStates = new Set([
      ...(acreageByStatistic.get("AREA PLANTED")?.keys() ?? []),
      ...(acreageByStatistic.get("AREA HARVESTED")?.keys() ?? [])
    ]);
    for (const stateCode of acreageStates) {
      const plantedAcres = acreageByStatistic.get("AREA PLANTED")?.get(stateCode);
      const harvestedAcres = acreageByStatistic.get("AREA HARVESTED")?.get(stateCode);
      const productionValue = bestByState.get(stateCode)?.value;
      await productionRepository.updateAcreage(commodity.id, stateCode, year, USDA_SOURCE, {
        ...(plantedAcres !== undefined ? { plantedAcres } : {}),
        ...(harvestedAcres !== undefined ? { harvestedAcres } : {}),
        ...(harvestedAcres && productionValue ? { yieldValue: productionValue / harvestedAcres } : {})
      });
    }

    let upserted = 0;
    for (const [stateCode, item] of bestByState) {
      const totalValueUsd = valueByState.get(stateCode) ?? null;
      const plantedAcres = acreageByStatistic.get("AREA PLANTED")?.get(stateCode) ?? null;
      const harvestedAcres = acreageByStatistic.get("AREA HARVESTED")?.get(stateCode) ?? null;
      await productionRepository.upsert({
        commodityId: commodity.id,
        stateCode,
        year,
        value: item.value,
        unit: normalizeUnit(item.row.unit_desc, commodity.category === "LIVESTOCK" ? "head" : "units"),
        plantedAcres,
        harvestedAcres,
        yieldValue: harvestedAcres && harvestedAcres > 0 ? item.value / harvestedAcres : null,
        totalValueUsd,
        unitPriceUsd: totalValueUsd === null || item.value <= 0 ? null : totalValueUsd / item.value,
        source: USDA_SOURCE,
        sourceRecordId: item.row.short_desc
      });
      upserted += 1;
    }
    if (upserted > 0) await productionRepository.deleteSourceForCommodity(commodity.id, "Demo production seed");
    return upserted;
  }

  async getCountyProduction(stateCodeInput: string, commoditySlug: string): Promise<CountyProductionDetail> {
    const stateCode = stateCodeInput.toUpperCase();
    if (!validStateCodes.has(stateCode)) throw new ApiError(400, "A valid two-letter U.S. state code is required.");
    const cacheKey = stateCode + ":" + commoditySlug;
    const cached = countyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const commodity = await commodityRepository.findByIdOrSlug(commoditySlug);
    if (!commodity || commodity.category === "LIVESTOCK") throw new ApiError(400, "A valid crop commodity is required for county production.");
    const profile = nassProfiles[commodity.slug];
    if (!profile) throw new ApiError(404, "County production is not configured for " + commodity.name + ".");
    let year = new Date().getUTCFullYear() - 1;
    let rows: NassRow[] = [];
    let countySource = USDA_SOURCE;
    for (const candidate of [year, year - 1, year - 2]) {
      try {
        rows = await this.fetchRows({
          source_desc: "SURVEY", sector_desc: profile.sector, group_desc: profile.group,
          commodity_desc: profile.commodity ?? commodity.name.toUpperCase(),
          statisticcat_desc: profile.statistic, agg_level_desc: "COUNTY",
          state_alpha: stateCode, freq_desc: "ANNUAL", year: String(candidate)
        });
      } catch { rows = []; }
      if (rows.length) { year = candidate; break; }
    }
    if (!rows.length) {
      for (const censusYear of [2022, 2017]) {
        try {
          rows = await this.fetchRows({
            source_desc: "CENSUS", sector_desc: profile.sector, group_desc: profile.group,
            commodity_desc: profile.commodity ?? commodity.name.toUpperCase(),
            statisticcat_desc: profile.statistic, agg_level_desc: "COUNTY",
            state_alpha: stateCode, freq_desc: "ANNUAL", year: String(censusYear)
          });
        } catch { rows = []; }
        if (rows.length) { year = censusYear; countySource = "USDA NASS Census of Agriculture via Quick Stats"; break; }
      }
    }
    const bestByCounty = new Map<string, { countyName: string; value: number }>();
    for (const row of rows) {
      const value = parseNassNumber(row.Value);
      const countyCode = row.county_ansi?.padStart(3, "0");
      const stateAnsi = row.state_ansi?.padStart(2, "0");
      const description = row.short_desc?.toUpperCase() ?? "";
      if (!countyCode || countyCode === "000" || !stateAnsi || value === null || !row.county_name || /OTHER COUNT/i.test(row.county_name)) continue;
      if (row.unit_desc?.toUpperCase() !== profile.unit || (row.domain_desc && row.domain_desc !== "TOTAL")) continue;
      if (profile.shortDescription && !description.includes(profile.shortDescription)) continue;
      if (description.includes("IRRIGATED") || description.includes("NON-IRRIGATED")) continue;
      const countyFips = stateAnsi + countyCode;
      const current = bestByCounty.get(countyFips);
      if (!current || value > current.value) bestByCounty.set(countyFips, { countyName: row.county_name, value });
    }
    if (!bestByCounty.size) throw new ApiError(404, "No USDA NASS county records are available for " + commodity.name + " in " + stateCode + ".");
    const sorted = [...bestByCounty.entries()].sort((left, right) => right[1].value - left[1].value);
    const total = sorted.reduce((sum, [, item]) => sum + item.value, 0);
    const normalizedUnit = normalizeUnit(profile.unit, commodity.defaultUnit);
    const result: CountyProductionDetail = {
      stateCode, stateName: stateMetadata[stateCode]!.name, commoditySlug: commodity.slug,
      commodityName: commodity.name, color: commodity.color, year, unit: normalizedUnit, source: countySource,
      counties: sorted.map(([countyFips, item], index) => ({
        countyFips, countyName: item.countyName.replace(/\s+COUNTY$/i, ""), value: item.value,
        unit: normalizedUnit, year, rank: index + 1, sharePercent: total > 0 ? item.value / total * 100 : 0
      }))
    };
    countyCache.set(cacheKey, { value: result, expiresAt: Date.now() + 12 * 60 * 60 * 1000 });
    return result;
  }

  async sync(commoditySlugs?: string[], pricesOnly = false): Promise<SyncResult> {
    if (!env.NASS_API_KEY) {
      throw new ApiError(
        503,
        "NASS_API_KEY is not configured. Add a USDA NASS Quick Stats API key to backend/.env."
      );
    }

    const startedAt = new Date();
    const syncRecord = await syncRepository.start(USDA_SOURCE);
    const allCommodities = await commodityRepository.findAll();
    const selected = commoditySlugs?.length
      ? allCommodities.filter((item) => commoditySlugs.includes(item.slug))
      : allCommodities;

    let pricesUpserted = 0;
    let productionRecordsUpserted = 0;
    const failures: string[] = [];

    for (const commodity of selected) {
      if (!pricesOnly) {
        try {
          productionRecordsUpserted += await this.syncProduction(commodity);
        } catch (error: unknown) {
          failures.push(
            `${commodity.name} production: ${error instanceof Error ? error.message : "Unknown synchronization error"}`
          );
        }
      }
      if (commodity.category !== "LIVESTOCK") {
        try {
          pricesUpserted += await this.syncPrices(commodity);
        } catch (error: unknown) {
          failures.push(
            `${commodity.name} prices: ${error instanceof Error ? error.message : "Unknown synchronization error"}`
          );
        }
      }
    }

    const status = failures.length === 0 ? "SUCCESS" : failures.length < selected.length ? "PARTIAL" : "FAILED";
    const message =
      failures.length === 0
        ? `Synchronized ${selected.length} commodities.`
        : `Synchronization completed with errors: ${failures.join(" | ")}`;
    const finished = await syncRepository.finish(
      syncRecord.id,
      status,
      { pricesUpserted, productionUpserted: productionRecordsUpserted },
      message
    );

    return {
      source: USDA_SOURCE,
      status,
      pricesUpserted,
      productionRecordsUpserted,
      startedAt: startedAt.toISOString(),
      finishedAt: (finished.finishedAt ?? new Date()).toISOString(),
      message
    };
  }
}

export const usdaNassService = new UsdaNassService();
