# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Game Is

**Stickman Evolution: The 95th** (formerly "Stickman Battles" — the product was renamed but repo folder and `smb-*` filenames are unchanged; "Stickman Evolution" alone is the accepted short form in body copy) is a canvas-based 2D action fighting game with:
- Local and online (PeerJS/WebRTC) multiplayer
- 10 character classes and 16 weapons
- 18 arenas with unique physics and hazards
- A 3-phase Boss fight with cinematics and floor hazards
- A TrueForm boss with adaptive AI (~20 attacks, real-time player profiling)
- A multi-act Story Mode with full cinematic sequences
- A declarative cinematic scripting system built on `CinematicManager`
- No build step — raw HTML5 Canvas + plain JS globals loaded via `<script>` tags

**Active codebase:** the repo root — `index.html`, `SMB.css`, `js/`, `server.js`. Every `.js` under `js/` is loaded by `index.html`; there are no dead or duplicate script files.

---

## CRITICAL RULES (Override Everything)

### 1. Never Break Existing Systems
- Do NOT remove or rewrite large systems unless explicitly told
- Do NOT delete cinematics, boss logic, or rendering pipelines
- Always PATCH, never REPLACE
- If unsure, add — don't remove

### 2. Use Existing Architecture
- This codebase is globals-based with ordered script loading
- Do NOT introduce ES modules, `import`/`export`, or classes that bypass `Fighter`
- Use existing globals: `players[]`, `gameRunning`, `activeCinematic`, `GAME_W`, `GAME_H`

### 3. Respect Load Order
- Files can ONLY use globals defined by files loaded earlier in `index.html`
- See `docs/load-order.md` for the full ordered table

### 4. Always Add Safety Guards
```js
if (!boss || boss.health <= 0) return;
```

### 5. Never Bypass dealDamage()
All damage must go through `dealDamage(attacker, target, dmg, kbForce)` in `smb-combat.js`. Never mutate `target.health` directly.

### 6. Never Trigger Cinematics Inside dealDamage()
Set a flag; trigger at frame start in `gameLoop`.

---

## How Claude Should Behave

The memory index (`~/.claude/projects/-Users-aarushgupta-Developer-Personal-Stickman-Battles/memory/MEMORY.md`, loaded automatically) and the local `.claude/CLAUDE.md` (roles and working method: communication, when to act vs. report, delegation) are binding.

Before making any change:
1. **Read the relevant module** — understand what already exists
2. **Read the relevant docs file** — understand the system's design contract
3. **Plan the smallest possible patch** — do not touch unrelated code
4. **Verify syntax:** `node --check js/smb-yourfile.js`
5. **Do not add features or refactoring** beyond what was asked

### Visual consistency
`docs/style-guide.md` is the single visual authority: colours, type, components, icons, and the deliberate identity exceptions. Any change to how the game looks (UI, HUD, menus, effects, copy on screen) must:
- name the style-guide rule it follows, or propose an amendment with before/after screenshots and wait for the owner's approval. Sessions don't make taste calls;
- reuse the guide's components (`.b.b-primary` / `.b.b-secondary`, the ink plate, `smbIcon()`, `FONT_*`) instead of new inline styles;
- pass `npm run style` (no new drift against `tools/audit/style-baseline.json`). Never update the baseline to hide new drift.

When in doubt: read more code, ask before assuming.

---

## Documentation Index

All docs are in `docs/`.

| Doc | When to Read |
|-----|-------------|
| [docs/load-order.md](docs/load-order.md) | Full ordered script list with each file's globals |
| [docs/dev-setup.md](docs/dev-setup.md) | Server services, env vars, Supabase, ADMIN_KEY |
| [docs/architecture.md](docs/architecture.md) | File structure, load order, rendering pipeline, class hierarchy, globals |
| [docs/systems.md](docs/systems.md) | All major systems: combat, physics, AI, cinematics, weapons, arenas, HUD |
| [docs/cinematics.md](docs/cinematics.md) | `CinematicManager`, `cinScript()`, `CinFX`, `CinCam`, phases, QTE, finishers |
| [docs/combat.md](docs/combat.md) | `dealDamage()` full pipeline, boss attacks, TrueForm moves, hit detection |
| [docs/multiplayer.md](docs/multiplayer.md) | NetworkManager, PeerJS topology, state sync, remote players, message types |
| [docs/roadmap.md](docs/roadmap.md) | Feature priorities, completed work, technical debt |
| [docs/coding_standards.md](docs/coding_standards.md) | Naming conventions, how to add weapons/arenas/modes/commands, safety patterns |
| [docs/story-structure.md](docs/story-structure.md) | Story Mode chapter/arc layout, engine design |
| [docs/canon.md](docs/canon.md) | In-universe lore and character canon |
| [docs/implementation-checklist.md](docs/implementation-checklist.md) | Step-by-step refactor checklist — execute in order, test after each step |
| [docs/refactoring-plan.md](docs/refactoring-plan.md) | Globals-based modularity patterns; which files are too large and how to split them |
| [docs/sovereign.md](docs/sovereign.md) | Sovereign hub: what ships, every experiment and its numbers, settled conclusions. Add a row after every Sovereign run or fight |
| [docs/god-of-war-plan.md](docs/god-of-war-plan.md) | Draft plan for connected realms + dungeons: what's remade vs reused, vertical slice, open decisions |
| [docs/gameplay-notes.md](docs/gameplay-notes.md) | Playtested feel: combat pacing, boss difficulty, adaptive AI goals, story onboarding, online state |
| [docs/style-guide.md](docs/style-guide.md) | **The visual authority.** Read before any UI, HUD, menu, effect or on-screen copy change; check with `npm run style` |

