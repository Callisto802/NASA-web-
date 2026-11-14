import { useMemo, useState } from "react";
import type { AtmosphereLabState, EnvironmentPresetId, PSIInvestigation } from "../types";
import {
  CONCEPTS,
  DATASET_META,
  E_FIELD_GRAVITY_NOTE,
  EXPLORATION_ATMOSPHERES,
  GRAVITY_LEVELS,
  LUNAR_FIRE_SAFETY,
  LUCI_FACTS,
  REFERENCE_ATMOSPHERES,
} from "../data/reference";
import { RangeChart, EnvelopeScatter } from "../components/charts/ConditionChart";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { formatNumber } from "../utils/format";
import { downloadText } from "../utils/export";
import { useLanguage } from "../i18n";
import { ENVIRONMENT_PRESETS } from "../utils/fireRisk";
import { FireRiskCalculator } from "../components/atmosphere/FireRiskCalculator";
import { PartialGravityAnalysis } from "../components/atmosphere/PartialGravityAnalysis";

interface Props {
  records: PSIInvestigation[];
  labState?: AtmosphereLabState;
  onLabStateChange?: (state: AtmosphereLabState) => void;
  onOpenAuditModal?: () => void;
}

interface ScenarioPoint {
  id: string;
  label: string;
  oxygenPercent: number;
  pressurePsi: number;
  sourceUrl: string;
  sourceTitle: string;
  kind: "record-range" | "record-point" | "reference";
}

const GRAVITY_OPTIONS = [
  { id: "microgravity", label: "Microgravity (~0g)", ratio: 0 },
  { id: "lunar", label: "Lunar (~0.165g)", ratio: 0.165 },
  { id: "mars", label: "Martian (~0.38g)", ratio: 0.38 },
  { id: "earth", label: "Earth (1g)", ratio: 1 },
];

