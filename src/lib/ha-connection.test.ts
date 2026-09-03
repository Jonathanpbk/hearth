import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
} from "home-assistant-js-websocket";
import {
  getConnection,
  initConnection,
  stopConnection,
} from "./ha-connection";
import { useEntityStore } from "../store/useEntityStore";

vi.mock("home-assistant-js-websocket", () => ({
  createConnection: vi.fn(),
  createLongLivedTokenAuth: vi.fn(),
  subscribeEntities: vi.fn(),
}));

type ConnectionEvent = "ready" | "disconnected" | "reconnect-error";
type Listener = (connection: Connection, eventData?: unknown) => void;

interface FakeConnection {
  connection: Connection;
  close: ReturnType<typeof vi.fn>;
  emit: (event: ConnectionEvent) => void;
}

function makeConnection(): FakeConnection {
  const listeners = new Map<ConnectionEvent, Set<Listener>>();
  let connected = true;

  const close = vi.fn(() => {
    connected = false;
  });

  const connection = {
    get connected() {
      return connected;
    },
    close,
    addEventListener(event: ConnectionEvent, listener: Listener) {
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener(event: ConnectionEvent, listener: Listener) {
      listeners.get(event)?.delete(listener);
    },
  } as unknown as Connection;

  return {
    connection,
    close,
    emit(event) {
      connected = event === "ready";
      listeners.get(event)?.forEach((listener) => listener(connection));
    },
  };
}

const createConnectionMock = vi.mocked(createConnection);
const createAuthMock = vi.mocked(createLongLivedTokenAuth);
const subscribeEntitiesMock = vi.mocked(subscribeEntities);

beforeEach(() => {
  vi.useRealTimers();
  createConnectionMock.mockReset();
  createAuthMock.mockReset();
  subscribeEntitiesMock.mockReset();

  createAuthMock.mockImplementation(
    (hassUrl) => ({ hassUrl }) as unknown as ReturnType<typeof createLongLivedTokenAuth>
  );
  subscribeEntitiesMock.mockReturnValue(vi.fn());
  vi.stubGlobal("fetch", vi.fn());

  useEntityStore.setState({
    entities: {},
    connectionStatus: "disconnected",
    activeHaUrl: null,
  });
});

afterEach(() => {
  stopConnection();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home Assistant connection lifecycle", () => {
  it("prefers the local endpoint when its probe succeeds", async () => {
    const local = makeConnection();
    vi.mocked(fetch).mockResolvedValue({} as Response);
    createConnectionMock.mockResolvedValue(local.connection);

    await initConnection(" http://ha.local/ ", "https://ha.example.com/", " token ");

    expect(createAuthMock).toHaveBeenCalledWith("http://ha.local", "token");
    expect(getConnection()).toBe(local.connection);
    expect(useEntityStore.getState()).toMatchObject({
      connectionStatus: "connected",
      activeHaUrl: "local",
    });
  });

  it("falls back to remote when the local WebSocket connection fails", async () => {
    const remote = makeConnection();
    vi.mocked(fetch).mockResolvedValue({} as Response);
    createConnectionMock
      .mockRejectedValueOnce(new Error("local failed"))
      .mockResolvedValueOnce(remote.connection);

    await initConnection("http://ha.local", "https://ha.example.com", "token");

    expect(createAuthMock).toHaveBeenNthCalledWith(1, "http://ha.local", "token");
    expect(createAuthMock).toHaveBeenNthCalledWith(
      2,
      "https://ha.example.com",
      "token"
    );
    expect(getConnection()).toBe(remote.connection);
    expect(useEntityStore.getState().activeHaUrl).toBe("remote");
  });

  it("retries after an initial connection failure", async () => {
    vi.useFakeTimers();
    const retryConnection = makeConnection();
    createConnectionMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(retryConnection.connection);

    await initConnection("", "https://ha.example.com", "token");
    expect(useEntityStore.getState().connectionStatus).toBe("disconnected");

    await vi.advanceTimersByTimeAsync(1000);

    expect(createConnectionMock).toHaveBeenCalledTimes(2);
    expect(getConnection()).toBe(retryConnection.connection);
    expect(useEntityStore.getState().connectionStatus).toBe("connected");
  });

  it("reselects the remote endpoint after a local connection drops", async () => {
    vi.useFakeTimers();
    const local = makeConnection();
    const remote = makeConnection();
    vi.mocked(fetch)
      .mockResolvedValueOnce({} as Response)
      .mockRejectedValueOnce(new TypeError("local unreachable"));
    createConnectionMock
      .mockResolvedValueOnce(local.connection)
      .mockResolvedValueOnce(remote.connection);

    await initConnection("http://ha.local", "https://ha.example.com", "token");
    local.emit("disconnected");

    expect(useEntityStore.getState().connectionStatus).toBe("disconnected");
    await vi.advanceTimersByTimeAsync(2000);

    expect(local.close).toHaveBeenCalledOnce();
    expect(getConnection()).toBe(remote.connection);
    expect(useEntityStore.getState().activeHaUrl).toBe("remote");
  });

  it("closes a stale connection created by an overlapping attempt", async () => {
    const stale = makeConnection();
    const current = makeConnection();
    let resolveStale: ((connection: Connection) => void) | undefined;

    createConnectionMock
      .mockImplementationOnce(
        () =>
          new Promise<Connection>((resolve) => {
            resolveStale = resolve;
          })
      )
      .mockResolvedValueOnce(current.connection);

    const staleAttempt = initConnection("http://ha.local", "", "token");
    await vi.waitFor(() => expect(createConnectionMock).toHaveBeenCalledOnce());

    await initConnection("", "https://ha.example.com", "token");
    resolveStale?.(stale.connection);
    await staleAttempt;

    expect(stale.close).toHaveBeenCalledOnce();
    expect(getConnection()).toBe(current.connection);
    expect(useEntityStore.getState().activeHaUrl).toBe("remote");
  });

  it("cancels retries and closes the active connection when stopped", async () => {
    const connection = makeConnection();
    createConnectionMock.mockResolvedValue(connection.connection);

    await initConnection("", "https://ha.example.com", "token");
    stopConnection();

    expect(connection.close).toHaveBeenCalledOnce();
    expect(() => getConnection()).toThrow("No active HA connection");
    expect(useEntityStore.getState()).toMatchObject({
      connectionStatus: "disconnected",
      activeHaUrl: null,
    });
  });
});
