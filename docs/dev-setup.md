# Dev Setup: Server and Environment

Moved out of CLAUDE.md. Run commands are still listed there.

## Server details (`server.js` + `storage.js`)

`server.js` runs two services on port 3001:
- **Socket.io relay** — forwards `playerState` / `hitEvent` / `gameEvent` between room peers
- **REST ban API** — cross-device persistent ban storage (`GET/POST/DELETE /api/bans`)

Two more modules attach to the same Socket.io server: `pubhub.js` (Public Server lobbies — public and private, round rules and scoring; client is `js/smb-public-hub.js`) and `social.js` (friends: presence and lobby invites only, no messaging, nothing stored; client is `js/smb-friends.js`).

Ban data is stored in `data.db` (SQLite via `better-sqlite3`); falls back to in-memory if SQLite fails.

Environment variables:
| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | Server port |
| `ADMIN_KEY` | `smb-dev-key-change-me` | Required for write operations (`POST`/`DELETE /api/bans`) |
| `SUPABASE_URL` | — | Supabase project URL (cloud auth + saves) |
| `SUPABASE_ANON_KEY` | — | Supabase publishable key (client-side JWT verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Supabase service key (server-side reward writes — never expose to browser) |

`ADMIN_KEY` must match `SERVER_CONFIG.adminKey` in `js/smb-globals.js`. For local dev, copy `SMB.env` to `.env` and fill in Supabase values; the server reads them via `process.env`. Database migrations live in `supabase/migrations/`.
