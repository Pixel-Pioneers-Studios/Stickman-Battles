# Handoff — Sovereign / replay / balance session (2026-07-27)

All work is **UNCOMMITTED**. Nothing was pushed. Static server was `python3 -m http.server 8080`.

---

## 1. What changed, by file

| File | `?v=` | What |
|---|---|---|
| `js/smb-data-mapperks.js` | 4.0.26 | The Circuit opts into pickups + gale + meteors via `arenaRunsPerk()` / `SOVEREIGN_PERK_SYSTEMS`; gale nerfed on that map |
| `js/smb-data-mapperks-draw.js` | 4.0.24 | Same three draw gates widened |
| `js/smb-menu-startcore.js` | 4.0.24 | **Bug fix**: blank `mapItems = []` wipe replaced with `initMapPerks()` re-seed |
| `js/smb-menu-utils.js` | 4.0.26 | `drawStageBoundary()` — proximity flare at the invisible stage lip |
| `js/smb-replay.js` | 4.0.24 | Event log, richer per-frame fields, interpolation, camera easing, event popups |
| `js/smb-combat.js` | 4.0.30 | Sustained-pressure stun decay + lockout ceiling |
| `js/smb-fighter.js` | 4.0.31 | Electric Staff nerf (Shock Bolt 20→13, Thunderstrike 32→20/bolt) |
| `js/smb-data-weapons.js` | 4.0.31 | Staff description text corrected (was stale *before* this session) |
| `js/smb-smk2-class.js` | 4.0.34 | Hazard registry, telegraphed evasion, blind-threat learning, always-on perception, combo extension, opening-range gate, advisor hooks |
| `js/smb-loop-core.js` | 4.0.31 | Calls `SovereignAdvisor.tick()` |
| `js/smb-sov-advisor.js` | 4.0.30 | **NEW FILE** — Ollama-backed strategic advisor |

Also modified but **not by this session** (pre-existing uncommitted work): `docs/roadmap.md`, `js/smb-progression.js`, `tools/audit/check.js`.

`npm run check` passes. All touched files pass `node --check`.

---

## 2. Runtime toggles (console)

```js
SMK2_TUNE.openGate       // opening-range gate on cold reads
SMK2_TUNE.pressureDecay  // sustained-pressure stun decay
SMK2_TUNE.lockCeiling    // hard cap on continuous lockout
SovereignAdvisor.status() / .history() / .on() / .off()
```

---

## 3. Measured facts (do not re-derive)

**Three human matches, all on The Circuit, all different weapons — the weapon is a huge confounder:**

| Match | Weapon | Result | Notes |
|---|---|---|---|
| 07-26 | katana (cd 40) | Sov won 10–8 | player out-damaged 1570 vs 1451 excl. ring-outs |
| 07-27a | hammer (cd 75, kb 16) | Sov won 10–1 | hammer kb knocks Sov out of range → inflates his swing count |
| 07-27b | spear (cd 44, range 130) | Sov won 10–8 | player locked 20.2% of frames alive |
| 07-27c | electricstaff | **PLAYER WON 10–8** | player dealt 2179 vs 1694 |

**Key numbers:**
- Sovereign's damage is ~68% one clean 15-dmg swing. Human weapons spike to 46/60/74.
- Sovereign median gap between hits: 86f (katana match) → 56f (spear match). The 45-frame combo window sits between those — this matters, see §5.
- A/B (controlled, same weapon both sides): `openGate` ON = 56% hit rate / 7.28 dmg-per-swing vs OFF = 44% / 7.00. **The gate is fine — do not revert it.**
- A/B: `lockCeiling` ON = 16.8% locked / worst 103 ticks vs OFF = 26.2% / 145 ticks, damage per hit unchanged.
- Thunderstrike evasion: 13.6 avg damage taken vs 88 if all 4 bolts land (85% reduction).
- Shock Bolt: 6/10 dodged after the fix, **0/28 before**.

---

## 4. The big architectural finding

**Sovereign's perception was a whitelist.** Owner-attached weapon hazards (stored on the wielder, not in the shared `projectiles` pool) were enumerated by hardcoded field name in *two* places that had drifted apart. `_shockBolt` was in neither — he could not perceive it at all. Fixed with `SMK2_OWNED_HAZARDS` + `_smk2OwnedHazards(t)`, one list both scans read.

