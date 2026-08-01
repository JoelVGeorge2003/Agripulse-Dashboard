import type { CopilotDecisionResponse, DecisionOverview, ScenarioChanges, ScenarioResult } from "@/types";
import { apiRequest } from "./apiClient";

export const decisionApi = {
  overview(stateCode: string, cropSlug?: string, acres = 100, cropStage = "unspecified"): Promise<DecisionOverview> {
    const query = new URLSearchParams({ state: stateCode, crop: cropSlug ?? "", acres: String(acres), stage: cropStage });
    return apiRequest(`/decisions/overview?${query}`);
  },
  scenario(stateCode: string, cropSlug: string | undefined, acres: number, cropStage: string, changes: ScenarioChanges): Promise<ScenarioResult> {
    return apiRequest("/decisions/scenario", { method: "POST", body: JSON.stringify({ stateCode, cropSlug, acres, cropStage, changes }) });
  },
  copilot(stateCode: string, cropSlug: string | undefined, acres: number, cropStage: string, question: string): Promise<CopilotDecisionResponse> {
    return apiRequest("/decisions/copilot", { method: "POST", body: JSON.stringify({ stateCode, cropSlug, acres, cropStage, question }) });
  },
  feedback(recommendationId: string, helpful: boolean): Promise<unknown> {
    return apiRequest(`/decisions/recommendations/${encodeURIComponent(recommendationId)}/feedback`, { method: "POST", body: JSON.stringify({ helpful }) });
  }
};
