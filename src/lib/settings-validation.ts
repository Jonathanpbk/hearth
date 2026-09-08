import {
  CAMERA_MAX_DURATION_MS,
  CAMERA_MIN_DURATION_MS,
} from "../config/defaults";
import {
  CARD_DEFAULTS,
  type Page,
  type StoredLayoutItem,
} from "../types/dashboard";
import { type Settings } from "../types/settings";
import {
  migrateLightColorPresets,
  migratePersistedPages,
  mergePersistedSettings,
  type PersistedPage,
  type PersistedSettings,
} from "./settings-migration";

export type SettingsField =
  | "haUrl"
  | "haToken"
  | "weatherEntityId"
  | "go2rtcUrl"
  | "cameraEventName"
  | "cameraDefaultDuration"
  | "dimTimeout"
  | "pages";

export type SettingsErrors = Partial<Record<SettingsField, string>>;

export interface SettingsValidationResult {
  errors: SettingsErrors;
  settings: Settings | null;
}

const WEATHER_ENTITY_ID_PATTERN = /^weather\.[a-z0-9_]+$/;
const EVENT_NAME_PATTERN = /^[a-z0-9_]+$/;
const CARD_TYPES = new Set(Object.keys(CARD_DEFAULTS));
const RETIRED_CARD_TYPES = new Set(["switch", "script", "scene", "weather"]);

function hasValidLightColorPresets(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([entityId, slots]) =>
      entityId.startsWith("light.") &&
      Array.isArray(slots) &&
      slots.length === 5 &&
      slots.every(
        (slot) => slot === null ||
          (typeof slot === "string" && /^#[0-9a-f]{6}$/i.test(slot))
      )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password || url.search || url.hash) {
      return null;
    }

    const path = url.pathname.replace(/\/+$/, "");
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCard(value: unknown, allowRetiredCards = false): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.type === "string" &&
    (CARD_TYPES.has(value.type) ||
      (allowRetiredCards && RETIRED_CARD_TYPES.has(value.type))) &&
    typeof value.entityId === "string" &&
    (value.title === undefined || typeof value.title === "string")
  );
}

function isLayoutItem(value: unknown): value is StoredLayoutItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.i === "string" &&
    value.i.trim().length > 0 &&
    isFiniteNumber(value.x) &&
    value.x >= 0 &&
    isFiniteNumber(value.y) &&
    value.y >= 0 &&
    isFiniteNumber(value.w) &&
    value.w > 0 &&
    isFiniteNumber(value.h) &&
    value.h > 0 &&
    (value.minW === undefined || (isFiniteNumber(value.minW) && value.minW > 0)) &&
    (value.minH === undefined || (isFiniteNumber(value.minH) && value.minH > 0))
  );
}

function isPage(
  value: unknown,
  allowMissingIcon = false,
  allowRetiredCards = false
): boolean {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    (typeof value.icon !== "string" && !(allowMissingIcon && value.icon === undefined)) ||
    !Array.isArray(value.cards) ||
    !value.cards.every((card) => isCard(card, allowRetiredCards)) ||
    !Array.isArray(value.layout) ||
    !value.layout.every(isLayoutItem)
  ) {
    return false;
  }

  const cardIds = value.cards.map((card) => card.id);
  const layoutIds = value.layout.map((item) => item.i);
  if (new Set(cardIds).size !== cardIds.length) return false;
  if (new Set(layoutIds).size !== layoutIds.length) return false;
  return layoutIds.every((id) => cardIds.includes(id));
}

function hasValidPages(
  value: unknown,
  allowMissingIcon = false,
  allowRetiredCards = false
): boolean {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((page) =>
      isPage(page, allowMissingIcon, allowRetiredCards)
    )
  ) {
    return false;
  }
  const ids = value.map((page) => page.id);
  return new Set(ids).size === ids.length;
}

