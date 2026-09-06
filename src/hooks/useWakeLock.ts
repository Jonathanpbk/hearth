import { useEffect, useRef } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import {
  getWakeLockRetryDelay,
  requestWakeLock,
  releaseWakeLock,
} from "../lib/wakeLock";

export function useWakeLock(): void {
  const wakeLockEnabled = useSettingsStore((s) => s.settings.wakeLockEnabled);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!wakeLockEnabled) {
      releaseWakeLock(sentinelRef.current);
      sentinelRef.current = null;
      return;
    }

    let active = true;
    let requestInFlight = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function isVisible() {
      return document.visibilityState === "visible";
    }

    function clearRetry() {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    }

    function scheduleRetry() {
      if (
        !active ||
        !isVisible() ||
        requestInFlight ||
        sentinelRef.current ||
        retryTimer
      ) {
        return;
      }

      const delay = getWakeLockRetryDelay(retryAttempt);
      retryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void acquire();
      }, delay);
    }

    function handleRelease(event: Event) {
      const released = event.currentTarget as WakeLockSentinel;
      released.removeEventListener("release", handleRelease);
      if (sentinelRef.current === released) sentinelRef.current = null;
      scheduleRetry();
    }

    async function acquire() {
      if (
        !active ||
        !isVisible() ||
        requestInFlight ||
        sentinelRef.current
      ) {
        return;
      }

      clearRetry();
      requestInFlight = true;
      const acquired = await requestWakeLock();
      requestInFlight = false;

      if (!active || !isVisible()) {
        releaseWakeLock(acquired);
        return;
      }

      if (!acquired || acquired.released) {
        scheduleRetry();
        return;
      }

      retryAttempt = 0;
      sentinelRef.current = acquired;
      acquired.addEventListener("release", handleRelease);
    }

    void acquire();

    function handleVisibilityChange() {
      if (!isVisible()) {
        clearRetry();
        const sentinel = sentinelRef.current;
        sentinelRef.current = null;
        sentinel?.removeEventListener("release", handleRelease);
        releaseWakeLock(sentinel);
        return;
      }

      retryAttempt = 0;
      void acquire();
    }

    function handlePageShow() {
      if (isVisible()) void acquire();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      active = false;
      clearRetry();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      const sentinel = sentinelRef.current;
      sentinel?.removeEventListener("release", handleRelease);
      releaseWakeLock(sentinel);
      sentinelRef.current = null;
    };
  }, [wakeLockEnabled]);
}
