import {
  HttpError,
  MAX_BODY_BYTES,
  buildPrompt,
  normalizeRequest,
  retrieveContext,
  sanitizeReply,
} from "./assistant-core.mjs";
import { isIP } from "node:net";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
export const REQUEST_TIMEOUT_MS = 45_000;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;
        reject(new HttpError(413, "payload_too_large", "That request is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!tooLarge) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", () => reject(new HttpError(400, "invalid_request", "Could not read the request.")));
  });
}

function clientKey(req) {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
    if (isIP(forwarded)) return forwarded;
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function makeRateLimiter() {
  const hits = new Map();
  return function check(key) {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
      throw new HttpError(
        429,
        "rate_limited",
        "You have asked several questions quickly. Please wait a minute and try again.",
        true,
      );
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 500) {
      for (const [entryKey, times] of hits) {
        if (times.every((time) => now - time > RATE_LIMIT_WINDOW_MS)) hits.delete(entryKey);
      }
    }
  };
}

function publicError(error) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.publicMessage,
          retryable: error.retryable,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "server_error",
        message: "Something went wrong. Please try again.",
        retryable: true,
      },
    },
  };
}

/**
 * Creates a Node request handler. `generate` is injected so the network call can
 * be replaced in tests without changing production behaviour.
 */
export function createApiHandler({ generate, timeoutMs = REQUEST_TIMEOUT_MS }) {
  if (typeof generate !== "function") throw new Error("generate function is required");
  const checkRate = makeRateLimiter();

  return async function handleAssistant(req, res) {
    if (req.method !== "POST") {
      sendJson(res, 405, {
        error: { code: "method_not_allowed", message: "Use POST for the assistant.", retryable: false },
      });
      return;
    }

    const contentType = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      sendJson(res, 415, {
        error: {
          code: "unsupported_media_type",
          message: "Send the request as JSON.",
          retryable: false,
        },
      });
      return;
    }

    try {
      checkRate(clientKey(req));
      const raw = await readBody(req, MAX_BODY_BYTES);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new HttpError(400, "invalid_request", "Send a valid JSON request.");
      }

      const { messages, style } = normalizeRequest(body);
      const question = messages[messages.length - 1].content;
      const retrieval = retrieveContext(question);
      const prompt = buildPrompt({
        messages,
        style,
        context: retrieval.contextText,
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      res.on("close", () => {
        if (!res.writableEnded) controller.abort();
      });

      let parsed;
      let raceTimer;
      try {
        parsed = await Promise.race([
          generate({ prompt, signal: controller.signal }),
          new Promise((_, reject) => {
            raceTimer = setTimeout(
              () =>
                reject(
                  new HttpError(504, "timeout", "The assistant took too long. Please try again.", true),
                ),
              timeoutMs + 2000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
        if (raceTimer) clearTimeout(raceTimer);
      }

      const reply = sanitizeReply(parsed, retrieval.allowed);
      sendJson(res, 200, {
        answer: reply.answer,
        provider: "gemini",
        citations: reply.citations,
        retrievedRecords: retrieval.records.map((record) => ({
          id: record.id,
          acronym: record.acronym,
          fullTitle: record.fullTitle,
        })),
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const mapped = publicError(error);
      // Log only the code/name; never log prompts, headers, or provider messages.
      console.error("[assistant]", error?.code ?? error?.name ?? "unknown_error");
      if (!res.headersSent) sendJson(res, mapped.status, mapped.body);
      else res.end();
    }
  };
}
