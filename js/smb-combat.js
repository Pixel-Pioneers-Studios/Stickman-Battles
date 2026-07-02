'use strict';
// smb-combat.js — dealDamage pipeline, damage helpers, handleSplash
// Depends on: smb-globals.js, smb-achievements.js, smb-data-weapons.js (WEAPON_KEYS)
'use strict';

// ============================================================
// HELPERS
// ============================================================
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lerp(a, b, t)   { return a + (b - a) * t; }
function clamp(v, mn, mx){ return Math.max(mn, Math.min(mx, v)); }
function dist(a, b)      { return Math.hypot(a.cx() - b.cx(), (a.y + a.h/2) - (b.y + b.h/2)); }

function areAlliedEntities(a, b) {
  if (!a || !b || a === b) return false;
  if (a._teamId !== undefined && b._teamId !== undefined) return a._teamId === b._teamId;
  if (a.storyFaction && b.storyFaction) return a.storyFaction === b.storyFaction;
  return false;
}

// Hook for future class-weapon special interactions. Called after affinity multiplier is applied.
function applyClassWeaponInteraction(attacker, target, dmg) {
  // placeholder for future logic
  return dmg;
}

// ── WEAPON-AWARE HIT PARTICLES ───────────────────────────────────────────────
// Spawns visually distinct particle bursts based on the attacker's weapon type.
// Called from dealDamage() on a non-shielded, non-boss hit.
function _spawnWeaponHitFX(attacker, target, dmg) {
  if (!settings.particles) return;
  const tx = target.cx(), ty = target.cy();
  const wk = attacker && attacker.weaponKey ? attacker.weaponKey : null;
  const heavy = dmg >= 22;
  switch (wk) {
    case 'sword':
      // Metallic sparks: white core + light-blue scatter
      spawnParticles(tx, ty, '#d4eeff', heavy ? 14 : 8);
      spawnParticles(tx, ty, '#ffffff', heavy ? 8 : 4);
      if (heavy) spawnParticles(tx, ty, '#88ccff', 6);
      break;
    case 'hammer':
      // Dusty orange shockwave chunks + ground dust ring (smash archetype)
      spawnParticles(tx, ty, '#cc5500', heavy ? 16 : 10);
      spawnParticles(tx, ty, '#ffaa44', heavy ? 10 : 5);
      spawnParticles(tx, target.y + target.h - 4, '#887766', heavy ? 10 : 5); // ground dust at feet
      if (heavy) spawnRing(tx, target.y + target.h - 4);
      break;
    case 'axe':
      // Chunky red/orange shards
      spawnParticles(tx, ty, '#ff4400', heavy ? 14 : 9);
      spawnParticles(tx, ty, '#cc2200', heavy ? 8 : 4);
      break;
    case 'scythe':
      // Dark purple reaping wisps
      spawnParticles(tx, ty, '#9900cc', heavy ? 14 : 8);
      spawnParticles(tx, ty, '#440066', heavy ? 8 : 5);
      if (heavy) spawnParticles(tx, ty, '#cc88ff', 6);
      break;
    case 'spear': {
      // Pierce flash: sparks streak along the thrust line (thrust archetype)
      const _spDir = attacker.facing || 1;
      spawnParticles(tx, ty, '#00ccbb', heavy ? 10 : 6);
      spawnParticles(tx + _spDir * 10, ty, '#ffffff', heavy ? 6 : 3);
      spawnParticles(tx + _spDir * 20, ty, '#aaffee', heavy ? 4 : 2);
      break;
    }
    case 'fryingpan':
      // Bright yellow/gold clang burst + comic impact ring
      spawnParticles(tx, ty, '#ffdd00', heavy ? 16 : 10);
      spawnParticles(tx, ty, '#ffffff', heavy ? 10 : 5);
      if (heavy) spawnRing(tx, ty);
      break;
    case 'broomstick': {
      // Poke streak: scatter trails along the jab line (thrust archetype)
      const _bsDir = attacker.facing || 1;
      spawnParticles(tx, ty, '#cc44ff', heavy ? 10 : 6);
      spawnParticles(tx + _bsDir * 12, ty, '#ffee44', heavy ? 6 : 3);
      break;
    }
    case 'katana':
      // Clean cut: sparse thin white/steel flash (iai archetype — less is more)
      spawnParticles(tx, ty, '#ffffff', heavy ? 8 : 5);
      spawnParticles(tx, ty, '#aaaadd', heavy ? 5 : 3);
      break;
    case 'whip': {
      // Snap burst at the crack point (the weapon tip, not the target center)
      const _wt = attacker._weaponTip;
      const _wx = _wt ? _wt.x : tx, _wy = _wt ? _wt.y : ty;
      spawnParticles(_wx, _wy, '#ffffff', heavy ? 10 : 7);
      spawnParticles(_wx, _wy, '#ffcc88', heavy ? 6 : 3);
      break;
    }
    case 'flail':
      // Heavy iron chunks (whirl archetype)
      spawnParticles(tx, ty, '#bbbbbb', heavy ? 14 : 9);
      spawnParticles(tx, ty, '#777788', heavy ? 8 : 4);
      if (heavy) spawnParticles(tx, ty, '#ffffff', 6);
      break;
    case 'electricstaff':
      // Crackling cyan discharge (zap archetype)
      spawnParticles(tx, ty, '#00eeff', heavy ? 14 : 9);
      spawnParticles(tx, ty, '#ffffff', heavy ? 7 : 4);
      break;
    case 'combat':
      // Red/white punch burst with extra count on heavy
      spawnParticles(tx, ty, '#ff2233', heavy ? 18 : 10);
      spawnParticles(tx, ty, '#ffffff', heavy ? 10 : 5);
      break;
    case 'shield':
      // Gold/blue blocking-style burst (attacker hitting with shield bash)
      spawnParticles(tx, ty, '#4488ff', heavy ? 12 : 7);
      spawnParticles(tx, ty, '#ffdd88', heavy ? 8 : 4);
      break;
    case 'gun': case 'peashooter': case 'slingshot': case 'bow': case 'paperairplane':
      // Ranged: particles are spawned by Projectile on hit, nothing extra needed here
      spawnParticles(tx, ty, target.color, 8);
      break;
    default:
      // Generic fallback
      spawnParticles(tx, ty, target.color, 12);
      if (heavy) {
        spawnParticles(tx, ty, '#ffffff', 8);
        spawnParticles(tx, ty, dmg >= 34 ? '#ff8844' : '#ffee88', dmg >= 34 ? 12 : 7);
      }
      break;
  }
}

