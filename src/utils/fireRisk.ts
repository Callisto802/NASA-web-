import type {
  AtmosphereLabState,
  FireRiskClassification,
  FireRiskResult,
  MaterialOption,
  PSIInvestigation,
} from "../types";

export const MATERIALS: MaterialOption[] = [
  {
    id: "cotton-fiberglass",
    name: "Cotton / Fiberglass blend (SIBL)",
    factor: 1.0,
    basis: "Baseline solid sample used across BASS (PSI-26) and Saffire-I/III (PSI-98, PSI-100) tests.",
    traceableSource: "NASA/TM-20210011385 & Saffire-I Flight Summary",
  },
  {
    id: "pmma",
    name: "PMMA (Polymethyl methacrylate / Acrylic)",
    factor: 1.25,
    basis: "Thermally thick/thin thermoplastic benchmark in BASS-II (PSI-25) and standard NASA-STD-6001 Test 1 calibration.",
    traceableSource: "NASA/TM-20210011385, Section 3.2",
  },
  {
    id: "nomex",
    name: "Nomex (Aramid fabric)",
    factor: 0.45,
    basis: "High-temperature aramid fabric tested in Saffire-II (PSI-99); demonstrated low flame spread and self-extinguishment in microgravity.",
    traceableSource: "Saffire-II Multi-Material Report (NASA Table I)",
  },
  {
    id: "silicone",
    name: "Silicone elastomer",
    factor: 0.85,
    basis: "Flexible polymer tested in Saffire-II (PSI-99); exhibited localized melting and low sustained flame propagation under moderate flow.",
    traceableSource: "Saffire-II Flight Investigation Data",
  },
];

export const ENVIRONMENT_PRESETS: Record<
  string,
  {
    label: string;
    pressurePsi: number;
    oxygenPercent: number;
    airflowCmPerSecond: number;
    gravityG: number;
    description: string;
    isOfficialNasaSpec: boolean;
  }
> = {
  earth: {
    label: "Earth Sea Level",
    pressurePsi: 14.7,
    oxygenPercent: 20.9,
    airflowCmPerSecond: 0,
    gravityG: 1.0,
    description: "Standard terrestrial atmosphere at sea level (101.3 kPa, 20.9% O2, 1.0g).",
    isOfficialNasaSpec: true,
  },
  iss: {
    label: "ISS Microgravity",
    pressurePsi: 14.7,
    oxygenPercent: 21.0,
    airflowCmPerSecond: 8.0,
    gravityG: 0.0,
    description: "Nominal International Space Station cabin atmosphere with forced ventilation (14.7 psia, 21% O2, ~0g).",
    isOfficialNasaSpec: true,
  },
  eva: {
    label: "EVA Reference Suit",
    pressurePsi: 4.3,
    oxygenPercent: 100.0,
    airflowCmPerSecond: 15.0,
    gravityG: 0.0,
    description: "NASA Extravehicular Mobility Unit (EMU) pure oxygen operating pressure to prevent decompression sickness.",
    isOfficialNasaSpec: true,
  },
  lunar: {
    label: "Lunar Habitat (Exploration Atmosphere)",
    pressurePsi: 8.2,
    oxygenPercent: 34.0,
    airflowCmPerSecond: 10.0,
    gravityG: 0.166,
    description: "NASA Exploration Atmosphere baseline for lunar surface habitats and landers (56.5 kPa, 34% O2, 1/6th-g).",
    isOfficialNasaSpec: true,
  },
  mars: {
    label: "Martian Habitat Baseline",
    pressurePsi: 8.2,
    oxygenPercent: 32.0,
    airflowCmPerSecond: 12.0,
    gravityG: 0.38,
    description: "Engineering study baseline for Martian pressurized habitats balancing pre-breathe and flammability at 3/8th-g.",
    isOfficialNasaSpec: false,
  },
  custom: {
    label: "Custom Environment",
    pressurePsi: 8.2,
    oxygenPercent: 34.0,
    airflowCmPerSecond: 10.0,
    gravityG: 0.166,
    description: "User-configured atmosphere and gravity parameters for exploratory sensitivity analysis.",
    isOfficialNasaSpec: false,
  },
};

/**
 * Calculates the Lunar Habitat Fire Risk Index using the heuristic formula:
 * RiskIndex = ((OxygenPercent / 21) * 1.5) * ((15 / PressurePsi) * 1.2) * MaterialFactor
 *
 * NOTE: This is an illustrative engineering heuristic, NOT a certified fire safety model.
 */
