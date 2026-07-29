# Handoff — The Circuit / plate arena session (2026-07-27, evening)

Continues `docs/HANDOFF_sovereign_2026-07-27.md` (same day, earlier). **Everything is UNCOMMITTED.**
Static server was `python3 -m http.server 8080`.

---

## 1. What The Circuit is now

Sovereign's arena is a **perforated plate over void**. Three voids (78 / 80 / 78px) are permanent
features of the substrate — he never opens or closes one. He slides the whole plate ±130px and the
voids travel with it, under whoever is standing there.

Lore basis (`docs/canon.md`, SOVEREIGN — THE THIRD PRINCIPLE): God builds, the Void Mind erases,
Sovereign *controls*. He creates nothing and destroys nothing. He positions. A summoned hazard would
have been the wrong verb for him; moving the board is the right one.

### Design invariants — do not break these

| Invariant | Why |
|---|---|
| Voids are GAPS BETWEEN REAL `isFloor` SEGMENTS | Cliff detection (`smb-fighter.js` ~2769), lethal-fall recovery (~2983) and pathfinding all walk the platform list and read gaps natively. A hole punched in one wide floor would have needed all of it rewritten. **Do not collapse the segments back into one floor.** |
| Outer two segments are ANCHORS with pinned outer edges | Kill boundary stays exactly −60…960 at every offset (verified across all 261 offsets, no degenerate segments). Sovereign already wins edge conversion 4–0; he moves the voids, never the lip. |
| Slides are telegraphed (~34f) before committing | The whole fairness contract of the arena. Verified: a fighter stays grounded through the entire telegraph, so it is a real escape window. |
| `CircuitPlate` owns `pl.x`/`pl.w` every frame | `px` / `plateF` / `anchor` / `pxInner` / `pxOuter` in the arena data are the AUTHORING source; `x`/`w` are outputs. Nothing else should mutate Circuit platform positions. |

---

## 2. Files changed

| File | `?v=` | What |
|---|---|---|
| `js/smb-circuit.js` | 4.0.36 | **NEW** — `CircuitPlate` + `CIRCUIT_TUNE`. Geometry, telegraph, void rendering, owner-safety. |
| `js/smb-data-arenas.js` | 4.0.38 | `ARENAS.sovereign` rebuilt as the segmented plate; deck heights 322 / 312 / 318. |
| `js/smb-smk2-class.js` | 4.0.38 | `_runPlateControl()` (his intent layer), `_vetoVoidStep()`, `_runVoidRecovery` boost budget. |
| `js/smb-loop-core.js` | 4.0.35 | `CircuitPlate.update()` before fighters; `CircuitPlate.drawOverlay()` after `drawPlatforms()`. |
| `js/rendering/smb-drawing-arenas.js` | 4.0.35 | `CircuitPlate.draw()` (void shafts) at the end of `drawSovereignArena()`. |
| `js/smb-menu-utils.js` | 4.0.35 | `drawStageBoundary()` unions all floor segments. |
| `js/smb-replay.js` | 4.0.36 | Recorded bounds union all floor segments. |

`npm run check` passes (1 pre-existing warning: an unrelated lava arena with no `isFloor`).

---

## 3. Runtime toggles

```js
CIRCUIT_TUNE.enabled = false   // ← ESCAPE HATCH: static neutral plate, AI untouched
CIRCUIT_TUNE.autoDrift         // idle heartbeat when Sovereign isn't driving
CIRCUIT_TUNE.ownerSafe         // never park a void under him / his predicted landing
CIRCUIT_TUNE.telegraph         // warning frames (34)
CircuitPlate.status()          // phase, offset, current void spans
SMK2_TUNE.voidBoostMax = 3     // recovery boost budget per airborne stint
```

---

## 4. Measured facts (do not re-derive)

- **Jump rise is 268px** (feet 460 → apex 192 on a −19 jump). The old arena comment claiming "apex
  lifts the feet to ~310" is **wrong**; reachability was never the constraint on deck height.
- Deck headroom over a standing fighter (head top y=376): 322→38px, 312→48px, 318→42px.
  The first pass had the left deck at y=350 = **10px** of headroom. That was a regression.
- **All three decks bonk.** A jump from directly under one stops the head at exactly `deckY + 16`
  (the underside) instead of the free apex of y=108 — a jump under a deck loses **220px** of height.
- Plate geometry: voids stay 78/80/78 at every offset; kill boundary constant −60…960; smallest
  anchor width 40px at max positive offset.
- Sovereign's plate cadence: 4–12 slides per 60s match, gated on earned reads.

### Bug-fix before/after

| Metric | User's broken match | After fixes |
|---|---|---|
| Sovereign y runaway | **−2765** (3300px above stage, camera destroyed) | −146…376, 0 frames above stage |
| Self-inflicted falls | 3 in 15s, taking 0 damage | **0 in 60s** |
| Gap hops (deliberate crossings) | — | 11 per 60s |
| Frames standing still | — | 3.9% |

---

## 5. Three real defects found and fixed (all pre-existing, exposed by the plate)

