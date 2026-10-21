'use strict';
// smb-combat.js: dealDamage pipeline, damage helpers, handleSplash
// Depends on: smb-globals.js, smb-achievements.js, smb-data-weapons.js (WEAPON_KEYS)
'use strict';

function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lerp(a, b, t)   { return a + (b - a) * t; }
function clamp(v, mn, mx){ return Math.max(mn, Math.min(mx, v)); }
function dist(a, b)      { return Math.hypot(a.cx() - b.cx(), (a.y + a.h/2) - (b.y + b.h/2)); }

// Entity culling uses world bounds. GAME_W is the viewport and only fits 900px arenas.
// Mirrors the fighter clamp in Fighter.update().
function worldLeftBound() {
  if (typeof currentArena === 'undefined' || !currentArena || !currentArena.worldWidth) return 0;
  return currentArena.mapLeft !== undefined
    ? currentArena.mapLeft
    : -(currentArena.worldWidth - GAME_W) / 2;
}
function worldRightBound() {
  if (typeof currentArena === 'undefined' || !currentArena || !currentArena.worldWidth) return GAME_W;
  return currentArena.mapRight !== undefined
    ? currentArena.mapRight
    : (currentArena.worldWidth + GAME_W) / 2;
}
// Viewport edges in world coords, for effects that enter from off-screen.
function viewLeftEdge()  {
  const c = (typeof camXCur !== 'undefined' && isFinite(camXCur)) ? camXCur : GAME_W / 2;
  return c - GAME_W / 2;
}
function viewRightEdge() {
  const c = (typeof camXCur !== 'undefined' && isFinite(camXCur)) ? camXCur : GAME_W / 2;
  return c + GAME_W / 2;
}

function areAlliedEntities(a, b) {
  if (!a || !b || a === b) return false;
  if (a._teamId !== undefined && b._teamId !== undefined) return a._teamId === b._teamId;
  if (a.storyFaction && b.storyFaction) return a.storyFaction === b.storyFaction;
  return false;
}

// Filter ability hit loops with this before contact logic. dealDamage() rejects
// allies, but only after an orb has already been consumed on them.
function isHostileTarget(self, f) {
  if (!f || f === self || f.health <= 0) return false;
  if (areAlliedEntities(self, f)) return false;
  return !_isCoopTeammate(self, f);
}

// Co-op players never hurt each other, even without a _teamId.
function _isCoopTeammate(a, b) {
  if (a.isBoss || b.isBoss || a.isMinion || b.isMinion || a.isDummy || b.isDummy) return false;
  if (typeof players === 'undefined' || !players.includes(a) || !players.includes(b)) return false;
  const _mode = typeof gameMode !== 'undefined' ? gameMode : '';
  const _mgT  = typeof minigameType !== 'undefined' ? minigameType : '';
  if (_mode === 'minigames' && _mgT === 'survival' &&
      typeof survivalFriendlyFire !== 'undefined' && survivalFriendlyFire) return false;
  if (_mode === 'boss') return true;
  if (_mode === 'minigames' && !a.isAI && !b.isAI) return true;
  return false;
}

// Runs after the affinity multiplier.
function applyClassWeaponInteraction(attacker, target, dmg) {
  // Modifiers live in smb-weapons-ext.js.
  if (typeof wxDamageMods === 'function') return wxDamageMods(attacker, target, dmg);
  return dmg;
}

// Weapon-specific hit particles. Called from dealDamage() on unshielded, non-boss hits.
function _spawnWeaponHitFX(attacker, target, dmg) {
  if (!settings.particles) return;
  const tx = target.cx(), ty = target.cy();
  const wk = attacker && attacker.weaponKey ? attacker.weaponKey : null;
  const heavy = dmg >= 22;
  // Spray runs attacker to target. Falls back to facing when they overlap.
  let _fxdx = target.cx() - (attacker ? attacker.cx() : target.cx());
  let _fxdy = target.cy() - (attacker ? attacker.cy() : target.cy());
  if (Math.abs(_fxdx) < 0.01 && Math.abs(_fxdy) < 0.01) { _fxdx = (attacker && attacker.facing) || 1; _fxdy = 0; }
  const _fxlen = Math.hypot(_fxdx, _fxdy) || 1;
  _fxdx /= _fxlen; _fxdy /= _fxlen;
  // Sprays run along the hit. spawnRing stays radial.
  const sp = (x, y, color, count, spread) =>
    (typeof spawnParticlesDir === 'function'
      ? spawnParticlesDir(x, y, color, count, _fxdx, _fxdy, spread)
      : spawnParticles(x, y, color, count));
  switch (wk) {
    case 'sword':
      sp(tx, ty, '#d4eeff', heavy ? 14 : 8);
      sp(tx, ty, '#ffffff', heavy ? 8 : 4);
      if (heavy) sp(tx, ty, '#88ccff', 6);
      break;
    case 'hammer':
      sp(tx, ty, '#cc5500', heavy ? 16 : 10);
      sp(tx, ty, '#ffaa44', heavy ? 10 : 5);
      sp(tx, target.y + target.h - 4, '#887766', heavy ? 10 : 5);
      if (heavy) spawnRing(tx, target.y + target.h - 4);
      break;
    case 'axe':
      sp(tx, ty, '#ff4400', heavy ? 14 : 9);
      sp(tx, ty, '#cc2200', heavy ? 8 : 4);
      break;
    case 'scythe':
      sp(tx, ty, '#9900cc', heavy ? 14 : 8);
      sp(tx, ty, '#440066', heavy ? 8 : 5);
      if (heavy) sp(tx, ty, '#cc88ff', 6);
      break;
    case 'spear': {
      const _spDir = attacker.facing || 1;
      sp(tx, ty, '#00ccbb', heavy ? 10 : 6);
      sp(tx + _spDir * 10, ty, '#ffffff', heavy ? 6 : 3);
      sp(tx + _spDir * 20, ty, '#aaffee', heavy ? 4 : 2);
      break;
    }
    case 'fryingpan':
      sp(tx, ty, '#ffdd00', heavy ? 16 : 10);
      sp(tx, ty, '#ffffff', heavy ? 10 : 5);
      if (heavy) spawnRing(tx, ty);
      break;
    case 'broomstick': {
      const _bsDir = attacker.facing || 1;
      sp(tx, ty, '#cc44ff', heavy ? 10 : 6);
      sp(tx + _bsDir * 12, ty, '#ffee44', heavy ? 6 : 3);
      break;
    }
    case 'katana':
      sp(tx, ty, '#ffffff', heavy ? 8 : 5);
      sp(tx, ty, '#aaaadd', heavy ? 5 : 3);
      break;
    case 'whip': {
      // Crack at the weapon tip, not the target center.
      const _wt = attacker._weaponTip;
      const _wx = _wt ? clamp(_wt.x, target.x, target.x + target.w) : tx;
      const _wy = _wt ? clamp(_wt.y, target.y, target.y + target.h) : ty;
      sp(_wx, _wy, '#ffffff', heavy ? 10 : 7);
      sp(_wx, _wy, '#ffcc88', heavy ? 6 : 3);
      break;
    }
    case 'flail':
      sp(tx, ty, '#bbbbbb', heavy ? 14 : 9);
      sp(tx, ty, '#777788', heavy ? 8 : 4);
      if (heavy) sp(tx, ty, '#ffffff', 6);
      break;
    case 'electricstaff':
      sp(tx, ty, '#00eeff', heavy ? 14 : 9);
      sp(tx, ty, '#ffffff', heavy ? 7 : 4);
      break;
    case 'combat':
      sp(tx, ty, (attacker && attacker.color) || '#ff2233', heavy ? 18 : 10);
      sp(tx, ty, '#ffffff', heavy ? 10 : 5);
      break;
    case 'shield':
      sp(tx, ty, '#4488ff', heavy ? 12 : 7);
      sp(tx, ty, '#ffdd88', heavy ? 8 : 4);
      break;
    case 'gun': case 'peashooter': case 'slingshot': case 'bow': case 'paperairplane':
      // Projectile spawns its own particles on hit.
      sp(tx, ty, target.color, 8);
      break;
    default:
      sp(tx, ty, target.color, 12);
      if (heavy) {
        sp(tx, ty, '#ffffff', 8);
        sp(tx, ty, dmg >= 34 ? '#ff8844' : '#ffee88', dmg >= 34 ? 12 : 7);
      }
      break;
  }
}

// Walls a fighter can be pinned against. Story arena locks win over map edges.
function _wallBounds() {
  if (typeof exploreArenaLock !== 'undefined' && exploreArenaLock) {
    return { left: exploreArenaLock.left, right: exploreArenaLock.right };
  }
  if (typeof currentArena !== 'undefined' && currentArena &&
      currentArena.mapLeft != null && currentArena.mapRight != null) {
    return { left: currentArena.mapLeft, right: currentArena.mapRight };
  }
  return { left: 0, right: GAME_W };
}

