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
  pages: [{ id: "default", name: "Home", cards: [], layout: [] }],
};
