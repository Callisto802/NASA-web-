import type { PSIInvestigation } from "../types";
import { RELEVANCE_RUBRIC } from "../data/reference";

export type RelevanceKey =
  | "habitableSpacecraft"
  | "explorationHabitat"
  | "predictiveModeling"
  | "equipmentDesign"
  | "terrestrialApplications";

export type WeightMap = Partial<Record<RelevanceKey, number>>;

export function weightedRelevance(
  record: PSIInvestigation,
  weights: WeightMap = {},
): number | null {
  const scores = record.relevanceScores;
  if (!scores) return null;
  let total = 0;
  let weightSum = 0;
  for (const dimension of RELEVANCE_RUBRIC.dimensions) {
    const key = dimension.key as RelevanceKey;
    const weight = weights[key] ?? dimension.weight;
    const value = scores[key];
    if (typeof value === "number") {
      total += value * weight;
      weightSum += weight;
    }
  }
  if (weightSum === 0) return null;
  return Math.round((total / weightSum) * 10) / 10;
}

export function scoreBreakdown(record: PSIInvestigation) {
  const scores = record.relevanceScores;
  if (!scores) return [];
  return RELEVANCE_RUBRIC.dimensions.map((dimension) => ({
    label: dimension.label,
    weight: dimension.weight,
    score: scores[dimension.key as RelevanceKey],
  }));
}

export const SCORE_FORMULA =
  "Σ (dimension score × weight) ÷ Σ weights, using weights 0.30 habitable spacecraft, 0.20 exploration habitat, 0.25 predictive modeling, 0.15 equipment design, 0.10 terrestrial applications.";

import type { AtmosphereLabState, MissionRankingDimension, MissionRankingResult } from "../types";

/**
 * Calculates dynamic mission research ranking based on:
 * - Safety relevance: 30%
 * - Atmospheric similarity: 25%
 * - Gravity relevance: 20%
 * - Hardware similarity: 15%
 * - Data completeness: 10%
 *
 * All scores are normalized to 0-100.
 */
