import { useMemo, useRef, useState } from "react";
import { Plus, Sun, Thermometer } from "lucide-react";
import { Modal } from "../dashboard/Modal";
import {
  LIGHT_PRESET_COUNT,
  LIGHT_PRESET_HOLD_DURATION_MS,
  hsvToRgb,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  type RgbColor,
} from "../../lib/light-controls";
import { useSettingsStore } from "../../store/useSettingsStore";

interface Props {
  name: string;
  entityId: string;
  brightness: number;
  colorTemp: number;
  minKelvin: number;
  maxKelvin: number;
  rgbColor: RgbColor;
  hasBrightness: boolean;
  hasColorTemp: boolean;
  hasRgb: boolean;
  preferTemperature: boolean;
  disabled: boolean;
  onBrightnessChange: (value: number) => void;
  onBrightnessCommit: (value: number) => void;
  onColorTempChange: (value: number) => void;
  onRgbChange: (value: RgbColor) => void;
  onClose: () => void;
}

type DetailTab = "colour" | "temperature";

function PresetButton({
  index,
  color,
  disabled,
  onApply,
  onSave,
  onClear,
}: {
  index: number;
  color: string | null;
  disabled: boolean;
  onApply: () => void;
  onSave: () => void;
  onClear: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!color || disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    longPressRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      onClear();
    }, LIGHT_PRESET_HOLD_DURATION_MS);
  }

  function handleClick() {
    clearTimer();
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    if (color) onApply();
    else onSave();
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={
        color
          ? `Apply colour preset ${index + 1}, ${color}. Hold to clear.`
          : `Save colour preset ${index + 1}`
      }
      title={color ? "Hold to clear" : "Save current colour"}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
      onContextMenu={(event) => event.preventDefault()}
      onClick={handleClick}
      className="h-12 w-12 rounded-full border border-white/[0.14] flex items-center justify-center transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      style={color ? { backgroundColor: color } : undefined}
    >
      {!color && <Plus className="h-5 w-5 text-white/45" />}
    </button>
  );
}

