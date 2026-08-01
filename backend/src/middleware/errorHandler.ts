import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: "Request validation failed.",
      details: error.flatten().fieldErrors
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        success: false,
        message: "A record with one of those unique values already exists."
      });
      return;
    }

    if (error.code === "P2025") {
      response.status(404).json({ success: false, message: "Record not found." });
      return;
    }
  }

  console.error(error);
  response.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
    ...(env.NODE_ENV === "development" && error instanceof Error
      ? { developmentMessage: error.message }
      : {})
  });
};
