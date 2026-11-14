export type AssistantStyle = "normal" | "simpler" | "detailed";

export interface AssistantCitation {
  id: string;
  title: string;
  url: string;
  kind: "project" | "general";
}

export interface RetrievedRecord {
  id: string;
  acronym: string;
  fullTitle: string;
}

export interface AssistantReply {
  answer: string;
  provider?: "gemini";
  citations: AssistantCitation[];
  retrievedRecords: RetrievedRecord[];
  model?: string;
  generatedAt?: string;
}

export interface AssistantApiMessage {
  role: "user" | "assistant";
  content: string;
}

export class AssistantRequestError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  constructor(code: string, message: string, retryable: boolean, status = 0) {
    super(message);
    this.name = "AssistantRequestError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

const SAFE_FALLBACK =
  "The science assistant could not answer just now. Please try again in a moment.";

function isCitation(value: unknown): value is AssistantCitation {
  if (!value || typeof value !== "object") return false;
  const citation = value as Record<string, unknown>;
  return (
    typeof citation.id === "string" &&
    typeof citation.title === "string" &&
    typeof citation.url === "string" &&
    (citation.kind === "project" || citation.kind === "general")
  );
}

function isRetrievedRecord(value: unknown): value is RetrievedRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.acronym === "string" &&
    typeof record.fullTitle === "string"
  );
}

/**
 * Talks only to this app's server endpoint. The Gemini key never reaches the browser.
 */
export async function askScienceAssistant({
  messages,
  style,
  signal,
}: {
  messages: AssistantApiMessage[];
  style: AssistantStyle;
  signal?: AbortSignal;
}): Promise<AssistantReply> {
  let response: Response;
  try {
    response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, style }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new AssistantRequestError(
      "network_error",
      "Could not reach the science assistant. Check your connection and try again.",
      true,
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as { error?: { code?: unknown; message?: unknown; retryable?: unknown } }).error
        : undefined;
    const code = typeof errorPayload?.code === "string" ? errorPayload.code : "http_error";
    const message =
      typeof errorPayload?.message === "string" && errorPayload.message.length > 0
        ? errorPayload.message
        : SAFE_FALLBACK;
    const retryable =
      typeof errorPayload?.retryable === "boolean" ? errorPayload.retryable : response.status >= 500;
    throw new AssistantRequestError(code, message, retryable, response.status);
  }

  if (!payload || typeof payload !== "object") {
    throw new AssistantRequestError(
      "bad_response",
      "The assistant returned an unreadable response. Please try again.",
      true,
      response.status,
    );
  }

  const data = payload as Record<string, unknown>;
  if (typeof data.answer !== "string" || data.answer.trim().length === 0) {
    throw new AssistantRequestError(
      "bad_response",
      "The assistant returned an empty answer. Please try again.",
      true,
      response.status,
    );
  }

  const citations = Array.isArray(data.citations) ? data.citations.filter(isCitation) : [];
  const retrievedRecords = Array.isArray(data.retrievedRecords)
    ? data.retrievedRecords.filter(isRetrievedRecord)
    : [];

  return {
    answer: data.answer,
    provider: data.provider === "gemini" ? "gemini" : undefined,
    citations,
    retrievedRecords,
    model: typeof data.model === "string" ? data.model : undefined,
    generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : undefined,
  };
}
