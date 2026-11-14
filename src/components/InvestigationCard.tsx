import type { PSIInvestigation } from "../types";
import { EvidenceBadge } from "./EvidenceBadge";
import { ScoreBar } from "./ScoreBar";
import { weightedRelevance } from "../utils/ranking";
import { formatRange } from "../utils/format";
import { useLanguage } from "../i18n";

interface Props {
  record: PSIInvestigation;
  score?: number | null;
  inCompare: boolean;
  onToggleCompare: (id: string) => void;
}

export function InvestigationCard({ record, score, inCompare, onToggleCompare }: Props) {
  const { t } = useLanguage();
  const conditions = record.testConditions;
  return (
    <article className="inv-card">
      <div className="inv-card__top">
        <div>
          <div className="inv-acronym">{record.acronym}</div>
          <div className="inv-card__rank">{record.id}</div>
        </div>
        <div className="stack" style={{ alignItems: "flex-end", gap: 6 }}>
          <ScoreBar score={score ?? weightedRelevance(record)} />
          {record.testConditions && <EvidenceBadge status={record.testConditions.evidenceStatus} compact />}
        </div>
      </div>

      <a className="inv-title" href={`#/explorer/${record.id}`}>
        {t(record.fullTitle)}
      </a>

      <div className="chip-row">
        <span className="chip chip--muted">{t(record.fuelSpecs?.phase ?? "Phase unknown")}</span>
        {(record.safetyPillars ?? []).map((pillar) => (
          <span
            key={pillar}
            className={`chip ${
              pillar === "Detection" ? "chip--amber" : pillar === "Suppression" ? "chip--green" : "chip--cyan"
            }`}
          >
            {t(pillar)}
          </span>
        ))}
        {!(record.safetyPillars ?? []).length && <span className="chip chip--muted">{t("Unclassified")}</span>}
      </div>

      <dl className="kv" style={{ gap: 5 }}>
        <div className="kv__row">
          <dt className="kv__key tiny">O2</dt>
          <dd className="kv__val mono-sm" style={{ margin: 0 }}>
            {conditions?.oxygenPercentMin !== undefined || conditions?.oxygenPercentMax !== undefined
              ? formatRange(conditions?.oxygenPercentMin, conditions?.oxygenPercentMax, "%")
              : t("Unknown")}
          </dd>
        </div>
        <div className="kv__row">
          <dt className="kv__key tiny">{t("Pressure")}</dt>
          <dd className="kv__val mono-sm" style={{ margin: 0 }}>
            {conditions?.pressurePsiMin !== undefined || conditions?.pressurePsiMax !== undefined
              ? formatRange(conditions?.pressurePsiMin, conditions?.pressurePsiMax, "psia")
              : t("Unknown")}
          </dd>
        </div>
        <div className="kv__row">
          <dt className="kv__key tiny">{t("Airflow")}</dt>
          <dd className="kv__val mono-sm" style={{ margin: 0 }}>
            {conditions?.airflowCmPerSecondMin !== undefined ||
            conditions?.airflowCmPerSecondMax !== undefined
              ? formatRange(
                  conditions?.airflowCmPerSecondMin,
                  conditions?.airflowCmPerSecondMax,
                  "cm/s",
                )
              : t("Unknown")}
          </dd>
        </div>
      </dl>

      <div className="inv-card__foot">
        <span className="tiny dim">{t(record.programFamily ?? "Unclassified")}</span>
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn btn--sm"
            aria-pressed={inCompare}
            onClick={() => onToggleCompare(record.id)}
            aria-label={`${t(inCompare ? "Remove" : "Add")} ${record.acronym} ${t(inCompare ? "from" : "to")} ${t("comparison")}`}
          >
            {t(inCompare ? "In compare" : "Compare")}
          </button>
          <a className="btn btn--sm btn--ghost" href={`#/explorer/${record.id}`}>
            {t("Open")}
          </a>
        </div>
      </div>
    </article>
  );
}
