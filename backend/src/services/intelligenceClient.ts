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

const retryableStatuses = new Set([502, 503, 504]);

class IntelligenceHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Intelligence service returned HTTP ${status}`);
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function serviceRequest<T>(path: string, body: object, headers: Record<string, string> = {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(`${env.INTELLIGENCE_SERVICE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(env.INTELLIGENCE_TIMEOUT_MS)
      });
      if (response.ok) return response.json() as Promise<T>;
      if (!retryableStatuses.has(response.status) || attempt === 4) {
        throw new IntelligenceHttpError(response.status);
      }
      lastError = new Error(`Intelligence service is warming up (HTTP ${response.status})`);
    } catch (error) {
      lastError = error;
      if (error instanceof IntelligenceHttpError && !retryableStatuses.has(error.status)) throw error;
      if (attempt === 4) break;
    }
    await wait(2_000 * (attempt + 1));
  }
  throw lastError instanceof Error ? lastError : new Error("Intelligence service is unavailable.");
}

async function serviceHealth(): Promise<{ status: string; model_status: string; model_provider: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(`${env.INTELLIGENCE_SERVICE_URL}/health`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(Math.min(env.INTELLIGENCE_TIMEOUT_MS, 15_000))
      });
      if (response.ok) return response.json() as Promise<{ status: string; model_status: string; model_provider: string }>;
      lastError = new Error(`Intelligence service returned HTTP ${response.status}`);
      if (!retryableStatuses.has(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await wait(2_000 * (attempt + 1));
  }
  throw lastError instanceof Error ? lastError : new Error("Intelligence service is unavailable.");
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
