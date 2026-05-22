import { Settings, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConnectionStatus } from "./ConnectionStatus";
import { ClockWidget } from "../widgets/ClockWidget";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";

export function Header() {
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();

  return (
    <header className="relative flex items-center justify-between h-14 px-4 shrink-0 border-b border-white/[0.06] bg-[var(--color-surface)]">
      {/* Left — wordmark */}
      <span className="text-sm font-semibold tracking-wide text-white select-none">
        Hearth
      </span>

      {/* Centre — clock */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ClockWidget />
      </div>

      {/* Right — connection status + install + settings */}
      <div className="flex items-center gap-3">
        <ConnectionStatus />
        {canInstall && (
          <button
            onClick={() => void install()}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            aria-label="Install app"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => navigate("/settings")}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
