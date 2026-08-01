import type { CountyProductionDetail, StateDetail, StateSummary } from "@/types";
import { apiRequest } from "./apiClient";

export const stateApi = {
  list(): Promise<StateSummary[]> {
    return apiRequest<StateSummary[]>("/states");
  },
  getDetail(stateCode: string): Promise<StateDetail> {
    return apiRequest<StateDetail>(`/states/${encodeURIComponent(stateCode)}`);
  },
  getCountyProduction(stateCode: string, commoditySlug: string): Promise<CountyProductionDetail> {
    return apiRequest<CountyProductionDetail>(`/states/${encodeURIComponent(stateCode)}/counties?commodity=${encodeURIComponent(commoditySlug)}`);
  }
};
