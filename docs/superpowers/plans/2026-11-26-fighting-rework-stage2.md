# Fighting Rework (Stage 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Up to 3 landed basics, then a move; the 4th hit ends it; escapes cost something and can be read.

**Architecture:** Patch the existing Fighter/combat/input/bot globals. A landed basic hit 1-3 marks its
swing cancellable; `ability()` and `useSuper()` accept a press during that swing's recovery and end the
swing, otherwise a press during recovery is buffered until it ends. The wall escape, super burst and bot
burst thresholds are retuned for 4-hit strings, and hard/expert bots learn the cancel.

**Tech Stack:** Plain JS globals by `<script>` tag; headless checks in `tools/fight-retune-test.js`
(puppeteer + BalanceSim, `RT` helpers); `tools/bot-duel.js`, `tools/class-balance.js`.

**Spec:** `docs/superpowers/specs/2026-11-26-fighting-rework-stage2-design.md`

## Global Constraints

- Patch, never replace. No ES modules. A file only uses globals from files loaded before it; later-file functions are called at runtime behind `typeof fn === 'function'`.
- All damage through `dealDamage()`. No cinematics triggered inside it. No damage values change; melee basics stay ≤ 24.
- Bosses (`isBoss`) are untouched by every rule here. Ranged weapons keep today's recovery lock for Q; the E gate applies to every non-boss fighter.
- Nothing follows the 4th string hit (`STRING_LEN` = 4): no cancel off it, its recovery is locked like a miss.
- No infinite combos: `COMBO_SCALE`, `COMBO_ABILITY_STUN` (24), the 7+ forced launch and the stun handoff stay.
- True Form keeps its 3-hit wall warp. Guard burst (shield press) is unchanged.
- Do NOT commit. The owner commits; `main` holds an approved, uncommitted backlog in the same files.
- `node --check` every touched file; `npm run style` shows no new drift; bump `?v=` on each touched `<script>` tag in `index.html` to `4.9.216`.
- "Done" per task = its headless checks pass; the plan is done only after the browser check in Task 7, and the owner's playtest decides.

## Review Focus

1. **A cancelled swing leaves a live hitbox or a stuck pose**: after a cancel, the old swing must deal no further damage and the body must play the Q, not freeze mid-swing. Task 1 test `cancel_clears_swing` asserts no second hit from the cancelled swing and `attackTimer === 0` before Q's own timer.
2. **A blocked hit counts as landed**: a swing stopped by a guard must not open the cancel. Task 1 test `cancel_not_on_block`.
3. **Q pressed during a miss is lost**: a press during a whiff's recovery must fire when recovery ends, within the buffer window. Task 3 test `q_buffered_after_miss`.
4. **Super burst (E while stunned) broken by the E gate**: being stunned is not recovery; the double-press burst must still fire. Task 2 test `burst_still_fires`.
5. **Story locks bypassed through the buffer**: `_storyNoAbility` / `_storyNoSuper` must still refuse a buffered Q/E. Task 3 test `buffer_respects_story_lock`.

---

### Task 1: Hit-confirm cancel into Q

**Files:**
- Modify: `js/smb-combat.js` (where `_basicChainN` is bumped, ~line 917)
- Modify: `js/smb-fighter.js` (`ability()` recovery gate, ~line 3402; new methods next to `_resetBasicChainForMove()`)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `Fighter._hitCancelFrom` (number|undefined): the `_attackStartFrame` of the swing whose landed hit opened the cancel. Set in `dealDamage()` right after `_basicChainN` is bumped, only when the new `_basicChainN < STRING_LEN`, the attacker is non-boss and `weapon.type === 'melee'`.
- Produces: `Fighter._canHitCancel() -> boolean`: true when non-boss, `_hitCancelFrom === _attackStartFrame`, `1 <= _basicChainN < STRING_LEN`, and the swing is still running or recovering (`attackTimer > 0 || attackEndlag > 0`).
- Produces: `Fighter._endSwingForCancel() -> void`: ends the current swing and recovery so no hitbox stays live (attack timer, endlag, whiff guard lock, swing hit state), and clears `_hitCancelFrom`.
- Produces: `HIT_CANCEL_STUN_MAX = 90` (smb-fighter.js, next to `BASIC_CHAIN_MAX`) — cap for the stun hold.

