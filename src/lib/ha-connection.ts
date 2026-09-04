import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
} from "home-assistant-js-websocket";
import { useEntityStore } from "../store/useEntityStore";
import {
  HA_RECONNECT_GRACE_MS,
  HA_RETRY_DELAYS_MS,
} from "../config/defaults";

interface ConnectionConfig {
  url: string;
  token: string;
}

let activeConnection: Connection | null = null;
let unsubscribeEntities: (() => void) | null = null;
let removeConnectionListeners: (() => void) | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleId = 0;
let retryAttempt = 0;

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function toConfig(haUrl: string, haToken: string): ConnectionConfig {
  return {
    url: normalizeUrl(haUrl),
    token: haToken.trim(),
  };
}

function isConfigured(config: ConnectionConfig): boolean {
  return Boolean(config.url && config.token);
}

function clearRetryTimer(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function teardownActiveConnection(): void {
  removeConnectionListeners?.();
  removeConnectionListeners = null;

  unsubscribeEntities?.();
  unsubscribeEntities = null;

  activeConnection?.close();
  activeConnection = null;
}

function setDisconnected(): void {
  useEntityStore.getState().setConnectionStatus("disconnected");
}

function startNewLifecycle(config: ConnectionConfig): void {
  lifecycleId += 1;
  clearRetryTimer();
  teardownActiveConnection();
  useEntityStore.getState().beginEntityLoad();
  useEntityStore.getState().setConnectionStatus("connecting");
  void connect(lifecycleId, config);
}

function scheduleRetry(
  id: number,
  config: ConnectionConfig,
  delayOverride?: number
): void {
  if (id !== lifecycleId || retryTimer) return;

  const delay =
    delayOverride ??
    HA_RETRY_DELAYS_MS[Math.min(retryAttempt, HA_RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (id !== lifecycleId) return;
    startNewLifecycle(config);
  }, delay);
}

function attachConnectionListeners(
  connection: Connection,
  config: ConnectionConfig,
  id: number
): () => void {
  const handleDisconnected = () => {
    if (id !== lifecycleId || connection !== activeConnection) return;
    setDisconnected();
    scheduleRetry(id, config, HA_RECONNECT_GRACE_MS);
  };

  const handleReady = () => {
    if (id !== lifecycleId || connection !== activeConnection) return;
    clearRetryTimer();
    retryAttempt = 0;
    useEntityStore.getState().setConnectionStatus("connected");
  };

  connection.addEventListener("disconnected", handleDisconnected);
  connection.addEventListener("ready", handleReady);

  return () => {
    connection.removeEventListener("disconnected", handleDisconnected);
    connection.removeEventListener("ready", handleReady);
  };
}

async function connect(id: number, config: ConnectionConfig): Promise<void> {
  let connection: Connection | null = null;

  try {
    const auth = createLongLivedTokenAuth(config.url, config.token);
    connection = await createConnection({ auth });

    if (id !== lifecycleId) {
      connection.close();
      return;
    }

    activeConnection = connection;
    unsubscribeEntities = subscribeEntities(connection, (entities) => {
      if (id === lifecycleId && connection === activeConnection) {
        useEntityStore.getState().setEntities(entities);
        useEntityStore.getState().setConnectionStatus("connected");
      }
    });
    removeConnectionListeners = attachConnectionListeners(connection, config, id);
    retryAttempt = 0;
  } catch {
    connection?.close();
    if (activeConnection === connection) activeConnection = null;
    if (id !== lifecycleId) return;

    setDisconnected();
    scheduleRetry(id, config);
  }
}

export async function initConnection(
  haUrl: string,
  haToken: string
): Promise<void> {
  const config = toConfig(haUrl, haToken);

  lifecycleId += 1;
  const id = lifecycleId;
  retryAttempt = 0;
  clearRetryTimer();
  teardownActiveConnection();
  useEntityStore.getState().beginEntityLoad();

  if (!isConfigured(config)) {
    setDisconnected();
    return;
  }

  useEntityStore.getState().setConnectionStatus("connecting");
  await connect(id, config);
}

export function stopConnection(): void {
  lifecycleId += 1;
  retryAttempt = 0;
  clearRetryTimer();
  teardownActiveConnection();
  setDisconnected();
}

export function getConnection(): Connection {
  if (!activeConnection?.connected) {
    throw new Error("No active HA connection");
  }
  return activeConnection;
}
