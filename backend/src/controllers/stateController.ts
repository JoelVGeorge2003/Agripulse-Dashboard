import type { Request, Response } from "express";
import { stateService } from "../services/stateService.js";
import { usdaNassService } from "../services/usdaNassService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export class StateController {
  async list(_request: Request, response: Response): Promise<void> {
    sendSuccess(response, await stateService.listSummaries(), "State summaries retrieved.");
  }

  async detail(request: Request, response: Response): Promise<void> {
    const code = Array.isArray(request.params.code) ? request.params.code[0] ?? "" : request.params.code ?? "";
    sendSuccess(response, await stateService.getDetail(code), "State production detail retrieved.");
  }

  async counties(request: Request, response: Response): Promise<void> {
    const code = Array.isArray(request.params.code) ? request.params.code[0] ?? "" : request.params.code ?? "";
    const commodity = typeof request.query.commodity === "string" ? request.query.commodity : "";
    sendSuccess(response, await usdaNassService.getCountyProduction(code, commodity), "County production retrieved.");
  }
}

export const stateController = new StateController();
