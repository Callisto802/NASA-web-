import fs from "node:fs";

/**
 * Server-side grounding data. Only these records and concepts are ever sent to
 * Gemini, and only their source URLs are allowed to appear as citations.
 */
const datasetUrl = new URL("../src/data/psi_investigations.json", import.meta.url);
const conceptsUrl = new URL("../src/data/concepts.json", import.meta.url);
const catalogUrl = new URL("../src/data/psi_catalog.json", import.meta.url);

export const INVESTIGATIONS = JSON.parse(fs.readFileSync(datasetUrl, "utf8"));
export const CONCEPTS = JSON.parse(fs.readFileSync(conceptsUrl, "utf8"));
export const PSI_CATALOG = JSON.parse(fs.readFileSync(catalogUrl, "utf8"));

export const MAX_MESSAGES = 10;
export const MAX_MESSAGE_CHARS = 1500;
export const MAX_TOTAL_CHARS = 8000;
export const MAX_BODY_BYTES = 32 * 1024;
export const MAX_CONTEXT_CHARS = 16000;
export const RESPONSE_STYLES = new Set(["normal", "simpler", "detailed"]);

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our",
  "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see",
  "two", "way", "who", "boy", "did", "she", "use", "what", "when", "where", "which", "while",
  "why", "with", "about", "into", "from", "that", "this", "these", "those", "there", "their",
  "them", "then", "than", "have", "has", "had", "does", "doing", "done", "would", "could",
  "should", "explain", "tell", "help", "understand", "mean", "means", "meaning", "please",
  "more", "simpler", "simple", "detail", "details", "question", "answer", "research",
  "experiment", "experiments", "study", "studies", "investigation", "investigations", "result",
  "results", "nasa", "psi", "space", "station", "about", "give", "make", "made", "want",
  "know", "like", "just", "also", "very", "much", "some", "any", "own", "other", "same",
]);

export class HttpError extends Error {
  constructor(status, code, publicMessage, retryable = false) {
    super(code);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
    this.retryable = retryable;
  }
}

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function tokenize(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function normalizeForPhrase(value) {
  return normalizeText(value).toLowerCase().replace(/-/g, " ");
}

function formatNumber(value, digits = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits)).toString();
}

function formatRange(min, max, unit) {
  if (typeof min !== "number" && typeof max !== "number") return null;
  const low = typeof min === "number" ? formatNumber(min) : null;
  const high = typeof max === "number" ? formatNumber(max) : null;
  if (low !== null && high !== null) {
    return low === high ? `${low} ${unit}` : `${low}–${high} ${unit}`;
  }
  return `${low ?? high} ${unit}`;
}

export function formatConditions(record) {
  const conditions = record.testConditions;
  if (!conditions) return "Unknown — the PSI summary does not report test conditions.";
  const parts = [];
  const o2 = formatRange(conditions.oxygenPercentMin, conditions.oxygenPercentMax, "% O2");
  const pressure = formatRange(conditions.pressurePsiMin, conditions.pressurePsiMax, "psia");
  const airflow = formatRange(
    conditions.airflowCmPerSecondMin,
    conditions.airflowCmPerSecondMax,
    "cm/s airflow",
  );
  if (o2) parts.push(o2);
  if (pressure) parts.push(pressure);
  if (airflow) parts.push(airflow);
  for (const named of conditions.namedConditions ?? []) {
    const pieces = [];
    if (typeof named.oxygenPercent === "number") pieces.push(`${named.oxygenPercent}% O2`);
    if (typeof named.pressurePsi === "number") pieces.push(`${named.pressurePsi} psia`);
    if (pieces.length > 0) parts.push(`${named.label}: ${pieces.join(" at ")}`);
  }
  if ((conditions.suppressantsTested ?? []).length > 0) {
    parts.push(`suppressants: ${conditions.suppressantsTested.join(", ")}`);
  }
  return parts.length > 0 ? parts.join("; ") : "Unknown — no numeric conditions stated.";
}

