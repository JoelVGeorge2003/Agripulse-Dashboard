import json
from uuid import uuid4

from .database import connection
from .copilot_evaluator import evaluate_copilot_answer
from .models import (
    CopilotRequest, CopilotResponse, DecisionContext, Explainability, RecommendationResponse,
    RiskResponse, RiskScore, ScenarioRequest, ScenarioResponse,
)
from .rag_service import search
from .specialized_model import generate


def clamp(value: float) -> int:
    return max(0, min(100, round(value)))


def sources(context: DecisionContext) -> list[dict]:
    result = [{"name": "Open-Meteo seven-day forecast", "url": "https://open-meteo.com/"}]
    if context.production_value is not None:
        result.append({"name": "USDA NASS Quick Stats production", "url": "https://quickstats.nass.usda.gov/"})
    if context.crop_price is not None:
        result.append({"name": "USDA NASS price received", "url": "https://quickstats.nass.usda.gov/"})
    return result


def score_risks(context: DecisionContext) -> RiskResponse:
    rain = sum(day.precipitation_inches for day in context.daily)
    et = sum(day.evapotranspiration_inches for day in context.daily)
    hottest = max((day.temperature_max_f for day in context.daily), default=context.current_temperature_f)
    wet_days = sum(day.precipitation_inches >= .25 for day in context.daily)
    high_humidity = context.relative_humidity_percent >= 85
    soil = context.soil_moisture
    heat_threshold = 90 if context.crop_slug in {"corn", "soybeans", "wheat"} else 94

    water = clamp(18 + max(0, hottest - 85) * 3 + max(0, et - rain) * 24 + (max(0, .18 - soil) * 180 if soil is not None else 8))
    heat = clamp(max(0, hottest - heat_threshold) * 7 + sum(day.temperature_max_f >= heat_threshold for day in context.daily) * 6)
    flood = clamp(rain * 25 + wet_days * 6 + (25 if soil is not None and soil >= .35 else 0))
    disease = clamp((22 if high_humidity else 8) + wet_days * 11 + max(0, rain - 1) * 7)
    harvest = clamp(rain * 22 + wet_days * 9 + (12 if context.crop_stage.lower() in {"harvest", "maturity", "mature"} else 0))
    risks = [
        RiskScore(key="water_stress", label="Water stress", score=water, explanation=f"Forecast water balance is {rain - et:+.2f} in; maximum temperature is {hottest:.0f}°F."),
        RiskScore(key="heat_stress", label="Heat stress", score=heat, explanation=f"Forecast maximum of {hottest:.0f}°F is compared with a {heat_threshold}°F {context.crop_name} screening threshold."),
        RiskScore(key="flood", label="Flood", score=flood, explanation=f"The forecast contains {rain:.2f} in across {wet_days} materially wet day(s)."),
        RiskScore(key="disease", label="Disease", score=disease, explanation=f"Humidity is {context.relative_humidity_percent:.0f}% with {wet_days} wet day(s), indicating leaf-wetness conditions."),
        RiskScore(key="harvest_delay", label="Harvest delay", score=harvest, explanation=f"Rainfall and field-access risk are estimated from {rain:.2f} in over seven days."),
    ]
    missing = sum(value is None for value in [context.soil_moisture, context.crop_price, context.yield_per_acre])
    confidence = clamp(94 - missing * 8 - (8 if context.crop_stage == "unspecified" else 0))
    explainability = Explainability(
        inputs={"rainfallInches": round(rain, 3), "evapotranspirationInches": round(et, 3), "maximumTemperatureF": hottest, "humidityPercent": context.relative_humidity_percent, "soilMoisture": soil, "cropStage": context.crop_stage},
        rules_used=["Deterministic v1 thresholds combine seven-day rain, reference evapotranspiration, heat, humidity, soil moisture and crop stage.", "Every score is clamped to 0–100; no machine-learning prediction is used."],
        sources=sources(context),
        limitations=["State representative weather is not field-level weather.", "Humidity and rainfall are proxies for disease and field-access conditions.", "A local soil reading and crop growth stage improve confidence."],
    )
    return RiskResponse(risks=risks, confidence=confidence, explainability=explainability)


