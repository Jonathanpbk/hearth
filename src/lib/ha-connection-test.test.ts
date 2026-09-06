import { describe, expect, it, vi } from "vitest";
import { verifyHomeAssistantConnection } from "./ha-connection-test";

describe("Home Assistant connection test", () => {
  it("accepts the authenticated HA status response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "API running." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      verifyHomeAssistantConnection(
        " https://ha.example.com/ ",
        " token ",
        fetchMock
      )
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ha.example.com/api/",
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
        cache: "no-store",
      })
    );
  });

  it("rejects an HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    await expect(
      verifyHomeAssistantConnection("https://ha.example.com", "bad", fetchMock)
    ).rejects.toThrow("HTTP 401");
  });

  it("rejects a non-HA success response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html></html>", { status: 200 })
    );
    await expect(
      verifyHomeAssistantConnection("https://ha.example.com", "token", fetchMock)
    ).rejects.toThrow("did not return a Home Assistant response");
  });

  it("clears its timeout after failure", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      verifyHomeAssistantConnection("https://ha.example.com", "token", fetchMock)
    ).rejects.toThrow("offline");
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
