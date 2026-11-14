import type { PSIInvestigation } from "../../types";
import type { ReferenceAtmosphere } from "../../types";
import { formatNumber } from "../../utils/format";

type ConditionKind = "oxygen" | "pressure" | "airflow";

interface RangeChartProps {
  records: PSIInvestigation[];
  kind: ConditionKind;
  compareIds: string[];
  references?: ReferenceAtmosphere[];
}

const UNITS: Record<ConditionKind, string> = {
  oxygen: "%",
  pressure: "psia",
  airflow: "cm/s",
};

function readRange(record: PSIInvestigation, kind: ConditionKind): [number?, number?] {
  const conditions = record.testConditions;
  if (!conditions) return [undefined, undefined];
  if (kind === "oxygen") {
    return [conditions.oxygenPercentMin, conditions.oxygenPercentMax];
  }
  if (kind === "pressure") {
    return [conditions.pressurePsiMin, conditions.pressurePsiMax];
  }
  return [conditions.airflowCmPerSecondMin, conditions.airflowCmPerSecondMax];
}

function niceMax(value: number): number {
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 40) return Math.ceil(value / 10) * 10;
  if (value <= 100) return Math.ceil(value / 20) * 20;
  return Math.ceil(value / 50) * 50;
}

export function RangeChart({ records, kind, compareIds, references = [] }: RangeChartProps) {
  const rows = records
    .map((record) => {
      const [min, max] = readRange(record, kind);
      return { record, min, max };
    })
    .filter((row) => row.min !== undefined || row.max !== undefined)
    .sort((a, b) => (b.max ?? 0) - (a.max ?? 0));

  if (rows.length === 0) {
    return (
      <div className="chart-empty">
        No records report a numeric {kind} range. That is an information gap, not a zero.
      </div>
    );
  }

  const referenceValues = references.map((reference) =>
    kind === "oxygen" ? reference.oxygenPercent : kind === "pressure" ? reference.pressurePsi : null,
  );
  const dataMax = Math.max(
    ...rows.map((row) => row.max ?? row.min ?? 0),
    ...referenceValues.filter((value): value is number => value !== null),
  );
  const domainMax = kind === "oxygen" ? 100 : kind === "pressure" ? 80 : Math.max(50, niceMax(dataMax));
  const width = 760;
  const rowHeight = 30;
  const margin = { top: 34, right: 62, bottom: 34, left: 138 };
  const plotWidth = width - margin.left - margin.right;
  const height = margin.top + rows.length * rowHeight + margin.bottom;
  const x = (value: number) => margin.left + (value / domainMax) * plotWidth;
  const tickCount = kind === "pressure" ? 5 : 6;
  const ticks = Array.from({ length: tickCount }, (_, index) => (domainMax / (tickCount - 1)) * index);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Reported ${kind} ranges by investigation`}
    >
      <title>Reported {kind} ranges</title>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            className="grid-line"
            x1={x(tick)}
            x2={x(tick)}
            y1={margin.top - 16}
            y2={height - margin.bottom + 4}
          />
          <text x={x(tick)} y={height - margin.bottom + 18} textAnchor="middle">
            {formatNumber(tick, tick < 10 ? 1 : 0)}
          </text>
        </g>
      ))}
      <text
        className="axis-label"
        x={margin.left + plotWidth}
        y={height - 4}
        textAnchor="end"
      >
        {UNITS[kind]}
      </text>

      {references.map((reference) => {
        const value =
          kind === "oxygen" ? reference.oxygenPercent : kind === "pressure" ? reference.pressurePsi : null;
        if (value === null) return null;
        return (
          <g key={reference.id}>
            <title>{`${reference.label} — ${reference.note}`}</title>
            <line
              x1={x(value)}
              x2={x(value)}
              y1={margin.top - 12}
              y2={height - margin.bottom + 2}
              stroke="rgba(247,180,92,.3)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <path
              d={`M ${x(value) - 3} ${margin.top - 16} L ${x(value) + 3} ${margin.top - 16} L ${x(value)} ${margin.top - 10} Z`}
              fill="var(--amber)"
            />
          </g>
        );
      })}

      {rows.map(({ record, min, max }, index) => {
        const y = margin.top + index * rowHeight + rowHeight / 2;
        const start = min ?? max ?? 0;
        const end = max ?? min ?? 0;
        const isCompared = compareIds.includes(record.id);
        return (
          <g key={record.id}>
            <title>
              {record.acronym}: {min !== undefined && max !== undefined ? `${min}–${max}` : `${start}`}{" "}
              {UNITS[kind]} (reported range)
            </title>
            <a href={`#/explorer/${record.id}`} aria-label={`Open ${record.acronym}`}>
              <text
                x={margin.left - 10}
                y={y + 3.5}
                textAnchor="end"
                style={{ fill: isCompared ? "var(--cyan)" : "var(--text-soft)", fontSize: 10.5 }}
              >
                {record.acronym.length > 20 ? `${record.acronym.slice(0, 19)}…` : record.acronym}
              </text>
              <line
                className="range-bar"
                x1={x(start)}
                x2={x(end)}
                y1={y}
                y2={y}
                stroke={isCompared ? "var(--cyan)" : "rgba(74,214,232,.45)"}
              />
              <line className="range-cap" x1={x(start)} x2={x(start)} y1={y - 4} y2={y + 4} />
              <line className="range-cap" x1={x(end)} x2={x(end)} y1={y - 4} y2={y + 4} />
              <text
                x={Math.min(x(end) + 7, width - 6)}
                y={y + 3.5}
                style={{ fill: "var(--muted)", fontSize: 9 }}
              >
                {min !== undefined && max !== undefined && min !== max
                  ? `${formatNumber(min, 1)}–${formatNumber(max, 1)}`
                  : formatNumber(max ?? min, 1)}
              </text>
            </a>
          </g>
        );
      })}
    </svg>
  );
}

