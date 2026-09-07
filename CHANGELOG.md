# Changelog

All notable Hearth changes are recorded in this file.

## [1.0.0] - 2026-09-07

### Added

- Home Assistant dashboard cards for lights, switches, scenes, scripts, sensors, weather, and Dreo fans.
- Secure camera overlays with MSE playback and reconnect recovery.
- PWA update controls, offline recovery, runtime diagnostics, wake-lock support, and auto-dimming.
- Dashboard editing with fixed-card placement, undo, delete confirmation, and cancel-safe drafts.
- Versioned settings backups with import previews and automatic pre-import recovery exports.
- Automated unit, source, browser, dependency, production-container, and security checks.

### Changed

- Split large routes, edit controls, widgets, and sensor charts into on-demand bundles.
- Hardened service-state handling, reconnect behavior, touch controls, keyboard focus, and tablet display lifecycle behavior.
- Added a validated Unraid deployment flow with test containers and automatic rollback.

### Security

- Removed Home Assistant tokens from new backup exports and diagnostic reports.
- Added Content Security Policy, permissions, referrer, content-type, and frame protections.
- Removed external font requests from the application shell.

[1.0.0]: https://github.com/Jonathanpbk/hearth/releases/tag/v1.0.0
