import { expect, test, type Page } from "@playwright/test";
import { installHearthTestHarness } from "./ha-mock";

async function openCustomOscillationSettings(page: Page) {
  const button = page.getByRole("button", { name: "Custom oscillation" });
  await expect(button).toBeVisible();
  await button.click();

  const popup = page.getByRole("group", { name: "Custom oscillation settings" });
  await expect(popup).toBeVisible();
  return popup;
}

test.beforeEach(async ({ page }) => {
  await installHearthTestHarness(page);
  await page.goto("/");
  await expect(page.locator('[title="connected"]')).toBeVisible();
});

test("Dreo custom oscillation popup keeps every stepper control inside its panel", async ({ page }) => {
  const popup = await openCustomOscillationSettings(page);
  const popupBox = await popup.boundingBox();
  expect(popupBox).not.toBeNull();
  expect(popupBox!.width).toBeGreaterThanOrEqual(220);

  const controls = [
    "Decrease Left",
    "Increase Left",
    "Decrease Right",
    "Increase Right",
    "Decrease Delay (s)",
    "Increase Delay (s)",
  ];

  for (const label of controls) {
    const control = page.getByRole("button", { name: label });
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(popupBox!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(popupBox!.x + popupBox!.width + 1);
  }
});

test("Dreo custom oscillation delay uses the numeric stepper", async ({ page }) => {
  await openCustomOscillationSettings(page);
  await page.getByRole("button", { name: "Increase Delay (s)" }).click();

  await expect.poll(async () =>
    page.evaluate(() => {
      const messages = (window as unknown as {
        __haMessages: Array<{
          type?: string;
          domain?: string;
          service?: string;
          service_data?: Record<string, unknown>;
        }>;
      }).__haMessages;
      return messages.some(
        (message) =>
          message.type === "call_service" &&
          message.domain === "input_number" &&
          message.service === "set_value" &&
          message.service_data?.entity_id === "input_number.dreo_oscillation_delay" &&
          message.service_data?.value === 6
      );
    })
  ).toBe(true);
});
