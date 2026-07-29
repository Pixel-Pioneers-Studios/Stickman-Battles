# Roadmap — Stickman Evolution

Items are ordered by impact and stability risk. High-priority items are closer to the current architecture; lower-priority items may require new infrastructure.

**Current build: 4.0.23.** Verify the shipped version with `grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c` rather than trusting any number written here.

> This file was stale for a long stretch (it claimed "v2.7.0 — Current" against a 4.0.x build and listed shipped features as future work). Treat the source as truth; if this file and the code disagree, the code is right and this file is the bug.

---

## Shipped

Everything in this section exists in the current build. Do not plan work against these as if they were open.

- **Story Mode** — 184 chapters, ids 0–183 contiguous, in `js/story/acts/`. (An older note here said Story Mode ends at chapter 80. It does not.)
- **Summoner class** — in `CLASSES` (`js/smb-data-weapons.js`)
- **Whip weapon** — in `WEAPONS`
- **Replay system** — `js/smb-replay.js`: recording, IndexedDB storage (up to 3), download, viewer
- **Cutscene Theater** — `openCutsceneTheater()` in `js/smb-debug-jump.js`, spoiler-gated behind `tfEndingSeen`
- **Cosmetics** — color/skin selection and store, in the menu UI layer (no separate `smb-cosmetics.js`; it lives in the existing menu files)
- **Tutorial** — `js/smb-tutorial.js`: 7-step guided onboarding over training mode, with a first-run offer on the home screen
- **Fracture branches** — all three (Alpha/Vael, Null/Kael, Crimson/Sora) run a two-wave-plus-ruler arc via `enterFullBranch()` / `updateFractureBranch()` in `js/smb-progression.js`
- **Chaos modifier: Gravity Storm** — oscillating arena gravity, `grav_storm` in `CHAOS_MODS`
- **Multiverse Mode**, **Ship Progression**, **Attack Test Sandbox**, **SOVEREIGN Ω AI**, **Complete Randomizer**, **Story Online**, **persistent saves + cloud sync**, **Game Director**, **cinematic scripting v2**, **pathfinding v4**, **map analyzer v2**, **error boundary**

---

## Priority 1 — Polish & Stability

Low-risk, high-value improvements that don't touch core systems.

- **Mobile control hit areas:** touch targets for attack/ability are too small on small screens
- **Projectile sync (online):** spawn-event sync relies on frame-perfect timing; add a position-correction packet for long-lived projectiles
- **Arena background performance:** city and cyberpunk do per-frame canvas work; cache static layers
- **QTE key prompt localization:** QTE shows keyboard keys; detect input device and show the right icon
- **Tutorial depth:** the tutorial covers the six core inputs (move/jump/attack/block/ability/super). Domains, finishers, weapon mastery and class differences are still taught only by playing.

---

## Priority 2 — Gameplay Depth

Medium-risk additions that extend existing systems without replacing them.

- **New arena: Desert / Quicksand** — slow-sink floor hazard; partially buried players move slower
- **Boss Mode: 2v2** — two players vs two Bosses; requires `players[]` to hold 4 fighters cleanly
- **Ranked system stub** — localStorage ELO, win/loss adjusts rating, shown in lobby; foundation for server-backed ranking
- **Coins minigame** — was referenced by `selectMinigame()` with no card and no system behind it. The stranded refusal has been removed; if this is wanted it needs to be built like any other minigame (card in `index.html`, state + update + draw in `js/smb-minigames.js`, id added to `MINIGAME_TYPES`).

---

## Priority 3 — New Systems

Larger additions requiring new modules. Higher risk; each needs its own file and load-order slot. **None of these files exist yet.**

- **smb-tournament.js** — bracket mode: 4 or 8 players, single-elimination, auto-seeding, results screen
- **smb-modding.js** — runtime arena/weapon JSON loader; validation layer required
- **smb-leaderboard.js** — online leaderboard (POST scores, GET top 10); needs a server-side component beyond the current relay

---

## Priority 4 — Infrastructure

Changes to core architecture. High risk; requires careful migration.

- **Asset loading pipeline** — art is all procedural; sprite support needs a preload step before `gameLoop` and a loading state
- **Web Worker for AI** — move `updateAI()` off the main thread for high-entity-count scenes
- **Server-authoritative multiplayer** — the host-authoritative model has no anti-cheat and desyncs on large maps
- **TypeScript migration (partial)** — `smb-globals.js` is a good candidate for typed definitions without a bundler

---

## Known Technical Debt

- `js/smb-loop-core.js` holds `applyWorldModifiers` plus the whole `gameLoop` and is the largest single file; see `docs/refactoring-plan.md`
- `checkDeaths()` and `endGame()` live in `js/rendering/smb-drawing-arenas.js` — logically they belong in the loop or a dedicated game-state module
- Arena hazard logic (cars, eruptions, ghosts) is scattered inline in `drawBackground()`; extract into per-arena update hooks
- Story chapter id contiguity is checked by a manual command (see `CLAUDE.md`), not a runtime assertion
- ~~`js/smb-progression.js` `_spawnFractureGuardian()` sets HP before `applyClass()`~~ — fixed; `tools/audit/check.js` rule `class-clobbers-health` now catches the pattern anywhere it reappears
- `?v=` cache-bust suffixes are not uniform across `index.html` (several versions coexist); unify on the next breaking ship
