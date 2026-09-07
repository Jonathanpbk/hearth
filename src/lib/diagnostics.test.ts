import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../types/settings";
import {
  copyDiagnosticsText,
  createDiagnosticsReport,
} from "./diagnostics";

function reportInput() {
  return {
    generatedAt: Date.parse("2026-09-07T12:00:00.000Z"),
    settings: {
      ...defaultSettings,
      haUrl: "https://private-ha.example.test",
      haToken: "secret-token-marker",
      cameraEnabled: true,
      go2rtcUrl: "https://private-camera.example.test",
    },
    releaseVersion: "1.0.0",
    buildCommit: "0123456789abcdef",
    installedBuild: "assets/index-current.js",
    latestBuild: "assets/index-latest.js",
    serviceWorkerStatus: "active" as const,
    connectionStatus: "connected" as const,
    lastHaConnectedAt: Date.parse("2026-09-07T11:59:00.000Z"),
    lastHaDisconnectedAt: Date.parse("2026-09-07T11:58:00.000Z"),
    haReconnectCount: 2,
    cameraTransport: "mse" as const,
    cameraPlaybackStatus: "playing" as const,
    lastCameraError: null,
    wakeLockStatus: "active" as const,
    visibilityState: "visible" as const,
    userAgent: "Hearth test browser",
    language: "en-IE",
    screenSize: "2000x1200",
    devicePixelRatio: 1.5,
  };
}

describe("diagnostics report", () => {
  it("includes health data without saved secrets or URLs", () => {
    const text = createDiagnosticsReport(reportInput());
    const report = JSON.parse(text) as Record<string, unknown>;

    expect(text).not.toContain("secret-token-marker");
    expect(text).not.toContain("private-ha.example.test");
    expect(text).not.toContain("private-camera.example.test");
    expect(report).toMatchObject({
      reportVersion: 1,
      generatedAt: "2026-09-07T12:00:00.000Z",
      hearth: {
        releaseVersion: "1.0.0",
        buildCommit: "0123456789abcdef",
      },
      configuration: {
        homeAssistantConfigured: true,
        cameraEnabled: true,
        cameraConfigured: true,
        wakeLockEnabled: true,
      },
      homeAssistant: {
        connectionStatus: "connected",
        lastConnectedAt: "2026-09-07T11:59:00.000Z",
        lastDisconnectedAt: "2026-09-07T11:58:00.000Z",
        reconnectCount: 2,
      },
      camera: { transport: "mse", playbackStatus: "playing" },
    });
  });

  it("copies through the browser clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await copyDiagnosticsText("diagnostic report", { writeText });

    expect(writeText).toHaveBeenCalledWith("diagnostic report");
  });
});
