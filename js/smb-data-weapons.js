'use strict';
// smb-data-weapons.js — WEAPONS, WEAPON_KEYS, CLASSES, CLASS_AFFINITY, descriptions
// Depends on: smb-globals.js, smb-particles.js (spawnParticles, dealDamage)
// Must load AFTER smb-data-arenas.js

// ============================================================
// WEAPON DEFINITIONS
// ============================================================
const WEAPONS = {
  sword: {
    // THE ALL-ROUNDER: Fast, mobile, reliable. Jack of all trades.
    // Identity: Dash Slash chases and punishes. Great neutral game.
    name: 'Sword',   damage: 16, range: 90, cooldown: 30, endlag: 7,
    kb: 10,          abilityCooldown: 150, type: 'melee', weaponType: 'light', color: '#cccccc',
    abilityName: 'Blade Storm',
    ability(user, _target) {
      // 4 crescent arcs burst outward in all directions — forward, backward, up, down
      if (!user._swordSlashes) user._swordSlashes = [];
      const _bsDirs = [
        { vx: user.facing * 10,  vy: -0.5, tilt:  user.facing * 0.28 },
        { vx: -user.facing * 10, vy: -0.5, tilt: -user.facing * 0.28 },
        { vx: user.facing * 3,   vy: -10,  tilt:  Math.PI * 0.42 },
        { vx: user.facing * 3,   vy:  10,  tilt: -Math.PI * 0.42 },
      ];
      for (const d of _bsDirs) {
        user._swordSlashes.push({ x: user.cx(), y: user.cy(),
          vx: d.vx, vy: d.vy, tilt: d.tilt, facing: user.facing,
          life: 22, maxLife: 22, size: 26, color: '#88ccff', hitSet: new Set() });
      }
      spawnParticles(user.cx(), user.cy(), '#88ccff', 18);
      spawnRing(user.cx(), user.cy());
      screenShake = Math.max(screenShake, 14);
      const _bsAll = [...players, ...trainingDummies, ...minions];
      for (const f of _bsAll) {
        if (f === user || f.health <= 0) continue;
        if (dist(user, f) < 95) {
          dealDamage(user, f, 24, 14);
          spawnParticles(f.cx(), f.cy(), '#aaddff', 8);
        }
      }
    }
  },
  hammer: {
    // THE CRUSHER: Slow, punishing, massive knockback. Forces commitment.
    // Identity: Every hit sends enemies flying. One good read = huge reward.
    name: 'Hammer',  damage: 22, range: 80, cooldown: 75, endlag: 22,
    kb: 16,          abilityCooldown: 230, type: 'melee', weaponType: 'heavy', color: '#888888',
    abilityName: 'Ground Shockwave',
    ability(user, _target) {
      // Slam the hammer down — a shockwave TRAVELS horizontally from the impact point
      if (user._hammerShock) return;
      user._hammerShock = {
        x:      user.cx() + user.facing * 24,
        y:      user.y + user.h,
        vx:     user.facing * 9,
        timer:  55,
        hitSet: new Set(),
      };
      screenShake = Math.max(screenShake, 24);
      spawnParticles(user.cx(), user.y + user.h, '#ffcc44', 18);
      spawnParticles(user.cx(), user.cy(), '#ffaa00', 8);
      spawnRing(user.cx(), user.y + user.h);
    }
  },
  gun: {
    // THE HARASSER: Reliable ranged poke. Rewards keeping distance.
    // Identity: Steady chip damage + burst fire ability. Control space.
    name: 'Gun',     damage: 9, range: 600, cooldown: 32, endlag: 6,
    damageFunc: () => Math.floor(Math.random() * 4) + 7,
    superRateBonus: 1.2,
    splashRange: 38, splashDmgPct: 0.30,
    clipSize: 6, reloadFrames: 90,
    kb: 7,           abilityCooldown: 200, type: 'ranged', weaponType: 'ranged', color: '#666666',
    abilityName: 'Burst Shot',
    ability(user, _target) {
      // 3-round burst: fires 3 bullets in a tight vertical fan, rapid-fire feel
      user._qSuperCapRemaining = 10; // max 10% super per activation
      const offsets = [-0.55, 0, 0.55]; // slight vertical spread
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!gameRunning || user.health <= 0) return;
          const _p = spawnBullet(user, 9, '#ffdd00', 7);
          if (_p) {
            _p._isQAbility = true;
            _p.vy += offsets[i]; // fan spread
          }
        }, i * 60);
      }
      setTimeout(() => { user._qSuperCapRemaining = undefined; }, 400);
    }
  },
  axe: {
    // THE SPINNER: Mid-range AoE brawler. Covers angles, not pure damage.
    // Identity: Spin Attack is a defensive escape AND offensive tool. Trades raw dmg for coverage.
    name: 'Axe',     damage: 15, range: 88, cooldown: 52, endlag: 16,
    splashRange: 70, splashDmgPct: 0.30,
    kb: 10,          abilityCooldown: 180, type: 'melee', weaponType: 'heavy', color: '#cc4422',
    abilityName: 'Spin Attack',
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
    // THE POKER: Longest melee reach. Safe, consistent, spacing-dependent.
    // Identity: Ground Spike punishes rushers close-up; Lance Charge is the mid-range punish.
    name: 'Spear',   damage: 15, range: 130, cooldown: 44, endlag: 12,
    kb: 7,           abilityCooldown: 165, type: 'melee', weaponType: 'light', color: '#8888ff',
    abilityName: 'Ground Spike',
    ability(user, _target) {
      screenShake = Math.max(screenShake, 18);
      spawnRing(user.cx(), user.y + user.h);
      spawnParticles(user.cx(), user.y + user.h, '#8888ff', 18);
      // Vertical spike arcs erupt from the ground around the user
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
          applyLaunch(user, f, -20); // governed — was a raw assignment
          spawnParticles(f.cx(), f.cy(), '#aaaaff', 10);
        }
      }
    }
  },
  bow: {
    // THE SNIPER: Highest single-shot ranged damage. Archer class only.
    // Identity: Huge range, powerful arrow, but slow fire rate demands good aim.
    name: 'Bow',  damage: 0, range: 700, cooldown: 52, endlag: 4,
    damageFunc: () => Math.floor(14 + Math.random() * 8),
    clipSize: 3, reloadFrames: 120,
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
      setTimeout(() => { user._qSuperCapRemaining = undefined; }, 400);
    }
  },
  shield: {
    // THE WALL: Lowest damage, highest block and pushback. Paladin class only.
    // Identity: You don't kill with damage — you kill by shoving enemies off platforms.
    name: 'Shield', damage: 10, range: 62, cooldown: 36, endlag: 9,
    kb: 26,         abilityCooldown: 195, type: 'melee', weaponType: 'heavy', color: '#88aaff',
    requiresClass: 'paladin',
    contactDmgMult: 0,
    abilityName: 'Shield Bash',
    ability(user, target) {
      // Shockwave pulse at shield face — visible even on whiff
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
    // THE SUSTAINER: Wide sweep with lifesteal. Weaker 1v1, stronger vs groups.
    // Identity: Fights multiple targets simultaneously. Healing rewards multi-hit risks.
    name: 'Scythe', damage: 14, range: 100, cooldown: 44, endlag: 13,
    splashRange: 60, splashDmgPct: 0.35,
    kb: 8,           abilityCooldown: 195, type: 'melee', weaponType: 'light', color: '#aa44aa',
    abilityName: 'Scythe Toss',
    ability(user, _target) {
      // Hurl the scythe forward — it flies out, spins back, and deals damage both ways
      // No lifesteal — pure ranged blade (lifesteal is reserved for base and E)
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
    // THE STUNNER: Slow but delivers punishing stun windows. Reads = reward.
    // Identity: Land the slow swing → stun window → follow-up combo. High risk, high reward.
    name: 'Frying Pan', damage: 18, range: 65, cooldown: 58, endlag: 20,
    kb: 12,              abilityCooldown: 220, type: 'melee', weaponType: 'heavy', color: '#ccaa44',
    abilityName: 'Ground Pound',
    ability(user, _target) {
      // Overhead pan slam creates a radial ground shockwave — launches everyone nearby UPWARD
      user.vy = -7; // small hop for visual emphasis
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
          f.vx += _panDir * 6; // gentle radial push
          applyLaunch(user, f, -18); // launched straight UP — governed
          f.stunTimer = Math.max(f.stunTimer || 0, 20);
          spawnParticles(f.cx(), f.cy(), '#ffdd66', 12);
        }
      }
    }
  },
  broomstick: {
    // THE PUSHER: Long reach + extreme knockback. Kills by platform denial.
    // Identity: Lowest damage, highest push force. Win by edgeguarding.
    name: 'Broomstick', damage: 12, range: 105, cooldown: 32, endlag: 8,
    kb: 22,              abilityCooldown: 135, type: 'melee', weaponType: 'light', color: '#aa8855',
    abilityName: 'Broom Ride',
    ability(user, _target) {
      // Leap onto the broom and rocket through the air — aerial body-check
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
    // THE COMBAT FIGHTER: Fast strikes, a read-based counter, and a long-range finisher.
    // Identity: Must get close, but Counter Stance rewards patient reads. Combo Strike finisher punishes at any range.
    name: 'Combat', damage: 11, range: 50, cooldown: 20, endlag: 7,
    kb: 4,           abilityCooldown: 180, type: 'melee', weaponType: 'light', color: '#ee3333',
    abilityName: 'Counter',
    ability(user) {
      // Enter a parry window: absorb the next hit, teleport behind the attacker, launcher kick them up.
      user._counterStance = 20; // 20-frame (~0.33s) window — must be a genuine read
      spawnParticles(user.cx(), user.cy(), '#ff5555', 6);
      spawnParticles(user.cx(), user.cy(), '#ffcc44', 4);
    }
  },
  peashooter: {
    // THE HARASSER: Fastest fire rate. Chip damage and interrupts enemy combos.
    // Identity: Each shot is weak but relentless. Storm ability dumps huge lead.
    name: 'Pea Shooter', damage: 0, range: 700, cooldown: 18, endlag: 5,
    damageFunc: () => 2 + Math.floor(Math.random() * 2), // 2-3 per shot
    bulletSpeed: 15, bulletColor: '#44cc44',
    clipSize: 15, reloadFrames: 75,
    kb: 3,               abilityCooldown: 120, type: 'ranged', weaponType: 'ranged', color: '#44cc44',
    abilityName: 'Pea Storm',
    ability(user, _target) {
      user._qHitCount = 0;
      user._qSuperCapRemaining = 28;
      for (let i = 0; i < 9; i++) {
        setTimeout(() => {
          if (!gameRunning || user.health <= 0) return;
          const angle = (Math.random() - 0.5) * 0.28;
          const spd   = 13 + Math.random() * 3;
          const _p = new Projectile(
            user.cx() + user.facing * 12, user.y + 22,
            user.facing * spd * Math.cos(angle), spd * Math.sin(angle),
            user, user.weapon.damageFunc(), '#44cc44'
          );
          _p._isQAbility = true;
          projectiles.push(_p);
        }, i * 65);
      }
      setTimeout(() => { user._qSuperCapRemaining = undefined; }, 800);
    }
  },
  slingshot: {
    // THE AIM-REWARDING SNIPER: Highest per-shot ranged damage. Slow but punishing.
    // Identity: Arc trajectory demands prediction. Land a hit = big reward.
    name: 'Slingshot', damage: 0, range: 650, cooldown: 62, endlag: 5,
    damageFunc: () => 10 + Math.floor(Math.random() * 5), // 10-14 per shot (was 15-21)
    bulletSpeed: 9, bulletColor: '#ff9933', bulletVy: -1.5,
    clipSize: 4, reloadFrames: 130,
    kb: 10,            abilityCooldown: 230, type: 'ranged', weaponType: 'ranged', color: '#cc8833',
    abilityName: 'Mortar Stone',
    ability(user, target) {
      // Mortar arc: launch steeply UP then crash DOWN onto target from above
      // Horizontal velocity scaled by distance so the peak lands above the target
      const _dx = target.cx() - user.cx();
      const _hDist = Math.abs(_dx);
      const _vSign = _dx > 0 ? 1 : -1;
      // Time to fall from apex: rough physics estimate (vy0=-17, gravity ~0.5) gives ~34 frames up
      // So set vx = hDist / 34 to reach target by the time it falls back down
      const _vx = _vSign * Math.min(9, _hDist / 34);
      const proj = new Projectile(
        user.cx() + user.facing * 12, user.y + 14,
        _vx, -17, // very steep upward launch
        user, 28, '#ff6600'
      );
      proj.splashRange = 65;
      proj.dmg = 28;
      proj.color = '#ff6600';
      projectiles.push(proj);
      spawnParticles(user.cx(), user.y + 14, '#ff9933', 12);
      spawnParticles(user.cx(), user.y + 14, '#ffcc44', 6);
    }
  },
  paperairplane: {
    // THE TRICKSTER: Unpredictable arc confuses and disrupts. Unique flight path.
    // Identity: Angles and curves opponents can't predict. Barrage forces dodging.
    name: 'Paper Airplane', damage: 0, range: 800, cooldown: 35, endlag: 8,
    damageFunc: () => 9 + Math.floor(Math.random() * 5), // 9-13 per shot
    bulletSpeed: 7, bulletColor: '#aaccff', bulletVy: -0.5,
    clipSize: 5, reloadFrames: 80,
    kb: 6,                  abilityCooldown: 160, type: 'ranged', weaponType: 'ranged', color: '#ddeeff',
    abilityName: 'Paper Barrage',
    ability(user, _target) {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (!gameRunning || user.health <= 0) return;
          const angle = (Math.random() - 0.5) * 0.55;
          const _pp = new Projectile(
            user.cx() + user.facing * 12, user.y + 20,
            user.facing * (8 + Math.random() * 5) * Math.cos(angle),
            (8 + Math.random() * 5) * Math.sin(angle) - 2,
            user, user.weapon.damageFunc(), '#aaccff'
          );
          _pp._isPaperPlane = true;
          projectiles.push(_pp);
        }, i * 120);
      }
    }
  },
  flail: {
    // THE SWINGER: Heavy, delayed, commitment-heavy. Rewards reading and staying close.
    // Identity: Chain Yank fires ball out then returns — double-hit if you stay in range.
    name: 'Flail',   damage: 21, range: 95, cooldown: 68, endlag: 20,
    kb: 18,          abilityCooldown: 200, type: 'melee', weaponType: 'heavy', color: '#aaaaaa',
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
      user.vx -= user.facing * 4;  // recoil from launch
      spawnParticles(user.cx() + user.facing * 20, user.cy(), '#ffffff', 8);
      spawnParticles(user.cx(), user.cy(), '#aaaaaa', 8);
      screenShake = Math.max(screenShake, 10);
    }
  },

  whip: {
    // THE ZONER: extreme reach with a real sweet spot. The lash only bites hard at
    // the CRACK POINT — the last third of the cord, where it breaks the sound barrier.
    // Land the tip and you hit harder than a sword and open a bleed; let them inside
    // your reach and you are poking with a rope for chip damage.
    // Identity: spacing IS the damage stat. Q hooks one target, E is a long-range barrage.
    name: 'Whip',    damage: 12, range: 150, cooldown: 36, endlag: 13,
    kb: 7,           abilityCooldown: 150, type: 'melee', weaponType: 'light', color: '#cc8833',
    // Sweet-spot tuning — read by the whip branch of the melee hit resolver in smb-fighter.js
    // Max center-to-center melee reach here is FIG_ARM_LEN(24) + tipLen(50) + half a
    // target(~14) + 8 pad ≈ 96, so 70 makes the outer quarter of the range the sweet spot.
    crackDist: 70,   // horizontal gap (px) at/past which a hit counts as a tip crack
    crackMult: 1.55, // damage multiplier on a crack hit (12 → 19)
    hookMult:  1.25, // extra multiplier while the target is Hooked by Lasso
    bleedDmg:  2,    // damage per bleed tick
    bleedTicks: 3,   // ticks applied by a body hit (a crack applies 5)
    abilityName: 'Lasso',
    ability(user, _target) {
      // Lasso the nearest enemy, yank them in, stun — and leave them HOOKED, so every
      // whip hit that lands on them counts as a crack until the hook wears off.
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
        _wTgt.vx = (_wdx / _wlen) * 28;
        _wTgt.vy = (_wdy / _wlen) * 18;
        _wTgt.stunTimer = Math.max(_wTgt.stunTimer || 0, 22);
        _wTgt._whipSlow = 22;
        _wTgt._whipHooked = 150;          // 2.5s window where every lash crits
        _wTgt._whipHookSrc = user;
        dealDamage(user, _wTgt, 15, 0);
        spawnParticles(_wTgt.cx(), _wTgt.cy(), '#cc8833', 14);
        spawnParticles(_wTgt.cx(), _wTgt.cy(), '#ffcc44', 8);
        user._whipCrack = { x: _wTgt.cx(), y: _wTgt.cy(), timer: 16, big: true };
        user._whipRope  = { tx: _wTgt.cx(), ty: _wTgt.cy(), timer: 18, isLasso: true };
        screenShake = Math.max(screenShake, 10);
      } else {
        const _tipX = user.cx() + user.facing * 220;
        user._whipCrack = { x: _tipX, y: user.cy(), timer: 8 };
        spawnParticles(_tipX, user.cy(), '#cc8833', 8);
      }
    }
  },

  boomerang: {
    // THE RETURNER: Ranged weapon whose Q/E come back. Bait the dodge then catch them.
    // Identity: Outgoing throw baits a dodge; the return punishes it.
    name: 'Boomerang', damage: 0, range: 650, cooldown: 55, endlag: 8,
    damageFunc: () => 11 + Math.floor(Math.random() * 5),
    bulletSpeed: 10, bulletColor: '#cc9944',
    clipSize: 3, reloadFrames: 110,
    kb: 8,             abilityCooldown: 175, type: 'ranged', weaponType: 'ranged', color: '#cc9944',
    abilityName: 'Orbit Guard',
    ability(user, _target) {
      // Boomerang orbits user as a spinning shield — hits anyone who enters radius
      if (user._boomOrbit) return; // already active
      user._boomOrbit = {
        angle:  0,
        timer:  50,
        r:      58,
        hitCd:  new Map(),
        ballX:  user.cx(),
        ballY:  user.cy(),
      };
      spawnParticles(user.cx(), user.cy(), '#cc9944', 12);
      spawnRing(user.cx(), user.cy());
    }
  },

  katana: {
    // THE PRECISION BLADE: Fast light melee. Standing still = 2× damage on Iaijutsu.
    // Identity: Patience over aggression. The kill resets everything for Ronin class.
    name: 'Katana',  damage: 14, range: 98, cooldown: 40, endlag: 11,
    kb: 8,           abilityCooldown: 160, type: 'melee', weaponType: 'light', color: '#888899',
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
        // Spawn slash arcs — bigger and brighter when standing still
        if (!user._swordSlashes) user._swordSlashes = [];
        const _iColor = _still ? '#ffffff' : '#aaaadd';
        const _iSize  = _still ? 36 : 22;
        user._swordSlashes.push({ x: user.cx() + user.facing * 22, y: user.cy(),
          vx: user.facing * 14, vy: -0.8, tilt: user.facing * 0.2, facing: user.facing,
          life: _still ? 30 : 20, maxLife: _still ? 30 : 20, size: _iSize, color: _iColor, hitSet: new Set() });
        if (_still) {
          user._swordSlashes.push({ x: user.cx() + user.facing * 28, y: user.cy() + 10,
            vx: user.facing * 11, vy: 0.4, tilt: -user.facing * 0.15, facing: user.facing,
            life: 24, maxLife: 24, size: 28, color: '#ccccff', hitSet: new Set() });
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
    // THE SUPPRESSOR: 25-shot rapid-fire, very short range. Backdraft punishes rushers.
    // Identity: Keep enemies burning from close range; Backdraft when they rush you.
    name: 'Flamethrower', damage: 0, range: 140, cooldown: 7, endlag: 3,
    damageFunc: () => 3 + Math.floor(Math.random() * 2),
    bulletSpeed: 9, bulletColor: '#ff5500',
    clipSize: 25, reloadFrames: 85,
    kb: 2,                abilityCooldown: 135, type: 'ranged', weaponType: 'ranged', color: '#ff4400',
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
    // THE CHAIN STRIKER: Melee with group-shock Q and Overcharge super.
    // Identity: Punishes clustered enemies. Overcharge makes every swing AoE for 4s.
    name: 'Electric Staff', damage: 14, range: 105, cooldown: 40, endlag: 15,
    kb: 10,                  abilityCooldown: 190, type: 'melee', weaponType: 'heavy', color: '#00ccff',
    abilityName: 'Shock Bolt',
    ability(user, _target) {
      // Fire a fast ranged electric orb — on impact explodes and leaves a crackling ground zone
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
    // Boss-only weapon. Heavy hitting melee, massive void slam ability.
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
      // Also hit training dummies
      for (const d of trainingDummies) {
        if (d.health <= 0) continue;
        if (dist(user, d) < 165) dealDamage(user, d, 7, 40);
      }
    }
  },

  mkgauntlet: {
    // Megaknight class weapon — locked to Megaknight. Overrides handled in attack()/ability().
    name: 'Mk. Gauntlets', damage: 30, range: 90, cooldown: 22,
    kb: 32, abilityCooldown: 80, type: 'melee', weaponType: 'heavy', color: '#8844ff',
    contactDmgMult: 0.65, abilityName: 'Grand Slam',
    ability(_user, _tgt) { /* fully overridden by Megaknight class */ }
  },

  // ── ENEMY-ONLY WEAPONS (never available in player weapon picker) ─────────
  nullblade: {
    // Sovereign's signature weapon. Balanced melee — slightly faster cooldown than sword,
    // a touch more KB, and a Dash Slash-style ability that hits harder.
    // enemyOnly: keeps it out of WEAPON_KEYS and all player-facing UI.
    enemyOnly: true,
    name: 'Null Blade', damage: 15, range: 92, cooldown: 28, endlag: 8,
    kb: 13, abilityCooldown: 140, type: 'melee', weaponType: 'light', color: '#cc2200',
    abilityName: 'Counter Step',
    ability(user, target) {
      if (!target || target.health <= 0) return;
      // Counter-hit mechanic: punishes mid-swing opponents harder
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
      // Lunge forward + rapid slashes
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
      // Rapid triple burst — fire 3 projectiles in quick sequence
      spawnBullet(user, 22, '#00eeff', 11);
      spawnBullet(user, 20, '#00ccdd', 11);
      spawnBullet(user, 18, '#0099bb', 11);
      spawnParticles(user.cx(), user.cy(), '#00ddff', 6);
    }
  }
};

