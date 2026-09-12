import type { CellState, RoundResult } from "./types";

/**
 * What colour each country gets on the reveal map: the target is marked, the
 * neighbours the player named turn green, the missed ones amber, wrong picks
 * red. Only ever built from a scored round; the pre-submit screen shows no map.
 */
export function cellStates(result: RoundResult): Record<string, CellState> {
  const states: Record<string, CellState> = { [result.target]: "target" };
  for (const id of result.found) states[id] = "correct";
  for (const id of result.missed) states[id] = "missed";
  for (const id of result.wrong) states[id] = "wrong";
  return states;
}
