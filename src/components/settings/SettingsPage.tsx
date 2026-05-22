import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { Settings } from "../../types/settings";
import { ConnectionSettings } from "./ConnectionSettings";
import { CameraSettings } from "./CameraSettings";
import { DisplaySettings } from "./DisplaySettings";

const STORAGE_KEY = "hearth-settings";

function exportSettings() {
  const data = localStorage.getItem(STORAGE_KEY) ?? "{}";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hearth-settings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<Settings>(settings);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isConfigured = !!(
    settings.haToken &&
    (settings.haLocalUrl || settings.haRemoteUrl)
  );

  function handleChange<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSettings(form);
    navigate("/");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-imported if needed
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text); // validate JSON before touching storage
        if (!confirm("This will overwrite all current settings and page layouts. Continue?")) return;
        localStorage.setItem(STORAGE_KEY, text);
        window.location.reload();
      } catch {
        alert("Could not import: invalid settings file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          {isConfigured && (
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-white/40 hover:text-white/70"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-white">Settings</h1>
        </div>

        <ConnectionSettings
          haLocalUrl={form.haLocalUrl}
          haRemoteUrl={form.haRemoteUrl}
          haToken={form.haToken}
          weatherEntityId={form.weatherEntityId}
          onLocalUrlChange={(v) => handleChange("haLocalUrl", v)}
          onRemoteUrlChange={(v) => handleChange("haRemoteUrl", v)}
          onTokenChange={(v) => handleChange("haToken", v)}
          onWeatherEntityChange={(v) => handleChange("weatherEntityId", v)}
        />

        <CameraSettings
          cameraEnabled={form.cameraEnabled}
          go2rtcUrl={form.go2rtcUrl}
          cameraEventName={form.cameraEventName}
          cameraDefaultDuration={form.cameraDefaultDuration}
          onCameraEnabledChange={(v) => handleChange("cameraEnabled", v)}
          onGo2rtcUrlChange={(v) => handleChange("go2rtcUrl", v)}
          onCameraEventNameChange={(v) => handleChange("cameraEventName", v)}
          onCameraDefaultDurationChange={(v) =>
            handleChange("cameraDefaultDuration", v)
          }
        />

        <DisplaySettings
          wakeLockEnabled={form.wakeLockEnabled}
          clockFormat={form.clockFormat}
          onWakeLockChange={(v) => handleChange("wakeLockEnabled", v)}
          onClockFormatChange={(v) => handleChange("clockFormat", v)}
        />

        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 active:scale-95 rounded-xl text-sm font-semibold text-white transition-all duration-200 mt-2"
        >
          Save
        </button>

        {/* Export / Import */}
        <div className="pt-4 border-t border-white/[0.06]">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
            Backup &amp; Restore
          </p>
          <div className="flex gap-2">
            <button
              onClick={exportSettings}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.1] hover:border-white/20 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.1] hover:border-white/20 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
