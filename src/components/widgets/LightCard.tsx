import { useState, useRef, useEffect } from "react";
import { RotateCcw, Sun, Thermometer, Palette } from "lucide-react";
import { InteractiveCard } from "../InteractiveCard";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { toggle, setBrightness, setColorTemp, callService } from "../../lib/ha-service";
import { skeletonCardClass } from "../../lib/styles";

interface Props {
  entityId: string;
  titleOverride?: string;
}

// Interpolates between warm amber (2202K → #FFD29A) and cool near-white (4000K → #FFF9F2).
function kelvinToRgb(k: number): [number, number, number] {
  const s = Math.max(0, Math.min(1, (k - 2202) / (4000 - 2202)));
  return [255, Math.round(210 + s * 39), Math.round(154 + s * 88)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const RGB_MODES = new Set(["rgb", "rgbw", "rgbww", "hs", "xy"]);

// Flip button — identical placement (bottom-right) on both faces.
// mirrored=true flips the icon so it reads as "return".
function FlipBtn({ mirrored, onFlip }: { mirrored: boolean; onFlip: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onFlip(); }}
      aria-label={mirrored ? "Back to front" : "Show sliders"}
      className="p-1 rounded-lg text-white/20 hover:text-white/50 transition-colors"
    >
      <RotateCcw
        className="h-3 w-3"
        style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      />
    </button>
  );
}

