export const LIGHT_HOLD_DURATION_MS = 500;
export const LIGHT_DRAG_THRESHOLD_PX = 8;
export const LIGHT_UPDATE_DEBOUNCE_MS = 150;
export const LIGHT_PRESET_HOLD_DURATION_MS = 650;
export const LIGHT_PRESET_COUNT = 5;

const RGB_LIGHT_COLOR_MODES = new Set(["rgb", "rgbw", "rgbww", "hs", "xy"]);

export type RgbColor = [number, number, number];
export type LocalColorOverride = "rgb" | "color_temp";

export function isRgbLightColorMode(mode: string | undefined): boolean {
  return mode !== undefined && RGB_LIGHT_COLOR_MODES.has(mode);
}

export function localColorOverrideToClear(
  previousMode: string | undefined,
  currentMode: string | undefined
): LocalColorOverride | null {
  if (!currentMode || currentMode === previousMode) return null;
  if (currentMode === "color_temp") return "rgb";
  if (isRgbLightColorMode(currentMode)) return "color_temp";
  return null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pointerXToBrightness(
  clientX: number,
  left: number,
  width: number
): number {
  if (width <= 0) return 0;
  const ratio = clamp((clientX - left) / width, 0, 1);
  if (ratio === 0) return 0;
  return clamp(Math.round(ratio * 255), 1, 255);
}

export function brightnessToPercent(brightness: number): number {
  return Math.round((clamp(brightness, 0, 255) / 255) * 100);
}

export function kelvinToRgb(
  kelvin: number,
  minKelvin = 2200,
  maxKelvin = 6500
): RgbColor {
  const range = Math.max(1, maxKelvin - minKelvin);
  const ratio = clamp((kelvin - minKelvin) / range, 0, 1);
  return [255, Math.round(190 + ratio * 61), Math.round(120 + ratio * 135)];
}

export function resolveLightDisplayColor({
  localColorTemp,
  localRgb,
  colorMode,
  entityRgb,
  colorTemp,
  minKelvin,
  maxKelvin,
}: {
  localColorTemp: number | null;
  localRgb: RgbColor | null;
  colorMode: string | undefined;
  entityRgb: RgbColor | undefined;
  colorTemp: number;
  minKelvin: number;
  maxKelvin: number;
}): RgbColor {
  if (localColorTemp !== null) {
    return kelvinToRgb(localColorTemp, minKelvin, maxKelvin);
  }
  if (localRgb) return localRgb;
  if (colorMode === "color_temp") {
    return kelvinToRgb(colorTemp, minKelvin, maxKelvin);
  }
  return entityRgb ?? kelvinToRgb(colorTemp, minKelvin, maxKelvin);
}

export function rgbToHex([red, green, blue]: RgbColor): string {
  return `#${[red, green, blue]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToRgb(hex: string): RgbColor | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

export function hsvToRgb(hue: number, saturation: number): RgbColor {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = clamp(saturation, 0, 100) / 100;
  const chroma = normalizedSaturation;
  const section = normalizedHue / 60;
  const intermediate = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, intermediate];
  else if (section < 2) [red, green] = [intermediate, chroma];
  else if (section < 3) [green, blue] = [chroma, intermediate];
  else if (section < 4) [green, blue] = [intermediate, chroma];
  else if (section < 5) [red, blue] = [intermediate, chroma];
  else [red, blue] = [chroma, intermediate];

  const valueOffset = 1 - chroma;
  return [red, green, blue].map((channel) =>
    Math.round((channel + valueOffset) * 255)
  ) as RgbColor;
}

export function rgbToHsv([red, green, blue]: RgbColor): {
  hue: number;
  saturation: number;
} {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;

  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }

  if (hue < 0) hue += 360;
  const saturation = max === 0 ? 0 : delta / max;

  return {
    hue: Math.round(hue),
    saturation: Math.round(clamp(saturation, 0, 1) * 100),
  };
}

export function normalizePresetColor(value: string): string | null {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}
