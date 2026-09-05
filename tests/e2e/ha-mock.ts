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
  event_type?: string;
  subscription?: number;
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
      cameraEnabled: true,
      go2rtcUrl: "https://go2rtc.test",
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
          emitEvent: (eventType: string, data: unknown) => number;
          subscriberCount: (eventType: string) => number;
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
        readonly isHomeAssistant: boolean;
        readonly isGo2Rtc: boolean;
        readonly subscriptions = new Map<number, string>();

        constructor(url: string | URL) {
          super();
          this.url = String(url);
          this.isHomeAssistant = this.url.includes("127.0.0.1:4173/api/websocket");
          this.isGo2Rtc = this.url.includes("go2rtc.test");
          sockets.add(this);
          window.setTimeout(() => this.openFromServer(), 0);
        }

        private openFromServer() {
          if (
            (!online && this.isHomeAssistant) ||
            this.readyState !== FakeWebSocket.CONNECTING
          ) return;
          this.readyState = FakeWebSocket.OPEN;
          this.dispatchEvent(new Event("open"));

          if (this.isGo2Rtc) {
            window.setTimeout(() => {
              if (this.readyState === FakeWebSocket.OPEN) {
                this.dispatchEvent(new Event("error"));
              }
            }, 20);
          }
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

          if (!this.isHomeAssistant) return;

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

          if (message.type === "subscribe_events") {
            if (message.id !== undefined && message.event_type) {
              this.subscriptions.set(message.id, message.event_type);
            }
            queueMicrotask(() =>
              this.sendFromServer({
                id: message.id,
                type: "result",
                success: true,
                result: {},
              })
            );
            return;
          }

          if (message.type === "unsubscribe_events") {
            if (message.subscription !== undefined) {
              this.subscriptions.delete(message.subscription);
            }
            queueMicrotask(() =>
              this.sendFromServer({
                id: message.id,
                type: "result",
                success: true,
                result: {},
              })
            );
            return;
          }

          if (message.type === "call_service") {
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

        emitEvent(eventType: string, data: unknown): boolean {
          for (const [id, subscribedEvent] of this.subscriptions) {
            if (subscribedEvent !== eventType) continue;
            this.sendFromServer({
              id,
              type: "event",
              event: {
                event_type: eventType,
                data,
                origin: "LOCAL",
                time_fired: new Date().toISOString(),
                context: { id: "mock-camera-event", parent_id: null, user_id: null },
              },
            });
            return true;
          }
          return false;
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
          for (const socket of [...sockets]) {
            if (socket.isHomeAssistant) socket.disconnectFromServer();
          }
        },
        reconnect() {
          online = true;
          for (const socket of [...sockets]) {
            if (socket.isHomeAssistant) socket.reconnectFromServer();
          }
        },
        emitEvent(eventType, data) {
          let delivered = 0;
          for (const socket of sockets) {
            if (socket.emitEvent(eventType, data)) delivered += 1;
          }
          return delivered;
        },
        subscriberCount(eventType) {
          let count = 0;
          for (const socket of sockets) {
            for (const subscribedEvent of socket.subscriptions.values()) {
              if (subscribedEvent === eventType) count += 1;
            }
          }
          return count;
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

  await page.route("https://go2rtc.test/api/stream.mjpeg**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9"><rect width="16" height="9" fill="black"/></svg>',
    });
  });
}
