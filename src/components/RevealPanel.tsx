import { nameOf } from "../game/data";
import { formatScore } from "../game/rounds";
import type { RoundResult } from "../game/types";

interface Props {
  targetName: string;
  result: RoundResult;
  extras: { id: string; name: string }[];
  isLast: boolean;
  onNext: () => void;
}

export function RevealPanel({
  targetName,
  result,
  extras,
  isLast,
  onNext,
}: Props) {
  const total = result.found.length + result.missed.length;
  return (
    <section className="panel reveal" data-testid="reveal">
      <div className="row top">
        <h2>
          {targetName}: {result.found.length} of {total} found
        </h2>
        <span className="points" data-testid="round-points">
          +{formatScore(result.points)}
        </span>
      </div>
      <ul className="neighbours" data-testid="neighbour-list">
        {result.found.map((id) => (
          <li key={id} className="found">
            {nameOf(id)}
          </li>
        ))}
        {result.missed.map((id) => (
          <li key={id} className="missed">
            {nameOf(id)}
            <span className="tag">missed</span>
          </li>
        ))}
      </ul>
      {result.wrong.length > 0 ? (
        <p className="wrong-line" data-testid="wrong-line">
          Not a neighbour: {result.wrong.map((id) => nameOf(id)).join(", ")}
        </p>
      ) : null}
      {extras.length > 0 ? (
        <p className="extras">
          Borders here, but not a country in this game:{" "}
          {extras.map((e) => e.name).join(", ")}.
        </p>
      ) : null}
      <p className="legend">
        <span className="swatch correct" /> found
        <span className="swatch missed" /> missed
        <span className="swatch wrong" /> wrong pick
      </p>
      <button type="button" className="primary" onClick={onNext}>
        {isLast ? "See results" : "Next round"}
      </button>
    </section>
  );
}
