import { Home, Globe } from "lucide-react";
import { useEntityStore } from "../../store/useEntityStore";

const DOT_COLOR = {
  connected: "bg-green-500",
  connecting: "bg-yellow-400 animate-pulse",
  disconnected: "bg-red-500",
} as const;

export function ConnectionStatus() {
  const status = useEntityStore((s) => s.connectionStatus);
  const source = useEntityStore((s) => s.activeHaUrl);

  return (
    <div className="flex items-center gap-1.5" title={`${status} (${source ?? "—"})`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${DOT_COLOR[status]}`} />
      {source === "local" && (
        <Home className="h-3.5 w-3.5 text-white/30" />
      )}
      {source === "remote" && (
        <Globe className="h-3.5 w-3.5 text-white/30" />
      )}
    </div>
  );
}