---

## Running the Game

```bash
# Install server dependencies (first time only)
cd "Stickman-Battles" && npm install

# Start the full server — serves game files AND the relay + moderation API
cd "Stickman-Battles" && node server.js   # http://localhost:3001/index.html

# Or serve static files only (no ban API / relay) — simpler for front-end work
cd "Stickman-Battles" && python3 -m http.server 8080
# Open: http://localhost:8080/index.html

# Syntax-check a JS file
node --check js/smb-globals.js

# Syntax-check all server-side files (matches the CI build step)
npm run check
```

Server internals (relay, ban API, lobbies, friends, SQLite), env vars, and Supabase setup: [docs/dev-setup.md](docs/dev-setup.md).

---

## Repo Layout

| Path | Contents |
|------|----------|
| `index.html`, `SMB.css`, `js/` | The game itself — everything the browser loads |
| `server.js`, `storage.js`, `data.db`, `supabase/` | Relay + ban API + cloud saves |
| `docs/` | All design and architecture docs, including `README_ANALYSIS.md` |
| `images/` | Game art; `images/store/` holds the CrazyGames submission assets |
| `replays/` | Saved `.smbreplay` capture files — artifacts, nothing loads them |
| `tools/` | Dev tooling; `tools/tour/` is the trailer capture script, frames, and mp4; `tools/workbench/` is the weapon workbench and the figure studio (`?wb=figures`: poses, clips, scene viewer); use `shot.js` / `figure-shot.js` contact sheets to see weapon and figure changes |
| `axiom-prequel/`, `stickman-roblox/`, `Stickman-Battles-3d/` | Separate sibling games, not part of the main build |

---

## File Structure (Load Order)

Every `js/` file is a `<script>` tag in `index.html`; a file may only use globals from scripts loaded before it. The full ordered list with each file's globals is in [docs/load-order.md](docs/load-order.md); `index.html` is the source of truth.

**Cache-busting:** new `<script>` tags must match the current `?v=` suffix. Check it with `grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c`.

---

## Common Failures (Do Not Repeat)

| Failure | Why It Breaks |
|---------|--------------|
| Rewriting a whole file | Destroys cinematic phase state, event guards, boss AI tuning |
| Breaking cinematics | `activeCinematic`, `isCinematic`, `slowMotion` are interdependent — partial changes cause freezes |
| Duplicate systems | Two systems writing to same global causes race conditions each frame |
| Idle bosses | Boss AI must always find a valid action; dead-end state machine leaves boss frozen |
| Direct `target.health -=` | Skips multipliers, shields, online sync, hit-stop, achievements |
| ES module syntax | Breaks all files loaded after it — game goes completely silent |
| Missing `isFloor: true` platform | `pickSafeSpawn()` returns null → crashes on respawn |
| Editing a sibling project by mistake | `axiom-prequel/`, `stickman-roblox/`, and `Stickman-Battles-3d/` are separate games — the main game is the repo root |
| Adding a `js/` file without a `<script>` tag | Nothing loads it and the globals it defines are undefined at call sites |

---

## Key Globals Cheat Sheet

| Global | Purpose |
|--------|---------|
| `GAME_W = 900`, `GAME_H = 520` | Logical game dimensions — always use these |
| `players[]` | All active fighters (including boss, remote) |
| `gameMode` | Current mode string |
| `gameRunning` | True when game loop is active |
| `activeCinematic` | Running cinematic object; null = idle |
| `isCinematic` | Blocks new attacks while cinematic plays |
| `slowMotion` | 0–1 physics time scale |
| `hitStopFrames` | >0 = physics paused (heavy hit) |
| `bossFloorState` | `'normal'` / `'warning'` / `'hazard'` |
| `tfGravityInverted` | TrueForm gravity flip flag |
| `tfControlsInverted` | TrueForm controls flip flag |
| `onlineLocalSlot` | 0 = host, 1+ = guest |
| `GameState` | Singleton (smb-state.js) — persistent account/session data; use `GameState.get/set/save()` |
| `AccountManager` | Singleton (smb-accounts.js) — multi-account CRUD; depends on `GameState` |
| `LobbyManager` | Singleton (smb-online.js) — lobby presence; sits on top of `NetworkManager` |
| `SERVER_CONFIG` | (smb-globals.js) — `{ url, adminKey, syncIntervalMs }` — must match server's `ADMIN_KEY` |

---

## Design Rules

| Topic | Rule |
|-------|------|
| Difficulty | Game must be hard; bosses chain attacks and punish passivity |
| Combos | No infinite combos — combo limiter enforced in `dealDamage()` |
| Ranged | Add spread, recoil, reload penalties; TrueForm ~5% deflect chance |
| TrueForm | Must be aggressive, adaptive, and counter wall combos |
| QTE | Never during active combat — only at cinematic HP checkpoints |
| AI | Must not fall off map; must avoid hazards; must always engage |
| Debug | Must not break gameplay; must respect `isCinematic` flag |

---

## Story Mode Invariants

Chapters live in `js/story/acts/` and push into `STORY_CHAPTER_REGISTRY` at load. After adding or renumbering chapters, the `id:` values must stay contiguous 0..N with no gaps or duplicates. Run the check script in [docs/story-structure.md](docs/story-structure.md#chapter-id-check).
