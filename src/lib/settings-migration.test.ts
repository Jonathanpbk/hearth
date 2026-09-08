import { describe, expect, it } from "vitest";
import { mergePersistedSettings } from "./settings-migration";

describe("settings migration", () => {
  it("moves the former remote URL into the single HA URL", () => {
    const settings = mergePersistedSettings({
      haLocalUrl: "http://ha.local:8123",
      haRemoteUrl: "https://ha.example.com",
    });

    expect(settings.haUrl).toBe("https://ha.example.com");
    expect(settings).not.toHaveProperty("haLocalUrl");
    expect(settings).not.toHaveProperty("haRemoteUrl");
  });

  it("keeps an existing single URL during later loads", () => {
    const settings = mergePersistedSettings({
      haUrl: "https://new.example.com",
      haRemoteUrl: "https://old.example.com",
    });

    expect(settings.haUrl).toBe("https://new.example.com");
  });

  it("uses the former local URL when no remote URL was saved", () => {
    const settings = mergePersistedSettings({
      haLocalUrl: "http://ha.local:8123",
    });

    expect(settings.haUrl).toBe("http://ha.local:8123");
  });

  it("backfills defaults without replacing saved pages", () => {
    const settings = mergePersistedSettings({
      pages: [
        {
          id: "tablet",
          name: "Tablet",
          icon: "",
          cards: [],
          layout: [],
        },
      ],
    });

    expect(settings.weatherEntityId).toBe("weather.home");
    expect(settings.pages).toEqual([
      {
        id: "tablet",
        name: "Tablet",
        icon: "LayoutDashboard",
        cards: [],
        layout: [],
      },
    ]);
  });

  it("removes retired cards while preserving supported card positions", () => {
    const settings = mergePersistedSettings({
      pages: [
        {
          id: "tablet",
          name: "Tablet",
          icon: "Home",
          cards: [
            { id: "light", type: "light", entityId: "light.test" },
            { id: "switch", type: "switch", entityId: "switch.test" },
            { id: "scene", type: "scene", entityId: "scene.test" },
            { id: "script", type: "script", entityId: "script.test" },
            { id: "weather", type: "weather", entityId: "" },
            { id: "sensor", type: "sensor", entityId: "sensor.test" },
          ],
          layout: [
            { i: "light", x: 2, y: 1, w: 2, h: 1 },
            { i: "switch", x: 4, y: 1, w: 4, h: 2 },
            { i: "scene", x: 8, y: 1, w: 3, h: 2 },
            { i: "script", x: 11, y: 1, w: 3, h: 2 },
            { i: "weather", x: 0, y: 3, w: 8, h: 3 },
            { i: "sensor", x: 8, y: 3, w: 4, h: 2 },
          ],
        },
      ],
    });

    expect(settings.pages[0].cards.map((card) => card.id)).toEqual([
      "light",
      "sensor",
    ]);
    expect(settings.pages[0].layout).toEqual([
      { i: "light", x: 2, y: 1, w: 2, h: 1 },
      { i: "sensor", x: 8, y: 3, w: 4, h: 2 },
    ]);
  });
});
