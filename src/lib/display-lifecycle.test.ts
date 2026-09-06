import { describe, expect, it } from "vitest";
import {
  DISPLAY_INTERACTION_GUARD_MS,
  shouldRunAutoDimTimer,
} from "./display-lifecycle";

describe("display lifecycle", () => {
  it("runs auto-dim only for a visible undimmed page", () => {
    expect(shouldRunAutoDimTimer(true, "visible", false)).toBe(true);
    expect(shouldRunAutoDimTimer(false, "visible", false)).toBe(false);
    expect(shouldRunAutoDimTimer(true, "hidden", false)).toBe(false);
    expect(shouldRunAutoDimTimer(true, "visible", true)).toBe(false);
  });

  it("keeps the wake interaction guard long enough for a touch sequence", () => {
    expect(DISPLAY_INTERACTION_GUARD_MS).toBeGreaterThanOrEqual(500);
  });
});
