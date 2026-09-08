import { defaultSettings, type Settings } from "../types/settings";
import {
  CARD_DEFAULTS,
  type CardConfig,
  type CardType,
  type Page,
} from "../types/dashboard";
import { LIGHT_PRESET_COUNT, normalizePresetColor } from "./light-controls";

export type PersistedCard = Omit<CardConfig, "type"> & { type: string };
export type PersistedPage = Omit<Page, "cards"> & { cards: PersistedCard[] };

export interface PersistedSettings
  extends Omit<Partial<Settings>, "pages"> {
  haLocalUrl?: string;
  haRemoteUrl?: string;
  pages?: PersistedPage[];
}

const SUPPORTED_CARD_TYPES = new Set<CardType>(
  Object.keys(CARD_DEFAULTS) as CardType[]
);

function isSupportedCard(card: PersistedCard): card is CardConfig {
  return SUPPORTED_CARD_TYPES.has(card.type as CardType);
}

export function migratePersistedPages(pages: PersistedPage[]): Page[] {
  return pages.map((page) => {
    const cards = page.cards.filter(isSupportedCard);
    const cardIds = new Set(cards.map((card) => card.id));
    return {
      ...page,
      icon: page.icon || "LayoutDashboard",
      cards,
      layout: page.layout.filter((item) => cardIds.has(item.i)),
    };
  });
}

function pagesOr(settings: PersistedSettings): Page[] {
  if (!settings.pages?.length) return defaultSettings.pages;
  return migratePersistedPages(settings.pages);
}

export function migrateLightColorPresets(
  value: unknown
): Settings["lightColorPresets"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([entityId, slots]) =>
        entityId.startsWith("light.") && Array.isArray(slots)
      )
      .map(([entityId, slots]) => {
        const normalized = (slots as unknown[])
          .slice(0, LIGHT_PRESET_COUNT)
          .map((slot) =>
            typeof slot === "string" ? normalizePresetColor(slot) : null
          );
        while (normalized.length < LIGHT_PRESET_COUNT) normalized.push(null);
        return [entityId, normalized];
      })
  );
}

export function mergePersistedSettings(
  persisted: PersistedSettings
): Settings {
  const migrated = { ...persisted };
  const haUrl =
    migrated.haUrl || migrated.haRemoteUrl || migrated.haLocalUrl || "";

  delete migrated.haLocalUrl;
  delete migrated.haRemoteUrl;

  return {
    ...defaultSettings,
    ...migrated,
    haUrl,
    lightColorPresets: migrateLightColorPresets(migrated.lightColorPresets),
    pages: pagesOr(migrated),
  };
}
