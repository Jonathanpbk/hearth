import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type React from "react";
import { GridLayout, useContainerWidth, noCompactor } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { CardWrapper } from "./CardWrapper";
import { LightCard } from "../widgets/LightCard";
import { SwitchCard } from "../widgets/SwitchCard";
import { SceneCard } from "../widgets/SceneCard";
import { ScriptCard } from "../widgets/ScriptCard";
import { SensorCard } from "../widgets/SensorCard";
import { WeatherWidget } from "../widgets/WeatherWidget";
import { ClockWeatherCard } from "../widgets/ClockWeatherCard";
import { DreoFanCard } from "../widgets/DreoFanCard";
import { ScenesCard } from "../widgets/ScenesCard";
import type { CardConfig, StoredLayoutItem } from "../../types/dashboard";

// ── Row-height calculation ────────────────────────────────────────────────────
// Target: 10 rows fill the visible content area (viewport minus header and dock).

const GRID_COLS = 16;
const GRID_ROWS = 10;
const HEADER_H = 56;   // h-14
const DOCK_SAFE = 60;  // dock pill (~40 px) + bottom-4 margin
const PAD_Y = 32;      // containerPadding top + bottom (16 + 16)
const ROW_GAPS = 8 * (GRID_ROWS - 1); // margin × (rows − 1)

function computeRowHeight(): number {
  const available = window.innerHeight - HEADER_H - DOCK_SAFE - PAD_Y - ROW_GAPS;
  return Math.max(50, Math.floor(available / GRID_ROWS));
}

function useViewportRowHeight(): number {
  const [rowHeight, setRowHeight] = useState(computeRowHeight);
  useEffect(() => {
    const update = () => setRowHeight(computeRowHeight());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return rowHeight;
}

// ── Card renderer ─────────────────────────────────────────────────────────────

function renderCard(card: CardConfig) {
  switch (card.type) {
    case "light":          return <LightCard        entityId={card.entityId} titleOverride={card.title} />;
    case "switch":         return <SwitchCard       entityId={card.entityId} titleOverride={card.title} />;
    case "scene":          return <SceneCard        entityId={card.entityId} titleOverride={card.title} />;
    case "script":         return <ScriptCard       entityId={card.entityId} titleOverride={card.title} />;
    case "sensor":         return <SensorCard       entityId={card.entityId} titleOverride={card.title} />;
    case "weather":        return <WeatherWidget />;
    case "clock-weather":  return <ClockWeatherCard />;
    case "dreo-fan":       return <DreoFanCard />;
    case "scenes":         return <ScenesCard />;
    default:               return null;
  }
}

function toStored(rglLayout: Layout): StoredLayoutItem[] {
  return Array.from(rglLayout).map(({ i, x, y, w, h, minW, minH }) => ({
    i, x, y, w, h,
    ...(minW != null ? { minW } : {}),
    ...(minH != null ? { minH } : {}),
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  const rowHeight = useViewportRowHeight();

  // Local layout drives the grid — only synced from the prop when the card
  // set changes (page switch, card added/removed), not after every drag stop.
  const [localLayout, setLocalLayout] = useState<StoredLayoutItem[]>(layout);
  const cardKeyRef = useRef(cards.map((c) => c.id).join(","));

  useEffect(() => {
    const key = cards.map((c) => c.id).join(",");
    if (key !== cardKeyRef.current) {
      cardKeyRef.current = key;
      setLocalLayout(layout);
    }
  }, [cards, layout]);

  // Track whether the user is actively dragging or resizing.
  // This gates the onLayoutChange handler so it cannot create a feedback loop.
  const interactingRef = useRef(false);

  // gridConfig depends on rowHeight so it updates on window resize.
  // All other properties are stable constants so no additional re-renders occur.
  const gridConfig = useMemo(
    () => ({
      cols: GRID_COLS,
      rowHeight,
      margin: [8, 8] as const,
      containerPadding: [16, 16] as const,
    }),
    [rowHeight]
  );

  const dragConfig = useMemo(
    () => ({ enabled: editMode, handle: ".drag-handle" }),
    [editMode]
  );

  const resizeConfig = useMemo(
    () => ({ enabled: editMode, handles: ["se"] as const }),
    [editMode]
  );

  const handleLayoutChange = useCallback((rglLayout: Layout) => {
    if (interactingRef.current) {
      setLocalLayout(toStored(rglLayout));
    }
  }, []);

  const handleDragStart = useCallback(() => {
    interactingRef.current = true;
  }, []);

  const handleDragStop = useCallback(
    (rglLayout: Layout) => {
      interactingRef.current = false;
      const stored = toStored(rglLayout);
      setLocalLayout(stored);
      onLayoutChange(stored);
    },
    [onLayoutChange]
  );

  const handleResizeStart = useCallback(() => {
    interactingRef.current = true;
  }, []);

  const handleResizeStop = useCallback(
    (rglLayout: Layout) => {
      interactingRef.current = false;
      const stored = toStored(rglLayout);
      setLocalLayout(stored);
      onLayoutChange(stored);
    },
    [onLayoutChange]
  );

  return (
    <div ref={containerRef} data-edit={editMode ? "true" : "false"}>
      <GridLayout
        width={width}
        layout={localLayout}
        gridConfig={gridConfig}
        dragConfig={dragConfig}
        resizeConfig={resizeConfig}
        compactor={noCompactor}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
      >
        {cards.map((card) => (
          <div key={card.id} style={{ height: "100%", background: "transparent" }}>
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
