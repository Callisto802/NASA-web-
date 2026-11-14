import { useMemo, useState } from "react";
import type { PSIInvestigation } from "../types";
import { useLanguage } from "../i18n";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { SourceList } from "../components/SourceList";
import { useRoute } from "../lib/router";

interface Props {
  records: PSIInvestigation[];
}

type EdgeType = "follow-on" | "reflight" | "risk-reduction" | "data-reuse" | "related";

interface LineageEdge {
  from: string;
  to: string;
  type: EdgeType;
  label: string;
  basis: string;
  sourceUrl: string;
}

interface Node {
  id: string;
  x: number;
  y: number;
  group: string;
  ground?: boolean;
}

const NODE_W = 176;
const NODE_H = 48;

const NODES: Node[] = [
  { id: "PSI-26", x: 150, y: 92, group: "MSG · solid fuels" },
  { id: "PSI-25", x: 366, y: 92, group: "MSG · solid fuels" },
  { id: "PSI-62", x: 582, y: 92, group: "MSG · solid fuels", ground: true },

  { id: "PSI-47", x: 150, y: 214, group: "MSG · smoke & aerosols" },
  { id: "PSI-102", x: 366, y: 214, group: "MSG · smoke & aerosols" },
  { id: "PSI-101", x: 582, y: 214, group: "MSG · smoke & aerosols" },
  { id: "PSI-115", x: 798, y: 214, group: "MSG · smoke & aerosols", ground: true },

  { id: "PSI-106", x: 150, y: 336, group: "MSG · gaseous diffusion flames" },
  { id: "PSI-107", x: 366, y: 336, group: "MSG · gaseous diffusion flames" },
  { id: "PSI-60", x: 582, y: 336, group: "MSG · gaseous diffusion flames", ground: true },

  { id: "PSI-69", x: 150, y: 458, group: "CIR / MDCA · droplets" },
  { id: "PSI-68", x: 366, y: 458, group: "CIR / MDCA · droplets" },
  { id: "PSI-39", x: 582, y: 458, group: "CIR / MDCA · droplets" },

  { id: "PSI-142", x: 366, y: 592, group: "PSI ground grants reusing FLEX data", ground: true },
  { id: "PSI-117", x: 582, y: 592, group: "PSI ground grants reusing FLEX data", ground: true },

  { id: "PSI-98", x: 150, y: 714, group: "Cygnus · Saffire large-scale fire" },
  { id: "PSI-99", x: 366, y: 714, group: "Cygnus · Saffire large-scale fire" },
  { id: "PSI-100", x: 582, y: 714, group: "Cygnus · Saffire large-scale fire" },
];

