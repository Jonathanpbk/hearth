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

  useEntityStore.setState({
    entities: {},
    connectionStatus: "disconnected",
  });
});

afterEach(() => {
  stopConnection();
  vi.useRealTimers();
});

describe("Home Assistant connection lifecycle", () => {
  it("normalizes the configured URL and token", async () => {
    const connection = makeConnection();
    createConnectionMock.mockResolvedValue(connection.connection);

    await initConnection(" https://ha.example.com/ ", " token ");

    expect(createAuthMock).toHaveBeenCalledWith(
      "https://ha.example.com",
      "token"
    );
    expect(getConnection()).toBe(connection.connection);
    expect(useEntityStore.getState().connectionStatus).toBe("connected");
  });

  it("retries after an initial connection failure", async () => {
    vi.useFakeTimers();
    const retryConnection = makeConnection();
    createConnectionMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(retryConnection.connection);

    await initConnection("https://ha.example.com", "token");
    expect(useEntityStore.getState().connectionStatus).toBe("disconnected");

    await vi.advanceTimersByTimeAsync(1000);

    expect(createConnectionMock).toHaveBeenCalledTimes(2);
    expect(getConnection()).toBe(retryConnection.connection);
    expect(useEntityStore.getState().connectionStatus).toBe("connected");
  });

  it("reconnects after an established connection drops", async () => {
    vi.useFakeTimers();
    const first = makeConnection();
    const second = makeConnection();
    createConnectionMock
      .mockResolvedValueOnce(first.connection)
      .mockResolvedValueOnce(second.connection);

    await initConnection("https://ha.example.com", "token");
    first.emit("disconnected");

    expect(useEntityStore.getState().connectionStatus).toBe("disconnected");
    await vi.advanceTimersByTimeAsync(2000);

    expect(first.close).toHaveBeenCalledOnce();
    expect(createConnectionMock).toHaveBeenCalledTimes(2);
    expect(getConnection()).toBe(second.connection);
  });

  it("keeps the connection when it becomes ready during the grace period", async () => {
    vi.useFakeTimers();
    const connection = makeConnection();
    createConnectionMock.mockResolvedValue(connection.connection);

    await initConnection("https://ha.example.com", "token");
    connection.emit("disconnected");
    connection.emit("ready");
    await vi.advanceTimersByTimeAsync(2000);

    expect(createConnectionMock).toHaveBeenCalledOnce();
    expect(connection.close).not.toHaveBeenCalled();
    expect(useEntityStore.getState().connectionStatus).toBe("connected");
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

    const staleAttempt = initConnection("https://old.example.com", "token");
    await vi.waitFor(() => expect(createConnectionMock).toHaveBeenCalledOnce());

    await initConnection("https://ha.example.com", "token");
    resolveStale?.(stale.connection);
    await staleAttempt;

    expect(stale.close).toHaveBeenCalledOnce();
    expect(getConnection()).toBe(current.connection);
  });

  it("does not connect without both a URL and token", async () => {
    await initConnection("", "token");
    await initConnection("https://ha.example.com", "");

    expect(createConnectionMock).not.toHaveBeenCalled();
    expect(useEntityStore.getState().connectionStatus).toBe("disconnected");
  });

  it("closes the active connection when stopped", async () => {
    const connection = makeConnection();
    const unsubscribe = vi.fn();
    createConnectionMock.mockResolvedValue(connection.connection);
    subscribeEntitiesMock.mockReturnValue(unsubscribe);

    await initConnection("https://ha.example.com", "token");
    stopConnection();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(connection.close).toHaveBeenCalledOnce();
    expect(() => getConnection()).toThrow("No active HA connection");
    expect(useEntityStore.getState().connectionStatus).toBe("disconnected");
  });
});
