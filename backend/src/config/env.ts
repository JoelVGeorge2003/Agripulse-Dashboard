import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_API_KEY: z.string().optional().default(""),
  NASS_API_KEY: z.string().optional().default(""),
  NASS_API_BASE_URL: z.string().url().default("https://quickstats.nass.usda.gov/api/api_GET/"),
  GATS_API_KEY: z.string().optional().default(""),
  GATS_API: z.string().optional().default(""),
  GATS_API_BASE_URL: z.string().url().default("https://api.fas.usda.gov"),
  USDA_FDC_API_KEY: z.string().optional().default(""),
  USDA_FDC_BASE_URL: z.string().url().default("https://api.nal.usda.gov/fdc"),
  SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(0),
  INTELLIGENCE_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  INTELLIGENCE_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),
  OPEN_METEO_BASE_URL: z.string().url().default("https://api.open-meteo.com/v1/forecast"),
  NWS_ALERTS_BASE_URL: z.string().url().default("https://api.weather.gov/alerts/active"),
  OPEN_FEMA_BASE_URL: z.string().url().default("https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries"),
  WEATHER_CACHE_MINUTES: z.coerce.number().int().positive().default(15),
  REQUEST_BODY_LIMIT: z.string().default("256kb"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
