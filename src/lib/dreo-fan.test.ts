import { describe, expect, it } from "vitest";
import {
  clampDreoCustomOscillationDelay,
  DREO_CUSTOM_OSC_DELAY_MAX,
  DREO_CUSTOM_OSC_DELAY_MIN,
  shouldStopDreoCustomOscillation,
} from "./dreo-fan";

describe("Dreo fan helpers", () => {
  it("allows custom oscillation delays from 1 through 20 seconds", () => {
    expect(DREO_CUSTOM_OSC_DELAY_MIN).toBe(1);
    expect(DREO_CUSTOM_OSC_DELAY_MAX).toBe(20);
    expect(clampDreoCustomOscillationDelay(0)).toBe(1);
    expect(clampDreoCustomOscillationDelay(12.6)).toBe(13);
    expect(clampDreoCustomOscillationDelay(25)).toBe(20);
  });

  it("stops stale custom oscillation when the fan is off", () => {
    expect(
      shouldStopDreoCustomOscillation({
        fanState: "off",
        customOscillationState: "on",
        controlsBlocked: false,
      })
    ).toBe(true);

    expect(
      shouldStopDreoCustomOscillation({
        fanState: "on",
        customOscillationState: "on",
        controlsBlocked: false,
      })
    ).toBe(false);

    expect(
      shouldStopDreoCustomOscillation({
        fanState: "off",
        customOscillationState: "on",
        controlsBlocked: true,
      })
    ).toBe(false);
  });
});
