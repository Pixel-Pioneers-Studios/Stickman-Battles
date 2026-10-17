'use strict';
// WEAPONS, WEAPON_KEYS, CLASSES, CLASS_AFFINITY, descriptions.
// Depends on: smb-globals.js, smb-particles.js (spawnParticles, dealDamage).
// Must load after smb-data-arenas.js.

// abilityDmgMult / superDmgMult (optional): scale every hit of the Q / E,
// including its projectiles, in dealDamage().
const WEAPONS = {
  sword: {
    // All-rounder: fast, mobile, reliable.
    name: 'Sword',   damage: 14, range: 84, cooldown: 38, endlag: 11,
    kb: 10, superDmgMult: 0.9,          abilityCooldown: 240, type: 'melee', weaponType: 'light', color: '#cccccc',
    abilityName: 'Blade Storm',
    ability(user, _target) {
      // 4 crescent arcs burst outward in all directions.
      if (!user._swordSlashes) user._swordSlashes = [];
      const _bsDirs = [
        { vx: user.facing * 10,  vy: -0.5, tilt:  user.facing * 0.28 },
        { vx: -user.facing * 10, vy: -0.5, tilt: -user.facing * 0.28 },
        { vx: user.facing * 3,   vy: -10,  tilt:  Math.PI * 0.42 },
        { vx: user.facing * 3,   vy:  10,  tilt: -Math.PI * 0.42 },
      ];
      // One hitSet for the burst and all four arcs, so a point-blank target
      // is not hit twice.
      const _bsHit = new Set();
      for (const d of _bsDirs) {
        user._swordSlashes.push({ x: user.cx(), y: user.cy(),
          vx: d.vx, vy: d.vy, tilt: d.tilt, facing: user.facing,
          life: 22, maxLife: 22, size: 26, color: '#88ccff', hitSet: _bsHit });
      }
      spawnParticles(user.cx(), user.cy(), '#88ccff', 18);
      spawnRing(user.cx(), user.cy());
      screenShake = Math.max(screenShake, 14);
      const _bsAll = [...players, ...trainingDummies, ...minions];
      for (const f of _bsAll) {
        if (f === user || f.health <= 0) continue;
        if (dist(user, f) < 95) {
          _bsHit.add(f);
          dealDamage(user, f, 24, 14);
          spawnParticles(f.cx(), f.cy(), '#aaddff', 8);
        }
      }
    }
  },
  hammer: {
    // Crusher: slow, heavy knockback. Forces commitment.
    name: 'Hammer',  damage: 24, range: 72, cooldown: 54, endlag: 18,
    kb: 16,          abilityCooldown: 230, abilityDmgMult: 0.75, superDmgMult: 1.6, type: 'melee', weaponType: 'heavy', color: '#888888',
    abilityName: 'Ground Shockwave',
    ability(user, _target) {
      // Slam the hammer down. The shockwave travels horizontally from the impact point
      if (user._hammerShock) return;
      user._hammerShock = {
        x:      user.cx() + user.facing * 24,
        y:      user.y + user.h,
        vx:     user.facing * 9,
        timer:  55,
        hitSet: new Set(),
      };
      screenShake = Math.max(screenShake, 24);
      if (typeof spawnImpact === 'function') spawnImpact(user.cx(), user.y + user.h, 1.8, { shake: 0 });
      spawnParticles(user.cx(), user.y + user.h, '#ffcc44', 18);
      spawnParticles(user.cx(), user.cy(), '#ffaa00', 8);
      spawnRing(user.cx(), user.y + user.h);
    }
  },
  gun: {
    // Harasser: reliable ranged poke. Rewards keeping distance.
    name: 'Gun',     damage: 9, range: 600, cooldown: 22, endlag: 6,
    damageFunc: () => Math.floor(Math.random() * 3) + 12,
    superRateBonus: 1.2,
    splashRange: 38, splashDmgPct: 0.30,
    clipSize: 12, reloadFrames: 60,
    kb: 9,           abilityCooldown: 200, abilityDmgMult: 1.6, type: 'ranged', weaponType: 'ranged', color: '#666666',
    abilityName: 'Burst Shot',
    ability(user, _target) {
      // 3-round burst in a tight vertical fan.
      user._qHitCount = 0;
      user._qSuperCapRemaining = 10; // max 10% super per activation
      const offsets = [-0.55, 0, 0.55];
      for (let i = 0; i < 3; i++) {
        combatAfter(i * 4, () => {
          if (!gameRunning || user.health <= 0) return;
          const _p = spawnBullet(user, 9, '#ffdd00', 7);
          if (_p) {
            _p._isQAbility = true;
            _p.vy += offsets[i];
          }
        });
      }
      combatAfter(24, () => { user._qSuperCapRemaining = undefined; });
    }
  },
  axe: {
    // Spinner: mid-range AoE. Trades raw damage for coverage.
    // Spin Attack is both an escape and an attack.
    name: 'Axe',     damage: 19, range: 98, cooldown: 46, endlag: 16,
    splashRange: 70, splashDmgPct: 0.30,
    kb: 10,          abilityCooldown: 180, type: 'melee', weaponType: 'heavy', color: '#cc4422',
    abilityName: 'Rising Cleave',
    ability(user, target) {
      user.spinning = 35;
      spawnRing(user.cx(), user.cy());
      spawnParticles(user.cx(), user.cy(), '#ff8833', 14);
      screenShake = Math.max(screenShake, 12);
      if (dist(user, target) < 110) {
        dealDamage(user, target, 16, 11);
        spawnParticles(target.cx(), target.cy(), '#ff6622', 10);
      }
    }
  },
  spear: {
    // Poker: longest melee reach. Ground Spike punishes rushers up close.
    name: 'Spear',   damage: 15, range: 130, cooldown: 42, endlag: 13,
    kb: 7,           abilityCooldown: 165, superDmgMult: 1.4, type: 'melee', weaponType: 'light', color: '#8888ff',
    abilityName: 'Ground Spike',
    ability(user, _target) {
      screenShake = Math.max(screenShake, 18);
      spawnRing(user.cx(), user.y + user.h);
      spawnParticles(user.cx(), user.y + user.h, '#8888ff', 18);
      // Vertical spike arcs erupt from the ground around the user.
      if (!user._swordSlashes) user._swordSlashes = [];
      for (let _si = -1; _si <= 1; _si++) {
        user._swordSlashes.push({
          x: user.cx() + _si * 44, y: user.y + user.h - 8,
          vx: _si * 1.2, vy: -5,
          tilt: Math.PI * 0.5, facing: 1,
          life: 22, maxLife: 22, size: 28, color: '#aaaaff', hitSet: new Set()
        });
      }
      const _spAll = [...players, ...trainingDummies, ...minions];
      for (const f of _spAll) {
        if (f === user || f.health <= 0) continue;
        if (dist(user, f) < 130) {
          dealDamage(user, f, 20, 6);
          applyLaunch(user, f, -20); // governed, not a raw .vy write
          spawnParticles(f.cx(), f.cy(), '#aaaaff', 10);
        }
      }
    }
  },
  bow: {
    // Sniper: highest single-shot ranged damage. Slow fire rate.
    name: 'Bow',  damage: 0, range: 700, cooldown: 40, endlag: 4,
    damageFunc: () => Math.floor(16 + Math.random() * 6),
    clipSize: 4, reloadFrames: 70,
    kb: 14,       abilityCooldown: 185, type: 'ranged', weaponType: 'ranged', color: '#aad47a',
    requiresClass: 'archer',
    abilityName: 'Triple Shot',
    ability(user, _target) {
      user._qHitCount = 0;
      user._qSuperCapRemaining = 28;
      const angles = [-0.22, 0, 0.22];
      for (let i = 0; i < 3; i++) {
        const dmg = user.weapon.damageFunc();
        const speed = 13;
        const vx = user.facing * speed * Math.cos(angles[i]);
        const vy = speed * Math.sin(angles[i]);
        const _p = new Projectile(user.cx() + user.facing * 12, user.y + 22, vx, vy, user, dmg, '#aad47a');
        _p._isQAbility = true;
        _p._isArrow    = true;
        projectiles.push(_p);
      }
      combatAfter(24, () => { user._qSuperCapRemaining = undefined; });
    }
  },
  shield: {
    // Wall: lowest damage, highest block and pushback. Wins by shoving enemies off platforms.
    name: 'Shield', damage: 18, range: 68, cooldown: 31, endlag: 9,
    kb: 26,         abilityCooldown: 195, abilityDmgMult: 1.9, type: 'melee', weaponType: 'heavy', color: '#88aaff',
    requiresClass: 'paladin',
    contactDmgMult: 0,
    abilityName: 'Shield Bash',
    ability(user, target) {
      // Shockwave pulse at the shield face, visible even on a whiff.
      spawnRing(user.cx() + user.facing * 28, user.cy());
      spawnParticles(user.cx() + user.facing * 28, user.cy(), '#aaccff', 12);
      screenShake = Math.max(screenShake, 12);
      if (dist(user, target) < 105) {
        target.vx  = user.facing * 26;
        target.stunTimer = Math.max(target.stunTimer || 0, 12);
        dealDamage(user, target, 12, 22);
        spawnParticles(target.cx(), target.cy(), '#88aaff', 14);
        spawnParticles(target.cx(), target.cy(), '#ffffff', 6);
        spawnRing(target.cx(), target.cy());
        screenShake = Math.max(screenShake, 20);
      }
    }
  },
  scythe: {
    // Sustainer: wide sweep with lifesteal. Weaker 1v1, stronger vs groups.
    name: 'Scythe', damage: 15, range: 100, cooldown: 36, endlag: 13,
    splashRange: 60, splashDmgPct: 0.35,
    kb: 8,           abilityCooldown: 195, superDmgMult: 1.5, type: 'melee', weaponType: 'light', color: '#aa44aa',
    abilityName: 'Scythe Toss',
    ability(user, _target) {
      // Hurl the scythe forward. It flies out, spins back, and hits both ways.
      // No lifesteal on the throw; lifesteal is only on base and E.
      if (user._scytheToss) return;
      user._scytheToss = {
        x:            user.cx() + user.facing * 18,
        y:            user.cy(),
        vx:           user.facing * 13,
        vy:           -2.5,
        timer:        45,
        returning:    false,
        hitSetGo:     new Set(),
        hitSetReturn: new Set(),
        angle:        0,
      };
      spawnParticles(user.cx(), user.cy(), '#aa44aa', 14);
      spawnParticles(user.cx(), user.cy(), '#cc66cc', 6);
    }
  },
  fryingpan: {
    // Stunner: slow, but a hit opens a stun window for a follow-up combo.
    name: 'Frying Pan', damage: 22, range: 65, cooldown: 46, endlag: 15,
    kb: 12,              abilityCooldown: 220, superDmgMult: 1.6, type: 'melee', weaponType: 'heavy', color: '#ccaa44',
    abilityName: 'Ground Pound',
    ability(user, _target) {
      // Overhead pan slam: radial ground shockwave that launches everyone nearby upward.
      user.vy = -7;
      screenShake = Math.max(screenShake, 18);
      spawnRing(user.cx(), user.y + user.h);
      spawnParticles(user.cx(), user.y + user.h, '#ffdd66', 20);
      spawnParticles(user.cx(), user.cy(), '#ffaa44', 10);
      const _panAll = [...players, ...trainingDummies, ...minions];
      for (const f of _panAll) {
        if (f === user || f.health <= 0) continue;
        const _panDist = dist(user, f);
        if (_panDist < 150) {
          dealDamage(user, f, 24, 10);
          const _panDir = f.cx() > user.cx() ? 1 : -1;
          f.vx += _panDir * 6;
          applyLaunch(user, f, -18);
          f.stunTimer = Math.max(f.stunTimer || 0, 20);
          spawnParticles(f.cx(), f.cy(), '#ffdd66', 12);
        }
      }
    }
  },
  broomstick: {
    // Pusher: long reach, extreme knockback. Wins by edgeguarding.
    name: 'Broomstick', damage: 12, range: 105, cooldown: 36, endlag: 8,
    kb: 18,              abilityCooldown: 190, type: 'melee', weaponType: 'light', color: '#aa8855',
    abilityName: 'Broom Ride',
    ability(user, _target) {
      // Leap onto the broom and rocket through the air as an aerial body-check.
      if (user._broomRide) return;
      user._broomRide = { timer: 22, hitSet: new Set() };
      user.vx = user.facing * 28;
      user.vy = -18;
      spawnParticles(user.cx(), user.cy(), '#cc9966', 14);
      spawnParticles(user.cx(), user.cy(), '#ffdd88', 6);
      screenShake = Math.max(screenShake, 10);
    }
  },
  combat: {
    // Combat fighter: fast strikes and a crowd-clearing kick. Must get close.
    // Roundhouse is the answer to a crowd, since the fists are single-target.
    name: 'Combat', damage: 20, range: 60, cooldown: 20, endlag: 5,
    kb: 4, lunge: 3.6,           abilityCooldown: 180, abilityDmgMult: 1.8, superDmgMult: 1.0, type: 'melee', weaponType: 'light', color: '#ee3333',
    abilityName: 'Roundhouse',
    ability(user) {
      // Spinning kick: hits every close hostile on both sides once, knocking them outward.
      user.spinning = 20;
      const _all = [...players, ...minions, ...trainingDummies];
      for (const f of _all) {
        if (!isHostileTarget(user, f)) continue;
        if (Math.abs(f.cx() - user.cx()) < 95 && Math.abs(f.cy() - user.cy()) < 70) {
          dealDamage(user, f, 14, 12);
          spawnParticles(f.cx(), f.cy(), user.color || '#ffffff', 8);
        }
      }
      spawnRing(user.cx(), user.cy());
      spawnParticles(user.cx(), user.cy(), user.color || '#ffffff', 10);
      screenShake = Math.max(screenShake, 8);
    }
  },
  peashooter: {
    // Fastest fire rate. Each shot is weak but relentless.
    name: 'Pea Shooter', damage: 0, range: 700, cooldown: 12, endlag: 5,
    damageFunc: () => 8 + Math.floor(Math.random() * 2),
    bulletSpeed: 15, bulletColor: '#44cc44',
    clipSize: 18, reloadFrames: 60,
    kb: 3,               abilityCooldown: 120, abilityDmgMult: 2.0, superDmgMult: 1.6, type: 'ranged', weaponType: 'ranged', color: '#44cc44',
    abilityName: 'Pea Storm',
    ability(user, _target) {
      user._qHitCount = 0;
      user._qSuperCapRemaining = 28;
      // Capture now: the weapon can change mid-burst (BR loot swap, creature form).
      const _dmgFn = user.weapon.damageFunc;
      for (let i = 0; i < 9; i++) {
        combatAfter(i * 4, () => {
          if (!gameRunning || user.health <= 0) return;
          const angle = (Math.random() - 0.5) * 0.28;
          const spd   = 13 + Math.random() * 3;
          const _p = new Projectile(
            user.cx() + user.facing * 12, user.y + 22,
            user.facing * spd * Math.cos(angle), spd * Math.sin(angle),
            user, _dmgFn(), '#44cc44'
          );
          _p._isQAbility = true;
          projectiles.push(_p);
        });
      }
      combatAfter(48, () => { user._qSuperCapRemaining = undefined; });
    }
  },
  slingshot: {
    // Arc sniper: highest per-shot ranged damage. The arc demands prediction.
    name: 'Slingshot', damage: 0, range: 650, cooldown: 30, endlag: 5,
    damageFunc: () => 17 + Math.floor(Math.random() * 4),
    bulletSpeed: 13, bulletColor: '#ff9933', bulletVy: -1.5,
    clipSize: 6, reloadFrames: 60,
    kb: 10,            abilityCooldown: 230, superDmgMult: 1.4, type: 'ranged', weaponType: 'ranged', color: '#cc8833',
    abilityName: 'Mortar Stone',
    ability(user, target) {
      // Mortar arc: launch steeply up, then crash down onto the target.
      // The shell has its own gravity (0.5 vs 0.08): at 0.08 it was still
      // climbing when it expired. Apex is 160px over the higher fighter.
      const _G = 0.5;
      const _sx = user.cx() + user.facing * 12, _sy = user.y + 14;
      const _ty = target ? target.y + target.h * 0.5 : _sy;
      const _apexY = Math.max(24, Math.min(_sy, _ty) - 160);
      const _VY = -Math.min(17, Math.sqrt(2 * _G * Math.max(40, _sy - _apexY)));
      let _vx = user.facing * 5;
      if (target && typeof target.cx === 'function') {
        const _dy = _ty - _sy;
        // y(t) = VY*t + G*t*(t-1)/2  (position steps before gravity each frame)
        const _a = _G / 2, _b = _VY - _G / 2;
        const _T = Math.max(20, (-_b + Math.sqrt(Math.max(0, _b * _b + 4 * _a * _dy))) / (2 * _a));
        const _tx = target.cx() + (target.vx || 0) * _T * 0.5;
        _vx = Math.max(-9, Math.min(9, (_tx - _sx) / _T));
      }
      const proj = new Projectile(
        _sx, _sy,
        _vx, _VY, // steep upward launch
        user, 28, '#ff6600'
      );
      proj._gravity = _G;
      proj._burstOnLand = true;
      // Falls through platforms above the target's feet, so a roof does not stop it.
      proj._landY = target ? target.y + target.h - 12 : -Infinity;
      proj.life = 180;
      proj.splashRange = 65;
      proj.dmg = 28;
      proj.color = '#ff6600';
      projectiles.push(proj);
      spawnParticles(user.cx(), user.y + 14, '#ff9933', 12);
      spawnParticles(user.cx(), user.y + 14, '#ffcc44', 6);
    }
  },
  paperairplane: {
    // Trickster: unpredictable arcs. The barrage forces dodging.
    name: 'Paper Airplane', damage: 0, range: 800, cooldown: 44, endlag: 8,
    damageFunc: () => 8 + Math.floor(Math.random() * 4),
    bulletSpeed: 7, bulletColor: '#aaccff', bulletVy: -0.5,
    clipSize: 4, reloadFrames: 80,
    kb: 6,                  abilityCooldown: 160, type: 'ranged', weaponType: 'ranged', color: '#ddeeff',
    abilityName: 'Paper Barrage',
    ability(user, _target) {
      const _dmgFn = user.weapon.damageFunc; // weapon can change mid-barrage
      for (let i = 0; i < 5; i++) {
        combatAfter(i * 7, () => {
          if (!gameRunning || user.health <= 0) return;
          const angle = (Math.random() - 0.5) * 0.55;
          const _pp = new Projectile(
            user.cx() + user.facing * 12, user.y + 20,
            user.facing * (8 + Math.random() * 5) * Math.cos(angle),
            (8 + Math.random() * 5) * Math.sin(angle) - 2,
            user, _dmgFn(), '#aaccff'
          );
          _pp._isPaperPlane = true;
          projectiles.push(_pp);
        });
      }
    }
  },
  flail: {
    // Swinger: heavy and delayed. Chain Yank double-hits if you stay in range.
    name: 'Flail',   damage: 24, range: 70, cooldown: 52, endlag: 18,
    kb: 18,          abilityCooldown: 200, superDmgMult: 2.0, type: 'melee', weaponType: 'heavy', color: '#aaaaaa',
    abilityName: 'Chain Yank',
    ability(user, _target) {
      if (user._flailBall) return;
      user._flailBall = {
        x: user.cx() + user.facing * 20,
        y: user.cy(),
        vx: user.facing * 9,
        vy: -2,
        timer: 35,
        returning: false,
        hitSet: new Set(),
      };
      user.vx -= user.facing * 4;
      spawnParticles(user.cx() + user.facing * 20, user.cy(), '#ffffff', 8);
      spawnParticles(user.cx(), user.cy(), '#aaaaaa', 8);
      screenShake = Math.max(screenShake, 10);
    }
  },

  whip: {
    // Zoner: long reach with a sweet spot. The lash hits hard only at the crack
    // point, the last third of the cord. Spacing is the damage stat.
    name: 'Whip',    damage: 11, range: 125, cooldown: 40, endlag: 13,
    kb: 7, superDmgMult: 0.85,           abilityCooldown: 270, type: 'melee', weaponType: 'light', color: '#cc8833',
    // Sweet-spot tuning, read by the whip branch of the melee resolver in smb-fighter.js.
    // Max reach (_meleeReachDist) is about 124, so 90 leaves the outer quarter as the sweet spot.
    crackDist: 90,   // horizontal gap (px) at or past which a hit is a tip crack
    crackMult: 1.2,  // damage multiplier on a crack
    hookMult:  1.25, // extra multiplier while the target is hooked by the lasso
    bleedDmg:  2,    // damage per bleed tick
    bleedTicks: 3,   // ticks from a body hit (a crack applies 5)
    abilityName: 'Lasso',
    ability(user, _target) {
      // Lasso the nearest enemy, yank them in, and stun. Hooked targets take crack hits until it wears off.
      const _wAll = [...players, ...trainingDummies, ...minions];
      let _wTgt = null, _wTgtDist = 999;
      for (const f of _wAll) {
        if (f === user || f.health <= 0) continue;
        if (typeof isHostileTarget === 'function' && !isHostileTarget(user, f)) continue;
        const _wd = dist(user, f);
        if (_wd < 280 && _wd < _wTgtDist) { _wTgt = f; _wTgtDist = _wd; }
      }
      if (_wTgt) {
        const _wdx = user.cx() - _wTgt.cx();
        const _wdy = (user.y + user.h * 0.5) - (_wTgt.y + _wTgt.h * 0.5);
        const _wlen = Math.hypot(_wdx, _wdy) || 1;
        _wTgt.stunTimer = Math.max(_wTgt.stunTimer || 0, 22);
        _wTgt._whipSlow = 22;
        _wTgt._whipHooked = 90;           // 1.5s, shorter than the cooldown or the hook never drops
        _wTgt._whipHookSrc = user;
        dealDamage(user, _wTgt, 24, 0);
        // dealDamage writes knockback velocity, so the yank must come after it.
        _wTgt.vx = (_wdx / _wlen) * 28;
        _wTgt.vy = (_wdy / _wlen) * 18;
        if (typeof user._whipApplyBleed === 'function') user._whipApplyBleed(_wTgt, true);
        spawnParticles(_wTgt.cx(), _wTgt.cy(), '#cc8833', 14);
        spawnParticles(_wTgt.cx(), _wTgt.cy(), '#ffcc44', 8);
        user._whipCrack = { x: _wTgt.cx(), y: _wTgt.cy(), timer: 16, big: true };
        user._whipRope  = { tx: _wTgt.cx(), ty: _wTgt.cy(), timer: 30, isLasso: true, tgt: _wTgt };
        screenShake = Math.max(screenShake, 10);
      } else {
        const _tipX = user.cx() + user.facing * 220;
        user._whipCrack = { x: _tipX, y: user.cy(), timer: 8 };
        spawnParticles(_tipX, user.cy(), '#cc8833', 8);
      }
    }
  },

  boomerang: {
    // Returner: Q/E come back. The outgoing throw baits a dodge, the return punishes it.
    name: 'Boomerang', damage: 0, range: 650, cooldown: 34, endlag: 8,
    damageFunc: () => 13 + Math.floor(Math.random() * 4),
    bulletSpeed: 10, bulletColor: '#cc9944',
    clipSize: 4, reloadFrames: 85,
    kb: 8,             abilityCooldown: 175, superDmgMult: 1.8, type: 'ranged', weaponType: 'ranged', color: '#cc9944',
    abilityName: 'Orbit Guard',
    ability(user, _target) {
      // Boomerang orbits the user as a spinning shield, hitting anyone who enters its radius.
      if (user._boomOrbit) return;
      user._boomOrbit = {
        angle:  0,
        timer:  90,
        r:      74,
        hitCd:  new Map(),
        ballX:  user.cx(),
        ballY:  user.cy(),
      };
      spawnParticles(user.cx(), user.cy(), '#cc9944', 12);
      spawnRing(user.cx(), user.cy());
    }
  },

  katana: {
    // Precision blade: fast light melee. Iaijutsu does 2x damage from standing still.
    name: 'Katana',  damage: 13, range: 98, cooldown: 52, endlag: 11,
    kb: 8,           abilityCooldown: 230, type: 'melee', weaponType: 'light', color: '#888899',
    abilityName: 'Iaijutsu',
    ability(user, target) {
      const _still = Math.abs(user.vx) < 2 && Math.abs(user.vy) < 2;
      const _dmg   = _still ? 28 : 22;
      const _kb    = _still ? 20 : 10;
      if (_still) {
        spawnParticles(user.cx(), user.cy(), '#ffffff', 18);
        spawnParticles(user.cx(), user.cy(), '#aaaaff', 10);
        screenShake = Math.max(screenShake, 22);
      }
      if (!_still) user.vx = user.facing * 10;
      if (dist(user, target) < 130) {
        dealDamage(user, target, _dmg, _kb);
        spawnParticles(target.cx(), target.cy(), '#888899', 10);
        // Slash arcs start out having hit the target, or they land again after its
        // i-frames lapse (44 moving, 72 still).
        if (!user._swordSlashes) user._swordSlashes = [];
        const _iColor = _still ? '#ffffff' : '#aaaadd';
        const _iSize  = _still ? 36 : 22;
        user._swordSlashes.push({ x: user.cx() + user.facing * 22, y: user.cy(),
          vx: user.facing * 14, vy: -0.8, tilt: user.facing * 0.2, facing: user.facing,
          life: _still ? 30 : 20, maxLife: _still ? 30 : 20, size: _iSize, color: _iColor, hitSet: new Set([target]) });
        if (_still) {
          user._swordSlashes.push({ x: user.cx() + user.facing * 28, y: user.cy() + 10,
            vx: user.facing * 11, vy: 0.4, tilt: -user.facing * 0.15, facing: user.facing,
            life: 24, maxLife: 24, size: 28, color: '#ccccff', hitSet: new Set([target]) });
        }
        if (user.charClass === 'ronin' && target.health <= 0) {
          user.cooldown = 0; user.abilityCooldown = 0;
          user.superMeter = Math.min(100, user.superMeter + 30);
          spawnParticles(user.cx(), user.cy(), '#aaaacc', 16);
        }
      }
    }
  },

  flamethrower: {
    // Suppressor: 25-shot rapid fire at very short range. Backdraft punishes rushers.
    name: 'Flamethrower', damage: 0, range: 220, cooldown: 4, endlag: 3,
    // 13-15 per tick, roughly twice the kill speed of other weapons (tools/sov-balance.js --meleebrain).
    damageFunc: () => 9 + Math.floor(Math.random() * 2),
    bulletSpeed: 9, bulletColor: '#ff5500',
    clipSize: 70, reloadFrames: 85,
    kb: 2,                abilityCooldown: 135, superDmgMult: 1.3, type: 'ranged', weaponType: 'ranged', color: '#ff4400',
    abilityName: 'Napalm Spit',
    ability(user, _target) {
      const _nProj = new Projectile(
        user.cx() + user.facing * 14, user.y + 22,
        user.facing * 6, -1.5,
        user, 24, '#ff7700'
      );
      _nProj.splashRange = 75;
      _nProj.dmg = 24;
      projectiles.push(_nProj);
      user.vx -= user.facing * 8;
      spawnParticles(user.cx(), user.cy(), '#ff4400', 14);
      screenShake = Math.max(screenShake, 10);
    }
  },

  electricstaff: {
    // Chain striker: group-shock Q. Overcharge makes every swing AoE for 4s.
    name: 'Electric Staff', damage: 16, range: 112, cooldown: 36, endlag: 12,
    kb: 10,                  abilityCooldown: 190, abilityDmgMult: 1.2, type: 'melee', weaponType: 'heavy', color: '#00ccff',
    abilityName: 'Shock Bolt',
    ability(user, _target) {
      // Fast ranged electric orb. On impact it leaves a crackling ground zone.
      if (user._shockBolt) return; // one at a time
      user._shockBolt = {
        x:      user.cx() + user.facing * 18,
        y:      user.cy() - 4,
        vx:     user.facing * 17,
        vy:     -1.5,
        life:   50,
        hitSet: new Set(),
      };
      spawnParticles(user.cx(), user.cy(), '#00eeff', 14);
      spawnParticles(user.cx(), user.cy(), '#aaeeff', 6);
      typeof spawnLightningBolt === 'function' && spawnLightningBolt(user.cx() + user.facing * 30, user.cy());
      screenShake = Math.max(screenShake, 8);
    }
  },

  gauntlet: {
    // Boss-only weapon: heavy melee and a void slam.
    name: 'Gauntlet', damage: 13, range: 30, cooldown: 38,
    kb: 18,            abilityCooldown: 160, type: 'melee', weaponType: 'heavy', color: '#9900ee',
    contactDmgMult: 0.55,
    abilityName: 'Void Slam',
    ability(user, _target) {
      screenShake = Math.max(screenShake, 28);
      spawnRing(user.cx(), user.cy());
      spawnRing(user.cx(), user.cy());
      for (const p of players) {
        if (p === user || p.health <= 0) continue;
        if (dist(user, p) < 165) dealDamage(user, p, 22, 40);
      }
      // Also hits training dummies.
      for (const d of trainingDummies) {
        if (d.health <= 0) continue;
        if (dist(user, d) < 165) dealDamage(user, d, 7, 40);
      }
    }
  },

  mkgauntlet: {
    // Knight class weapon, locked to Knight. attack() and ability() are overridden.
    name: 'Knight Gauntlets', damage: 30, range: 90, cooldown: 22,
    kb: 32, abilityCooldown: 80, type: 'melee', weaponType: 'heavy', color: '#8844ff',
    contactDmgMult: 0.65, abilityName: 'Grand Slam',
    ability(_user, _tgt) { /* fully overridden by Knight class */ }
  },

  // Enemy-only weapons. enemyOnly keeps them out of WEAPON_KEYS and player UI.
  nullblade: {
    // Sovereign's signature weapon: a faster sword with a stronger Dash Slash.
    enemyOnly: true,
    name: 'Null Blade', damage: 15, range: 92, cooldown: 28, endlag: 8,
    kb: 13, abilityCooldown: 140, type: 'melee', weaponType: 'light', color: '#cc2200',
    abilityName: 'Counter Step',
    ability(user, target) {
      if (!target || target.health <= 0) return;
      // Counter-hit: punishes mid-swing opponents harder.
      const counterHit = target.attackTimer > 0;
      user.vx = user.facing * 12;
      user.vy = -3;
      if (dist(user, target) < 120) {
        if (counterHit) {
          dealDamage(user, target, 28, 16);
          target.stunTimer = Math.max(target.stunTimer || 0, 8);
          spawnParticles(target.cx(), target.cy(), '#ffffff', 10);
        } else {
          dealDamage(user, target, 20, 14);
        }
      }
      spawnParticles(user.cx(), user.cy(), '#cc2200', 8);
      spawnParticles(user.cx(), user.cy(), '#ff3300', 5);
    }
  },

  voidblade: {
    enemyOnly: true,
    name: 'Void Blade', damage: 14, range: 58, cooldown: 26, endlag: 9,
    kb: 10, abilityCooldown: 140, type: 'melee', weaponType: 'light', color: '#9933ff',
    abilityName: 'Void Slash',
    ability(user, target) {
      if (!target || target.health <= 0) return;
      // Lunge forward, then rapid slashes.
      user.vx = user.facing * 14;
      if (dist(user, target) < 80) dealDamage(user, target, 10, 8);
      if (dist(user, target) < 80) dealDamage(user, target, 10, 8);
      spawnParticles(user.cx(), user.cy(), '#9933ff', 8);
      spawnParticles(user.cx(), user.cy(), '#cc66ff', 5);
    }
  },

  shockrifle: {
    enemyOnly: true,
    name: 'Shock Rifle', damage: 8, range: 600, cooldown: 36, endlag: 10,
    kb: 6, abilityCooldown: 180, type: 'ranged', weaponType: 'ranged', color: '#00ddff',
    abilityName: 'Chain Lightning',
    ability(user, _target) {
      // Rapid triple burst: 3 projectiles in quick sequence.
      spawnBullet(user, 22, '#00eeff', 11);
      spawnBullet(user, 20, '#00ccdd', 11);
      spawnBullet(user, 18, '#0099bb', 11);
      spawnParticles(user.cx(), user.cy(), '#00ddff', 6);
    }
  },

  lantern: {
    // Lantern (Trial of Sense): its ability deals no damage and fires a reveal sweep instead (smb-trials.js).
    name: 'Lantern', damage: 0, range: 78, cooldown: 34, endlag: 10,
    damageFunc: () => 12 + Math.floor(Math.random() * 4),
    kb: 9, abilityCooldown: 600, type: 'melee', weaponType: 'melee', color: '#ffcc66',
    trialOnly: true,
    abilityName: 'Reveal Sweep',
    ability(user, _target) {
      if (typeof trialLanternSweep === 'function') trialLanternSweep(user);
    }
  },

  // Weapons whose runtime lives in smb-weapons-ext.js. customShot replaces the
  // generic Projectile (point-blank penalty and recoil still apply). customAttack
  // replaces attack(). superMove replaces the superMoves entry. noSwingHitbox skips
  // the melee tip-arc damage for weapons whose hits are not swings.
  bomb: {
    // Demolisher: lobbed bombs that roll, stick, and chain. Lay stickies, then detonate.
    name: 'Bomb', damage: 0, range: 420, cooldown: 58, endlag: 8,
    damageFunc: () => 13 + Math.floor(Math.random() * 4),
    bulletSpeed: 8, kb: 11, abilityCooldown: 45, superDmgMult: 2.2, type: 'ranged', weaponType: 'ranged', color: '#3a3a3a',
    abilityName: 'Remote Detonation',
    customShot(user, dmg) { if (typeof wxThrowBomb === 'function') wxThrowBomb(user, dmg); },
    ability(user, _target) { if (typeof wxBombAbility === 'function') wxBombAbility(user); },
    superMove(user, _target) { if (typeof wxGigaBomb === 'function') wxGigaBomb(user); },
  },

  fragment: {
    // Fragment style: unarmed. Locked until the story teaches it (see wxFragmentUnlocked).
    name: 'Fragment', damage: 0, range: 70, cooldown: 34, endlag: 10,
    kb: 7, abilityCooldown: 300, type: 'melee', weaponType: 'light', color: '#8fd8ff',
    styleLocked: true, noSwingHitbox: true,
    abilityName: 'Fragment Barrage',
    customAttack(user, target) { if (typeof wxFragmentAttack === 'function') wxFragmentAttack(user, target); },
    ability(user, _target) { if (typeof wxFragmentBarrage === 'function') wxFragmentBarrage(user); },
    superMove(user, _target) { if (typeof wxFragmentOverdrive === 'function') wxFragmentOverdrive(user); },
  },

  knives: {
    // Scavenger: six knives. Each throw leaves a blade that Recall turns into a hit.
    name: 'Throwing Knives', damage: 0, range: 520, cooldown: 20, endlag: 5,
    damageFunc: () => 12 + Math.floor(Math.random() * 3),
    bulletSpeed: 18, kb: 5, abilityCooldown: 150, abilityDmgMult: 1.6, superDmgMult: 1.6, type: 'ranged', weaponType: 'ranged', color: '#9aa3ad',
    abilityName: 'Recall',
    customShot(user, dmg) { if (typeof wxThrowKnife === 'function') wxThrowKnife(user, dmg); },
    ability(user, _target) { if (typeof wxRecallKnives === 'function') wxRecallKnives(user, false); },
    superMove(user, _target) { if (typeof wxFanOfSteel === 'function') wxFanOfSteel(user); },
  },

  glassblade: {
    // Glass cannon: fastest swing (18-frame cooldown vs 20 for fists). Every hit taken chips it.
    name: 'Glass Blade', damage: 24, range: 92, cooldown: 18, endlag: 6,
    kb: 9, abilityDmgMult: 1.5, abilityCooldown: 200, superDmgMult: 2.5, type: 'melee', weaponType: 'light', color: '#bfe6ee',
    abilityName: 'Shatterstep',
    ability(user, _target) { if (typeof wxShatterstep === 'function') wxShatterstep(user); },
    superMove(user, _target) { if (typeof wxMirrorwall === 'function') wxMirrorwall(user); },
  },

  anchor: {
    // Mooring: slow and immovable while swinging. Can be thrown and hauled on.
    name: 'Anchor', damage: 28, range: 80, cooldown: 40, endlag: 15,
    kb: 16, abilityDmgMult: 1.5, abilityCooldown: 170, superDmgMult: 1.4, type: 'melee', weaponType: 'heavy', color: '#5a6068',
    abilityName: 'Drop Anchor',
    customAttack(user, target) { if (typeof wxAnchorAttackGate === 'function') return wxAnchorAttackGate(user, target); },
    ability(user, _target) { if (typeof wxDropAnchor === 'function') wxDropAnchor(user); },
    superMove(user, _target) { if (typeof wxKeelhaul === 'function') wxKeelhaul(user); },
  },

  crossbow: {
    // Marksman: one slow, heavy bolt at a time. It pins what it hits against a wall.
    name: 'Crossbow', damage: 0, range: 700, cooldown: 72, endlag: 8,
    damageFunc: () => 19 + Math.floor(Math.random() * 5),
    bulletSpeed: 17, kb: 9, abilityCooldown: 240, abilityDmgMult: 3.5, type: 'ranged', weaponType: 'ranged', color: '#6b4a2b',
    abilityName: 'Tripwire',
    customShot(user, dmg) { if (typeof wxFireBolt === 'function') wxFireBolt(user, dmg, false); },
    ability(user, _target) { if (typeof wxTripwire === 'function') wxTripwire(user); },
    superMove(user, _target) { if (typeof wxFireBolt === 'function') wxFireBolt(user, 34, true); },
  }
};

