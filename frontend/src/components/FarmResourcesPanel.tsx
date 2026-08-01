import { useEffect, useState } from "react";
import { ExternalLink, FlaskConical, MapPin, Phone, Search, Store } from "lucide-react";
import { resourceApi } from "@/services/resourceApi";
import type { FertilizerGuideResponse, LocalFoodDirectoryResponse } from "@/types";

type ResourceTab = "directory" | "fertilizer";

export function FarmResourcesPanel({ selectedStateCode }: { selectedStateCode: string }) {
  const [tab, setTab] = useState<ResourceTab>("directory");
  const [state, setState] = useState(selectedStateCode);
  const [county, setCounty] = useState("");
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("Corn");
  const [directory, setDirectory] = useState<LocalFoodDirectoryResponse | null>(null);
  const [fertilizers, setFertilizers] = useState<FertilizerGuideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setState(selectedStateCode); }, [selectedStateCode]);

  async function loadDirectory(event?: React.FormEvent) {
    event?.preventDefault(); setLoading(true); setError(null);
    try { setDirectory(await resourceApi.searchDirectory(state, county, query)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Directory request failed."); }
    finally { setLoading(false); }
  }

  async function loadFertilizers(nextCrop = crop) {
    setLoading(true); setError(null);
    try { setFertilizers(await resourceApi.getFertilizers(nextCrop)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fertilizer guide request failed."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadDirectory(); }, []);

  function selectTab(next: ResourceTab) {
    setTab(next); setError(null);
    if (next === "fertilizer" && !fertilizers) void loadFertilizers();
  }

  return (
    <section className="farm-resources-panel dashboard-panel">
      <header>
        <div>
          <p className="section-kicker">Operational resources</p>
          <h2>{tab === "directory" ? "Local farm & market directory" : "Crop fertilizer timing and price guide"}</h2>
          <span>{tab === "directory" ? "Search public USDA-derived business listings by state, county/city, or product." : "General nutrient timing with a dated USDA regional price benchmark."}</span>
        </div>
        <div className="resource-tabs" role="tablist">
          <button className={tab === "directory" ? "active" : ""} onClick={() => selectTab("directory")}><Store size={15} /> Directory</button>
          <button className={tab === "fertilizer" ? "active" : ""} onClick={() => selectTab("fertilizer")}><FlaskConical size={15} /> Fertilizer guide</button>
        </div>
      </header>

      {tab === "directory" ? <>
        <form className="resource-search" onSubmit={loadDirectory}>
          <label>State<input value={state} onChange={(event) => setState(event.target.value)} placeholder="IA or Iowa" /></label>
          <label>County or city<input value={county} onChange={(event) => setCounty(event.target.value)} placeholder="Polk" /></label>
          <label>Market, farm or product<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Corn, vegetables…" /></label>
          <button disabled={loading}><Search size={16} /> Search</button>
        </form>
        {error && <div className="resource-message error">{error}</div>}
        {loading && <div className="resource-message">Searching public listings…</div>}
        {!loading && directory && <>
          <div className="directory-summary">Showing {directory.listings.length} of {directory.total.toLocaleString()} matching public listings</div>
          <div className="directory-grid">
            {directory.listings.map((listing) => <article className="directory-card" key={listing.id}>
              <h3>{listing.name}</h3>
              <p><MapPin size={13} /> {[listing.street, listing.city, listing.county && `${listing.county} County`, listing.stateCode, listing.zip].filter(Boolean).join(", ")}</p>
              <div className="product-tags">{listing.products.length ? listing.products.map((product) => <span key={product}>{product}</span>) : <em>Products not reported</em>}</div>
              <dl><div><dt>Production size</dt><dd>Not publicly reported</dd></div><div><dt>Season</dt><dd>{listing.season ?? "Not reported"}</dd></div></dl>
              <footer>
                {listing.phone && <a href={`tel:${listing.phone}`}><Phone size={13} /> {listing.phone}</a>}
                {listing.website && <a href={listing.website} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Website</a>}
              </footer>
            </article>)}
          </div>
          {!directory.listings.length && <div className="resource-message">No public listing has data matching all three filters.</div>}
          <p className="resource-notice">{directory.notice} <a href={directory.sourceUrl} target="_blank" rel="noreferrer">Source and methodology</a>.</p>
        </>}
      </> : <>
        <form className="resource-search fertilizer-search" onSubmit={(event) => { event.preventDefault(); void loadFertilizers(); }}>
          <label>Crop<input value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="Corn" /></label>
          <button disabled={loading}><Search size={16} /> Find guidance</button>
        </form>
        {error && <div className="resource-message error">{error}</div>}
        {loading && <div className="resource-message">Loading fertilizer guidance…</div>}
        {!loading && fertilizers && <>
          <div className="fertilizer-layout">
            <div className="fertilizer-timing">
              {fertilizers.crops.map((guide) => <article key={guide.crop}>
                <h3>{guide.crop}</h3>
                {guide.stages.map((stage) => <div className="fertilizer-stage" key={`${guide.crop}-${stage.timing}`}>
                  <strong>{stage.timing}</strong><span>{stage.nutrientFocus}</span>
                  <p>{stage.guidance}</p>
                  <div className="product-tags">{stage.suitableProducts.map((product) => <span key={product}>{product}</span>)}</div>
                </div>)}
              </article>)}
              {!fertilizers.crops.length && <div className="resource-message">No curated guidance is available for that crop.</div>}
            </div>
            <aside className="fertilizer-prices">
              <h3>Product price benchmark</h3><p>{fertilizers.priceRegion} · {fertilizers.priceDate}</p>
              {fertilizers.prices.map((price) => <div key={price.product}><span><strong>{price.product}</strong><small>{price.analysis}</small></span><b>${price.priceUsdPerTon.toLocaleString()}/ton</b><small>${price.priceRangeUsdPerTon[0].toLocaleString()}–${price.priceRangeUsdPerTon[1].toLocaleString()}</small></div>)}
            </aside>
          </div>
          <p className="resource-notice">{fertilizers.disclaimer} <a href={fertilizers.sourceUrl} target="_blank" rel="noreferrer">USDA price report</a>.</p>
        </>}
      </>}
    </section>
  );
}