const WEAPON_KEYS = Object.keys(WEAPONS).filter(k => k !== 'gauntlet' && k !== 'mkgauntlet' && !WEAPONS[k].enemyOnly);

// Weapons whose tone doesn't fit Story Mode (kept in versus/sandbox/minigames).
// Story launch flow and the story mastery panel filter against this list.
const STORY_TONE_EXCLUDED_WEAPONS = ['paperairplane', 'peashooter', 'fryingpan', 'broomstick', 'slingshot'];

// ============================================================
// WEAPON SWING GRAMMAR — per-weapon attack identity
// ============================================================
// Design contract: docs/weapon-identity-spec.md
// Each melee weapon gets a distinct swing: angle path a0→a1 (radians, facing-right,
// mirrored automatically), easing curve, duration (frames), optional reach curve
// (thrusts animate tip distance instead of angle), grip tilt while attacking,
// tipLen (weapon length px for hitbox reach), optional hitFracs (hitbox sample
// fractions along reach), and trail {life, cap, width} for the swing ribbon.
// Ranged entries are firing-pose only (tilt 0 keeps the weapon level).
// Weapons without an entry fall back to the legacy 12-frame diagonal slash.
const WEAPON_SWINGS = {
  // ── melee ──────────────────────────────────────────────────────────────
  sword:         { archetype: 'slash',  dur:  9, a0: -0.65, a1: 1.15, ease: 'snap',   tilt: 0.6,  tipLen: 26, trail: { life:  9, cap: 6,  width: 5 } },
  katana:        { archetype: 'iai',    dur:  7, a0: -0.35, a1: 0.95, ease: 'iai',    tilt: 0.5,  tipLen: 30, trail: { life: 13, cap: 8,  width: 4 },
                   hitSound: 'pierce', carry: { arm: 0.80, tilt: 0.45 } },  // held low at the hip, blade angled down — ready stance
  hammer:        { archetype: 'smash',  dur: 15, a0: -1.85, a1: 0.95, ease: 'heavy',  tilt: 0.7,  tipLen: 30, trail: { life: 14, cap: 9,  width: 10 },
                   hitSound: 'blunt', carry: { arm: -0.90, tilt: -0.50 } }, // head rested up over the shoulder
  fryingpan:     { archetype: 'smash',  dur: 12, a0: -1.55, a1: 0.80, ease: 'heavy',  tilt: 0.7,  tipLen: 26, trail: { life: 11, cap: 7,  width: 8 },
                   hitSound: 'clang', carry: { arm: 1.05, tilt: 0.25 } },   // dangling at the side like a skillet
  axe:           { archetype: 'cleave', dur: 12, a0: -1.05, a1: 1.35, ease: 'snap',   tilt: 0.65, tipLen: 26, trail: { life: 12, cap: 8,  width: 8 },
                   carry: { arm: 0.95, tilt: -0.20 } },                     // held low at the side
  scythe:        { archetype: 'sweep',  dur: 14, a0: -1.45, a1: 1.65, ease: 'sweep',  tilt: 0.8,  tipLen: 30, trail: { life: 13, cap: 9,  width: 7 },
                   carry: { arm: -1.30, tilt: -0.20 } },                    // upright reaper pose, blade overhead
  spear:         { archetype: 'thrust', dur: 10, a0:  0.10, a1: 0.02, ease: 'linear', tilt: 0.06, tipLen: 40,
                   reach: { r0: 0.45, r1: 1.0, ease: 'thrust' }, hitFracs: [0.45, 0.7, 0.9, 1.0], trail: { life: 8, cap: 6, width: 4 },
                   hitSound: 'pierce', carry: { arm: -1.15, tilt: -0.75 } }, // shouldered, point up-back
  broomstick:    { archetype: 'poke',   dur:  8, a0:  0.18, a1: -0.06, ease: 'linear', tilt: 0.1, tipLen: 34,
                   reach: { r0: 0.5, r1: 1.0, ease: 'thrust' }, hitFracs: [0.5, 0.75, 1.0], trail: { life: 7, cap: 5, width: 4 },
                   hitSound: 'pierce', carry: { arm: -1.00, tilt: -0.85 } }, // slung over the shoulder
  whip:          { archetype: 'crack',  dur: 11, a0: -0.55, a1: 0.35, ease: 'snap',   tilt: 0.15, tipLen: 50,
                   reach: { r0: 0.35, r1: 1.0, ease: 'crack' }, hitFracs: [0.4, 0.65, 0.85, 1.0], trail: { life: 10, cap: 8, width: 3 },
                   // Alternating lash: odd swings crack DOWN from overhead, even swings
                   // sweep UP off the floor. Same reach, visibly different attack.
                   alternate: true, altOff: [-0.58, 0.42],
                   hitSound: 'snap', carry: { arm: 1.00, tilt: 0.40 } },     // coiled low at the side
  combat:  { archetype: 'jab',    dur:  5, a0:  0.12, a1: -0.10, ease: 'linear', tilt: 0.0, tipLen: 16, alternate: true,
                   reach: { r0: 0.4, r1: 1.0, ease: 'jab' }, hitFracs: [0.6, 1.0], trail: { life: 6, cap: 4, width: 4 },
                   hitSound: 'blunt', carry: { arm: -0.35, lArm: -0.60 } },  // guard stance — both fists up
  flail:         { archetype: 'whirl',  dur: 16, a0: -2.6,  a1: 1.25, ease: 'heavy',  tilt: 0.55, tipLen: 28, trail: { life: 14, cap: 10, width: 6 },
                   hitSound: 'blunt', carry: { arm: 1.10, tilt: 0.50 } },    // ball dangling straight down
  shield:        { archetype: 'bash',   dur:  8, a0:  0.15, a1: -0.05, ease: 'linear', tilt: 0.0, tipLen: 16,
                   reach: { r0: 0.5, r1: 1.0, ease: 'jab' }, hitFracs: [0.7, 1.0], trail: { life: 0, cap: 0, width: 0 },
                   hitSound: 'clang', carry: { arm: 0.35, tilt: 0.0 } },     // held braced in front
  electricstaff: { archetype: 'strike', dur: 11, a0: -0.95, a1: 1.25, ease: 'snap',   tilt: 0.6,  tipLen: 30, trail: { life: 11, cap: 8, width: 6 },
                   hitSound: 'zap', carry: { arm: 0.70, tilt: -1.30 } },     // walking-staff, held upright
  // ── enemy-only melee (distinct from sword so duels read differently) ───
  nullblade:     { archetype: 'slash',  dur: 10, a0: -0.85, a1: 1.05, ease: 'snap',   tilt: 0.55, tipLen: 26, trail: { life: 10, cap: 7, width: 5 } },
  voidblade:     { archetype: 'slash',  dur:  9, a0: -0.50, a1: 1.20, ease: 'iai',    tilt: 0.5,  tipLen: 24, trail: { life: 10, cap: 7, width: 4 } },
  // ── ranged firing poses (no swing — recoil/throw arcs, weapon stays level) ──
  gun:           { archetype: 'point',  a0: -0.45, a1: 0.02, ease: 'recoil', tilt: 0.0, carry: { arm: 0.55, tilt: -0.35 } }, // low ready, muzzle slightly up
  peashooter:    { archetype: 'point',  a0: -0.18, a1: 0.00, ease: 'recoil', tilt: 0.0 },
  bow:           { archetype: 'aim',    a0: -0.08, a1: 0.00, ease: 'recoil', tilt: 0.0, carry: { arm: 0.85, tilt: 0.30 } },  // held down at the side
  slingshot:     { archetype: 'aim',    a0:  0.35, a1: -0.10, ease: 'recoil', tilt: 0.0 },
  paperairplane: { archetype: 'throw',  a0: -0.95, a1: 0.30, ease: 'snap',   tilt: 0.0 },
  boomerang:     { archetype: 'throw',  a0: -1.20, a1: 0.50, ease: 'snap',   tilt: 0.0 },
  flamethrower:  { archetype: 'hose',   a0:  0.12, a1: -0.06, ease: 'recoil', tilt: 0.0 },
  shockrifle:    { archetype: 'point',  a0: -0.30, a1: 0.02, ease: 'recoil', tilt: 0.0 },
};

