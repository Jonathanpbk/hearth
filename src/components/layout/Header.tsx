import { Settings, Download, Pencil, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConnectionStatus } from "./ConnectionStatus";
import { ClockWidget } from "../widgets/ClockWidget";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import { useDashboardStore } from "../../store/useDashboardStore";

export function Header() {
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();
  const editMode = useDashboardStore((s) => s.editMode);
  const setEditMode = useDashboardStore((s) => s.setEditMode);

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

      {/* Right — connection + edit + install + settings */}
      <div className="flex items-center gap-3">
        <ConnectionStatus />

        {/* Edit mode toggle */}
        <button
          onClick={() => setEditMode(!editMode)}
          className={`p-1.5 rounded-lg transition-colors ${
            editMode
              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
          }`}
          aria-label={editMode ? "Exit edit mode" : "Edit dashboard"}
        >
          {editMode ? (
            <Check className="h-4 w-4" />
          ) : (
            <Pencil className="h-4 w-4" />
          )}
        </button>

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
