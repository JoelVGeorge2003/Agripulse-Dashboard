import hashlib
import re
from uuid import uuid4

from .database import connection
from .models import KnowledgeIngestRequest, KnowledgeIngestResponse, KnowledgeSearchResponse, KnowledgeSearchResult

ALLOWED_PUBLISHERS = ("USDA", "United States Department of Agriculture", "Extension", "University", "EPA", "Federal Register")


def chunk_text(content: str, target_words: int = 320, overlap_words: int = 60) -> list[str]:
    paragraphs = [item.strip() for item in re.split(r"\n\s*\n", content) if item.strip()]
    words: list[str] = []
    chunks: list[str] = []
    for paragraph in paragraphs:
        paragraph_words = paragraph.split()
        if words and len(words) + len(paragraph_words) > target_words:
            chunks.append(" ".join(words))
            words = words[-overlap_words:]
        words.extend(paragraph_words)
        while len(words) >= target_words + overlap_words:
            chunks.append(" ".join(words[:target_words]))
            words = words[target_words - overlap_words:]
    if words:
        chunks.append(" ".join(words))
    return [chunk for chunk in chunks if len(chunk.split()) >= 20]


async def ingest(request: KnowledgeIngestRequest) -> KnowledgeIngestResponse:
    if not request.publisher.lower().startswith(tuple(item.lower() for item in ALLOWED_PUBLISHERS)):
        raise ValueError("Only USDA, land-grant Extension, EPA, Federal Register, or other named government/University publishers are accepted.")
    normalized = re.sub(r"\s+", " ", request.content).strip()
    content_hash = hashlib.sha256(normalized.encode()).hexdigest()
    chunks = chunk_text(request.content)
    if not chunks:
        raise ValueError("Document did not produce any meaningful chunks.")
    async with connection() as db:
        existing = await db.fetchrow('SELECT "id" FROM "KnowledgeDocument" WHERE "contentHash"=$1', content_hash)
        if existing:
            count = await db.fetchval('SELECT count(*) FROM "KnowledgeChunk" WHERE "documentId"=$1', existing["id"])
            return KnowledgeIngestResponse(document_id=existing["id"], chunks_created=count, content_hash=content_hash, duplicate=True)
        document_id = str(uuid4())
        async with db.transaction():
            await db.execute('INSERT INTO "KnowledgeDocument" ("id","title","publisher","sourceUrl","documentType","jurisdiction","cropSlugs","publishedAt","contentHash","status","metadata","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::timestamp,$9,\'ACTIVE\',$10::jsonb,NOW(),NOW())', document_id, request.title, request.publisher, request.source_url, request.document_type, request.jurisdiction, request.crop_slugs, request.published_at, content_hash, __import__('json').dumps(request.metadata))
            for index, chunk in enumerate(chunks):
                await db.execute('INSERT INTO "KnowledgeChunk" ("id","documentId","chunkIndex","content","tokenCount","createdAt") VALUES ($1,$2,$3,$4,$5,NOW())', str(uuid4()), document_id, index, chunk, round(len(chunk.split()) * 1.3))
    return KnowledgeIngestResponse(document_id=document_id, chunks_created=len(chunks), content_hash=content_hash, duplicate=False)


async def search(query: str, crop_slug: str | None = None, jurisdiction: str | None = None, limit: int = 5) -> KnowledgeSearchResponse:
    if not query.strip():
        return KnowledgeSearchResponse(query=query, results=[])
    stop_words = {"should", "could", "would", "what", "when", "where", "which", "today", "given", "about", "with", "from", "this", "that", "have", "take", "next"}
    terms = [term for term in re.findall(r"[a-zA-Z]{4,}", query.lower()) if term not in stop_words][:12]
    search_query = " | ".join(dict.fromkeys(terms))
    if not search_query:
        return KnowledgeSearchResponse(query=query, results=[])
    async with connection() as db:
        rows = await db.fetch('''
          SELECT kc."id" AS "chunkId", kd."id" AS "documentId", kd."title", kd."publisher", kd."sourceUrl",
                 kd."documentType", kc."content", ts_rank_cd(to_tsvector('english', kc."content"), to_tsquery('english', $1)) AS score
          FROM "KnowledgeChunk" kc JOIN "KnowledgeDocument" kd ON kd."id"=kc."documentId"
          WHERE kd."status"='ACTIVE' AND to_tsvector('english', kc."content") @@ to_tsquery('english', $1)
            AND ($2::text IS NULL OR cardinality(kd."cropSlugs")=0 OR $2=ANY(kd."cropSlugs"))
            AND ($3::text IS NULL OR kd."jurisdiction" IS NULL OR kd."jurisdiction"=$3 OR kd."jurisdiction"='US')
          ORDER BY score DESC, kd."publishedAt" DESC NULLS LAST LIMIT $4
        ''', search_query, crop_slug, jurisdiction, min(max(limit, 1), 10))
    return KnowledgeSearchResponse(query=query, results=[KnowledgeSearchResult(chunk_id=row["chunkId"], document_id=row["documentId"], title=row["title"], publisher=row["publisher"], source_url=row["sourceUrl"], document_type=row["documentType"], content=row["content"], score=float(row["score"])) for row in rows])


async def stats() -> dict:
    async with connection() as db:
        row = await db.fetchrow('SELECT count(DISTINCT kd."id") AS documents, count(kc."id") AS chunks, coalesce(sum(kc."tokenCount"),0) AS tokens FROM "KnowledgeDocument" kd LEFT JOIN "KnowledgeChunk" kc ON kc."documentId"=kd."id" WHERE kd."status"=\'ACTIVE\'')
    return {"activeDocuments": row["documents"], "chunks": row["chunks"], "estimatedTokens": row["tokens"]}


async def deactivate(document_id: str) -> bool:
    async with connection() as db:
        status = await db.execute('UPDATE "KnowledgeDocument" SET "status"=\'INACTIVE\', "updatedAt"=NOW() WHERE "id"=$1 AND "status"=\'ACTIVE\'', document_id)
    return status.endswith("1")
