import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import statesTopo from "us-atlas/states-10m.json";
import type { MapDatum } from "@/types";
import { formatCompactNumber } from "@/utils/formatters";
import { fipsToStateCode } from "@/utils/stateFips";

interface ProductionMapProps {
  data: MapDatum[];
  color: string;
}

interface HoveredState {
  x: number;
  y: number;
  datum: MapDatum;
}

interface MapFeature {
  rsmKey: string;
  id: string | number;
  properties?: { name?: string };
}

export function ProductionMap({ data, color }: ProductionMapProps) {
  const [hovered, setHovered] = useState<HoveredState | null>(null);
  const byState = useMemo(() => new Map(data.map((row) => [row.stateCode, row])), [data]);
  const maximum = Math.max(...data.map((row) => row.value), 1);

  return (
    <div className="map-container" onMouseLeave={() => setHovered(null)}>
      <ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 980 }} width={900} height={540}>
        <ZoomableGroup center={[-96, 38]} zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={statesTopo}>
            {({ geographies }) =>
              geographies.map((rawFeature) => {
                const feature = rawFeature as MapFeature;
                const fips = String(feature.id).padStart(2, "0");
                const stateCode = fipsToStateCode[fips];
                const datum = stateCode ? byState.get(stateCode) : undefined;
                const intensity = datum ? 0.22 + (datum.value / maximum) * 0.78 : 0;

                return (
                  <Geography
                    key={feature.rsmKey}
                    geography={rawFeature}
                    fill={datum ? color : "#e8eee9"}
                    fillOpacity={datum ? intensity : 1}
                    stroke="#ffffff"
                    strokeWidth={1.15}
                    onMouseMove={(event) => {
                      if (!datum) return;
                      const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!bounds) return;
                      setHovered({
                        x: event.clientX - bounds.left,
                        y: event.clientY - bounds.top,
                        datum
                      });
                    }}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", filter: "brightness(0.93)", cursor: datum ? "pointer" : "default" },
                      pressed: { outline: "none" }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {hovered && (
        <div
          className="map-tooltip"
          style={{ left: Math.min(hovered.x + 12, 680), top: Math.max(hovered.y - 72, 10) }}
        >
          <strong>{hovered.datum.stateName}</strong>
          <span>{formatCompactNumber(hovered.datum.value)} {hovered.datum.unit}</span>
          <small>Rank #{hovered.datum.rank} · {hovered.datum.sharePercent.toFixed(1)}% of displayed total</small>
        </div>
      )}

      <div className="map-legend">
        <span>Lower</span>
        <div className="legend-gradient" style={{ background: `linear-gradient(90deg, ${color}38, ${color})` }} />
        <span>Higher</span>
      </div>
    </div>
  );
}
