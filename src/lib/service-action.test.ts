import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeServiceAction, serviceFailureMessage } from "./service-action";
import { useServiceErrorStore } from "../store/useServiceErrorStore";

beforeEach(() => {
  useServiceErrorStore.setState({ notice: null });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("service action reliability", () => {
  it("reports success only after the service promise resolves", async () => {
    let resolveAction: (() => void) | undefined;
    const pending = executeServiceAction(
      "Toggle test light",
      () => new Promise<void>((resolve) => { resolveAction = resolve; })
    );

    expect(useServiceErrorStore.getState().notice).toBeNull();
    resolveAction?.();

    await expect(pending).resolves.toBe(true);
    expect(useServiceErrorStore.getState().notice).toBeNull();
  });

  it("catches rejected Home Assistant service calls", async () => {
    const result = await executeServiceAction("Toggle test light", () =>
      Promise.reject(new Error("service unavailable"))
    );

    expect(result).toBe(false);
    expect(useServiceErrorStore.getState().notice?.message).toBe(
      "Toggle test light failed"
    );
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("turns a synchronous missing-connection error into a useful message", async () => {
    const result = await executeServiceAction("Run scene", () => {
      throw new Error("No active HA connection");
    });

    expect(result).toBe(false);
    expect(useServiceErrorStore.getState().notice?.message).toBe(
      "Home Assistant is disconnected"
    );
  });

  it("does not let an old notice clear a newer failure", () => {
    const store = useServiceErrorStore.getState();
    store.showError("First failure");
    const firstId = useServiceErrorStore.getState().notice?.id;
    store.showError("Second failure");

    useServiceErrorStore.getState().clearError(firstId);

    expect(useServiceErrorStore.getState().notice?.message).toBe("Second failure");
  });
});

describe("service failure messages", () => {
  it("does not expose internal Home Assistant errors to the dashboard", () => {
    expect(serviceFailureMessage("Set fan speed", new Error("private detail"))).toBe(
      "Set fan speed failed"
    );
  });
});
