export const WAKE_LOCK_RETRY_DELAYS_MS = [1000, 5000, 15000, 30000] as const;

export interface WakeLockRequester {
  request: (type: "screen") => Promise<WakeLockSentinel>;
}

export function getWakeLockRetryDelay(attempt: number): number {
  const safeAttempt = Number.isFinite(attempt) ? attempt : 0;
  const index = Math.min(
    Math.max(0, Math.floor(safeAttempt)),
    WAKE_LOCK_RETRY_DELAYS_MS.length - 1
  );
  return WAKE_LOCK_RETRY_DELAYS_MS[index];
}

export async function requestWakeLock(
  requester?: WakeLockRequester | null
): Promise<WakeLockSentinel | null> {
  const source =
    requester === undefined
      ? "wakeLock" in navigator
        ? navigator.wakeLock
        : null
      : requester;
  if (!source) return null;
  try {
    return await source.request("screen");
  } catch {
    return null;
  }
}

export function releaseWakeLock(sentinel: WakeLockSentinel | null): void {
  if (sentinel && !sentinel.released) {
    try {
      void sentinel.release().catch(() => undefined);
    } catch {
      // A released or invalidated sentinel needs no further cleanup.
    }
  }
}