const EDGES: LineageEdge[] = [
  {
    from: "PSI-26",
    to: "PSI-25",
    type: "follow-on",
    label: "follow-on",
    basis:
      "PSI-25 lists PSI-26 as its related investigation and extends the BASS solid-fuel approach with additional geometries and oxygen dilution.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25",
  },
  {
    from: "PSI-25",
    to: "PSI-62",
    type: "data-reuse",
    label: "data used by",
    basis:
      "PSI-62 lists PSI-25 and PSI-26 as related and uses BASS/BASS-II imagery and test data as modeling benchmarks.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-62",
  },
  {
    from: "PSI-47",
    to: "PSI-102",
    type: "risk-reduction",
    label: "risk reduction",
    basis:
      "The DAFT/Daft-2 record states its focus was to mitigate risk for SAME by qualifying a modified TSI P-Trak in microgravity.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-47",
  },
  {
    from: "PSI-102",
    to: "PSI-101",
    type: "reflight",
    label: "reflight",
    basis:
      "SAME-R reused the SAME hardware after TEM grids were contaminated, adding Pyrell samples and an M-pass instrument.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-101",
  },
  {
    from: "PSI-101",
    to: "PSI-115",
    type: "data-reuse",
    label: "data used by",
    basis:
      "PSI-115 lists PSI-102 (SAME) as related and simulates smoke growth in a SAME-like geometry.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-115",
  },
  {
    from: "PSI-106",
    to: "PSI-107",
    type: "related",
    label: "related",
    basis:
      "The SLICE record lists PSI-107 (SPICE) as related. Both study laminar diffusion flames in coflow, but they are separate experiments.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-106",
  },
  {
    from: "PSI-107",
    to: "PSI-60",
    type: "data-reuse",
    label: "data used by",
    basis:
      "PSI-60 analyses SPICE data sets: over 1,600 raw DSLR images are processed for temperature and soot volume fraction.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-60",
  },
  {
    from: "PSI-69",
    to: "PSI-68",
    type: "follow-on",
    label: "follow-on",
    basis:
      "PSI-68 states the FLEX-2 goal is to extend FLEX-1 results to additional fuels and environmental conditions.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-68",
  },
  {
    from: "PSI-69",
    to: "PSI-39",
    type: "related",
    label: "related program",
    basis:
      "The CFI record lists PSI-69 (FLEX) as related. CFI extends droplet cool-flame work rather than repeating FLEX.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-39",
  },
  {
    from: "PSI-69",
    to: "PSI-142",
    type: "data-reuse",
    label: "FLEX data used",
    basis:
      "PSI-142 states it used FLEX data from PSI to conduct new simulations and ground experiments.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-142",
  },
  {
    from: "PSI-69",
    to: "PSI-117",
    type: "data-reuse",
    label: "FLEX data used",
    basis:
      "PSI-117 models FLEX droplet cool-flame data with OpenFOAM, including drift-induced convection.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-117",
  },
  {
    from: "PSI-98",
    to: "PSI-99",
    type: "follow-on",
    label: "follow-on",
    basis:
      "Saffire-II is described as a follow-on to Saffire-I, adding multiple material samples to the same duct concept.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-99",
  },
  {
    from: "PSI-99",
    to: "PSI-100",
    type: "follow-on",
    label: "follow-on",
    basis:
      "Saffire-III is described as a follow-on to Saffire-I at 30 cm/s; the PSI record does not describe a Saffire-II dependency, so this link is shown as 'follow-on' to the series only.",
    sourceUrl: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-100",
  },
];

const TYPE_STYLE: Record<EdgeType, { color: string; dash?: string; label: string }> = {
  "follow-on": { color: "rgba(74,214,232,.55)", label: "Follow-on" },
  reflight: { color: "rgba(74,214,232,.55)", label: "Reflight" },
  "risk-reduction": { color: "rgba(95,220,156,.55)", label: "Risk reduction" },
  "data-reuse": { color: "rgba(183,156,245,.65)", dash: "2 3", label: "Data reuse" },
  related: { color: "rgba(247,180,92,.6)", dash: "4 3", label: "Related (not sequential)" },
};

function edgePath(edge: LineageEdge): string {
  const from = NODES.find((node) => node.id === edge.from);
  const to = NODES.find((node) => node.id === edge.to);
  if (!from || !to) return "";
  if (from.x === to.x && to.y > from.y) {
    const x = from.x + NODE_W / 2;
    return `M ${x} ${from.y + NODE_H} L ${x} ${to.y}`;
  }
  if (edge.from === "PSI-69" && edge.to === "PSI-39") {
    const x1 = from.x + NODE_W / 2;
    const x2 = to.x + NODE_W / 2;
    return `M ${x1} ${from.y} C ${x1} ${from.y - 32}, ${x2} ${to.y - 32}, ${x2} ${to.y}`;
  }
  if (to.x > from.x) {
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    if (Math.abs(y1 - y2) < 2) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const mid = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  }
  // FLEX to CFI: arc beneath the row without touching the data-reuse bus.
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y + NODE_H;
  return `M ${x1} ${y1} C ${x1} ${y1 + 26}, ${x2} ${y2 + 26}, ${x2} ${y2}`;
}

