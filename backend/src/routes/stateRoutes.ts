import { Router } from "express";
import { stateController } from "../controllers/stateController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const stateRoutes = Router();
stateRoutes.get("/", asyncHandler(stateController.list.bind(stateController)));
stateRoutes.get("/:code/counties", asyncHandler(stateController.counties.bind(stateController)));
stateRoutes.get("/:code", asyncHandler(stateController.detail.bind(stateController)));
