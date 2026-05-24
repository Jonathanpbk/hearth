import { Settings, Download, Pencil, Check, Megaphone } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectionStatus } from "./ConnectionStatus";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import { useDashboardStore } from "../../store/useDashboardStore";
import { getConnection } from "../../lib/ha-connection";
import { callService } from "../../lib/ha-service";

const QUICK_ACTIONS = [
  { label: "Stop dogs!", entityId: "script.dogstop" },
  { label: "Answer phone!", entityId: "script.answer" },
];

export function Header() {
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();
  const editMode = useDashboardStore((s) => s.editMode);
  const setEditMode = useDashboardStore((s) => s.setEditMode);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function runScript(entityId: string) {
    try {
      callService(getConnection(), "script", "turn_on", { entity_id: entityId });
    } catch { /* connection not ready */ }
    setMenuOpen(false);
  }

  return (
    <header className="relative flex items-center justify-between h-14 px-4 shrink-0 border-b border-white/[0.06] bg-[var(--color-surface)]">
      {/* Left — flame + wordmark */}
      <div className="flex items-center gap-1.5 select-none">
        <img src="/images/hearth-logo.png" alt="Hearth" className="h-7 w-7 object-contain" />
        <span className="text-sm font-semibold tracking-wide text-white">Hearth</span>
      </div>

      {/* Right — connection + edit + install + settings */}
      <div className="flex items-center gap-3">
        {/* Quick-action megaphone */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`p-1.5 rounded-lg transition-colors ${
              menuOpen
                ? "bg-[#ffc174]/15 text-[#ffc174]"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
            }`}
            aria-label="Quick actions"
          >
            <Megaphone className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-white/[0.08] shadow-xl overflow-hidden"
              style={{ background: "#3a3a3c" }}>
              {QUICK_ACTIONS.map(({ label, entityId }) => (
                <button
                  key={entityId}
                  onClick={() => runScript(entityId)}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ConnectionStatus />

        {/* Edit mode toggle */}
        <button
          onClick={() => setEditMode(!editMode)}
          className={`p-1.5 rounded-lg transition-colors ${
            editMode
              ? "bg-[#ffc174]/15 text-[#ffc174] hover:bg-[#ffc174]/25"
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
