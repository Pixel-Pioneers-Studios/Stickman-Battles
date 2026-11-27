# Fighting rework: design

Written Nov 25 2026. Approach B, staged. This doc fully specifies stage 1 (the retune);
stage 2 (combo routes) is outlined and gets its own design once stage 1 has been played.

## Why

The owner played a duel and found it boring: "the fighting feels slow and lives end too
fast... I didn't really feel the thrill of a fight." Two measured causes:

- **Lives are ~7.5 s long.** `tools/bot-duel.js --n=8 --diff=hard --bot=warrior --botw=sword
  --arena=colosseum`: 34 lives lost in ~256 s of fighting, ~14 hits per life, a 3-life duel
  over in 32 s. No time for a back-and-forth to build.
- **Presses do nothing.** Swings are gated by `weapon.cooldown` counted from the press, which
  outlasts the swing plus its recovery (sword basic: 9f swing + 11f endlag, 38f cooldown =
  18 dead frames; sword Draw Cut: 10 + 6 vs 22). On top of that: SWITCH IT UP refuses a 3rd
  landed basic outright (`BASIC_CHAIN_MAX = 2`), and pressing twice during recovery locks the
  attack key for `ATTACK_MASH_LOCK` (16f) past recovery (`smb-input.js`).

## Goal

Fights with a thrill: inputs that respond, lives long enough for momentum to swing, close
calls and comebacks. Still hard but fair.

**Success (stage 1):** the owner plays a versus/ladder duel and says it feels faster and that
lives last. Measured in the sim: median life 15-20 s, a basic sword life needs no more than
~30 clean hits (not a grind), zero ignored presses outside stun/recovery.

**Non-goals (stage 1):** new moves, cancels, burst mechanics (stage 2). Story, boss, BR and
minigame HP/lives. Art or HUD changes.

**Anti-goals:** a damage-sponge grind (the 1500 HP option); mashing beating timing; infinite
combos; any melee basic over 24 damage; bosses or cinematics breaking.

## Approaches considered

- **A. Retune only.** Recovery-gated swings, longer strings with decay, shorter Q cooldowns,
  more HP, fewer lives. Fast, measurable, keeps bots and online working. Fixes pace, adds no
  new source of thrill.
- **B. A + combo routes (chosen).** Stage 2 adds cancels (string > launcher > air hit > Q),
  a defensive answer when being combo'd, and room for comebacks. More work; bots and the
  Sovereign brain need retraining after.
- **C. Rewrite the combat core.** Ruled out: breaks bosses, cinematics, online and every
  trained AI; violates "patch, never replace".

Owner picked B and said to start with the retune.

## Stage 1: the retune

### 1. Recovery decides when you can swing again

A melee press is accepted as soon as the previous swing and its recovery are over. The
cooldown no longer outlasts them: effective cooldown = swing `dur` + `endlag` (move-list
moves use their own `dur`/`endlag`). Misses stay costly through recovery: whiff endlag x2.4
and `_whiffGuardLock` are kept, so a bad swing is still punishable. Ranged weapons keep
their cooldowns (reload/spread rules stay).

### 2. Inputs are never silently eaten

- Remove the mash lock: a second press during recovery refreshes the buffer instead of
  locking the key.
- Buffer window 8f > 10f so a press just before recovery ends still comes out.

### 3. SWITCH IT UP becomes decay, not a wall

- `BASIC_CHAIN_MAX` 2 > 4 landed basics.
- Damage decay already exists (`COMBO_SCALE` in `smb-combat.js`); the hard refusal at the
  cap is replaced by a forced knockback/launch on the capped hit so the string always ends
  with the opponent out of reach. No infinites: the existing 7+ forced-launch and the
  stun-handoff rules stay.
- The SWITCH IT UP text goes, along with its two tips in `smb-globals.js` (rewritten to
  describe the new rule).

### 4. Q cooldowns down ~25%

`abilityCooldown` (160-240f today) multiplied by 0.75 for every weapon, one constant.
Super (E, meter) unchanged.

### 5. More health, fewer lives (versus, ladder, online only)

- Default `chosenLives` 3 > 2. The lives picker still offers other values.
- A global `DUEL_HP_MULT` applied where class HP is set (`applyClass` in
  `smb-enemies-class.js`) for those modes only. Starting value 2.0 (warrior 138 > 276,
  close to the owner's own "300 HP, one life" idea), then tuned in the sim until the median
  life is 15-20 s with stage-1 pacing in place, keeping hits-per-life at or under ~30.
- Ladder's existing `p1HpMul` assist stacks on top.

## Measurement

Before and after, same commands: `tools/bot-duel.js` (sword/sword, axe/sword, katana ladder
default), reporting seconds per life, hits per life, match length, win rate. Add a dev-only
count of ignored attack presses (pressed while free to act, nothing happened). `tools/
class-balance.js` to catch any weapon jumping out of line. Then a browser playtest
(agent-chrome) and the owner's own play: that is "done".

**Before** (Nov 25, n=16 each, 3 lives, `tools/bot-duel.js`):

- sword bot vs proxy sword, colosseum, hard: bot 16-0, 66 lives, avg 32 s; 7.7 s per life, 14.0 hits per life
- axe bot vs proxy sword, colosseum, hard: bot 15-1, 65 lives, avg 36 s; 9.0 s per life, 13.2 hits per life
- ladder Champion (expert ronin/katana vs proxy sword, ledge): bot 16-0, 56 lives, avg 32 s; 9.1 s per life, 12.6 hits per life

**After** (Nov 25, stage 1 built, `DUEL_HP_MULT = 2.0`, 2 lives, n=16 each):

- sword bot vs proxy sword, colosseum, hard: bot 16-0, 42 lives, avg 40 s; 15.4 s per life, 28.3 hits per life
- axe bot vs proxy sword, colosseum, hard: bot 15-1, 43 lives, avg 50 s; 18.6 s per life, 27.8 hits per life
- ladder Champion: bot 16-0, 32 lives, avg 32 s; 16.0 s per life, 28.0 hits per life

All three sit inside the 15-20 s target with hits per life under the ~30 ceiling, so 2.0 stays.
Raising it further would cross the grind ceiling before lengthening lives much.

## Known knock-on effects

- **Story:** enemies use the same Fighter timing, so they swing faster too. Run
  `tools/level-tester.js` on a sample of chapters and report; retune story only if it
  breaks the "brutal not impossible" bar. Story HP/lives untouched.
- **Bots:** they check `cooldown === 0`, so they keep working. Ladder rung difficulty is
  re-measured.
- **Sovereign brain:** trained on the old timing. Measure with `tools/sov-duel.js`, log a
  row in `docs/sovereign.md`; retraining waits for stage 2 so it happens once.
- **Online:** both peers run the same code version; `chosenLives` is already synced, the HP
  multiplier is a constant. Bump `?v=`.
- **Move strings (axe, sword):** approved Nov 25 and uncommitted; their per-move `cooldown`
  values are superseded by rule 1. Their frame data otherwise stands.

## Stage 2 (outline, designed later)

Cancels on hit (string hit > launcher > air move > Q), a defensive escape when being combo'd
(guard burst exists, may be the base), and a comeback lever. Then bots and Sovereign retrain.

## Left to the builder

Exact place to compute the recovery-gated cooldown (`attack()` sets `this.cooldown` in two
spots); naming of new constants; the ignored-press counter; final `DUEL_HP_MULT` and
`BASIC_CHAIN_MAX` values within the targets above.
