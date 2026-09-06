import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerPWAUpdates } from "./lib/pwa-registration";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

if (import.meta.env.PROD) registerPWAUpdates();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
