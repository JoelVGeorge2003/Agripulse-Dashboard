import { MapPinned } from "lucide-react";
import type { CountyProductionDetail, StateCommodityProduction } from "@/types";
import { formatCompactNumber } from "@/utils/formatters";

interface Props {
  detail: CountyProductionDetail | null;
  isLoading: boolean;
  error: string | null;
  selectedCommoditySlug: string | null;
  commodities: StateCommodityProduction[];
  onSelectCommodity: (commoditySlug: string) => void;
}

export function CountyProductionChart({ detail, isLoading, error, selectedCommoditySlug, commodities, onSelectCommodity }: Props) {
  const expandedCountyCrops = [
    ...commodities.map((item) => ({ slug: item.commoditySlug, name: item.commodityName })),
    { slug: "oats", name: "Oats" }, { slug: "rye", name: "Rye" }, { slug: "canola", name: "Canola" },
    { slug: "sunflower", name: "Sunflower" }, { slug: "dry-beans", name: "Dry Edible Beans" },
    { slug: "potatoes", name: "Potatoes" }, { slug: "sugarbeets", name: "Sugar Beets" },
    { slug: "hay", name: "Hay" }, { slug: "proso-millet", name: "Proso Millet" }, { slug: "flaxseed", name: "Flaxseed" }
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index);
  const cropSelector = <label className="county-crop-selector">
    <span>County crop</span>
    <select value={selectedCommoditySlug ?? ""} onChange={(event) => onSelectCommodity(event.target.value)} disabled={isLoading}>
      {expandedCountyCrops.map((commodity) => <option value={commodity.slug} key={commodity.slug}>{commodity.name}</option>)}
    </select>
  </label>;
  if (isLoading) return <div className="production-panel dashboard-panel county-production-panel"><div className="county-panel-toolbar">{cropSelector}</div><div className="panel-state"><span className="mini-spinner" /> Loading USDA county production…</div></div>;
  if (error) return <div className="production-panel dashboard-panel county-production-panel"><div className="county-panel-toolbar">{cropSelector}</div><div className="panel-state error">{error}<small>Try another crop with reported county observations.</small></div></div>;
  if (!detail) return null;
  const maximum = detail.counties[0]?.value ?? 1;
  return <article className="production-panel dashboard-panel county-production-panel">
    <header className="section-heading"><div><p className="section-kicker">County production</p><h2>{detail.stateName} · {detail.commodityName}</h2><span className="state-production-caption">{detail.year} USDA NASS county observations</span></div><span className="section-icon"><MapPinned size={20} /></span></header>
    <div className="county-panel-toolbar">{cropSelector}</div>
    <div className="county-list">{detail.counties.map((county) => <div className="county-row" key={county.countyFips}>
      <strong>#{county.rank}</strong><div><span>{county.countyName}</span><div className="bar-track"><i style={{ width: `${Math.max(3, county.value / maximum * 100)}%`, background: detail.color }} /></div></div>
      <small>{formatCompactNumber(county.value)} {county.unit}<em>{county.sharePercent.toFixed(1)}%</em></small>
    </div>)}</div>
    <footer className="panel-footnote"><span>{detail.counties.length} reporting counties</span><span>{detail.source}</span></footer>
  </article>;
}
