# Fighting Retune (Stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fights respond to every press and lives last 15-20 s, so momentum can swing inside a life.

**Architecture:** Patch the existing Fighter/combat/input globals, no new systems. Melee swings become
gated by their own swing + recovery instead of a longer cooldown; the input layer stops eating presses;
the 2-hit SWITCH IT UP wall becomes a 4-hit string that ends in a launch; Q cooldowns scale by one
constant; versus/ladder/online get 2 lives and a health multiplier tuned by measurement.

**Tech Stack:** Plain JS globals loaded by `<script>` tags (no modules), headless checks with puppeteer
against the real page (pattern of `tools/bot-duel.js`), BalanceSim from `tools/class-balance.js`.

**Spec:** `docs/superpowers/specs/2026-11-25-fighting-rework-design.md`

## Global Constraints

- Patch, never replace. No ES modules, no `import`/`export`. A file only uses globals from files loaded before it.
- All damage through `dealDamage()`; never write `target.health` directly. No cinematics triggered inside `dealDamage()`.
- Melee basics stay at or under 24 damage per hit. No damage values change in this plan.
- No infinite combos: the 7+ forced launch, stun handoff and `COMBO_SCALE` stay.
- Bosses (`isBoss`), ranged weapons, the megaknight branch and `customAttack` weapons keep their current cooldown behaviour.
- Health/lives changes apply to `gameMode === '2p'` (versus + ladder) and `'online'` only, and never when `storyModeActive`.
- Health target: median life 15-20 s in the sim; a sword-vs-sword life takes no more than ~30 clean hits.
- Do NOT commit. `main` holds a large approved-but-uncommitted backlog in the same files; the owner commits.
- "Done" for each task = its headless check passes; the plan as a whole is done only after the browser playtest in Task 8.
- `node --check` every touched file; `npm run style` shows no new drift.

## Review Focus

1. **Bots pressing every frame**: AI calls `attack()` whenever `cooldown === 0`; with shorter cooldowns bots swing more often. Expect higher bot DPS, not frozen bots. Task 2 test asserts a bot still lands hits and nobody stalls (BalanceSim `bug.stall === 0`).
2. **Whiffs must stay punishable**: a missed swing still costs ×2.4 recovery and no guard. Task 2 test pins the whiff gap.
3. **String reset after the launch**: the 5th press after a 4-hit string must swing (not show text, not stay refused). Task 4 test pins it.
4. **Lives picker and online lobby default to 2**: a returning player whose menu shows "3 Lives" but plays 2 is a bug. Task 6 test reads `livesSelect.value` and the online chip.
5. **Health multiplier leaking into story or boss fights**: Task 6 test starts a story-flagged match and asserts health is unscaled.

---

### Task 1: Test harness and baseline

**Files:**
- Create: `tools/fight-retune-test.js`
- Modify: `tools/class-balance.js` (BalanceSim: export a setup/step pair)

