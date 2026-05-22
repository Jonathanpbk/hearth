import { create } from "zustand";
import { useSettingsStore } from "./useSettingsStore";

export type StreamMode = "webrtc" | "mse";

export interface CameraPayload {
  camera_stream: string;
  mode?: StreamMode;
  duration?: number;
}

interface CameraStore {
  visible: boolean;
  streamName: string;
  streamMode: StreamMode;
  duration: number;
  trigger: (payload: CameraPayload) => void;
  dismiss: () => void;
}

export const useCameraStore = create<CameraStore>()((set) => ({
  visible: false,
  streamName: "",
  streamMode: "webrtc",
  duration: 10000,
  trigger: (payload) => {
    const defaultDuration =
      useSettingsStore.getState().settings.cameraDefaultDuration;
    set({
      visible: true,
      streamName: payload.camera_stream,
      streamMode: payload.mode ?? "webrtc",
      duration: payload.duration ?? defaultDuration,
    });
  },
  dismiss: () => set({ visible: false }),
}));
