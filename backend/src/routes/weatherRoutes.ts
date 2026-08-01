import { Router } from "express";
import { weatherController } from "../controllers/weatherController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const weatherRoutes = Router();
weatherRoutes.get("/:code", asyncHandler(weatherController.byState.bind(weatherController)));
