import { nameOf } from "../game/data";
import { formatScore, type SessionSummary } from "../game/rounds";

interface Props {
  summary: SessionSummary;
  best: number;
  onRestart: () => void;
}

export function SummaryScreen({ summary, best, onRestart }: Props) {
  const borderWord = summary.total === 1 ? "border" : "borders";
  return (
    <section className="screen summary" data-testid="summary">
      <h1>Session complete</h1>
      <p className="big-score" data-testid="final-score">
        {formatScore(summary.score)} points
      </p>
      <p className="sub">
        You found {summary.found} of {summary.total} {borderWord}.
      </p>
      {best > 0 && summary.score >= best ? (
        <p className="best" data-testid="new-best">
          New personal best!
        </p>
      ) : (
        <p className="best" data-testid="summary-best">
          Personal best: {formatScore(Math.max(best, summary.score))}
        </p>
      )}
      {summary.missedPairs.length > 0 ? (
        <div className="missed-block">
          <h3>Borders to remember</h3>
          <ul>
            {summary.missedPairs.map(([target, neighbour]) => (
              <li key={`${target}-${neighbour}`}>
                {nameOf(target)} – {nameOf(neighbour)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="sub">Flawless: you found every border.</p>
      )}
      <button type="button" className="primary" onClick={onRestart}>
        Play again
      </button>
    </section>
  );
}
