# Changelog

Versions follow [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`.
Each release is a git tag (`v1.0.0`). The web app's version comes from
`front-end/package.json` and appears at the bottom of the admin sidebar. Bump
it together with `server/package.json`.

## v1.0.0 — 2026-11-17

First versioned release.

### Client survey
- Landing page: back-to-top button, the QR scan line removed, and the link now points to the deployed client URL.
- More breathing room on the client home page.
- Survey flow fixes from UAT. The Service Availed list was cleaned up; services can be separated with `|` in the `.env`.

### VERA Assistant
- Redesigned chat window, launcher and Settings page.
- Default model is now `gemini-3.5-flash`, with automatic fallback to `gemini-3.5-flash-lite` when the main model is busy or stalls.

### Admin
- New admin shell (sidebar, header, theme) in the client/login palette. Light/dark and colour presets are still configurable per user (My Account → Appearance).
- Admin sign-in page fixed in light and dark themes.
- The menu is split into Workspace, Account and Developer sections. Developer pages (Data Configuration, VERA Assistant, Backup Data, App Logs, Developer Settings) are restricted to the Developer position, and the server enforces it.
- Version number shown at the bottom of the sidebar.
- Developer accounts are not auto-logged-out when idle.

### Developer Settings
- Rebuilt as tabs: Accounts, Maintenance, System & Config.
- Manage Access fixed: it no longer drops announcement rights; delete works; unknown roles are rejected; the last Developer can't be deleted.
- Maintenance mode is now server-side. Everyone except Developers is blocked, and Developers can still sign in.
- System & Config shows server, database (storage against the Atlas quota) and email health, plus tools.

### Security
- The list of all survey responses now requires sign-in.

### Deploy notes
- Deploy the server and front end together.
- New optional server variables: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` (see `deploy/.env.production.example`).
