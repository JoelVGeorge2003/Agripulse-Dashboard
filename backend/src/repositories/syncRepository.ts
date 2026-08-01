import type { SyncStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export class SyncRepository {
  async start(sourceName: string) {
    return prisma.dataSourceSync.create({
      data: { sourceName, status: "RUNNING" }
    });
  }

  async finish(
    id: string,
    status: SyncStatus,
    counts: { pricesUpserted: number; productionUpserted: number },
    message: string
  ) {
    return prisma.dataSourceSync.update({
      where: { id },
      data: {
        status,
        finishedAt: new Date(),
        pricesUpserted: counts.pricesUpserted,
        productionUpserted: counts.productionUpserted,
        message
      }
    });
  }

  async findLatestSuccessful() {
    return prisma.dataSourceSync.findFirst({
      where: { status: { in: ["SUCCESS", "PARTIAL"] } },
      orderBy: { finishedAt: "desc" }
    });
  }
}

export const syncRepository = new SyncRepository();
