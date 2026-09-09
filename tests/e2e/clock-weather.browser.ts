import { expect, test, type Page } from "@playwright/test";
import { installHearthTestHarness } from "./ha-mock";

async function showClockWeatherCard(page: Page, height: number): Promise<void> {
  await page.evaluate((cardHeight) => {
    const stored = localStorage.getItem("hearth-settings");
    if (!stored) throw new Error("Missing test settings");

    const persisted = JSON.parse(stored);
    persisted.state.settings.pages[0].cards = [
      { id: "clock-card", type: "clock-weather", entityId: "" },
    ];
    persisted.state.settings.pages[0].layout = [
      { i: "clock-card", x: 0, y: 0, w: 16, h: cardHeight },
    ];
    localStorage.setItem("hearth-settings", JSON.stringify(persisted));
  }, height);

  await page.reload();
  await expect(page.locator('[title="connected"]')).toBeVisible();
  await expect(
    page.locator('[data-dashboard-card="clock-card"] [data-clock-weather-forecast]')
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installHearthTestHarness(page);
  await page.goto("/");
  await expect(page.locator('[title="connected"]')).toBeVisible();
});

test("Clock Weather splits its height evenly on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 });
  await showClockWeatherCard(page, 3);

  const card = page.locator('[data-dashboard-card="clock-card"]');
  const summary = card.locator("[data-clock-weather-summary]");
  const forecast = card.locator("[data-clock-weather-forecast]");

  const [cardBox, summaryBox, forecastBox] = await Promise.all([
    card.boundingBox(),
    summary.boundingBox(),
    forecast.boundingBox(),
  ]);

  expect(cardBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(forecastBox).not.toBeNull();

  expect(Math.abs(summaryBox!.height - forecastBox!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(summaryBox!.height / cardBox!.height - 0.5)).toBeLessThan(0.02);
  expect(summaryBox!.y + summaryBox!.height).toBeCloseTo(forecastBox!.y, 0);
  expect(
    await card.evaluate((element) => element.scrollHeight <= element.clientHeight)
  ).toBe(true);
});

test("Clock Weather content scales with the card dimensions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1200 });

  await showClockWeatherCard(page, 3);
  const smallCard = page.locator('[data-dashboard-card="clock-card"]');
  const smallMetrics = await smallCard.evaluate((element) => {
    const time = element.querySelector<HTMLElement>("[data-clock-time]");
    const date = element.querySelector<HTMLElement>("[data-clock-date]");
    const temperature = element.querySelector<HTMLElement>(
      "[data-current-temperature]"
    );
    const forecastIcon = element.querySelector<SVGElement>(
      "[data-forecast-day] svg"
    );

    if (!time || !date || !temperature || !forecastIcon) {
      throw new Error("Missing Clock Weather responsive elements");
    }

    return {
      height: element.getBoundingClientRect().height,
      time: Number.parseFloat(getComputedStyle(time).fontSize),
      date: Number.parseFloat(getComputedStyle(date).fontSize),
      temperature: Number.parseFloat(getComputedStyle(temperature).fontSize),
      forecastIcon: forecastIcon.getBoundingClientRect().width,
    };
  });

  await showClockWeatherCard(page, 7);
  const largeCard = page.locator('[data-dashboard-card="clock-card"]');
  const largeMetrics = await largeCard.evaluate((element) => {
    const time = element.querySelector<HTMLElement>("[data-clock-time]");
    const date = element.querySelector<HTMLElement>("[data-clock-date]");
    const temperature = element.querySelector<HTMLElement>(
      "[data-current-temperature]"
    );
    const forecastIcon = element.querySelector<SVGElement>(
      "[data-forecast-day] svg"
    );

    if (!time || !date || !temperature || !forecastIcon) {
      throw new Error("Missing Clock Weather responsive elements");
    }

    return {
      height: element.getBoundingClientRect().height,
      time: Number.parseFloat(getComputedStyle(time).fontSize),
      date: Number.parseFloat(getComputedStyle(date).fontSize),
      temperature: Number.parseFloat(getComputedStyle(temperature).fontSize),
      forecastIcon: forecastIcon.getBoundingClientRect().width,
    };
  });

  expect(largeMetrics.height).toBeGreaterThan(smallMetrics.height * 2);
  expect(largeMetrics.time).toBeGreaterThan(smallMetrics.time * 1.5);
  expect(largeMetrics.date).toBeGreaterThan(smallMetrics.date * 1.25);
  expect(largeMetrics.temperature).toBeGreaterThan(smallMetrics.temperature * 1.5);
  expect(largeMetrics.forecastIcon).toBeGreaterThan(smallMetrics.forecastIcon * 1.25);
});

test("Clock Weather uses the available space on a large card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await showClockWeatherCard(page, 7);

  const card = page.locator('[data-dashboard-card="clock-card"]');
  const metrics = await card.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>("[data-clock-weather-summary]");
    const time = element.querySelector<HTMLElement>("[data-clock-time]");
    const date = element.querySelector<HTMLElement>("[data-clock-date]");
    const temperature = element.querySelector<HTMLElement>(
      "[data-current-temperature]"
    );
    const forecastIcon = element.querySelector<SVGElement>(
      "[data-forecast-day] svg"
    );

    if (!summary || !time || !date || !temperature || !forecastIcon) {
      throw new Error("Missing Clock Weather density elements");
    }

    const cardBox = element.getBoundingClientRect();
    const summaryBox = summary.getBoundingClientRect();

    return {
      leftInset: summaryBox.left - cardBox.left,
      rightInset: cardBox.right - summaryBox.right,
      time: Number.parseFloat(getComputedStyle(time).fontSize),
      date: Number.parseFloat(getComputedStyle(date).fontSize),
      temperature: Number.parseFloat(getComputedStyle(temperature).fontSize),
      forecastIcon: forecastIcon.getBoundingClientRect().width,
    };
  });

  expect(metrics.leftInset).toBeGreaterThanOrEqual(20);
  expect(metrics.rightInset).toBeGreaterThanOrEqual(20);
  expect(metrics.time).toBeGreaterThanOrEqual(120);
  expect(metrics.date).toBeGreaterThanOrEqual(28);
  expect(metrics.temperature).toBeGreaterThanOrEqual(105);
  expect(metrics.forecastIcon).toBeGreaterThanOrEqual(48);
});
