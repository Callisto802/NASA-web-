import type { PSIInvestigation } from "../types";
import { formatRange } from "./format";
import { E_FIELD_GRAVITY_NOTE, FM2_SOURCE, LUNAR_FIRE_SAFETY, LUCI_FACTS } from "../data/reference";

export interface AssistantSourceLink {
  title: string;
  url: string;
}

export interface AssistantCitation {
  id: string;
  acronym: string;
  title: string;
}

export interface AssistantPoint {
  text: string;
  citations?: string[];
}

export interface AssistantBlock {
  heading?: string;
  points: AssistantPoint[];
  note?: string;
  sources?: AssistantSourceLink[];
}

export interface AssistantAnswer {
  intent: string;
  title: string;
  blocks: AssistantBlock[];
  citations: AssistantCitation[];
  matchedIds: string[];
  confidence: "high" | "medium" | "low";
  suggestions?: string[];
}

const label = (record: PSIInvestigation) =>
  record.acronym && record.acronym !== record.id
    ? `${record.acronym} (${record.id})`
    : record.id;

const citationFor = (record: PSIInvestigation): AssistantCitation => ({
  id: record.id,
  acronym: record.acronym,
  title: record.fullTitle,
});

const byId = (records: PSIInvestigation[], ids: string[]) =>
  ids
    .map((id) => records.find((record) => record.id === id))
    .filter((record): record is PSIInvestigation => Boolean(record));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const has = (query: string, terms: string[]) => terms.some((term) => query.includes(term));

function envelopeLine(record: PSIInvestigation): string {
  const conditions = record.testConditions;
  if (!conditions) return "Test conditions: not reported in the PSI summary.";
  const parts: string[] = [];
  if (conditions.oxygenPercentMin !== undefined || conditions.oxygenPercentMax !== undefined) {
    parts.push(`O2 ${formatRange(conditions.oxygenPercentMin, conditions.oxygenPercentMax, "%")}`);
  }
  if (conditions.pressurePsiMin !== undefined || conditions.pressurePsiMax !== undefined) {
    parts.push(
      `pressure ${formatRange(conditions.pressurePsiMin, conditions.pressurePsiMax, "psia")}`,
    );
  }
  if (
    conditions.airflowCmPerSecondMin !== undefined ||
    conditions.airflowCmPerSecondMax !== undefined
  ) {
    parts.push(
      `flow ${formatRange(
        conditions.airflowCmPerSecondMin,
        conditions.airflowCmPerSecondMax,
        "cm/s",
        1,
      )}`,
    );
  }
  if (conditions.namedConditions?.length) {
    parts.push(
      `${conditions.namedConditions.length} named atmosphere points (${conditions.namedConditions
        .map((item) => `${item.oxygenPercent}% / ${item.pressurePsi} psia`)
        .join("; ")})`,
    );
  }
  if (conditions.suppressantsTested?.length) {
    parts.push(`suppressants: ${conditions.suppressantsTested.join(", ")}`);
  }
  if (parts.length === 0) return "Test conditions: Unknown in the PSI summary.";
  return `Test conditions: ${parts.join("; ")}.`;
}

function matchRecordsByName(query: string, records: PSIInvestigation[]): PSIInvestigation[] {
  const normalized = normalize(query).replace(/-/g, " ").replace(/\s+/g, " ");
  const candidates = records.filter((record) => {
    const acronym = normalize(record.acronym).replace(/-/g, " ").replace(/\s+/g, " ");
    if (acronym.length >= 3 && normalized.includes(acronym)) return true;
    const title = normalize(record.fullTitle).replace(/-/g, " ").replace(/\s+/g, " ");
    return title.length > 12 && normalized.includes(title);
  });
  // If one acronym is a prefix of a longer matched acronym, keep only the specific one:
  // "BASS-II" should not also return "BASS".
  return candidates.filter((candidate) => {
    const acronym = normalize(candidate.acronym).replace(/-/g, " ");
    return !candidates.some((other) => {
      if (other.id === candidate.id) return false;
      const otherAcronym = normalize(other.acronym).replace(/-/g, " ");
      return otherAcronym.startsWith(`${acronym} `);
    });
  });
}

export const SUGGESTED_QUESTIONS = [
  "Which investigations studied solid-material flammability?",
  "Compare the smoke and dust measurement investigations.",
  "Which records include measurements relevant to reduced-gravity combustion?",
  "What oxygen and pressure conditions are documented?",
  "Which investigations tested fire suppressants?",
  "Is there lunar- or Martian-gravity combustion data?",
];