export function validateSettings(input: unknown): SettingsValidationResult {
  const errors: SettingsErrors = {};
  if (!isRecord(input)) {
    return {
      errors: { pages: "The settings data is not valid." },
      settings: null,
    };
  }

  const haUrl =
    typeof input.haUrl === "string" ? normalizeHttpUrl(input.haUrl) : null;
  if (!haUrl) errors.haUrl = "Enter a valid HTTP or HTTPS URL.";

  const haToken = typeof input.haToken === "string" ? input.haToken.trim() : "";
  if (!haToken) errors.haToken = "Enter a Home Assistant access token.";

  const weatherEntityId =
    typeof input.weatherEntityId === "string" ? input.weatherEntityId.trim() : "";
  if (weatherEntityId && !WEATHER_ENTITY_ID_PATTERN.test(weatherEntityId)) {
    errors.weatherEntityId = "Enter an entity ID such as weather.home.";
  }

  const cameraEnabled = input.cameraEnabled;
  const go2rtcUrl =
    typeof input.go2rtcUrl === "string" ? normalizeHttpUrl(input.go2rtcUrl) : null;
  if (cameraEnabled === true && !go2rtcUrl) {
    errors.go2rtcUrl = "Enter a valid HTTP or HTTPS go2rtc URL.";
  }

  const cameraEventName =
    typeof input.cameraEventName === "string" ? input.cameraEventName.trim() : "";
  if (cameraEnabled === true && !EVENT_NAME_PATTERN.test(cameraEventName)) {
    errors.cameraEventName = "Use lowercase letters, numbers, and underscores.";
  }

  const cameraDefaultDuration = input.cameraDefaultDuration;
  if (
    !Number.isInteger(cameraDefaultDuration) ||
    (cameraDefaultDuration as number) < CAMERA_MIN_DURATION_MS ||
    (cameraDefaultDuration as number) > CAMERA_MAX_DURATION_MS
  ) {
    errors.cameraDefaultDuration = `Enter ${CAMERA_MIN_DURATION_MS} to ${CAMERA_MAX_DURATION_MS} milliseconds.`;
  }

  const dimTimeout = input.dimTimeout;
  if (
    !Number.isInteger(dimTimeout) ||
    (dimTimeout as number) < 10 ||
    (dimTimeout as number) > 3600
  ) {
    errors.dimTimeout = "Enter 10 to 3600 seconds.";
  }

  if (!hasValidPages(input.pages)) {
    errors.pages = "The dashboard pages or layouts are invalid.";
  }

  if (!hasValidLightColorPresets(input.lightColorPresets)) {
    errors.pages = errors.pages ?? "The saved light colour presets are invalid.";
  }

  if (
    typeof cameraEnabled !== "boolean" ||
    typeof input.wakeLockEnabled !== "boolean" ||
    typeof input.showDock !== "boolean" ||
    typeof input.autoDim !== "boolean" ||
    (input.clockFormat !== "12h" && input.clockFormat !== "24h")
  ) {
    errors.pages = errors.pages ?? "The settings data is incomplete.";
  }

  if (Object.keys(errors).length > 0) return { errors, settings: null };

  return {
    errors,
    settings: {
      haUrl: haUrl!,
      haToken,
      weatherEntityId,
      cameraEnabled: cameraEnabled as boolean,
      go2rtcUrl: go2rtcUrl ?? "",
      cameraEventName,
      cameraDefaultDuration: cameraDefaultDuration as number,
      wakeLockEnabled: input.wakeLockEnabled as boolean,
      clockFormat: input.clockFormat as "12h" | "24h",
      showDock: input.showDock as boolean,
      autoDim: input.autoDim as boolean,
      dimTimeout: dimTimeout as number,
      lightColorPresets: migrateLightColorPresets(input.lightColorPresets),
      pages: input.pages as Page[],
    },
  };
}

export const SETTINGS_BACKUP_FORMAT = "hearth-settings-backup";
export const SETTINGS_BACKUP_VERSION = 1;

export type SettingsWithoutToken = Omit<Settings, "haToken">;

export interface ParsedSettingsBackup {
  settings: SettingsWithoutToken;
  embeddedToken: string | null;
  exportedAt: string | null;
  version: number;
  legacy: boolean;
  pageCount: number;
  cardCount: number;
}

