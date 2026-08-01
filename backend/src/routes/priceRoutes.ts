import { Router } from "express";
import { priceController } from "../controllers/priceController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  commodityIdParamsSchema,
  latestPriceQuerySchema,
  priceGrowthQuerySchema,
  priceHistoryQuerySchema
} from "../models/validationSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const priceRoutes = Router();

priceRoutes.get(
  "/growth",
  validateRequest({ query: priceGrowthQuerySchema }),
  asyncHandler(priceController.growth.bind(priceController))
);

priceRoutes.get(
  "/latest",
  validateRequest({ query: latestPriceQuerySchema }),
  asyncHandler(priceController.latest.bind(priceController))
);
priceRoutes.get(
  "/history/:idOrSlug",
  validateRequest({ params: commodityIdParamsSchema, query: priceHistoryQuerySchema }),
  asyncHandler(priceController.history.bind(priceController))
);