**Interfaces:**
- Produces: `BalanceSim.setup(keyA, keyB, opts) -> { A, B }` (same fighters `runMatch` builds, same env, `opts` as `runMatch`); `BalanceSim.step(n) -> void` (advances n sim frames exactly as `runMatch`'s loop does). `runMatch` is refactored to use both, with identical results.
- Produces: `tools/fight-retune-test.js` boots a server + puppeteer page the way `tools/bot-duel.js` does, injects SIM_SRC, runs named checks `check(name, fn)` where `fn` runs in `page.evaluate` and returns `{ pass: boolean, detail: string }`, prints `PASS name` / `FAIL name: detail`, exits 1 on any FAIL. `--only=name` runs one check.

- [ ] **Step 1:** Add `setup`/`step` to BalanceSim; keep `runMatch`'s output identical.
- [ ] **Step 2:** Confirm `runMatch` unchanged: `node tools/bot-duel.js --n=8 --diff=hard --bot=warrior --botw=sword --arena=colosseum --port=8131` matches the spec baseline (bot 7 / proxy 1, 34 stocks, avg 32 s) give or take sim noise.
- [ ] **Step 3:** Create the test file with one smoke check `harness` (setup sword/sword, step 60, both fighters alive, no page errors). Run `node tools/fight-retune-test.js`. Expected: `PASS harness`.
- [ ] **Step 4: Baseline.** Run and save output to the scratchpad, then copy the three summary lines into the spec's Measurement section under "Before":
  - `node tools/bot-duel.js --n=16 --diff=hard --bot=warrior --botw=sword --arena=colosseum`
  - `node tools/bot-duel.js --n=16 --diff=hard --bot=warrior --botw=axe --me=warrior --mew=sword --arena=colosseum`
  - `node tools/bot-duel.js --n=16` (ladder Champion default)
  Add a "seconds per life" line to bot-duel's summary: `frames / 60 / (stocksMe + stocksBot)`, and "hits per life": `(bot hits + proxy hits) / (stocksMe + stocksBot)`.

### Task 2: Recovery decides when you can swing again

**Files:**
- Modify: `js/smb-fighter.js` (`attack()`: `_baseCd` near line 3170, `_basicChainReadyAt` / `_strReadyAt`, final `this.cooldown =` near line 3337)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `Fighter.prototype._swingCd(mv) -> number` — for non-boss melee: `(mv ? mv.dur : WEAPON_SWINGS[weaponKey].dur || 12) + (mv ? mv.endlag : weapon.endlag || 0)`, times `attackCooldownMult` (ceil, min 1) when set. All other cases return the current value (`mv ? mv.cooldown : weapon.cooldown`, same mult).

- [ ] **Step 1: Failing tests** in `fight-retune-test.js`:
  - `recovery_gate_sword`: A = warrior/sword, B = dummy-like warrior standing in reach (AI off). Press `A.attack(B)` every frame for 120 frames; record frames where a swing started (`_attackStartFrame` changes). Assert every gap between accepted swings that landed ≤ `mv.dur + mv.endlag + 1` (Draw Cut 10+6 → ≤ 17; today 22+).
  - `recovery_gate_spear`: same with spear (no move list, plain swing): gap ≤ `WEAPON_SWINGS.spear.dur + 13 + 1` (today 42). The axe's Side Cleave already has cooldown = dur + endlag (24), so it is not a failing case; include it as a regression check that stays ≤ 25.
  - `whiff_still_costs`: A swings with B out of reach. Assert the gap to the next accepted swing ≥ `dur + round(endlag × 2.4)` and `_whiffGuardLock > frameCount` during it.
  - `bots_still_fight`: `BalanceSim.runMatch('warrior','warrior', 7, {stocks:1, arena:'flat'})` finishes with `bug.stall === 0` and both sides landed > 0 hits.
- [ ] **Step 2:** Run `node tools/fight-retune-test.js`. Expected: `recovery_gate_*` FAIL, others PASS.
- [ ] **Step 3:** Implement `_swingCd(mv)` and use it for `_baseCd` (so the chain windows `_basicChainReadyAt` / `_strReadyAt` follow) and for `this.cooldown`. Megaknight branch untouched.
- [ ] **Step 4:** Run tests. Expected: all PASS. `node --check js/smb-fighter.js`.

### Task 3: Inputs are never silently eaten

**Files:**
- Modify: `js/smb-input.js` (lines ~6, ~300-311, ~411, ~417-420)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `const INPUT_BUFFER_FRAMES = 10;` in `smb-input.js`, replacing both literal `8`s in the buffer expiry checks.

- [ ] **Step 1: Failing tests** (real match: set `gameMode = '2p'`, P2 a bot, call `startGame()`, wait for `gameRunning`; press via `window.dispatchEvent(new KeyboardEvent('keydown', {key: p1.controls.attack}))` then keyup):
  - `double_press_in_recovery_fires`: start a swing, press twice during its recovery. Assert a second swing starts within 2 frames of recovery ending (today: locked for +16).
  - `buffer_10f`: press 10 frames before recovery ends, once. Assert the swing fires when recovery ends.
- [ ] **Step 2:** Run with `--only=double_press_in_recovery_fires` and `--only=buffer_10f`. Expected: FAIL.
- [ ] **Step 3:** Remove the mash-lock branch and `_attackMashUntil` check: a press during recovery always (re)sets `p._inputBuffer = { action: 'attack', frame: frameCount }`. Delete `ATTACK_MASH_LOCK` and update the comment above it. Use `INPUT_BUFFER_FRAMES` in both expiry checks.
- [ ] **Step 4:** Run all tests. Expected: PASS. `node --check js/smb-input.js`.

### Task 4: SWITCH IT UP becomes a 4-hit string that ends in a launch

**Files:**
- Modify: `js/smb-fighter.js:88` (`BASIC_CHAIN_MAX`), the cap block in `attack()` (~line 3150)
- Modify: `js/smb-combat.js:243` (`STRING_LEN`)
- Modify: `js/smb-globals.js:233`, `:277` (tips)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Values: `BASIC_CHAIN_MAX = 4`, `STRING_LEN = 4`.

- [ ] **Step 1: Failing tests:**
  - `string_four_hits`: A sword, B in reach on flat arena; press every frame. Assert 4 consecutive landed basics on B (combo counter reaches 4) and that B's knockback on the 4th hit is ≥ 4× the 3rd's (the `STRING_KB` 0.2 lift ends).
  - `fifth_press_swings`: after the 4-hit string, the next press while free starts a swing (`_attackStartFrame` changes) and no `DamageText` with text `'SWITCH IT UP'` was pushed.
  - `no_infinite`: press every frame for 600 frames against a cornered B (flat arena wall); assert no single combo exceeds 7 hits without a forced launch (existing rule) and B is never stunned > 120 consecutive frames.
- [ ] **Step 2:** Run. Expected: `string_four_hits`, `fifth_press_swings` FAIL.
- [ ] **Step 3:** Set both constants. In the cap block: reset `this._basicChainN = 0` and fall through to the swing (no `return`, no text). Rewrite the tips with this exact copy:
  - line 233: `'Landing an ability or super starts your swing string over, so a fresh four-hit string can follow it'`
  - line 277: `'Up to four basic swings chain. The fourth knocks the target away, and each hit in a string does a little less damage'`
- [ ] **Step 4:** Run all tests. Expected: PASS. `node --check` on the three files.

### Task 5: Q cooldowns down 25%

**Files:**
- Modify: `js/smb-fighter.js` (constant next to `BASIC_CHAIN_MAX`; `ability()` ~line 3434)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `const ABILITY_CD_MULT = 0.75;` applied only in the non-override branch: `Math.round(weapon.abilityCooldown * (_weaponAbilityCdMult || 1) * ABILITY_CD_MULT)`. `_abilityCdOverride` values and bosses unchanged.

- [ ] **Step 1: Failing test** `q_cooldown_scaled`: for sword, axe, spear, hammer: call `A.ability(B)`, step until the move scene ends; assert `A.abilityCooldown` at cast frame equals `round(weapon.abilityCooldown × 0.75)` ±1 (sword 180, axe 135).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Add the constant and apply it.
- [ ] **Step 4:** Run all tests. Expected: PASS.

### Task 6: Two lives and more health in duels

**Files:**
- Modify: `js/smb-globals.js:1141` (`chosenLives = 2`; add `const DUEL_HP_MULT = 2.0;` beside it)
- Modify: `js/smb-enemies-class.js` (new `applyDuelHp`)
- Modify: `js/smb-menu-startcore.js` (call site, just before `gameRunning = true` ~line 956)
- Modify: `js/smb-menu-select.js:450,469` (fallback `3` > `2`), `js/smb-network.js:302,1589` (fallback `3` > `2`)
- Modify: `index.html:749-755` (add `<option value="2" selected>2 Lives</option>`, drop `selected` from 3), `index.html:608-609` (`active` moves to the 2 chip), `index.html:1020,1058` (initial text `2`)
- Modify: `tools/class-balance.js` (BalanceSim `build()` calls `applyDuelHp(f)` after `applyClass`, behind `opts.duelHp !== false`); `tools/bot-duel.js` (default `stocks: 2`, flag `--stocks=N`)
- Test: `tools/fight-retune-test.js`

**Interfaces:**
- Produces: `applyDuelHp(fighter) -> void` in `smb-enemies-class.js`: no-op if `fighter.isBoss`, `storyModeActive`, or `gameMode` not `'2p'`/`'online'` (BalanceSim passes regardless by calling it with a `force` second arg: `applyDuelHp(f, true)`). Sets `maxHealth = health = Math.round(maxHealth × DUEL_HP_MULT)`. Called on every non-boss entry of `players` in `_startGameCore` after the mode branches. Runs after ladder's `p1HpMul` so the two multiply.

- [ ] **Step 1: Failing tests:**
  - `duel_hp_scaled`: real 2p match, warrior vs warrior bot. Assert both `maxHealth === 276` and `lives === 2`.
  - `class_none_scaled`: class `none` (150 base, skipped by `applyClass`) → 300.
  - `story_unscaled`: set `storyModeActive = true` and call `applyDuelHp(f)` on a fresh warrior; assert `maxHealth === 138`.
  - `boss_unscaled`: `applyDuelHp` on a fighter with `isBoss = true` leaves health unchanged.
  - `menu_defaults`: `document.getElementById('livesSelect').value === '2'` and the `data-onlinelives="2"` chip has class `active` on a fresh load.
  - `respawn_full`: after a KO in the 2p match, respawned health equals the scaled `maxHealth`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement as above. Check `selectLives(chosenLives)` (`smb-menu-utils.js:103`) still selects the new option.
- [ ] **Step 4:** Run all tests. Expected: PASS. `node --check` every touched js file.

### Task 7: Tune health to the target

**Files:**
- Modify: `js/smb-globals.js` (`DUEL_HP_MULT` final value)
- Modify: spec Measurement section ("After")

- [ ] **Step 1:** Run the three Task 1 bot-duel commands with the new defaults (2 stocks, scaled HP).
- [ ] **Step 2:** If median seconds per life is outside 15-20 s, adjust `DUEL_HP_MULT` in steps of 0.25 and rerun the sword/sword command (n=16) until inside. Stop and report to the owner if hitting 15 s needs hits-per-life above ~30 (the grind ceiling): that means hit damage, not health, is the lever, which is a stage-2 conversation.
- [ ] **Step 3:** `node tools/class-balance.js` (weapons, flat). Report any weapon whose win rate moved more than 10 points vs `tools/class-balance-results-weapons-flat.json`. Do not retune weapons in this plan; list them.
- [ ] **Step 4:** Record before/after lines in the spec.

### Task 8: Knock-on checks, docs, browser playtest

**Files:**
- Modify: `docs/sovereign.md` (new row), `docs/combat.md` (swing gating + string length paragraphs), `docs/gameplay-notes.md` (Pacing section), `index.html` (`?v=` bump on every changed script, matching the current suffix scheme)

- [ ] **Step 1: Story.** `node tools/level-tester.js` on chapters 1, 5, 10, 20, 40 with brain 20011 pinned (default). Report win-rate change vs the last sweep; do not retune story here.
- [ ] **Step 2: Sovereign.** `node tools/sov-duel.js` default; add one row to `docs/sovereign.md` (date, what changed, result, "retrain deferred to stage 2").
- [ ] **Step 3: Docs.** Update the three docs to the new rules (recovery gating, no mash lock, 10f buffer, 4-hit string, Q ×0.75, 2 lives + `DUEL_HP_MULT`).
- [ ] **Step 4: Gates.** `npm run build`, `npm run style` (no new drift), `node tools/fight-retune-test.js` all PASS.
- [ ] **Step 5: Browser.** Fresh port, bumped `?v`. agent-chrome: play a versus match vs a hard bot with sword, then axe. Screenshot mid-string and the lives HUD. Confirm by eye: no dead presses, 4-hit string ends in a knockaway, no SWITCH IT UP text, HUD shows 2 lives. Close agent-chrome and kill the server.
- [ ] **Step 6: Report** to the owner: before/after numbers, story/Sovereign deltas, weapons that moved, screenshots, and that it is ready for their own playtest (the real verdict).
