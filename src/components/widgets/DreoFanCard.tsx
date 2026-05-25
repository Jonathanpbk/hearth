import { useRef, useState, useEffect } from "react";
import { ArrowLeftRight, ArrowUpDown, Footprints, ChevronDown } from "lucide-react";
import { InteractiveCard } from "../InteractiveCard";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { turnOn, turnOff, toggle, runScript, setFanPercentage, setFanPresetMode } from "../../lib/ha-service";

const FAN_ID       = "fan.dreo";
const H_OSC_ID     = "switch.dreo_horizontally_oscillating";
const V_OSC_ID     = "switch.dreo_vertically_oscillating";
const PRESET_J     = "script.j_fan_position";
const PRESET_A     = "script.ags_fan_position";
const PRESET_TREAD = "script.set_fan_to_treadmill_position";

function pctToLevel(pct: number): number {
  return Math.min(9, Math.max(1, Math.round(pct / 11)));
}
function levelToPct(level: number): number {
  return level * 11;
}

function OscButton({
  active, label, children, onClick,
}: {
  active: boolean; label: string; children: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      className={`flex-1 flex items-center justify-center py-2 rounded-xl border
        transition-all duration-200 active:scale-95
        ${active
          ? "bg-[#ffc174]/15 border-[#ffc174]/40 text-[#ffc174]"
          : "bg-white/[0.04] border-white/[0.08] text-white/35 hover:text-white/60"}`}
    >
      {children}
    </button>
  );
}

function PresetButton({
  label, onClick, children,
}: {
  label: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/[0.08]
        bg-white/[0.04] text-white/50 hover:text-white hover:border-white/20
        transition-all duration-150 active:scale-95"
    >
      {children}
    </button>
  );
}

function ModeDropdown({ modes, value, onChange }: {
  modes: string[];
  value: string;
  onChange: (mode: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : "Mode";

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border
          text-sm transition-colors
          ${open
            ? "bg-[#ffc174]/10 border-[#ffc174]/30 text-[#ffc174]"
            : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:border-white/20"
          }`}
      >
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-1.5 left-0 right-0 z-50 rounded-xl border border-white/[0.08] shadow-xl overflow-hidden"
          style={{ background: "#3a3a3c" }}
        >
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => { onChange(m); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors
                ${m === value
                  ? "text-[#ffc174] bg-[#ffc174]/10"
                  : "text-white/80 hover:text-white hover:bg-white/[0.08]"
                }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DreoFanCard() {
  const fan  = useHAEntity(FAN_ID);
  const hOsc = useHAEntity(H_OSC_ID);
  const vOsc = useHAEntity(V_OSC_ID);

  const levelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!fan) {
    return <div className="h-full rounded-2xl border border-white/[0.06] bg-[var(--color-surface)]" />;
  }

  const isOn       = fan.state === "on";
  const pct        = (fan.attributes.percentage as number | undefined) ?? 0;
  const presetMode = (fan.attributes.preset_mode as string | undefined) ?? "";
  const presetModes = (fan.attributes.preset_modes as string[] | undefined) ?? [];
  const hOscOn     = hOsc?.state === "on";
  const vOscOn     = vOsc?.state === "on";
  const level      = pctToLevel(pct);

  function handleCardToggle() {
    try {
      if (isOn) void turnOff(getConnection(), FAN_ID);
      else      void turnOn(getConnection(), FAN_ID);
    } catch { /* disconnected */ }
  }

  function handleLevel(value: number) {
    if (levelTimer.current) clearTimeout(levelTimer.current);
    levelTimer.current = setTimeout(() => {
      try { void setFanPercentage(getConnection(), FAN_ID, levelToPct(value)); } catch { /* disconnected */ }
    }, 120);
  }

  function handleToggleOsc(entityId: string) {
    try { void toggle(getConnection(), entityId); } catch { /* disconnected */ }
  }

  function handlePreset(scriptId: string) {
    try { void runScript(getConnection(), scriptId); } catch { /* disconnected */ }
  }

  function handleMode(mode: string) {
    try { void setFanPresetMode(getConnection(), FAN_ID, mode); } catch { /* disconnected */ }
  }

  return (
    <InteractiveCard
      onClick={handleCardToggle}
      className="h-full flex flex-col bg-[var(--color-surface)] rounded-2xl border border-white/[0.08] overflow-hidden cursor-pointer"
    >
      {/* Fan image — dominant visual */}
      <div className="flex items-center justify-center px-4 pt-3 min-h-0" style={{ flex: "0 0 45%" }}>
        <img
          src="/images/fan.png"
          alt="Dreo fan"
          className={`w-full h-full object-contain select-none pointer-events-none
            transition-all duration-700
            ${isOn ? "opacity-90" : "grayscale opacity-30"}`}
        />
      </div>

      {/* Controls — fill remaining height evenly */}
      <div
        className="flex flex-col px-3 pb-3 min-h-0"
        style={{ flex: "1 1 0", justifyContent: "space-between" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Speed row */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">
            Speed&ensp;·&ensp;
            <span className="text-white/60 tabular-nums">{isOn ? level : "—"}</span>
          </p>
        </div>

        {/* Speed slider */}
        <div>
          <input
            type="range"
            min={1}
            max={9}
            step={1}
            defaultValue={level}
            key={isOn ? `on-${level}` : "off"}
            onChange={(e) => handleLevel(Number(e.target.value))}
          />
        </div>

        {/* Oscillation */}
        <div className="flex gap-2">
          <OscButton active={hOscOn} label="Horizontal oscillation" onClick={() => handleToggleOsc(H_OSC_ID)}>
            <ArrowLeftRight className="h-4 w-4" />
          </OscButton>
          <OscButton active={vOscOn} label="Vertical oscillation" onClick={() => handleToggleOsc(V_OSC_ID)}>
            <ArrowUpDown className="h-4 w-4" />
          </OscButton>
        </div>

        {/* Preset buttons — J at 1/4, A at 1/2, treadmill at 3/4 */}
        <div className="flex justify-around">
          <PresetButton label="J position" onClick={() => handlePreset(PRESET_J)}>
            <span className="text-sm font-bold">J</span>
          </PresetButton>
          <PresetButton label="A position" onClick={() => handlePreset(PRESET_A)}>
            <span className="text-sm font-bold">A</span>
          </PresetButton>
          <PresetButton label="Treadmill position" onClick={() => handlePreset(PRESET_TREAD)}>
            <Footprints className="h-4 w-4" />
          </PresetButton>
        </div>

        {/* Mode dropdown */}
        {presetModes.length > 0 && (
          <ModeDropdown
            modes={presetModes}
            value={presetMode}
            onChange={handleMode}
          />
        )}
      </div>
    </InteractiveCard>
  );
}
