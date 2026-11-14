import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  HttpError,
  SYSTEM_INSTRUCTION,
  buildPrompt,
  normalizeRequest,
  retrieveContext,
  sanitizeReply,
} from "./assistant-core.mjs";
import { createApiHandler } from "./api.mjs";
import { createGeminiGenerator } from "./gemini.mjs";

test("retrieval selects relevant records, not the whole dataset", () => {
  const retrieval = retrieveContext("What did BASS-II find about airflow and oxygen?");
  const ids = retrieval.records.map((record) => record.id);
  assert.ok(ids.includes("PSI-25"));
  assert.ok(ids.length <= 8);
  assert.ok(retrieval.contextText.length <= 16000);
  assert.match(retrieval.contextText, /BASS-II/);
});

test("retrieval handles concept questions", () => {
  const retrieval = retrieveContext("What is a diffusion flame?");
  assert.ok(retrieval.concepts.some((concept) => concept.term === "Diffusion flame"));
  assert.ok(retrieval.allowed.size > 0);
});

test("ambiguous questions still produce a bounded prompt", () => {
  const retrieval = retrieveContext("tell me more");
  const prompt = buildPrompt({
    messages: [{ role: "user", content: "tell me more" }],
    style: "normal",
    context: retrieval.contextText,
  });
  assert.ok(prompt.length < 22000);
  assert.match(prompt, /clarifying question/);
  assert.match(SYSTEM_INSTRUCTION, /not NASA/);
});

test("request validation rejects empty and malformed input", () => {
  assert.throws(() => normalizeRequest(null), (error) => error.code === "invalid_request");
  assert.throws(
    () => normalizeRequest({ messages: [{ role: "user", content: "   " }] }),
    (error) => error.code === "invalid_request",
  );
  assert.throws(
    () => normalizeRequest({ messages: [{ role: "assistant", content: "hello" }] }),
    (error) => error.code === "invalid_request",
  );
  assert.throws(
    () =>
      normalizeRequest({
        messages: [{ role: "user", content: "x".repeat(2000) }],
      }),
    (error) => error.code === "invalid_request",
  );
  assert.throws(
    () => normalizeRequest({ messages: [{ role: "user", content: "hi" }], style: "snarky" }),
    (error) => error.code === "invalid_request",
  );
  const valid = normalizeRequest({
    messages: [{ role: "user", content: "What is a cool flame?" }],
    style: "simpler",
  });
  assert.equal(valid.messages.length, 1);
  assert.equal(valid.style, "simpler");

  const merged = normalizeRequest({
    messages: [
      { role: "user", content: "What is a cool flame?" },
      { role: "user", content: "What is a cool flame?" },
      { role: "assistant", content: "A low-temperature flame." },
      { role: "user", content: "Explain more." },
    ],
  });
  assert.equal(merged.messages.length, 3);
  assert.equal(merged.messages[0].content, "What is a cool flame?");
});

test("citations are limited to allowed project sources", () => {
  const allowed = new Map([
    [
      "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25",
      {
        id: "PSI-25",
        title: "NASA PSI investigation record: BASS-II",
        url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25",
        kind: "project",
      },
    ],
  ]);
  const reply = sanitizeReply(
    {
      answer: "BASS-II studied solid fuels.",
      citations: [
        {
          id: "fake",
          title: "Invented",
          url: "https://evil.example/fake",
          kind: "project",
        },
        {
          id: "PSI-25",
          title: "Changed title",
          url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25/",
          kind: "project",
        },
      ],
    },
    allowed,
  );
  assert.equal(reply.citations.length, 1);
  assert.equal(reply.citations[0].id, "PSI-25");
  assert.equal(reply.citations[0].title, "NASA PSI investigation record: BASS-II");
});

test("missing API key produces a safe not_configured error", async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const generate = createGeminiGenerator();
    await assert.rejects(
      () => generate({ prompt: "hello", signal: new AbortController().signal }),
      (error) => error instanceof HttpError && error.code === "not_configured" && error.status === 503,
    );
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  }
});

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("HTTP success path returns answer, citations, and retrieved records", async () => {
  const handler = createApiHandler({
    generate: async () => ({
      answer: "BASS-II looked at solid fuels in low-speed flow.",
      citations: [
        {
          id: "PSI-25",
          title: "NASA PSI investigation record: Burning and Suppression of Solids - II",
          url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-25",
          kind: "project",
        },
      ],
    }),
  });

  await withServer(handler, async (base) => {
    const response = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "What did BASS-II study?" }],
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.match(payload.answer, /BASS-II/);
    assert.equal(payload.citations[0].id, "PSI-25");
    assert.ok(payload.retrievedRecords.some((record) => record.id === "PSI-25"));
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("HTTP validation handles GET, bad JSON, missing question, and oversize bodies", async () => {
  const handler = createApiHandler({
    generate: async () => ({ answer: "ok", citations: [] }),
  });

  await withServer(handler, async (base) => {
    const getResponse = await fetch(`${base}/api/assistant`);
    assert.equal(getResponse.status, 405);

    const wrongType = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });
    assert.equal(wrongType.status, 415);

    const badJson = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(badJson.status, 400);

    const empty = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });
    assert.equal(empty.status, 400);

    const oversized = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(40000) }] }),
    });
    assert.equal(oversized.status, 413);
  });
});

test("rate limiter rejects a burst without touching the provider", async () => {
  let calls = 0;
  const handler = createApiHandler({
    generate: async () => {
      calls += 1;
      return { answer: "ok", citations: [] };
    },
  });

  await withServer(handler, async (base) => {
    const request = () =>
      fetch(`${base}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
      });
    for (let index = 0; index < 12; index += 1) {
      const response = await request();
      assert.equal(response.status, 200);
    }
    const blocked = await request();
    assert.equal(blocked.status, 429);
    const payload = await blocked.json();
    assert.equal(payload.error.code, "rate_limited");
    assert.equal(calls, 12);
  });
});
