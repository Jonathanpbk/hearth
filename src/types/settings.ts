import type { Page } from "./dashboard";

export interface Settings {
  haLocalUrl: string;
  haRemoteUrl: string;
  haToken: string;
  weatherEntityId: string;
  cameraEnabled: boolean;
  go2rtcUrl: string;
  cameraEventName: string;
  cameraDefaultDuration: number;
  wakeLockEnabled: boolean;
  clockFormat: "12h" | "24h";
  showDock: boolean;
  pages: Page[];
}

export const defaultSettings: Settings = {
  haLocalUrl: "",
  haRemoteUrl: "",
  haToken: "",
  weatherEntityId: "weather.home",
  cameraEnabled: false,
  go2rtcUrl: "",
  cameraEventName: "pwa_camera_trigger",
  cameraDefaultDuration: 10000,
  wakeLockEnabled: true,
  clockFormat: "12h",
  showDock: true,
  pages: [{ id: "default", name: "Home", icon: "LayoutDashboard", cards: [], layout: [] }],
};
