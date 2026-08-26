# Handoff — Sovereign / boss-fight work, Aug 25 2026

## State: three commits pushed to `main`

| commit | what |
|---|---|
| `d44af45` | Melee-only boss fights + ten Creator/Sovereign fight fixes |
| `fb50832` | Adaptation de-saturated (the dials actually move) |
| `65a3532` | Adaptation signal corrected (punishment, not scoreline) |

Working tree is clean apart from stray `.smbreplay` artifacts and `tools/audit/` files that predate this session. Cache-bust tags are at `?v=4.0.84` for the files touched.

## THE OPEN QUESTION — start here

**Is any of this actually making Sovereign stronger?** Not answered. The competence fixes clearly are (numbers below). The adaptation rework is unproven, and there is a real argument it makes him *weaker*: the pre-rework behaviour pinned aggression/defense/reactionSpeed at 1.0 and spacing at 0, and "always maximum" may simply be the strongest static setting.

An A/B harness was built and run on the Creator refight (adaptive vs. dials frozen at the old saturated values, alternating, Sovereign possessing P1 via `SovereignControl`). It produced:

- adaptive: 930 and 304 damage per 1000 frames (n=2)
- frozen: 137 (n=1)

**Do not trust this.** Two flaws:
1. Badly underpowered — n=2 vs n=1, and the adaptive runs differ by 3x between themselves.
2. **`takenPer1000` was 0 in every run.** He took no damage at all in those windows, so the adaptation differences — which only manifest under pressure — barely engaged. The test mostly measured early-fight offence, not adaptation.

To do it properly: force the boss to phase 2/3 (`boss.health = boss.maxHealth * 0.55`) so it actually fights back, score only frames where damage is flowing both ways, and run 6+ matched pairs. The harness pattern is in this session's transcript; the key gotchas are that the **TrueForm** refight opens with a long scripted sequence that keeps flipping `isCinematic`/`gameFrozen` (score Creator instead, or wait out `tfCinematicState !== 'none'`), and that a match restart replaces the fighter so `SovereignControl.toggle()` must be re-applied and `p.isAI` verified true.

## What IS measured and solid

Creator refight, Sovereign possessing P1, per-frame telemetry:

- futile swings (whiff-guard vetoed): **60-82% → 7%**
- attacks with a platform between him and the boss: **58-73% → 0%**
- frames standing in an active beam: **0** of 256 active-beam frames
- spike contact (engine's exact damage condition): **~0-2.4%**
- minion-vs-boss infighting: **0**
- max altitude: **y = -396 → on-screen**

Adaptation, vs TrueForm, 2272 frames: direction reversals per dial 8/10/4/7 (were 0 for all four after the first six seconds). Falling 112 → 1 HP, aggression moves 0.996 → 0.900 and spacing 0.014 → 0.128, defense climbs to 1.0.

## Key facts about this codebase that cost time to find

- `d` in `SovereignMK2.updateAI` is `Math.abs(dx)` — **horizontal only**. Every range test reads a boss 250px straight down as "in range".
- `Fighter.attack()`'s whiff-guard returns **without consuming the cooldown**, so a vetoed swing re-fires every frame forever. There is no self-correcting pressure.
- `SovereignMK2.updateAI` **fully replaces** `Fighter.updateAI`, so it inherits none of Fighter's hazard handling. Only `_voidSafetyFrame()` reaches it, via `Fighter.update()`.
- Platforms are **solid from below**. Never jump toward a deck while under it.
- `_applyAdaptation` runs every 8 frames but scores a **180-frame** window, so any `x += k` rule is multiplied by ~22.
- **Never key a behavioural dial on raw damage taken.** Being hit knocks him back, which suppresses his own hit count, which then reads as "my aggression is wrong". Distinguish punished-while-committing from hit-in-neutral.
- `Boss.getPhase()` was absolute-HP; other places may still hardcode HP thresholds — `grep "health > 2000"`.

## Known remaining issues

- Sovereign locks into one counter strategy for long stretches (`parry` for ~2000 frames in one TrueForm run). `_getCounterStrategy()` is a fixed-priority if-chain; against a boss whose action profile is stable it always returns the same answer. Candidate for score-based selection.
- `_oppMemory` stays empty in a normal 1v1 (only written on target switch) and `_predTotal` reached 2 over a whole match — the prediction/opponent-model layer is barely exercised.
- `_reactionMistakeRate()` is a flat `return 0`.

## Repo notes

- Run: `node server.js` → http://localhost:3001/index.html
- `npm run check` has ~65 pre-existing errors in `server.js` / `tools/` — not yours, ignore unless they name your file.
- Drive Sovereign from the console with `SovereignControl.toggle()` (F7 needs admin clearance).
