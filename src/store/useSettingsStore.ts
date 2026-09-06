import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultSettings, type Settings } from "../types/settings";
import type { CardConfig, StoredLayoutItem } from "../types/dashboard";
import {
  mergePersistedSettings,
  type PersistedSettings,
} from "../lib/settings-migration";
import {
  addDraftCard,
  addDraftPage,
  deleteDraftCard,
  deleteDraftPage,
  reorderDraftPages,
  updateDraftCard,
  updateDraftLayout,
  updateDraftPageMeta,
} from "../lib/dashboard-edit";

interface SettingsStore {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  addPage: (name: string, id?: string) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  updatePageMeta: (id: string, name: string, icon: string) => void;
  reorderPages: (orderedIds: string[]) => void;
  addCard: (pageId: string, card: CardConfig, layout: StoredLayoutItem) => void;
  removeCard: (pageId: string, cardId: string) => void;
  updateCard: (pageId: string, card: CardConfig) => void;
  updateLayout: (pageId: string, layout: StoredLayoutItem[]) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      setSettings: (settings) => set({ settings }),

      addPage: (name, id) =>
        set((state) => {
          return {
            settings: {
              ...state.settings,
              pages: addDraftPage(
                state.settings.pages,
                name,
                id ?? crypto.randomUUID()
              ),
            },
          };
        }),

      deletePage: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: deleteDraftPage(state.settings.pages, id),
          },
        })),

      renamePage: (id, name) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.some((page) => page.id === id)
              ? updateDraftPageMeta(
                  state.settings.pages,
                  id,
                  name,
                  state.settings.pages.find((page) => page.id === id)!.icon
                )
              : state.settings.pages,
          },
        })),

      updatePageMeta: (id, name, icon) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: updateDraftPageMeta(state.settings.pages, id, name, icon),
          },
        })),

      reorderPages: (orderedIds) =>
        set((state) => {
          return {
            settings: {
              ...state.settings,
              pages: reorderDraftPages(state.settings.pages, orderedIds),
            },
          };
        }),

      addCard: (pageId, card, layout) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: addDraftCard(state.settings.pages, pageId, card, layout),
          },
        })),

      removeCard: (pageId, cardId) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: deleteDraftCard(state.settings.pages, pageId, cardId).pages,
          },
        })),

      updateCard: (pageId, card) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: updateDraftCard(state.settings.pages, pageId, card),
          },
        })),

      updateLayout: (pageId, layout) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: updateDraftLayout(state.settings.pages, pageId, layout),
          },
        })),
    }),
    {
      name: "hearth-settings",
      storage: createJSONStorage(() => localStorage),
      // Preserve old settings while migrating the former local/remote URL pair.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsStore>;
        return {
          ...current,
          settings: mergePersistedSettings(
            (p.settings ?? {}) as PersistedSettings
          ),
        };
      },
    }
  )
);
