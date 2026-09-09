export const DREO_CUSTOM_OSC_DELAY_MIN = 1;
export const DREO_CUSTOM_OSC_DELAY_MAX = 20;

export function clampDreoCustomOscillationDelay(value: number): number {
  return Math.min(
    DREO_CUSTOM_OSC_DELAY_MAX,
    Math.max(DREO_CUSTOM_OSC_DELAY_MIN, Math.round(value))
  );
}

export function shouldStopDreoCustomOscillation({
  fanState,
  customOscillationState,
  controlsBlocked,
}: {
  fanState: string | undefined;
  customOscillationState: string | undefined;
  controlsBlocked: boolean;
}): boolean {
  return (
    !controlsBlocked &&
    fanState === "off" &&
    customOscillationState === "on"
  );
}
