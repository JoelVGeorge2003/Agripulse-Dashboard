import { Router } from "express";
import { adminController } from "../controllers/adminController.js";
import { requireAdminKey } from "../middleware/adminKey.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { syncRequestSchema } from "../models/validationSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { intelligenceClient } from "../services/intelligenceClient.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const adminRoutes = Router();

adminRoutes.post(
  "/sync/usda",
  requireAdminKey,
  validateRequest({ body: syncRequestSchema }),
  asyncHandler(adminController.syncUsda.bind(adminController))
);
adminRoutes.post("/knowledge/ingest", requireAdminKey, asyncHandler(async (req, res) => sendSuccess(res, await intelligenceClient.ingestKnowledge(req.body), "Knowledge document chunked and indexed.", 201)));
