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

/** Type a full country name and take its row from the suggestion list. */
function typeCountry(id: string) {
  const country = countryById(id);
  if (!country) throw new Error(`unknown country ${id}`);
  const input = screen.getByTestId("guess-input");
  fireEvent.change(input, { target: { value: country.name } });
  fireEvent.click(screen.getByTestId(`suggestion-${id}`));
}

/** Shapes are not drawn for micro-states (Liechtenstein, Monaco, ...): they
 * get a dot marker instead, and that marker carries the state class too. */
function mapClass(id: string): string {
  const element =
    screen.queryByTestId(`shape-${id}`) ?? screen.getByTestId(`marker-${id}`);
  return element.getAttribute("class") ?? "";
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

  test("shows no map and no country shapes before submitting", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start a session/i }));
    expect(screen.getByTestId("round-panel")).toBeInTheDocument();
    // The answer must not be readable off the screen: no SVG, no shapes.
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("img", { name: "World map" })).toBeNull();
    expect(container.querySelector(".shape")).toBeNull();
    expect(screen.queryByTestId("shape-DEU")).toBeNull();
    expect(screen.queryByTestId("marker-VAT")).toBeNull();
  });

  test("plays a full session and scores a clean run", () => {
    startSession();
    for (let round = 0; round < ROUNDS_PER_SESSION; round += 1) {
      const country = targetCountry();
      expect(
        screen.getByText(
          new RegExp(`Name all ${country.neighbours.length} land`),
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "World map" })).toBeNull();

      for (const neighbour of country.neighbours) typeCountry(neighbour);
      const picks = screen.getByTestId("picks");
      expect(picks.textContent).toContain(
        countryById(country.neighbours[0] ?? "")?.name ?? "",
      );

      fireEvent.click(screen.getByTestId("submit"));
      expect(screen.getByTestId("reveal")).toBeInTheDocument();
      expect(screen.getByTestId("neighbour-list").textContent).not.toContain(
        "missed",
      );
      // The reveal is where the map appears, coloured by the result.
      expect(
        screen.getByRole("img", { name: "World map" }),
      ).toBeInTheDocument();
      expect(mapClass(country.id)).toContain("target");
      for (const neighbour of country.neighbours) {
        expect(mapClass(neighbour)).toContain("correct");
      }

      fireEvent.click(
        screen.getByRole("button", {
          name:
            round + 1 === ROUNDS_PER_SESSION ? /see results/i : /next round/i,
        }),
      );
      expect(screen.queryByRole("img", { name: "World map" })).toBeNull();
    }

    expect(screen.getByTestId("summary")).toBeInTheDocument();
    expect(screen.getByTestId("final-score").textContent).toMatch(/[1-9]/);
    expect(
      screen.getByText(/You found \d+ of \d+ borders/),
    ).toBeInTheDocument();
  });

  test("wrong picks are reported, coloured on the map and can be undone", () => {
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

    typeCountry(outsider.id);
    expect(screen.getByTestId("picks").textContent).toContain(outsider.name);
    // clicking the chip removes the name again
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`${outsider.name}`) }),
    );
    expect(screen.getByTestId("picks").textContent).not.toContain(
      outsider.name,
    );

    typeCountry(outsider.id);
    fireEvent.click(screen.getByTestId("submit"));
    expect(screen.getByTestId("wrong-line").textContent).toContain(
      outsider.name,
    );
    expect(screen.getByTestId("round-points").textContent).toBe("+0");
    expect(mapClass(outsider.id)).toContain("wrong");
  });

  test("submitting with no names reveals every neighbour", () => {
    startSession();
    const country = targetCountry();
    fireEvent.click(screen.getByTestId("submit"));
    const list = screen.getByTestId("neighbour-list");
    for (const neighbour of country.neighbours) {
      expect(list.textContent).toContain(countryById(neighbour)?.name ?? "");
    }
    for (const neighbour of country.neighbours) {
      expect(mapClass(neighbour)).toContain("missed");
    }
    expect(screen.getByTestId("round-points").textContent).toBe("+0");
  });

  test("the round can be submitted without a pick", () => {
    startSession();
    expect(screen.getByTestId("submit")).toBeEnabled();
    expect(screen.getByTestId("picks").textContent).toContain("No names yet");
  });
});
