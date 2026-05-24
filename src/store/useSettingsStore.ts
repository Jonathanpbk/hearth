import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultSettings, type Settings } from "../types/settings";
import type { CardConfig, Page, StoredLayoutItem } from "../types/dashboard";

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

function pagesOr(p: Partial<Settings>): Page[] {
  if (!p.pages?.length) return defaultSettings.pages;
  // Backfill `icon` for pages saved before the field existed.
  return p.pages.map((page) => ({ ...page, icon: page.icon || "LayoutDashboard" }));
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      setSettings: (settings) => set({ settings }),

      addPage: (name, id) =>
        set((state) => {
          const newPage: Page = {
            id: id ?? crypto.randomUUID(),
            name,
            icon: "LayoutDashboard",
            cards: [],
            layout: [],
          };
          return {
            settings: {
              ...state.settings,
              pages: [...state.settings.pages, newPage],
            },
          };
        }),

      deletePage: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.filter((p) => p.id !== id),
          },
        })),

      renamePage: (id, name) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.map((p) =>
              p.id === id ? { ...p, name } : p
            ),
          },
        })),

      updatePageMeta: (id, name, icon) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.map((p) =>
              p.id === id ? { ...p, name, icon } : p
            ),
          },
        })),

      reorderPages: (orderedIds) =>
        set((state) => {
          const pageMap = new Map(state.settings.pages.map((p) => [p.id, p]));
          return {
            settings: {
              ...state.settings,
              pages: orderedIds.flatMap((id) => {
                const p = pageMap.get(id);
                return p ? [p] : [];
              }),
            },
          };
        }),

      addCard: (pageId, card, layout) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.map((p) =>
              p.id === pageId
                ? { ...p, cards: [...p.cards, card], layout: [...p.layout, layout] }
                : p
            ),
          },
        })),

      removeCard: (pageId, cardId) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.map((p) =>
              p.id === pageId
                ? {
                    ...p,
                    cards: p.cards.filter((c) => c.id !== cardId),
                    layout: p.layout.filter((l) => l.i !== cardId),
                  }
                : p
            ),
          },
        })),

      updateCard: (pageId, card) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.map((p) =>
              p.id === pageId
                ? { ...p, cards: p.cards.map((c) => (c.id === card.id ? card : c)) }
                : p
            ),
          },
        })),

      updateLayout: (pageId, layout) =>
        set((state) => ({
          settings: {
            ...state.settings,
            pages: state.settings.pages.map((p) =>
              p.id === pageId ? { ...p, layout } : p
            ),
          },
        })),
    }),
    {
      name: "hearth-settings",
      storage: createJSONStorage(() => localStorage),
      // Deep-merge stored settings so new fields (e.g. pages) get their defaults
      // when loading data saved before this field existed.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsStore>;
        return {
          ...current,
          settings: {
            ...defaultSettings,
            ...(p.settings ?? {}),
            pages: pagesOr(p.settings ?? {}),
          },
        };
      },
    }
  )
);
