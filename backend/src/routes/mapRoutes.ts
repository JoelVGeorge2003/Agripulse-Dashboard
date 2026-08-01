import { Router } from "express";
import { mapController } from "../controllers/mapController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { mapQuerySchema } from "../models/validationSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const mapRoutes = Router();

mapRoutes.get(
  "/production",
  validateRequest({ query: mapQuerySchema }),
  asyncHandler(mapController.production.bind(mapController))
);
