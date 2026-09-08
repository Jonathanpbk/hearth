import { expect, test, type Download, type Page } from "@playwright/test";
import {
  type DisplayMock,
  installHearthTestHarness,
  type MockMessage,
} from "./ha-mock";

interface TestWindow extends Window {
  __displayMock: DisplayMock;
  __haMessages: MockMessage[];
  __copiedDiagnostics: string;
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

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function openLightControls(
  page: Page,
  entityId = "light.test_light"
): Promise<void> {
  const card = page.locator(`[data-light-card="${entityId}"]`);
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(card.locator("[data-light-hold-progress]")).toHaveAttribute(
    "data-active",
    "true"
  );
  await expect(
    page.getByRole("dialog", { name: / controls$/ })
  ).toBeVisible({ timeout: 1500 });
  await page.mouse.up();
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

test("light card distinguishes tapping, dragging, and holding", async ({ page }) => {
  const card = page.locator('[data-light-card="light.test_light"]');
  const box = await card.boundingBox();
  expect(box).not.toBeNull();

  await page.evaluate(() => {
    (window as unknown as TestWindow).__haMessages = [];
  });
  await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
  await expect
    .poll(() =>
      card.evaluate((element) => {
        const fill = element.querySelector<HTMLElement>(
          "[data-light-brightness-fill]"
        );
        return fill ? fill.getBoundingClientRect().width / element.clientWidth : 0;
      })
    )
    .toBeGreaterThan(0.72);
  await page.waitForTimeout(250);

  await expect
    .poll(() =>
      page.evaluate(() => {
        return (window as unknown as TestWindow).__haMessages.find(
          (message) =>
            message.type === "call_service" &&
            message.domain === "light" &&
            message.service === "turn_on" &&
            typeof message.service_data?.brightness === "number"
        )?.service_data?.brightness;
      })
    )
    .toBe(191);
  expect(
    await page.evaluate(() =>
      (window as unknown as TestWindow).__haMessages.some(
        (message) => message.service === "toggle"
      )
    )
  ).toBe(false);
  await page.mouse.up();

  await page.evaluate(() => {
    (window as unknown as TestWindow).__haMessages = [];
  });
  await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x, box!.y + box!.height / 2);
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as TestWindow).__haMessages.some(
          (message) =>
            message.type === "call_service" &&
            message.domain === "light" &&
            message.service === "turn_off"
        )
      )
    )
    .toBe(true);

  await openLightControls(page);
  await expect(
    page.getByRole("dialog", { name: "Test Light controls" })
  ).toBeVisible();
  await expect(page.getByRole("slider", { name: "Light brightness" })).toBeVisible();
  await expect(page.getByLabel("Light colour picker")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Colour" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Temperature" })).toBeVisible();

  await page.getByRole("tab", { name: "Temperature" }).click();
  await page
    .getByRole("slider", { name: "Light colour temperature" })
    .fill("3500");
  await expect(card.locator("[data-light-brightness-fill]")).toHaveCSS(
    "background-color",
    "rgb(255, 234, 218)"
  );
});

test("light colour presets save, apply, clear, and persist", async ({ page }) => {
  await openLightControls(page);
  const emptyPreset = page.getByRole("button", { name: "Save colour preset 1" });
  await emptyPreset.click();

  const savedPreset = page.getByRole("button", {
    name: /Apply colour preset 1/,
  });
  await expect(savedPreset).toBeVisible();
  expect(
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem("hearth-settings") ?? "{}");
      return stored.state.settings.lightColorPresets["light.test_light"][0];
    })
  ).toMatch(/^#[0-9a-f]{6}$/);

  await page.evaluate(() => {
    (window as unknown as TestWindow).__haMessages = [];
  });
  await savedPreset.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as TestWindow).__haMessages.some(
          (message) =>
            message.type === "call_service" &&
            message.domain === "light" &&
            message.service === "turn_on" &&
            Array.isArray(message.service_data?.rgb_color)
        )
      )
    )
    .toBe(true);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Clear colour preset 1?");
    await dialog.accept();
  });
  const presetBox = await savedPreset.boundingBox();
  expect(presetBox).not.toBeNull();
  await page.mouse.move(
    presetBox!.x + presetBox!.width / 2,
    presetBox!.y + presetBox!.height / 2
  );
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Save colour preset 1" })
  ).toBeVisible();
});

