import type { Page } from "@playwright/test";

export interface MockEntity {
  state: string;
  attributes: Record<string, unknown>;
}

export interface MockMessage {
  id?: number;
  type: string;
  domain?: string;
  service?: string;
  target?: { entity_id?: string };
  service_data?: Record<string, unknown>;
}

export const mockEntities: Record<string, MockEntity> = {
  "light.test_light": {
    state: "on",
    attributes: {
      friendly_name: "Test Light",
      brightness: 128,
      color_temp_kelvin: 3000,
      min_color_temp_kelvin: 2200,
      max_color_temp_kelvin: 4000,
      supported_color_modes: ["brightness", "color_temp"],
    },
  },
  "sensor.test_temperature": {
    state: "21.5",
    attributes: {
      friendly_name: "Test Temperature",
      unit_of_measurement: "°C",
      device_class: "temperature",
    },
  },
  "fan.dreo": {
    state: "on",
    attributes: {
      friendly_name: "Dreo fan",
      percentage: 55,
      preset_mode: "normal",
      preset_modes: ["normal", "natural", "turbo"],
    },
  },
  "switch.dreo_horizontally_oscillating": {
    state: "off",
    attributes: { friendly_name: "Horizontal oscillation" },
  },
  "switch.dreo_vertically_oscillating": {
    state: "off",
    attributes: { friendly_name: "Vertical oscillation" },
  },
  "input_boolean.dreo_custom_oscillation": {
    state: "off",
    attributes: { friendly_name: "Custom oscillation" },
  },
  "input_number.dreo_left_angle": {
    state: "-15",
    attributes: { friendly_name: "Left angle" },
  },
  "input_number.dreo_right_angle": {
    state: "15",
    attributes: { friendly_name: "Right angle" },
  },
  "input_number.dreo_oscillation_delay": {
    state: "5",
    attributes: { friendly_name: "Oscillation delay" },
  },
  "script.j_fan_position": {
    state: "off",
    attributes: { friendly_name: "J fan position" },
  },
  "script.ags_fan_position": {
    state: "off",
    attributes: { friendly_name: "A fan position" },
  },
  "script.set_fan_to_treadmill_position": {
    state: "off",
    attributes: { friendly_name: "Treadmill fan position" },
  },
  "script.day_lights": {
    state: "off",
    attributes: { friendly_name: "Day lights" },
  },
  "script.chill_lights": {
    state: "off",
    attributes: { friendly_name: "Chill lights" },
  },
  "script.mood_lights": {
    state: "off",
    attributes: { friendly_name: "Mood lights" },
  },
  "script.cinema_lights": {
    state: "off",
    attributes: { friendly_name: "Cinema lights" },
  },
  "script.purple_back_lights": {
    state: "off",
    attributes: { friendly_name: "Purple back lights" },
  },
  "script.lights_out": {
    state: "off",
    attributes: { friendly_name: "Lights out" },
  },
};

export const persistedSettings = {
  state: {
    settings: {
      haUrl: "http://127.0.0.1:4173",
      haToken: "test-token",
      weatherEntityId: "weather.home",
      cameraEnabled: false,
      go2rtcUrl: "",
      cameraEventName: "pwa_camera_trigger",
      cameraDefaultDuration: 10000,
      wakeLockEnabled: false,
      clockFormat: "24h",
      showDock: true,
      autoDim: false,
      dimTimeout: 60,
      pages: [
        {
          id: "test-page",
          name: "Home",
          icon: "LayoutDashboard",
          cards: [
            { id: "light-card", type: "light", entityId: "light.test_light" },
            { id: "sensor-card", type: "sensor", entityId: "sensor.test_temperature" },
            { id: "scenes-card", type: "scenes", entityId: "" },
            { id: "fan-card", type: "dreo-fan", entityId: "" },
          ],
          layout: [
            { i: "light-card", x: 0, y: 0, w: 4, h: 2 },
            { i: "sensor-card", x: 4, y: 0, w: 4, h: 2 },
            { i: "scenes-card", x: 8, y: 0, w: 4, h: 2 },
            { i: "fan-card", x: 12, y: 0, w: 4, h: 6 },
          ],
        },
      ],
    },
  },
  version: 0,
};

