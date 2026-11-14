import { useMemo, useState } from "react";
import type { PSIInvestigation, SafetyPillar } from "../types";
import {
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  FACILITY_LABELS,
  uniqueValues,
  type FilterState,
  type SortKey,
} from "../utils/filtering";
import { weightedRelevance } from "../utils/ranking";
import { InvestigationCard } from "../components/InvestigationCard";
import { useLanguage } from "../i18n";

interface Props {
  records: PSIInvestigation[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
}

const PILLARS: SafetyPillar[] = ["Prevention", "Detection", "Suppression"];
const PHASES = ["Solid", "Liquid", "Gaseous", "Simulated", "Unknown"];

function RangeFilter({
  label,
  unit,
  minBound,
  maxBound,
  enabled,
  range,
  onToggle,
  onChange,
  unknownCount,
}: {
  label: string;
  unit: string;
  minBound: number;
  maxBound: number;
  enabled: boolean;
  range: [number, number];
  onToggle: (enabled: boolean) => void;
  onChange: (range: [number, number]) => void;
  unknownCount: number;
}) {
  const { t } = useLanguage();
  return (
    <div className="filter-group">
      <div className="filter-group__head">
        <span>{t(label)}</span>
        <label className="checkbox" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
            aria-label={`${t("Enable")} ${t(label)} ${t("filter")}`}
          />
        </label>
      </div>
      <div className="filter-group__body">
        <div className="range-inputs">
          <label className="sr-only" htmlFor={`${label}-min`}>
            {t(label)} {t("minimum")}
          </label>
          <input
            id={`${label}-min`}
            className="input"
            type="number"
            min={minBound}
            max={maxBound}
            step={0.1}
            value={range[0]}
            disabled={!enabled}
            onChange={(event) =>
              onChange([Number(event.target.value), Math.max(Number(event.target.value), range[1])])
            }
          />
          <span>{t("to")}</span>
          <label className="sr-only" htmlFor={`${label}-max`}>
            {t(label)} {t("maximum")}
          </label>
          <input
            id={`${label}-max`}
            className="input"
            type="number"
            min={minBound}
            max={maxBound}
            step={0.1}
            value={range[1]}
            disabled={!enabled}
            onChange={(event) =>
              onChange([Math.min(range[0], Number(event.target.value)), Number(event.target.value)])
            }
          />
          <span className="mono-sm">{unit}</span>
        </div>
        <p className="tiny dim">
          {unknownCount} {t("records do not report this value.")}
        </p>
      </div>
    </div>
  );
}

export function ExplorerPage({ records, compareIds, onToggleCompare }: Props) {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [oxygenEnabled, setOxygenEnabled] = useState(false);
  const [oxygenRange, setOxygenRange] = useState<[number, number]>([0, 40]);
  const [pressureEnabled, setPressureEnabled] = useState(false);
  const [pressureRange, setPressureRange] = useState<[number, number]>([0, 80]);
  const [airflowEnabled, setAirflowEnabled] = useState(false);
  const [airflowRange, setAirflowRange] = useState<[number, number]>([0, 70]);

  const phases = PHASES;
  const families = uniqueValues(records, (record) => [record.programFamily ?? "Unclassified"]);
  const facilities = uniqueValues(records, (record) => record.hardware?.sharedHardwareIds ?? []);

  const effectiveFilters: FilterState = {
    ...filters,
    oxygenRange: oxygenEnabled ? oxygenRange : null,
    pressureRange: pressureEnabled ? pressureRange : null,
    airflowRange: airflowEnabled ? airflowRange : null,
  };

  const filtered = useMemo(() => {
    const result = applyFilters(records, effectiveFilters);
    return result.sort((a, b) => {
      if (sort === "title") return a.fullTitle.localeCompare(b.fullTitle);
      if (sort === "period") return (a.investigationPeriod ?? "").localeCompare(b.investigationPeriod ?? "");
      return (weightedRelevance(b) ?? 0) - (weightedRelevance(a) ?? 0);
    });
  }, [records, effectiveFilters, sort]);

  const activeFilterCount = countActiveFilters(effectiveFilters);
  const unknownCounts = {
    oxygen: records.filter(
      (record) =>
        record.testConditions?.oxygenPercentMin === undefined &&
        record.testConditions?.oxygenPercentMax === undefined &&
        (record.testConditions?.namedConditions ?? []).length === 0,
    ).length,
    pressure: records.filter(
      (record) =>
        record.testConditions?.pressurePsiMin === undefined &&
        record.testConditions?.pressurePsiMax === undefined &&
        (record.testConditions?.namedConditions ?? []).length === 0,
    ).length,
    airflow: records.filter(
      (record) =>
        record.testConditions?.airflowCmPerSecondMin === undefined &&
        record.testConditions?.airflowCmPerSecondMax === undefined &&
        (record.testConditions?.namedConditions ?? []).length === 0,
    ).length,
  };

  const togglePillar = (pillar: SafetyPillar) => {
    setFilters((current) => ({
      ...current,
      pillars: current.pillars.includes(pillar)
        ? current.pillars.filter((item) => item !== pillar)
        : [...current.pillars, pillar],
    }));
  };

  const toggleArrayValue = (key: "phases" | "programFamilies" | "facilities", value: string) => {
    setFilters((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setOxygenEnabled(false);
    setPressureEnabled(false);
    setAirflowEnabled(false);
    setOxygenRange([0, 40]);
    setPressureRange([0, 80]);
    setAirflowRange([0, 70]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("Investigation Explorer")}</div>
          <h1 className="page-title">{t("Browse the sourced dataset")}</h1>
          <p className="page-lede">
            {t("Filter by safety pillar, fuel phase, facility or documented test conditions. Every missing value stays visible as Unknown and is excluded from range filters unless you explicitly include it.")}
          </p>
        </div>
        <div className="row">
          <span className="result-count">
            <strong>{filtered.length}</strong> / {records.length} {t("records")}
          </span>
          <button className="btn btn--sm" onClick={reset} disabled={activeFilterCount === 0 && !oxygenEnabled && !pressureEnabled && !airflowEnabled}>
            {t("Reset filters")}
          </button>
        </div>
      </div>

      <div className="explorer-layout">
        <aside className="filter-rail" aria-label={t("Filters")}>
          <div className="filter-group">
            <div className="filter-group__head">
              <span>{t("Search")}</span>
            </div>
            <div className="filter-group__body">
              <label className="sr-only" htmlFor="explorer-search">
                {t("Search investigations")}
              </label>
              <input
                id="explorer-search"
                className="input"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder={t("Material, acronym, finding…")}
              />
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group__head">
              <span>{t("Safety pillar")}</span>
            </div>
            <div className="filter-group__body">
              {PILLARS.map((pillar) => {
                const count = records.filter((record) => (record.safetyPillars ?? []).includes(pillar)).length;
                return (
                  <label className="checkbox" key={pillar}>
                    <input
                      type="checkbox"
                      checked={filters.pillars.includes(pillar)}
                      onChange={() => togglePillar(pillar)}
                    />
                    <span>
                      {t(pillar)} <span className="dim mono-sm">({count})</span>
                    </span>
                  </label>
                );
              })}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.includeUnclassified}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, includeUnclassified: event.target.checked }))
                  }
                />
                <span>
                  {t("Include unclassified")} <span className="dim mono-sm">({records.filter((r) => !(r.safetyPillars ?? []).length).length})</span>
                </span>
              </label>
              <p className="tiny dim">
                {t("Pillar labels are this dataset's classification, not a NASA field. Unclassified records have no pillar assigned.")}
              </p>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group__head">
              <span>{t("Fuel phase")}</span>
            </div>
            <div className="filter-group__body">
              {phases.map((phase) => (
                <label className="checkbox" key={phase}>
                  <input
                    type="checkbox"
                    checked={filters.phases.includes(phase)}
                    onChange={() => toggleArrayValue("phases", phase)}
                  />
                  <span>
                    {t(phase)}{" "}
                    <span className="dim mono-sm">
                      ({records.filter((record) => (record.fuelSpecs?.phase ?? "Unknown") === phase).length})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group__head">
              <span>{t("Program family")}</span>
            </div>
            <div className="filter-group__body">
              {families.map((family) => (
                <label className="checkbox" key={family}>
                  <input
                    type="checkbox"
                    checked={filters.programFamilies.includes(family)}
                    onChange={() => toggleArrayValue("programFamilies", family)}
                  />
                  <span>{t(family)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group__head">
              <span>{t("Facility / apparatus")}</span>
            </div>
            <div className="filter-group__body">
              {facilities.map((facility) => (
                <label className="checkbox" key={facility}>
                  <input
                    type="checkbox"
                    checked={filters.facilities.includes(facility)}
                    onChange={() => toggleArrayValue("facilities", facility)}
                  />
                  <span>
                    {t(FACILITY_LABELS[facility] ?? facility)}{" "}
                    <span className="dim mono-sm">
                      ({records.filter((record) => (record.hardware?.sharedHardwareIds ?? []).includes(facility)).length})
                    </span>
                  </span>
                </label>
              ))}
              {facilities.length === 0 && <p className="unknown tiny">{t("No shared hardware IDs recorded.")}</p>}
            </div>
          </div>

          <RangeFilter
            label="Oxygen"
            unit="%"
            minBound={0}
            maxBound={40}
            enabled={oxygenEnabled}
            range={oxygenRange}
            onToggle={setOxygenEnabled}
            onChange={setOxygenRange}
            unknownCount={unknownCounts.oxygen}
          />

          <RangeFilter
            label="Pressure"
            unit="psia"
            minBound={0}
            maxBound={80}
            enabled={pressureEnabled}
            range={pressureRange}
            onToggle={setPressureEnabled}
            onChange={setPressureRange}
            unknownCount={unknownCounts.pressure}
          />

          <RangeFilter
            label="Airflow"
            unit="cm/s"
            minBound={0}
            maxBound={70}
            enabled={airflowEnabled}
            range={airflowRange}
            onToggle={setAirflowEnabled}
            onChange={setAirflowRange}
            unknownCount={unknownCounts.airflow}
          />

          <div className="filter-group">
            <div className="filter-group__head">
              <span>{t("Missing data")}</span>
            </div>
            <div className="filter-group__body">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.includeUnknownConditions}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      includeUnknownConditions: event.target.checked,
                    }))
                  }
                />
                <span>{t("Keep records whose condition is Unknown when a range filter is active")}</span>
              </label>
              <p className="tiny dim">
                {t("Kept records are not matched against the range; they are marked “Unknown”. Turning this off removes them from the result.")}
              </p>
            </div>
          </div>
        </aside>

        <div>
          <div className="explorer-toolbar">
            <span className="result-count">
              {t("Showing")} <strong>{filtered.length}</strong> {t("investigations")}
              {activeFilterCount > 0 ? ` · ${activeFilterCount} ${t(activeFilterCount === 1 ? "filter active" : "filters active")}` : ""}
            </span>
            <div className="row" style={{ marginLeft: "auto", gap: 8 }}>
              <label className="tiny dim" htmlFor="sort">
                {t("Sort")}
              </label>
              <select
                id="sort"
                className="select"
                style={{ width: 168, height: 30 }}
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="relevance">{t("Editorial relevance")}</option>
                <option value="title">{t("Title A–Z")}</option>
                <option value="period">{t("Investigation period")}</option>
              </select>
              <div className="view-toggle" role="group" aria-label={t("View style")}>
                <button aria-pressed={view === "grid"} onClick={() => setView("grid")}>
                  {t("Grid")}
                </button>
                <button aria-pressed={view === "list"} onClick={() => setView("list")}>
                  {t("List")}
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <h3>{t("No investigations match these filters")}</h3>
              <p>
                {t("This often happens when a range filter excludes records whose values are Unknown. Try widening the range, enabling “Keep records whose condition is Unknown”, or resetting the filters.")}
              </p>
              <button className="btn btn--primary" onClick={reset}>
                {t("Reset all filters")}
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="card-grid">
              {filtered.map((record) => (
                <InvestigationCard
                  key={record.id}
                  record={record}
                  inCompare={compareIds.includes(record.id)}
                  onToggleCompare={onToggleCompare}
                />
              ))}
            </div>
          ) : (
            <div className="list">
              {filtered.map((record) => (
                <a className="list-row" href={`#/explorer/${record.id}`} key={record.id}>
                  <span className="list-row__id">{record.acronym}</span>
                  <span>
                    <span className="list-row__title">{t(record.fullTitle)}</span>
                    <span className="list-row__meta" style={{ display: "block" }}>
                      {t(record.programFamily ?? "Unclassified")} · {t(record.fuelSpecs?.phase ?? "Unknown phase")} ·{" "}
                      {(record.safetyPillars ?? []).map(t).join(", ") || t("Unclassified")}
                    </span>
                  </span>
                  <span className="mono-sm dim">{record.id}</span>
                </a>
              ))}
            </div>
          )}

          <div className="callout" style={{ marginTop: 18 }}>
            <strong>{t("How filters treat missing data.")}</strong> {t("A record is included in a range filter only when its reported range overlaps the selected range. Records with Unknown values are excluded by default and can be kept with the toggle. Unknown is never converted to zero, and no record is inferred to lie inside a range because its conditions are unstated.")}
          </div>
        </div>
      </div>
    </div>
  );
}
