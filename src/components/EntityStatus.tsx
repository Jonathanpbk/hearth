import type { ConnectionStatus } from "../types/ha";
import type { EntityBlockReason } from "../lib/entity-state";
import { useEntityStore } from "../store/useEntityStore";

export function EntityStatusBadge({ reason }: { reason: EntityBlockReason | null }) {
  if (!reason) return null;

  return (
    <span className="absolute right-2 top-2 z-20 rounded-full border border-white/[0.08] bg-black/40 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/50">
      {reason}
    </span>
  );
}

export function EntityFallbackCard({
  entityId,
  titleOverride,
  connectionStatus,
}: {
  entityId: string;
  titleOverride?: string;
  connectionStatus: ConnectionStatus;
}) {
  const hasLoadedEntities = useEntityStore((state) => state.hasLoadedEntities);
  let reason = "Entity not found";
  if (connectionStatus === "connecting") reason = "Connecting";
  else if (connectionStatus === "disconnected") reason = "Disconnected";
  else if (!hasLoadedEntities) reason = "Loading";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-[var(--color-surface)] p-4 opacity-60">
      <p className="truncate text-[11px] font-medium uppercase tracking-widest text-white/40">
        {titleOverride ?? entityId}
      </p>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs font-medium text-white/35">{reason}</p>
      </div>
    </div>
  );
}
