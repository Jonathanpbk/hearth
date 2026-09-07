import type { StoredLayoutItem } from "../types/dashboard";

export const DASHBOARD_GRID_ROWS = 10;
export const DASHBOARD_HEADER_HEIGHT = 56;
export const DASHBOARD_DOCK_SAFE_AREA = 60;
export const DASHBOARD_GRID_PADDING = 16;
export const DASHBOARD_GRID_GAP = 8;

export function computeDashboardRowHeight(viewportHeight: number): number {
  const gaps = DASHBOARD_GRID_GAP * (DASHBOARD_GRID_ROWS - 1);
  const available =
    viewportHeight -
    DASHBOARD_HEADER_HEIGHT -
    DASHBOARD_DOCK_SAFE_AREA -
    DASHBOARD_GRID_PADDING * 2 -
    gaps;

  return Math.max(50, Math.floor(available / DASHBOARD_GRID_ROWS));
}

export function getDashboardRowCount(layout: StoredLayoutItem[]): number {
  return Math.max(0, ...layout.map((item) => item.y + item.h));
}

export function getDashboardItemPlacement(item: StoredLayoutItem) {
  return {
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  };
}
