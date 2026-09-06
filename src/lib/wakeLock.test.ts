import { describe, expect, it, vi } from "vitest";
import {
  getWakeLockRetryDelay,
  releaseWakeLock,
  requestWakeLock,
} from "./wakeLock";

describe("wake lock helpers", () => {
  it("backs off repeated wake lock retries", () => {
    expect(getWakeLockRetryDelay(0)).toBe(1000);
    expect(getWakeLockRetryDelay(1)).toBe(5000);
    expect(getWakeLockRetryDelay(2)).toBe(15000);
    expect(getWakeLockRetryDelay(99)).toBe(30000);
  });

  it("returns null when wake lock is unavailable or rejected", async () => {
    await expect(requestWakeLock(null)).resolves.toBeNull();
    await expect(
      requestWakeLock({ request: vi.fn().mockRejectedValue(new Error("denied")) })
    ).resolves.toBeNull();
  });

  it("requests and releases an active screen lock", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const sentinel = {
      released: false,
      release,
    } as unknown as WakeLockSentinel;
    const request = vi.fn().mockResolvedValue(sentinel);

    await expect(requestWakeLock({ request })).resolves.toBe(sentinel);
    expect(request).toHaveBeenCalledWith("screen");
    releaseWakeLock(sentinel);
    expect(release).toHaveBeenCalledOnce();

    releaseWakeLock({
      released: true,
      release,
    } as unknown as WakeLockSentinel);
    expect(release).toHaveBeenCalledOnce();
  });
});