1. **`_runVoidRecovery` had no boost budget** (`smb-smk2-class.js` ~1562). It granted an upward
   impulse every time `_voidRecoverCd` expired, and `this.vy > 0` re-arms the branch the moment he
   starts falling. −14 every 12 frames against gravity ~0.8/frame is a **net climb**. The cooldown
   rate-limits the pogo but never ends it. Unreachable before, because the ledge zone sat over
   unbroken floor so he always landed and reset. Fixed with a 3-boost budget (resets on landing)
   plus a hard altitude ceiling at y=−60.

2. **~40 movement paths write `this.vx` without consulting `isEdgeDanger()`.** `isEdgeDanger()`
   itself is correct — it does report a Circuit void as danger. But he walked off segment edges into
   voids and ring-outed 3× in 15s **without taking a single hit**. Fixed with `_vetoVoidStep()`, one
   choke point in `update()` after every AI path has had its say and before physics consumes `vx`.
   Narrow by design: self-propelled grounded movement only (`|vx| ≤ 12`), skips stun/ragdoll, so a
   ring-out the player *earned* still lands. Jumps the gap when the far side is within 190px rather
   than freezing at the ledge.

3. **Two `platforms.find(p => p.isFloor)` single-floor assumptions.** `drawStageBoundary()` flared
   the leftmost segment's edge instead of the real boundary; the replay recorded
   `bounds: {minX:-60, maxX:150}` (the left anchor alone) instead of −60…960. Both now union.
   **There may be more** — see §7.

---

## 6. OPEN — the deck bonk (top priority, and the reason the arena still feels bad)

The user's report was "people get repeatedly slammed into the platforms from below." Raising the
decks was the proposed fix and it **does not solve it** — measured above, the jump rises 268px, far
above any deck in the 312–350 band, so a jump under a deck always bonks and loses 220px of height.
Raising them from 350→322 was still worth doing (headroom 10px→38px while standing) but it treats a
symptom.

**The actual fix is one-way / pass-through decks.** The engine has **no** such concept today
(`grep -rn "passThrough\|oneWay\|dropThrough" js/` finds only boomerang flags and a shield damage
multiplier — nothing platform-related).

Recommended shape, scoped so no other arena changes:
- Add a per-platform `passUnder: true` flag, honoured ONLY in the vertical collision path in
  `smb-fighter.js` — ignore the platform when `vy < 0` (rising) or when the fighter's feet are below
  its top; land on it normally when descending.
- Set it on the three Circuit decks only. Every other arena keeps solid decks and is untouched.
- Watch the AI: `platformAbove()` and pathfinding assume solid decks; verify Sovereign still climbs
  and doesn't wedge.

---

## 7. Other open items / known weaknesses

1. **Audit the remaining `find(p => p.isFloor)` call sites.** Two were fixed; ~14 more exist
   (`grep -rn "isFloor" js/ | grep -E "find\(|filter\("`). Most only want the floor's Y and all
   segments share y=460, so they are probably fine — but **probably** is doing work in that sentence.
   Confirmed remaining: `smb-heatmap.js:94,107`, `smb-camera.js:368`, `smb-minigames.js:251,527`,
   `smb-escort.js:254`, `smb-attacktest-*`, `smb-finisher-weapon2.js` (4 sites).
2. **`_runPlateControl`'s `deny-zone` branch has never fired in testing** — `deny-landing` keeps
   winning priority because the test player was usually airborne. Unverified in practice.
3. **`ownerSafe` has never fired organically.** It is unit-checked and the airborne-landing case was
   added after it turned out to be a contributor to defect #1, but no observed rejection in a match.
4. **No human playtest of the fixed build.** Every number in §4 is from scripted matches with a
   synthetic opponent. The balance question — does the plate compound his 4–0 edge dominance? — is
   completely open.
5. **`_vetoVoidStep`'s `|vx| > 12` threshold is a guess.** It exists to let knockback through. Some
   of his own dash paths may exceed it and bypass the veto; not measured.
6. Everything in §5 of the previous handoff (blind-learning loop unverified, the 160px melee band,
   staff possibly over-nerfed, advisor unproven) is still open and untouched.

---

## 8. Gotchas that cost time

- **Bump `?v=` in `index.html` for any `js/` file you edit** or the browser serves a stale copy.
- Driving the game from the browser: `startSimFight('sovereign'); startGame();` then Escape,
  `document.getElementById('pauseOverlay').style.display='none'; paused=false;`. The pause overlay
  re-shows on KO and will block screenshots.
- **Camera globals are lexically scoped**, not on `window` — you cannot reset zoom from the console.
  Move the fighters apart instead.
- `vm.runInContext` on `smb-data-arenas.js` will not expose `ARENAS` (top-level `const` is a lexical
  binding). Append `;globalThis.__A = ARENAS;` to the source string.
- **A/B tests inside a live match are contaminated** by respawns, the opponent's AI, and KO pauses.
  Neutralise the opponent (`s.updateAI = function(){}`) and pin positions, or the numbers are noise.
  Two of this session's A/B runs had to be discarded for exactly this.
- Never compare two matches on different weapons — katana cd 40 vs hammer cd 75 vs spear range 130
  swamps any AI change. Force the weapon and A/B in-engine.