// `trialOnly` keeps a weapon out of random rolls, chaos swaps, battle royale and
// training — it is granted by a chapter's playerCaps, never drawn from the pool.
// `styleLocked` (Fragment) is likewise never drawn from a pool; it is offered in
// the pickers only once the story has taught it.
const WEAPON_KEYS = Object.keys(WEAPONS).filter(k => k !== 'gauntlet' && k !== 'mkgauntlet' && !WEAPONS[k].enemyOnly && !WEAPONS[k].trialOnly && !WEAPONS[k].styleLocked);

// Weapons whose tone doesn't fit Story Mode. Story launch and mastery filter against this.
const STORY_TONE_EXCLUDED_WEAPONS = ['paperairplane', 'peashooter', 'fryingpan', 'broomstick', 'slingshot'];

// Random rolls pair a weapon with a class of the same kind. Hybrids shoot but
// ranged-class perks don't carry onto them, so they roll as melee.
const RANDOM_ROLL_MELEE_HYBRIDS = ['flamethrower', 'electricstaff'];

function weaponRollKind(key) {
  const def = (key && String(key).startsWith('_custom_') && typeof window !== 'undefined' && window.CUSTOM_WEAPONS)
    ? window.CUSTOM_WEAPONS[key]
    : WEAPONS[key];
  if (!def) return 'melee';
  if (RANDOM_ROLL_MELEE_HYBRIDS.includes(key)) return 'melee';
  return def.type === 'ranged' ? 'ranged' : 'melee';
}