// Easing curves for swing motion. p in [0,1] → interpolation factor (may dip
// below 0 for wind-back or overshoot past 1 — that's intentional).
function swingEase(p, type) {
  switch (type) {
    case 'snap': { // accelerating whip — no wind-back, starts immediately
      return 1 - Math.pow(1 - p, 3);
    }
    case 'iai': { // brief held tension, then near-instant cut (windup 0.45→0.25)
      if (p < 0.25) return -0.04 * (p / 0.25);
      const q = (p - 0.25) / 0.75;
      return -0.04 + 1.04 * (1 - Math.pow(1 - q, 4));
    }
    case 'heavy': { // slow rising windup, accelerating drop
      // Windup fraction tuned 0.42→0.35 after playtest: commitment stays, but the
      // dead window before the drop was a couple frames too long
      if (p < 0.35) return 0.10 * (p / 0.35);
      const q = (p - 0.35) / 0.65;
      return 0.10 + 0.90 * q * q;
    }
    case 'sweep': // smooth ease-in-out full-body arc
      return p * p * (3 - 2 * p);
    case 'thrust': { // pierce out fast, hold, partial retract
      if (p < 0.40) { const q = p / 0.40; return 1 - Math.pow(1 - q, 3); }
      if (p < 0.70) return 1;
      return 1 - 0.45 * ((p - 0.70) / 0.30);
    }
    case 'jab': // out-and-back punch
      return p < 0.45 ? (p / 0.45) : 1 - 0.9 * ((p - 0.45) / 0.55);
    case 'crack': { // accelerating lash, overshoot wobble at full extension
      if (p < 0.5) { const q = p / 0.5; return q * q; }
      const q = (p - 0.5) / 0.5;
      return 1 + 0.08 * Math.sin(q * Math.PI * 2) - 0.5 * q * q;
    }
    case 'recoil': // fast settle from kicked-up firing pose
      return 1 - Math.pow(1 - p, 2);
    default:
      return p;
  }
}

