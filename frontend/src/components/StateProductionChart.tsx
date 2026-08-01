import { BarChart3, Database, TrendingUp } from "lucide-react";
import type { StateDetail } from "@/types";
import { formatCompactNumber, formatCurrency } from "@/utils/formatters";

interface StateProductionChartProps {
  state: StateDetail | null;
  isLoading: boolean;
  error: string | null;
}

function formatProductionValue(value: number): string {
  const divisor = value >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
  const suffix = value >= 1_000_000_000 ? "B" : "M";
  return `$${(value / divisor).toFixed(value >= divisor * 10 ? 1 : 2)}${suffix} USD`;
}

export function StateProductionChart({ state, isLoading, error }: StateProductionChartProps) {
  if (isLoading && !state) return <div className="panel-state"><span className="mini-spinner" /> Loading state production…</div>;
  if (error && !state) return <div className="panel-state error">{error}</div>;
  if (!state) return <div className="panel-state">Select a state to inspect crop production.</div>;
  const production = [...new Map(
    state.production.map((item) => [item.commodityName.toLowerCase().replace(/[^a-z0-9]/g, ""), item])
  ).values()];
  const maximumValue = Math.max(...production.map((item) => item.totalValueUsd ?? 0), 1);
  return (
    <article className="production-panel dashboard-panel">
      <header className="section-heading">
        <div>
          <p className="section-kicker">State agricultural mix</p>
          <h2>{state.stateName} production</h2>
          <span className="state-production-caption">Prominent crops, livestock, and raw agricultural products.</span>
        </div>
        <span className="section-icon"><BarChart3 size={20} /></span>
      </header>

      <div className="state-summary-row">
        <div><TrendingUp size={15} /><span>Leading item</span><strong>{state.topCommodity.commodityName}</strong></div>
        <div><Database size={15} /><span>Total production value</span><strong>${formatCompactNumber(state.totalProductionValueUsd)}</strong></div>
      </div>

      <div className="production-bars" role="img" aria-label={`Agricultural production in ${state.stateName}`}>
        {production.map((item) => (
          <div className="production-bar-row" key={`${item.commoditySlug}-${item.unit}`}>
            <div className="bar-label">
              <span className="crop-dot" style={{ background: item.color }} />
              <strong>{item.commodityName}</strong>
              <small>{item.year} · {item.unit}</small>
            </div>
            <div className="bar-track" title={`${item.value.toLocaleString()} ${item.unit}`}>
              <span style={{ width: `${item.totalValueUsd === null ? 3 : Math.max(3, item.totalValueUsd / maximumValue * 100)}%`, background: item.color }} />
            </div>
            <div className="bar-value">
              <strong>{formatCompactNumber(item.value)} {item.unit}</strong>
              <small>{item.unitPriceUsd === null ? "Unit price unavailable" : `${formatCurrency(item.unitPriceUsd)} / ${item.unit.toLowerCase()}`}</small>
              <small>{item.totalValueUsd === null ? "State value unavailable" : formatProductionValue(item.totalValueUsd)}</small>
            </div>
          </div>
        ))}
      </div>

      <footer className="panel-footnote">
        <span>Latest available observation per commodity</span>
        <span>{state.source}</span>
      </footer>
    </article>
  );
}
