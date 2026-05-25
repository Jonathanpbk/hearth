import { useState, useRef, useEffect } from "react";
import { RotateCcw, Sun, Thermometer } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { toggle, setBrightness, setColorTemp } from "../../lib/ha-service";
import { skeletonCardClass } from "../../lib/styles";

interface Props {
  entityId: string;
  titleOverride?: string;
}

function kelvinToRgb(k: number): [number, number, number] {
  const t = Math.max(2000, Math.min(6500, k));
  if (t <= 4000) {
    const s = (t - 2000) / 2000;
    return [255, Math.round(175 + s * 69), Math.round(90 + s * 130)];
  }
  const s = (t - 4000) / 2500;
  return [Math.round(255 - s * 37), Math.round(244 - s * 11), Math.round(220 + s * 35)];
}

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

  const [r, g, b] = kelvinToRgb(displayColorTemp);
  const brightFactor = displayBrightness / 255;
  const tintAlpha = isOn ? 0.07 + brightFactor * 0.16 : 0;

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

  const borderClass = isOn ? "border-white/[0.12]" : "border-white/[0.06]";

  return (
    <div className="h-full" style={{ perspective: "900px" }}>
      <div
        style={{
          position: "relative",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.4s ease",
          borderRadius: "1rem",
          ...glowStyle,
        }}
      >

        {/* ── FRONT FACE ─────────────────────────────────────────────────────── */}
        <div
          className={`absolute inset-0 rounded-2xl border bg-[var(--color-surface)] overflow-hidden cursor-pointer ${borderClass}`}
          style={{ backfaceVisibility: "hidden", pointerEvents: flipped ? "none" : "auto" }}
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

        {/* ── BACK FACE ──────────────────────────────────────────────────────── */}
        <div
          className={`absolute inset-0 rounded-2xl border bg-[var(--color-surface)] overflow-hidden ${borderClass}`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
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

            {/* Flip-back — bottom right */}
            <div className="flex justify-end shrink-0">
              <FlipBtn mirrored={true} onFlip={() => setFlipped(false)} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
