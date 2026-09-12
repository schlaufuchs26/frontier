# 🦊 frontend-template

[![coverage](https://raw.githubusercontent.com/schlaufuchs26/frontend-template/badge/coverage.svg)](https://github.com/schlaufuchs26/frontend-template/actions/workflows/test.yml?query=branch%3Amain)

Minimal [Bun](https://bun.sh) + TypeScript + React starter for static web projects. Ships to GitHub Pages, devs locally with HMR.

## Quick Start

```bash
curl -fsSL https://bun.sh/install | bash  # if you haven't already

git clone https://github.com/schlaufuchs26/frontend-template.git
cd frontend-template
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

```
index.html          — entry point for dev server and production build
frontend.tsx         — React app (TSX)
package.json        — React 19 + dev tooling
tsconfig.json       — strict TS, ESNext
bunfig.toml         — test preload + coverage thresholds
biome.json          — formatter + linter config
knip.json           — dead code detection
playwright.config.ts — browser-test config (dev-server, Chromium path)
.githooks/          — pre-commit hook (runs bun run checks)
.github/workflows/  — CI: test, e2e, lint, typecheck, deploy, dead code
scripts/            — coverage report + badge generators
tests/              — Happy DOM + Testing Library setup, component tests
e2e/                — Playwright browser tests (real Chromium)
```

## Scripts

| Command | What it does |
|---|---|
| `bun dev` | Dev server with HMR on :3000 |
| `bun run build` | Bundle index.html → dist/ (minified, production React) |
| `bun test` | Run tests |
| `bun run test:e2e` | Browser tests in real Chromium (needs a browser) |
| `bun run test:coverage` | Text coverage report |
| `bun run test:ci` | Generate coverage/lcov.info for CI |
| `bun run checks` | Format + typecheck + lint + dead code + tests |

### Production build

`bun run build` clears `dist/`, then bundles with `--minify` and pins
`process.env.NODE_ENV="production"`. Both flags are required: without them
React ships its development build, which for this template is 975 kB with
prop-type checks and dev warnings instead of 186 kB (measured 2026-09-11,
Bun 1.3.13). Verify a build with `grep -c "process.env" dist/*.js` (prints
0 when the define applied); `tests/build.test.ts` runs the build and fails
on dev-only code.

## Deploy

Push to `main` and GitHub Actions deploys to Pages automatically:

- **Build:** `bun install && bun run build`
- **Deploy:** `dist/` → `https://schlaufuchs26.github.io/frontend-template/`

Manual trigger: Actions → Deploy to GitHub Pages → Run workflow.

## Testing

Bun's built-in test runner + Happy DOM + Testing Library. Pre-configured in `bunfig.toml`. Tests auto-discover: `*.test.{ts,tsx}`, `*.spec.{ts,tsx}`.

```bash
bun test                   # run all tests
bun run test:coverage      # text coverage report
bun run test:ci            # generate coverage/lcov.info
bun test --watch           # watch mode
```

### Coverage

Thresholds enforced at 80% lines/functions/statements. On every push to `main`, the workflow generates a badge and force-pushes it to the `badge` branch — a single orphan commit, no history clutter. PRs get a sticky comment with per-file coverage.

### Browser tests (Playwright)

`bun run test:e2e` drives real Chromium against the dev server:
`playwright.config.ts` starts `bun index.html` on port 4173, and
`e2e/smoke.playwright.ts` checks the app boots, the counter reacts to a real
click, and the shell centers without overflowing a 1280x757 laptop viewport.
happy-dom has no layout engine, so geometry regressions pass every unit test;
this suite is where they get caught. When a project outgrows the template,
keep the file's shape and replace the assertions with that project's layout
contract.

CI installs Playwright's Chromium (`bunx playwright install --with-deps
chromium`). On a box that ships Chromium via nix, like the fuchs host, set
`PLAYWRIGHT_CHROMIUM_PATH` or rely on the default
`/home/exedev/.nix-profile/bin/chromium` when it exists. A failing run uploads
its HTML report as a workflow artifact.

## Philosophy

- **Zero-config dev server.** `bun index.html` gives you HMR, TSX transpilation, SPA routing, and bundling with no setup.
- **No framework lock-in.** Just React. Swap to Vue, Svelte, or vanilla — change `frontend.tsx` and go.
- **HTML-first.** Same `index.html` is the dev entry point and the build entry point. No dual files, no glue code.
- **Grows with you.** Start here, add Tailwind, shadcn, whatever. No scaffolding to undo.