async def recommendation(context: DecisionContext, persist: bool = True) -> RecommendationResponse:
    risk_result = score_risks(context)
    by_key = {item.key: item for item in risk_result.risks}
    rain_24 = context.daily[0].precipitation_inches if context.daily else 0
    highest = max(risk_result.risks, key=lambda item: item.score)
    if rain_24 >= .5 and by_key["water_stress"].score < 45:
        action = "Delay irrigation for 24 hours"
        reason = f"The next forecast day includes {rain_24:.2f} in of rain and water-stress risk is {by_key['water_stress'].score}/100."
        impact = {"waterSavingsPercent": 15, "riskAvoided": "Unnecessary irrigation and field traffic"}
        alternative = "Use a reduced irrigation amount only if field inspection shows visible stress."
    elif highest.key == "water_stress":
        action = "Inspect soil moisture and prioritize irrigation"
        reason = highest.explanation
        impact = {"riskReduction": "Protect yield during forecast moisture deficit", "waterSavingsPercent": 0}
        alternative = "Irrigate the most water-stressed fields first if capacity is limited."
    elif highest.key == "harvest_delay":
        action = "Advance harvest on ready fields before the wettest forecast window"
        reason = highest.explanation
        impact = {"riskReduction": "Lower exposure to harvest delay and field-access loss"}
        alternative = "Prioritize better-drained fields and reassess after the rain event."
    elif highest.key == "disease":
        action = "Scout high-risk fields for disease within 24 hours"
        reason = highest.explanation
        impact = {"riskReduction": "Earlier detection during a wet, humid period"}
        alternative = "Scout low-lying and dense-canopy areas first if labor is constrained."
    elif highest.key == "heat_stress":
        action = "Schedule field operations outside peak heat and verify crop moisture"
        reason = highest.explanation
        impact = {"riskReduction": "Reduce heat exposure and identify moisture stress early"}
        alternative = "Inspect the most heat-sensitive growth stages first."
    else:
        action = "Continue routine scouting and hold the current operating plan"
        reason = f"No modeled risk exceeds the current leading score of {highest.score}/100."
        impact = {"riskReduction": "Avoid unnecessary intervention"}
        alternative = "Recheck the forecast and field observations in 24 hours."
    rec_id = str(uuid4())
    result = RecommendationResponse(recommendation_id=rec_id, action=action, reason=reason, confidence=risk_result.confidence, estimated_impact=impact, alternative_action=alternative, risks=risk_result.risks, explainability=risk_result.explainability)
    if persist:
        try:
            async with connection() as db:
                await db.execute('INSERT INTO "Recommendation" ("id","stateCode","cropSlug","action","reason","confidence","estimatedImpact","alternativeAction","inputs","rulesUsed","sources","limitations","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,NOW())', rec_id, context.state_code, context.crop_slug, action, reason, result.confidence, json.dumps(impact), alternative, json.dumps(risk_result.explainability.inputs), json.dumps(risk_result.explainability.rules_used), json.dumps(risk_result.explainability.sources), json.dumps(risk_result.explainability.limitations))
        except Exception:
            result.recommendation_id = None
    return result


async def simulate(request: ScenarioRequest) -> ScenarioResponse:
    c, ch = request.context, request.changes
    yield_base = c.yield_per_acre or 0
    price_base = c.crop_price or 0
    revenue_base = yield_base * c.acres * price_base
    cost_base = c.acres * (c.fuel_cost_per_acre + c.fertilizer_cost_per_acre)
    yield_delta = ch.rainfall_percent * .08 - max(0, ch.temperature_f) * 1.2
    yield_scenario = max(0, yield_base * (1 + yield_delta / 100))
    price_scenario = max(0, price_base * (1 + ch.crop_price_percent / 100))
    fuel = c.fuel_cost_per_acre * (1 + ch.fuel_cost_percent / 100)
    fertilizer = c.fertilizer_cost_per_acre * (1 + ch.fertilizer_cost_percent / 100)
    revenue = yield_scenario * c.acres * price_scenario
    cost = c.acres * (fuel + fertilizer)
    base_risk = max(item.score for item in score_risks(c).risks)
    scenario_risk = clamp(base_risk + max(0, -ch.rainfall_percent) * .25 + max(0, ch.temperature_f) * 3)
    baseline = {"yield": round(yield_base, 2), "revenueUsd": round(revenue_base, 2), "costUsd": round(cost_base, 2), "profitUsd": round(revenue_base - cost_base, 2), "risk": base_risk}
    scenario = {"yield": round(yield_scenario, 2), "revenueUsd": round(revenue, 2), "costUsd": round(cost, 2), "profitUsd": round(revenue - cost, 2), "risk": scenario_risk}
    explainability = Explainability(inputs=ch.model_dump(by_alias=True), rules_used=["Each 1% rainfall change adjusts yield by 0.08%; each +1°F adjusts yield by -1.2%.", "Revenue = yield × acres × price. Cost = acres × adjusted fuel and fertilizer costs."], sources=sources(c), limitations=["This is a sensitivity model, not a yield forecast.", "It excludes labor, land, seed, insurance, basis, tax and financing costs."])
    result = ScenarioResponse(baseline=baseline, scenario=scenario, changes=ch, assumptions=explainability.rules_used, confidence=65 if c.crop_price and yield_base else 45, explainability=explainability)
    try:
        async with connection() as db:
            await db.execute('INSERT INTO "ScenarioRun" ("id","stateCode","cropSlug","baseline","changes","results","assumptions","createdAt") VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,NOW())', str(uuid4()), c.state_code, c.crop_slug, json.dumps(baseline), json.dumps(ch.model_dump(by_alias=True)), json.dumps(scenario), json.dumps(explainability.rules_used))
    except Exception:
        pass
    return result


