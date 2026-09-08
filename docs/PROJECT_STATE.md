# Hearth project state

Last reconciled: 2026-09-08

This file is the handoff document for continuing Hearth development across conversations and tools. Read it before making changes, then verify the current GitHub branch, open pull requests, CI, and deployment state.

Where this file conflicts with `CLAUDE.md`, the current repository and this file take precedence. `CLAUDE.md` contains parts of the original specification which are now obsolete, including the former Local URL / Remote URL Home Assistant design and retired standalone card types.

## Project purpose

Hearth is a self-hosted, touch-focused Progressive Web App used as a custom Home Assistant dashboard. It is intended for the wall-mounted Android tablet first, while also working on desktop browsers, iPhone, and Android phones.

Hearth is a control and display interface. Home Assistant remains responsible for automations and device configuration.

## Current release state

- Repository: `Jonathanpbk/hearth`
- Default branch: `main`
- Current `main` commit when this file was created: `773ce1a4c6f5d17c8304358afff755c72faca3c4`
- Current release on `main`: `1.1.0`
- Last confirmed deployed and manually tested release: `1.1.0`
- Open hotfix PR: #26, `Fix Light card temperature tint`
- Hotfix branch: `fix/light-temperature-tint`
- Hotfix release: `1.1.1`
- Hotfix head before the project-state and CI follow-up commits: `016311a7056c41fb3fc0eaea3f5461035013cec9`

Do not merge or deploy a release while required CI is failing.

## Current immediate task

PR #26 fixes the Light card tint when a dual-mode RGB / colour-temperature light switches from RGB colour to colour temperature.

The implementation gives the optimistic selection for the newly selected colour mode priority over stale Home Assistant attributes from the previous mode and cancels pending requests belonging to the previous colour mode.

The first CI run for PR #26 failed only because two Playwright assertions still expected release `1.1.0` after the package and changelog were updated to `1.1.1`. The Light-card regression test itself passed. Update those stale assertions to `1.1.1`, rerun CI, and require the full suite to pass before merge.

After PR #26 passes CI and is merged:

1. Update local `main` on the Unraid host with `./update.sh`.
2. Confirm the deployed release and commit through `/api/version.json` and Settings.
3. Re-test RGB to colour-temperature switching on a real dual-mode light.
4. Confirm the card tint updates immediately without entering edit mode or refreshing.
5. Update this file to record the merged commit and confirmed deployment.

## Current supported dashboard cards

The Add Card flow intentionally exposes only these supported types:

- Clock & Weather
- Scenes group
- Light
- Sensor
- Dreo Fan

Standalone Switch, Script, Scene, and Weather cards were removed in v1.0.3. Migration removes those retired card types from existing dashboards and older backups without moving supported cards.

## Light card behaviour

The Light card was redesigned in v1.1.0. Its required interaction model is:

- Tap toggles the light.
- Horizontal drag changes brightness and the visible brightness fill.
- Pausing during a drag sends a brightness update after approximately 150 ms without movement.
- Releasing commits the final brightness.
- Dragging fully left turns the light off.
- Holding for one second opens the detailed controls.
- Detailed controls expose only capabilities supported by the entity.
- Brightness, colour temperature, and RGB controls use Home Assistant light services.
- Dual-mode lights expose Colour and Temperature tabs.
- Five colour presets are stored per light entity.
- Presets support save, apply, persistence, and clear after confirmation.
- Presets are included in settings migration and backup validation.
- The card tint should track the selected RGB colour or colour temperature immediately, without waiting for Home Assistant to echo the new mode.

### User-verified Light card behaviour after v1.1.0

The following were manually confirmed on the real Hearth deployment before PR #26:

- Tap toggles the light: PASS
- Horizontal drag changes brightness and fill: PASS
- Pausing during a drag updates the light: PASS
- Dragging fully left turns it off: PASS
- Holding for one second opens the controls: PASS
- Temperature and RGB controls match each light's capabilities: PASS
- Presets save, apply, persist, and clear after confirmation: PASS
- Layout and settings survive a reload: PASS
- Controls recover after a Wi-Fi interruption: PASS

The remaining observed defect was the delayed card tint when switching a dual-mode light from RGB to colour temperature. RGB selections updated the tint immediately, while colour-temperature selections showed the correct tint only after dashboard edit mode or a refresh forced a rerender. PR #26 targets this defect.

## Home Assistant connection

