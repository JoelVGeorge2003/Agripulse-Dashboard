import type { PricePoint } from "@/types";

interface PriceSparklineProps {
  points: PricePoint[];
  height?: number;
}

export function PriceSparkline({ points, height = 180 }: PriceSparklineProps) {
  const width = 720;
  const padding = 18;
  if (points.length < 2) {
    return <div className="sparkline-empty">Not enough observations for a trend line.</div>;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.01);
  const path = points
    .map((point, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = padding + ((max - point.value) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="sparkline-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Commodity price history line chart">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
        <path d={path} className="chart-line" />
        {points.map((point, index) => {
          const x = padding + (index / (points.length - 1)) * (width - padding * 2);
          const y = padding + ((max - point.value) / range) * (height - padding * 2);
          return <circle key={point.id} cx={x} cy={y} r="3.4" className="chart-point" />;
        })}
      </svg>
      <div className="chart-range">
        <span>Low {min.toFixed(2)}</span>
        <span>High {max.toFixed(2)}</span>
      </div>
    </div>
  );
}
