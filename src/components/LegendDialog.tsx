import { EvidenceKey } from "./EvidenceBadge";
import { DATASET_META, RELEVANCE_RUBRIC } from "../data/reference";
import { useLanguage } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LegendDialog({ open, onClose }: Props) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={t("Source & evidence legend")}>
        <div className="modal__head">
          <h2 style={{ fontSize: 15 }}>{t("Source & evidence legend")}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t("Close legend")}>
            ✕
          </button>
        </div>
        <div className="modal__body">
          <div className="legend-grid">
            <p className="small muted">{t("Every scientific value in this explorer carries one of these labels. A badge describes the provenance of the field beside it, not the strength of the underlying science.")}</p>
            <div className="stack">
              <EvidenceKey />
            </div>
            <div className="divider" />
            <div className="stack small muted">
              <p>
                <strong style={{ color: "var(--text)" }}>{t("NASA-reported")}</strong> — {t("directly stated in an official NASA page or an investigation record. PSI metadata is treated as NASA-reported.")}
              </p>
              <p>
                <strong style={{ color: "var(--text)" }}>{t("Analysis-derived")}</strong> — {t("produced through a model, image analysis, or another analytical method. Read the record note to distinguish an analytical output from a direct measurement.")}
              </p>
              <p>
                <strong style={{ color: "var(--text)" }}>{t("Derived")}</strong> — {t("calculated in this application from sourced values. Conversions use 1 atm = 14.6959 psi; the formula and inputs are shown wherever the value appears.")}
              </p>
              <p>
                <strong style={{ color: "var(--text)" }}>{t("Illustrative estimate")}</strong> — {t("an editorial ranking, assumed scenario or visual guide. Never a NASA measurement. Relevance scores are in this category.")}
              </p>
              <p>
                <strong style={{ color: "var(--text)" }}>Unverified</strong> — a claim not supported by an
                accessible source in this review. Avoid relying on it.
              </p>
              <p>
                <strong style={{ color: "var(--text)" }}>{t("Unknown")}</strong> — {t("the sources do not provide the value. Unknown is not zero, and missing values are excluded from range filters and charts.")}
              </p>
            </div>
            <div className="divider" />
            <div className="stack small muted">
              <p style={{ color: "var(--text-soft)", fontWeight: 500 }}>Relevance scores</p>
              <p>{RELEVANCE_RUBRIC.note}</p>
              <ul>
                {RELEVANCE_RUBRIC.dimensions.map((dimension) => (
                  <li key={dimension.key}>
                    {dimension.label} — weight {dimension.weight}
                  </li>
                ))}
              </ul>
            </div>
            <div className="divider" />
            <p className="tiny dim">{DATASET_META.method}</p>
          </div>
        </div>
        <div className="modal__foot">
          <span>External sources open in a new tab.</span>
          <button className="btn btn--sm" onClick={onClose}>
            {t("Done")}
          </button>
        </div>
      </div>
    </div>
  );
}
