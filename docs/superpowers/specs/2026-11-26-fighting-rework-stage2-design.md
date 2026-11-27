# Fighting rework stage 2: design

Written Nov 26 2026. Follows stage 1 (`2026-11-25-fighting-rework-design.md`), which the
owner played and approved ("combat feels a lot cleaner").

## Why

Stage 1 fixed pace: swings respond, lives last ~16 s. Two things still take the thrill out:

- **A clean string doesn't land.** In the owner's playtest, fast 4-hit strings were broken
  at about hit 2. Measured cause (40 strings per setup, attacker pressing every frame):
  - The hard bot super-bursts out at combo 2, 65% of the time, 7 frames after the hit
    (`Fighter._aiWantsBurst`, `smb-fighter.js`). With a full meter it broke 8 of 8 strings
    that got going. Stage 1's double health makes this common: the 0.35 meter a victim
    earns per damage taken fills the bar about once per life.
  - Anyone hit 3 times within 80 px of a wall gets pushed back toward the middle, with a
    24-frame no-restun window (wall combo escape, `dealDamage()`, `smb-combat.js`). With
    4-hit strings it fires on every corner string; that push is how targets "got behind" the
    owner. Both rules were tuned when strings were 2 hits.
- **A string leads nowhere.** Q is locked for the whole recovery of a swing, even one that
  landed (`Fighter.ability()`), so there is no "hit, hit, hit, then a move". A Q pressed in
  recovery is silently dropped, not even buffered (`smb-input.js`).

## Goal

The owner's model, from The Strongest Battlegrounds: up to 3 basic hits, then go into a
move. The 4th basic hit knocks the target away and ends it; nothing follows it. Being
combo'd is answered by a costly, readable escape, never a free one.

**Success:** the owner plays versus against a hard bot and can land 3 hits into Q on
purpose, and a 4-hit string in the middle or in a corner lands unless the bot spends its
burst. Measured: every weapon's Q, cancelled from hit 3, connects in the sim (see
Measurement).

**Non-goals:** a comeback system (super meter from damage taken + the burst already serve;
revisit after the owner plays stage 2). Air combos, launchers, new moves. Boss fights,
story enemies (owner deferred both). Art beyond one damage-text label.

**Anti-goals:** anything after the 4th hit; infinite or touch-of-death combos; cancelling
a miss for free (stage 1's whiff penalty stays); a melee basic over 24 damage; bosses,
cinematics or online breaking.

## Approaches (cancel)

- **A. Cancel on any landed hit 1 to 3 (chosen).** Once one of those basics connects, Q
  can come out at once instead of waiting out the recovery. A miss or a block keeps its
  full recovery. Easy to learn, fits the 3-then-move model, cheap for bots.
- **B. Tight cancel window** (e.g. 6 frames after the hit). Rewards timing, but newcomers
  feel Q is broken when they miss it; against the fading-help rule. Not chosen.
- **C. Q always cuts recovery, hit or miss.** Makes spamming safe and undoes stage 1's
  whiff penalty. Ruled out.

Owner picked A.

## Design

### 1. Hit-confirm cancel into Q

- While a non-boss fighter's basic melee swing has **landed** (dealt damage, not blocked)
  and that hit was string hit 1, 2 or 3 (`_basicChainN` 1..3, `STRING_LEN` 4), a Q press
  ends the swing and its recovery and fires Q. Off cooldown only; all of `ability()`'s
  other gates stay (stun, shield, story locks, cinematics, `MoveScene` busy).
- The cancel window runs from the landed hit through the end of that swing's recovery.
- Not after hit 4: its recovery is locked like a miss.
- A miss, a blocked swing or a clash keeps its full recovery. A Q pressed then is
  **buffered** (same `INPUT_BUFFER_FRAMES` as swings) and fires when recovery ends, so it
  is never silently dropped.
- Q after a string keeps the existing follow-up rules: combo damage scaling
  (`COMBO_SCALE`), the `COMBO_ABILITY_STUN` 24-frame cap, the 7+ hit forced launch, the stun
  handoff. A cancelled Q still counts as a move for `_resetBasicChainForMove()`.
- **Q must connect from hit 3.** For each weapon, a Q cancelled off hit 3 must reach the
  target while it is still stunned. Where a Q's startup outlasts the stun, the fix is to
  hold the target's stun until that Q's first active frame plus a small pad (capped at
  `MAX_STUN`) at the moment of the cancel; never more damage. The hold covers the gap
  before the Q lands; `COMBO_ABILITY_STUN` still caps the stun the Q leaves after it lands,
  so the two don't conflict. *(Builder call.)*
- **Who gets it:** a Fighter-level rule for every non-boss fighter's melee basic (players,
  bots, story enemies, the Sovereign body). Ranged weapons keep today's recovery lock.
  *(Builder call.)*
