import { useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { cardClass } from "../../lib/styles";

interface Props {
  entityId: string;
}

function getBatteryColor(value: number): string {
  if (value > 50) return "text-green-400";
  if (value > 20) return "text-amber-400";
  return "text-red-400";
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function SensorCard({ entityId }: Props) {
  const entity = useHAEntity(entityId);
  const prevValueRef = useRef<number | null>(null);
  const trendRef = useRef<"up" | "down" | null>(null);

  if (!entity) return null;

  const name = (entity.attributes.friendly_name as string | undefined) ?? entityId;
  const unit = entity.attributes.unit_of_measurement as string | undefined;
  const deviceClass = entity.attributes.device_class as string | undefined;
  const numValue = parseFloat(entity.state);
  const isNumeric = !isNaN(numValue);

  if (isNumeric) {
    if (prevValueRef.current !== null && prevValueRef.current !== numValue) {
      trendRef.current = numValue > prevValueRef.current ? "up" : "down";
    }
    prevValueRef.current = numValue;
  }

  const valueColor =
    deviceClass === "battery" && isNumeric
      ? getBatteryColor(numValue)
      : "text-white";

  return (
    <div className={cardClass}>
      <p className="text-xs text-white/40 truncate mb-2">{name}</p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1 min-w-0">
          <span className={`text-2xl font-semibold tabular-nums ${valueColor}`}>
            {isNumeric ? formatValue(numValue) : entity.state}
          </span>
          {unit && (
            <span className="text-sm text-white/40 shrink-0">{unit}</span>
          )}
        </div>
        {isNumeric && trendRef.current && (
          <div className="mb-0.5 shrink-0 text-white/25">
            {trendRef.current === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
