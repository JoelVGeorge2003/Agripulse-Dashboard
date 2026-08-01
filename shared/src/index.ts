export type CommodityCategory = "GRAIN" | "OILSEED" | "FIBER" | "SPECIALTY" | "LIVESTOCK";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Commodity {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  category: CommodityCategory;
  defaultUnit: string;
  color: string;
  description: string | null;
  featured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommodityInput {
  slug: string;
  name: string;
  symbol: string;
  category: CommodityCategory;
  defaultUnit: string;
  color: string;
  description?: string;
  featured?: boolean;
  displayOrder?: number;
}

export interface LatestPrice {
  id: string;
  commodityId: string;
  commoditySlug: string;
  commodityName: string;
  symbol: string;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
  unit: string;
  stateCode: string | null;
  priceDate: string;
  source: string;
  isStale: boolean;
}

export interface PricePoint {
  id: string;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
  unit: string;
  stateCode: string | null;
  priceDate: string;
  source: string;
}

export interface CropPriceGrowth {
  commoditySlug: string;
  commodityName: string;
  color: string;
  unit: string;
  firstValue: number;
  latestValue: number;
  growthPercent: number;
  firstDate: string;
  latestDate: string;
  observations: Array<{ date: string; value: number }>;
  source: string;
}

export interface CropTradeFlow {
  commoditySlug: string;
  commodityName: string;
  color: string;
  hsCode: string;
  year: number;
  tradePeriod: string;
  coverage: string;
  exportValueUsd: number;
  importValueUsd: number;
  balanceUsd: number;
  exportQuantityKg: number | null;
  importQuantityKg: number | null;
  yieldValue: number | null;
  yieldUnit: string | null;
  acresPlanted: number | null;
  acresHarvested: number | null;
  revenueUsd: number | null;
  exportTradeSharePercent: number;
  averagePriceUsd: number | null;
  averagePriceUnit: string | null;
  productionYear: number | null;
  source: string;
  sourceUrl: string;
}

export interface ProductionRecord {
  id: string;
  commodityId: string;
  commoditySlug: string;
  commodityName: string;
  stateCode: string;
  year: number;
  value: number;
  unit: string;
  plantedAcres: number | null;
  harvestedAcres: number | null;
  yieldValue: number | null;
  source: string;
  totalValueUsd: number | null;
  unitPriceUsd: number | null;
}

export interface MapDatum {
  stateCode: string;
  stateName: string;
  commoditySlug: string;
  commodityName: string;
  year: number;
  value: number;
  unit: string;
  rank: number;
  sharePercent: number;
}

export interface CommoditySnapshot extends LatestPrice {
  commodityColor: string;
  productionVolume: number;
  productionUnit: string;
  productionYear: number | null;
}

export interface StateSummary {
  stateCode: string;
  stateName: string;
  topCommoditySlug: string;
  topCommodityName: string;
  topCommodityColor: string;
  topVolume: number;
  unit: string;
  year: number;
  cropCount: number;
}

export interface StateCommodityProduction {
  commoditySlug: string;
  commodityName: string;
  category: CommodityCategory;
  color: string;
  value: number;
  unit: string;
  year: number;
  sharePercent: number;
  source: string;
  totalValueUsd: number | null;
  unitPriceUsd: number | null;
  yieldValue: number | null;
}

export interface StateDetail {
  stateCode: string;
  stateName: string;
  year: number;
  topCommodity: StateCommodityProduction;
  production: StateCommodityProduction[];
  totalVolume: number;
  volumeUnit: string;
  source: string;
  totalProductionValueUsd: number;
}

export interface CountyProduction {
  countyFips: string;
  countyName: string;
  value: number;
  unit: string;
  year: number;
  rank: number;
  sharePercent: number;
}

export interface CountyProductionDetail {
  stateCode: string;
  stateName: string;
  commoditySlug: string;
  commodityName: string;
  color: string;
  year: number;
  unit: string;
  source: string;
  counties: CountyProduction[];
}

export interface LocalFoodListing {
  id: string;
  name: string;
  street: string | null;
  city: string;
  county: string | null;
  stateCode: string;
  stateName: string;
  zip: string;
  phone: string | null;
  website: string | null;
  season: string | null;
  products: string[];
  productionSize: null;
}

export interface LocalFoodDirectoryResponse {
  listings: LocalFoodListing[];
  total: number;
  source: string;
  sourceUrl: string;
  generatedAt: string;
  notice: string;
}

export interface FertilizerProductPrice {
  product: string;
  analysis: string;
  priceUsdPerTon: number;
  priceRangeUsdPerTon: [number, number];
}

export interface CropFertilizerGuide {
  crop: string;
  stages: Array<{
    timing: string;
    nutrientFocus: string;
    suitableProducts: string[];
    guidance: string;
  }>;
}

export interface FertilizerGuideResponse {
  crops: CropFertilizerGuide[];
  prices: FertilizerProductPrice[];
  priceRegion: string;
  priceDate: string;
  source: string;
  sourceUrl: string;
  disclaimer: string;
}

export interface DecisionRiskScore { key: string; label: string; score: number; explanation: string; }
export interface DecisionExplainability {
  inputs: Record<string, unknown>;
  rulesUsed: string[];
  sources: Array<{ name: string; url: string }>;
  limitations: string[];
}
export interface DecisionRecommendation {
  recommendationId: string | null;
  action: string;
  reason: string;
  confidence: number;
  estimatedImpact: Record<string, unknown>;
  alternativeAction: string;
  risks: DecisionRiskScore[];
  explainability: DecisionExplainability;
}
export interface DecisionOverview {
  stateCode: string;
  stateName: string;
  cropSlug: string;
  cropName: string;
  recommendation: DecisionRecommendation;
}
export interface ScenarioChanges {
  rainfallPercent: number;
  temperatureF: number;
  cropPricePercent: number;
  fuelCostPercent: number;
  fertilizerCostPercent: number;
}
export interface ScenarioResult {
  baseline: Record<string, number>;
  scenario: Record<string, number>;
  changes: ScenarioChanges;
  assumptions: string[];
  confidence: number;
  explainability: DecisionExplainability;
}
export interface CopilotDecisionResponse {
  recommendedAction: string;
  explanation: string;
  confidence: number;
  expectedBenefitOrRisk: string;
  alternativeAction: string;
  dataSources: Array<{ name: string; url: string }>;
  limitations: string[];
  recommendationId: string | null;
  generatedBy: "openai" | "ollama" | "deterministic";
  model: string;
  retrievedChunks: number;
  evaluation: {
    confidenceScore: number;
    level: "high" | "medium" | "low";
    groundingScore: number;
    citationCoverageScore: number;
    relevanceScore: number;
    actionConsistencyScore: number;
    dataQualityScore: number;
    explanation: string;
    strongestEvidence: string[];
    flags: string[];
    missingInputToImprove: string | null;
  };
}

export interface DashboardOverview {
  featuredCommodities: CommoditySnapshot[];
  states: StateSummary[];
  defaultStateCode: string;
  dataAsOf: string | null;
  lastSyncAt: string | null;
}

export interface WeatherCurrent {
  temperatureF: number;
  relativeHumidityPercent: number;
  precipitationInches: number;
  windSpeedMph: number;
  weatherCode: number;
  soilMoisture: number | null;
  observedAt: string;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  temperatureMaxF: number;
  temperatureMinF: number;
  precipitationInches: number;
  precipitationProbabilityPercent: number;
  evapotranspirationInches: number;
}

export type WeatherImpactLevel = "FAVOURABLE" | "WATCH" | "HIGH_RISK";

export interface WeatherImpact {
  level: WeatherImpactLevel;
  score: number;
  headline: string;
  summary: string;
  drivers: string[];
  actions: string[];
}

export interface WeatherIncident {
  status: "ALERT" | "POTENTIAL" | "NONE" | "HISTORICAL";
  title: string;
  summary: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  startDate: string | null;
  endDate: string | null;
  source: string;
  sourceUrl: string | null;
}

export interface StateWeatherResponse {
  stateCode: string;
  stateName: string;
  cropName: string;
  latitude: number;
  longitude: number;
  current: WeatherCurrent;
  daily: WeatherDay[];
  impact: WeatherImpact;
  potentialIncident: WeatherIncident;
  previousIncident: WeatherIncident | null;
  fetchedAt: string;
  source: string;
}

export interface DashboardSummary {
  commodityCount: number;
  statesCovered: number;
  latestObservation: string | null;
  lastSyncAt: string | null;
  latestPrices: LatestPrice[];
  topProductionStates: MapDatum[];
}

export interface CommodityDetail {
  commodity: Commodity;
  latestPrice: LatestPrice | null;
  priceHistory: PricePoint[];
  production: MapDatum[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ChatCitation {
  label: string;
  value: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  commoditySlug?: string;
  stateCode?: string;
  sessionId?: string;
  history?: ChatTurn[];
}

export interface ChatResponse {
  answer: string;
  model: string;
  generatedBy: "openai" | "ollama" | "fallback";
  citations: ChatCitation[];
  asOf: string;
  evaluation?: {
    confidenceScore: number;
    groundednessScore: number;
    citationCoverageScore: number;
    relevanceScore: number;
    status: "high" | "medium" | "low";
    flags: string[];
  };
  sessionId?: string;
}

export interface SyncResult {
  source: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  pricesUpserted: number;
  productionRecordsUpserted: number;
  startedAt: string;
  finishedAt: string;
  message: string;
}
