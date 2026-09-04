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
});
