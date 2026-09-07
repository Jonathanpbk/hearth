import { lazy, Suspense } from "react";
import type { CardConfig } from "../../types/dashboard";

const LightCard = lazy(() =>
  import("../widgets/LightCard").then((module) => ({ default: module.LightCard }))
);
const SwitchCard = lazy(() =>
  import("../widgets/SwitchCard").then((module) => ({ default: module.SwitchCard }))
);
const SceneCard = lazy(() =>
  import("../widgets/SceneCard").then((module) => ({ default: module.SceneCard }))
);
const ScriptCard = lazy(() =>
  import("../widgets/ScriptCard").then((module) => ({ default: module.ScriptCard }))
);
const SensorCard = lazy(() =>
  import("../widgets/SensorCard").then((module) => ({ default: module.SensorCard }))
);
const WeatherWidget = lazy(() =>
  import("../widgets/WeatherWidget").then((module) => ({
    default: module.WeatherWidget,
  }))
);
const ClockWeatherCard = lazy(() =>
  import("../widgets/ClockWeatherCard").then((module) => ({
    default: module.ClockWeatherCard,
  }))
);
const DreoFanCard = lazy(() =>
  import("../widgets/DreoFanCard").then((module) => ({
    default: module.DreoFanCard,
  }))
);
const ScenesCard = lazy(() =>
  import("../widgets/ScenesCard").then((module) => ({ default: module.ScenesCard }))
);

interface Props {
  card: CardConfig;
}

export function DashboardCard({ card }: Props) {
  return (
    <Suspense fallback={<DashboardCardPlaceholder />}>
      {renderCard(card)}
    </Suspense>
  );
}

function renderCard(card: CardConfig) {
  switch (card.type) {
    case "light":
      return <LightCard entityId={card.entityId} titleOverride={card.title} />;
    case "switch":
      return <SwitchCard entityId={card.entityId} titleOverride={card.title} />;
    case "scene":
      return <SceneCard entityId={card.entityId} titleOverride={card.title} />;
    case "script":
      return <ScriptCard entityId={card.entityId} titleOverride={card.title} />;
    case "sensor":
      return <SensorCard entityId={card.entityId} titleOverride={card.title} />;
    case "weather":
      return <WeatherWidget />;
    case "clock-weather":
      return <ClockWeatherCard />;
    case "dreo-fan":
      return <DreoFanCard />;
    case "scenes":
      return <ScenesCard />;
  }
}

function DashboardCardPlaceholder() {
  return (
    <div
      aria-label="Loading dashboard card"
      className="h-full rounded-2xl border border-white/[0.06] bg-[var(--color-surface)]"
    />
  );
}
