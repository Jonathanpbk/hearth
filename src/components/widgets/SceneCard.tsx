import { useState } from "react";
import { Sunset } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { activateScene } from "../../lib/ha-service";
import { cardClass, interactiveCardClass } from "../../lib/styles";
import { InteractiveCard } from "../InteractiveCard";
import { useEntityStore } from "../../store/useEntityStore";
import { getEntityBlockReason } from "../../lib/entity-state";
import { executeServiceAction } from "../../lib/service-action";
import { EntityFallbackCard } from "../EntityStatus";

interface Props {
  entityId: string;
  titleOverride?: string;
}

export function SceneCard({ entityId, titleOverride }: Props) {
  const entity = useHAEntity(entityId);
  const connectionStatus = useEntityStore((state) => state.connectionStatus);
  const [activated, setActivated] = useState(false);

  if (!entity) {
    return (
      <EntityFallbackCard
        entityId={entityId}
        titleOverride={titleOverride}
        connectionStatus={connectionStatus}
      />
    );
  }

  const name = titleOverride ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;
  const blockReason = getEntityBlockReason(entity, connectionStatus);

  async function handleActivate() {
    if (blockReason) return;
    const succeeded = await executeServiceAction(`Activate ${name}`, () =>
      activateScene(getConnection(), entityId)
    );
    if (!succeeded) return;
    setActivated(true);
    setTimeout(() => setActivated(false), 600);
  }

  return (
    <InteractiveCard
      interactionDisabled={Boolean(blockReason)}
      onClick={blockReason ? undefined : () => void handleActivate()}
      aria-disabled={Boolean(blockReason)}
      className={`relative ${blockReason ? `${cardClass} cursor-not-allowed opacity-60` : interactiveCardClass} ${activated ? "bg-[#ffc174]/10 border-[#ffc174]/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate flex-1">{name}</p>
        {blockReason ? (
          <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-white/35">
            {blockReason}
          </span>
        ) : (
          <Sunset
            className={`h-4 w-4 shrink-0 transition-colors ${
              activated ? "text-[#ffc174]" : "text-white/25"
            }`}
          />
        )}
      </div>
    </InteractiveCard>
  );
}