export function LineagePage({ records }: Props) {
  const { t } = useLanguage();
  const route = useRoute();
  const requestedNode = route.query.get("node");
  const [selectedId, setSelectedId] = useState(() =>
    requestedNode && NODES.some((node) => node.id === requestedNode) ? requestedNode : "PSI-25",
  );
  const selected = records.find((record) => record.id === selectedId);

  const incoming = EDGES.filter((edge) => edge.to === selectedId);
  const outgoing = EDGES.filter((edge) => edge.from === selectedId);

  const acme = useMemo(
    () => records.filter((record) => record.programFamily === "ACME"),
    [records],
  );

  const nodeRecord = (id: string) => records.find((record) => record.id === id);

  const groupLabels = useMemo(() => {
    const seen = new Map<string, number>();
    for (const node of NODES) {
      if (!seen.has(node.group)) seen.set(node.group, node.y);
    }
    return Array.from(seen.entries());
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("Hardware Lineage")}</div>
          <h1 className="page-title">{t("How the investigations connect")}</h1>
          <p className="page-lede">{t("A relationship graph built only from explicit PSI metadata: related-investigation fields, stated follow-ons, reflights, risk-reduction purposes and documented data reuse. A shared facility alone is not drawn as a lineage edge.")}</p>
        </div>
        <div className="chip chip--cyan">
          {records.filter((record) => !(record.flightPlatform ?? "").toLowerCase().includes("not applicable")).length} flight ·{" "}
          {records.filter((record) => (record.flightPlatform ?? "").toLowerCase().includes("not applicable")).length} ground
        </div>
      </div>

      {/* Sensor & Hardware Lineage Architecture Section */}
      <section className="section" aria-labelledby="sensor-arch-title" style={{ marginBottom: 24 }}>
        <div className="section-head">
          <h2 className="section-title" id="sensor-arch-title">
            <span className="index">01</span> {t("Sensor & Hardware Lineage Architecture")}
          </h2>
          <span className="section-hint">{t("CIR · MSG · MDCA · SPICE · SAME-R & DAFT-2 Sensor Configurations")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {/* CIR / MDCA */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 8, border: "1px solid var(--line)" }}>
                <div className="row row--between">
                  <span className="chip chip--cyan">{t("Facility / Apparatus")}</span>
                  <span className="tiny dim">ISS CIR Rack</span>
                </div>
                <h3 style={{ fontSize: 15, margin: "8px 0 4px" }}>CIR / MDCA Apparatus</h3>
                <p className="tiny dim" style={{ marginBottom: 8 }}>
                  {t("Combustion Integrated Rack housing the Multi-user Droplet Combustion Apparatus. Provides chamber pressure control (0.25–5 atm), multi-wavelength imaging, and silicon radiometers.")}
                </p>
                <div className="tiny" style={{ color: "var(--cyan)" }}>
                  {t("Servicing:")} FLEX (PSI-69) · FLEX-2 (PSI-68) · CFI (PSI-39)
                </div>
              </div>

              {/* MSG / SPICE Duct */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 8, border: "1px solid var(--line)" }}>
                <div className="row row--between">
                  <span className="chip chip--cyan">{t("Facility / Flow Duct")}</span>
                  <span className="tiny dim">ISS Glovebox</span>
                </div>
                <h3 style={{ fontSize: 15, margin: "8px 0 4px" }}>MSG Flow Ducts (BASS & SPICE)</h3>
                <p className="tiny dim" style={{ marginBottom: 8 }}>
                  {t("Microgravity Science Glovebox flow duct assembly providing controlled forced airflow (0–55 cm/s) for solid samples (BASS) and laminar coflow diffusion flames (SPICE / SLICE).")}
                </p>
                <div className="tiny" style={{ color: "var(--cyan)" }}>
                  {t("Servicing:")} BASS (PSI-26) · BASS-II (PSI-25) · SPICE (PSI-107) · SLICE (PSI-106)
                </div>
              </div>

              {/* SAME-R Sensor Suite */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 8, border: "1px solid var(--line)" }}>
                <div className="row row--between">
                  <span className="chip chip--amber">{t("Sensor Configuration")}</span>
                  <span className="tiny dim">Aerosol Detectors</span>
                </div>
                <h3 style={{ fontSize: 15, margin: "8px 0 4px" }}>SAME-R Smoke Sensor Suite</h3>
                <p className="tiny dim" style={{ marginBottom: 8 }}>
                  {t("Reflight configuration integrating Transmission Electron Microscopy (TEM) sampling grids, an ionization chamber detector, and a photoelectric light-scattering channel to characterize particle morphology.")}
                </p>
                <div className="tiny" style={{ color: "var(--amber)" }}>
                  {t("Lineage:")} DAFT (PSI-47) → SAME (PSI-102) → SAME-R (PSI-101) → PSI-115
                </div>
              </div>

              {/* DAFT-2 Feasibility Suite */}
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 8, border: "1px solid var(--line)" }}>
                <div className="row row--between">
                  <span className="chip chip--green">{t("Sensor Feasibility")}</span>
                  <span className="tiny dim">P-Trak / DustTrak</span>
                </div>
                <h3 style={{ fontSize: 15, margin: "8px 0 4px" }}>DAFT-2 Instrument Suite</h3>
                <p className="tiny dim" style={{ marginBottom: 8 }}>
                  {t("Flight qualification testing of a modified TSI P-Trak (condensation nucleus counter with microgravity wick feed) alongside an unmodified DustTrak control to assess aerosol counting accuracy.")}
                </p>
                <div className="tiny" style={{ color: "var(--green)" }}>
                  {t("Risk Reduction:")} Mitigated sensor flight risk for SAME-R on-orbit campaigns
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lineage-layout">
        <div>
          <div className="lineage-canvas">
            <svg viewBox="0 0 1040 800" role="img" aria-label="Hardware and investigation relationship graph">
              <title>{t("Investigation lineage")}</title>
              {groupLabels.map(([group, y]) => (
                <text
                  key={group}
                  x={16}
                  y={y - 16}
                  style={{
                    fill: "var(--dim)",
                    fontSize: 9.5,
                    fontFamily: "var(--mono)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {t(group).toUpperCase()}
                </text>
              ))}

              {groupLabels.map(([group, y]) => (
                <line
                  key={`line-${group}`}
                  x1={12}
                  x2={1000}
                  y1={y - 6}
                  y2={y - 6}
                  stroke="rgba(120,190,230,.09)"
                  strokeWidth={1}
                />
              ))}

              {/* FLEX data-reuse bus */}
              <path
                d={`M ${150 + NODE_W / 2} ${458 + NODE_H} L ${150 + NODE_W / 2} 560 L ${
                  366 + NODE_W / 2
                } 560 L ${366 + NODE_W / 2} 592`}
                fill="none"
                stroke="rgba(183,156,245,.5)"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <path
                d={`M ${150 + NODE_W / 2} 560 L ${582 + NODE_W / 2} 560 L ${
                  582 + NODE_W / 2
                } 592`}
                fill="none"
                stroke="rgba(183,156,245,.5)"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <text x={150 + NODE_W / 2 + 8} y={552} style={{ fill: "var(--violet)", fontSize: 8.5 }}>
                {t("FLEX data reused by ground grants")}
              </text>

              {EDGES.filter(
                (edge) =>
                  !(
                    edge.from === "PSI-69" &&
                    (edge.to === "PSI-142" || edge.to === "PSI-117")
                  ),
              ).map((edge, index) => {
                const style = TYPE_STYLE[edge.type];
                return (
                  <path
                    key={`${edge.from}-${edge.to}-${index}`}
                    d={edgePath(edge)}
                    fill="none"
                    stroke={style.color}
                    strokeWidth={1.4}
                    strokeDasharray={style.dash}
                    markerEnd="url(#arrow)"
                  />
                );
              })}

              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(140,200,235,.6)" />
                </marker>
              </defs>

              {NODES.map((node) => {
                const record = nodeRecord(node.id);
                if (!record) return null;
                const active = node.id === selectedId;
                return (
                  <a
                    key={node.id}
                    href={`#/lineage?node=${node.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setSelectedId(node.id);
                    }}
                    aria-label={`Select ${record.acronym}`}
                  >
                    <g className="lineage-node" transform={`translate(${node.x}, ${node.y})`}>
                      <title>{t(record.fullTitle)}</title>
                      <rect
                        width={NODE_W}
                        height={NODE_H}
                        rx={6}
                        fill={active ? "rgba(74,214,232,.14)" : node.ground ? "rgba(183,156,245,.06)" : "rgba(10,24,40,.96)"}
                        stroke={active ? "var(--cyan)" : "rgba(120,190,230,.26)"}
                        strokeWidth={active ? 1.6 : 1}
                      />
                      <text x={10} y={18} style={{ fill: active ? "var(--cyan)" : "var(--text-soft)", fontSize: 10, fontFamily: "var(--mono)" }}>
                        {record.acronym.length > 22 ? `${record.acronym.slice(0, 21)}…` : record.acronym}
                      </text>
                      <text x={10} y={33} style={{ fill: "var(--dim)", fontSize: 8.5 }}>
                        {record.id} · {node.ground ? "ground" : (record.hardware?.sharedHardwareIds ?? []).join("/") || "facility n/a"}
                      </text>
                    </g>
                  </a>
                );
              })}
            </svg>
          </div>
          <div className="lineage-legend">
              <span className="lineage-legend__item">
              <span className="lineage-legend__swatch" /> {t("Follow-on / reflight")}
            </span>
            <span className="lineage-legend__item">
              <span className="lineage-legend__swatch" style={{ borderTopColor: "var(--green)" }} /> {t("Risk reduction")}
            </span>
            <span className="lineage-legend__item">
              <span className="lineage-legend__swatch lineage-legend__swatch--data" /> {t("Data reuse")}
            </span>
            <span className="lineage-legend__item">
              <span className="lineage-legend__swatch lineage-legend__swatch--related" /> {t("Related, not sequential")}
            </span>
            <span className="lineage-legend__item">{t("Purple nodes = ground/computational work")}</span>
          </div>
        </div>

        <aside className="lineage-detail" aria-live="polite">
          {selected ? (
            <>
              <div className="tiny dim" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {t("Selected node")}
              </div>
              <h2 style={{ fontSize: 17, marginTop: 5 }}>{selected.acronym}</h2>
              <p className="small muted">{t(selected.fullTitle)}</p>
              <div className="chip-row" style={{ marginTop: 8 }}>
              <span className="chip chip--muted">{t(selected.fuelSpecs?.phase ?? "Unknown")}</span>
                <EvidenceBadge status="NASA-reported" compact />
              </div>
              <div className="stack small" style={{ marginTop: 12, gap: 6 }}>
                <div className="row row--between">
                  <span className="dim">{t("Facility")}</span>
                  <span style={{ textAlign: "right" }}>{t(selected.hardware?.facility ?? "Unknown")}</span>
                </div>
                <div className="row row--between">
                  <span className="dim">{t("Shared IDs")}</span>
                  <span>{(selected.hardware?.sharedHardwareIds ?? []).join(", ") || "—"}</span>
                </div>
                <div className="row row--between">
                  <span className="dim">{t("Platform")}</span>
                  <span style={{ textAlign: "right" }}>{t(selected.flightPlatform ?? "Unknown")}</span>
                </div>
              </div>

              {(incoming.length > 0 || outgoing.length > 0) && (
                <>
                  <div className="divider" />
                  <div className="tiny dim" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {t("Sourced connections")}
                  </div>
                  <div className="stack" style={{ marginTop: 8, gap: 10 }}>
                    {[...incoming, ...outgoing].map((edge) => {
                      const other = edge.from === selected.id ? edge.to : edge.from;
                      const otherRecord = nodeRecord(other);
                      return (
                        <div key={`${edge.from}-${edge.to}`}>
                          <div className="mono-sm" style={{ color: TYPE_STYLE[edge.type].color }}>
                            {edge.from} → {edge.to} · {t(edge.label)}
                          </div>
                          <p className="tiny muted" style={{ marginTop: 2 }}>
                            {t(edge.basis)}
                          </p>
                          <div className="row" style={{ gap: 6, marginTop: 3 }}>
                            <a
                              className="tiny"
                              href={`#/explorer/${other}`}
                              onClick={() => setSelectedId(other)}
                            >
                              {otherRecord?.acronym ?? other} {t("record")} →
                            </a>
                            <a
                              className="tiny"
                              href={edge.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("PSI basis")} ↗
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="divider" />
              <a className="btn btn--sm" href={`#/explorer/${selected.id}`}>
                {t("Open full record")}
              </a>
            </>
          ) : (
            <p className="small muted">{t("Select a node to inspect its sourced connections.")}</p>
          )}
        </aside>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">01</span> {t("Shared ACME hardware cluster")}
          </h2>
          <span className="section-hint">{t("Shared facility — not a sequential lineage")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <p className="small muted" style={{ marginBottom: 14 }}>{t("All six ACME records list the Combustion Integrated Rack and ACME hardware. The PSI records describe a shared modular facility and a common program, not one experiment following another. They are grouped here rather than linked in the graph above.")}</p>
            <div className="card-grid">
              {acme.map((record) => (
                <a className="inv-card" href={`#/explorer/${record.id}`} key={record.id} style={{ minHeight: 150 }}>
                  <div className="inv-acronym">{record.acronym}</div>
                  <span className="inv-title" style={{ fontSize: 14 }}>
                    {t(record.fullTitle)}
                  </span>
                  <span className="tiny dim" style={{ marginTop: "auto" }}>
                    {record.id} · CIR/ACME
                  </span>
                </a>
              ))}
            </div>
            <p className="tiny dim" style={{ marginTop: 12 }}>
              {t("NASA's ACME article reports over 1,500 flames ignited across the six experiments. That is a program-level count, not a per-record measurement.")}
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">02</span> {t("Connections not drawn")}
          </h2>
          <span className="section-hint">{t("What the sources do not support")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <ul className="small muted">
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text-soft)" }}>{t("Apollo 1, Apollo 13 and Mir → PSI records:")}</strong> {t("none of the reviewed sources states that these incidents motivated a specific PSI investigation. Historical context is shown on the Overview, unconnected to the graph.")}
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text-soft)" }}>{t("Spinoff technologies → PSI experiments:")}</strong> {t("the three Spinoff pages describe separate technology-transfer examples and do not mention PSI or ISS combustion research.")}
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text-soft)" }}>{t("Shared facility → shared conditions:")}</strong> {t("records using CIR or MSG did not necessarily share gases, samples, diagnostics or environmental setpoints. Facility edges are not drawn as scientific equivalence.")}
              </li>
              <li>
                <strong style={{ color: "var(--text-soft)" }}>{t("SoFIE, LUCI and FM2 → PSI:")}</strong> {t("these are official NASA activities but are not among the 24 PSI Combustion Science records. They are excluded from the graph and appear only as labelled context.")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="callout">
        <strong>{t("Reading line edges.")}</strong> {t("“Data used by” means the downstream record states it used the upstream investigation's data. It does not mean the original investigators endorsed the downstream result. “Related” means a PSI related-investigation field exists, not that one caused the other.")}
      </div>

      {selected && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">
              <span className="index">03</span> {t("Sources for this node")}
            </h2>
          </div>
          <div className="panel panel--flat">
            <div className="panel-body">
              <SourceList sources={selected.sources} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
