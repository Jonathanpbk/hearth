import { create } from "zustand";

interface DashboardStore {
  editMode: boolean;
  currentPageId: string | null;
  setEditMode: (v: boolean) => void;
  setCurrentPageId: (id: string | null) => void;
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  editMode: false,
  currentPageId: null,
  setEditMode: (editMode) => set({ editMode }),
  setCurrentPageId: (currentPageId) => set({ currentPageId }),
}));