// A class is ranged when its signature weapon is.
function classRollKind(key) {
  const cls = CLASSES[key];
  return (cls && cls.weapon) ? weaponRollKind(cls.weapon) : 'melee';
}

// Per-weapon swing. Design contract: docs/weapon-identity-spec.md.
// a0 to a1 is the angle path in radians (facing right, mirrored automatically).
// tipLen is the weapon length in px for hitbox reach. hitFracs samples the hitbox
// along reach. Ranged entries are firing poses only (tilt 0 keeps the weapon level).
// Weapons without an entry fall back to the 12-frame diagonal slash.
const WEAPON_SWINGS = {
  // Melee
  sword:         { archetype: 'slash',  dur:  9, a0: -0.65, a1: 1.15, ease: 'snap',   tilt: 0.6,  tipLen: 26, trail: { life:  9, cap: 6,  width: 5 }, hitSound: 'slash' },
  katana:        { archetype: 'iai',    dur:  7, a0: -0.35, a1: 0.95, ease: 'iai',    tilt: 0.5,  tipLen: 30, trail: { life: 13, cap: 8,  width: 4 },
                   hitSound: 'pierce', carry: { arm: 0.80, tilt: 0.45 } },  // held low at the hip, blade angled down
  hammer:        { archetype: 'smash',  dur: 15, a0: -1.85, a1: 0.95, ease: 'heavy',  tilt: 0.7,  tipLen: 30, trail: { life: 14, cap: 9,  width: 10 },
                   hitSound: 'blunt', carry: { arm: -0.90, tilt: -0.50 } }, // head rested up over the shoulder
  fryingpan:     { archetype: 'smash',  dur: 12, a0: -1.55, a1: 0.80, ease: 'heavy',  tilt: 0.7,  tipLen: 26, trail: { life: 11, cap: 7,  width: 8 },
                   hitSound: 'clang', carry: { arm: 1.05, tilt: 0.25 } },   // dangling at the side like a skillet
  axe:           { archetype: 'cleave', dur: 12, a0: -1.05, a1: 1.35, ease: 'snap',   tilt: 0.65, tipLen: 26, trail: { life: 12, cap: 8,  width: 8 }, hitSound: 'slash',
                   carry: { arm: 0.95, tilt: -0.20 } },                     // held low at the side
  scythe:        { archetype: 'sweep',  dur: 14, a0: -1.45, a1: 1.65, ease: 'sweep',  tilt: 0.8,  tipLen: 30, trail: { life: 13, cap: 9,  width: 7 }, hitSound: 'slash',
                   carry: { arm: -1.30, tilt: -0.20 } },                    // upright reaper pose, blade overhead
  spear:         { archetype: 'thrust', dur: 10, a0:  0.10, a1: 0.02, ease: 'linear', tilt: 0.06, tipLen: 40,
                   reach: { r0: 0.45, r1: 1.0, ease: 'thrust' }, hitFracs: [0.45, 0.7, 0.9, 1.0], trail: { life: 8, cap: 6, width: 4 },
                   hitSound: 'pierce', carry: { arm: -1.15, tilt: -0.75 } }, // shouldered, point up-back
  broomstick:    { archetype: 'poke',   dur:  8, a0:  0.18, a1: -0.06, ease: 'linear', tilt: 0.1, tipLen: 34,
                   reach: { r0: 0.5, r1: 1.0, ease: 'thrust' }, hitFracs: [0.5, 0.75, 1.0], trail: { life: 7, cap: 5, width: 4 },
                   hitSound: 'pierce', carry: { arm: -1.00, tilt: -0.85 } }, // slung over the shoulder
  whip:          { archetype: 'crack',  dur: 11, a0: -0.55, a1: 0.35, ease: 'snap',   tilt: 0.15, tipLen: 50,
                   reach: { r0: 0.35, r1: 1.0, ease: 'crack' }, hitFracs: [0.4, 0.65, 0.85, 1.0], trail: { life: 10, cap: 8, width: 3 },
                   // Odd swings crack down from overhead, even swings sweep up off the floor.
                   alternate: true, altOff: [-0.58, 0.42],
                   hitSound: 'snap', carry: { arm: 1.00, tilt: 0.40 } },     // coiled low at the side
  combat:  { archetype: 'jab',    dur:  5, a0:  0.12, a1: -0.10, ease: 'linear', tilt: 0.0, tipLen: 16, alternate: true,
                   reach: { r0: 0.4, r1: 1.0, ease: 'jab' }, hitFracs: [0.6, 1.0], trail: { life: 6, cap: 4, width: 4 },
                   hitSound: 'blunt', carry: { arm: -0.35, lArm: -0.60 } },  // guard stance, both fists up
  flail:         { archetype: 'whirl',  dur: 16, a0: -2.6,  a1: 1.25, ease: 'heavy',  tilt: 0.55, tipLen: 28, trail: { life: 14, cap: 10, width: 6 },
                   hitSound: 'blunt', carry: { arm: 1.10, tilt: 0.50 } },    // ball dangling straight down
  shield:        { archetype: 'bash',   dur:  8, a0:  0.15, a1: -0.05, ease: 'linear', tilt: 0.0, tipLen: 16,
                   reach: { r0: 0.5, r1: 1.0, ease: 'jab' }, hitFracs: [0.7, 1.0], trail: { life: 0, cap: 0, width: 0 },
                   hitSound: 'clang', carry: { arm: 0.35, tilt: 0.0 } },     // held braced in front
  electricstaff: { archetype: 'strike', dur: 11, a0: -0.95, a1: 1.25, ease: 'snap',   tilt: 0.6,  tipLen: 30, trail: { life: 11, cap: 8, width: 6 },
                   hitSound: 'zap', carry: { arm: 0.70, tilt: -1.30 } },     // walking-staff, held upright
  glassblade:    { archetype: 'slash',  dur:  6, a0: -0.70, a1: 1.10, ease: 'snap',   tilt: 0.55, tipLen: 40, trail: { life: 10, cap: 7, width: 4 },
                   hitSound: 'slash' },
  anchor:        { archetype: 'smash',  dur: 13, a0: -1.90, a1: 0.95, ease: 'heavy',  tilt: 0.7,  tipLen: 30, trail: { life: 14, cap: 9, width: 10 },
                   hitSound: 'blunt', carry: { arm: 0.95, tilt: 0.55 } },    // hauled low, fluke near the floor
  fragment:      { archetype: 'jab',    dur:  7, a0:  0.12, a1: -0.10, ease: 'linear', tilt: 0.0, tipLen: 16, alternate: true,
                   reach: { r0: 0.4, r1: 1.0, ease: 'jab' }, trail: { life: 0, cap: 0, width: 0 },
                   carry: { arm: -0.35, lArm: -0.60 } },
  // Enemy-only melee, distinct from the sword so duels read differently.
  nullblade:    { archetype: 'slash',  dur: 10, a0: -0.85, a1: 1.05, ease: 'snap',   tilt: 0.55, tipLen: 26, trail: { life: 10, cap: 7, width: 5 }, hitSound: 'slash' },
  voidblade:     { archetype: 'slash',  dur:  9, a0: -0.50, a1: 1.20, ease: 'iai',    tilt: 0.5,  tipLen: 24, trail: { life: 10, cap: 7, width: 4 }, hitSound: 'slash' },
  // Ranged firing poses. No swing, the weapon stays level.
  gun:           { archetype: 'point',  a0: -0.45, a1: 0.02, ease: 'recoil', tilt: 0.0, carry: { arm: 0.55, tilt: -0.35 } }, // low ready, muzzle slightly up
  peashooter:    { archetype: 'point',  a0: -0.18, a1: 0.00, ease: 'recoil', tilt: 0.0 },
  bow:           { archetype: 'aim',    a0: -0.08, a1: 0.00, ease: 'recoil', tilt: 0.0, carry: { arm: 0.85, tilt: 0.30 } },  // held down at the side
  slingshot:     { archetype: 'aim',    a0:  0.35, a1: -0.10, ease: 'recoil', tilt: 0.0 },
  paperairplane: { archetype: 'throw',  a0: -0.95, a1: 0.30, ease: 'snap',   tilt: 0.0 },
  boomerang:     { archetype: 'throw',  a0: -1.20, a1: 0.50, ease: 'snap',   tilt: 0.0 },
  flamethrower:  { archetype: 'hose',   a0:  0.12, a1: -0.06, ease: 'recoil', tilt: 0.0 },
  shockrifle:    { archetype: 'point',  a0: -0.30, a1: 0.02, ease: 'recoil', tilt: 0.0 },
  bomb:          { archetype: 'throw',  a0: -1.10, a1: 0.35, ease: 'snap',   tilt: 0.0 },
  knives:        { archetype: 'throw',  a0: -0.85, a1: 0.25, ease: 'snap',   tilt: 0.0 },
  crossbow:      { archetype: 'point',  a0: -0.20, a1: 0.02, ease: 'recoil', tilt: 0.0, carry: { arm: 0.60, tilt: -0.30 } },
};

