import { useEffect, useState } from "react";
import type { PSICatalogEntry, PSIInvestigation } from "../types";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { InvestigationAnimation } from "../components/InvestigationAnimation";
import { SourceList } from "../components/SourceList";
import { ScoreBar } from "../components/ScoreBar";
import { RELEVANCE_RUBRIC } from "../data/reference";
import { scoreBreakdown, weightedRelevance, SCORE_FORMULA } from "../utils/ranking";
import { formatPeriod, formatRange } from "../utils/format";
import { buildJsonBrief, buildMarkdownBrief, downloadText } from "../utils/export";
import { getPSICatalogEntry, NASA_PSI_CATALOG_SUMMARY } from "../data/psiCatalog";
import { PSICatalogSection } from "../components/PSICatalogSection";
import { useLanguage } from "../i18n";

interface Props {
  record: PSIInvestigation | undefined;
  records: PSIInvestigation[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  notFound: boolean;
}

function Unknown({ label }: { label: string }) {
  const { t } = useLanguage();
  return <span className="unknown">{t(label)} {t("not stated in the PSI record")}</span>;
}

export function DetailPage({ record, records, compareIds, onToggleCompare, notFound }: Props) {
  const { t, language } = useLanguage();
  const [catalogState, setCatalogState] = useState<{
    status: "loading" | "loaded" | "error";
    entry?: PSICatalogEntry;
  }>({ status: "loading" });

  useEffect(() => {
    let active = true;
    if (!record) {
      setCatalogState({ status: "error" });
      return () => { active = false; };
    }
    setCatalogState({ status: "loading" });
    getPSICatalogEntry(record.id)
      .then((entry) => {
        if (active) setCatalogState(entry ? { status: "loaded", entry } : { status: "error" });
      })
      .catch(() => {
        if (active) setCatalogState({ status: "error" });
      });
    return () => { active = false; };
  }, [record?.id]);

  if (notFound || !record) {
    return (
      <div className="page">
        <div className="empty">
          <h3>{t("Investigation not found")}</h3>
          <p>{t("That record ID is not in the 24-investigation PSI combustion dataset used by this explorer.")}</p>
          <a className="btn" href="#/explorer">
            {t("Back to the explorer")}
          </a>
        </div>
      </div>
    );
  }

  const score = weightedRelevance(record);
  const related = records
    .filter(
      (item) =>
        item.id !== record.id &&
        ((item.hardware?.sharedHardwareIds ?? []).some((id) =>
          (record.hardware?.sharedHardwareIds ?? []).includes(id),
        ) ||
          item.programFamily === record.programFamily),
    )
    .slice(0, 4);

  const conditions = record.testConditions;
  const exportRecord = (format: "md" | "json") => {
    const now = new Date();
    const title = `PSI brief — ${record.acronym} (${record.id})`;
    const content =
      format === "md"
        ? buildMarkdownBrief([record], { title }, now)
        : buildJsonBrief([record], { title }, now);
    downloadText(
      `psi-${record.id}.${format}`,
      content,
      format === "md" ? "text/markdown" : "application/json",
    );
  };

  return (
    <div className="page">
      <nav className="breadcrumbs" aria-label={t("Breadcrumb")}>
        <a href="#/explorer">{t("Investigation Explorer")}</a>
        <span aria-hidden="true">/</span>
        <span>{record.programFamily ? t(record.programFamily) : t("Unclassified")}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{record.acronym}</span>
      </nav>

      <header className="detail-hero">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <span className="inv-acronym">{record.id}</span>
            <EvidenceBadge status="NASA-reported" />
            <span className="chip chip--muted">{t(record.status ?? "Status unknown")}</span>
          </div>
          <h1 className="detail-title">{t(record.fullTitle)}</h1>
          <p className="detail-lede">
            {t(record.modelingUtility ??
              record.experimentalDesign?.objectives ??
              "No summary statement is provided in the PSI record.")}
          </p>
          <div className="chip-row" style={{ marginTop: 14 }}>
            <span className="chip chip--cyan">{record.programFamily ? t(record.programFamily) : t("Unclassified")}</span>
            <span className="chip">{t(record.fuelSpecs?.phase ?? "Phase unknown")}</span>
            {(record.safetyPillars ?? []).map((pillar) => (
              <span
                key={pillar}
                className={`chip ${
                  pillar === "Detection" ? "chip--amber" : pillar === "Suppression" ? "chip--green" : "chip--cyan"
                }`}
              >
                {t(pillar)}
              </span>
            ))}
            {!(record.safetyPillars ?? []).length && <span className="chip chip--muted">{t("Unclassified")}</span>}
          </div>
          <div className="row" style={{ marginTop: 18, gap: 8 }}>
            <button
              className="btn"
              aria-pressed={compareIds.includes(record.id)}
              onClick={() => onToggleCompare(record.id)}
            >
              {compareIds.includes(record.id) ? t("Remove from compare") : t("Add to compare")}
            </button>
            <a
              className="btn btn--ghost"
              href={`#/assistant?q=${encodeURIComponent(language === "ar" ? `اشرح لي تجربة ${record.acronym} ببساطة باللغة العربية` : `Tell me about ${record.acronym}`)}`}
            >
              {t("Ask the Co-Pilot")}
            </a>
            <button className="btn btn--ghost btn--sm" onClick={() => exportRecord("md")}>
              {t("Export")} .md
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => exportRecord("json")}>
              {t("Export")} .json
            </button>
          </div>
        </div>

        <aside className="detail-side" aria-label={t("Record facts and relevance")}>
          <div>
            <div className="tiny dim" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {t("Editorial relevance")}
            </div>
            <div style={{ marginTop: 5 }}>
              <ScoreBar score={score} />
            </div>
            <p className="tiny dim" style={{ marginTop: 6 }}>
              {t(record.relevanceScores?.rationale ?? "No rationale recorded.")}
            </p>
          </div>
          <div className="divider" style={{ margin: "4px 0" }} />
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">{t("Platform")}</span>
              <span className="kv__val">{record.flightPlatform ? t(record.flightPlatform) : t("Unknown")}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Date information")}</span>
              <span className="kv__val">{formatPeriod(record.investigationPeriod)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Facility")}</span>
              <span className="kv__val">{record.hardware?.facility ? t(record.hardware.facility) : t("Unknown")}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Evidence notes")}</span>
              <span className="kv__val">
                {(record.findings ?? []).length > 0 ? (
                  <>
                    {(record.findings ?? []).length} {t("entries")}{" "}
                    <EvidenceBadge status={record.findingsEvidenceStatus} compact />
                  </>
                ) : (
                  <span className="unknown">{t("Not summarised")}</span>
                )}
              </span>
            </div>
          </div>
          <p className="tiny dim" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            {t(record.statusBasis ?? "Status basis not recorded.")}
          </p>
        </aside>
      </header>

      <InvestigationAnimation record={record} />

      <div className="detail-grid">
        <section className="info-block" aria-labelledby="objectives-heading">
          <h3 id="objectives-heading">
            {t("Objectives & experimental design")}
            <EvidenceBadge status={record.experimentalDesign?.evidenceStatus} compact />
          </h3>
          <p className="prose">
            {record.experimentalDesign?.objectives ? t(record.experimentalDesign.objectives) : <Unknown label="Objectives" />}
          </p>
          {record.experimentalDesign && (
            <div className="kv" style={{ marginTop: 14 }}>
              <div className="kv__row">
                <span className="kv__key">{t("Varied parameters")}</span>
                <span className="kv__val">
                  {(record.experimentalDesign.variedParameters ?? []).map((p) => t(p)).join("; ") || t("Unknown")}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__key">{t("Constant variables")}</span>
                <span className="kv__val">
                  {(record.experimentalDesign.constantVariables ?? []).map((p) => t(p)).join("; ") || t("Unknown")}
                </span>
              </div>
              <div className="kv__row">
                <span className="kv__key">{t("Sensors & diagnostics")}</span>
                <span className="kv__val">
                  {(record.experimentalDesign.sensorsAndDiagnostics ?? []).map((p) => t(p)).join("; ") || t("Unknown")}
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="info-block" aria-labelledby="hardware-heading">
          <h3 id="hardware-heading">
            {t("Hardware & fuel")}
            <EvidenceBadge status={record.hardware?.evidenceStatus} compact />
          </h3>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">{t("Facility")}</span>
              <span className="kv__val">{record.hardware?.facility ? t(record.hardware.facility) : <Unknown label="Facility" />}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Apparatus")}</span>
              <span className="kv__val">{record.hardware?.apparatus ? t(record.hardware.apparatus) : <Unknown label="Apparatus" />}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Shared hardware")}</span>
              <span className="kv__val">
                {(record.hardware?.sharedHardwareIds ?? []).join(", ") || t("None recorded")}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Fuel phase")}</span>
              <span className="kv__val">{record.fuelSpecs?.phase ? t(record.fuelSpecs.phase) : t("Unknown")}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Materials")}</span>
              <span className="kv__val">
                {(record.fuelSpecs?.materials ?? []).map((m) => t(m)).join("; ") || <Unknown label="Materials" />}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Geometry / size")}</span>
              <span className="kv__val">{record.fuelSpecs?.geometryAndSize ? t(record.fuelSpecs.geometryAndSize) : <Unknown label="Geometry" />}</span>
            </div>
          </div>
        </section>

        <section className="info-block" aria-labelledby="conditions-heading">
          <h3 id="conditions-heading">
            {t("Test conditions")}
            <EvidenceBadge status={conditions?.evidenceStatus ?? "Unknown"} compact />
          </h3>
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">{t("Oxygen")}</span>
              <span className="kv__val mono-sm">
                {conditions?.oxygenPercentMin !== undefined || conditions?.oxygenPercentMax !== undefined ? (
                  formatRange(conditions?.oxygenPercentMin, conditions?.oxygenPercentMax, "%")
                ) : (
                  <span className="unknown">{t("Unknown")}</span>
                )}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Pressure")}</span>
              <span className="kv__val mono-sm">
                {conditions?.pressurePsiMin !== undefined || conditions?.pressurePsiMax !== undefined ? (
                  formatRange(conditions?.pressurePsiMin, conditions?.pressurePsiMax, "psia")
                ) : (
                  <span className="unknown">{t("Unknown")}</span>
                )}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Airflow")}</span>
              <span className="kv__val mono-sm">
                {conditions?.airflowCmPerSecondMin !== undefined ||
                conditions?.airflowCmPerSecondMax !== undefined ? (
                  formatRange(
                    conditions?.airflowCmPerSecondMin,
                    conditions?.airflowCmPerSecondMax,
                    "cm/s",
                  )
                ) : (
                  <span className="unknown">{t("Unknown")}</span>
                )}
              </span>
            </div>
            <div className="kv__row">
              <span className="kv__key">{t("Suppressants")}</span>
              <span className="kv__val">
                {(conditions?.suppressantsTested ?? []).join("; ") || t("None stated")}
              </span>
            </div>
          </div>

          {(conditions?.namedConditions ?? []).length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th scope="col">{t("Named condition")}</th>
                    <th scope="col">{t("O2 %")}</th>
                    <th scope="col">{t("Pressure")}</th>
                    <th scope="col">{t("Airflow")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(conditions?.namedConditions ?? []).map((condition) => (
                    <tr key={condition.label}>
                      <td style={{ whiteSpace: "normal" }}>
                        {condition.label}
                        {condition.note && <span className="tiny dim" style={{ display: "block" }}>{condition.note}</span>}
                      </td>
                      <td className="value">{condition.oxygenPercent ?? "—"}</td>
                      <td className="value">
                        {condition.pressurePsi !== undefined ? `${condition.pressurePsi} psia` : "—"}
                      </td>
                      <td className="value">{condition.airflowCmPerSecond !== undefined ? `${condition.airflowCmPerSecond} cm/s` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conditions?.notes && (
            <p className="tiny dim" style={{ marginTop: 10 }}>
              {conditions.notes}
            </p>
          )}
          {!conditions && <p className="unknown tiny" style={{ marginTop: 8 }}>{t("No test-condition block is recorded.")}</p>}
        </section>

        <section className="info-block" aria-labelledby="evidence-summary-heading">
          <h3 id="evidence-summary-heading">
            {t("Evidence summary")}
            <EvidenceBadge status={record.findingsEvidenceStatus ?? "Unknown"} compact />
          </h3>
          <p className="tiny dim" style={{ marginBottom: 10 }}>
            {t("Entries may describe experimental outcomes, methods, planned conditions, or analysis limits. Check each note and its linked sources; not every entry is a quantitative result.")}
          </p>
          {(record.findings ?? []).length > 0 ? (
            <div className="finding-list">
              {(record.findings ?? []).map((finding, index) => (
                <p className="finding" key={index}>
                  {t(finding)}
                </p>
              ))}
            </div>
          ) : (
            <p className="prose">
              <span className="unknown">{t("No evidence-summary entries are available for this record.")}</span>
            </p>
          )}
          {record.findingsNote && (
            <p className="tiny dim" style={{ marginTop: 10 }}>
              {t(record.findingsNote)}
            </p>
          )}
          <div className="divider" />
          <h3 style={{ marginBottom: 8 }}>{t("Modeling utility")}</h3>
          <p className="prose">{record.modelingUtility ? t(record.modelingUtility) : <Unknown label="Modeling utility" />}</p>
          <p className="tiny dim" style={{ marginTop: 6 }}>
            {t("Analyst note: this is an editorial summary of the record's stated relevance, not NASA wording.")}
          </p>
          {(record.terrestrialApplications ?? []).length > 0 && (
            <>
              <h3 style={{ marginTop: 14, marginBottom: 8 }}>{t("Terrestrial applications")}</h3>
              <ul className="prose">
                {(record.terrestrialApplications ?? []).map((application) => (
                  <li key={application}>{t(application)}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">A</span> {t("Relevance breakdown")}
          </h2>
          <span className="section-hint">{t("Editorial — illustrative estimate")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              {scoreBreakdown(record).map((item) => (
                <div key={item.label}>
                  <div className="row row--between tiny">
                    <span className="muted">{t(item.label)}</span>
                    <span className="mono-sm">{item.score ?? "—"}/5</span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 3,
                      background: "rgba(255,255,255,.08)",
                      marginTop: 5,
                      overflow: "hidden",
                    }}
                    role="img"
                    aria-label={`${t(item.label)}: ${item.score ?? "not scored"} out of 5`}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${((item.score ?? 0) / 5) * 100}%`,
                        background: "var(--amber)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div className="tiny dim" style={{ marginTop: 3 }}>
                    {t("weight")} {item.weight}
                  </div>
                </div>
              ))}
            </div>
            <p className="tiny dim" style={{ marginTop: 14 }}>
              {SCORE_FORMULA} {RELEVANCE_RUBRIC.note}
            </p>
            <p className="tiny dim" style={{ marginTop: 4 }}>
              {t("Rationale")}: {t(record.relevanceScores?.rationale ?? "No rationale recorded.")}
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">B</span> {t("Sources")}
          </h2>
          <span className="section-hint">{t("NASA records and technical sources; see locator notes for supporting sections")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <SourceList sources={record.sources} />
            {record.hardware?.sources && record.hardware.sources.length > 0 && (
              <>
                <div className="divider" />
                <p className="tiny dim" style={{ marginBottom: 6 }}>
                  {t("Additional hardware source")}
                </p>
                <SourceList sources={record.hardware.sources} />
              </>
            )}
            {record.testConditions?.sources && record.testConditions.sources.length > 0 && (
              <>
                <div className="divider" />
                <p className="tiny dim" style={{ marginBottom: 6 }}>
                  {t("Additional test-condition source")}
                </p>
                <SourceList sources={record.testConditions.sources} />
              </>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">
              <span className="index">C</span> {t("Related in this dataset")}
            </h2>
            <span className="section-hint">{t("Shared hardware or program family — not a causal link")}</span>
          </div>
          <div className="card-grid">
            {related.map((item) => (
              <a className="inv-card" href={`#/explorer/${item.id}`} key={item.id}>
                <div className="inv-acronym">{item.acronym}</div>
                <span className="inv-title">{t(item.fullTitle)}</span>
                <span className="small muted">{item.programFamily ? t(item.programFamily) : t("Unclassified")}</span>
                <div className="inv-card__foot">
                  <span className="tiny dim">{item.id}</span>
                  <span className="tiny" style={{ color: "var(--cyan)" }}>
                    {t("Open")} →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {catalogState.status === "loaded" && catalogState.entry ? (
        <PSICatalogSection entry={catalogState.entry} retrievedAt={NASA_PSI_CATALOG_SUMMARY.retrievedAt} />
      ) : catalogState.status === "loading" ? (
        <section className="section" aria-labelledby="psi-catalog-loading">
          <div className="panel panel--flat panel-body" role="status">
            <strong id="psi-catalog-loading">{t("Loading the official NASA PSI catalog details…")}</strong>
          </div>
        </section>
      ) : (
        <section className="section" aria-labelledby="psi-catalog-fallback">
          <div className="callout callout--amber">
            <strong id="psi-catalog-fallback">{t("NASA’s full record and file inventory")}</strong>{" "}
            <a href={record.sources[0]?.url} target="_blank" rel="noopener noreferrer">{t("Open the official NASA PSI record")} ↗</a>
          </div>
        </section>
      )}

      <div className="callout callout--amber" style={{ marginTop: 24 }}>
        <strong>{t("Reading this record.")}</strong> {t("PSI metadata is a summary, not the experiment data. Where a field is missing it is marked Unknown. This page does not calculate fire risk, and comparisons across different facilities, fuels or configurations are not physically equivalent without a validated model.")}
      </div>
    </div>
  );
}

