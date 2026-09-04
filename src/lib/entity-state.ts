import type { HassEntity } from "home-assistant-js-websocket";
import type { ConnectionStatus } from "../types/ha";

export type EntityBlockReason =
  | "Connecting"
  | "Disconnected"
  | "Entity not found"
  | "Unavailable"
  | "Unknown";

export function isUnavailableEntity(entity: HassEntity | undefined): boolean {
  return entity?.state === "unavailable" || entity?.state === "unknown";
}

export function getEntityBlockReason(
  entity: HassEntity | undefined,
  connectionStatus: ConnectionStatus
): EntityBlockReason | null {
  if (connectionStatus === "connecting") return "Connecting";
  if (connectionStatus === "disconnected") return "Disconnected";
  if (!entity) return "Entity not found";
  if (entity.state === "unavailable") return "Unavailable";
  if (entity.state === "unknown") return "Unknown";
  return null;
}
