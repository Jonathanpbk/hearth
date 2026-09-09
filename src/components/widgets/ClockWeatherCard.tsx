import { useState, useEffect, type CSSProperties } from "react";
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
import { formatCompactDate, millisecondsUntilNextMinute } from "../../lib/clock";

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

const CARD_SIZES = {
  clock: "clamp(2.75rem, calc(8cqw + 7cqh), 10.5rem)",
  date: "clamp(0.875rem, calc(1.8cqw + 1.6cqh), 2.5rem)",
  currentIcon: "clamp(2rem, calc(4cqw + 4cqh), 5.75rem)",
  currentTemperature: "clamp(2.5rem, calc(7cqw + 6cqh), 8.75rem)",
  condition: "clamp(0.75rem, calc(1.7cqw + 1.1cqh), 1.9rem)",
  stat: "clamp(0.7rem, calc(1.35cqw + 0.9cqh), 1.55rem)",
  forecastDay: "clamp(0.7rem, calc(1.2cqw + 1.1cqh), 1.5rem)",
  forecastIcon: "clamp(1.35rem, calc(3cqw + 2.7cqh), 4rem)",
  forecastHigh: "clamp(0.9rem, calc(1.8cqw + 1.6cqh), 2.25rem)",
  forecastLow: "clamp(0.75rem, calc(1.45cqw + 1.3cqh), 1.75rem)",
} as const;

function ConditionIcon({
  condition,
  className,
  style,
}: {
  condition: string;
  className?: string;
  style?: CSSProperties;
}) {
  const Icon = CONDITION_ICONS[condition] ?? Cloud;
  return <Icon className={className} style={style} />;
}

function ForecastDay({ day, isHottest }: { day: WeatherForecastDay; isHottest: boolean }) {
  const date = new Date(day.datetime);
  const abbrev = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return (
    <div
      data-forecast-day
      className="flex h-full min-w-0 flex-col items-center justify-center gap-[clamp(0.08rem,0.35cqmin,0.3rem)]"
    >
      <span
        className={`font-semibold uppercase tracking-wide leading-none ${isHottest ? "text-[#ffc174]" : "text-white/35"}`}
        style={{ fontSize: CARD_SIZES.forecastDay }}
      >
        {abbrev}
      </span>
      <ConditionIcon
        condition={day.condition}
        className="text-white/40"
        style={{ width: CARD_SIZES.forecastIcon, height: CARD_SIZES.forecastIcon }}
      />
      <span
        className={`font-bold tabular-nums leading-none ${isHottest ? "text-[#ffc174]" : "text-white"}`}
        style={{ fontSize: CARD_SIZES.forecastHigh }}
      >
        {Math.round(day.temperature)}°
      </span>
      <span
        className="text-white/30 tabular-nums leading-none"
        style={{ fontSize: CARD_SIZES.forecastLow }}
      >
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
  const dateStr = formatCompactDate(now);

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
        containerType: "size",
        display: "grid",
        gridTemplateRows: "minmax(0, 3fr) minmax(0, 2fr)",
      }}
    >
      {/* ── Row 1: clock (left) + weather (right) ────────────────────────── */}
      <div
        data-clock-weather-summary
        className="grid min-h-0 grid-cols-2 items-center gap-[clamp(0.75rem,2cqmin,2rem)] overflow-hidden px-[clamp(1.25rem,4.2cqmin,3rem)] py-[clamp(0.15rem,0.4cqmin,0.35rem)]"
      >

        {/* Left — clock */}
        <div className="flex min-w-0 flex-col justify-center select-none">
          <div className="flex items-baseline leading-none">
            <span
              data-clock-time
              className="font-bold tabular-nums text-white tracking-tight"
              style={{ fontSize: CARD_SIZES.clock }}
            >
              {displayHour}:{minutes}
            </span>
          </div>
          <p
            data-clock-date
            className="mt-[clamp(0.25rem,0.7cqmin,0.6rem)] truncate font-medium leading-none text-[#ffc174]"
            style={{ fontSize: CARD_SIZES.date }}
          >
            {dateStr}
          </p>
        </div>

        {/* Right — weather */}
        <div className="flex min-w-0 flex-col items-end justify-center">
          {!weatherAvailable ? (
            <p className="text-[clamp(0.75rem,2.8cqmin,1.2rem)] text-white/25 text-right">
              {weatherEntityId ? "Unavailable" : "No entity set"}
            </p>
          ) : (
            <>
              {/* Icon + temperature */}
              <div className="flex items-center gap-[clamp(0.4rem,1.2cqmin,1rem)]">
                <ConditionIcon
                  condition={condition}
                  className="shrink-0 text-[#ffc174]"
                  style={{ width: CARD_SIZES.currentIcon, height: CARD_SIZES.currentIcon }}
                />
                <span
                  data-current-temperature
                  className="font-bold tabular-nums leading-none text-[#ffc174]"
                  style={{ fontSize: CARD_SIZES.currentTemperature }}
                >
                  {attrs?.temperature != null ? `${Math.round(attrs.temperature)}°` : "—"}
                </span>
              </div>
              {/* Condition name */}
              <p
                className="mt-[clamp(0.2rem,0.5cqmin,0.5rem)] max-w-full truncate uppercase tracking-widest leading-none text-[#ffc174]/70"
                style={{ fontSize: CARD_SIZES.condition }}
              >
                {condition.replace(/-/g, " ")}
              </p>
              {/* Humidity + wind */}
              {(attrs?.humidity != null || attrs?.wind_speed != null) && (
                <div className="mt-[clamp(0.2rem,0.5cqmin,0.5rem)] flex gap-[clamp(0.5rem,1.4cqmin,1.1rem)]">
                  {attrs?.humidity != null && (
                    <span
                      className="text-[#ffc174]/55 tabular-nums"
                      style={{ fontSize: CARD_SIZES.stat }}
                    >
                      {Math.round(attrs.humidity)}%
                    </span>
                  )}
                  {attrs?.wind_speed != null && (
                    <span
                      className="text-[#ffc174]/55 tabular-nums"
                      style={{ fontSize: CARD_SIZES.stat }}
                    >
                      {Math.round(attrs.wind_speed)}&thinsp;{attrs.wind_speed_unit ?? "km/h"}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: forecast strip — full card width ──────────────────────── */}
      {forecastDays.length > 0 && (
        <div
          data-clock-weather-forecast
          className="min-h-0 items-center overflow-hidden px-[clamp(0.15rem,0.5cqmin,0.5rem)] py-[clamp(0.1rem,0.3cqmin,0.3rem)]"
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
