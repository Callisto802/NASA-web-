import type { SourceReference } from "../types";

interface Props {
  sources: SourceReference[];
  showUrl?: boolean;
}

export function SourceList({ sources, showUrl = true }: Props) {
  if (sources.length === 0) {
    return <p className="unknown">No source references were supplied for this field.</p>;
  }
  return (
    <div className="sources">
      {sources.map((source, index) => (
        <div className="source" key={`${source.url}-${index}`}>
          <span className="source__icon" aria-hidden="true">
            ↗
          </span>
          <div>
            <a
              className="source__title"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.title}
            </a>
            <div className="source__meta">
              {[source.organization, source.identifier, source.publishedAt]
                .filter(Boolean)
                .join(" · ") || "Organization and date not shown"}
              {source.locator ? ` · ${source.locator}` : ""}
            </div>
            {source.note && <p className="source__note">{source.note}</p>}
            {showUrl && (
              <span className="source__url" aria-hidden="true">
                {source.url}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
