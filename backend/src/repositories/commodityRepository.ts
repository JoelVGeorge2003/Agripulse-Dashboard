import type { CommodityCategory, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export interface CommodityListOptions {
  search?: string;
  category?: CommodityCategory;
  page: number;
  pageSize: number;
}

export class CommodityRepository {
  async findMany(options: CommodityListOptions) {
    const where: Prisma.CommodityWhereInput = {};
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { slug: { contains: options.search, mode: "insensitive" } },
        { symbol: { contains: options.search, mode: "insensitive" } }
      ];
    }
    if (options.category) where.category = options.category;

    const [items, total] = await prisma.$transaction([
      prisma.commodity.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize
      }),
      prisma.commodity.count({ where })
    ]);
    return { items, total };
  }

  async findAll() {
    return prisma.commodity.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  }

  async findFeatured(limit = 5) {
    return prisma.commodity.findMany({
      where: { featured: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      take: limit
    });
  }

  async findByIdOrSlug(idOrSlug: string) {
    return prisma.commodity.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } });
  }

  async create(data: Prisma.CommodityCreateInput) {
    return prisma.commodity.create({ data });
  }

  async update(id: string, data: Prisma.CommodityUpdateInput) {
    return prisma.commodity.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.commodity.delete({ where: { id } });
  }

  async count() {
    return prisma.commodity.count();
  }
}

export const commodityRepository = new CommodityRepository();
