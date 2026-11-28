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
- **Swing gating (Nov 25 2026 retune):** a non-boss melee press is accepted the moment the previous swing
  and its recovery are over. `Fighter._swingCd(mv)` = move `dur + endlag` (or `WEAPON_SWINGS[key].dur +
  weapon.endlag`), and the swing-end block caps `cooldown` at the actual recovery. Whiffs still cost
  `endlag x 2.4` and lock the guard (`_whiffGuardLock`); a blade that only strikes the floor counts as a
  whiff. Bosses, ranged and `customAttack` weapons keep their own `cooldown`.
- **Input:** a press during recovery is buffered (`INPUT_BUFFER_FRAMES = 10`, `smb-input.js`); pressing
  again just refreshes it. The old mash lock (`ATTACK_MASH_LOCK`) is gone.
- **Strings:** `BASIC_CHAIN_MAX = 4` landed basics (`smb-fighter.js`) and `STRING_LEN = 4`
  (`smb-combat.js`): hits 1-3 push lightly (`STRING_KB`), the 4th launches, and the next press starts a
  new string. There is no SWITCH IT UP refusal any more. `COMBO_SCALE`, the 7+ forced launch and the
  stun handoff still apply.
- **Hit-confirm cancel (Nov 27 2026, stage 2):** a landed string hit 1-3 (not blocked, not the 4th)
  sets `_hitCancelFrom` in `dealDamage()`. For the rest of that swing and its recovery,
  `Fighter._canHitCancel()` lets Q (`ability()`) or E (`useSuper()`) cut it: `_endSwingForCancel()` ends
  the swing and recovery, and for Q holds the target's stun until the Q's contact
  (`botMoveTime + STRING_STUN_PAD`, capped at `HIT_CANCEL_STUN_MAX = 90`). A miss, a block or the 4th
  hit keeps Q and E locked for the whole recovery; a press then is buffered and fires when it ends (its
  10-frame window counts from the end of recovery). The hold skips bosses, True Form and any target
  inside `_stunGuardUntil`. A clash or break closes the cancel.
  Stock bots cancel out of recovery only through `botHitCancel()` (`smb-bot-tactics.js`, hard about
  half their chances, expert most, after hit 2 or 3). Bosses are untouched.
- **Wall combo escape:** fires at `WALL_ESCAPE_HITS = STRING_LEN + 1` hits within 90 frames near a wall,
  so a full 4-hit string lands in the corner. DoT ticks don't count; a Q counts once (keyed on its move
  scene). True Form still warps at 3.
- **Super burst read:** a burst (E while stunned, two presses) into the attacker (`_lastAttacker` or
  `_stunOwner`) guarding inside `BURST_RADIUS` doesn't push them (a guarding bystander isn't pushed either,
  but doesn't read it); the burster still loses the meter and gets `BURST_READ_RECOVERY = 30`
  frames of recovery with no guard (recovery, not stun). Every burst shows a `BURST` damage-text label.
  Bot bursts start at combo 3 (hard 50%, expert 70%).
- **Clash (Nov 27 2026):** two equal-tier melee swings clash only if they start within
  `CLASH_WINDOW = 1` frame (was 3) and the two blades' arc samples come within `CLASH_BLADE_PAD = 14` px
  (`Fighter._clashArcsMeet`). Stock bots no longer start a swing inside a reaction time of the
  opponent's (`_btTooSoon`, `8 - 5*skill` frames, `smb-bot-tactics.js`); answering on the same frame
  was why most exchanges clashed. The clash plays as a bind (`js/smb-clash-bind.js`): blades lock in
  an X for `CLASH_BIND_LOCK = 14` frames, then both are thrown back `CLASH_BIND_DIST = 51` px (1.5 body
  widths) over 12 frames. No damage, no vertical impulse; a third party's hit breaks the bind.
- **Revive (Nov 27 2026):** a fighter with a life left comes back as its own body
  (`js/smb-revive.js`, hooked from `Fighter.respawn()`), not as a second fighter at a spawn point.
  `rise`: the corpse is removed and the fighter gets up where it lay, the dropped weapon flies back
  to the hand, and a flare shoves enemies within 120 px back (velocity only). A slam finisher
  (`slam: true` on the def, or the crater weapon finishers) leaves `_reviveFlat`: the body peels up
  flat and pops back to size. `leap`: a fall below the kill plane, or a move finisher that ends with
  the victim off the stage (`_koFell`), brings the fighter back by jumping in from past the camera
  edge onto the usual safe spawn. A body on a hazard, a disabled boss floor or no platform also
  leaps. Off for online, exploration checkpoints, bosses and the Mega Knight (who keeps his sky drop).

