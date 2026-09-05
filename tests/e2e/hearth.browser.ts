import { expect, test } from "@playwright/test";
import {
  installHearthTestHarness,
  type MockMessage,
} from "./ha-mock";

interface TestWindow extends Window {
  __haMessages: MockMessage[];
  __haMock: {
    disconnect: () => void;
    reconnect: () => void;
  };
}

const INTERACTION_GUARD_SETTLE_MS = 600;

test.beforeEach(async ({ page }) => {
  await installHearthTestHarness(page);
  await page.goto("/");
  await expect(page.locator('[title="connected"]')).toBeVisible();
  await expect(page.getByText("Test Light", { exact: true })).toBeVisible();
  await page.waitForTimeout(INTERACTION_GUARD_SETTLE_MS);
});

test("controls call Home Assistant services", async ({ page }) => {
  await page.getByText("Test Light", { exact: true }).click();
  await page.getByRole("button", { name: "Day" }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMessages.filter(
          (message) => message.type === "call_service"
        );
      })
    )
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "light",
          service: "toggle",
          target: { entity_id: "light.test_light" },
        }),
        expect.objectContaining({
          domain: "script",
          service: "turn_on",
          target: { entity_id: "script.day_lights" },
        }),
      ])
    );
});

test("offline controls stay locked until reconnection", async ({ page }) => {
  await page.getByRole("button", { name: "Show sliders" }).click();

  const brightness = page.getByRole("slider", { name: "Brightness" });
  const fanSpeed = page.locator('input[type="range"][min="1"][max="9"]');
  await expect(brightness).toBeVisible();
  const brightnessBefore = await brightness.inputValue();
  const fanSpeedBefore = await fanSpeed.inputValue();

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__haMock.disconnect();
  });

  await expect(page.locator('[title="disconnected"]')).toBeVisible();
  await expect(brightness).toBeDisabled();
  await expect(fanSpeed).toBeDisabled();
  await expect(page.getByRole("button", { name: "Day, Disconnected" })).toBeDisabled();
  await expect(brightness).toHaveValue(brightnessBefore);
  await expect(fanSpeed).toHaveValue(fanSpeedBefore);

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__haMock.reconnect();
  });

  await expect(page.locator('[title="connected"]')).toBeVisible();
  await expect(brightness).toBeEnabled();
  await expect(fanSpeed).toBeEnabled();
  await expect(page.getByRole("button", { name: "Day" })).toBeEnabled();

  await page.waitForTimeout(INTERACTION_GUARD_SETTLE_MS);
  await page.getByRole("button", { name: "Day" }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMessages.some(
          (message) =>
            message.type === "call_service" &&
            message.domain === "script" &&
            message.service === "turn_on" &&
            message.target?.entity_id === "script.day_lights"
        );
      })
    )
    .toBe(true);
});

test("lazy routes, dialogs, and sensor history load", async ({ page }) => {
  await page.getByText("Test Temperature", { exact: true }).first().click();
  await expect(page.locator(".recharts-responsive-container")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await page.getByRole("button", { name: "Edit dashboard" }).click();
  await page.getByRole("button", { name: "Add Card" }).click();
  const addHeading = page.getByRole("heading", { name: "Add Card" });
  await expect(addHeading).toBeVisible();
  await addHeading.locator("..").getByRole("button").click();

  await page.getByRole("button", { name: "Edit card" }).first().click();
  await expect(page.getByRole("heading", { name: "Edit Card" })).toBeVisible();
});

test("PWA recovery returns to Hearth without clearing storage", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("e2e-preserved", "yes"));
  await page.goto("/api/pwa-update.html");

  await expect(page.getByRole("heading", { name: "Updating Hearth" })).toBeVisible();
  await page.waitForURL(/\/\?pwa-updated=\d+$/, { timeout: 5_000 });
  await expect(page.getByText("Test Light", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("e2e-preserved")))
    .toBe("yes");
});