interface ScatterProps {
  records: PSIInvestigation[];
  references: ReferenceAtmosphere[];
  scenario: { oxygenPercent: number; pressurePsi: number } | null;
}

interface ScatterPoint {
  id: string;
  acronym: string;
  recordId: string;
  oxygen: number;
  pressure: number;
  note: string;
  rect?: { x1: number; x2: number; y1: number; y2: number };
}

export function EnvelopeScatter({ records, references, scenario }: ScatterProps) {
  const points: ScatterPoint[] = records.flatMap((record) => {
    const conditions = record.testConditions;
    if (!conditions) return [];
    const found: ScatterPoint[] = [];
    for (const condition of conditions.namedConditions ?? []) {
      if (condition.oxygenPercent === undefined || condition.pressurePsi === undefined) continue;
      found.push({
        id: `${record.id}-${condition.label}`,
        acronym: record.acronym,
        recordId: record.id,
        oxygen: condition.oxygenPercent,
        pressure: condition.pressurePsi,
        note: condition.note ?? condition.label,
      });
    }
    if (found.length > 0) return found;
    const oxygen =
      conditions.oxygenPercentMin !== undefined && conditions.oxygenPercentMax !== undefined
        ? (conditions.oxygenPercentMin + conditions.oxygenPercentMax) / 2
        : undefined;
    const pressure =
      conditions.pressurePsiMin !== undefined && conditions.pressurePsiMax !== undefined
        ? (conditions.pressurePsiMin + conditions.pressurePsiMax) / 2
        : undefined;
    if (oxygen === undefined || pressure === undefined) return [];
    return [
      {
        id: record.id,
        acronym: record.acronym,
        recordId: record.id,
        oxygen,
        pressure,
        note: `${record.acronym}: midpoint of reported O2 ${conditions.oxygenPercentMin}–${conditions.oxygenPercentMax}% and pressure ${conditions.pressurePsiMin}–${conditions.pressurePsiMax} psia. The rectangle is the reported range, not a validated operating envelope.`,
        rect: {
          x1: conditions.oxygenPercentMin ?? oxygen,
          x2: conditions.oxygenPercentMax ?? oxygen,
          y1: conditions.pressurePsiMin ?? pressure,
          y2: conditions.pressurePsiMax ?? pressure,
        },
      },
    ];
  });

  const width = 760;
  const height = 400;
  const margin = { top: 26, right: 24, bottom: 46, left: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMax = 48;
  const yMax = 110;
  const x = (value: number) => margin.left + (value / xMax) * plotWidth;
  const y = (value: number) => margin.top + plotHeight - (value / yMax) * plotHeight;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Oxygen versus pressure for investigations with both values and for NASA-considered atmospheres"
    >
      <title>Reported oxygen and pressure conditions</title>
      {[0, 20, 40, 60, 80, 100].map((tick) => (
        <g key={`y-${tick}`}>
          <line className="grid-line" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />
          <text x={margin.left - 8} y={y(tick) + 3} textAnchor="end">
            {tick}
          </text>
        </g>
      ))}
      {[0, 10, 20, 30, 40].map((tick) => (
        <g key={`x-${tick}`}>
          <line className="grid-line" x1={x(tick)} x2={x(tick)} y1={margin.top} y2={height - margin.bottom} />
          <text x={x(tick)} y={height - margin.bottom + 16} textAnchor="middle">
            {tick}
          </text>
        </g>
      ))}
      <line className="axis-line" x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} />
      <line className="axis-line" x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} />
      <text className="axis-label" x={margin.left + plotWidth / 2} y={height - 6} textAnchor="middle">
        Pressure (psia)
      </text>
      <text className="axis-label" x={12} y={margin.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 12 ${margin.top + plotHeight / 2})`}>
        Oxygen (%)
      </text>

      {points.map((point) => (
        <g key={point.id}>
          <title>{point.note}</title>
          {point.rect && (
            <rect
              x={x(point.rect.x1)}
              y={y(point.rect.y2)}
              width={Math.max(2, x(point.rect.x2) - x(point.rect.x1))}
              height={Math.max(2, y(point.rect.y1) - y(point.rect.y2))}
              fill="rgba(74,214,232,.08)"
              stroke="rgba(74,214,232,.45)"
              strokeDasharray="3 3"
            />
          )}
          <a href={`#/explorer/${point.recordId}`} aria-label={`Open ${point.acronym}`}>
            <circle className="data-dot" cx={x(point.pressure)} cy={y(point.oxygen)} r={4} />
            <text x={x(point.pressure) + 7} y={y(point.oxygen) + 3} style={{ fontSize: 8.5 }}>
              {point.acronym.length > 16 ? `${point.acronym.slice(0, 15)}…` : point.acronym}
            </text>
          </a>
        </g>
      ))}

      {references.map((reference) => (
        <g key={reference.id}>
          <title>{reference.label} — {reference.note}</title>
          <circle
            cx={x(reference.pressurePsi)}
            cy={y(reference.oxygenPercent)}
            r={6}
            fill="none"
            stroke="var(--amber)"
            strokeWidth={1.5}
          />
          <text
            x={x(reference.pressurePsi) + 9}
            y={y(reference.oxygenPercent) - 5}
            style={{ fill: "var(--amber)", fontSize: 8.5 }}
          >
            {reference.oxygenPercent}% / {reference.pressurePsi} psia
          </text>
        </g>
      ))}

      {scenario && (
        <g>
          <title>
            Your scenario: {scenario.oxygenPercent}% O2 at {scenario.pressurePsi} psia. Illustrative
            placement only.
          </title>
          <circle
            cx={x(scenario.pressurePsi)}
            cy={y(scenario.oxygenPercent)}
            r={7}
            fill="rgba(247,180,92,.25)"
            stroke="var(--amber)"
            strokeWidth={2}
          />
          <text
            x={x(scenario.pressurePsi) + 10}
            y={y(scenario.oxygenPercent) + 12}
            style={{ fill: "var(--amber)", fontSize: 9, fontWeight: 600 }}
          >
            scenario
          </text>
        </g>
      )}
    </svg>
  );
}
