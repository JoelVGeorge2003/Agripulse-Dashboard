import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Scale } from "lucide-react";
import type { CropTradeFlow } from "@/types";

interface CropTradePanelProps {
  trade: CropTradeFlow[] | null;
  isLoading: boolean;
  error: string | null;
}

function money(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function quantity(value: number | null, digits = 1): string {
  if (value === null) return "N/A";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(digits)}K`;
  return value.toFixed(digits);
}

export function CropTradePanel({ trade, isLoading, error }: CropTradePanelProps) {
  return (
    <section className="crop-trade-panel dashboard-panel">
      <header>
        <div><p className="section-kicker">United States · world trade</p><h2>Crop exports and imports</h2><span>Annual merchandise value by Harmonized System crop category.</span></div>
        <Scale size={21} />
      </header>
      {isLoading && !trade ? <div className="panel-state"><span className="mini-spinner" /> Loading international trade…</div>
        : error && !trade ? <div className="panel-state error">{error}</div>
        : trade?.length ? <div className="trade-table-wrap"><table className="trade-table">
          <thead><tr><th>Crop</th><th>Yield</th><th>Acres planted</th><th>Acres harvested</th><th>Revenue</th><th><ArrowUpFromLine size={13} /> Export value</th><th><ArrowDownToLine size={13} /> Import value</th><th>Export share</th><th>Average price</th><th>Period/source</th></tr></thead>
          <tbody>{trade.map((item) => <tr key={item.commoditySlug}>
            <td><span className="trade-crop-dot" style={{ background: item.color }} /><strong>{item.commodityName}</strong><small>HS {item.hsCode}</small></td>
            <td>{quantity(item.yieldValue)}<small>{item.yieldUnit ?? ""}</small></td>
            <td>{quantity(item.acresPlanted)}</td>
            <td>{quantity(item.acresHarvested)}</td>
            <td>{item.revenueUsd === null ? "N/A" : money(item.revenueUsd)}</td>
            <td>{money(item.exportValueUsd)}</td>
            <td>{money(item.importValueUsd)}</td>
            <td>{item.exportTradeSharePercent.toFixed(1)}%<small>of total trade</small></td>
            <td>{item.averagePriceUsd === null ? "N/A" : `$${item.averagePriceUsd.toFixed(2)}`}<small>{item.averagePriceUnit ?? ""}</small></td>
            <td><span>Trade {item.year}</span><small>Production {item.productionYear ?? "N/A"}</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source} <ExternalLink size={11} /></a></td>
          </tr>)}</tbody>
        </table></div>
        : <p className="trade-empty">No official trade records are currently available.</p>}
      <footer>USDA NASS supplies production, acreage, yield, revenue, and average-price inputs. USDA FAS GATS supplies U.S. import and export values. Export share means exports ÷ (exports + imports), not global market share.</footer>
    </section>
  );
}
