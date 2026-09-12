# Frontier 🦊

A quiz about land borders, played from memory. Each round names one country and
hides the map; you type every country that shares a land border with it. Eight
rounds, 90 seconds each, then the debrief draws the map with the borders you
missed.

Play: https://schlaufuchs26.github.io/frontier/

## How it works

- **Rounds.** 8 targets, no repeats, never the same subregion twice in a row.
  Islands are never asked about (no land border to find).
- **Input.** A type-ahead over the 197 country names: type a few letters, pick
  the row, or press Enter for the highlighted one. The target and names already
  added are filtered out. No map and no country outlines exist in the DOM while
  a round runs, so the answer cannot be read off the screen.
- **Scoring.** 100 points per neighbour found, −50 per wrong pick (floored at
  zero per round), and 2 points per remaining second when the round is clean.
  The best session score lives in `localStorage`.
- **Debrief.** The map appears only here and colours the round: blue target,
  green found, amber missed, red wrong pick. Overseas and non-sovereign
  neighbours (French Guiana, Gibraltar, Hong Kong) are called out separately
  and never count.
- **Map.** SVG paths for every country, drag to pan, wheel or buttons to zoom.
  The reveal flies to the target region; micro-states get a dot marker.

## Data

`src/data/*.ts` are generated; do not edit them by hand.

| Piece | Source | Licence |
|---|---|---|
| Country shapes (50m admin-0) | [Natural Earth](https://www.naturalearthdata.com/) | public domain |
| Names and land borders | [mledoze/countries](https://github.com/mledoze/countries) | ODbL |

The pipeline keeps only symmetric land borders between game entities (193 UN
member states plus Palestine, Kosovo and Taiwan) and simplifies the coastlines
with a relative Ramer-Douglas-Peucker pass. Regenerate with
`scripts/build-data.py` (needs `ne50.geojson` and `countries.json` next to it;
see the script header for the download URLs).

## Stack

Bun + TypeScript + React 19, bundled to static files and deployed to GitHub
Pages by `.github/workflows/deploy.yml`.

```bash
bun install
bun dev                 # dev server on :3000
bun run build           # dist/ for Pages
bun test                # happy-dom unit + component tests
bun run test:e2e        # Playwright against the dev server
bun run checks          # format, tsc, biome, knip, tests
```

Coverage thresholds (80% lines/functions/statements) are enforced by
`bunfig.toml`; `scripts/` builds the badge the README links to.

## Game logic layout

```
src/App.tsx                 phase machine: start → round → debrief → summary
src/game/rounds.ts          round selection, scoring, best-score storage
src/game/data.ts            lookup, view maths (fit, zoom, clamp, aspect)
src/game/state.ts           map colouring for a scored round
src/game/search.ts          type-ahead over the country names
src/components/WorldMap.tsx SVG map: pan, zoom, markers
src/components/NeighbourInput.tsx  the round's type-ahead input
src/components/*.tsx        intro, round panel, debrief, summary
```

Built as a weekly prototype by Schlaufuchs.
