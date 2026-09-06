import { expect, test, type Page } from "@playwright/test";
import {
  installHearthTestHarness,
  type MockMessage,
} from "./ha-mock";

interface TestWindow extends Window {
  __haMessages: MockMessage[];
  __haMock: {
    disconnect: () => void;
    reconnect: () => void;
    emitEvent: (eventType: string, data: unknown) => number;
    subscriberCount: (eventType: string) => number;
  };
}

const INTERACTION_GUARD_SETTLE_MS = 600;
const CAMERA_EVENT = "pwa_camera_trigger";

async function waitForCameraSubscription(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate((eventType) => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMock.subscriberCount(eventType);
      }, CAMERA_EVENT)
    )
    .toBe(1);
}

async function emitCameraEvent(page: Page, data: unknown): Promise<number> {
  return page.evaluate(
    ({ eventType, eventData }) => {
      const testWindow = window as unknown as TestWindow;
      return testWindow.__haMock.emitEvent(eventType, eventData);
    },
    { eventType: CAMERA_EVENT, eventData: data }
  );
}

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

  await expect(page.locator('[title="connected"]')).toHaveCount(0);
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

  await page.waitForURL(/\/\?pwa-updated=\d+$/, { timeout: 5_000 });
  await expect(page.getByText("Test Light", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("e2e-preserved")))
    .toBe("yes");
});

test("settings reports the installed PWA build", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Check for updates" }).click();

  await expect(page.getByRole("status")).toHaveText("Hearth is up to date.");
  await expect(page.getByText("Unknown", { exact: true })).toHaveCount(0);
});

test("settings reject invalid saves and imports", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();

  const haUrl = page.getByLabel("Home Assistant URL");
  await haUrl.fill("ftp://ha.example.com");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByText("Enter a valid HTTP or HTTPS URL.")
  ).toBeVisible();
  await expect(
    page.getByText("Fix the highlighted settings before saving.")
  ).toBeVisible();

  await haUrl.fill("http://127.0.0.1:4173/");
  await page.getByRole("button", { name: "Test" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Connected to Home Assistant."
  );

  await page.getByLabel("Import settings file").setInputFiles({
    name: "invalid-settings.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(
    page.getByText("The selected file is not a Hearth settings backup.")
  ).toBeVisible();
});

test("camera events validate payloads and reset the overlay timer", async ({ page }) => {
  await waitForCameraSubscription(page);

  const overlay = page.locator('[aria-label="Camera overlay"]');
  expect(await emitCameraEvent(page, { camera_stream: "   " })).toBe(1);
  await expect(overlay).toBeHidden();

  expect(
    await emitCameraEvent(page, {
      camera_stream: "Driveway",
      mode: "mse",
      duration: 1500,
    })
  ).toBe(1);

  await expect(overlay).toBeVisible();
  await expect(page.getByRole("img", { name: "Driveway" })).toBeVisible();

  await page.waitForTimeout(900);
  expect(
    await emitCameraEvent(page, {
      camera_stream: "Driveway",
      mode: "mse",
      duration: 1500,
    })
  ).toBe(1);

  await page.waitForTimeout(800);
  await expect(overlay).toBeVisible();
  await expect(overlay).toBeHidden({ timeout: 1000 });
});

test("camera playback failure is visible and dismissible", async ({ page }) => {
  await page.route(
    "https://go2rtc.test/api/stream.mjpeg?src=Offline",
    async (route) => route.abort()
  );
  await waitForCameraSubscription(page);

  expect(
    await emitCameraEvent(page, {
      camera_stream: "Offline",
      mode: "webrtc",
      duration: 5000,
    })
  ).toBe(1);

  await expect(page.getByRole("alert")).toHaveText("Camera stream unavailable");
  await page.getByRole("button", { name: "Close camera" }).click();
  await expect(page.locator('[aria-label="Camera overlay"]')).toBeHidden();
});

test("camera event subscription returns after reconnection", async ({ page }) => {
  await waitForCameraSubscription(page);

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__haMock.disconnect();
  });
  await expect
    .poll(() =>
      page.evaluate((eventType) => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMock.subscriberCount(eventType);
      }, CAMERA_EVENT)
    )
    .toBe(0);
  await expect(page.locator('[title="connected"]')).toHaveCount(0);

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__haMock.reconnect();
  });
  await expect(page.locator('[title="connected"]')).toBeVisible();
  await waitForCameraSubscription(page);

  expect(
    await emitCameraEvent(page, {
      camera_stream: "Doorbell",
      mode: "mse",
      duration: 5000,
    })
  ).toBe(1);
  await expect(page.locator('[aria-label="Camera overlay"]')).toBeVisible();
});
