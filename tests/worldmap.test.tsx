import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { WorldMap } from "../src/components/WorldMap";
import { markerCountries } from "../src/game/data";
import type { CellState } from "../src/game/types";

const markers = markerCountries();

function renderMap(options: {
  states?: Record<string, CellState>;
  interactive?: boolean;
  fitBox?: { x: number; y: number; w: number; h: number } | null;
  fitKey?: number;
  onToggle?: (id: string) => void;
}) {
  const calls: string[] = [];
  const onToggle = options.onToggle ?? ((id: string) => calls.push(id));
  render(
    <WorldMap
      states={options.states ?? {}}
      markers={markers}
      interactive={options.interactive ?? true}
      onToggle={onToggle}
      fitBox={options.fitBox ?? null}
      fitKey={options.fitKey ?? 0}
    />,
  );
  return calls;
}

describe("WorldMap", () => {
  test("draws clickable shapes and dot markers", () => {
    renderMap({});
    expect(screen.getByTestId("shape-DEU")).toBeInTheDocument();
    expect(screen.getByTestId("shape-DEU").getAttribute("class")).toContain(
      "clickable",
    );
    expect(screen.getByTestId("marker-VAT")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "World map");
  });

  test("clicking a country reports it, scenery stays inert", () => {
    const calls = renderMap({});
    fireEvent.click(screen.getByTestId("shape-DEU"));
    expect(calls).toEqual(["DEU"]);
    fireEvent.click(screen.getByTestId("shape-GRL"));
    expect(calls).toEqual(["DEU"]);
  });

  test("the target country cannot be picked", () => {
    const calls = renderMap({ states: { DEU: "target" } });
    fireEvent.click(screen.getByTestId("shape-DEU"));
    expect(calls).toEqual([]);
    expect(screen.getByTestId("shape-DEU").getAttribute("class")).toContain(
      "target",
    );
  });

  test("marker dots are clickable while playing", () => {
    const calls = renderMap({});
    fireEvent.click(screen.getByTestId("marker-hit-VAT"));
    expect(calls).toEqual(["VAT"]);
  });

  test("nothing is clickable after the round ends", () => {
    const calls = renderMap({ interactive: false });
    fireEvent.click(screen.getByTestId("shape-DEU"));
    expect(calls).toEqual([]);
    expect(screen.queryByTestId("marker-hit-VAT")).toBeNull();
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
  test("dragging pans the map and suppresses the click", () => {
    const calls = renderMap({});
    const svg = screen.getByRole("img");
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const before = svg.getAttribute("viewBox");
    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { clientX: 40, clientY: 100 });
    expect(svg.getAttribute("viewBox")).not.toBe(before);
    fireEvent.click(screen.getByTestId("shape-DEU"));
    expect(calls).toEqual([]);
    fireEvent.pointerUp(svg);
    fireEvent.click(screen.getByTestId("shape-DEU"));
    expect(calls).toEqual(["DEU"]);
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
