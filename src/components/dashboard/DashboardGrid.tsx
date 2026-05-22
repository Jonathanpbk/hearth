import { useState, useEffect } from "react";
import type React from "react";
import { GridLayout, useContainerWidth } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { CardWrapper } from "./CardWrapper";
import { LightCard } from "../widgets/LightCard";
import { SwitchCard } from "../widgets/SwitchCard";
import { SceneCard } from "../widgets/SceneCard";
import { ScriptCard } from "../widgets/ScriptCard";
import { SensorCard } from "../widgets/SensorCard";
import { WeatherWidget } from "../widgets/WeatherWidget";
import type { CardConfig, StoredLayoutItem } from "../../types/dashboard";

function renderCard(card: CardConfig) {
  switch (card.type) {
    case "light":   return <LightCard   entityId={card.entityId} titleOverride={card.title} />;
    case "switch":  return <SwitchCard  entityId={card.entityId} titleOverride={card.title} />;
    case "scene":   return <SceneCard   entityId={card.entityId} titleOverride={card.title} />;
    case "script":  return <ScriptCard  entityId={card.entityId} titleOverride={card.title} />;
    case "sensor":  return <SensorCard  entityId={card.entityId} titleOverride={card.title} />;
    case "weather": return <WeatherWidget />;
    default:        return null;
  }
}

interface Props {
  cards: CardConfig[];
  layout: StoredLayoutItem[];
  editMode: boolean;
  onLayoutChange: (layout: StoredLayoutItem[]) => void;
  onEditCard: (card: CardConfig) => void;
  onDeleteCard: (cardId: string) => void;
}

export function DashboardGrid({
  cards,
  layout,
  editMode,
  onLayoutChange,
  onEditCard,
  onDeleteCard,
}: Props) {
  const { width, containerRef } = useContainerWidth() as {
    width: number;
    containerRef: React.RefObject<HTMLDivElement>;
    mounted: boolean;
  };

  // Local layout drives the grid during drag; persisted only on drag/resize stop.
  const [localLayout, setLocalLayout] = useState<StoredLayoutItem[]>(layout);

  useEffect(() => {
    setLocalLayout(layout);
  }, [layout]);

  function toStored(rglLayout: Layout): StoredLayoutItem[] {
    return Array.from(rglLayout).map(({ i, x, y, w, h, minW, minH }) => ({
      i, x, y, w, h,
      ...(minW != null ? { minW } : {}),
      ...(minH != null ? { minH } : {}),
    }));
  }

  return (
    <div ref={containerRef} data-edit={editMode ? "true" : "false"}>
      <GridLayout
        width={width}
        layout={localLayout}
        gridConfig={{
          cols: 12,
          rowHeight: 80,
          margin: [8, 8],
          containerPadding: [16, 16],
        }}
        dragConfig={{
          enabled: editMode,
          handle: ".drag-handle",
        }}
        resizeConfig={{
          enabled: editMode,
          handles: ["se"],
        }}
        onLayoutChange={(rglLayout) => setLocalLayout(toStored(rglLayout))}
        onDragStop={(rglLayout) => onLayoutChange(toStored(rglLayout))}
        onResizeStop={(rglLayout) => onLayoutChange(toStored(rglLayout))}
      >
        {cards.map((card) => (
          <div key={card.id} className="overflow-hidden">
            <CardWrapper
              editMode={editMode}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card.id)}
            >
              {renderCard(card)}
            </CardWrapper>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
