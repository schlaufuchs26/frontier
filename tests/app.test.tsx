import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../src/App";
import { ALL_COUNTRIES, countryById } from "../src/game/data";
import { ROUNDS_PER_SESSION } from "../src/game/rounds";

function targetCountry() {
  const name = screen.getByTestId("target-name").textContent ?? "";
  const country = ALL_COUNTRIES.find((c) => c.name === name);
  if (!country) throw new Error(`unknown target ${name}`);
  return country;
}

function clickCountry(id: string) {
  const element =
    screen.queryByTestId(`shape-${id}`) ??
    screen.getByTestId(`marker-hit-${id}`);
  fireEvent.click(element);
}

function startSession() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: /start a session/i }));
}

describe("App", () => {
  test("starts on the intro screen", () => {
    render(<App />);
    expect(screen.getByText("Frontier")).toBeInTheDocument();
    expect(screen.queryByTestId("reveal")).toBeNull();
  });

  test("plays a full session and scores a clean run", () => {
    startSession();
    for (let round = 0; round < ROUNDS_PER_SESSION; round += 1) {
      const country = targetCountry();
      expect(
        screen.getByText(
          `Find all ${country.neighbours.length} land ${
            country.neighbours.length === 1 ? "neighbour" : "neighbours"
          }`,
        ),
      ).toBeInTheDocument();

      for (const neighbour of country.neighbours) clickCountry(neighbour);
      const picks = screen.getByTestId("picks");
      expect(picks.textContent).toContain(
        countryById(country.neighbours[0] ?? "")?.name ?? "",
      );

      fireEvent.click(screen.getByRole("button", { name: /check picks/i }));
      expect(screen.getByTestId("reveal")).toBeInTheDocument();
      expect(screen.getByTestId("neighbour-list").textContent).not.toContain(
        "missed",
      );

      fireEvent.click(
        screen.getByRole("button", {
          name:
            round + 1 === ROUNDS_PER_SESSION ? /see results/i : /next round/i,
        }),
      );
    }

    expect(screen.getByTestId("summary")).toBeInTheDocument();
    expect(screen.getByTestId("final-score").textContent).toMatch(/[1-9]/);
    expect(
      screen.getByText(/You found \d+ of \d+ borders/),
    ).toBeInTheDocument();
  });

  test("wrong picks are reported and can be undone", () => {
    startSession();
    const country = targetCountry();
    const outsider = ALL_COUNTRIES.find(
      (c) =>
        c.id !== country.id &&
        !country.neighbours.includes(c.id) &&
        c.subregion !== country.subregion &&
        c.hasShape,
    );
    if (!outsider) throw new Error("no outsider country found");

    clickCountry(outsider.id);
    expect(screen.getByTestId("picks").textContent).toContain(outsider.name);
    // clicking the chip removes the pick again
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`${outsider.name}`) }),
    );
    expect(screen.getByTestId("picks").textContent).not.toContain(
      outsider.name,
    );

    clickCountry(outsider.id);
    fireEvent.click(screen.getByRole("button", { name: /check picks/i }));
    expect(screen.getByTestId("wrong-line").textContent).toContain(
      outsider.name,
    );
    expect(screen.getByTestId("round-points").textContent).toBe("+0");
  });

  test("giving up reveals the answer", () => {
    startSession();
    const country = targetCountry();
    fireEvent.click(screen.getByRole("button", { name: /give up/i }));
    const list = screen.getByTestId("neighbour-list");
    for (const neighbour of country.neighbours) {
      expect(list.textContent).toContain(countryById(neighbour)?.name ?? "");
    }
    expect(screen.getByTestId("round-points").textContent).toBe("+0");
  });

  test("the check button waits for a pick", () => {
    startSession();
    const check = screen.getByRole("button", { name: /check picks/i });
    expect(check).toBeDisabled();
    const country = targetCountry();
    clickCountry(country.neighbours[0] ?? "");
    expect(screen.getByRole("button", { name: /check picks/i })).toBeEnabled();
  });
});
