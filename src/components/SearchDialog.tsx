import { useEffect, useMemo, useRef, useState } from "react";
import type { PSIInvestigation } from "../types";
import { applyFilters, EMPTY_FILTERS } from "../utils/filtering";
import { navigate } from "../lib/router";
import { useLanguage } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  records: PSIInvestigation[];
}

export function SearchDialog({ open, onClose, records }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return records.slice(0, 7);
    return applyFilters(records, { ...EMPTY_FILTERS, query }).slice(0, 8);
  }, [query, records]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      }
      if (event.key === "Enter" && results[active]) {
        event.preventDefault();
        onClose();
        navigate(`/explorer/${results[active].id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose]);

  if (!open) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={t("Search investigations")}>
        <div className="search-field">
          <span aria-hidden="true" className="dim">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder={t("Search investigations, materials, facilities, findings…")}
            aria-label={t("Search investigations")}
            autoComplete="off"
          />
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Esc
          </button>
        </div>
        <div className="modal__body" role="listbox" aria-label="Search results">
          {results.length === 0 ? (
            <div className="empty" style={{ border: 0, padding: "28px 16px" }}>
              <p>No investigation matches “{query}”. Try a material such as PMMA, a facility such as CIR, or a program such as Saffire.</p>
            </div>
          ) : (
            results.map((record, index) => (
              <a
                key={record.id}
                className="search-result"
                href={`#/explorer/${record.id}`}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={(event) => {
                  event.preventDefault();
                  onClose();
                  navigate(`/explorer/${record.id}`);
                }}
              >
                <span className="search-result__id">{record.id}</span>
                <span className="search-result__title">
                  {record.acronym !== record.id ? `${record.acronym} — ` : ""}
                  {t(record.fullTitle)}
                </span>
                <span className="search-result__phase">{record.fuelSpecs?.phase ? t(record.fuelSpecs.phase) : t("Unknown")}</span>
              </a>
            ))
          )}
        </div>
        <div className="modal__foot">
          <span>{t("↑ ↓ to move · Enter to open · Esc to close")}</span>
          <span className="mono">{results.length} {t("shown")}</span>
        </div>
      </div>
    </div>
  );
}