export function calculateFireRisk(
  state: AtmosphereLabState,
  materialId: MaterialOption["id"],
  investigations: PSIInvestigation[] = [],
): FireRiskResult {
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const safePressure = Math.max(0.1, state.pressurePsi);
  const safeOxygen = Math.max(0, state.oxygenPercent);

  // Parameter contributions
  const oxygenContribution = (safeOxygen / 21) * 1.5;
  const pressureContribution = (15 / safePressure) * 1.2;
  const materialContribution = material.factor;

  const rawIndex = oxygenContribution * pressureContribution * materialContribution;

  // Normalize to 0-100 display scale
  // Standard Earth air with cotton gives rawIndex = 1.8, normalized ~ 18.
  // Lunar habitat 8.2 psi / 34% O2 with cotton gives rawIndex = 5.33, normalized ~ 53.
  // Pure O2 low pressure gives rawIndex >= 10.0, normalized -> 100.
  const normalizedScore = Math.min(100, Math.max(0, Math.round(rawIndex * 10)));

  let classification: FireRiskClassification = "Safe Operational Reference";
  if (normalizedScore > 70) {
    classification = "Critical Engineering Concern";
  } else if (normalizedScore >= 40) {
    classification = "Elevated Flammability Concern";
  }

  // Oxygen partial pressure
  const oxygenPartialPressurePsi = safePressure * (safeOxygen / 100);
  const oxygenPartialPressureKpa = oxygenPartialPressurePsi * 6.89476;

  // Explanation
  const explanation = generateRiskExplanation(
    normalizedScore,
    classification,
    state,
    material,
    oxygenPartialPressurePsi,
  );

  // Retrieve matching investigations based on fuel, pressure envelope, or O2 ranges
  const matchedInvestigationIds = matchInvestigations(state, material, investigations);

  return {
    rawIndex,
    normalizedScore,
    classification,
    oxygenContribution,
    pressureContribution,
    materialContribution,
    oxygenPartialPressurePsi,
    oxygenPartialPressureKpa,
    explanation,
    matchedInvestigationIds,
  };
}

function generateRiskExplanation(
  score: number,
  classification: FireRiskClassification,
  state: AtmosphereLabState,
  material: MaterialOption,
  po2Psi: number,
): string {
  const parts: string[] = [];

  parts.push(
    `At ${state.pressurePsi.toFixed(1)} psia and ${state.oxygenPercent.toFixed(1)}% O2 (P_O2 = ${po2Psi.toFixed(2)} psia), ` +
    `the heuristic fire risk score is ${score}/100, categorized as "${classification}".`,
  );

  if (state.oxygenPercent > 30) {
    parts.push(
      `Elevated oxygen concentration (${state.oxygenPercent.toFixed(1)}%) significantly enhances reaction kinetics and flame spread rates compared to standard air.`,
    );
  } else {
    parts.push(`Oxygen fraction remains near terrestrial concentrations.`);
  }

  if (state.pressurePsi < 10) {
    parts.push(
      `Reduced total pressure (${state.pressurePsi.toFixed(1)} psia) decreases thermal heat dissipation by gaseous conduction and convection, increasing solid-fuel surface heating.`,
    );
  }

  parts.push(
    `Selected material "${material.name}" introduces a flammability weighting factor of ${material.factor.toFixed(2)} (${material.basis}).`,
  );

  return parts.join(" ");
}

function matchInvestigations(
  state: AtmosphereLabState,
  material: MaterialOption,
  investigations: PSIInvestigation[],
): string[] {
  const matches: { id: string; score: number }[] = [];

  for (const inv of investigations) {
    let relevance = 0;

    // Check material overlap
    const mats = inv.fuelSpecs?.materials ?? [];
    const matText = mats.join(" ").toLowerCase();
    if (material.id === "cotton-fiberglass" && (matText.includes("cotton") || matText.includes("sibl") || matText.includes("fiberglass"))) {
      relevance += 40;
    } else if (material.id === "pmma" && (matText.includes("pmma") || matText.includes("acrylic"))) {
      relevance += 45;
    } else if (material.id === "nomex" && matText.includes("nomex")) {
      relevance += 50;
    } else if (material.id === "silicone" && matText.includes("silicone")) {
      relevance += 45;
    }

    // Check pressure range overlap
    const cond = inv.testConditions;
    if (cond) {
      if (
        cond.pressurePsiMin !== undefined &&
        cond.pressurePsiMax !== undefined &&
        state.pressurePsi >= cond.pressurePsiMin &&
        state.pressurePsi <= cond.pressurePsiMax
      ) {
        relevance += 25;
      }
      if (
        cond.oxygenPercentMin !== undefined &&
        cond.oxygenPercentMax !== undefined &&
        state.oxygenPercent >= cond.oxygenPercentMin &&
        state.oxygenPercent <= cond.oxygenPercentMax
      ) {
        relevance += 25;
      }
    }

    // Specific famous relevant investigations
    if (inv.acronym === "BASS-II" || inv.acronym === "SAFFIRE-I" || inv.acronym === "SAFFIRE-II") {
      relevance += 15;
    }

    if (relevance > 0) {
      matches.push({ id: inv.id, score: relevance });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 5).map((m) => m.id);
}
