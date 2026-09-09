import { describe, expect, it } from "vitest";
import { formatCompactDate, millisecondsUntilNextMinute } from "./clock";

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

describe("compact clock date", () => {
  it("uses abbreviated weekday and month without punctuation", () => {
    expect(formatCompactDate(new Date(2026, 8, 9))).toBe("Wed Sept 9");
    expect(formatCompactDate(new Date(2026, 0, 2))).toBe("Fri Jan 2");
  });
});
