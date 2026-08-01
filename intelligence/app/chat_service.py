import json
import asyncio
from copy import deepcopy
from datetime import datetime, timezone
import httpx
from .config import get_settings
from .chat_evaluator import evaluate_answer
from .models import ChatCitation, ChatRequest, ChatResponse
from .repositories import agriculture_repository


STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}


def detect_state(message: str, explicit: str | None) -> str | None:
    if explicit:
        code = explicit.upper()
        return code if code in STATE_NAMES else None
    lowered = message.lower()
    for code, name in STATE_NAMES.items():
        if name.lower() in lowered or f" {code.lower()} " in f" {lowered} ":
            return code
    return None


def detect_states(message: str, explicit: str | None) -> list[str]:
    lowered = f" {message.lower()} "
    original = f" {message} "
    detected = [
        code for code, name in STATE_NAMES.items()
        if name.lower() in lowered or f" {code} " in original
    ]
    if explicit and explicit.upper() in STATE_NAMES and explicit.upper() not in detected:
        detected.append(explicit.upper())
    return detected


async def build_context(request: ChatRequest) -> tuple[dict, list[ChatCitation], str]:
    commodities, nationwide_production, all_prices = await asyncio.gather(
        agriculture_repository.list_commodities(),
        agriculture_repository.nationwide_latest_production(),
        agriculture_repository.all_latest_prices(),
    )
    lowered = request.message.lower()
    commodity = next(
        (
            item for item in commodities
            if item.slug == request.commodity_slug
            or item.name.lower() in lowered
            or item.slug in lowered
            or item.name.lower().removesuffix("s") in lowered
            or item.slug.removesuffix("s") in lowered
        ),
        None,
    )
    state_code = detect_state(request.message, request.state_code)
    state_codes = detect_states(request.message, request.state_code)
    relevant_nationwide_production = nationwide_production
    if commodity:
        relevant_nationwide_production = [
            row for row in nationwide_production if row.get("slug") == commodity.slug
        ]
    elif state_codes:
        relevant_nationwide_production = [
            row for row in nationwide_production if row.get("stateCode") in state_codes
        ]
    context: dict = {
        "question": request.message,
        "conversation": [turn.model_dump() for turn in request.history[-8:]],
        "state": None,
        "states": [],
        "commodity": None,
        "featuredPrices": [],
        "nationwideDataset": {
            "scope": "Question-relevant records retrieved from the complete nationwide USDA dataset; the selected state is a focus, not a database filter.",
            "production": relevant_nationwide_production,
            "latestNationalPrices": all_prices,
        },
    }
    citations: list[ChatCitation] = []
    as_of = datetime.now(timezone.utc).isoformat()

    if commodity:
        price = await agriculture_repository.national_price(commodity.slug)
        top_states = await agriculture_repository.top_states(commodity.slug)
        context["commodity"] = {"name": commodity.name, "slug": commodity.slug, "latestPrice": price, "topStates": top_states}
        if price:
            as_of = str(price["priceDate"])
            citations.append(ChatCitation(label=f"{commodity.name} price", value=f'{price["value"]:.2f} {price["unit"]} ({str(price["priceDate"])[:10]})'))
        for row in top_states[:3]:
            citations.append(ChatCitation(label=f'{row["stateCode"]} production', value=f'{row["value"]:,.0f} {row["unit"]} ({row["year"]})'))

    if state_code:
        production = await agriculture_repository.state_production(state_code)
        context["state"] = {"code": state_code, "name": STATE_NAMES[state_code], "production": production}
        for row in production[:3]:
            citations.append(ChatCitation(label=f'{STATE_NAMES[state_code]} {row["name"]}', value=f'{row["value"]:,.0f} {row["unit"]} ({row["year"]})'))

    if state_codes:
        state_rows = await asyncio.gather(*(agriculture_repository.state_production(code) for code in state_codes))
        context["states"] = [
            {"code": code, "name": STATE_NAMES[code], "production": rows}
            for code, rows in zip(state_codes, state_rows)
        ]
        for focused_state in context["states"]:
            requested = next(
                (row for row in focused_state["production"] if commodity and row.get("slug") == commodity.slug),
                None,
            )
            if requested:
                citations.append(ChatCitation(
                    label=f'{focused_state["name"]} {requested["name"]}',
                    value=f'{requested["value"]:,.0f} {requested["unit"]} ({requested["year"]})',
                ))

    if not commodity and not state_code:
        prices = await agriculture_repository.featured_prices()
        context["featuredPrices"] = prices
        for row in prices[:5]:
            citations.append(ChatCitation(label=f'{row["name"]} price', value=f'{row["value"]:.2f} {row["unit"]} ({str(row["priceDate"])[:10]})'))
        if prices:
            as_of = max(str(row["priceDate"]) for row in prices)

    context["rules"] = [
        "Use only this database context.",
        "The nationwideDataset is available for every question. Do not limit an answer to the focused state unless the question asks for that state only.",
        "Use nationwideDataset.production to compare, rank, aggregate, or answer questions about states other than the focused state.",
        "Always include dates, years, and units when quoting numbers.",
        "Do not describe periodic USDA observations as exchange-level real-time quotes.",
        "Say when the database does not contain enough evidence.",
        "Resolve pronouns and follow-up questions from the supplied conversation, but use database context for factual claims."
    ]
    return context, citations[:8], as_of


