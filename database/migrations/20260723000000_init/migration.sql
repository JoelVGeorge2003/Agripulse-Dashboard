-- CreateEnum
CREATE TYPE "CommodityCategory" AS ENUM ('GRAIN', 'OILSEED', 'FIBER', 'SPECIALTY');
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "Commodity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "category" "CommodityCategory" NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2f7d32',
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 99,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Commodity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommodityPrice" (
    "id" TEXT NOT NULL,
    "commodityId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL DEFAULT 'US',
    "value" DECIMAL(18,4) NOT NULL,
    "previousValue" DECIMAL(18,4),
    "changePercent" DECIMAL(9,4),
    "unit" TEXT NOT NULL,
    "priceDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommodityPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductionRecord" (
    "id" TEXT NOT NULL,
    "commodityId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(22,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "harvestedAcres" DECIMAL(18,2),
    "yieldValue" DECIMAL(18,4),
    "source" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductionRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataSourceSync" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "pricesUpserted" INTEGER NOT NULL DEFAULT 0,
    "productionUpserted" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    CONSTRAINT "DataSourceSync_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Commodity_slug_key" ON "Commodity"("slug");
CREATE UNIQUE INDEX "Commodity_symbol_key" ON "Commodity"("symbol");
CREATE INDEX "Commodity_category_idx" ON "Commodity"("category");
CREATE INDEX "Commodity_name_idx" ON "Commodity"("name");
CREATE INDEX "Commodity_featured_displayOrder_idx" ON "Commodity"("featured", "displayOrder");
CREATE UNIQUE INDEX "CommodityPrice_commodityId_stateCode_priceDate_source_key" ON "CommodityPrice"("commodityId", "stateCode", "priceDate", "source");
CREATE INDEX "CommodityPrice_commodityId_priceDate_idx" ON "CommodityPrice"("commodityId", "priceDate" DESC);
CREATE INDEX "CommodityPrice_stateCode_priceDate_idx" ON "CommodityPrice"("stateCode", "priceDate" DESC);
CREATE UNIQUE INDEX "ProductionRecord_commodityId_stateCode_year_source_key" ON "ProductionRecord"("commodityId", "stateCode", "year", "source");
CREATE INDEX "ProductionRecord_commodityId_year_value_idx" ON "ProductionRecord"("commodityId", "year", "value" DESC);
CREATE INDEX "ProductionRecord_stateCode_year_idx" ON "ProductionRecord"("stateCode", "year");
CREATE INDEX "DataSourceSync_sourceName_startedAt_idx" ON "DataSourceSync"("sourceName", "startedAt" DESC);
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

ALTER TABLE "CommodityPrice" ADD CONSTRAINT "CommodityPrice_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRecord" ADD CONSTRAINT "ProductionRecord_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