- Hearth uses `home-assistant-js-websocket`.
- There is one Home Assistant URL, not separate local and remote URLs.
- The single-URL design replaced the original dual-URL probing system in PR #2.
- The long-lived Home Assistant access token remains device-local in `localStorage`.
- Entity state is streamed into the application store.
- Established connections must not be replaced while the websocket library is already reconnecting.
- The application keeps the last known entity state visible during a disconnect but marks controls unavailable.
- Controls remain locked until a valid entity snapshot returns after reconnection.
- Service calls use shared async error handling and surface failures instead of showing false success.
- Invalid, unavailable, unknown, missing, connecting, and disconnected states must never be presented as a normal off state.

## Offline and reconnection behaviour

Required behaviour:

- Cards show a disconnected state when Home Assistant is unavailable.
- Interactive controls do not send commands while disconnected.
- Disabled sliders do not visually move under pointer or touch input.
- Scene and fan controls remain locked while offline.
- Reconnection restores controls without requiring a page reload.
- Stale connection objects, listeners, subscriptions, and timers must be cleaned up.

Browser regression coverage uses a local mocked Home Assistant websocket. CI does not require live Home Assistant credentials.

## Dashboard editing

Dashboard edits are transactional.

- Changes remain staged until Save dashboard changes.
- Cancel restores the pre-edit dashboard.
- Dragging or resizing must not push already placed cards out of position.
- Card deletion requires confirmation and supports Undo.
- Page deletion requires confirmation.
- Invalid page, card, layout, and collision states are rejected.
- Normal dashboard viewing uses a lightweight CSS grid.
- Drag / resize code loads only after edit mode starts.
- Widget modules load only when their card types are present on the active page.

Saved dashboard layout and settings must survive PWA updates, recovery, deployment, and normal reloads.

## Settings and backup format

Settings are device-local and persisted through Zustand / `localStorage`.

Connection and imported settings are validated and normalized before they replace valid data.

Current backups:

- use a versioned Hearth backup format
- exclude the Home Assistant token
- show backup metadata before import
- preserve the existing device's token during a restore
- request a token when restoring onto a device without one
- create a token-free recovery backup before replacing valid settings
- preserve migration support for older Hearth backups

Never expose the Home Assistant token in exported backups, diagnostic reports, logs, or normal UI outside the password-style settings field.

## PWA update and recovery design

Hearth has explicit update and recovery handling because stale service-worker state previously caused old builds to remain installed.

Current requirements:

- Settings shows the installed release and build commit.
- Settings performs a network-only latest-build check.
- Updates preserve local settings and dashboard layout.
- `/api/version.json` reports schema version, release, Git commit, and active entry bundle.
- `/api/pwa-update.html` provides a settings-preserving recovery route.
- Service worker and application shell cache rules prevent stale workers from being held with long-lived immutable caching.
- Updated workers must not force an open Safari / installed iPhone dashboard into an uncontrolled reload.
- Automatic runtime recovery has a persistent circuit breaker to prevent reload loops.
- Manual PWA recovery remains available after the automatic circuit breaker stops.
- Lazy chunk failures surface a recovery UI rather than a blank page.

## iPhone / Safari reliability

Specific fixes already merged:

- Avoid replacing an established Home Assistant socket while its websocket library is reconnecting.
- Keep the Clock & Weather layout separated on narrow iPhone viewports.
- Update the clock once per minute rather than once per second.
- Prevent service-worker controller changes from reloading a stable dashboard.
- Stop repeated automatic PWA recovery loops while preserving manual recovery.

Do not reintroduce automatic reload behaviour without browser coverage for Safari-style PWA recovery.

## Display lifecycle and accessibility

- Wake lock is optional and managed through the Screen Wake Lock API.
- Released or rejected locks retry with bounded backoff.
- Wake lock is released while the page is hidden and reacquired when visible.
- Auto-dim timers pause while the page is hidden.
- The first interaction used to wake a dimmed display is consumed so it does not trigger the underlying control.
- Important buttons and toggles use touch-friendly targets.
- Range controls keep a larger pointer target than their visible track.
- Dialogs trap focus, support Escape dismissal, and restore focus to their opener.
- Reduced-motion preferences disable unnecessary transitions.

## Camera overlay

Camera overlays are triggered by a Home Assistant custom event and use a go2rtc endpoint configured in Hearth.

Current camera reliability work includes:

- validation and bounds checking for camera-event payloads
- timer reset when repeated camera events arrive
- subscription recovery after Home Assistant reconnects
- cleanup of subscriptions, timers, sockets, and playback sessions
- MSE / WebRTC playback handling with MJPEG fallback
- keeping a still-starting primary stream alive behind fallback instead of killing it too early
- returning to the primary stream when playback begins
- visible terminal playback errors
- manual dismissal and hidden-page handling

The production setup uses HTTPS for the PWA and the go2rtc path so browsers do not reject mixed-content camera playback.

## Diagnostics

