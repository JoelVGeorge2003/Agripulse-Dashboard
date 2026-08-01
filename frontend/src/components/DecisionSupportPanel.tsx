import { type FormEvent, useEffect, useState } from "react";
import { Bot, ChevronDown, ChevronUp, FlaskConical, Gauge, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { decisionApi } from "@/services/decisionApi";
import type { CopilotDecisionResponse, DecisionOverview, ScenarioChanges, ScenarioResult } from "@/types";

const initialChanges: ScenarioChanges = { rainfallPercent: 0, temperatureF: 0, cropPricePercent: 0, fuelCostPercent: 0, fertilizerCostPercent: 0 };

type CropOption = { slug: string; name: string };
type CyclePhase = { stage: string; label: string; timing: string };

const defaultCycle: CyclePhase[] = [
  { stage: "planting", label: "Planting & emergence", timing: "Days 0–14" },
  { stage: "vegetative", label: "Vegetative growth", timing: "Days 15–55" },
  { stage: "reproductive", label: "Flowering & reproduction", timing: "Days 56–90" },
  { stage: "maturity", label: "Maturity", timing: "Days 91–120" },
  { stage: "harvest", label: "Harvest window", timing: "Days 121+" }
];

const cropCycles: Record<string, CyclePhase[]> = {
  corn: [
    { stage: "planting", label: "Planting & emergence", timing: "Days 0–10" }, { stage: "vegetative", label: "Vegetative V1–VT", timing: "Days 11–60" },
    { stage: "reproductive", label: "Silking & grain fill", timing: "Days 61–105" }, { stage: "maturity", label: "Physiological maturity", timing: "Days 106–125" }, { stage: "harvest", label: "Harvest window", timing: "Days 126–160" }
  ],
  soybeans: [
    { stage: "planting", label: "Planting & emergence", timing: "Days 0–10" }, { stage: "vegetative", label: "Vegetative V stages", timing: "Days 11–40" },
    { stage: "reproductive", label: "Flowering & pod fill", timing: "Days 41–105" }, { stage: "maturity", label: "Seed maturity", timing: "Days 106–130" }, { stage: "harvest", label: "Harvest window", timing: "Days 131–155" }
  ],
  wheat: [
    { stage: "planting", label: "Seeding & emergence", timing: "Days 0–14" }, { stage: "vegetative", label: "Tillering & stem growth", timing: "Days 15–100" },
    { stage: "reproductive", label: "Heading & grain fill", timing: "Days 101–140" }, { stage: "maturity", label: "Ripening", timing: "Days 141–165" }, { stage: "harvest", label: "Harvest window", timing: "Days 166+" }
  ],
  cotton: [
    { stage: "planting", label: "Planting & emergence", timing: "Days 0–12" }, { stage: "vegetative", label: "Seedling & squaring", timing: "Days 13–55" },
    { stage: "reproductive", label: "Flowering & boll fill", timing: "Days 56–120" }, { stage: "maturity", label: "Boll opening", timing: "Days 121–155" }, { stage: "harvest", label: "Harvest window", timing: "Days 156–190" }
  ],
  rice: [
    { stage: "planting", label: "Planting & establishment", timing: "Days 0–20" }, { stage: "vegetative", label: "Tillering", timing: "Days 21–60" },
    { stage: "reproductive", label: "Panicle & heading", timing: "Days 61–100" }, { stage: "maturity", label: "Grain ripening", timing: "Days 101–130" }, { stage: "harvest", label: "Harvest window", timing: "Days 131–155" }
  ],
  potatoes: [
    { stage: "planting", label: "Planting & emergence", timing: "Days 0–25" }, { stage: "vegetative", label: "Canopy & tuber initiation", timing: "Days 26–55" },
    { stage: "reproductive", label: "Tuber bulking", timing: "Days 56–100" }, { stage: "maturity", label: "Vine senescence", timing: "Days 101–125" }, { stage: "harvest", label: "Harvest window", timing: "Days 126–150" }
  ]
};

export function DecisionSupportPanel({ stateCode, cropSlug, crops = [] }: { stateCode: string; cropSlug?: string; crops?: CropOption[] }) {
  const [overview, setOverview] = useState<DecisionOverview | null>(null);
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [copilot, setCopilot] = useState<CopilotDecisionResponse | null>(null);
  const [changes, setChanges] = useState(initialChanges);
  const [question, setQuestion] = useState("What action should I take next?");
  const [acres, setAcres] = useState(100);
  const [stage, setStage] = useState("unspecified");
  const [details, setDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(cropSlug);

  useEffect(() => { setSelectedCrop(cropSlug); }, [stateCode, cropSlug]);

  useEffect(() => {
    let active = true; setLoading(true); setError(null); setScenario(null); setCopilot(null); setFeedbackSent(false);
    decisionApi.overview(stateCode, selectedCrop, acres, stage).then((value) => { if (active) setOverview(value); }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Decision request failed."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [stateCode, selectedCrop]);

  async function runScenario(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try { setScenario(await decisionApi.scenario(stateCode, selectedCrop, acres, stage, changes)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Scenario failed."); } finally { setLoading(false); }
  }
  async function askCopilot(event: FormEvent) {
    event.preventDefault(); if (!question.trim()) return; setLoading(true); setError(null);
    try { setCopilot(await decisionApi.copilot(stateCode, selectedCrop, acres, stage, question)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Copilot request failed."); } finally { setLoading(false); }
  }
  function updateChange(key: keyof ScenarioChanges, value: string) { setChanges((current) => ({ ...current, [key]: Number(value) || 0 })); }
  async function feedback(helpful: boolean) {
    const id = copilot?.recommendationId ?? overview?.recommendation.recommendationId;
    if (!id) return; await decisionApi.feedback(id, helpful); setFeedbackSent(true);
  }

  const recommendation = overview?.recommendation;
  const cycle = cropCycles[selectedCrop ?? ""] ?? defaultCycle;
  return <section className="decision-panel dashboard-panel">
    <header className="section-heading"><div><p className="section-kicker">Farmer Copilot · decision intelligence</p><h2>{overview ? `${overview.stateName} ${overview.cropName} operating brief` : "Operating brief"}</h2><span>Rule-based field risks, one next action, scenario sensitivity, and explainability.</span></div><span className="section-icon"><Gauge size={20} /></span></header>
    <div className="decision-controls"><label>Crop<select value={selectedCrop ?? ""} onChange={(event) => setSelectedCrop(event.target.value || undefined)}>{crops.map((crop) => <option value={crop.slug} key={crop.slug}>{crop.name}</option>)}</select></label><label>Acres<input type="number" min="1" value={acres} onChange={(event) => setAcres(Number(event.target.value) || 1)} /></label><label>Crop stage<select value={stage} onChange={(event) => setStage(event.target.value)}><option value="unspecified">Unspecified</option><option value="planting">Planting</option><option value="vegetative">Vegetative</option><option value="reproductive">Reproductive</option><option value="maturity">Maturity</option><option value="harvest">Harvest</option></select></label><button onClick={() => decisionApi.overview(stateCode, selectedCrop, acres, stage).then(setOverview)}>Update context</button></div>
    <div className="crop-cycle"><div><strong>Typical {overview?.cropName ?? "crop"} cycle</strong><span>Approximate days after planting; local variety, planting date, and weather shift timing.</span></div><ol>{cycle.map((phase) => <li className={stage === phase.stage ? "active" : ""} key={phase.stage}><i /><strong>{phase.label}</strong><span>{phase.timing}</span></li>)}</ol></div>
    {error && <div className="resource-message error">{error}</div>}{loading && !overview && <div className="resource-message">Calculating decision context…</div>}
    {recommendation && <>
      <div className="risk-score-grid">{recommendation.risks.map((risk) => <article key={risk.key}><span>{risk.label}</span><strong>{risk.score}</strong><i><b style={{ width: `${risk.score}%` }} /></i><small>{risk.explanation}</small></article>)}</div>
      <div className="next-action-card"><div><span>Recommended next action</span><h3>{recommendation.action}</h3><p>{recommendation.reason}</p></div><div className="decision-confidence"><strong>{recommendation.confidence}%</strong><span>confidence</span></div><dl><div><dt>Expected impact</dt><dd>{Object.entries(recommendation.estimatedImpact).map(([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${String(value)}`).join(" · ")}</dd></div><div><dt>Alternative</dt><dd>{recommendation.alternativeAction}</dd></div></dl></div>
      <button className="explain-toggle" onClick={() => setDetails((value) => !value)}>{details ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {details ? "Hide" : "Show"} inputs, rules and limitations</button>
      {details && <div className="explainability-grid"><div><strong>Inputs</strong>{Object.entries(recommendation.explainability.inputs).map(([key, value]) => <p key={key}>{key}: {value === null ? "Unavailable" : String(value)}</p>)}</div><div><strong>Rules used</strong>{recommendation.explainability.rulesUsed.map((rule) => <p key={rule}>{rule}</p>)}</div><div><strong>Sources</strong>{recommendation.explainability.sources.map((source) => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></p>)}</div><div><strong>Limitations</strong>{recommendation.explainability.limitations.map((item) => <p key={item}>{item}</p>)}</div></div>}
    </>}
    <div className="decision-tools-grid">
      <form className="scenario-tool" onSubmit={runScenario}><h3><FlaskConical size={16} /> Scenario simulator</h3><div className="scenario-inputs">{([['rainfallPercent','Rainfall %'],['temperatureF','Temperature °F'],['cropPricePercent','Crop price %'],['fuelCostPercent','Fuel cost %'],['fertilizerCostPercent','Fertilizer cost %']] as Array<[keyof ScenarioChanges,string]>).map(([key,label]) => <label key={key}>{label}<input type="number" value={changes[key]} onChange={(event) => updateChange(key,event.target.value)} /></label>)}</div><button disabled={loading}>Run scenario</button>{scenario && <div className="scenario-results">{["yield","revenueUsd","costUsd","profitUsd","risk"].map((metric) => <div key={metric}><span>{metric.replace("Usd", "")}</span><small>{scenario.baseline[metric]?.toLocaleString()}</small><strong>{scenario.scenario[metric]?.toLocaleString()}</strong></div>)}<p>{scenario.assumptions.join(" ")} Confidence: {scenario.confidence}%.</p></div>}</form>
      <form className="copilot-tool" onSubmit={askCopilot}><h3><Bot size={16} /> Ask Farmer Copilot</h3><div className="copilot-composer"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Should I irrigate today?" /><button disabled={loading || !question.trim()}><Send size={15} /></button></div>{copilot && <div className="copilot-result"><span>Decision confidence {copilot.confidence}% · {copilot.model} · {copilot.retrievedChunks} RAG chunks</span><h4>{copilot.recommendedAction}</h4><p>{copilot.explanation}</p><strong>Expected benefit or risk</strong><p>{copilot.expectedBenefitOrRisk}</p><strong>Alternative</strong><p>{copilot.alternativeAction}</p><div className={`answer-evaluation ${copilot.evaluation.level}`}><div><strong>Answer confidence</strong><b>{copilot.evaluation.confidenceScore}% · {copilot.evaluation.level}</b></div><p>{copilot.evaluation.explanation}</p><dl><div><dt>Grounding</dt><dd>{copilot.evaluation.groundingScore}</dd></div><div><dt>Citations</dt><dd>{copilot.evaluation.citationCoverageScore}</dd></div><div><dt>Relevance</dt><dd>{copilot.evaluation.relevanceScore}</dd></div><div><dt>Consistency</dt><dd>{copilot.evaluation.actionConsistencyScore}</dd></div><div><dt>Data quality</dt><dd>{copilot.evaluation.dataQualityScore}</dd></div></dl>{copilot.evaluation.missingInputToImprove && <small>Best input to improve this score: {copilot.evaluation.missingInputToImprove}.</small>}</div>{copilot.dataSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${source.name}`}>{source.name}</a>)}<footer>{feedbackSent ? <span>Feedback saved</span> : <><span>Was this useful?</span><button type="button" onClick={() => void feedback(true)}><ThumbsUp size={13} /></button><button type="button" onClick={() => void feedback(false)}><ThumbsDown size={13} /></button></>}</footer></div>}</form>
    </div>
  </section>;
}
