import { Bot, Database, ShieldCheck } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";

export function AnalystPage() {
  return (
    <div className="page-stack analyst-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">AI data analyst</p>
          <h2>Ask questions against the stored agriculture dataset</h2>
          <p>The backend retrieves a limited context from PostgreSQL and sends it to a local Ollama model. When Ollama is unavailable, a deterministic database summary is returned.</p>
        </div>
        <span className="heading-icon"><Bot size={22} /></span>
      </section>

      <section className="analyst-grid">
        <ChatPanel />
        <aside className="analyst-guidance panel">
          <h3>What the analyst can answer</h3>
          <div><Database size={18} /><p><strong>Price observations</strong><span>Latest stored values, changes, units, and dates.</span></p></div>
          <div><Bot size={18} /><p><strong>Production rankings</strong><span>Top states, production totals, shares, and stored year.</span></p></div>
          <div><ShieldCheck size={18} /><p><strong>Bounded context</strong><span>The model does not receive database credentials or direct SQL access.</span></p></div>
          <p className="analyst-caveat">The application does not infer farm-specific records, forecasts, or real-time futures quotes unless those sources are explicitly added.</p>
        </aside>
      </section>
    </div>
  );
}
