# Hearth

Hearth is a touch-focused Progressive Web App for controlling Home Assistant from a wall tablet or desktop browser.

## Features

- Configurable dashboard pages and cards
- Lights, switches, scenes, scripts, sensors, weather, and Dreo fan controls
- Fixed-card dashboard editing with undo and safe cancellation
- Camera event overlays with MSE playback
- Home Assistant reconnect handling and locked offline controls
- PWA update recovery, runtime diagnostics, wake lock, and auto-dimming
- Token-free settings backups with validated restore previews

## Requirements

- A Home Assistant URL reachable from the client device
- A Home Assistant long-lived access token
- Docker, Git, and curl on the deployment host
- HTTPS for PWA, clipboard, and wake-lock browser features
- Optional go2rtc HTTPS endpoint for camera overlays

## First deployment on Unraid

Clone the repository into the application data directory, enter the checkout, and run:

```bash
chmod 755 update.sh
./update.sh
```

The script builds Hearth, validates a loopback-only test container, and starts the live container on port `3080`. Point the reverse proxy at the Unraid host and port `3080`.

Open Hearth and enter the Home Assistant URL and token. Camera settings remain optional.

## Updating

```bash
cd /mnt/cache/appdata/hearth
./update.sh
```

The deployment script:

- updates `main` with a fast-forward-only pull
- builds an image tagged with the Git commit
- embeds the full Git commit in release diagnostics
- validates Nginx, `/healthz`, PWA files, release metadata, and the recovery page
- tests the image in a loopback-only container before replacing Hearth
- retains the previous live container for rollback
- restores the previous container after a failed live validation
- removes older stopped rollback containers after success

## Health and version checks

From the Unraid host:

```bash
curl -fsS http://127.0.0.1:3080/healthz
curl -fsS http://127.0.0.1:3080/api/version.json
docker inspect hearth --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unavailable{{end}}'
```

The health endpoint returns `{"status":"ok"}`. The version endpoint reports the release, full commit, and active PWA entry bundle.

## PWA recovery

Open `/api/pwa-update.html` on the deployed Hearth origin if a device remains on an older cached build. The recovery page replaces PWA caches without clearing settings or dashboard layouts.

The Settings page also reports installed and latest builds and provides an update button.

## Backup and restore

Use Settings, Backup & Restore, Export before major layout changes. New backups exclude the Home Assistant token.

Import shows the format, export time, page count, and card count before applying changes. Hearth keeps the token stored on the current device and downloads a token-free recovery backup before replacing valid settings.

Store the Home Assistant token separately. A restore on a new device requests it during import.

## Manual rollback

The update output prints the retained rollback container name. Replace the example name below with the printed value:

```bash
docker rm -f hearth
docker rename hearth-backup-YYYYMMDD-HHMMSS hearth
docker start hearth
curl -fsS http://127.0.0.1:3080/
```

## Development

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
```

The full browser suite requires Chromium. Install it with:

```bash
npx playwright install --with-deps chromium
```

## Releases

Package and changelog versions must match. Validate them with:

```bash
npm run release:check
```

After deployment and manual validation, push the matching `vX.Y.Z` tag. The Release workflow repeats the audits and test suite, verifies the production container, and publishes the GitHub release.

See [the release checklist](docs/release-checklist.md) for the full process.
