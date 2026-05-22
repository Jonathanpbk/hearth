import { useEffect, useRef } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { requestWakeLock, releaseWakeLock } from "../lib/wakeLock";

export function useWakeLock(): void {
  const wakeLockEnabled = useSettingsStore((s) => s.settings.wakeLockEnabled);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!wakeLockEnabled) {
      releaseWakeLock(sentinelRef.current);
      sentinelRef.current = null;
      return;
    }

    async function acquire() {
      sentinelRef.current = await requestWakeLock();
    }

    void acquire();

    // The OS releases the wake lock whenever the tab goes hidden.
    // Re-acquire it as soon as the tab becomes visible again.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock(sentinelRef.current);
      sentinelRef.current = null;
    };
  }, [wakeLockEnabled]);
}