function sourceList(record, question = "") {
  const sources = [...(record.sources ?? [])];
  for (const block of [record.hardware, record.fuelSpecs, record.testConditions, record.experimentalDesign]) {
    for (const source of block?.sources ?? []) sources.push(source);
  }
  const catalog = PSI_CATALOG.records?.[record.id];
  const wantsPublications = /\b(publication|publications|paper|papers|journal|doi|bibliograph|citation)\b/i.test(question);
  const wantsDataFiles = /\b(raw data|data files?|download|experimental tables?|modeling tables?|dataset files?)\b/i.test(question);
  if (catalog?.recordUrl) {
    sources.unshift({ title: `Official NASA PSI investigation record: ${record.id}`, url: catalog.recordUrl });
  }
  const tokens = tokenize(question);
  const scoredPublications = (catalog?.publications ?? [])
    .filter((publication) => publication.url)
    .map((publication, index) => ({
      publication,
      index,
      score: tokens.reduce((score, token) => score + (publication.title.toLowerCase().includes(token) ? 3 : publication.authors?.toLowerCase().includes(token) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, wantsPublications ? 7 : 2)
    .map(({ publication }) => ({
      title: publication.title,
      identifier: publication.doi ? `DOI ${publication.doi}` : undefined,
      url: publication.url,
    }));
  const tableSources = [...(catalog?.experimentalTables ?? []), ...(catalog?.modelingTables ?? [])]
    .filter((file) => file.downloadUrl)
    .slice(0, 5)
    .map((file) => ({ title: `NASA PSI data file: ${file.title}`, url: file.downloadUrl }));
  const preferredSources = wantsDataFiles
    ? [sources[0], ...tableSources, ...sources.slice(1)]
    : wantsPublications
      ? [sources[0], ...scoredPublications, ...sources.slice(1)]
      : [...sources.slice(0, 5), ...scoredPublications, ...sources.slice(5)];

  const seen = new Set();
  const unique = [];
  for (const source of preferredSources) {
    if (!source?.url || seen.has(source.url)) continue;
    seen.add(source.url);
    unique.push(source);
  }
  return unique.slice(0, 8);
}

function citationTitle(source, record) {
  if (source.identifier) return `${source.title} (${source.identifier})`;
  return source.title || `NASA PSI record ${record.id}`;
}

function sourceLine(source, record) {
  return `  - ${citationTitle(source, record)} | ${source.url}`;
}

export function formatRecord(record, question = "") {
  const materials = (record.fuelSpecs?.materials ?? []).join("; ") || "Unknown";
  const findings = (record.findings ?? []).length
    ? record.findings.map((finding) => `  - ${finding}`).join("\n")
    : `  - No evidence-summary entries are available for this record. ${record.findingsNote ?? ""}`.trim();
  const sources = sourceList(record, question);
  const catalog = PSI_CATALOG.records?.[record.id];
  const catalogFacts = catalog
    ? [
        `NASA catalog version ${catalog.version ?? "not listed"}; DOI ${catalog.doi ?? "not listed"}; repository updated ${catalog.updatedAt ?? "not listed"}.`,
        `NASA-stated objective: ${(catalog.objective ?? "Not stated in this snapshot.").slice(0, 520)}`,
        `NASA-stated approach: ${(catalog.approach ?? "Not stated in this snapshot.").slice(0, 700)}`,
        ...(catalog.hypothesis ? [`NASA-stated hypothesis: ${catalog.hypothesis.slice(0, 520)}`] : []),
        ...(catalog.researchImpacts ? [`NASA-stated research impacts: ${catalog.researchImpacts.slice(0, 420)}`] : []),
        `NASA PSI lists ${catalog.publications.length} publication entries and ${(catalog.experimentalTables ?? []).length + (catalog.modelingTables ?? []).length} experimental/modeling table files.`,
      ]
    : [];
  const wantsPublications = /\b(publication|publications|paper|papers|journal|doi|bibliograph|citation)\b/i.test(question);
  const wantsDataFiles = /\b(raw data|data files?|download|experimental tables?|modeling tables?|dataset files?)\b/i.test(question);
  const catalogPublications = wantsPublications
    ? (catalog?.publications ?? []).slice(0, 24).map((publication) =>
        `- ${publication.title}${publication.authors ? ` — ${publication.authors}` : ""}${publication.doi ? ` — DOI ${publication.doi}` : ""}${publication.status ? ` (${publication.status})` : ""}`,
      )
    : [];
  const dataFiles = wantsDataFiles
    ? [...(catalog?.experimentalTables ?? []), ...(catalog?.modelingTables ?? [])].slice(0, 8).map((file) => `- ${file.title}`)
    : [];
  const lines = [
    `### [${record.id}] ${record.acronym} — ${record.fullTitle}`,
    `Program: ${record.programFamily ?? "Unknown"} | Platform: ${record.flightPlatform ?? "Unknown"} | Status: ${record.status ?? "Unknown"}`,
    `Safety pillar (editorial): ${(record.safetyPillars ?? []).join(", ") || "Unclassified"}`,
    `Fuel: ${record.fuelSpecs?.phase ?? "Unknown"} | Materials: ${materials.slice(0, 320)}`,
    `Hardware: ${(record.hardware?.facility ?? "Unknown").slice(0, 160)}; ${(record.hardware?.apparatus ?? "").slice(0, 220)}`,
    `Conditions: ${formatConditions(record).slice(0, 420)}`,
    ...(record.testConditions?.notes
      ? [`Condition caveat: ${record.testConditions.notes.slice(0, 320)}`]
      : []),
    `Objectives: ${(record.experimentalDesign?.objectives ?? "Unknown").slice(0, 700)}`,
    `Variables: ${(record.experimentalDesign?.variedParameters ?? []).join("; ").slice(0, 650) || "Not stated"}`,
    `Diagnostics: ${(record.experimentalDesign?.sensorsAndDiagnostics ?? []).join("; ").slice(0, 650) || "Not stated"}`,
    ...(record.experimentalDesign?.notes ? [`Design caveat: ${record.experimentalDesign.notes.slice(0, 500)}`] : []),
    `Evidence summary (status: ${record.findingsEvidenceStatus ?? "Unknown"}; entries may describe outcomes, methods, planned conditions, or analysis scope):`,
    findings.slice(0, 1800),
    `Evidence limitation: ${(record.findingsNote ?? "Missing values are Unknown; the PSI summary is not the raw experiment data.").slice(0, 650)}`,
    ...(catalogFacts.length ? [`NASA PSI catalog snapshot (retrieved ${PSI_CATALOG.retrievedAt}):`, ...catalogFacts] : []),
    ...(catalogPublications.length ? [`NASA PSI publication entries (up to 24 shown; full list is on the official record):`, ...catalogPublications] : []),
    ...(dataFiles.length ? [`NASA PSI table files (up to 8 shown; raw files and full inventory are on the official record):`, ...dataFiles] : []),
    `Sources (allowed citations):`,
    ...sources.map((source) => sourceLine(source, record)),
  ];
  return lines.join("\n");
}

function scoreRecord(record, tokens, phrase) {
  const acronym = normalizeForPhrase(record.acronym ?? "");
  const id = (record.id ?? "").toLowerCase();
  const title = normalizeForPhrase(record.fullTitle ?? "");
  const program = (record.programFamily ?? "").toLowerCase();
  const materials = (record.fuelSpecs?.materials ?? []).join(" ").toLowerCase();
  const findings = (record.findings ?? []).join(" ").toLowerCase();
  const objectives = (record.experimentalDesign?.objectives ?? "").toLowerCase();
  const suppressants = (record.testConditions?.suppressantsTested ?? []).join(" ").toLowerCase();
  const hardware = [record.hardware?.facility, record.hardware?.apparatus].join(" ").toLowerCase();
  const publications = (PSI_CATALOG.records?.[record.id]?.publications ?? [])
    .map((publication) => `${publication.title} ${publication.authors ?? ""} ${publication.doi ?? ""}`)
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (phrase.length >= 4 && (title.includes(phrase) || acronym.includes(phrase))) score += 8;
  if (phrase.length >= 4 && phrase.includes(acronym) && acronym.length >= 3) score += 6;
  if (id && phrase.includes(id)) score += 10;
  if (phrase.length >= 8 && publications.includes(phrase)) score += 7;

  for (const token of tokens) {
    if (acronym.split(" ").includes(token)) score += 6;
    if (title.includes(token)) score += 2.5;
    if (materials.includes(token)) score += 2;
    if (suppressants.includes(token)) score += 2;
    if (findings.includes(token)) score += 1.5;
    if (objectives.includes(token)) score += 0.8;
    if (program.includes(token)) score += 0.6;
    if (hardware.includes(token)) score += 0.7;
    if (publications.includes(token)) score += 1.1;
  }

  if (/(fire|flammab|extinguish|suppress|ignit|smoke|oxygen|safety)/.test(phrase)) {
    if ((record.safetyPillars ?? []).length > 0) score += 1;
  }
  return score;
}

function scoreConcept(concept, tokens, phrase) {
  const term = concept.term.toLowerCase();
  let score = 0;
  if (phrase.includes(term)) score += 6;
  for (const token of tokens) {
    if (term.includes(token)) score += 2;
    else if (concept.plain.toLowerCase().includes(token)) score += 0.7;
  }
  return score;
}

export function retrieveContext(question) {
  const phrase = normalizeForPhrase(question);
  const tokens = tokenize(question);
  const wantsList = /(which|list|all|compare|best|most|record|investigation)/.test(phrase);

  const scoredRecords = INVESTIGATIONS.map((record) => ({
    record,
    score: scoreRecord(record, tokens, phrase),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const maxRecords = wantsList ? 8 : 5;
  let selected = scoredRecords.slice(0, maxRecords);

  // Explicit PSI IDs always win a place.
  for (const match of question.matchAll(/PSI-\d{2,3}/gi)) {
    const id = match[0].toUpperCase();
    const record = INVESTIGATIONS.find((item) => item.id.toUpperCase() === id);
    if (record && !selected.some((entry) => entry.record.id === record.id)) {
      selected = [{ record, score: 100 }, ...selected].slice(0, maxRecords);
    }
  }

  const selectedConcepts = CONCEPTS.map((concept) => ({
    concept,
    score: scoreConcept(concept, tokens, phrase),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const allowed = new Map();
  for (const { record } of selected) {
    for (const source of sourceList(record, question)) {
      const url = source.url.replace(/\/$/, "");
      if (!allowed.has(url)) {
        allowed.set(url, {
          id: record.id,
          title: citationTitle(source, record),
          url: source.url,
          kind: "project",
        });
      }
    }
  }
  for (const { concept } of selectedConcepts) {
    const url = concept.url.replace(/\/$/, "");
    if (!allowed.has(url)) {
      allowed.set(url, {
        id: `concept-${concept.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: concept.source,
        url: concept.url,
        kind: "general",
      });
    }
  }

  const titleList = INVESTIGATIONS.map(
    (record) => `- ${record.id} — ${record.acronym} — ${record.fullTitle}`,
  ).join("\n");

  const recordBlocks = selected
    .map(({ record }) => formatRecord(record, question))
    .join("\n\n")
    .slice(0, 14000);

  const conceptBlocks = selectedConcepts
    .map(
      ({ concept }) =>
        `- ${concept.term}: ${concept.plain}\n  Source: ${concept.source} | ${concept.url}`,
    )
    .join("\n");

  const contextText = [
    "DATASET SUMMARY",
    `- ${INVESTIGATIONS.length} NASA PSI Combustion Science investigation records. This is metadata, not raw experiment data. Missing values are Unknown and must not be treated as zero.`,
    "- Editorial safety pillars and relevance scores are not NASA measurements.",
    ...(wantsList
      ? [
          "",
          "ALL INVESTIGATIONS (titles only; details follow only for retrieved records)",
          titleList,
        ]
      : []),
    "",
    "RETRIEVED PROJECT RECORDS",
    recordBlocks || "No specific investigation record matched this question.",
    "",
    "RELEVANT PLAIN-LANGUAGE CONCEPTS",
    conceptBlocks || "No concept entry matched this question.",
    "",
    "ALLOWED CITATIONS (use only these URLs)",
    allowed.size > 0
      ? [...allowed.values()]
          .map((citation) => `- [${citation.id}] ${citation.title} | ${citation.url}`)
          .join("\n")
      : "- No citations are available for this question.",
  ].join("\n");

  return {
    records: selected.map((entry) => entry.record),
    concepts: selectedConcepts.map((entry) => entry.concept),
    allowed,
    contextText: contextText.slice(0, MAX_CONTEXT_CHARS),
  };
}

export const SYSTEM_INSTRUCTION = `You are "SI Research Co-Pilot", an open-topic AI assistant built into an educational NASA PSI research explorer. You are not NASA, you are not a NASA employee, and you are not a fire-safety professional or authority.

YOUR PURPOSE
Answer requests across ordinary topics, whether or not they are about NASA, including recipes, writing, everyday questions, learning, and general science. For NASA PSI questions, explain the retrieved combustion investigations and related concepts. Be warm, patient, respectful, and encouraging. Never make someone feel bad for asking a basic question.

HOW TO EXPLAIN
- Reply in the same language as the user's latest message. If they write in Arabic, answer in clear Modern Standard Arabic. Preserve official English investigation names and source titles when needed, and explain them in Arabic.
- Use plain, friendly language. Define each technical term in everyday words the first time you use it.
- Prefer short paragraphs and small steps. Use a simple analogy or example when it helps.
- Answer the user's actual question. If it is too vague to answer responsibly (for example "tell me more" with no topic), ask ONE short clarifying question and stop.
- Use the conversation so far for follow-up questions.
- If the user asks for a simpler explanation, use shorter sentences and a concrete analogy. If they ask for more detail, explain the mechanism, the evidence, and the caveats.
- Aim for about 120-220 words normally. Do not pad the answer.

TRUTHFULNESS AND SOURCES
- For NASA PSI-specific facts, measurements, results, missions, and claims, use PROJECT DATA and CONCEPTS as evidence. Do not use outside knowledge to fill project-data gaps.
- Cite claims about project records using only matching entries from ALLOWED CITATIONS. Use the exact title, URL, id, and kind provided.
- For requests unrelated to NASA PSI, answer normally using general knowledge. Do not refuse or redirect merely because a request is outside the project scope, force a NASA connection, or add project citations to an unrelated answer. If no relevant allowed source supports a claim, leave citations empty rather than inventing a source.
- Never invent measurements, results, citations, URLs, NASA conclusions, mission status, or connections between experiments. Do not claim a source says something it does not.
- For NASA-related answers, clearly separate what a record reports, your interpretation or analogy, and what the record does NOT establish.
- If a NASA/project-specific question is not answered by retrieved material, say so and explain what would be needed. Do not fill project-data gaps with guesses. This does not limit unrelated requests.
- Metadata is not the same as measured data. Many records say Unknown for oxygen, pressure, or hardware. Evidence-summary entries vary: some state outcomes, while others describe methods, planned conditions, or limits in the available sources.
- Distinguish direct measurements, analysis-derived outputs, and application calculations. If a record is marked Analysis-derived, describe the modeling or post-processing context; do not present it as a direct measurement. If a value is marked Derived, it was calculated in this application from cited inputs.
- Do not call every evidence-summary entry an experimental result. Use its source note to distinguish measured outcomes, methods, plans, and analysis-derived statements.
- Do not treat one experiment's result as a general rule for other materials, atmospheres, or spacecraft.

SAFETY
- This is education, not operational fire safety. Never give instructions for igniting, feeding, testing, suppressing, or "demonstrating" a fire, and never suggest oxygen-enriched or confined-space experiments.
- If someone asks for operational fire-safety advice or whether a real design is safe, say this dataset cannot determine that and direct them to their local fire authority and qualified fire-protection engineers.
- Oxygen concentration alone does not determine fire risk: pressure, material, geometry, airflow, ignition source, and test configuration also matter.

OUTPUT FORMAT
Return only JSON matching the provided schema. Answers may use plain text, line breaks, and simple numbered steps or bullets when helpful; do not include Markdown links or raw URLs:
{"answer": "plain text with line breaks; no Markdown headings or links", "citations": [{"id": "...", "title": "...", "url": "...", "kind": "project"|"general"}]}
Use only citations from ALLOWED CITATIONS. If there are none, return an empty citations array. Never put a URL inside the answer text.`;

export const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "Plain-language answer for any ordinary request. Use numbered steps or bullets when helpful; do not include Markdown links or raw URLs.",
    },
    citations: {
      type: "array",
      description: "Sources supporting factual claims. Use only allowed citations.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          kind: { type: "string", enum: ["project", "general"] },
        },
        required: ["id", "title", "url", "kind"],
        additionalProperties: false,
      },
    },
  },
  required: ["answer", "citations"],
  additionalProperties: false,
};

function styleInstruction(style) {
  if (style === "simpler") {
    return "STYLE FOR THIS ANSWER: The user pressed “Simpler”. Use very short sentences, everyday words, and one concrete analogy. Keep it under 150 words.";
  }
  if (style === "detailed") {
    return "STYLE FOR THIS ANSWER: The user pressed “More detail”. Explain the mechanism, the evidence, and the limits, in small labelled steps. Up to 350 words.";
  }
  return "STYLE FOR THIS ANSWER: Normal conversational length, around 120–220 words.";
}

export function buildPrompt({ messages, style, context }) {
  const conversation = messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n\n");

  return [
    "The assistant is open-topic. Answer the request first; use retrieved project data only when relevant.",
    "A lack of matching project records is not a reason to refuse an unrelated request. For general requests, answer normally and return empty citations unless a relevant allowed citation is available.",
    "PROJECT DATA (retrieved for this question; may be irrelevant to a general request)",
    context,
    "",
    "CONVERSATION SO FAR (most recent last)",
    conversation,
    "",
    styleInstruction(style),
    "",
    "Answer the last user message. If it is ambiguous, ask one short clarifying question instead of guessing.",
    "Return JSON only, using the required schema. Cite only ALLOWED CITATIONS. Do not include URLs in the answer text.",
  ].join("\n");
}

export function normalizeRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "invalid_request", "Send a JSON object with a messages array.");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new HttpError(400, "invalid_request", "Ask a question to get started.");
  }
  if (body.messages.length > MAX_MESSAGES) {
    throw new HttpError(400, "invalid_request", "This conversation is too long. Start a new chat.");
  }

  const style = body.style === undefined ? "normal" : body.style;
  if (!RESPONSE_STYLES.has(style)) {
    throw new HttpError(400, "invalid_request", "Unsupported response style.");
  }

  let total = 0;
  const messages = [];
  for (const entry of body.messages) {
    if (!entry || typeof entry !== "object") {
      throw new HttpError(400, "invalid_request", "Invalid message in conversation.");
    }
    const role = entry.role;
    if (role !== "user" && role !== "assistant") {
      throw new HttpError(400, "invalid_request", "Invalid message role.");
    }
    if (typeof entry.content !== "string") {
      throw new HttpError(400, "invalid_request", "Message content must be text.");
    }
    const content = normalizeText(entry.content);
    if (content.length === 0) {
      throw new HttpError(400, "invalid_request", "The question is empty.");
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      throw new HttpError(
        400,
        "invalid_request",
        `Keep each message under ${MAX_MESSAGE_CHARS} characters.`,
      );
    }
    total += content.length;
    if (total > MAX_TOTAL_CHARS) {
      throw new HttpError(400, "invalid_request", "The conversation is too long. Start a new chat.");
    }
    messages.push({ role, content });
  }

  if (messages[messages.length - 1].role !== "user") {
    throw new HttpError(400, "invalid_request", "The last message must be a question.");
  }

  // Defensive normalisation: a failed request can leave two user turns next to
  // each other. Drop exact duplicates and merge other consecutive same-role turns.
  const merged = [];
  for (const message of messages) {
    const previous = merged[merged.length - 1];
    if (previous && previous.role === message.role) {
      if (previous.content === message.content) continue;
      previous.content = `${previous.content}\n\n${message.content}`;
    } else {
      merged.push({ ...message });
    }
  }

  return { messages: merged, style };
}

export function sanitizeReply(parsed, allowed) {
  if (!parsed || typeof parsed !== "object" || typeof parsed.answer !== "string") {
    throw new HttpError(502, "provider_shape", "The assistant returned an unreadable response.", true);
  }
  const answer = normalizeText(parsed.answer).slice(0, 9000);
  if (answer.length < 2) {
    throw new HttpError(502, "provider_empty", "The assistant returned an empty response.", true);
  }

  const findAllowed = (raw) => {
    const direct = allowed.get(raw) ?? allowed.get(raw.replace(/\/$/, ""));
    if (direct) return direct;
    try {
      const url = new URL(raw);
      for (const [key, entry] of allowed) {
        try {
          const allowedUrl = new URL(key);
          if (allowedUrl.origin === url.origin && allowedUrl.pathname === url.pathname) return entry;
        } catch {
          /* ignore malformed allowlist entries */
        }
      }
    } catch {
      /* ignore malformed candidate URL */
    }
    return null;
  };

  const citations = [];
  const seen = new Set();
  for (const candidate of Array.isArray(parsed.citations) ? parsed.citations : []) {
    if (citations.length >= 6) break;
    if (!candidate || typeof candidate.url !== "string") continue;
    let url;
    try {
      url = new URL(candidate.url);
      if (url.protocol !== "https:") continue;
    } catch {
      continue;
    }
    const allowedEntry = findAllowed(candidate.url);
    if (!allowedEntry || seen.has(allowedEntry.url)) continue;
    seen.add(allowedEntry.url);
    citations.push(allowedEntry);
  }

  return { answer, citations };
}

export function datasetSummary() {
  return {
    records: INVESTIGATIONS.length,
    concepts: CONCEPTS.length,
    titles: INVESTIGATIONS.map((record) => ({ id: record.id, acronym: record.acronym })),
  };
}
