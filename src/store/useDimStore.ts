import { create } from "zustand";

interface DimStore {
  isDimmed: boolean;
  lastUndimTime: number;
  dim: () => void;
  undim: () => void;
}

export const useDimStore = create<DimStore>()((set) => ({
  isDimmed: false,
  lastUndimTime: 0,
  dim: () => set({ isDimmed: true }),
  undim: () => set({ isDimmed: false, lastUndimTime: Date.now() }),
}));
