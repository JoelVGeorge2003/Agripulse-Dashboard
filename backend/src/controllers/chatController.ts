import type { Request, Response } from "express";
import type { ChatRequest } from "@agripulse/shared";
import { chatService } from "../services/chatService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { getValidatedBody } from "../utils/validatedRequest.js";

export class ChatController {
  async answer(request: Request, response: Response): Promise<void> {
    const data = await chatService.answer(getValidatedBody<ChatRequest>(request));
    sendSuccess(response, data, "Analyst response generated.");
  }
}

export const chatController = new ChatController();
