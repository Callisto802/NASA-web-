# PSI Fire Safety Explorer

A mission-control styled web application for exploring NASA Physical Sciences Informatics (PSI) combustion and spacecraft fire-safety research. It includes a Gemini-powered plain-language science assistant alongside a local, deterministic dataset lookup, sourced evidence labels, comparisons, an atmosphere/gravity scenario tool, a hardware lineage graph, and Markdown/JSON export.

**This is an educational research explorer, not a certified fire-safety calculator, and not a substitute for engineering review. NASA does not endorse this application. The AI assistant is not NASA and can be wrong; check its cited sources.**

## Quick start

```bash
pnpm install
cp .env.example .env      # Windows: Copy-Item .env.example .env
# Put your Gemini API key in .env as GEMINI_API_KEY=...  (never commit .env)
pnpm dev                  # Vite UI + secure /api/assistant middleware
pnpm build                # type-check + production build to dist/
pnpm start                # Node static server + /api/assistant (also `pnpm preview`)
pnpm test                 # server-side validation, retrieval, HTTP, citation tests
pnpm refresh:psi-catalog  # refresh the public NASA PSI narrative, DOI, publication, and table index
```

In Windows PowerShell, use `pnpm.cmd` if PowerShell blocks `pnpm.ps1` (for example, `pnpm.cmd build`). If port 4173 is already occupied, keep using the running site; to run a second copy, set `$env:PORT = "4174"` before `pnpm.cmd start`.

`pnpm dev` runs the assistant endpoint inside Vite’s dev middleware, so the browser still calls this app’s server route (`/api/assistant`), never Gemini directly. `pnpm start` serves `dist/` and the same endpoint; build first.

The UI is a hash-routed single-page app (`#/explorer/PSI-25`), so the front end can be hosted statically, but the Gemini assistant requires the Node server (or an equivalent serverless endpoint). Without `GEMINI_API_KEY`, the rest of the app works and the assistant shows a clear “not configured” state.

### Gemini assistant setup

