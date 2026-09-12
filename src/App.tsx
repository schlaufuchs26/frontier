import { useCallback, useEffect, useMemo, useState } from "react";
import { RevealPanel } from "./components/RevealPanel";
import { RoundPanel } from "./components/RoundPanel";
import { StartScreen } from "./components/StartScreen";
import { SummaryScreen } from "./components/SummaryScreen";
import { WorldMap } from "./components/WorldMap";
import {
  ALL_COUNTRIES,
  countryById,
  fitView,
  markerCountries,
  nameOf,
} from "./game/data";
import {
  loadBest,
  pickRounds,
  ROUND_SECONDS,
  ROUNDS_PER_SESSION,
  saveBest,
  scoreRound,
  summarize,
} from "./game/rounds";
import { cellStates } from "./game/state";
import type { Round, RoundResult } from "./game/types";

type Phase = "start" | "play" | "reveal" | "summary";

const MARKERS = markerCountries();

function ignored() {
  /* the reveal map takes no clicks */
}

export function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [best, setBest] = useState(() => loadBest());

  const round = rounds[index] ?? null;
  const result =
    phase === "reveal" ? (results[results.length - 1] ?? null) : null;
  const summary = useMemo(() => summarize(results), [results]);
  const score = summary.score;

  const start = useCallback(() => {
    setRounds(pickRounds(ALL_COUNTRIES, ROUNDS_PER_SESSION));
    setIndex(0);
    setPicks([]);
    setResults([]);
    setSecondsLeft(ROUND_SECONDS);
    setPhase("play");
  }, []);

  const finish = useCallback(
    (seconds: number) => {
      if (phase !== "play" || !round) return;
      const scored = scoreRound(round, picks, seconds);
      setResults((current) => [...current, scored]);
      setPhase("reveal");
    },
    [phase, round, picks],
  );

  useEffect(() => {
    if (phase !== "play") return;
    if (secondsLeft <= 0) {
      finish(0);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, secondsLeft, finish]);

  const next = useCallback(() => {
    if (index + 1 < rounds.length) {
      setIndex(index + 1);
      setPicks([]);
      setSecondsLeft(ROUND_SECONDS);
      setPhase("play");
      return;
    }
    setBest(saveBest(summarize(results).score));
    setPhase("summary");
  }, [index, rounds.length, results]);

  const addPick = useCallback(
    (id: string) => {
      if (phase !== "play" || !round || id === round.target) return;
      setPicks((current) =>
        current.includes(id) ? current : [...current, id],
      );
    },
    [phase, round],
  );

  const removePick = useCallback((id: string) => {
    setPicks((current) => current.filter((pick) => pick !== id));
  }, []);

  const fitBox = useMemo(
    () => (round ? fitView([round.target, ...round.neighbours]) : null),
    [round],
  );
  const target = round ? countryById(round.target) : undefined;

  return (
    <div className="app">
      {phase === "start" ? <StartScreen best={best} onStart={start} /> : null}

      {phase === "play" && round && target ? (
        <RoundPanel
          index={index}
          total={rounds.length}
          targetId={round.target}
          targetName={target.name}
          region={target.region}
          neighbourCount={round.neighbours.length}
          picks={picks.map((id) => ({ id, name: nameOf(id) }))}
          secondsLeft={secondsLeft}
          score={score}
          onPick={addPick}
          onRemovePick={removePick}
          onSubmit={() => finish(secondsLeft)}
        />
      ) : null}

      {phase === "reveal" && round && result && target ? (
        <RevealPanel
          targetName={target.name}
          result={result}
          extras={target.extras}
          isLast={index + 1 >= rounds.length}
          onNext={next}
        />
      ) : null}

      {phase === "reveal" && result ? (
        <WorldMap
          states={cellStates(result)}
          markers={MARKERS}
          interactive={false}
          onToggle={ignored}
          fitBox={fitBox}
          fitKey={index}
        />
      ) : null}

      {phase === "summary" ? (
        <SummaryScreen summary={summary} best={best} onRestart={start} />
      ) : null}
    </div>
  );
}
