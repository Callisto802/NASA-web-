import { GoogleGenAI } from "@google/genai";
import { HttpError, RESPONSE_JSON_SCHEMA, SYSTEM_INSTRUCTION } from "./assistant-core.mjs";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

function mapProviderError(error) {
  if (error instanceof HttpError) return error;
  if (error?.name === "AbortError") {
    return new HttpError(504, "timeout", "The assistant took too long. Please try again.", true);
  }
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 429) {
    return new HttpError(
      429,
      "provider_busy",
      "Gemini has reached a temporary usage limit. This is not a problem with your question. Please wait a little before trying again, or use Dataset lookup meanwhile.",
      true,
    );
  }
  if (status === 401 || status === 403) {
    return new HttpError(
      503,
      "provider_auth",
      "The assistant is not configured correctly. The site owner needs to check the server key.",
      false,
    );
  }
  if (status === 400 || status === 404) {
    return new HttpError(
      502,
      "provider_error",
      "Gemini rejected the configured request. This is a technical setup issue, not a problem with your question. The site owner needs to check the model configuration.",
      false,
    );
  }
  if (status === 504) {
    return new HttpError(
      504,
      "timeout",
      "Gemini took too long to respond. Your question is fine. Please wait a moment and try once more, or use Dataset lookup meanwhile.",
      true,
    );
  }
  if (status === 500 || status === 502 || status === 503) {
    return new HttpError(
      503,
      "provider_busy",
      "Gemini is temporarily busy. This is not a problem with your question. Please wait a moment before trying again, or use Dataset lookup meanwhile.",
      true,
    );
  }
  return new HttpError(
    502,
    "provider_error",
    "The assistant service did not respond successfully. Please try again.",
    true,
  );
}

/**
 * Production adapter for the Gemini Developer API. The API key is read only on
 * the server at call time; it is never returned or logged.
 */
export function createGeminiGenerator({ model } = {}) {
  let client = null;
  let clientKey = null;

  return async function generate({ prompt, signal }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(
        503,
        "not_configured",
        "The science assistant is not configured on this server. The site owner needs to set GEMINI_API_KEY.",
        false,
      );
    }

    if (!client || clientKey !== apiKey) {
      client = new GoogleGenAI({ apiKey });
      clientKey = apiKey;
    }

    const modelName = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const isGemini3 = /^gemini-3/.test(modelName);

    const request = () =>
      client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_JSON_SCHEMA,
          temperature: 0.35,
          maxOutputTokens: 1600,
          automaticContinuation: false,
          abortSignal: signal,
          // The SDK retries 5xx/429 five times by default. Disable that so we
          // control the single retry below and one click cannot fan out.
          httpOptions: { timeout: 44_000, retryOptions: { attempts: 1 } },
          ...(isGemini3 ? { thinkingConfig: { thinkingLevel: "LOW" } } : {}),
        },
      });

    let response;
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await request();
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        const status = Number(error?.status);
        const transient = status === 500 || status === 502 || status === 503 || status === 504;
        if (attempt === 0 && transient && !signal?.aborted) {
          console.error("[assistant] gemini retry", status);
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        break;
      }
    }

    if (lastError) {
      throw mapProviderError(lastError);
    }

    try {
      const text = response.text;
      if (!text || typeof text !== "string") {
        throw new HttpError(
          502,
          "provider_empty_response",
          "The assistant returned an empty response. Please try again.",
          true,
        );
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new HttpError(
          502,
          "provider_json",
          "The assistant returned a response that could not be read. Please try again.",
          true,
        );
      }
    } catch (error) {
      // Status/name only: no provider message, prompt, or key.
      console.error("[assistant] gemini", error?.status ?? error?.name ?? "unknown_error");
      throw mapProviderError(error);
    }
  };
}
