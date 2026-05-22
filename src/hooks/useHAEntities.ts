import type { HassEntity } from "home-assistant-js-websocket";
import { useShallow } from "zustand/shallow";
import { useEntityStore } from "../store/useEntityStore";

export function useHAEntities(
  entityIds: string[]
): Array<HassEntity | undefined> {
  return useEntityStore(
    useShallow((state) => entityIds.map((id) => state.entities[id]))
  );
}
