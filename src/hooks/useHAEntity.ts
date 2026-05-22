import type { HassEntity } from "home-assistant-js-websocket";
import { useEntityStore } from "../store/useEntityStore";

export function useHAEntity(entityId: string): HassEntity | undefined {
  return useEntityStore((state) => state.entities[entityId]);
}