- **Qs that can't connect even with a hold** (slow projectiles, summons, long-windup
  scenes that outlast `MAX_STUN`) still get the cancel, with no hold beyond the cap, and are
  listed as named exceptions in the test. No per-weapon Q retune in this stage.
  *(Builder call.)*
- A cancelled Q costs its normal cooldown and follows its normal `_abilityCdOverride`.

### 2. Super (E) follows the same rule

Today E has no recovery lock. Under the owner's rule ("nothing after 4 hits") E gets the
same gate as Q (owner confirmed Nov 26): allowed from a landed hit 1-3 and when free; during
the recovery of a miss, a block or the 4th hit it is buffered like Q and fires when recovery
ends. Non-boss fighters only, AI callers included. The input buffer's wait check must hold
Q and E until recovery ends (today only 'attack' waits). Combo-burst (E while stunned) is
unchanged.

### 3. Wall escape only past a full string

The wall combo escape fires at 5+ hits in its 90-frame window (`> STRING_LEN`), not 3, so a
full 4-hit string lands in the corner but corner loops that keep going with Q still break.
A Q counts once however many times it hits, and DoT ticks don't count, so 3 hits into a
multi-hit Q (4) lands; a full string followed by Q (5) escapes. *(Builder call.)*
True Form keeps its 3-hit warp (root CLAUDE.md: True Form must counter wall combos).

### 4. Bursts are baitable

If the attacker is guarding (`shielding`) when a super burst fires and is inside its
radius, the burst is read: the attacker is not pushed, the burster still loses the meter,
and the burster is left open for a punish window (on the order of a whiffed heavy swing's
recovery; exact frames tuned in the sim). "Open" means recovery, not stun: during it the
burster can't attack, Q, super or guard, but isn't stunned, so the punish is one clean hit
that starts a normal combo, not a free stun. Only the super burst can be read; guard burst
is unchanged. *(Builder call.)* The burst also shows a "BURST" damage-text label
the way guard burst already shows "GUARD!", so players can see what happened. Guard burst
(shield press, 20 guard) is unchanged.

### 5. Bot burst timing

`_aiWantsBurst` thresholds move off the 2-hit era: hard bursts from combo 3 at about 50%,
expert from combo 3 at about 70%, medium combo 3 (unchanged threshold), easy unchanged.
Bots don't try to bait bursts (left for the Sovereign retrain).

### 6. Bots use the cancel

Hard and expert bots cancel into Q after a landed hit 2 or 3 when Q is ready and the
target is in Q range: in the tactics layer (`smb-bot-tactics.js`) for bots that run it, and
in the stock AI's ability branch for `_tacLegacy` bots. Easy and medium don't. The
Sovereign brain gets the same Fighter rule (its Q presses can cancel if they happen to fall
in the window) but isn't taught to use it; it retrains once after stage 2. *(Builder call.)*

## Measurement

- Extend `tools/fight-retune-test.js`: cancel fires on landed hits 1-3, not on hit 4, not
  on a miss or block; a Q pressed during a miss's recovery fires when it ends; E obeys the
  same gate; the wall escape doesn't fire on a 4-hit corner string but does on 5+; a burst
  into a guarding attacker leaves the burster open; per weapon, Q cancelled from hit 3
  connects.
