interface Props {
  score: number | null;
  variant?: "cyan" | "amber";
  label?: string;
}

export function ScoreBar({ score, variant = "cyan", label }: Props) {
  if (score === null) {
    return <span className="unknown tiny">{label ?? "Not scored"}</span>;
  }
  const clamped = Math.max(0, Math.min(5, score));
  return (
    <span className={`score ${variant === "amber" ? "score--amber" : ""}`}>
      <span className="score__track" aria-hidden="true">
        <span className="score__fill" style={{ width: `${(clamped / 5) * 100}%` }} />
      </span>
      <span className="score__value">
        {clamped.toFixed(1)}
        <span className="dim">/5</span>
      </span>
      <span className="sr-only">{label ?? "Editorial relevance score"} {clamped.toFixed(1)} out of 5</span>
    </span>
  );
}
