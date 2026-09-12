import type { CellState, Round, RoundResult } from "./types";

/**
 * What colour each country gets on the map: the target is marked, picks show
 * while guessing; once the round is scored the result wins over the picks.
 */
export function cellStates(
  round: Round | null,
  picks: string[],
  result: RoundResult | null,
): Record<string, CellState> {
  const states: Record<string, CellState> = {};
  if (round) states[round.target] = "target";
  if (result) {
    for (const id of result.found) states[id] = "correct";
    for (const id of result.missed) states[id] = "missed";
    for (const id of result.wrong) states[id] = "wrong";
    return states;
  }
  for (const id of picks) {
    if (states[id] !== "target") states[id] = "picked";
  }
  return states;
}
