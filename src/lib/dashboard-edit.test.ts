import { describe, expect, it } from "vitest";
import type { Page } from "../types/dashboard";
import {
  addDraftCard,
  addDraftPage,
  clonePages,
  deleteDraftCard,
  deleteDraftPage,
  layoutItemsOverlap,
  reorderDraftPages,
  restoreDraftCard,
  updateDraftLayout,
} from "./dashboard-edit";

const pages: Page[] = [
  {
    id: "home",
    name: "Home",
    icon: "Home",
    cards: [
      { id: "light", type: "light", entityId: "light.test" },
      { id: "sensor", type: "sensor", entityId: "sensor.test" },
    ],
    layout: [
      { i: "light", x: 0, y: 0, w: 2, h: 2 },
      { i: "sensor", x: 4, y: 0, w: 4, h: 2 },
    ],
  },
];

describe("dashboard edit helpers", () => {
  it("clones pages without sharing nested card or layout objects", () => {
    const cloned = clonePages(pages);
    cloned[0].cards[0].title = "Changed";
    cloned[0].layout[0].x = 8;

    expect(pages[0].cards[0].title).toBeUndefined();
    expect(pages[0].layout[0].x).toBe(0);
  });

  it("keeps existing cards fixed when a layout contains a collision", () => {
    const overlapping = [
      { i: "light", x: 4, y: 0, w: 2, h: 2 },
      { i: "sensor", x: 4, y: 0, w: 4, h: 2 },
    ];

    expect(layoutItemsOverlap(overlapping[0], overlapping[1])).toBe(true);
    expect(updateDraftLayout(pages, "home", overlapping)).toBe(pages);
    expect(pages[0].layout[1]).toMatchObject({ x: 4, y: 0 });
  });

  it("rejects invalid page, order, and card mutations", () => {
    expect(deleteDraftPage(pages, "home")).toBe(pages);
    expect(addDraftPage(pages, "Duplicate", "home")).toBe(pages);
    expect(reorderDraftPages(pages, ["missing"])).toBe(pages);
    expect(
      addDraftCard(
        pages,
        "home",
        { id: "new", type: "switch", entityId: "switch.test" },
        { i: "new", x: 1, y: 0, w: 4, h: 2 }
      )
    ).toBe(pages);
  });

  it("restores a deleted card and its original position", () => {
    const result = deleteDraftCard(pages, "home", "light");
    expect(result.deletion).not.toBeNull();
    expect(result.pages[0].cards.map((card) => card.id)).toEqual(["sensor"]);

    const restored = restoreDraftCard(result.pages, result.deletion!);
    expect(restored[0].cards.map((card) => card.id)).toEqual([
      "light",
      "sensor",
    ]);
    expect(restored[0].layout[0]).toEqual(pages[0].layout[0]);
  });
});