// Easing curves for swing motion. p in [0,1]. Output may dip below 0 (wind-back)
// or past 1 (overshoot) on purpose.
function swingEase(p, type) {
  switch (type) {
    case 'snap': { // accelerating whip, no wind-back
      return 1 - Math.pow(1 - p, 3);
    }
    case 'iai': { // brief held tension, then a near-instant cut (windup 0.45 to 0.25)
      if (p < 0.25) return -0.04 * (p / 0.25);
      const q = (p - 0.25) / 0.75;
      return -0.04 + 1.04 * (1 - Math.pow(1 - q, 4));
    }
    case 'heavy': { // slow rising windup, accelerating drop
      // Windup fraction 0.42 to 0.35: a couple frames of dead time before the drop cut.
      if (p < 0.35) return 0.10 * (p / 0.35);
      const q = (p - 0.35) / 0.65;
      return 0.10 + 0.90 * q * q;
    }
    case 'sweep': // ease-in-out full-body arc
      return p * p * (3 - 2 * p);
    case 'thrust': { // out fast, hold, partial retract
      if (p < 0.40) { const q = p / 0.40; return 1 - Math.pow(1 - q, 3); }
      if (p < 0.70) return 1;
      return 1 - 0.45 * ((p - 0.70) / 0.30);
    }
    case 'jab': // out-and-back punch
      return p < 0.45 ? (p / 0.45) : 1 - 0.9 * ((p - 0.45) / 0.55);
    case 'crack': { // accelerating lash, overshoot at full extension
      if (p < 0.5) { const q = p / 0.5; return q * q; }
      const q = (p - 0.5) / 0.5;
      return 1 + 0.08 * Math.sin(q * Math.PI * 2) - 0.5 * q * q;
    }
    case 'recoil': // fast settle from the firing pose
      return 1 - Math.pow(1 - p, 2);
    default:
      return p;
  }
}