export function AtmospherePage({
  records,
  labState: propLabState,
  onLabStateChange,
  onOpenAuditModal,
}: Props) {
  const { t } = useLanguage();
  const [internalState, setInternalState] = useState<AtmosphereLabState>({
    preset: "lunar",
    pressurePsi: 8.2,
    oxygenPercent: 34.0,
    airflowCmPerSecond: 10.0,
    gravityG: 0.166,
  });

  const labState = propLabState ?? internalState;
  const updateLabState = (next: AtmosphereLabState) => {
    if (onLabStateChange) onLabStateChange(next);
    else setInternalState(next);
  };

  const oxygen = labState.oxygenPercent;
  const pressure = labState.pressurePsi;
  const gravityId =
    labState.gravityG === 0
      ? "microgravity"
      : labState.gravityG < 0.2
        ? "lunar"
        : labState.gravityG < 0.5
          ? "mars"
          : "earth";

  const applyPreset = (presetId: EnvironmentPresetId) => {
    const p = ENVIRONMENT_PRESETS[presetId];
    if (!p) return;
    updateLabState({
      preset: presetId,
      pressurePsi: p.pressurePsi,
      oxygenPercent: p.oxygenPercent,
      airflowCmPerSecond: p.airflowCmPerSecond,
      gravityG: p.gravityG,
      customLabel: presetId === "custom" ? "Custom Environment" : undefined,
    });
  };

  const po2Psi = labState.pressurePsi * (labState.oxygenPercent / 100);
  const po2Kpa = po2Psi * 6.89476;

  const points: ScenarioPoint[] = useMemo(() => {
    const result: ScenarioPoint[] = [];
    for (const record of records) {
      const conditions = record.testConditions;
      if (!conditions) continue;
      const hasO2 =
        conditions.oxygenPercentMin !== undefined && conditions.oxygenPercentMax !== undefined;
      const hasPressure =
        conditions.pressurePsiMin !== undefined && conditions.pressurePsiMax !== undefined;
      if (hasO2 && hasPressure) {
        result.push({
          id: record.id,
          label: `${record.acronym} (range midpoint)`,
          oxygenPercent: ((conditions.oxygenPercentMin ?? 0) + (conditions.oxygenPercentMax ?? 0)) / 2,
          pressurePsi: ((conditions.pressurePsiMin ?? 0) + (conditions.pressurePsiMax ?? 0)) / 2,
          sourceUrl: record.sources[0]?.url ?? "#",
          sourceTitle: record.sources[0]?.title ?? record.fullTitle,
          kind: "record-range",
        });
      }
      for (const condition of conditions.namedConditions ?? []) {
        if (condition.oxygenPercent === undefined || condition.pressurePsi === undefined) continue;
        if (record.id === "PSI-20") continue; // duplicates REFERENCE_ATMOSPHERES
        result.push({
          id: `${record.id}-${condition.label}`,
          label: `${record.acronym} — ${condition.label}`,
          oxygenPercent: condition.oxygenPercent,
          pressurePsi: condition.pressurePsi,
          sourceUrl: record.sources[0]?.url ?? "#",
          sourceTitle: record.sources[0]?.title ?? record.fullTitle,
          kind: "record-point",
        });
      }
    }
    for (const reference of REFERENCE_ATMOSPHERES) {
      result.push({
        id: reference.id,
        label: reference.label,
        oxygenPercent: reference.oxygenPercent,
        pressurePsi: reference.pressurePsi,
        sourceUrl: reference.source.url,
        sourceTitle: reference.source.title,
        kind: "reference",
      });
    }
    return result;
  }, [records]);

  /**
   * Illustrative proximity metric. Normalised by the chart domains (100% O2,
   * 48 psia) so that the two axes contribute comparably. This is an editorial
   * aid, not a physical model.
   */
  const nearest = useMemo(() => {
    return points
      .map((point) => {
        const dO2 = (oxygen - point.oxygenPercent) / 100;
        const dP = (pressure - point.pressurePsi) / 48;
        return { point, distance: Math.sqrt(dO2 * dO2 + dP * dP) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [points, oxygen, pressure]);

  const gravity = GRAVITY_OPTIONS.find((option) => option.id === gravityId) ?? GRAVITY_OPTIONS[0];
  const gravityLevel = GRAVITY_LEVELS.find((level) => level.id === gravityId);

  const exportScenario = () => {
    const now = new Date();
    const lines = [
      "# Illustrative atmosphere & gravity scenario",
      "",
      `Generated: ${now.toISOString()}`,
      "",
      "> Not a fire-risk prediction. This is a position on a sourced data plot, not a validated model output.",
      "",
      "## Inputs",
      "",
      `- Oxygen: ${formatNumber(oxygen, 1)} % (user-entered)`,
      `- Pressure: ${formatNumber(pressure, 1)} psia (user-entered)`,
      `- Gravity: ${gravity.label} (user-selected)`,
      "",
      "## Gravity data status",
      "",
      gravityLevel ? `- ${gravityLevel.dataStatus}: ${gravityLevel.detail}` : "- Not available.",
      "",
      "## Nearest documented conditions (Derived)",
      "",
      "Distance formula: sqrt( ((O2 − point O2)/100)^2 + ((pressure − point pressure)/48)^2 ). Domains 100% and 48 psia are chart bounds, not physical constants.",
      "",
      ...nearest.map(
        (item) =>
          `- ${item.point.label}: ${formatNumber(item.point.oxygenPercent, 1)}% O2, ${formatNumber(item.point.pressurePsi, 1)} psia — normalised distance ${item.distance.toFixed(3)} (${item.point.sourceTitle})`,
      ),
      "",
      "## Sources",
      "",
      ...nearest.map((item) => `- [${item.point.sourceTitle}](${item.point.sourceUrl})`),
      "",
      "## Limits",
      "",
      DATASET_META.limitations,
      "",
      "Oxygen concentration alone does not determine fire risk. Pressure, material, geometry, airflow, ignition and test configuration also matter.",
      "",
    ];
    downloadText("psi-scenario.md", lines.join("\n"), "text/markdown");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("Atmosphere & Gravity")}</div>
          <h1 className="page-title">{t("Lunar Habitat Atmosphere Lab & Fire Safety Intelligence")}</h1>
          <p className="page-lede">
            {t("Configure spacecraft and planetary habitat environments, evaluate heuristic fire risk indices, and analyze empirical microgravity evidence from the NASA PSI repository.")}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {onOpenAuditModal && (
            <button className="btn btn--primary" onClick={onOpenAuditModal} style={{ boxShadow: "0 0 12px rgba(74,214,232,0.3)" }}>
              ★ {t("GENERATE NASA SAFETY AUDIT BRIEF")}
            </button>
          )}
          <div className="chip chip--cyan">{t("Atmosphere Lab Active")}</div>
        </div>
      </div>

      <div className="scope-banner" style={{ marginBottom: 18 }}>
        <span className="scope-banner__icon" aria-hidden="true">
          !
        </span>
        <p>
          <strong>{t("Do not read this page as a fire-safety envelope.")}</strong> {t("Oxygen concentration alone does not determine fire risk: pressure, material, geometry, airflow, ignition source and test configuration also matter. BASS-II, for example, mapped a U-shaped flammability boundary as flow and oxygen changed, and ACME BRE examined three different pressure/oxygen combinations.")}
        </p>
      </div>

      {/* Lunar Habitat Atmosphere Lab Environment Configurator */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <div>
            <h2>{t("Atmosphere Lab Environment Configurator")}</h2>
            <span className="panel-caption">{t("Planetary Habitat & Spacecraft Presets")}</span>
          </div>
          {onOpenAuditModal && (
            <button className="btn btn--sm btn--primary" onClick={onOpenAuditModal}>
              {t("Generate Audit Brief")} ↗
            </button>
          )}
        </div>
        <div className="panel-body stack">
          {/* Preset Buttons */}
          <div>
            <div className="tiny dim" style={{ textTransform: "uppercase", marginBottom: 8 }}>
              {t("Environment Presets")}
            </div>
            <div className="chip-row" role="radiogroup" aria-label={t("Environment Presets")}>
              {(Object.keys(ENVIRONMENT_PRESETS) as EnvironmentPresetId[]).map((pKey) => {
                const preset = ENVIRONMENT_PRESETS[pKey];
                const isActive = labState.preset === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`chip ${isActive ? "chip--cyan" : "chip--muted"}`}
                    style={{ cursor: "pointer", padding: "6px 12px" }}
                    onClick={() => applyPreset(pKey)}
                  >
                    <strong>{t(preset.label)}</strong>
                    {preset.isOfficialNasaSpec && <span className="tiny" style={{ color: "var(--cyan)" }}>★</span>}
                  </button>
                );
              })}
            </div>
            <p className="tiny dim" style={{ marginTop: 6 }}>
              {t(ENVIRONMENT_PRESETS[labState.preset]?.description ?? "")}
              {ENVIRONMENT_PRESETS[labState.preset]?.isOfficialNasaSpec && (
                <strong style={{ color: "var(--cyan)", marginLeft: 6 }}>({t("Official NASA Specification Reference")})</strong>
              )}
            </p>
          </div>

          <div className="divider" />

          {/* 4 Interactive Sliders */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
            }}
          >
            {/* Cabin Pressure */}
            <div className="field">
              <label htmlFor="scenario-pressure">
                {t("Cabin Pressure")} <span className="mono-sm">({labState.pressurePsi.toFixed(1)} psia / {(labState.pressurePsi * 6.89476).toFixed(1)} kPa)</span>
              </label>
              <input
                type="range"
                id="scenario-pressure"
                min={3.0}
                max={15.0}
                step={0.1}
                value={labState.pressurePsi}
                onChange={(e) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    pressurePsi: Number(e.target.value),
                  })
                }
              />
              <div className="row row--between tiny dim">
                <span>3.0 psia (Min)</span>
                <span>8.2 (Lunar)</span>
                <span>15.0 psia (Max)</span>
              </div>
            </div>

            {/* Oxygen Concentration */}
            <div className="field">
              <label htmlFor="scenario-o2">
                {t("Oxygen Concentration")} <span className="mono-sm">({labState.oxygenPercent.toFixed(1)}% O₂)</span>
              </label>
              <input
                type="range"
                id="scenario-o2"
                min={20.0}
                max={100.0}
                step={0.5}
                value={labState.oxygenPercent}
                onChange={(e) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    oxygenPercent: Number(e.target.value),
                  })
                }
              />
              <div className="row row--between tiny dim">
                <span>20% (Earth)</span>
                <span>34% (Lunar)</span>
                <span>100% (Pure O2)</span>
              </div>
            </div>

            {/* Forced Airflow Velocity */}
            <div className="field">
              <label htmlFor="scenario-airflow">
                {t("Airflow Velocity")} <span className="mono-sm">({labState.airflowCmPerSecond.toFixed(1)} cm/s)</span>
              </label>
              <input
                type="range"
                id="scenario-airflow"
                min={0}
                max={50}
                step={1}
                value={labState.airflowCmPerSecond}
                onChange={(e) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    airflowCmPerSecond: Number(e.target.value),
                  })
                }
              />
              <div className="row row--between tiny dim">
                <span>0 (Quiescent)</span>
                <span>10 (Ventilation)</span>
                <span>50 cm/s (Max)</span>
              </div>
            </div>

            {/* Gravity Field */}
            <div className="field">
              <label htmlFor="scenario-gravity">
                {t("Gravity Level")} <span className="mono-sm">({labState.gravityG.toFixed(3)}g)</span>
              </label>
              <input
                type="range"
                id="scenario-gravity"
                min={0}
                max={1.0}
                step={0.01}
                value={labState.gravityG}
                onChange={(e) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    gravityG: Number(e.target.value),
                  })
                }
              />
              <div className="row row--between tiny dim">
                <span>0g (Orbit)</span>
                <span>0.166g (Moon)</span>
                <span>1.0g (Earth)</span>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginTop: 10,
            }}
          >
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="tiny dim">{t("Oxygen Partial Pressure (P_O2)")}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--cyan)", marginTop: 4 }}>
                {po2Psi.toFixed(2)} psia <span className="small dim">({po2Kpa.toFixed(1)} kPa)</span>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="tiny dim">{t("Gravity Regime")}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                {labState.gravityG === 0 ? "Microgravity (~0g)" : labState.gravityG < 0.2 ? "Lunar Gravity (0.166g)" : labState.gravityG < 0.5 ? "Martian Gravity (0.38g)" : "Terrestrial (1.0g)"}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="tiny dim">{t("Convection State")}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                {labState.airflowCmPerSecond === 0 && labState.gravityG === 0 ? t("Pure Diffusion (Quiescent)") : `${labState.airflowCmPerSecond} cm/s ${t("Convective Flow")}`}
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="tiny dim">{t("Research Applicability")}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--amber)", marginTop: 4 }}>
                {labState.gravityG === 0 ? t("Direct Flight Data (24)") : t("CFD & Surrogate Modeling")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 4: Lunar Habitat Fire Risk Calculator */}
      <FireRiskCalculator state={labState} investigations={records} />

      {/* Feature 5: Partial Gravity Research Analysis */}
      <PartialGravityAnalysis />

      <section className="section" aria-labelledby="habitat-atmosphere-title">
        <div className="section-head">
          <h2 className="section-title" id="habitat-atmosphere-title">
            <span className="index">00</span> {t("Spacesuit and habitat atmosphere context")}
          </h2>
          <span className="section-hint">{t("NASA planning references · outside the PSI experiment setpoints")}</span>
        </div>
        <div className="detail-grid">
          {EXPLORATION_ATMOSPHERES.references.map((reference) => (
            <article className="panel panel--flat" key={reference.id}>
              <div className="panel-body">
                <div className="row row--between" style={{ alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: 16 }}>{t(reference.label)}</h3>
                  <EvidenceBadge status={reference.evidenceStatus} compact />
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>{t(reference.note)}</p>
                <a className="source__url" href={reference.source.url} target="_blank" rel="noopener noreferrer">
                  {reference.source.title} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="callout callout--amber" style={{ marginTop: 12 }}>
          <strong>{t(EXPLORATION_ATMOSPHERES.challengeContext.label)}:</strong> {t(EXPLORATION_ATMOSPHERES.challengeContext.summary)}{" "}
          <a className="source__url" href={EXPLORATION_ATMOSPHERES.challengeContext.source.url} target="_blank" rel="noopener noreferrer">
            {t("NASA Space Apps challenge brief")} ↗
          </a>
          <p className="tiny dim" style={{ marginTop: 8 }}>
            {t("These atmosphere references support context and comparison. They do not predict whether a material will ignite or how a fire will behave; that depends on material, geometry, ignition, flow and other conditions.")}
          </p>
        </div>
      </section>

      <div className="panel">
        <div className="panel-head">
          <h2>{t("Illustrative scenario")}</h2>
          <span className="panel-caption">{t("User-entered · Illustrative estimate")}</span>
        </div>
        <div className="panel-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 16,
            }}
          >
            <div className="field">
              <label htmlFor="scenario-o2-input">{t("Oxygen concentration (%)")}</label>
              <input
                id="scenario-o2-input"
                className="input input--mono"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={oxygen}
                onChange={(event) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    oxygenPercent: Math.max(0, Math.min(100, Number(event.target.value))),
                  })
                }
              />
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={oxygen}
                onChange={(event) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    oxygenPercent: Number(event.target.value),
                  })
                }
                aria-label={t("Oxygen concentration slider")}
              />
            </div>
            <div className="field">
              <label htmlFor="scenario-pressure-input">{t("Pressure (psia)")}</label>
              <input
                id="scenario-pressure-input"
                className="input input--mono"
                type="number"
                min={0}
                max={48}
                step={0.1}
                value={pressure}
                onChange={(event) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    pressurePsi: Math.max(0, Math.min(48, Number(event.target.value))),
                  })
                }
              />
              <input
                type="range"
                min={0}
                max={48}
                step={0.1}
                value={pressure}
                onChange={(event) =>
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    pressurePsi: Number(event.target.value),
                  })
                }
                aria-label={t("Pressure slider")}
              />
            </div>
            <div className="field">
              <label htmlFor="scenario-gravity-select">{t("Gravity level")}</label>
              <select
                id="scenario-gravity-select"
                className="select"
                value={gravityId}
                onChange={(event) => {
                  const selectedRatio =
                    GRAVITY_OPTIONS.find((option) => option.id === event.target.value)?.ratio ?? 0;
                  updateLabState({
                    ...labState,
                    preset: "custom",
                    gravityG: selectedRatio,
                  });
                }}
              >
                {GRAVITY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
              <p className="tiny dim">
                {t("Gravity ratios are derived from NASA NSSDC surface-gravity values; see the ladder below.")}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
              marginTop: 18,
            }}
          >
            <div className="info-block" style={{ margin: 0 }}>
              <h3>
                {t("Nearest documented conditions")}
                <EvidenceBadge status="Derived" compact />
              </h3>
              <div className="stack">
                {nearest.map((item) => (
                  <div key={item.point.id} className="row row--between" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div className="small" style={{ color: "var(--text-soft)" }}>
                        {t(item.point.label)}
                      </div>
                      <div className="mono-sm dim">
                        {formatNumber(item.point.oxygenPercent, 1)}% O2 ·{" "}
                        {formatNumber(item.point.pressurePsi, 1)} psia
                      </div>
                      <a
                        className="source__url"
                        href={item.point.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.point.sourceTitle} ↗
                      </a>
                    </div>
                    <span className="mono-sm" style={{ color: "var(--cyan)" }}>
                      d={item.distance.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="tiny dim" style={{ marginTop: 10 }}>
                {t("Distance formula: √((ΔO2/100)² + (Δpressure/48)²). The normalising domains are chart bounds, not physical constants. A close point does not mean your scenario is safe or flammable.")}
              </p>
            </div>

            <div className="info-block" style={{ margin: 0 }}>
              <h3>
                {t("Gravity data at this level")}
                <EvidenceBadge status="Illustrative estimate" compact />
              </h3>
              {gravityLevel ? (
                <>
                  <p className="small" style={{ color: "var(--text-soft)" }}>
                    <strong>{t(gravityLevel.dataStatus)}</strong>
                  </p>
                  <p className="small muted" style={{ marginTop: 6 }}>
                    {t(gravityLevel.detail)}
                  </p>
                </>
              ) : null}
              <p className="tiny dim" style={{ marginTop: 10 }}>
                {t("Selected:")} {t(gravity.label)}. {t("Gravity does not alter the oxygen/pressure plot above; it changes which measurements are relevant, and at Mars or lunar gravity the dataset does not provide a validated model.")}
              </p>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn--sm" onClick={exportScenario}>
              {t("Export scenario note (.md)")}
            </button>
            <span className="tiny dim">
              {t("The export includes inputs, distance formula, nearest documented conditions and source links.")}
            </span>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">01</span> {t("Oxygen vs pressure")}
          </h2>
          <span className="section-hint">{t("Sourced points and ranges only")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <EnvelopeScatter
              records={records.filter((record) => record.id !== "PSI-20")}
              references={REFERENCE_ATMOSPHERES}
              scenario={{ oxygenPercent: oxygen, pressurePsi: pressure }}
            />
            <p className="chart-note">{t("Cyan rectangles show reported O2 and pressure ranges for FLEX-2 and BASS-II; the dot is the midpoint of the range, used only for positioning (Derived). Amber rings show sourced reference atmospheres: ACME BRE test points and NASA spacesuit/exploration-atmosphere context. They are not interchangeable or universal habitat requirements. Records with only one of the two values are omitted rather than guessed.")}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">02</span> {t("One-dimensional envelopes")}
          </h2>
          <span className="section-hint">{t("Reported ranges, including records that cannot be plotted above")}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div className="panel panel--flat">
            <div className="panel-head">
              <h3>{t("Oxygen")}</h3>
              <span className="panel-caption">{t("% by volume/mole as stated")}</span>
            </div>
            <div className="panel-body">
              <RangeChart
                records={records}
                kind="oxygen"
                compareIds={[]}
                references={REFERENCE_ATMOSPHERES}
              />
              <p className="chart-note">
                Only BASS-II and FLEX-2 state oxygen ranges. Amber ticks show ACME BRE test points plus
                NASA spacesuit/exploration-atmosphere context. Everything else is Unknown, not 0%.
              </p>
            </div>
          </div>
          <div className="panel panel--flat">
            <div className="panel-head">
              <h3>{t("Pressure")}</h3>
              <span className="panel-caption">{t("psia; atm converted")}</span>
            </div>
            <div className="panel-body">
              <RangeChart
                records={records}
                kind="pressure"
                compareIds={[]}
                references={REFERENCE_ATMOSPHERES}
              />
              <p className="chart-note">{t("FLEX-2 (0.5–3.0 atm), FLEX (0.5–1.5 atm), CFI (0.25–5 atm) and BASS-II (1 atm) report pressure. Amber ticks show ACME BRE and EVA/exploration context points. Conversion: 1 atm = 14.6959 psi (Derived).")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">03</span> {t("Gravity ladder")}
          </h2>
          <span className="section-hint">{t("Data availability, not a continuum")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <div className="stack" style={{ gap: 0 }}>
              {GRAVITY_LEVELS.map((level) => (
                <div
                  key={level.id}
                  className="gravity-row"
                >
                  <div>
                    <div className="small" style={{ color: "var(--text-soft)", fontWeight: 500 }}>
                      {t(level.label)}
                    </div>
                    <div className="mono-sm dim">g/g₀ = {level.ratio}</div>
                  </div>
                  <div>
                    <span
                      className={`chip ${
                        level.dataStatus.includes("non-PSI")
                          ? "chip--amber"
                          : level.dataStatus.startsWith("Measured")
                            ? "chip--cyan"
                            : level.dataStatus.includes("No sourced")
                              ? "chip--red"
                              : "chip--muted"
                      }`}
                    >
                      {t(level.dataStatus)}
                    </span>
                  </div>
                  <p className="small muted">{t(level.detail)}</p>
                </div>
              ))}
            </div>
            <p className="tiny dim" style={{ marginTop: 12 }}>
              {t("Gravity ratios: lunar surface gravity 1.62 m/s² ÷ 9.80665 m/s² = 0.165; Martian mean surface gravity 3.73 m/s² ÷ 9.80665 m/s² = 0.380 (Derived from NASA NSSDC fact sheets). No 0g→lunar or 0g→Mars curve is drawn, because no validated model in the reviewed sources supports one.")}
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="efield-analogy-title">
        <div className="section-head">
          <h2 className="section-title" id="efield-analogy-title">
            <span className="index">04</span> {t("Partial-gravity analogy: use with care")}
          </h2>
          <span className="section-hint">{t("Mechanism analogy · not gravity data")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <h3 style={{ fontSize: 16 }}>{t(E_FIELD_GRAVITY_NOTE.title)}</h3>
            <p className="prose" style={{ marginTop: 8 }}>{t(E_FIELD_GRAVITY_NOTE.body)}</p>
            <a className="source__url" href={E_FIELD_GRAVITY_NOTE.source.url} target="_blank" rel="noopener noreferrer">
              {E_FIELD_GRAVITY_NOTE.source.title} ↗
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">05</span> {t("Lunar-gravity context (LUCI, outside PSI)")}
          </h2>
          <span className="section-hint">{t("NASA-reported · not one of the 24 PSI records")}</span>
        </div>
        <div className="panel panel--flat">
          <div className="panel-body">
            <div className="row row--between" style={{ alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <h3 style={{ fontSize: 17 }}>{t(LUCI_FACTS.title)}</h3>
                <p className="small muted">{t(LUCI_FACTS.status)}</p>
              </div>
              <EvidenceBadge status="NASA-reported" />
            </div>
            <p className="prose">{t(LUCI_FACTS.summary)}</p>
            <div className="detail-grid" style={{ marginTop: 14 }}>
              <div className="info-block">
                <h3>{t("Platform & samples")}</h3>
                <p className="small muted">{t(LUCI_FACTS.platform)}</p>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {t(LUCI_FACTS.samples)}
                </p>
              </div>
              <div className="info-block">
                <h3>{t("Reported measurements")}</h3>
                <ul className="small muted" style={{ paddingLeft: 16 }}>
                  {LUCI_FACTS.measurements.map((measurement) => (
                    <li key={measurement} style={{ marginBottom: 5 }}>
                      {t(measurement)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="callout callout--amber" style={{ marginTop: 12 }}>
              <strong>{t("Limitations.")}</strong> {t(LUCI_FACTS.limitations)}
            </div>
            <a
              className="source__url"
              href={LUCI_FACTS.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {LUCI_FACTS.source.title} ({LUCI_FACTS.source.publishedAt}) ↗
            </a>
            <a
              className="source__url"
              href={LUNAR_FIRE_SAFETY.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 12 }}
            >
              {LUNAR_FIRE_SAFETY.title} ({LUNAR_FIRE_SAFETY.publishedAt}) ↗
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">
            <span className="index">06</span> {t("Plain-language concepts")}
          </h2>
          <span className="section-hint">{t("Each with a source for its factual claims")}</span>
        </div>
        <div className="card-grid">
          {CONCEPTS.map((concept) => (
            <article className="panel panel--flat" key={concept.term}>
              <div className="panel-body">
                <h3 style={{ fontSize: 14, marginBottom: 6 }}>{t(concept.term)}</h3>
                <p className="small muted">{t(concept.plain)}</p>
                <a
                  className="source__url"
                  href={concept.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginTop: 8, display: "inline-block" }}
                >
                  {concept.source} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="callout">
        <strong>{t("Gravity values used here.")}</strong> {t("Moon 1.62 m/s² and Mars 3.73 m/s² come from NASA NSSDC fact sheets; ratios are derived. Standard gravity is 9.80665 m/s². The scale of the Moon/Mars markers is illustrative; they are not data points on a combustion curve. Comparison across facilities, fuels and configurations remains limited even at the same gravity level.")}
      </div>
    </div>
  );
}
