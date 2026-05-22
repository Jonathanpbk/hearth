# Hearth — Project Specification

## Project Overview

A self-hosted Progressive Web App (PWA) named **Hearth** that serves as a custom Home Assistant dashboard.
Designed to run on a wall-mounted Android tablet (primary), Windows PC, iPhone, and Android phones.

It is a **read/control** interface only. No automation creation or editing — all of that
stays in the native HA UI. This app controls devices, displays sensor data, shows weather,
and handles motion-triggered camera overlays.

---

## Tech Stack

| Concern            | Choice                        | Notes                                              |
|--------------------|-------------------------------|----------------------------------------------------|
| Framework          | React 18 + Vite               | Fast builds, excellent PWA plugin support          |
| Language           | TypeScript                    | Throughout — no plain JS files                     |
| PWA                | vite-plugin-pwa (Workbox)     | Manifest, service worker, offline page             |
| Styling            | Tailwind CSS v3               | Dark mode only (`darkMode: 'class'`, always dark)  |
| HA Connection      | home-assistant-js-websocket   | Official library — handles reconnection, auth      |
| State Management   | Zustand                       | Lightweight store for HA entity states + app state |
| Charts             | Recharts                      | Sensor history graphs                              |
| Camera             | Native RTCPeerConnection      | WebRTC via go2rtc HTTP signaling API               |
| Icons              | Lucide React                  | Clean, consistent icon set                         |
| Routing            | React Router v6               | Dashboard view + Settings view                     |
| Container          | Nginx (Alpine)                | Serves built static files                          |
| Orchestration      | Docker Compose                | Single file deployment on Unraid                   |

---

## Repository Structure

```
hearth/
├── CLAUDE.md                  ← this file
├── docker-compose.yml
├── nginx.conf
├── Dockerfile
├── .env.example
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css              ← Tailwind base + custom CSS vars
    ├── config/
    │   └── defaults.ts        ← Default timeout values, fallback config
    ├── store/
    │   ├── useSettingsStore.ts ← Persisted settings (localStorage)
    │   ├── useEntityStore.ts   ← Live HA entity states
    │   └── useCameraStore.ts   ← Camera overlay state
    ├── lib/
    │   ├── ha-connection.ts    ← WebSocket connection manager
    │   ├── ha-service.ts       ← HA service call helpers
    │   ├── webrtc.ts           ← go2rtc WebRTC signaling + stream setup
    │   └── wakeLock.ts         ← Screen Wake Lock API wrapper
    ├── hooks/
    │   ├── useHAEntity.ts      ← Subscribe to a single entity state
    │   ├── useHAEntities.ts    ← Subscribe to multiple entity states
    │   ├── useCameraEvent.ts   ← Listen for motion trigger events
    │   └── useWakeLock.ts      ← Wake lock lifecycle hook
    ├── components/
    │   ├── layout/
    │   │   ├── DashboardLayout.tsx
    │   │   ├── Header.tsx
    │   │   └── ConnectionStatus.tsx
    │   ├── widgets/
    │   │   ├── ClockWidget.tsx
    │   │   ├── WeatherWidget.tsx      ← Current + 5-day forecast from HA weather entity
    │   │   ├── LightCard.tsx
    │   │   ├── SwitchCard.tsx
    │   │   ├── SceneCard.tsx
    │   │   ├── SensorCard.tsx         ← Single value display
    │   │   ├── SensorHistoryCard.tsx  ← Recharts sparkline/graph
    │   │   └── ScriptCard.tsx
    │   ├── camera/
    │   │   ├── CameraOverlay.tsx      ← Fullscreen overlay component
    │   │   └── WebRTCVideo.tsx        ← RTCPeerConnection + <video> element
    │   └── settings/
    │       ├── SettingsPage.tsx
    │       ├── ConnectionSettings.tsx
    │       ├── CameraSettings.tsx
    │       └── DisplaySettings.tsx
    ├── views/
    │   ├── DashboardView.tsx
    │   └── SettingsView.tsx
    └── types/
        ├── ha.ts               ← HA entity, state, service call types
        ├── weather.ts          ← Weather entity attribute types
        └── settings.ts         ← Settings store shape
```

---

## Settings Store (Option A — Device-Configured)

Settings are stored in `localStorage` via Zustand persist middleware. No hardcoded tokens.
First launch shows the settings page if HA URL or token is missing.

