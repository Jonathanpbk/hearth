import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
} from "home-assistant-js-websocket";
import { useEntityStore } from "../store/useEntityStore";
import {
  HA_PROBE_TIMEOUT_MS,
  HA_RECONNECT_GRACE_MS,
  HA_RETRY_DELAYS_MS,
} from "../config/defaults";
import type { HaUrlSource } from "../types/ha";

interface ConnectionConfig {
  localUrl: string;
  remoteUrl: string;
  token: string;
}

interface Endpoint {
  url: string;
  source: HaUrlSource;
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

function toConfig(
  haLocalUrl: string,
  haRemoteUrl: string,
  haToken: string
): ConnectionConfig {
  return {
    localUrl: normalizeUrl(haLocalUrl),
    remoteUrl: normalizeUrl(haRemoteUrl),
    token: haToken.trim(),
  };
}

function isConfigured(config: ConnectionConfig): boolean {
  return Boolean(config.token && (config.localUrl || config.remoteUrl));
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

async function isReachable(url: string, token: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HA_PROBE_TIMEOUT_MS);

  try {
    await fetch(url + "/api/", {
      headers: { Authorization: "Bearer " + token },
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveEndpoints(config: ConnectionConfig): Promise<Endpoint[]> {
  const local = config.localUrl
    ? { url: config.localUrl, source: "local" as const }
    : null;
  const remote = config.remoteUrl
    ? { url: config.remoteUrl, source: "remote" as const }
    : null;

  if (!local) return remote ? [remote] : [];
  if (!remote) return [local];

  const localReachable = await isReachable(local.url, config.token);
  return localReachable ? [local, remote] : [remote, local];
}

function setDisconnected(): void {
  const store = useEntityStore.getState();
  store.setConnectionStatus("disconnected");
  store.setActiveHaUrl(null);
}

function startNewLifecycle(config: ConnectionConfig): void {
  lifecycleId += 1;
  clearRetryTimer();
  teardownActiveConnection();
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

async function switchToPreferredEndpoint(
  id: number,
  connection: Connection,
  endpoint: Endpoint,
  config: ConnectionConfig
): Promise<void> {
  const [preferred] = await resolveEndpoints(config);
  if (
    id !== lifecycleId ||
    connection !== activeConnection ||
    !preferred ||
    preferred.url === endpoint.url
  ) {
    return;
  }

  retryAttempt = 0;
  startNewLifecycle(config);
}

function attachConnectionListeners(
  connection: Connection,
  endpoint: Endpoint,
  config: ConnectionConfig,
  id: number
): () => void {
  const handleDisconnected = () => {
    if (id !== lifecycleId || connection !== activeConnection) return;
    useEntityStore.getState().setConnectionStatus("disconnected");
    scheduleRetry(id, config, HA_RECONNECT_GRACE_MS);
  };

  const handleReady = () => {
    if (id !== lifecycleId || connection !== activeConnection) return;
    clearRetryTimer();
    retryAttempt = 0;
    const store = useEntityStore.getState();
    store.setActiveHaUrl(endpoint.source);
    store.setConnectionStatus("connected");
    void switchToPreferredEndpoint(id, connection, endpoint, config);
  };

  connection.addEventListener("disconnected", handleDisconnected);
  connection.addEventListener("ready", handleReady);

  return () => {
    connection.removeEventListener("disconnected", handleDisconnected);
    connection.removeEventListener("ready", handleReady);
  };
}

async function connect(id: number, config: ConnectionConfig): Promise<void> {
  const endpoints = await resolveEndpoints(config);
  if (id !== lifecycleId) return;

  for (const endpoint of endpoints) {
    let connection: Connection | null = null;
    try {
      const auth = createLongLivedTokenAuth(endpoint.url, config.token);
      connection = await createConnection({ auth });

      if (id !== lifecycleId) {
        connection.close();
        return;
      }

      activeConnection = connection;
      const unsubscribe = subscribeEntities(connection, (entities) => {
        if (id === lifecycleId && connection === activeConnection) {
          useEntityStore.getState().setEntities(entities);
        }
      });

      unsubscribeEntities = unsubscribe;
      removeConnectionListeners = attachConnectionListeners(
        connection,
        endpoint,
        config,
        id
      );
      retryAttempt = 0;

      const store = useEntityStore.getState();
      store.setActiveHaUrl(endpoint.source);
      store.setConnectionStatus("connected");
      return;
    } catch {
      connection?.close();
      if (activeConnection === connection) activeConnection = null;
      if (id !== lifecycleId) return;
    }
  }

  if (id !== lifecycleId) return;
  setDisconnected();
  scheduleRetry(id, config);
}

export async function initConnection(
  haLocalUrl: string,
  haRemoteUrl: string,
  haToken: string
): Promise<void> {
  const config = toConfig(haLocalUrl, haRemoteUrl, haToken);

  lifecycleId += 1;
  const id = lifecycleId;
  retryAttempt = 0;
  clearRetryTimer();
  teardownActiveConnection();

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
