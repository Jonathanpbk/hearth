import type { ConnectionStatus } from "../types/ha";
import type { Settings } from "../types/settings";
import type {
  CameraPlaybackStatus,
  CameraTransport,
  WakeLockStatus,
} from "../store/useDiagnosticsStore";

export type ServiceWorkerStatus =
  | "unsupported"
  | "uncontrolled"
  | "active"
  | "update-ready";

export interface DiagnosticsReportInput {
  generatedAt?: number;
  settings: Settings;
  releaseVersion: string;
  buildCommit: string;
  installedBuild: string | null;
  latestBuild: string | null;
  serviceWorkerStatus: ServiceWorkerStatus;
  connectionStatus: ConnectionStatus;
  lastHaConnectedAt: number | null;
  lastHaDisconnectedAt: number | null;
  haReconnectCount: number;
  cameraTransport: CameraTransport;
  cameraPlaybackStatus: CameraPlaybackStatus;
  lastCameraError: string | null;
  wakeLockStatus: WakeLockStatus;
  visibilityState: DocumentVisibilityState;
  userAgent: string;
  language: string;
  screenSize: string;
  devicePixelRatio: number;
}

function toIso(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  if (!("serviceWorker" in navigator)) return "unsupported";

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) return "update-ready";
  if (registration?.active || navigator.serviceWorker.controller) return "active";
  return "uncontrolled";
}

export function createDiagnosticsReport(input: DiagnosticsReportInput): string {
  const report = {
    reportVersion: 1,
    generatedAt: new Date(input.generatedAt ?? Date.now()).toISOString(),
    hearth: {
      releaseVersion: input.releaseVersion,
      buildCommit: input.buildCommit,
      installedBuild: input.installedBuild,
      latestBuild: input.latestBuild,
      serviceWorkerStatus: input.serviceWorkerStatus,
    },
    configuration: {
      homeAssistantConfigured: Boolean(
        input.settings.haUrl.trim() && input.settings.haToken.trim()
      ),
      cameraEnabled: input.settings.cameraEnabled,
      cameraConfigured: Boolean(input.settings.go2rtcUrl.trim()),
      wakeLockEnabled: input.settings.wakeLockEnabled,
    },
    homeAssistant: {
      connectionStatus: input.connectionStatus,
      lastConnectedAt: toIso(input.lastHaConnectedAt),
      lastDisconnectedAt: toIso(input.lastHaDisconnectedAt),
      reconnectCount: input.haReconnectCount,
    },
    camera: {
      transport: input.cameraTransport,
      playbackStatus: input.cameraPlaybackStatus,
      lastError: input.lastCameraError,
    },
    display: {
      wakeLockStatus: input.wakeLockStatus,
      visibilityState: input.visibilityState,
    },
    browser: {
      userAgent: input.userAgent,
      language: input.language,
      screenSize: input.screenSize,
      devicePixelRatio: input.devicePixelRatio,
    },
  };

  return JSON.stringify(report, null, 2);
}

export async function copyDiagnosticsText(
  text: string,
  clipboard?: Pick<Clipboard, "writeText"> | null
): Promise<void> {
  const writer = clipboard === undefined
    ? typeof navigator === "undefined"
      ? null
      : navigator.clipboard
    : clipboard;

  if (writer?.writeText) {
    await writer.writeText(text);
    return;
  }

  if (typeof document === "undefined") throw new Error("Copy is unavailable");

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed");
}
