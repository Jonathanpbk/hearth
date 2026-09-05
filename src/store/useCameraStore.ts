import { create } from "zustand";
import { useSettingsStore } from "./useSettingsStore";
import {
  CAMERA_DEFAULT_DURATION_MS,
  CAMERA_MAX_DURATION_MS,
  CAMERA_MIN_DURATION_MS,
} from "../config/defaults";

export type StreamMode = "webrtc" | "mse";

export interface CameraPayload {
  camera_stream?: unknown;
  mode?: unknown;
  duration?: unknown;
}

export interface CameraTrigger {
  streamName: string;
  streamMode: StreamMode;
  duration: number;
}

function normalizedDuration(value: unknown, fallback: number): number {
  const safeFallback = Number.isFinite(fallback)
    ? fallback
    : CAMERA_DEFAULT_DURATION_MS;
  const duration = typeof value === "number" && Number.isFinite(value)
    ? value
    : safeFallback;
  return Math.min(
    CAMERA_MAX_DURATION_MS,
    Math.max(CAMERA_MIN_DURATION_MS, Math.round(duration))
  );
}

export function normalizeCameraPayload(
  payload: unknown,
  defaultDuration = CAMERA_DEFAULT_DURATION_MS
): CameraTrigger | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as CameraPayload;
  if (typeof candidate.camera_stream !== "string") return null;

  const streamName = candidate.camera_stream.trim();
  if (!streamName) return null;

  return {
    streamName,
    streamMode: candidate.mode === "mse" ? "mse" : "webrtc",
    duration: normalizedDuration(candidate.duration, defaultDuration),
  };
}

interface CameraStore {
  visible: boolean;
  streamName: string;
  streamMode: StreamMode;
  duration: number;
  triggerId: number;
  trigger: (payload: unknown) => void;
  dismiss: () => void;
}

export const useCameraStore = create<CameraStore>()((set) => ({
  visible: false,
  streamName: "",
  streamMode: "webrtc",
  duration: CAMERA_DEFAULT_DURATION_MS,
  triggerId: 0,
  trigger: (payload) => {
    const defaultDuration =
      useSettingsStore.getState().settings.cameraDefaultDuration;
    const trigger = normalizeCameraPayload(payload, defaultDuration);
    if (!trigger) return;

    set((state) => ({
      visible: true,
      ...trigger,
      triggerId: state.triggerId + 1,
    }));
  },
  dismiss: () => set({ visible: false }),
}));