test("temperature-only lights show matching detailed controls", async ({ page }) => {
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("hearth-settings") ?? "{}");
    stored.state.settings.pages[0].cards[0].entityId =
      "light.test_temperature_only";
    localStorage.setItem("hearth-settings", JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.locator('[title="connected"]')).toBeVisible();
  await page.waitForTimeout(INTERACTION_GUARD_SETTLE_MS);
  await openLightControls(page, "light.test_temperature_only");

  await expect(
    page.getByRole("slider", { name: "Light colour temperature" })
  ).toBeVisible();
  await expect(page.getByRole("slider", { name: "Light brightness" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Colour" })).toHaveCount(0);
  await expect(page.getByRole("slider", { name: "Colour hue" })).toHaveCount(0);
});

test("fan speed slider has a reliable pointer target", async ({ page }) => {
  const slider = page.getByRole("slider", { name: "Fan speed" });
  const box = await slider.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(36);

  await slider.click({ position: { x: box!.width - 2, y: box!.height / 2 } });
  await expect(slider).toHaveValue("9");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMessages.some(
          (message) =>
            message.type === "call_service" &&
            message.domain === "fan" &&
            message.service === "set_percentage" &&
            message.service_data?.percentage === 99
        );
      })
    )
    .toBe(true);
});

test("an established connection does not enter a replacement loop", async ({ page }) => {
  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__haMock.disconnect();
  });
  await expect(page.locator('[title="connected"]')).toHaveCount(0);

  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__haMock.reconnect();
  });

  await expect(page.locator('[title="connected"]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMessages.filter(
          (message) => message.type === "subscribe_entities"
        ).length;
      })
    )
    .toBe(2);

  await page.waitForTimeout(2500);
  await expect(page.locator('[title="connected"]')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const testWindow = window as unknown as TestWindow;
      return testWindow.__haMessages.filter(
        (message) => message.type === "subscribe_entities"
      ).length;
    })
  ).toBe(2);
});

test("clock weather content stays separated on an iPhone-sized viewport", async ({ page }) => {
  await page.evaluate(() => {
    const stored = localStorage.getItem("hearth-settings");
    if (!stored) throw new Error("Missing test settings");
    const persisted = JSON.parse(stored);
    persisted.state.settings.pages[0].cards = [
      { id: "clock-card", type: "clock-weather", entityId: "" },
    ];
    persisted.state.settings.pages[0].layout = [
      { i: "clock-card", x: 0, y: 0, w: 16, h: 3 },
    ];
    localStorage.setItem("hearth-settings", JSON.stringify(persisted));
  });

  await page.setViewportSize({ width: 440, height: 956 });
  await page.reload();
  await expect(page.locator('[title="connected"]')).toBeVisible();

  const card = page.locator('[data-dashboard-card="clock-card"]');
  const summary = card.locator("[data-clock-weather-summary]");
  const forecast = card.locator("[data-clock-weather-forecast]");
  await expect(summary).toBeVisible();
  await expect(forecast).toBeVisible();

  const [summaryBox, forecastBox] = await Promise.all([
    summary.boundingBox(),
    forecast.boundingBox(),
  ]);
  expect(summaryBox).not.toBeNull();
  expect(forecastBox).not.toBeNull();
  expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(
    forecastBox!.y + 1
  );
  expect(
    await card.evaluate((element) => element.scrollHeight <= element.clientHeight)
  ).toBe(true);
});

