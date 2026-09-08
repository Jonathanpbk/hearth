import { describe, expect, it } from "vitest";
import {
  brightnessToPercent,
  hexToRgb,
  hsvToRgb,
  kelvinToRgb,
  normalizePresetColor,
  pointerXToBrightness,
  resolveLightDisplayColor,
  rgbToHex,
  rgbToHsv,
} from "./light-controls";

describe("light controls", () => {
  it("maps horizontal pointer position to the full brightness range", () => {
    expect(pointerXToBrightness(100, 100, 400)).toBe(0);
    expect(pointerXToBrightness(300, 100, 400)).toBe(128);
    expect(pointerXToBrightness(500, 100, 400)).toBe(255);
    expect(pointerXToBrightness(50, 100, 400)).toBe(0);
    expect(pointerXToBrightness(600, 100, 400)).toBe(255);
    expect(brightnessToPercent(128)).toBe(50);
  });

  it("converts RGB, hex, and HSV values without losing primary colours", () => {
    expect(rgbToHex([255, 0, 128])).toBe("#ff0080");
    expect(hexToRgb("#ff0080")).toEqual([255, 0, 128]);
    expect(hexToRgb("not-a-colour")).toBeNull();
    expect(hsvToRgb(0, 100)).toEqual([255, 0, 0]);
    expect(hsvToRgb(120, 100)).toEqual([0, 255, 0]);
    expect(hsvToRgb(0, 0)).toEqual([255, 255, 255]);
    expect(rgbToHsv([0, 0, 255])).toEqual({ hue: 240, saturation: 100 });
  });

  it("normalizes preset colours and rejects malformed values", () => {
    expect(normalizePresetColor("#Aa00Ff")).toBe("#aa00ff");
    expect(normalizePresetColor("#123")).toBeNull();
  });

  it("keeps colour temperature tint within the RGB channel range", () => {
    expect(kelvinToRgb(2200, 2200, 6500)).toEqual([255, 190, 120]);
    expect(kelvinToRgb(6500, 2200, 6500)).toEqual([255, 251, 255]);
  });

  it("uses the newly selected colour mode for the card tint", () => {
    const base = {
      colorTemp: 3000,
      minKelvin: 2200,
      maxKelvin: 4000,
      entityRgb: [128, 64, 255] as [number, number, number],
    };

    expect(
      resolveLightDisplayColor({
        ...base,
        colorMode: "hs",
        localRgb: null,
        localColorTemp: 3500,
      })
    ).toEqual(kelvinToRgb(3500, 2200, 4000));
    expect(
      resolveLightDisplayColor({
        ...base,
        colorMode: "color_temp",
        localRgb: null,
        localColorTemp: null,
      })
    ).toEqual(kelvinToRgb(3000, 2200, 4000));
    expect(
      resolveLightDisplayColor({
        ...base,
        colorMode: "color_temp",
        localRgb: [255, 0, 0],
        localColorTemp: null,
      })
    ).toEqual([255, 0, 0]);
  });
});
