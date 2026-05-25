interface Props {
  wakeLockEnabled: boolean;
  clockFormat: "12h" | "24h";
  showDock: boolean;
  autoDim: boolean;
  dimTimeout: number;
  onWakeLockChange: (v: boolean) => void;
  onClockFormatChange: (v: "12h" | "24h") => void;
  onShowDockChange: (v: boolean) => void;
  onAutoDimChange: (v: boolean) => void;
  onDimTimeoutChange: (v: number) => void;
}

const labelClass = "block text-xs uppercase tracking-widest text-white/40 mb-1.5";

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

export function DisplaySettings({
  wakeLockEnabled,
  clockFormat,
  showDock,
  autoDim,
  dimTimeout,
  onWakeLockChange,
  onClockFormatChange,
  onShowDockChange,
  onAutoDimChange,
  onDimTimeoutChange,
}: Props) {
  return (
    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl p-6 space-y-5">
      <h2 className={labelClass}>Display</h2>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Clock format</p>
        </div>
        <div className="flex gap-1 bg-white/[0.06] rounded-lg p-0.5">
          {(["12h", "24h"] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => onClockFormatChange(fmt)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                clockFormat === fmt
                  ? "bg-white/[0.14] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Screen Wake Lock</p>
          <p className="text-xs text-white/40 mt-0.5">
            Prevent the screen from sleeping while the dashboard is open
          </p>
        </div>
        <Toggle value={wakeLockEnabled} onChange={onWakeLockChange} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Show Navigation Dock</p>
          <p className="text-xs text-white/40 mt-0.5">
            Show the floating page dock at the bottom of the dashboard
          </p>
        </div>
        <Toggle value={showDock} onChange={onShowDockChange} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Auto-dim</p>
          <p className="text-xs text-white/40 mt-0.5">
            Dim the screen after a period of inactivity
          </p>
        </div>
        <Toggle value={autoDim} onChange={onAutoDimChange} />
      </div>

      {autoDim && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Dim after</p>
            <p className="text-xs text-white/40 mt-0.5">Seconds of inactivity before dimming</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={3600}
              value={dimTimeout}
              onChange={(e) => {
                const v = Math.min(3600, Math.max(10, Number(e.target.value)));
                onDimTimeoutChange(v);
              }}
              className="w-20 px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.08]
                text-sm text-white text-right outline-none focus:border-white/20 transition-colors"
            />
            <span className="text-xs text-white/40">sec</span>
          </div>
        </div>
      )}
    </div>
  );
}
