/**
 * Typed model for the NASA PSI combustion-science dataset used by this explorer.
 *
 * Design rule: a value that the source does not provide is `undefined` (never 0).
 * Each evidence block carries an explicit status so the UI can label provenance.
 */

export type EvidenceStatus =
  | "NASA-reported"
  | "Analysis-derived"
  | "Derived"
  | "Illustrative estimate"
  | "Unverified"
  | "Unknown";

export type SafetyPillar = "Prevention" | "Detection" | "Suppression";

export type FuelPhase = "Solid" | "Liquid" | "Gaseous" | "Simulated" | "Unknown";

export interface SourceReference {
  title: string;
  organization?: string;
  url: string;
  identifier?: string;
  publishedAt?: string;
  accessedAt?: string;
  locator?: string;
  note?: string;
}

/** A single sourced test condition (useful when a record lists discrete points). */
export interface NamedCondition {
  label: string;
  oxygenPercent?: number;
  pressurePsi?: number;
  airflowCmPerSecond?: number;
  note?: string;
  sourceIds?: string[];
}

export interface HardwareSpec {
  facility?: string;
  apparatus?: string;
  sharedHardwareIds?: string[];
  evidenceStatus: EvidenceStatus;
  notes?: string;
  sources?: SourceReference[];
}

export interface FuelSpecs {
  phase?: FuelPhase;
  materials?: string[];
  geometryAndSize?: string;
  evidenceStatus: EvidenceStatus;
  notes?: string;
  sources?: SourceReference[];
}

export interface TestConditions {
  oxygenPercentMin?: number;
  oxygenPercentMax?: number;
  pressurePsiMin?: number;
  pressurePsiMax?: number;
  airflowCmPerSecondMin?: number;
  airflowCmPerSecondMax?: number;
  /** Discrete, named conditions reported for this investigation. */
  namedConditions?: NamedCondition[];
  suppressantsTested?: string[];
  evidenceStatus: EvidenceStatus;
  notes?: string;
  sources?: SourceReference[];
}

export interface ExperimentalDesign {
  objectives?: string;
  constantVariables?: string[];
  variedParameters?: string[];
  sensorsAndDiagnostics?: string[];
  evidenceStatus: EvidenceStatus;
  notes?: string;
  sources?: SourceReference[];
}

export interface RelevanceScores {
  habitableSpacecraft?: number;
  explorationHabitat?: number;
  predictiveModeling?: number;
  equipmentDesign?: number;
  terrestrialApplications?: number;
  /** Short editorial justification, separate from experimental results. */
  rationale?: string;
  evidenceStatus: EvidenceStatus;
}

export interface PSIInvestigation {
  id: string;
  acronym: string;
  fullTitle: string;
  programFamily?: string;
  status?: string;
  statusBasis?: string;
  flightPlatform?: string;
  investigationPeriod?: string;
  safetyPillars?: SafetyPillar[];

  hardware?: HardwareSpec;
  fuelSpecs?: FuelSpecs;
  testConditions?: TestConditions;
  experimentalDesign?: ExperimentalDesign;

  /** Source-linked evidence notes; entries can describe outcomes, methods, planned conditions, or analysis scope. */
  findings?: string[];
  findingsEvidenceStatus?: EvidenceStatus;
  findingsNote?: string;
  modelingUtility?: string;
  terrestrialApplications?: string[];

  relevanceScores?: RelevanceScores;
  sources: SourceReference[];
}

/** Public NASA PSI catalog metadata captured for reproducible, source-linked detail pages. */
export interface PSICatalogFile {
  title: string;
  sizeBytes: number | null;
  downloadUrl?: string;
}

export interface PSICatalogPublication {
  title: string;
  authors: string | null;
  doi: string | null;
  status: string | null;
  url: string | null;
}

export interface PSICatalogEntry {
  title: string;
  recordUrl: string;
  apiUrl: string;
  doi: string | null;
  version: number | null;
  updatedAt: string | null;
  releaseDate: string | null;
  license: { name: string; url: string | null; identifier: string | null } | null;
  objective: string | null;
  approach: string | null;
  hypothesis: string | null;
  researchImpacts: string | null;
  experimentalTables: PSICatalogFile[];
  modelingTables: PSICatalogFile[];
  publications: PSICatalogPublication[];
}

/** Non-PSI reference material shown separately from the verified investigation records. */
export interface HistoricalEvent {
  id: string;
  date: string;
  title: string;
  summary: string;
  lesson: string;
  source: SourceReference;
  evidenceStatus: EvidenceStatus;
}

export interface TechnologyTransfer {
  id: string;
  title: string;
  summary: string;
  nasaOrigin: string;
  caveat: string;
  source: SourceReference;
  additionalSources?: SourceReference[];
  evidenceStatus: EvidenceStatus;
}

export interface LeadVerification {
  lead: string;
  verdict: "In PSI dataset" | "Official NASA work, not in PSI dataset" | "Not verified";
  detail: string;
  investigationId?: string;
  source?: SourceReference;
}

export interface ReferenceAtmosphere {
  id: string;
  label: string;
  oxygenPercent: number;
  pressurePsi: number;
  note: string;
  source: SourceReference;
  evidenceStatus: EvidenceStatus;
}

/** Atmosphere Lab and Fire Risk types */
export type EnvironmentPresetId =
  | "earth"
  | "iss"
  | "eva"
  | "lunar"
  | "mars"
  | "custom";

export interface AtmosphereLabState {
  preset: EnvironmentPresetId;
  pressurePsi: number;
  oxygenPercent: number;
  airflowCmPerSecond: number;
  gravityG: number;
  customLabel?: string;
}

export interface MaterialOption {
  id: "cotton-fiberglass" | "pmma" | "nomex" | "silicone";
  name: string;
  factor: number;
  basis: string;
  traceableSource: string;
}

export type FireRiskClassification =
  | "Safe Operational Reference"
  | "Elevated Flammability Concern"
  | "Critical Engineering Concern";

export interface FireRiskResult {
  rawIndex: number;
  normalizedScore: number;
  classification: FireRiskClassification;
  oxygenContribution: number;
  pressureContribution: number;
  materialContribution: number;
  oxygenPartialPressurePsi: number;
  oxygenPartialPressureKpa: number;
  explanation: string;
  matchedInvestigationIds: string[];
}

export type RankingDimensionKey =
  | "safety"
  | "atmosphere"
  | "gravity"
  | "hardware"
  | "completeness";

export interface MissionRankingDimension {
  key: RankingDimensionKey;
  label: string;
  weight: number;
  score: number;
  contribution: number;
}

export interface MissionRankingResult {
  investigationId: string;
  record: PSIInvestigation;
  totalScore: number;
  dimensions: Record<RankingDimensionKey, MissionRankingDimension>;
  rationale: string;
  completenessScore: number;
}

export type HardwareCategory = "facility" | "apparatus" | "sensor" | "experiment";

export interface HardwareNode {
  id: string;
  label: string;
  category: HardwareCategory;
  facility?: string;
  description: string;
  investigationIds: string[];
  documentedNotes: string;
  sources?: SourceReference[];
}

