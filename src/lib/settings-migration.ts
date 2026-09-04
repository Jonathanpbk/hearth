import { defaultSettings, type Settings } from "../types/settings";
import type { Page } from "../types/dashboard";

export interface PersistedSettings extends Partial<Settings> {
  haLocalUrl?: string;
  haRemoteUrl?: string;
}

function pagesOr(settings: PersistedSettings): Page[] {
  if (!settings.pages?.length) return defaultSettings.pages;
  return settings.pages.map((page) => ({
    ...page,
    icon: page.icon || "LayoutDashboard",
  }));
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
