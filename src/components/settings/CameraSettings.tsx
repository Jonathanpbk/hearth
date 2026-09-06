import {
  CAMERA_MAX_DURATION_MS,
  CAMERA_MIN_DURATION_MS,
} from "../../config/defaults";
import type { SettingsErrors } from "../../lib/settings-validation";

interface Props {
  cameraEnabled: boolean;
  go2rtcUrl: string;
  cameraEventName: string;
  cameraDefaultDuration: number;
  errors: SettingsErrors;
  onCameraEnabledChange: (v: boolean) => void;
  onGo2rtcUrlChange: (v: string) => void;
  onCameraEventNameChange: (v: string) => void;
  onCameraDefaultDurationChange: (v: number) => void;
}

const labelClass = "block text-xs uppercase tracking-widest text-white/40 mb-1.5";
const inputClass =
  "w-full bg-[#1a1a1a] border border-white/10 aria-[invalid=true]:border-red-500/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-colors";

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        value ? "bg-blue-500" : "bg-white/20"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function CameraSettings({
  cameraEnabled,
  go2rtcUrl,
  cameraEventName,
  cameraDefaultDuration,
  errors,
  onCameraEnabledChange,
  onGo2rtcUrlChange,
  onCameraEventNameChange,
  onCameraDefaultDurationChange,
}: Props) {
  return (
    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-6 space-y-5">
      <h2 className={labelClass}>Camera</h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Motion-triggered overlay</p>
          <p className="text-xs text-white/40 mt-0.5">
            Show camera stream when HA fires the trigger event
          </p>
        </div>
        <Toggle
          value={cameraEnabled}
          onChange={onCameraEnabledChange}
          label="Motion-triggered overlay"
        />
      </div>

      <div className={!cameraEnabled ? "opacity-40 pointer-events-none" : ""}>
        <div className="space-y-5">
          <div>
            <label htmlFor="go2rtc-url" className={labelClass}>go2rtc URL</label>
            <input
              id="go2rtc-url"
              type="text"
              value={go2rtcUrl}
              onChange={(e) => onGo2rtcUrlChange(e.target.value)}
              placeholder="http://192.168.0.x:1984"
              className={inputClass}
              aria-invalid={Boolean(errors.go2rtcUrl)}
              aria-describedby={errors.go2rtcUrl ? "go2rtc-url-error" : undefined}
              spellCheck={false}
            />
            {errors.go2rtcUrl && (
              <p id="go2rtc-url-error" className="text-xs text-red-400 mt-1.5">
                {errors.go2rtcUrl}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="camera-event-name" className={labelClass}>HA Event Name</label>
            <input
              id="camera-event-name"
              type="text"
              value={cameraEventName}
              onChange={(e) => onCameraEventNameChange(e.target.value)}
              placeholder="pwa_camera_trigger"
              className={inputClass}
              aria-invalid={Boolean(errors.cameraEventName)}
              aria-describedby={errors.cameraEventName ? "camera-event-name-error" : undefined}
              spellCheck={false}
            />
            {errors.cameraEventName && (
              <p id="camera-event-name-error" className="text-xs text-red-400 mt-1.5">
                {errors.cameraEventName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="camera-duration" className={labelClass}>Default Display Duration (ms)</label>
            <input
              id="camera-duration"
              type="number"
              value={cameraDefaultDuration}
              onChange={(e) =>
                onCameraDefaultDurationChange(Number(e.target.value))
              }
              min={CAMERA_MIN_DURATION_MS}
              max={CAMERA_MAX_DURATION_MS}
              step={1000}
              className={inputClass}
              aria-invalid={Boolean(errors.cameraDefaultDuration)}
              aria-describedby={errors.cameraDefaultDuration ? "camera-duration-error" : undefined}
            />
            <p className="text-xs text-white/30 mt-1">
              {(cameraDefaultDuration / 1000).toFixed(0)}s — overridable per
              event
            </p>
            {errors.cameraDefaultDuration && (
              <p id="camera-duration-error" className="text-xs text-red-400 mt-1.5">
                {errors.cameraDefaultDuration}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