// Route upward launches through here, not .vy writes. The anti-juggle guards only
// see horizontal impulse. Repeats decay toward a floor so the target always lands.
function applyLaunch(attacker, target, launchVy, opts) {
  if (!target || target.health <= 0) return 0;
  if (!(launchVy < 0)) return 0; // upward launches only (negative vy)
  // Super armor can't be moved; dealDamage already zeroes its knockback.
  if (typeof frameCount !== 'undefined' && (target._superArmorUntil || -1) >= frameCount) return 0;
  const _o = opts || {};

  let vy = launchVy;
  if (target.kbResist) vy *= target.kbResist;

  if (typeof frameCount !== 'undefined') {
    // Wider than the 45-frame combo window: a ~75-frame re-launch cadence would
    // otherwise reset the combo counter between hits.
    const _WINDOW = 130;
    // not ||, frameCount can be 0
    const _lastF = (target._launchLastFrame == null) ? -9999 : target._launchLastFrame;
    if (frameCount - _lastF > _WINDOW) target._launchCount = 0;
    target._launchCount     = (target._launchCount || 0) + 1;
    target._launchLastFrame = frameCount;

    const _n = target._launchCount;
    if (_n > 1) {
      // 1.0, 0.66, 0.44, 0.29, floor 0.22
      vy *= Math.max(0.22, Math.pow(0.66, _n - 1));
    }

    // AoE overlaps in one frame don't stack.
    if (target._launchAppliedFrame === frameCount) vy *= 0.4;
    else target._launchAppliedFrame = frameCount;
  }

  // Airborne re-launch guard. A hit can't keep an airborne target airborne.
  if (!target.onGround && !_o.ignoreAirGuard) {
    const _n2 = target._launchCount || 1;
    if (_n2 >= 2) {
      // Shrinks with each re-hit and never exceeds current upward speed.
      const _ceil = -6 - Math.max(0, 10 - _n2 * 3);
      vy = Math.max(vy, _ceil);
      if (target.vy < 0) vy = Math.max(vy, target.vy * 0.85);
    }
  }

  vy = Math.round(vy * 100) / 100;
  target.vy = Math.min(target.vy, vy);
  if (typeof trainingMode !== 'undefined' && trainingMode &&
      typeof _tlabRecordLaunch === 'function') {
    _tlabRecordLaunch(target, launchVy, vy, target._launchCount || 1);
  }
  return vy;
}

// Combo strings: early basic hits push and stun lightly. The last one launches.
const STRING_LEN      = 3;    // the hit that launches
const STRING_KB       = 0.2;  // knockback multiplier on the hits before it
const STRING_STUN_PAD = 10;   // slack past the next swing's contact for late human presses

// Frame-counted setTimeout for combat code. Ticked from gameLoop, so it freezes with pause and hitstop.
const _combatTimers = [];
function combatAfter(frames, fn) {
  _combatTimers.push({ t: Math.max(0, frames), fn });
}
function tickCombatTimers() {
  if (!_combatTimers.length) return;
  if (typeof gameRunning !== 'undefined' && !gameRunning) { _combatTimers.length = 0; return; }
  const step = (typeof slowMotion === 'number' && slowMotion > 0 && slowMotion < 1) ? slowMotion : 1;
  const due = [];
  for (let i = _combatTimers.length - 1; i >= 0; i--) {
    const c = _combatTimers[i];
    c.t -= step;
    if (c.t <= 0) { due.push(c); _combatTimers.splice(i, 1); }
  }
  for (let i = due.length - 1; i >= 0; i--) {
    try { due[i].fn(); } catch (e) { console.warn('[combatAfter]', e); }
  }
}

// One stun owner at a time. A second attacker can push you but can't re-stun until
// the owner's stun ends plus STUN_HANDOFF_FREE frames.
const STUN_HANDOFF_FREE = 24;

// Combo scaling by hit number (index = hit, last entry repeats).
// Supers keep at least COMBO_SCALE_SUPER_MIN so they still kill.
// An ability as a follow-up leaves at most COMBO_ABILITY_STUN frames of stun.
const COMBO_SCALE           = [1, 1, 0.9, 0.75, 0.6, 0.5];
// Set by Projectile.update() during its hits. null = use the attacker's current action.
let _moveTierOverride = null;
// Set around super damage that lands after its animation ends. Pays no meter.
let _hitFromSuper = false;
const COMBO_SCALE_SUPER_MIN = 0.7;
const COMBO_ABILITY_STUN    = 24;

// Varek rage: +1% damage per hit taken this life, max +20%.
const KRATOS_RAGE_MAX = 20;
const KRATOS_RAGE_PER = 0.01;

// Hit i-frames block the same attacker only until they start a new action.
// Spawn, super and finisher invincibility are never bypassed.
function _hitIframesLetThrough(attacker, target) {
  if (!attacker || target._hitIframeBy !== attacker || typeof frameCount === 'undefined') return false;
  if (target._msScene && target._msScene.landed) return false; // move scene performers are invulnerable once they connect
  if (attacker._attackStartFrame == null || attacker._attackStartFrame === target._hitIframeAct) return false;
  return target.invincible <= (target._hitIframeUntil || 0) - frameCount + 1;
}

// Recovery a melee swing eats when a shield stops it.
const BLOCK_ENDLAG = 14;

// Meter per landed hit on God / Absolute Axiom.
const GOD_FIGHT_SUPER_GAIN = 6;

// 'pool': one guard meter. 'stacks': old ladder, kept for shieldtest.js A/B runs.
var SHIELD_RULES = 'pool';
const SHIELD_POOL_MAX    = 50;   // ~3 sword/axe/hammer hits
const SHIELD_REGEN       = 0.35; // per frame while down (empty to full in ~2.4 s)
const SHIELD_REGEN_DELAY = 30;   // frames down before refill starts
const SHIELD_BREAK_DELAY = 120;  // a broken guard waits 2 s before refilling
const SHIELD_PARRY_REST  = 20;   // frames the guard must be down before a parry counts

// Called on the raising edge by every guard path. false = refused.
function shieldRaise(f) {
  // Guard-break moves stamp shieldCooldown on the victim. Refuse raises until it ticks out.
  if (!f.shielding && (f.shieldCooldown || 0) > 0) return false;
  if (SHIELD_RULES === 'pool') {
    if ((f.shieldHP || 0) < 1) return false;
    f.shieldStacks = 1;   // keeps dealDamage on the HP-absorb path
    f._parryFresh  = (f._shieldDownFrames || 0) >= SHIELD_PARRY_REST;
    f._shieldDownFrames = 0;
    return true;
  }
  const stacks = (f.shieldStacks || 0) + 1;
  f.shieldStacks        = stacks;
  f.shieldRechargeTimer = 180; // 3 s recharge window; resets on every deployment
  if (stacks <= 3) f.shieldHP = [30, 15, 5][stacks - 1];
  return stacks <= 6;          // stack 7+: shield fails
}

// Once per frame from Fighter.update().
function shieldTick(f) {
  if (SHIELD_RULES === 'pool') {
    if (f.shielding) { f._shieldDownFrames = 0; return; }
    f._shieldDownFrames = (f._shieldDownFrames || 0) + 1;
    if (f._shieldRegenWait > 0) { f._shieldRegenWait--; return; }
    if (f._shieldDownFrames > SHIELD_REGEN_DELAY && (f.shieldHP || 0) < SHIELD_POOL_MAX)
      f.shieldHP = Math.min(SHIELD_POOL_MAX, (f.shieldHP || 0) + SHIELD_REGEN);
    return;
  }
  if (f.shieldRechargeTimer > 0) {
    f.shieldRechargeTimer--;
    if (f.shieldRechargeTimer === 0) { f.shieldStacks = 0; f.shieldHP = 0; }
  }
}

// SHIELD_AIR: guard can be raised in the air (not during landing lag). Air blocks drain faster.
// GUARD_BURST: after GUARD_BURST_HITS hits in one stun, a fresh press ends the stun
// and raises the guard for GUARD_BURST_COST. Ragdolls can't burst.
var SHIELD_AIR  = true;
var GUARD_BURST = true;
const AIR_GUARD_DRAIN  = 1.5;
const GUARD_BURST_HITS = 2;
const GUARD_BURST_COST = 20;

function guardBurstReady(f) {
  return GUARD_BURST && SHIELD_RULES === 'pool' && !!f && !f.isBoss &&
         f.stunTimer > 0 && !(f.ragdollTimer > 0) && f.health > 0 &&
         (f._stunStreak || 0) >= GUARD_BURST_HITS &&
         (f.shieldHP || 0) >= GUARD_BURST_COST && !f._brShieldTimer &&
         !(f._landLag > 0) && (f.onGround || SHIELD_AIR);
}

// Returns true if the burst happened.
function guardBurst(f) {
  if (!guardBurstReady(f)) return false;
  f.stunTimer        = 0;
  f._stunStreak      = 0;
  f.shieldHP        -= GUARD_BURST_COST;
  f.shieldStacks     = 1;
  f.shielding        = true;
  f.shieldHoldTimer  = 1;
  f.shieldBroken     = false;
  f._parryFresh      = false;
  f._shieldDownFrames = 0;
  f._guardBurstCount = (f._guardBurstCount || 0) + 1;
  if (typeof frameCount !== 'undefined') f._lockUntil = -9999;
  spawnParticles(f.cx(), f.cy(), '#88ddff', 16);
  spawnParticles(f.cx(), f.cy(), '#ffffff', 8);
  if (settings.dmgNumbers)
    damageTexts.push(new DamageText(f.cx(), f.y - 38, 'GUARD!', '#88ddff'));
  SoundManager.clang && SoundManager.clang();
  return true;
}

