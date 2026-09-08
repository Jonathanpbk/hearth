import { defaultSettings, type Settings } from "../types/settings";
import {
  CARD_DEFAULTS,
  type CardConfig,
  type CardType,
  type Page,
} from "../types/dashboard";

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
    pages: pagesOr(migrated),
  };
}
