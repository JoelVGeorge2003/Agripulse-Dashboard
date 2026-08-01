import type { Request, Response } from "express";
import { weatherService } from "../services/weatherService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export class WeatherController {
  async byState(request: Request, response: Response): Promise<void> {
    const code = Array.isArray(request.params.code) ? request.params.code[0] ?? "" : request.params.code ?? "";
    sendSuccess(response, await weatherService.getForState(code), "State weather retrieved.");
  }
}

export const weatherController = new WeatherController();
