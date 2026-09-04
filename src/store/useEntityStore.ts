import { create } from "zustand";
import type { HassEntities } from "home-assistant-js-websocket";
import type { ConnectionStatus } from "../types/ha";

interface EntityStore {
  entities: HassEntities;
  hasLoadedEntities: boolean;
  connectionStatus: ConnectionStatus;
  setEntities: (entities: HassEntities) => void;
  beginEntityLoad: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useEntityStore = create<EntityStore>()((set) => ({
  entities: {},
  hasLoadedEntities: false,
  connectionStatus: "disconnected",
  setEntities: (entities) => set({ entities, hasLoadedEntities: true }),
  beginEntityLoad: () => set({ hasLoadedEntities: false }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));
