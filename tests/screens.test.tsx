import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { RevealPanel } from "../src/components/RevealPanel";
import { SummaryScreen } from "../src/components/SummaryScreen";
import { scoreRound, summarize } from "../src/game/rounds";

const round = { target: "TCD", neighbours: ["CMR", "LBY"] };

describe("RevealPanel", () => {
  test("shows found and missed neighbours plus the extras note", () => {
    const result = scoreRound(round, ["CMR"], 12);
    render(
      <RevealPanel
        targetName="Chad"
        result={result}
        extras={[{ id: "GUF", name: "French Guiana" }]}
        isLast={false}
        onNext={() => {}}
      />,
    );
    expect(screen.getByText("Chad: 1 of 2 found")).toBeInTheDocument();
    expect(screen.getByTestId("neighbour-list").textContent).toContain("Libya");
    expect(screen.getByText(/French Guiana/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next round" }),
    ).toBeInTheDocument();
  });

  test("labels the last round and lists wrong picks", () => {
    const result = scoreRound(round, ["USA"], 0);
    render(
      <RevealPanel
        targetName="Chad"
        result={result}
        extras={[]}
        isLast
        onNext={() => {}}
      />,
    );
    expect(screen.getByTestId("wrong-line").textContent).toContain(
      "United States",
    );
    expect(screen.queryByText(/not a country in this game/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "See results" }),
    ).toBeInTheDocument();
  });
});

describe("SummaryScreen", () => {
  test("celebrates a new best and lists the borders to remember", () => {
    const summary = summarize([scoreRound(round, ["CMR"], 20)]);
    render(<SummaryScreen summary={summary} best={100} onRestart={() => {}} />);
    expect(screen.getByTestId("final-score")).toBeInTheDocument();
    expect(screen.getByTestId("new-best")).toBeInTheDocument();
    expect(screen.getByText("Chad – Libya")).toBeInTheDocument();
    expect(screen.getByText(/You found 1 of 2 borders/)).toBeInTheDocument();
  });

  test("reports the old best when it stands, and a flawless run", () => {
    const summary = summarize([scoreRound(round, ["CMR", "LBY"], 0)]);
    render(
      <SummaryScreen summary={summary} best={9000} onRestart={() => {}} />,
    );
    expect(screen.getByTestId("summary-best").textContent).toContain("9,000");
    expect(screen.getByText(/found every border/)).toBeInTheDocument();
  });
});
