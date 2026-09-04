import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudFog,
  Wind,
  Zap,
  AlertTriangle,
  Droplets,
} from "lucide-react";
import { useHAEntity } from "../../hooks/useHAEntity";
import { useEntityStore } from "../../store/useEntityStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { getConnection } from "../../lib/ha-connection";
import { cardClass } from "../../lib/styles";
import { InteractiveCard } from "../InteractiveCard";
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

function ConditionIcon({
  condition,
  className,
}: {
  condition: string;
  className?: string;
}) {
  const Icon = CONDITION_ICONS[condition] ?? Cloud;
  return <Icon className={className} />;
}

function ForecastDay({ day }: { day: WeatherForecastDay }) {
  const date = new Date(day.datetime);
  const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] uppercase tracking-wide text-white/40">
        {dayName}
      </span>
      <ConditionIcon condition={day.condition} className="h-4 w-4 text-white/50" />
      <span className="text-xs font-medium text-white tabular-nums">
        {Math.round(day.temperature)}°
      </span>
      <span className="text-[11px] text-white/30 tabular-nums">
        {Math.round(day.templow ?? day.temperature)}°
      </span>
    </div>
  );
}

// In HA 2024.3+, forecast was removed from entity attributes and must be
// fetched via the weather/subscribe_forecast WebSocket subscription.
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
          (msg) => {
            if (!cancelled) setForecast(msg.forecast ?? []);
          },
          {
            type: "weather/subscribe_forecast",
            entity_id: entityId,
            forecast_type: "daily",
          }
        );
      } catch {
        // Endpoint absent on older HA — attribute-based fallback used instead
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [entityId, connectionStatus]);

  return forecast;
}

export function WeatherWidget() {
  const weatherEntityId = useSettingsStore((s) => s.settings.weatherEntityId);
  const entity = useHAEntity(weatherEntityId);
  const subscriptionForecast = useWeatherForecast(weatherEntityId);

  if (!entity || isUnavailableEntity(entity)) {
    return (
      <InteractiveCard
        className={`${cardClass} md:col-span-2 min-h-[140px] flex items-center justify-center`}
      >
        <p className="text-xs text-white/30">
          {weatherEntityId ? "Weather unavailable" : "No weather entity configured"}
        </p>
      </InteractiveCard>
    );
  }

  const attrs = entity.attributes as unknown as WeatherEntityAttributes;
  const condition = entity.state;
  // Prefer subscription forecast (modern HA); fall back to attribute (older HA)
  const forecast =
    subscriptionForecast.length > 0
      ? subscriptionForecast
      : (attrs.forecast ?? []);

  return (
    <InteractiveCard className={`${cardClass} md:col-span-2`}>
      {/* Current conditions */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start leading-none">
            <span className="text-5xl font-semibold tabular-nums text-white">
              {attrs.temperature != null ? Math.round(attrs.temperature) : "—"}
            </span>
            <span className="text-2xl font-medium text-white/70 mt-1 ml-0.5">
              {attrs.temperature_unit ?? "°"}
            </span>
          </div>
          <p className="text-sm text-white/50 mt-2 capitalize">
            {condition.replace(/-/g, " ")}
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            {attrs.humidity != null && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Droplets className="h-3.5 w-3.5" />
                {Math.round(attrs.humidity)}%
              </span>
            )}
            {attrs.wind_speed != null && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Wind className="h-3.5 w-3.5" />
                {Math.round(attrs.wind_speed)}&thinsp;
                {attrs.wind_speed_unit ?? "km/h"}
              </span>
            )}
          </div>
        </div>
        <ConditionIcon
          condition={condition}
          className="h-14 w-14 text-white/30 shrink-0 ml-4"
        />
      </div>

      {/* 5-day forecast strip */}
      {forecast.length > 0 && (
        <div className="grid grid-cols-5 gap-1 mt-4 pt-4 border-t border-white/[0.06]">
          {forecast.slice(0, 5).map((day) => (
            <ForecastDay key={day.datetime} day={day} />
          ))}
        </div>
      )}
    </InteractiveCard>
  );
}
