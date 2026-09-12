import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * Real-browser tests for what happy-dom cannot see: it has no layout engine,
 * so geometry regressions (a panel growing past the viewport, a column that
 * stops scrolling, an element pushed off-screen) pass every unit test. This
 * suite boots the actual dev server (`bun index.html`), so the shipped CSS
 * and the React tree run together in Chromium.
 *
 * CI installs Playwright's own Chromium (`playwright install chromium`); the
 * fuchs box ships Chromium via nix and the Playwright CDN build lacks system
 * libs there, so point the launcher at the nix binary when it exists.
 * PLAYWRIGHT_CHROMIUM_PATH overrides both.
 */
const localChromium =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  "/home/exedev/.nix-profile/bin/chromium";

// Away from the dev default (3000) so a locally running dev server does not
// collide with the test server.
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.playwright.ts",
  timeout: 30_000,
  // CI annotates the run with failures and keeps a browsable report; locally
  // a plain list is enough.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  webServer: {
    command: "bun index.html",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      ...(existsSync(localChromium) ? { executablePath: localChromium } : {}),
      args: ["--no-sandbox"],
    },
  },
});