### Settings Shape

```typescript
interface Settings {
  // Home Assistant connection
  haLocalUrl: string;      // e.g. "http://192.168.0.x:8123" — used when reachable
  haRemoteUrl: string;     // e.g. "https://ha.yourdomain.com" — fallback
  haToken: string;         // Long-Lived Access Token (single token, works for both URLs)

  // Weather
  weatherEntityId: string; // e.g. "weather.home"

  // Camera overlay
  cameraEnabled: boolean;         // Master toggle for motion-triggered overlay
  go2rtcUrl: string;              // e.g. "http://192.168.0.x:1984"  (LAN only, no auth needed)
  cameraEventName: string;        // HA custom event name, e.g. "pwa_camera_trigger"
  cameraDefaultDuration: number;  // Overlay display duration in ms, default 10000

  // Display
  wakeLockEnabled: boolean;       // Screen Wake Lock API toggle
}
```

### Settings UI

- Accessible via a gear icon in the header
- Navigates to `/settings` via React Router
- Each section (Connection, Camera, Display) is a clearly labelled card
- Connection section has two URL fields: **Local URL** and **Remote URL**
- Both have individual "Test" buttons that attempt `GET /api/` and show a green tick or red cross inline
- Token field has a show/hide toggle
- "Test Connection" button on each URL field that calls `/api/` and shows success/fail
- Active URL indicator: shows which URL (local or remote) is currently in use
- Save persists to localStorage, navigates back to dashboard

---

## Home Assistant Connection

### Library

Use `home-assistant-js-websocket` for all WebSocket communication.

```typescript
import { createConnection, createLongLivedTokenAuth, subscribeEntities } from "home-assistant-js-websocket";
```

### Connection Manager (`src/lib/ha-connection.ts`)

- Singleton connection instance
- Reads `haLocalUrl`, `haRemoteUrl`, and `haToken` from settings store
- On initialisation, probes `haLocalUrl` first with a **2 second timeout** using a plain
  `fetch` to `{haLocalUrl}/api/` with the token. If it responds (any HTTP status), use local.
  If it times out or throws a network error, fall back to `haRemoteUrl`.
- Stores the resolved active URL in `useEntityStore` as `activeHaUrl`
  (`'local' | 'remote'`) so the UI can display it
- Exposes `getConnection()` — returns the active connection or throws if not configured
- Handles reconnection automatically (the library does this)
- On reconnection after disconnect, re-probes local vs remote (network may have changed)
- Broadcasts connection status (`connecting` | `connected` | `disconnected`) to `useEntityStore`

#### URL Probe Logic

```typescript
async function resolveHaUrl(localUrl: string, remoteUrl: string, token: string): Promise<{ url: string; source: 'local' | 'remote' }> {
  if (!localUrl) return { url: remoteUrl, source: 'remote' };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    await fetch(`${localUrl}/api/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { url: localUrl, source: 'local' };
  } catch {
    // Timed out or unreachable — fall back to remote
    return { url: remoteUrl, source: 'remote' };
  }
}
```

### Entity Subscription (`src/store/useEntityStore.ts`)

- On connection, call `subscribeEntities()` — this streams ALL entity state changes
- Store the full entity map: `Record<entityId, HassEntity>`
- Components read from this store — they never fetch entities directly
- On disconnect, keep last known state displayed (show a subtle "disconnected" indicator)

### Service Calls (`src/lib/ha-service.ts`)

Helper functions for common actions:

```typescript
callService(connection, domain, service, data)   // generic
turnOn(connection, entityId, attributes?)
turnOff(connection, entityId)
toggle(connection, entityId)
activateScene(connection, entityId)
runScript(connection, entityId)
setBrightness(connection, entityId, brightness)  // 0–255
setColorTemp(connection, entityId, kelvin)
```

### Custom Event Subscription (Camera Trigger)

```typescript
// Subscribe to a custom HA event for camera triggers
connection.subscribeEvents((event) => {
  // event.data = { camera_stream: "driveway", duration?: 10000 }
  useCameraStore.getState().trigger(event.data);
}, settings.cameraEventName);
```

The HA automation should fire this event using the `fire_event` service action with an
event type matching `cameraEventName` in settings. Payload example:
```yaml
event_type: pwa_camera_trigger
event_data:
  camera_stream: driveway   # must match a go2rtc stream name
  duration: 10000           # optional, overrides settings default (ms)
