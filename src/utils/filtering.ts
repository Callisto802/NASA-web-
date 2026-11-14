import type { PSIInvestigation, SafetyPillar } from "../types";

export type SortKey = "relevance" | "title" | "period";

export interface FilterState {
  query: string;
  pillars: SafetyPillar[];
  includeUnclassified: boolean;
  phases: string[];
  programFamilies: string[];
  facilities: string[];
  oxygenRange: [number, number] | null;
  pressureRange: [number, number] | null;
  airflowRange: [number, number] | null;
  includeUnknownConditions: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  query: "",
  pillars: [],
  includeUnclassified: false,
  phases: [],
  programFamilies: [],
  facilities: [],
  oxygenRange: null,
  pressureRange: null,
  airflowRange: null,
  includeUnknownConditions: true,
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9%.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function searchableText(record: PSIInvestigation): string {
  const parts: string[] = [
    record.id,
    record.acronym,
    record.fullTitle,
    record.programFamily ?? "",
    record.flightPlatform ?? "",
    record.status ?? "",
    record.modelingUtility ?? "",
    ...(record.findings ?? []),
    ...(record.terrestrialApplications ?? []),
    ...(record.fuelSpecs?.materials ?? []),
    ...(record.hardware?.sharedHardwareIds ?? []),
    record.hardware?.facility ?? "",
    record.hardware?.apparatus ?? "",
    record.experimentalDesign?.objectives ?? "",
    ...(record.testConditions?.suppressantsTested ?? []),
    ...(record.experimentalDesign?.sensorsAndDiagnostics ?? []),
    ...record.sources.map((source) => `${source.title} ${source.organization ?? ""}`),
  ];
  return normalize(parts.join(" "));
}

type ConditionField = "oxygen" | "pressure" | "airflow";

/**
 * Includes both reported min/max ranges and discrete named conditions, so a
 * record whose only numeric value is a named atmosphere point is not treated
 * as Unknown by a range filter.
 */
function conditionMatch(
  record: PSIInvestigation,
  field: ConditionField,
  range: [number, number] | null,
): boolean | null {
  if (!range) return true;
  const conditions = record.testConditions;
  if (!conditions) return null;

  const key =
    field === "oxygen" ? "oxygenPercent" : field === "pressure" ? "pressurePsi" : "airflowCmPerSecond";
  const minKey =
    field === "oxygen"
      ? "oxygenPercentMin"
      : field === "pressure"
        ? "pressurePsiMin"
        : "airflowCmPerSecondMin";
  const maxKey =
    field === "oxygen"
      ? "oxygenPercentMax"
      : field === "pressure"
        ? "pressurePsiMax"
        : "airflowCmPerSecondMax";

  const intervals: Array<[number, number]> = [];
  const min = conditions[minKey as keyof typeof conditions] as number | undefined;
  const max = conditions[maxKey as keyof typeof conditions] as number | undefined;
  if (typeof min === "number" || typeof max === "number") {
    intervals.push([min ?? max ?? 0, max ?? min ?? 0]);
  }
  for (const named of conditions.namedConditions ?? []) {
    const value = named[key as keyof typeof named] as number | undefined;
    if (typeof value === "number") intervals.push([value, value]);
  }
  if (intervals.length === 0) return null;
  return intervals.some(([start, end]) => end >= range[0] && start <= range[1]);
}

export function hasKnownCondition(
  record: PSIInvestigation,
  field: "oxygen" | "pressure" | "airflow",
): boolean {
  const conditions = record.testConditions;
  if (!conditions) return false;
  const named = conditions.namedConditions ?? [];
  if (field === "oxygen") {
    return (
      conditions.oxygenPercentMin !== undefined ||
      conditions.oxygenPercentMax !== undefined ||
      named.some((item) => item.oxygenPercent !== undefined)
    );
  }
  if (field === "pressure") {
    return (
      conditions.pressurePsiMin !== undefined ||
      conditions.pressurePsiMax !== undefined ||
      named.some((item) => item.pressurePsi !== undefined)
    );
  }
  return (
    conditions.airflowCmPerSecondMin !== undefined ||
    conditions.airflowCmPerSecondMax !== undefined ||
    named.some((item) => item.airflowCmPerSecond !== undefined)
  );
}

/**
 * Filter semantics for unknown values:
 * - A record with a known value is included when its reported range overlaps the
 *   selected range.
 * - A record with an unknown value is excluded from that range filter by default.
 * - The user can opt in to keeping unknown records, which are then labelled
 *   "Unknown — not matched against this range" rather than being treated as 0.
 */
export function applyFilters(
  records: PSIInvestigation[],
  filters: FilterState,
): PSIInvestigation[] {
  const query = normalize(filters.query);
  const tokens = query.length > 0 ? query.split(" ").filter(Boolean) : [];

  return records.filter((record) => {
    if (tokens.length > 0) {
      const haystack = searchableText(record);
      const matchesAll = tokens.every((token) => haystack.includes(token));
      if (!matchesAll) return false;
    }

    if (filters.pillars.length > 0) {
      const pillars = record.safetyPillars ?? [];
      const matchesPillar = filters.pillars.some((pillar) => pillars.includes(pillar));
      const isUnclassified = pillars.length === 0;
      if (!matchesPillar && !(isUnclassified && filters.includeUnclassified)) return false;
    }

    if (filters.phases.length > 0) {
      const phase = record.fuelSpecs?.phase ?? "Unknown";
      if (!filters.phases.includes(phase)) return false;
    }

    if (filters.programFamilies.length > 0) {
      if (!filters.programFamilies.includes(record.programFamily ?? "Unclassified")) {
        return false;
      }
    }

    if (filters.facilities.length > 0) {
      const ids = [
        ...(record.hardware?.sharedHardwareIds ?? []),
        record.hardware?.facility ?? "",
      ];
      if (!filters.facilities.some((facility) => ids.includes(facility))) return false;
    }

    const oxy = conditionMatch(record, "oxygen", filters.oxygenRange);
    if (oxy === false) return false;
    if (oxy === null && filters.oxygenRange && !filters.includeUnknownConditions) return false;

    const pressure = conditionMatch(record, "pressure", filters.pressureRange);
    if (pressure === false) return false;
    if (pressure === null && filters.pressureRange && !filters.includeUnknownConditions) {
      return false;
    }

    const airflow = conditionMatch(record, "airflow", filters.airflowRange);
    if (airflow === false) return false;
    if (airflow === null && filters.airflowRange && !filters.includeUnknownConditions) {
      return false;
    }

    return true;
  });
}

export function countActiveFilters(filters: FilterState): number {
  return (
    (filters.query ? 1 : 0) +
    filters.pillars.length +
    filters.phases.length +
    filters.programFamilies.length +
    filters.facilities.length +
    (filters.oxygenRange ? 1 : 0) +
    (filters.pressureRange ? 1 : 0) +
    (filters.airflowRange ? 1 : 0)
  );
}

export function uniqueValues(records: PSIInvestigation[], getter: (r: PSIInvestigation) => string[]) {
  const values = new Set<string>();
  for (const record of records) {
    for (const value of getter(record)) {
      if (value) values.add(value);
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export const FACILITY_LABELS: Record<string, string> = {
  MSG: "Microgravity Science Glovebox (MSG)",
  CIR: "Combustion Integrated Rack (CIR)",
  MDCA: "Multi-user Droplet Combustion Apparatus (MDCA)",
  ACME: "ACME hardware",
  SAME: "SAME hardware",
  SAFFIRE: "Saffire flow duct",
  CYGNUS: "Cygnus cargo vehicle",
  BASS: "BASS flow duct",
  LAB: "PI laboratory / computational",
};