test("offline controls stay locked until reconnection", async ({ page }) => {
  await openLightControls(page);

  const brightness = page.getByRole("slider", { name: "Light brightness" });
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

  await page.getByRole("button", { name: "Close Test Light controls" }).click();
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

test("wake lock recovers after release and visibility changes", async ({ page }) => {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__displayMock.activeWakeLocks();
      })
    )
    .toBe(1);
  const baselineRequests = await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    return testWindow.__displayMock.requestCount();
  });
  expect(baselineRequests).toBeGreaterThanOrEqual(1);

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__displayMock.releaseWakeLock();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return {
          active: testWindow.__displayMock.activeWakeLocks(),
          requests: testWindow.__displayMock.requestCount(),
        };
      })
    )
    .toEqual({ active: 1, requests: baselineRequests + 1 });

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__displayMock.setVisibility("hidden");
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__displayMock.activeWakeLocks();
      })
    )
    .toBe(0);

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__displayMock.setVisibility("visible");
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return {
          active: testWindow.__displayMock.activeWakeLocks(),
          requests: testWindow.__displayMock.requestCount(),
        };
      })
    )
    .toEqual({ active: 1, requests: baselineRequests + 2 });

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__displayMock.setVisibility("visible");
  });
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => {
      const testWindow = window as unknown as TestWindow;
      return testWindow.__displayMock.requestCount();
    })
  ).toBe(baselineRequests + 2);
});

test("auto-dim pauses while hidden and consumes the wake tap", async ({ page }) => {
  await page.clock.install();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("switch", { name: "Auto-dim" }).click();
  await page.getByLabel("Dim after seconds").fill("10");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__displayMock.setVisibility("hidden");
  });
  await page.clock.fastForward(20_000);
  await expect(page.locator("[data-display-dimmer]")).toHaveAttribute(
    "data-active",
    "false"
  );

  await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    testWindow.__displayMock.setVisibility("visible");
  });
  await expect(page.locator("body")).toHaveAttribute(
    "data-display-guard",
    "true"
  );
  await page.clock.fastForward(10_100);
  await expect(page.locator("[data-display-dimmer]")).toHaveAttribute(
    "data-active",
    "true"
  );

  const light = page.getByText("Test Light", { exact: true });
  const box = await light.boundingBox();
  if (!box) throw new Error("Test Light has no bounding box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.locator("[data-display-dimmer]")).toHaveAttribute(
    "data-active",
    "false"
  );
  expect(
    await page.evaluate(() => {
      const testWindow = window as unknown as TestWindow;
      return testWindow.__haMessages.filter(
        (message) => message.type === "call_service"
      ).length;
    })
  ).toBe(0);

  await page.clock.fastForward(700);
  await light.click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const testWindow = window as unknown as TestWindow;
        return testWindow.__haMessages.some(
          (message) =>
            message.type === "call_service" &&
            message.domain === "light" &&
            message.target?.entity_id === "light.test_light"
        );
      })
    )
    .toBe(true);
});

test("lazy routes, dialogs, and sensor history load", async ({ page }) => {
  await expect(page.locator('[data-dashboard-grid="view"]')).toBeVisible();
  await expect(page.locator(".react-grid-item")).toHaveCount(0);

  await page.getByText("Test Temperature", { exact: true }).first().click();
  await expect(page.locator(".recharts-responsive-container")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await page.getByRole("button", { name: "Edit dashboard" }).click();
  await expect(page.locator('[data-dashboard-grid="edit"]')).toBeVisible();
  await expect(page.locator(".react-grid-item")).toHaveCount(4);
  await page.getByRole("button", { name: "Add Card" }).click();
  const addHeading = page.getByRole("heading", { name: "Add Card" });
  await expect(addHeading).toBeVisible();
  await addHeading.locator("..").getByRole("button").click();

  await page.getByRole("button", { name: "Edit card" }).first().click();
  await expect(page.getByRole("heading", { name: "Edit Card" })).toBeVisible();
});

test("dialogs trap focus, close with Escape, and restore focus", async ({ page }) => {
  await page.getByRole("button", { name: "Edit dashboard" }).click();
  const openButton = page.getByRole("button", { name: "Add Card", exact: true });
  await openButton.click();

  const dialog = page.getByRole("dialog", { name: "Add Card" });
  const closeButton = page.getByRole("button", { name: "Close Add Card" });
  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();

  for (const removedCard of ["Switch", "Script", "Scene", "Weather"]) {
    await expect(
      dialog.getByRole("button", { name: removedCard, exact: true })
    ).toHaveCount(0);
  }

  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: /^Sensor\b/ })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(openButton).toBeFocused();
});

