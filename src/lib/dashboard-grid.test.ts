import { describe, expect, it } from "vitest";
import {
  computeDashboardRowHeight,
  getDashboardItemPlacement,
  getDashboardRowCount,
} from "./dashboard-grid";

describe("dashboard grid", () => {
  it("matches the existing ten-row tablet sizing", () => {
    expect(computeDashboardRowHeight(800)).toBe(58);
    expect(computeDashboardRowHeight(500)).toBe(50);
  });

  it("preserves stored positions in the view-only CSS grid", () => {
    expect(
      getDashboardItemPlacement({ i: "light", x: 4, y: 2, w: 3, h: 2 })
    ).toEqual({
      gridColumn: "5 / span 3",
      gridRow: "3 / span 2",
    });
  });

  it("ends the view grid at the lowest placed card", () => {
    expect(getDashboardRowCount([])).toBe(0);
    expect(
      getDashboardRowCount([
        { i: "sensor", x: 0, y: 11, w: 4, h: 3 },
      ])
    ).toBe(14);
  });
});
