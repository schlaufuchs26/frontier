import { formatClock, formatScore } from "../game/rounds";
import { NeighbourInput } from "./NeighbourInput";

interface Props {
  index: number;
  total: number;
  targetId: string;
  targetName: string;
  region: string;
  neighbourCount: number;
  picks: { id: string; name: string }[];
  secondsLeft: number;
  score: number;
  onPick: (id: string) => void;
  onRemovePick: (id: string) => void;
  onSubmit: () => void;
}

/**
 * One round, played from memory: the country name is the only prompt, the
 * player types its neighbours. The map stays out of the DOM until the reveal.
 */
export function RoundPanel({
  index,
  total,
  targetId,
  targetName,
  region,
  neighbourCount,
  picks,
  secondsLeft,
  score,
  onPick,
  onRemovePick,
  onSubmit,
}: Props) {
  return (
    <section className="play" data-testid="round-panel">
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
              Name all {neighbourCount} land{" "}
              {neighbourCount === 1 ? "neighbour" : "neighbours"} · {region}
            </p>
          </div>
          <span
            className={`clock${secondsLeft <= 15 ? " low" : ""}`}
            data-testid="clock"
          >
            {formatClock(secondsLeft)}
          </span>
        </div>
        <NeighbourInput
          exclude={[targetId, ...picks.map((pick) => pick.id)]}
          onPick={onPick}
        />
        <div className="picks" data-testid="picks">
          {picks.length === 0 ? (
            <span className="hint">
              No names yet. Type a country and pick it from the list.
            </span>
          ) : (
            picks.map((pick) => (
              <button
                key={pick.id}
                type="button"
                className="chip"
                onClick={() => onRemovePick(pick.id)}
                title="Remove this name"
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
            data-testid="submit"
            onClick={onSubmit}
          >
            Done
          </button>
        </div>
      </header>
      <div className="stage" data-testid="stage">
        <p className="stage-note">
          From memory: the map appears in the debrief for this round.
        </p>
      </div>
    </section>
  );
}
