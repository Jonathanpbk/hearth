import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useHAEntity } from "../../hooks/useHAEntity";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useEntityStore } from "../../store/useEntityStore";

interface Props {
  entityId: string;
}

interface HistoryPoint {
  t: number;
  v: number;
}

async function fetchHistory(
  baseUrl: string,
  token: string,
  entityId: string
): Promise<HistoryPoint[]> {
  const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const url =
    `${baseUrl}/api/history/period/${start}` +
    `?filter_entity_id=${entityId}&minimal_response=true&no_attributes=true`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<
    Array<{ state: string; last_changed: string }>
  >;
  return (data[0] ?? [])
    .map((s) => ({ t: new Date(s.last_changed).getTime(), v: parseFloat(s.state) }))
    .filter((p) => !isNaN(p.v));
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getBatteryColor(value: number): string {
  if (value > 50) return "text-green-400";
  if (value > 20) return "text-amber-400";
  return "text-red-400";
}

export function SensorCard({ entityId }: Props) {
  const entity = useHAEntity(entityId);
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const prevValueRef = useRef<number | null>(null);
  const trendRef = useRef<"up" | "down" | null>(null);

  const haLocalUrl = useSettingsStore((s) => s.settings.haLocalUrl);
  const haRemoteUrl = useSettingsStore((s) => s.settings.haRemoteUrl);
  const haToken = useSettingsStore((s) => s.settings.haToken);
  const activeHaUrl = useEntityStore((s) => s.activeHaUrl);
  const connectionStatus = useEntityStore((s) => s.connectionStatus);

  const baseUrl = activeHaUrl === "local" ? haLocalUrl : haRemoteUrl;

  useEffect(() => {
    if (connectionStatus !== "connected" || !baseUrl || !haToken) return;
    void fetchHistory(baseUrl, haToken, entityId).then(setHistory);
  }, [entityId, baseUrl, haToken, connectionStatus]);

  if (!entity) return <div className="h-40 rounded-2xl border border-white/[0.04] bg-[var(--color-surface)]" />;

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
    deviceClass === "battery" && isNumeric ? getBatteryColor(numValue) : "text-white";
  const displayValue = isNumeric ? formatValue(numValue) : entity.state;
  const gradId = `shc-${entityId.replace(/[^a-z0-9]/gi, "-")}`;

  const faceBase =
    "flip-card-face p-4 flex flex-col bg-[var(--color-surface)] rounded-2xl";

  return (
    <div
      className="h-40 rounded-2xl border border-white/[0.08] hover:border-white/[0.16] cursor-pointer flip-card-scene transition-colors duration-200"
      onClick={() => setFlipped((f) => !f)}
    >
      <div className={`flip-card-inner h-full${flipped ? " is-flipped" : ""}`}>

        {/* ── Front ──────────────────────────────────────────────── */}
        <div className={faceBase}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 truncate flex-1">{name}</p>
            {isNumeric && trendRef.current && (
              <span className="ml-2 shrink-0 text-white/25">
                {trendRef.current === "up"
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-semibold tabular-nums ${valueColor}`}>
                {displayValue}
              </span>
              {unit && <span className="text-lg text-white/40">{unit}</span>}
            </div>
          </div>
        </div>

        {/* ── Back ───────────────────────────────────────────────── */}
        <div className={`${faceBase} flip-card-back justify-between`}>
          <div>
            <div className="flex items-start justify-between">
              <p className="text-xs text-white/40 truncate flex-1">{name}</p>
              <RotateCcw className="h-3 w-3 text-white/20 shrink-0 ml-2 mt-0.5" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-xl font-semibold tabular-nums ${valueColor}`}>
                {displayValue}
              </span>
              {unit && <span className="text-sm text-white/40">{unit}</span>}
            </div>
          </div>
          <div className="h-12">
            {history.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    fill={`url(#${gradId})`}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center">
                <div className="w-full h-px bg-white/[0.06]" />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
