import { useMemo, useState } from "react";
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import type { CropPriceGrowth } from "@/types";

interface PriceGrowthPanelProps {
  growth: CropPriceGrowth[] | null;
  isLoading: boolean;
  error: string | null;
}

function HistoryGraph({ item }: { item: CropPriceGrowth }) {
  const width = 1000;
  const height = 300;
  const padding = { left: 64, right: 24, top: 22, bottom: 42 };
  const values = item.observations.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const x = (index: number) => padding.left + (index / Math.max(1, values.length - 1)) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + (1 - (value - minimum) / range) * (height - padding.top - padding.bottom);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const labelIndexes = [...new Set([0, Math.floor((values.length - 1) / 2), values.length - 1])];

  return <div className="history-chart-wrap">
    <svg className="history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${item.commodityName} price history`}>
      {[0, .25, .5, .75, 1].map((step) => {
        const value = maximum - range * step;
        const lineY = padding.top + step * (height - padding.top - padding.bottom);
        return <g key={step}><line x1={padding.left} x2={width - padding.right} y1={lineY} y2={lineY} /><text x={padding.left - 10} y={lineY + 4} textAnchor="end">${value.toFixed(2)}</text></g>;
      })}
      <polyline points={points} fill="none" stroke={item.color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      {item.observations.map((point, index) => <circle key={point.date} cx={x(index)} cy={y(point.value)} r="4" fill={item.color}><title>{new Date(point.date).getUTCFullYear()}: ${point.value.toFixed(2)}</title></circle>)}
      {labelIndexes.map((index) => <text className="history-year" key={index} x={x(index)} y={height - 13} textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"}>{new Date(item.observations[index]!.date).getUTCFullYear()}</text>)}
    </svg>
  </div>;
}

export function PriceGrowthPanel({ growth, isLoading, error }: PriceGrowthPanelProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => {
    if (!growth?.length) return null;
    const normalized = query.trim().toLowerCase();
    return growth.find((item) => item.commodityName.toLowerCase() === normalized)
      ?? growth.find((item) => item.commodityName.toLowerCase().includes(normalized))
      ?? null;
  }, [growth, query]);
  const positive = (selected?.growthPercent ?? 0) >= 0;

  return <article className="price-growth-panel panel">
    <header>
      <div><p className="section-kicker">USDA national prices</p><h2>20-year crop price history</h2></div>
      <div className="history-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} list="crop-history-options" placeholder="Search crop, e.g. corn" aria-label="Search crop price history" /><datalist id="crop-history-options">{growth?.map((item) => <option key={item.commoditySlug} value={item.commodityName} />)}</datalist></div>
    </header>
    {isLoading && !growth ? <div className="panel-state"><span className="mini-spinner" /> Loading 20-year price history…</div>
      : error && !growth ? <div className="panel-state error">{error}</div>
      : selected ? <>
        <div className="history-summary"><div><span style={{ background: selected.color }} /><strong>{selected.commodityName}</strong><small>{selected.unit} · {selected.source}</small></div><div className={positive ? "growth-positive" : "growth-negative"}>{positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}<strong>{positive ? "+" : ""}{selected.growthPercent.toFixed(1)}%</strong><small>{new Date(selected.firstDate).getUTCFullYear()}–{new Date(selected.latestDate).getUTCFullYear()}</small></div></div>
        <HistoryGraph item={selected} />
      </>
      : growth?.length ? <p className="growth-empty">No crop matches “{query}”. Choose a crop from the search suggestions.</p>
      : <p className="growth-empty">Twenty-year history requires at least two real USDA observations. Run USDA synchronization to backfill historical prices.</p>}
    <footer>The graph shows stored USDA observations from the last 20 years; missing years are not estimated or interpolated.</footer>
  </article>;
}
