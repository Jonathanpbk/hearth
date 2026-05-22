export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!("wakeLock" in navigator)) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export function releaseWakeLock(sentinel: WakeLockSentinel | null): void {
  if (sentinel && !sentinel.released) {
    void sentinel.release();
  }
}
