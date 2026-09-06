import { useCallback, useEffect, useRef } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useDimStore } from "../store/useDimStore";
import {
  DISPLAY_INTERACTION_GUARD_MS,
  shouldRunAutoDimTimer,
} from "../lib/display-lifecycle";

export function DimManager() {
  const autoDim = useSettingsStore((s) => s.settings.autoDim);
  const dimTimeout = useSettingsStore((s) => s.settings.dimTimeout);
  const dim = useDimStore((s) => s.dim);
  const undim = useDimStore((s) => s.undim);
  const isDimmed = useDimStore((s) => s.isDimmed);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDimmedRef = useRef(isDimmed);
  const wasDimmedRef = useRef(isDimmed);
  isDimmedRef.current = isDimmed;

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (
      !shouldRunAutoDimTimer(
        autoDim,
        document.visibilityState,
        isDimmedRef.current
      )
    ) {
      return;
    }
    timerRef.current = setTimeout(() => dim(), dimTimeout * 1000);
  }, [autoDim, clearTimer, dim, dimTimeout]);

  const guardInteractions = useCallback(() => {
    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    document.body.setAttribute("data-display-guard", "true");
    guardTimerRef.current = setTimeout(() => {
      guardTimerRef.current = null;
      if (!useDimStore.getState().isDimmed) {
        document.body.removeAttribute("data-display-guard");
      }
    }, DISPLAY_INTERACTION_GUARD_MS);
  }, []);

  useEffect(() => {
    if (!autoDim) {
      clearTimer();
      undim();
      return;
    }
    startTimer();
    return clearTimer;
  }, [autoDim, clearTimer, startTimer, undim]);

  useEffect(() => {
    if (!autoDim) return;
    const events = ["pointerdown", "mousemove", "keydown"] as const;
    function onActivity() {
      if (
        document.visibilityState === "visible" &&
        !isDimmedRef.current
      ) {
        startTimer();
      }
    }
    events.forEach((event) =>
      document.addEventListener(event, onActivity, { passive: true })
    );
    return () =>
      events.forEach((event) => document.removeEventListener(event, onActivity));
  }, [autoDim, startTimer]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        clearTimer();
        return;
      }

      guardInteractions();
      undim();
      startTimer();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearTimer, guardInteractions, startTimer, undim]);

  useEffect(() => {
    if (isDimmed) {
      if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
      document.body.setAttribute("data-display-guard", "true");
    } else if (wasDimmedRef.current) {
      guardInteractions();
      startTimer();
    }
    wasDimmedRef.current = isDimmed;
  }, [guardInteractions, isDimmed, startTimer]);

  useEffect(
    () => () => {
      clearTimer();
      if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
      document.body.removeAttribute("data-display-guard");
    },
    [clearTimer]
  );

  return null;
}
