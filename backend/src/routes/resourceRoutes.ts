import { Router } from "express";
import { getFertilizerGuide, searchLocalFoodDirectory } from "../services/resourceService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const resourceRoutes = Router();
resourceRoutes.get("/local-food", asyncHandler(async (req, res) => {
  const result = await searchLocalFoodDirectory(String(req.query.state ?? ""), String(req.query.county ?? ""), String(req.query.q ?? ""), Number(req.query.limit ?? 30));
  sendSuccess(res, result, "Local food directory loaded.");
}));
resourceRoutes.get("/fertilizers", (req, res) => sendSuccess(res, getFertilizerGuide(String(req.query.crop ?? "")), "Fertilizer guide loaded."));
