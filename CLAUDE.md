# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server (default port 3000).
- `npm run build` — production build (`output: "standalone"`).
- `npm run start` — run the standalone build.
- `npm run lint` — `next lint`.
- `npm run typecheck` — `tsc --noEmit`. There is no test suite.
- `npm run deploy` — `bash scripts/deploy.sh`. Deploys to the prod VPS under base path `/receipt`. See `docs/server.md` before touching deploy/server config.

Path alias: `@/* → ./src/*`. Server actions accept up to 10 MB (`next.config.mjs`).

## Architecture

SmartReceipt is a Next.js 16 App Router app (React 19) that OCRs a restaurant receipt photo, then lets a group split the bill in real time via a shared "room" identified by a 5-char code.

### Request flow

1. **Upload** → `POST /api/receipts` (`src/app/api/receipts/route.ts`) takes a multipart `image`, base64-encodes it, and calls the OCR provider.
2. **OCR** → `src/lib/ocr/claude.ts` (`ClaudeOCRProvider`, model `claude-sonnet-4-6`). The strict `SYSTEM` prompt + Zod `Schema` is the contract — extend both together if changing fields. Outbound traffic to `api.anthropic.com` is routed through proxies listed in `OCR_PROXIES` (comma-separated, with failover and sticky preference) via undici `ProxyAgent`; falls back to `HTTPS_PROXY` if the new var is unset.
3. **Persist** → `src/lib/store.ts` is the single source of truth: a process-global `Map`-based store cached on `globalThis` to survive Next dev HMR. Mutations call `persist()`, which debounces (500ms) an atomic write of the full state to `STATE_FILE` (default `data/state.json`; prod path is set via env). State is loaded once at module init.
4. **Room** → host creates a room (`/api/rooms`), shares the code; others `POST /api/rooms/[code]/join`. Selections are written via `/api/rooms/[code]/select` and bumped per-item-per-participant.
5. **Realtime** → SSE at `/api/rooms/[code]/events`. The in-process `EventBus` (`src/lib/events.ts`, also pinned on `globalThis`) fans out `room` events on channel `roomChannel(code)`. Presence is tracked by counting open SSE connections per participant in `store.presence`; when the last connection closes and the participant has no selections, `rooms.removeIfEmpty` evicts them and broadcasts.

### Domain

- Types in `src/lib/domain/types.ts`. A `Receipt` is immutable item data + totals; a `Room` references a `receiptId` and owns `participants` + `selections`.
- `src/lib/domain/totals.ts` is the pure billing math. `computeTotals` distributes `tax` proportionally to claimed subtotal and splits `serviceCharge` equally among participants who claimed anything. `itemStatus` uses `DRIFT_TOLERANCE` to classify an item as `empty | partial | full | over`. Keep this file pure — no I/O, no store access.

### Constraints worth knowing

- **Single-process only.** The store, presence, and EventBus all live in process memory. Multiple Node instances would diverge; this is why prod runs one `smartreceipt.service` systemd unit, not a cluster.
- **Base path.** Prod is mounted at `/receipt`; build with `NEXT_PUBLIC_BASE_PATH=/receipt`. Use `apiUrl()` from `src/lib/api.ts` for client-side fetches so the prefix is applied.
- **Logs** are structured key=value lines via `logEvent` in `src/lib/log.ts` → stdout → journald. Greppable as `event=<name>`.

### Server / deploy

`docs/server.md` (gitignored) is authoritative for prod-box specifics — nginx, systemd unit, env file path, state file location, log tailing. `scripts/deploy.sh` (also gitignored) rsyncs with `--delete` then builds remotely — locally-deleted files vanish on the server, so commit removals before deploying.
