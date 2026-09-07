import { describe, expect, it } from "vitest";
import { defaultSettings } from "../types/settings";
import {
  normalizeHttpUrl,
  parseSettingsBackup,
  restoreSettingsBackup,
  serializeSettingsBackup,
  serializePersistedSettings,
  SETTINGS_BACKUP_FORMAT,
  SETTINGS_BACKUP_VERSION,
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

  it("exports a versioned backup without the Home Assistant token", () => {
    const backup = serializeSettingsBackup(
      validSettings,
      new Date("2026-09-07T12:00:00.000Z")
    );
    expect(backup).not.toContain("token");
    expect(backup).not.toContain("haToken");

    const parsed = parseSettingsBackup(backup);
    expect(parsed).toMatchObject({
      version: SETTINGS_BACKUP_VERSION,
      legacy: false,
      exportedAt: "2026-09-07T12:00:00.000Z",
      pageCount: 1,
      embeddedToken: null,
      settings: { haUrl: "https://ha.example.com" },
    });
    expect(JSON.parse(backup)).toMatchObject({
      format: SETTINGS_BACKUP_FORMAT,
      version: SETTINGS_BACKUP_VERSION,
    });

    expect(restoreSettingsBackup(parsed, " current-token ")).toMatchObject({
      haUrl: "https://ha.example.com",
      haToken: "current-token",
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

    const parsed = parseSettingsBackup(backup);
    expect(parsed).toMatchObject({
      legacy: true,
      version: 0,
      embeddedToken: "token",
      settings: {
        haUrl: "https://legacy.example.com",
        pages: [{ icon: "LayoutDashboard" }],
      },
    });
    expect(restoreSettingsBackup(parsed, "").haToken).toBe("token");
    expect(restoreSettingsBackup(parsed, "saved-token").haToken).toBe(
      "saved-token"
    );
  });

  it("requires a token when restoring a safe backup on a new device", () => {
    const parsed = parseSettingsBackup(serializeSettingsBackup(validSettings));

    expect(() => restoreSettingsBackup(parsed, "")).toThrow(
      "Enter a Home Assistant access token"
    );
    expect(restoreSettingsBackup(parsed, "", " restored-token ").haToken).toBe(
      "restored-token"
    );
  });

  it("keeps internal persistence separate from portable backups", () => {
    const persisted = serializePersistedSettings(validSettings);
    expect(JSON.parse(persisted)).toMatchObject({
      state: { settings: { haToken: " token " } },
      version: 0,
    });
  });

  it("rejects unrelated JSON and malformed layouts", () => {
    expect(() => parseSettingsBackup('{"hello":"world"}')).toThrow(
      "not a Hearth settings backup"
    );
    expect(() =>
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          version: 999,
          exportedAt: new Date().toISOString(),
          settings: {},
        })
      )
    ).toThrow("backup version is not supported");
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