// Returns { ang, reachFrac } for a weapon mid-swing. atkP in [0,1], facing is +-1,
// alt toggles the glove high-jab and body-hook. Used by both hitbox and visuals,
// so never re-derive the angle elsewhere.
function swingPose(weaponKey, atkP, facing, alt) {
  const g = WEAPON_SWINGS[weaponKey];
  const p = Math.min(1, Math.max(0, atkP));
  let ang, reachFrac = 1;
  if (g) {
    let a0 = g.a0, a1 = g.a1;
    // altOff lets a weapon set its own two-pose alternation (the whip).
    if (g.alternate) { const off = alt ? (g.altOff ? g.altOff[0] : 0.30) : (g.altOff ? g.altOff[1] : -0.12); a0 += off; a1 += off; }
    ang = a0 + (a1 - a0) * swingEase(p, g.ease);
    if (g.reach) reachFrac = g.reach.r0 + (g.reach.r1 - g.reach.r0) * swingEase(p, g.reach.ease);
  } else {
    ang = -0.45 + (1.1 - -0.45) * p;
  }
  if (facing < 0) ang = Math.PI - ang;
  return { ang, reachFrac };
}

// Character classes
const CLASSES = {
  none:      { name: 'None',      desc: 'Standard balanced fighter',            weapon: null,     hp: 150, speedMult: 1.00, perk: null           },
  warrior:   { name: 'Warrior',   desc: 'Disciplined melee fighter. Sturdy, no frills.', weapon: null, hp: 138, speedMult: 1.00, perk: null   },
  thor:      { name: 'Torren',      desc: 'Hammer master, lightning at low HP',  weapon: 'hammer', hp: 140, speedMult: 0.90, perk: 'thunder'      },
  kratos:    { name: 'Varek',    desc: 'Axe specialist, rage at low HP',       weapon: 'axe',    hp: 112, speedMult: 0.95, perk: 'rage'         },
  ninja:     { name: 'Ninja',     desc: 'Fast sword fighter, quick dash',       weapon: 'sword',  hp: 126,  speedMult: 1.24, perk: 'swift'        },
  gunner:    { name: 'Gunner',    desc: 'Dual-shot gunslinger',                 weapon: 'gun',    hp: 110, speedMult: 1.06, perk: 'dual_shot'    },
  archer:    { name: 'Archer',    desc: 'Fast. Auto-backstep at low HP.', weapon: 'bow', hp: 120, speedMult: 1.20, perk: 'backstep'    },
  paladin:   { name: 'Paladin',   desc: 'Takes ~15% less damage. Slower.', weapon: 'shield', hp: 108, speedMult: 0.88, perk: 'holy_light' },
  berserker:  { name: 'Berserker',  desc: 'Any weapon. Rage boosts dmg at low HP.',             weapon: null, hp: 130, speedMult: 1.08, perk: 'blood_frenzy' },
  megaknight: { name: 'Knight', desc: 'Legendary knight. Smash, uppercut, and crush enemies.', weapon: 'mkgauntlet', hp: 170, speedMult: 0.84, perk: null },
  pugilist:   { name: 'Pugilist',   desc: 'Combat brawler. Fast and durable. Roundhouse + Combo Strike fires free at low HP.', weapon: 'combat', hp: 135, speedMult: 1.15, perk: 'surge_fist'  },
  ronin:      { name: 'Ronin',      desc: 'Katana master. Iaijutsu kills reset all cooldowns.',                         weapon: 'katana',       hp: 132, speedMult: 1.18, perk: 'death_step'    },
  reaper:     { name: 'Reaper',     desc: 'Scythe specialist. Heals once when badly hurt.',                           weapon: 'scythe',       hp: 125, speedMult: 1.00, perk: 'revive'       },
  summoner:   { name: 'Summoner',   desc: 'Calls a fragile familiar that harries your enemy. Any weapon.',                weapon: null,           hp: 138, speedMult: 1.05, perk: 'call_familiar' },
  demolitionist: { name: 'Demolitionist', desc: 'Bomb specialist. Bigger blasts and controlled bomb-jumps.',          weapon: 'bomb',         hp: 125, speedMult: 1.00, perk: 'demolition'    },
  warden:     { name: 'Warden',     desc: 'Armoured anchor-bearer. Every third hit taken is halved. Slow.',            weapon: 'anchor',       hp: 160, speedMult: 0.86, perk: 'bulwark'       },
  // Locked with the Fragment weapon. Offered once the story teaches it.
  adept:      { name: 'Adept',      desc: 'Fragment stylist. Faster charge, no slowdown while charging.',              weapon: 'fragment',     hp: 128, speedMult: 1.06, perk: 'fast_thought', styleLocked: true },
};

