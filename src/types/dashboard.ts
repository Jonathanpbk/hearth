export type CardType = "light" | "switch" | "scene" | "script" | "sensor" | "weather" | "clock-weather" | "dreo-fan" | "scenes";

export interface CardConfig {
  id: string;
  type: CardType;
  entityId: string;
  title?: string;
}

export interface StoredLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface Page {
  id: string;
  name: string;
  icon: string;
  cards: CardConfig[];
  layout: StoredLayoutItem[];
}

// Defaults sized for a 16-column grid (scaled proportionally from the old 12-col values).
// Old minW:2 → 3, old w:3 → 4, old w:6 → 8, old minW:4 → 5.
export const CARD_DEFAULTS: Record<CardType, { w: number; h: number; minW: number; minH: number }> = {
  light:           { w: 2,  h: 1, minW: 2, minH: 1 },
  switch:          { w: 4,  h: 2, minW: 3, minH: 2 },
  scene:           { w: 3,  h: 2, minW: 3, minH: 2 },
  script:          { w: 3,  h: 2, minW: 3, minH: 2 },
  sensor:          { w: 4,  h: 2, minW: 3, minH: 2 },
  weather:         { w: 8,  h: 3, minW: 5, minH: 3 },
  "clock-weather": { w: 4,  h: 3, minW: 4, minH: 3 },
  "dreo-fan":      { w: 4,  h: 6, minW: 2, minH: 4 },
  "scenes":        { w: 4,  h: 2, minW: 4, minH: 2 },
};

export const CARD_DOMAIN: Record<CardType, string> = {
  light:           "light",
  switch:          "switch",
  scene:           "scene",
  script:          "script",
  sensor:          "sensor",
  weather:         "weather",
  "clock-weather": "",
  "dreo-fan":      "",
  "scenes":        "",
};

export function nextRowY(layout: StoredLayoutItem[]): number {
  if (layout.length === 0) return 0;
  return Math.max(...layout.map((item) => item.y + item.h));
}
