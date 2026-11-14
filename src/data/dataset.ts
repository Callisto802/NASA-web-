import rawInvestigations from "./psi_investigations.json";
import type { EvidenceStatus, PSIInvestigation } from "../types";

/**
 * Runtime validation guard. The JSON is authored by hand, so a malformed record
 * should surface as an explicit error state instead of silently rendering.
 */
export function loadInvestigations(): PSIInvestigation[] {
  const records = rawInvestigations as unknown as PSIInvestigation[];
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Investigation dataset is empty or not an array.");
  }

  const ids = new Set<string>();
  for (const record of records) {
    if (!record.id || !record.fullTitle) {
      throw new Error("An investigation record is missing its id or fullTitle.");
    }
    if (ids.has(record.id)) {
      throw new Error(`Duplicate investigation id: ${record.id}`);
    }
    ids.add(record.id);
    if (!Array.isArray(record.sources) || record.sources.length === 0) {
      throw new Error(`Investigation ${record.id} has no source references.`);
    }
    for (const source of record.sources) {
      if (!source.url || !source.title) {
        throw new Error(`Investigation ${record.id} has an incomplete source.`);
      }
    }
  }
  return records;
}

export const EVIDENCE_ORDER: EvidenceStatus[] = [
  "NASA-reported",
  "Analysis-derived",
  "Derived",
  "Illustrative estimate",
  "Unverified",
  "Unknown",
];

export function evidenceDescription(status: EvidenceStatus): string {
  switch (status) {
    case "NASA-reported":
      return "Stated directly in an official NASA or investigation source.";
    case "Analysis-derived":
      return "Produced through modeling, image analysis, or another analytical method; see the record note to distinguish it from a direct measurement.";
    case "Derived":
      return "Calculated in this application from sourced values; the formula and inputs are shown.";
    case "Illustrative estimate":
      return "An assumed scenario, editorial score or visualisation — not a NASA measurement.";
    case "Unverified":
      return "Not supported by an accessible source in this review.";
    case "Unknown":
      return "The available sources do not provide the value.";
  }
}