// Damage multipliers by weaponType. Keys must match classKey in applyClass().
const CLASS_AFFINITY = {
  archer: {
    light: 1.0,
    heavy: 0.7,
    ranged: 1.25
  },
  berserker: {
    light: 1.1,
    heavy: 1.3,
    ranged: 0.6
  },
  phasewalker: {
    light: 1.2,
    heavy: 0.8,
    ranged: 1.0
  },
  juggernaut: {
    light: 0.9,
    heavy: 1.4,
    ranged: 0.5
  },
  pugilist: {
    light: 1.1,
    heavy: 0.85,
    ranged: 0.5
  },
  ronin: {
    light: 1.2,
    heavy: 0.8,
    ranged: 0.7
  },
  reaper: {
    light: 1.1,
    heavy: 0.9,
    ranged: 0.6
  }
};

// Weapon and class descriptions (menu sidebar)
// HP fraction at which a class's once-per-life perk fires (Fighter.update).
// Reaper's perk heals 32% max HP, so 0.35 keeps the result under full health.
const CLASS_PERK_THRESHOLD = {
  thor: 0.55, kratos: 0.55, ninja: 0.55, paladin: 0.55,
  gunner: 0.55, archer: 0.55, berserker: 0.55, pugilist: 0.55, summoner: 0.55,
  reaper: 0.35,
};

