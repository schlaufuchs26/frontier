import { describe, expect, test } from "bun:test";
import { ALL_COUNTRIES, countryById } from "../src/game/data";
import {
  BEST_SCORE_KEY,
  eligibleTargets,
  formatClock,
  formatScore,
  loadBest,
  PENALTY_PER_WRONG,
  POINTS_PER_NEIGHBOUR,
  pickRounds,
  ROUNDS_PER_SESSION,
  saveBest,
  scoreRound,
  summarize,
  TIME_BONUS_PER_SECOND,
} from "../src/game/rounds";
import type { Country, Round } from "../src/game/types";

function fakeCountry(
  id: string,
  subregion: string,
  neighbours: string[],
): Country {
  return {
    id,
    name: id,
    neighbours,
    extras: [],
    region: "Test",
    subregion,
    landlocked: false,
    area: 1,
    hasShape: true,
    bbox: [0, 0, 1, 1],
    marker: [0, 0],
  };
}

describe("pickRounds", () => {
  test("builds a full session of unique, real targets", () => {
    const rounds = pickRounds(ALL_COUNTRIES, ROUNDS_PER_SESSION);
    expect(rounds.length).toBe(ROUNDS_PER_SESSION);
    const ids = rounds.map((r) => r.target);
    expect(new Set(ids).size).toBe(ids.length);
    for (const round of rounds) {
      const country = countryById(round.target);
      expect(country?.neighbours.length ?? 0).toBeGreaterThan(0);
      expect(round.neighbours).toEqual(country?.neighbours ?? []);
    }
  });

  test("never picks an island", () => {
    const islands = ALL_COUNTRIES.filter((c) => c.neighbours.length === 0);
    const rounds = pickRounds(ALL_COUNTRIES, ROUNDS_PER_SESSION, () => 0.5);
    for (const round of rounds) {
      expect(islands.some((c) => c.id === round.target)).toBe(false);
    }
  });

  test("avoids repeating a subregion back to back", () => {
    const rounds = pickRounds(ALL_COUNTRIES, ROUNDS_PER_SESSION);
    for (let i = 1; i < rounds.length; i += 1) {
      const previous = countryById(rounds[i - 1]?.target ?? "")?.subregion;
      const current = countryById(rounds[i]?.target ?? "")?.subregion;
      expect(current).not.toBe(previous);
    }
  });

  test("degrades gracefully when the pool is tiny", () => {
    const pool = [
      fakeCountry("AAA", "Same", ["BBB"]),
      fakeCountry("BBB", "Same", ["AAA"]),
    ];
    const rounds = pickRounds(pool, 5);
    expect(rounds.map((r) => r.target).sort()).toEqual(["AAA", "BBB"]);
    expect(pickRounds([], 3)).toEqual([]);
    expect(eligibleTargets([fakeCountry("CCC", "x", [])])).toEqual([]);
  });
});

describe("scoreRound", () => {
  const round: Round = { target: "TCD", neighbours: ["CMR", "LBY", "NER"] };

  test("pays per neighbour and rewards a clean round with time", () => {
    const result = scoreRound(round, ["CMR", "LBY", "NER"], 30);
    expect(result.found).toHaveLength(3);
    expect(result.wrong).toEqual([]);
    expect(result.missed).toEqual([]);
    const expected = 3 * POINTS_PER_NEIGHBOUR + 30 * TIME_BONUS_PER_SECOND;
    expect(result.points).toBe(expected);
  });

  test("a miss costs the time bonus but not the found points", () => {
    const result = scoreRound(round, ["CMR"], 40);
    expect(result.found).toEqual(["CMR"]);
    expect(result.missed).toEqual(["LBY", "NER"]);
    expect(result.points).toBe(POINTS_PER_NEIGHBOUR);
  });

  test("wrong picks subtract and never go below zero", () => {
    const result = scoreRound(round, ["USA", "BRA", "CHN"], 60);
    expect(result.wrong).toHaveLength(3);
    expect(result.points).toBe(0);
    const mixed = scoreRound(round, ["CMR", "USA"], 10);
    expect(mixed.points).toBe(POINTS_PER_NEIGHBOUR - PENALTY_PER_WRONG);
  });

  test("an empty round scores zero", () => {
    const result = scoreRound(round, [], 0);
    expect(result.points).toBe(0);
    expect(result.missed).toHaveLength(3);
  });
});

describe("summarize", () => {
  test("adds scores and lists missed borders", () => {
    const first = scoreRound(
      { target: "TCD", neighbours: ["CMR"] },
      ["CMR"],
      5,
    );
    const second = scoreRound({ target: "PRT", neighbours: ["ESP"] }, [], 5);
    const summary = summarize([first, second]);
    expect(summary.found).toBe(1);
    expect(summary.total).toBe(2);
    expect(summary.score).toBe(first.points + second.points);
    expect(summary.missedPairs).toEqual([["PRT", "ESP"]]);
  });

  test("an empty session is all zeros", () => {
    expect(summarize([])).toEqual({
      score: 0,
      found: 0,
      total: 0,
      missedPairs: [],
    });
  });
});

describe("formatting and storage", () => {
  test("formats the clock and the score", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(-4)).toBe("0:00");
    expect(formatScore(3420)).toBe("3,420");
  });

  test("keeps a personal best in storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    expect(loadBest(storage)).toBe(0);
    expect(saveBest(400, storage)).toBe(400);
    expect(saveBest(250, storage)).toBe(400);
    expect(saveBest(900, storage)).toBe(900);
    expect(loadBest(storage)).toBe(900);
    expect(store.get(BEST_SCORE_KEY)).toBe("900");
  });

  test("ignores junk and broken storage", () => {
    const junk = {
      getItem: () => "not-a-number",
      setItem: () => {},
    };
    expect(loadBest(junk)).toBe(0);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadBest(broken)).toBe(0);
    expect(saveBest(500, broken)).toBe(500);
    expect(loadBest(null)).toBe(0);
    expect(saveBest(120, null)).toBe(120);
  });

  test("falls back to the browser storage", () => {
    globalThis.localStorage.clear();
    expect(loadBest()).toBe(0);
    expect(saveBest(700)).toBe(700);
    expect(loadBest()).toBe(700);
  });
});
