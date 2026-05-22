export type CardType = "light" | "switch" | "scene" | "script" | "sensor" | "weather";

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
  cards: CardConfig[];
  layout: StoredLayoutItem[];
}

export const CARD_DEFAULTS: Record<CardType, { w: number; h: number; minW: number; minH: number }> = {
  light:   { w: 3, h: 2, minW: 2, minH: 1 },
  switch:  { w: 3, h: 1, minW: 2, minH: 1 },
  scene:   { w: 2, h: 1, minW: 2, minH: 1 },
  script:  { w: 2, h: 1, minW: 2, minH: 1 },
  sensor:  { w: 3, h: 2, minW: 2, minH: 2 },
  weather: { w: 6, h: 3, minW: 4, minH: 2 },
};

export const CARD_DOMAIN: Record<CardType, string> = {
  light:   "light",
  switch:  "switch",
  scene:   "scene",
  script:  "script",
  sensor:  "sensor",
  weather: "weather",
};

export function nextRowY(layout: StoredLayoutItem[]): number {
  if (layout.length === 0) return 0;
  return Math.max(...layout.map((item) => item.y + item.h));
}
