import { create } from "zustand";

interface DimStore {
  isDimmed: boolean;
  dim: () => void;
  undim: () => void;
}

export const useDimStore = create<DimStore>()((set) => ({
  isDimmed: false,
  dim: () => set({ isDimmed: true }),
  undim: () => set({ isDimmed: false }),
}));