export function suggestedQuestions(records: PSIInvestigation[]): string[] {
  const available: string[] = [];
  if (records.some((r) => r.fuelSpecs?.phase === "Solid")) {
    available.push(SUGGESTED_QUESTIONS[0]);
  }
  if (records.filter((r) => (r.safetyPillars ?? []).includes("Detection")).length >= 2) {
    available.push(SUGGESTED_QUESTIONS[1]);
  }
  if (records.some((r) => (r.flightPlatform ?? "").toLowerCase().includes("iss"))) {
    available.push(SUGGESTED_QUESTIONS[2]);
  }
  if (records.some((r) => r.testConditions?.oxygenPercentMin !== undefined)) {
    available.push(SUGGESTED_QUESTIONS[3]);
  }
  if (records.some((r) => (r.testConditions?.suppressantsTested ?? []).length > 0)) {
    available.push(SUGGESTED_QUESTIONS[4]);
  }
  available.push(SUGGESTED_QUESTIONS[5]);
  return available.slice(0, 5);
}

export function answerQuestion(question: string, records: PSIInvestigation[]): AssistantAnswer {
  const query = normalize(question);
  const named = matchRecordsByName(question, records);

  if (!query) {
    return {
      intent: "empty",
      title: "Ask a question about the dataset",
      blocks: [
        {
          points: [
            {
              text: "The assistant searches only the 24 verified PSI combustion records in this explorer. Try one of the suggested questions, or name an investigation.",
            },
          ],
          note: "No external model is used. Answers are assembled deterministically from dataset fields.",
        },
      ],
      citations: [],
      matchedIds: [],
      confidence: "low",
    };
  }

  // Comparison of two named investigations.
  if (named.length >= 2) {
    const [a, b] = named.slice(0, 2);
    return {
      intent: "compare-two",
      title: `Comparing ${label(a)} and ${label(b)}`,
      blocks: [
        {
          heading: "What each record covers",
          points: [
            {
              text: `${label(a)} — ${a.fullTitle}. ${a.experimentalDesign?.objectives ?? "Objectives not summarised."}`,
              citations: [a.id],
            },
            {
              text: `${label(b)} — ${b.fullTitle}. ${b.experimentalDesign?.objectives ?? "Objectives not summarised."}`,
              citations: [b.id],
            },
          ],
        },
        {
          heading: "Documented conditions",
          points: [
            { text: `${label(a)}: ${envelopeLine(a)}`, citations: [a.id] },
            { text: `${label(b)}: ${envelopeLine(b)}`, citations: [b.id] },
          ],
        },
        {
          heading: "Evidence caveat",
          points: [
            {
              text: `Both records are compared field by field. Missing fields are shown as Unknown and are not treated as zero. ${a.findings?.length ? "" : `${label(a)} has no evidence-summary entries. `}${b.findings?.length ? "" : `${label(b)} has no evidence-summary entries.`}`,
              citations: [a.id, b.id],
            },
          ],
          note: "Use the Compare page for the full side-by-side table and export.",
        },
      ],
      citations: [citationFor(a), citationFor(b)],
      matchedIds: [a.id, b.id],
      confidence: "high",
    };
  }

  // Lunar / Mars gap.
  if (has(query, ["lunar", "moon", "martian", "mars", "partial gravity", "partial-g", "lunar-g"])) {
    return {
      intent: "gravity-gap",
      title: "Partial-gravity combustion data",
      blocks: [
        {
          heading: "Inside the PSI dataset",
          points: [
            {
              text: "None of the 24 PSI Combustion Science records report direct lunar- or Martian-gravity combustion measurements. The flight records are ISS microgravity experiments or Saffire tests on an uncrewed Cygnus vehicle; the rest are ground or computational studies.",
            },
          ],
        },
        {
          heading: "Official NASA context outside PSI",
          points: [
            {
              text: "NASA's Lunar Combustion Investigation (LUCI) flew in February 2025 and produced the first extended-duration combustion tests in simulated lunar gravity (greater than 25 seconds), using a spinning New Shepard vehicle. It is not in the PSI dataset and is not used to compute any result here.",
            },
            {
              text: "NASA's Flammability of Materials on the Moon (FM2) experiment is described by NASA as the first combustion experiment on another planetary body. NASA's Combustion Science page currently lists FM2 under current experiments, while a December 2025 presentation described a planned late-2026 launch. Launch status is not asserted here.",
            },
            {
              text: E_FIELD_GRAVITY_NOTE.body,
              citations: ["PSI-22"],
            },
          ],
          note: "No interpolation between 0g and 1g is presented as a prediction for the Moon or Mars. LUCI uses centrifugal acceleration, which introduces Coriolis effects.",
          sources: [
            { title: LUCI_FACTS.source.title, url: LUCI_FACTS.source.url },
            { title: LUNAR_FIRE_SAFETY.title, url: LUNAR_FIRE_SAFETY.url },
            { title: "NASA Combustion Science — FM2", url: FM2_SOURCE.url },
            { title: E_FIELD_GRAVITY_NOTE.source.title, url: E_FIELD_GRAVITY_NOTE.source.url },
          ],
        },
      ],
      citations: [],
      matchedIds: [],
      confidence: "high",
      suggestions: [
        "Which records include measurements relevant to reduced-gravity combustion?",
        "What oxygen and pressure conditions are documented?",
      ],
    };
  }

  // Specific named investigation.
  if (named.length === 1) {
    const record = named[0];
    const points: AssistantPoint[] = [
      {
        text: `${record.fullTitle} (${record.id}) — ${record.programFamily ?? "Unclassified program"}. Platform: ${record.flightPlatform ?? "Unknown"}. Status: ${record.status ?? "Unknown"}.`,
        citations: [record.id],
      },
      {
        text: record.experimentalDesign?.objectives
          ? `Objectives: ${record.experimentalDesign.objectives}`
          : "The PSI record does not summarise objectives.",
        citations: [record.id],
      },
      { text: envelopeLine(record), citations: [record.id] },
    ];
    if ((record.findings ?? []).length > 0) {
      for (const finding of record.findings ?? []) {
        points.push({ text: `Evidence note: ${finding}`, citations: [record.id] });
      }
    } else {
      points.push({
        text: `No evidence-summary entries are available for this record. ${record.findingsNote ?? "Consult the cited publications for measured outcomes."}`,
        citations: [record.id],
      });
    }
    return {
      intent: "single-record",
      title: `${label(record)} at a glance`,
      blocks: [
        { heading: "Record summary", points },
        {
          heading: "How to read this",
          points: [
            {
              text: "Statements above are paraphrases of the PSI record. They are not a NASA conclusion about fire safety, and the relevance score (if shown) is editorial.",
            },
          ],
        },
      ],
      citations: [citationFor(record)],
      matchedIds: [record.id],
      confidence: "high",
    };
  }

  // Smoke and dust detection.
  if (has(query, ["smoke", "aerosol", "dust", "detector", "detection", "particle"])) {
    const matches = byId(records, ["PSI-102", "PSI-101", "PSI-47", "PSI-115"]);
    return {
      intent: "smoke-detection",
      title: "Smoke, dust and detection investigations",
      blocks: [
        {
          heading: "Direct smoke measurements",
          points: [
            {
              text: "SAME (PSI-102) quantified low-gravity liquid smoke particle sizes and linked them to generation and transport. The PSI summary gives methods but no measured sizes.",
              citations: ["PSI-102"],
            },
            {
              text: "SAME-R (PSI-101) reflight completed 66 test points in 2010 with Pyrell foam, broadened heating and an M-pass instrument.",
              citations: ["PSI-101"],
            },
          ],
        },
        {
          heading: "Dust and aerosol instrument work",
          points: [
            {
              text: "DAFT / DAFT-2 (PSI-47) used Arizona Red Dust, not combustion smoke, to check whether a modified TSI P-Trak would work in microgravity before SAME relied on it.",
              citations: ["PSI-47"],
            },
            {
              text: "PSI-115 is a ground simulation of smoke growth from a SAME-like source using dibutyl phthalate; its summary reports no measured particle sizes.",
              citations: ["PSI-115"],
            },
          ],
          note: "The dust test is an instrument feasibility study, not evidence about smoke detector performance in a fire.",
        },
      ],
      citations: matches.map(citationFor),
      matchedIds: matches.map((record) => record.id),
      confidence: "high",
    };
  }

  // Solid flammability.
  if (has(query, ["solid", "material", "fabric", "pmma", "acrylic", "flame spread", "flammability"])) {
    const isGroundRecord = (record: PSIInvestigation) => {
      const platform = (record.flightPlatform ?? "").toLowerCase();
      return platform.includes("not applicable") || platform.includes("ground");
    };
    const solid = records.filter((record) => {
      if (record.fuelSpecs?.phase !== "Solid") return false;
      const pillars = record.safetyPillars ?? [];
      const detectionOnly = pillars.length === 1 && pillars[0] === "Detection";
      return !detectionOnly;
    });
    const flight = solid.filter((record) => !isGroundRecord(record));
    const ground = solid.filter(isGroundRecord);
    return {
      intent: "solid-flammability",
      title: "Solid-material flammability",
      blocks: [
        {
          heading: "Flight investigations",
          points: flight.map((record) => ({
            text: `${label(record)} — ${record.fullTitle}. Materials: ${(record.fuelSpecs?.materials ?? []).slice(0, 4).join(", ") || "not listed"}. ${envelopeLine(record)}`,
            citations: [record.id],
          })),
        },
        ...(ground.length > 0
          ? [
              {
                heading: "Ground or modeling work using solid-fuel data",
                points: ground.map((record) => ({
                  text: `${label(record)} — ${record.experimentalDesign?.objectives ?? record.fullTitle}`,
                  citations: [record.id],
                })),
              },
            ]
          : []),
        {
          heading: "What the summaries do and do not say",
          points: [
            {
              text: "The evidence summaries include configuration-specific solid-fuel outcomes for BASS, BASS-II, and SAFFIRE I–III. Other entries describe test scope or data availability rather than providing a numeric outcome. Use each record’s note and linked NASA reports before comparing values.",
              citations: ["PSI-25", "PSI-98", "PSI-99", "PSI-100"],
            },
          ],
          note: "Saffire burned large samples on an uncrewed Cygnus vehicle; BASS and BASS-II used small samples in the MSG. The configurations are not directly interchangeable.",
        },
      ],
      citations: [...flight, ...ground].map(citationFor),
      matchedIds: [...flight, ...ground].map((record) => record.id),
      confidence: "high",
    };
  }

  // Suppressants.
  if (has(query, ["suppress", "extinguish", "extinction", "inert", "co2", "helium", "sf6", "nitrogen", "agent"])) {
    const matches = byId(records, ["PSI-69", "PSI-68", "PSI-26", "PSI-25"]);
    return {
      intent: "suppression",
      title: "Suppressant and extinction work",
      blocks: [
        {
          heading: "Records that name suppressants or inert dilution",
          points: matches.map((record) => ({
            text: `${label(record)} — ${(record.testConditions?.suppressantsTested ?? ["No suppressant named"]).join(", ")}. ${envelopeLine(record)}`,
            citations: [record.id],
          })),
        },
        {
          heading: "Important limitation",
          points: [
            {
              text: "The PSI summaries name the agents tested but do not report the limiting oxygen index, suppressant concentrations or a ranking of effectiveness. This explorer does not invent those values.",
              citations: ["PSI-69"],
            },
            {
              text: "BASS-II used gaseous nitrogen to dilute the working volume below 21% oxygen; that is an experimental variable, not a validated spacecraft suppression system.",
              citations: ["PSI-25"],
            },
          ],
        },
      ],
      citations: matches.map(citationFor),
      matchedIds: matches.map((record) => record.id),
      confidence: "high",
    };
  }

  // Conditions / atmosphere.
  if (has(query, ["oxygen", "pressure", "atmosphere", "condition", "envelope", "psia", "atm", "airflow"])) {
    const withConditions = records.filter(
      (record) =>
        record.testConditions &&
        (record.testConditions.oxygenPercentMin !== undefined ||
          record.testConditions.pressurePsiMin !== undefined ||
          record.testConditions.airflowCmPerSecondMin !== undefined ||
          (record.testConditions.namedConditions ?? []).length > 0),
    );
    return {
      intent: "conditions",
      title: "Documented oxygen, pressure and flow conditions",
      blocks: [
        {
          heading: "Sourced envelopes",
          points: withConditions.map((record) => ({
            text: `${label(record)}: ${envelopeLine(record)}`,
            citations: [record.id],
          })),
        },
        {
          heading: "Handling of missing values",
          points: [
            {
              text: `${records.length - withConditions.length} of ${records.length} records do not report numeric oxygen, pressure or airflow ranges. They are marked Unknown and excluded from range charts rather than plotted at zero.`,
            },
          ],
          note: "The three 14.7/21%, 10.2/26.5% and 8.2/34% points come from the ACME BRE objectives and are NASA-considered atmospheres examined by that experiment — not universal habitat requirements.",
        },
      ],
      citations: withConditions.map(citationFor),
      matchedIds: withConditions.map((record) => record.id),
      confidence: "high",
    };
  }

  // Hardware / facility.
  if (has(query, ["hardware", "facility", "cir", "msg", "rack", "glovebox", "cygnus", "mdca", "apparatus"])) {
    const matches = records.filter((record) => (record.hardware?.sharedHardwareIds ?? []).length > 0);
    return {
      intent: "hardware",
      title: "Hardware and facility relationships",
      blocks: [
        {
          heading: "Shared facilities in the dataset",
          points: matches.slice(0, 10).map((record) => ({
            text: `${label(record)} — ${record.hardware?.facility ?? "facility not named"}${record.hardware?.apparatus ? `; ${record.hardware.apparatus}` : ""}`,
            citations: [record.id],
          })),
        },
        {
          heading: "Reading the connections",
          points: [
            {
              text: "Connections are taken only from the PSI hardware fields and explicit related-investigation references. A shared facility does not mean the experiments shared samples, conditions or findings.",
            },
          ],
          note: "Open Hardware Lineage for the full graph.",
        },
      ],
      citations: matches.map(citationFor),
      matchedIds: matches.map((record) => record.id),
      confidence: "medium",
    };
  }

  // Reduced gravity.
  if (has(query, ["reduced gravity", "microgravity", "micro gravity", "gravity", "weightless", "iss", "space station"])) {
    const flight = records.filter((record) => {
      const platform = (record.flightPlatform ?? "").toLowerCase();
      return platform.includes("iss") || platform.includes("cygnus") || platform.includes("space station");
    });
    return {
      intent: "reduced-gravity",
      title: "Reduced-gravity measurements in the dataset",
      blocks: [
        {
          heading: "Flight records",
          points: flight.map((record) => ({
            text: `${label(record)} — ${record.flightPlatform}. ${envelopeLine(record)}`,
            citations: [record.id],
          })),
        },
        {
          heading: "What is not here",
          points: [
            {
              text: "The dataset contains microgravity experiments, not direct lunar- or Martian-gravity combustion measurements. No 0g→lunar/Mars interpolation is offered as a prediction.",
              citations: ["PSI-25"],
            },
          ],
          note: "LUCI provides simulated lunar-gravity data but is outside the PSI dataset; see the Atmosphere & Gravity page.",
        },
      ],
      citations: flight.map(citationFor),
      matchedIds: flight.map((record) => record.id),
      confidence: "high",
    };
  }

  // Evidence or result question that did not match a specific record.
  if (has(query, ["find", "result", "finding", "conclusion", "what did"])) {
    return {
      intent: "findings-unknown",
      title: "No specific result matched",
      blocks: [
        {
          points: [
            {
              text: "I could not match that question to a specific investigation or evidence note. The library contains notes for all 24 records, but they vary: some report outcomes, while others describe methods, planned conditions, or analysis scope.",
            },
            {
              text: "A summary entry is not always a quantitative experimental result. Check the evidence-status badge and record note: NASA-reported entries are sourced to NASA materials, while analysis-derived entries describe modeling or post-processing and should not be treated as direct measurements.",
              citations: ["PSI-25", "PSI-98", "PSI-117", "PSI-60"],
            },
          ],
        },
      ],
      citations: byId(records, ["PSI-25", "PSI-98", "PSI-117", "PSI-60"]).map(citationFor),
      matchedIds: [],
      confidence: "low",
    };
  }

  // Keyword fallback.
  const tokens = query.split(" ").filter((token) => token.length > 3);
  const scored = records
    .map((record) => {
      const text = normalize(
        [
          record.fullTitle,
          record.acronym,
          record.experimentalDesign?.objectives ?? "",
          ...(record.fuelSpecs?.materials ?? []),
          ...(record.findings ?? []),
        ].join(" "),
      );
      const score = tokens.filter((token) => text.includes(token)).length;
      return { record, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) {
    return {
      intent: "unknown",
      title: "The dataset does not contain enough information",
      blocks: [
        {
          points: [
            {
              text: "No investigation record matches that question. The assistant only answers from the 24 PSI Combustion Science records in this explorer, and it does not use an external model or general knowledge.",
            },
            {
              text: "Try naming an investigation (for example BASS-II, FLEX-2, SAME, ACME BRE) or asking about solid fuels, smoke detection, suppressants, documented conditions, or reduced-gravity data.",
            },
          ],
        },
      ],
      citations: [],
      matchedIds: [],
      confidence: "low",
      suggestions: suggestedQuestions(records).slice(0, 3),
    };
  }

  return {
    intent: "keyword",
    title: "Closest records in the dataset",
    blocks: [
      {
        points: scored.map((entry) => ({
          text: `${label(entry.record)} — ${entry.record.fullTitle}. ${envelopeLine(entry.record)}`,
          citations: [entry.record.id],
        })),
        note: "These are keyword matches, not a verified answer to the question. Open a record to check whether its scope actually fits.",
      },
    ],
    citations: scored.map((entry) => citationFor(entry.record)),
    matchedIds: scored.map((entry) => entry.record.id),
    confidence: "low",
  };
}
