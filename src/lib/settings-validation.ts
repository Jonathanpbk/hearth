import {
  CAMERA_MAX_DURATION_MS,
  CAMERA_MIN_DURATION_MS,
} from "../config/defaults";
import { CARD_DEFAULTS, type CardConfig, type Page, type StoredLayoutItem } from "../types/dashboard";
import { type Settings } from "../types/settings";
import {
  mergePersistedSettings,
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

function isCard(value: unknown): value is CardConfig {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.type === "string" &&
    CARD_TYPES.has(value.type) &&
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

function isPage(value: unknown, allowMissingIcon = false): value is Page {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    (typeof value.icon !== "string" && !(allowMissingIcon && value.icon === undefined)) ||
    !Array.isArray(value.cards) ||
    !value.cards.every(isCard) ||
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

function hasValidPages(value: unknown, allowMissingIcon = false): value is Page[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((page) => isPage(page, allowMissingIcon))
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
      pages: input.pages as Page[],
    },
  };
}

export function parseSettingsBackup(text: string): Settings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!isRecord(parsed) || !isRecord(parsed.state) || !isRecord(parsed.state.settings)) {
    throw new Error("The selected file is not a Hearth settings backup.");
  }

  const persisted = parsed.state.settings;
  if (
    persisted.pages !== undefined &&
    !hasValidPages(persisted.pages, true)
  ) {
    throw new Error("The backup contains invalid dashboard pages or layouts.");
  }

  const result = validateSettings(
    mergePersistedSettings(persisted as PersistedSettings)
  );
  if (!result.settings) {
    throw new Error(Object.values(result.errors)[0] ?? "The backup is invalid.");
  }
  return result.settings;
}

export function serializeSettingsBackup(settings: Settings): string {
  return JSON.stringify({ state: { settings }, version: 0 });
}
