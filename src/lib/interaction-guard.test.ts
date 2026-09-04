import { describe, expect, it, vi } from "vitest";
import { preventCardInteraction } from "./interaction-guard";

function makeEvent() {
  return {
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
  };
}

describe("card interaction guard", () => {
  it("prevents pointer defaults for blocked cards", () => {
    const event = makeEvent();

    expect(preventCardInteraction(event, true)).toBe(true);
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("leaves enabled card interactions unchanged", () => {
    const event = makeEvent();

    expect(preventCardInteraction(event, false)).toBe(false);
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
