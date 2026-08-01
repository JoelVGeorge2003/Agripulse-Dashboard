import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class ProductionRepository {
  async findLatestYear(commodityId?: string, stateCode?: string, source?: string) {
    const where: Prisma.ProductionRecordWhereInput = {};
    if (commodityId) where.commodityId = commodityId;
    if (stateCode) where.stateCode = stateCode;
    if (source) where.source = source;
    const row = await prisma.productionRecord.findFirst({ where, orderBy: { year: "desc" }, select: { year: true } });
    return row?.year ?? null;
  }

  async findMapRows(commodityId: string, year: number, source?: string) {
    return prisma.productionRecord.findMany({
      where: { commodityId, year, ...(source ? { source } : {}) },
      include: { commodity: true },
      orderBy: { value: "desc" }
    });
  }

  async findRowsForYear(year: number, source?: string) {
    return prisma.productionRecord.findMany({
      where: { year, ...(source ? { source } : {}) },
      include: { commodity: true },
      orderBy: [{ stateCode: "asc" }, { value: "desc" }]
    });
  }

  async findRowsForSource(source: string) {
    return prisma.productionRecord.findMany({
      where: { source },
      include: { commodity: true },
      orderBy: [{ stateCode: "asc" }, { year: "desc" }, { value: "desc" }]
    });
  }

  async findStateRows(stateCode: string, year: number, source?: string) {
    return prisma.productionRecord.findMany({
      where: { stateCode, year, ...(source ? { source } : {}) },
      include: { commodity: true },
      orderBy: { value: "desc" }
    });
  }

  async findStateRowsForSource(stateCode: string, source: string) {
    return prisma.productionRecord.findMany({
      where: { stateCode, source },
      include: { commodity: true },
      orderBy: [{ year: "desc" }, { value: "desc" }]
    });
  }

  async sumForCommodity(commodityId: string, year: number) {
    return prisma.productionRecord.aggregate({
      where: { commodityId, year },
      _sum: { value: true }
    });
  }

  async findTopAcrossCommodities(limit = 10) {
    const latestYear = await this.findLatestYear();
    if (!latestYear) return [];
    return prisma.productionRecord.findMany({
      where: { year: latestYear },
      include: { commodity: true },
      orderBy: { value: "desc" },
      take: limit
    });
  }

  async countDistinctStates() {
    const rows = await prisma.productionRecord.findMany({ distinct: ["stateCode"], select: { stateCode: true } });
    return rows.length;
  }

  async deleteSourceForCommodity(commodityId: string, source: string) {
    return prisma.productionRecord.deleteMany({ where: { commodityId, source } });
  }

  async updateAcreage(
    commodityId: string,
    stateCode: string,
    year: number,
    source: string,
    data: { plantedAcres?: number; harvestedAcres?: number; yieldValue?: number }
  ) {
    return prisma.productionRecord.updateMany({
      where: { commodityId, stateCode, year, source },
      data
    });
  }

  async upsert(data: {
    commodityId: string;
    stateCode: string;
    year: number;
    value: number;
    unit: string;
    plantedAcres?: number | null;
    harvestedAcres?: number | null;
    yieldValue?: number | null;
    totalValueUsd?: number | null;
    unitPriceUsd?: number | null;
    source: string;
    sourceRecordId?: string;
  }) {
    return prisma.productionRecord.upsert({
      where: {
        commodityId_stateCode_year_source: {
          commodityId: data.commodityId,
          stateCode: data.stateCode,
          year: data.year,
          source: data.source
        }
      },
      create: data,
      update: {
        value: data.value,
        unit: data.unit,
        plantedAcres: data.plantedAcres,
        harvestedAcres: data.harvestedAcres,
        yieldValue: data.yieldValue,
        totalValueUsd: data.totalValueUsd,
        unitPriceUsd: data.unitPriceUsd,
        sourceRecordId: data.sourceRecordId
      }
    });
  }
}

export const productionRepository = new ProductionRepository();