export function LightCard({ entityId, titleOverride }: Props) {
  const entity = useHAEntity(entityId);
  const [flipped, setFlipped] = useState(false);
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColorTemp, setLocalColorTemp] = useState<number | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTempTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
      if (colorTempTimer.current) clearTimeout(colorTempTimer.current);
    };
  }, []);

  if (!entity) return <div className={skeletonCardClass} />;

  const isOn = entity.state === "on";
  const attrs = entity.attributes;
  const name = titleOverride ?? (attrs.friendly_name as string | undefined) ?? entityId;

  const brightness = attrs.brightness as number | undefined;
  const minKelvin = (attrs.min_color_temp_kelvin as number | undefined) ?? 2000;
  const maxKelvin = (attrs.max_color_temp_kelvin as number | undefined) ?? 6500;

  const displayBrightness = localBrightness ?? brightness ?? 128;
  const brightnessPercent = Math.round((displayBrightness / 255) * 100);

  const colorTempKelvin = attrs.color_temp_kelvin as number | undefined;
  const displayColorTemp =
    localColorTemp ?? colorTempKelvin ?? Math.round((minKelvin + maxKelvin) / 2);

  const supportedModes = (attrs.supported_color_modes as string[] | undefined) ?? [];
  const hasBrightness = supportedModes.some((m) => m !== "onoff" && m !== "unknown");
  const hasColorTemp = supportedModes.includes("color_temp");
  const hasRgb = supportedModes.some((m) => RGB_MODES.has(m));

  const rgbColor = attrs.rgb_color as [number, number, number] | undefined;

  // Priority: rgb_color (if on) → kelvin interpolation → neutral (off)
  const [r, g, b]: [number, number, number] =
    isOn && rgbColor ? rgbColor : kelvinToRgb(displayColorTemp);

  const brightFactor = displayBrightness / 255;
  const tintAlpha = isOn ? 0.04 + brightFactor * 0.41 : 0;

  const glowStyle: React.CSSProperties = {
    boxShadow: isOn ? "0 0 8px rgba(255, 193, 116, 0.12)" : undefined,
  };
  const tintStyle: React.CSSProperties = {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${tintAlpha})`,
    transition: "background-color 0.6s ease",
  };

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    try { void toggle(getConnection(), entityId); } catch { /* disconnected */ }
  }

  function handleBrightness(value: number) {
    setLocalBrightness(value);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => {
      try { void setBrightness(getConnection(), entityId, value); } catch { /* disconnected */ }
    }, 150);
  }

  function handleColorTemp(value: number) {
    setLocalColorTemp(value);
    if (colorTempTimer.current) clearTimeout(colorTempTimer.current);
    colorTempTimer.current = setTimeout(() => {
      try { void setColorTemp(getConnection(), entityId, value); } catch { /* disconnected */ }
    }, 150);
  }

  function handleColorPick(hex: string) {
    const pr = parseInt(hex.slice(1, 3), 16);
    const pg = parseInt(hex.slice(3, 5), 16);
    const pb = parseInt(hex.slice(5, 7), 16);
    try {
      void callService(getConnection(), "light", "turn_on", {
        entity_id: entityId,
        rgb_color: [pr, pg, pb],
      });
    } catch { /* disconnected */ }
  }

  const borderClass = isOn ? "border-white/[0.12]" : "border-white/[0.06]";

  return (
    <InteractiveCard className="h-full" style={{ perspective: "1000px" }}>
      <div style={{ position: "relative", height: "100%", borderRadius: "1rem", ...glowStyle }}>

        {/* ── FRONT FACE — rotates to edge-on (-90deg) when flipping ─────────── */}
        <div
          className={`absolute inset-0 rounded-2xl border bg-[var(--color-surface)] overflow-hidden cursor-pointer ${borderClass}`}
          style={{
            transform: flipped ? "rotateY(-90deg)" : "rotateY(0deg)",
            transition: flipped ? "transform 0.15s ease-in" : "transform 0.15s ease-out 0.15s",
            pointerEvents: flipped ? "none" : "auto",
          }}
          onClick={handleToggle}
        >
          <div className="absolute inset-0 pointer-events-none" style={tintStyle} />

          <div className={`relative z-10 flex flex-col h-full p-2 ${!isOn ? "opacity-50" : ""}`}>

            {/* Light name — top left */}
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest truncate leading-none shrink-0">
              {name}
            </p>

            {/* Brightness — dominant, vertically centred in remaining space */}
            <div className="flex-1 flex items-center min-h-0">
              <div className="flex items-baseline gap-0.5 leading-none">
                <span className="text-3xl font-bold tabular-nums text-white">
                  {isOn ? String(brightnessPercent) : "Off"}
                </span>
                {isOn && (
                  <span className="text-base font-medium text-white/30">%</span>
                )}
              </div>
            </div>

            {/* Bottom row: colour temp left, flip right */}
            <div className="flex items-center justify-between shrink-0">
              {isOn && hasColorTemp
                ? <p className="text-[9px] text-white/25 tabular-nums leading-none">{displayColorTemp} K</p>
                : <span />}
              <FlipBtn mirrored={false} onFlip={() => setFlipped(true)} />
            </div>

          </div>
        </div>

        {/* ── BACK FACE — starts edge-on (90deg), rotates to flat with delay ── */}
        <div
          className={`absolute inset-0 rounded-2xl border bg-[var(--color-surface)] overflow-hidden ${borderClass}`}
          style={{
            transform: flipped ? "rotateY(0deg)" : "rotateY(90deg)",
            transition: flipped ? "transform 0.15s ease-out 0.15s" : "transform 0.15s ease-in",
            pointerEvents: flipped ? "auto" : "none",
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={tintStyle} />

          <div className="relative z-10 flex flex-col h-full p-2">

            {/* Sliders — fill available height, centred */}
            <div className="flex-1 flex flex-col justify-around min-h-0">
              {hasBrightness && (
                <div className="flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-white/30 shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={255}
                    value={displayBrightness}
                    disabled={!isOn}
                    aria-label="Brightness"
                    onChange={(e) => handleBrightness(Number(e.target.value))}
                  />
                </div>
              )}
              {hasColorTemp && (
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-white/30 shrink-0" />
                  <input
                    type="range"
                    min={minKelvin}
                    max={maxKelvin}
                    value={displayColorTemp}
                    disabled={!isOn}
                    aria-label="Colour temperature"
                    onChange={(e) => handleColorTemp(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Bottom row: palette (left, RGB only) + flip-back (right) */}
            <div className="flex items-center justify-between shrink-0">
              {hasRgb ? (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); colorInputRef.current?.click(); }}
                    aria-label="Pick colour"
                    className="p-1 rounded-lg text-white/20 hover:text-white/50 transition-colors"
                  >
                    <Palette className="h-3 w-3" />
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    defaultValue={rgbColor ? rgbToHex(...rgbColor) : "#ffffff"}
                    onChange={(e) => handleColorPick(e.target.value)}
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </>
              ) : (
                <span />
              )}
              <FlipBtn mirrored={true} onFlip={() => setFlipped(false)} />
            </div>

          </div>
        </div>

      </div>
    </InteractiveCard>
  );
}
