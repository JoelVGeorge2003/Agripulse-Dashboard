import type { ChatRequest, ChatResponse } from "@agripulse/shared";
import { chatRepository } from "../repositories/chatRepository.js";
import { commodityRepository } from "../repositories/commodityRepository.js";
import { stateMetadata } from "../utils/stateMetadata.js";
import { intelligenceClient } from "./intelligenceClient.js";
import { priceService } from "./priceService.js";
import { productionService } from "./productionService.js";
import { stateService } from "./stateService.js";

function detectState(message: string, explicit?: string): string | undefined {
  const normalized = message.toLowerCase();
  for (const [code, state] of Object.entries(stateMetadata)) {
    if (normalized.includes(state.name.toLowerCase()) || new RegExp(`\\b${code}\\b`).test(message)) return code;
  }
  return explicit?.toUpperCase();
}

export class ChatService {
  health(): Promise<{ status: string; model_status: string; model_provider: string }> {
    return intelligenceClient.health();
  }

  async answer(input: ChatRequest): Promise<ChatResponse> {
    const recentMessages = await chatRepository.findRecentContext(input.sessionId);
    const priorMetadata = [...recentMessages].reverse().find((message) => message.metadata)?.metadata as
      | { stateCode?: string | null; commoditySlug?: string | null }
      | undefined;
    const normalized = input.message.toLowerCase();
    const asksAcrossStates = /\b(which|what|top|leading)\s+states?\b|\bstates?\s+(lead|produce|rank)\b|\bnational(?:ly)?\b/.test(normalized);
    const asksForStateMix = /\b(compare|list|show)\b.*\b(crops|commodities|agricultural mix)\b|\b(dominant|leading|top)\s+crop\b|\bcrop mix\b/.test(normalized);
    const commodities = await commodityRepository.findAll();
    const mentionedCommodity = commodities.find((commodity) =>
      normalized.includes(commodity.name.toLowerCase()) ||
      normalized.includes(commodity.slug) ||
      normalized.includes(commodity.name.toLowerCase().replace(/s$/, "")) ||
      normalized.includes(commodity.slug.replace(/s$/, ""))
    );
    const selectedCommodity = commodities.find((commodity) => commodity.slug === input.commoditySlug);
    const mentionedState = detectState(input.message);
    const stateCode = mentionedState ?? (asksAcrossStates ? undefined : input.stateCode ?? priorMetadata?.stateCode ?? undefined);
    const resolvedCommodity = mentionedCommodity ?? (asksForStateMix ? undefined : selectedCommodity ?? commodities.find((commodity) => commodity.slug === priorMetadata?.commoditySlug));

    let response: ChatResponse;
    try {
      response = await intelligenceClient.answerChat({
        message: input.message,
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
        ...(resolvedCommodity ? { commoditySlug: resolvedCommodity.slug } : {}),
        ...(stateCode ? { stateCode } : {}),
        history: recentMessages.map((message) => ({
          role: message.role === "USER" ? "user" as const : "assistant" as const,
          content: message.content
        }))
      });
    } catch {
      const fallback = await this.databaseFallback(resolvedCommodity?.slug, stateCode);
      response = {
        ...fallback,
        evaluation: {
          confidenceScore: 90,
          groundednessScore: 100,
          citationCoverageScore: 100,
          relevanceScore: 85,
          status: "high",
          flags: ["deterministic_fallback", "intelligence_service_unavailable"]
        }
      };
    }

    const session = await chatRepository.createExchange(input.message, response.answer, {
      stateCode: stateCode ?? null,
      commoditySlug: resolvedCommodity?.slug ?? null,
      generatedBy: response.generatedBy,
      asOf: response.asOf
    }, input.sessionId);
    return { ...response, sessionId: session.id };
  }

