import { useEffect, useState } from "react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { getConnection } from "../../lib/ha-connection";
import { toggle } from "../../lib/ha-service";
import { interactiveCardClass, skeletonCardClass } from "../../lib/styles";

interface Props {
  entityId: string;
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

export function SwitchCard({ entityId }: Props) {
  const entity = useHAEntity(entityId);
  const [, setTick] = useState(0);

  // Re-render every 60 s so the relative timestamp stays current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!entity) return <div className={skeletonCardClass} />;

  const isOn = entity.state === "on";
  const name =
    (entity.attributes.friendly_name as string | undefined) ?? entityId;

  function handleToggle() {
    try { void toggle(getConnection(), entityId); } catch { /* disconnected */ }
  }

  return (
    <div
      onClick={handleToggle}
      className={`${interactiveCardClass} ${!isOn ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white truncate flex-1">{name}</p>
        <div
          className={`h-2 w-2 rounded-full shrink-0 mt-1 transition-colors ${
            isOn ? "bg-green-400" : "bg-white/20"
          }`}
        />
      </div>
      <p className="text-xs text-white/30 mt-2">
        {relativeTime(entity.last_changed)}
      </p>
    </div>
  );
}