test("reduced motion disables dashboard transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transitionDuration = await page
    .locator(".flip-card-inner")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);
});

test("dashboard edits save or cancel as one transaction", async ({ page }) => {
  await page.getByRole("button", { name: "Edit dashboard" }).click();
  await page.getByRole("button", { name: "Edit card" }).first().click();
  await page.getByLabel("Custom Title").fill("Cancelled title");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByText("Cancelled title", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hearth-settings")))
    .not.toContain("Cancelled title");

  await page.getByRole("button", { name: "Cancel dashboard changes" }).click();
  await expect(page.getByText("Test Light", { exact: true })).toBeVisible();
  await expect(page.getByText("Cancelled title", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit dashboard" }).click();
  await page.getByRole("button", { name: "Edit card" }).first().click();
  await page.getByLabel("Custom Title").fill("Saved title");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Save dashboard changes" }).click();

  await expect(page.getByText("Saved title", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("hearth-settings")))
    .toContain("Saved title");
});

test("card deletion requires confirmation and supports undo", async ({ page }) => {
  await page.getByRole("button", { name: "Edit dashboard" }).click();
  const cards = page.locator("[data-dashboard-card]");
  await expect(cards).toHaveCount(4);

  let confirmation = "";
  page.once("dialog", async (dialog) => {
    confirmation = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Delete card" }).first().click();

  expect(confirmation).toContain("Delete");
  await expect(cards).toHaveCount(3);
  await expect(page.getByText("Card removed.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(cards).toHaveCount(4);
  await page.getByRole("button", { name: "Cancel dashboard changes" }).click();
  await expect(page.locator('[data-dashboard-grid="view"]')).toBeVisible();
  await expect(cards).toHaveCount(4);
});

test("runtime recovery replaces blank lazy failures", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("hearth-runtime-recovery-at", String(Date.now()));
  });

  let settingsRequests = 0;
  let releaseRequest = () => {};
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/src/views/SettingsView.tsx*", async (route) => {
    settingsRequests += 1;
    if (settingsRequests === 1) {
      await requestGate;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);

  releaseRequest();
  await expect(
    page.getByRole("heading", { name: "Hearth needs to reload" })
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your saved settings and dashboard layout are still stored.",
      { exact: false }
    )
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("hearth-settings"))
    )
    .toContain("test-token");

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Home Assistant URL")).toHaveValue(
    "http://127.0.0.1:4173"
  );
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

test("automatic PWA recovery stops a repeated reload loop", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("hearth-recovery-page-at", String(Date.now()));
    localStorage.setItem("e2e-preserved", "yes");
  });
  await page.goto("/api/pwa-update.html?runtime-recovery=repeat");

  await expect(page).toHaveURL(/\/api\/pwa-update\.html\?runtime-recovery=repeat$/);
  await expect(page.getByText("Automatic recovery stopped", { exact: false }))
    .toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Hearth" }))
    .toBeVisible();
  await page.waitForTimeout(1_500);
  await expect(page).toHaveURL(/\/api\/pwa-update\.html\?runtime-recovery=repeat$/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("e2e-preserved")))
    .toBe("yes");
});

test("settings reports the installed PWA build", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByText("v1.1.0 (development)", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Check for updates" }).click();

  await expect(page.getByRole("status")).toHaveText("Hearth is up to date.");
  await expect(page.getByText("Unknown", { exact: true })).toHaveCount(0);
});

