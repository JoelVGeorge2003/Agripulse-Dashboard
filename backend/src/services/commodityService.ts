import type { Commodity, CommodityInput, Paginated } from "@agripulse/shared";
import { CommodityCategory as PrismaCommodityCategory } from "@prisma/client";
import type { CommodityCategory } from "@prisma/client";
import { commodityRepository } from "../repositories/commodityRepository.js";
import { ApiError } from "../utils/ApiError.js";

function serializeCommodity(record: Awaited<ReturnType<typeof commodityRepository.findAll>>[number]): Commodity {
  return {
    ...record,
    category: record.category,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export class CommodityService {
  async list(options: {
    search?: string;
    category?: CommodityCategory;
    page: number;
    pageSize: number;
  }): Promise<Paginated<Commodity>> {
    const result = await commodityRepository.findMany(options);
    return {
      items: result.items.map(serializeCommodity),
      meta: {
        page: options.page,
        pageSize: options.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / options.pageSize))
      }
    };
  }

  async getByIdOrSlug(idOrSlug: string): Promise<Commodity> {
    const commodity = await commodityRepository.findByIdOrSlug(idOrSlug);
    if (!commodity) throw new ApiError(404, "Commodity not found.");
    return serializeCommodity(commodity);
  }

  async getRecordByIdOrSlug(idOrSlug: string) {
    const commodity = await commodityRepository.findByIdOrSlug(idOrSlug);
    if (!commodity) throw new ApiError(404, "Commodity not found.");
    return commodity;
  }

  async create(input: CommodityInput): Promise<Commodity> {
    const commodity = await commodityRepository.create({
      ...input,
      category: input.category as PrismaCommodityCategory,
      description: input.description?.trim() || null
    });
    return serializeCommodity(commodity);
  }

  async update(idOrSlug: string, input: Partial<CommodityInput>): Promise<Commodity> {
    const existing = await this.getRecordByIdOrSlug(idOrSlug);
    const commodity = await commodityRepository.update(existing.id, {
      ...input,
      ...(input.category ? { category: input.category as PrismaCommodityCategory } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() || null }
        : {})
    });
    return serializeCommodity(commodity);
  }

  async delete(idOrSlug: string): Promise<{ id: string }> {
    const existing = await this.getRecordByIdOrSlug(idOrSlug);
    await commodityRepository.delete(existing.id);
    return { id: existing.id };
  }

  async count(): Promise<number> {
    return commodityRepository.count();
  }
}

export const commodityService = new CommodityService();
