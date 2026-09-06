import { describe, expect, it } from "vitest";
import {
  RUNTIME_RECOVERY_COOLDOWN_MS,
  RUNTIME_RECOVERY_STORAGE_KEY,
  claimAutomaticRuntimeRecovery,
  getRuntimeRecoveryUrl,
  isChunkLoadError,
} from "./runtime-recovery";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("runtime recovery", () => {
  it("recognizes common lazy chunk failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: /assets/Settings.js"
        )
      )
    ).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 42 failed"))).toBe(true);
    expect(isChunkLoadError(new Error("Failed to load module script"))).toBe(true);
    expect(isChunkLoadError(new Error("A component failed to render"))).toBe(false);
  });

  it("claims one automatic recovery inside the cooldown", () => {
    const storage = new MemoryStorage();
    const error = new Error("Importing a module script failed");
    const now = 1_000_000;

    expect(claimAutomaticRuntimeRecovery(error, storage, now)).toBe(true);
    expect(storage.getItem(RUNTIME_RECOVERY_STORAGE_KEY)).toBe(String(now));
    expect(claimAutomaticRuntimeRecovery(error, storage, now + 1_000)).toBe(
      false
    );
    expect(
      claimAutomaticRuntimeRecovery(
        error,
        storage,
        now + RUNTIME_RECOVERY_COOLDOWN_MS
      )
    ).toBe(true);
  });

  it("does not redirect for ordinary errors or while offline", () => {
    const storage = new MemoryStorage();

    expect(
      claimAutomaticRuntimeRecovery(new Error("Render failed"), storage)
    ).toBe(false);
    expect(
      claimAutomaticRuntimeRecovery(
        new Error("ChunkLoadError"),
        storage,
        Date.now(),
        false
      )
    ).toBe(false);
  });

  it("builds a same-origin recovery URL", () => {
    expect(getRuntimeRecoveryUrl(1234)).toBe(
      "/api/pwa-update.html?runtime-recovery=1234"
    );
  });
});