export async function installHearthTestHarness(page: Page): Promise<void> {
  await page.addInitScript(
    ({ entities, settings }) => {
      localStorage.setItem("hearth-settings", JSON.stringify(settings));

      const browserWindow = window as unknown as {
        __haMessages: MockMessage[];
        __haMock: {
          disconnect: () => void;
          reconnect: () => void;
        };
      };
      browserWindow.__haMessages = [];

      let online = true;
      const sockets = new Set<FakeWebSocket>();

      function compactEntities() {
        const changed = Math.floor(Date.now() / 1000);
        return Object.fromEntries(
          Object.entries(entities).map(([entityId, entity]) => [
            entityId,
            {
              s: entity.state,
              a: entity.attributes,
              c: { id: `mock-${entityId}`, parent_id: null, user_id: null },
              lc: changed,
            },
          ])
        );
      }

      class FakeWebSocket extends EventTarget {
        static readonly CONNECTING = 0;
        static readonly OPEN = 1;
        static readonly CLOSING = 2;
        static readonly CLOSED = 3;

        readonly CONNECTING = FakeWebSocket.CONNECTING;
        readonly OPEN = FakeWebSocket.OPEN;
        readonly CLOSING = FakeWebSocket.CLOSING;
        readonly CLOSED = FakeWebSocket.CLOSED;
        readonly url: string;
        readonly protocol = "";
        readonly extensions = "";
        bufferedAmount = 0;
        binaryType: BinaryType = "blob";
        readyState = FakeWebSocket.CONNECTING;

        constructor(url: string | URL) {
          super();
          this.url = String(url);
          sockets.add(this);
          window.setTimeout(() => this.openFromServer(), 0);
        }

        private openFromServer() {
          if (!online || this.readyState !== FakeWebSocket.CONNECTING) return;
          this.readyState = FakeWebSocket.OPEN;
          this.dispatchEvent(new Event("open"));
        }

        private sendFromServer(payload: unknown) {
          if (this.readyState !== FakeWebSocket.OPEN) return;
          this.dispatchEvent(
            new MessageEvent("message", { data: JSON.stringify(payload) })
          );
        }

        send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
          const message = JSON.parse(String(data)) as MockMessage;
          browserWindow.__haMessages.push(message);

          if (message.type === "auth") {
            queueMicrotask(() =>
              this.sendFromServer({ type: "auth_ok", ha_version: "2026.9.0" })
            );
            return;
          }

          if (message.type === "subscribe_entities") {
            queueMicrotask(() => {
              this.sendFromServer({
                id: message.id,
                type: "result",
                success: true,
                result: null,
              });
              this.sendFromServer({
                id: message.id,
                type: "event",
                event: { a: compactEntities() },
              });
            });
            return;
          }

          if (
            message.type === "subscribe_events" ||
            message.type === "unsubscribe_events" ||
            message.type === "call_service"
          ) {
            queueMicrotask(() =>
              this.sendFromServer({
                id: message.id,
                type: "result",
                success: true,
                result: {},
              })
            );
          }
        }

        close(code = 1000, reason = "") {
          if (this.readyState === FakeWebSocket.CLOSED) return;
          this.readyState = FakeWebSocket.CLOSED;
          sockets.delete(this);
          this.dispatchEvent(
            new CloseEvent("close", { code, reason, wasClean: code === 1000 })
          );
        }

        disconnectFromServer() {
          if (this.readyState !== FakeWebSocket.OPEN) return;
          this.readyState = FakeWebSocket.CLOSED;
          sockets.delete(this);
          this.dispatchEvent(
            new CloseEvent("close", { code: 1006, wasClean: false })
          );
        }

        reconnectFromServer() {
          this.openFromServer();
        }
      }

      browserWindow.__haMock = {
        disconnect() {
          online = false;
          for (const socket of [...sockets]) socket.disconnectFromServer();
        },
        reconnect() {
          online = true;
          for (const socket of [...sockets]) socket.reconnectFromServer();
        },
      };

      window.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    },
    { entities: mockEntities, settings: persistedSettings }
  );

  await page.route("**/api/history/period/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        [
          { state: "20.5", last_changed: "2026-09-04T08:00:00Z" },
          { state: "21.0", last_changed: "2026-09-04T12:00:00Z" },
          { state: "21.5", last_changed: "2026-09-04T16:00:00Z" },
        ],
      ]),
    });
  });
}