test("settings exposes sanitized runtime diagnostics", async ({ page }) => {
  await page.getByRole("button", { name: "Settings" }).click();

  await expect(page.getByText("Diagnostics", { exact: true })).toBeVisible();
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await expect(page.getByText("Up to date", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Copy diagnostics" }).click();
  await expect(
    page.getByRole("button", { name: "Diagnostics copied" })
  ).toBeVisible();

  const copied = await page.evaluate(() => {
    const testWindow = window as unknown as TestWindow;
    return testWindow.__copiedDiagnostics;
  });
  const report = JSON.parse(copied) as {
    hearth: { releaseVersion: string; buildCommit: string };
    configuration: Record<string, unknown>;
    homeAssistant: { connectionStatus: string };
    display: { wakeLockStatus: string };
  };

  expect(copied).not.toContain("test-token");
  expect(copied).not.toContain("127.0.0.1:4173");
  expect(copied).not.toContain("go2rtc.test");
  expect(report.hearth.releaseVersion).toBe("1.1.0");
  expect(report.hearth.buildCommit).toBe("development");
  expect(report.configuration.homeAssistantConfigured).toBe(true);
  expect(report.homeAssistant.connectionStatus).toBe("connected");
  expect(report.display.wakeLockStatus).toBe("active");
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
  await expect(
    page.getByText("Connected to Home Assistant.", { exact: true })
  ).toBeVisible();

  await page.getByLabel("Import settings file").setInputFiles({
    name: "invalid-settings.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello":"world"}'),
  });
  await expect(
    page.getByText("The selected file is not a Hearth settings backup.")
  ).toBeVisible();
});

test("settings exports token-free backups and previews safe restores", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Settings" }).click();

  const exportStarted = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const exported = await readDownload(await exportStarted);
  const backup = JSON.parse(exported) as {
    format: string;
    version: number;
    settings: Record<string, unknown>;
  };

  expect(exported).not.toContain("test-token");
  expect(exported).not.toContain("haToken");
  expect(backup).toMatchObject({
    format: "hearth-settings-backup",
    version: 1,
  });

  backup.settings.clockFormat = "12h";
  await page.getByLabel("Import settings file").setInputFiles({
    name: "hearth-settings-safe.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  const preview = page.getByRole("dialog", { name: "Review backup" });
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Version 1", { exact: true })).toBeVisible();
  await expect(
    preview.getByText("Keep token from this device", { exact: true })
  ).toBeVisible();

  const recoveryStarted = page.waitForEvent("download");
  const restoredOnCurrentDevice = page.waitForEvent("load");
  await preview.getByRole("button", { name: "Import backup" }).click();
  const recovery = await readDownload(await recoveryStarted);
  await restoredOnCurrentDevice;
  expect(recovery).not.toContain("test-token");
  expect(recovery).not.toContain("haToken");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem("hearth-settings") ?? "{}"
        ) as { state?: { settings?: { haToken?: string; clockFormat?: string } } };
        return saved.state?.settings;
      })
    )
    .toMatchObject({ haToken: "test-token", clockFormat: "12h" });

  await page.evaluate(() => localStorage.removeItem("hearth-settings"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByLabel("Import settings file").setInputFiles({
    name: "hearth-settings-new-device.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  const newDevicePreview = page.getByRole("dialog", { name: "Review backup" });
  await expect(
    newDevicePreview.getByText("Token required", { exact: true })
  ).toBeVisible();
  await newDevicePreview
    .getByLabel("Home Assistant access token")
    .fill("new-device-token");

  const restoredOnNewDevice = page.waitForEvent("load");
  await newDevicePreview.getByRole("button", { name: "Import backup" }).click();
  await restoredOnNewDevice;
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem("hearth-settings") ?? "{}"
        ) as { state?: { settings?: { haToken?: string } } };
        return saved.state?.settings?.haToken;
      })
    )
    .toBe("new-device-token");
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
