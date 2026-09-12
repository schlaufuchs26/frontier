import { expect, test } from "@playwright/test";

/**
 * Boot smoke test for the template in a real browser (ticket #1197).
 *
 * The template's job is to prove the stack works end to end: dev server,
 * TSX transpilation, React mount, event handling, CSS layout. The happy-dom
 * suite in `tests/` covers component logic; these checks cover the browser
 * only. When a project grows out of the template, keep this file's shape and
 * swap the assertions for that project's real layout contract; see the
 * AnomalyGuessr suite (game repo, ticket #1193) for a worked example.
 *
 * Laptop viewport: 1366x768 minus browser chrome, the common reviewer size
 * and short enough to catch a layout that only fits a tall window.
 */

const LAPTOP = { width: 1280, height: 757 };

test("the app boots in a real browser", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  // React mounted into #root and rendered the app; a broken bundle or a
  // missing TSX transform would leave the element empty.
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(
    page.getByRole("heading", { name: "Bun + TypeScript + React" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Bun + TS Template");

  // An uncaught exception on load is a failure even if the markup looks fine.
  expect(pageErrors).toEqual([]);
});

test("the counter button is interactive", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  const button = page.getByRole("button");
  await expect(button).toHaveText("clicks: 0");

  await button.click();
  await expect(button).toHaveText("clicks: 1");

  await button.click();
  await expect(button).toHaveText("clicks: 2");
});

test("the shell centers the app without overflowing the laptop viewport", async ({
  page,
}) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  // The template's layout contract: content centered on both axes and the
  // page never scrolls. A stray margin or a 100vw child breaks this.
  const doc = await page.evaluate(() => {
    const el = document.scrollingElement;
    return {
      scrollWidth: el?.scrollWidth ?? 0,
      scrollHeight: el?.scrollHeight ?? 0,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  });
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.innerWidth);
  expect(doc.scrollHeight).toBeLessThanOrEqual(doc.innerHeight + 1);

  const root = await page.locator("#root").boundingBox();
  if (!root) throw new Error("the app root has no layout box");
  const center = root.x + root.width / 2;
  expect(Math.abs(center - LAPTOP.width / 2)).toBeLessThanOrEqual(1);
});
