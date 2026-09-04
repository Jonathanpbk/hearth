import { describe, expect, it } from "vitest";
import type { HassEntity } from "home-assistant-js-websocket";
import { getEntityBlockReason, isUnavailableEntity } from "./entity-state";
import { useEntityStore } from "../store/useEntityStore";

function entity(state: string): HassEntity {
  return {
    entity_id: "light.test",
    state,
    attributes: {},
    last_changed: "2026-01-01T00:00:00Z",
    last_updated: "2026-01-01T00:00:00Z",
    context: { id: "test", parent_id: null, user_id: null },
  };
}

describe("entity state reliability", () => {
  it("blocks controls while Home Assistant connects or is disconnected", () => {
    expect(getEntityBlockReason(entity("on"), "connecting")).toBe("Connecting");
    expect(getEntityBlockReason(entity("on"), "disconnected")).toBe("Disconnected");
  });

  it("identifies missing entities after connecting", () => {
    expect(getEntityBlockReason(undefined, "connected")).toBe("Entity not found");
  });

  it("identifies unavailable and unknown entity states", () => {
    const unavailable = entity("unavailable");
    const unknown = entity("unknown");

    expect(isUnavailableEntity(unavailable)).toBe(true);
    expect(isUnavailableEntity(unknown)).toBe(true);
    expect(getEntityBlockReason(unavailable, "connected")).toBe("Unavailable");
    expect(getEntityBlockReason(unknown, "connected")).toBe("Unknown");
  });

  it("allows controls for a normal entity on a live connection", () => {
    expect(isUnavailableEntity(entity("off"))).toBe(false);
    expect(isUnavailableEntity(undefined)).toBe(false);
    expect(getEntityBlockReason(entity("off"), "connected")).toBeNull();
  });

  it("tracks whether the first entity snapshot has loaded", () => {
    useEntityStore.getState().beginEntityLoad();
    expect(useEntityStore.getState().hasLoadedEntities).toBe(false);

    useEntityStore.getState().setEntities({});
    expect(useEntityStore.getState().hasLoadedEntities).toBe(true);
  });
});
