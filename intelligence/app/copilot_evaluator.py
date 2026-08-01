import re
from datetime import date

from .models import CopilotEvaluation, DecisionContext, RecommendationResponse


NUMBER_PATTERN = re.compile(r"(?<![A-Za-z])\$?\d[\d,]*(?:\.\d+)?%?")
WORD_PATTERN = re.compile(r"[a-z]{3,}")
STOP_WORDS = {"about", "after", "before", "could", "should", "their", "there", "these", "this", "those", "today", "what", "when", "where", "which", "with", "would"}


def _normalise_number(value: str) -> str:
    try:
        return f"{float(value.replace('$', '').replace(',', '').replace('%', '')):.6g}"
    except ValueError:
        return value


def _numbers(value) -> set[str]:
    if isinstance(value, dict):
        return set().union(*(_numbers(item) for item in value.values()), set())
    if isinstance(value, list):
        return set().union(*(_numbers(item) for item in value), set())
    return {_normalise_number(match) for match in NUMBER_PATTERN.findall(str(value))}


def _terms(value: str) -> set[str]:
    aliases = {"irrigate": "irrigation", "irrigating": "irrigation", "harvesting": "harvest", "selling": "sell"}
    return {aliases.get(term, term.rstrip("s")) for term in WORD_PATTERN.findall(value.lower()) if term not in STOP_WORDS}


def _freshness_score(context: DecisionContext) -> int:
    scores = [100]
    if context.price_date:
        try:
            age = (date.today() - date.fromisoformat(context.price_date[:10])).days
            scores.append(100 if age <= 7 else 85 if age <= 30 else 65 if age <= 365 else 40)
        except ValueError:
            scores.append(50)
    elif context.crop_price is not None:
        scores.append(55)
    if context.production_year:
        age = date.today().year - context.production_year
        scores.append(95 if age <= 1 else 80 if age <= 2 else 55 if age <= 4 else 35)
    return round(sum(scores) / len(scores))


def evaluate_copilot_answer(question: str, answer: dict, context: DecisionContext, recommendation: RecommendationResponse, retrieved_chunks: list[dict], cited_chunk_ids: list[str], generated_by: str, baseline_action: str) -> CopilotEvaluation:
    answer_text = " ".join(str(answer.get(key, "")) for key in ("recommendedAction", "explanation", "expectedBenefitOrRisk", "alternativeAction"))
    evidence = {"context": context.model_dump(by_alias=True), "recommendation": recommendation.model_dump(by_alias=True), "retrieved": retrieved_chunks}
    claims = list(dict.fromkeys(_numbers(answer_text)))
    allowed_numbers = _numbers(evidence)
    unsupported = [claim for claim in claims if claim not in allowed_numbers]
    grounding = 100 if not claims else round(100 * (len(claims) - len(unsupported)) / len(claims))

    available_ids = {str(item.get("chunkId", "")) for item in retrieved_chunks}
    valid_citations = available_ids.intersection(cited_chunk_ids)
    citation_coverage = 100 if not retrieved_chunks else round(100 * len(valid_citations) / min(2, len(retrieved_chunks)))

    question_terms, answer_terms = _terms(question), _terms(answer_text)
    relevance = 100 if not question_terms else round(100 * len(question_terms & answer_terms) / len(question_terms))
    relevance = max(relevance, 80 if context.crop_name.lower() in answer_text.lower() or context.crop_slug in answer_text.lower() else 0)

    baseline_terms, action_terms = _terms(baseline_action), _terms(str(answer.get("recommendedAction", "")))
    consistency = 100 if generated_by == "deterministic" else round(100 * len(baseline_terms & action_terms) / max(1, len(baseline_terms)))
    consistency = max(consistency, 75 if baseline_terms & action_terms else 35)

    required = [context.crop_price, context.production_value, context.yield_per_acre, context.soil_moisture]
    completeness = round(100 * (sum(value is not None for value in required) + (context.crop_stage != "unspecified")) / 5)
    freshness = _freshness_score(context)
    source_reliability = 96
    model_reliability = 90 if generated_by == "deterministic" else 72
    data_quality = round(.25 * completeness + .20 * freshness + .20 * source_reliability + .20 * model_reliability + .15 * consistency)

    confidence = round(.30 * grounding + .15 * citation_coverage + .15 * relevance + .15 * consistency + .25 * data_quality)
    if unsupported:
        confidence = min(confidence, 55)
    if generated_by != "deterministic":
        confidence = min(confidence, 88)

    flags: list[str] = []
    if unsupported:
        flags.append("unsupported_numeric_claims")
    if citation_coverage < 60:
        flags.append("low_citation_coverage")
    if relevance < 60:
        flags.append("low_question_relevance")
    if consistency < 60:
        flags.append("action_drift")
    if context.soil_moisture is None:
        flags.append("missing_field_soil_moisture")
    flags.append("state_level_weather")
    if generated_by != "deterministic":
        flags.append("model_not_task_benchmarked")

    if context.soil_moisture is None:
        missing = "A current field-level soil-moisture reading"
    elif context.crop_stage == "unspecified":
        missing = "The crop's current growth stage"
    elif context.crop_price is None:
        missing = "A current local cash price and basis"
    elif context.yield_per_acre is None:
        missing = "The field's expected yield per acre"
    else:
        missing = "County or field-level weather and observations"

    evidence_labels = ["Open-Meteo forecast and deterministic field-risk scores"]
    if context.production_value is not None or context.crop_price is not None:
        evidence_labels.append("USDA NASS production and price records")
    evidence_labels.extend(str(item.get("title")) for item in retrieved_chunks if str(item.get("chunkId")) in valid_citations)
    explanation = f"Score combines answer grounding ({grounding}), citation coverage ({citation_coverage}), relevance ({relevance}), action consistency ({consistency}), and input/source quality ({data_quality})."
    return CopilotEvaluation(confidence_score=confidence, level="high" if confidence >= 85 else "medium" if confidence >= 65 else "low", grounding_score=grounding, citation_coverage_score=citation_coverage, relevance_score=relevance, action_consistency_score=consistency, data_quality_score=data_quality, explanation=explanation, strongest_evidence=list(dict.fromkeys(evidence_labels)), flags=flags, missing_input_to_improve=missing)
