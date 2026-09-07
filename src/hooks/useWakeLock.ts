import { useEffect, useRef } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import {
  getWakeLockRetryDelay,
  requestWakeLock,
  releaseWakeLock,
} from "../lib/wakeLock";
import { useDiagnosticsStore } from "../store/useDiagnosticsStore";

export function useWakeLock(): void {
  const wakeLockEnabled = useSettingsStore((s) => s.settings.wakeLockEnabled);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const setWakeLockStatus = useDiagnosticsStore.getState().setWakeLockStatus;

    if (!wakeLockEnabled) {
      releaseWakeLock(sentinelRef.current);
      sentinelRef.current = null;
      setWakeLockStatus("disabled");
      return;
    }

    if (!("wakeLock" in navigator)) {
      setWakeLockStatus("unsupported");
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
      setWakeLockStatus("retrying");
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void acquire();
      }, delay);
    }

    function handleRelease(event: Event) {
      const released = event.currentTarget as WakeLockSentinel;
      released.removeEventListener("release", handleRelease);
      if (sentinelRef.current === released) sentinelRef.current = null;
      setWakeLockStatus("retrying");
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
      setWakeLockStatus("requesting");
      const acquired = await requestWakeLock();
      requestInFlight = false;

      if (!active || !isVisible()) {
        releaseWakeLock(acquired);
        if (active) setWakeLockStatus("paused");
        return;
      }

      if (!acquired || acquired.released) {
        scheduleRetry();
        return;
      }

      retryAttempt = 0;
      sentinelRef.current = acquired;
      setWakeLockStatus("active");
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
        setWakeLockStatus("paused");
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
