import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboardService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export class DashboardController {
  async overview(_request: Request, response: Response): Promise<void> {
    sendSuccess(response, await dashboardService.getOverview(), "Dashboard overview retrieved.");
  }

  async summary(_request: Request, response: Response): Promise<void> {
    sendSuccess(response, await dashboardService.getSummary(), "Dashboard summary retrieved.");
  }
}

export const dashboardController = new DashboardController();
