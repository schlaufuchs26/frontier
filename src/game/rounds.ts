import type { Country, Round, RoundResult } from "./types";

export const ROUNDS_PER_SESSION = 8;
export const ROUND_SECONDS = 90;
export const POINTS_PER_NEIGHBOUR = 100;
export const PENALTY_PER_WRONG = 50;
export const TIME_BONUS_PER_SECOND = 2;

export const BEST_SCORE_KEY = "frontier.best-score";

/**
 * Round targets: any country with a land border. Islands are clickable at any
 * time, they just never get asked about.
 */
export function eligibleTargets(countries: Country[]): Country[] {
  return countries.filter((c) => c.neighbours.length >= 1);
}

/**
 * Pick `count` distinct targets, avoiding the same subregion twice in a row so
 * a session is not eight rounds in Africa.
 */
export function pickRounds(
  countries: Country[],
  count = ROUNDS_PER_SESSION,
  rng: () => number = Math.random,
): Round[] {
  const pool = eligibleTargets(countries);
  const chosen: Country[] = [];
  const used = new Set<string>();
  let lastSubregion: string | null = null;
  const variedPool = pool.length > count * 2;
  let guard = 0;
  while (chosen.length < count && guard < count * 500 && pool.length > 0) {
    guard += 1;
    const candidate = pool[Math.floor(rng() * pool.length)];
    if (!candidate || used.has(candidate.id)) continue;
    if (variedPool && candidate.subregion === lastSubregion) continue;
    used.add(candidate.id);
    chosen.push(candidate);
    lastSubregion = candidate.subregion;
  }
  for (const candidate of pool) {
    if (chosen.length >= count) break;
    if (used.has(candidate.id)) continue;
    used.add(candidate.id);
    chosen.push(candidate);
  }
  return chosen
    .slice(0, count)
    .map((c) => ({ target: c.id, neighbours: [...c.neighbours] }));
}

export function scoreRound(
  round: Round,
  picks: string[],
  secondsLeft: number,
): RoundResult {
  const found = picks.filter((p) => round.neighbours.includes(p));
  const wrong = picks.filter((p) => !round.neighbours.includes(p));
  const missed = round.neighbours.filter((n) => !picks.includes(n));
  const clean = missed.length === 0 && wrong.length === 0;
  const bonus = clean ? Math.max(0, secondsLeft) * TIME_BONUS_PER_SECOND : 0;
  const raw =
    found.length * POINTS_PER_NEIGHBOUR -
    wrong.length * PENALTY_PER_WRONG +
    bonus;
  return {
    target: round.target,
    found,
    wrong,
    missed,
    points: Math.max(0, raw),
  };
}

export interface SessionSummary {
  score: number;
  found: number;
  total: number;
  missedPairs: [string, string][];
}

export function summarize(results: RoundResult[]): SessionSummary {
  let score = 0;
  let found = 0;
  let total = 0;
  const missedPairs: [string, string][] = [];
  for (const result of results) {
    score += result.points;
    found += result.found.length;
    total += result.found.length + result.missed.length;
    for (const missed of result.missed)
      missedPairs.push([result.target, missed]);
  }
  return { score, found, total, missedPairs };
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function pickStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadBest(storage?: StorageLike | null): number {
  const store = pickStorage(storage);
  if (!store) return 0;
  try {
    const raw = store.getItem(BEST_SCORE_KEY);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number, storage?: StorageLike | null): number {
  const store = pickStorage(storage);
  const best = Math.max(loadBest(store), score);
  if (!store) return best;
  try {
    store.setItem(BEST_SCORE_KEY, String(best));
  } catch {
    /* storage full or blocked: the score is not worth an error */
  }
  return best;
}