1. Create or rotate a key in [Google AI Studio](https://aistudio.google.com/apikey). The owner must do this in their own Google account; this repository never contains a key. **Any key previously pasted into a chat, issue, or public log must be revoked and replaced before public launch.**
2. Set it **server-side only**:
   - Local: `GEMINI_API_KEY=...` in `.env` (ignored by Git).
   - Deployment: add `GEMINI_API_KEY` as a secret environment variable in the hosting platform. Do not put it in `VITE_*` variables, build arguments, client code, or HTML.
3. Optionally set `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) and `PORT` (default `4173`).
4. Restart `pnpm dev` or `pnpm start`.

`.env`, `.env.*`, and all real secret files are ignored by Git; only `.env.example` with an empty placeholder is tracked. The server never logs, returns, or embeds the key. Client requests go to `/api/assistant`; the browser bundle contains no Gemini SDK code or key.

## What is in the dataset

- **24 investigations** — every record NASA PSI classifies under **Combustion Science** at retrieval time.
- **352 PSI publication entries** and **22 NASA-hosted experimental/modeling table files** are included in the 13 Nov 2026 record snapshot; these are per-record entries, not a count of unique publications or all raw files in PSI.
- **45 unique URLs** are linked from the record-level source lists; one additional unique URL appears in a field-specific source block (**46 unique source URLs total**). The dataset contains 71 record-level source references and two field-level references; duplicate URLs are counted once in the Overview metric.
- **24 records contain evidence-summary entries**: 19 labelled `NASA-reported` and 5 labelled `Analysis-derived`. Entries can summarize outcomes, methods, planned conditions, or evidence limits; they are not all quantitative experimental results. **10 records contain numeric oxygen, pressure, or airflow conditions**, including named conditions; unreported values remain `Unknown`.
- 19 flight investigations on the ISS or Cygnus, plus 5 ground/computational PSI grants.

Records: BASS, BASS-II, Saffire I–III, SAME, SAME-R, DAFT/DAFT-2, FLEX, FLEX-2, CFI, six ACME experiments (BRE, CLD Flame, CFI-G, E-FIELD Flames, Flame Design, s-Flame), SPICE, SLICE, and five PSI ground grants (PSI-142, PSI-117, PSI-115, PSI-62, PSI-60).

### Provenance and method

1. The PSI public search API was queried for `combustion` and filtered to **Research Area = Combustion Science**; that exact filter returned the 24 investigations in this explorer.
2. Each record's PSI metadata (objectives, approach, hypothesis, impacts, hardware, dates, publications) was transcribed into `src/data/psi_investigations.json`.
3. Conditions, hardware and evidence-summary entries were cross-checked against NASA pages and NTRS reports where available. Discrepancies are preserved in notes rather than resolved silently (for example, BASS-II airflow limits differ between the PSI summary and NASA/TM-20210011385).
4. PSI defines the investigation inventory. The app links to NASA-hosted experimental tables and other files; it does not bundle or re-analyse the underlying PSI experiment data.
5. On 13 Nov 2026, the public PSI investigation endpoint was queried for all 24 records. Its versioned objectives, approach, hypothesis, impacts, publication citations, DOI/license metadata, and experimental/modeling table-file listings are stored as a dated snapshot in `src/data/psi_catalog.json`. NASA remains the live source of record; table downloads are served by NASA and are not bundled with this application.

### Evidence labels

| Label | Meaning |
| --- | --- |
| `NASA-reported` | Directly stated in an official NASA page or investigation record. |
| `Analysis-derived` | Produced through modeling, image analysis, or another analytical method; the record note distinguishes it from direct measurement. |
| `Derived` | Calculated in this application from sourced values; formula and inputs are shown (for example atm → psi). |
| `Illustrative estimate` | Editorial ranking, scenario or visual guide — never a NASA measurement. |
| `Unverified` | A claim not supported by an accessible source in this review. |
| `Unknown` | The available sources do not provide the value. Unknown is not zero. |

Every investigation record shows its sources and the evidence status of each data block. The header's **Evidence** button opens the legend.

### Editorial relevance scores

Relevance scores (0–5) are editorial rankings, not NASA measurements. The default weights are: habitable spacecraft 0.30, exploration habitat 0.20, predictive modeling 0.25, equipment design 0.15, terrestrial applications 0.10. The Overview page exposes four alternative profiles and shows the weighting and formula in the UI; the Compare page uses the default weights. Rationales are displayed with each score.

### Scope and known limits

- Propulsion system development is outside this application's scope. This is a scoping decision for this explorer, not a claim that NASA excludes propulsion from its combustion programme.
- PSI metadata is summary-level. Many records do not report measured values, exact oxygen or pressure setpoints, or complete sensor lists; missing fields are `Unknown`.
- The publication and table-file inventory is a dated snapshot, not a live PSI API integration. Refresh `src/data/psi_catalog.json` from the public NASA PSI endpoint before a future data release; verify citations and NASA download links after refreshing.
- Refresh the snapshot with `pnpm.cmd refresh:psi-catalog` (PowerShell) before a release; the command updates the catalog and its overview counts together. Then run `pnpm.cmd build` so the refreshed catalog is included in the production bundle. Review the resulting diff and recheck NASA links before publishing.
- Table files are linked from NASA’s PSI download service. Their contents are not copied into this app, independently quality-controlled, or re-analysed here. Use the DOI and NASA record version for research citation and reproducibility.
- No direct lunar- or Martian-gravity combustion measurements are present in the 24 PSI records. LUCI (simulated lunar gravity, February 2025) and FM2 (lunar surface) are official NASA activities **outside** the PSI dataset and are shown only as labelled context. No 0g→lunar/Mars interpolation is presented as a prediction.
- Oxygen concentration alone does not determine fire risk: pressure, material, geometry, airflow, ignition source and test configuration also matter.
- Historical incidents (Apollo 1, Apollo 13, the 1997 Mir fire) are shown as sourced context. No reviewed source states that they motivated a specific PSI investigation.
- The three Spinoff examples are separate technology-transfer cases; the Spinoff articles do not mention PSI or ISS combustion research.

## Features

- **Overview** — dataset coverage, ranked investigations with profile controls, sourced timeline including Artemis II alarm context, relevance rubric, NASA technology-transfer examples including fine-water-mist suppression, and a lead-verification ledger.
- **Investigation Explorer** — text search, pillar/phase/program/facility filters, and oxygen/pressure/airflow range filters with explicit missing-data handling.
- **Investigation detail** — objectives, hardware, fuel, conditions, evidence summaries (which may include outcomes, methods, or limitations), modeling utility, relevance breakdown, and clickable sources.
- **NASA catalog details** — each investigation includes NASA’s original project narrative, dataset DOI and version, publication citations, and downloadable experimental/modeling tables when listed in the retrieved PSI snapshot. The official NASA record links to the complete, live file inventory, including raw files and supporting documents.
- **Compare** — up to four records, field-by-field matrix, sourced condition charts, grouped sources, and Markdown/JSON export. Shareable links: `#/compare?ids=PSI-25,PSI-68`.
- **Atmosphere & Gravity** — sourced PSI operating envelopes, a clearly separated NASA spacesuit/lunar exploration atmosphere comparison, an illustrative user-entered scenario, gravity-data limits, an E-FIELD analogy explanation, LUCI context, and plain-language concepts.
- **Hardware Lineage** — a sourced relationship graph (follow-on, reflight, risk reduction, data reuse) with per-edge basis and source, plus an ACME shared-hardware cluster and a list of connections the sources do not support.
- **SI Research Co-Pilot** — two modes: a **Gemini science assistant** for plain-language explanations and follow-ups (grounded in retrieved records, with clickable citations and Simpler/More detail actions), and the original **offline dataset lookup** that answers deterministically with no network call.
- **Export** — Markdown and JSON briefs include selected IDs, sources, evidence labels, formulas, weights, assumptions and a generated-at timestamp.
- **Arabic language option** — switches navigation and selected interface/explanation text to Arabic, sets right-to-left reading direction, and remembers the choice. NASA investigation titles, source titles, record narratives and some detailed interface text remain in English pending full translation.

## Gemini assistant architecture

```
Browser (React)
  └── POST /api/assistant  { messages, style }
        └── server/api.mjs
              ├── input validation + 12 requests/minute/IP
              ├── server/assistant-core.mjs
              │     ├── retrieval: up to 5–8 relevant records + 2 concepts
              │     ├── prompt: bounded context, allowed citations only
              │     └── response: JSON schema + citation allowlist filtering
              └── server/gemini.mjs -> @google/genai -> Gemini API
```

- **SDK:** official [`@google/genai`](https://googleapis.github.io/js-genai/) (not the deprecated `@google/generative-ai`). Calls use `ai.models.generateContent` with a JSON response schema, `automaticContinuation: false`, and SDK HTTP retry attempts set to 1. The server itself makes one controlled retry for transient 5xx; the UI offers a manual retry. The app never enters a retry loop.
- **Retrieval:** only records whose metadata or NASA PSI publication titles match the question (plus a titles-only index and at most two concept notes) are sent. Selected records include bounded NASA catalog details; the full dataset is never sent.
- **Citations:** Gemini may only cite the URLs in an allowlist built from the retrieved records, relevant NASA-linked publications and table files, and concepts. The server drops any other URL before returning the answer, so fabricated links do not reach the browser.
- **Safety:** the system instruction forbids invented results, NASA affiliation, operational fire instructions, and safety verdicts. General background must be labelled “General explanation (not from the project sources)”.
- **Limits:** 10 messages per request, 1,500 characters per message, 8,000 characters total, 32 KB request body, 45-second timeout, one controlled retry on transient 5xx (SDK fan-out disabled), no retry loops. Provider errors are mapped to safe messages; the key and provider details are never returned.
- **Privacy:** chat exists only in React state in the current tab. No database, localStorage or server-side transcript. “New chat” clears it; refresh also clears it. Messages are sent to the server and then to Google’s Gemini API to generate an answer.
- **No key in the browser:** the client bundle contains no SDK import and no `GEMINI_API_KEY`. Browser traffic goes only to `/api/assistant`.

## Project structure

```
server/
  index.mjs               production static server + /api/assistant
  api.mjs                 request validation, rate limiting, error mapping
  assistant-core.mjs      retrieval, prompt, citation allowlist, schema
  gemini.mjs              official @google/genai adapter (server-only)
  vite-plugin.mjs         same endpoint inside Vite dev middleware
  assistant.test.mjs      Node test runner coverage
src/
  App.tsx                 shell, routing, global search, legend
  types.ts                typed data model
  data/
    psi_investigations.json   verified investigation records
    psi_catalog.json          dated NASA objectives, publications, and table-file metadata
    psi_catalog_summary.json  generated snapshot date and overview counts
    psiCatalog.ts             lazy catalog loader
    concepts.json             shared plain-language concept notes
    dataset.ts                load + runtime validation
    reference.ts              historical, Spinoff, gravity and rubric data
  utils/
    filtering.ts          filters and missing-data semantics
    ranking.ts            editorial relevance scoring
    assistant.ts          deterministic local intent engine
    assistantApi.ts       browser client for /api/assistant
    export.ts             Markdown/JSON brief builders
    format.ts             unit and date formatting
  components/
    PSICatalogSection.tsx     expandable NASA publications and data files
    charts/ConditionChart.tsx  ranges and O2/pressure scatter
    assistant/GeminiChat.tsx   chat UI, loading/error/retry, citations
    assistant/LocalLookup.tsx  offline dataset lookup
  pages/                  7 route pages
  styles.css              design system
scripts/refresh-psi-catalog.mjs  refresh versioned metadata from NASA PSI
```

## Verification performed

- `tsc --noEmit` passes; `vite build` succeeds.
- `pnpm test` covers retrieval bounds, request validation, citation allowlisting, missing-key handling, HTTP success, 400/405/413/415 paths.
- Browser checks: welcome/empty state, Send disabled on empty input, Enter-to-send, missing-key error state, simulated success rendering with clickable citation and Simpler action, Local Lookup tab, detection filter, Ctrl+K search, compare rendering.
- `GEMINI_API_KEY` is configured only in the server-side `.env`/environment. A live end-to-end request through the running UI returned HTTP 200 with a plain-language answer and clickable PSI source citations, using `gemini-3.5-flash-lite`.
- The default model was changed from `gemini-3.8-flash` to `gemini-3.5-flash-lite` after repeated provider capacity errors/timeouts with the former during testing. Override with `GEMINI_MODEL` if your project has capacity for a larger model. One controlled retry handles transient 5xx responses.
- If the key has ever been pasted into a chat, log, or issue tracker, treat it as exposed and rotate it. The repository and client bundle remain free of the key.
- The built client bundle was scanned and contains no `GEMINI_API_KEY`, `generativelanguage` or `@google/genai` strings.

### Deployment notes

- Run `pnpm build`, set `GEMINI_API_KEY` in the host’s secret/environment settings, then `pnpm start`.
- The server reads `PORT` (default `4173`) and `HOST` (default `127.0.0.1`; set `0.0.0.0` in a container or platform that requires it).
- `TRUST_PROXY` defaults to `false`. Set it to `true` only if the hosting proxy overwrites `X-Forwarded-For`; this lets the in-memory 12-requests/minute limiter distinguish visitors behind that proxy. The limiter is per server process, so add the host’s own abuse controls and provider quota limits before opening the assistant to public traffic or scaling to multiple instances.
- The server needs `dist/`, `src/data/psi_investigations.json`, `src/data/psi_catalog.json`, `src/data/concepts.json`, and the `server/` folder at runtime. Do not deploy only `dist/` if you want the assistant.
- Set a spending/quota limit in Google AI Studio or Google Cloud, and rotate the key if it is ever exposed. Do not put the key in build-time `VITE_*` variables.

## Primary sources

- [NASA PSI — Combustion Science search](https://psi.nasa.gov/physci/repo/search?q=combustion&ffield=Research%20Area&fvalue=Combustion%20Science)
- [NASA PSI public investigation API](https://psi.nasa.gov/geode-py/ws/repo/investigations/PSI-25) · [NASA explanation of PSI’s raw and analyzed data](https://www.nasa.gov/physical-sciences-informatics-psi/history-of-physical-science-informatics/)
- [NASA Combustion Science](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/)
- [Space Station's Quest for the Secrets of Fire](https://www.nasa.gov/humans-in-space/space-stations-quest-for-the-secrets-of-fire/)
- [BASS-II Summary Report, NASA/TM-20210011385](https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf)
- [LUCI presentation, NTRS 20250010653](https://ntrs.nasa.gov/api/citations/20250010653/downloads/ASGSR%202025-LUCI-Ferkul-Presentation-v2-20250010653.pdf)
- [Fire Safety Challenges for Future Human Lunar Exploration, NTRS 20260008630](https://ntrs.nasa.gov/api/citations/20260008630/downloads/NASA%20IWSCR.pdf)
- [Apollo 1](https://sma.nasa.gov/sma-disciplines/accllp/apollo-1) · [Apollo 13](https://sma.nasa.gov/sma-disciplines/accllp/apollo-13) · [Mir fire](https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/)
- Spinoff: [air tanks](https://spinoff.nasa.gov/node/9582) · [fire detector](https://spinoff.nasa.gov/node/9407) · [fire attire](https://spinoff.nasa.gov/node/9918)
- NASA NSSDC: [Moon fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) · [Mars fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
