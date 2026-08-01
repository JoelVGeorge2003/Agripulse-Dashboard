import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");

export const commodityIdParamsSchema = z.object({
  idOrSlug: z.string().min(1).max(100)
});

export const commodityListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.enum(["GRAIN", "OILSEED", "FIBER", "SPECIALTY"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const commodityInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  name: z.string().trim().min(2).max(80),
  symbol: z.string().trim().min(2).max(12).transform((value) => value.toUpperCase()),
  category: z.enum(["GRAIN", "OILSEED", "FIBER", "SPECIALTY"]),
  defaultUnit: z.string().trim().min(2).max(40),
  color: hexColor,
  description: z.string().trim().max(500).optional(),
  featured: z.boolean().optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).optional()
});

export const commodityUpdateSchema = commodityInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update."
);

export const latestPriceQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
  commodity: z.string().trim().max(50).optional()
});

export const priceHistoryQuerySchema = z.object({
  stateCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  limit: z.coerce.number().int().positive().max(120).default(24)
});

export const priceGrowthQuerySchema = z.object({
  years: z.coerce.number().int().min(1).max(20).default(5)
});

export const mapQuerySchema = z.object({
  commodity: z.string().trim().min(1).max(50).default("corn"),
  year: z.coerce.number().int().min(1900).max(2200).optional()
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(2).max(2000),
  commoditySlug: z.string().trim().max(50).optional(),
  stateCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  sessionId: z.string().trim().max(100).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12).optional()
});

export const syncRequestSchema = z.object({
  commodities: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  pricesOnly: z.boolean().optional().default(false)
});
