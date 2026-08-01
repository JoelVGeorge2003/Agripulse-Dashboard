import { AlertTriangle, CloudRain, Droplets, ExternalLink, Gauge, History, ThermometerSun, Wind } from "lucide-react";
import type { StateWeatherResponse } from "@/types";

interface WeatherImpactPanelProps {
  weather: StateWeatherResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function weekday(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

function impactClass(level: StateWeatherResponse["impact"]["level"]): string {
  return level === "HIGH_RISK" ? "risk-high" : level === "WATCH" ? "risk-watch" : "risk-good";
}

function incidentDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "Date unavailable";
}

export function WeatherImpactPanel({ weather, isLoading, error, onRetry }: WeatherImpactPanelProps) {
  return (
    <article className="weather-panel dashboard-panel">
      <header className="section-heading">
        <div>
          <p className="section-kicker">Weather and crop impact</p>
          <h2>{weather ? `${weather.stateName} forecast` : "State weather"}</h2>
        </div>
        <span className="section-icon"><CloudRain size={20} /></span>
      </header>

      {isLoading && !weather ? (
        <div className="panel-state"><span className="mini-spinner" /> Fetching forecast and crop impact…</div>
      ) : error && !weather ? (
        <div className="panel-state error">{error}<button type="button" onClick={onRetry}>Retry</button></div>
      ) : weather ? (
        <>
          <div className="weather-current-grid">
            <div><ThermometerSun size={17} /><span>Temperature</span><strong>{weather.current.temperatureF.toFixed(0)}°F</strong></div>
            <div><Droplets size={17} /><span>Humidity</span><strong>{weather.current.relativeHumidityPercent.toFixed(0)}%</strong></div>
            <div><Wind size={17} /><span>Wind</span><strong>{weather.current.windSpeedMph.toFixed(0)} mph</strong></div>
            <div><CloudRain size={17} /><span>Rain now</span><strong>{weather.current.precipitationInches.toFixed(2)} in</strong></div>
          </div>

          <div className={`weather-impact-card ${impactClass(weather.impact.level)}`}>
            <div className="risk-score"><Gauge size={18} /><strong>{weather.impact.score}</strong><span>/100</span></div>
            <div>
              <p>{weather.impact.level.replace("_", " ")}</p>
              <h3>{weather.impact.headline}</h3>
              <span>{weather.impact.summary}</span>
            </div>
          </div>

          <div className="forecast-row">
            {weather.daily.map((day) => (
              <div className="forecast-day" key={day.date}>
                <strong>{weekday(day.date)}</strong>
                <span>{day.temperatureMaxF.toFixed(0)}° / {day.temperatureMinF.toFixed(0)}°</span>
                <small>{day.precipitationProbabilityPercent.toFixed(0)}% rain</small>
              </div>
            ))}
          </div>

          <div className="weather-guidance">
            <div><strong>Why this signal</strong>{weather.impact.drivers.slice(0, 2).map((driver) => <p key={driver}>{driver}</p>)}</div>
            <div><strong>Suggested action</strong><p>{weather.impact.actions[0]}</p></div>
          </div>
          <div className="climate-incidents">
            <section className={`climate-incident future ${weather.potentialIncident.status.toLowerCase()}`}>
              <div className="incident-heading"><AlertTriangle size={16} /><span>Potential future major incident</span></div>
              <h3>{weather.potentialIncident.title}</h3>
              <p>{weather.potentialIncident.summary}</p>
              <div className="incident-meta">
                <span>{weather.potentialIncident.severity} · {incidentDate(weather.potentialIncident.startDate)}</span>
                {weather.potentialIncident.sourceUrl
                  ? <a href={weather.potentialIncident.sourceUrl} target="_blank" rel="noreferrer">{weather.potentialIncident.source}<ExternalLink size={11} /></a>
                  : <span>{weather.potentialIncident.source}</span>}
              </div>
            </section>
            <section className="climate-incident historical">
              <div className="incident-heading"><History size={16} /><span>Previous major climate incident</span></div>
              {weather.previousIncident ? (
                <>
                  <h3>{weather.previousIncident.title}</h3>
                  <p>{weather.previousIncident.summary}</p>
                  <div className="incident-meta">
                    <span>{incidentDate(weather.previousIncident.startDate)}</span>
                    {weather.previousIncident.sourceUrl
                      ? <a href={weather.previousIncident.sourceUrl} target="_blank" rel="noreferrer">FEMA record<ExternalLink size={11} /></a>
                      : <span>{weather.previousIncident.source}</span>}
                  </div>
                </>
              ) : <p>No climate-related FEMA major-disaster record could be retrieved for this state.</p>}
            </section>
          </div>
          <footer className="panel-footnote"><span>{weather.source}</span><span>Updated {new Date(weather.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></footer>
        </>
      ) : null}
    </article>
  );
}