def fallback_answer(context: dict) -> str:
    state = context.get("state")
    states = context.get("states", [])
    commodity = context.get("commodity")
    sentences: list[str] = []
    if len(states) > 1 and commodity:
        comparisons = []
        for focused_state in states:
            requested = next(
                (row for row in focused_state.get("production", []) if row.get("slug") == commodity.get("slug")),
                None,
            )
            if requested:
                comparisons.append(
                    f'{focused_state["name"]} produced {requested["value"]:,.0f} {requested["unit"]} in {requested["year"]}'
                )
        if comparisons:
            return "; ".join(comparisons) + "."
    if state and state.get("production"):
        rows = state["production"]
        requested = next(
            (row for row in rows if commodity and row.get("slug") == commodity.get("slug")),
            None,
        )
        if requested:
            sentence = (
                f'{state["name"]} produced {requested["value"]:,.0f} {requested["unit"]} '
                f'of {requested["name"]} in {requested["year"]}'
            )
            if requested.get("unitPriceUsd") is not None:
                price_unit = requested["unit"].lower().removesuffix("s")
                sentence += f', with an implied value of ${requested["unitPriceUsd"]:,.2f} per {price_unit}'
            if requested.get("totalValueUsd") is not None:
                sentence += f' and total state production value of ${requested["totalValueUsd"]:,.0f}'
            sentences.append(sentence + ".")
            return " ".join(sentences)
        if commodity:
            return f'No stored USDA NASS {commodity["name"]} production record is available for {state["name"]}.'
        top = rows[0]
        sentences.append(f'{state["name"]}’s leading stored crop is {top["name"]}, with {top["value"]:,.0f} {top["unit"]} in {top["year"]}.')
        if len(rows) > 1:
            rest = ", ".join(f'{row["name"]} ({row["value"]:,.0f} {row["unit"]})' for row in rows[1:4])
            sentences.append(f"Other tracked crops are {rest}.")
    if commodity:
        price = commodity.get("latestPrice")
        if price:
            sentences.append(f'{commodity["name"]}’s latest stored national price is {price["value"]:.2f} {price["unit"]}, dated {str(price["priceDate"])[:10]}.')
        top_states = commodity.get("topStates", [])
        if top_states:
            sentences.append("The leading stored production states are " + ", ".join(f'{row["stateCode"]} ({row["value"]:,.0f} {row["unit"]})' for row in top_states[:3]) + ".")
    if not sentences and context.get("featuredPrices"):
        sentences.append("Latest stored prices: " + "; ".join(f'{row["name"]} {row["value"]:.2f} {row["unit"]}' for row in context["featuredPrices"][:5]) + ".")
    if not sentences:
        return "The AgriPulse database does not contain enough records to answer that question yet."
    return " ".join(sentences)


