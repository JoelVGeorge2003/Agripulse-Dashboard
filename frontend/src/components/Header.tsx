import { Database, Leaf, Wifi } from "lucide-react";
import { useClock } from "@/hooks/useClock";

export function Header() {
  const now = useClock();

  return (
    <header className="app-header">
      <div className="header-brand-mobile">
        <span className="brand-icon"><Leaf size={18} /></span>
        <strong>AgriPulse</strong>
      </div>
      <div>
        <p className="eyebrow">Agricultural intelligence</p>
        <h1 className="header-title">Commodity operations dashboard</h1>
      </div>
      <div className="header-status">
        <div className="status-pill" title="The interface refreshes from the API automatically">
          <Wifi size={14} /> Auto refresh on
        </div>
        <div className="status-pill status-pill-muted">
          <Database size={14} /> Latest available data
        </div>
        <time dateTime={now.toISOString()} className="header-clock">
          <span>{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          <strong>{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</strong>
        </time>
      </div>
    </header>
  );
}
