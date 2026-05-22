import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { toggle, setBrightness, setColorTemp } from "../../lib/ha-service";
import { interactiveCardClass } from "../../lib/styles";

interface Props {
  entityId: string;
}

export function LightCard({ entityId }: Props) {
  const entity = useHAEntity(entityId);
  const [expanded, setExpanded] = useState(false);
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColorTemp, setLocalColorTemp] = useState<number | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTempTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
      if (colorTempTimer.current) clearTimeout(colorTempTimer.current);
    };
  }, []);

  // Reset local slider state when panel closes so entity value takes over
  useEffect(() => {
    if (!expanded) {
      setLocalBrightness(null);
      setLocalColorTemp(null);
    }
  }, [expanded]);

  if (!entity) return null;

  const isOn = entity.state === "on";
  const attrs = entity.attributes;
  const name = (attrs.friendly_name as string | undefined) ?? entityId;

  const brightness = attrs.brightness as number | undefined;
  const displayBrightness = localBrightness ?? brightness;
  const brightnessPercent =
    displayBrightness != null ? Math.round((displayBrightness / 255) * 100) : null;

  const rgbColor = attrs.rgb_color as [number, number, number] | undefined;
  const colorTempKelvin = attrs.color_temp_kelvin as number | undefined;
  const displayColorTemp = localColorTemp ?? colorTempKelvin;
  const minKelvin = (attrs.min_color_temp_kelvin as number | undefined) ?? 2000;
  const maxKelvin = (attrs.max_color_temp_kelvin as number | undefined) ?? 6500;

  const supportedModes =
    (attrs.supported_color_modes as string[] | undefined) ?? [];
  const hasBrightness = supportedModes.some(
    (m) => m !== "onoff" && m !== "unknown"
  );
  const hasColorTemp = supportedModes.includes("color_temp");
  const hasControls = hasBrightness || hasColorTemp;

  const tintStyle =
    isOn && rgbColor
      ? {
          backgroundColor: `rgba(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]}, 0.08)`,
        }
      : undefined;

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    void toggle(getConnection(), entityId);
  }

  function handleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((v) => !v);
  }

  function handleBrightness(value: number) {
    setLocalBrightness(value);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => {
      void setBrightness(getConnection(), entityId, value);
    }, 150);
  }

  function handleColorTemp(value: number) {
    setLocalColorTemp(value);
    if (colorTempTimer.current) clearTimeout(colorTempTimer.current);
    colorTempTimer.current = setTimeout(() => {
      void setColorTemp(getConnection(), entityId, value);
    }, 150);
  }

  return (
    <div
      onClick={handleToggle}
      className={`${interactiveCardClass} ${!isOn ? "opacity-50" : ""}`}
      style={tintStyle}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {isOn
              ? brightnessPercent != null
                ? `${brightnessPercent}%`
                : "On"
              : "Off"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {isOn && hasControls && (
            <button
              onClick={handleExpand}
              aria-label="Adjust brightness"
              className={`p-1 rounded-md transition-colors ${
                expanded
                  ? "text-white/70 bg-white/10"
                  : "text-white/25 hover:text-white/60"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
          {/* On/off indicator dot */}
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              isOn ? "bg-white" : "bg-white/20"
            }`}
          />
        </div>
      </div>

      {/* Expanded controls — stop propagation so slider drags don't toggle */}
      {expanded && isOn && (
        <div
          className="mt-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {hasBrightness && displayBrightness != null && (
            <div>
              <p className="text-[11px] text-white/30 mb-1.5 uppercase tracking-widest">
                Brightness
              </p>
              <input
                type="range"
                min={1}
                max={255}
                value={displayBrightness}
                onChange={(e) => handleBrightness(Number(e.target.value))}
              />
            </div>
          )}
          {hasColorTemp && displayColorTemp != null && (
            <div>
              <p className="text-[11px] text-white/30 mb-1.5 uppercase tracking-widest">
                Colour temp · {displayColorTemp}K
              </p>
              <input
                type="range"
                min={minKelvin}
                max={maxKelvin}
                value={displayColorTemp}
                onChange={(e) => handleColorTemp(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
