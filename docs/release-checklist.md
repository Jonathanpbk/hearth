# Hearth release checklist

## Automated verification

- Confirm pull-request CI passes.
- Confirm dependency audits report no policy failures.
- Confirm lint, unit, source, build, Chromium, and container checks pass.
- Confirm package and changelog versions match the proposed tag.

## Deployment verification

- Run `./update.sh` on the Unraid host.
- Confirm `/healthz` returns `{"status":"ok"}`.
- Confirm `/api/version.json` reports the expected release and commit.
- Confirm the live container reports a healthy Docker state.
- Retain the named rollback container until manual checks finish.

## Manual verification

- Confirm the PWA reports the expected release and build commit.
- Confirm the dashboard and settings routes open.
- Confirm the saved layout remains unchanged.
- Confirm a light or switch action reaches Home Assistant.
- Confirm a scene or script action reaches Home Assistant.
- Confirm fan pointer and touch controls respond.
- Confirm a sensor history chart loads.
- Confirm a camera overlay opens and MSE video plays.
- Confirm offline controls lock and recover after reconnection.
- Confirm wake lock and auto-dim behavior on the tablet.
- Confirm backup export, preview, import, and pre-import recovery export.

## Publication

- Merge the release-readiness pull request.
- Deploy and complete the manual verification list.
- Create and push the matching version tag.
- Confirm the Release workflow passes and publishes the GitHub release.
