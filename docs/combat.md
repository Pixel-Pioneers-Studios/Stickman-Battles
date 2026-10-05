# Combat — Stickman Battles

## Design Principles

- Game must be difficult. Passive play is punished.
- Bosses always chain attacks; no idle periods.
- No infinite combos or free damage — combo limiter enforced in `dealDamage()`.
- Every special move has a telegraph. Player always has a counterplay window.
- KB scales with damage: heavier hits push further.

---

## dealDamage() — Full Pipeline

**Location:** `smb-particles.js`

**Signature:**
```js
dealDamage(attacker, target, dmg, kbForce, stunMult=1.0, isSplash=false, hitInvincibleFrames=16)
```

**Never bypass this function.** All damage must flow through it for correct multiplier stacking, online sync, and feedback.

### Step 1 — Guard Checks
- `activeCinematic` → return (no damage during cinematics)
- `target.invincible > 0` → return
- `target.health <= 0` → return
- `target.godmode` → return (training mode)
- Attacker and target are allies → return

### Step 2 — Damage Multipliers (applied sequentially)

| Source | Effect |
|--------|--------|
| `attacker.dmgMult` | Per-entity multiplier (Minion = 0.5) |
| Story power level | +2% per chapter (max +200%) |
| `CLASS_AFFINITY[class][weaponType]` | Per-class weapon bonus/penalty |
| Varek (kratos) rage stacks | `1 + stacks × 0.015` (max 30 stacks) |
| Spartan Rage | +30% damage + 10% lifesteal |
| Map perk: power buff | ×1.35 |
| Curse: `curse_weak` | ×0.5 |
| Target: Paladin passive | ×0.85 incoming |
| Armor (helmet -12%, chest -15%, legs -8%) | Max combined -40% |
| Mirror Fracture reflect | 25% back if target is shielding |

### Step 3 — Knockback Scaling
```
actualKb = kbForce × (1 + actualDmg × 0.028)
```
- Curse `curse_fragile`: ×1.5
- Post-teleport crit window (boss): +65% dmg; player: ×2.0 dmg + stun
- Director intensity: small boost when underdog
- Shielding: KB reduced to 15% of normal

### Step 4 — Hit-Stop Assignment

| Damage | Hit-Stop Frames |
|--------|----------------|
| 8–17 | 2–4f |
| 18–29 | 4–7f |
| 30+ | 8–11f |
| Boss cosmic hit (≥20) | 11–14f |
| Boss receiving | 2–4f (shorter for pacing) |

Hit-stop pauses physics via `hitStopFrames` counter in `gameLoop`.

### Step 5 — Screen Feedback
- Camera zoom-in: `camHitZoomTimer` (dmg ≥ 18)
- Screen shake: `4 + dmg/5`, max 18 (respects `settings.screenShake`)
- Red vignette: `hitVignetteTimer` (human player taking ≥ 15 damage)
- Hit-slow: brief `slowMotion` reduction on heavy hits (30+)

### Step 6 — State Application
- `target.health -= actualDmg`
- `target.vx = dir × actualKb`; `target.vy = -actualKb × 0.55`
- `target.invincible = hitInvincibleFrames` (default 16f)
- Stun: if `stunMult > 0` → `target.stunTimer` set proportional to dmg

### Step 7 — Special Cases
- Online: `NetworkManager.sendHit()` broadcasts to all peers
- Killing blow: `triggerFinisher()` if `settings.finishers`
- TrueForm: combo accumulation (`_comboCount`, `_comboDamage`)
- Wall-combo escape: 3+ hits near arena boundary → TrueForm teleports to center
- Anti-ranged tracking: updates TrueForm `_antiRangedStats`

---

## Player Combat

### Basic Attack
- Triggered by attack key; fires `Fighter.attack(target)`
- Melee: sweep arc based on `weapon.range`; arc points via `_getMeleeArcPoints()`
- Ranged: `spawnBullet()` — uses `weapon.damageFunc` if present, else `weapon.damage`
- `swingHitTargets` Set prevents hitting same target twice per swing

