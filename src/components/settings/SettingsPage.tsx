import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import { Settings } from "../../types/settings";
import { ConnectionSettings } from "./ConnectionSettings";
import { CameraSettings } from "./CameraSettings";
import { DisplaySettings } from "./DisplaySettings";

export function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<Settings>(settings);

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
      </div>
    </div>
  );
}
