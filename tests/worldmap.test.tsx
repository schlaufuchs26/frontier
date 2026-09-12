import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { WorldMap } from "../src/components/WorldMap";
import { markerCountries } from "../src/game/data";
import type { CellState } from "../src/game/types";

const markers = markerCountries();

function renderMap(options: {
  states?: Record<string, CellState>;
  fitBox?: { x: number; y: number; w: number; h: number } | null;
  fitKey?: number;
}) {
  render(
    <WorldMap
      states={options.states ?? {}}
      markers={markers}
      fitBox={options.fitBox ?? null}
      fitKey={options.fitKey ?? 0}
    />,
  );
}

describe("WorldMap", () => {
  test("draws the country shapes and the dot markers", () => {
    renderMap({});
    expect(screen.getByTestId("shape-DEU")).toBeInTheDocument();
    expect(screen.getByTestId("marker-VAT")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "World map");
  });

  test("colours the scored countries and leaves scenery locked", () => {
    renderMap({ states: { DEU: "target", FRA: "correct", GRL: "wrong" } });
    expect(screen.getByTestId("shape-DEU").getAttribute("class")).toContain(
      "target",
    );
    expect(screen.getByTestId("shape-FRA").getAttribute("class")).toContain(
      "correct",
    );
    // Greenland is scenery, not a game entity: it never takes a state colour.
    expect(screen.getByTestId("shape-GRL").getAttribute("class")).toContain(
      "locked",
    );
    expect(screen.getByTestId("marker-VAT").getAttribute("class")).toContain(
      "idle",
    );
  });

  test("zoom controls and the world button move the view", () => {
    renderMap({});
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("viewBox")).toBe("0 0 360 180");

    fireEvent.click(screen.getByLabelText("Zoom in"));
    const zoomed = svg.getAttribute("viewBox")?.split(" ").map(Number) ?? [];
    expect(zoomed[2]).toBeLessThan(360);

    fireEvent.click(screen.getByLabelText("Zoom out"));
    fireEvent.click(screen.getByRole("button", { name: "World" }));
    expect(svg.getAttribute("viewBox")).toBe("0 0 360 180");
  });

  test("a new round flies the map to the fit box", () => {
    const fitBox = { x: 220, y: 60, w: 40, h: 40 };
    renderMap({ fitBox, fitKey: 3 });
    const viewBox = screen.getByRole("img").getAttribute("viewBox") ?? "";
    const [x, y, w, h] = viewBox.split(" ").map(Number);
    expect(w).toBeCloseTo(80, 1);
    expect(h).toBeCloseTo(40, 1);
    expect(x).toBeCloseTo(200, 1);
    expect(y).toBeCloseTo(60, 1);
  });
});

describe("WorldMap interaction", () => {
  test("dragging pans the map", () => {
    renderMap({});
    const svg = screen.getByRole("img");
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const before = svg.getAttribute("viewBox");
    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { clientX: 40, clientY: 100 });
    expect(svg.getAttribute("viewBox")).not.toBe(before);
    fireEvent.pointerUp(svg);
    const after = svg.getAttribute("viewBox");
    fireEvent.pointerMove(svg, { clientX: 10, clientY: 10 });
    expect(svg.getAttribute("viewBox")).toBe(after);
  });

  test("the wheel zooms around the cursor", () => {
    renderMap({});
    const svg = screen.getByRole("img");
    const container = svg.parentElement;
    if (!container) throw new Error("no map container");
    act(() => {
      // happy-dom's WheelEvent drops the cursor position; MouseEvent keeps it
      // and the handler only reads deltaY, clientX and clientY.
      container.dispatchEvent(
        new MouseEvent("wheel", {
          clientX: 10,
          clientY: 10,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    const [x, y, w, h] = (svg.getAttribute("viewBox") ?? "")
      .split(" ")
      .map(Number);
    expect(w).toBeLessThan(360);
    expect(h).toBeLessThan(180);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });
});
