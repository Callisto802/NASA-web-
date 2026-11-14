import type { AtmosphereLabState, FireRiskResult, MaterialOption, PSIInvestigation } from "../types";

export interface AuditReportData {
  state: AtmosphereLabState;
  material: MaterialOption;
  riskResult: FireRiskResult;
  investigations: PSIInvestigation[];
  matchedInvestigations: PSIInvestigation[];
}

export function generateSafetyAuditMarkdown(data: AuditReportData): string {
  const { state, material, riskResult, matchedInvestigations } = data;
  const now = new Date().toISOString();

  const matchedSummaries = matchedInvestigations.map((inv) => {
    const cond = inv.testConditions;
    const condStr = cond
      ? `P=[${cond.pressurePsiMin ?? "?"}-${cond.pressurePsiMax ?? "?"} psia], O2=[${cond.oxygenPercentMin ?? "?"}-${cond.oxygenPercentMax ?? "?"}%], flow=[${cond.airflowCmPerSecondMin ?? "?"}-${cond.airflowCmPerSecondMax ?? "?"} cm/s]`
      : "Unreported numeric conditions";
    const findingsStr = (inv.findings ?? []).slice(0, 2).map((f) => `    * ${f}`).join("\n");
    return `- **${inv.acronym} (${inv.id})** — ${inv.fullTitle}\n  - *Facility / Apparatus:* ${inv.hardware?.facility ?? "Unknown"} / ${inv.hardware?.apparatus ?? "Unknown"}\n  - *Conditions:* ${condStr}\n  - *Evidence Summary:*\n${findingsStr || "    * No quantitative findings in PSI summary."}`;
  }).join("\n\n");

  return `# NASA PHYSICAL SCIENCES INFORMATICS — FIRE SAFETY AUDIT BRIEF
**Document Type:** Technical Engineering Research Brief  
**Classification:** Research Synthesis / Non-Operational Reference  
**Generated At:** ${now}  
**Dataset Reference:** NASA PSI Combustion Science Snapshot (13 Nov 2026)  

> [!CAUTION]
> **MANDATORY DISCLAIMER:**  
> **THIS DOCUMENT IS AN ENGINEERING RESEARCH SUPPORT OUTPUT. IT IS NOT AN OFFICIAL NASA DOCUMENT OR CERTIFIED SAFETY ASSESSMENT.**  
> It does not substitute for certified NASA safety review or qualification testing under NASA-STD-6001.

---

## 1. Executive Summary

This safety audit brief synthesizes verified microgravity combustion data from NASA's Physical Sciences Informatics (PSI) repository against the specified exploration environment.

- **Target Profile:** ${state.customLabel ?? state.preset.toUpperCase()}
- **Cabin Conditions:** ${state.pressurePsi.toFixed(1)} psia | ${state.oxygenPercent.toFixed(1)}% O₂ | ${state.airflowCmPerSecond.toFixed(1)} cm/s flow | ${state.gravityG.toFixed(3)}g
- **Selected Material:** ${material.name} (Factor: ${material.factor.toFixed(2)})
- **Evaluated Fire Risk Score:** **${riskResult.normalizedScore}/100** (${riskResult.classification})
- **Oxygen Partial Pressure ($P_{O2}$):** ${riskResult.oxygenPartialPressurePsi.toFixed(2)} psia (${riskResult.oxygenPartialPressureKpa.toFixed(1)} kPa)

The evaluated scenario reflects an ${riskResult.classification.toUpperCase()} configuration. Experimental microgravity data indicates altered flammability limits and modified soot transport mechanisms compared to 1-g terrestrial test methods.

---

## 2. Mission Environment & Operating Architecture

- **Habitat Environment Type:** ${state.customLabel ?? state.preset}
- **Gravity Regime:** ${state.gravityG === 0 ? "Microgravity (~0g)" : state.gravityG === 1 ? "Terrestrial (1.0g)" : state.gravityG < 0.2 ? "Lunar Gravity (0.166g)" : "Martian Gravity (0.38g)"}
- **Ventilation Mode:** ${state.airflowCmPerSecond > 0 ? `Forced Convective Flow (${state.airflowCmPerSecond} cm/s)` : "Quiescent Diffusion (No forced flow)"}
- **Atmospheric Composition:** ${state.oxygenPercent.toFixed(1)}% Oxygen, balance Nitrogen/Inert diluents.

---

## 3. Atmospheric Parameters & Pressure Matrix

| Parameter | Configured Value | NASA Standard Reference (ISS) | Exploration Habitat Baseline |
| :--- | :--- | :--- | :--- |
| **Total Pressure** | ${state.pressurePsi.toFixed(1)} psia (${(state.pressurePsi * 6.89476).toFixed(1)} kPa) | 14.7 psia (101.3 kPa) | 8.2 psia (56.5 kPa) |
| **Oxygen Concentration** | ${state.oxygenPercent.toFixed(1)}% | 21.0% | 34.0% |
| **Oxygen Partial Pressure ($P_{O2}$)** | ${riskResult.oxygenPartialPressurePsi.toFixed(2)} psia (${riskResult.oxygenPartialPressureKpa.toFixed(1)} kPa) | 3.08 psia (21.2 kPa) | 2.79 psia (19.2 kPa) |
| **Forced Airflow** | ${state.airflowCmPerSecond.toFixed(1)} cm/s | 8–15 cm/s (nominal duct) | 10 cm/s (nominal habitability) |
| **Gravity Field** | ${state.gravityG.toFixed(3)}g | ~10⁻⁶ g | 0.166g |

---

## 4. Fire Risk Assessment & Heuristic Sensitivity

The initial fire risk index is computed using the multi-parameter engineering sensitivity formulation:

$$\\text{RiskIndex} = \\left(\\frac{\\%O_2}{21} \\times 1.5\\right) \\times \\left(\\frac{15\\text{ psia}}{P} \\times 1.2\\right) \\times M_{\\text{factor}}$$

- **Calculated Raw Index:** ${riskResult.rawIndex.toFixed(3)}
- **Normalized Scaled Index:** ${riskResult.normalizedScore} / 100
- **Assigned Category:** **${riskResult.classification}**
- **Oxygen Influence:** ${riskResult.oxygenContribution.toFixed(2)}× contribution
- **Pressure Thermal Influence:** ${riskResult.pressureContribution.toFixed(2)}× contribution
- **Material Flammability Factor:** ${riskResult.materialContribution.toFixed(2)}× (${material.name})

**Heuristic Interpretation:**  
${riskResult.explanation}

---

## 5. Supporting Experimental Evidence from NASA PSI

The following verified investigations in the NASA PSI Combustion repository provide empirical findings applicable to this configuration:

${matchedSummaries || "No direct matching investigations found for this specific material and condition combination."}

---

## 6. Investigation Comparison & Cross-Study Analysis

Key experimental benchmarks from flight testing on the ISS and Cygnus cargo vehicles demonstrate:
1. **BASS-II (PSI-25):** Mapped a non-linear U-shaped flammability boundary where solid fuel extinction depends heavily on forced flow velocity and oxygen depletion.
2. **Saffire Series (PSI-98, PSI-99, PSI-100):** Conducted realistic, large-scale fabric and polymethyl methacrylate (PMMA) burns in pressurized Cygnus cargo vehicles, proving that upward spread rates differ from standard terrestrial screening tests (NASA-STD-6001 Test 1).
3. **ACME BRE (PSI-20):** Examined burning rate emulation under quiescent conditions, confirming that without airflow or buoyancy, radiative heat loss can induce flame self-extinction in thick materials.

---

## 7. Research Gaps & Partial Gravity Uncertainty

- **The Partial Gravity Gap:** There are **zero direct lunar (0.166g) or Martian (0.38g) experimental combustion runs** in the 24-investigation PSI dataset.
- **Extrapolation Risk:** Combustion behavior cannot be predicted via linear interpolation between 0g (orbit) and 1g (ground). Sub-buoyant flow on the Moon (0.166g) provides continuous oxidizer replenishment without terrestrial radiative blowout, which can increase flame spread rates relative to 0g or 1g.
- **Future Verification Required:** LUCI (simulated lunar gravity via parabolic aircraft) and the FM2 (Fire Safety on the Moon) payload must be consulted when published to validate partial gravity flammability.

---

## 8. Uncertainty & Methodological Limitations

1. **Editorial Heuristic Scope:** The fire risk calculation index is an illustrative screening heuristic and must not be used as an engineering design certification.
2. **Missing Measurements:** Unreported NASA PSI fields are left as Unknown and excluded from mathematical models to prevent data fabrication.
3. **Geometry and Ignition Source:** Material geometry, thickness, thermal inertia, preheating, and ignition energy are decisive parameters not fully captured in single-variable oxygen calculations.

---

## 9. Engineering Considerations & Recommendations

- **Atmospheric Tuning:** Maintaining $P_{O2}$ near 2.8–3.0 psia while operating at 8.2 psia total pressure satisfies crew respiration but elevates volumetric flammability ($34\\% O_2$).
- **Ventilation Interlocks:** In the event of confirmed smoke detection, forced cabin ventilation should be immediately arrested to limit convective oxidizer delivery to potential fire pockets.
- **Detector Positioning:** Microgravity aerosol tests (SAME-R / DAFT-2) indicate smoke particles coagulate into larger agglomerates under low shear; optical obscuration and ionization detectors must be tuned to low-buoyancy drift velocities.

---

## 10. References & NASA Primary Sources

1. **NASA PSI Combustion Science Archive:** https://psi.nasa.gov/
2. **BASS-II Summary Report:** NASA/TM-20210011385
3. **Saffire Large-Scale Spacecraft Fire Safety Reports:** NASA Glenn Research Center
4. **Fire Safety Challenges for Future Human Lunar Exploration:** NTRS 20260008630
5. **NASA Standard Flammability Test Methods:** NASA-STD-6001B
`;
}
