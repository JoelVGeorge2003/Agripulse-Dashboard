from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ChatTurn(ApiModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(ApiModel):
    message: str = Field(min_length=2, max_length=2000)
    commodity_slug: str | None = None
    state_code: str | None = Field(default=None, min_length=2, max_length=2)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class ChatCitation(ApiModel):
    label: str
    value: str


class ChatEvaluation(ApiModel):
    confidence_score: int = Field(ge=0, le=100)
    groundedness_score: int = Field(ge=0, le=100)
    citation_coverage_score: int = Field(ge=0, le=100)
    relevance_score: int = Field(ge=0, le=100)
    status: Literal["high", "medium", "low"]
    flags: list[str] = Field(default_factory=list)


class ChatResponse(ApiModel):
    answer: str
    model: str
    generated_by: Literal["openai", "ollama", "fallback"]
    citations: list[ChatCitation]
    as_of: str
    evaluation: ChatEvaluation


class WeatherAnalysisRequest(ApiModel):
    state_code: str
    state_name: str
    crop_name: str
    current_temperature_f: float
    weekly_precipitation_inches: float
    weekly_evapotranspiration_inches: float
    maximum_temperature_f: float
    average_soil_moisture: float | None = None


class WeatherImpact(ApiModel):
    level: Literal["FAVOURABLE", "WATCH", "HIGH_RISK"]
    score: int = Field(ge=0, le=100)
    headline: str
    summary: str
    drivers: list[str]
    actions: list[str]


class DecisionDay(ApiModel):
    date: str
    temperature_max_f: float
    temperature_min_f: float
    precipitation_inches: float
    precipitation_probability_percent: float
    evapotranspiration_inches: float


class DecisionContext(ApiModel):
    state_code: str
    state_name: str
    crop_slug: str
    crop_name: str
    acres: float = Field(default=100, gt=0)
    crop_stage: str = "unspecified"
    current_temperature_f: float
    relative_humidity_percent: float
    soil_moisture: float | None = None
    daily: list[DecisionDay]
    production_value: float | None = None
    production_unit: str | None = None
    production_year: int | None = None
    yield_per_acre: float | None = None
    crop_price: float | None = None
    price_unit: str | None = None
    price_date: str | None = None
    fuel_cost_per_acre: float = 42
    fertilizer_cost_per_acre: float = 135


class Explainability(ApiModel):
    inputs: dict
    rules_used: list[str]
    sources: list[dict]
    limitations: list[str]


class RiskScore(ApiModel):
    key: str
    label: str
    score: int = Field(ge=0, le=100)
    explanation: str


class RiskResponse(ApiModel):
    risks: list[RiskScore]
    confidence: int = Field(ge=0, le=100)
    explainability: Explainability


class RecommendationResponse(ApiModel):
    recommendation_id: str | None = None
    action: str
    reason: str
    confidence: int = Field(ge=0, le=100)
    estimated_impact: dict
    alternative_action: str
    risks: list[RiskScore]
    explainability: Explainability


class ScenarioChanges(ApiModel):
    rainfall_percent: float = 0
    temperature_f: float = 0
    crop_price_percent: float = 0
    fuel_cost_percent: float = 0
    fertilizer_cost_percent: float = 0


class ScenarioRequest(ApiModel):
    context: DecisionContext
    changes: ScenarioChanges


class ScenarioResponse(ApiModel):
    baseline: dict
    scenario: dict
    changes: ScenarioChanges
    assumptions: list[str]
    confidence: int
    explainability: Explainability


class CopilotRequest(ApiModel):
    question: str = Field(min_length=2, max_length=1000)
    context: DecisionContext


class CopilotEvaluation(ApiModel):
    confidence_score: int = Field(ge=0, le=100)
    level: Literal["high", "medium", "low"]
    grounding_score: int = Field(ge=0, le=100)
    citation_coverage_score: int = Field(ge=0, le=100)
    relevance_score: int = Field(ge=0, le=100)
    action_consistency_score: int = Field(ge=0, le=100)
    data_quality_score: int = Field(ge=0, le=100)
    explanation: str
    strongest_evidence: list[str] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)
    missing_input_to_improve: str | None = None


class CopilotResponse(ApiModel):
    recommended_action: str
    explanation: str
    confidence: int
    expected_benefit_or_risk: str
    alternative_action: str
    data_sources: list[dict]
    limitations: list[str]
    recommendation_id: str | None = None
    generated_by: Literal["openai", "ollama", "deterministic"] = "deterministic"
    model: str = "decision-engine-v1"
    retrieved_chunks: int = 0
    evaluation: CopilotEvaluation


class KnowledgeIngestRequest(ApiModel):
    title: str = Field(min_length=3, max_length=300)
    publisher: str = Field(min_length=2, max_length=120)
    source_url: str = Field(min_length=8, max_length=1000)
    document_type: Literal["USDA_REPORT", "EXTENSION_PUBLICATION", "REGULATION"]
    content: str = Field(min_length=100, max_length=2_000_000)
    jurisdiction: str | None = None
    crop_slugs: list[str] = Field(default_factory=list)
    published_at: str | None = None
    metadata: dict = Field(default_factory=dict)


class KnowledgeIngestResponse(ApiModel):
    document_id: str
    chunks_created: int
    content_hash: str
    duplicate: bool


class KnowledgeSearchResult(ApiModel):
    chunk_id: str
    document_id: str
    title: str
    publisher: str
    source_url: str
    document_type: str
    content: str
    score: float


class KnowledgeSearchResponse(ApiModel):
    query: str
    results: list[KnowledgeSearchResult]
