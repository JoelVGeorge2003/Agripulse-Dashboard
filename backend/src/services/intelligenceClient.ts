import type { ChatRequest, ChatResponse, CopilotDecisionResponse, DecisionRecommendation, ScenarioChanges, ScenarioResult, WeatherImpact } from "@agripulse/shared";
import { env } from "../config/env.js";

interface WeatherAnalysisInput {
  stateCode: string;
  stateName: string;
  cropName: string;
  currentTemperatureF: number;
  weeklyPrecipitationInches: number;
  weeklyEvapotranspirationInches: number;
  maximumTemperatureF: number;
  averageSoilMoisture: number | null;
}

async function serviceRequest<T>(path: string, body: object, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${env.INTELLIGENCE_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(env.INTELLIGENCE_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Intelligence service returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function serviceHealth(): Promise<{ status: string; model_status: string; model_provider: string }> {
  const response = await fetch(`${env.INTELLIGENCE_SERVICE_URL}/health`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(Math.min(env.INTELLIGENCE_TIMEOUT_MS, 10_000))
  });
  if (!response.ok) throw new Error(`Intelligence service returned HTTP ${response.status}`);
  return response.json() as Promise<{ status: string; model_status: string; model_provider: string }>;
}

export const intelligenceClient = {
  health: serviceHealth,
  answerChat(input: ChatRequest): Promise<ChatResponse> {
    return serviceRequest<ChatResponse>("/chat", {
      message: input.message,
      commodity_slug: input.commoditySlug,
      state_code: input.stateCode,
      history: input.history
    });
  },

  analyzeWeather(input: WeatherAnalysisInput): Promise<WeatherImpact> {
    return serviceRequest<WeatherImpact>("/analyze/weather", {
      state_code: input.stateCode,
      state_name: input.stateName,
      crop_name: input.cropName,
      current_temperature_f: input.currentTemperatureF,
      weekly_precipitation_inches: input.weeklyPrecipitationInches,
      weekly_evapotranspiration_inches: input.weeklyEvapotranspirationInches,
      maximum_temperature_f: input.maximumTemperatureF,
      average_soil_moisture: input.averageSoilMoisture
    });
  },
  getRecommendation(context: object): Promise<DecisionRecommendation> { return serviceRequest("/decisions/recommendation", context); },
  simulate(context: object, changes: ScenarioChanges): Promise<ScenarioResult> { return serviceRequest("/decisions/scenario", { context, changes }); },
  askCopilot(question: string, context: object): Promise<CopilotDecisionResponse> { return serviceRequest("/decisions/copilot", { question, context }); },
  ingestKnowledge(input: object): Promise<object> { return serviceRequest("/knowledge/ingest", input, env.ADMIN_API_KEY ? { "x-admin-key": env.ADMIN_API_KEY } : {}); }
};
