import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { GridLayout, getCompactor, useContainerWidth } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { DASHBOARD_GRID_COLUMNS } from "../../lib/dashboard-edit";
import {
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_PADDING,
} from "../../lib/dashboard-grid";
import { useDashboardRowHeight } from "../../hooks/useDashboardRowHeight";
import type { CardConfig, StoredLayoutItem } from "../../types/dashboard";
import { CardWrapper } from "./CardWrapper";
import { DashboardCard } from "./DashboardCard";

const fixedPositionCompactor = getCompactor(null, false, true);

function toStored(rglLayout: Layout): StoredLayoutItem[] {
  return Array.from(rglLayout).map(({ i, x, y, w, h, minW, minH }) => ({
    i,
    x,
    y,
    w,
    h,
    ...(minW != null ? { minW } : {}),
    ...(minH != null ? { minH } : {}),
  }));
}

interface Props {
  cards: CardConfig[];
  layout: StoredLayoutItem[];
  onLayoutChange: (layout: StoredLayoutItem[]) => void;
  onEditCard: (card: CardConfig) => void;
  onDeleteCard: (cardId: string) => void;
}

export function EditableDashboardGrid({
  cards,
  layout,
  onLayoutChange,
  onEditCard,
  onDeleteCard,
}: Props) {
  const { width, containerRef } = useContainerWidth() as {
    width: number;
    containerRef: React.RefObject<HTMLDivElement>;
    mounted: boolean;
  };
  const rowHeight = useDashboardRowHeight();
  const [localLayout, setLocalLayout] = useState<StoredLayoutItem[]>(layout);
  const cardKeyRef = useRef(cards.map((card) => card.id).join(","));
  const interactingRef = useRef(false);

  useEffect(() => {
    const key = cards.map((card) => card.id).join(",");
    if (key !== cardKeyRef.current) {
      cardKeyRef.current = key;
      setLocalLayout(layout);
    }
  }, [cards, layout]);

  const gridConfig = useMemo(
    () => ({
      cols: DASHBOARD_GRID_COLUMNS,
      rowHeight,
      margin: [DASHBOARD_GRID_GAP, DASHBOARD_GRID_GAP] as const,
      containerPadding: [
        DASHBOARD_GRID_PADDING,
        DASHBOARD_GRID_PADDING,
      ] as const,
    }),
    [rowHeight]
  );
  const dragConfig = useMemo(
    () => ({ enabled: true, handle: ".drag-handle" }),
    []
  );
  const resizeConfig = useMemo(
    () => ({ enabled: true, handles: ["se"] as const }),
    []
  );

  const handleLayoutChange = useCallback((rglLayout: Layout) => {
    if (interactingRef.current) setLocalLayout(toStored(rglLayout));
  }, []);
  const handleDragStart = useCallback(() => {
    interactingRef.current = true;
  }, []);
  const handleResizeStart = useCallback(() => {
    interactingRef.current = true;
  }, []);
  const handleInteractionStop = useCallback(
    (rglLayout: Layout) => {
      interactingRef.current = false;
      const stored = toStored(rglLayout);
      setLocalLayout(stored);
      onLayoutChange(stored);
    },
    [onLayoutChange]
  );

  return (
    <div ref={containerRef} data-dashboard-grid="edit" data-edit="true">
      <GridLayout
        width={width}
        layout={localLayout}
        gridConfig={gridConfig}
        dragConfig={dragConfig}
        resizeConfig={resizeConfig}
        compactor={fixedPositionCompactor}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleInteractionStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleInteractionStop}
      >
        {cards.map((card) => (
          <div key={card.id} style={{ height: "100%", background: "transparent" }}>
            <CardWrapper
              editMode
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card.id)}
            >
              <DashboardCard card={card} />
            </CardWrapper>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
