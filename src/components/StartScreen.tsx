import { formatScore } from "../game/rounds";

interface Props {
  best: number;
  onStart: () => void;
}

export function StartScreen({ best, onStart }: Props) {
  return (
    <div className="screen start">
      <h1>Frontier</h1>
      <p className="tagline">
        How well do you know the world&apos;s land borders?
      </p>
      <ol className="how">
        <li>Each round names one country, and no map: from memory.</li>
        <li>
          Type every country that shares a <strong>land border</strong> with it,
          then press Done.
        </li>
        <li>
          The debrief shows the map with the borders you missed and the names
          that were wrong; islands and overseas territories never count, but the
          debrief calls them out.
        </li>
      </ol>
      {best > 0 ? (
        <p className="best" data-testid="start-best">
          Personal best: {formatScore(best)}
        </p>
      ) : null}
      <button type="button" className="primary" onClick={onStart}>
        Start a session
      </button>
      <p className="credit">
        Borders: mledoze/countries · Shapes: Natural Earth
      </p>
    </div>
  );
}
