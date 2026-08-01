CREATE TABLE "FarmProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stateCode" TEXT NOT NULL,
  "countyFips" TEXT,
  "cropSlug" TEXT NOT NULL,
  "acres" DECIMAL(14,2),
  "irrigationType" TEXT,
  "expectedYieldPerAcre" DECIMAL(14,4),
  "fuelCostPerAcre" DECIMAL(12,2),
  "fertilizerCostPerAcre" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FarmProfile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Recommendation" (
  "id" TEXT NOT NULL,
  "farmProfileId" TEXT,
  "stateCode" TEXT NOT NULL,
  "cropSlug" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "estimatedImpact" JSONB NOT NULL,
  "alternativeAction" TEXT,
  "inputs" JSONB NOT NULL,
  "rulesUsed" JSONB NOT NULL,
  "sources" JSONB NOT NULL,
  "limitations" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RecommendationFeedback" (
  "id" TEXT NOT NULL,
  "recommendationId" TEXT NOT NULL,
  "helpful" BOOLEAN NOT NULL,
  "followed" BOOLEAN,
  "outcome" TEXT,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ScenarioRun" (
  "id" TEXT NOT NULL,
  "farmProfileId" TEXT,
  "stateCode" TEXT NOT NULL,
  "cropSlug" TEXT NOT NULL,
  "baseline" JSONB NOT NULL,
  "changes" JSONB NOT NULL,
  "results" JSONB NOT NULL,
  "assumptions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScenarioRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FarmProfile_stateCode_cropSlug_idx" ON "FarmProfile"("stateCode", "cropSlug");
CREATE INDEX "Recommendation_stateCode_cropSlug_createdAt_idx" ON "Recommendation"("stateCode", "cropSlug", "createdAt" DESC);
CREATE INDEX "RecommendationFeedback_recommendationId_createdAt_idx" ON "RecommendationFeedback"("recommendationId", "createdAt");
CREATE INDEX "ScenarioRun_stateCode_cropSlug_createdAt_idx" ON "ScenarioRun"("stateCode", "cropSlug", "createdAt" DESC);
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_farmProfileId_fkey" FOREIGN KEY ("farmProfileId") REFERENCES "FarmProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScenarioRun" ADD CONSTRAINT "ScenarioRun_farmProfileId_fkey" FOREIGN KEY ("farmProfileId") REFERENCES "FarmProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