### Ability (Q key)
- Each weapon has a unique `ability(user, target)` function
- `abilityCooldown` in frames; checked before activation
- Feedback: `abilityFlashTimer` expanding ring at player position

### Super (E key)
- `superMeter` charges from dealing/taking damage at `superChargeRate`
- `activateSuper(target)` triggers class-specific ultimate
- HUD meter fills green → gold when ready

### Move scenes (Q and E as uninterruptible cutscenes, Oct 2026)
- Runtime `js/smb-move-scenes.js` (`MoveScene`), choreography `js/smb-move-scenes-defs.js` (`msDefine('axe:q', …)`). `Fighter.ability()` / `activateSuper()` call `MoveScene.begin(user, 'q'|'e', target, legacyFire)`; the weapon's original effect is passed in and fired on the scene's release frame. No def, or `def.when()` false, means the old instant move runs.
- Not scenes: bosses/TrueForm as performers, online and Public Server matches, admin attack kits, custom weapons, Bomb Q (tap/hold input mechanic), Anchor's self-haul, the Knight class's own Q/E.
- Performer: armored and invulnerable for exactly the scene (`_superArmorUntil` + `invincible` re-set to 2 each frame, zeroed when the scene clears, and `_hitIframesLetThrough` refuses everyone while `_msScene` is set; no grace before or after), input and AI locked (attack/ability/useSuper wrapped, `processInput` skips them), facing locked, position owned by the scene (`free: true` scenes keep the weapon's own footwork, still tethered).
- Catch moves open with a dash or swing that has to connect (`msCatch`): a raised guard takes it as a blocked hit, a parry ends the scene. A clean catch `lock()`s the victim: held by the scene, posed (`MS_VPOSE`), outside hits damage but cannot move them. Bosses, TrueForm, gods, remote players and heavy targets are hit but never held.
- Breaking out: a held victim with a full super meter presses super → `MoveScene.breakOut()` (meter spent, performer staggered `MS_BREAK_STAGGER` and pushed back, victim `MS_BREAK_IFRAMES`; distinct inverted-frame + shatter FX). Bots roll for it by difficulty.
- Ring-outs: every scripted position is clamped to the stage span measured under the performer at scene start, so nothing a scene moves crosses a ledge. Only the release launch leaves the scene; an ability's (Q) launch or knockback within `MS_LEDGE_SOFTEN` px of a ledge is scaled down, a super's (E) is not. Released bodies in the air get their double jump back.
- Each scene hit goes through `dealDamage()` with a fresh `_attackStartFrame` (passes the scene's own hit i-frames) and counts as one combo hit.
- Poses: `_movePose` on the fighter (facing-right canonical angles, see the header of smb-move-scenes.js) replaces the state-driven arm/leg/weapon angles in `Fighter.draw()`; `_msOut` blends back to the normal pose over `MS_BLEND_OUT` frames.
- Dev tool: `node tools/move-scene-sheet.js --moves=axe:q [--edge] [--victim=shield] [--break=12] [--hits]` renders a contact sheet per move and logs damage, hold time and end positions; `--all` runs every def.

### Shield (S/down key)
- Rules live in `smb-combat.js` (`SHIELD_RULES`, `shieldRaise()`, `shieldTick()`); every guard path (processInput, bot AI, Sovereign `_provisionShield`) raises through `shieldRaise()`.
- `'pool'` (default, Oct 2026): `shieldHP` is one meter (`SHIELD_POOL_MAX` 50). Hits on the raised guard drain it; an overflow breaks the guard (overflow damage passes, no refill for `SHIELD_BREAK_DELAY` 120 f). It refills at `SHIELD_REGEN` 0.35/f once the guard has been down `SHIELD_REGEN_DELAY` 30 f. Raising is free.
- Parry: raised <=8 f before the hit 65%, <=15 f 30%; under `'pool'` only if the guard had been down >= `SHIELD_PARRY_REST` 20 f first.
- Attack out of shield (`'pool'`): `attack()` drops the guard and swings; the key must be released before it re-raises (`_shieldOosLatch`). A blocked melee attacker eats `BLOCK_ENDLAG` (+14 f), so the counter connects.
- `'stacks'` (legacy, kept for A/B): each raise costs a stack — 30/15/5 HP, then 20/50/80% pass-through, 7th raise fails; 3 s recharge reset by every raise.
- Max hold `SHIELD_MAX` 140 f, then the key must be re-pressed. Ground only (shield key in the air = fast fall).

---

## Boss Combat

### Boss Properties

| Stat | Value |
|------|-------|
| Health | 3,000 |
| KB Resistance | 0.5 (half KB received) |
| KB Bonus | 1.5 (1.5× KB dealt) |
| Attack Cooldown Mult | 0.5 (attacks twice as often) |
| Super Charge Rate | 1.7 |
| Draw Scale | 1.5 |
| Stagger threshold | 120 damage in 3 seconds → 2.5s stun |

### Boss Phase System

| Phase | HP Range | Behavior |
|-------|---------|---------|
| 1 | >2,000 | Conservative; melee + occasional beams |
| 2 | 1,000–2,000 | Adds minion spawns; faster beams; platform hazards begin |
| 3 | <1,000 | Desperation; meteor storms; max aggression; shorter cooldowns |

Phase transitions trigger cinematics and dialogue.

### Boss Attacks

| Attack | Range | Cooldown | Telegraph |
|--------|-------|---------|-----------|
| Ground Slam | <130px | 18 ticks | Red circle at player feet; 0.5s warning |
| Gravity Pulse | 80–320px | 28 ticks | Purple glow; player pulled toward impact |
| Meteor Storm | >250px / fleeing | 32 ticks | 5–8 beams (phase 3); warning lines |
| Teleport Behind | >110px, player still | Phase-dependent | Faint silhouette flash |
| Minion Spawn | Any (phase 2+) | 20–36 ticks | Portal animation at spawn point |
| Beam Attacks | Any (phase 2+) | 16–28 ticks | Dashed beam + pulsing floor circle |
| Spike Floor | Any (phase 3+) | 24 ticks | 5 spike warnings before eruption |

### Boss Beams

- Stored in `bossBeams[]` global
- Warning phase (300 frames): dashed purple beam + pulsing circle + countdown text
- Active phase (110 frames): solid beam, 12 damage/frame in 24px radius
- Drawn by `drawBossBeams()` in world-space after platforms
- Boss is immune to its own beam (levitates above hazards)

### Boss Floor Hazard

State machine: `normal (300f) → warning → hazard (900f) → normal`

- `bossFloorType`: `'lava'` or `'void'`
- `bossFloorState` / `bossFloorTimer` globals
- Platforms set `isFloorDisabled = true` during hazard
- Boss levitates: `y = dyY - h - 4`; `vy = Math.min(vy, -10)`

---

## TrueForm Combat

### TrueForm Properties

| Stat | Value |
|------|-------|
| Health | 10,000 |
| KB Resistance | 0.90 (nearly unmoveable) |
| KB Bonus | 0.55 |
| Speed | 4.2 (1.3× normal) |
| Hitbox | 18×50 (smallest in game) |
| Combo Cap | 4 hits or 85% max HP per combo |

### TrueForm Attack Registry (~20 moves, all telegraphed)

| Move | Telegraph Duration | Effect |
|------|--------------------|--------|
| Void Grasp | 4.25s | Immobilizes + deals heavy damage |
| Reality Slash | 1.25s | Fast melee burst |
| Gravity Well | 3.25s | Pulls player; lingering zone |
| Meteor Crash | 5.5s | AoE drop from above |
| Shadow Clones | 5.0s | 3 clones attack simultaneously |
| Chain Slam | 3.5s | Ground chain slam × 3 |
| Phase Shift | 4.5s | Teleport + dimensional hit |
| Reality Tear | 6.5s | Map-wide damage zone |
| Calculated Strike | 3.25s | Counters player's last used move |
| Gamma Ray Beam | 3.0s | Horizontal beam sweep |
| Neutron Star | 4.25s | Gravity center pulls everything |
| Galaxy Sweep | 3.5s | 360° AoE |
| Multiverse Fracture | 4.75s | Multiple simultaneous slashes |
| Supernova | Once at low HP | Whole-arena blast — final desperation |
| Collapse Strike | Desperation mode | Instantly closes distance + stun |
| Reality Override | Dominance mechanic | Reverses last player action |
| Dimension Shift | Instant | 2D → pseudo-3D perspective toggle |

### Adaptive AI Tiers

| Adaptation Level | Tier Unlocked |
|-----------------|--------------|
| 0 | Tier 0 (always available) |
| 25 | Tier 1 |
| 40 | Tier 2 |
| 60 | Tier 3 |
| 75 | Tier 4 |
| 90 | Tier 5 (full moveset) |

Phase (HP%) also unlocks tiers as a fallback for new players.

---

## Hit Detection

### Melee
- `_getMeleeArcPoints()` generates N points along the weapon arc
- Each point checked against target AABB each frame during attack animation
- `swingHitTargets` Set prevents multi-hit in a single swing

### Ranged
- `Projectile` objects: updated each frame via `updateProjectiles()`
- Collision: check projectile AABB against each entity AABB
- Projectile removed on first hit (default); some weapons pierce or bounce

### Hitbox Visualization
- `smb-attacktest.js` provides frame-by-frame hitbox display tool
- Activated from dev console or F1 panel

---

## Combat Balancing Rules

- **No free damage:** Every attack has endlag. Spamming creates punish windows.
- **No infinite combos:** Combo limiter (`_comboCount` max 4, `_comboDamage` cap 85% maxHP) in `dealDamage()`.
- **Ranged weapons:** Spread increases with `_rangedShotHeat`; movement penalty while firing; reload interrupts.
- **TrueForm deflect:** ~5% chance to reflect projectiles (per `CLAUDE.md` ranged rules).
- **Shield:** Never makes a fighter invincible — always takes 8% damage. Spamming blocked by `shieldCooldown`.
- **KB scaling:** Heavier hits travel further, creating natural spacing. Prevents corner-lock.
- **One combo at a time:** Whoever stuns a fighter owns that stun. Hits from anyone else still deal damage and knockback but cannot re-stun until the owner's stun ends plus `STUN_HANDOFF_FREE` (24) frames (`_stunOwner` / `_stunOwnerUntil` in `dealDamage()`). Bosses and TrueForm neither trigger nor receive it. Measured with an idle player against 3 expert bots: stunned 77% of frames before, 59% after (1v1 against one expert bot is ~62%).
- **Combo scaling:** Within one combo (the attacker's `_comboHitCount`, 45-frame window; a move scene counts as one hit), hit 2 deals 90%, hit 3 75%, hit 4 60%, hit 5+ 50% (`COMBO_SCALE`). Supers never drop below 70% (`COMBO_SCALE_SUPER_MIN`). DoT ticks are not scaled. An ability that lands as a follow-up leaves at most `COMBO_ABILITY_STUN` (24) frames of stun or ragdoll, so the swings after it are not guaranteed. Why: swing, swing, Q, swing, swing took 55-70% of a health bar from one opening. Expert-bot soak: multi-hit openings averaged 43 damage before and 34 after, and the largest opening fell from 139 to 48.
- **Per-weapon move multipliers:** `WEAPONS[k].abilityDmgMult` / `superDmgMult` scale every hit of that weapon's Q / E inside `dealDamage()`. A hit counts as the super while `superActive` or the attacker's `_attackKindTier` is SUPER; a projectile carries the tier of the action that fired it (`Projectile._moveTier` -> `_moveTierOverride`), so a shot still counts as the ability after the owner has gone back to basic fire. Tuned Oct 2026 with `node tools/sov-balance.js --mode=weapons --all`, which reports damage per use split by basic/Q/E.
