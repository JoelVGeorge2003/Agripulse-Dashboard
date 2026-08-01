import type { SyncResult } from "@/types";
import { apiRequest } from "./apiClient";

export const adminApi = {
  syncUsda(commodities?: string[]): Promise<SyncResult> {
    return apiRequest<SyncResult>("/admin/sync/usda", {
      method: "POST",
      body: JSON.stringify({ commodities }),
      admin: true
    });
  }
};
