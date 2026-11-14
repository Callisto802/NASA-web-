import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { PSIInvestigation } from "../../types";
import { answerQuestion, suggestedQuestions } from "../../utils/assistant";
import type { AssistantAnswer } from "../../utils/assistant";
import { useRoute, navigate } from "../../lib/router";
import { DATASET_META } from "../../data/reference";

interface Props {
  records: PSIInvestigation[];
}

function confidenceChip(confidence: AssistantAnswer["confidence"]) {
  if (confidence === "high") return <span className="chip chip--green">High confidence match</span>;
  if (confidence === "medium") return <span className="chip chip--amber">Partial match</span>;
  return <span className="chip chip--red">Low confidence — check sources</span>;
}

export function LocalLookup({ records }: Props) {
  const route = useRoute();
  const queryParam = route.query.get("q") ?? "";
  const [input, setInput] = useState(queryParam);

  useEffect(() => {
    setInput(queryParam);
  }, [queryParam]);

  const answer = useMemo(
    () => (queryParam.trim() ? answerQuestion(queryParam, records) : null),
    [queryParam, records],
  );

  const suggestions = useMemo(() => suggestedQuestions(records), [records]);

  const ask = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (value) navigate(`/assistant?mode=local&q=${encodeURIComponent(value)}`);
  };

  const askSuggestion = (value: string) => {
    setInput(value);
    navigate(`/assistant?mode=local&q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="assistant-layout">
      <div>
        <div className="callout" style={{ marginBottom: 14 }}>
          <strong>Offline dataset lookup.</strong> This mode is deterministic and makes no network request.
          It searches the 24 PSI records for keywords and assembled summaries. For conversational
          explanations, use the <strong>Science assistant</strong> tab.
        </div>

        <div className="panel">
          <div className="panel-body">
            <form className="assistant-input-row" onSubmit={ask}>
              <label className="sr-only" htmlFor="assistant-question">
                Search the PSI dataset
              </label>
              <input
                id="assistant-question"
                className="input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="e.g. Compare the smoke and dust measurement investigations."
              />
              <button className="btn btn--primary" type="submit">
                Search
              </button>
            </form>

            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <span className="tiny dim" style={{ marginRight: 4 }}>
                Suggested:
              </span>
              {suggestions.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  className="toggle-pill"
                  onClick={() => askSuggestion(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {!answer ? (
              <div className="answer" style={{ borderStyle: "dashed" }}>
                <div className="answer__head">
                  <h2 className="answer__title">No question yet</h2>
                  <span className="answer__meta">Dataset: 24 records</span>
                </div>
                <p className="small muted">
                  Try a suggested question, name an investigation (for example BASS-II, FLEX-2, SAME or
                  ACME BRE), or ask about solid fuels, smoke detection, suppressants, documented conditions
                  or gravity.
                </p>
                <div className="suggestions" style={{ marginTop: 14 }}>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      className="suggestion"
                      onClick={() => askSuggestion(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="answer" aria-live="polite">
                <div className="answer__head">
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>
                      Dataset answer
                    </div>
                    <h2 className="answer__title">{answer.title}</h2>
                  </div>
                  <div className="stack" style={{ alignItems: "flex-end", gap: 6 }}>
                    {confidenceChip(answer.confidence)}
                    <span className="answer__meta">intent: {answer.intent}</span>
                  </div>
                </div>

                {answer.blocks.map((block, blockIndex) => (
                  <div className="answer-block" key={blockIndex}>
                    {block.heading && <h4>{block.heading}</h4>}
                    <ul>
                      {block.points.map((point, pointIndex) => (
                        <li key={pointIndex}>
                          {point.text}
                          {(point.citations ?? []).map((id) => {
                            const cited = records.find((record) => record.id === id);
                            return (
                              <a
                                key={id}
                                className="cite-btn"
                                href={`#/explorer/${id}`}
                                title={cited ? cited.fullTitle : id}
                              >
                                {cited?.acronym ?? id}
                              </a>
                            );
                          })}
                        </li>
                      ))}
                    </ul>
                    {block.note && <p className="answer-note">{block.note}</p>}
                    {block.sources && block.sources.length > 0 && (
                      <div className="stack" style={{ gap: 4, marginTop: 8 }}>
                        {block.sources.map((source) => (
                          <a
                            key={source.url}
                            className="source__url"
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {source.title} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {answer.citations.length > 0 && (
                  <div className="citation-list">
                    <span className="citation-list__label">Citations</span>
                    {answer.citations.map((citation) => (
                      <a
                        key={citation.id}
                        className="chip chip--cyan"
                        href={`#/explorer/${citation.id}`}
                        title={citation.title}
                      >
                        {citation.acronym} ↗
                      </a>
                    ))}
                  </div>
                )}

                <p className="answer-note" style={{ marginTop: 14 }}>
                  Assembled locally from PSI metadata, not a NASA conclusion. Open the cited records and
                  their sources before using any statement in engineering work.
                </p>

                {answer.suggestions && answer.suggestions.length > 0 && (
                  <div className="suggestions" style={{ marginTop: 14 }}>
                    {answer.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        className="suggestion"
                        onClick={() => askSuggestion(suggestion)}
                        type="button"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="callout" style={{ marginTop: 16 }}>
          <strong>How this mode works.</strong> The question is normalised and matched against intent
          keywords and investigation names. The response is assembled from dataset fields with citations.
          There is no generative model, no network call, and no hidden retrieval step. If no record matches,
          it says so.
        </div>
      </div>

      <aside className="stack">
        <div className="panel panel--flat">
          <div className="panel-head">
            <h3>What it can answer</h3>
          </div>
          <div className="panel-body stack small muted">
            <p>✓ Solid, liquid and gaseous fuel questions</p>
            <p>✓ Smoke, dust and detection records</p>
            <p>✓ Suppressants and extinction work</p>
            <p>✓ Documented oxygen, pressure and flow ranges</p>
            <p>✓ Hardware, facilities and sourced lineage</p>
            <p>✓ Single-record summaries and two-record comparisons</p>
            <div className="divider" style={{ margin: "6px 0" }} />
            <p>✗ Fire-risk predictions or safe/unsafe verdicts</p>
            <p>✗ Values that PSI does not report</p>
            <p>✗ Numerical interpolation to lunar or Mars gravity</p>
            <p>✗ Propulsion design questions (outside scope)</p>
          </div>
        </div>

        <div className="panel panel--flat">
          <div className="panel-head">
            <h3>Data handling</h3>
          </div>
          <div className="panel-body small muted stack">
            <p>
              Nothing you type leaves this page. There is no API key and no server request; the lookup runs
              against the dataset bundled with the app.
            </p>
            <p className="tiny dim">{DATASET_META.limitations}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
