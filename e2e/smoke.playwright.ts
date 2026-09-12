import { expect, type Page, test } from "@playwright/test";

/**
 * Browser checks for what happy-dom cannot see: real layout (a map that keeps
 * its height, panels that fit the viewport) and real map interaction. The
 * happy-dom suite in `tests/` covers the scoring rules and the component
 * states.
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

/**
 * Click points that the browser says belong to a clickable country, until one
 * pick sticks. Bounding-box centres are not enough: countries with far-flung
 * islands (France, Portugal) have hollow centres in the ocean.
 */
async function pickACountry(page: Page): Promise<boolean> {
  const spots = await page.evaluate(() => {
    const map = document.querySelector(".map");
    if (!(map instanceof HTMLElement)) return [];
    const rect = map.getBoundingClientRect();
    const points: { x: number; y: number }[] = [];
    for (const path of map.querySelectorAll("path.shape.clickable")) {
      const box = (path as SVGGraphicsElement).getBoundingClientRect();
      if (box.width < 3 || box.height < 3) continue;
      for (let i = 1; i <= 5; i += 1) {
        for (let j = 1; j <= 5; j += 1) {
          const x = box.x + (box.width * i) / 6;
          const y = box.y + (box.height * j) / 6;
          if (
            x < rect.x + 8 ||
            x > rect.right - 8 ||
            y < rect.y + 8 ||
            y > rect.bottom - 8
          ) {
            continue;
          }
          const hit = document.elementFromPoint(x, y);
          const className = hit?.getAttribute("class") ?? "";
          if (className.includes("clickable")) points.push({ x, y });
        }
      }
    }
    return points.slice(0, 40);
  });

  for (const spot of spots) {
    await page.mouse.click(spot.x, spot.y);
    const picks = await page.getByTestId("picks").textContent();
    if (picks && !picks.includes("No picks yet")) return true;
  }
  return false;
}

test("a round runs on the real map", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");
  await page.getByRole("button", { name: "Start a session" }).click();

  await expect(page.getByTestId("target-name")).toBeVisible();
  await expect(page.getByText(/Find all \d+ land/)).toBeVisible();

  // The map is the point of the game: it must actually have a size.
  const map = page.getByRole("img", { name: "World map" });
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  if (!box) throw new Error("the map has no layout box");
  expect(box.width).toBeGreaterThan(600);
  expect(box.height).toBeGreaterThan(300);

  // Clicking land picks a country. The map flies to the round's region, so
  // probe real points inside the viewport instead of naming a country.
  expect(await pickACountry(page)).toBe(true);
  await expect(page.getByTestId("picks")).not.toContainText("No picks yet");

  await page.getByRole("button", { name: "Check picks" }).click();
  await expect(page.getByTestId("reveal")).toBeVisible();
  await expect(page.getByTestId("neighbour-list")).toBeVisible();

  await page.getByRole("button", { name: /Next round|See results/ }).click();
  await expect(page.getByTestId("target-name")).toBeVisible();
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

    const map = await page
      .getByRole("img", { name: "World map" })
      .boundingBox();
    if (!map) throw new Error("the map has no layout box");
    expect(map.height).toBeGreaterThan(200);
  }
});
