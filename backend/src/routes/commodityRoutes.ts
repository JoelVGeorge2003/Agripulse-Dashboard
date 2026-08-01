import { Router } from "express";
import { commodityController } from "../controllers/commodityController.js";
import { requireAdminKey } from "../middleware/adminKey.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  commodityIdParamsSchema,
  commodityInputSchema,
  commodityListQuerySchema,
  commodityUpdateSchema
} from "../models/validationSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const commodityRoutes = Router();

commodityRoutes.get(
  "/",
  validateRequest({ query: commodityListQuerySchema }),
  asyncHandler(commodityController.list.bind(commodityController))
);
commodityRoutes.get(
  "/:idOrSlug",
  validateRequest({ params: commodityIdParamsSchema }),
  asyncHandler(commodityController.get.bind(commodityController))
);
commodityRoutes.post(
  "/",
  requireAdminKey,
  validateRequest({ body: commodityInputSchema }),
  asyncHandler(commodityController.create.bind(commodityController))
);
commodityRoutes.put(
  "/:idOrSlug",
  requireAdminKey,
  validateRequest({ params: commodityIdParamsSchema, body: commodityUpdateSchema }),
  asyncHandler(commodityController.update.bind(commodityController))
);
commodityRoutes.delete(
  "/:idOrSlug",
  requireAdminKey,
  validateRequest({ params: commodityIdParamsSchema }),
  asyncHandler(commodityController.delete.bind(commodityController))
);
