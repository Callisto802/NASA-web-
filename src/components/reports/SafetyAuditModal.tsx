import { useState, useMemo } from "react";
import type { AtmosphereLabState, MaterialOption, PSIInvestigation } from "../../types";
import { MATERIALS, calculateFireRisk } from "../../utils/fireRisk";
import { generateSafetyAuditMarkdown } from "../../utils/auditReport";
import { downloadText } from "../../utils/export";
import { useLanguage } from "../../i18n";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: AtmosphereLabState;
  selectedMaterialId: MaterialOption["id"];
  investigations: PSIInvestigation[];
}

export function SafetyAuditModal({
  isOpen,
  onClose,
  state,
  selectedMaterialId,
  investigations,
}: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const material = useMemo(
    () => MATERIALS.find((m) => m.id === selectedMaterialId) ?? MATERIALS[0],
    [selectedMaterialId],
  );

  const riskResult = useMemo(
    () => calculateFireRisk(state, material.id, investigations),
    [state, material, investigations],
  );

  const matchedInvestigations = useMemo(
    () =>
      riskResult.matchedInvestigationIds
        .map((id) => investigations.find((inv) => inv.id === id))
        .filter((inv): inv is PSIInvestigation => Boolean(inv)),
    [riskResult.matchedInvestigationIds, investigations],
  );

  const markdownContent = useMemo(
    () =>
      generateSafetyAuditMarkdown({
        state,
        material,
        riskResult,
        investigations,
        matchedInvestigations,
      }),
    [state, material, riskResult, investigations, matchedInvestigations],
  );

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback */
    }
  };

  const handleDownload = () => {
    const filename = `NASA-Safety-Audit-${state.preset}-${Date.now()}.md`;
    downloadText(filename, markdownContent, "text/markdown");
  };

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
        style={{ maxWidth: 840, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="row row--between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 id="audit-modal-title" style={{ fontSize: 17, margin: 0 }}>
              {t("NASA PSI Fire Safety Audit Brief")}
            </h2>
            <div className="chip-row" style={{ marginTop: 6 }}>
              <span className="chip chip--cyan">{state.customLabel ?? t(state.preset)}</span>
              <span className="chip">{state.pressurePsi.toFixed(1)} psia</span>
              <span className="chip">{state.oxygenPercent.toFixed(1)}% O₂</span>
              <span className="chip chip--amber">{t(material.name)}</span>
              <span className="chip chip--green">{riskResult.normalizedScore}/100</span>
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label={t("Close")}>
            ✕
          </button>
        </div>

        {/* Modal Body / Preview */}
        <div
          className="modal__body"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "var(--bg-app, #050b15)",
          }}
        >
          <div className="callout callout--amber" style={{ marginBottom: 16 }}>
            <strong>{t("MANDATORY NOTICE")}:</strong>{" "}
            {t("THIS DOCUMENT IS AN ENGINEERING RESEARCH SUPPORT OUTPUT. IT IS NOT AN OFFICIAL NASA DOCUMENT OR CERTIFIED SAFETY ASSESSMENT.")}
          </div>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--text, #e2e8f0)",
              background: "rgba(0,0,0,0.3)",
              padding: 16,
              borderRadius: 6,
              border: "1px solid var(--line)",
            }}
          >
            {markdownContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div
          className="row row--between"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line)",
            background: "var(--panel-bg, #0d1522)",
          }}
        >
          <span className="tiny dim">
            {copied ? <strong style={{ color: "var(--green)" }}>✓ {t("Copied to clipboard!")}</strong> : t("Ready for export to Markdown or clipboard.")}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--ghost" onClick={handleCopy}>
              {copied ? t("Copied!") : t("Copy to Clipboard")}
            </button>
            <button className="btn btn--primary" onClick={handleDownload}>
              {t("Download Markdown (.md)")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
