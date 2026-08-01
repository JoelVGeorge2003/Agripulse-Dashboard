import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export function requireAdminKey(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  if (!env.ADMIN_API_KEY) {
    next();
    return;
  }

  const suppliedKey = request.header("x-admin-key");
  if (suppliedKey !== env.ADMIN_API_KEY) {
    next(new ApiError(401, "A valid admin API key is required."));
    return;
  }

  next();
}
