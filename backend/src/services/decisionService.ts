import type { CopilotDecisionResponse, DecisionOverview, ScenarioChanges, ScenarioResult } from "@agripulse/shared";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { intelligenceClient } from "./intelligenceClient.js";
import { stateService } from "./stateService.js";
import { weatherService } from "./weatherService.js";

async function buildContext(stateCode: string, cropSlug?: string, acres = 100, cropStage = "unspecified") {
  const [state, weather] = await Promise.all([stateService.getDetail(stateCode), weatherService.getForState(stateCode)]);
  const crop = state.production.find((item) => item.commoditySlug === cropSlug) ?? state.production.find((item) => item.category !== "LIVESTOCK") ?? state.topCommodity;
  if (crop.category === "LIVESTOCK") throw new ApiError(400, "Decision support currently requires a crop commodity.");
  return {
    stateCode: state.stateCode, stateName: state.stateName, cropSlug: crop.commoditySlug, cropName: crop.commodityName,
    acres, cropStage, currentTemperatureF: weather.current.temperatureF,
    relativeHumidityPercent: weather.current.relativeHumidityPercent, soilMoisture: weather.current.soilMoisture,
    daily: weather.daily.map((day) => ({ date: day.date, temperatureMaxF: day.temperatureMaxF, temperatureMinF: day.temperatureMinF, precipitationInches: day.precipitationInches, precipitationProbabilityPercent: day.precipitationProbabilityPercent, evapotranspirationInches: day.evapotranspirationInches })),
    productionValue: crop.value, productionUnit: crop.unit, productionYear: crop.year,
    yieldPerAcre: crop.yieldValue, cropPrice: crop.unitPriceUsd, priceUnit: crop.unitPriceUsd === null ? null : `USD / ${crop.unit.replace(/s$/, "")}`,
    priceDate: null, fuelCostPerAcre: 42, fertilizerCostPerAcre: 135
  };
}

export const decisionService = {
  async overview(stateCode: string, cropSlug?: string, acres = 100, cropStage = "unspecified"): Promise<DecisionOverview> {
    const context = await buildContext(stateCode, cropSlug, acres, cropStage);
    return { stateCode: context.stateCode, stateName: context.stateName, cropSlug: context.cropSlug, cropName: context.cropName, recommendation: await intelligenceClient.getRecommendation(context) };
  },
  async scenario(stateCode: string, cropSlug: string | undefined, acres: number, cropStage: string, changes: ScenarioChanges): Promise<ScenarioResult> {
    return intelligenceClient.simulate(await buildContext(stateCode, cropSlug, acres, cropStage), changes);
  },
  async copilot(stateCode: string, cropSlug: string | undefined, acres: number, cropStage: string, question: string): Promise<CopilotDecisionResponse> {
    return intelligenceClient.askCopilot(question, await buildContext(stateCode, cropSlug, acres, cropStage));
  },
  async feedback(recommendationId: string, helpful: boolean, followed?: boolean, comment?: string) {
    return prisma.recommendationFeedback.create({ data: { recommendationId, helpful, followed, comment } });
  },
  async createFarmProfile(input: { name: string; stateCode: string; cropSlug: string; acres?: number }) {
    return prisma.farmProfile.create({ data: input });
  }
};
