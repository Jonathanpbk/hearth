# Changelog

All notable Hearth changes are recorded in this file.

## [1.1.0] - 2026-09-08

### Added

- Added direct brightness dragging with paused-movement updates on Light cards.
- Added one-second hold controls for brightness, colour temperature, RGB colour, and five entity-scoped colour presets.

### Changed

- Replaced the Light card flip interface with a single-sided brightness fill and gesture-safe touch controls.

## [1.0.3] - 2026-09-08

### Removed

- Removed the standalone Switch, Script, Scene, and Weather card types from dashboard editing and production bundles.
- Migrated retired cards out of saved dashboards while preserving every supported card and layout position.

## [1.0.2] - 2026-09-08

### Fixed

- Prevented service-worker activation from reloading an open Safari or installed iPhone dashboard.
- Added a persistent circuit breaker which stops repeated automatic PWA recovery while preserving manual updates.

## [1.0.1] - 2026-09-08

### Fixed

- Stopped repeated Home Assistant connection replacement from causing a reconnect loop in Safari and the installed iPhone PWA.
- Stabilized the clock and weather card on narrow screens and reduced clock rendering to one update per minute.

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

[1.1.0]: https://github.com/Jonathanpbk/hearth/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/Jonathanpbk/hearth/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Jonathanpbk/hearth/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/Jonathanpbk/hearth/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Jonathanpbk/hearth/releases/tag/v1.0.0