export function LightControlsModal({
  name,
  entityId,
  brightness,
  colorTemp,
  minKelvin,
  maxKelvin,
  rgbColor,
  hasBrightness,
  hasColorTemp,
  hasRgb,
  preferTemperature,
  disabled,
  onBrightnessChange,
  onBrightnessCommit,
  onColorTempChange,
  onRgbChange,
  onClose,
}: Props) {
  const initialHsv = useMemo(() => rgbToHsv(rgbColor), [rgbColor]);
  const [hue, setHue] = useState(initialHsv.hue);
  const [saturation, setSaturation] = useState(initialHsv.saturation);
  const [selectedRgb, setSelectedRgb] = useState<RgbColor>(rgbColor);
  const [tab, setTab] = useState<DetailTab>(
    hasRgb && !preferTemperature ? "colour" : "temperature"
  );
  const savedPresets = useSettingsStore(
    (state) => state.settings.lightColorPresets[entityId]
  );
  const setLightColorPreset = useSettingsStore(
    (state) => state.setLightColorPreset
  );
  const presets = Array.from(
    { length: LIGHT_PRESET_COUNT },
    (_, index) => savedPresets?.[index] ?? null
  );

  function updateColour(nextHue: number, nextSaturation: number) {
    const rgb = hsvToRgb(nextHue, nextSaturation);
    setHue(nextHue);
    setSaturation(nextSaturation);
    setSelectedRgb(rgb);
    onRgbChange(rgb);
  }

  function updateColourFromHex(value: string) {
    const rgb = hexToRgb(value);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb);
    setHue(hsv.hue);
    setSaturation(hsv.saturation);
    setSelectedRgb(rgb);
    onRgbChange(rgb);
  }

  function applyPreset(color: string) {
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb);
    setHue(hsv.hue);
    setSaturation(hsv.saturation);
    setSelectedRgb(rgb);
    onRgbChange(rgb);
  }

  function clearPreset(index: number) {
    if (!window.confirm(`Clear colour preset ${index + 1}?`)) return;
    setLightColorPreset(entityId, index, null);
  }

  const selectedHex = rgbToHex(selectedRgb);
  const showTabs = hasRgb && hasColorTemp;

  return (
    <Modal title={`${name} controls`} onClose={onClose}>
      <div className="p-5 space-y-6">
        {hasBrightness && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="light-detail-brightness"
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <Sun className="h-4 w-4 text-white/35" />
                Brightness
              </label>
              <span className="text-sm tabular-nums text-white/50">
                {Math.round((brightness / 255) * 100)}%
              </span>
            </div>
            <input
              id="light-detail-brightness"
              type="range"
              min={0}
              max={255}
              value={brightness}
              disabled={disabled}
              aria-label="Light brightness"
              onChange={(event) => onBrightnessChange(Number(event.target.value))}
              onPointerUp={(event) => onBrightnessCommit(Number(event.currentTarget.value))}
              onKeyUp={(event) => onBrightnessCommit(Number(event.currentTarget.value))}
            />
          </section>
        )}

        {showTabs && (
          <div
            role="tablist"
            aria-label="Light colour mode"
            className="grid grid-cols-2 rounded-xl bg-black/20 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "colour"}
              onClick={() => setTab("colour")}
              className={`min-h-11 rounded-lg text-sm transition-colors ${
                tab === "colour" ? "bg-white/[0.1] text-white" : "text-white/45 hover:text-white/70"
              }`}
            >
              Colour
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "temperature"}
              onClick={() => setTab("temperature")}
              className={`min-h-11 rounded-lg text-sm transition-colors ${
                tab === "temperature" ? "bg-white/[0.1] text-white" : "text-white/45 hover:text-white/70"
              }`}
            >
              Temperature
            </button>
          </div>
        )}

        {hasRgb && (!showTabs || tab === "colour") && (
          <section className="space-y-5">
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={selectedHex}
                disabled={disabled}
                aria-label="Light colour picker"
                className="light-colour-picker h-14 w-14 shrink-0 rounded-full shadow-lg"
                onChange={(event) => updateColourFromHex(event.target.value)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/70">Colour</p>
                <p className="text-xs uppercase tabular-nums text-white/35">{selectedHex}</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs text-white/45">
                Hue
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={hue}
                  disabled={disabled}
                  aria-label="Colour hue"
                  className="light-hue-slider mt-1"
                  onChange={(event) => updateColour(Number(event.target.value), saturation)}
                />
              </label>
              <label className="block text-xs text-white/45">
                Saturation
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={saturation}
                  disabled={disabled}
                  aria-label="Colour saturation"
                  className="light-saturation-slider mt-1"
                  style={{ "--light-hue": hue } as React.CSSProperties}
                  onChange={(event) => updateColour(hue, Number(event.target.value))}
                />
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-white/35">Colour presets</p>
              <div className="flex items-center justify-between gap-2">
                {presets.map((preset, index) => (
                  <PresetButton
                    key={index}
                    index={index}
                    color={preset}
                    disabled={disabled}
                    onApply={() => preset && applyPreset(preset)}
                    onSave={() => setLightColorPreset(entityId, index, selectedHex)}
                    onClear={() => clearPreset(index)}
                  />
                ))}
              </div>
              <p className="text-xs text-white/30">
                Tap an empty slot to save. Hold a saved slot to clear it.
              </p>
            </div>
          </section>
        )}

        {hasColorTemp && (!showTabs || tab === "temperature") && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="light-detail-temperature"
                className="flex items-center gap-2 text-sm text-white/70"
              >
                <Thermometer className="h-4 w-4 text-white/35" />
                Temperature
              </label>
              <span className="text-sm tabular-nums text-white/50">{colorTemp} K</span>
            </div>
            <input
              id="light-detail-temperature"
              type="range"
              min={minKelvin}
              max={maxKelvin}
              value={colorTemp}
              disabled={disabled}
              aria-label="Light colour temperature"
              className="light-temperature-slider"
              onChange={(event) => onColorTempChange(Number(event.target.value))}
            />
          </section>
        )}

        {!hasBrightness && !hasColorTemp && !hasRgb && (
          <p className="text-sm text-white/45">This light only supports on and off control.</p>
        )}
      </div>
    </Modal>
  );
}
