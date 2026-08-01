import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class ChatRepository {
  async findRecentContext(sessionId?: string, limit = 8) {
    if (!sessionId) return [];
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: limit } }
    });
    return (session?.messages ?? []).reverse();
  }

  async createExchange(userMessage: string, assistantMessage: string, metadata: Prisma.InputJsonValue, sessionId?: string) {
    if (sessionId) {
      const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (existing) {
        return prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            messages: { create: [
              { role: "USER", content: userMessage },
              { role: "ASSISTANT", content: assistantMessage, metadata }
            ] }
          }
        });
      }
    }
    return prisma.chatSession.create({
      data: {
        title: userMessage.slice(0, 80),
        messages: { create: [
          { role: "USER", content: userMessage },
          { role: "ASSISTANT", content: assistantMessage, metadata }
        ] }
      }
    });
  }
}

export const chatRepository = new ChatRepository();
