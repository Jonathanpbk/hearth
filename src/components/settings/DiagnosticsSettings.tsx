import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, RefreshCw } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useEntityStore } from "../../store/useEntityStore";
import { useDiagnosticsStore } from "../../store/useDiagnosticsStore";
import {
  copyDiagnosticsText,
  createDiagnosticsReport,
  getServiceWorkerStatus,
  type ServiceWorkerStatus,
} from "../../lib/diagnostics";
import {
  fetchLatestPwaVersion,
  getInstalledPwaVersion,
} from "../../lib/pwa-update";
import { installedRelease, shortCommit } from "../../lib/release";

type CopyState = "idle" | "copied" | "error";

function label(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortVersion(version: string | null): string {
  if (!version) return "Unknown";
  return version.replace(/^assets\//, "").replace(/\.js$/, "");
}

function formatTime(timestamp: number | null): string {
  return timestamp === null ? "Not recorded" : new Date(timestamp).toLocaleString();
}

function DiagnosticRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-white/45">{name}</span>
      <span className="text-right text-white/70 break-words">{value}</span>
    </div>
  );
}

export function DiagnosticsSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const connectionStatus = useEntityStore((state) => state.connectionStatus);
  const diagnostics = useDiagnosticsStore();
  const installedBuild = getInstalledPwaVersion();
  const [latestBuild, setLatestBuild] = useState<string | null>(null);
  const [serviceWorkerStatus, setServiceWorkerStatus] =
    useState<ServiceWorkerStatus>("unsupported");
  const [visibilityState, setVisibilityState] =
    useState<DocumentVisibilityState>(document.visibilityState);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    let active = true;

    async function refreshPwaHealth() {
      const [worker, version] = await Promise.allSettled([
        getServiceWorkerStatus(),
        fetchLatestPwaVersion(),
      ]);
      if (!active) return;
      setServiceWorkerStatus(
        worker.status === "fulfilled" ? worker.value : "unsupported"
      );
      setLatestBuild(version.status === "fulfilled" ? version.value.version : null);
    }

    function handleVisibilityChange() {
      setVisibilityState(document.visibilityState);
    }

    function handleControllerChange() {
      void refreshPwaHealth();
    }

    void refreshPwaHealth();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  }, []);

  const report = useMemo(
    () =>
      createDiagnosticsReport({
        settings,
        releaseVersion: installedRelease.version,
        buildCommit: installedRelease.commit,
        installedBuild,
        latestBuild,
        serviceWorkerStatus,
        connectionStatus,
        lastHaConnectedAt: diagnostics.lastHaConnectedAt,
        lastHaDisconnectedAt: diagnostics.lastHaDisconnectedAt,
        haReconnectCount: diagnostics.haReconnectCount,
        cameraTransport: diagnostics.cameraTransport,
        cameraPlaybackStatus: diagnostics.cameraPlaybackStatus,
        lastCameraError: diagnostics.lastCameraError,
        wakeLockStatus: diagnostics.wakeLockStatus,
        visibilityState,
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenSize: `${screen.width}x${screen.height}`,
        devicePixelRatio: window.devicePixelRatio,
      }),
    [
      settings,
      installedBuild,
      latestBuild,
      serviceWorkerStatus,
      connectionStatus,
      diagnostics.lastHaConnectedAt,
      diagnostics.lastHaDisconnectedAt,
      diagnostics.haReconnectCount,
      diagnostics.cameraTransport,
      diagnostics.cameraPlaybackStatus,
      diagnostics.lastCameraError,
      diagnostics.wakeLockStatus,
      visibilityState,
    ]
  );

  async function copyReport() {
    setCopyState("idle");
    try {
      await copyDiagnosticsText(report);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  const buildState = latestBuild
    ? latestBuild === installedBuild
      ? "Up to date"
      : "Update available"
    : "Latest build unavailable";

  return (
    <div className="pt-4 border-t border-white/[0.06]">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
        Diagnostics
      </p>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-4">
        <div className="grid gap-2.5">
          <DiagnosticRow
            name="Release"
            value={`v${installedRelease.version}`}
          />
          <DiagnosticRow
            name="Build commit"
            value={shortCommit(installedRelease.commit)}
          />
          <DiagnosticRow name="Installed build" value={shortVersion(installedBuild)} />
          <DiagnosticRow name="Latest build" value={shortVersion(latestBuild)} />
          <DiagnosticRow name="Build status" value={buildState} />
          <DiagnosticRow name="Home Assistant" value={label(connectionStatus)} />
          <DiagnosticRow
            name="Last connected"
            value={formatTime(diagnostics.lastHaConnectedAt)}
          />
          <DiagnosticRow
            name="Last disconnected"
            value={formatTime(diagnostics.lastHaDisconnectedAt)}
          />
          <DiagnosticRow
            name="Reconnections this session"
            value={String(diagnostics.haReconnectCount)}
          />
          <DiagnosticRow
            name="Camera playback"
            value={label(diagnostics.cameraPlaybackStatus)}
          />
          <DiagnosticRow
            name="Camera transport"
            value={diagnostics.cameraTransport.toUpperCase()}
          />
          <DiagnosticRow
            name="Last camera error"
            value={diagnostics.lastCameraError ?? "None recorded"}
          />
          <DiagnosticRow
            name="Service worker"
            value={label(serviceWorkerStatus)}
          />
          <DiagnosticRow
            name="Wake lock"
            value={label(diagnostics.wakeLockStatus)}
          />
          <DiagnosticRow name="Page visibility" value={label(visibilityState)} />
        </div>

        <button
          type="button"
          onClick={() => void copyReport()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.1] hover:border-white/20 text-sm text-white/60 hover:text-white transition-colors"
        >
          {copyState === "copied" ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : copyState === "idle" ? (
            <Clipboard className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {copyState === "copied" ? "Diagnostics copied" : "Copy diagnostics"}
        </button>
        {copyState === "error" && (
          <p className="text-xs text-red-400">
            Copy failed. Check browser clipboard permission and try again.
          </p>
        )}
        <p className="text-xs text-white/35">
          The copied report excludes saved URLs and the Home Assistant token.
        </p>
      </div>
    </div>
  );
}
