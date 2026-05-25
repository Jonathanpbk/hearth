import { useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSettingsStore } from "./store/useSettingsStore";
import { useDimStore } from "./store/useDimStore";
import { initConnection } from "./lib/ha-connection";
import { useWakeLock } from "./hooks/useWakeLock";
import { useCameraEvent } from "./hooks/useCameraEvent";
import { CameraOverlay } from "./components/camera/CameraOverlay";
import { DimOverlay } from "./components/DimOverlay";
import { DashboardView } from "./views/DashboardView";
import { SettingsView } from "./views/SettingsView";

function HAConnectionManager() {
  const haLocalUrl = useSettingsStore((s) => s.settings.haLocalUrl);
  const haRemoteUrl = useSettingsStore((s) => s.settings.haRemoteUrl);
  const haToken = useSettingsStore((s) => s.settings.haToken);

  useEffect(() => {
    void initConnection(haLocalUrl, haRemoteUrl, haToken);
  }, [haLocalUrl, haRemoteUrl, haToken]);

  return null;
}

function RequireConfig({ children }: { children: ReactNode }) {
  const settings = useSettingsStore((s) => s.settings);
  const isConfigured = !!(
    settings.haToken &&
    (settings.haLocalUrl || settings.haRemoteUrl)
  );
  if (!isConfigured) return <Navigate to="/settings" replace />;
  return <>{children}</>;
}

function WakeLockManager() {
  useWakeLock();
  return null;
}

function CameraEventManager() {
  useCameraEvent();
  return null;
}

function DimManager() {
  const autoDim = useSettingsStore((s) => s.settings.autoDim);
  const dimTimeout = useSettingsStore((s) => s.settings.dimTimeout);
  const dim = useDimStore((s) => s.dim);
  const undim = useDimStore((s) => s.undim);
  const isDimmed = useDimStore((s) => s.isDimmed);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDimmedRef = useRef(isDimmed);
  isDimmedRef.current = isDimmed;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dim(), dimTimeout * 1000);
  }, [dim, dimTimeout]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  // Enable/disable dim system based on settings
  useEffect(() => {
    if (!autoDim) {
      clearTimer();
      undim();
      return;
    }
    startTimer();
    return clearTimer;
  }, [autoDim, startTimer, clearTimer, undim]);

  // Reset timer on user activity — only when not currently dimmed
  // (dimmed state is cleared by DimOverlay which restarts the timer via the effect below)
  useEffect(() => {
    if (!autoDim) return;
    const events = ["touchstart", "mousemove", "keydown"] as const;
    function onActivity() {
      if (!isDimmedRef.current) startTimer();
    }
    events.forEach((ev) => document.addEventListener(ev, onActivity, { passive: true }));
    return () => events.forEach((ev) => document.removeEventListener(ev, onActivity));
  }, [autoDim, startTimer]);

  // When screen undims (DimOverlay cleared it), restart the timer
  useEffect(() => {
    if (!autoDim) return;
    if (!isDimmed) startTimer();
  }, [isDimmed, autoDim, startTimer]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <HAConnectionManager />
      <WakeLockManager />
      <CameraEventManager />
      <DimManager />
      <Routes>
        <Route
          path="/"
          element={
            <RequireConfig>
              <DashboardView />
            </RequireConfig>
          }
        />
        <Route path="/settings" element={<SettingsView />} />
<Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DimOverlay />
      <CameraOverlay />
    </BrowserRouter>
  );
}
