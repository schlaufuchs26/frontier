import { describe, expect, test } from "bun:test";
import { scoreRound } from "../src/game/rounds";
import { cellStates } from "../src/game/state";

describe("cellStates", () => {
  test("marks the target and separates found, missed and wrong picks", () => {
    const result = scoreRound(
      { target: "TCD", neighbours: ["CMR", "LBY", "NER"] },
      ["CMR", "USA"],
      10,
    );
    expect(cellStates(result)).toEqual({
      TCD: "target",
      CMR: "correct",
      USA: "wrong",
      LBY: "missed",
      NER: "missed",
    });
  });

  test("an empty round only marks the target", () => {
    const result = scoreRound({ target: "PRT", neighbours: ["ESP"] }, [], 0);
    expect(cellStates(result)).toEqual({ PRT: "target", ESP: "missed" });
  });
});
