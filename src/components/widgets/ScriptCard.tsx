import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { runScript } from "../../lib/ha-service";
import { interactiveCardClass, skeletonCardClass } from "../../lib/styles";

interface Props {
  entityId: string;
}

export function ScriptCard({ entityId }: Props) {
  const entity = useHAEntity(entityId);
  const [triggered, setTriggered] = useState(false);

  if (!entity) return <div className={skeletonCardClass} />;

  const isRunning = entity.state === "on";
  const name = (entity.attributes.friendly_name as string | undefined) ?? entityId;

  function handleRun() {
    if (isRunning) return;
    try { void runScript(getConnection(), entityId); } catch { /* disconnected */ }
    setTriggered(true);
    setTimeout(() => setTriggered(false), 600);
  }

  const flash = triggered || isRunning;

  return (
    <div
      onClick={handleRun}
      className={`${interactiveCardClass} ${flash ? "bg-green-500/10 border-green-500/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-white truncate flex-1">{name}</p>
        {isRunning ? (
          <Loader2 className={`h-4 w-4 shrink-0 animate-spin ${flash ? "text-green-400" : "text-white/50"}`} />
        ) : (
          <Play className={`h-4 w-4 shrink-0 transition-colors ${flash ? "text-green-400" : "text-white/25"}`} />
        )}
      </div>
    </div>
  );
}
