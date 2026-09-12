import { formatClock, formatScore } from "../game/rounds";

interface Props {
  index: number;
  total: number;
  targetName: string;
  neighbourCount: number;
  picks: { id: string; name: string }[];
  secondsLeft: number;
  score: number;
  onTogglePick: (id: string) => void;
  onCheck: () => void;
  onGiveUp: () => void;
}

export function RoundPanel({
  index,
  total,
  targetName,
  neighbourCount,
  picks,
  secondsLeft,
  score,
  onTogglePick,
  onCheck,
  onGiveUp,
}: Props) {
  return (
    <header className="panel">
      <div className="row top">
        <span className="round-counter">
          Round {index + 1}/{total}
        </span>
        <span className="score" data-testid="score">
          {formatScore(score)}
        </span>
      </div>
      <div className="row prompt">
        <div>
          <h2 data-testid="target-name">{targetName}</h2>
          <p className="ask">
            Find all {neighbourCount} land{" "}
            {neighbourCount === 1 ? "neighbour" : "neighbours"}
          </p>
        </div>
        <span
          className={`clock${secondsLeft <= 15 ? " low" : ""}`}
          data-testid="clock"
        >
          {formatClock(secondsLeft)}
        </span>
      </div>
      <div className="picks" data-testid="picks">
        {picks.length === 0 ? (
          <span className="hint">
            No picks yet. Click a country on the map.
          </span>
        ) : (
          picks.map((pick) => (
            <button
              key={pick.id}
              type="button"
              className="chip"
              onClick={() => onTogglePick(pick.id)}
              title="Remove this pick"
            >
              {pick.name} ×
            </button>
          ))
        )}
      </div>
      <div className="row actions">
        <button
          type="button"
          className="primary"
          onClick={onCheck}
          disabled={picks.length === 0}
        >
          Check picks
        </button>
        <button type="button" className="ghost" onClick={onGiveUp}>
          Give up
        </button>
      </div>
    </header>
  );
}
