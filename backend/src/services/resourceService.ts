import { readFile } from "node:fs/promises";
import type { FertilizerGuideResponse, LocalFoodDirectoryResponse, LocalFoodListing } from "@agripulse/shared";

interface RawMarket {
  listing_id: string; name: string | null; street: string | null; city: string | null; state: string | null; state_name: string | null;
  zip: string | null; phone: string | null; website: string | null; season: string | null; products: string[] | null;
  description: string | null;
}
interface MarketFile { generated: string; records: RawMarket[] }

let marketsPromise: Promise<MarketFile> | null = null;
function markets(): Promise<MarketFile> {
  marketsPromise ??= readFile(new URL("../../data/us-farmers-markets-2026.json", import.meta.url), "utf8")
    .then((value) => JSON.parse(value) as MarketFile);
  return marketsPromise;
}

function countyFromDescription(description: string | null): string | null {
  const match = description?.match(/\bin ([A-Za-z .'-]+) County\b/i);
  return match?.[1]?.trim() ?? null;
}

function safeWebsite(value: string | null): string | null {
  if (!value) return null;
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try { return new URL(normalized).toString(); } catch { return null; }
}

export async function searchLocalFoodDirectory(state = "", county = "", query = "", limit = 30): Promise<LocalFoodDirectoryResponse> {
  const data = await markets();
  const stateNeedle = state.trim().toLowerCase();
  const countyNeedle = county.trim().toLowerCase().replace(/\s+county$/, "");
  const queryNeedle = query.trim().toLowerCase();
  const filtered = data.records.filter((record) => {
    const recordCounty = countyFromDescription(record.description)?.toLowerCase() ?? "";
    const stateMatch = !stateNeedle || record.state?.toLowerCase() === stateNeedle || record.state_name?.toLowerCase() === stateNeedle;
    const countyMatch = !countyNeedle || recordCounty.includes(countyNeedle) || record.city?.toLowerCase().includes(countyNeedle);
    const haystack = `${record.name ?? ""} ${record.city ?? ""} ${(record.products ?? []).join(" ")}`.toLowerCase();
    return Boolean(record.name && record.state && stateMatch && countyMatch && (!queryNeedle || haystack.includes(queryNeedle)));
  });
  const listings: LocalFoodListing[] = filtered.slice(0, Math.min(Math.max(limit, 1), 100)).map((record) => ({
    id: record.listing_id, name: record.name!, street: record.street, city: record.city ?? "Location not reported",
    county: countyFromDescription(record.description), stateCode: record.state!, stateName: record.state_name ?? record.state!,
    zip: record.zip ?? "", phone: record.phone, website: safeWebsite(record.website), season: record.season,
    products: (record.products ?? []).slice(0, 8), productionSize: null
  }));
  return {
    listings, total: filtered.length, generatedAt: data.generated,
    source: "Harvestly Markets 2026, derived from USDA AMS Local Food Portal (CC BY 4.0)",
    sourceUrl: "https://harvestlymarkets.com/data-sources/",
    notice: "These are public market/business listings, not private farmer records. Personal emails and names are excluded; production size is not published by this directory."
  };
}

const cropGuides: FertilizerGuideResponse["crops"] = [
  ["Corn", "Planting", "Phosphorus and potassium", ["MAP", "Potash"], "Base placement on a current soil test; avoid seed contact with concentrated fertilizer."],
  ["Corn", "Early vegetative / sidedress", "Nitrogen and sulfur", ["Urea", "UAN 32-0-0", "Ammonium sulfate"], "Split nitrogen near rapid uptake; account for manure, legumes and weather losses."],
  ["Soybeans", "Before planting", "Phosphorus and potassium", ["MAP", "Potash"], "Apply only where soil tests indicate need; correct pH and confirm effective inoculation."],
  ["Soybeans", "Growing season", "Biological nitrogen fixation", [], "Routine nitrogen is generally unnecessary when nodulation is effective; diagnose poor nodulation before rescue treatment."],
  ["Wheat", "Pre-plant / planting", "Phosphorus and potassium", ["MAP", "Potash"], "Use soil-test placement appropriate to the seeding system."],
  ["Wheat", "Tillering / spring green-up", "Nitrogen and sulfur", ["Urea", "UAN 32-0-0", "Ammonium sulfate"], "Topdress to match yield potential and stand condition; split where loss risk is high."],
  ["Sorghum", "Planting", "Phosphorus and potassium", ["MAP", "Potash"], "Base rates on soil test and realistic yield goal."],
  ["Sorghum", "Early vegetative", "Nitrogen", ["Urea", "UAN 32-0-0"], "Apply before rapid growth; reduce for residual nitrogen and manure credits."],
  ["Barley", "Planting", "Phosphorus and potassium", ["MAP", "Potash"], "Use soil tests and avoid excess nitrogen where lodging or malt-protein risk matters."],
  ["Barley", "Tillering / green-up", "Nitrogen and sulfur", ["Urea", "UAN 32-0-0", "Ammonium sulfate"], "Topdress according to end use, stand and local Extension guidance."],
  ["Rice", "Pre-plant / pre-flood", "Phosphorus, potassium and nitrogen", ["MAP", "Potash", "Urea"], "Coordinate nitrogen timing with flood establishment and local rice recommendations."],
  ["Rice", "Midseason", "Nitrogen", ["Urea"], "Supplement only when cultivar, yield goal and crop condition justify it."],
  ["Cotton", "Pre-plant", "Phosphorus and potassium", ["MAP", "Potash"], "Soil-test potassium is especially important; use realistic yield goals."],
  ["Cotton", "Early square to bloom", "Nitrogen and sulfur", ["Urea", "UAN 32-0-0", "Ammonium sulfate"], "Split applications can reduce loss; avoid late excess nitrogen."],
  ["Peanuts", "Pre-plant", "Phosphorus and potassium", ["MAP", "Potash"], "Use soil tests; peanuts normally rely on fixation rather than fertilizer nitrogen."],
  ["Tobacco", "Pre-plant / transplant", "Balanced nutrients", ["MAP", "UAN 32-0-0"], "Follow tobacco-specific Extension recommendations and select low-chloride potassium sources locally."],
  ["Sugarcane", "Planting / early growth", "Nitrogen, phosphorus and potassium", ["Urea", "MAP", "Potash"], "Time nutrients for early canopy development using soil and tissue tests."],
].reduce<FertilizerGuideResponse["crops"]>((groups, [crop, timing, nutrientFocus, suitableProducts, guidance]) => {
  let group = groups.find((item) => item.crop === crop);
  if (!group) { group = { crop: crop as string, stages: [] }; groups.push(group); }
  group.stages.push({ timing: timing as string, nutrientFocus: nutrientFocus as string, suitableProducts: suitableProducts as string[], guidance: guidance as string });
  return groups;
}, []);

export function getFertilizerGuide(crop = ""): FertilizerGuideResponse {
  const needle = crop.trim().toLowerCase();
  return {
    crops: needle ? cropGuides.filter((item) => item.crop.toLowerCase().includes(needle)) : cropGuides,
    prices: [
      { product: "Urea", analysis: "46-0-0", priceUsdPerTon: 867.5, priceRangeUsdPerTon: [730, 1075] },
      { product: "UAN 32-0-0", analysis: "Liquid nitrogen", priceUsdPerTon: 673.75, priceRangeUsdPerTon: [575, 750] },
      { product: "Ammonium sulfate", analysis: "21-0-0-24S", priceUsdPerTon: 671.67, priceRangeUsdPerTon: [600, 780] },
      { product: "MAP", analysis: "11-52-0", priceUsdPerTon: 1020, priceRangeUsdPerTon: [960, 1075] },
      { product: "Potash", analysis: "0-0-60", priceUsdPerTon: 650, priceRangeUsdPerTon: [550, 700] }
    ],
    priceRegion: "Inter-Mountain West distributor level", priceDate: "2026-04-30",
    source: "USDA AMS Farm Production Cost Report; USDA ERS and land-grant Extension guidance",
    sourceUrl: "https://www.ams.usda.gov/mnreports/ams_3883.pdf",
    disclaimer: "General planning guidance only. Product suitability and rates depend on soil/tissue tests, crop history, yield goal, irrigation, formulation, local rules and Extension recommendations. Prices are a dated regional benchmark, not a quote."
  };
}
