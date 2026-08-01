import type { CropTradeFlow } from "@agripulse/shared";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

type GatsRecord = Record<string, unknown>;

const profiles = [
  { slug: "wheat", name: "Wheat", color: "#d5944a", hsCode: "1001" },
  { slug: "barley", name: "Barley", color: "#8a9b63", hsCode: "1003" },
  { slug: "corn", name: "Corn", color: "#e7b52f", hsCode: "1005" },
  { slug: "rice", name: "Rice", color: "#76a76c", hsCode: "1006" },
  { slug: "sorghum", name: "Sorghum", color: "#bb6951", hsCode: "1007" },
  { slug: "soybeans", name: "Soybeans", color: "#5e9f55", hsCode: "1201" },
  { slug: "peanuts", name: "Peanuts", color: "#b77b4f", hsCode: "1202" },
  { slug: "tobacco", name: "Tobacco", color: "#806b45", hsCode: "2401" },
  { slug: "cotton", name: "Cotton", color: "#9b87b3", hsCode: "5201" }
] as const;

const codeKeys = ["commodityCode", "CommodityCode", "hS10Code", "hs10Code", "HS10Code", "hS6Code", "hs6Code", "HS6Code", "hsCode", "HTSCode"];
const valueKeys = ["tradeValue", "TradeValue", "value", "Value", "primaryValue", "customsValue", "CustomsValue"];
const quantityKeys = ["quantity1", "quantity", "Quantity", "netWeight", "NetWeight", "netWgt", "metricTons", "MetricTons"];

// Largest and most relevant U.S. agricultural trading partners. GATS's Census
// feed is partner/month based; the older US UN-Comtrade reporter query returns
// no U.S. records. This bounded list keeps the live request reliable while
// covering the principal crop-trade destinations and origins.
const majorPartnerCodes = [
  "CA", "MX", "CH", "JA", "KS", "TW", "UK", "GM", "NL", "SP", "IT", "FR",
  "BE", "IN", "ID", "TH", "VM", "BR", "AR", "CI", "CO", "AS", "NZ", "EG"
] as const;

function field(row: GatsRecord, keys: string[]): unknown {
  return keys.map((key) => row[key]).find((value) => value !== undefined && value !== null);
}

