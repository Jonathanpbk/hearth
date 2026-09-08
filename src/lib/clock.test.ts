import { describe, expect, it } from "vitest";
import { millisecondsUntilNextMinute } from "./clock";

describe("clock refresh timing", () => {
  it("refreshes on the next minute boundary", () => {
    expect(millisecondsUntilNextMinute(Date.parse("2026-09-08T09:15:00.000Z"))).toBe(
      60_000
    );
    expect(millisecondsUntilNextMinute(Date.parse("2026-09-08T09:15:42.250Z"))).toBe(
      17_750
    );
  });
});
