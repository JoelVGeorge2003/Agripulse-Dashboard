import { apiRequest } from "./apiClient";
import type { FertilizerGuideResponse, LocalFoodDirectoryResponse } from "@/types";

export const resourceApi = {
  searchDirectory(state: string, county: string, query: string): Promise<LocalFoodDirectoryResponse> {
    const params = new URLSearchParams({ state, county, q: query, limit: "30" });
    return apiRequest(`/resources/local-food?${params.toString()}`);
  },
  getFertilizers(crop = ""): Promise<FertilizerGuideResponse> {
    return apiRequest(`/resources/fertilizers?crop=${encodeURIComponent(crop)}`);
  }
};
