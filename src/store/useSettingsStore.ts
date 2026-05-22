import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Settings, defaultSettings } from "../types/settings";

interface SettingsStore {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: "hearth-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
