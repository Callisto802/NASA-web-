import { useMemo, useState } from "react";
import type { PSIInvestigation } from "../../types";
import { useLanguage } from "../../i18n";

interface Props {
  records: PSIInvestigation[];
}

interface RadarAxis {
  key: string;
  label: string;
  getValue: (record: PSIInvestigation) => number; // 0-100
}

const PALETTE = [
  { stroke: "var(--cyan)", fill: "rgba(0, 229, 255, 0.18)", point: "#00e5ff" },
  { stroke: "var(--amber)", fill: "rgba(255, 179, 0, 0.18)", point: "#ffb300" },
  { stroke: "#b388ff", fill: "rgba(179, 136, 255, 0.18)", point: "#b388ff" },
  { stroke: "#69f0ae", fill: "rgba(105, 240, 174, 0.18)", point: "#69f0ae" },
];

export function RadarChart({ records }: Props) {
  const { t } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const axes: RadarAxis[] = useMemo(
    () => [
      {
        key: "safety",
        label: t("Safety Coverage"),
        getValue: (r) => {
          const count = (r.safetyPillars ?? []).length;
          return count >= 3 ? 100 : count === 2 ? 75 : count === 1 ? 45 : 20;
        },
      },
      {
        key: "atmosphere",
        label: t("Atmosphere Data"),
        getValue: (r) => {
          const c = r.testConditions;
          if (!c) return 15;
          let s = 25;
          if (c.pressurePsiMin !== undefined) s += 35;
          if (c.oxygenPercentMin !== undefined) s += 40;
          return s;
        },
      },
      {
        key: "suppression",
        label: t("Suppression Detail"),
        getValue: (r) => {
          let s = 20;
          if ((r.testConditions?.suppressantsTested ?? []).length > 0) s += 40;
          if (r.safetyPillars?.includes("Suppression")) s += 40;
          return Math.min(100, s);
        },
      },
      {
        key: "modeling",
        label: t("Modeling Utility"),
        getValue: (r) => {
          if (!r.modelingUtility) return 20;
          return r.relevanceScores?.predictiveModeling
            ? Math.round(r.relevanceScores.predictiveModeling * 20)
            : 70;
        },
      },
      {
        key: "completeness",
        label: t("Data Completeness"),
        getValue: (r) => {
          let fields = 0;
          if (r.hardware?.facility) fields += 20;
          if (r.fuelSpecs?.phase) fields += 20;
          if (r.testConditions?.oxygenPercentMin !== undefined) fields += 20;
          if ((r.findings ?? []).length > 0) fields += 20;
          if (r.sources.length >= 2) fields += 20;
          return Math.max(20, Math.min(100, fields));
        },
      },
      {
        key: "flight",
        label: t("Flight Maturity"),
        getValue: (r) => {
          if (r.flightPlatform === "ISS" || r.flightPlatform === "Cygnus") return 100;
          if (r.status === "Flight complete" || r.status === "Completed") return 80;
          return 40;
        },
      },
    ],
    [t],
  );

  const size = 340;
  const center = size / 2;
  const radius = center - 48;
  const totalAxes = axes.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (valueNormalized: number, axisIndex: number) => {
    const angle = axisIndex * angleStep - Math.PI / 2;
    const r = radius * valueNormalized;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  return (
    <div className="radar-container" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="radar-svg"
        style={{ width: "100%", maxWidth: 360, height: "auto", margin: "0 auto", display: "block" }}
        role="img"
        aria-label={t("Comparison Radar Chart")}
      >
        {/* Background Grid Rings */}
        {levels.map((level, i) => {
          const points = axes
            .map((_, idx) => {
              const { x, y } = getCoordinates(level, idx);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Lines & Labels */}
        {axes.map((axis, i) => {
          const outer = getCoordinates(1.0, i);
          const labelCoord = getCoordinates(1.18, i);
          return (
            <g key={axis.key}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
              />
              <text
                x={labelCoord.x}
                y={labelCoord.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--dim)"
                fontSize="9.5"
                fontFamily="var(--font-mono, monospace)"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* Polygons for each investigation */}
        {records.map((record, rIdx) => {
          const colors = PALETTE[rIdx % PALETTE.length];
          const isHovered = hoveredIndex === rIdx;
          const isOtherHovered = hoveredIndex !== null && hoveredIndex !== rIdx;

          const points = axes
            .map((axis, aIdx) => {
              const val = axis.getValue(record) / 100;
              const { x, y } = getCoordinates(val, aIdx);
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <g
              key={record.id}
              style={{
                opacity: isOtherHovered ? 0.35 : 1,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={() => setHoveredIndex(rIdx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <polygon
                points={points}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isHovered ? 2.5 : 1.6}
              />
              {/* Vertex points */}
              {axes.map((axis, aIdx) => {
                const val = axis.getValue(record) / 100;
                const { x, y } = getCoordinates(val, aIdx);
                return (
                  <circle
                    key={aIdx}
                    cx={x}
                    cy={y}
                    r={isHovered ? 4 : 2.5}
                    fill={colors.point}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend below the radar */}
      <div
        className="radar-legend"
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 10,
        }}
      >
        {records.map((record, rIdx) => {
          const colors = PALETTE[rIdx % PALETTE.length];
          const isHovered = hoveredIndex === rIdx;
          return (
            <button
              key={record.id}
              type="button"
              className="chip"
              style={{
                background: isHovered ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
                borderColor: colors.stroke,
                cursor: "pointer",
                gap: 6,
                padding: "3px 8px",
              }}
              onMouseEnter={() => setHoveredIndex(rIdx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: colors.stroke,
                }}
              />
              <span style={{ fontWeight: 600 }}>{record.acronym}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
