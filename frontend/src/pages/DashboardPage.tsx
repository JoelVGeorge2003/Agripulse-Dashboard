import { useEffect, useState } from "react";
import { DatabaseZap, MapPinned, RefreshCw } from "lucide-react";
import { AgricultureMap } from "@/components/AgricultureMap";
import { ChatPanel } from "@/components/ChatPanel";
import { CountyProductionChart } from "@/components/CountyProductionChart";
import { CropTradePanel } from "@/components/CropTradePanel";
import { ErrorMessage } from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PriceGrowthPanel } from "@/components/PriceGrowthPanel";
import { FarmResourcesPanel } from "@/components/FarmResourcesPanel";
import { DecisionSupportPanel } from "@/components/DecisionSupportPanel";
import { StateProductionChart } from "@/components/StateProductionChart";
import { TopPanel } from "@/components/TopPanel";
import { WeatherImpactPanel } from "@/components/WeatherImpactPanel";
import { useApi } from "@/hooks/useApi";
import { usePolling } from "@/hooks/usePolling";
import { dashboardApi } from "@/services/dashboardApi";
import { stateApi } from "@/services/stateApi";
import { weatherApi } from "@/services/weatherApi";
import type { CountyProductionDetail } from "@/types";

export function DashboardPage() {
  const overview = useApi(() => dashboardApi.getOverview(), []);
  const [selectedStateCode, setSelectedStateCode] = useState("IA");
  const [drillStateCode, setDrillStateCode] = useState<string | null>(null);
  const [countyCommoditySlug, setCountyCommoditySlug] = useState<string | null>(null);
  const [countyData, setCountyData] = useState<CountyProductionDetail | null>(null);
  const [countyLoading, setCountyLoading] = useState(false);
  const [countyError, setCountyError] = useState<string | null>(null);
  const state = useApi(() => stateApi.getDetail(selectedStateCode), [selectedStateCode]);
  const weather = useApi(() => weatherApi.getByState(selectedStateCode), [selectedStateCode]);
  const priceGrowth = useApi(() => dashboardApi.getPriceGrowth(20), []);
  const cropTrade = useApi(() => dashboardApi.getCropTrade(), []);

  usePolling(overview.reload, 300_000);

  useEffect(() => {
    if (overview.data?.defaultStateCode && selectedStateCode === "IA") {
      setSelectedStateCode(overview.data.defaultStateCode);
    }
  }, [overview.data, selectedStateCode]);

  useEffect(() => {
    if (!drillStateCode) return;
    const summary = overview.data?.states.find((item) => item.stateCode === drillStateCode);
    const commoditySlug = countyCommoditySlug ?? summary?.topCommoditySlug;
    if (!summary || !commoditySlug) return;
    let active = true;
    setCountyLoading(true);
    setCountyError(null);
    setCountyData(null);
    stateApi.getCountyProduction(drillStateCode, commoditySlug)
      .then((result) => { if (active) setCountyData(result); })
      .catch((requestError: unknown) => { if (active) setCountyError(requestError instanceof Error ? requestError.message : "County data request failed."); })
      .finally(() => { if (active) setCountyLoading(false); });
    return () => { active = false; };
  }, [countyCommoditySlug, drillStateCode, overview.data]);

  function selectState(stateCode: string): void {
    const summary = overview.data?.states.find((item) => item.stateCode === stateCode);
    setSelectedStateCode(stateCode);
    setDrillStateCode(stateCode);
    setCountyCommoditySlug(summary?.topCommoditySlug ?? null);
  }

  function leaveCountyView(): void {
    setDrillStateCode(null);
    setCountyCommoditySlug(null);
    setCountyData(null);
    setCountyError(null);
  }

  if (overview.isLoading && !overview.data) return <div className="full-page-state"><LoadingSpinner label="Starting AgriPulse" /></div>;
  if (overview.error && !overview.data) return <div className="full-page-state"><ErrorMessage message={overview.error} onRetry={overview.reload} /></div>;
  if (!overview.data) return null;

  return (
    <div className="agripulse-dashboard">
      <TopPanel commodities={overview.data.featuredCommodities} dataAsOf={overview.data.dataAsOf} />

      <main className="dashboard-content">
        <section className="map-section dashboard-panel">
          <header className="map-section-header">
            <div>
              <p className="section-kicker">National production explorer</p>
              <h1>Crop concentration across the United States</h1>
              <span>Each state is colored by its leading tracked crop; hover for production details.</span>
            </div>
            <div className="map-actions">
              <span className="live-pill"><span /> USDA NASS live</span>
              <span><MapPinned size={15} /> {selectedStateCode} selected</span>
              <button type="button" onClick={() => void overview.reload()} disabled={overview.isLoading}><RefreshCw size={15} /> Refresh</button>
            </div>
          </header>
          <div className="map-and-production-grid">
            <AgricultureMap states={overview.data.states} selectedStateCode={selectedStateCode} drillStateCode={drillStateCode} countyData={countyData} onSelectState={selectState} onBack={leaveCountyView} />
            <div className="map-side-panels">
              {drillStateCode
                ? <CountyProductionChart
                    detail={countyData}
                    isLoading={countyLoading}
                    error={countyError}
                    selectedCommoditySlug={countyCommoditySlug}
                    commodities={state.data?.stateCode === drillStateCode
                      ? state.data.production.filter((item) => item.category !== "LIVESTOCK")
                      : []}
                    onSelectCommodity={setCountyCommoditySlug}
                  />
                : <StateProductionChart state={state.data} isLoading={state.isLoading} error={state.error} />}
            </div>
          </div>
        </section>

        <section className="bottom-dashboard-grid">
          <WeatherImpactPanel weather={weather.data} isLoading={weather.isLoading} error={weather.error} onRetry={() => void weather.reload()} />
          <ChatPanel stateCode={selectedStateCode} stateName={state.data?.stateName} commoditySlug={state.data?.topCommodity.commoditySlug} />
        </section>
        <DecisionSupportPanel stateCode={selectedStateCode} cropSlug={state.data?.topCommodity.commoditySlug} crops={state.data?.production.filter((item) => item.category !== "LIVESTOCK").map((item) => ({ slug: item.commoditySlug, name: item.commodityName })) ?? []} />
        <CropTradePanel trade={cropTrade.data} isLoading={cropTrade.isLoading} error={cropTrade.error} />
        <PriceGrowthPanel growth={priceGrowth.data} isLoading={priceGrowth.isLoading} error={priceGrowth.error} />
        <FarmResourcesPanel selectedStateCode={selectedStateCode} />
      </main>

      <footer className="dashboard-footer">
        <span><DatabaseZap size={14} /> Created by Joel V George based on open source datasets</span>
        <span>Usage of the website might be limited due to high traffic or API rate limits.</span>
      </footer>
    </div>
  );
}
