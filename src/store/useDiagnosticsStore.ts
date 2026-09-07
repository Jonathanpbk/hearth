import { create } from "zustand";
import type { StreamMode } from "./useCameraStore";

export type WakeLockStatus =
  | "disabled"
  | "unsupported"
  | "requesting"
  | "active"
  | "paused"
  | "retrying";

export type CameraTransport = StreamMode | "mjpeg" | "none";
export type CameraPlaybackStatus =
  | "idle"
  | "connecting"
  | "playing"
  | "fallback"
  | "error";

interface DiagnosticsStore {
  lastHaConnectedAt: number | null;
  lastHaDisconnectedAt: number | null;
  haReconnectCount: number;
  hasConnectedOnce: boolean;
  awaitingReconnect: boolean;
  wakeLockStatus: WakeLockStatus;
  cameraTransport: CameraTransport;
  cameraPlaybackStatus: CameraPlaybackStatus;
  lastCameraError: string | null;
  recordHaConnected: () => void;
  recordHaDisconnected: () => void;
  setWakeLockStatus: (status: WakeLockStatus) => void;
  beginCameraPlayback: (transport: StreamMode) => void;
  recordCameraPlaying: (transport: Exclude<CameraTransport, "none">) => void;
  recordCameraFallback: (message: string) => void;
  recordCameraError: (message: string) => void;
  clearCameraPlayback: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsStore>()((set) => ({
  lastHaConnectedAt: null,
  lastHaDisconnectedAt: null,
  haReconnectCount: 0,
  hasConnectedOnce: false,
  awaitingReconnect: false,
  wakeLockStatus: "disabled",
  cameraTransport: "none",
  cameraPlaybackStatus: "idle",
  lastCameraError: null,

  recordHaConnected: () =>
    set((state) => ({
      lastHaConnectedAt: Date.now(),
      haReconnectCount:
        state.haReconnectCount + (state.awaitingReconnect ? 1 : 0),
      hasConnectedOnce: true,
      awaitingReconnect: false,
    })),

  recordHaDisconnected: () =>
    set((state) => ({
      lastHaDisconnectedAt: state.awaitingReconnect
        ? state.lastHaDisconnectedAt
        : Date.now(),
      awaitingReconnect: state.hasConnectedOnce,
    })),

  setWakeLockStatus: (wakeLockStatus) => set({ wakeLockStatus }),

  beginCameraPlayback: (cameraTransport) =>
    set({ cameraTransport, cameraPlaybackStatus: "connecting" }),

  recordCameraPlaying: (cameraTransport) =>
    set({ cameraTransport, cameraPlaybackStatus: "playing" }),

  recordCameraFallback: (lastCameraError) =>
    set({
      cameraTransport: "mjpeg",
      cameraPlaybackStatus: "fallback",
      lastCameraError,
    }),

  recordCameraError: (lastCameraError) =>
    set({ cameraPlaybackStatus: "error", lastCameraError }),

  clearCameraPlayback: () =>
    set({ cameraTransport: "none", cameraPlaybackStatus: "idle" }),
}));
