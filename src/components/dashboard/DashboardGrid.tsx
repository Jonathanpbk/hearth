import { useMemo } from "react";
import { DASHBOARD_GRID_COLUMNS } from "../../lib/dashboard-edit";
import {
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_PADDING,
  getDashboardItemPlacement,
  getDashboardRowCount,
} from "../../lib/dashboard-grid";
import { useDashboardRowHeight } from "../../hooks/useDashboardRowHeight";
import type { CardConfig, StoredLayoutItem } from "../../types/dashboard";
import { DashboardCard } from "./DashboardCard";

interface Props {
  cards: CardConfig[];
  layout: StoredLayoutItem[];
}

export function DashboardGrid({ cards, layout }: Props) {
  const rowHeight = useDashboardRowHeight();
  const layoutByCardId = useMemo(
    () => new Map(layout.map((item) => [item.i, item])),
    [layout]
  );
  const rowCount = getDashboardRowCount(layout);

  return (
    <div
      data-dashboard-grid="view"
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${DASHBOARD_GRID_COLUMNS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rowCount}, ${rowHeight}px)`,
        gap: DASHBOARD_GRID_GAP,
        padding: DASHBOARD_GRID_PADDING,
      }}
    >
      {cards.map((card) => {
        const item = layoutByCardId.get(card.id);
        if (!item) return null;

        return (
          <div
            key={card.id}
            data-dashboard-card={card.id}
            style={getDashboardItemPlacement(item)}
          >
            <DashboardCard card={card} />
          </div>
        );
      })}
    </div>
  );
}
