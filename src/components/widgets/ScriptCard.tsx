import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { runScript } from "../../lib/ha-service";
import { interactiveCardClass } from "../../lib/styles";
import { InteractiveCard } from "../InteractiveCard";
import { useEntityStore } from "../../store/useEntityStore";
import { getEntityBlockReason } from "../../lib/entity-state";
import { executeServiceAction } from "../../lib/service-action";
import { EntityFallbackCard } from "../EntityStatus";

interface Props {
  entityId: string;
  titleOverride?: string;
}

export function ScriptCard({ entityId, titleOverride }: Props) {
  const entity = useHAEntity(entityId);
  const connectionStatus = useEntityStore((state) => state.connectionStatus);
  const [triggered, setTriggered] = useState(false);

  if (!entity) {
    return (
      <EntityFallbackCard
        entityId={entityId}
        titleOverride={titleOverride}
        connectionStatus={connectionStatus}
      />
    );
  }

  const isRunning = entity.state === "on";
  const name = titleOverride ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;
  const blockReason = getEntityBlockReason(entity, connectionStatus);

  async function handleRun() {
    if (isRunning || blockReason) return;
    const succeeded = await executeServiceAction(`Run ${name}`, () =>
      runScript(getConnection(), entityId)
    );
    if (!succeeded) return;
    setTriggered(true);
    setTimeout(() => setTriggered(false), 600);
  }

  const flash = triggered || isRunning;

  return (
    <InteractiveCard
      onClick={blockReason ? undefined : () => void handleRun()}
      aria-disabled={Boolean(blockReason)}
      className={`relative ${interactiveCardClass} ${blockReason ? "cursor-not-allowed opacity-60 active:scale-100" : ""} ${flash ? "bg-[#ffc174]/10 border-[#ffc174]/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate flex-1">{name}</p>
        {blockReason ? (
          <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-white/35">
            {blockReason}
          </span>
        ) : isRunning ? (
          <Loader2 className={`h-4 w-4 shrink-0 animate-spin ${flash ? "text-[#ffc174]" : "text-white/50"}`} />
        ) : (
          <Play className={`h-4 w-4 shrink-0 transition-colors ${flash ? "text-[#ffc174]" : "text-white/25"}`} />
        )}
      </div>
    </InteractiveCard>
  );
}