- Rerun the stage 1 probe (fast attacker vs live hard and medium bots, middle and wall):
  4-hit strings land unless the bot bursts, and the burst comes no earlier than hit 3.
- `tools/bot-duel.js` pace line before/after. Cancels add damage, so seconds per life will
  drop; report it, and keep the 15-20 s target by tuning `DUEL_HP_MULT` only if it falls
  under ~12 s.
- `tools/class-balance.js` before/after: report weapons moving >10 points.
- Browser check (agent-chrome), then the owner's playtest.

### Results (Nov 27 2026, built)

- `tools/fight-retune-test.js`: 57 checks pass (29 stage 1 + 28 stage 2, incl. 5 from the final review). Every one of the 14 measured
  melee Qs connects when cancelled from hit 3; no exceptions needed. `knives` and `anchor`
  (`customAttack`) and ranged weapons are not measured.
- Interruption probe (`probe_strings`, 30 strings per row, sword vs live bot, strings that land all 4
  hits). Before = HEAD (stage 1) in a clean worktree, after = stage 2:

  | bot / place / meter | before | after |
  |---|---|---|
  | hard / middle / full | 8/30, 9 bursts before hit 3, 1 escape | 8-11/29, 0 early bursts |
  | hard / middle / empty | 17/30 | 21-27/30 |
  | hard / wall / full | 0/30, 13 wall escapes | 3-4/30, 0 escapes (bursts 6-8, all at 3+) |
  | hard / wall / empty | 0/30, 23 wall escapes | 13-15/30, 0 escapes |
  | medium / middle / full | 14/30 | 17-18/30 |
  | medium / middle / empty | 29/30 | 28-29/30 |
  | medium / wall / full | 0/30, 16 escapes | 12/29, 0 escapes |
  | medium / wall / empty | 0/28, 26 escapes | 25-28/29 |

  No burst before hit 3 and no wall escape on a 4-hit string in any row. Hard bots still break
  some strings with no burst or guard burst (they did before too); not chased in this stage.
- `tools/bot-duel.js` pace (hard, colosseum, 16 matches): sword 15.3 s to 14.8 s per life
  (28.6 to 28.3 hits), axe 18.6 to 18.3 s (27.9 to 26.9), default line 15.9 to 13.0 s (28.2 to
  23.2). All above 12 s, so `DUEL_HP_MULT` is unchanged.
- `tools/class-balance.js --mode=weapons` (before = stage 1's `retune-after` run): no weapon moved
  more than 10 points. Largest: axe +6.9, gun -6.3, sword +5.6, combat +5.2.
- Browser (agent-chrome, versus vs hard bot, colosseum): 3 hits then Q by key fires out of the
  cancel with the bot still stunned; a whiff then Q fires 1 frame after recovery ends; a 4-hit corner
  string lands with no escape; a burst into a raised guard doesn't push the guard, leaves the burster
  30 f of recovery with no guard, and shows the `BURST` label.

- Story sample (`tools/level-tester.js --pilot=brain`, 3 attempts, user chapters 1, 5, 10, 20, 40):
  3/3, 3/3, 0/3, 3/3, 0/3. Chapters 10 and 40 were already 0/3 after stage 1 (crowd chapters; story
  enemy rework deferred by the owner). No story retune.
- Sovereign brain ladder (`laddereval.js --n=4`): 37/40, same as after stage 1.

## Knock-on effects

- **Online:** both peers run the same code; inputs already sync. Bump `?v=`.
- **Story:** enemies that use the stock AI at hard/expert difficulty will cancel too. Story
  enemy rework is deferred by the owner; report story samples, don't retune.
- **Sovereign brain:** row in `docs/sovereign.md`; retrain after stage 2.
- **Changelog:** one line for the release, written with the stage 1 line.

## Left to the builder

Where the "this swing landed" flag is read (`_basicChainArmed`, `swingHitTargets`, or a new
field set in `dealDamage()`); how the swing and recovery are ended on cancel without leaving
a live hitbox or a stuck pose; exact burst-read punish frames and bot burst chances within
the ranges above; per-weapon stun holds where a Q needs one.
