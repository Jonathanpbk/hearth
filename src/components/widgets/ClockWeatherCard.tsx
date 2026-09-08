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
import { millisecondsUntilNextMinute } from "../../lib/clock";

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
    <div className="flex min-w-0 flex-col items-center gap-1">
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
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNextMinute = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        scheduleNextMinute();
      }, millisecondsUntilNextMinute(Date.now()) + 25);
    };

    scheduleNextMinute();
    return () => clearTimeout(timer);
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
      className="h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--color-surface)]"
      style={{
        contain: "layout paint",
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) auto",
      }}
    >
      {/* ── Row 1: clock (left) + weather (right) ────────────────────────── */}
      <div
        data-clock-weather-summary
        className="grid min-h-0 grid-cols-2 items-center gap-3 overflow-hidden px-3 py-1.5"
      >

        {/* Left — clock */}
        <div className="flex flex-col justify-center select-none min-w-0">
          <div className="flex items-baseline leading-none">
            <span className="text-[clamp(2.5rem,13vw,3.75rem)] font-bold tabular-nums text-white tracking-tight">
              {displayHour}:{minutes}
            </span>
          </div>
          <p className="mt-2 truncate text-[clamp(0.75rem,3.6vw,1rem)] font-medium leading-none text-[#ffc174]">
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
                <ConditionIcon condition={condition} className="h-7 w-7 shrink-0 text-[#ffc174] sm:h-8 sm:w-8" />
                <span className="text-[clamp(2.25rem,11vw,3rem)] font-bold tabular-nums leading-none text-[#ffc174]">
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
          data-clock-weather-forecast
          className="min-h-0 items-start overflow-hidden px-1 pb-1.5 pt-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${forecastDays.length}, minmax(0, 1fr))`,
          }}
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
