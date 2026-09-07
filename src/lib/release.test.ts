import { describe, expect, it } from "vitest";
import { formatRelease, shortCommit } from "./release";

describe("release identity", () => {
  it("formats a release with a short commit", () => {
    expect(
      formatRelease({ version: "1.0.0", commit: "0123456789abcdef" })
    ).toBe("v1.0.0 (0123456)");
  });

  it("keeps the development build label", () => {
    expect(shortCommit("development")).toBe("development");
  });
});
