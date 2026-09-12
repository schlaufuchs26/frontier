import { describe, expect, test } from "bun:test";
import {
  ALL_COUNTRIES,
  ALL_SHAPES,
  clampView,
  countryById,
  fitView,
  markerCountries,
  matchAspect,
  nameOf,
  needsMarker,
  WORLD_VIEW,
  zoomView,
} from "../src/game/data";

const byId = new Map(ALL_COUNTRIES.map((c) => [c.id, c]));

describe("country data", () => {
  test("every neighbour id resolves to a country", () => {
    for (const country of ALL_COUNTRIES) {
      expect(country.neighbours.length).toBeGreaterThanOrEqual(0);
      for (const neighbour of country.neighbours) {
        expect(
          byId.get(neighbour),
          `${country.id} -> ${neighbour}`,
        ).toBeDefined();
        expect(neighbour).not.toBe(country.id);
      }
    }
  });

  test("land borders are symmetric", () => {
    for (const country of ALL_COUNTRIES) {
      for (const neighbour of country.neighbours) {
        expect(
          byId.get(neighbour)?.neighbours.includes(country.id),
          `${country.id} -> ${neighbour} is one-sided`,
        ).toBe(true);
      }
    }
  });

  test("extras do not repeat counted neighbours", () => {
    for (const country of ALL_COUNTRIES) {
      for (const extra of country.extras) {
        expect(country.neighbours).not.toContain(extra.id);
      }
    }
  });

  test("known borders survive the pipeline", () => {
    expect(countryById("TCD")?.neighbours.length).toBe(6); // Chad
    expect(countryById("RUS")?.neighbours.length).toBe(14); // Russia
    expect(countryById("PRT")?.neighbours).toEqual(["ESP"]);
    expect(countryById("ITA")?.neighbours).toContain("VAT");
    expect(countryById("BRA")?.neighbours).toContain("ARG");
  });

  test("id lookup and name fallback", () => {
    expect(nameOf("DEU")).toBe("Germany");
    expect(nameOf("ZZZ")).toBe("ZZZ");
    expect(countryById("ZZZ")).toBeUndefined();
  });

  test("markers cover every country that is hard to click", () => {
    for (const country of markerCountries()) {
      expect(needsMarker(country)).toBe(true);
      expect(country.marker[0]).toBeGreaterThan(0);
      expect(country.marker[0]).toBeLessThan(360);
      expect(country.marker[1]).toBeGreaterThan(0);
      expect(country.marker[1]).toBeLessThan(180);
    }
  });
});

describe("shape data", () => {
  test("clickable shapes exist for every country with a shape", () => {
    const clickable = new Set(
      ALL_SHAPES.filter((s) => s.clickable).map((s) => s.id),
    );
    for (const country of ALL_COUNTRIES) {
      if (!country.hasShape) continue;
      expect(clickable.has(country.id), `${country.id} has no shape`).toBe(
        true,
      );
    }
  });

  test("shapes carry usable paths and a zoom box", () => {
    for (const shape of ALL_SHAPES) {
      expect(shape.d.startsWith("M")).toBe(true);
      expect(shape.d.length).toBeGreaterThan(10);
      if (shape.clickable) {
        const zoom = shape.zoom;
        expect(zoom).toBeDefined();
        expect((zoom?.[2] ?? 0) - (zoom?.[0] ?? 0)).toBeGreaterThan(0);
      }
    }
  });
});

describe("view maths", () => {
  test("clampView keeps the world on screen", () => {
    expect(clampView({ x: -40, y: -10, w: 300, h: 150 })).toEqual({
      x: 0,
      y: 0,
      w: 300,
      h: 150,
    });
    expect(clampView({ x: 300, y: 100, w: 300, h: 150 }).x).toBe(60);
    expect(clampView({ x: 10, y: 10, w: 1000, h: 1000 })).toEqual(WORLD_VIEW);
  });

  test("matchAspect keeps the centre and grows the short axis", () => {
    const view = matchAspect({ x: 100, y: 40, w: 20, h: 20 }, 2);
    expect(view.w / view.h).toBeCloseTo(2, 6);
    expect(view.x + view.w / 2).toBeCloseTo(110, 6);
    expect(view.y + view.h / 2).toBeCloseTo(50, 6);
  });

  test("zoomView anchors the point under the cursor and has a floor", () => {
    const zoomed = zoomView({ x: 0, y: 0, w: 360, h: 180 }, 0.5, [180, 90]);
    expect(zoomed.w).toBeCloseTo(180, 6);
    expect(zoomed.x).toBeCloseTo(90, 6);
    const tiny = zoomView({ x: 0, y: 0, w: 4, h: 2 }, 0.5, [0, 0]);
    expect(tiny.w).toBeGreaterThan(0);
    expect(tiny.w).toBeLessThanOrEqual(4);
  });

  test("fitView contains the countries it is given", () => {
    const view = fitView(["TCD", ...(countryById("TCD")?.neighbours ?? [])]);
    for (const id of ["TCD", "CMR", "LBY", "SDN"]) {
      const bbox = countryById(id)?.bbox ?? [0, 0, 0, 0];
      expect(view.x).toBeLessThanOrEqual(bbox[0]);
      expect(view.y).toBeLessThanOrEqual(bbox[1]);
      expect(view.x + view.w).toBeGreaterThanOrEqual(bbox[2]);
      expect(view.y + view.h).toBeGreaterThanOrEqual(bbox[3]);
    }
    expect(fitView([])).toEqual(WORLD_VIEW);
  });
});
