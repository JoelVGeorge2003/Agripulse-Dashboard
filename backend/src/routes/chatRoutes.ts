import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { chatRequestSchema } from "../models/validationSchemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRoutes = Router();

chatRoutes.post(
  "/",
  validateRequest({ body: chatRequestSchema }),
  asyncHandler(chatController.answer.bind(chatController))
);
