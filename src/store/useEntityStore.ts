import { create } from "zustand";
import type { HassEntities } from "home-assistant-js-websocket";
import type { ConnectionStatus } from "../types/ha";

interface EntityStore {
  entities: HassEntities;
  connectionStatus: ConnectionStatus;
  setEntities: (entities: HassEntities) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useEntityStore = create<EntityStore>()((set) => ({
  entities: {},
  connectionStatus: "disconnected",
  setEntities: (entities) => set({ entities }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));
