import { useEffect } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useEntityStore } from "../store/useEntityStore";
import { useCameraStore } from "../store/useCameraStore";
import { getConnection } from "../lib/ha-connection";

export function useCameraEvent(): void {
  const cameraEnabled = useSettingsStore((s) => s.settings.cameraEnabled);
  const cameraEventName = useSettingsStore((s) => s.settings.cameraEventName);
  const connectionStatus = useEntityStore((s) => s.connectionStatus);

  useEffect(() => {
    if (!cameraEnabled || !cameraEventName || connectionStatus !== "connected") return;

    let conn: ReturnType<typeof getConnection>;
    try {
      conn = getConnection();
    } catch {
      return;
    }

    let unsub: (() => void) | undefined;
    let disposed = false;

    conn
      .subscribeMessage<{ data?: unknown }>(
        (event) => {
          useCameraStore.getState().trigger(event.data);
        },
        { type: "subscribe_events", event_type: cameraEventName },
        { resubscribe: false }
      )
      .then((unsubFn) => {
        if (disposed) {
          unsubFn();
        } else {
          unsub = unsubFn;
        }
      })
      .catch((err) => {
        if (!disposed) console.error("[CameraEvent] subscribe failed:", err);
      });

    return () => {
      disposed = true;
      unsub?.();
    };
  }, [cameraEnabled, cameraEventName, connectionStatus]);
}
