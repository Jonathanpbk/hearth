import {
  callService as haCallService,
  type Connection,
} from "home-assistant-js-websocket";
import type { HaServiceCallData } from "../types/ha";

export function callService(
  connection: Connection,
  domain: string,
  service: string,
  data: HaServiceCallData = {}
): Promise<unknown> {
  const { entity_id, ...serviceData } = data;
  return haCallService(
    connection,
    domain,
    service,
    Object.keys(serviceData).length > 0 ? serviceData : undefined,
    entity_id !== undefined ? { entity_id } : undefined
  );
}

export function turnOn(
  connection: Connection,
  entityId: string,
  attributes: Record<string, unknown> = {}
): Promise<unknown> {
  const domain = entityId.split(".")[0];
  return haCallService(
    connection,
    domain,
    "turn_on",
    Object.keys(attributes).length > 0 ? attributes : undefined,
    { entity_id: entityId }
  );
}

export function turnOff(
  connection: Connection,
  entityId: string
): Promise<unknown> {
  const domain = entityId.split(".")[0];
  return haCallService(connection, domain, "turn_off", undefined, {
    entity_id: entityId,
  });
}

export function toggle(
  connection: Connection,
  entityId: string
): Promise<unknown> {
  const domain = entityId.split(".")[0];
  return haCallService(connection, domain, "toggle", undefined, {
    entity_id: entityId,
  });
}

export function activateScene(
  connection: Connection,
  entityId: string
): Promise<unknown> {
  return haCallService(connection, "scene", "turn_on", undefined, {
    entity_id: entityId,
  });
}

export function runScript(
  connection: Connection,
  entityId: string
): Promise<unknown> {
  return haCallService(connection, "script", "turn_on", undefined, {
    entity_id: entityId,
  });
}

export function setBrightness(
  connection: Connection,
  entityId: string,
  brightness: number
): Promise<unknown> {
  return haCallService(
    connection,
    "light",
    "turn_on",
    { brightness },
    { entity_id: entityId }
  );
}

export function setColorTemp(
  connection: Connection,
  entityId: string,
  kelvin: number
): Promise<unknown> {
  return haCallService(
    connection,
    "light",
    "turn_on",
    { color_temp_kelvin: kelvin },
    { entity_id: entityId }
  );
}

export function setFanPercentage(
  connection: Connection,
  entityId: string,
  percentage: number
): Promise<unknown> {
  return haCallService(connection, "fan", "set_percentage", { percentage }, { entity_id: entityId });
}

export function setFanPresetMode(
  connection: Connection,
  entityId: string,
  presetMode: string
): Promise<unknown> {
  return haCallService(connection, "fan", "set_preset_mode", { preset_mode: presetMode }, { entity_id: entityId });
}