// Returns { ang, reachFrac } for a weapon mid-swing. atkP in [0,1] (swing
// progress), facing ±1 (angle mirrored for facing left), alt toggles the
// boxing-gloves high-jab/body-hook alternation. Single source of truth for
// hitbox AND visuals — never re-derive the swing angle elsewhere.
function swingPose(weaponKey, atkP, facing, alt) {
  const g = WEAPON_SWINGS[weaponKey];
  const p = Math.min(1, Math.max(0, atkP));
  let ang, reachFrac = 1;
  if (g) {
    let a0 = g.a0, a1 = g.a1;
    // altOff lets a weapon define its own two-pose alternation (whip: overhead
    // crack vs. floor sweep); weapons without it keep the boxing-glove offsets.
    if (g.alternate) { const off = alt ? (g.altOff ? g.altOff[0] : 0.30) : (g.altOff ? g.altOff[1] : -0.12); a0 += off; a1 += off; }
    ang = a0 + (a1 - a0) * swingEase(p, g.ease);
    if (g.reach) reachFrac = g.reach.r0 + (g.reach.r1 - g.reach.r0) * swingEase(p, g.reach.ease);
  } else {
    ang = -0.45 + (1.1 - -0.45) * p; // legacy diagonal slash
  }
  if (facing < 0) ang = Math.PI - ang;
  return { ang, reachFrac };
}

