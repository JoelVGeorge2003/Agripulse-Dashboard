import type { StateWeatherResponse, WeatherDay, WeatherImpact, WeatherIncident } from "@agripulse/shared";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { stateMetadata, validStateCodes } from "../utils/stateMetadata.js";
import { intelligenceClient } from "./intelligenceClient.js";
import { stateService } from "./stateService.js";

interface OpenMeteoPayload {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    soil_moisture_0_to_1cm?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    et0_fao_evapotranspiration?: number[];
  };
}

interface CacheValue {
  expiresAt: number;
  value: StateWeatherResponse;
}

interface NwsAlertPayload {
  features?: Array<{
    id?: string;
    properties?: {
      event?: string;
      severity?: WeatherIncident["severity"];
      certainty?: string;
      onset?: string | null;
      ends?: string | null;
      expires?: string | null;
      headline?: string;
      description?: string;
    };
  }>;
}

interface FemaPayload {
  DisasterDeclarationsSummaries?: Array<{
    disasterNumber?: number;
    state?: string;
    declarationType?: string;
    declarationDate?: string;
    incidentType?: string;
    declarationTitle?: string;
    incidentBeginDate?: string | null;
    incidentEndDate?: string | null;
  }>;
}

const climateIncidentTypes = new Set([
  "Coastal Storm", "Dam/Levee Break", "Drought", "Fire", "Flood", "Freezing", "Hurricane",
  "Mud/Landslide", "Severe Ice Storm", "Severe Storm", "Snowstorm", "Tornado", "Tropical Storm", "Typhoon"
]);

function concise(text: string | undefined, fallback: string): string {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length > 260 ? `${normalized.slice(0, 257)}…` : normalized;
}

