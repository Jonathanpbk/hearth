import { useEffect, useState } from "react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { InteractiveCard } from "../InteractiveCard";
import { getConnection } from "../../lib/ha-connection";
import { toggle } from "../../lib/ha-service";
import { useEntityStore } from "../../store/useEntityStore";
import { getEntityBlockReason, isUnavailableEntity } from "../../lib/entity-state";
import { executeServiceAction } from "../../lib/service-action";
import { EntityFallbackCard, EntityStatusBadge } from "../EntityStatus";

interface Props {
  entityId: string;
  titleOverride?: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SwitchCard({ entityId, titleOverride }: Props) {
  const entity = useHAEntity(entityId);
  const connectionStatus = useEntityStore((state) => state.connectionStatus);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!entity) {
    return (
      <EntityFallbackCard
        entityId={entityId}
        titleOverride={titleOverride}
        connectionStatus={connectionStatus}
      />
    );
  }

  const isOn = entity.state === "on";
  const blockReason = getEntityBlockReason(entity, connectionStatus);
  const stateUnavailable = isUnavailableEntity(entity);
  const name =
    titleOverride ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;

  function handleToggle() {
    if (blockReason) return;
    void executeServiceAction(`Toggle ${name}`, () => toggle(getConnection(), entityId));
  }

  return (
    <InteractiveCard
      onClick={blockReason ? undefined : handleToggle}
      aria-disabled={Boolean(blockReason)}
      className={`relative h-full rounded-2xl border bg-[var(--color-surface)] p-4 overflow-hidden
        transition-all duration-300 flex flex-col
        ${isOn ? "border-white/[0.12]" : "border-white/[0.06] opacity-60"}
        ${blockReason ? "cursor-not-allowed" : "cursor-pointer hover:border-white/[0.18] active:scale-[0.98]"}`}
      style={isOn ? { boxShadow: "0 0 12px rgba(255, 193, 116, 0.15)" } : undefined}
    >
      <EntityStatusBadge reason={blockReason} />
      {/* Name */}
      <p className={`text-[11px] font-medium text-white/40 uppercase tracking-widest truncate ${blockReason ? "pr-24" : ""}`}>
        {name}
      </p>

      {/* Dominant on/off value */}
      <div className="flex-1 flex items-center justify-between gap-2 mt-2">
        <span className={`text-3xl font-bold ${isOn ? "text-white" : "text-white/30"}`}>
          {stateUnavailable ? blockReason : isOn ? "On" : "Off"}
        </span>
        <div
          className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
            isOn ? "bg-[#ffc174]" : "bg-white/15"
          }`}
        />
      </div>

      {/* Timestamp */}
      <p className="text-xs text-white/25 mt-1">
        {relativeTime(entity.last_changed)}
      </p>
    </InteractiveCard>
  );
}
