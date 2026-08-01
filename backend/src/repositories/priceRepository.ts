import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class PriceRepository {
  async findRecent(limit = 200) {
    return prisma.commodityPrice.findMany({
      include: { commodity: true },
      orderBy: { priceDate: "desc" },
      take: limit
    });
  }

  async findHistory(commodityId: string, stateCode?: string, limit = 24) {
    const where: Prisma.CommodityPriceWhereInput = { commodityId };
    if (stateCode) where.stateCode = stateCode;
    else where.stateCode = "US";

    return prisma.commodityPrice.findMany({
      where,
      orderBy: { priceDate: "desc" },
      take: limit
    });
  }

  async findNationalSince(since: Date) {
    return prisma.commodityPrice.findMany({
      where: { stateCode: "US", priceDate: { gte: since } },
      include: { commodity: true },
      orderBy: [{ commodityId: "asc" }, { priceDate: "asc" }]
    });
  }

  async findLatestForCommodity(commodityId: string) {
    return prisma.commodityPrice.findFirst({
      where: { commodityId, stateCode: "US" },
      include: { commodity: true },
      orderBy: { priceDate: "desc" }
    });
  }

  async findLatestObservationDate() {
    const row = await prisma.commodityPrice.findFirst({
      orderBy: { priceDate: "desc" },
      select: { priceDate: true }
    });
    return row?.priceDate ?? null;
  }

  async deleteSourceForCommodity(commodityId: string, source: string) {
    return prisma.commodityPrice.deleteMany({ where: { commodityId, source } });
  }

  async upsert(data: {
    commodityId: string;
    stateCode: string;
    value: number;
    previousValue: number | null;
    changePercent: number | null;
    unit: string;
    priceDate: Date;
    source: string;
    sourceRecordId?: string;
  }) {
    return prisma.commodityPrice.upsert({
      where: {
        commodityId_stateCode_priceDate_source: {
          commodityId: data.commodityId,
          stateCode: data.stateCode,
          priceDate: data.priceDate,
          source: data.source
        }
      },
      create: data,
      update: {
        value: data.value,
        previousValue: data.previousValue,
        changePercent: data.changePercent,
        unit: data.unit,
        sourceRecordId: data.sourceRecordId
      }
    });
  }
}

export const priceRepository = new PriceRepository();
