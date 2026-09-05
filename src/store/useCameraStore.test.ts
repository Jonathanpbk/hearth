import { beforeEach, describe, expect, it } from "vitest";
import {
  CAMERA_MAX_DURATION_MS,
  CAMERA_MIN_DURATION_MS,
} from "../config/defaults";
import {
  normalizeCameraPayload,
  useCameraStore,
} from "./useCameraStore";

describe("camera event payloads", () => {
  beforeEach(() => {
    useCameraStore.setState({
      visible: false,
      streamName: "",
      streamMode: "webrtc",
      duration: 10000,
      triggerId: 0,
    });
  });

  it("normalizes a valid event", () => {
    expect(
      normalizeCameraPayload({
        camera_stream: " driveway ",
        mode: "mse",
        duration: 7500.4,
      })
    ).toEqual({
      streamName: "driveway",
      streamMode: "mse",
      duration: 7500,
    });
  });

  it("rejects events without a usable stream name", () => {
    expect(normalizeCameraPayload(null)).toBeNull();
    expect(normalizeCameraPayload({})).toBeNull();
    expect(normalizeCameraPayload({ camera_stream: "   " })).toBeNull();
    expect(normalizeCameraPayload({ camera_stream: 42 })).toBeNull();
  });

  it("uses safe mode and duration bounds", () => {
    expect(
      normalizeCameraPayload(
        { camera_stream: "doorbell", mode: "invalid", duration: 10 },
        8000
      )
    ).toEqual({
      streamName: "doorbell",
      streamMode: "webrtc",
      duration: CAMERA_MIN_DURATION_MS,
    });

    expect(
      normalizeCameraPayload(
        { camera_stream: "doorbell", duration: Number.NaN },
        CAMERA_MAX_DURATION_MS + 5000
      )?.duration
    ).toBe(CAMERA_MAX_DURATION_MS);

    expect(
      normalizeCameraPayload(
        { camera_stream: "doorbell", duration: Number.NaN },
        Number.NaN
      )?.duration
    ).toBe(10000);
  });

  it("restarts the overlay lifecycle for repeated events", () => {
    const event = { camera_stream: "driveway", duration: 5000 };

    useCameraStore.getState().trigger(event);
    const first = useCameraStore.getState();
    useCameraStore.getState().trigger(event);
    const second = useCameraStore.getState();

    expect(first.visible).toBe(true);
    expect(first.triggerId).toBe(1);
    expect(second.triggerId).toBe(2);
  });
});
