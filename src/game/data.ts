import { COUNTRIES } from "../data/countries";
import { SHAPES } from "../data/world";
import type { Country, Shape, View } from "./types";

export const ALL_COUNTRIES: Country[] = COUNTRIES;
export const ALL_SHAPES: Shape[] = SHAPES;

/** The whole world: map space is 360 wide (lon + 180) and 180 tall (90 - lat). */
export const WORLD_VIEW: View = { x: 0, y: 0, w: 360, h: 180 };
const MIN_VIEW_W = 3;

const COUNTRY_BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]));

export function countryById(id: string): Country | undefined {
  return COUNTRY_BY_ID.get(id);
}

export function nameOf(id: string): string {
  return COUNTRY_BY_ID.get(id)?.name ?? id;
}

/** Small shapes are unclickable at world zoom, so they get a dot marker. */
export function markerCountries(): Country[] {
  return COUNTRIES.filter((c) => needsMarker(c));
}

export function needsMarker(country: Country): boolean {
  if (!country.hasShape) return true;
  const [x0, y0, x1, y1] = country.bbox;
  return Math.max(x1 - x0, y1 - y0) < 3;
}

function span(country: Country): [number, number, number, number] {
  if (country.hasShape) return country.bbox;
  const [x, y] = country.marker;
  return [x - 1.5, y - 1.5, x + 1.5, y + 1.5];
}

/**
 * A view containing every given country with breathing room around it. Used to
 * fly the map to the round's target and its neighbours.
 */
export function fitView(ids: string[], minSpan = 12, pad = 0.3): View {
  const boxes = ids
    .map((id) => COUNTRY_BY_ID.get(id))
    .filter((c): c is Country => c !== undefined)
    .map(span);
  if (boxes.length === 0) return WORLD_VIEW;

  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[2]));
  const y1 = Math.max(...boxes.map((b) => b[3]));
  const width = Math.max(x1 - x0, minSpan);
  const height = Math.max(y1 - y0, minSpan);
  const growX = width * pad;
  const growY = height * pad;
  return clampView({
    x: x0 - growX,
    y: y0 - growY,
    w: width + 2 * growX,
    h: height + 2 * growY,
  });
}

/** Expand a view so it matches the container's aspect ratio instead of letterboxing. */
export function matchAspect(view: View, aspect: number): View {
  const w = Math.max(view.w, view.h * aspect);
  const h = w / aspect;
  const cx = view.x + view.w / 2;
  const cy = view.y + view.h / 2;
  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h });
}

export function clampView(view: View): View {
  const w = Math.min(Math.max(view.w, MIN_VIEW_W), WORLD_VIEW.w);
  const h = Math.min(Math.max(view.h, MIN_VIEW_W), WORLD_VIEW.h);
  return {
    w,
    h,
    x: Math.min(Math.max(view.x, 0), WORLD_VIEW.w - w),
    y: Math.min(Math.max(view.y, 0), WORLD_VIEW.h - h),
  };
}

/** Zoom around a fixed point in map space (keeps the cursor anchored). */
export function zoomView(
  view: View,
  factor: number,
  anchor: [number, number],
): View {
  const w = Math.min(Math.max(view.w * factor, MIN_VIEW_W), WORLD_VIEW.w);
  const scale = w / view.w;
  const x = anchor[0] - (anchor[0] - view.x) * scale;
  const y = anchor[1] - (anchor[1] - view.y) * scale;
  return clampView({ x, y, w, h: view.h * scale });
}
