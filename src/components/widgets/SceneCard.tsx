import { useState } from "react";
import { Sunset } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { activateScene } from "../../lib/ha-service";
import { interactiveCardClass, skeletonCardClass } from "../../lib/styles";

interface Props {
  entityId: string;
}

export function SceneCard({ entityId }: Props) {
  const entity = useHAEntity(entityId);
  const [activated, setActivated] = useState(false);

  if (!entity) return <div className={skeletonCardClass} />;

  const name = (entity.attributes.friendly_name as string | undefined) ?? entityId;

  function handleActivate() {
    try { void activateScene(getConnection(), entityId); } catch { /* disconnected */ }
    setActivated(true);
    setTimeout(() => setActivated(false), 600);
  }

  return (
    <div
      onClick={handleActivate}
      className={`${interactiveCardClass} ${activated ? "bg-green-500/10 border-green-500/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate flex-1">{name}</p>
        <Sunset
          className={`h-4 w-4 shrink-0 transition-colors ${
            activated ? "text-green-400" : "text-white/25"
          }`}
        />
      </div>
    </div>
  );
}
