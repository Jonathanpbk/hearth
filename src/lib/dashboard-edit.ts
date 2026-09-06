import type { CardConfig, Page, StoredLayoutItem } from "../types/dashboard";
import { nextRowY } from "../types/dashboard";

export const DASHBOARD_GRID_COLUMNS = 16;

export interface DeletedCardSnapshot {
  pageId: string;
  card: CardConfig;
  layout: StoredLayoutItem;
  cardIndex: number;
  layoutIndex: number;
}

export interface DeleteCardResult {
  pages: Page[];
  deletion: DeletedCardSnapshot | null;
}

export function clonePages(pages: Page[]): Page[] {
  return pages.map((page) => ({
    ...page,
    cards: page.cards.map((card) => ({ ...card })),
    layout: page.layout.map((item) => ({ ...item })),
  }));
}

function isLayoutItemValid(item: StoredLayoutItem): boolean {
  return (
    Boolean(item.i) &&
    Number.isInteger(item.x) &&
    item.x >= 0 &&
    Number.isInteger(item.y) &&
    item.y >= 0 &&
    Number.isInteger(item.w) &&
    item.w > 0 &&
    item.x + item.w <= DASHBOARD_GRID_COLUMNS &&
    Number.isInteger(item.h) &&
    item.h > 0 &&
    (item.minW === undefined ||
      (Number.isInteger(item.minW) && item.minW > 0)) &&
    (item.minH === undefined ||
      (Number.isInteger(item.minH) && item.minH > 0))
  );
}

export function layoutItemsOverlap(
  first: StoredLayoutItem,
  second: StoredLayoutItem
): boolean {
  return !(
    first.x + first.w <= second.x ||
    second.x + second.w <= first.x ||
    first.y + first.h <= second.y ||
    second.y + second.h <= first.y
  );
}

function layoutHasCollisions(layout: StoredLayoutItem[]): boolean {
  return layout.some((item, index) =>
    layout.slice(index + 1).some((other) => layoutItemsOverlap(item, other))
  );
}

function isCompleteLayout(
  cards: CardConfig[],
  layout: StoredLayoutItem[]
): boolean {
  if (!layout.every(isLayoutItemValid) || layoutHasCollisions(layout)) {
    return false;
  }

  const cardIds = cards.map((card) => card.id);
  const layoutIds = layout.map((item) => item.i);
  return (
    new Set(cardIds).size === cardIds.length &&
    new Set(layoutIds).size === layoutIds.length &&
    cardIds.length === layoutIds.length &&
    cardIds.every((id) => layoutIds.includes(id))
  );
}

export function addDraftPage(pages: Page[], name: string, id: string): Page[] {
  const trimmedName = name.trim();
  if (!id || !trimmedName || pages.some((page) => page.id === id)) return pages;
  return [
    ...pages,
    {
      id,
      name: trimmedName,
      icon: "LayoutDashboard",
      cards: [],
      layout: [],
    },
  ];
}

export function deleteDraftPage(pages: Page[], pageId: string): Page[] {
  if (pages.length <= 1 || !pages.some((page) => page.id === pageId)) {
    return pages;
  }
  return pages.filter((page) => page.id !== pageId);
}

export function updateDraftPageMeta(
  pages: Page[],
  pageId: string,
  name: string,
  icon: string
): Page[] {
  const trimmedName = name.trim();
  if (!trimmedName || !pages.some((page) => page.id === pageId)) return pages;
  return pages.map((page) =>
    page.id === pageId
      ? { ...page, name: trimmedName, icon: icon.trim() || "LayoutDashboard" }
      : page
  );
}

export function reorderDraftPages(
  pages: Page[],
  orderedIds: string[]
): Page[] {
  if (
    orderedIds.length !== pages.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    !orderedIds.every((id) => pages.some((page) => page.id === id))
  ) {
    return pages;
  }

  const pageMap = new Map(pages.map((page) => [page.id, page]));
  return orderedIds.map((id) => pageMap.get(id)!);
}

export function addDraftCard(
  pages: Page[],
  pageId: string,
  card: CardConfig,
  layoutItem: StoredLayoutItem
): Page[] {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (
    !page ||
    !card.id ||
    layoutItem.i !== card.id ||
    page.cards.some((candidate) => candidate.id === card.id) ||
    !isLayoutItemValid(layoutItem) ||
    page.layout.some((item) => layoutItemsOverlap(item, layoutItem))
  ) {
    return pages;
  }

  return pages.map((candidate) =>
    candidate.id === pageId
      ? {
          ...candidate,
          cards: [...candidate.cards, { ...card }],
          layout: [...candidate.layout, { ...layoutItem }],
        }
      : candidate
  );
}

export function deleteDraftCard(
  pages: Page[],
  pageId: string,
  cardId: string
): DeleteCardResult {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page) return { pages, deletion: null };

  const cardIndex = page.cards.findIndex((card) => card.id === cardId);
  const layoutIndex = page.layout.findIndex((item) => item.i === cardId);
  if (cardIndex < 0 || layoutIndex < 0) return { pages, deletion: null };

  const deletion: DeletedCardSnapshot = {
    pageId,
    card: { ...page.cards[cardIndex] },
    layout: { ...page.layout[layoutIndex] },
    cardIndex,
    layoutIndex,
  };

  return {
    deletion,
    pages: pages.map((candidate) =>
      candidate.id === pageId
        ? {
            ...candidate,
            cards: candidate.cards.filter((card) => card.id !== cardId),
            layout: candidate.layout.filter((item) => item.i !== cardId),
          }
        : candidate
    ),
  };
}

export function restoreDraftCard(
  pages: Page[],
  deletion: DeletedCardSnapshot
): Page[] {
  const page = pages.find((candidate) => candidate.id === deletion.pageId);
  if (!page || page.cards.some((card) => card.id === deletion.card.id)) {
    return pages;
  }

  const originalSpaceFree = !page.layout.some((item) =>
    layoutItemsOverlap(item, deletion.layout)
  );
  const restoredLayout = originalSpaceFree
    ? { ...deletion.layout }
    : { ...deletion.layout, y: nextRowY(page.layout) };
  const cards = [...page.cards];
  const layout = [...page.layout];
  cards.splice(Math.min(deletion.cardIndex, cards.length), 0, {
    ...deletion.card,
  });
  layout.splice(Math.min(deletion.layoutIndex, layout.length), 0, restoredLayout);

  return pages.map((candidate) =>
    candidate.id === deletion.pageId ? { ...candidate, cards, layout } : candidate
  );
}

export function updateDraftCard(
  pages: Page[],
  pageId: string,
  card: CardConfig
): Page[] {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page || !page.cards.some((candidate) => candidate.id === card.id)) {
    return pages;
  }
  return pages.map((candidate) =>
    candidate.id === pageId
      ? {
          ...candidate,
          cards: candidate.cards.map((existing) =>
            existing.id === card.id ? { ...card } : existing
          ),
        }
      : candidate
  );
}

export function updateDraftLayout(
  pages: Page[],
  pageId: string,
  layout: StoredLayoutItem[]
): Page[] {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (!page || !isCompleteLayout(page.cards, layout)) return pages;
  return pages.map((candidate) =>
    candidate.id === pageId
      ? { ...candidate, layout: layout.map((item) => ({ ...item })) }
      : candidate
  );
}