function withoutToken(settings: Settings): SettingsWithoutToken {
  const safeSettings: Partial<Settings> = { ...settings };
  delete safeSettings.haToken;
  return safeSettings as SettingsWithoutToken;
}

function backupSummary(
  settings: SettingsWithoutToken,
  metadata: Pick<
    ParsedSettingsBackup,
    "embeddedToken" | "exportedAt" | "version" | "legacy"
  >
): ParsedSettingsBackup {
  return {
    settings,
    ...metadata,
    pageCount: settings.pages.length,
    cardCount: settings.pages.reduce((total, page) => total + page.cards.length, 0),
  };
}

export function parseSettingsBackup(text: string): ParsedSettingsBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("The selected file is not a Hearth settings backup.");
  }

  if (parsed.format === SETTINGS_BACKUP_FORMAT) {
    if (parsed.version !== SETTINGS_BACKUP_VERSION) {
      throw new Error("This Hearth backup version is not supported.");
    }
    if (!isRecord(parsed.settings)) {
      throw new Error("The selected file is not a Hearth settings backup.");
    }
    if (
      typeof parsed.exportedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.exportedAt))
    ) {
      throw new Error("The backup export date is invalid.");
    }

    if (
      parsed.settings.pages !== undefined &&
      !hasValidPages(parsed.settings.pages, false, true)
    ) {
      throw new Error("The backup contains invalid dashboard pages or layouts.");
    }

    const result = validateSettings({
      ...parsed.settings,
      pages: Array.isArray(parsed.settings.pages)
        ? migratePersistedPages(parsed.settings.pages as PersistedPage[])
        : parsed.settings.pages,
      haToken: "hearth-backup-validation-token",
    });
    if (!result.settings) {
      throw new Error(Object.values(result.errors)[0] ?? "The backup is invalid.");
    }

    return backupSummary(withoutToken(result.settings), {
      embeddedToken: null,
      exportedAt: parsed.exportedAt,
      version: SETTINGS_BACKUP_VERSION,
      legacy: false,
    });
  }

  if (!isRecord(parsed.state) || !isRecord(parsed.state.settings)) {
    throw new Error("The selected file is not a Hearth settings backup.");
  }

  const persisted = parsed.state.settings;
  if (
    persisted.pages !== undefined &&
    !hasValidPages(persisted.pages, true, true)
  ) {
    throw new Error("The backup contains invalid dashboard pages or layouts.");
  }

  const result = validateSettings(
    mergePersistedSettings(persisted as PersistedSettings)
  );
  if (!result.settings) {
    throw new Error(Object.values(result.errors)[0] ?? "The backup is invalid.");
  }

  return backupSummary(withoutToken(result.settings), {
    embeddedToken: result.settings.haToken || null,
    exportedAt: null,
    version: 0,
    legacy: true,
  });
}

export function restoreSettingsBackup(
  backup: ParsedSettingsBackup,
  currentToken: string,
  suppliedToken = ""
): Settings {
  const token =
    currentToken.trim() || backup.embeddedToken?.trim() || suppliedToken.trim();
  if (!token) {
    throw new Error("Enter a Home Assistant access token to restore this backup.");
  }

  const result = validateSettings({ ...backup.settings, haToken: token });
  if (!result.settings) {
    throw new Error(Object.values(result.errors)[0] ?? "The backup is invalid.");
  }
  return result.settings;
}

export function serializeSettingsBackup(
  settings: Settings,
  exportedAt = new Date()
): string {
  const result = validateSettings(settings);
  if (!result.settings) {
    throw new Error("Current settings are invalid and cannot be exported.");
  }

  return JSON.stringify(
    {
      format: SETTINGS_BACKUP_FORMAT,
      version: SETTINGS_BACKUP_VERSION,
      exportedAt: exportedAt.toISOString(),
      settings: withoutToken(result.settings),
    },
    null,
    2
  );
}

export function serializePersistedSettings(settings: Settings): string {
  return JSON.stringify({ state: { settings }, version: 0 });
}
