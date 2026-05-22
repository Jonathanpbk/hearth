import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSettingsStore } from "./store/useSettingsStore";
import { initConnection } from "./lib/ha-connection";
import { useWakeLock } from "./hooks/useWakeLock";
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

export default function App() {
  return (
    <BrowserRouter>
      <HAConnectionManager />
      <WakeLockManager />
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
    </BrowserRouter>
  );
}
