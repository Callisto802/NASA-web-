import type { PSIInvestigation, SourceReference } from "../types";
import { DATASET_META, RELEVANCE_RUBRIC } from "../data/reference";
import { SCORE_FORMULA, weightedRelevance } from "./ranking";
import { formatRange } from "./format";

export interface BriefOptions {
  title: string;
  note?: string;
  includeSources?: boolean;
  includeScores?: boolean;
}

const evidenceLine = (status: string | undefined) => status ?? "Unknown";

function sourceLine(source: SourceReference): string {
  const meta = [source.organization, source.identifier, source.publishedAt]
    .filter(Boolean)
    .join(" · ");
  return `- [${source.title}](${source.url})${meta ? ` — ${meta}` : ""}`;
}

export function buildMarkdownBrief(
  records: PSIInvestigation[],
  options: BriefOptions,
  generatedAt: Date,
): string {
  const lines: string[] = [];
  lines.push(`# ${options.title}`);
  lines.push("");
  lines.push(`Generated: ${generatedAt.toISOString()}`);
  lines.push(`Dataset: ${DATASET_META.title} (retrieved ${DATASET_META.retrievedAt})`);
  lines.push(`Investigations: ${records.map((record) => `${record.acronym} (${record.id})`).join(", ")}`);
  lines.push("");
  lines.push("> Educational research brief. Not a fire-safety calculation, certification, or NASA conclusion.");
  if (options.note) {
    lines.push("");
    lines.push(options.note);
  }
  lines.push("");
  lines.push("## Scope and method");
  lines.push("");
  lines.push(DATASET_META.method);
  lines.push("");
  lines.push(DATASET_META.limitations);
  lines.push("");

  if (records.length >= 2) {
    lines.push("## Side-by-side comparison");
    lines.push("");
    const header = ["Field", ...records.map((record) => `${record.acronym} (${record.id})`)];
    lines.push(`| ${header.join(" | ")} |`);
    lines.push(`| ${header.map(() => "---").join(" | ")} |`);
    const row = (field: string, value: (record: PSIInvestigation) => string) => {
      lines.push(`| ${field} | ${records.map((record) => value(record)).join(" | ")} |`);
    };
    row("Program family", (record) => record.programFamily ?? "Unknown");
    row("Flight platform", (record) => record.flightPlatform ?? "Unknown");
    row("Fuel phase", (record) => record.fuelSpecs?.phase ?? "Unknown");
    row("Materials", (record) => (record.fuelSpecs?.materials ?? []).join("; ") || "Unknown");
    row("Facility", (record) => record.hardware?.facility ?? "Unknown");
    row("Safety pillars", (record) => (record.safetyPillars ?? []).join(", ") || "Unclassified");
    row("O2 range", (record) =>
      formatRange(
        record.testConditions?.oxygenPercentMin,
        record.testConditions?.oxygenPercentMax,
        "%",
      ),
    );
    row("Pressure range", (record) =>
      formatRange(
        record.testConditions?.pressurePsiMin,
        record.testConditions?.pressurePsiMax,
        "psia",
      ),
    );
    row("Airflow range", (record) =>
      formatRange(
        record.testConditions?.airflowCmPerSecondMin,
        record.testConditions?.airflowCmPerSecondMax,
        "cm/s",
      ),
    );
    row("Suppressants", (record) =>
      (record.testConditions?.suppressantsTested ?? []).join("; ") || "None stated",
    );
    row("Evidence summary entries", (record) =>
      (record.findings ?? []).length > 0 ? `${(record.findings ?? []).length} entr${(record.findings ?? []).length === 1 ? "y" : "ies"}` : "Unknown",
    );
    row("Evidence status (summary)", (record) => evidenceLine(record.findingsEvidenceStatus));
    if (options.includeScores !== false) {
      row("Editorial relevance (0–5)", (record) =>
        weightedRelevance(record) === null ? "Not scored" : String(weightedRelevance(record)),
      );
    }
    lines.push("");
  }

  lines.push("## Investigation details");
  for (const record of records) {
    lines.push("");
    lines.push(`### ${record.acronym} — ${record.fullTitle} (${record.id})`);
    lines.push("");
    lines.push(`- Status: ${record.status ?? "Unknown"}${record.statusBasis ? ` (basis: ${record.statusBasis})` : ""}`);
    lines.push(`- Period: ${record.investigationPeriod ?? "Not stated"}`);
    lines.push(`- Platform: ${record.flightPlatform ?? "Unknown"}`);
    lines.push(`- Safety pillars: ${(record.safetyPillars ?? []).join(", ") || "Unclassified"}`);
    lines.push(
      `- Hardware: ${record.hardware?.facility ?? "Unknown"}${record.hardware?.apparatus ? ` — ${record.hardware.apparatus}` : ""} [${evidenceLine(record.hardware?.evidenceStatus)}]`,
    );
    lines.push(
      `- Fuel: ${record.fuelSpecs?.phase ?? "Unknown"} — ${(record.fuelSpecs?.materials ?? []).join("; ") || "materials Unknown"} [${evidenceLine(record.fuelSpecs?.evidenceStatus)}]`,
    );
    lines.push(
      `- Conditions: O2 ${formatRange(record.testConditions?.oxygenPercentMin, record.testConditions?.oxygenPercentMax, "%")}; pressure ${formatRange(record.testConditions?.pressurePsiMin, record.testConditions?.pressurePsiMax, "psia")}; airflow ${formatRange(record.testConditions?.airflowCmPerSecondMin, record.testConditions?.airflowCmPerSecondMax, "cm/s")} [${evidenceLine(record.testConditions?.evidenceStatus)}]`,
    );
    if (record.testConditions?.namedConditions?.length) {
      for (const condition of record.testConditions.namedConditions) {
        lines.push(
          `  - ${condition.label}: ${condition.oxygenPercent}% O2 at ${condition.pressurePsi} psia${condition.note ? ` — ${condition.note}` : ""}`,
        );
      }
    }
    if (record.testConditions?.notes) {
      lines.push(`  - Note: ${record.testConditions.notes}`);
    }
    lines.push(`- Modeling utility (analyst note): ${record.modelingUtility ?? "Not stated"}`);
    if (record.terrestrialApplications?.length) {
      lines.push(`- Terrestrial applications: ${record.terrestrialApplications.join("; ")}`);
    }
    if ((record.findings ?? []).length > 0) {
      lines.push(`- Evidence summary [${evidenceLine(record.findingsEvidenceStatus)}]:`);
      for (const finding of record.findings ?? []) {
        lines.push(`  - ${finding}`);
      }
    } else {
      lines.push(`- Evidence summary: Unknown — ${record.findingsNote ?? "not summarised in the record."}`);
    }

    if (options.includeSources !== false) {
      lines.push("- Sources:");
      for (const source of record.sources) {
        lines.push(`  ${sourceLine(source)}`);
      }
    }
  }

  lines.push("");
  lines.push("## Formulas and assumptions");
  lines.push("");
  lines.push("- Pressure conversion: 1 atm = 14.6959 psi. Values reported in atm by a source are converted to psi and labelled Derived in the interface.");
  lines.push(`- Editorial relevance score: ${SCORE_FORMULA} This is not a NASA measurement.`);
  lines.push(
    `- Relevance weights: ${RELEVANCE_RUBRIC.dimensions
      .map((dimension) => `${dimension.label} ${dimension.weight}`)
      .join(", ")}.`,
  );
  lines.push("- Missing values are written as Unknown, never as 0.");
  lines.push("- No lunar- or Martian-gravity interpolation is included; the sources do not support a validated model for it.");
  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  lines.push(DATASET_META.limitations);
  lines.push("");
  lines.push(
    "Oxygen concentration alone does not determine fire risk: behaviour also depends on pressure, material, geometry, airflow, ignition source and test configuration. Compare records only within their stated configurations.",
  );
  lines.push("");
  return lines.join("\n");
}

