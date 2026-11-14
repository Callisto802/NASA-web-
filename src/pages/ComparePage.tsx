import { useMemo, useState } from "react";
import type { PSIInvestigation } from "../types";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { SourceList } from "../components/SourceList";
import { RangeChart } from "../components/charts/ConditionChart";
import { RadarChart } from "../components/charts/RadarChart";
import { formatRange } from "../utils/format";
import { buildJsonBrief, buildMarkdownBrief, downloadText } from "../utils/export";
import { weightedRelevance, SCORE_FORMULA } from "../utils/ranking";
import { RELEVANCE_RUBRIC } from "../data/reference";
import { useLanguage } from "../i18n";

interface Props {
  records: PSIInvestigation[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onClear: () => void;
}

function EvidenceQuality({ record }: { record: PSIInvestigation }) {
  const { t } = useLanguage();
  const blocks = [
    record.hardware?.evidenceStatus,
    record.fuelSpecs?.evidenceStatus,
    record.testConditions?.evidenceStatus,
    record.experimentalDesign?.evidenceStatus,
    record.findingsEvidenceStatus,
  ];
  const sourced = blocks.filter((status) => status === "NASA-reported").length;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="mono-sm">
        {sourced}/{blocks.length} {t("blocks NASA-reported")}
      </span>
      <div className="chip-row">
        {record.findingsEvidenceStatus === "Analysis-derived" ? (
          <span className="chip chip--violet">{t("Analysis-derived summary")}</span>
        ) : record.findingsEvidenceStatus === "NASA-reported" ? (
          <span className="chip chip--green">{t("Evidence notes sourced")}</span>
        ) : record.findings?.length ? (
          <span className="chip chip--muted">{t("Evidence notes listed")}</span>
        ) : (
          <span className="chip chip--muted">{t("No evidence notes")}</span>
        )}
        {record.testConditions?.evidenceStatus === "Unknown" ? (
          <span className="chip chip--muted">{t("Conditions unknown")}</span>
        ) : (
          <span className="chip chip--cyan">{t("Conditions sourced")}</span>
        )}
      </div>
    </div>
  );
}

