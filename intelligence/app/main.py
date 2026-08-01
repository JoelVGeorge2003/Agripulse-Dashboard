from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .chat_service import answer_chat
from .config import get_settings
from .database import connect_database, disconnect_database
from .decision_service import copilot, recommendation, score_risks, simulate
from .models import ChatRequest, ChatResponse, CopilotRequest, CopilotResponse, DecisionContext, KnowledgeIngestRequest, KnowledgeIngestResponse, KnowledgeSearchResponse, RecommendationResponse, RiskResponse, ScenarioRequest, ScenarioResponse, WeatherAnalysisRequest, WeatherImpact
from .rag_service import deactivate, ingest, search, stats
from .weather_impact import analyse_weather


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_database()
    yield
    await disconnect_database()


app = FastAPI(title="AgriPulse Intelligence Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    if settings.chat_provider.lower() == "openai" and settings.openai_api_key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(
                    f"{settings.openai_base_url}/models/{settings.openai_model}",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                )
            return {
                "status": "ok",
                "service": "agripulse-intelligence",
                "model_status": "online" if response.is_success else "offline",
                "model_provider": "openai",
            }
        except Exception:
            return {
                "status": "ok",
                "service": "agripulse-intelligence",
                "model_status": "offline",
                "model_provider": "openai",
            }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            model_status = "online" if response.is_success else "offline"
    except Exception:
        model_status = "offline"

    return {
        "status": "ok",
        "service": "agripulse-intelligence",
        "model_status": model_status,
        "model_provider": "ollama" if model_status == "online" else "fallback",
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    return await answer_chat(request)


@app.post("/analyze/weather", response_model=WeatherImpact)
async def weather_analysis(request: WeatherAnalysisRequest) -> WeatherImpact:
    return analyse_weather(request)


@app.post("/decisions/risks", response_model=RiskResponse)
async def decision_risks(request: DecisionContext) -> RiskResponse:
    return score_risks(request)


@app.post("/decisions/recommendation", response_model=RecommendationResponse)
async def decision_recommendation(request: DecisionContext) -> RecommendationResponse:
    return await recommendation(request)


@app.post("/decisions/scenario", response_model=ScenarioResponse)
async def decision_scenario(request: ScenarioRequest) -> ScenarioResponse:
    return await simulate(request)


@app.post("/decisions/copilot", response_model=CopilotResponse)
async def decision_copilot(request: CopilotRequest) -> CopilotResponse:
    return await copilot(request)


@app.post("/knowledge/ingest", response_model=KnowledgeIngestResponse)
async def knowledge_ingest(request: KnowledgeIngestRequest, x_admin_key: str | None = Header(default=None)) -> KnowledgeIngestResponse:
    settings = get_settings()
    expected = __import__('os').environ.get("ADMIN_API_KEY", "")
    if expected and x_admin_key != expected:
        raise HTTPException(status_code=401, detail="A valid admin key is required.")
    try:
        return await ingest(request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/knowledge/search", response_model=KnowledgeSearchResponse)
async def knowledge_search(q: str, crop_slug: str | None = None, jurisdiction: str | None = None, limit: int = 5) -> KnowledgeSearchResponse:
    return await search(q, crop_slug, jurisdiction, limit)


@app.get("/knowledge/stats")
async def knowledge_stats() -> dict:
    return await stats()


@app.delete("/knowledge/documents/{document_id}")
async def knowledge_deactivate(document_id: str, x_admin_key: str | None = Header(default=None)) -> dict:
    expected = __import__('os').environ.get("ADMIN_API_KEY", "")
    if expected and x_admin_key != expected:
        raise HTTPException(status_code=401, detail="A valid admin key is required.")
    if not await deactivate(document_id):
        raise HTTPException(status_code=404, detail="Active knowledge document not found.")
    return {"documentId": document_id, "status": "INACTIVE"}