function numeric(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function records(payload: unknown): GatsRecord[] {
  if (Array.isArray(payload)) return payload.filter((row): row is GatsRecord => !!row && typeof row === "object");
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  for (const key of ["data", "Data", "results", "Results", "items", "Items"]) {
    if (Array.isArray(object[key])) return records(object[key]);
  }
  return [];
}

function aggregate(rows: GatsRecord[], hsCode: string): { value: number; quantity: number | null } {
  const matches = rows.filter((row) => String(field(row, codeKeys) ?? "").replace(/\D/g, "").startsWith(hsCode));
  const value = matches.reduce((sum, row) => sum + numeric(field(row, valueKeys)), 0);
  const quantities = matches.map((row) => numeric(field(row, quantityKeys))).filter((item) => item > 0);
  return { value, quantity: quantities.length ? quantities.reduce((sum, item) => sum + item, 0) : null };
}

let cache: { expiresAt: number; value: CropTradeFlow[] } | null = null;

export class TradeService {
  private apiUrl(path: string): URL {
    const url = new URL(`${env.GATS_API_BASE_URL.replace(/\/$/, "")}${path}`);
    url.searchParams.set("api_key", env.GATS_API_KEY || env.GATS_API);
    return url;
  }

  private async requestPartner(flow: "Imports" | "Exports", partnerCode: string, year: number, month: number): Promise<GatsRecord[]> {
    const response = await fetch(this.apiUrl(`/api/gats/census${flow}/partnerCode/${partnerCode}/year/${year}/month/${String(month).padStart(2, "0")}`), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 160);
      throw new Error(`USDA FAS GATS ${flow.toLowerCase()} request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }
    return records(await response.json());
  }

  private async latestPeriod(): Promise<{ year: number; month: number }> {
    const now = new Date();
    for (let offset = 0; offset < 18; offset += 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const rows = await this.requestPartner("Exports", "MX", date.getUTCFullYear(), date.getUTCMonth() + 1);
      if (rows.length) return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    }
    throw new Error("USDA FAS GATS returned no recent U.S. Census crop-trade period.");
  }

  private async periodRecords(flow: "Imports" | "Exports", year: number, month: number): Promise<GatsRecord[]> {
    const results = await Promise.allSettled(
      majorPartnerCodes.map((partner) => this.requestPartner(flow, partner, year, month))
    );
    const rows = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!rows.length) throw new Error(`USDA FAS GATS returned no ${flow.toLowerCase()} records for ${year}-${String(month).padStart(2, "0")}.`);
    return rows;
  }

  async getCropTrade(): Promise<CropTradeFlow[]> {
    if (cache && cache.expiresAt > Date.now()) return cache.value;
    if (!(env.GATS_API_KEY || env.GATS_API)) {
      throw new Error("GATS_API_KEY is not configured. Create a USDA FAS Open Data API key and add it to backend/.env.");
    }

    const { year, month } = await this.latestPeriod();
    const [exports, imports] = await Promise.all([
      this.periodRecords("Exports", year, month),
      this.periodRecords("Imports", year, month)
    ]);
    const tradePeriod = `${year}-${String(month).padStart(2, "0")}`;

    const productionRows = await prisma.productionRecord.findMany({
      where: { source: "USDA NASS Quick Stats", commodity: { slug: { in: profiles.map(({ slug }) => slug) } } },
      include: { commodity: true }, orderBy: { year: "desc" }
    });
    const productionByCrop = new Map<string, typeof productionRows>();
    for (const row of productionRows) productionByCrop.set(row.commodity.slug, [...(productionByCrop.get(row.commodity.slug) ?? []), row]);

    const value = profiles.map((profile) => {
      const imported = aggregate(imports, profile.hsCode);
      const exported = aggregate(exports, profile.hsCode);
      const cropProduction = productionByCrop.get(profile.slug) ?? [];
      const productionYear = cropProduction.length ? Math.max(...cropProduction.map((row) => row.year)) : null;
      const latestRows = productionYear === null ? [] : cropProduction.filter((row) => row.year === productionYear);
      const productionQuantity = latestRows.reduce((sum, row) => sum + row.value.toNumber(), 0);
      const plantedRows = latestRows.filter((row) => row.plantedAcres !== null);
      const harvestedRows = latestRows.filter((row) => row.harvestedAcres !== null);
      const revenueRows = latestRows.filter((row) => row.totalValueUsd !== null);
      const acresPlanted = plantedRows.length ? plantedRows.reduce((sum, row) => sum + row.plantedAcres!.toNumber(), 0) : null;
      const acresHarvested = harvestedRows.length ? harvestedRows.reduce((sum, row) => sum + row.harvestedAcres!.toNumber(), 0) : null;
      const revenueUsd = revenueRows.length ? revenueRows.reduce((sum, row) => sum + row.totalValueUsd!.toNumber(), 0) : null;
      const tradeTotal = exported.value + imported.value;
      return {
        commoditySlug: profile.slug, commodityName: profile.name, color: profile.color, hsCode: profile.hsCode, year,
        tradePeriod,
        coverage: `${majorPartnerCodes.length} major U.S. agricultural trading partners`,
        exportValueUsd: exported.value, importValueUsd: imported.value, balanceUsd: exported.value - imported.value,
        exportQuantityKg: exported.quantity, importQuantityKg: imported.quantity,
        yieldValue: acresHarvested && acresHarvested > 0 ? productionQuantity / acresHarvested : null,
        yieldUnit: acresHarvested && latestRows[0] ? `${latestRows[0].unit} / acre` : null,
        acresPlanted, acresHarvested, revenueUsd,
        exportTradeSharePercent: tradeTotal > 0 ? (exported.value / tradeTotal) * 100 : 0,
        averagePriceUsd: revenueUsd !== null && productionQuantity > 0 ? revenueUsd / productionQuantity : null,
        averagePriceUnit: revenueUsd !== null && latestRows[0] ? `USD / ${latestRows[0].unit.toLowerCase().replace(/s$/, "")}` : null,
        productionYear, source: "USDA FAS GATS Census feed",
        sourceUrl: "https://apps.fas.usda.gov/gats/default.aspx?publish=1"
      } satisfies CropTradeFlow;
    }).filter((item) => item.exportValueUsd > 0 || item.importValueUsd > 0);

    if (!value.length) throw new Error(`USDA FAS GATS returned no matching crop trade records for ${year}.`);
    cache = { value, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
    return value;
  }
}

export const tradeService = new TradeService();
