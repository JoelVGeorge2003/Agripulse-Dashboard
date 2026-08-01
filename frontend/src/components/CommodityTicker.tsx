import { ArrowDownRight, ArrowUpRight, Clock3 } from "lucide-react";
import type { LatestPrice } from "@/types";
import { formatCurrency, formatDate, formatPercent } from "@/utils/formatters";

interface CommodityTickerProps {
  prices: LatestPrice[];
}

export function CommodityTicker({ prices }: CommodityTickerProps) {
  return (
    <section className="ticker-shell" aria-label="Latest commodity prices">
      <div className="ticker-heading">
        <span className="live-indicator" />
        <div>
          <strong>Latest observations</strong>
          <small>API refreshes every 60 seconds</small>
        </div>
      </div>
      <div className="ticker-track">
        {prices.map((price) => {
          const positive = (price.changePercent ?? 0) >= 0;
          const ChangeIcon = positive ? ArrowUpRight : ArrowDownRight;
          return (
            <article className="ticker-card" key={price.id}>
              <div>
                <span className="ticker-symbol">{price.symbol}</span>
                {price.isStale && <span className="stale-badge">dated</span>}
              </div>
              <strong>{formatCurrency(price.value)}</strong>
              <span className={positive ? "change-positive" : "change-negative"}>
                <ChangeIcon size={14} /> {formatPercent(price.changePercent)}
              </span>
              <small><Clock3 size={12} /> {formatDate(price.priceDate, { month: "short", year: "numeric" })}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
