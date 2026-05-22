import { create } from "zustand";
import type { HassEntities } from "home-assistant-js-websocket";
import type { ConnectionStatus, HaUrlSource } from "../types/ha";

interface EntityStore {
  entities: HassEntities;
  connectionStatus: ConnectionStatus;
  activeHaUrl: HaUrlSource | null;
  setEntities: (entities: HassEntities) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setActiveHaUrl: (source: HaUrlSource | null) => void;
}

export const useEntityStore = create<EntityStore>()((set) => ({
  entities: {},
  connectionStatus: "disconnected",
  activeHaUrl: null,
  setEntities: (entities) => set({ entities }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setActiveHaUrl: (activeHaUrl) => set({ activeHaUrl }),
}));
