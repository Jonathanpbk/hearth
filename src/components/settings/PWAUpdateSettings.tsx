import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  fetchLatestPwaVersion,
  getInstalledPwaVersion,
  replacePwaCaches,
} from "../../lib/pwa-update";

type UpdateState =
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "updating"
  | "error";

interface Props {
  onBeforeUpdate: () => boolean;
}

function shortVersion(version: string | null): string {
  if (!version) return "Unknown";
  return version.replace(/^assets\//, "").replace(/\.js$/, "");
}

export function PWAUpdateSettings({ onBeforeUpdate }: Props) {
  const installedVersion = getInstalledPwaVersion();
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [state, setState] = useState<UpdateState>("idle");

  async function checkForUpdate() {
    setState("checking");
    try {
      const latest = await fetchLatestPwaVersion();
      setLatestVersion(latest.version);
      setState(latest.version === installedVersion ? "current" : "available");
    } catch {
      setState("error");
    }
  }

  async function updateNow() {
    setState("updating");
    if (!onBeforeUpdate()) {
      setState("idle");
      return;
    }
    try {
      await replacePwaCaches();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="pt-4 border-t border-white/[0.06]">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
        Hearth Update
      </p>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-white/45">Installed build</span>
          <code className="text-xs text-white/70">{shortVersion(installedVersion)}</code>
        </div>
        {latestVersion && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-white/45">Latest build</span>
            <code className="text-xs text-white/70">{shortVersion(latestVersion)}</code>
          </div>
        )}

        <p role="status" className="min-h-5 text-xs text-white/50">
          {state === "idle" && "Check whether this device runs the latest Hearth build."}
          {state === "checking" && "Checking for updates."}
          {state === "current" && "Hearth is up to date."}
          {state === "available" && "A newer Hearth build is ready."}
          {state === "updating" && "Installing the update and restarting Hearth."}
          {state === "error" && "The update check failed. Check the connection and try again."}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void checkForUpdate()}
            disabled={state === "checking" || state === "updating"}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.1] hover:border-white/20 disabled:opacity-40 text-sm text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${state === "checking" ? "animate-spin" : ""}`} />
            Check for updates
          </button>
          {state === "available" && (
            <button
              type="button"
              onClick={() => void updateNow()}
              className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-sm font-semibold text-white transition-all"
            >
              Update now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
