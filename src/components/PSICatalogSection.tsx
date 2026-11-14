import type { PSICatalogEntry } from "../types";
import { EvidenceBadge } from "./EvidenceBadge";
import { useLanguage } from "../i18n";

interface Props {
  entry: PSICatalogEntry;
  retrievedAt: string;
}

function formatDate(value: string | null, language = "en"): string {
  if (!value) return language === "ar" ? "غير مدرج" : "Not listed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "Size not listed";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} GB`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} kB`;
  return `${value} bytes`;
}

function NASAField({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="psi-catalog__field">
      <h4>{label}</h4>
      <p>{value}</p>
    </div>
  );
}

export function PSICatalogSection({ entry, retrievedAt }: Props) {
  const { t, language } = useLanguage();
  const tableFiles = [...entry.experimentalTables, ...entry.modelingTables];
  const datedSnapshot = formatDate(retrievedAt, language);

  return (
    <section className="section psi-catalog" aria-labelledby="psi-catalog-heading">
      <div className="section-head">
        <h2 className="section-title" id="psi-catalog-heading">
          <span className="index">D</span> {t("Official NASA PSI record")}
          <EvidenceBadge status="NASA-reported" compact />
        </h2>
        <span className="section-hint">{t("Repository snapshot retrieved")} {datedSnapshot}</span>
      </div>

      <div className="panel panel--flat">
        <div className="panel-body stack">
          <div className="row row--between psi-catalog__top">
            <p className="tiny dim">
              {t("NASA’s original project description, associated publications, and table-file inventory. The catalog details below are a dated snapshot; the official PSI page is the live source of record.")}
            </p>
            <a className="btn btn--sm" href={entry.recordUrl} target="_blank" rel="noopener noreferrer">
              {t("Open NASA record & full data inventory")} ↗
            </a>
          </div>

          <div className="psi-catalog__facts" aria-label={t("NASA record metadata")}>
            <div><span>{t("PSI accession")}</span><strong>{entry.recordUrl.substring(entry.recordUrl.lastIndexOf("/") + 1)}</strong></div>
            <div>
              <span>{t("Dataset DOI")}</span>
              {entry.doi ? <a href={`https://doi.org/${entry.doi}`} target="_blank" rel="noopener noreferrer">{entry.doi} ↗</a> : <strong>{t("Not listed")}</strong>}
            </div>
            <div><span>{t("Record version")}</span><strong>{entry.version ?? t("Not listed")}</strong></div>
            <div><span>{t("PSI record updated")}</span><strong>{formatDate(entry.updatedAt, language)}</strong></div>
            <div>
              <span>{t("License")}</span>
              {entry.license?.url ? <a href={entry.license.url} target="_blank" rel="noopener noreferrer">{entry.license.name} ↗</a> : <strong>{entry.license?.name ?? t("See NASA record")}</strong>}
            </div>
          </div>

          <details className="psi-catalog__details">
            <summary>{t("NASA’s project description and research context")}</summary>
            <div className="psi-catalog__fields">
              <NASAField label={t("NASA-stated objective")} value={entry.objective} />
              <NASAField label={t("NASA-stated approach")} value={entry.approach} />
              <NASAField label={t("NASA-stated hypothesis")} value={entry.hypothesis} />
              <NASAField label={t("NASA-stated research impacts")} value={entry.researchImpacts} />
              {!entry.objective && !entry.approach && !entry.hypothesis && !entry.researchImpacts && (
                <p className="tiny dim">{t("The current PSI response does not provide these narrative fields. Open the live NASA record for any newer material.")}</p>
              )}
            </div>
          </details>

          <details className="psi-catalog__details">
            <summary>{t("Publications")} ({entry.publications.length} {t("listed by NASA PSI")})</summary>
            {entry.publications.length > 0 ? (
              <ol className="psi-catalog__publications">
                {entry.publications.map((publication, index) => (
                  <li key={`${publication.doi ?? publication.title}-${index}`}>
                    <strong>{publication.title}</strong>
                    {publication.authors && <span className="psi-catalog__authors">{publication.authors}</span>}
                    <span className="psi-catalog__pub-meta">
                      {publication.status && <span>{publication.status}</span>}
                      {publication.doi && (
                        <a href={publication.url ?? `https://doi.org/${publication.doi}`} target="_blank" rel="noopener noreferrer">
                          DOI: {publication.doi} ↗
                        </a>
                      )}
                      {!publication.doi && (
                        <a href={entry.recordUrl} target="_blank" rel="noopener noreferrer">
                          View NASA PSI listing ↗
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tiny dim">{t("No publication records are listed in this NASA PSI snapshot. Check the live PSI record for updates.")}</p>
            )}
          </details>

          <details className="psi-catalog__details">
            <summary>{t("Experimental and modeling table files")} ({tableFiles.length} {t("listed")})</summary>
            {tableFiles.length > 0 ? (
              <div className="psi-catalog__files">
                {tableFiles.map((file, index) => (
                  <div className="psi-catalog__file" key={`${file.title}-${index}`}>
                    <div>
                      <strong>{file.title}</strong>
                      <span>{t(index < entry.experimentalTables.length ? "Experimental table" : "Modeling table")} · {formatBytes(file.sizeBytes)}</span>
                    </div>
                    {file.downloadUrl ? (
                      <a className="btn btn--sm btn--ghost" href={file.downloadUrl} target="_blank" rel="noopener noreferrer" aria-label={`${t("Download")} ${file.title} ${t("from NASA PSI")} `}>
                        {t("Download")} ↗
                      </a>
                    ) : (
                      <a className="btn btn--sm btn--ghost" href={entry.recordUrl} target="_blank" rel="noopener noreferrer">{t("Find on PSI")} ↗</a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="tiny dim">{t("No experimental or modeling table files are listed in this snapshot. Other raw data, videos, reports, and documents may still be available from NASA’s full record.")}</p>
            )}
            <p className="tiny dim" style={{ marginTop: 10 }}>
              {t("These files remain hosted by NASA; this site does not download, store, or independently analyze their contents. Use the official record for raw data and other file categories.")}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
