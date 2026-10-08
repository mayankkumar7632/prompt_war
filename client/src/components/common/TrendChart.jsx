import React from "react";

export default function TrendChart({ points, title = "Understanding over time" }) {
  if (!points?.length) {
    return <p className="student-empty">No learning activity yet. Start a story to begin tracking growth.</p>;
  }

  const width = 560;
  const height = 160;
  const padding = 18;
  const x = (index) => points.length === 1
    ? width / 2
    : padding + (index / (points.length - 1)) * (width - padding * 2);
  const y = (score) => height - padding - (score / 100) * (height - padding * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point.score)}`).join(" ");
  const label = (week) => new Date(week).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {[0, 50, 100].map((score) => (
          <g key={score}>
            <line x1={padding} x2={width - padding} y1={y(score)} y2={y(score)} className="trend-gridline" />
            <text x={padding - 4} y={y(score) - 4} textAnchor="end" className="trend-axis-label">{score}%</text>
          </g>
        ))}
        <path d={path} className="trend-line" />
        {points.map((point, index) => (
          <g key={point.week}>
            <circle cx={x(index)} cy={y(point.score)} r="4" className="trend-point" />
            <text x={x(index)} y={height - 1} textAnchor="middle" className="trend-date-label">{label(point.week)}</text>
            <title>{`${label(point.week)}: ${point.score}% (${point.evaluated} questions)`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
