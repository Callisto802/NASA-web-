import type { EvidenceStatus } from "../types";
import { evidenceDescription } from "../data/dataset";
import { useLanguage } from "../i18n";

const STYLES: Record<EvidenceStatus, { className: string; mark: string; short: string }> = {
  "NASA-reported": { className: "evidence--nasa", mark: "N", short: "NASA" },
  "Analysis-derived": { className: "evidence--analysis-derived", mark: "A", short: "Analysis" },
  Derived: { className: "evidence--derived", mark: "D", short: "Derived" },
  "Illustrative estimate": { className: "evidence--illustrative", mark: "E", short: "Estimate" },
  Unverified: { className: "evidence--unverified", mark: "U", short: "Unverified" },
  Unknown: { className: "evidence--unknown", mark: "?", short: "Unknown" },
};

interface Props {
  status: EvidenceStatus | undefined;
  compact?: boolean;
}

export function EvidenceBadge({ status, compact = false }: Props) {
  const { t } = useLanguage();
  const value: EvidenceStatus = status ?? "Unknown";
  const style = STYLES[value];
  return (
    <span
      className={`evidence ${style.className}`}
      title={`${t(value)}: ${t(evidenceDescription(value))}`}
      aria-label={`${t("Evidence status")}: ${t(value)}`}
    >
      <span className="evidence__mark" aria-hidden="true">
        {style.mark}
      </span>
      {t(compact ? style.short : value)}
    </span>
  );
}

export function EvidenceKey() {
  return (
    <>
      {(Object.keys(STYLES) as EvidenceStatus[]).map((status) => (
        <EvidenceBadge key={status} status={status} />
      ))}
    </>
  );
}
