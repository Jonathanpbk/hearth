export const DISPLAY_INTERACTION_GUARD_MS = 600;

export function shouldRunAutoDimTimer(
  autoDim: boolean,
  visibilityState: DocumentVisibilityState,
  isDimmed: boolean
): boolean {
  return autoDim && visibilityState === "visible" && !isDimmed;
}
