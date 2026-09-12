import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_SHAPES,
  clampView,
  matchAspect,
  WORLD_VIEW,
  zoomView,
} from "../game/data";
import type { CellState, Country, View } from "../game/types";

interface Props {
  /** Colour per country id, built from a scored round (see game/state.ts). */
  states: Record<string, CellState>;
  markers: Country[];
  /** When `fitKey` changes, the map flies to `fitBox`. */
  fitBox: View | null;
  fitKey: number;
}

const FALLBACK_ASPECT = 2;

/**
 * The reveal surface: SVG shapes for every country, drag to pan and wheel or
 * buttons to zoom. It takes no answers; the round is already scored by the
 * time this renders (ticket #1327 moved the map out of the round).
 */
export function WorldMap({ states, markers, fitBox, fitKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(WORLD_VIEW);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const manual = useRef(false);

  const aspect = width > 0 && height > 0 ? width / height : FALLBACK_ASPECT;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      setWidth(node.clientWidth);
      setHeight(node.clientHeight);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Fly to the round's region whenever the caller asks for it, and once more
  // when the container's real aspect ratio arrives (first layout pass).
  // biome-ignore lint/correctness/useExhaustiveDependencies: fitKey is the trigger
  useEffect(() => {
    manual.current = false;
    setView(fitBox ? matchAspect(fitBox, aspect) : WORLD_VIEW);
  }, [fitKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only the measurement matters
  useEffect(() => {
    if (manual.current) return;
    setView(fitBox ? matchAspect(fitBox, aspect) : WORLD_VIEW);
  }, [aspect]);

  const pixelsPerUnit = width > 0 && view.w > 0 ? width / view.w : 0;
  const markerRadius = pixelsPerUnit > 0 ? 5 / pixelsPerUnit : 0.6;

  // Layout size with fallbacks: happy-dom has no layout engine, so tests need
  // a sensible pixel size for drag and wheel maths.
  const sizeOf = useCallback((): [number, number] => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect && rect.width > 0 ? rect.width : width > 0 ? width : 1000;
    const h = rect && rect.height > 0 ? rect.height : height > 0 ? height : 500;
    return [w, h];
  }, [width, height]);

  const zoomAt = useCallback((factor: number, anchor?: [number, number]) => {
    manual.current = true;
    setView((current) => {
      const point: [number, number] = anchor ?? [
        current.x + current.w / 2,
        current.y + current.h / 2,
      ];
      return zoomView(current, factor, point);
    });
  }, []);

  // Wheel zoom needs a non-passive listener, which React's onWheel is not.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const [w, h] = sizeOf();
      const anchor: [number, number] = [
        view.x + (event.clientX / w) * view.w,
        view.y + (event.clientY / h) * view.h,
      ];
      zoomAt(event.deltaY > 0 ? 1.18 : 1 / 1.18, anchor);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [view, zoomAt, sizeOf]);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    manual.current = true;
    start.x = event.clientX;
    start.y = event.clientY;
    const unitPerPixel = view.w / sizeOf()[0];
    setView((current) =>
      clampView({
        ...current,
        x: current.x - dx * unitPerPixel,
        y: current.y - dy * unitPerPixel,
      }),
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="map" ref={containerRef}>
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        role="img"
        aria-label="World map"
      >
        <rect x={-360} y={-180} width={1080} height={540} className="ocean" />
        <g>
          {ALL_SHAPES.map((shape) => (
            <path
              key={shape.id}
              d={shape.d}
              data-testid={`shape-${shape.id}`}
              className={`shape ${
                shape.clickable ? (states[shape.id] ?? "idle") : "locked"
              }`}
            />
          ))}
        </g>
        {markers.map((country) => (
          <circle
            key={`marker-${country.id}`}
            cx={country.marker[0]}
            cy={country.marker[1]}
            r={markerRadius}
            data-testid={`marker-${country.id}`}
            className={`marker ${states[country.id] ?? "idle"}`}
          />
        ))}
      </svg>
      <div className="map-controls">
        <button
          type="button"
          onClick={() => zoomAt(1 / 1.4)}
          aria-label="Zoom in"
        >
          +
        </button>
        <button type="button" onClick={() => zoomAt(1.4)} aria-label="Zoom out">
          −
        </button>
        <button
          type="button"
          className="world"
          onClick={() => {
            manual.current = true;
            setView(matchAspect(WORLD_VIEW, aspect));
          }}
        >
          World
        </button>
      </div>
    </div>
  );
}
