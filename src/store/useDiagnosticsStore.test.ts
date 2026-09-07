import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagnosticsStore } from "./useDiagnosticsStore";

function resetStore() {
  useDiagnosticsStore.setState({
    lastHaConnectedAt: null,
    lastHaDisconnectedAt: null,
    haReconnectCount: 0,
    hasConnectedOnce: false,
    awaitingReconnect: false,
    wakeLockStatus: "disabled",
    cameraTransport: "none",
    cameraPlaybackStatus: "idle",
    lastCameraError: null,
  });
}

describe("runtime diagnostics", () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
    vi.setSystemTime("2026-09-07T12:00:00.000Z");
  });

  it("counts established Home Assistant reconnections", () => {
    const store = useDiagnosticsStore.getState();
    store.recordHaDisconnected();
    store.recordHaConnected();
    expect(useDiagnosticsStore.getState().haReconnectCount).toBe(0);

    vi.setSystemTime("2026-09-07T12:01:00.000Z");
    useDiagnosticsStore.getState().recordHaDisconnected();
    useDiagnosticsStore.getState().recordHaDisconnected();
    vi.setSystemTime("2026-09-07T12:01:05.000Z");
    useDiagnosticsStore.getState().recordHaConnected();

    const result = useDiagnosticsStore.getState();
    expect(result.haReconnectCount).toBe(1);
    expect(result.lastHaConnectedAt).toBe(Date.parse("2026-09-07T12:01:05.000Z"));
    expect(result.lastHaDisconnectedAt).toBe(
      Date.parse("2026-09-07T12:01:00.000Z")
    );
  });

  it("records camera fallback and recovery without losing the last error", () => {
    const store = useDiagnosticsStore.getState();
    store.beginCameraPlayback("webrtc");
    store.recordCameraFallback("WebRTC failed.");
    store.recordCameraPlaying("mjpeg");

    expect(useDiagnosticsStore.getState()).toMatchObject({
      cameraTransport: "mjpeg",
      cameraPlaybackStatus: "playing",
      lastCameraError: "WebRTC failed.",
    });

    useDiagnosticsStore.getState().clearCameraPlayback();
    expect(useDiagnosticsStore.getState()).toMatchObject({
      cameraTransport: "none",
      cameraPlaybackStatus: "idle",
      lastCameraError: "WebRTC failed.",
    });
  });
});
