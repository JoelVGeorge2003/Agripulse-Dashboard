import type { CSSProperties } from "react";
import { ArrowLeft, CalendarDays, MapPinned, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ChatPanel } from "@/components/ChatPanel";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PriceSparkline } from "@/components/PriceSparkline";
import { ProductionMap } from "@/components/ProductionMap";
import { useApi } from "@/hooks/useApi";
import { commodityApi } from "@/services/commodityApi";
import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from "@/utils/formatters";

export function CommodityDetailPage() {
  const { slug = "" } = useParams();
  const detail = useApi(() => commodityApi.get(slug), [slug]);

  if (detail.isLoading) return <LoadingSpinner label="Loading commodity details" />;
  if (detail.error) return <ErrorMessage message={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return <EmptyState title="Commodity not found" />;

  const { commodity, latestPrice, priceHistory, production } = detail.data;

  return (
    <div className="page-stack">
      <Link to="/commodities" className="back-link"><ArrowLeft size={15} /> All commodities</Link>
      <section className="detail-hero" style={{ "--commodity-color": commodity.color } as CSSProperties}>
        <div>
          <span className="category-badge">{commodity.category.toLowerCase()}</span>
          <h2>{commodity.name}</h2>
          <p>{commodity.description ?? "Commodity price and production intelligence."}</p>
        </div>
        <div className="detail-price">
          <small>Latest stored price</small>
          <strong>{latestPrice ? formatCurrency(latestPrice.value) : "—"}</strong>
          <span className={(latestPrice?.changePercent ?? 0) >= 0 ? "change-positive" : "change-negative"}>
            {formatPercent(latestPrice?.changePercent ?? null)}
          </span>
          <small>{latestPrice ? `${latestPrice.unit} · ${formatDate(latestPrice.priceDate)}` : "No price observation"}</small>
        </div>
      </section>

      <section className="metric-grid metric-grid-three">
        <article className="metric-card"><span className="metric-icon"><CalendarDays size={18} /></span><div><p>Price observations</p><strong>{priceHistory.length}</strong><small>Stored history points</small></div></article>
        <article className="metric-card"><span className="metric-icon"><MapPinned size={18} /></span><div><p>Production states</p><strong>{production.length}</strong><small>Latest stored year</small></div></article>
        <article className="metric-card"><span className="metric-icon"><TrendingUp size={18} /></span><div><p>Leading state</p><strong>{production[0]?.stateName ?? "—"}</strong><small>{production[0] ? `${formatCompactNumber(production[0].value)} ${production[0].unit}` : "No production data"}</small></div></article>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <header className="panel-header"><div><p className="eyebrow">Price history</p><h2>Observation trend</h2></div></header>
          <PriceSparkline points={priceHistory} />
        </article>
        <ChatPanel compact commoditySlug={commodity.slug} />
      </section>

      <article className="panel map-panel">
        <header className="panel-header"><div><p className="eyebrow">Regional output</p><h2>{commodity.name} production by state</h2></div><span>{production[0]?.year ?? "—"}</span></header>
        {production.length ? <ProductionMap data={production} color={commodity.color} /> : <EmptyState title="No state production data" />}
      </article>
    </div>
  );
}
