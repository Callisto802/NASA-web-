import { useMemo, useState, type FormEvent } from "react";
import type { PSIInvestigation, SafetyPillar } from "../types";
import {
  ACME_PROGRAM_FACTS,
  DATASET_META,
  HISTORICAL_EVENTS,
  LEAD_VERIFICATION,
  RELEVANCE_RUBRIC,
  TECHNOLOGY_TRANSFER,
  LUCI_FACTS,
} from "../data/reference";
import { weightedRelevance, SCORE_FORMULA, type WeightMap } from "../utils/ranking";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { ScoreBar } from "../components/ScoreBar";
import { navigate } from "../lib/router";
import { NASA_PSI_CATALOG_SUMMARY } from "../data/psiCatalog";
import { useLanguage } from "../i18n";

interface Props {
  records: PSIInvestigation[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}

const PROFILES: Array<{
  id: string;
  label: string;
  description: string;
  weights: WeightMap;
}> = [
  {
    id: "spacecraft",
    label: "Spacecraft fire safety",
    description:
      "Prioritises habitable-spacecraft relevance and suppression/detection hardware. Weighting: spacecraft 35%, habitat 20%, modeling 20%, equipment 20%, terrestrial 5%.",
    weights: {
      habitableSpacecraft: 0.35,
      explorationHabitat: 0.2,
      predictiveModeling: 0.2,
      equipmentDesign: 0.2,
      terrestrialApplications: 0.05,
    },
  },
  {
    id: "habitat",
    label: "Exploration habitat",
    description:
      "Prioritises long-duration habitat and material-selection questions. Weighting: habitat 40%, spacecraft 20%, modeling 15%, equipment 20%, terrestrial 5%.",
    weights: {
      habitableSpacecraft: 0.2,
      explorationHabitat: 0.4,
      predictiveModeling: 0.15,
      equipmentDesign: 0.2,
      terrestrialApplications: 0.05,
    },
  },
  {
    id: "research",
    label: "Modeling & research",
    description:
      "Prioritises predictive-model value and benchmark data. Weighting: modeling 55%, spacecraft 15%, habitat 10%, equipment 10%, terrestrial 10%.",
    weights: {
      habitableSpacecraft: 0.15,
      explorationHabitat: 0.1,
      predictiveModeling: 0.55,
      equipmentDesign: 0.1,
      terrestrialApplications: 0.1,
    },
  },
  {
    id: "terrestrial",
    label: "Terrestrial applications",
    description:
      "Prioritises Earth-benefit and combustion-science relevance. Weighting: terrestrial 50%, modeling 20%, equipment 15%, spacecraft 10%, habitat 5%.",
    weights: {
      habitableSpacecraft: 0.1,
      explorationHabitat: 0.05,
      predictiveModeling: 0.2,
      equipmentDesign: 0.15,
      terrestrialApplications: 0.5,
    },
  },
];

const PILLARS: SafetyPillar[] = ["Prevention", "Detection", "Suppression"];

function countUniqueSources(records: PSIInvestigation[]): number {
  const urls = new Set<string>();
  for (const record of records) {
    for (const source of record.sources) urls.add(source.url);
    for (const block of [
      record.hardware,
      record.fuelSpecs,
      record.testConditions,
      record.experimentalDesign,
    ]) {
      for (const source of block?.sources ?? []) urls.add(source.url);
    }
  }
  return urls.size;
}

export function OverviewPage({ records, compareIds, onToggleCompare }: Props) {
  const { t } = useLanguage();
  const [profileId, setProfileId] = useState("spacecraft");
  const [question, setQuestion] = useState("");
  const profile = PROFILES.find((item) => item.id === profileId) ?? PROFILES[0];

  const ranked = useMemo(
    () =>
      [...records]
        .map((record) => ({ record, score: weightedRelevance(record, profile.weights) }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
    [records, profile.weights],
  );

  const quantified = records.filter((record) =>
    Boolean(
      record.testConditions &&
        (record.testConditions.oxygenPercentMin !== undefined ||
          record.testConditions.oxygenPercentMax !== undefined ||
          record.testConditions.pressurePsiMin !== undefined ||
          record.testConditions.pressurePsiMax !== undefined ||
          record.testConditions.airflowCmPerSecondMin !== undefined ||
          record.testConditions.airflowCmPerSecondMax !== undefined ||
          (record.testConditions.namedConditions ?? []).length > 0),
    ),
  ).length;
  const withEvidenceSummaries = records.filter((record) => (record.findings ?? []).length > 0).length;
  const sourceCount = countUniqueSources(records);
  const publicationEntryCount = NASA_PSI_CATALOG_SUMMARY.publicationEntries;
  const tableFileCount = NASA_PSI_CATALOG_SUMMARY.tableFileEntries;

  const pillarCounts = PILLARS.map((pillar) => ({
    pillar,
    count: records.filter((record) => (record.safetyPillars ?? []).includes(pillar)).length,
  }));
  const unclassified = records.filter((record) => (record.safetyPillars ?? []).length === 0).length;

  const phaseCounts = ["Solid", "Liquid", "Gaseous", "Simulated", "Unknown"].map((phase) => ({
    phase,
    count: records.filter((record) => (record.fuelSpecs?.phase ?? "Unknown") === phase).length,
  }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (question.trim()) {
      navigate(`/assistant?mode=local&q=${encodeURIComponent(question.trim())}`);
    }
  };

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__grid">
          <div>
            <div className="eyebrow">{t("NASA Physical Sciences Informatics · Combustion Science")}</div>
            <h1 className="hero-title">
              {t("Fire behaves differently")}
              <br />
              {t("when gravity")} <em>{t("lets go")}</em>.
            </h1>
            <p className="hero-lede">{t("Explore 24 NASA PSI combustion investigations — solid fuels, droplets, diffusion flames, smoke and suppression — with sourced evidence labels, side-by-side comparisons, a local dataset lookup, and an open-topic Gemini assistant that cites NASA records when relevant. Built for students, researchers and engineers; not a fire-safety calculator.")}</p>
            <div className="hero-meta">
              <span className="chip chip--cyan">{t("24 PSI investigations")}</span>
              <span className="chip chip--amber">{sourceCount} {t("unique cited source URLs")}</span>
              <span className="chip chip--muted">{t("Metadata retrieved")} {DATASET_META.retrievedAt}</span>
            </div>
          </div>
          <div className="hero-side">
            <div className="hero-side__row">
              <span>{t("PSI research area")}</span>
              <span>{DATASET_META.researchArea}</span>
            </div>
            <div className="hero-side__row">
              <span>{t("Flight platforms")}</span>
              <span>ISS · Cygnus</span>
            </div>
            <div className="hero-side__row">
              <span>{t("Records with numeric conditions")}</span>
              <span>
                {quantified}/{records.length}
              </span>
            </div>
            <div className="hero-side__row">
              <span>{t("Records with evidence summaries")}</span>
              <span>
                {withEvidenceSummaries}/{records.length}
              </span>
            </div>
            <div className="hero-side__row">
              <span>{t("Assistant")}</span>
              <span>{t("Local · deterministic")}</span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <div className="scope-banner">
          <span className="scope-banner__icon" aria-hidden="true">
            i
          </span>
          <p>
            <strong>{t("Scope boundary.")}</strong> {t("This explorer covers the 24 investigations NASA PSI classifies under Combustion Science (see the")}{" "}
            <a href={DATASET_META.psiSearchUrl} target="_blank" rel="noopener noreferrer">
              PSI repository search
            </a>
            ), {t("focused on spacecraft fire safety and combustion science. Propulsion system development is outside this application's scope; that is a scoping decision for this explorer, not a statement that NASA excludes propulsion from its combustion program. This explorer uses PSI investigation metadata and links to NASA-hosted experimental tables and publications. Original raw files stay in NASA’s repository; this site does not bundle or independently re-analyze the experiment data.")}
          </p>
        </div>
      </div>

      <section className="section">
        <div className="stat-grid">
          <div className="stat stat--cyan">
            <span className="stat__value">{records.length}</span>
            <span className="stat__label">{t("Investigations")}</span>
            <span className="stat__hint">{t("PSI Combustion Science records")}</span>
          </div>
          <div className="stat">
            <span className="stat__value">{sourceCount}</span>
            <span className="stat__label">{t("Unique cited source URLs")}</span>
            <span className="stat__hint">{t("PSI records, NASA pages, NTRS reports")}</span>
          </div>
          <div className="stat stat--amber">
            <span className="stat__value">{quantified}</span>
            <span className="stat__label">{t("With quantified conditions")}</span>
            <span className="stat__hint">{t("O2, pressure or airflow ranges")}</span>
          </div>
          <div className="stat stat--green">
            <span className="stat__value">{withEvidenceSummaries}</span>
            <span className="stat__label">{t("With evidence summaries")}</span>
            <span className="stat__hint">{t("May cover outcomes, methods, or limitations")}</span>
          </div>
          <div className="stat stat--cyan">
            <span className="stat__value">{publicationEntryCount}</span>
            <span className="stat__label">{t("NASA PSI publication entries")}</span>
            <span className="stat__hint">{t("Citations and DOI links in investigation records")}</span>
          </div>
          <div className="stat">
            <span className="stat__value">{tableFileCount}</span>
            <span className="stat__label">{t("NASA-hosted table files")}</span>
            <span className="stat__hint">{t("Download directly from each official PSI record")}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">01</span> {t("Ranked investigations")}
          </h2>
          <span className="section-hint">{t("Editorial ranking — not NASA data")}</span>
        </div>

        <div className="panel panel--flat">
          <div className="panel-body">
            <div className="profile-bar">
              <span className="profile-label">{t("Profile")}</span>
              <div className="toggle-row" role="group" aria-label={t("Relevance profile")}>
                {PROFILES.map((item) => (
                  <button
                    key={item.id}
                    className="toggle-pill"
                    aria-pressed={item.id === profileId}
                    onClick={() => setProfileId(item.id)}
                  >
                    {t(item.label)}
                  </button>
                ))}
              </div>
              <p className="profile-desc">{t(profile.description)}</p>
            </div>

            <div className="callout small">
              <strong>{t("Ranking formula.")}</strong> {SCORE_FORMULA} {t("Default weights are shown; the profile above")}
              substitutes its own weights. Scores are 0–5 and are explained per investigation.{" "}
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => document.getElementById("ranking-rubric")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("See rubric")}
              </button>
            </div>

            <div className="card-grid" style={{ marginTop: 16 }}>
              {ranked.slice(0, 6).map(({ record, score }, index) => (
                <article className="inv-card" key={record.id}>
                  <div className="inv-card__top">
                    <div>
                      <div className="inv-card__rank">{t("Rank")} {String(index + 1).padStart(2, "0")}</div>
                      <div className="inv-acronym">{record.acronym}</div>
                    </div>
                    <ScoreBar score={score} />
                  </div>
                  <a className="inv-title" href={`#/explorer/${record.id}`}>
                    {t(record.fullTitle)}
                  </a>
                   <p className="inv-desc">{t(record.relevanceScores?.rationale ?? record.modelingUtility ?? "")}</p>
                  <div className="chip-row">
                    <span className="chip chip--muted">{record.fuelSpecs?.phase ? t(record.fuelSpecs.phase) : t("Unknown")}</span>
                    {(record.safetyPillars ?? []).slice(0, 2).map((pillar) => (
                      <span
                        key={pillar}
                        className={`chip ${
                          pillar === "Detection"
                            ? "chip--amber"
                            : pillar === "Suppression"
                              ? "chip--green"
                              : "chip--cyan"
                        }`}
                      >
                        {t(pillar)}
                      </span>
                    ))}
                    {!(record.safetyPillars ?? []).length && <span className="chip chip--muted">{t("Unclassified")}</span>}
                  </div>
                  <div className="inv-card__foot">
                    <span className="tiny dim">
                      {record.id} · {record.programFamily ? t(record.programFamily) : t("Unclassified")}
                    </span>
                    <button
                      className="btn btn--sm"
                      aria-pressed={compareIds.includes(record.id)}
                      onClick={() => onToggleCompare(record.id)}
                    >
                      {compareIds.includes(record.id) ? t("In compare") : t("Compare")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <a className="btn" href="#/explorer">
                {t("Open the full explorer →")}
              </a>
              <span className="tiny dim">
                {t("Ranked by the selected profile. Scores and rubric are shown on each record.")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">02</span> {t("Dataset coverage")}
          </h2>
          <span className="section-hint">{t("Counts of records, not measurements")}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          <div className="panel panel--flat">
            <div className="panel-head">
              <h3>{t("Safety pillars")}</h3>
              <span className="panel-caption">{t("A record may serve several")}</span>
            </div>
            <div className="panel-body stack">
              {pillarCounts.map(({ pillar, count }) => (
                <div key={pillar}>
                  <div className="row row--between tiny" style={{ marginBottom: 4 }}>
                    <span className="mono-sm">{t(pillar)}</span>
                    <span className="mono-sm">{count}</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,.07)",
                      overflow: "hidden",
                    }}
                    role="img"
                    aria-label={`${pillar}: ${count} of ${records.length} investigations`}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(count / records.length) * 100}%`,
                        background:
                          pillar === "Detection"
                            ? "var(--amber)"
                            : pillar === "Suppression"
                              ? "var(--green)"
                              : "var(--cyan)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="row row--between tiny dim">
                <span>{t("Unclassified (no pillar assigned)")}</span>
                <span className="mono-sm">{unclassified}</span>
              </div>
              <p className="tiny dim">
                {t("Pillar assignment is the dataset author's classification, not a NASA label.")}
              </p>
            </div>
          </div>

          <div className="panel panel--flat">
            <div className="panel-head">
              <h3>{t("Fuel phase")}</h3>
              <span className="panel-caption">{t("From PSI fuel descriptions")}</span>
            </div>
            <div className="panel-body stack">
              {phaseCounts.map(({ phase, count }) => (
                <div key={phase}>
                  <div className="row row--between tiny" style={{ marginBottom: 4 }}>
                    <span className="mono-sm">{t(phase)}</span>
                    <span className="mono-sm">{count}</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "rgba(255,255,255,.07)",
                      overflow: "hidden",
                    }}
                    role="img"
                    aria-label={`${phase}: ${count} of ${records.length} investigations`}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(count / records.length) * 100}%`,
                        background: phase === "Unknown" ? "var(--dim)" : "var(--cyan)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="tiny dim">
                {t("Unknown means the PSI summary does not state a phase; it is not treated as a fuel type.")}
              </p>
            </div>
          </div>

          <div className="panel panel--flat">
            <div className="panel-head">
              <h3>{t("Program families")}</h3>
              <span className="panel-caption">{t("Grouping used by this explorer")}</span>
            </div>
            <div className="panel-body">
              <div className="stack">
                {Array.from(new Set(records.map((record) => record.programFamily ?? "Unclassified"))).map(
                  (family) => {
                    const count = records.filter(
                      (record) => (record.programFamily ?? "Unclassified") === family,
                    ).length;
                    return (
                      <div className="row row--between" key={family}>
                        <span className="small muted">{family}</span>
                        <span className="mono-sm dim">{count}</span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">03</span> {t("Sourced timeline")}
          </h2>
          <span className="section-hint">{t("Historical context is separate from experimental relevance")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <p className="small muted" style={{ marginBottom: 16 }}>
              {t("Each entry is sourced. Historical incidents are shown as context only: no source reviewed for this explorer states that Apollo 1, Apollo 13 or the 1997 Mir fire motivated a specific PSI investigation.")}
            </p>
            <div className="timeline">
              {HISTORICAL_EVENTS.map((event) => (
                <div className="timeline-item timeline-item--context" key={event.id}>
                  <div className="timeline-date mono">{event.date} · HISTORICAL CONTEXT</div>
                  <div className="timeline-title">{event.title}</div>
                  <p className="timeline-body">{t(event.summary)}</p>
                  <p className="timeline-body" style={{ marginTop: 4 }}>
                    <span className="dim">{t("Lesson:")}</span> {t(event.lesson)}
                  </p>
                  <a
                    className="source__url"
                    href={event.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {event.source.title} ↗
                  </a>
                </div>
              ))}
              <div className="timeline-item">
                <div className="timeline-date mono">2017–2021 · ACME</div>
                <div className="timeline-title">Six ACME experiments run on the ISS</div>
                <p className="timeline-body">
                  NASA reports in-orbit ACME testing began in 2017 and included six experiments. The
                  hardware was later removed from the Combustion Integrated Rack to make room for SoFIE.{" "}
                  {ACME_PROGRAM_FACTS.note}
                </p>
                <a
                  className="source__url"
                  href={ACME_PROGRAM_FACTS.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ACME_PROGRAM_FACTS.source.title} ↗
                </a>
              </div>
              <div className="timeline-item">
                <div className="timeline-date mono">2025-02-04 · LUCI (non-PSI)</div>
                <div className="timeline-title">First extended-duration lunar-gravity burns</div>
                <p className="timeline-body">{LUCI_FACTS.summary}</p>
                <a
                  className="source__url"
                  href={LUCI_FACTS.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {LUCI_FACTS.source.title} ↗
                </a>
              </div>
              <div className="timeline-item timeline-item--context">
                <div className="timeline-date mono">Planned (as of Dec 2025) · FM2 (non-PSI)</div>
                <div className="timeline-title">Flammability of Materials on the Moon</div>
                <p className="timeline-body">
                  NASA describes FM2 as the first combustion experiment on another planetary body, and
                  currently lists it under current experiments on its Combustion Science page. A December
                  2025 NASA presentation described a planned late-2026 launch; launch status is not asserted
                  here and should be re-checked against NASA.
                </p>
                <a
                  className="source__url"
                  href={LUCI_FACTS.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LUCI/FM2 presentation ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="ranking-rubric">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">04</span> {t("Relevance rubric")}
          </h2>
          <span className="section-hint">{t("Editorial, documented, and separate from results")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <p className="small muted" style={{ marginBottom: 12 }}>
              {t(RELEVANCE_RUBRIC.note)}
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Score</th>
                    <th scope="col">Label</th>
                    <th scope="col">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {RELEVANCE_RUBRIC.scale.map((row) => (
                    <tr key={row.score}>
                      <td className="value">{row.score}</td>
                      <td>{row.label}</td>
                      <td>{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Dimension</th>
                    <th scope="col">Default weight</th>
                    <th scope="col">What the score asks</th>
                  </tr>
                </thead>
                <tbody>
                  {RELEVANCE_RUBRIC.dimensions.map((dimension, index) => (
                    <tr key={dimension.key}>
                      <td>{dimension.label}</td>
                      <td className="value">{dimension.weight.toFixed(2)}</td>
                      <td>
                        {[
                          "How directly the investigation informs fire behaviour or safety in a crewed spacecraft.",
                          "How directly it informs long-duration habitat material and atmosphere decisions.",
                          "How strongly it supports validated predictive models of flame spread, extinction or smoke.",
                          "How directly it informs detection, suppression or test hardware design.",
                          "How clearly its results transfer to Earth applications.",
                        ][index]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="table-caption">
                {t("Default weights are used on the Compare page. Profile weights on this page replace them proportionally; the rubric text is unchanged.")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">05</span> {t("Technology transfer (separate from PSI)")}
          </h2>
          <span className="section-hint">{t("Distinct Spinoff examples — no PSI connection claimed")}</span>
        </div>
        <div className="card-grid">
          {TECHNOLOGY_TRANSFER.map((item) => (
            <article className="panel panel--flat" key={item.id}>
              <div className="panel-body">
                <div className="row row--between" style={{ marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15 }}>{t(item.title)}</h3>
                  <EvidenceBadge status={item.evidenceStatus} compact />
                </div>
                <p className="small muted">{t(item.summary)}</p>
                <p className="small muted" style={{ marginTop: 8 }}>
                  <span className="dim">{t("NASA origin:")}</span> {t(item.nasaOrigin)}
                </p>
                <p className="tiny dim" style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                  {t(item.caveat)}
                </p>
                <a className="source__url" href={item.source.url} target="_blank" rel="noopener noreferrer">
                  {item.source.title} ({item.source.publishedAt}) ↗
                </a>
                {(item.additionalSources ?? []).map((source) => (
                  <a key={source.url} className="source__url" href={source.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 10 }}>
                    {source.title} ↗
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">06</span> {t("Lead verification")}
          </h2>
          <span className="section-hint">{t("Every name in the brief checked before inclusion")}</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">{t("Lead")}</th>
                <th scope="col">{t("Verdict")}</th>
                <th scope="col">{t("Basis")}</th>
              </tr>
            </thead>
            <tbody>
              {LEAD_VERIFICATION.map((lead) => (
                <tr key={lead.lead}>
                  <td style={{ color: "var(--text)" }}>{t(lead.lead)}</td>
                  <td>
                    <span
                      className={`chip ${
                        lead.verdict === "In PSI dataset"
                          ? "chip--green"
                          : lead.verdict === "Not verified"
                            ? "chip--red"
                            : "chip--amber"
                      }`}
                    >
                      {t(lead.verdict)}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)" }}>
                    {t(lead.detail)}
                    {lead.investigationId && (
                      <>
                        {" "}
                        <a href={`#/explorer/${lead.investigationId}`}>Open record →</a>
                      </>
                    )}
                    {lead.source && (
                      <>
                        {" "}
                        <a href={lead.source.url} target="_blank" rel="noopener noreferrer">
                          Source ↗
                        </a>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-caption">
            {t("Leads are treated as research leads, not pre-verified facts. Not in PSI dataset means the work is official NASA activity but is not one of the 24 PSI Combustion Science metadata records.")}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <div className="panel-body">
            <div className="row row--between" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {t("SI Research Co-Pilot")}
                </div>
                <h2 style={{ fontSize: 20 }}>{t("Ask the dataset")}</h2>
                <p className="muted small" style={{ maxWidth: 620, marginTop: 6 }}>
                  {t("A local, deterministic search over these 24 records. It cites the investigations it uses and says when the dataset does not contain enough information. No API key, no external model.")}
                </p>
              </div>
            </div>
            <form className="assistant-input-row" onSubmit={onSubmit} style={{ marginTop: 14 }}>
              <label className="sr-only" htmlFor="overview-ask">
                {t("Search the dataset with a question")}
              </label>
              <input
                id="overview-ask"
                className="input"
                placeholder={t("e.g. Which investigations studied solid-material flammability?")}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <button className="btn btn--primary" type="submit">
                {t("Search →")}
              </button>
            </form>
            <p className="tiny dim" style={{ marginTop: 8 }}>
              {t("This box uses the offline dataset lookup.")} {" "}
              <a href="#/assistant">
                {t("Ask the Gemini science assistant for a plain-language explanation →")}
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
