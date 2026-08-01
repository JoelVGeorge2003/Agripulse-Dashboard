import type { ChatRequest, ChatResponse } from "@/types";
import { apiRequest } from "./apiClient";

export const chatApi = {
  ask(input: ChatRequest): Promise<ChatResponse> {
    return apiRequest<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
