# Weapon Identity Spec

Design contract for the weapons rework (June 2026). Goal: every weapon must be
recognizable from its **swing silhouette and trail alone** — no two weapons share
an attack animation.

## How it works

All melee identity flows from one table: `WEAPON_SWINGS` in `js/smb-data-weapons.js`.
Each entry defines the swing's **angle path** (`a0 → a1`, radians, facing-right,
auto-mirrored), **easing curve** (windup/snap character), **duration** (frames),
optional **reach curve** (for thrusts/jabs — tip distance animates instead of angle),
**grip tilt** (weapon rotation while attacking), and **trail tuning** (life/cap/width).

Consumers (all fall back to the legacy 12-frame diagonal slash if no entry exists):
- `Fighter.getWeaponTipPos()` / `_getMeleeArcPoints()` — hitbox follows the real motion
- `Fighter.draw()` arm pose — the visible swing
- `Fighter.drawWeapon()` — grip tilt + swing-trail recording
- `Fighter.attack()` — sets per-weapon `attackDuration`

Because the trail ribbon samples the weapon tip every frame, **trail shape emerges
from motion**: a thrust leaves a straight streak, an overhead smash a vertical
crescent, a sweep a huge arc. No separate trail-shape system needed.

## Easing vocabulary

| Ease | Character | Used by |
|------|-----------|---------|
| `snap` | brief wind-back, then whips through (anime slash) | sword, axe, whip, electricstaff |
| `iai` | long stillness (~45%), then near-instant cut | katana |
| `heavy` | slow rising windup, accelerating drop — commitment | hammer, fryingpan, flail |
| `sweep` | smooth ease-in-out full-body arc | scythe |
| `thrust` | pierce out fast, hold at full extension, partial retract | spear, broomstick |
| `jab` | out-and-back punch | boxinggloves, shield |
| `crack` | accelerating lash with overshoot wobble at the tip | whip (reach) |
| `recoil` | fast settle from kicked-up pose | ranged weapons |

## Identity cards — melee

| Weapon | Archetype | Swing identity | Frames | Trail |
|--------|-----------|----------------|--------|-------|
| Sword | slash | Crisp diagonal slash, slight wind-back then snap. The baseline everything else contrasts against. | 11 | medium ribbon |
| Katana | iai | Blade barely moves for the first half, then the cut is already over. Thin, long-lived white-blue afterglow. | 9 | thin, lingers |
| Hammer | smash | Raised overhead almost behind the head, hangs there, then drops like a piston. Can't hit during windup — pure commitment. | 19 | wide, heavy |
| Frying Pan | smash | Quicker, shallower overhead bonk than hammer. Comedy violence. | 15 | wide |
| Axe | cleave | Widest single horizontal cut — shoulder-to-hip cleave with snap. | 14 | wide ribbon |
| Scythe | sweep | Huge smooth 180° reap, slow-in slow-out. The whole silhouette rotates. | 16 | long crescent |
| Spear | thrust | No arc at all. Arm + spear extend forward on a straight line, hold, retract. Hitbox is a piercing line. | 12 | straight streak |
| Broomstick | poke | Faster, lighter thrust with a slight downward flick at the end. | 10 | short streak |
| Whip | crack | Lash accelerates out with overshoot wobble at full extension — tip "cracks". Longest melee reach. | 13 | thin, snaking |
| Boxing Gloves | jab | Straight out-and-back punch. **Alternates high jab / body hook each attack** (`alternate: true`). Fastest swing in the game. | 7 | short stub |
| Flail | whirl | Enormous wind-back (ball swings behind the body) then heavy release through a full arc. Slowest, scariest silhouette. | 20 | long heavy ribbon |
| Shield | bash | Flat forward shove, no trail (it's a wall, not a blade). | 10 | none |
| Electric Staff | strike | Two-handed snap strike, slightly longer arc than sword, crackling cyan trail. | 13 | medium, bright |

Boss-only (`gauntlet`, `mkgauntlet`) keep their existing special-cased animations
(Megaknight uppercut arc is preserved in the Fighter code paths).

## Identity cards — ranged (pose only)

Ranged weapons don't swing — but pre-rework they played the same melee swing
animation when firing, which is why guns looked goofy. Each now has a firing pose
arc (recoil settle) and `tilt: 0` so the weapon stays level:

| Weapon | Firing pose |
|--------|-------------|
| Gun | barrel kicks up on fire, settles level fast |
| Pea Shooter | minimal kick — it's a toy |
| Bow | steady level aim, no kick |
| Slingshot | drawn back low, releases to level |
| Paper Airplane | overhand throw — arm sweeps from raised to forward |
| Boomerang | sidearm throw — wide flat sweep |
| Flamethrower | slight downward hose sweep |

## Future layers (not yet implemented)

1. **Per-weapon hit feedback** — distinct hit sounds + hit-spark shapes per archetype
   (smash = dust ring, thrust = pierce flash, crack = white snap line).
2. **Per-weapon idle/run carry poses** — spear shouldered, hammer dragged, gloves up.
3. **Balance pass** — re-tune damage/endlag against the new commit profiles using
   the stats-logging + heatmap data (heavy weapons now have real windup, may need
   damage compensation).
4. **Cinematics primitives upgrade** (parallel track) — impact frames, speed-ramp
   curves, smash zoom / whip-pan in CinFX/CinCam so all 30+ cinematics inherit it.

## Rules

- New weapons MUST add a `WEAPON_SWINGS` entry — falling back to the legacy slash
  is a bug, not a feature, for player-facing weapons.
- Hitbox and visual must come from the same `swingPose()` call — never re-derive
  the angle independently.
- Keep `dur` ≤ `cooldown` and remember whiff endlag triggers when `attackTimer`
  hits 0 — longer `dur` means later endlag, not less.