  private async databaseFallback(commoditySlug?: string, stateCode?: string): Promise<ChatResponse> {
    if (stateCode) {
      const detail = await stateService.getDetail(stateCode);
      const requested = commoditySlug
        ? detail.production.find((item) => item.commoditySlug === commoditySlug)
        : undefined;
      if (commoditySlug && requested) {
        const valueText = requested.totalValueUsd === null
          ? "a stored production value is not available"
          : `the state production value is $${requested.totalValueUsd.toLocaleString()}`;
        return {
          answer: `${detail.stateName} produced ${requested.value.toLocaleString()} ${requested.unit} of ${requested.commodityName} in ${requested.year}; ${valueText}.${requested.unitPriceUsd === null ? "" : ` The implied unit value is $${requested.unitPriceUsd.toFixed(2)} per ${requested.unit.toLowerCase()}.`} This answer uses USDA NASS records stored in AgriPulse.`,
          model: "database-fallback",
          generatedBy: "fallback",
          citations: [{
            label: `${detail.stateName} ${requested.commodityName}`,
            value: `${requested.value.toLocaleString()} ${requested.unit} (${requested.year})`
          }],
          asOf: String(requested.year)
        };
      }
      if (commoditySlug && !requested) {
        const commodity = await commodityRepository.findByIdOrSlug(commoditySlug);
        return {
          answer: `No stored USDA NASS ${commodity?.name ?? commoditySlug} production record is available for ${detail.stateName}.`,
          model: "database-fallback",
          generatedBy: "fallback",
          citations: [],
          asOf: String(detail.year)
        };
      }
      const top = detail.topCommodity;
      const remaining = detail.production.slice(1, 4);
      const otherText = remaining.length
        ? ` Other tracked crops include ${remaining.map((item) => `${item.commodityName} (${item.value.toLocaleString()} ${item.unit})`).join(", ")}.`
        : "";
      return {
          answer: `${detail.stateName}'s leading stored crop is ${top.commodityName}: ${top.value.toLocaleString()} ${top.unit} in ${top.year}.${otherText}`,
        model: "database-fallback",
        generatedBy: "fallback",
        citations: detail.production.slice(0, 4).map((item) => ({
          label: `${detail.stateName} ${item.commodityName}`,
          value: `${item.value.toLocaleString()} ${item.unit} (${item.year})`
        })),
        asOf: String(detail.year)
      };
    }

    if (commoditySlug) {
      const commodity = await commodityRepository.findByIdOrSlug(commoditySlug);
      if (commodity) {
        const [latestPrice, production] = await Promise.all([
          priceService.getLatestForCommodity(commodity.slug),
          productionService.getMapData(commodity.slug)
        ]);
        const top = production.slice(0, 3);
        const priceText = latestPrice
          ? `${commodity.name}'s latest stored national price is ${latestPrice.value.toFixed(2)} ${latestPrice.unit}, dated ${latestPrice.priceDate.slice(0, 10)}.`
          : `No stored ${commodity.name} price is available.`;
        const productionText = top.length
          ? ` The leading stored production states are ${top.map((row) => `${row.stateName} (${row.value.toLocaleString()} ${row.unit})`).join(", ")}.`
          : " No production records are available.";
        return {
          answer: `${priceText}${productionText}`,
          model: "database-fallback",
          generatedBy: "fallback",
          citations: [
            ...(latestPrice ? [{ label: `${commodity.name} price`, value: `${latestPrice.value.toFixed(2)} ${latestPrice.unit} (${latestPrice.priceDate.slice(0, 10)})` }] : []),
            ...top.map((row) => ({ label: `${row.stateName} production`, value: `${row.value.toLocaleString()} ${row.unit} (${row.year})` }))
          ],
          asOf: latestPrice?.priceDate ?? String(top[0]?.year ?? new Date().getUTCFullYear())
        };
      }
    }

    const prices = await priceService.getLatest(5);
    if (!prices.length) {
      return {
        answer: "No agricultural records are available. Seed or synchronise the database first.",
        model: "database-fallback",
        generatedBy: "fallback",
        citations: [],
        asOf: new Date().toISOString()
      };
    }
    return {
      answer: `Latest stored national observations: ${prices.map((item) => `${item.commodityName} ${item.value.toFixed(2)} ${item.unit}`).join("; ")}. Check each observation date before treating it as current market information.`,
      model: "database-fallback",
      generatedBy: "fallback",
      citations: prices.map((item) => ({
        label: `${item.commodityName} price`,
        value: `${item.value.toFixed(2)} ${item.unit} (${item.priceDate.slice(0, 10)})`
      })),
      asOf: prices.reduce((latest, item) => item.priceDate > latest ? item.priceDate : latest, prices[0]!.priceDate)
    };
  }
}

export const chatService = new ChatService();
