import type { CropPriceGrowth, CropTradeFlow, DashboardOverview, DashboardSummary, LatestPrice, MapDatum } from "@/types";
import { apiRequest } from "./apiClient";

export const dashboardApi = {
  getOverview(): Promise<DashboardOverview> {
    return apiRequest<DashboardOverview>("/dashboard/overview");
  },
  getSummary(): Promise<DashboardSummary> {
    return apiRequest<DashboardSummary>("/dashboard/summary");
  },
  getLatestPrices(limit = 10): Promise<LatestPrice[]> {
    return apiRequest<LatestPrice[]>(`/prices/latest?limit=${limit}`);
  },
  getPriceGrowth(years = 5): Promise<CropPriceGrowth[]> {
    return apiRequest<CropPriceGrowth[]>(`/prices/growth?years=${years}`);
  },
  getCropTrade(): Promise<CropTradeFlow[]> {
    return apiRequest<CropTradeFlow[]>("/trade/crops");
  },
  getMapData(commodity: string, year?: number): Promise<MapDatum[]> {
    const query = new URLSearchParams({ commodity });
    if (year) query.set("year", String(year));
    return apiRequest<MapDatum[]>(`/map/production?${query.toString()}`);
  }
};
