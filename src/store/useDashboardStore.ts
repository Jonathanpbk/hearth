import { create } from "zustand";
import type { CardConfig, Page, StoredLayoutItem } from "../types/dashboard";
import {
  addDraftCard,
  addDraftPage,
  clonePages,
  deleteDraftCard,
  deleteDraftPage,
  reorderDraftPages,
  restoreDraftCard,
  updateDraftCard,
  updateDraftLayout,
  updateDraftPageMeta,
  type DeletedCardSnapshot,
} from "../lib/dashboard-edit";

interface DashboardStore {
  editMode: boolean;
  currentPageId: string | null;
  draftPages: Page[] | null;
  beginEdit: (pages: Page[]) => void;
  discardEdit: () => void;
  completeEdit: () => void;
  setCurrentPageId: (id: string | null) => void;
  addPage: (name: string, id: string) => void;
  deletePage: (id: string) => void;
  updatePageMeta: (id: string, name: string, icon: string) => void;
  reorderPages: (orderedIds: string[]) => void;
  addCard: (pageId: string, card: CardConfig, layout: StoredLayoutItem) => void;
  deleteCard: (pageId: string, cardId: string) => DeletedCardSnapshot | null;
  restoreCard: (deletion: DeletedCardSnapshot) => void;
  updateCard: (pageId: string, card: CardConfig) => void;
  updateLayout: (pageId: string, layout: StoredLayoutItem[]) => void;
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  editMode: false,
  currentPageId: null,
  draftPages: null,
  beginEdit: (pages) => set({ editMode: true, draftPages: clonePages(pages) }),
  discardEdit: () => set({ editMode: false, draftPages: null }),
  completeEdit: () => set({ editMode: false, draftPages: null }),
  setCurrentPageId: (currentPageId) => set({ currentPageId }),
  addPage: (name, id) =>
    set((state) => ({
      draftPages: state.draftPages
        ? addDraftPage(state.draftPages, name, id)
        : null,
    })),
  deletePage: (id) =>
    set((state) => ({
      draftPages: state.draftPages
        ? deleteDraftPage(state.draftPages, id)
        : null,
    })),
  updatePageMeta: (id, name, icon) =>
    set((state) => ({
      draftPages: state.draftPages
        ? updateDraftPageMeta(state.draftPages, id, name, icon)
        : null,
    })),
  reorderPages: (orderedIds) =>
    set((state) => ({
      draftPages: state.draftPages
        ? reorderDraftPages(state.draftPages, orderedIds)
        : null,
    })),
  addCard: (pageId, card, layout) =>
    set((state) => ({
      draftPages: state.draftPages
        ? addDraftCard(state.draftPages, pageId, card, layout)
        : null,
    })),
  deleteCard: (pageId, cardId) => {
    let deletion: DeletedCardSnapshot | null = null;
    set((state) => {
      if (!state.draftPages) return {};
      const result = deleteDraftCard(state.draftPages, pageId, cardId);
      deletion = result.deletion;
      return { draftPages: result.pages };
    });
    return deletion;
  },
  restoreCard: (deletion) =>
    set((state) => ({
      draftPages: state.draftPages
        ? restoreDraftCard(state.draftPages, deletion)
        : null,
    })),
  updateCard: (pageId, card) =>
    set((state) => ({
      draftPages: state.draftPages
        ? updateDraftCard(state.draftPages, pageId, card)
        : null,
    })),
  updateLayout: (pageId, layout) =>
    set((state) => ({
      draftPages: state.draftPages
        ? updateDraftLayout(state.draftPages, pageId, layout)
        : null,
    })),
}));
