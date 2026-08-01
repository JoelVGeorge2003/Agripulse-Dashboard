import type { Commodity, CommodityDetail, CommodityInput, Paginated } from "@/types";
import { apiRequest } from "./apiClient";

export interface CommodityListParams {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export const commodityApi = {
  list(params: CommodityListParams = {}): Promise<Paginated<Commodity>> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.category) query.set("category", params.category);
    query.set("page", String(params.page ?? 1));
    query.set("pageSize", String(params.pageSize ?? 50));
    return apiRequest<Paginated<Commodity>>(`/commodities?${query.toString()}`);
  },

  get(idOrSlug: string): Promise<CommodityDetail> {
    return apiRequest<CommodityDetail>(`/commodities/${encodeURIComponent(idOrSlug)}`);
  },

  create(input: CommodityInput): Promise<Commodity> {
    return apiRequest<Commodity>("/commodities", {
      method: "POST",
      body: JSON.stringify(input),
      admin: true
    });
  },

  update(idOrSlug: string, input: Partial<CommodityInput>): Promise<Commodity> {
    return apiRequest<Commodity>(`/commodities/${encodeURIComponent(idOrSlug)}`, {
      method: "PUT",
      body: JSON.stringify(input),
      admin: true
    });
  },

  remove(idOrSlug: string): Promise<{ id: string }> {
    return apiRequest<{ id: string }>(`/commodities/${encodeURIComponent(idOrSlug)}`, {
      method: "DELETE",
      admin: true
    });
  }
};
