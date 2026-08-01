import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { chatRequestSchema } from "../models/validationSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRoutes = Router();

chatRoutes.get("/health", asyncHandler(chatController.health.bind(chatController)));

chatRoutes.post(
  "/",
  validateRequest({ body: chatRequestSchema }),
  asyncHandler(chatController.answer.bind(chatController))
);
