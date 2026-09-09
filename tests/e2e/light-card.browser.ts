import { expect, test, type Page } from "@playwright/test";
import { installHearthTestHarness } from "./ha-mock";

const INTERACTION_GUARD_SETTLE_MS = 600;

async function getLightCard(page: Page) {
  const card = page.locator('[data-light-card="light.test_light"]');
  await expect(card).toBeVisible();
  return card;
}

test.beforeEach(async ({ page }) => {
  await installHearthTestHarness(page);
  await page.goto("/");
  await expect(page.locator('[title="connected"]')).toBeVisible();
  await page.waitForTimeout(INTERACTION_GUARD_SETTLE_MS);
});

test("Light card face shows only its title", async ({ page }) => {
  const card = await getLightCard(page);

  expect(await card.evaluate((element) => (element as HTMLElement).innerText.trim())).toBe(
    "TEST LIGHT"
  );
});

test("Light controls open after a 500 ms hold", async ({ page }) => {
  const card = await getLightCard(page);
  const box = await card.boundingBox();
  expect(box).not.toBeNull();

  const progress = card.locator("[data-light-hold-progress]");
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();

  await expect(progress).toHaveAttribute("data-active", "true");
  await expect(progress).toHaveCSS("transition-duration", "0.5s");
  await expect(
    page.getByRole("dialog", { name: "Test Light controls" })
  ).toBeVisible({ timeout: 900 });

  await page.mouse.up();
});
