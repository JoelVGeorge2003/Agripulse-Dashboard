import { Router } from "express";
import { tradeController } from "../controllers/tradeController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const tradeRoutes = Router();
tradeRoutes.get("/crops", asyncHandler(tradeController.crops.bind(tradeController)));
