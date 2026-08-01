import type { ChatRequest, ChatResponse } from "@/types";
import { apiRequest } from "./apiClient";

export const chatApi = {
  health(): Promise<{ status: string; model_status: string; model_provider: string }> {
    return apiRequest("/chat/health");
  },
  ask(input: ChatRequest): Promise<ChatResponse> {
    return apiRequest<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
