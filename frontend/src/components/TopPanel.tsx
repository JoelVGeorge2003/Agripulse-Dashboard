import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock3, Sprout } from "lucide-react";
import type { CommoditySnapshot } from "@/types";
import { useClock } from "@/hooks/useClock";
import { formatCompactNumber, formatDate } from "@/utils/formatters";

interface TopPanelProps {
  commodities: CommoditySnapshot[];
  dataAsOf: string | null;
}

function priceUnit(unit: string): string {
  return unit.replace("USD / ", "per ");
}

export function TopPanel({ commodities, dataAsOf }: TopPanelProps) {
  const now = useClock();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);

  return (
    <header className="top-panel">
      <section className="time-panel" aria-label="Current date and time">
        <div className="brand-lockup">
          <span className="brand-mark"><Sprout size={23} /></span>
          <div>
            <p className="brand-name">AgriPulse</p>
            <p className="brand-tagline">U.S. crop intelligence</p>
          </div>
        </div>
        <div className="current-time">
          <p><CalendarDays size={15} /> {dateLabel}</p>
          <strong><Clock3 size={19} /> {timeLabel}</strong>
        </div>
        <p className="as-of-label">Market data as of {formatDate(dataAsOf)}</p>
      </section>

      <section className="commodity-strip" aria-label="Featured crop prices and production">
        {commodities.map((commodity) => {
          const positive = commodity.changePercent !== null && commodity.changePercent >= 0;
          const changeClass = commodity.changePercent === null ? "neutral" : positive ? "positive" : "negative";
          return (
            <article className="commodity-card" key={commodity.id}>
              <div className="commodity-card-heading">
                <span className="crop-dot" style={{ background: commodity.commodityColor }} />
                <div>
                  <strong>{commodity.commodityName}</strong>
                  <small>{commodity.symbol}</small>
                </div>
                <span className={`price-change ${changeClass}`}>
                  {commodity.changePercent === null ? null : positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {commodity.changePercent === null ? "—" : `${Math.abs(commodity.changePercent).toFixed(2)}%`}
                </span>
              </div>
              <div className="commodity-price-row">
                <strong>${commodity.value.toFixed(2)}</strong>
                <span>{priceUnit(commodity.unit)}</span>
              </div>
              <p className="commodity-volume">
                <span>{formatCompactNumber(commodity.productionVolume)} {commodity.productionUnit}</span>
                <small>{commodity.productionYear ?? "—"} U.S. production</small>
              </p>
            </article>
          );
        })}
      </section>
    </header>
  );
}