### Ability (Q key)
- Each weapon has a unique `ability(user, target)` function
- `abilityCooldown` in frames; checked before activation
- Every weapon's cooldown is scaled by `ABILITY_CD_MULT = 0.75` (not bosses, not `_abilityCdOverride`)
- Feedback: `abilityFlashTimer` expanding ring at player position

### Super (E key)
- `superMeter` charges from dealing/taking damage at `superChargeRate`
- `activateSuper(target)` triggers class-specific ultimate
- HUD meter fills green → gold when ready

### Move scenes (Q and E as uninterruptible cutscenes, Oct 2026)
- Runtime `js/smb-move-scenes.js` (`MoveScene`), choreography `js/smb-move-scenes-defs.js` (`msDefine('axe:q', …)`). `Fighter.ability()` / `activateSuper()` call `MoveScene.begin(user, 'q'|'e', target, legacyFire)`; the weapon's original effect is passed in and fired on the scene's release frame. No def, or `def.when()` false, means the old instant move runs.
- Not scenes: bosses/TrueForm as performers, online and Public Server matches, admin attack kits, custom weapons, Bomb Q (tap/hold input mechanic), Anchor's self-haul, the Knight class's own Q/E.
- Performer: armored for exactly the scene (`_superArmorUntil`): every hit on it lands, nothing staggers or moves it. It is never invulnerable (until 4.7.2 it was from the moment the move connected, which let long scenes like Katana E walk through supers). Once it connects (`sc.landed`: a victim `lock()`ed or damage dealt) another scene can still hit it but not hold it (`canLock`); before that, being caught by another scene aborts it (meter and cooldown stay spent), input and AI locked (attack/ability/useSuper wrapped, `processInput` skips them), facing locked, position owned by the scene (`free: true` scenes keep the weapon's own footwork, still tethered).
- Catch moves open with a dash or swing that has to connect (`msCatch`): a raised guard takes it as a blocked hit, a parry ends the scene. A clean catch `lock()`s the victim: held by the scene, posed (`MS_VPOSE`), outside hits damage but cannot move them. Bosses, TrueForm, gods, remote players and heavy targets are hit but never held.
- Breaking out: a held victim with a full super meter presses super → `MoveScene.breakOut()` (meter spent, performer staggered `MS_BREAK_STAGGER` and pushed back, victim `MS_BREAK_IFRAMES`; distinct inverted-frame + shatter FX). Bots roll for it by difficulty.
- Ring-outs: every scripted position is clamped to the stage span measured under the performer at scene start, so nothing a scene moves crosses a ledge. Only the release launch leaves the scene; an ability's (Q) launch or knockback within `MS_LEDGE_SOFTEN` px of a ledge is scaled down, a super's (E) is not. Released bodies in the air get their double jump back.
- Each scene hit goes through `dealDamage()` with a fresh `_attackStartFrame` (passes the scene's own hit i-frames) and counts as one combo hit.
- Poses: `_movePose` on the fighter (facing-right canonical angles, see the header of smb-move-scenes.js) replaces the state-driven arm/leg/weapon angles in `Fighter.draw()`; `_msOut` blends back to the normal pose over `MS_BLEND_OUT` frames.
- Dev tool: `node tools/move-scene-sheet.js --moves=axe:q [--edge] [--victim=shield] [--break=12] [--hits]` renders a contact sheet per move and logs damage, hold time and end positions; `--all` runs every def.

### Shield (S/down key)
- Rules live in `smb-combat.js` (`SHIELD_RULES`, `shieldRaise()`, `shieldTick()`); every guard path (processInput, bot AI, Sovereign `_provisionShield`) raises through `shieldRaise()`.
- `'pool'` (default, Oct 2026): `shieldHP` is one meter (`SHIELD_POOL_MAX` 50). Hits on the raised guard drain it; an overflow breaks the guard (overflow damage passes, no refill for `SHIELD_BREAK_DELAY` 120 f). It refills at `SHIELD_REGEN` 0.35/f once the guard has been down `SHIELD_REGEN_DELAY` 30 f. Raising is free.
- Q/E guard break (Oct 18 2026, Q softened Oct 26): the first guarded hit an E owns on each victim shatters the guard (same aftermath as an overflow break) and lands as an unguarded hit. A Q's first guarded hit drains `GUARD_Q_DRAIN` (2.5) x its damage from the pool, at least `GUARD_Q_DRAIN_MIN` (30); if that empties the pool it breaks like an E, otherwise the guard holds and `GUARD_Q_CHIP` (35%) of the damage goes through with no knockback (a grab opener then returns 'blocked' and the grab fails). Later hits of the same move are ordinary guarded hits. Ownership is the move-finisher claim `_msKill` (scene running, or its projectiles within `MS_KILL_TAIL`, until the performer swings again), checked by `msGuardBreakClaim()` in smb-move-scenes.js. A parry still beats it. Moves without a scene (online, Public Server, custom weapons, bosses) don't break guards.
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