// ============================================================
// CHARACTER CLASSES
// ============================================================
const CLASSES = {
  none:      { name: 'None',      desc: 'Standard balanced fighter',            weapon: null,     hp: 150, speedMult: 1.00, perk: null           },
  warrior:   { name: 'Warrior',   desc: 'Disciplined melee fighter. Sturdy, no frills.', weapon: null, hp: 120, speedMult: 1.00, perk: null   },
  thor:      { name: 'Torren',      desc: 'Hammer master, thunder on dash',       weapon: 'hammer', hp: 140, speedMult: 0.90, perk: 'thunder'      },
  kratos:    { name: 'Varek',    desc: 'Axe specialist, rage at low HP',       weapon: 'axe',    hp: 145, speedMult: 0.95, perk: 'rage'         },
  ninja:     { name: 'Ninja',     desc: 'Fast sword fighter, quick dash',       weapon: 'sword',  hp: 90,  speedMult: 1.24, perk: 'swift'        },
  gunner:    { name: 'Gunner',    desc: 'Dual-shot gunslinger',                 weapon: 'gun',    hp: 110, speedMult: 1.06, perk: 'dual_shot'    },
  archer:    { name: 'Archer',    desc: 'Bow-only. Fast. Auto-backstep at low HP.', weapon: 'bow', hp: 95, speedMult: 1.20, perk: 'backstep'    },
  paladin:   { name: 'Paladin',   desc: 'Shield-only. Tanky. 15% dmg reduction.', weapon: 'shield', hp: 160, speedMult: 0.88, perk: 'holy_light' },
  berserker:  { name: 'Berserker',  desc: 'Any weapon. Rage boosts dmg at low HP.',             weapon: null, hp: 130, speedMult: 1.08, perk: 'blood_frenzy' },
  megaknight: { name: 'Megaknight', desc: 'Legendary knight. Smash, uppercut, and crush enemies.', weapon: 'mkgauntlet', hp: 170, speedMult: 0.84, perk: null },
  pugilist:   { name: 'Pugilist',   desc: 'Combat brawler. Fast and durable. Counter reads + Combo Strike fires free at low HP.', weapon: 'combat', hp: 135, speedMult: 1.15, perk: 'surge_fist'  },
  ronin:      { name: 'Ronin',      desc: 'Katana master. Iaijutsu kills reset all cooldowns.',                         weapon: 'katana',       hp: 115, speedMult: 1.18, perk: 'death_step'    },
  reaper:     { name: 'Reaper',     desc: 'Scythe specialist. Revives once when near death.',                           weapon: 'scythe',       hp: 125, speedMult: 1.00, perk: 'revive'       },
  summoner:   { name: 'Summoner',   desc: 'Calls a fragile familiar that harries your enemy. Any weapon.',                weapon: null,           hp: 120, speedMult: 1.05, perk: 'call_familiar' },
};