// Remote hit packets: the attacker's client already applied its multipliers.
let _netInboundHit = null;

const SCYTHE_LIFESTEAL = 0.1;

function dealDamage(attacker, target, dmg, kbForce, stunMult = 1.0, isSplash = false, hitInvincibleFrames = 16, isDot = false) {
  // Consume here so nested calls (reflect, splash) don't inherit it.
  const _inbound = _netInboundHit; _netInboundHit = null;
  if (activeCinematic) return; // no damage during cinematic pauses
  if (!target || target.health <= 0) return;
  if (target.invincible > 0 && !_hitIframesLetThrough(attacker, target) &&
      !(isDot && typeof frameCount !== 'undefined' && target.invincible <= (target._hitIframeUntil || 0) - frameCount + 1)) return;
  if (target.godmode) return; // no hitbox, all damage blocked
  // Environmental hits (no attacker) can stack within a frame, up to MAX_ENV_DAMAGE total.
  if (!attacker && typeof frameCount !== 'undefined') {
    if (target._envDamageFrame !== frameCount) {
      target._envDamageFrame = frameCount;
      target._envDamageAccum = 0;
    }
    const MAX_ENV_DAMAGE = 14;
    if (target._envDamageAccum >= MAX_ENV_DAMAGE) return;
    const _allowed = Math.min(dmg, MAX_ENV_DAMAGE - target._envDamageAccum);
    target._envDamageAccum += _allowed;
    dmg = _allowed;
  }
  if (target._guiAttackImmune) return; // GUI-triggered attacks never damage the triggering player
  if (attacker && areAlliedEntities(attacker, target)) return;
  // God phase 1 melee range gate. Phase 2 specials are ranged on purpose.
  if (attacker && attacker.isGod && attacker._phase === 1 && target) {
    const _gd = Math.hypot(
      target.cx() - attacker.cx(),
      (target.y + (target.h || 0) / 2) - (attacker.y + (attacker.h || 0) / 2)
    );
    if (_gd > 160) return;
  }
  // A boss mid-portal is hidden offstage but its old hazards keep ticking. Drop that damage.
  if (attacker && attacker.backstageHiding && target && !target.isBoss) return;
  // TF opening fight is scripted, so TrueForm can't hurt players.
  if (typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive &&
      attacker && attacker.isTrueForm && target && !target.isBoss) return;
  // Paradox lock: players do 0 damage to TrueForm.
  if (typeof tfDamageLocked !== 'undefined' && tfDamageLocked &&
      target && target.isTrueForm && attacker && !attacker.isBoss) {
    if (settings.dmgNumbers) damageTexts.push(new DamageText(target.cx(), target.y - 20, 0, '#445566'));
    return;
  }
  // Depth phase: attacker and target must share a z layer. Misses show a grey "~".
  if (typeof tfDepthPhaseActive !== 'undefined' && tfDepthPhaseActive && attacker &&
      Math.abs((attacker.z || 0) - (target.z || 0)) >= 0.4) {
    if (settings.dmgNumbers)
      damageTexts.push(new DamageText(target.cx(), target.y - 20, '~', '#556677'));
    return;
  }
  // Combat Q counter: absorb the hit, teleport behind the attacker next frame.
  // Bosses are countered too.
  if (!isDot && target._counterStance > 0 && attacker && attacker !== target) {
    target._counterStance    = 0;
    target._counterAttacker  = attacker;
    spawnParticles(target.cx(), target.cy(), '#ff4444', 14);
    spawnParticles(target.cx(), target.cy(), '#ffffff', 8);
    if (settings.dmgNumbers)
      damageTexts.push(new DamageText(target.cx(), target.y - 38, 'COUNTER!', '#ff4444'));
    screenShake = Math.max(screenShake, 8);
    return;
  }
  const _origDmg = dmg; // pre-multiplier value used for the stacking cap below
  let actualDmg = (attacker && attacker.dmgMult !== undefined) ? Math.max(1, Math.round(dmg * attacker.dmgMult)) : dmg;
  // abilityDmgMult / superDmgMult (smb-data-weapons.js) apply to every hit of that move.
  if (attacker && attacker.weapon && !isDot) {
    const _mvTier = _moveTierOverride !== null ? _moveTierOverride
                  : (attacker.superActive || attacker._attackKindTier === CLASH_TIER_SUPER) ? CLASH_TIER_SUPER
                  : attacker._attackKindTier;
    const _mvMult = _mvTier === CLASH_TIER_SUPER   ? attacker.weapon.superDmgMult
                  : _mvTier === CLASH_TIER_ABILITY ? attacker.weapon.abilityDmgMult : undefined;
    if (_mvMult !== undefined && _mvMult !== 1) actualDmg = Math.max(1, Math.round(actualDmg * _mvMult));
  }
  // Story power: +2% damage per cleared chapter, capped at +200%. Humans only.
  if (storyModeActive && attacker && !attacker.isAI && !attacker.isBoss &&
      typeof playerPowerLevel !== 'undefined' && playerPowerLevel > 1.0) {
    actualDmg = Math.max(1, Math.round(actualDmg * (1 + (playerPowerLevel - 1.0) * 0.15)));
  }
  // Class vs weapon affinity.
  if (attacker && attacker.charClass && attacker.weapon && typeof CLASS_AFFINITY !== 'undefined') {
    const aff = CLASS_AFFINITY[attacker.charClass];
    if (aff) {
      const mult = aff[attacker.weapon.weaponType] || 1.0;
      actualDmg = Math.max(1, Math.round(actualDmg * mult));
    }
  }
  actualDmg = applyClassWeaponInteraction(attacker, target, actualDmg);
  // Paradox manifestation: the player hits 15% lighter while it stands.
  if (attacker && attacker._pdxManifestHold) {
    actualDmg = Math.max(1, Math.round(actualDmg * 0.85));
  }
  // Server-tunable player damage scale (humans only).
  if (window.LiveOps && attacker && !attacker.isAI && !attacker.isBoss) {
    const _pdm = LiveOps.getBalance('playerDamageMult', 1);
    if (_pdm !== 1) actualDmg = Math.max(1, Math.round(actualDmg * _pdm));
  }
  // Varek rage stacks reset on respawn (see Fighter.respawn).
  if (attacker && attacker.charClass === 'kratos' && attacker.rageStacks > 0) {
    actualDmg = Math.round(actualDmg * (1 + Math.min(attacker.rageStacks, KRATOS_RAGE_MAX) * KRATOS_RAGE_PER));
  }
  // Warborn Fury: +30% damage, heals 5% of damage dealt.
  if (attacker && attacker.spartanRageTimer > 0) {
    actualDmg = Math.round(actualDmg * 1.3);
    // heal accumulates as a float, applied in whole HP
    attacker._spartanRageHealPool = (attacker._spartanRageHealPool || 0) + actualDmg * 0.05;
    const healNow = Math.floor(attacker._spartanRageHealPool);
    if (healNow >= 1) {
      attacker._spartanRageHealPool -= healNow;
      attacker.health = Math.min(attacker.maxHealth, attacker.health + healNow);
      if (settings.dmgNumbers)
        damageTexts.push(new DamageText(attacker.cx(), attacker.y - 20, healNow, '#44ff44'));
    }
  }
  if (attacker && attacker._powerBuff > 0) actualDmg = Math.round(actualDmg * 1.35);
  // curse_weak: attacker deals half damage
  if (attacker && attacker.curses && attacker.curses.some(c => c.type === 'curse_weak'))
    actualDmg = Math.max(1, Math.round(actualDmg * 0.5));
  // Online: the attacker's client did the scaling above, the victim's client does the rest.
  if (_inbound) actualDmg = _inbound.dmg;
  const _netPreTargetDmg = actualDmg;
  // Paladin: 15% incoming reduction.
  if (target && target.charClass === 'paladin')
    actualDmg = Math.max(1, Math.floor(actualDmg * 0.85));
  if (target && typeof target.damageReductionMult === 'number')
    actualDmg = Math.max(1, Math.floor(actualDmg * clamp(target.damageReductionMult, 0.05, 1)));
  // Per-piece armor reduction, capped at 40%.
  if (target && target.armorPieces && target.armorPieces.length > 0) {
    let armorReduction = 0;
    if (target.armorPieces.includes('helmet'))     armorReduction += 0.12;
    if (target.armorPieces.includes('chestplate')) armorReduction += 0.15;
    if (target.armorPieces.includes('leggings'))   armorReduction += 0.08;
    armorReduction = Math.min(0.40, armorReduction);
    actualDmg = Math.max(1, Math.floor(actualDmg * (1 - armorReduction)));
  }
  if (target && typeof target._damageTakenMult === 'number') {
    actualDmg = Math.max(1, Math.round(actualDmg * clamp(target._damageTakenMult, 0.25, 3)));
  }
  // Evolution difficulty: enemies adapt to repeated moves.
  if (storyModeActive && attacker && !attacker.isAI && !attacker.isBoss && target !== attacker &&
      (target.isAI || target.isBoss) && typeof _storyDifficulty === 'function' && _storyDifficulty() === 'evolution') {
    actualDmg = _storyEvoAdapt(attacker, target, actualDmg);
  }
  // Cap stacked bonuses at 3.5x the base hit.
  if (attacker && !attacker.isBoss && !attacker.isTrueForm && _origDmg > 0) {
    actualDmg = Math.min(actualDmg, Math.round(_origDmg * 3.5));
  }
  // Parry-stunned targets take 1.5x damage.
  if (target && target._parryVulnFrames > 0) {
    actualDmg = Math.max(1, Math.round(actualDmg * 1.5));
    spawnParticles(target.cx(), target.cy(), '#ffdd00', 8);
  }
  // Mirror Fracture: reflect 25% back while shielding. isSplash stops two reflectors from ping-ponging.
  if (target && target.shielding && !isSplash && !isDot && target.story2Abilities && target.story2Abilities.has('reflect2') && attacker && attacker !== target) {
    const reflectDmg = Math.max(1, Math.floor(actualDmg * 0.25));
    dealDamage(target, attacker, reflectDmg, 0, 1.0, true, 0);
    spawnParticles(attacker.cx(), attacker.cy(), '#00aaff', 6);
  }
  // Varek builds rage from hits taken.
  if (target && target.charClass === 'kratos') {
    target.rageStacks = Math.min(KRATOS_RAGE_MAX, (target.rageStacks || 0) + 1);
  }
  // KB scales with damage.
  let actualKb  = kbForce * (1 + actualDmg * 0.028);
  // Nexus defense: player hits knock enemies further.
  if (attacker && attacker._nexusKBBoost && target && !target._nexusKBBoost)
    actualKb = actualKb * 1.8;
  // curse_fragile: target takes 1.5x knockback.
  if (target && target.curses && target.curses.some(c => c.type === 'curse_fragile'))
    actualKb = actualKb * 1.5;
  // Boss post-teleport crit window.
  if (attacker && attacker.isBoss && attacker.postTeleportCrit > 0) {
    if (Math.random() < 0.65) {
      actualDmg = Math.round(actualDmg * 2.2);
      spawnParticles(target.cx(), target.cy(), '#ff8800', 18);
      spawnParticles(target.cx(), target.cy(), '#ffff00', 10);
    }
  }
  // Player hit on a boss in its crit window: double damage and a stun.
  if (attacker && !attacker.isBoss && target && target.isBoss && target.postTeleportCrit > 0) {
    actualDmg = Math.round(actualDmg * 2.0);
    target.stunTimer = Math.max(target.stunTimer || 0, 60);
    target.postTeleportCrit = 0;
    spawnParticles(target.cx(), target.cy(), '#ffff00', 20);
    spawnParticles(target.cx(), target.cy(), '#00ffff', 12);
  }
  // Heavier hits raise director intensity.
  if (typeof directorAddIntensity === 'function') {
    directorAddIntensity(actualDmg * 0.02);
  }
  // Sampled before the overflow break below clears `shielding`. A DoT tick never counts as guarded.
  let _guardUp = !!target.shielding && !isDot;
  let _shieldedHit = _guardUp;
  let _parried = false;
  if (_guardUp) {
    const _stacks = Math.max(1, target.shieldStacks || 1);
    // Parry runs before damage absorption.
    if (_stacks === 1 && attacker && !(attacker.stunTimer > 0) && !(attacker.isBoss && attacker.phase >= 3) &&
        (SHIELD_RULES !== 'pool' || target._parryFresh)) {
      const held = target.shieldHoldTimer || 0;
      const parryChance = held <= 8 ? 0.65 : held <= 15 ? 0.30 : 0;
      if (parryChance > 0 && Math.random() < parryChance) {
        _parried = true;
        if (typeof SoundManager !== 'undefined' && SoundManager.parry) SoundManager.parry();
        attacker.stunTimer        = Math.max(attacker.stunTimer || 0, 90);
        attacker._parryVulnFrames = 90;
        spawnParticles(target.cx(),   target.cy(),   '#ffff00', 22);
        spawnParticles(target.cx(),   target.cy(),   '#ffffff', 12);
        spawnParticles(attacker.cx(), attacker.cy(), '#ff8800', 14);
        screenShake = Math.max(screenShake, 10);
        if (settings.dmgNumbers)
          damageTexts.push(new DamageText(target.cx(), target.y - 38, 'PARRY!', '#ffff00'));
        SoundManager.clang && SoundManager.clang();
        // Overdrive burst fires next frame, not from inside dealDamage.
        if (target._wxOverdrive > 0) target._wxParryBurst = true;
        actualDmg = 0;
        actualKb  = 0;
      }
    }
    // Q/E guard break (smb-move-scenes.js): the guard shatters like an overflow break,
    // and the hit lands as an unguarded one, knockback and all.
    if (!_parried && actualDmg > 0 && typeof msGuardBreakClaim === 'function' && msGuardBreakClaim(attacker, target)) {
      target.shieldHP        = 0;
      target.shielding       = false;
      target.shieldBroken    = true;
      target.shieldHoldTimer = 0;
      if (SHIELD_RULES === 'pool') target._shieldRegenWait = SHIELD_BREAK_DELAY;
      _guardUp     = false;
      _shieldedHit = false;
      spawnParticles(target.cx(), target.cy(), '#ff8844', 18);
      spawnParticles(target.cx(), target.cy(), '#88ddff', 10);
      SoundManager.clang && SoundManager.clang();
      if (settings.dmgNumbers)
        damageTexts.push(new DamageText(target.cx(), target.y - 38, 'GUARD BREAK!', '#ff8844'));
    }
    if (actualDmg > 0 && _guardUp) {
      if (_stacks <= 3) {
        // Overflow past the HP pool breaks the guard and goes through as damage.
        const _shHP = target.shieldHP || 0;
        const _drainMult = (SHIELD_AIR && !target.onGround) ? AIR_GUARD_DRAIN : 1;
        if (actualDmg * _drainMult >= _shHP) {
          const _overflow = Math.max(0, Math.round(actualDmg - _shHP / _drainMult));
          target.shieldHP        = 0;
          target.shielding       = false;
          _guardUp               = false;
          target.shieldBroken    = true;
          target.shieldHoldTimer = 0;
          if (SHIELD_RULES === 'pool') target._shieldRegenWait = SHIELD_BREAK_DELAY;
          spawnParticles(target.cx(), target.cy(), '#ff8844', 14);
          SoundManager.clang && SoundManager.clang();
          actualDmg = _overflow;
          actualKb  = _overflow > 0 ? Math.floor(actualKb * 0.6) : 0;
        } else {
          target.shieldHP -= actualDmg * _drainMult;
          spawnParticles(target.cx(), target.cy(), '#88ddff', 6);
          actualDmg = 0;
          actualKb  = 0;
        }
      } else {
        // Ladder stacks 4-6 pass a fraction of damage.
        const _SHIELD_PASS = [0, 0, 0, 0, 0.20, 0.50, 0.80];
        const _passThrough = _stacks <= 6 ? _SHIELD_PASS[_stacks] : 1.00;
        actualDmg = Math.floor(actualDmg * _passThrough);
        actualKb  = Math.floor(actualKb * (0.15 + _passThrough * 0.5));
        const _shColor = _stacks === 4 ? '#88ddff' : _stacks === 5 ? '#ffaa44' : '#ff6644';
        spawnParticles(target.cx(), target.cy(), _shColor, 6);
      }
    }
    // Minus on block: a held melee swing leaves its owner open. Applied when the swing ends,
    // since smb-fighter.js sets swing endlag there and would overwrite it.
    if (_guardUp && !_parried && attacker && attacker !== target && !isSplash &&
        !attacker.isBoss && !attacker.isTrueForm && (attacker.attackTimer || 0) > 0 &&
        attacker.weapon && attacker.weapon.type !== 'ranged' &&
        Math.abs(attacker.cx() - target.cx()) < 260) {
      attacker._blockedEndlag = BLOCK_ENDLAG;
    }
  }
  if (!_shieldedHit) {
    target.hurtTimer = 8;
    target._hitFlashTimer = actualDmg >= 22 ? 5 : 3;
    // Hitstop, shake, camera punch and slow-mo are global. In Battle Royale only the
    // local player's hits get them, or many off-screen hits cause a strobe.
    const _juiceOK = (typeof gameMode === 'undefined' || gameMode !== 'battleroyale')
      || (typeof _brIsLocalPlayerHit === 'function' && _brIsLocalPlayerHit(attacker, target));
    // Hitstop varies by about 2 frames so impacts don't feel metronomic.
    const _isCosmicHit = attacker && (attacker.isBoss || attacker.isTrueForm);
    const _hsVar = Math.round((Math.random() - 0.5) * 4); // ±2 frames
    if (!_juiceOK) {
      // no global freeze for off-screen hits
    } else if (!target.isBoss) {
      // Math.max, not =, so a weak splash can't cut a heavy hit's freeze short.
      if (_isCosmicHit && actualDmg >= 20) {
        hitStopFrames = Math.max(hitStopFrames, 1, Math.min(16, Math.floor(actualDmg / 4) + 6 + _hsVar));
      } else if (actualDmg >= 30) {
        hitStopFrames = Math.max(hitStopFrames, 1, Math.min(13, Math.floor(actualDmg / 6) + 5 + _hsVar));
      } else if (actualDmg >= 18) {
        hitStopFrames = Math.max(hitStopFrames, 1, Math.min(9,  Math.floor(actualDmg / 7) + 2 + _hsVar));
      } else if (actualDmg >= 8) {
        hitStopFrames = Math.max(hitStopFrames, 1, Math.min(6,  Math.floor(actualDmg / 6) + 1 + _hsVar));
      }
    } else {
      // Lighter hitstop on bosses so they don't feel stunned.
      if (actualDmg >= 30) hitStopFrames = Math.max(hitStopFrames, 1, Math.min(5, Math.floor(actualDmg / 22) + (_hsVar > 1 ? 1 : 0)));
      else if (actualDmg >= 15) hitStopFrames = Math.max(hitStopFrames, _hsVar > 1 ? 3 : 2);
    }
    if (_juiceOK && typeof setCameraDrama === 'function' && actualDmg > 22) {
      setCameraDrama('impact', 18);
    }
    // Slow-mo on cosmic hits, and heavy hits on non-bosses.
    if (_juiceOK && !target.isBoss && slowMotion >= 0.9) {
      if (_isCosmicHit && actualDmg >= 22) {
        slowMotion = 0.25;
        hitSlowTimer = 18;
      } else if (actualDmg >= 30) {
        slowMotion = 0.32;
        hitSlowTimer = 14;
      }
    }
    if (_juiceOK && actualDmg >= 18) camHitZoomTimer = _isCosmicHit ? 22 : 15;
    // Red vignette when a human takes a heavy hit.
    if (!target.isAI && !target.isBoss && actualDmg >= 15) {
      hitVignetteTimer = _isCosmicHit ? 28 : 18;
      hitVignetteColor = actualDmg >= 35 ? 'rgba(220,30,0,' : 'rgba(200,50,0,';
    }
    if (_isCosmicHit && actualDmg >= 28 && typeof SoundManager !== 'undefined') {
      SoundManager._cosmicSilenceTimer = 8;
    }
  }
  if (attacker && attacker.kbBonus) actualKb = Math.round(actualKb * attacker.kbBonus);
  if (target.kbResist)  actualKb = Math.round(actualKb * target.kbResist);
  if (typeof wxKnockbackMods === 'function') actualKb = wxKnockbackMods(attacker, target, actualKb);
  // Affinity scales knockback a little.
  if (attacker && attacker.charClass && attacker.weapon && typeof CLASS_AFFINITY !== 'undefined') {
    const _affKb = CLASS_AFFINITY[attacker.charClass];
    if (_affKb) {
      const _affKbMult = _affKb[attacker.weapon.weaponType] || 1.0;
      if (_affKbMult < 0.8) actualKb = Math.round(actualKb * 0.85);
      else if (_affKbMult > 1.2) actualKb = Math.round(actualKb * 1.12);
    }
  }

  // Combo tracking. Separate from TrueForm's _comboCount.
  let _stringHit = false, _comboFollowAbility = false;
  if (attacker && !attacker.isBoss && !attacker.isTrueForm && target && !target.isBoss && typeof frameCount !== 'undefined') {
    const _fc = frameCount;
    // 45-frame combo window.
    if (_fc - (attacker._comboLastFrame || 0) > 45) attacker._comboHitCount = 0;
    attacker._comboHitCount  = (attacker._comboHitCount  || 0) + 1;
    attacker._comboLastFrame = _fc;
    const _cn = attacker._comboHitCount;
    // Victim-side count, so attackers taking turns can't each start at full stun.
    if (_fc - (target._victimHitLast || 0) > 45) target._victimHitCount = 0;
    target._victimHitCount = (target._victimHitCount || 0) + 1;
    target._victimHitLast  = _fc;
    // Each hit in a combo pushes further, which stops re-hit loops.
    if (_cn > 1) {
      const _kbScale = Math.min(1.5, 1 + (_cn - 1) * 0.08);
      actualKb = Math.min(actualKb * _kbScale, 22);
    }
    // 7+ hit combos force a launch. Skip when KB was zeroed by a guard.
    if (_cn >= 7 && actualKb > 0) {
      actualKb = Math.max(actualKb, 17);
    }
    _stringHit = _cn < STRING_LEN && !isSplash && !attacker.superActive &&
                 attacker.attackTimer > 0 && attacker._attackKindTier === CLASH_TIER_ATTACK &&
                 !!attacker.weapon && attacker.weapon.type === 'melee';
    if (_stringHit) actualKb *= STRING_KB;
    if (_cn > 1 && !isDot && actualDmg > 0) {
      let _cs = COMBO_SCALE[Math.min(_cn, COMBO_SCALE.length - 1)];
      if (attacker.superActive || attacker._attackKindTier === CLASH_TIER_SUPER) _cs = Math.max(_cs, COMBO_SCALE_SUPER_MIN);
      if (_cs < 1) actualDmg = Math.max(1, Math.round(actualDmg * _cs));
    }
    _comboFollowAbility = _cn > 1 && attacker._attackKindTier === CLASH_TIER_ABILITY;
  }

  // A second knockback on the same frame (AoE, multi-hit) is cut to 45%.
  if (typeof frameCount !== 'undefined') {
    if (target._kbAppliedFrame === frameCount) {
      actualKb = Math.round(actualKb * 0.45);
    } else {
      target._kbAppliedFrame = frameCount;
    }
  }

  // Non-boss KB capped at 20, boss/TF at 26.
  if (attacker && (attacker.isBoss || attacker.isTrueForm)) {
    actualKb = Math.min(actualKb, 26);
  } else {
    actualKb = Math.min(actualKb, 20);
  }

  // Familiar hits can't keep an airborne target airborne (summoner volley). Damage still applies.
  if (attacker && attacker._isFamiliar && !target.onGround && !target.isBoss) {
    actualKb = 0;
  }

  // Blocked hits don't move the defender. Applied last so no earlier step re-adds a push.
  if (_shieldedHit) actualKb = 0;

  // Super armor: damage lands but the target can't be moved or stunned.
  const _superArmored = typeof frameCount !== 'undefined' && (target._superArmorUntil || -1) >= frameCount;
  if (_superArmored) actualKb = 0;

  // Training only.
  if (trainingMode && attacker && attacker.onePunchMode && !_guardUp) {
    actualDmg = target.health; // always lethal
  }
  // One hit can't take more than 45% of max HP (25% for bosses). Not applied to one-punch mode.
  if (!trainingMode || !(attacker && attacker.onePunchMode)) {
    const _maxHit = target.isBoss
      ? Math.floor((target.maxHealth || 100) * 0.25)
      : Math.floor((target.maxHealth || 100) * 0.45);
    if (actualDmg > _maxHit) actualDmg = _maxHit;
  }
  // Godslayer armor: 45% resistance in the Absolute Axiom fight.
  if (target.armorStyle === 'godslayer' && typeof gameMode !== 'undefined' && gameMode === 'absoluteaxiom') {
    actualDmg = Math.max(1, Math.round(actualDmg * 0.55));
  }
  // Sports: no health damage, but the carrier drops the ball.
  if (gameMode === 'minigames' && minigameType === 'sports') {
    actualDmg = 0;
    if (typeof sportsOnHit === 'function') sportsOnHit(attacker, target, actualKb);
  }
  // The remote client applies the damage to itself.
  if (onlineMode && attacker && !attacker.isRemote && target && target.isRemote) {
    NetworkManager.sendHit(_netPreTargetDmg, kbForce, actualKb > 0 ? (target.cx() > attacker.cx() ? 1 : -1) : 0);
  }
  // Public Server: forward to the victim's owner.
  if (typeof PubHub !== 'undefined' && PubHub.active) PubHub.onDamage(attacker, target, _netPreTargetDmg, kbForce);
  // Training lab log, after all scaling and caps.
  if (typeof trainingMode !== 'undefined' && trainingMode &&
      typeof _tlabRecordHit === 'function') {
    _tlabRecordHit(attacker, target, dmg, actualDmg, kbForce, actualKb);
  }
  // BR creature form takes the hit first. Only overflow reaches the body (smb-br-forms.js).
  const _bodyDmg = (target._brForm && typeof brFormAbsorb === 'function')
    ? brFormAbsorb(target, actualDmg, attacker) : actualDmg;
  target.health    = Math.max(0, target.health - _bodyDmg);
  if (attacker && attacker._brForm && typeof brFormOnHit === 'function') brFormOnHit(attacker, target, actualDmg);
  if (attacker && actualDmg > 0) attacker.totalDamageDealt = (attacker.totalDamageDealt || 0) + actualDmg;
  // Scythe lifesteal on basic swings, splash included.
  if (attacker && attacker.weaponKey === 'scythe' && _bodyDmg > 0 && attacker !== target && !isDot &&
      _moveTierOverride === null && attacker._attackKindTier === CLASH_TIER_ATTACK && attacker.health > 0) {
    attacker._scytheHealPool = (attacker._scytheHealPool || 0) + _bodyDmg * SCYTHE_LIFESTEAL;
    const _sh = Math.min(Math.floor(attacker._scytheHealPool), attacker.maxHealth - attacker.health);
    if (_sh >= 1) {
      attacker._scytheHealPool -= _sh;
      attacker.health += _sh;
      if (settings.dmgNumbers) damageTexts.push(new DamageText(attacker.cx(), attacker.y - 20, '+' + _sh, '#44ff44'));
    }
    if (attacker.health >= attacker.maxHealth) attacker._scytheHealPool = 0;
  }
  // A basic swing counts toward the swing chain on its first damaging hit.
  if (attacker && attacker._basicChainArmed && actualDmg > 0 && attacker !== target && !isDot &&
      typeof frameCount !== 'undefined' && frameCount <= (attacker._basicChainReadyAt || 0) +
        (typeof BASIC_CHAIN_RESET !== 'undefined' ? BASIC_CHAIN_RESET : 20)) {
    attacker._basicChainArmed = false;
    attacker._basicChainN = (attacker._basicChainN || 0) + 1;
  }
  // Super payout on its first hit: heal plus one domain charge. Whiffs earn nothing.
  // Doesn't require superActive, since the super's projectile can land after the animation.
  const _payoutHazard = typeof DomainManager !== 'undefined'
    && typeof DomainManager.isHazardTick === 'function' && DomainManager.isHazardTick();
  // A landed ability or super clears a held swing chain. A whiff doesn't.
  if (attacker && attacker._basicChainHeld && actualDmg > 0 && attacker !== target && !isDot && !_payoutHazard &&
      (attacker._attackKindTier === CLASH_TIER_ABILITY || attacker._attackKindTier === CLASH_TIER_SUPER)) {
    attacker._basicChainHeld = false;
    attacker._basicChainN = 0;
  }
  if (attacker && (attacker._superHealPending > 0 || attacker._superCountPending) &&
      actualDmg > 0 && attacker !== target && attacker._attackKindTier === CLASH_TIER_SUPER &&
      !isDot && !_payoutHazard && attacker.health > 0 && typeof frameCount !== 'undefined' &&
      frameCount <= (attacker._superHealUntil || 0)) {
    if (attacker._superCountPending) {
      attacker._superCountPending = false;
      attacker._domainSuperCount = (attacker._domainSuperCount || 0) + 1;
    }
    const _heal = Math.min(attacker._superHealPending || 0, attacker.maxHealth - attacker.health);
    attacker._superHealPending = 0;
    if (_heal > 0) {
      attacker.health += _heal;
      damageTexts.push(new DamageText(attacker.cx(), attacker.y - 30, '+' + _heal, '#44ff88'));
      spawnParticles(attacker.cx(), attacker.cy(), '#44ff88', 14);
      if (typeof SoundManager !== 'undefined' && SoundManager.superHeal) SoundManager.superHeal();
    }
  }
  if (actualDmg > 0 && !target.isBoss) target._damageAccumThisLife = (target._damageAccumThisLife || 0) + actualDmg;
  // Ronin domain: each hit leaves a cut mark. DomainManager detonates them later.
  if (attacker && attacker._roninCutsActive && !attacker._roninDetonating &&
      actualDmg > 0 && target.health > 0 && attacker !== target) {
    if (target._roninCutOwner !== attacker) { target._roninCutOwner = attacker; target._roninCuts = 0; }
    if ((target._roninCuts || 0) < 5) {
      target._roninCuts = (target._roninCuts || 0) + 1;
      spawnParticles(target.cx(), target.y - 10, '#ccccff', 4);
      if (typeof SoundManager !== 'undefined' && SoundManager.iaiMark) SoundManager.iaiMark(target._roninCuts);
    }
  }
  // Reaper domain: each hit rips a soul wisp, including killing blows.
  if (attacker && attacker._soulTitheActive && !attacker._soulTitheDetonating &&
      actualDmg > 0 && attacker !== target) {
    attacker._pendingSoulRips = attacker._pendingSoulRips || [];
    if (attacker._pendingSoulRips.length < 12) {
      attacker._pendingSoulRips.push({ x: target.cx(), y: target.cy() - 8 });
      spawnParticles(target.cx(), target.y - 10, '#ee88ee', 4);
      if (typeof SoundManager !== 'undefined' && SoundManager.soulRip) {
        SoundManager.soulRip((attacker._soulTitheCount || 0) + 1);
      }
    }
  }
  // God phase 1 fake crash, once per fight. Deferred so the frame finishes first.
  if (attacker && attacker.isGod && attacker._phase === 1 && !attacker._storyGod &&
      !attacker._consoleSummoned && !attacker._crashFired &&
      target && !target.isMinion && !target.isAI && !target.isBoss && !target.isRemote) {
    attacker._crashFired = true;
    if (typeof godDefeated === 'undefined' || !godDefeated) {
      setTimeout(function () { if (typeof _showGodFakeCrash === 'function') _showGodFakeCrash(); }, 0);
    }
  }
  // Killing blow may start a finisher. It sets health=1 and invincible internally.
  let _finisherFired = false;
  if (target.health <= 0 && attacker && typeof triggerFinisher === 'function') {
    _finisherFired = !!triggerFinisher(attacker, target);
  }
  // TrueForm combo damage.
  if (attacker && attacker.isTrueForm && !target.isBoss) {
    attacker._comboDamage = (attacker._comboDamage || 0) + actualDmg;
  }
  if (attacker && !attacker.isAI && attacker.weapon && attacker.weapon.type === 'ranged' && target && target.isTrueForm) {
    target._antiRangedStats = target._antiRangedStats || { projectiles: 0, rangedDamage: 0, farTicks: 0 };
    target._antiRangedStats.rangedDamage = Math.min(999, (target._antiRangedStats.rangedDamage || 0) + actualDmg);
  }
  // Stun handoff: a different attacker can't re-stun within the owner's window.
  // Read before this hit can open one, so the hit that trips it still stuns.
  const _stunHandoff = !!(attacker && attacker !== target && !attacker.isBoss && !attacker.isTrueForm &&
    !target.isBoss && !target.isTrueForm && target._stunOwner && target._stunOwner !== attacker &&
    typeof frameCount !== 'undefined' && (target._stunOwnerUntil || -1) + STUN_HANDOFF_FREE >= frameCount);
  // Counter-hit: the victim was mid-swing. Read before anything clears their swing.
  const _counterHit = (target.attackTimer || 0) > 0;
  const _stunGuarded = _superArmored || _stunHandoff || (typeof frameCount !== 'undefined' && (target._stunGuardUntil || -1) >= frameCount);
  // Wall combo: three fast hits with your back to a wall lets you escape.
  // Uses _wallBounds() so the real walls count, not GAME_W.
  if (target && attacker && attacker !== target && !attacker.isBoss &&
      (target.invincible <= 0 || _hitIframesLetThrough(attacker, target)) && !target.godmode && !target.isDead) {
    const _wb = _wallBounds();
    target._wallComboTimer = target._wallComboTimer || 0;
    target._wallComboHits  = target._wallComboHits  || 0;
    // 90-frame window.
    if (target._wallComboTimer <= 0) target._wallComboHits = 0;
    target._wallComboHits++;
    target._wallComboTimer = 90;
    const _nearLeft  = target.x < _wb.left + 80;
    const _nearRight = target.x + target.w > _wb.right - 80;
    if (target._wallComboHits >= 3 && (_nearLeft || _nearRight)) {
      target._wallComboHits  = 0;
      target._wallComboTimer = 0;
      // Applied after knockback below, or knockback would overwrite the velocity.
      target._wallEscape = { dir: _nearLeft ? 1 : -1 };
      if (target.isTrueForm) {
        // TrueForm warps to mid-arena instead.
        const _escX = (_wb.left + _wb.right) / 2 - target.w / 2 + (Math.random() - 0.5) * 120;
        target.x  = Math.max(_wb.left + 20, Math.min(_wb.right - target.w - 20, _escX));
        target.y  = GAME_H * 0.35;
        target.vx = 0;
        target.vy = -6;
        spawnParticles(target.cx(), target.cy(), '#aa00ff', 14);
      }
      // 24 frames. TrueForm gets i-frames, everyone else gets a no-restun window.
      if (target.isTrueForm) target.invincible = Math.max(target.invincible, 24);
      else target._stunGuardUntil = Math.max(target._stunGuardUntil || 0, frameCount + 24);
      spawnParticles(target.cx(), target.cy(), '#ffffff', 20);
      if (typeof SoundManager !== 'undefined' && typeof SoundManager.shieldBlock === 'function') {
        SoundManager.shieldBlock();
      }
    }
  }
  // Who last hurt this fighter. Informational only, for AI targeting.
  if (attacker && attacker !== target && actualDmg > 0 && typeof frameCount !== 'undefined') {
    target._lastAttacker      = attacker;
    target._lastAttackerFrame = frameCount;
    target._lastAttackerDmg   = actualDmg;
  }
  // BR elimination credit must happen on the killing blow. Corpses are pruned before BR updates.
  if (target.health <= 0 && typeof _brCreditElimination === 'function') {
    _brCreditElimination(attacker, target);
  }
  if (target.invincible <= hitInvincibleFrames && hitInvincibleFrames > 0 && typeof frameCount !== 'undefined') {
    target._hitIframeBy    = attacker;
    target._hitIframeAct   = attacker ? attacker._attackStartFrame : null;
    target._hitIframeUntil = frameCount + hitInvincibleFrames;
  }
  target.invincible = target.invincible > hitInvincibleFrames ? target.invincible : hitInvincibleFrames;
  const dir        = attacker ? (target.cx() > attacker.cx() ? 1 : -1) : 1;
  // Read by DeathAnim.begin() to pick a death. Doesn't affect physics.
  target._lastHitCtx = {
    dir, kb: actualKb, dmg: actualDmg, splash: !!isSplash,
    finisher: !!_finisherFired,
    wk: attacker ? attacker.weaponKey : null,
    fromBoss: !!(attacker && (attacker.isBoss || attacker.isTrueForm)),
    hx: attacker ? attacker.cx() : target.cx(),
    hy: attacker ? attacker.cy() : target.cy(),
    frame: (typeof frameCount !== 'undefined') ? frameCount : 0,
  };
  // Finishers stage both fighters themselves, so skip knockback for them.
  // A DoT tick has no knockback and must not write velocity: kb 0 zeroed it, which killed
  // jumps under decks and stopped runs dead on every whip bleed tick.
  if (!target.godmode && !_finisherFired && !_superArmored && !isDot) {
    target.vx      = dir * actualKb;
    target.vy      = -actualKb * 0.55;
    if (currentArena && currentArena.isLowGravity)  target.vy = -actualKb * 0.25;
    if (currentArena && currentArena.isHeavyGravity) target.vy = -actualKb * 0.75;
    // Keeps a string hit from floating out of reach under air drag.
    if (_stringHit && target.onGround) target.vy = 0;
    // Same-frame clamp. fighter.update() clamps too, but only next frame.
    target.vx = clamp(target.vx, -18, 18);
    target.vy = clamp(target.vy, -18, 18);
    // Cosmetic only: hitboxes, physics and sync don't read this.
    if (!_guardUp) {
      target._hitNudge = { x: dir * Math.min(4, 2 + Math.floor(actualDmg / 15)), t: 4 };
      // Render-only, read by animHitSquash() in Fighter.draw().
      const _sqAmt = Math.min(0.22, 0.05 + actualKb * 0.011);
      target._hitSquash = { amt: _sqAmt, t: 10, max: 10 };
    }
  }
  // Applied after knockback so it wins over the push into the wall.
  if (target._wallEscape) {
    const _we = target._wallEscape;
    target._wallEscape = null;
    if (!target.isTrueForm) {
      target.vx = _we.dir * 9;
      target.vy = -5;
    }
  }
  // BR: only the local player's hits shake the screen.
  if (settings.screenShake && (typeof gameMode === 'undefined' || gameMode !== 'battleroyale' ||
      typeof _brIsLocalPlayerHit !== 'function' || _brIsLocalPlayerHit(attacker, target))) {
    const _shakeBase = _guardUp ? 2 : Math.min(18, 4 + Math.floor(actualDmg / 5));
    screenShake = Math.max(screenShake, _shakeBase);
  }
  // Environmental hits (no attacker) skip the hit sound or the audio floods.
  // BR: only hits the camera can see are audible.
  const _hitAudible = typeof gameMode === 'undefined' || gameMode !== 'battleroyale' ||
                      typeof _brIsAudibleHit !== 'function' || _brIsAudibleHit(attacker, target);
  if (!_hitAudible) { /* off-screen BR hit, silent */ }
  else if (_guardUp) SoundManager.clang();
  else if (attacker) {
    // Melee weapons pick their hit sound from WEAPON_SWINGS. Everything else is tiered by damage.
    const _hsG = (typeof WEAPON_SWINGS !== 'undefined' && attacker.weaponKey &&
                  attacker.weapon && attacker.weapon.type === 'melee')
      ? WEAPON_SWINGS[attacker.weaponKey] : null;
    const _hs = _hsG && _hsG.hitSound;
    if      (_hs === 'blunt'  && SoundManager.hitBlunt)  SoundManager.hitBlunt();
    else if (_hs === 'pierce' && SoundManager.hitPierce) SoundManager.hitPierce();
    else if (_hs === 'snap'   && SoundManager.hitSnap)   SoundManager.hitSnap();
    else if (_hs === 'zap'    && SoundManager.hitZap)    SoundManager.hitZap();
    else if (_hs === 'slash'  && SoundManager.hitSlash)  SoundManager.hitSlash();
    else if (_hs === 'clang')                            SoundManager.clang();
    else if (actualDmg >= 30) SoundManager.heavyHit();
    else SoundManager.hit();
    if (_hs && actualDmg >= 30) SoundManager.heavyHit();
  }
  // Arena reacts to the hit (light, air pressure, dust).
  if (_hitAudible && typeof worldReactHit === 'function') {
    worldReactHit(attacker, target, actualDmg, actualKb, _guardUp, isSplash);
  }
  // Blood only on direct entity hits.
  if (!_guardUp && !isSplash && attacker && !target.isBoss &&
      actualDmg > 0 && typeof spawnBlood === 'function') {
    const _bDir = target.cx() > attacker.cx() ? 1 : -1;
    spawnBlood(target.cx(), target.cy() - 4, _bDir, actualDmg);
  }

  // Custom-weapon attackers don't count toward achievements.
  const _attackerHasCustomWeapon = attacker && attacker.weapon && typeof attacker.weapon._isCustom === 'boolean' && attacker.weapon._isCustom;
  if (!_guardUp && !_attackerHasCustomWeapon) {
    if (!target.isAI && !target.isBoss) _achStats.damageTaken += actualDmg;
    if (attacker && !attacker.isAI && attacker.weapon && attacker.weapon.type === 'ranged')
      _achStats.rangedDmg += actualDmg;
    if (attacker && !attacker.isAI) {
      _achStats.consecutiveHits++;
      if (_achStats.consecutiveHits >= 5) unlockAchievement('combo_king');
    }
    if (target && !target.isAI) _achStats.consecutiveHits = 0;
    if (attacker && !attacker.isBoss && !attacker.isAI && gameRunning) {
      if (target.isAI && target.health <= 0) _achStats.botKills = (_achStats.botKills || 0) + 1;
      if (!attacker.isAI && !target.isAI && !attacker.isBoss && !target.isBoss) {
        _achStats.pvpDamageDealt = (_achStats.pvpDamageDealt || 0) + actualDmg;
      }
    }
    if (target && !target.isAI && !target.isBoss && attacker && attacker.isAI && gameRunning) {
      _achStats.pvpDamageReceived = (_achStats.pvpDamageReceived || 0) + actualDmg;
    }
  }
  // Splash hits don't chain again.
  if (!_guardUp && !isSplash && gameMode === 'minigames' && currentChaosModifiers.has('explosive')) {
    spawnParticles(target.cx(), target.cy(), '#ff8800', 16);
    spawnParticles(target.cx(), target.cy(), '#ffdd44', 10);
    for (const f of [...players, ...minions]) {
      if (f !== target && f !== attacker && f.health > 0 && dist(f, target) < 90) {
        dealDamage(attacker, f, Math.floor(actualDmg * 0.3), Math.floor(actualKb * 0.4), 1.0, true);
      }
    }
    SoundManager.explosion();
    if (typeof directorAddIntensity === 'function') {
      directorAddIntensity(0.12);
    }
  }
  if (!_guardUp) {
    const _stunBefore = target.stunTimer || 0, _ragBefore = target.ragdollTimer || 0;
    _spawnWeaponHitFX(attacker, target, actualDmg);
    const ragdollChance = target.kbResist ? 0.30 * target.kbResist : 0.30;
    const MAX_STUN = 90; // 1.5 s
    // Ragdoll chance ramps with knockback instead of a hard cutoff, so light
    // weapons get a small chance and a full-KB hit stays at 30%.
    const _RAG_LO = 12, _RAG_HI = 20;
    const _ragScale = Math.max(0, Math.min(1, (actualKb - _RAG_LO) / (_RAG_HI - _RAG_LO)));
    if (_ragScale > 0 && Math.random() < ragdollChance * _ragScale) {
      // Duration also scales, floored at 55%, so a light poke doesn't match a hammer.
      const _ragDur = stunMult * (0.55 + 0.45 * _ragScale);
      target.ragdollTimer = Math.min(70, Math.round((26 + Math.floor(actualKb * 1.6)) * _ragDur));
      target.stunTimer    = Math.min(MAX_STUN, Math.round((target.ragdollTimer + 16) * stunMult));
      target.ragdollSpin  = dir * (0.12 + Math.random() * 0.10);
    } else if (actualKb >= 8 && (actualDmg >= 25 || _counterHit)) {
      target.stunTimer    = Math.min(MAX_STUN, Math.round((18 + Math.floor(actualKb * 1.1)) * stunMult));
    }
    // Each combo hit shortens stun, down to a floor of 8 frames.
    const _decayHits = Math.max(attacker ? (attacker._comboHitCount || 0) : 0, target._victimHitCount || 0);
    if (attacker && !attacker.isBoss && !attacker.isTrueForm && _decayHits > 1 && target.stunTimer > 0) {
      const _decayFactor = Math.max(0.28, 1 - (_decayHits - 1) * 0.08);
      target.stunTimer    = Math.max(8, Math.floor(target.stunTimer * _decayFactor));
      if (target.ragdollTimer > 0)
        target.ragdollTimer = Math.max(6, Math.floor(target.ragdollTimer * _decayFactor));

    // Slower stun taper for steady pressure that lands outside the combo window.
    } else if (attacker && !attacker.isBoss && !attacker.isTrueForm && target.stunTimer > 0 &&
               typeof frameCount !== 'undefined' &&
               !(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.pressureDecay === false)) {
      const _PRESSURE_WINDOW = 190;   // ~3 s
      if (frameCount - (target._stunPressureLast || -9999) > _PRESSURE_WINDOW) target._stunPressure = 0;
      target._stunPressure     = (target._stunPressure || 0) + 1;
      target._stunPressureLast = frameCount;
      if (target._stunPressure > 1) {
        // Floor is higher than the combo taper: pressure hurts but never locks.
        const _pf = Math.max(0.50, 1 - (target._stunPressure - 1) * 0.10);
        target.stunTimer = Math.max(8, Math.floor(target.stunTimer * _pf));
        if (target.ragdollTimer > 0)
          target.ragdollTimer = Math.max(6, Math.floor(target.ragdollTimer * _pf));
      }
    }
    // String hit: attacker can swing again after endlag, and the stun lasts until
    // that swing's contact frame. Set after both decays so they can't open a gap.
    if (_stringHit && !_shieldedHit && actualDmg > 0) {
      const _contact = typeof attacker._meleeContactFrames === 'function' ? attacker._meleeContactFrames() : 5;
      const _next = Math.max((attacker.attackTimer || 0) + (attacker.weapon.endlag || 0),
                             (target.invincible || 0) - _contact + 2);
      attacker.cooldown = Math.min(attacker.cooldown || 0, _next);
      target.stunTimer  = Math.max(target.stunTimer || 0,
                                   Math.min(MAX_STUN, Math.ceil(_next + _contact) + STRING_STUN_PAD));
    }
    if (_comboFollowAbility) {
      target.stunTimer    = Math.min(target.stunTimer || 0, Math.max(_stunBefore, COMBO_ABILITY_STUN));
      target.ragdollTimer = Math.min(target.ragdollTimer || 0, Math.max(_ragBefore, COMBO_ABILITY_STUN));
    }

    target._stunStreak = target.stunTimer > 0
      ? (_stunBefore > 0 ? (target._stunStreak || 0) : 0) + 1 : 0;

    if (_stunGuarded) {
      target.stunTimer    = Math.min(target.stunTimer || 0, _stunBefore);
      target.ragdollTimer = Math.min(target.ragdollTimer || 0, _ragBefore);
    }

    // Lockout ceiling: caps how long chained hits can hold someone with no input,
    // then grants a short no-restun beat.
    if (target && !target.isBoss && !target.isTrueForm && typeof frameCount !== 'undefined' &&
        !(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.lockCeiling === false)) {
      const _LOCK_CEIL = 105;   // ~1.75 s of continuous lock
      // A run continues while the previous stun is still ticking (6-frame grace).
      const _prevLockUntil = (target._lockUntil == null) ? -9999 : target._lockUntil;
      const _wasLocked = frameCount <= _prevLockUntil + 6;
      if (!_wasLocked) target._lockStart = frameCount;
      target._lockPrevFrame = frameCount;
      target._lockUntil = frameCount + Math.max(target.stunTimer || 0, target.ragdollTimer || 0);
      const _held = frameCount - (target._lockStart || frameCount);
      if (_held + (target.stunTimer || 0) > _LOCK_CEIL) {
        target.stunTimer = Math.max(0, _LOCK_CEIL - _held);
        if (target.ragdollTimer > 0) target.ragdollTimer = Math.min(target.ragdollTimer, 10);
        if (target.stunTimer === 0) {
          // Launch straight up so they don't fly off the stage. Guard covers the rise.
          target.vx = 0;
          target.vy = -13;
          target.ragdollTimer = 0;
          target._stunGuardUntil = Math.max(target._stunGuardUntil || 0, frameCount + 24);
          target._lockStart = frameCount;
          target._lockUntil = -9999;
        } else {
          // keep expiry in sync with the truncated stun
          target._lockUntil = frameCount + Math.max(target.stunTimer, target.ragdollTimer || 0);
        }
      }
    }

    if (!_stunGuarded && attacker && attacker !== target && typeof frameCount !== 'undefined' &&
        (target.stunTimer > _stunBefore || target.ragdollTimer > _ragBefore)) {
      target._stunOwner      = attacker;
      target._stunOwnerUntil = frameCount + Math.max(target.stunTimer || 0, target.ragdollTimer || 0);
    }

    // Airborne after 5+ combo hits: no-restun window.
    if (attacker && attacker._comboHitCount >= 5 && !target.onGround && !target.isBoss &&
        typeof frameCount !== 'undefined') {
      target._stunGuardUntil = Math.max(target._stunGuardUntil || 0, frameCount + Math.round(hitInvincibleFrames * 1.5));
    }
    if (target._rd) {
      const impactX = attacker ? attacker.cx() : target.cx();
      const impactY = attacker ? attacker.cy() : target.cy();
      PlayerRagdoll.applyHit(target, dir * actualKb, -actualKb * 0.55, impactX, impactY);
    }
  }
  // Super meter. Domain hazard ticks never pay meter. Attacks the owner lands inside
  // their domain do pay.
  const _domainHazardHit = typeof DomainManager !== 'undefined'
    && typeof DomainManager.isHazardTick === 'function' && DomainManager.isHazardTick();
  // A super's late damage (projectiles, fused bombs) must not refill the bar it spent.
  const _superHit = attacker && (attacker.superActive || _hitFromSuper ||
    _moveTierOverride === CLASH_TIER_SUPER || attacker._attackKindTier === CLASH_TIER_SUPER);
  if (attacker && !_superHit && !_domainHazardHit) {
    const superRate = (attacker.superChargeRate || 1) * (attacker.weapon && attacker.weapon.superRateBonus || 1);
    let _superGain = Math.floor(actualDmg * 0.70 * superRate);
    // Minions give 35% meter. The creator fight floods them, which made meter too fast.
    if (target && target.isMinion) _superGain = Math.floor(_superGain * 0.35);
    // God fights have huge HP, so meter is flat per hit.
    if (target && (target.isGod || target.isAbsoluteAxiom)) _superGain = Math.min(_superGain, GOD_FIGHT_SUPER_GAIN);
    // Q abilities give at most 28 meter per activation.
    if (attacker._qSuperCapRemaining !== undefined) {
      _superGain = Math.min(_superGain, Math.max(0, attacker._qSuperCapRemaining));
      attacker._qSuperCapRemaining -= _superGain;
    }
    const prev = attacker.superReady;
    attacker.superMeter = Math.min(100, attacker.superMeter + _superGain);
    if (!prev && attacker.superMeter >= 100) {
      attacker.superReady      = true;
      attacker.superFlashTimer = 90;
    }
  }
  // Victims gain meter too, unless they own the domain.
  const _tgtInOwnDomain = target && typeof DomainManager !== 'undefined'
    && typeof DomainManager.ownsDomain === 'function' && DomainManager.ownsDomain(target);
  if (target && !target.superActive && !target.isBoss && !_tgtInOwnDomain) {
    const _targetSuperGain = Math.floor(actualDmg * 0.35);
    const _tPrev = target.superReady;
    target.superMeter = Math.min(100, target.superMeter + _targetSuperGain);
    if (!_tPrev && target.superMeter >= 100) {
      target.superReady      = true;
      target.superFlashTimer = 90;
    }
  }
  if (settings.dmgNumbers && !(actualDmg === 0 && gameMode === 'minigames' && minigameType === 'sports')) damageTexts.push(new DamageText(target.cx(), target.y, actualDmg, _guardUp ? '#88ddff' : '#ffdd00'));
  // Splash weapons (axe, gun) hit nearby targets.
  if (!isSplash && !_guardUp && attacker && attacker.weapon && attacker.weapon.splashRange) {
    handleSplash(attacker, target, actualDmg);
  }
}

function handleSplash(attacker, hitTarget, originalDmg, splashX, splashY) {
  const w = attacker.weapon;
  if (!w || !w.splashRange) return;
  const sx  = splashX !== undefined ? splashX : hitTarget.cx();
  const sy  = splashY !== undefined ? splashY : (hitTarget.y + hitTarget.h / 2);
  const sdmg = Math.max(1, Math.floor(originalDmg * w.splashDmgPct));
  const skb  = Math.floor((w.kb || 8) * 0.35);
  const all  = [...players, ...minions, ...trainingDummies];
  for (const t of all) {
    if (t === hitTarget || t === attacker || t.health <= 0 || t.invincible > 0) continue;
    if (areAlliedEntities(attacker, t)) continue;
    if (Math.hypot(t.cx() - sx, (t.y + t.h / 2) - sy) < w.splashRange) {
      dealDamage(attacker, t, sdmg, skb, 1.0, true);
      if (settings.particles) spawnParticles(t.cx(), t.cy(), w.color || '#ffaa44', 6);
    }
  }
}

