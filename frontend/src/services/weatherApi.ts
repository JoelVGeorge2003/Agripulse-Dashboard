import type { StateWeatherResponse } from "@/types";
import { apiRequest } from "./apiClient";

export const weatherApi = {
  getByState(stateCode: string): Promise<StateWeatherResponse> {
    return apiRequest<StateWeatherResponse>(`/weather/${encodeURIComponent(stateCode)}`);
  }
};
