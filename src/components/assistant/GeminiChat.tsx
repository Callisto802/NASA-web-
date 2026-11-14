import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AssistantRequestError,
  askScienceAssistant,
  type AssistantCitation,
  type AssistantStyle,
  type RetrievedRecord,
} from "../../utils/assistantApi";
import { useLanguage } from "../../i18n";

interface ChatError {
  code: string;
  message: string;
  retryable: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: "gemini";
  model?: string;
  citations?: AssistantCitation[];
  retrievedRecords?: RetrievedRecord[];
  error?: ChatError;
}

interface LastRequest {
  conversation: ChatMessage[];
  style: AssistantStyle;
}

const EXAMPLES = [
  "What is a diffusion flame? I'm new to chemistry.",
  "What did BASS-II learn about airflow and oxygen?",
  "Why is fire different in microgravity?",
  "What does “limiting oxygen index” mean?",
  "What can the Saffire experiments not tell us?",
  "Give me a simple pasta recipe.",
];

const MAX_INPUT = 1500;

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function errorFrom(error: unknown): ChatError {
  if (error instanceof AssistantRequestError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }
  return {
    code: "unexpected_error",
    message: "Something went wrong while asking the assistant. Please try again.",
    retryable: true,
  };
}

export function GeminiChat() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, loading]);

  const runRequest = async (conversation: ChatMessage[], style: AssistantStyle) => {
    const apiMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const message of conversation) {
      if (message.error || !message.content.trim()) continue;
      const previous = apiMessages[apiMessages.length - 1];
      if (previous && previous.role === message.role && previous.content === message.content) continue;
      apiMessages.push({ role: message.role, content: message.content });
    }
    const boundedMessages = apiMessages.slice(-10);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    lastRequestRef.current = { conversation, style };
    setMessages(conversation);
    setLoading(true);
    setAnnouncement("Reading the project sources.");

    try {
      const reply = await askScienceAssistant({ messages: boundedMessages, style, signal: controller.signal });
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: reply.answer,
        provider: reply.provider,
        model: reply.model,
        citations: reply.citations,
        retrievedRecords: reply.retrievedRecords,
      };
      setMessages([...conversation, assistantMessage]);
      setAnnouncement("The assistant has answered.");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      const chatError = errorFrom(error);
      setMessages([...conversation, { id: newId(), role: "assistant", content: "", error: chatError }]);
      setAnnouncement(`The assistant could not answer. ${chatError.message}`);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const send = (text: string = input, style: AssistantStyle = "normal") => {
    if (loading) return;
    const question = text.trim();
    if (!question) return;
    if (text === input) setInput("");
    const conversation: ChatMessage[] = [
      ...messages,
      { id: newId(), role: "user", content: question },
    ];
    void runRequest(conversation, style);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const retry = () => {
    const last = lastRequestRef.current;
    if (!last || loading) return;
    void runRequest(last.conversation, last.style);
  };

  const newChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    lastRequestRef.current = null;
    setMessages([]);
    setInput("");
    setLoading(false);
    setAnnouncement("New chat started.");
    inputRef.current?.focus();
  };

  const latestAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && !message.error)?.id;
  const examples = language === "ar"
    ? [
        "ما معنى لهب الانتشار؟ أنا مبتدئ في الكيمياء.",
        "ماذا تعلمت ناسا من تجربة BASS-II عن تدفق الهواء والأكسجين؟",
        "لماذا يتغير اللهب في الجاذبية الصغرى؟",
        "اشرح لي ببساطة ما هو مؤشر الأكسجين المحدد.",
        "ما الذي لا تخبرنا به تجارب Saffire؟",
        "أعطني وصفة معكرونة بسيطة.",
      ]
    : EXAMPLES;
  const lastMessage = messages[messages.length - 1];

  return (
    <div className="gemini-chat">
      <div className="gemini-chat__bar">
        <div>
          <span className="gemini-badge" aria-hidden="true">
            ✦ Gemini
          </span>
          <span className="gemini-chat__bar-text">
            {t("Answers general questions; NASA research answers include relevant citations")}
          </span>
        </div>
        <button
          className="btn btn--sm"
          onClick={newChat}
          disabled={messages.length === 0 && !loading}
          aria-label={t("Start a new chat and clear this conversation")}
        >
          {t("New chat")}
        </button>
      </div>

      <div
        className={`chat-log ${messages.length === 0 && !loading ? "chat-log--empty" : ""}`}
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 && !loading ? (
          <div className="chat-welcome">
            <div className="chat-welcome__icon" aria-hidden="true">
              ✦
            </div>
            <h2>{t("Hi — I can help make sense of this research.")}</h2>
            <p>{t("Ask about NASA research or any everyday topic, including recipes. I’ll explain in everyday words and show the sources I used.")}</p>
            <p className="chat-welcome__caveat">
              {t("I’m an AI assistant, not NASA, not a NASA employee, and not a fire-safety professional. I can be wrong — please check the cited sources.")}
            </p>
            <div className="chat-examples" aria-label={t("Example questions")}>
              <span className="chat-examples__label">{t("Try a question")}</span>
              {examples.map((example) => (
                <button
                  key={example}
                  className="chat-example"
                  onClick={() => send(example)}
                  type="button"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message chat-message--${message.role}`}
            >
              {message.role === "assistant" && (
                <div className="chat-avatar" aria-hidden="true">
                  SI
                </div>
              )}
              <div className="chat-message__body">
                <div className="chat-message__meta">
                  <span>{message.role === "user" ? t("You") : t("SI Research Co-Pilot")}</span>
                  {message.role === "assistant" && !message.error && (
                    <span className="chat-ai-tag" title={message.model ? `Model: ${message.model}` : undefined}>
                      {message.provider === "gemini"
                        ? `Gemini${message.model ? ` · ${message.model}` : ""}`
                        : "Provider not confirmed"}
                    </span>
                  )}
                </div>

                {message.error ? (
                  <div className="chat-error" role="alert">
                    <div className="chat-error__title">
                      {message.error.code === "not_configured"
                        ? t("The science assistant is not set up yet")
                        : message.error.code === "rate_limited" || message.error.code === "provider_busy"
                          ? t("A temporary service issue — not your question")
                          : message.error.code === "timeout"
                            ? t("Gemini took too long — your question is fine")
                          : t("I couldn’t answer that")}
                    </div>
                    <p>{t(message.error.message)}</p>
                    {message.error.code === "not_configured" && (
                      <p className="chat-error__hint">
                        The key is set in the server environment and is never entered in, or sent to, the
                        browser.
                      </p>
                    )}
                    {message.error.retryable && lastRequestRef.current && (
                      <button className="btn btn--sm" onClick={retry} disabled={loading}>
                        {t("Try again")}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="chat-text">{message.content}</div>

                    {message.role === "assistant" && (message.citations ?? []).length > 0 && (
                      <div className="chat-citations">
                        <span className="chat-citations__label">{t("Sources for this answer")}</span>
                        {(message.citations ?? []).map((citation, index) => {
                          const href = safeHttpsUrl(citation.url);
                          if (!href) return null;
                          return (
                            <a
                              key={`${message.id}-${citation.url}`}
                              className="chat-citation"
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={citation.title}
                            >
                              <span className="chat-citation__index">{index + 1}</span>
                              <span className="chat-citation__title">{citation.title}</span>
                              <span className="chat-citation__kind">
                                {citation.kind === "project" ? t("Project source") : t("Background")}
                              </span>
                              <span className="sr-only">(opens in a new tab)</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {message.role === "assistant" &&
                      (message.citations ?? []).length === 0 &&
                      !message.content.trim().endsWith("?") && (
                        <p className="chat-no-source">
                          {t("No source link was returned for this answer. Treat it as general explanation and check the project records before relying on it.")}
                        </p>
                      )}

                    {message.role === "assistant" && (message.retrievedRecords ?? []).length > 0 && (
                      <div className="chat-records">
                        <span className="chat-records__label">{t("Records retrieved")}</span>
                        {(message.retrievedRecords ?? []).map((record) => (
                          <a
                            key={`${message.id}-${record.id}`}
                            className="chip chip--muted"
                            href={`#/explorer/${record.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={record.fullTitle}
                          >
                            {record.acronym}
                          </a>
                        ))}
                      </div>
                    )}

                    {message.role === "assistant" &&
                      message.id === latestAssistantId &&
                      lastMessage?.id === message.id &&
                      !loading && (
                        <div className="chat-refine">
                          <span className="chat-refine__label">{t("Need a different depth?")}</span>
                          <button
                            className="btn btn--sm"
                            type="button"
                            onClick={() => send(t("Please explain that again more simply, for a beginner."), "simpler")}
                          >
                            {t("Simpler")}
                          </button>
                          <button
                            className="btn btn--sm"
                            type="button"
                            onClick={() => send(t("Please explain that in more detail."), "detailed")}
                          >
                            {t("More detail")}
                          </button>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-avatar" aria-hidden="true">
              SI
            </div>
            <div className="chat-message__body">
              <div className="chat-message__meta">
                <span>{t("SI Research Co-Pilot")}</span>
                <span className="chat-ai-tag">{t("AI explanation")}</span>
              </div>
              <div className="chat-bubble chat-bubble--pending">
                <span className="typing" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                {t("Reading the project sources…")}
              </div>
            </div>
          </div>
        )}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>

      <form className="chat-composer" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="science-assistant-input">
          {t("Ask the science assistant a question")}
        </label>
        <textarea
          id="science-assistant-input"
          ref={inputRef}
          className="chat-input"
          placeholder={t("Ask a question about the research…")}
          value={input}
          onChange={(event) => setInput(event.target.value.slice(0, MAX_INPUT))}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={MAX_INPUT}
          disabled={loading}
          aria-describedby="chat-input-help chat-input-count"
        />
        <div className="chat-composer__foot">
          <span id="chat-input-help" className="tiny dim">
            {t("Enter sends · Shift+Enter adds a line")}
          </span>
          <span id="chat-input-count" className="tiny dim mono-sm" aria-live="off">
            {input.length}/{MAX_INPUT}
          </span>
          <button
            className="btn btn--primary chat-send"
            type="submit"
            disabled={loading || input.trim().length === 0}
          >
            {loading ? t("Thinking…") : t("Send")}
          </button>
        </div>
      </form>

      <p className="chat-privacy">
        {t("Messages stay in this tab and are not saved by the app. They are sent to this site’s server to call Gemini. Refreshing or choosing “New chat” clears them.")}
      </p>
    </div>
  );
}