Settings contains runtime diagnostics for support and troubleshooting, including:

- Hearth release and build commit
- Home Assistant connection status and timestamps
- reconnect count / state
- camera playback state, transport, and last playback error
- service-worker state
- wake-lock state
- page visibility state

Copied diagnostics use an explicit allowlist and must exclude the Home Assistant token and saved private URLs.

## Security baseline

Current production protections include:

- no Home Assistant token in new backup exports
- no token or saved private URLs in copied diagnostics
- Content Security Policy
- Permissions Policy
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- same-origin PWA recovery assets compatible with CSP
- no external Google Fonts request from the application shell
- production dependency audit in CI
- development-toolchain audit at the configured severity threshold

## Performance baseline

Large routes and heavy features are lazy-loaded.

The dashboard performance work moved normal view mode to a lightweight grid and deferred edit-mode drag / resize support, widget modules, page settings, sensor charts, and most icon code until needed.

Do not undo code splitting or eagerly import every dashboard widget without measuring the startup impact.

## Deployment

Production runs on Unraid from the checkout at:

`/mnt/cache/appdata/hearth`

The normal update command is:

```bash
cd /mnt/cache/appdata/hearth
./update.sh
```

`update.sh` must be run from a clean `main` branch. It:

1. fast-forward pulls `origin/main`
2. embeds the full Git commit into the build
3. builds a versioned Docker image
4. starts a loopback-only test container on port 3089
5. validates Nginx, `/healthz`, service-worker headers, bundle consistency, release metadata, and the recovery page
6. stops and renames the previous live container only after the test image passes
7. starts the new live container on host port 3080
8. validates the live container
9. automatically restores the previous container if live validation fails
10. retains the newest rollback container and cleans older stopped rollbacks after success

Reverse proxy traffic points to the Unraid host on port 3080.

Useful deployed checks:

```bash
curl -fsS http://127.0.0.1:3080/healthz
curl -fsS http://127.0.0.1:3080/api/version.json
docker inspect hearth --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unavailable{{end}}'
```

Do not bypass `update.sh` for routine production deployment.

## CI and release requirements

Pull-request CI is a release gate.

Expected checks include:

- deployment script syntax
- release metadata consistency
- production dependency audit
- development toolchain audit
- ESLint
- Vitest unit / source tests
- TypeScript production build
- production Nginx / security-header checks
- Chromium Playwright browser tests

Before a tagged release:

1. Require PR CI to pass.
2. Merge the release PR.
3. Deploy with `./update.sh`.
4. Complete the relevant manual checks on the real Hearth devices.
5. Push the matching `vX.Y.Z` tag only after deployment validation.
6. Confirm the Release workflow passes and publishes the GitHub release.

## Important historical changes

The current repository is the result of a series of reliability and maintenance passes:

- PR #1: hardened Home Assistant connection lifecycle
- PR #2: replaced dual HA URLs with one URL
- PR #3: hardened service actions and unavailable states
- PR #4: blocked touch feedback on disabled controls
- PR #5: fixed stale PWA update caching
- PR #6: added safe Unraid deployment with rollback
- PR #7: introduced major lazy loading
- PR #8: added browser reliability tests with a mocked HA websocket
- PR #9: improved camera overlay reliability
- PR #10: fixed delayed camera playback recovery
- PR #11: added reliable PWA update controls
- PR #12: added settings and import integrity validation
- PR #13: added runtime recovery for failed lazy chunks
- PR #14: added transactional dashboard editing and fixed placement
- PR #15: hardened wake lock and display lifecycle behaviour
- PR #16: reduced dashboard startup cost further
- PR #17: added runtime diagnostics
- PR #18: moved CI / Docker to Node 24 and updated dependencies
- PR #19: improved accessibility and pointer / touch controls
- PR #20: hardened backups and browser security
- PR #21: prepared the v1.0 release and release workflow
- PR #22: fixed iPhone Safari connection reliability
- PR #23: fixed Safari PWA recovery loops
- PR #24: removed unused standalone card types
- PR #25: redesigned Light card controls and added entity-scoped colour presets
- PR #26: pending hotfix for immediate colour-temperature tint updates

## Rules for future Hearth sessions

At the start of a new development session:

1. Read this file.
2. Read the current open PRs and latest commits.
3. Confirm which branch is under development.
4. Inspect CI before assuming the branch is healthy.
5. Treat the current repository as the source of truth for implementation details.
6. Treat the user-verified behaviour recorded here as the source of truth for real-device behaviour.
7. Update this document whenever a meaningful behaviour, architecture decision, deployment procedure, or unresolved issue changes.

Do not rely on an old conversation summary or `CLAUDE.md` alone when they disagree with the current repository.
