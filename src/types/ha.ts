export type {
  HassEntity,
  HassEntities,
  Connection,
} from "home-assistant-js-websocket";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
export type HaUrlSource = "local" | "remote";

export interface HaServiceCallData {
  entity_id?: string | string[];
  [key: string]: unknown;
}
