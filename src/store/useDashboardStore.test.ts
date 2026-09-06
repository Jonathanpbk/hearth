import { afterEach, describe, expect, it } from "vitest";
import type { Page } from "../types/dashboard";
import { useDashboardStore } from "./useDashboardStore";

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

afterEach(() => {
  useDashboardStore.setState({
    editMode: false,
    currentPageId: null,
    draftPages: null,
  });
});

describe("dashboard edit store", () => {
  it("edits an isolated draft and discards it", () => {
    const store = useDashboardStore.getState();
    store.beginEdit(pages);
    useDashboardStore.getState().updateLayout("home", [
      { i: "light", x: 2, y: 0, w: 2, h: 2 },
      { i: "sensor", x: 4, y: 0, w: 4, h: 2 },
    ]);

    expect(useDashboardStore.getState().draftPages?.[0].layout[0].x).toBe(2);
    expect(pages[0].layout[0].x).toBe(0);

    useDashboardStore.getState().discardEdit();
    expect(useDashboardStore.getState()).toMatchObject({
      editMode: false,
      draftPages: null,
    });
  });

  it("rejects mutations when no edit session exists", () => {
    const store = useDashboardStore.getState();
    store.updateLayout("home", pages[0].layout);
    store.deletePage("home");
    store.addPage("Other", "other");

    expect(useDashboardStore.getState().draftPages).toBeNull();
  });
});
