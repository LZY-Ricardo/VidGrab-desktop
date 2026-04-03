# Architecture

## Product Direction

VidGrab Desktop is a local-first client.

The desktop app runs parsing and downloading on the user's machine instead of a public VPS.
This avoids platform anti-bot restrictions that affect cloud server IPs.

## Boundaries

### Local

The local stack is responsible for:

- Video parsing
- Download execution
- Subtitle extraction
- Thumbnail proxying
- Local file system access

### Cloud

The cloud stack is responsible for:

- Authentication
- Email verification
- Membership state
- AI entitlement / quota
- Optional AI processing APIs

## Repository Layout

### `desktop/`

Desktop shell and UI.

- Tauri host
- Vue renderer
- Login state
- Membership state
- Parse / download controls

### `scripts/`

Repository-level lifecycle helpers.

- `dev-host.mjs`: starts resolver first, waits for health, then starts desktop dev server

### `resolver/`

Python service that exposes a local HTTP API:

- `GET /api/health`
- `POST /api/info`
- `POST /api/download`
- `GET /api/download/status/{task_id}`
- `GET /api/download/file/{task_id}`
- `GET /api/proxy/image`

### `shared/`

Shared DTOs, API contracts, and environment keys.

## Phase 1 Non-Goals

- Auto updater
- macOS packaging
- Installer polish
- Full offline AI
- Browser extension integration

## Risks

1. Local browser cookie access differs by browser and OS.
2. Packaging Python runtime with desktop UX needs a clear strategy.
3. The desktop app must degrade gracefully when the local resolver is not available.
4. The current hosted dev runner is not yet a packaged desktop host, only a lifecycle bridge for development.

## Recommended Implementation Order

1. Stabilize local resolver API.
2. Build desktop shell UI around that API.
3. Connect cloud auth and membership.
4. Add resolver lifecycle host management.
5. Add packaging and release flow.
