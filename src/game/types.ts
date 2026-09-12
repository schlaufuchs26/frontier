/** A country the player can be asked about; ids are ISO 3166-1 alpha-3 codes. */
export interface Country {
  id: string;
  name: string;
  /** Land-border neighbours that are themselves game entities. */
  neighbours: string[];
  /**
   * Bordering territories that are not game entities (French Guiana,
   * Gibraltar, Hong Kong, ...). Shown in the reveal, never counted.
   */
  extras: { id: string; name: string }[];
  region: string;
  subregion: string;
  landlocked: boolean;
  area: number;
  hasShape: boolean;
  /** Map-space bounding box of the country's polygons: [x0, y0, x1, y1]. */
  bbox: [number, number, number, number];
  /** A point inside the country in map space, used when the shape is too small to hit. */
  marker: [number, number];
}

/**
 * One polygon group from Natural Earth. `d` is an SVG path in map space
 * (x = lon + 180, y = 90 - lat), so the whole world is a 360x180 box.
 */
export interface Shape {
  id: string;
  ne: string;
  name: string;
  d: string;
  /** Entities are clickable; dependencies and disputed areas are scenery. */
  clickable?: boolean;
  /** Zoom box for the country's main polygon: [x0, y0, x1, y1]. */
  zoom?: [number, number, number, number];
}

export interface Round {
  target: string;
  neighbours: string[];
}

export interface RoundResult {
  target: string;
  found: string[];
  wrong: string[];
  missed: string[];
  points: number;
}

export type CellState =
  | "idle"
  | "picked"
  | "correct"
  | "wrong"
  | "missed"
  | "target";

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}
