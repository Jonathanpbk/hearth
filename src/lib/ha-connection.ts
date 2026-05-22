import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
} from "home-assistant-js-websocket";
import { useEntityStore } from "../store/useEntityStore";
import { HA_PROBE_TIMEOUT_MS } from "../config/defaults";
import type { HaUrlSource } from "../types/ha";

let activeConnection: Connection | null = null;
let unsubEntities: (() => void) | null = null;

async function resolveHaUrl(
  localUrl: string,
  remoteUrl: string,
  token: string
): Promise<{ url: string; source: HaUrlSource }> {
  if (!localUrl) return { url: remoteUrl, source: "remote" };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), HA_PROBE_TIMEOUT_MS);
    await fetch(`${localUrl}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(id);
    return { url: localUrl, source: "local" };
  } catch {
    return { url: remoteUrl, source: "remote" };
  }
}

function teardown(): void {
  if (unsubEntities) {
    unsubEntities();
    unsubEntities = null;
  }
  if (activeConnection) {
    activeConnection.close();
    activeConnection = null;
  }
}

export async function initConnection(
  haLocalUrl: string,
  haRemoteUrl: string,
  haToken: string
): Promise<void> {
  teardown();

  if (!haToken || (!haLocalUrl && !haRemoteUrl)) {
    useEntityStore.getState().setConnectionStatus("disconnected");
    return;
  }

  useEntityStore.getState().setConnectionStatus("connecting");

  const { url, source } = await resolveHaUrl(haLocalUrl, haRemoteUrl, haToken);
  useEntityStore.getState().setActiveHaUrl(source);

  const auth = createLongLivedTokenAuth(url.replace(/\/$/, ""), haToken);

  try {
    activeConnection = await createConnection({ auth });
  } catch {
    useEntityStore.getState().setConnectionStatus("disconnected");
    return;
  }

  const conn = activeConnection;

  // 'ready' fires on every subsequent reconnect (not the initial connect,
  // since createConnection already awaited that). Use it to re-probe the URL
  // in case the network changed (e.g. tablet moved from local to remote).
  conn.addEventListener("ready", () => {
    resolveHaUrl(haLocalUrl, haRemoteUrl, haToken).then(
      ({ url: newUrl, source: newSource }) => {
        useEntityStore.getState().setActiveHaUrl(newSource);
        useEntityStore.getState().setConnectionStatus("connected");
        // If the best URL changed, reinitialize with the new one.
        if (newUrl !== url) {
          void initConnection(haLocalUrl, haRemoteUrl, haToken);
        }
      }
    );
  });

  conn.addEventListener("disconnected", () => {
    useEntityStore.getState().setConnectionStatus("disconnected");
  });

  unsubEntities = subscribeEntities(conn, (entities) => {
    useEntityStore.getState().setEntities(entities);
  });

  useEntityStore.getState().setConnectionStatus("connected");
}

export function getConnection(): Connection {
  if (!activeConnection) throw new Error("No active HA connection");
  return activeConnection;
}
