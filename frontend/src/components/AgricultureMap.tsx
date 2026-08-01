import { Fragment, useMemo, useState } from "react";
import { geoCentroid } from "d3-geo";
import { ArrowLeft } from "lucide-react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import statesTopo from "us-atlas/states-10m.json";
import countiesTopo from "us-atlas/counties-10m.json";
import type { CountyProductionDetail, StateSummary } from "@/types";
import { fipsToStateCode } from "@/utils/stateFips";
import { formatCompactNumber } from "@/utils/formatters";

interface AgricultureMapProps {
  states: StateSummary[];
  selectedStateCode: string;
  drillStateCode: string | null;
  countyData: CountyProductionDetail | null;
  onSelectState: (stateCode: string) => void;
  onBack: () => void;
}

interface MapFeature { rsmKey: string; id: string | number; }
interface HoveredState { x: number; y: number; state: StateSummary; }
interface HoveredCounty { x: number; y: number; name: string; value: number; unit: string; rank: number; }

export function AgricultureMap({ states, selectedStateCode, drillStateCode, countyData, onSelectState, onBack }: AgricultureMapProps) {
  const [hovered, setHovered] = useState<HoveredState | HoveredCounty | null>(null);
  const byState = useMemo(() => new Map(states.map((state) => [state.stateCode, state])), [states]);
  const stateGeography = useMemo(() => feature(
    statesTopo as never,
    (statesTopo as unknown as { objects: { states: never } }).objects.states
  ) as unknown as FeatureCollection<Geometry>, []);
  const selectedFeature = useMemo(() => {
    return stateGeography.features.find((item) => fipsToStateCode[String(item.id).padStart(2, "0")] === drillStateCode);
  }, [drillStateCode, stateGeography]);
  const stateFips = selectedFeature ? String(selectedFeature.id).padStart(2, "0") : "";
  const center = selectedFeature ? geoCentroid(selectedFeature) : [-96, 38];
  const countyByFips = useMemo(() => new Map(countyData?.counties.map((county) => [county.countyFips, county]) ?? []), [countyData]);
  const maximumCountyValue = countyData?.counties[0]?.value ?? 1;

  return <div className="agriculture-map" aria-label="Interactive map of U.S. crop production" onMouseLeave={() => setHovered(null)}>
    {drillStateCode && <button type="button" className="map-back-button" onClick={onBack}><ArrowLeft size={15} /> Back to U.S.</button>}
    <ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 980 }} width={900} height={610}>
      <ZoomableGroup center={center as [number, number]} zoom={drillStateCode ? 4.2 : 1} minZoom={1} maxZoom={8}>
        {drillStateCode ? <Geographies geography={countiesTopo}>
          {({ geographies }) => geographies.filter((raw) => String((raw as MapFeature).id).padStart(5, "0").startsWith(stateFips)).map((rawFeature) => {
            const countyFips = String((rawFeature as MapFeature).id).padStart(5, "0");
            const county = countyByFips.get(countyFips);
            const opacity = county ? .2 + county.value / maximumCountyValue * .8 : .1;
            return <Geography key={(rawFeature as MapFeature).rsmKey} geography={rawFeature}
              fill={countyData?.color ?? "#dce6dc"} fillOpacity={opacity} stroke="#ffffff" strokeWidth={.35}
              onMouseMove={(event) => {
                if (!county) return;
                const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (bounds) setHovered({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, name: county.countyName, value: county.value, unit: county.unit, rank: county.rank });
              }}
              onMouseLeave={() => setHovered(null)}
              style={{ default: { outline: "none" }, hover: { outline: "none", filter: "brightness(.9)" }, pressed: { outline: "none" } }} />;
          })}
        </Geographies> : <Geographies geography={statesTopo}>
          {({ geographies }) => geographies.map((rawFeature) => {
            const mapFeature = rawFeature as MapFeature;
            const code = fipsToStateCode[String(mapFeature.id).padStart(2, "0")];
            const state = code ? byState.get(code) : undefined;
            const selected = state?.stateCode === selectedStateCode;
            const centroid = geoCentroid(rawFeature);
            return <Fragment key={mapFeature.rsmKey}><Geography geography={rawFeature}
              fill={state?.topCommodityColor ?? "#e4ebe4"} fillOpacity={selected ? 1 : state ? .7 : 1}
              stroke={selected ? "#173f27" : "#ffffff"} strokeWidth={selected ? 2.4 : 1.15}
              onClick={() => state && onSelectState(state.stateCode)}
              onMouseMove={(event) => {
                if (!state) return;
                const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (bounds) setHovered({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, state });
              }}
              onMouseLeave={() => setHovered(null)}
              style={{ default: { outline: "none" }, hover: { outline: "none", filter: "brightness(.92)", cursor: state ? "pointer" : "default" }, pressed: { outline: "none" } }} />
              {state && <Marker coordinates={centroid}><text className="state-abbreviation" textAnchor="middle" dominantBaseline="central">{state.stateCode}</text></Marker>}
            </Fragment>;
          })}
        </Geographies>}
      </ZoomableGroup>
    </ComposableMap>
    {hovered && ("state" in hovered
      ? <div className="map-hover-card" style={{ left: Math.min(hovered.x + 12, 680), top: Math.max(hovered.y - 76, 10) }}><strong>{hovered.state.stateName}</strong><span>{hovered.state.topCommodityName}</span><small>{formatCompactNumber(hovered.state.topVolume)} {hovered.state.unit} · {hovered.state.year}</small></div>
      : <div className="map-hover-card" style={{ left: Math.min(hovered.x + 12, 680), top: Math.max(hovered.y - 76, 10) }}><strong>{hovered.name} County</strong><span>#{hovered.rank}</span><small>{formatCompactNumber(hovered.value)} {hovered.unit}</small></div>)}
    <div className="map-help">{drillStateCode ? "County production · hover for values" : "Click a state for county detail · scroll to zoom"}</div>
  </div>;
}