function dealDamage(attacker, target, dmg, kbForce, stunMult = 1.0, isSplash = false, hitInvincibleFrames = 16) {
  if (activeCinematic) return; // no damage during cinematic pauses
  if (!target || target.invincible > 0 || target.health <= 0) return;
  if (target.godmode) return; // godmode: no hitbox — all damage blocked
  // Capped env-stack: environmental sources (attacker===null) may stack within one frame,
  // but total env damage per target per frame is capped at MAX_ENV_DAMAGE.
  // This allows lava+eruption combos while preventing instant burst kills.
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
  // God hard range gate — enforced at the system level, overrides all AI-layer logic
  if (attacker && attacker._isGod && target) {
    const _gd = Math.hypot(
      target.cx() - attacker.cx(),
      (target.y + (target.h || 0) / 2) - (attacker.y + (attacker.h || 0) / 2)
    );
    if (_gd > 160) return;
  }
  // TF opening cinematic: TrueForm cannot hurt players — fight is fully scripted
  if (typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive &&
      attacker && attacker.isTrueForm && target && !target.isBoss) return;
  // Paradox damage lock: player deals 0 damage to TrueForm during lock phase
  if (typeof tfDamageLocked !== 'undefined' && tfDamageLocked &&
      target && target.isTrueForm && attacker && !attacker.isBoss) {
    if (settings.dmgNumbers) damageTexts.push(new DamageText(target.cx(), target.y - 20, 0, '#445566'));
    return;
  }
  // Depth phase: Z-axis hit gate — attacker and target must share the same depth layer.
  // A miss shows a grey "~" so the player knows the layer mismatch caused it, not a bug.
  if (typeof tfDepthPhaseActive !== 'undefined' && tfDepthPhaseActive && attacker &&
      Math.abs((attacker.z || 0) - (target.z || 0)) >= 0.4) {
    if (settings.dmgNumbers)
      damageTexts.push(new DamageText(target.cx(), target.y - 20, '~', '#556677'));
    return;
  }
  // Combat weapon counter stance: absorb the hit, teleport behind attacker next frame.
  // Bosses and TrueForm bypass the counter (unavoidable by design).
  if (target._counterStance > 0 && attacker && attacker !== target &&
      !attacker.isBoss && !attacker.isTrueForm) {
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
  // Hidden power level: story player gains +2% damage per cleared chapter (capped at +200%).
  // Only applies to human players in story mode — enemies are never buffed by this.
  if (storyModeActive && attacker && !attacker.isAI && !attacker.isBoss &&
      typeof playerPowerLevel !== 'undefined' && playerPowerLevel > 1.0) {
    actualDmg = Math.max(1, Math.round(actualDmg * (1 + (playerPowerLevel - 1.0) * 0.15)));
  }
  // Class affinity multiplier: bonus/penalty based on attacker's class vs weapon type
  if (attacker && attacker.charClass && attacker.weapon && typeof CLASS_AFFINITY !== 'undefined') {
    const aff = CLASS_AFFINITY[attacker.charClass];
    if (aff) {
      const mult = aff[attacker.weapon.type] || 1.0;
      actualDmg = Math.max(1, Math.round(actualDmg * mult));
    }
  }
  actualDmg = applyClassWeaponInteraction(attacker, target, actualDmg);
  // Paradox manifestation: holding the projection occupies a slice of the player's
  // fragment output — the player hits lighter while the manifestation stands.
  if (attacker && attacker._pdxManifestHold) {
    actualDmg = Math.max(1, Math.round(actualDmg * 0.85));
  }
  // LiveOps balance: server-configurable player damage scale (human attackers only)
  if (window.LiveOps && attacker && !attacker.isAI && !attacker.isBoss) {
    const _pdm = LiveOps.getBalance('playerDamageMult', 1);
    if (_pdm !== 1) actualDmg = Math.max(1, Math.round(actualDmg * _pdm));
  }
  // Kratos rage bonus
  if (attacker && attacker.charClass === 'kratos' && attacker.rageStacks > 0) {
    actualDmg = Math.round(actualDmg * (1 + Math.min(attacker.rageStacks, 30) * 0.015));
  }
  // Kratos: Spartan Rage active — +30% damage + heals 10% of damage dealt
  if (attacker && attacker.spartanRageTimer > 0) {
    actualDmg = Math.round(actualDmg * 1.3);
    // Queue heal: accumulate in pool, apply as integer HP
    attacker._spartanRageHealPool = (attacker._spartanRageHealPool || 0) + actualDmg * 0.10;
    const healNow = Math.floor(attacker._spartanRageHealPool);
    if (healNow >= 1) {
      attacker._spartanRageHealPool -= healNow;
      attacker.health = Math.min(attacker.maxHealth, attacker.health + healNow);
      if (settings.dmgNumbers)
        damageTexts.push(new DamageText(attacker.cx(), attacker.y - 20, healNow, '#44ff44'));
    }
  }
  // Map perk: power buff
  if (attacker && attacker._powerBuff > 0) actualDmg = Math.round(actualDmg * 1.35);
  // Curse: attacker has curse_weak — deal 50% damage
  if (attacker && attacker.curses && attacker.curses.some(c => c.type === 'curse_weak'))
    actualDmg = Math.max(1, Math.round(actualDmg * 0.5));
  // Paladin passive: 15% damage reduction on incoming hits
  if (target && target.charClass === 'paladin')
    actualDmg = Math.max(1, Math.floor(actualDmg * 0.85));
  if (target && typeof target.damageReductionMult === 'number')
    actualDmg = Math.max(1, Math.floor(actualDmg * clamp(target.damageReductionMult, 0.05, 1)));
  // Armor: per-piece type damage reduction (helmet=12%, chestplate=15%, leggings=8%)
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
  // Multiplier stacking cap: player attacks cannot exceed 3.5× the original hit value
  // (prevents Kratos rage + Spartan Rage + story powerLevel + map perk from compounding
  // into 5× damage — all legitimate bonuses still apply, just with a ceiling).
  if (attacker && !attacker.isBoss && !attacker.isTrueForm && _origDmg > 0) {
    actualDmg = Math.min(actualDmg, Math.round(_origDmg * 3.5));
  }
  // Parry vulnerability: target was parry-stunned — takes 1.5× damage while open
  if (target && target._parryVulnFrames > 0) {
    actualDmg = Math.max(1, Math.round(actualDmg * 1.5));
    spawnParticles(target.cx(), target.cy(), '#ffdd00', 8);
  }
  // Mirror Fracture ability: reflect 25% damage back to attacker while shielding.
  // Routed through dealDamage (isSplash=true, 0 i-frames) so death/finishers/online
  // sync apply; the !isSplash gate stops two reflect2 shields from ping-ponging.
  if (target && target.shielding && !isSplash && target.story2Abilities && target.story2Abilities.has('reflect2') && attacker && attacker !== target) {
    const reflectDmg = Math.max(1, Math.floor(actualDmg * 0.25));
    dealDamage(target, attacker, reflectDmg, 0, 1.0, true, 0);
    spawnParticles(attacker.cx(), attacker.cy(), '#00aaff', 6);
  }
  // Kratos: target being hit builds rage stacks
  if (target && target.charClass === 'kratos') {
    target.rageStacks = Math.min(30, (target.rageStacks || 0) + 1);
  }
  // KB scales with damage — heavier hits launch targets further
  let actualKb  = kbForce * (1 + actualDmg * 0.028);
  // Nexus defense mode: player hits send enemies flying further
  if (attacker && attacker._nexusKBBoost && target && !target._nexusKBBoost)
    actualKb = actualKb * 1.8;
  // Curse: target has curse_fragile — 1.5× KB received
  if (target && target.curses && target.curses.some(c => c.type === 'curse_fragile'))
    actualKb = actualKb * 1.5;
  // Post-teleport critical hit window — boss attacks player: crit bonus
  if (attacker && attacker.isBoss && attacker.postTeleportCrit > 0) {
    if (Math.random() < 0.65) {
      actualDmg = Math.round(actualDmg * 2.2);
      spawnParticles(target.cx(), target.cy(), '#ff8800', 18);
      spawnParticles(target.cx(), target.cy(), '#ffff00', 10);
    }
  }
  // Post-teleport crit — player hits boss during crit window: double dmg + stun
  if (attacker && !attacker.isBoss && target && target.isBoss && target.postTeleportCrit > 0) {
    actualDmg = Math.round(actualDmg * 2.0);
    target.stunTimer = Math.max(target.stunTimer || 0, 60);
    target.postTeleportCrit = 0; // consume the crit window on first hit
    spawnParticles(target.cx(), target.cy(), '#ffff00', 20);
    spawnParticles(target.cx(), target.cy(), '#00ffff', 12);
  }
  // Director intensity: heavier hits raise match intensity slightly.
  if (typeof directorAddIntensity === 'function') {
    directorAddIntensity(actualDmg * 0.02);
  }
  if (target.shielding) {
    const _stacks = Math.max(1, target.shieldStacks || 1);
    // Parry: only on fresh HP shield (stack 1); fires before damage absorption
    if (_stacks === 1 && attacker && !(attacker.stunTimer > 0) && !(attacker.isBoss && attacker.phase >= 3)) {
      const held = target.shieldHoldTimer || 0;
      const parryChance = held <= 8 ? 0.65 : held <= 15 ? 0.30 : 0;
      if (parryChance > 0 && Math.random() < parryChance) {
        attacker.stunTimer        = Math.max(attacker.stunTimer || 0, 90);
        attacker._parryVulnFrames = 90;
        spawnParticles(target.cx(),   target.cy(),   '#ffff00', 22);
        spawnParticles(target.cx(),   target.cy(),   '#ffffff', 12);
        spawnParticles(attacker.cx(), attacker.cy(), '#ff8800', 14);
        screenShake = Math.max(screenShake, 10);
        if (settings.dmgNumbers)
          damageTexts.push(new DamageText(target.cx(), target.y - 38, 'PARRY!', '#ffff00'));
        SoundManager.clang && SoundManager.clang();
        actualDmg = 0;
        actualKb  = 0;
      }
    }
    if (actualDmg > 0) {
      if (_stacks <= 3) {
        // HP-based shield: hit drains shieldHP; overflow passes through and breaks shield
        const _shHP = target.shieldHP || 0;
        if (actualDmg >= _shHP) {
          const _overflow = Math.max(0, actualDmg - _shHP);
          target.shieldHP        = 0;
          target.shielding       = false;
          target.shieldBroken    = true;
          target.shieldHoldTimer = 0;
          spawnParticles(target.cx(), target.cy(), '#ff8844', 14);
          SoundManager.clang && SoundManager.clang();
          actualDmg = _overflow;
          actualKb  = _overflow > 0 ? Math.floor(actualKb * 0.6) : 0;
        } else {
          target.shieldHP -= actualDmg;
          spawnParticles(target.cx(), target.cy(), '#88ddff', 6);
          actualDmg = 0;
          actualKb  = 0;
        }
      } else {
        // Percentage-based shield (stacks 4-6): reduce damage proportionally
        const _SHIELD_PASS = [0, 0, 0, 0, 0.20, 0.50, 0.80];
        const _passThrough = _stacks <= 6 ? _SHIELD_PASS[_stacks] : 1.00;
        actualDmg = Math.floor(actualDmg * _passThrough);
        actualKb  = Math.floor(actualKb * (0.15 + _passThrough * 0.5));
        const _shColor = _stacks === 4 ? '#88ddff' : _stacks === 5 ? '#ffaa44' : '#ff6644';
        spawnParticles(target.cx(), target.cy(), _shColor, 6);
      }
    }
  } else {
    target.hurtTimer = 8;
    // Hit confirmation flash: brief white overlay drawn over the target in the render loop
    target._hitFlashTimer = actualDmg >= 22 ? 5 : 3;
    // Variable hitstop: light 2-4f, medium 4-7f, heavy 8-11f, cosmic(boss) 11-14f
    // ±2 frame variance keeps each impact feeling distinct rather than metronomic.
    const _isCosmicHit = attacker && (attacker.isBoss || attacker.isTrueForm);
    const _hsVar = Math.round((Math.random() - 0.5) * 4); // ±2 frames
    if (!target.isBoss) {
      // Merge with any hitstop already set this frame (Math.max, not =) so a weak
      // simultaneous hit (splash/AoE) can't truncate a heavy hit's freeze.
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
      // Boss taking damage — lighter hitstop so boss doesn't feel stunned
      if (actualDmg >= 30) hitStopFrames = Math.max(hitStopFrames, 1, Math.min(5, Math.floor(actualDmg / 22) + (_hsVar > 1 ? 1 : 0)));
      else if (actualDmg >= 15) hitStopFrames = Math.max(hitStopFrames, _hsVar > 1 ? 3 : 2);
    }
    if (typeof setCameraDrama === 'function' && actualDmg > 22) {
      setCameraDrama('impact', 18);
    }
    // Slow-motion: cosmic hits always trigger; heavy hits on players trigger too
    if (!target.isBoss && slowMotion >= 0.9) {
      if (_isCosmicHit && actualDmg >= 22) {
        slowMotion = 0.25;
        hitSlowTimer = 18;
      } else if (actualDmg >= 30) {
        slowMotion = 0.32;
        hitSlowTimer = 14;
      }
    }
    // Camera zoom-in on heavy/cosmic hits
    if (actualDmg >= 18) camHitZoomTimer = _isCosmicHit ? 22 : 15;
    // Red vignette flash when a human player takes a heavy hit
    if (!target.isAI && !target.isBoss && actualDmg >= 15) {
      hitVignetteTimer = _isCosmicHit ? 28 : 18;
      hitVignetteColor = actualDmg >= 35 ? 'rgba(220,30,0,' : 'rgba(200,50,0,';
    }
    // Silence moment before cosmic hits registered (brief volume dip)
    if (_isCosmicHit && actualDmg >= 28 && typeof SoundManager !== 'undefined') {
      SoundManager._cosmicSilenceTimer = 8; // handled in SoundManager or gameLoop
    }
  }
  // Boss modifier: deals double KB, takes half KB
  if (attacker && attacker.kbBonus) actualKb = Math.round(actualKb * attacker.kbBonus);
  if (target.kbResist)  actualKb = Math.round(actualKb * target.kbResist);
  // Affinity feel: low affinity reduces KB output; high affinity slightly boosts it
  if (attacker && attacker.charClass && attacker.weapon && typeof CLASS_AFFINITY !== 'undefined') {
    const _affKb = CLASS_AFFINITY[attacker.charClass];
    if (_affKb) {
      const _affKbMult = _affKb[attacker.weapon.type] || 1.0;
      if (_affKbMult < 0.8) actualKb = Math.round(actualKb * 0.85);
      else if (_affKbMult > 1.2) actualKb = Math.round(actualKb * 1.12);
    }
  }

  // ── COMBO TRACKING: hitstun decay + auto-launch ─────────────────────────────
  // Track how many consecutive hits attacker has landed on target within 45 frames.
  // This is separate from TrueForm's _comboCount (which is boss-specific).
  if (attacker && !attacker.isBoss && !attacker.isTrueForm && target && !target.isBoss && typeof frameCount !== 'undefined') {
    const _fc = frameCount;
    // Reset counter when last hit was >45 frames ago (combo window expired)
    if (_fc - (attacker._comboLastFrame || 0) > 45) attacker._comboHitCount = 0;
    attacker._comboHitCount  = (attacker._comboHitCount  || 0) + 1;
    attacker._comboLastFrame = _fc;
    const _cn = attacker._comboHitCount;
    // Knockback scaling: each successive hit pushes target further (prevents re-hit loops)
    if (_cn > 1) {
      const _kbScale = Math.min(1.5, 1 + (_cn - 1) * 0.08);
      actualKb = Math.min(actualKb * _kbScale, 22);
    }
    // Auto-launch: 7+ hit combo forces a hard launcher; combo breaks naturally.
    // actualKb > 0 guard: a shielded/parried hit (KB zeroed above) must not launch.
    if (_cn >= 7 && actualKb > 0) {
      actualKb = Math.max(actualKb, 17);
    }
  }

  // ── PER-FRAME IMPULSE LIMIT ───────────────────────────────────────────────
  // If target was already knocked back this frame, reduce subsequent KB by 55%.
  // Prevents velocity stacking from AoE / multi-hit sources in one frame.
  if (typeof frameCount !== 'undefined') {
    if (target._kbAppliedFrame === frameCount) {
      actualKb = Math.round(actualKb * 0.45);
    } else {
      target._kbAppliedFrame = frameCount;
    }
  }

  // ── HARD KB CAP (before apply) ────────────────────────────────────────────
  // Normalize actualKb: non-boss hits capped at 20, boss/TF hits capped at 26.
  if (attacker && (attacker.isBoss || attacker.isTrueForm)) {
    actualKb = Math.min(actualKb, 26);
  } else {
    actualKb = Math.min(actualKb, 20);
  }

  // One-punch mode: training only — instantly kills on hit
  if (trainingMode && attacker && attacker.onePunchMode && !target.shielding) {
    actualDmg = target.health; // always lethal
  }
  // Hard cap: no single hit may remove more than 45% of a player's max HP,
  // or 25% of a boss's max HP (prevents broken scaling at 2000+ HP).
  // Exempt: one-punch training mode (handled above).
  if (!trainingMode || !(attacker && attacker.onePunchMode)) {
    const _maxHit = target.isBoss
      ? Math.floor((target.maxHealth || 100) * 0.25)
      : Math.floor((target.maxHealth || 100) * 0.45);
    if (actualDmg > _maxHit) actualDmg = _maxHit;
  }
  // Godslayer armor: 88% damage resistance during the Absolute Axiom encounter
  if (target.armorStyle === 'godslayer' && typeof gameMode !== 'undefined' && gameMode === 'absoluteaxiom') {
    actualDmg = Math.max(1, Math.round(actualDmg * 0.12));
  }
  // Soccer: players take no health damage but still feel KB/stun
  if (gameMode === 'minigames' && minigameType === 'soccer') actualDmg = 0;
  // Online: if attacker is local and target is remote, send hit event to server
  // The remote client will apply the damage to themselves
  if (onlineMode && attacker && !attacker.isRemote && target && target.isRemote) {
    NetworkManager.sendHit(actualDmg, actualKb, actualKb > 0 ? (target.cx() > attacker.cx() ? 1 : -1) : 0);
  }
  target.health    = Math.max(0, target.health - actualDmg);
  if (attacker && actualDmg > 0) attacker.totalDamageDealt = (attacker.totalDamageDealt || 0) + actualDmg;
  if (actualDmg > 0 && !target.isBoss) target._damageAccumThisLife = (target._damageAccumThisLife || 0) + actualDmg;
  // God Phase 1 crash: fires once on the first successful hit against a human player.
  // Deferred via setTimeout so the current game-loop iteration completes before the
  // overlay halts execution — avoids mid-frame teardown.
  if (attacker && attacker._isGod && !attacker._consoleSummoned && !attacker._crashFired &&
      target && !target.isMinion && !target.isAI && !target.isBoss && !target.isRemote) {
    attacker._crashFired = true;
    if (typeof godDefeated === 'undefined' || !godDefeated) {
      setTimeout(function () { if (typeof _showGodFakeCrash === 'function') _showGodFakeCrash(); }, 0);
    }
  }
  // Finisher intercept: if this is a killing blow, try to trigger a finisher animation
  if (target.health <= 0 && attacker && typeof triggerFinisher === 'function') {
    triggerFinisher(attacker, target); // sets health=1 + invincible=9999 internally if it fires
  }
  // True Form combo damage tracking
  if (attacker && attacker.isTrueForm && !target.isBoss) {
    attacker._comboDamage = (attacker._comboDamage || 0) + actualDmg;
  }
  if (attacker && !attacker.isAI && attacker.weapon && attacker.weapon.type === 'ranged' && target && target.isTrueForm) {
    target._antiRangedStats = target._antiRangedStats || { projectiles: 0, rangedDamage: 0, farTicks: 0 };
    target._antiRangedStats.rangedDamage = Math.min(999, (target._antiRangedStats.rangedDamage || 0) + actualDmg);
  }
  // Wall-combo escape: if TrueForm is hit 3+ times quickly while near a boundary, trigger escape
  if (target && target.isTrueForm && attacker && !attacker.isBoss && !attacker.isTrueForm &&
      target.invincible <= 0 && !target.godmode) {
    target._wallComboTimer = target._wallComboTimer || 0;
    target._wallComboHits  = target._wallComboHits  || 0;
    // Reset counter when the window expires (90 frames ≈ 1.5 s)
    if (target._wallComboTimer <= 0) target._wallComboHits = 0;
    target._wallComboHits++;
    target._wallComboTimer = 90; // refresh window
    const _nearLeft  = target.x < 80;
    const _nearRight = target.x + target.w > GAME_W - 80;
    if (target._wallComboHits >= 3 && (_nearLeft || _nearRight)) {
      // Trigger escape: teleport to center + brief invulnerability
      target._wallComboHits  = 0;
      target._wallComboTimer = 0;
      // Choose escape destination: center of arena, with slight vertical lift
      const _escX = GAME_W / 2 - target.w / 2 + (Math.random() - 0.5) * 120;
      const _escY  = GAME_H * 0.35;
      target.x  = Math.max(20, Math.min(GAME_W - target.w - 20, _escX));
      target.y  = _escY;
      target.vx = 0;
      target.vy = -6;
      // Brief invulnerability (~0.4 s = 24 frames at 60 fps)
      target.invincible = Math.max(target.invincible, 24);
      spawnParticles(target.cx(), target.cy(), '#ffffff', 20);
      spawnParticles(target.cx(), target.cy(), '#aa00ff', 14);
    }
  }
  target.invincible = target.invincible > hitInvincibleFrames ? target.invincible : hitInvincibleFrames; // preserve finisher lock
  const dir        = attacker ? (target.cx() > attacker.cx() ? 1 : -1) : 1;
  if (!target.godmode) {
    target.vx      = dir * actualKb;
    target.vy      = -actualKb * 0.55;
    if (currentArena && currentArena.isLowGravity)  target.vy = -actualKb * 0.25;
    if (currentArena && currentArena.isHeavyGravity) target.vy = -actualKb * 0.75;
    // Hard velocity cap applied immediately — fighter.update() also clamps but
    // runs next frame; this prevents fling glitch from same-frame stacking.
    target.vx = clamp(target.vx, -18, 18);
    target.vy = clamp(target.vy, -18, 18);
    // Directional impact nudge: brief cosmetic draw-offset that decays over 4 frames.
    // Purely visual — does not affect hitboxes, physics, or online sync.
    if (!target.shielding) {
      target._hitNudge = { x: dir * Math.min(4, 2 + Math.floor(actualDmg / 15)), t: 4 };
    }
  }
  if (settings.screenShake) {
    // Scale shake with actual damage: light hits barely move, heavy hits punch hard
    const _shakeBase = target.shielding ? 2 : Math.min(18, 4 + Math.floor(actualDmg / 5));
    screenShake = Math.max(screenShake, _shakeBase);
  }
  // Sound feedback — environmental damage (attacker===null: storm, lava, void) skips the
  // combat hit sound; the burst of simultaneous env hits each frame would otherwise cause
  // horrible audio overload, especially in BR mode where 99 fighters share the same tick.
  if (target.shielding) SoundManager.clang();
  else if (attacker) {
    // Per-archetype melee hit sound from the swing grammar (weapon identity rework);
    // falls back to the damage-tiered hit/heavyHit for everything else
    const _hsG = (typeof WEAPON_SWINGS !== 'undefined' && attacker.weaponKey &&
                  attacker.weapon && attacker.weapon.type === 'melee')
      ? WEAPON_SWINGS[attacker.weaponKey] : null;
    const _hs = _hsG && _hsG.hitSound;
    if      (_hs === 'blunt'  && SoundManager.hitBlunt)  SoundManager.hitBlunt();
    else if (_hs === 'pierce' && SoundManager.hitPierce) SoundManager.hitPierce();
    else if (_hs === 'snap'   && SoundManager.hitSnap)   SoundManager.hitSnap();
    else if (_hs === 'zap'    && SoundManager.hitZap)    SoundManager.hitZap();
    else if (_hs === 'clang')                            SoundManager.clang();
    else if (actualDmg >= 30) SoundManager.heavyHit();
    else SoundManager.hit();
    // Heavy hits keep their extra weight on top of the archetype sound
    if (_hs && actualDmg >= 30) SoundManager.heavyHit();
  }
  // Blood spray — only on real entity hits, not shields or splash or environment
  if (!target.shielding && !isSplash && attacker && !target.isBoss &&
      actualDmg > 0 && typeof spawnBlood === 'function') {
    const _bDir = target.cx() > attacker.cx() ? 1 : -1;
    spawnBlood(target.cx(), target.cy() - 4, _bDir, actualDmg);
  }

  // Achievement / progression tracking — skip if attacker is using a custom weapon
  const _attackerHasCustomWeapon = attacker && attacker.weapon && typeof attacker.weapon._isCustom === 'boolean' && attacker.weapon._isCustom;
  if (!target.shielding && !_attackerHasCustomWeapon) {
    // Track damage taken by human players
    if (!target.isAI && !target.isBoss) _achStats.damageTaken += actualDmg;
    // Track ranged damage dealt by human players
    if (attacker && !attacker.isAI && attacker.weapon && attacker.weapon.type === 'ranged')
      _achStats.rangedDmg += actualDmg;
    // Consecutive hit tracking
    if (attacker && !attacker.isAI) {
      _achStats.consecutiveHits++;
      if (_achStats.consecutiveHits >= 5) unlockAchievement('combo_king');
    }
    if (target && !target.isAI) _achStats.consecutiveHits = 0; // enemy hit resets human combo
    // Bot kill / PvP damage tracking
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
  // !isSplash: chain explosions must not re-chain off their own splash hits
  if (!target.shielding && !isSplash && gameMode === 'minigames' && currentChaosModifiers.has('explosive')) {
    spawnParticles(target.cx(), target.cy(), '#ff8800', 16);
    spawnParticles(target.cx(), target.cy(), '#ffdd44', 10);
    // Chain explosion: small AoE to nearby fighters
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
  if (!target.shielding) {
    _spawnWeaponHitFX(attacker, target, actualDmg);
    // Chance-based stun / ragdoll (not guaranteed; boss is harder to ragdoll)
    const ragdollChance = target.kbResist ? 0.30 * target.kbResist : 0.30;
    const MAX_STUN = 90; // cap at 1.5s
    if (actualKb >= 16 && Math.random() < ragdollChance) {
      target.ragdollTimer = Math.min(70, Math.round((26 + Math.floor(actualKb * 1.6)) * stunMult));
      target.stunTimer    = Math.min(MAX_STUN, Math.round((target.ragdollTimer + 16) * stunMult));
      // Assign angular momentum for ragdoll spin
      target.ragdollSpin  = dir * (0.12 + Math.random() * 0.10);
    } else if (actualKb >= 8 && Math.random() < 0.45) {
      target.stunTimer    = Math.min(MAX_STUN, Math.round((18 + Math.floor(actualKb * 1.1)) * stunMult));
    }
    // ── HITSTUN DECAY: each successive combo hit reduces stun duration ────────
    // Prevents indefinite hitstun chains from rapid melee.
    // Minimum floor (8) ensures attacks still feel responsive.
    if (attacker && !attacker.isBoss && !attacker.isTrueForm && attacker._comboHitCount > 1 && target.stunTimer > 0) {
      const _decayFactor = Math.max(0.28, 1 - (attacker._comboHitCount - 1) * 0.08);
      target.stunTimer    = Math.max(8, Math.floor(target.stunTimer * _decayFactor));
      if (target.ragdollTimer > 0)
        target.ragdollTimer = Math.max(6, Math.floor(target.ragdollTimer * _decayFactor));
    }
    // ── AIR ESCAPE WINDOW: high combo + airborne → reduce invincibility frames ─
    // Gives the defending player an earlier escape window while airborne.
    if (attacker && attacker._comboHitCount >= 5 && !target.onGround && !target.isBoss) {
      target.invincible = Math.max(target.invincible, Math.round(hitInvincibleFrames * 1.5));
    }
    // Per-limb spring reaction
    if (target._rd) {
      const impactX = attacker ? attacker.cx() : target.cx();
      const impactY = attacker ? attacker.cy() : target.cy();
      PlayerRagdoll.applyHit(target, dir * actualKb, -actualKb * 0.55, impactX, impactY);
    }
  }
  // Super charges for the attacker; gun charges faster via superRateBonus
  // Super move itself doesn't charge the next super (prevents instant refill)
  if (attacker && !attacker.superActive) {
    const superRate = (attacker.superChargeRate || 1) * (attacker.weapon && attacker.weapon.superRateBonus || 1);
    let _superGain = Math.floor(actualDmg * 0.70 * superRate);
    // Q-ability super cap: max 28 meter points per Q activation (≈28% super)
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
  // Target also gains super from taking damage (half of what attacker gained)
  if (target && !target.superActive && !target.isBoss) {
    const _targetSuperGain = Math.floor(actualDmg * 0.35);
    const _tPrev = target.superReady;
    target.superMeter = Math.min(100, target.superMeter + _targetSuperGain);
    if (!_tPrev && target.superMeter >= 100) {
      target.superReady      = true;
      target.superFlashTimer = 90;
    }
  }
  if (settings.dmgNumbers) damageTexts.push(new DamageText(target.cx(), target.y, actualDmg, target.shielding ? '#88ddff' : '#ffdd00'));
  // Weapon splash — axe (large) and gun (small) deal AoE to nearby targets
  if (!isSplash && !target.shielding && attacker && attacker.weapon && attacker.weapon.splashRange) {
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

