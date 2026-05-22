interface Props {
  cameraEnabled: boolean;
  go2rtcUrl: string;
  cameraEventName: string;
  cameraDefaultDuration: number;
  onCameraEnabledChange: (v: boolean) => void;
  onGo2rtcUrlChange: (v: string) => void;
  onCameraEventNameChange: (v: string) => void;
  onCameraDefaultDurationChange: (v: number) => void;
}

const labelClass = "block text-xs uppercase tracking-widest text-white/40 mb-1.5";
const inputClass =
  "w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/50 transition-colors";

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
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
        <Toggle value={cameraEnabled} onChange={onCameraEnabledChange} />
      </div>

      <div className={!cameraEnabled ? "opacity-40 pointer-events-none" : ""}>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>go2rtc URL</label>
            <input
              type="text"
              value={go2rtcUrl}
              onChange={(e) => onGo2rtcUrlChange(e.target.value)}
              placeholder="http://192.168.0.x:1984"
              className={inputClass}
              spellCheck={false}
            />
          </div>

          <div>
            <label className={labelClass}>HA Event Name</label>
            <input
              type="text"
              value={cameraEventName}
              onChange={(e) => onCameraEventNameChange(e.target.value)}
              placeholder="pwa_camera_trigger"
              className={inputClass}
              spellCheck={false}
            />
          </div>

          <div>
            <label className={labelClass}>Default Display Duration (ms)</label>
            <input
              type="number"
              value={cameraDefaultDuration}
              onChange={(e) =>
                onCameraDefaultDurationChange(Number(e.target.value))
              }
              min={1000}
              step={1000}
              className={inputClass}
            />
            <p className="text-xs text-white/30 mt-1">
              {(cameraDefaultDuration / 1000).toFixed(0)}s — overridable per
              event
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