def response_text(payload: dict) -> str:
    for output in payload.get("output", []):
        if output.get("type") != "message":
            continue
        for content in output.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                return str(content["text"]).strip()
    return ""


def model_context(context: dict) -> dict:
    formatted = deepcopy(context)

    def format_numbers(value):
        if isinstance(value, dict):
            return {
                key: (
                    f"{item:,.0f}" if key in {"value", "totalValueUsd"} and isinstance(item, (int, float))
                    else f"{item:,.2f}" if key == "unitPriceUsd" and isinstance(item, (int, float))
                    else format_numbers(item)
                )
                for key, item in value.items()
            }
        if isinstance(value, list):
            return [format_numbers(item) for item in value]
        return value

    return format_numbers(formatted)


async def answer_chat(request: ChatRequest) -> ChatResponse:
    context, citations, as_of = await build_context(request)
    prompt_context = model_context(context)
    settings = get_settings()
    system_prompt = (
        "You are AgriPulse Analyst. Give a clean, direct, concise agricultural-data answer using only the supplied database context. "
        "Never invent, estimate, round, or recalculate figures, and never make farm-specific claims from state-level data. "
        "Copy every number, date, year, unit, state code, and ranking exactly from the supplied JSON. "
        "Return only requested results that have records. Omit states, crops, metrics, and comparisons with no records. "
        "Do not provide suggestions, possible next steps, generic explanations, or repeat the question. "
        "If no requested result has a record, say so in one short sentence."
    )
    if len(context.get("states", [])) > 1 and context.get("commodity"):
        answer = fallback_answer(context)
        result = evaluate_answer(request.message, answer, context, citations, "fallback")
        return ChatResponse(
            answer=answer,
            model="agripulse-local",
            generated_by="fallback",
            citations=citations,
            as_of=as_of,
            evaluation=result.evaluation,
        )
    try:
        if settings.chat_provider.lower() != "openai":
            raise ValueError("OpenAI is not the configured primary provider")
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{settings.openai_base_url}/responses",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.openai_model,
                    "instructions": system_prompt,
                    "input": f"Database context:\n{json.dumps(prompt_context, indent=2)}\n\nQuestion: {request.message}",
                    "reasoning": {"effort": "low"},
                    "text": {"verbosity": "low"},
                },
            )
            response.raise_for_status()
            answer = response_text(response.json())
            if not answer:
                raise ValueError("OpenAI returned an empty answer")
            model = settings.openai_model
            generated_by = "openai"
    except Exception:
        try:
            async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
                response = await client.post(
                    f"{settings.ollama_base_url}/api/chat",
                    json={
                        "model": settings.ollama_model,
                        "stream": False,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Database context:\n{json.dumps(prompt_context, indent=2)}\n\nQuestion: {request.message}"},
                        ],
                        "options": {"temperature": 0, "num_predict": 220},
                    },
                )
                response.raise_for_status()
                payload = response.json()
                answer = str(payload.get("message", {}).get("content", "")).strip()
                if not answer:
                    raise ValueError("Ollama returned an empty answer")
                model = str(payload.get("model") or settings.ollama_model)
                generated_by = "ollama"
        except Exception:
            answer = fallback_answer(context)
            model = "agripulse-local"
            generated_by = "fallback"

    result = evaluate_answer(request.message, answer, context, citations, generated_by)
    if result.should_fallback:
        answer = fallback_answer(context)
        model = "agripulse-local"
        generated_by = "fallback"
        result = evaluate_answer(request.message, answer, context, citations, generated_by)

    return ChatResponse(
        answer=answer,
        model=model,
        generated_by=generated_by,
        citations=citations,
        as_of=as_of,
        evaluation=result.evaluation,
    )