async function getActiveIncident(stateCode: string): Promise<WeatherIncident | null> {
  try {
    const response = await fetch(`${env.NWS_ALERTS_BASE_URL}?area=${stateCode}`, {
      headers: { Accept: "application/geo+json", "User-Agent": "AgriPulse agricultural dashboard" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;
    const payload = await response.json() as NwsAlertPayload;
    const severityRank = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 } as const;
    const alert = (payload.features ?? [])
      .filter((item) => ["Extreme", "Severe"].includes(item.properties?.severity ?? "Unknown"))
      .sort((a, b) => severityRank[b.properties?.severity ?? "Unknown"] - severityRank[a.properties?.severity ?? "Unknown"])[0];
    if (!alert?.properties) return null;
    const properties = alert.properties;
    return {
      status: "ALERT",
      title: properties.event ?? "Active major weather alert",
      summary: concise(properties.headline ?? properties.description, "The National Weather Service has issued an active severe alert for this state."),
      severity: properties.severity ?? "Unknown",
      startDate: properties.onset ?? null,
      endDate: properties.ends ?? properties.expires ?? null,
      source: "National Weather Service active alerts",
      sourceUrl: alert.id ?? `https://api.weather.gov/alerts/active?area=${stateCode}`
    };
  } catch {
    return null;
  }
}

async function getPreviousIncident(stateCode: string): Promise<WeatherIncident | null> {
  try {
    const filter = `state eq '${stateCode}' and declarationType eq 'DR'`;
    const query = new URLSearchParams({ "$filter": filter, "$orderby": "declarationDate desc", "$top": "100" });
    const response = await fetch(`${env.OPEN_FEMA_BASE_URL}?${query.toString()}`, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return null;
    const payload = await response.json() as FemaPayload;
    const incident = payload.DisasterDeclarationsSummaries?.find((item) => item.incidentType && climateIncidentTypes.has(item.incidentType));
    if (!incident?.disasterNumber) return null;
    return {
      status: "HISTORICAL",
      title: incident.declarationTitle ?? incident.incidentType ?? "Major climate-related disaster",
      summary: `FEMA major disaster DR-${incident.disasterNumber}, classified as ${incident.incidentType ?? "weather-related"}. This is a documented declaration, not a forecast.`,
      severity: "Severe",
      startDate: incident.incidentBeginDate ?? incident.declarationDate ?? null,
      endDate: incident.incidentEndDate ?? null,
      source: "OpenFEMA Disaster Declarations Summaries",
      sourceUrl: `https://www.fema.gov/disaster/${incident.disasterNumber}`
    };
  } catch {
    return null;
  }
}

function forecastIncident(days: WeatherDay[]): WeatherIncident {
  const hottest = Math.max(...days.map((day) => day.temperatureMaxF));
  const rainiest = Math.max(...days.map((day) => day.precipitationInches));
  const wetDays = days.filter((day) => day.precipitationInches >= 1).length;
  if (hottest >= 100) {
    return {
      status: "POTENTIAL", title: "Potential extreme-heat episode",
      summary: `The seven-day forecast reaches ${hottest.toFixed(0)}°F. This is a forecast-derived risk signal, not an official warning.`,
      severity: "Severe", startDate: days.find((day) => day.temperatureMaxF === hottest)?.date ?? null,
      endDate: null, source: "Open-Meteo seven-day forecast", sourceUrl: null
    };
  }
  if (rainiest >= 3 || wetDays >= 3) {
    return {
      status: "POTENTIAL", title: "Potential heavy-rain or flooding episode",
      summary: `The forecast includes up to ${rainiest.toFixed(2)} inches in a day across ${wetDays} notably wet day(s). This is not an official warning.`,
      severity: rainiest >= 4 ? "Severe" : "Moderate", startDate: days.find((day) => day.precipitationInches === rainiest)?.date ?? null,
      endDate: null, source: "Open-Meteo seven-day forecast", sourceUrl: null
    };
  }
  return {
    status: "NONE", title: "No major incident identified",
    summary: "No active severe NWS alert or major seven-day heat/rain threshold was identified for the state. Conditions can still change.",
    severity: "Unknown", startDate: days[0]?.date ?? null, endDate: days.at(-1)?.date ?? null,
    source: "NWS alerts and Open-Meteo seven-day forecast", sourceUrl: null
  };
}

const cache = new Map<string, CacheValue>();

function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function fallbackImpact(input: {
  cropName: string;
  weeklyPrecipitation: number;
  weeklyEt: number;
  maxTemperature: number;
  soilMoisture: number | null;
}): WeatherImpact {
  const drivers: string[] = [];
  const actions: string[] = [];
  let risk = 18;
  const waterBalance = input.weeklyPrecipitation - input.weeklyEt;

  if (input.maxTemperature >= 96) {
    risk += 38;
    drivers.push(`Forecast heat reaches ${input.maxTemperature.toFixed(0)}°F, which can increase crop stress.`);
    actions.push("Prioritise irrigation and scout for heat stress during the hottest forecast window.");
  } else if (input.maxTemperature >= 90) {
    risk += 20;
    drivers.push(`Forecast heat reaches ${input.maxTemperature.toFixed(0)}°F.`);
  } else {
    drivers.push("Forecast temperature remains below the high-heat threshold used by the dashboard.");
  }

  if (waterBalance < -1.0) {
    risk += 32;
    drivers.push(`Seven-day precipitation trails estimated evapotranspiration by ${Math.abs(waterBalance).toFixed(2)} in.`);
    actions.push("Check soil moisture locally and consider supplemental irrigation where available.");
  } else if (waterBalance > 2.5) {
    risk += 25;
    drivers.push(`Seven-day precipitation exceeds estimated evapotranspiration by ${waterBalance.toFixed(2)} in.`);
    actions.push("Watch low-lying fields for ponding, disease pressure, and delayed field access.");
  } else {
    drivers.push("The forecast water balance is within the dashboard's normal watch range.");
  }

  if (input.soilMoisture !== null && input.soilMoisture < 0.12) {
    risk += 18;
    drivers.push("Modelled surface soil moisture is low.");
  }

  const score = Math.min(100, Math.round(risk));
  const level = score >= 70 ? "HIGH_RISK" : score >= 40 ? "WATCH" : "FAVOURABLE";
  if (!actions.length) actions.push("Continue routine scouting and compare the state-level forecast with field observations.");
  return {
    level,
    score,
    headline: level === "HIGH_RISK" ? `Elevated weather risk for ${input.cropName}` : level === "WATCH" ? `Watch conditions for ${input.cropName}` : `Generally favourable conditions for ${input.cropName}`,
    summary: `This state-level signal compares the seven-day precipitation forecast with reference evapotranspiration and heat exposure. It is advisory and should be checked against field-level conditions.`,
    drivers,
    actions
  };
}

export class WeatherService {
  async getForState(stateCodeInput: string): Promise<StateWeatherResponse> {
    const stateCode = stateCodeInput.toUpperCase();
    if (!validStateCodes.has(stateCode)) throw new ApiError(400, "A valid two-letter U.S. state code is required.");
    const cached = cache.get(stateCode);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const [stateDetail] = await Promise.all([stateService.getDetail(stateCode)]);
    const state = stateMetadata[stateCode]!;
    const query = new URLSearchParams({
      latitude: String(state.latitude),
      longitude: String(state.longitude),
      current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
      hourly: "soil_moisture_0_to_1cm",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      timezone: "auto",
      forecast_days: "7"
    });

    const [response, activeIncident, previousIncident] = await Promise.all([
      fetch(`${env.OPEN_METEO_BASE_URL}?${query.toString()}`, { signal: AbortSignal.timeout(12_000) }),
      getActiveIncident(stateCode),
      getPreviousIncident(stateCode)
    ]);
    if (!response.ok) throw new ApiError(502, "Weather provider is temporarily unavailable.");
    const payload = await response.json() as OpenMeteoPayload;
    const daily = payload.daily;
    const current = payload.current;
    if (!daily?.time?.length || !current?.time) throw new ApiError(502, "Weather provider returned an incomplete forecast.");

    const dailyRows = daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code?.[index] ?? 0,
      temperatureMaxF: daily.temperature_2m_max?.[index] ?? 0,
      temperatureMinF: daily.temperature_2m_min?.[index] ?? 0,
      precipitationInches: daily.precipitation_sum?.[index] ?? 0,
      precipitationProbabilityPercent: daily.precipitation_probability_max?.[index] ?? 0,
      evapotranspirationInches: daily.et0_fao_evapotranspiration?.[index] ?? 0
    }));

    const weeklyPrecipitation = sum(dailyRows.map((day) => day.precipitationInches));
    const weeklyEt = sum(dailyRows.map((day) => day.evapotranspirationInches));
    const maxTemperature = Math.max(...dailyRows.map((day) => day.temperatureMaxF));
    const soilMoisture = payload.hourly?.soil_moisture_0_to_1cm?.find((value) => Number.isFinite(value)) ?? null;
    const analysisInput = {
      cropName: stateDetail.topCommodity.commodityName,
      weeklyPrecipitation,
      weeklyEt,
      maxTemperature,
      soilMoisture
    };

    let impact: WeatherImpact;
    try {
      impact = await intelligenceClient.analyzeWeather({
        stateCode,
        stateName: state.name,
        cropName: stateDetail.topCommodity.commodityName,
        currentTemperatureF: current.temperature_2m ?? 0,
        weeklyPrecipitationInches: weeklyPrecipitation,
        weeklyEvapotranspirationInches: weeklyEt,
        maximumTemperatureF: maxTemperature,
        averageSoilMoisture: soilMoisture
      });
    } catch {
      impact = fallbackImpact(analysisInput);
    }

    const value: StateWeatherResponse = {
      stateCode,
      stateName: state.name,
      cropName: stateDetail.topCommodity.commodityName,
      latitude: state.latitude,
      longitude: state.longitude,
      current: {
        temperatureF: current.temperature_2m ?? 0,
        relativeHumidityPercent: current.relative_humidity_2m ?? 0,
        precipitationInches: current.precipitation ?? 0,
        windSpeedMph: current.wind_speed_10m ?? 0,
        weatherCode: current.weather_code ?? 0,
        soilMoisture,
        observedAt: current.time
      },
      daily: dailyRows,
      impact,
      potentialIncident: activeIncident ?? forecastIncident(dailyRows),
      previousIncident,
      fetchedAt: new Date().toISOString(),
      source: "Open-Meteo forecast at the state's representative coordinate"
    };
    cache.set(stateCode, { value, expiresAt: Date.now() + env.WEATHER_CACHE_MINUTES * 60_000 });
    return value;
  }
}

export const weatherService = new WeatherService();
