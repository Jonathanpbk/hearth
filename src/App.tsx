import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSettingsStore } from "./store/useSettingsStore";
import { initConnection, stopConnection } from "./lib/ha-connection";
import { useWakeLock } from "./hooks/useWakeLock";
import { useCameraEvent } from "./hooks/useCameraEvent";
import { CameraOverlay } from "./components/camera/CameraOverlay";
import { DimOverlay } from "./components/DimOverlay";
import { ServiceErrorToast } from "./components/ServiceErrorToast";
import { RuntimeLoading } from "./components/RuntimeLoading";
import { DimManager } from "./components/DimManager";

const DashboardView = lazy(() =>
  import("./views/DashboardView").then((module) => ({ default: module.DashboardView }))
);
const SettingsView = lazy(() =>
  import("./views/SettingsView").then((module) => ({ default: module.SettingsView }))
);

function HAConnectionManager() {
  const haUrl = useSettingsStore((s) => s.settings.haUrl);
  const haToken = useSettingsStore((s) => s.settings.haToken);

  useEffect(() => {
    void initConnection(haUrl, haToken);
    return stopConnection;
  }, [haUrl, haToken]);

  return null;
}

function RequireConfig({ children }: { children: ReactNode }) {
  const settings = useSettingsStore((s) => s.settings);
  const isConfigured = !!(settings.haToken && settings.haUrl);
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

export default function App() {
  return (
    <BrowserRouter>
      <HAConnectionManager />
      <WakeLockManager />
      <CameraEventManager />
      <DimManager />
      <div data-app-content style={{ display: "contents" }}>
        <Suspense fallback={<RuntimeLoading />}>
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
        </Suspense>
        <CameraOverlay />
        <ServiceErrorToast />
      </div>
      <DimOverlay />
    </BrowserRouter>
  );
}