export function buildJsonBrief(
  records: PSIInvestigation[],
  options: BriefOptions,
  generatedAt: Date,
): string {
  const payload = {
    generatedAt: generatedAt.toISOString(),
    title: options.title,
    note: options.note ?? null,
    disclaimer:
      "Educational research explorer output. Not a fire-safety calculation, certification, or NASA conclusion.",
    dataset: {
      name: DATASET_META.title,
      retrievedAt: DATASET_META.retrievedAt,
      method: DATASET_META.method,
      scope: DATASET_META.scope,
      limitations: DATASET_META.limitations,
      sourceUrl: DATASET_META.psiSearchUrl,
    },
    selectedInvestigationIds: records.map((record) => record.id),
    formulas: {
      pressureConversion: "1 atm = 14.6959 psi",
      relevanceScore: SCORE_FORMULA,
      relevanceWeights: Object.fromEntries(
        RELEVANCE_RUBRIC.dimensions.map((dimension) => [dimension.label, dimension.weight]),
      ),
      note: "Relevance scores are editorial rankings, not NASA measurements.",
    },
    investigations: records.map((record) => ({
      id: record.id,
      acronym: record.acronym,
      fullTitle: record.fullTitle,
      programFamily: record.programFamily ?? null,
      status: record.status ?? null,
      statusBasis: record.statusBasis ?? null,
      flightPlatform: record.flightPlatform ?? null,
      investigationPeriod: record.investigationPeriod ?? null,
      safetyPillars: record.safetyPillars ?? [],
      hardware: record.hardware ?? null,
      fuelSpecs: record.fuelSpecs ?? null,
      testConditions: record.testConditions ?? null,
      experimentalDesign: record.experimentalDesign ?? null,
      findings: record.findings ?? [],
      findingsEvidenceStatus: record.findingsEvidenceStatus ?? "Unknown",
      findingsNote: record.findingsNote ?? null,
      modelingUtility: record.modelingUtility ?? null,
      terrestrialApplications: record.terrestrialApplications ?? [],
      relevanceScores: record.relevanceScores ?? null,
      editorRelevance: weightedRelevance(record),
      sources: record.sources,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