const WEAPON_DESCS = {
  random:  { title: 'Random Weapon',  what: 'Picks a random weapon each game — embrace the chaos.',                                                         ability: null,                                                              super: null,                                                               how:  'Adapt to whatever you get each round.' },
  sword:   { title: 'Sword',          what: 'Fast, balanced melee weapon with good range.',                                                     ability: 'Q — Blade Storm: 4 crescent arcs burst in all directions (24 dmg). No movement — pure coverage.',  super: 'E — Air Slash: 3 crescent arcs fan outward in sequence.',          how:  'Base = single forward swing. Q = omnidirectional burst. E = sequential forward fan.' },
  hammer:  { title: 'Hammer',         what: 'Slow but devastating. Huge knockback on every hit.',                                               ability: 'Q — Ground Shockwave: jump and slam — a shockwave TRAVELS horizontally from your feet (28 dmg, launches up).', super: 'E — Mjolnir: a sweeping swing that has to connect; it hooks them on the hammer head, swings them round twice and throws them under a lightning strike (42 dmg).',  how:  'Base = direct swing. Q = traveling ground wave. E = get close, then catch them with the swing.' },
  gun:     { title: 'Gun',            what: 'Ranged weapon. Each bullet deals 12–14 damage. Fires splash rounds.',                                            ability: 'Q — Rapid Fire: 5-shot burst.',                                   super: 'E — Bullet Storm: 14 rapid shots (9–12 dmg each).',               how:  'Keep your distance. Use Rapid Fire to pressure from afar.' },
  axe:     { title: 'Axe',            what: 'Balanced melee with solid damage, good knockback, and splash hits.',                               ability: 'Q — Rising Cleave: a short dash that has to land. On a hit the axe comes up under them and throws them into the air, then swings round flat as they fall and sends them away (22 dmg).', super: 'E — Axe Throw: hurl your axe across the arena (38 dmg, large radius); it curves back.', how: 'Rising Cleave is a confirm — dash in from close. Axe Throw punishes enemies at any distance.' },
  spear:   { title: 'Spear',          what: 'Longest melee reach in the game. Consistent damage.',                                              ability: 'Q — Ground Spike: slam spear down, AoE upward launch for 20 dmg.', super: 'E — Lance Charge: charge with the spear couched; if the point lands they are carried on it and flicked off into the air (28 dmg).',     how:  'Poke from range. Use Ground Spike when enemies rush you.' },
  bow:     { title: 'Bow', what: 'Long-range arc weapon. Arrows deal 16–21 damage and arc slightly over distance.', ability: 'Q — Triple Shot: fires 3 arrows in a fan spread.',       super: 'E — Power Arrow: giant arrow for 60 dmg with high knockback.',    how:  'Stay back and poke. Triple Shot punishes clustered enemies.' },
  shield:  { title: 'Shield', what: 'Defensive melee weapon. High knockback.', ability: 'Q — Shield Bash: rush behind the shield; whoever it meets is pinned to it, driven back and shoved away stunned (12 dmg).',              super: 'E — Fortress Charge: a long rush that carries whoever it meets on the shield face, then a rising bash launches them (32 dmg).', how: 'Block with S key to absorb bullets. Bash enemies away.' },
  scythe:       { title: 'Scythe',         what: 'Wide-arc melee with splash damage. Heals on hit.',               ability: 'Q — Scythe Toss: hurl the blade forward (22 dmg out / 14 dmg return). No lifesteal.', super: 'E — Soul Reap: the blade hooks someone up to 160px away and reels them in; three reaping turns drink from them and the last tears them upward (42 dmg, heals up to 20).', how: 'Base heals on melee contact. Q is a ranged blade — throw it and bait the return. E is the lifesteal finisher.' },
  fryingpan:    { title: 'Frying Pan',     what: 'Slow but punishing melee. Solid knockback and AoE ground pound.',          ability: 'Q — Ground Pound: AoE shockwave from feet — launches ALL nearby enemies straight up.', super: 'E — Grand Slam: BONK them on the head, wind up like a golfer, and send them straight up (45 dmg).', how: 'Ground Pound clears crowds upward. Grand Slam sends one target flying for a ceiling combo.' },
  broomstick:   { title: 'Broomstick',     what: 'Long-reach melee. Low damage but pushes enemies away.',               ability: 'Q — Broom Ride: rocket through the air on the broom — 16 dmg aerial body-check to anyone in your path.', super: 'E — Tornado Spin: spin push that hits all directions.',           how:  'Base = ground poke. Q = aerial flying ram. E = stationary spin push.' },
  combat: { title: 'Combat',         what: 'Fast alternating punches and kicks. Up-close brawler.',                ability: 'Q — Roundhouse: spinning kick that hits every enemy close on both sides (14 dmg) and knocks them away.', super: 'E — Combo Strike: dash in — the dash MUST connect. On a hit, uppercut (20 dmg), then aim the finishing kick with ←/→ and press attack to launch them (34 dmg).', how:  'Roundhouse clears space when you get surrounded. Combo Strike whiffs if you fire it from range — confirm it up close, then aim the kick at the nearest edge.' },
  peashooter:   { title: 'Pea Shooter',    what: 'Rapid-fire ranged weapon. Low damage per pea (8-9). High fire rate.',        ability: 'Q — Pea Storm: 10 rapid shots.',                               super: 'E — Cluster Bomb: large pea detonates into 10 radial peas (8-12 dmg each).', how: 'Whittle with shots. Cluster Bomb punishes enemies in tight spots.' },
  slingshot:    { title: 'Slingshot',      what: 'Ranged weapon with arc trajectory. Solid damage (17-20). Slow fire rate.',     ability: 'Q — Mortar Stone: steep upward arc falls DOWN from above (65px splash, 28 dmg).', super: 'E — Gravity Stone: slow boulder; detonates with a 220px gravity pull for 52 dmg.', how: 'Mortar Stone bypasses shields by dropping from above. Gravity Stone pulls victims into it.' },
  paperairplane: { title: 'Paper Airplane',  what: 'Very slow curving projectile. Low damage (8-11) but unpredictable arc.',          ability: 'Q — Barrage: 5 airplanes at staggered angles.',                   super: 'E — Origami Swarm: 8 homing planes that chase and track enemies.',    how:  'Confuse enemies with the arc. Swarm corners enemies with nowhere to run.' },
  flail:         { title: 'Flail',           what: 'Heavy melee with a swinging chain ball.',                              ability: 'Q — Chain Yank: fire ball forward (26 dmg), returns for 16 dmg.',  super: 'E — Orbit Storm: ball orbits at high speed, 12 dmg per contact.',    how:  'Commit hard or miss hard. Stay close during the return to land both hits.' },
  whip:          { title: 'Whip',            what: 'Longest melee reach, with a sweet spot. The tip of the lash hits hardest and opens a bleed; up close it only chips. Swings alternate overhead crack / floor sweep.', ability: 'Q — Lasso: throw the loop up to 280px; whoever it lands on is reeled in hand over hand and cracked point-blank (24 dmg + deep bleed, stun 22) and HOOKED — for 1.5s every lash on them counts as a tip crack.', super: 'E — Serpent\'s Coil: three extending lashes out to 430px, 13 dmg each + bleed; the third one launches everything it touches.', how:  'Fight at the very edge of your range. Q hooks a target so your chip hits become crits. E is a long-range barrage, not a pull.' },
  boomerang:     { title: 'Boomerang',       what: 'Ranged weapon. Normal throw: 13-16 dmg. Q/E have returning throws.',             ability: 'Q — Orbit Guard: boomerang circles you as a spinning shield, hitting nearby enemies, then flies at the nearest enemy and returns.',  super: 'E — Boomerang Blitz: 4-way 360° burst — forward, backward, and two arcing up. All return.', how: 'Use Orbit Guard defensively when enemies rush. Blitz covers all directions at once.' },
  katana:        { title: 'Katana',          what: 'Fast precise melee weapon.',                                           ability: 'Q — Iaijutsu: hand on the hilt, then a draw so fast it passes through them — the cut lands when the blade is sheathed. Standing still = 28 dmg; moving = 22 dmg and a longer draw.', super: 'E — Shadow Step: vanish and reappear behind the nearest enemy (≤450px) — three cuts and a final draw-through (38 dmg).', how:  'Q rewards patience — stand still for burst damage. E repositions you for the kill.' },
  flamethrower:  { title: 'Flamethrower',    what: 'Continuous flame stream (4.5s tank). Short range. 9-10 dmg per tick, full damage up close.',                ability: 'Q — Napalm Spit: fireball with 75px splash for 24 dmg. Pushes you back.', super: 'E — Backdraft: reverse launch + 40 dmg AoE burst in front.',    how:  'Suppress with rapid fire. Backdraft punishes enemies who rush you.' },
  electricstaff: { title: 'Electric Staff',  what: 'Melee that chain-zaps nearby enemies on every hit.',                  ability: 'Q — Shock Bolt: fire a fast electric orb (13 dmg); impact leaves a crackling ground zone.', super: 'E — Thunderstrike: call 4 lightning bolts from the sky targeting the enemy (20 dmg each).', how:  'Base attack chain-damages groups automatically. Shock Bolt zones the ground. Thunderstrike from any range.' },
  bomb:          { title: 'Bomb',            what: 'Lobbed bombs (13-16 dmg) that roll along the floor and burst on contact or when the fuse runs out. Passive — Chain Reaction: a blast sets off every other bomb it reaches.', ability: 'Q — Remote Detonation: tap to throw a sticky bomb that clings to floors, walls or enemies (each one stuck to an enemy slows them 5%). Up to 6 at once; a 7th sets off your oldest. HOLD Q to detonate them all.', super: 'E — Giga Bomb: one huge slow bomb — 3s fuse, 200px blast, 45 dmg, massive knockback. Sets off every sticky it reaches.', how: 'Your own blasts never hurt you but they do push you — use them to bomb-jump. Lay stickies, then drop the Giga Bomb on them.' },
  fragment:      { title: 'Fragment',        what: 'The fragment style Axiom taught you. HOLD attack to charge a blast around you (7 dmg tapped, up to 20 at full). The charge pulls enemies in, and the blast barely pushes them: it holds them in front of you for Barrage. Past half-charge you slow down, and it goes off by itself at full.', ability: 'Q — Fragment Barrage: four fragment-driven punches, each throwing a shockwave with a little knockback, ending in a Fragment Laser from your centre (38 dmg max in total).', super: 'E — Fragment Overdrive (8s, recasting adds 8s, up to 24s in one run): +30% damage, 30% less damage taken, cooldowns recover 60% faster, +25% speed, a third air jump, a stronger shield, and every parry explodes.', how: 'Charge to drag them in, release, then Barrage straight away. Overdrive turns every other tool up.' },
  knives:        { title: 'Throwing Knives', what: 'Six knives (12-14 dmg each). Thrown knives stick where they land — walk over one to pick it back up. With none left you slash with your last blade.', ability: 'Q — Recall: every knife on the map flies back to you, cutting anything in its path.', super: 'E — Fan of Steel: throw all six in a spread, then Recall them instantly.', how: 'Throw past your opponent on purpose, then Recall through them.' },
  glassblade:    { title: 'Glass Blade',     what: 'The fastest blade in the game (24 dmg, swings quicker than fists). Passive — Fragile: every hit you take cracks it (max 3, -10% dmg each); every 2 hits you land mend one crack. At 3 cracks it shatters into a jagged stub — 60% damage, 70% reach, same speed — and reforms whole after 1.5s.', ability: 'Q — Shatterstep: dash forward and break the blade on purpose, firing its shards ahead of you.', super: 'E — Mirrorwall: a glass wall that reflects projectiles and bursts into shards when an enemy touches it.', how: 'Hit first and keep hitting: landed swings mend the blade, taken hits break it. A stub still bites, so keep swinging through the shatter.' },
  anchor:        { title: 'Anchor',          what: 'Slow, heavy overhead swings. Passive — Moored: while grounded and mid-swing you take no knockback. While the anchor is thrown, your basic attack becomes a fist punch.', ability: 'Q — Drop Anchor: throw the anchor; it embeds where it lands. Press Q again to haul an enemy it hooked, or to pull yourself to it.', super: 'E — Keelhaul: swing the anchor in a wide circle that drags everyone in, then slam.', how: 'Trade hits while planted. With the anchor out you fight with your fists, so throw it to set up a haul, then punch.' },
  crossbow:      { title: 'Crossbow',        what: 'Slow, heavy bolts (19-23 dmg). A bolt that drives its target into a wall, or into the floor from above, pins them briefly.', ability: 'Q — Tripwire: fire two bolts that stretch a wire along the ground. The first enemy to cross it is tripped.', super: 'E — Siege Bolt: a bolt that pierces everything in its path (34 dmg each) and pins the last thing it hits.', how: 'Fight near walls. Lay a Tripwire where they have to walk.' },
};