export function calculateMissionRanking(
  record: PSIInvestigation,
  mission: AtmosphereLabState,
): MissionRankingResult {
  // 1. Safety Relevance (30%)
  const pillars = record.safetyPillars ?? [];
  let safetyScore = 35;
  if (pillars.length >= 3) safetyScore = 100;
  else if (pillars.length === 2) safetyScore = 80;
  else if (pillars.length === 1) safetyScore = 60;
  if (record.relevanceScores?.habitableSpacecraft) {
    safetyScore = Math.min(100, Math.round((safetyScore + record.relevanceScores.habitableSpacecraft * 20) / 2));
  }

  // 2. Atmospheric Similarity (25%)
  const cond = record.testConditions;
  let atmosphereScore = 40; // Neutral baseline when conditions are unmeasured/missing
  let atmosphereNote = "Unreported numeric conditions; scored at baseline without inventing values.";

  if (cond && (cond.pressurePsiMin !== undefined || cond.oxygenPercentMin !== undefined)) {
    let pScore = 50;
    let oScore = 50;

    if (cond.pressurePsiMin !== undefined && cond.pressurePsiMax !== undefined) {
      if (mission.pressurePsi >= cond.pressurePsiMin && mission.pressurePsi <= cond.pressurePsiMax) {
        pScore = 100;
      } else {
        const dist = Math.min(
          Math.abs(mission.pressurePsi - cond.pressurePsiMin),
          Math.abs(mission.pressurePsi - cond.pressurePsiMax),
        );
        pScore = Math.max(20, Math.round(100 - dist * 12));
      }
    }

    if (cond.oxygenPercentMin !== undefined && cond.oxygenPercentMax !== undefined) {
      if (mission.oxygenPercent >= cond.oxygenPercentMin && mission.oxygenPercent <= cond.oxygenPercentMax) {
        oScore = 100;
      } else {
        const dist = Math.min(
          Math.abs(mission.oxygenPercent - cond.oxygenPercentMin),
          Math.abs(mission.oxygenPercent - cond.oxygenPercentMax),
        );
        oScore = Math.max(20, Math.round(100 - dist * 4));
      }
    }

    atmosphereScore = Math.round((pScore + oScore) / 2);
    atmosphereNote = `Measured envelope: P=[${cond.pressurePsiMin ?? "?"}-${cond.pressurePsiMax ?? "?"} psia], O2=[${cond.oxygenPercentMin ?? "?"}-${cond.oxygenPercentMax ?? "?"}%].`;
  }

  // 3. Gravity Relevance (20%)
  let gravityScore = 60;
  const isFlight = record.flightPlatform === "ISS" || record.flightPlatform === "Cygnus";

  if (mission.gravityG === 0) {
    gravityScore = isFlight ? 100 : 40;
  } else if (mission.gravityG === 1) {
    gravityScore = !isFlight ? 100 : 50;
  } else {
    // Partial gravity (Moon 0.166g, Mars 0.38g)
    // Microgravity records are the primary non-buoyant benchmark; E-FIELD Flames investigated convection surrogates
    if (record.acronym.includes("E-FIELD")) {
      gravityScore = 95; // Explicit electrical-field surrogate research
    } else if (record.acronym.includes("BASS") || record.acronym.includes("SAFFIRE")) {
      gravityScore = 85; // Low-velocity forced flow mimics low-gravity buoyant velocities
    } else if (isFlight) {
      gravityScore = 75;
    } else {
      gravityScore = 45;
    }
  }

  // 4. Hardware Similarity (15%)
  let hardwareScore = 50;
  const facility = (record.hardware?.facility ?? "").toLowerCase();
  const apparatus = (record.hardware?.apparatus ?? "").toLowerCase();

  if (facility.includes("glovebox") || facility.includes("msg")) {
    hardwareScore = 85;
  } else if (facility.includes("cir") || facility.includes("combustion integrated rack")) {
    hardwareScore = 80;
  } else if (apparatus.includes("saffire") || record.acronym.includes("SAFFIRE")) {
    hardwareScore = 95; // Large-scale vehicle enclosure
  } else if (facility.includes("ground") || !isFlight) {
    hardwareScore = 55;
  }

  // 5. Data Completeness (10%)
  let completenessFields = 0;
  if (record.hardware?.facility) completenessFields += 20;
  if (record.fuelSpecs?.phase && (record.fuelSpecs.materials ?? []).length > 0) completenessFields += 20;
  if (record.testConditions && (record.testConditions.oxygenPercentMin !== undefined || record.testConditions.pressurePsiMin !== undefined)) completenessFields += 20;
  if ((record.findings ?? []).length > 0) completenessFields += 20;
  if (record.sources.length >= 2) completenessFields += 20;
  const completenessScore = Math.max(20, Math.min(100, completenessFields));

  // Compute total normalized score (0-100)
  const dimensions: Record<string, MissionRankingDimension> = {
    safety: {
      key: "safety",
      label: "Safety Relevance",
      weight: 0.30,
      score: safetyScore,
      contribution: Math.round(safetyScore * 0.30 * 10) / 10,
    },
    atmosphere: {
      key: "atmosphere",
      label: "Atmospheric Similarity",
      weight: 0.25,
      score: atmosphereScore,
      contribution: Math.round(atmosphereScore * 0.25 * 10) / 10,
    },
    gravity: {
      key: "gravity",
      label: "Gravity Relevance",
      weight: 0.20,
      score: gravityScore,
      contribution: Math.round(gravityScore * 0.20 * 10) / 10,
    },
    hardware: {
      key: "hardware",
      label: "Hardware Similarity",
      weight: 0.15,
      score: hardwareScore,
      contribution: Math.round(hardwareScore * 0.15 * 10) / 10,
    },
    completeness: {
      key: "completeness",
      label: "Data Completeness",
      weight: 0.10,
      score: completenessScore,
      contribution: Math.round(completenessScore * 0.10 * 10) / 10,
    },
  };

  const totalScore = Math.round(
    dimensions.safety.contribution +
    dimensions.atmosphere.contribution +
    dimensions.gravity.contribution +
    dimensions.hardware.contribution +
    dimensions.completeness.contribution,
  );

  // Natural language ranking rationale
  const rationaleParts: string[] = [];
  rationaleParts.push(
    `Overall score ${totalScore}/100 against ${mission.customLabel ?? mission.preset} (${mission.pressurePsi.toFixed(1)} psia, ${mission.oxygenPercent.toFixed(1)}% O2, ${mission.gravityG.toFixed(2)}g).`,
  );
  if (dimensions.safety.score >= 80) {
    rationaleParts.push(`Directly targets ${pillars.join(" and ")} safety countermeasures.`);
  }
  if (cond && cond.pressurePsiMin !== undefined) {
    rationaleParts.push(atmosphereNote);
  }
  if (record.acronym.includes("E-FIELD")) {
    rationaleParts.push("Provides empirical electrical surrogate data for convection manipulation in reduced gravity.");
  }

  return {
    investigationId: record.id,
    record,
    totalScore,
    dimensions: dimensions as Record<any, MissionRankingDimension>,
    rationale: rationaleParts.join(" "),
    completenessScore,
  };
}

