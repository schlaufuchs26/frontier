import { expect, type Page, test } from "@playwright/test";

/**
 * Browser checks for what happy-dom cannot see: real layout (a panel that fits
 * the viewport, a map that keeps its height once it appears) and real input.
 * The happy-dom suite in `tests/` covers the scoring rules and the components.
 *
 * Laptop viewport: 1366x768 minus browser chrome. It is short enough to catch
 * a layout that only fits a tall window.
 */

const LAPTOP = { width: 1280, height: 757 };
const PHONE = { width: 390, height: 844 };

test("the app boots into the intro screen", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Frontier" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start a session" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Frontier/);
  expect(pageErrors).toEqual([]);
});

/** Type the first letters of a country and take the top suggestion. */
async function typeName(page: Page, name: string) {
  const input = page.getByTestId("guess-input");
  await input.fill(name);
  await expect(page.getByTestId("suggestions")).toBeVisible();
  await input.press("Enter");
}

test("a round runs from memory, then the map reveals it", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");
  await page.getByRole("button", { name: "Start a session" }).click();

  await expect(page.getByTestId("target-name")).toBeVisible();
  await expect(page.getByText(/Name all \d+ land/)).toBeVisible();

  // Before submitting there is no map anywhere in the DOM: the map is the
  // answer sheet, so it may not be on screen while the round runs.
  await expect(page.getByRole("img", { name: "World map" })).toHaveCount(0);
  await expect(page.locator(".shape")).toHaveCount(0);
  await expect(page.getByTestId("stage")).toBeVisible();

  const target = (await page.getByTestId("target-name").textContent())?.trim();
  const candidate = ["Germany", "France", "Brazil", "Japan", "Kenya"].find(
    (name) => name !== target,
  );
  if (!candidate) throw new Error("no candidate country for the test");
  await typeName(page, candidate);
  await expect(page.getByTestId("picks")).toContainText(candidate);

  await page.getByTestId("submit").click();
  await expect(page.getByTestId("reveal")).toBeVisible();
  await expect(page.getByTestId("neighbour-list")).toBeVisible();

  const map = page.getByRole("img", { name: "World map" });
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  if (!box) throw new Error("the map has no layout box");
  expect(box.width).toBeGreaterThan(600);
  expect(box.height).toBeGreaterThan(200);

  await page.getByRole("button", { name: /Next round|See results/ }).click();
  await expect(page.getByTestId("target-name")).toBeVisible();
  await expect(page.getByRole("img", { name: "World map" })).toHaveCount(0);
});

test("the layout fits a laptop and a phone without scrolling", async ({
  page,
}) => {
  for (const viewport of [LAPTOP, PHONE]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Start a session" }).click();
    await expect(page.getByTestId("target-name")).toBeVisible();

    const metrics = await page.evaluate(() => {
      const el = document.scrollingElement;
      return {
        scrollWidth: el?.scrollWidth ?? 0,
        scrollHeight: el?.scrollHeight ?? 0,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      };
    });
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);

    const stage = await page.getByTestId("stage").boundingBox();
    if (!stage) throw new Error("the stage has no layout box");
    expect(stage.height).toBeGreaterThan(200);

    await page.getByTestId("submit").click();
    const map = await page
      .getByRole("img", { name: "World map" })
      .boundingBox();
    if (!map) throw new Error("the map has no layout box");
    expect(map.height).toBeGreaterThan(200);
  }
});
