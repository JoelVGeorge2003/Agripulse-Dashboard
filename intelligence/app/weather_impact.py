from .models import WeatherAnalysisRequest, WeatherImpact


CROP_HEAT_THRESHOLDS = {
    "corn": 95.0,
    "soybeans": 95.0,
    "wheat": 88.0,
    "sorghum": 100.0,
    "barley": 86.0,
}


def analyse_weather(request: WeatherAnalysisRequest) -> WeatherImpact:
    crop_key = request.crop_name.lower()
    heat_threshold = CROP_HEAT_THRESHOLDS.get(crop_key, 94.0)
    water_balance = request.weekly_precipitation_inches - request.weekly_evapotranspiration_inches
    score = 15
    drivers: list[str] = []
    actions: list[str] = []

    if request.maximum_temperature_f >= heat_threshold + 5:
        score += 40
        drivers.append(
            f"The seven-day maximum reaches {request.maximum_temperature_f:.0f}°F, above the dashboard heat threshold for {request.crop_name}."
        )
        actions.append("Check irrigation capacity and scout during the hottest forecast period.")
    elif request.maximum_temperature_f >= heat_threshold:
        score += 24
        drivers.append(f"The seven-day maximum reaches the {request.crop_name} heat-watch range.")
    else:
        drivers.append("Forecast heat remains below the crop-specific dashboard threshold.")

    if water_balance < -1.0:
        score += 34
        drivers.append(f"Forecast precipitation is {abs(water_balance):.2f} in below reference evapotranspiration.")
        actions.append("Compare field soil moisture with irrigation plans and prioritise the driest fields.")
    elif water_balance > 2.5:
        score += 28
        drivers.append(f"Forecast precipitation is {water_balance:.2f} in above reference evapotranspiration.")
        actions.append("Monitor drainage, ponding, foliar disease pressure, and field-access delays.")
    else:
        drivers.append("The seven-day forecast water balance is within the dashboard's normal watch band.")

    if request.average_soil_moisture is not None:
        if request.average_soil_moisture < 0.12:
            score += 18
            drivers.append("Modelled near-surface soil moisture is low.")
        elif request.average_soil_moisture > 0.40:
            score += 12
            drivers.append("Modelled near-surface soil moisture is high.")

    score = min(100, round(score))
    level = "HIGH_RISK" if score >= 70 else "WATCH" if score >= 40 else "FAVOURABLE"
    if not actions:
        actions.append("Continue routine scouting and compare this state-level signal with field observations.")

    headline = {
        "HIGH_RISK": f"Elevated weather risk for {request.crop_name}",
        "WATCH": f"Watch conditions for {request.crop_name}",
        "FAVOURABLE": f"Generally favourable conditions for {request.crop_name}",
    }[level]

    return WeatherImpact(
        level=level,
        score=score,
        headline=headline,
        summary=(
            f"AgriPulse evaluates {request.state_name}'s representative forecast using heat exposure, "
            "precipitation, reference evapotranspiration, and available soil-moisture signals. "
            "This is advisory and not a field-level agronomic diagnosis."
        ),
        drivers=drivers,
        actions=actions,
    )
