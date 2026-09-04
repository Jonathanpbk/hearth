import { useEntityStore } from "../../store/useEntityStore";

const DOT_COLOR = {
  connected: "bg-green-500",
  connecting: "bg-yellow-400 animate-pulse",
  disconnected: "bg-red-500",
} as const;

export function ConnectionStatus() {
  const status = useEntityStore((s) => s.connectionStatus);

  return (
    <div className="flex items-center gap-1.5" title={status}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${DOT_COLOR[status]}`} />
    </div>
  );
}