const CLASS_DESCS = {
  // HP and speed are read from CLASSES by showDesc(), not written here.
  // A class only suggests its weapon when first picked.
  none:      { title: 'No Class',  what: 'No class modifier. Pick any weapon.',                                                               perk: null,                                                                                                                  how:  'Choose any weapon — pure skill matters.' },
  warrior:   { title: 'Warrior',   what: 'Disciplined melee fighter. Sturdy, no perk, no frills.',                                            perk: null,                                                                                                                  how:  'Extra HP instead of a perk. Win on fundamentals.' },
  thor:      { title: 'Torren',    what: 'Hammer master. Slower on his feet. Suggested weapon: Hammer.',                                      perk: 'Lightning Storm (≤55% HP, once per life): two lightning bolts strike your target, 8 dmg + stun each. The first has a short windup, so it can be dodged.', how:  'The lightning answers once you drop to half health — punish the stun it leaves.' },
  kratos:    { title: 'Varek',     what: 'Axe specialist. Every hit you take this life builds rage: +1% damage per stack, up to +20%. Rage resets when you lose a stock. Suggested weapon: Axe.', perk: 'Warborn Fury (≤55% HP, once per life): +30% damage for 5 seconds, and you heal 5% of the damage you deal while it lasts.', how:  'Absorb pressure to stack rage, then strike hard in the Warborn Fury window.' },
  ninja:     { title: 'Ninja',     what: 'Extremely fast and elusive. Suggested weapon: Sword.',                                              perk: 'Shadow Step (≤55% HP, once per life): 2 seconds of super armor (you still take damage but cannot be stunned or knocked back) and all cooldowns reset instantly.',            how:  'Use your speed to dodge. The perk buys time to escape and counter.' },
  gunner:    { title: 'Gunner',    what: 'Every gun shot fires a second bullet for free. Suggested weapon: Gun.',                             perk: 'Last Stand (≤55% HP, once per life): fires 8 bullets in all directions for 3–5 dmg each.',                          how:  'Keep distance at all times. Last Stand punishes enemies who close in once you\'re at half health.' },
  archer:    { title: 'Archer',    what: 'Fast, low HP. Suggested weapon: Bow.',                                                              perk: 'Back-Step (≤55% HP, once per life, on the ground): auto-dash backward and reset your double jump.',                  how:  'Stay at range. The back-step gets you out when pressured.' },
  paladin:   { title: 'Paladin',   what: 'Takes ~15% less damage from every hit. Slower movement. Suggested weapon: Shield.',                 perk: 'Holy Light (≤55% HP, once per life): heals you 20 HP and deals 15 dmg to enemies close by.',                        how:  'Block and bash. Holy Light punishes opponents who rush you once you\'re at half health.' },
  berserker: { title: 'Berserker', what: 'Any-weapon brawler. Strong and quick.',                                                             perk: 'Blood Frenzy (≤55% HP, once per life): 3 seconds of +35% damage and +35% movement speed.',                           how:  'Play aggressively — the frenzy kicks in at half health and turns the second half of the fight.' },
  pugilist:  { title: 'Pugilist',  what: 'Combat brawler. Fast and durable. Suggested weapon: Combat.',                                       perk: 'Surge Strike (≤55% HP, once per life): auto-triggers Combo Strike — free, no super meter cost.',                     how:  'Stay in their face and Roundhouse out of crowds. Surge Strike swings the fight back at half health.' },
  ronin:     { title: 'Ronin',     what: 'Fast katana specialist. Suggested weapon: Katana.',                                                 perk: 'Death Step (passive): an Iaijutsu kill resets your attack and ability cooldowns and grants +30 super meter.',         how:  'Land the Iaijutsu kill and chain the resets for momentum.' },
  reaper:    { title: 'Reaper',    what: 'Scythe specialist. Balanced pace. Suggested weapon: Scythe.',                                       perk: 'Second Wind (≤35% HP, once per life): instantly heal 32% of max HP with a moment of super armor.',                          how:  'Fight aggressively — the perk is your safety net. After it fires, you are on your own.' },
  summoner:  { title: 'Summoner',  what: 'Any weapon. A fragile familiar fights beside you — it arrives at once and returns every 15s (max 1). It chips and distracts — it cannot launch.', perk: 'Desperate Bond (≤55% HP, once per life): immediately spawn the familiar if absent and empower it for 10s (+70% damage).', how:  'Use the familiar to split attention, not to out-damage. Killing it buys your enemy 10s of relief, so protect it.' },
  demolitionist: { title: 'Demolitionist', what: 'Bomb specialist. Suggested weapon: Bomb.', perk: 'Demolition (passive): your bomb blasts are 20% wider, and your own blasts launch you straight up instead of flinging you, so bomb-jumps land where you aim.', how: 'Bomb-jump over pressure and rain stickies from above.' },
  warden:    { title: 'Warden',    what: 'Heavily armoured and slow. Suggested weapon: Anchor.', perk: 'Bulwark (passive): every third hit you take deals half damage.', how: 'Take the trade. Count the hits — the third one is yours.' },
  adept:     { title: 'Adept',     what: 'Fragment stylist. Suggested weapon: Fragment.', perk: 'Fast Thought (passive): Fragment Blast charges 25% faster and never slows you down.', how: 'Charge on the move and walk your blast into them.' },
};

