# Fighting Animation Plan — fighting-game frame data and move strings

Written Nov 22 2026. Goal: melee basics read like a good 2D fighting game. Each weapon
gets several distinct moves with hand-set startup / active / recovery, and fairness comes
from recovery and on-block cost, not from slow startup.

## Where it started

- Each melee weapon had one swing: a single `a0 -> a1` arc in `WEAPON_SWINGS`
  (`js/smb-data-weapons.js`). Every press played the same arc.
- Frame data was derived, not authored: startup = 40% of `dur` clamped 2..6
  (`swingStartupFrames`, `smb-globals.js`), then `weapon.endlag`, then `weapon.cooldown`.
  Axe: 12f swing, ~5f startup, 16f endlag, 46f cooldown = one swing every 0.77 s.
- Whiff: endlag x2.4 plus a 30% random stun. Block: flat `BLOCK_ENDLAG` (14f) for every weapon.

## Input decision: strings, not directions

W is jump and S is shield, so direction + attack would collide with existing keys.
Instead:

- **String on repeated presses.** Each press inside the window plays the next hit of a
  3-hit string, each hit in a different direction. A pause resets the string. Stopping
  short or delaying a hit is the mind game.
- **Air attack** is its own move.
- **Running attack** is its own move (later pass).

No new keys or clicks, works on touch and gamepad, rides the existing chain limiter.

## Axe — first weapon (draft numbers, 60 fps)

| Move | Startup | Active | Recovery | Dmg | On hit | On block | Read |
|---|---|---|---|---|---|---|---|
| 1. Side cleave | 7 | 3 | 14 | 17 | links to 2 | -4 | fast, safe-ish poke |
| 2. Overhead chop | 10 | 3 | 18 | 20 | ground bounce | -8 | big raised pose, readable |
| 3. Rising launcher | 9 | 4 | 26 | 22 | launches up | -16 | ends the string, punishable on block |
| Air down-chop | 8 | 5 | land lag 12 | 18 | spike | -6 | jump-in |
| Running cleave | 12 | 4 | 22 | 19 | knockback | -12 | closes distance, punishable |

Each startup pose must look different (blade low / overhead / dropped for the rise) so a
player can read what is coming. Damage stays under the 24-per-hit cap.

## Phases

1. **Frame-data overlay** — debug toggle that tints the fighter by phase and shows the
   active hitbox, so tuning is visible.
2. **Move-list format** — optional `moves` on a `WEAPON_SWINGS` entry: per-move frames,
   angle path, ease, damage, knockback, on-block cost. Weapons without it keep the single
   swing. Whole-body acting (lean, crouch, rise), anticipation, smear on the snap, impact
   hold, overshoot and settle.
3. **Axe built end to end** — string + air move, checked in workbench sheets and the browser,
   then played by the user.
4. **Fair recovery** — replace the random 30% whiff stun with fixed per-move recovery and the
   flat `BLOCK_ENDLAG` with each move's on-block value. Balance change: after the axe is played.
5. **Roll out per weapon**, keeping each weapon's swing silhouette unique
   (`docs/weapon-identity-spec.md`).
6. **AI, online, Sovereign** — bots call `attack()` unchanged; online must carry the string
   step; the Sovereign brain likely needs a measured retrain (log it in `docs/sovereign.md`).

## Open decisions

- High/low blocking (lows beat a standing guard): deep but a large guard-system change. Out of
  this pass.

## Progress log

- Nov 22 2026: plan approved (strings, axe first). Implementation started.
- Nov 22 2026: **axe move list built** (`AXE_MOVES` in `js/smb-data-weapons.js`), verdict pending.
  - The string is **2 hits, not 3**. The game already caps basic swings at 2 landed hits per combo
    (`BASIC_CHAIN_MAX`, "SWITCH IT UP") and the 3rd hit of a string is meant to be Q (`STRING_LEN = 3`).
    The axe's Q, Rising Cleave, is already that launcher, so the planned "rising launcher" basic was dropped.
  - Shipped frame data: Side Cleave 7/3 startup/active, dur 16, endlag 8, cooldown 24, 17 dmg, kb 8.
    Overhead Chop 10/3, dur 19, endlag 12, cooldown 44, 20 dmg, kb 12. Falling Chop (air) 8/5, dur 16,
    endlag 8, cooldown 36, 18 dmg, kb 10, spikes airborne targets.
  - Engine: `swingPose()` plays `keys`; `Fighter._swingG()` / `_nextMove()` pick the move; hits only land
    in the active frames (`_swingActiveNow`); the trail and the pixel slash fire on the strike, not the press;
    whole-body keys in `smb-anim-fighter.js` (`_sbMoveTrack`); online sends the move id (`mv`).
  - The string continues on a whiff too (window counted from when the fighter can act again).
  - Measured: `class-balance --mode=weapons --only=axe --matches=8` axe 117-75 before, 122-70 after (noise).
  - Tools: `tools/workbench/shot.js axe --move=0|1|air` for per-frame sheets; `class-balance --no-moves`.
  - Still to do: random whiff stun and flat `BLOCK_ENDLAG` (phase 4), running attack, other weapons.
- Nov 22 2026: **random whiff stun removed** (user call). A whiffed basic melee swing keeps its x2.4
  recovery and now also can't be covered by a guard until that recovery ends (`_whiffGuardLock`,
  checked in `shieldRaise()` and in `dealDamage()` for paths that set `shielding` directly).
  Every whiff costs the same. Not measured across the whole roster yet.
- Nov 22 2026: **sword move list built** (`SWORD_MOVES`), verdict pending. Draw Cut 4/2, dur 10,
  endlag 6, cooldown 22, 14 dmg. Rising Cut 6/3, dur 14, endlag 9, cooldown 44, 15 dmg (low in front,
  cuts up to high, a light anti-air). Wheel Slash (air) 5/4, dur 15, 13 dmg: overhead, through the front
  and on round behind back to ready. Measured vs the field: 66.7% before (one run), 59.9% and 61.5%
  after (two runs, n=192 each). A first try with a 13-dmg cut measured 55.7%, so the cut matches the old 14.
- Nov 22 2026: **axe edge direction fixed** (user report: "the axe is facing the wrong way in some movements").
  The axe art has one edge. A swing whose arm angle rises through the strike (the Side Cleave) led with the
  back of the head. New move field `edgeFlip` turns the weapon over in the hand for that move (drawWeapon)
  and mirrors the edge hitbox with it (`_getMeleeArcPoints`). Rule for new one-edged moves: if the arm angle
  falls during the active frames, set `edgeFlip: true`. Q/E move scenes were not checked for this.
