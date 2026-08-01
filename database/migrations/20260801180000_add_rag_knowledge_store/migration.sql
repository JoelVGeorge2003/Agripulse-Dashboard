CREATE TABLE "KnowledgeDocument" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "publisher" TEXT NOT NULL, "sourceUrl" TEXT NOT NULL,
  "documentType" TEXT NOT NULL, "jurisdiction" TEXT, "cropSlugs" TEXT[], "publishedAt" TIMESTAMP(3),
  "contentHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "KnowledgeChunk" (
  "id" TEXT NOT NULL, "documentId" TEXT NOT NULL, "chunkIndex" INTEGER NOT NULL, "content" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KnowledgeDocument_contentHash_key" ON "KnowledgeDocument"("contentHash");
CREATE INDEX "KnowledgeDocument_publisher_documentType_idx" ON "KnowledgeDocument"("publisher", "documentType");
CREATE INDEX "KnowledgeDocument_status_updatedAt_idx" ON "KnowledgeDocument"("status", "updatedAt" DESC);
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_chunkIndex_key" ON "KnowledgeChunk"("documentId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_documentId_chunkIndex_idx" ON "KnowledgeChunk"("documentId", "chunkIndex");
CREATE INDEX "KnowledgeChunk_content_fts_idx" ON "KnowledgeChunk" USING GIN (to_tsvector('english', "content"));
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
