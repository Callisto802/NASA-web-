import { useState, useMemo } from "react";
import type { AtmosphereLabState, MaterialOption, PSIInvestigation } from "../../types";
import { MATERIALS, calculateFireRisk } from "../../utils/fireRisk";
import { useLanguage } from "../../i18n";
import { EvidenceBadge } from "../EvidenceBadge";

interface Props {
  state: AtmosphereLabState;
  investigations: PSIInvestigation[];
}

export function FireRiskCalculator({ state, investigations }: Props) {
  const { t } = useLanguage();
  const [selectedMaterialId, setSelectedMaterialId] = useState<MaterialOption["id"]>("cotton-fiberglass");

  const riskResult = useMemo(
    () => calculateFireRisk(state, selectedMaterialId, investigations),
    [state, selectedMaterialId, investigations],
  );

  const selectedMaterial = useMemo(
    () => MATERIALS.find((m) => m.id === selectedMaterialId) ?? MATERIALS[0],
    [selectedMaterialId],
  );

  const matchedRecords = useMemo(
    () =>
      riskResult.matchedInvestigationIds
        .map((id) => investigations.find((inv) => inv.id === id))
        .filter((inv): inv is PSIInvestigation => Boolean(inv)),
    [riskResult.matchedInvestigationIds, investigations],
  );

  const badgeClass =
    riskResult.classification === "Critical Engineering Concern"
      ? "chip--red"
      : riskResult.classification === "Elevated Flammability Concern"
        ? "chip--amber"
        : "chip--green";

  return (
    <section className="section fire-risk-calculator" aria-labelledby="fire-risk-heading">
      <div className="section-head">
        <h2 className="section-title" id="fire-risk-heading">
          {t("Lunar Habitat Fire Risk Calculator")}
          <EvidenceBadge status="Illustrative estimate" compact />
        </h2>
        <span className="section-hint">{t("Heuristic Sensitivity Assessment")}</span>
      </div>

      <div className="panel panel--flat">
        <div className="panel-body stack">
          {/* Material Selection */}
          <div>
            <label className="tiny dim" style={{ display: "block", marginBottom: 6, textTransform: "uppercase" }}>
              {t("Select Test Material")}
            </label>
            <div className="chip-row" role="radiogroup" aria-label={t("Test Materials")}>
              {MATERIALS.map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedMaterialId === mat.id}
                  className={`chip ${selectedMaterialId === mat.id ? "chip--cyan" : "chip--muted"}`}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                  onClick={() => setSelectedMaterialId(mat.id)}
                >
                  <strong>{t(mat.name)}</strong>
                  <span className="tiny dim">×{mat.factor}</span>
                </button>
              ))}
            </div>
            <p className="tiny dim" style={{ marginTop: 6 }}>
              {t(selectedMaterial.basis)} <span className="dim">({t("Source")}: {selectedMaterial.traceableSource})</span>
            </p>
          </div>

          <div className="divider" />

          {/* Metric Outputs: Risk Score Gauge and Contributions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
              alignItems: "center",
            }}
          >
            {/* Risk Index Display */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
              <div className="row row--between">
                <span className="tiny dim" style={{ textTransform: "uppercase" }}>{t("Fire Risk Index")}</span>
                <span className={`chip ${badgeClass}`}>{t(riskResult.classification)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "12px 0 6px" }}>
                <span style={{ fontSize: 36, fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}>
                  {riskResult.normalizedScore}
                </span>
                <span className="dim">/ 100</span>
                <span className="tiny dim" style={{ marginLeft: "auto" }}>
                  raw: {riskResult.rawIndex.toFixed(2)}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${riskResult.normalizedScore}%`,
                    background:
                      riskResult.normalizedScore > 70
                        ? "var(--red, #ff5252)"
                        : riskResult.normalizedScore >= 40
                          ? "var(--amber, #ffb300)"
                          : "var(--green, #69f0ae)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div className="row row--between tiny dim" style={{ marginTop: 4 }}>
                <span>{t("Safe Reference (<40)")}</span>
                <span>{t("Elevated (40–70)")}</span>
                <span>{t("Critical (>70)")}</span>
              </div>
            </div>

            {/* Individual Parameter Contributions */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 8, border: "1px solid var(--line)" }}>
              <div className="tiny dim" style={{ textTransform: "uppercase", marginBottom: 10 }}>
                {t("Parameter Contribution Breakdown")}
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <div>
                  <div className="row row--between tiny">
                    <span>{t("Oxygen Factor")} ((O2 / 21) × 1.5)</span>
                    <span className="mono-sm">{riskResult.oxygenContribution.toFixed(2)}×</span>
                  </div>
                </div>
                <div>
                  <div className="row row--between tiny">
                    <span>{t("Pressure Factor")} ((15 / P) × 1.2)</span>
                    <span className="mono-sm">{riskResult.pressureContribution.toFixed(2)}×</span>
                  </div>
                </div>
                <div>
                  <div className="row row--between tiny">
                    <span>{t("Material Factor")} (M)</span>
                    <span className="mono-sm">{riskResult.materialContribution.toFixed(2)}×</span>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 6 }} className="row row--between tiny">
                  <span>{t("Oxygen Partial Pressure (P_O2)")}</span>
                  <span className="mono-sm" style={{ color: "var(--cyan)" }}>
                    {riskResult.oxygenPartialPressurePsi.toFixed(2)} psia ({riskResult.oxygenPartialPressureKpa.toFixed(1)} kPa)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="callout callout--flat" style={{ marginTop: 8 }}>
            <strong>{t("Scientific Interpretation")}:</strong> {t(riskResult.explanation)}
          </div>

          {/* Matched Relevant Investigations */}
          {matchedRecords.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="tiny dim" style={{ textTransform: "uppercase", marginBottom: 8 }}>
                {t("Matching NASA PSI Investigations for this Atmosphere & Material")}
              </div>
              <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {matchedRecords.map((record) => (
                  <a
                    key={record.id}
                    href={`#/explorer/${record.id}`}
                    className="inv-card"
                    style={{ padding: 12, minHeight: 90 }}
                  >
                    <div className="row row--between">
                      <span className="inv-acronym" style={{ fontSize: 13 }}>{record.acronym}</span>
                      <span className="tiny dim">{record.id}</span>
                    </div>
                    <span className="inv-title" style={{ fontSize: 12, marginTop: 4 }}>
                      {t(record.fullTitle)}
                    </span>
                    <span className="tiny" style={{ color: "var(--cyan)", marginTop: "auto" }}>
                      {t("Inspect Research")} →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory Scientific Disclaimer */}
          <p className="tiny dim" style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 8 }}>
            <strong>{t("Engineering Constraint")}:</strong> {t("This heuristic formula is an illustrative engineering sensitivity guide, NOT a validated ignition probability or certified NASA fire-safety calculation. Oxygen concentration alone does not determine fire risk: material geometry, airflow, ignition energy, and enclosure geometry are equally vital.")}
          </p>
        </div>
      </div>
    </section>
  );
}
