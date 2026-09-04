import { useState, useEffect } from "react";
import { InteractiveCard } from "../InteractiveCard";
import type { LucideIcon } from "lucide-react";
import {
  Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudDrizzle,
  CloudSnow, CloudFog, Wind, Zap, AlertTriangle,
} from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { useEntityStore } from "../../store/useEntityStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { getConnection } from "../../lib/ha-connection";
import type { WeatherEntityAttributes, WeatherForecastDay } from "../../types/weather";
import { isUnavailableEntity } from "../../lib/entity-state";

const CONDITION_ICONS: Record<string, LucideIcon> = {
  sunny: Sun,
  "clear-night": Moon,
  partlycloudy: CloudSun,
  "partly-cloudy-night": CloudMoon,
  cloudy: Cloud,
  overcast: Cloud,
  rainy: CloudRain,
  pouring: CloudRain,
  drizzle: CloudDrizzle,
  snowy: CloudSnow,
  "snowy-rainy": CloudSnow,
  sleet: CloudSnow,
  fog: CloudFog,
  hazy: CloudFog,
  windy: Wind,
  "windy-variant": Wind,
  lightning: Zap,
  "lightning-rainy": Zap,
  hail: Cloud,
  exceptional: AlertTriangle,
};

function ConditionIcon({ condition, className }: { condition: string; className?: string }) {
  const Icon = CONDITION_ICONS[condition] ?? Cloud;
  return <Icon className={className} />;
}

function ForecastDay({ day, isHottest }: { day: WeatherForecastDay; isHottest: boolean }) {
  const date = new Date(day.datetime);
  const abbrev = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-xs font-semibold uppercase tracking-wide leading-none ${isHottest ? "text-[#ffc174]" : "text-white/35"}`}>
        {abbrev}
      </span>
      <ConditionIcon condition={day.condition} className="h-6 w-6 text-white/40" />
      <span className={`text-sm font-bold tabular-nums leading-none ${isHottest ? "text-[#ffc174]" : "text-white"}`}>
        {Math.round(day.temperature)}°
      </span>
      <span className="text-xs text-white/30 tabular-nums leading-none">
        {Math.round(day.templow ?? day.temperature)}°
      </span>
    </div>
  );
}

function useWeatherForecast(entityId: string): WeatherForecastDay[] {
  const [forecast, setForecast] = useState<WeatherForecastDay[]>([]);
  const connectionStatus = useEntityStore((s) => s.connectionStatus);

  useEffect(() => {
    if (connectionStatus !== "connected" || !entityId) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const conn = getConnection();
        unsub = await conn.subscribeMessage<{ forecast: WeatherForecastDay[] }>(
          (msg) => { if (!cancelled) setForecast(msg.forecast ?? []); },
          { type: "weather/subscribe_forecast", entity_id: entityId, forecast_type: "daily" }
        );
      } catch { /* older HA — falls back to attribute-based forecast */ }
    })();
    return () => { cancelled = true; unsub?.(); };
  }, [entityId, connectionStatus]);

  return forecast;
}

export function ClockWeatherCard() {
  const clockFormat = useSettingsStore((s) => s.settings.clockFormat);
  const weatherEntityId = useSettingsStore((s) => s.settings.weatherEntityId);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const entity = useHAEntity(weatherEntityId);
  const subscriptionForecast = useWeatherForecast(weatherEntityId);

  // ── Clock ─────────────────────────────────────────────────────────────────
  const h = now.getHours();
  const displayHour =
    clockFormat === "12h"
      ? String(h % 12 || 12)
      : String(h).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthStr = now.toLocaleDateString("en-US", { month: "long" });
  const dateStr = `${weekday}, ${monthStr} ${now.getDate()}`;

  // ── Weather ───────────────────────────────────────────────────────────────
  const weatherAvailable = entity !== undefined && !isUnavailableEntity(entity);
  const attrs = weatherAvailable ? (entity.attributes as unknown as WeatherEntityAttributes) : null;
  const condition = weatherAvailable ? entity.state : "";
  const forecast =
    subscriptionForecast.length > 0 ? subscriptionForecast : (attrs?.forecast ?? []);
  const forecastDays = forecast.slice(0, 7);
  const maxForecastTemp =
    forecastDays.length > 0 ? Math.max(...forecastDays.map((d) => d.temperature)) : null;

  return (
    <InteractiveCard
      className="h-full bg-[var(--color-surface)] rounded-2xl border border-white/[0.08] overflow-hidden"
      style={{ display: "grid", gridTemplateRows: "auto auto" }}
    >
      {/* ── Row 1: clock (left) + weather (right) ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 items-center min-h-0 px-3 pt-1.5">

        {/* Left — clock */}
        <div className="flex flex-col justify-center select-none min-w-0">
          <div className="flex items-baseline leading-none">
            <span className="text-6xl font-bold tabular-nums text-white tracking-tight">
              {displayHour}:{minutes}
            </span>
          </div>
          <p className="text-base font-medium text-[#ffc174] mt-2 leading-none truncate">
            {dateStr}
          </p>
        </div>

        {/* Right — weather */}
        <div className="flex flex-col justify-center items-end min-w-0">
          {!weatherAvailable ? (
            <p className="text-xs text-white/25 text-right">
              {weatherEntityId ? "Unavailable" : "No entity set"}
            </p>
          ) : (
            <>
              {/* Icon + temperature */}
              <div className="flex items-center gap-2">
                <ConditionIcon condition={condition} className="h-8 w-8 text-[#ffc174] shrink-0" />
                <span className="text-5xl font-bold tabular-nums text-[#ffc174] leading-none">
                  {attrs?.temperature != null ? `${Math.round(attrs.temperature)}°` : "—"}
                </span>
              </div>
              {/* Condition name */}
              <p className="text-xs uppercase tracking-widest text-[#ffc174]/70 mt-1.5 leading-none truncate max-w-full">
                {condition.replace(/-/g, " ")}
              </p>
              {/* Humidity + wind */}
              {(attrs?.humidity != null || attrs?.wind_speed != null) && (
                <div className="flex gap-2.5 mt-1.5">
                  {attrs?.humidity != null && (
                    <span className="text-xs text-[#ffc174]/55 tabular-nums">
                      {Math.round(attrs.humidity)}%
                    </span>
                  )}
                  {attrs?.wind_speed != null && (
                    <span className="text-xs text-[#ffc174]/55 tabular-nums">
                      {Math.round(attrs.wind_speed)}&thinsp;{attrs.wind_speed_unit ?? "km/h"}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: 7-day forecast strip — full card width ────────────────── */}
      {forecastDays.length > 0 && (
        <div
          className="pb-1.5"
          style={{ display: "grid", gridTemplateColumns: `repeat(${forecastDays.length}, 1fr)`, marginTop: "30px" }}
        >
          {forecastDays.map((day) => (
            <ForecastDay
              key={day.datetime}
              day={day}
              isHottest={maxForecastTemp !== null && day.temperature === maxForecastTemp}
            />
          ))}
        </div>
      )}
    </InteractiveCard>
  );
}
