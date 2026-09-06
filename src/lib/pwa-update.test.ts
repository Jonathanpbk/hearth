import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestPwaVersion, findEntryBundle } from "./pwa-update";

describe("PWA version helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds the loaded Hearth entry bundle", () => {
    expect(
      findEntryBundle([
        "https://hearth.example/assets/vendor-AbCd.js",
        "https://hearth.example/assets/index-mfulpRPs.js",
      ])
    ).toBe("assets/index-mfulpRPs.js");
  });

  it("handles query strings and missing entry bundles", () => {
    expect(findEntryBundle(["/assets/index-new_build.js?v=2"]))
      .toBe("assets/index-new_build.js");
    expect(findEntryBundle(["/assets/DashboardView-test.js"]))
      .toBeNull();
  });

  it("requests the network-only build version", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "assets/index-latest.js" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchLatestPwaVersion()).resolves.toEqual({
      version: "assets/index-latest.js",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/version\.json\?check=\d+$/),
      { cache: "no-store" }
    );
  });

  it("rejects an invalid version response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    await expect(fetchLatestPwaVersion()).rejects.toThrow(
      "Version response is invalid"
    );
  });
});
