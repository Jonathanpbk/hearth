import { create } from "zustand";

export interface ServiceErrorNotice {
  id: number;
  message: string;
}

interface ServiceErrorStore {
  notice: ServiceErrorNotice | null;
  showError: (message: string) => void;
  clearError: (id?: number) => void;
}

let nextNoticeId = 1;

export const useServiceErrorStore = create<ServiceErrorStore>()((set) => ({
  notice: null,
  showError: (message) =>
    set({
      notice: {
        id: nextNoticeId++,
        message,
      },
    }),
  clearError: (id) =>
    set((state) => {
      if (id !== undefined && state.notice?.id !== id) return state;
      return { notice: null };
    }),
}));
