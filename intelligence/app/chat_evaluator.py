import re
from dataclasses import dataclass

from .models import ChatCitation, ChatEvaluation


NUMBER_PATTERN = re.compile(r"(?<![A-Za-z])\$?\d[\d,]*(?:\.\d+)?%?")
WORD_PATTERN = re.compile(r"[a-z]{3,}")
STOP_WORDS = {
    "about", "which", "what", "where", "when", "with", "from", "that", "this",
    "those", "these", "lead", "leading", "production", "produced", "state", "states",
}


def _normalise_number(value: str) -> str:
    return value.replace("$", "").replace(",", "").replace("%", "").lstrip("0") or "0"


def _numbers(value) -> set[str]:
    if isinstance(value, dict):
        return set().union(*(_numbers(item) for item in value.values()), set())
    if isinstance(value, list):
        return set().union(*(_numbers(item) for item in value), set())
    if isinstance(value, (int, float)):
        candidates = {str(value), f"{value:,.0f}", f"{value:,.2f}"}
    else:
        candidates = NUMBER_PATTERN.findall(str(value))
    return {_normalise_number(item) for candidate in candidates for item in NUMBER_PATTERN.findall(candidate)}


def _meaningful_answer_numbers(answer: str) -> list[str]:
    result: list[str] = []
    for match in NUMBER_PATTERN.finditer(answer):
        token = match.group()
        # Ignore ordered-list markers such as "1." while evaluating factual claims.
        if token.isdigit() and len(token) <= 2 and answer[match.end():match.end() + 1] == ".":
            continue
        result.append(_normalise_number(token))
    return result


@dataclass(frozen=True)
class EvaluationResult:
    evaluation: ChatEvaluation
    should_fallback: bool


def evaluate_answer(question: str, answer: str, context: dict, citations: list[ChatCitation], generated_by: str) -> EvaluationResult:
    allowed = _numbers(context)
    claims = _meaningful_answer_numbers(answer)
    unsupported = sorted({claim for claim in claims if claim not in allowed})
    groundedness = 100 if not claims else round(100 * (len(claims) - sum(claim not in allowed for claim in claims)) / len(claims))

    citation_numbers = _numbers([citation.model_dump() for citation in citations])
    cited_claims = [claim for claim in claims if claim in citation_numbers]
    citation_coverage = 100 if not claims else round(100 * len(cited_claims) / len(claims))

    question_terms = set(WORD_PATTERN.findall(question.lower())) - STOP_WORDS
    answer_terms = set(WORD_PATTERN.findall(answer.lower()))
    relevance = 100 if not question_terms else round(100 * len(question_terms & answer_terms) / len(question_terms))

    confidence = round(groundedness * 0.65 + citation_coverage * 0.2 + relevance * 0.15)
    if generated_by == "fallback":
        confidence = min(confidence, 90)
    if unsupported:
        confidence = min(confidence, 55)

    flags: list[str] = []
    if unsupported:
        flags.append("unsupported_numeric_claims")
    if citation_coverage < 50:
        flags.append("low_citation_coverage")
    if relevance < 50:
        flags.append("low_question_relevance")
    if generated_by == "fallback":
        flags.append("deterministic_fallback")

    evaluation = ChatEvaluation(
        confidence_score=confidence,
        groundedness_score=groundedness,
        citation_coverage_score=citation_coverage,
        relevance_score=relevance,
        status="high" if confidence >= 85 else "medium" if confidence >= 65 else "low",
        flags=flags,
    )
    return EvaluationResult(evaluation=evaluation, should_fallback=generated_by != "fallback" and confidence < 65)
