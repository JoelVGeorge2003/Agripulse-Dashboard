import { Router } from "express";
import type { ScenarioChanges } from "@agripulse/shared";
import { decisionService } from "../services/decisionService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const decisionRoutes = Router();
decisionRoutes.get("/overview", asyncHandler(async (req, res) => sendSuccess(res, await decisionService.overview(String(req.query.state ?? "IA"), String(req.query.crop ?? "") || undefined, Number(req.query.acres ?? 100), String(req.query.stage ?? "unspecified")), "Decision overview generated.")));
decisionRoutes.post("/scenario", asyncHandler(async (req, res) => {
  const body = req.body as { stateCode?: string; cropSlug?: string; acres?: number; cropStage?: string; changes?: ScenarioChanges };
  sendSuccess(res, await decisionService.scenario(body.stateCode ?? "IA", body.cropSlug, body.acres ?? 100, body.cropStage ?? "unspecified", body.changes ?? { rainfallPercent: 0, temperatureF: 0, cropPricePercent: 0, fuelCostPercent: 0, fertilizerCostPercent: 0 }), "Scenario calculated.");
}));
decisionRoutes.post("/copilot", asyncHandler(async (req, res) => {
  const body = req.body as { stateCode?: string; cropSlug?: string; acres?: number; cropStage?: string; question?: string };
  sendSuccess(res, await decisionService.copilot(body.stateCode ?? "IA", body.cropSlug, body.acres ?? 100, body.cropStage ?? "unspecified", body.question ?? "What action should I take next?"), "Copilot analysis generated.");
}));
decisionRoutes.post("/recommendations/:id/feedback", asyncHandler(async (req, res) => sendSuccess(res, await decisionService.feedback(String(req.params.id), Boolean(req.body.helpful), req.body.followed, req.body.comment), "Feedback saved.", 201)));
decisionRoutes.post("/farm-profiles", asyncHandler(async (req, res) => sendSuccess(res, await decisionService.createFarmProfile(req.body), "Farm profile created.", 201)));