async def copilot(request: CopilotRequest) -> CopilotResponse:
    rec = await recommendation(request.context)
    retrieved = await search(request.question, request.context.crop_slug, request.context.state_code, 5)
    question = request.question.lower()
    explanation = rec.reason
    if "sell" in question:
        if request.context.crop_price is None:
            action, explanation = "Wait for a verified market price before making a sale decision", "No current stored price is available for the selected crop, so a sell/hold conclusion would be unsupported."
        else:
            action = "Use staged selling rather than an all-at-once sale"
            explanation = f"The stored price is {request.context.crop_price:.2f} {request.context.price_unit or ''}; the prototype has no futures, basis, storage-cost, or contract data to justify a definitive sell-or-wait call."
    else:
        action = rec.action
    baseline_action = action
    generated_by, model = "deterministic", "decision-engine-v1"
    retrieved_sources = [{"name": item.title, "url": item.source_url, "chunkId": item.chunk_id} for item in retrieved.results]
    cited_ids: list[str] = []
    try:
        allowed_ids = {item.chunk_id for item in retrieved.results}
        model_result, generated_by, model = await generate(
            "You are AgriPulse Production Copilot. Use the deterministic recommendation and structured database facts as authoritative. Use retrieved text only for supporting guidance. Never invent measurements, regulations, benefits, citations, or field conditions. Return strict JSON with keys recommendedAction, explanation, expectedBenefitOrRisk, alternativeAction, citedChunkIds. Keep the action operational and concise.",
            {"question": request.question, "structuredContext": request.context.model_dump(by_alias=True), "deterministicRecommendation": rec.model_dump(by_alias=True), "retrievedKnowledge": [item.model_dump(by_alias=True) for item in retrieved.results]},
        )
        cited_ids = [item for item in model_result.get("citedChunkIds", []) if item in allowed_ids]
        if not cited_ids:
            cited_ids = [item.chunk_id for item in retrieved.results[:2]]
        action = str(model_result.get("recommendedAction") or action)
        explanation = str(model_result.get("explanation") or explanation)
        expected = str(model_result.get("expectedBenefitOrRisk") or json.dumps(rec.estimated_impact))
        alternative = str(model_result.get("alternativeAction") or rec.alternative_action)
        retrieved_sources = [{"name": item.title, "url": item.source_url, "chunkId": item.chunk_id} for item in retrieved.results if item.chunk_id in cited_ids]
    except Exception:
        expected, alternative = json.dumps(rec.estimated_impact), rec.alternative_action
    answer = {"recommendedAction": action, "explanation": explanation, "expectedBenefitOrRisk": expected, "alternativeAction": alternative}
    evaluation = evaluate_copilot_answer(request.question, answer, request.context, rec, [item.model_dump(by_alias=True) for item in retrieved.results], cited_ids, generated_by, baseline_action)
    return CopilotResponse(recommended_action=action, explanation=explanation, confidence=rec.confidence, expected_benefit_or_risk=expected, alternative_action=alternative, data_sources=rec.explainability.sources + retrieved_sources, limitations=rec.explainability.limitations, recommendation_id=rec.recommendation_id, generated_by=generated_by, model=model, retrieved_chunks=len(retrieved.results), evaluation=evaluation)
