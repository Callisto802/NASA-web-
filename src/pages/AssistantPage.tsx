import { useEffect, useState, type KeyboardEvent } from "react";
import type { PSIInvestigation } from "../types";
import { GeminiChat } from "../components/assistant/GeminiChat";
import { LocalLookup } from "../components/assistant/LocalLookup";
import { navigate, useRoute } from "../lib/router";
import { useLanguage } from "../i18n";

interface Props {
  records: PSIInvestigation[];
}

type Tab = "gemini" | "local";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "gemini", label: "Science assistant" },
  { id: "local", label: "Dataset lookup" },
];

export function AssistantPage({ records }: Props) {
  const { t } = useLanguage();
  const route = useRoute();
  const mode = route.query.get("mode");
  const [tab, setTab] = useState<Tab>(mode === "local" ? "local" : "gemini");

  useEffect(() => {
    setTab(mode === "local" ? "local" : "gemini");
  }, [mode]);

  const selectTab = (next: Tab) => {
    setTab(next);
    navigate(next === "local" ? "/assistant?mode=local" : "/assistant", { replace: true });
  };

  const focusTab = (id: Tab) => {
    window.requestAnimationFrame(() => document.getElementById(`assistant-tab-${id}`)?.focus());
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = TABS[(index + direction + TABS.length) % TABS.length];
      selectTab(next.id);
      focusTab(next.id);
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const next = event.key === "Home" ? TABS[0] : TABS[TABS.length - 1];
      selectTab(next.id);
      focusTab(next.id);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("SI Research Co-Pilot")}</div>
          <h1 className="page-title">{t("Ask the research assistant")}</h1>
          <p className="page-lede">
            {t("A Gemini-powered assistant for everyday questions and NASA science. It answers from relevant NASA PSI records, shows sources when available, and says when the data does not cover a project-specific question. The offline dataset lookup is also available.")}
          </p>
        </div>
        <div className="stack" style={{ alignItems: "flex-end", gap: 6 }}>
          <span className="chip chip--amber">{t("AI-assisted · verify sources")}</span>
          <span className="chip chip--cyan">{records.length} {t("sourced records")}</span>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={t("Assistant modes")}>
        {TABS.map((item, index) => (
          <button
            key={item.id}
            id={`assistant-tab-${item.id}`}
            className="tab"
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            aria-controls={`assistant-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => selectTab(item.id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      <div
        id="assistant-panel-gemini"
        role="tabpanel"
        aria-labelledby="assistant-tab-gemini"
        className="assistant-layout"
        hidden={tab !== "gemini"}
      >
          <div>
            <GeminiChat />
          </div>

          <aside className="stack" aria-label="About the science assistant">
            <div className="panel panel--flat">
              <div className="panel-head">
                <h3>{t("What it can help with")}</h3>
              </div>
              <div className="panel-body stack small muted">
                <p>{t("✓ Everyday requests, including recipes, writing, and general science")}</p>
                <p>{t("✓ Explaining terms like diffusion flame, buoyancy or limiting oxygen index")}</p>
                <p>{t("✓ Summarising a retrieved investigation in plain language")}</p>
                <p>{t("✓ Explaining what a result does and does not show")}</p>
                <p>{t("✓ Answering follow-up questions in the same conversation")}</p>
                <p>{t("✓ Pointing to the NASA sources behind an explanation")}</p>
                <div className="divider" style={{ margin: "6px 0" }} />
                <p>{t("✗ Predicting whether a real design or material is safe")}</p>
                <p>{t("✗ Operational firefighting or fire-testing instructions")}</p>
                <p>{t("✗ Inventing results that the PSI records do not contain")}</p>
                <p>{t("✗ Replacing NASA documentation or engineering review")}</p>
              </div>
            </div>

            <div className="panel panel--flat">
              <div className="panel-head">
                <h3>{t("How answers are grounded")}</h3>
              </div>
              <div className="panel-body small muted stack">
                <p>
                  {t("For NASA questions, the server selects relevant records and sends their metadata to Gemini; citations are limited to those records. For unrelated questions, Gemini responds normally without forcing NASA material into the answer.")}
                </p>
                <p>
                  {t("For general questions, Gemini answers from general knowledge. For NASA-specific questions, it says when project records do not provide the answer.")}
                </p>
                <p className="tiny dim">
                  {t("Estimates, relevance scores and editorial labels in this app are not NASA measurements.")}
                </p>
              </div>
            </div>

            <div className="panel panel--flat">
              <div className="panel-head">
                <h3>{t("Privacy")}</h3>
              </div>
              <div className="panel-body small muted stack">
                <p>
                  {t("Your messages are kept in this browser tab only. They are sent to this site’s server, which calls Gemini. The app does not save chat history; refreshing or choosing “New chat” clears it.")}
                </p>
                <p className="tiny dim">
                  {t("Do not type sensitive personal, operational or proprietary information into the assistant.")}
                </p>
              </div>
            </div>
          </aside>
      </div>

      <div
        id="assistant-panel-local"
        role="tabpanel"
        aria-labelledby="assistant-tab-local"
        hidden={tab !== "local"}
      >
        <LocalLookup records={records} />
      </div>
    </div>
  );
}
