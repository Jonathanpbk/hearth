import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings";
import {
  normalizeHttpUrl,
  parseSettingsBackup,
  serializeSettingsBackup,
  validateSettings,
} from "./settings-validation";

const validSettings = {
  ...defaultSettings,
  haUrl: "https://ha.example.com/",
  haToken: " token ",
};

describe("settings validation", () => {
  it("normalizes supported HTTP URLs", () => {
    expect(normalizeHttpUrl(" https://ha.example.com/// ")).toBe(
      "https://ha.example.com"
    );
    expect(normalizeHttpUrl("ftp://ha.example.com")).toBeNull();
    expect(normalizeHttpUrl("https://user:pass@ha.example.com")).toBeNull();
  });

  it("normalizes valid settings", () => {
    const result = validateSettings(validSettings);
    expect(result.errors).toEqual({});
    expect(result.settings).toMatchObject({
      haUrl: "https://ha.example.com",
      haToken: "token",
    });
  });

  it("rejects invalid connection and camera values", () => {
    const result = validateSettings({
      ...validSettings,
      haUrl: "ftp://ha.example.com",
      haToken: " ",
      weatherEntityId: "Weather Home",
      cameraEnabled: true,
      go2rtcUrl: "go2rtc.local",
      cameraEventName: "Camera Event",
      cameraDefaultDuration: 500,
      dimTimeout: 5000,
    });

    expect(result.settings).toBeNull();
    expect(result.errors).toMatchObject({
      haUrl: expect.any(String),
      haToken: expect.any(String),
      weatherEntityId: expect.any(String),
      go2rtcUrl: expect.any(String),
      cameraEventName: expect.any(String),
      cameraDefaultDuration: expect.any(String),
      dimTimeout: expect.any(String),
    });
  });

  it("round-trips a valid Hearth backup", () => {
    const backup = serializeSettingsBackup(validSettings);
    expect(parseSettingsBackup(backup)).toMatchObject({
      haUrl: "https://ha.example.com",
      haToken: "token",
    });
  });

  it("migrates a legacy Hearth backup", () => {
    const legacyPage = { ...validSettings.pages[0] } as Record<string, unknown>;
    delete legacyPage.icon;
    const backup = JSON.stringify({
      state: {
        settings: {
          ...validSettings,
          haUrl: undefined,
          haRemoteUrl: "https://legacy.example.com",
          pages: [legacyPage],
        },
      },
      version: 0,
    });

    expect(parseSettingsBackup(backup)).toMatchObject({
      haUrl: "https://legacy.example.com",
      pages: [{ icon: "LayoutDashboard" }],
    });
  });

  it("rejects unrelated JSON and malformed layouts", () => {
    expect(() => parseSettingsBackup('{"hello":"world"}')).toThrow(
      "not a Hearth settings backup"
    );
    expect(() =>
      parseSettingsBackup(
        JSON.stringify({
          state: {
            settings: {
              ...validSettings,
              pages: [{ id: "broken" }],
            },
          },
        })
      )
    ).toThrow("invalid dashboard pages");
  });
});