```

---

## Weather Widget

Source: HA `weather.*` entity via the entity store (no direct API calls).

### Data from Entity

```typescript
// state: "sunny" | "cloudy" | "rainy" | "partlycloudy" | etc.
// attributes:
{
  temperature: number,
  humidity: number,
  wind_speed: number,
  pressure: number,
  forecast: [
    {
      datetime: string,     // ISO
      condition: string,
      temperature: number,  // daily high
      templow: number,      // daily low
      precipitation_probability: number,
    }
    // ... up to 5 days
  ]
}
```

### Widget Layout

- Large current temperature + condition icon (top)
- Humidity, wind speed as secondary stats (small row)
- 5-day forecast strip: day name, condition icon, high/low temps
- Condition icons: use Lucide icons mapped to HA condition strings (Sun, Cloud, CloudRain, etc.)
- All values update live as the entity state changes

---

## Camera Overlay

### Flow

1. HA automation fires custom event `pwa_camera_trigger` with `camera_stream` + optional `duration`
2. `useCameraEvent` hook receives it, calls `useCameraStore.trigger()`
3. `CameraOverlay` component (always mounted, visibility controlled by store) becomes visible
4. `WebRTCVideo` component initiates WebRTC connection to go2rtc
5. Video plays fullscreen
6. After `duration` ms (or on tap/click), overlay hides and WebRTC connection is closed

### go2rtc WebRTC Signaling (`src/lib/webrtc.ts`)

go2rtc uses a simple HTTP signaling API. Do not use the AlexxIT HA integration.

```typescript
async function startWebRTCStream(
  go2rtcUrl: string,
  streamName: string,
  videoElement: HTMLVideoElement
): Promise<RTCPeerConnection> {

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // go2rtc signaling endpoint
  const response = await fetch(
    `${go2rtcUrl}/api/webrtc?src=${encodeURIComponent(streamName)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: offer.sdp! }),
    }
  );

  const answerSdp = await response.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  pc.ontrack = (event) => {
    if (event.streams[0]) {
      videoElement.srcObject = event.streams[0];
    }
  };

  return pc;
}

async function stopWebRTCStream(pc: RTCPeerConnection) {
  pc.close();
}
```

### Fallback

If the WebRTC `fetch` to go2rtc fails or `pc.connectionState` reaches `"failed"` within 3 seconds,
fall back to go2rtc MJPEG:

```
<img src="{go2rtcUrl}/api/stream.mjpeg?src={streamName}" />
```

### CameraOverlay Component

- Always rendered in the React tree (at root level in `App.tsx`), visibility gated by store state
- Uses a `useEffect` to start/stop the WebRTC connection based on store state
- Fullscreen fixed overlay: `position: fixed; inset: 0; z-index: 9999; background: black`
- Video element: `object-fit: contain`, 16:10 aspect ratio preferred
- Dismiss button (X) in top-right corner — always visible
- Auto-dismiss countdown: subtle progress bar at bottom of overlay
- Tap anywhere on overlay also dismisses
- If `cameraEnabled` is false in settings, `useCameraEvent` hook does nothing (events ignored)

---

## Screen Wake Lock (`src/lib/wakeLock.ts`)

```typescript
// Wraps the Web Screen Wake Lock API
// Supported: Chrome/Edge on Windows + Android, Safari 16.4+ on iOS

async function requestWakeLock(): Promise<WakeLockSentinel | null>
function releaseWakeLock(sentinel: WakeLockSentinel | null): void
```

- `useWakeLock` hook manages the sentinel lifecycle
- Re-requests the lock on `visibilitychange` (lock is released when tab becomes hidden)
- Activates/deactivates based on `wakeLockEnabled` in settings store
- If the API is unsupported, silently no-ops (do not error or warn the user visibly)

---

## Dashboard Layout

### Grid System

Use CSS Grid via Tailwind. The layout should be **configurable per breakpoint**:

- Mobile (portrait): single column stack
- Tablet (landscape, wall mount): 3–4 column grid
- Desktop: 4–6 column grid

Use `grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6` as a baseline.

### Widget Cards

All widgets share a base card style:
- Dark background: `bg-gray-900` or `bg-neutral-900`
- Subtle border: `border border-white/10`
- Rounded: `rounded-2xl`
- Padding: `p-4`
- No drop shadows (flat, modern look)
- Hover state: `hover:border-white/20` (subtle, not gaudy)
- Active/pressed state for controls: brief scale transform `active:scale-95`

### Header

Fixed at top, minimal height:
- Left: "Hearth" wordmark or custom label (configurable in settings)
- Centre: Clock widget (always visible)
- Right: Connection status dot (green/amber/red) + active URL indicator (house icon = local, globe icon = remote) + Settings gear icon

### Sections

The dashboard is divided into named sections, each a labelled group of cards:
- **At a Glance** — clock (header), weather widget (spans 2 cols)
- **Lights** — light cards
- **Climate** — thermostat/sensor cards  
- **Switches** — switch/plug cards
- **Scenes** — scene trigger cards
- **Sensors** — temperature, humidity, energy, motion etc.

Section labels: small uppercase, muted colour (`text-white/40`), `text-xs tracking-widest`

---

## Widget Specifications

### ClockWidget
- Large time display: hours and minutes, 12 or 24hr (setting)
- Seconds display: smaller, muted
- Date below: day name, date, month
- Updates every second via `setInterval`

### LightCard
- Entity name + current state (on/off)
- Toggle on card tap
- If entity supports brightness: vertical or circular slider (shown when card is expanded/tapped)
- If entity supports color_temp: warm/cool slider
- Brightness percentage shown when on
- When off: card visually dimmed (`opacity-50`)
- Colour: use the entity's `rgb_color` attribute as a subtle background tint when on

### SwitchCard
- Entity name + on/off state
- Toggle on tap
- Last changed timestamp (relative: "2 min ago")

### SceneCard
- Scene name
- Tap to activate (calls `scene.turn_on`)
- Brief visual "activated" flash on tap (green tint, 600ms)
- No on/off state needed

### ScriptCard
- Script name
- Tap to run
- Shows "running" state if script exposes it

### SensorCard
- Entity name + current value + unit
- Colour-coded value based on domain conventions (temperature, battery, etc.)
- Optional: small trend arrow (up/down) comparing last two states

### SensorHistoryCard
- Entity name + current value
- Recharts `AreaChart` or `LineChart` showing last 24h of history
- Fetch history once on mount via HA REST API: `GET /api/history/period/{start}?filter_entity_id={id}`
- Subtle area fill, no axes labels (clean sparkline style)
- Update current value from entity store in real time

### WeatherWidget
- See Weather Widget section above
- Spans 2 columns by default (`col-span-2`)

---

## Design System

### Colours (Tailwind config + CSS vars)

```css
:root {
  --color-bg:         #0a0a0a;   /* page background */
  --color-surface:    #111111;   /* card background */
  --color-surface-2:  #1a1a1a;   /* elevated card / input background */
  --color-border:     rgba(255,255,255,0.08);
  --color-text:       #f0f0f0;
  --color-muted:      rgba(255,255,255,0.4);
  --color-accent:     #3b82f6;   /* blue-500 — interactive highlights */
  --color-success:    #22c55e;   /* green-500 */
  --color-warning:    #f59e0b;   /* amber-500 */
  --color-danger:     #ef4444;   /* red-500 */
}
```

Always dark — no light mode. Set `<html class="dark">` permanently. Do not implement a toggle.

### Typography

- Font: `Inter` (via Google Fonts or self-hosted)
- Body: `text-sm` / `text-base`
- Widget values: `text-2xl font-semibold`
- Labels: `text-xs tracking-wider uppercase text-white/40`
- No serif fonts anywhere

### Motion

- Use `transition-all duration-200 ease-in-out` on interactive elements
- Avoid heavy animations — the dashboard should feel snappy, not flashy
- Camera overlay: fade in `opacity-0 → opacity-100` over 150ms

### Scrolling

- Dashboard is scrollable vertically on mobile
- On wall tablet (landscape), aim to fit content without scrolling if possible
- Use `overflow-hidden` on the root, `overflow-y-auto` on the content area

---

## PWA Configuration (vite-plugin-pwa)

```typescript
// vite.config.ts — PWA section
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
  manifest: {
    name: "Hearth",
    short_name: "Hearth",
    description: "Home Assistant Dashboard",
    theme_color: "#0a0a0a",
    background_color: "#0a0a0a",
    display: "standalone",
    orientation: "any",
    start_url: "/",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        // Don't cache HA API calls
        urlPattern: /\/api\//,
        handler: "NetworkOnly",
      }
    ]
  }
})
```

- App must be installable on Android (Chrome), iOS (Safari), and Windows (Edge/Chrome)
- Include an offline fallback page (`public/offline.html`) shown when HA is unreachable
- Icons: generate a full set from a single source SVG (use `pwa-asset-generator` or similar)

---

## Docker Deployment (Unraid)

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Required for React Router (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|ico|woff2|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never cache index.html or service worker
    location ~* (index\.html|sw\.js)$ {
        expires -1;
        add_header Cache-Control "no-store";
    }
}
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  hearth:
    build: .
    container_name: hearth
    restart: unless-stopped
    ports:
      - "3080:80"     # change host port as needed
    labels:
      - "com.unraid.description=Hearth — Home Assistant Dashboard PWA"
```

### Nginx Proxy Manager Setup

In NPM, create a new Proxy Host:
- **Domain:** `dashboard.yourdomain.com`
- **Scheme:** `http`
- **Forward Hostname/IP:** Unraid server LAN IP
- **Forward Port:** `3080`
- **SSL:** Request Let's Encrypt cert, force HTTPS

No special headers needed beyond NPM defaults.

---

## Build Order

Implement in this sequence — each step should be independently testable before moving on:

1. **Project scaffold** — Vite + React + TypeScript + Tailwind + vite-plugin-pwa. Confirm dev server runs.
2. **Settings store + Settings page** — Zustand persist store, settings UI, localStorage read/write. No HA connection yet.
3. **HA WebSocket connection layer** — `ha-connection.ts`, `useEntityStore`, connection status. Test with real HA instance.
4. **Entity subscription + service calls** — Confirm entities flow into the store, confirm a toggle works.
5. **Base layout + design system** — `DashboardLayout`, header, card base styles, colour tokens, Inter font.
6. **ClockWidget** — standalone, no HA dependency.
7. **WeatherWidget** — reads from HA weather entity in store.
8. **LightCard + SwitchCard** — read state, call service on tap. Test with real devices.
9. **SceneCard + ScriptCard** — simpler, no state display needed.
10. **SensorCard** — value display + unit.
11. **SensorHistoryCard** — REST API history fetch + Recharts sparkline.
12. **Wake Lock** — `wakeLock.ts`, `useWakeLock` hook, settings toggle wiring.
13. **go2rtc WebRTC** — `webrtc.ts` module. Test stream playback in isolation (a simple test page).
14. **Camera overlay** — `CameraOverlay`, `WebRTCVideo`, store, MJPEG fallback. Test with a real trigger.
15. **HA custom event subscription** — wire up `cameraEventName` subscription, test full automation → overlay flow.
16. **PWA polish** — manifest, icons, offline page, install prompt handling.
17. **Docker build** — `Dockerfile`, `nginx.conf`, `docker-compose.yml`. Test local container build.
18. **Final review pass** — responsive layout across breakpoints, connection error states, empty states.

---

## Key Constraints & Notes for Claude Code

- **TypeScript strictly throughout** — no `any` types except where genuinely unavoidable (HA event payloads). Use proper HA types from `home-assistant-js-websocket`.
- **No inline styles** — Tailwind classes only, plus CSS variables defined in `index.css`.
- **Dark mode is permanent** — `<html class="dark">` in `index.html`, `darkMode: 'class'` in Tailwind config. No light mode code.
- **go2rtc signaling is HTTP, not HA WebSocket** — do not route camera signaling through HA.
- **Camera overlay is always in the React tree** — visibility controlled by `useCameraStore`, not conditional mounting (avoids unmount/remount on every trigger).
- **Settings are device-local** — no sync between devices, no backend. Each device configures independently.
- **No backend server** — the PWA is entirely static files. All communication is directly from the browser to HA and go2rtc.
- **HA token security** — the token is stored in localStorage. This is acceptable for a private self-hosted setup. Do not log or expose it in any UI element beyond the settings field.
- **Error states must be handled** — HA disconnect, go2rtc unreachable, missing settings. Always show a meaningful UI state, never a blank screen or unhandled error.
- **Responsive is required** — the layout must work on a 7" tablet in landscape, a phone in portrait, and a 1080p desktop browser.