export function ComparePage({ records, compareIds, onToggleCompare, onClear }: Props) {
  const { t } = useLanguage();
  const [pickQuery, setPickQuery] = useState("");
  const selected = compareIds
    .map((id) => records.find((record) => record.id === id))
    .filter((record): record is PSIInvestigation => Boolean(record));

  const candidates = useMemo(() => {
    const query = pickQuery.trim().toLowerCase();
    return records
      .filter((record) => !compareIds.includes(record.id))
      .filter(
        (record) =>
          !query ||
          record.fullTitle.toLowerCase().includes(query) ||
          record.acronym.toLowerCase().includes(query) ||
          record.id.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [records, compareIds, pickQuery]);

  const markdown = () => {
    const now = new Date();
    downloadText(
      "psi-comparison.md",
      buildMarkdownBrief(
        selected,
        {
          title: `PSI comparison — ${selected.map((record) => record.acronym).join(" vs ")}`,
          note: "Comparison generated from the current selection in the Compare view.",
        },
        now,
      ),
      "text/markdown",
    );
  };

  const json = () => {
    const now = new Date();
    downloadText(
      "psi-comparison.json",
      buildJsonBrief(
        selected,
        {
          title: `PSI comparison — ${selected.map((record) => record.acronym).join(" vs ")}`,
          note: "Comparison generated from the current selection in the Compare view.",
        },
        now,
      ),
      "application/json",
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("Comparison")}</div>
          <h1 className="page-title">{t("Compare investigations")}</h1>
          <p className="page-lede">{t("Select two to four investigations. Only fields with comparable, sourced values are charted; Unknown fields stay blank rather than becoming zero. Cross-investigation comparison is descriptive and does not imply equivalent hardware or conditions.")}</p>
        </div>
        <div className="row">
          <span className="result-count">
            <strong>{selected.length}</strong> / 4 {t("selected")}
          </span>
          <button className="btn btn--sm" onClick={onClear} disabled={selected.length === 0}>
            {t("Clear selection")}
          </button>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="panel">
          <div className="panel-body">
            <div className="empty" style={{ border: 0, padding: "20px 10px" }}>
              <h3>{t("Select investigations to compare")}</h3>
              <p>{t("Add records from the Explorer, or pick from the list below. Up to four records can be compared at once.")}</p>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <input
                className="input"
                style={{ maxWidth: 320 }}
                value={pickQuery}
                onChange={(event) => setPickQuery(event.target.value)}
                placeholder={t("Filter records…")}
                aria-label={t("Filter records to add")}
              />
              <a className="btn" href="#/explorer">
                {t("Open explorer")}
              </a>
            </div>
            <div className="stack" style={{ marginTop: 14 }}>
              {candidates.map((record) => (
                <div className="row row--between list-row" key={record.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <span>
                    <span className="inv-acronym">{record.acronym}</span>
                    <span className="list-row__title" style={{ display: "block" }}>
                      {t(record.fullTitle)}
                    </span>
                    <span className="list-row__meta">{record.programFamily ? t(record.programFamily) : t("Unclassified")}</span>
                  </span>
                  <button className="btn btn--sm" onClick={() => onToggleCompare(record.id)}>
                    {t("Add")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="panel panel--flat">
            <div className="panel-body">
              <div className="row row--between">
                <div className="chip-row">
                  {selected.map((record) => (
                    <span className="chip chip--cyan" key={record.id}>
                      {record.acronym} ({record.id})
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{ height: 18, padding: "0 4px", marginLeft: 2 }}
                        onClick={() => onToggleCompare(record.id)}
                        aria-label={`Remove ${record.acronym} from comparison`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--sm" onClick={markdown}>
                    {t("Export Markdown")}
                  </button>
                  <button className="btn btn--sm" onClick={json}>
                    {t("Export JSON")}
                  </button>
                </div>
              </div>

              <div className="row" style={{ gap: 8, marginTop: 14 }}>
                <input
                  className="input"
                  style={{ maxWidth: 280 }}
                  value={pickQuery}
                  onChange={(event) => setPickQuery(event.target.value)}
                  placeholder={t("Add another record…")}
                  aria-label={t("Search records to add to comparison")}
                />
                {candidates.slice(0, 4).map((record) => (
                  <button
                    key={record.id}
                    className="btn btn--sm btn--ghost"
                    onClick={() => onToggleCompare(record.id)}
                    disabled={selected.length >= 4}
                  >
                    + {record.acronym}
                  </button>
                ))}
                {selected.length >= 4 && <span className="tiny dim">{t("Maximum of 4 reached.")}</span>}
              </div>
            </div>
          </div>

          {/* Radar Comparison Section */}
          <section className="section" aria-labelledby="radar-comp-heading">
            <div className="section-head">
              <h2 className="section-title" id="radar-comp-heading">
                <span className="index">01</span> {t("Multi-Investigation Radar Comparison")}
              </h2>
              <span className="section-hint">{t("Normalized multi-axis cross-study comparison")}</span>
            </div>
            <div className="panel panel--flat">
              <div className="panel-body stack">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: 24,
                    alignItems: "center",
                  }}
                >
                  <RadarChart records={selected} />

                  <div className="stack" style={{ gap: 14 }}>
                    <div>
                      <div className="tiny dim" style={{ textTransform: "uppercase", marginBottom: 6 }}>
                        {t("Cross-Investigation Insights & Parameter Alignment")}
                      </div>
                      <div className="stack" style={{ gap: 8 }}>
                        <div className="row row--between tiny" style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                          <span>{t("Fuel Phase Compatibility")}:</span>
                          <strong>
                            {selected.every((r) => r.fuelSpecs?.phase && r.fuelSpecs.phase === selected[0].fuelSpecs?.phase)
                              ? `${t("Matching")} (${t(selected[0].fuelSpecs?.phase ?? "")})`
                              : t("Differing phases")}
                          </strong>
                        </div>
                        <div className="row row--between tiny" style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                          <span>{t("Gravity Environment")}:</span>
                          <strong>
                            {selected.every((r) => r.flightPlatform === selected[0].flightPlatform)
                              ? `${t("Matching Platform")} (${selected[0].flightPlatform ?? "Unknown"})`
                              : t("Mixed Flight & Ground Platforms")}
                          </strong>
                        </div>
                        <div className="row row--between tiny" style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                          <span>{t("Shared Hardware Facility")}:</span>
                          <strong>
                            {selected.every((r) => r.hardware?.facility && r.hardware.facility === selected[0].hardware?.facility)
                              ? `${t("Common Facility")} (${t(selected[0].hardware?.facility ?? "")})`
                              : t("Distinct Hardware Facilities")}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="tiny dim" style={{ textTransform: "uppercase", marginBottom: 6 }}>
                        {t("Data Completeness Index")}
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        {selected.map((r) => {
                          let score = 20;
                          if (r.hardware?.facility) score += 20;
                          if (r.fuelSpecs?.phase) score += 20;
                          if (r.testConditions?.oxygenPercentMin !== undefined) score += 20;
                          if ((r.findings ?? []).length > 0) score += 20;
                          return (
                            <div key={r.id}>
                              <div className="row row--between tiny">
                                <span>{r.acronym}</span>
                                <span className="mono-sm">{score}%</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", marginTop: 2 }}>
                                <div style={{ height: "100%", width: `${score}%`, background: "var(--cyan)", borderRadius: 2 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <p className="tiny dim" style={{ borderTop: "1px solid var(--line)", paddingTop: 8, margin: 0 }}>
                      <strong>{t("Scientific Caution")}:</strong> {t("Radar axes normalize relative coverage across records. Never assume that different test configurations or burner shapes are directly equivalent in physical combustion.")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">
                <span className="index">02</span> {t("Field matrix")}
              </h2>
              <span className="section-hint">{t("Blank = Unknown, never zero")}</span>
            </div>
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 760 + selected.length * 120 }}>
                <thead>
                  <tr>
                    <th scope="col">{t("Field")}</th>
                    {selected.map((record) => (
                      <th scope="col" key={record.id}>
                        {record.acronym}
                        <span className="dim" style={{ display: "block", fontWeight: 400 }}>
                          {record.id}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t("Full title")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ maxWidth: 280, whiteSpace: "normal" }}>
                        {t(record.fullTitle)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Program family")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>{record.programFamily ? t(record.programFamily) : t("Unknown")}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Status")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal" }}>
                        {record.status ? t(record.status) : t("Unknown")}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Platform")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>{record.flightPlatform ? t(record.flightPlatform) : t("Unknown")}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Safety pillars")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>
                        (record.safetyPillars ?? []).map(t).join(", ") || t("Unclassified")
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Facility")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal" }}>
                        {record.hardware?.facility ?? <span className="unknown">Unknown</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Shared hardware")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>
                        {(record.hardware?.sharedHardwareIds ?? []).join(", ") || "None recorded"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Fuel phase")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>{record.fuelSpecs?.phase ? t(record.fuelSpecs.phase) : t("Unknown")}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Materials")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal", maxWidth: 260 }}>
                        {(record.fuelSpecs?.materials ?? []).join("; ") || <span className="unknown">Unknown</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Geometry / size")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal", maxWidth: 260 }}>
                        {record.fuelSpecs?.geometryAndSize ?? <span className="unknown">Unknown</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("O2 range")}</td>
                    {selected.map((record) => (
                      <td className="value" key={record.id}>
                        {record.testConditions?.oxygenPercentMin !== undefined ||
                        record.testConditions?.oxygenPercentMax !== undefined ? (
                          formatRange(
                            record.testConditions?.oxygenPercentMin,
                            record.testConditions?.oxygenPercentMax,
                            "%",
                          )
                        ) : (
                          <span className="unknown">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Pressure range")}</td>
                    {selected.map((record) => (
                      <td className="value" key={record.id}>
                        {record.testConditions?.pressurePsiMin !== undefined ||
                        record.testConditions?.pressurePsiMax !== undefined ? (
                          formatRange(
                            record.testConditions?.pressurePsiMin,
                            record.testConditions?.pressurePsiMax,
                            "psia",
                          )
                        ) : (
                          <span className="unknown">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Airflow range")}</td>
                    {selected.map((record) => (
                      <td className="value" key={record.id}>
                        {record.testConditions?.airflowCmPerSecondMin !== undefined ||
                        record.testConditions?.airflowCmPerSecondMax !== undefined ? (
                          formatRange(
                            record.testConditions?.airflowCmPerSecondMin,
                            record.testConditions?.airflowCmPerSecondMax,
                            "cm/s",
                          )
                        ) : (
                          <span className="unknown">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Suppressants")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal" }}>
                        {(record.testConditions?.suppressantsTested ?? []).join("; ") || "None stated"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Sensors / diagnostics")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal", maxWidth: 280 }}>
                        {(record.experimentalDesign?.sensorsAndDiagnostics ?? []).map((sensor) => (
                          <span key={sensor} className="chip" style={{ margin: "0 4px 4px 0" }}>
                            {sensor}
                          </span>
                        ))}
                        {!(record.experimentalDesign?.sensorsAndDiagnostics ?? []).length && (
                          <span className="unknown">Unknown</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Evidence summary")}</td>
                    {selected.map((record) => (
                      <td key={record.id} style={{ whiteSpace: "normal", maxWidth: 300 }}>
                        {(record.findings ?? []).length > 0 ? (
                          <ul style={{ paddingLeft: 14, margin: 0 }}>
                            {(record.findings ?? []).map((finding, index) => (
                              <li key={index} style={{ marginBottom: 5 }}>
                                {finding}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="unknown">No evidence summary available</span>
                        )}
                        <div style={{ marginTop: 6 }}>
                          <EvidenceBadge status={record.findingsEvidenceStatus ?? "Unknown"} compact />
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Evidence quality")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>
                        <EvidenceQuality record={record} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>{t("Editorial relevance")}</td>
                    {selected.map((record) => (
                      <td key={record.id}>
                        <span className="mono-sm">{weightedRelevance(record) ?? "—"}/5</span>
                        <span className="tiny dim" style={{ display: "block" }}>
                          {record.relevanceScores?.rationale}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <div className="table-caption">{t("Fields are taken verbatim from PSI metadata. Comparison does not normalize fuels, facilities, geometries or diagnostics. Rows with Unknown are information gaps, not agreement.")}</div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">
                <span className="index">03</span> {t("Charted conditions")}
              </h2>
              <span className="section-hint">{t("Only records reporting numeric values appear")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
              <div className="panel panel--flat">
                <div className="panel-head">
                  <h3>{t("Oxygen ranges")}</h3>
                  <span className="panel-caption">{t("Reported min–max")}</span>
                </div>
                <div className="panel-body">
                  <RangeChart records={selected} kind="oxygen" compareIds={compareIds} />
                  <p className="chart-note">{t("Bars show the range stated by each source. A bar is not a tested continuum, and records without a reported oxygen range are absent rather than plotted at 0%.")}</p>
                </div>
              </div>
              <div className="panel panel--flat">
                <div className="panel-head">
                  <h3>{t("Pressure ranges")}</h3>
                  <span className="panel-caption">{t("Reported min–max")}</span>
                </div>
                <div className="panel-body">
                  <RangeChart records={selected} kind="pressure" compareIds={compareIds} />
                  <p className="chart-note">{t("PSI values in atm were converted with 1 atm = 14.6959 psi. Conversion is derived, not measured.")}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">
                <span className="index">04</span> {t("Sources for this comparison")}
              </h2>
              <span className="section-hint">{t("Grouped by investigation")}</span>
            </div>
            <div className="panel panel--flat">
              <div className="panel-body">
                {selected.map((record) => (
                  <div key={record.id} style={{ marginBottom: 18 }}>
                    <h3 style={{ fontSize: 13, marginBottom: 8 }}>
                      {record.acronym} — {t(record.fullTitle)}
                    </h3>
                    <SourceList sources={record.sources} showUrl={false} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="callout callout--amber">
            <strong>{t("Export contents.")}</strong> {t("Markdown and JSON exports include the selected IDs, source references, evidence labels, formulas, relevance weights, assumptions and a generated-at timestamp. The JSON includes the full selected records for machine use.")} {SCORE_FORMULA} {t(RELEVANCE_RUBRIC.note)}
          </div>
        </>
      )}
    </div>
  );
}