**Then the deeper fix (user's idea, and it was the right one):** he now learns threats he cannot see. `_observeAlways()` records damage nothing visible explains and correlates it with the opponent's ability/super presses. After 2 such burns, the press itself becomes the telegraph (`_armBlindEvade` → `_runBlindEvasion`). Generalises to weapons that don't exist yet.

**Bug that fix exposed:** `updateAI()` opened with `if (this.aiReact > 0) { ...; return; }` and **every observation sat below it** — so Sovereign stopped *perceiving* during reaction windows, i.e. exactly when being punished. Perception now runs in `_observeAlways()` above the gate with its own prev-state fields (`_obsPrevAbilityCd`, `_obsPrevSuperReady`). This affected the whole adaptive stack, not just the new feature.

---

## 5. Open items / known weaknesses

1. **Blind-learning loop not verified organically.** Model accumulation and the trigger path are both verified separately; the full loop firing in a real match is not. Test harness kept interfering. `_unknownThreat` lives on the instance — read it after a real staff match.
2. **The 160px melee-explanation band is too generous.** `reach = weapon.range + 55` — a ranged hit landing at mid-distance is written off as melee, so he under-learns against hybrid long/short threats (exactly the staff's strength). Needs a real "was I in their swing arc" test, not a distance check. **Get one real match of `_unknownThreat` data before tuning this.**
3. **Staff may be over-nerfed.** Damage cut ~37% *and* he can now see/dodge both abilities. If it feels toothless, **undo the damage nerf first, keep the perception fix** — the perception fix corrects a defect, the damage nerf was a judgement call on one match.
4. **Advisor: first request of every session always fails** (cold model load > 11s timeout). Self-corrects next cycle. Not worth pre-warming.
5. **Advisor value unproven.** Machinery works and is safe; whether a 3B model beats his own heuristics is untested.
6. **`pressureDecay` was aimed at the wrong regime** — it's an `else` branch that only fires outside the 45f combo window, and his cadence tightened to 56f median (inside it). The `lockCeiling` is the one doing real work.
7. **Still blind to:** `_flailOrbit`, `_axeWhirl`, `_hammerSpin` (orbit hazards, melee-range so spacing partly covers).
8. `_COMBO_EXT_MAX` is now 1 (was 2 — at 2 it tripled 3+ chains and read as an unbreakable combo).

---

## 6. Context for the NEXT task — map change for The Circuit

Current arena def is `ARENAS.sovereign` in `js/smb-data-arenas.js` (~line 135):

```js
name: 'The Circuit', deathY: 640, isSovereignArena: true,
modifiers: { gravityMult: 1.0, frictionMult: 1.0, hazardFrequency: 0.0 },
platforms: [
  { x: -60, y: 460, w: 1020, h: 60, isFloor: true },  // floor — WIDER THAN THE 900px SCREEN
  { x:  95, y: 335, w: 165, h: 16 },   // left deck
  { x: 368, y: 320, w: 165, h: 16 },   // center deck (slight high ground)
  { x: 640, y: 335, w: 165, h: 16 },   // right deck
]
```

Things to know before changing it:

- **The floor runs x −60..960 against `GAME_W = 900`.** There is a ~60px killing lip past each screen edge. Ring-outs are a top-2 kill mechanic and players die there at full HP. `drawStageBoundary()` now flares that lip on approach — **any map change must keep that readable.**
- **Sovereign wins the edge game 4–0 in conversion** (he recovers via `_runVoidRecovery` + Null Anchor; the player doesn't). Widening or adding pits amplifies an advantage he already dominates.
- The single-tier deck layout is deliberate — it exists so his pursuit/pathfinding never wedges. Stacking decks or adding multi-stage climbs risks re-introducing the idle-boss failure mode.
- `_prefPlatIdx` / platform-denial is near-useless with 3 symmetric same-height decks. **Varying deck heights would give that system something to read** — this is the cheapest map change with real AI benefit.
- Hazard/pickup opt-in is per-system via `SOVEREIGN_PERK_SYSTEMS` in `js/smb-data-mapperks.js`; three files need a branch per system (`initMapPerks`, `updateMapPerks`, `drawMapPerks`).
- Lore: check `docs/canon.md` for Sovereign as the third foundational force (God builds / Void erases / **Sovereign controls**) — per memory, Sovereign is the true villain and was NOT built by Axiom.

---

## 7. Project gotchas that cost time this session

- **Cache busting is mandatory.** Editing a `js/` file without bumping its `?v=` in `index.html` means the browser serves the old file and you will debug a phantom. Verify with `grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c`.
- `GAME_VERSION` comes from `CHANGELOG[0].version` (still `4.0.23`) — replays version-gate on it, so schema additions are safe but a bump invalidates old replays.
- Replay `_startGameCore` ordering: `initMapPerks()` runs at line ~105, and the reset block near ~181 used to wipe it. Watch for that pattern elsewhere — the same bug still exists in `switchArena()` at `js/smb-menu-select.js:312` (**unfixed**, affects chaos-mode arena switching).
- Driving the game from the browser: `startSimFight('sovereign'); startGame();` then press Escape twice (a prologue cutscene intercepts, then the pause menu). Set `paused = false` explicitly.
- Ollama is live locally with: qwen2.5-coder:7b/14b, llama3.2:3b, tinyllama, llama3. **tinyllama returns prose and is slower than llama3.2:3b** — do not treat "smaller" as "faster".