- [ ] **Step 1: Write failing checks** in `tools/fight-retune-test.js` (kind `sim`, `RT.pair('sword','sword',40)`, B AI off):
  - `cancel_on_hits_1_to_3`: for n in 1..3, land n basics with `RT.stringRun`, then call `A.ability(B)` while `A.attackEndlag > 0`; assert `A.abilityCooldown > 0` (Q fired) each time.
  - `no_cancel_on_hit_4`: land 4; during the 4th's recovery `A.ability(B)` leaves `A.abilityCooldown === 0`.
  - `no_cancel_on_miss`: B out of reach (gap 200), swing, during recovery `A.ability(B)` leaves `abilityCooldown === 0`.
  - `cancel_not_on_block`: B shielding (`B.shielding = true`, pool guard full), swing into it, during recovery Q is refused.
  - `cancel_clears_swing`: after a cancel on hit 1, B takes no damage from the old swing (track `B.health` across the next 10 frames excluding Q's own hit by checking `A._attackKindTier`) and `A.attackTimer` was 0 on the cancel frame before Q set it.
  - `q_connects_from_hit_3` (per weapon): for every melee key in `WEAPON_KEYS` (skip `customAttack` and ranged), land 3, cancel into Q, step up to 90 frames; record whether B took Q damage while `B.stunTimer > 0 || B.ragdollTimer > 0`. Pass when every weapon connects or is in `Q_CONNECT_EXCEPTIONS` (an array in the test, filled in Step 5 with the reason per key).
- [ ] **Step 2:** `node tools/fight-retune-test.js --only=cancel_on_hits_1_to_3,no_cancel_on_hit_4,no_cancel_on_miss,cancel_not_on_block,cancel_clears_swing` — expect `cancel_on_hits_1_to_3` and `cancel_clears_swing` FAIL, the three refusals PASS.
- [ ] **Step 3:** Set `_hitCancelFrom` in `dealDamage()`; add `_canHitCancel()` and `_endSwingForCancel()`; change `ability()`'s gate to `if (!this.isBoss && this.attackEndlag > 0 && !this._canHitCancel()) return;` and, when it passes by cancel, call `_endSwingForCancel()` before Q starts. Ranged weapons never set `_hitCancelFrom`, so they keep the lock.
- [ ] **Step 4: Stun hold.** On a cancel, hold the target's stun until Q's contact: `target.stunTimer = max(stunTimer, min(HIT_CANCEL_STUN_MAX, botMoveTime(this,'q',target) + STRING_STUN_PAD))` when `botMoveTime` (smb-bot-tactics.js, loaded later, runtime `typeof` guard) returns a number ≥ 0; otherwise no hold. Target = the fighter whose hit opened the cancel (store it alongside `_hitCancelFrom`).
- [ ] **Step 5:** Run all six checks. Any weapon in `q_connects_from_hit_3` that still misses goes in `Q_CONNECT_EXCEPTIONS` with its reason (projectile travel, summon, scene windup > cap). No Q is retuned.
- [ ] **Step 6:** Run the full suite `node tools/fight-retune-test.js` — all stage 1 checks still pass. `node --check js/smb-combat.js js/smb-fighter.js`.

### Task 2: Super (E) follows the same rule

**Files:**
- Modify: `js/smb-fighter.js` (`useSuper()`, non-stunned branch, ~line 3480)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Consumes: `_canHitCancel()`, `_endSwingForCancel()` (Task 1).

- [ ] **Step 1: Write failing checks** (A `superMeter = 100; superReady = true`):
  - `e_refused_after_miss`: whiff, during recovery `A.useSuper(B)` leaves `superReady === true`.
  - `e_refused_after_hit_4`: same during the 4th hit's recovery.
  - `e_cancel_on_hit_2`: land 2, `A.useSuper(B)` during recovery fires (`superReady === false`).
  - `burst_still_fires`: B full meter, stunned by A's hit, `B.useSuper(A)` twice within `BURST_CONFIRM_WINDOW` → B's `stunTimer === 0`, meter spent.
  - `boss_e_ungated`: a boss fighter in recovery can still `useSuper`.
- [ ] **Step 2:** Run them; expect the two refusals FAIL.
- [ ] **Step 3:** In `useSuper()` after the stunned branch: `if (!this.isBoss && this.attackEndlag > 0) { if (!this._canHitCancel()) return; this._endSwingForCancel(); }`.
- [ ] **Step 4:** Run the five checks and the full suite; all pass. `node --check js/smb-fighter.js`.

### Task 3: Q and E pressed in recovery are buffered

**Files:**
- Modify: `js/smb-input.js` (Q keydown ~line 306, E keydown ~line 321, `_bufWait` ~line 411)
- Test: `tools/fight-retune-test.js` (kind `page`, `RT.duel` + `RT.tap`)

**Interfaces:**
- Consumes: `_canHitCancel()` (Task 1).
- Produces: `_bufWait` rule: an `'attack'` buffer waits while `cooldown > 0 || attackEndlag > 0` (unchanged); an `'ability'` or `'super'` buffer waits while `!isBoss && attackEndlag > 0 && !_canHitCancel()`.

- [ ] **Step 1: Write failing checks:**
  - `q_buffered_after_miss`: P2 far away; tap attack, then tap Q 5 frames before the whiff's recovery ends; assert Q fires within `INPUT_BUFFER_FRAMES + 2` frames of recovery ending.
  - `e_buffered_after_miss`: same with E and a full meter.
  - `q_cancel_by_key`: P2 in reach and still; tap attack, after the hit lands tap Q; Q fires on that frame.
  - `buffer_respects_story_lock`: `P1._storyNoAbility = true`, buffered Q never fires.
- [ ] **Step 2:** Run; expect the two buffer checks FAIL.
- [ ] **Step 3:** On Q/E keydown, a non-boss player with `attackEndlag > 0 && !_canHitCancel()` gets `p._inputBuffer = { action: 'ability'|'super', frame: frameCount }` instead of the direct call (E's Conviction hold path keeps its own handling when not recovering). Extend `_bufWait` as in Interfaces.
- [ ] **Step 4:** Run the four checks and the full suite; all pass. `node --check js/smb-input.js`.

### Task 4: Wall escape only past a full string

**Files:**
- Modify: `js/smb-combat.js` (wall combo block, ~lines 1003-1035)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `WALL_ESCAPE_HITS = STRING_LEN + 1` (smb-combat.js, next to `STRING_LEN`); True Form keeps 3.
- Produces: `target._wallComboQ` — the attacker's `_attackStartFrame` of the last Q that already counted, so a Q counts once.

- [ ] **Step 1: Write failing checks** (B 30 px from the right wall, A facing it):
  - `corner_string_lands`: 4-hit string; no `_stunGuardUntil` jump > 15 frames ahead (the escape) at any hit; 4 hits land.
  - `corner_3_plus_q_lands`: 3 hits then cancel into a multi-hit Q (use the weapon with the most Q hits from Task 1's run); no escape.
  - `corner_string_plus_q_escapes`: 4 hits, then Q once the knockback lands them in reach again (or place B back at the wall) → escape fires.
  - `trueform_wall_warp_3`: a True Form target still warps at 3.
  - `dot_not_counted`: DoT ticks (`isDot`) on a cornered B don't advance `_wallComboHits`.
- [ ] **Step 2:** Run; expect `corner_string_lands` and `corner_3_plus_q_lands` FAIL.
- [ ] **Step 3:** Skip the increment for `isDot` and for a second hit of the same Q (`attacker._attackKindTier === CLASH_TIER_ABILITY && target._wallComboQ === attacker._attackStartFrame`); threshold `target.isTrueForm ? 3 : WALL_ESCAPE_HITS`.
- [ ] **Step 4:** Run the five checks and the full suite. `node --check js/smb-combat.js`.

### Task 5: Baitable burst, BURST label, bot burst timing

**Files:**
- Modify: `js/smb-fighter.js` (`burst()` ~line 3516, `_aiWantsBurst()` ~line 3499, constants next to `BURST_HEAL`)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `BURST_READ_RECOVERY = 30` (frames; tune in Step 4). During it the burster has `attackEndlag` set and `_whiffGuardLock = frameCount + BURST_READ_RECOVERY`, so it can't attack, Q, super or guard, and is not stunned.

- [ ] **Step 1: Write failing checks:**
  - `burst_read`: A strings B; A `shielding = true` inside `BURST_RADIUS` when B bursts → A's velocity unchanged by the burst, B's meter is 0, B `attackEndlag >= BURST_READ_RECOVERY - 1`, B can't raise guard (`_whiffGuardLocked(B)`), B `stunTimer === 0`.
  - `burst_unread`: A not guarding → pushed as today (`|A.vx| >= BURST_KB_X - 1`), B gets no read recovery.
  - `burst_label`: with `settings.dmgNumbers = true`, a burst pushes a `DamageText` reading `BURST`.
  - `bot_burst_hit3`: hard bot B with full meter vs a pressing A (the stage-2 probe body): over 40 strings no burst fires before combo 3, and between 30% and 70% of strings that reach 3 are burst.
- [ ] **Step 2:** Run; expect all four FAIL except `burst_unread`.
- [ ] **Step 3:** In `burst()`: a hostile in radius with `f.shielding && !f.isBoss` is skipped (not pushed) and marks the burst read; after the loop, a read burst applies `BURST_READ_RECOVERY` as in Interfaces. Push `new DamageText(this.cx(), this.y - 38, 'BURST', this.color)` behind `settings.dmgNumbers`, the same way `guardBurst()` pushes `GUARD!` (style guide: reuse of the existing damage-text component, no new style). `_aiWantsBurst` cfg: hard `{ combo: 3, chance: 0.5, delay: 7 }`, expert `{ combo: 3, chance: 0.7, delay: 4 }`, medium and easy unchanged.
- [ ] **Step 4:** Run the four checks; tune `BURST_READ_RECOVERY` so a sword basic from a guarding A (drop guard, swing) lands on the read burster in `burst_read` (add that assertion). Full suite passes. `node --check js/smb-fighter.js`; `npm run style`.

### Task 6: Hard and expert bots use the cancel

**Files:**
- Modify: `js/smb-bot-tactics.js` (new `botHitCancel`; call in `botTacticsFrame`'s "They cannot act" branch, before `if (!smart || f.attackTimer > 0 || f.attackEndlag > 0) return;`)
- Modify: `js/smb-fighter.js` (per-frame AI block next to the burst check, ~line 1838, for `_tacLegacy` bots)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Consumes: `_canHitCancel()` (Task 1), `botMoveWants(f, 'q', t, 0)` (existing).
- Produces: `botHitCancel(f, t) -> boolean` in `smb-bot-tactics.js`: true and calls `f.ability(t)` when `f.isAI`, `f.aiDiff` is `'hard'` or `'expert'`, `f._canHitCancel()`, `f._basicChainN` is 2 or 3, `abilityCooldown <= 0`, and `botMoveWants(f, 'q', t, 0) === true`. Hard cancels on about half its chances, expert on most (roll once per opened cancel, keyed on `_hitCancelFrom`).

- [ ] **Step 1: Write failing checks:**
  - `bot_cancels_hard`: hard bot A vs dummy B (AI off, high HP, in reach) for 600 frames: at least one Q fired while `_canHitCancel()` was true.
  - `bot_no_cancel_medium`: medium bot, same setup: zero cancels.
  - `bot_cancels_legacy`: a `_tacLegacy` hard bot also cancels.
- [ ] **Step 2:** Run; expect the two cancel checks FAIL.
- [ ] **Step 3:** Add `botHitCancel` and the two call sites (the fighter call behind `typeof botHitCancel === 'function'`).
- [ ] **Step 4:** Run the three checks and the full suite. `node --check js/smb-bot-tactics.js js/smb-fighter.js`.

### Task 7: Measure, browser check, docs

**Files:**
- Modify: `index.html` (`?v=4.9.216` on every touched script)
- Modify: `docs/superpowers/specs/2026-11-26-fighting-rework-stage2-design.md` (Measurement: before/after lines), `docs/sovereign.md` (one row), `docs/combat.md` (cancel, wall escape, burst read)

- [ ] **Step 1: Before numbers** (run before Task 1 starts, saved to the scratchpad): `node tools/bot-duel.js --n=16 --diff=hard --bot=warrior --botw=sword --arena=colosseum`, the axe line, the ladder default; `node tools/class-balance.js` weapons run.
- [ ] **Step 2: After numbers**: same commands. Report seconds per life; if any line is under ~12 s, raise `DUEL_HP_MULT` in 0.1 steps until it isn't, staying ≤ ~30 hits per life. Report weapons moving > 10 points. Run `tools/level-tester.js` on chapters 1, 5, 10, 20, 40 (the stage 1 sample) with brain 20011 pinned and report; no story retune.
- [ ] **Step 3:** Rerun the stage-2 interruption probe (fast attacker vs live hard and medium bots, middle and wall, meter full and empty): 4-hit strings land unless the bot bursts, never a burst before hit 3, no wall escape on a 4-hit string.
- [ ] **Step 4:** Sovereign brain ladder eval (`tools/brain/laddereval.js`, same args as stage 1's row); add the row to `docs/sovereign.md`.
- [ ] **Step 5:** Browser (agent-chrome, fresh port, versus vs a hard bot, sword then axe): land 3 into Q by key; whiff then Q fires after recovery; 4-hit corner string lands; guard a bot's burst and punish it; the `BURST` label shows. Screenshot each. Close agent-chrome and kill the server.
- [ ] **Step 6:** `npm run style` (no new drift), `npm run check`, full `node tools/fight-retune-test.js`. Draft the changelog line for the owner (not written into the changelog): "After up to three landed hits you can cut straight into Q or your super. The fourth hit ends the string. A burst into a raised guard leaves the burster open."
