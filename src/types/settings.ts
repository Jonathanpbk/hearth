import type { Page } from "./dashboard";

export type LightColorPreset = string | null;
export type LightColorPresets = Record<string, LightColorPreset[]>;

export interface Settings {
  haUrl: string;
  haToken: string;
  weatherEntityId: string;
  cameraEnabled: boolean;
  go2rtcUrl: string;
  cameraEventName: string;
  cameraDefaultDuration: number;
  wakeLockEnabled: boolean;
  clockFormat: "12h" | "24h";
  showDock: boolean;
  autoDim: boolean;
  dimTimeout: number;
  lightColorPresets: LightColorPresets;
  pages: Page[];
}

export const defaultSettings: Settings = {
  haUrl: "",
  haToken: "",
  weatherEntityId: "weather.home",
  cameraEnabled: false,
  go2rtcUrl: "",
  cameraEventName: "pwa_camera_trigger",
  cameraDefaultDuration: 10000,
  wakeLockEnabled: true,
  clockFormat: "12h",
  showDock: true,
  autoDim: false,
  dimTimeout: 60,
  lightColorPresets: {},
  pages: [{ id: "default", name: "Home", icon: "LayoutDashboard", cards: [], layout: [] }],
};