// Damage multipliers applied when a class uses a weapon of a given weaponType.
// Keys must match classKey values used in applyClass().
const CLASS_AFFINITY = {
  archer: {
    light: 0.9,
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
    light: 1.25,
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

// ============================================================
// WEAPON & CLASS DESCRIPTIONS  (shown in menu sidebar)
// ============================================================
const WEAPON_DESCS = {
  random:  { title: 'Random Weapon',  what: 'Picks a random weapon each game — embrace the chaos.',                                                         ability: null,                                                              super: null,                                                               how:  'Adapt to whatever you get each round.' },
  sword:   { title: 'Sword',          what: 'Fast, balanced melee weapon with good range. Damage: 16.',                                                     ability: 'Q — Blade Storm: 4 crescent arcs burst in all directions (24 dmg). No movement — pure coverage.',  super: 'E — Air Slash: 3 crescent arcs fan outward in sequence.',          how:  'Base = single forward swing. Q = omnidirectional burst. E = sequential forward fan.' },
  hammer:  { title: 'Hammer',         what: 'Slow but devastating. Huge knockback on every hit. Damage: 22.',                                               ability: 'Q — Ground Shockwave: slam down, a shockwave TRAVELS horizontally from your feet (28 dmg, launches up).', super: 'E — Mjolnir Spin: spinning AoE contact hits, ends with a launch.',  how:  'Base = direct swing. Q = traveling ground wave. E = spinning tornado in place.' },
  gun:     { title: 'Gun',            what: 'Ranged weapon. Each bullet deals 5–8 damage. Fires splash rounds.',                                            ability: 'Q — Rapid Fire: 5-shot burst.',                                   super: 'E — Bullet Storm: 14 rapid shots (9–12 dmg each).',               how:  'Keep your distance. Use Rapid Fire to pressure from afar.' },
  axe:     { title: 'Axe',            what: 'Balanced melee with solid damage, good knockback, and splash hits. Damage: 15.',                               ability: 'Q — Spin Attack: stationary 360° AoE slash — covers all angles.', super: 'E — Axe Throw: hurl your axe across the arena (38 dmg, large radius); it curves back.', how: 'Spin Attack covers close range. Axe Throw punishes enemies at any distance.' },
  spear:   { title: 'Spear',          what: 'Longest melee reach in the game. Consistent damage. Damage: 18.',                                              ability: 'Q — Ground Spike: slam spear down, AoE upward launch for 20 dmg.', super: 'E — Lance Charge: sustained forward pierce burst for 28 dmg.',     how:  'Poke from range. Use Ground Spike when enemies rush you.' },
  bow:     { title: 'Bow ⚔ Archer only', what: 'Long-range arc weapon. Arrows deal 12–20 damage and arc slightly over distance.', ability: 'Q — Triple Shot: fires 3 arrows in a fan spread.',       super: 'E — Power Arrow: giant arrow for 60 dmg with high knockback.',    how:  'Stay back and poke. Triple Shot punishes clustered enemies. ARCHER CLASS REQUIRED.' },
  shield:  { title: 'Shield ⚔ Paladin only', what: 'Defensive melee weapon. High knockback. Damage: 10.', ability: 'Q — Shield Bash: pushes enemy back and stuns for 25 frames.',              super: 'E — Holy Nova: AoE burst, heals self and deals 40 dmg to nearby foes.', how: 'Block with S key to absorb bullets. Bash enemies away. PALADIN CLASS REQUIRED.' },
  scythe:       { title: 'Scythe',         what: 'Wide-arc melee with splash damage. Heals on hit. Damage: 14.',               ability: 'Q — Scythe Toss: hurl the blade forward (22 dmg out / 14 dmg return). No lifesteal.', super: 'E — Soul Reap: charge forward + sweep arcs, lifesteal AoE for 32 dmg.', how: 'Base heals on melee contact. Q is a ranged blade — throw it and bait the return. E is the lifesteal finisher.' },
  fryingpan:    { title: 'Frying Pan',     what: 'Slow but punishing melee. Solid knockback and AoE ground pound. Damage: 18.',          ability: 'Q — Ground Pound: AoE shockwave from feet — launches ALL nearby enemies straight up.', super: 'E — Grand Slam: single-target overhead launch — massive upward force for 45 dmg.', how: 'Ground Pound clears crowds upward. Grand Slam sends one target flying for a ceiling combo.' },
  broomstick:   { title: 'Broomstick',     what: 'Long-reach melee. Low damage but pushes enemies away. Damage: 12.',               ability: 'Q — Broom Ride: rocket through the air on the broom — 16 dmg aerial body-check to anyone in your path.', super: 'E — Tornado Spin: spin push that hits all directions.',           how:  'Base = ground poke. Q = aerial flying ram. E = stationary spin push.' },
  combat: { title: 'Combat',         what: 'Fast alternating punches and kicks. Up-close brawler. Damage: 11.',                ability: 'Q — Counter: enter a parry stance. Absorb the next hit, teleport behind the attacker, and launcher-kick them upward (18 dmg).', super: 'E — Combo Strike: dash to target, kick them airborne (22 dmg), then blast them away with a power punch (34 dmg).', how:  'Counter reads punishes aggressive players. Combo Strike is a guaranteed two-hit sequence — use it to close out fights.' },
  peashooter:   { title: 'Pea Shooter',    what: 'Rapid-fire ranged weapon. Very low damage per pea (2-3). High fire rate.',        ability: 'Q — Pea Storm: 10 rapid shots.',                               super: 'E — Cluster Bomb: large pea detonates into 10 radial peas (8-12 dmg each).', how: 'Whittle with shots. Cluster Bomb punishes enemies in tight spots.' },
  slingshot:    { title: 'Slingshot',      what: 'Ranged weapon with arc trajectory. Moderate damage (10-14). Slow fire rate.',     ability: 'Q — Mortar Stone: steep upward arc falls DOWN from above (65px splash, 28 dmg).', super: 'E — Gravity Stone: slow boulder; detonates with a 220px gravity pull for 52 dmg.', how: 'Mortar Stone bypasses shields by dropping from above. Gravity Stone pulls victims into it.' },
  paperairplane: { title: 'Paper Airplane',  what: 'Very slow curving projectile. Low damage (9-13) but unpredictable arc.',          ability: 'Q — Barrage: 5 airplanes at staggered angles.',                   super: 'E — Origami Swarm: 8 homing planes that chase and track enemies.',    how:  'Confuse enemies with the arc. Swarm corners enemies with nowhere to run.' },
  flail:         { title: 'Flail',           what: 'Heavy melee with a swinging chain ball. Damage: 21.',                              ability: 'Q — Chain Yank: fire ball forward (26 dmg), returns for 16 dmg.',  super: 'E — Orbit Storm: ball orbits at high speed, 12 dmg per contact.',    how:  'Commit hard or miss hard. Stay close during the return to land both hits.' },
  whip:          { title: 'Whip',            what: 'Longest melee reach, with a sweet spot. The tip of the lash hits for 18 and opens a bleed; up close it only chips for 12. Swings alternate overhead crack / floor sweep.', ability: 'Q — Lasso: yank ONE enemy in (15 dmg, stun 22) and HOOK them — for 2.5s every lash on them counts as a tip crack.', super: 'E — Serpent\'s Coil: three extending lashes out to 430px, 13 dmg each + bleed; the third one launches everything it touches.', how:  'Fight at the very edge of your range. Q hooks a target so your chip hits become crits. E is a long-range barrage, not a pull.' },
  boomerang:     { title: 'Boomerang',       what: 'Ranged weapon. Normal throw: 11-15 dmg. Q/E have returning throws.',             ability: 'Q — Orbit Guard: boomerang circles you as a spinning shield, hitting nearby enemies.',  super: 'E — Boomerang Blitz: 4-way 360° burst — forward, backward, and two arcing up. All return.', how: 'Use Orbit Guard defensively when enemies rush. Blitz covers all directions at once.' },
  katana:        { title: 'Katana',          what: 'Fast precise melee weapon. Damage: 14.',                                           ability: 'Q — Iaijutsu: standing still = 28 dmg, no dash. Moving = 22 dmg + forward dash.', super: 'E — Shadow Step: instantly teleport to the far side of the nearest enemy (≤450px), 38 dmg + 3 slash arcs.', how:  'Q rewards patience — stand still for burst damage. E repositions you for the kill.' },
  flamethrower:  { title: 'Flamethrower',    what: 'Rapid-fire 25-shot clip. Short range. Low damage per shot (3-4).',                ability: 'Q — Napalm Spit: fireball with 75px splash for 24 dmg. Pushes you back.', super: 'E — Backdraft: reverse launch + 40 dmg AoE burst in front.',    how:  'Suppress with rapid fire. Backdraft punishes enemies who rush you.' },
  electricstaff: { title: 'Electric Staff',  what: 'Melee that chain-zaps nearby enemies on every hit. Damage: 14.',                  ability: 'Q — Shock Bolt: fire a fast electric orb (13 dmg); impact leaves a crackling ground zone.', super: 'E — Thunderstrike: call 4 lightning bolts from the sky targeting the enemy (20 dmg each).', how:  'Base attack chain-damages groups automatically. Shock Bolt zones the ground. Thunderstrike from any range.' },
};

const CLASS_DESCS = {
  none:      { title: 'No Class',   what: 'No class modifier. Full freedom of weapon choice. HP: 150.',                                                                   perk: null,                                                                                                                              how:  'Choose any weapon — pure skill matters.' },
  thor:      { title: 'Torren',       what: 'Hammer master. Slower movement but powerful strikes. Forces Hammer. HP: 140.',                                                   perk: 'Lightning Storm (≤20% HP, once): Summons 3 lightning bolts — 8 dmg + stun each. Activates automatically.',                        how:  'Tank hits to trigger the lightning perk when low. Then finish with your super.' },
  kratos:    { title: 'Varek',     what: 'Axe specialist. More HP, builds rage when hit. Forces Axe. HP: 145.',                                                            perk: 'Undying Rage (≤15% HP, once): Auto-heals to 30% HP and boosts damage by +30% for 5 seconds.',                                     how:  'Survive the threat threshold — let the rage save you. Strike hard in the buff window.' },
  ninja:     { title: 'Ninja',      what: 'Extremely fast sword fighter. Fragile but elusive. Forces Sword. HP: 90.',                                                       perk: 'Shadow Step (≤25% HP, once): 2 seconds of full invincibility and all cooldowns reset instantly.',                                  how:  'Use your speed advantage to dodge. The perk buys time to escape and counter.' },
  gunner:    { title: 'Gunner',     what: 'Dual-shot gunslinger — fires 2 bullets every shot. Forces Gun. HP: 110.',                                                         perk: 'Last Stand (≤20% HP, once): Fires 8 bullets in all directions for 3–5 dmg each.',                                                 how:  'Keep distance at all times. The burst perk punishes enemies who close in when you\'re low.' },
  archer:    { title: 'Archer',     what: 'Long-range bow fighter. Fast movement, low HP. Forces Bow. HP: 95.',                                                              perk: 'Back-Step (≤20% HP): Auto-dash backward and reset double jump when threatened.',                                                  how:  'Stay at range. The auto-backstep keeps you alive when pressured.' },
  paladin:   { title: 'Paladin',    what: 'Tanky shield warrior. Slower movement, high HP. Forces Shield. HP: 160.',                                                         perk: 'Holy Light (≤25% HP): AoE healing pulse — heals self 20 HP, deals 15 dmg to nearby enemies.',                                    how:  'Block and bash. The perk punishes opponents who rush you when you\'re low.' },
  berserker: { title: 'Berserker',  what: 'Any-weapon brawler. Strong and sturdy. HP: 130.',                                                                                 perk: 'Blood Frenzy (≤15% HP): 3 seconds of +50% damage and ×1.4 speed.',                                                              how:  'Play aggressively and stack risk — the frenzy perk rewards surviving near death.' },
  pugilist:  { title: 'Pugilist',   what: 'Combat brawler. Fast and durable. Forces Combat. HP: 135.',                                                           perk: 'Surge Strike (≤20% HP, once): Auto-triggers Combo Strike — free, no super meter cost.',                                         how:  'Counter reads and keep pressing. Surge Strike saves you when nearly dead.' },
  ronin:     { title: 'Ronin',      what: 'Katana specialist. Fastest class, fragile. Forces Katana. HP: 115.',                                                               perk: 'Death Step (passive): Kill with Iaijutsu while standing still → all cooldowns reset instantly.',                                  how:  'Hesitate, land the standing Q kill, and chain resets for perpetual momentum.' },
  reaper:    { title: 'Reaper',     what: 'Scythe specialist. Balanced pace and solid HP. Forces Scythe. HP: 125.',                                                           perk: 'Revive (≤8% HP, once): Instantly restore 40% HP. If that HP bar is depleted, you\'re gone.',                                    how:  'Fight aggressively — the perk is your safety net. After it fires, one more good hit ends you.' },
  summoner:  { title: 'Summoner',  what: 'Any weapon. A fragile familiar fights beside you, spawning every 15s (max 1). It chips and distracts — it cannot launch. HP: 120.', perk: 'Desperate Bond (≤20% HP, once): Immediately spawn familiar if absent and empower it for 10s (+70% damage).',                   how:  'Use the familiar to split attention, not to out-damage. Killing it buys your enemy 10s of relief, so protect it.' },
};
