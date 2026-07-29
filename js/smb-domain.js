// smb-domain.js — Conviction system
// Loaded after: smb-combat.js, smb-fighter.js, smb-enemies-class.js, smb-god.js
// Loaded before: smb-loop-core.js
// Globals used: players, gameRunning, GAME_W, GAME_H, ctx, canvas, dealDamage,
//               spawnParticles, queueAnnouncement, slowMotion, screenShake

'use strict';

// ── Domain Definitions ────────────────────────────────────────────────────
// One entry per class key.  'none' has no domain — 5th super fires normally.
const DOMAIN_DEFS = {
  thor: {
    name:       'Storm Realm',
    color:      '#44aaff',
    bgTint:     'rgba(10,30,80,0.52)',
    spawnEvery: 38,           // lightning strikes relentlessly
    hazardType: 'lightning',
    ownerBuff: { speed: true },
    announce:   'The sky tears open — lightning reigns!',
  },
  kratos: {
    name:       'Warpath Domain',
    color:      '#ff5500',
    bgTint:     'rgba(70,15,0,0.52)',
    spawnEvery: 34,           // logs roll in constantly
    hazardType: 'debris',
    ownerBuff: { power: true },
    announce:   'The rage of a dead bearer — no mercy, no escape!',
  },
  ninja: {
    name:       'Shadow Realm',
    color:      '#bb44ff',
    bgTint:     'rgba(8,0,28,0.60)',
    spawnEvery: 0,            // no hazard rain — the slow IS the domain
    hazardType: null,
    ownerBuff: {},            // owner keeps normal speed; everyone else is slowed
    slowFactor: 0.5,          // victims run at half time (bosses resist: +0.25)
    announce:   'The shadows drag at your limbs — only one moves free!',
  },
  gunner: {
    name:       'Arsenal Domain',
    color:      '#ff9900',
    bgTint:     'rgba(35,15,0,0.48)',
    spawnEvery: 26,
    hazardType: 'bullet',
    ownerBuff: {},
    announce:   'Weapons free — total fire superiority!',
  },
  archer: {
    name:       'Verdant Hunt',
    color:      '#44ff88',
    bgTint:     'rgba(0,35,10,0.48)',
    spawnEvery: 40,
    hazardType: 'arrow',
    ownerBuff: {},
    announce:   'The hunt begins — the forest has eyes!',
  },
  paladin: {
    name:       'Holy Sanctuary',
    color:      '#ffffaa',
    bgTint:     'rgba(70,65,20,0.40)',
    spawnEvery: 52,
    hazardType: 'holy_beam',
    ownerBuff:  { healPerFrame: 0.016 },
    announce:   'Divine judgment descends — the unworthy burn!',
  },
  berserker: {
    name:       'Blood Arena',
    color:      '#ff2222',
    bgTint:     'rgba(55,0,0,0.55)',
    spawnEvery: 0,
    hazardType: null,
    ownerBuff:  { speed: true, power: true, healPerFrame: 0.020 },
    announce:   'Blood and fury — death walks among you!',
  },
  megaknight: {
    name:       'Void Rift',
    color:      '#9944ff',
    bgTint:     'rgba(18,0,55,0.55)',
    spawnEvery: 0,
    hazardType: 'void_rock',
    ownerBuff:  {},
    announce:   'Reality tears — the void claims this arena!',
  },
  ronin: {
    name:       'Death\'s Dojo',
    color:      '#ccccff',
    bgTint:     'rgba(5,5,25,0.60)',
    spawnEvery: 0,
    hazardType: null,
    ownerBuff:  { speed: true },
    sheatheEvery: 240,        // frames between iai sheathe detonations
    cutDamage:    7,          // damage per deferred cut on detonation
    maxCuts:      5,          // max cut marks per target
    announce:   'Every cut waits. The sheath decides.',
  },
  reaper: {
    name:       'Eternal Harvest',
    color:      '#cc44cc',
    bgTint:     'rgba(20,5,20,0.58)',
    spawnEvery: 0,
    hazardType: null,
    ownerBuff:  {},           // sustain comes from harvested souls, not a flat drip
    harvestEvery: 300,        // frames between Reapings — souls launch as homing skulls
    soulDamage:   9,          // damage per launched soul on impact
    maxSouls:     8,          // orbiting soul cap
    healPerSoul:  0.006,      // per-frame heal per orbiting soul (full orbit ≈ 2.9 hp/s)
    announce:   'The harvest never ends — your soul is mine.',
  },
  pugilist: {
    name:       'Iron Arena',
    color:      '#ee4444',
    bgTint:     'rgba(30,5,5,0.52)',
    spawnEvery: 0,
    hazardType: null,
    ownerBuff:  { power: true },
    announce:   'Nobody leaves the iron arena standing.',
  },
  warrior: {
    name:       'The Proving Grounds',
    color:      '#e0b070',
    bgTint:     'rgba(42,28,8,0.50)',
    spawnEvery: 46,           // sword eruptions, telegraphed
    hazardType: 'blade_wall',
    ownerBuff:  { power: true },
    ringStart:  300,          // duel ring radius at expansion
    ringEnd:    170,          // radius it closes to
    ringDamage: 12,           // per tick to anyone outside the ring
    ringEvery:  40,           // frames between ring ticks
    announce:   'Step into the ring. No one leaves untested.',
  },
  summoner: {
    name:       'Endless Menagerie',
    color:      '#66ffcc',
    bgTint:     'rgba(0,34,32,0.50)',
    spawnEvery: 58,           // familiars stream in
    hazardType: 'spirit_swarm',
    ownerBuff:  { healPerFrame: 0.010 },
    swarmDamage: 16,          // per familiar — it dies on contact
    announce:   'They never stopped answering. They never will.',
  },
  // Sovereign has no class — this domain is reached through `_domainKey`, not
  // `charClass` (see _domainKeyOf). Keyed 'sovereign' so nothing a player can
  // equip resolves to it.
  sovereign: {
    name:       'Absolute Dominion',
    color:      '#ff3311',
    bgTint:     'rgba(30,0,0,0.56)',
    spawnEvery: 0,            // the closing corridor IS the domain — no hazard rain
    hazardType: 'null_wall',
    ownerBuff:  { power: true },
    wallStart:  400,          // corridor half-width at expansion
    wallEnd:    155,          // half-width it closes to over the domain's life
    wallDamage: 17,
    announce:   'The field is mine. You fight where I allow.',
  },
  none: {
    name:       'Primal Surge',
    color:      '#cccccc',
    bgTint:     'rgba(8,8,8,0.46)',
    spawnEvery: 50,
    hazardType: 'chaos_bolt',
    ownerBuff:  { speed: true, power: true },
    announce:   'No class. No limits. Just raw power.',
  },
};

// ── DomainManager singleton ───────────────────────────────────────────────
const DomainManager = (() => {
  const RISE_FRAMES   = 300; // 5 s at 60 fps
  const DOMAIN_FRAMES = 25 * 60; // 25 s
  // Minimum frames between two domain-hazard hits on the same target (see
  // _dealDomainDamage). 15 frames = 4 hits/s ceiling — still lethal if you stand
  // still, but it guarantees a reaction window instead of instant deletion.
  const _DOMAIN_HIT_CD = 15;

  // Frames between passive-weapon fires during active domain
  const _PASSIVE_CDS = {
    sword: 48, hammer: 72, gun: 20, axe: 60,
    spear: 55, bow: 70, shield: 95, scythe: 55,
    fryingpan: 85, broomstick: 60, combat: 75, peashooter: 16,
    slingshot: 68, paperairplane: 52, flail: 95, whip: 62,
    boomerang: 56, katana: 32, flamethrower: 90, electricstaff: 42,
    shuriken: 40, // ninja-class domains only — replaces the weapon passive
  };

  // [{owner, defKey, def, timer, hazards[], spawnCooldown}]
  let _domains = [];
  // [{fighter, timer}]
  let _rising  = [];

  // ── Domain entry cinematic tracking ────────────────────────────────
  let _domainCinActive = false;
  let _domainCinOwner  = null;

  // ── Domain play region ──────────────────────────────────────────────
  // Every hazard position below was authored in 0..GAME_W screen space, but
  // hazard.x is compared against fighter.cx() — WORLD space. In a 900px arena
  // those coincide; in a scrolling story world (worldWidth 3600+) the whole
  // domain anchored itself to world x 0..900 no matter where the fight was, so
  // hazards spawned off in the far left of the map and never reached anyone.
  //
  // _dAnchorOrigin picks the left edge of a GAME_W-wide region around the owner,
  // clamped inside the world. It is resolved ONCE at expansion and stored on the
  // domain, so hazards already in flight never shift when the camera moves.
  // In a 900px arena it returns 0 and every offset below is unchanged.
  function _dAnchorOrigin(fighter) {
    const wl = (typeof worldLeftBound  === 'function') ? worldLeftBound()  : 0;
    const wr = (typeof worldRightBound === 'function') ? worldRightBound() : GAME_W;
    if (wr - wl <= GAME_W) return wl;
    const c = (fighter && typeof fighter.cx === 'function') ? fighter.cx() : (wl + wr) / 2;
    return Math.max(wl, Math.min(wr - GAME_W, c - GAME_W / 2));
  }
  // Origin of a live domain's region. Defensive default keeps legacy behaviour.
  function _dOX(domain) {
    return (domain && isFinite(domain.originX)) ? domain.originX : 0;
  }

  // Which DOMAIN_DEFS entry a fighter expands into. Classed fighters use their
  // class; `_domainKey` lets a classless entity (Sovereign) own a domain without
  // being given a charClass, which would pull in CLASSES/CLASS_AFFINITY lookups
  // and class rendering it was never built for.
  function _domainKeyOf(fighter) {
    if (!fighter) return null;
    return fighter._domainKey || fighter.charClass;
  }

  // ── Hazard spawning ─────────────────────────────────────────────────

  function _spawnHazard(domain) {
    const { def } = domain;
    const OX = _dOX(domain);
    switch (def.hazardType) {
      case 'lightning': {
        // 2 bolts every interval — dense pressure; first bolt aimed at an enemy
        const count = Math.random() < 0.55 ? 2 : 1;
        const _enemies = typeof players !== 'undefined'
          ? players.filter(p => p !== domain.owner && p.health > 0 && !p.isBoss)
          : [];
        for (let i = 0; i < count; i++) {
          let x;
          if (i === 0 && _enemies.length > 0) {
            const _tgt = _enemies[Math.floor(Math.random() * _enemies.length)];
            x = _tgt.cx() + (Math.random() - 0.5) * 80;
          } else {
            x = OX + 50 + Math.random() * (GAME_W - 100);
          }
          x = Math.max(OX + 50, Math.min(OX + GAME_W - 50, x));
          domain.hazards.push({
            type: 'lightning', x, y: 0,
            damage: 26, radius: 52,
            warningTimer: 36, strikeTimer: 0, struck: false,
            hitSet: new Set(),
          });
        }
        break;
      }
      case 'debris': {
        // Logs from both sides — staggered heights, deadly speed
        for (let side = 0; side < 2; side++) {
          const left = side === 0;
          const x    = OX + (left ? -40 : GAME_W + 40);
          // Band widened downward: the old 0.35±0.20 spread sat entirely above a
          // grounded fighter, so logs flew harmlessly overhead almost every time.
          const y    = GAME_H * 0.45 + (Math.random() - 0.5) * GAME_H * 0.50;
          const spd  = 20 + Math.random() * 8;
          domain.hazards.push({
            type: 'debris', x, y,
            vx: left ? spd : -spd,
            vy: (Math.random() - 0.5) * 4,
            damage: 21, radius: 24, hitSet: new Set(),   // owner has _powerBuff (×1.35) → ~28 felt
          });
        }
        break;
      }
      case 'shadow_blade': {
        for (let i = 0; i < 5; i++) {
          domain.hazards.push({
            type: 'shadow_blade',
            x: OX + 30 + Math.random() * (GAME_W - 60), y: -40,
            vx: (Math.random() - 0.5) * 8,
            vy: 16 + Math.random() * 7,
            angle: Math.random() * Math.PI * 2,
            damage: 26, radius: 14, hitSet: new Set(),
          });
        }
        break;
      }
      case 'bullet': {
        // Both sides — dense burst, faster projectiles
        for (let side = 0; side < 2; side++) {
          const left = side === 0;
          for (let i = 0; i < 5; i++) {
            const x  = OX + (left ? -10 : GAME_W + 10);
            const y  = GAME_H * 0.15 + Math.random() * GAME_H * 0.62;
            const vx = left ? 24 + Math.random() * 5 : -(24 + Math.random() * 5);
            domain.hazards.push({
              type: 'bullet', x, y, vx, vy: (Math.random() - 0.5) * 5,
              damage: 13, radius: 7, hitSet: new Set(),
            });
          }
        }
        break;
      }
      case 'arrow': {
        // 7-arrow blanket volley covering the full arena width
        for (let i = 0; i < 7; i++) {
          const spread = (i / 6) * (GAME_W - 80) + 40;
          domain.hazards.push({
            type: 'arrow',
            x: OX + spread, y: -25,
            vx: (Math.random() - 0.5) * 5,
            vy: 17 + Math.random() * 6,
            damage: 24, radius: 10, hitSet: new Set(),
          });
        }
        break;
      }
      case 'chaos_bolt': {
        // 8 bolts burst from owner in all directions
        const _cx = domain.owner.cx(), _cy = domain.owner.cy();
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const spd = 16 + Math.random() * 4;
          domain.hazards.push({
            type: 'chaos_bolt',
            x: _cx, y: _cy,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            damage: 12, radius: 9, hitSet: new Set(),   // owner has _powerBuff (×1.35) → ~16 felt
          });
        }
        if (typeof spawnParticles === 'function') spawnParticles(_cx, _cy, '#cccccc', 16);
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
        break;
      }

      // Warrior: swords erupt out of the ground under each enemy's feet. Long
      // telegraph, tight radius — pure "read it and move" pressure.
      case 'blade_wall': {
        const _foes = _getDomainTargets(domain.owner);
        const _spots = [];
        for (const t of _foes.slice(0, 3)) _spots.push(t.cx() + (Math.random() - 0.5) * 70);
        if (_spots.length === 0) _spots.push(OX + 80 + Math.random() * (GAME_W - 160));
        for (const sx of _spots) {
          domain.hazards.push({
            type: 'blade_wall',
            x: Math.max(OX + 40, Math.min(OX + GAME_W - 40, sx)),
            warningTimer: 44, riseTimer: 0, risen: false,
            damage: 16,              // owner has _powerBuff (×1.35) → ~22 felt
            radius: 34, height: 96,
            hitSet: new Set(),
          });
        }
        break;
      }

      // Summoner: familiars peel off the sigil and drift toward whoever is closest.
      // Slow and killable-by-dodging — they expire on contact or when life runs out.
      case 'spirit_swarm': {
        const _cx0 = OX + GAME_W / 2, _cy0 = GAME_H * 0.40;
        const count = 2 + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          domain.hazards.push({
            type: 'spirit_swarm',
            x: _cx0 + Math.cos(ang) * 40,
            y: _cy0 + Math.sin(ang) * 30,
            vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3,
            wobble: Math.random() * Math.PI * 2,
            damage: (domain.def.swarmDamage || 16),
            radius: 13, life: 300,
            hitSet: new Set(),
          });
        }
        break;
      }

      case 'holy_beam': {
        // Three beams — impossible to dodge all, must pick which to take
        const x1 = OX + 60  + Math.random() * (GAME_W * 0.28);
        const x2 = OX + GAME_W * 0.40 + Math.random() * (GAME_W * 0.20);
        const x3 = OX + GAME_W * 0.65 + Math.random() * (GAME_W * 0.28);
        for (const x of [x1, x2, x3]) {
          domain.hazards.push({
            type: 'holy_beam', x, y: 0,
            damage: 30, radius: 32,
            warningTimer: 48, activeTimer: 0,
            hitSet: new Set(),
          });
        }
        break;
      }
    }
  }

  // Sovereign: two null walls bounding a corridor that closes over the domain's
  // life and re-centres on Sovereign himself. The arena stops being neutral
  // ground — he decides where the fight happens. Contact costs a tick and shoves
  // the target back inward, so the walls confine rather than ring out.
  function _createNullWalls(domain) {
    const cx = domain.owner.cx();
    for (const side of [-1, 1]) {
      domain.hazards.push({
        type:   'null_wall',
        side,
        x:      cx + side * (domain.def.wallStart || 400),
        centre: cx,
        damage: domain.def.wallDamage || 17,
      });
    }
  }

  function _createVoidRocks(domain) {
    // Three rocks at different radii — inner, mid, and outer ring
    const OX     = _dOX(domain);
    const orbits = [120, 200, 280];
    for (let i = 0; i < 3; i++) {
      const orbitR = orbits[i];
      domain.hazards.push({
        type:    'void_rock',
        angle:   (Math.PI * 2 * i / 3),  // 120° apart
        orbitR,
        damage:  26,
        radius:  22,
        hitSet:  new Set(),
        get x() { return OX + GAME_W / 2 + Math.cos(this.angle) * this.orbitR; },
        get y() { return GAME_H * 0.58 + Math.sin(this.angle) * this.orbitR * 0.52; },
      });
    }
  }

  // ── Weapon-specific persistent hazards ─────────────────────────────

  function _createWeaponHazards(domain) {
    const wk = domain.owner.weaponKey;
    const OX = _dOX(domain);

    // Thor + Hammer → Mjolnir roams the arena freely, periodically dart-strikes an enemy
    if (domain.defKey === 'thor') {
      domain.hazards.push({
        type:        'mjolnir',
        x:           domain.owner.cx(),
        y:           domain.owner.cy() - 80,
        vx:          8, vy: -6,
        spinAngle:   0,       // visual hammer rotation
        roamTarget:  null,    // picked each frame when roaming
        state:       'roam',  // 'roam' | 'strike'
        stateTimer:  90,      // 1.5 s before first strike
        damage:      16,      // strike-hit damage
        orbitDamage: 20,      // damage on contact while roaming
        radius:      22,
        hitSet:      new Set(),
        orbitHitSet: new Set(),
      });
    }

    // Kratos → Blades of Chaos: fire chains whipping across the arena
    if (domain.defKey === 'kratos') {
      domain.hazards.push({
        type:       'blades_of_chaos',
        x:          OX + GAME_W / 2,
        y:          GAME_H * 0.52,
        angle:      -Math.PI * 0.80, // start at left edge of sweep
        sweepDir:   1,
        sweepSpeed: 0.055,           // fast arc, but readable enough to jump
        armLength:  200,             // longer reach
        phase:      'sweep',
        resetTimer: 0,
        damage:     26,              // owner has _powerBuff (×1.35) → ~35 felt
        radius:     20,
        hitSet:     new Set(),
      });
    }

    // Ninja: no hazards — the time dilation IS the domain.
    // (Shadow clones removed in the 3.9.x rework; the shadow_clone hazard
    // machinery below is retained for potential reuse.)

    // Gunner + Gun → Twin turrets, each fires 4-bullet aimed bursts rapidly
    if (domain.defKey === 'gunner') {
      for (let side = 0; side < 2; side++) {
        domain.hazards.push({
          type:      'turret',
          x:         OX + (side === 0 ? 18 : GAME_W - 18),
          y:         GAME_H * 0.50,
          facing:    side === 0 ? 1 : -1,
          fireTimer: 40 + side * 55,  // stagger so salvos don't overlap
          fireEvery: 140,             // fire every ~2.3 s (was 62 — too fast)
          damage:    12,              // was 24 — halved
          radius:    12,
          hitSet:    new Set(),
        });
      }
    }

    // Archer + Bow → Giant power arrow — fast, huge, crosses the whole arena
    if (domain.defKey === 'archer') {
      domain.hazards.push({
        type:       'giant_arrow',
        x:          OX - 80,
        y:          GAME_H * 0.38,
        vx:         0, vy: 0,
        fromLeft:   true,
        phase:      'cooldown',
        phaseTimer: 90,     // 1.5 s cooldown before first shot
        damage:     44,     // the single biggest domain hit — but heavily telegraphed
        radius:     28,
        hitSet:     new Set(),
      });
    }

    // Paladin + Shield → Divine shield orb, faster orbit, punishing on contact
    if (domain.defKey === 'paladin') {
      domain.hazards.push({
        type:   'divine_shield',
        angle:  0,
        orbitR: 78,
        damage: 26,
        radius: 22,
        hitSet: new Set(),
        get x() { return domain.owner.cx() + Math.cos(this.angle) * this.orbitR; },
        get y() { return domain.owner.cy() + Math.sin(this.angle) * this.orbitR * 0.68; },
      });
    }

    // Berserker → Rage Pulse — huge AoE, frequent, brutally high damage
    if (domain.defKey === 'berserker') {
      domain.hazards.push({
        type:       'rage_pulse',
        pulseTimer: 70,
        pulseEvery: 110,   // pulse every ~1.8 s — relentless
        ringRadius: 0,
        ringActive: false,
        damage:     22,    // owner has _powerBuff (×1.35) → ~30 felt
        radius:     105,   // covers most of the arena
        hitSet:     new Set(),
      });
    }

    // Megaknight → Gravity Vortex: strong pull drags enemies into the void rocks
    if (domain.defKey === 'megaknight') {
      domain.hazards.push({
        type:   'gravity_vortex',
        x:      OX + GAME_W / 2,
        y:      GAME_H * 0.44,
        pull:   0.85,
        radius: 0,
        damage: 0,
        hitSet: new Set(),
      });
    }

    // Ronin → Spirit Katana: a spectral blade orbits then launches at full speed
    if (domain.defKey === 'ronin') {
      domain.hazards.push({
        type:        'spirit_katana',
        x:           domain.owner.cx(),
        y:           domain.owner.cy(),
        orbitAngle:  0,
        orbitR:      62,
        state:       'orbit',
        stateTimer:  80,
        launchVx:    0,
        launchVy:    0,
        damage:      28,
        radius:      18,
        hitSet:      new Set(),
      });
      // Deferred Cuts: while the flag is set, dealDamage (smb-combat.js) marks
      // every successful hit by the owner; the sheathe detonates all marks at once.
      domain.sheatheTimer = domain.def.sheatheEvery || 240;
      domain.owner._roninCutsActive = true;
    }

    // Reaper → Scythe Pendulum: giant spectral scythe swings across the arena
    if (domain.defKey === 'reaper') {
      domain.hazards.push({
        type:      'scythe_pendulum',
        anchorX:   OX + GAME_W / 2,
        anchorY:   -28,
        angle:     -Math.PI * 0.38,
        angleVel:  0.016,
        armLength: GAME_H * 0.86,
        swingDir:  1,
        damage:    20,
        radius:    22,
        hitCd:     new Map(),
      });
      // Soul Tithe: while the flag is set, dealDamage (smb-combat.js) rips a soul
      // wisp from every enemy the owner damages (pendulum hits included); souls
      // orbit the Reaper and heal them until the Reaping launches them as skulls.
      domain.harvestTimer = domain.def.harvestEvery || 300;
      domain.harvestSouls = []; // orbiting souls: {angle, orbitR, bobSeed}
      domain.owner._soulTitheActive = true;
      domain.owner._soulTitheCount  = 0;
    }

    // Pugilist → Surge Fists: two giant fists punch inward from each side alternately
    if (domain.defKey === 'pugilist') {
      domain.hazards.push({
        type:       'surge_fist',
        fromLeft:   true,
        x:          OX - 70,
        y:          GAME_H * 0.44,
        vx:         0,
        phase:      'cooldown',
        phaseTimer: 65,
        damage:     24,    // owner has _powerBuff (×1.35) → ~32 felt
        radius:     28,
        hitSet:     new Set(),
      });
      domain.hazards.push({
        type:       'surge_fist',
        fromLeft:   false,
        x:          OX + GAME_W + 70,
        y:          GAME_H * 0.52,
        vx:         0,
        phase:      'cooldown',
        phaseTimer: 135,
        damage:     24,    // owner has _powerBuff (×1.35) → ~32 felt
        radius:     28,
        hitSet:     new Set(),
      });
    }

    // Warrior → Duel Ring: a closing ring centred on the owner. Anyone outside it
    // is bleeding out slowly — the domain forces the fight instead of chip-damaging
    // you to death, so a skilled player just has to hold the middle and duel.
    if (domain.defKey === 'warrior') {
      domain.hazards.push({
        type:      'duel_ring',
        radius:    domain.def.ringStart || 300,
        tickTimer: domain.def.ringEvery || 40,
        damage:    domain.def.ringDamage || 12,
        hitSet:    new Set(),
        get x() { return domain.owner.cx(); },
        get y() { return domain.owner.cy(); },
      });
    }

    // Summoner → Summoning Sigil: the anchor the familiars stream out of. Harmless
    // on its own; it pulses brighter right before each wave so the wave is readable.
    if (domain.defKey === 'summoner') {
      domain.hazards.push({
        type:      'summon_circle',
        x:         OX + GAME_W / 2,
        y:         GAME_H * 0.40,
        angle:     0,
        pulse:     0,
        damage:    0,
        radius:    0,
        hitSet:    new Set(),
      });
    }

    // Berserker → weapon-specific extra hazard on top of the rage pulse
    if (domain.defKey === 'berserker') {
      const wk = domain.owner.weaponKey;
      const _bladedWeapons  = ['sword', 'katana', 'scythe', 'whip', 'spear'];
      const _heavyWeapons   = ['hammer', 'axe', 'fryingpan', 'flail', 'broomstick'];
      const _sprayWeapons   = ['peashooter', 'flamethrower'];
      const _arcWeapons     = ['slingshot', 'boomerang', 'paperairplane'];
      if (_bladedWeapons.includes(wk)) {
        domain.hazards.push({
          type: 'blood_blade', x: OX - 40, y: GAME_H * 0.42, fromLeft: true,
          phase: 'cooldown', phaseTimer: 80, damage: 16, radius: 14, hitSet: new Set(),
        });
      } else if (_heavyWeapons.includes(wk)) {
        domain.hazards.push({ type: 'debris', x: OX - 60, y: GAME_H * 0.38, vx: 11,  vy: -1, damage: 16, radius: 18, hitSet: new Set() });
        domain.hazards.push({ type: 'debris', x: OX + GAME_W + 60, y: GAME_H * 0.52, vx: -11, vy: -1, damage: 16, radius: 18, hitSet: new Set() });
      } else if (_sprayWeapons.includes(wk)) {
        // Floating rotating turret that sweeps the arena with rapid fire
        domain.hazards.push({
          type: 'rage_spray', x: OX + GAME_W / 2, y: GAME_H * 0.34,
          angle: 0, fireTimer: 0, damage: 8, radius: 7,
        });
      } else if (_arcWeapons.includes(wk)) {
        // Periodic salvo of 4 projectiles arcing outward from owner
        domain.hazards.push({
          type: 'arc_salvo', fireTimer: 55, fireEvery: 70, damage: 13, radius: 12,
        });
      } else if (wk === 'electricstaff') {
        // Two electric pillars periodically arc chain lightning across the arena
        domain.hazards.push({
          type: 'elec_pulse',
          pillarX1: OX + GAME_W * 0.22, pillarX2: OX + GAME_W * 0.78,
          arcTimer: 45, arcEvery: 55, damage: 12, radius: 48, hitSet: new Set(),
        });
      }
    }
  }

  // ── Domain lifecycle ────────────────────────────────────────────────

  function _clearOwnerBuffs(owner) {
    if (!owner) return;
    delete owner._domainSpeedRefresh;
    delete owner._domainPowerRefresh;
    delete owner._domainDisplayWeapon;
    delete owner._convictionPassive;
    delete owner._roninCutsActive;
    delete owner._soulTitheActive;
    delete owner._pendingSoulRips;
  }

  // ── Domain entry cinematic ──────────────────────────────────────────

  const _DOMAIN_ENTRY_TILT = {
    thor: -3.5, kratos: 4, ninja: -5,
    paladin: 2.5, gunner: -2, archer: 3,
    berserker: 5, megaknight: -4,
    ronin: -4.5, reaper: 3.5, pugilist: -3,
    warrior: 3, summoner: -3.5, sovereign: -2.5, none: 0,
  };
  const _DOMAIN_DARK_COLOR = {
    thor: '#000a1a', kratos: '#1a0500', ninja: '#030008',
    paladin: '#1a1800', gunner: '#1a0e00', archer: '#001a05',
    berserker: '#1a0000', megaknight: '#050013',
    ronin: '#050510', reaper: '#100510', pugilist: '#120000',
    warrior: '#1a1000', summoner: '#001a18', sovereign: '#1a0200', none: '#080808',
  };
  const _DOMAIN_ENTRY_LINE = {
    thor:       'The storm answers me...',
    kratos:     'Feel the rage of the fallen!',
    ninja:      'Too slow. You were always too slow.',
    paladin:    'The light judges all.',
    gunner:     'Weapons free — open fire!',
    archer:     'The hunt... begins.',
    berserker:  'RAAAAGH!',
    megaknight: 'Your reality... crumbles.',
    ronin:      'One strike. One kill.',
    reaper:     'Your soul belongs to me now.',
    pugilist:   'Get up. I\'m not done yet.',
    warrior:    'Step into the ring.',
    summoner:   'You are outnumbered. You always were.',
    sovereign:  'You never chose the ground. You only thought you did.',
    none:       'No class. No rules. Just power.',
  };

  // Hand the camera back — only the riser that took it may release it, so a
  // clashing second expansion can't cut the first one's framing short.
  function _releaseDomainCin(f) {
    if (_domainCinOwner && _domainCinOwner !== f) return;
    if (typeof CinCam !== 'undefined') CinCam.restore();
    _domainCinActive = false;
    _domainCinOwner  = null;
  }

  function _tickDomainEntry(r) {
    const f   = r.fighter;
    const _dk = _domainKeyOf(f);
    const def = DOMAIN_DEFS[_dk];
    if (!def) return;
    if (typeof CinCam === 'undefined' || typeof CinFX === 'undefined') return;
    const t = r.timer; // counts DOWN from RISE_FRAMES (300)
    const d = r.animData || (r.animData = {});

    // Common: entry setup — no tilt (tilt can clip name card text)
    // Two fighters can expand within the same 5 s rise (a clash). The camera is a
    // single global, so only the first riser takes it; the second still gets its
    // full entry animation and domain, just without stealing the framing.
    if (t === RISE_FRAMES - 5 && (!_domainCinActive || _domainCinOwner === f)) {
      _domainCinActive = true;
      _domainCinOwner  = f;
      CinCam.zoomTo(1.65);
      CinCam.focusPoint(f.cx(), f.cy());
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
    }

    switch (_dk) {

      // ── Thor: hammer raised → lightning strikes → supercharge → ground slam ──
      case 'thor': {
        if (t === 275) {
          CinFX.bgContrast('#000a1a', 0.88, 60);
          CinCam.directionalShake(22, 0, -1);
        }
        if (t === 260) {
          CinFX.flash('#ffffff', 0.92, 10);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 38);
          d.lightningStruck = true; d.lightningTimer = 65;
        }
        if (t === 248) {
          CinFX.shockwave(f.cx(), f.cy(), '#44aaff', { count: 2, maxR: 320, lw: 5, dur: 45 });
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#44aaff', 30);
            spawnParticles(f.cx(), f.cy(), '#ffffff', 15);
          }
        }
        if (t === 228) {
          d.slamStart = true;
        }
        if (t === 215) {
          CinFX.flash('#aaddff', 0.65, 8);
          CinFX.shockwave(f.cx(), GAME_H - 80, '#44aaff', { count: 3, maxR: 340, lw: 6, dur: 65 });
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 58);
          d.slamFired = true;
          d.slamActivate = true; // domain activates at slam impact
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), GAME_H - 80, '#44aaff', 55);
            spawnParticles(f.cx(), GAME_H - 80, '#ffffff', 28);
          }
        }
        if (t === 218) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 200) {
          CinFX.shockwave(f.cx(), f.cy(), '#44aaff', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Kratos: axe charged → rage explosion → axe thrown into sky → war domain ──
      case 'kratos': {
        if (t === 275) {
          CinFX.bgContrast('#1a0500', 0.90, 60);
          CinCam.directionalShake(24, 0, -1);
        }
        if (t === 262) {
          CinFX.flash('#cc0000', 0.80, 8);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 42);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#cc2200', 36);
            spawnParticles(f.cx(), f.cy(), '#ff6600', 18);
          }
          d.rageBurst = true; d.rageBurstTimer = 45;
        }
        if (t === 248) {
          CinFX.groundCrack(f.cx(), GAME_H - 80, { count: 10, color: '#aa1100' });
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 56);
          CinFX.shockwave(f.cx(), f.cy(), '#ff3300', { count: 2, maxR: 280, lw: 6, dur: 55 });
        }
        if (t === 235) {
          d.axeThrown = true; d.axeX = f.cx(); d.axeY = f.cy() - 20; d.axeVy = -18;
        }
        if (t === 215) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
          CinFX.flash('#ff4400', 0.65, 6);
          CinFX.shockwave(f.cx(), f.cy(), '#ff5500', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), 60, '#ff4400', 40);
            spawnParticles(f.cx(), 60, '#ffaa00', 20);
          }
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Ninja: vanish → teleport behind each foe → launcher strikes → time dilation ──
      case 'ninja': {
        if (t === 278) { CinFX.bgContrast('#030008', 0.92, 65); }
        if (t === 268) {
          // Vanish into the shadows; snapshot victims and build the cut schedule
          d.vanished = true;
          d.slashes  = [];
          CinFX.flash('#660099', 0.55, 6);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#bb44ff', 26);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
          d.victims  = _getDomainTargets(f).filter(v => !v.isMinion).slice(0, 5);
          if (d.victims.length === 0) d.victims = _getDomainTargets(f).slice(0, 5);
          d.cutTimes = d.victims.map((v, i) => 244 - i * 16);
        }
        if (t === 252) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        // Teleport cuts: appear behind a victim, strike them skyward
        if (d.cutTimes) {
          for (let i = 0; i < d.cutTimes.length; i++) {
            if (t !== d.cutTimes[i]) continue;
            const v = d.victims[i];
            if (!v || v.health <= 0) continue;
            if (!d.slowStarted) { d.slowStarted = true; CinFX.motionTrailOn(f, def.color); }
            const _behind = -(v.facing || 1);
            f.x = v.x + _behind * 46;
            f.y = Math.max(40, v.y);
            f.facing = -_behind;
            CinCam.focusPoint(v.cx(), v.cy());
            CinFX.flash('#ffffff', 0.45, 4);
            d.slashes.push({ x1: v.cx() - 60, y1: v.cy() + 50, x2: v.cx() + 60, y2: v.cy() - 70, alpha: 1 });
            _dealDomainDamage(f, v, 18, 0);
            if (v.health > 0) {
              v.vy = -20;   // launcher (max upward velocity) — slow kicks in while they hang
              v.vx *= 0.2;
              v.stunTimer = Math.max(v.stunTimer || 0, 20);
            }
            if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 26);
            if (typeof spawnParticles === 'function') {
              spawnParticles(v.cx(), v.cy(), '#bb44ff', 20);
              spawnParticles(v.cx(), v.cy(), '#ffffff', 10);
            }
          }
        }
        if (t === 168) {
          // All strikes done — the domain takes hold while victims hang in the air
          d.vanished = false;
          d.earlyActivate = true; // announce suppressed — nameCard already shown
          CinFX.shockwave(f.cx(), f.cy(), '#bb44ff', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.flash('#660099', 0.50, 8);
          CinFX.impactFrame(f, { dur: 3 });
          CinCam.focusPoint(f.cx(), f.cy());
          CinCam.zoomTo(1.28);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 30);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Gunner: guns hot → reticles lock → bullet burst → designator beam ──
      case 'gunner': {
        if (t === 276) {
          CinFX.bgContrast('#1a0e00', 0.86, 58);
          CinCam.directionalShake(18, 0, -1);
        }
        if (t === 262) {
          CinFX.flash('#ffaa00', 0.65, 6);
          d.reticlesActive = true; d.bulletTrails = [];
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 28);
        }
        if (t === 246) {
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            d.bulletTrails.push({ x: f.cx(), y: f.cy(), ang, len: 0, maxLen: 120 + Math.random() * 80, speed: 22 });
          }
          CinFX.flash('#ffcc44', 0.55, 5);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 34);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#ff9900', 30);
        }
        if (t === 228) {
          d.beamActive = true; d.beamAlpha = 1.0;
          CinFX.flash('#ffffaa', 0.62, 8);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 40);
        }
        if (t === 215) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
          CinFX.shockwave(f.cx(), f.cy(), '#ff9900', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Archer: giant arrow nocked → fires skyward → rain of arrows ──
      case 'archer': {
        if (t === 278) {
          CinFX.bgContrast('#001a05', 0.86, 58);
          CinCam.directionalShake(16, 0, -1);
        }
        if (t === 264) {
          d.arrowNocked = true; d.arrowCharge = 0;
          CinFX.flash('#44ff88', 0.55, 5);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#44ff88', 16);
        }
        if (t === 245) {
          d.arrowFired = true; d.arrowX = f.cx(); d.arrowY = f.cy() - 10;
          d.arrowVy = -20; d.arrowAlpha = 1.0; d.arrowRain = [];
          CinFX.flash('#aaffcc', 0.60, 6);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 28);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#88ff88', 24);
        }
        if (t === 228) {
          for (let i = 0; i < 10; i++) {
            d.arrowRain.push({
              x: 40 + Math.random() * (GAME_W - 80),
              y: -30 - Math.random() * 60,
              vy: 14 + Math.random() * 8,
              alpha: 0.8 + Math.random() * 0.2,
              timer: 60 + Math.floor(Math.random() * 30),
            });
          }
          CinFX.groundCrack(f.cx(), GAME_H - 80, { count: 6, color: '#44aa44' });
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), GAME_H - 120, '#44ff88', 30);
        }
        if (t === 215) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
          CinFX.shockwave(f.cx(), f.cy(), '#44ff88', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Paladin: holy light → divine cross → pillar of judgment → shield slam ──
      case 'paladin': {
        if (t === 278) {
          CinFX.bgContrast('#1a1800', 0.84, 60);
          CinCam.directionalShake(16, 0, -1);
        }
        if (t === 264) {
          d.crossAlpha = 0; d.crossFade = true;
          CinFX.flash('#ffffaa', 0.72, 8);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 26);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#ffe888', 22);
            spawnParticles(f.cx(), f.cy(), '#ffffff', 12);
          }
        }
        if (t === 246) {
          d.pillarActive = true; d.pillarAlpha = 0.9;
          CinFX.flash('#ffffff', 0.55, 5);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy() - 40, '#ffffaa', 30);
        }
        if (t === 228) {
          CinFX.shockwave(f.cx(), f.cy(), '#ffe888', { count: 3, maxR: 300, lw: 5, dur: 58 });
          CinFX.flash('#ffffcc', 0.68, 6);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 44);
          d.pillarAlpha = 0;
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#ffffff', 40);
            spawnParticles(f.cx(), f.cy(), '#ffe888', 24);
          }
        }
        if (t === 215) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
          CinFX.shockwave(f.cx(), f.cy(), '#ffffaa', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Berserker: rage veins → frenzy thrash → ROAR shatters ground → blood pool ──
      case 'berserker': {
        if (t === 278) {
          CinFX.bgContrast('#1a0000', 0.90, 62);
          CinCam.directionalShake(20, 0, -1);
        }
        if (t === 265) {
          d.veinsActive = true; d.veins = [];
          for (let i = 0; i < 8; i++) {
            d.veins.push({ ang: Math.random() * Math.PI * 2, len: 30 + Math.random() * 50, alpha: 0.9 });
          }
        }
        if (t === 252) {
          CinFX.flash('#cc0000', 0.90, 10);
          CinFX.groundCrack(f.cx(), GAME_H - 80, { count: 10, color: '#880000' });
          CinFX.shockwave(f.cx(), f.cy(), '#ff0000', { count: 3, maxR: 320, lw: 6, dur: 58 });
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 64);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#cc0000', 50);
            spawnParticles(f.cx(), f.cy(), '#ff4400', 26);
          }
          d.bloodPool = true; d.bloodPoolR = 0;
        }
        if (t === 238) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 220) {
          CinFX.shockwave(f.cx(), f.cy(), '#ff2222', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Megaknight: reality cracks → void gauntlet charges → punches rift open ──
      case 'megaknight': {
        if (t === 278) {
          CinFX.bgContrast('#050013', 0.90, 62);
          CinCam.directionalShake(18, 0, -1);
        }
        if (t === 264) {
          d.cracks = [];
          for (let i = 0; i < 6; i++) {
            d.cracks.push({ ang: Math.random() * Math.PI * 2, len: 20 + Math.random() * 50, alpha: 0.8, growth: 1.5 + Math.random() });
          }
          CinFX.flash('#330066', 0.55, 5);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 24);
        }
        if (t === 248) {
          CinFX.flash('#000000', 0.82, 8);
          d.voidTear = true;
          d.voidTearX = f.cx() + (f.facing || 1) * 60;
          d.voidTearY = f.cy();
          d.voidTearW = 0; d.voidTearH = 0;
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 48);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#9944ff', 36);
            spawnParticles(f.cx(), f.cy(), '#220044', 20);
          }
        }
        if (t === 232) {
          CinFX.shockwave(f.cx(), f.cy(), '#9944ff', { count: 3, maxR: 300, lw: 5, dur: 58 });
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 52);
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 215) {
          CinFX.shockwave(f.cx(), f.cy(), '#9944ff', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        break;
      }

      // ── Ronin: perfect stillness → spirit blade materializes → single slash tears sky ──
      case 'ronin': {
        if (t === 278) {
          CinFX.bgContrast('#050510', 0.92, 60);
          CinCam.directionalShake(16, 0, -1);
        }
        if (t === 264) {
          CinFX.flash('#ccccff', 0.55, 5);
          d.spiritBladeActive = true; d.spiritBladeAlpha = 0; d.spiritBladeFade = 'in';
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#ccccff', 16);
            spawnParticles(f.cx(), f.cy(), '#ffffff', 8);
          }
        }
        if (t === 244) {
          d.slashFired = true; d.slashAlpha = 1.0;
          d.slashX1 = f.cx() - 160; d.slashY1 = f.cy() + 40;
          d.slashX2 = f.cx() + 180; d.slashY2 = f.cy() - 40;
          CinFX.flash('#ffffff', 0.82, 7);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 40);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#aaaaff', 30);
            spawnParticles(f.cx(), f.cy(), '#ffffff', 16);
          }
        }
        if (t === 228) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
          CinFX.shockwave(f.cx(), f.cy(), '#ccccff', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        // Animate spirit blade alpha
        if (d.spiritBladeActive) {
          if (d.spiritBladeFade === 'in')  d.spiritBladeAlpha = Math.min(1, d.spiritBladeAlpha + 0.04);
          if (d.slashFired) d.spiritBladeAlpha = Math.max(0, d.spiritBladeAlpha - 0.06);
        }
        if (d.slashFired) d.slashAlpha = Math.max(0, d.slashAlpha - 0.022);
        break;
      }

      // ── Reaper: darkness creeps → giant scythe rises → souls float → reap ──
      case 'reaper': {
        if (t === 278) {
          CinFX.bgContrast('#100510', 0.90, 62);
          CinCam.directionalShake(16, 0, -1);
        }
        if (t === 264) {
          CinFX.flash('#cc44cc', 0.55, 5);
          d.soulsActive = true; d.souls = [];
          for (let i = 0; i < 8; i++) {
            d.souls.push({
              x:     f.cx() + (Math.random() - 0.5) * 160,
              y:     f.cy() + 20 + Math.random() * 60,
              vy:    -(0.8 + Math.random() * 1.2),
              alpha: 0.6 + Math.random() * 0.4,
            });
          }
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 20);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#cc44cc', 20);
        }
        if (t === 246) {
          d.scytheRising = true; d.scytheY = GAME_H + 60; d.scytheTargetY = f.cy() - 60;
          CinFX.flash('#660066', 0.65, 6);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 32);
        }
        if (t === 228) {
          CinFX.shockwave(f.cx(), f.cy(), '#cc44cc', { count: 3, maxR: 300, lw: 5, dur: 58 });
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
          CinFX.shockwave(f.cx(), f.cy(), '#cc44cc', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        // Animate souls drifting upward
        if (d.souls) for (const s of d.souls) { s.y += s.vy; s.alpha = Math.max(0, s.alpha - 0.005); }
        break;
      }

      // ── Pugilist: ground shakes → fists slam down → arena walls close in ──
      case 'pugilist': {
        if (t === 278) {
          CinFX.bgContrast('#120000', 0.88, 60);
          CinCam.directionalShake(22, 0, -1);
        }
        if (t === 264) {
          CinFX.flash('#ee4444', 0.65, 7);
          CinFX.groundCrack(f.cx(), GAME_H - 80, { count: 8, color: '#cc2200' });
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 36);
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.cy(), '#ee4444', 24);
            spawnParticles(f.cx(), f.cy(), '#ffffff', 12);
          }
        }
        if (t === 248) {
          d.fistDropL = true; d.fistDropR = true;
          d.fistLY = -60; d.fistRY = -60;
          d.fistLX = f.cx() - 100; d.fistRX = f.cx() + 100;
        }
        if (t === 228) {
          CinFX.shockwave(f.cx(), f.cy(), '#ee4444', { count: 3, maxR: 310, lw: 6, dur: 58 });
          CinFX.flash('#ffaaaa', 0.60, 6);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 44);
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 215) {
          CinFX.shockwave(f.cx(), f.cy(), '#ee4444', { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        // Animate fist drop during entry
        if (d.fistDropL) d.fistLY = Math.min(GAME_H * 0.38, d.fistLY + 14);
        if (d.fistDropR) d.fistRY = Math.min(GAME_H * 0.38, d.fistRY + 14);
        break;
      }

      // ── Warrior: plant the stance → swords ring the ground → the duel ring closes ──
      case 'warrior': {
        if (t === 278) {
          CinFX.bgContrast('#1a1000', 0.88, 60);
          CinCam.directionalShake(20, 0, -1);
        }
        if (t === 262) {
          CinFX.flash('#e0b070', 0.55, 7);
          CinFX.groundCrack(f.cx(), GAME_H - 80, { count: 9, color: '#8a6a3a' });
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 34);
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.y + f.h, '#e0b070', 22);
          d.swordsPlanted = true; d.swordRise = 0;
        }
        if (t === 240) {
          CinFX.shockwave(f.cx(), f.cy(), '#e0b070', { count: 2, maxR: 300, lw: 5, dur: 50 });
          d.ringDraw = true; d.ringR = 380;
        }
        if (t === 228) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 212) {
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        if (d.swordsPlanted) d.swordRise = Math.min(1, (d.swordRise || 0) + 0.06);
        if (d.ringDraw) d.ringR = Math.max(210, d.ringR - 5);
        break;
      }

      // ── Summoner: the sigil is drawn → familiars answer one by one → menagerie ──
      case 'summoner': {
        if (t === 278) {
          CinFX.bgContrast('#001a18', 0.90, 62);
          CinCam.directionalShake(16, 0, -1);
        }
        if (t === 266) {
          d.sigilDraw = true; d.sigilProg = 0;
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#66ffcc', 20);
        }
        if (t === 244) {
          d.familiars = [];
          for (let i = 0; i < 6; i++) {
            d.familiars.push({ ang: (i / 6) * Math.PI * 2, r: 190, delay: i * 5 });
          }
          CinFX.flash('#66ffcc', 0.45, 6);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 26);
        }
        if (t === 226) {
          CinFX.nameCard('CONVICTION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE[f.charClass];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 212) {
          CinFX.shockwave(f.cx(), f.cy(), '#66ffcc', { count: 3, maxR: 320, lw: 4, dur: 55 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.28);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        if (d.sigilDraw) d.sigilProg = Math.min(1, (d.sigilProg || 0) + 0.035);
        if (d.familiars) {
          for (const fam of d.familiars) {
            if (fam.delay > 0) { fam.delay--; continue; }
            fam.r = Math.max(52, fam.r - 4.5);
            fam.ang += 0.05;
          }
        }
        break;
      }

      // ── Sovereign: the arena is claimed — rails slam in, the lock ring seals ──
      case 'sovereign': {
        if (t === 278) {
          CinFX.bgContrast('#1a0200', 0.90, 60);
          CinCam.directionalShake(18, 0, -1);
        }
        if (t === 262) {
          d.railProg = 0;
          if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), '#ff3311', 18);
        }
        if (t === 240) {
          d.ringProg = 0;
          CinFX.flash('#ff5533', 0.55, 6);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 34);
        }
        if (t === 224) {
          CinFX.nameCard('DOMAIN EXPANSION', def.color, { dur: 110 });
          CinFX.impactFrame(f, { dur: 3 });
          const line = _DOMAIN_ENTRY_LINE.sovereign;
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 206) {
          d.lockFlash = 14;
          CinFX.shockwave(f.cx(), f.cy(), '#ff3311', { count: 3, maxR: 340, lw: 6, dur: 52 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.26);
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 42);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
        if (d.railProg !== undefined) d.railProg = Math.min(1, d.railProg + 0.045);
        if (d.ringProg !== undefined) d.ringProg = Math.min(1, d.ringProg + 0.030);
        if (d.lockFlash > 0) d.lockFlash--;
        break;
      }

      default: {
        if (t === 275) {
          CinFX.bgContrast(_DOMAIN_DARK_COLOR[_dk] || '#0a0a0a', 0.88, 55);
          CinFX.shockwave(f.cx(), f.cy(), def.color, { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinCam.directionalShake(30, 0, -1);
        }
        if (t === 252) {
          if (typeof CinFX.impactFrame === 'function') CinFX.impactFrame([f], { dur: 5, color: '#ffffff' });
          if (typeof spawnParticles === 'function') {
            spawnParticles(f.cx(), f.y + f.h, def.color, 22);
            spawnParticles(f.cx(), f.y + f.h, '#ffffff', 10);
          }
          const line = _DOMAIN_ENTRY_LINE[_dk];
          if (line && typeof queueAnnouncement === 'function') queueAnnouncement('"' + line + '"', def.color);
        }
        if (t === 235) { CinFX.nameCard('DOMAIN EXPANSION', def.color, { dur: 100 });
          CinFX.impactFrame(f, { dur: 3 }); }
        if (t === 215) {
          CinFX.shockwave(f.cx(), f.cy(), def.color, { count: 2, maxR: 320, lw: 5, dur: 45 });
          CinFX.motionTrailOn(f, def.color);
          CinCam.zoomTo(1.2);
        }
        if (t === 160) { CinCam.tilt(0); CinFX.motionTrailOff(f); CinCam.zoomTo(1.18); }
        if (t === 60)  _releaseDomainCin(f);
      }
    }
  }

  // ── Domain sky effects (world-space; class-specific atmosphere) ────

  // '#44aaff' -> 'rgba(68,170,255,a)'
  function _dRgba(hex, a) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return `rgba(255,255,255,${a})`;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }

  // Horizontal extent of the playable world, so wide (scrolling) arenas don't get a
  // hard tint edge partway across the map.
  function _dWorldSpan() {
    const a = (typeof currentArena !== 'undefined') ? currentArena : null;
    const left  = a && a.mapLeft  !== undefined ? Math.min(0, a.mapLeft) : 0;
    const right = a && (a.mapRight !== undefined || a.worldWidth !== undefined)
      ? Math.max(GAME_W, a.mapRight !== undefined ? a.mapRight : a.worldWidth)
      : GAME_W;
    return { left: left - 80, right: right + 80 };
  }

  // ── Shared domain frame ────────────────────────────────────────────────
  // Every DOMAIN_DEF has always carried a `bgTint`, but nothing consumed it — so an
  // expanded domain looked like the ordinary arena with sparkles on top. This is the
  // layer that makes the arena read as somewhere else: colour grade, horizon glow,
  // the domain's own walls, drifting motes, and a visible warning as it collapses.
  function _drawDomainFrame(domain) {
    const { def, timer } = domain;
    const now  = performance.now();
    const seed = domain.owner ? (domain.owner.playerNum || 0) : 0;
    const fadeIn  = Math.min(1, (DOMAIN_FRAMES - timer) / 45);
    const fadeOut = Math.min(1, timer / 75);          // recedes as the domain collapses
    const a = fadeIn * fadeOut;
    if (a <= 0.01) return;

    const { left, right } = _dWorldSpan();
    const span = right - left;
    const col  = def.color || '#ffffff';
    // Last ~3 s: the walls stutter so the owner can see the domain is about to drop
    const dying   = timer < 180 ? 1 - timer / 180 : 0;
    const flicker = dying > 0 ? (0.65 + 0.35 * Math.sin(now / (60 - dying * 38))) : 1;

    ctx.save();

    // 1. Colour grade — the authored bgTint, finally applied
    if (def.bgTint) {
      ctx.globalAlpha = a;
      ctx.fillStyle = def.bgTint;
      ctx.fillRect(left, -GAME_H, span, GAME_H * 3);
    }

    // 2. Horizon glow rising off the floor in the domain's colour
    const _dhGrd = ctx.createLinearGradient(0, GAME_H, 0, GAME_H * 0.42);
    _dhGrd.addColorStop(0, _dRgba(col, 0.28 * a));
    _dhGrd.addColorStop(1, _dRgba(col, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = _dhGrd;
    ctx.fillRect(left, GAME_H * 0.42, span, GAME_H * 0.58);

    // 3. Domain walls — a hard boundary you can see, with a scan travelling down it
    ctx.globalAlpha = a * 0.9 * flicker;
    ctx.shadowColor = col; ctx.shadowBlur = 26;
    for (const wx of [left + 74, right - 74]) {
      const _dwGrd = ctx.createLinearGradient(wx, 0, wx + (wx < GAME_W / 2 ? 46 : -46), 0);
      _dwGrd.addColorStop(0, _dRgba(col, 0.42));
      _dwGrd.addColorStop(1, _dRgba(col, 0));
      ctx.fillStyle = _dwGrd;
      ctx.fillRect(Math.min(wx, wx + (wx < GAME_W / 2 ? 46 : -46)), 0, 46, GAME_H);
      ctx.strokeStyle = _dRgba(col, 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, GAME_H); ctx.stroke();
      // scan pulse
      const scanY = ((now / 9 + seed * 130) % (GAME_H + 160)) - 80;
      ctx.strokeStyle = _dRgba('#ffffff', 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(wx - 7, scanY); ctx.lineTo(wx + 7, scanY); ctx.stroke();
    }
    // Ceiling seam
    ctx.strokeStyle = _dRgba(col, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, 6); ctx.lineTo(right, 6); ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Ambient motes drifting through the space
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = 8;
    for (let m = 0; m < 30; m++) {
      const mx = left + ((m * 137.5 + now * 0.012 * (0.5 + (m % 5) * 0.2)) % span);
      const my = ((m * 71 + now * 0.02 * (0.4 + (m % 4) * 0.25)) % (GAME_H + 40)) - 20;
      ctx.globalAlpha = a * (0.10 + 0.16 * Math.sin(now / 420 + m * 0.9));
      ctx.beginPath(); ctx.arc(mx, my, 1.4 + (m % 3) * 0.9, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  function _drawDomainSkyEffects(domain) {
    const { defKey, timer } = domain;
    const now = performance.now();
    const fadeIn = Math.min(1, (DOMAIN_FRAMES - timer) / 60 + 0.3);

    ctx.save();

    switch (defKey) {
      case 'thor': {
        // Dark storm clouds scrolling across the top
        ctx.globalAlpha = fadeIn * 0.5;
        for (let c = 0; c < 7; c++) {
          const cx = ((c * 145 + now * 0.025) % (GAME_W + 120)) - 60;
          const cy = 18 + (c % 3) * 20;
          const cw = 90 + (c % 4) * 22;
          const ch = 26 + (c % 3) * 10;
          ctx.fillStyle = '#1a2040';
          ctx.shadowColor = '#0a1040'; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.ellipse(cx, cy, cw * 0.5, ch * 0.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#252a55';
          ctx.beginPath(); ctx.ellipse(cx - 14, cy - 4, cw * 0.34, ch * 0.37, 0, 0, Math.PI * 2); ctx.fill();
        }
        // Lightning flicker across top
        if (Math.sin(now / 220) > 0.90) {
          ctx.globalAlpha = 0.12 * fadeIn;
          ctx.fillStyle = '#aaddff';
          ctx.fillRect(0, 0, GAME_W, GAME_H * 0.28);
        }
        // Occasional crack lightning
        if (Math.sin(now / 310) > 0.93) {
          ctx.globalAlpha = 0.45 * fadeIn;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
          ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 14;
          const lx = GAME_W * 0.1 + ((now * 0.007) % (GAME_W * 0.8));
          const ly = 20 + Math.sin(now / 180) * 18;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 80 + Math.sin(now / 50) * 40, ly + Math.sin(now / 70) * 22); ctx.stroke();
        }
        break;
      }

      case 'kratos': {
        // Blood rain drops
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 4;
        for (let d = 0; d < 24; d++) {
          const dropX = (d * 39 + now * 0.1) % GAME_W;
          const dropY = (d * 23 + now * 0.15) % GAME_H;
          ctx.globalAlpha = fadeIn * 0.35;
          ctx.fillStyle = '#cc0000';
          ctx.beginPath(); ctx.ellipse(dropX, dropY, 1.5, 5, 0, 0, Math.PI * 2); ctx.fill();
        }
        // Ember glows near ground
        for (let e = 0; e < 8; e++) {
          const ex = (e * 118 + now * 0.028) % GAME_W;
          const ey = GAME_H * 0.72 + Math.sin(now / 400 + e) * 28;
          ctx.globalAlpha = (0.18 + 0.10 * Math.sin(now / 200 + e)) * fadeIn;
          ctx.fillStyle = '#ff4400';
          ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'ninja': {
        // Shadow tendrils from both edges
        ctx.shadowColor = '#bb44ff'; ctx.shadowBlur = 16;
        for (let i = 0; i < 5; i++) {
          const side = i % 2 === 0 ? 0 : GAME_W;
          const ty   = GAME_H * 0.22 + i * GAME_H * 0.15 + Math.sin(now / 600 + i) * 16;
          const len  = 75 + Math.sin(now / 400 + i * 1.8) * 28;
          const dir  = side === 0 ? 1 : -1;
          ctx.globalAlpha = fadeIn * 0.38;
          ctx.fillStyle = '#220044';
          ctx.beginPath();
          ctx.moveTo(side, ty - 12);
          ctx.lineTo(side + dir * len, ty);
          ctx.lineTo(side, ty + 12);
          ctx.closePath(); ctx.fill();
        }
        break;
      }

      case 'paladin': {
        // Divine light rays fanning from top center
        ctx.fillStyle = '#ffffcc';
        ctx.shadowColor = '#ffff88'; ctx.shadowBlur = 28;
        for (let r = 0; r < 7; r++) {
          const angle = (r - 3) * 0.22;
          const rayW  = 16 + r * 3;
          ctx.globalAlpha = fadeIn * 0.15;
          ctx.save();
          ctx.translate(GAME_W / 2, 0);
          ctx.rotate(angle);
          ctx.fillRect(-rayW / 2, 0, rayW, GAME_H * 0.88);
          ctx.restore();
        }
        break;
      }

      case 'gunner': {
        // Floating targeting reticles drifting across the arena
        for (let ti = 0; ti < 4; ti++) {
          const tx = 80 + ti * 220 + Math.sin(now / 1000 + ti) * 28;
          const ty = GAME_H * 0.28 + Math.sin(now / 800 + ti * 1.4) * 38;
          ctx.globalAlpha = (0.20 + 0.10 * Math.sin(now / 300 + ti)) * fadeIn;
          ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 1.5;
          ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx - 26, ty); ctx.lineTo(tx + 26, ty); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx, ty - 26); ctx.lineTo(tx, ty + 26); ctx.stroke();
        }
        break;
      }

      case 'archer': {
        // Falling forest leaves
        for (let l = 0; l < 14; l++) {
          const lx = (l * 67 + now * 0.038) % GAME_W;
          const ly = (l * 41 + now * 0.055) % GAME_H;
          const la = now / 500 + l * 0.8;
          ctx.globalAlpha = (0.22 + 0.14 * Math.sin(now / 300 + l)) * fadeIn;
          ctx.fillStyle = '#88ff88';
          ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 5;
          ctx.save();
          ctx.translate(lx, ly); ctx.rotate(la);
          ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'berserker': {
        // Blood pool at ground level
        ctx.globalAlpha = fadeIn * 0.40;
        ctx.fillStyle = '#880000';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 14;
        ctx.fillRect(0, GAME_H - 18, GAME_W, 22);
        // Rising blood wisps
        for (let w = 0; w < 6; w++) {
          const wx    = (w * 152 + now * 0.018) % GAME_W;
          const wFrac = ((now / 10 + w * 40) % 80) / 80;
          const wy    = GAME_H - 18 - wFrac * 78;
          ctx.globalAlpha = (1 - wFrac) * 0.32 * fadeIn;
          ctx.fillStyle = '#cc0000';
          ctx.beginPath(); ctx.arc(wx, wy, 5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'megaknight': {
        // Void crack lines from fixed positions
        ctx.strokeStyle = '#9944ff'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#7700cc'; ctx.shadowBlur = 12;
        for (let vc = 0; vc < 5; vc++) {
          const vcx = (vc * 173 + 55) % GAME_W;
          const vcy = (vc * 101 + 40) % GAME_H;
          ctx.globalAlpha = fadeIn * 0.38;
          ctx.beginPath(); ctx.moveTo(vcx, vcy);
          ctx.lineTo(vcx + Math.sin(now / 500 + vc) * 55 - 27, vcy + Math.cos(now / 400 + vc) * 45 - 22);
          ctx.stroke();
        }
        // Drifting star points
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#aa88ff'; ctx.shadowBlur = 8;
        for (let s = 0; s < 20; s++) {
          const sx = (s * 47 + 20) % GAME_W;
          const sy = (s * 28 + 15) % GAME_H;
          ctx.globalAlpha = fadeIn * (0.28 + 0.22 * Math.sin(now / 300 + s * 0.7));
          ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'warrior': {
        // Colosseum banners hanging above, and dust drifting through the light
        ctx.globalAlpha = fadeIn * 0.20;
        ctx.fillStyle = '#8a6a3a';
        for (let b = 0; b < 6; b++) {
          const bx = 70 + b * ((GAME_W - 140) / 5);
          const sway = Math.sin(now / 900 + b) * 5;
          ctx.beginPath();
          ctx.moveTo(bx - 16, 0);
          ctx.lineTo(bx + 16, 0);
          ctx.lineTo(bx + 16 + sway, 88);
          ctx.lineTo(bx + sway, 76);
          ctx.lineTo(bx - 16 + sway, 88);
          ctx.closePath(); ctx.fill();
        }
        ctx.shadowColor = '#e0b070'; ctx.shadowBlur = 6;
        ctx.fillStyle = '#e0b070';
        for (let dst = 0; dst < 20; dst++) {
          const dx = (dst * 61 + now * 0.014 * (1 + dst * 0.05)) % GAME_W;
          const dy = GAME_H - ((dst * 39 + now * 0.020 * (0.6 + dst * 0.04)) % (GAME_H * 0.8));
          ctx.globalAlpha = fadeIn * (0.10 + 0.12 * Math.sin(now / 340 + dst));
          ctx.beginPath(); ctx.arc(dx, dy, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'summoner': {
        // Dormant familiar eyes blinking open in the dark, and rune motes rising
        ctx.shadowColor = '#66ffcc'; ctx.shadowBlur = 14;
        for (let e = 0; e < 10; e++) {
          const ex = (e * 97 + 40) % GAME_W;
          const ey = 40 + ((e * 53) % Math.floor(GAME_H * 0.55));
          const blink = Math.sin(now / 700 + e * 1.7);
          if (blink < 0.35) continue;
          ctx.globalAlpha = fadeIn * 0.28 * blink;
          ctx.fillStyle = '#66ffcc';
          ctx.beginPath(); ctx.ellipse(ex - 6, ey, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(ex + 6, ey, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ccfff0';
        for (let m = 0; m < 16; m++) {
          const mx = (m * 71 + Math.sin(now / 800 + m) * 24 + 30) % GAME_W;
          const my = GAME_H - ((m * 47 + now * 0.030 * (0.7 + m * 0.05)) % (GAME_H + 40));
          ctx.globalAlpha = fadeIn * (0.14 + 0.14 * Math.sin(now / 300 + m));
          ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'ronin': {
        // Falling cherry blossoms
        ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 6;
        for (let b = 0; b < 18; b++) {
          const bx = (b * 53 + now * 0.028 * (1 + b * 0.04)) % GAME_W;
          const by = (b * 37 + now * 0.042 * (1 + b * 0.03)) % GAME_H;
          ctx.globalAlpha = fadeIn * (0.18 + 0.14 * Math.sin(now / 280 + b));
          ctx.fillStyle = b % 3 === 0 ? '#ddddff' : '#aaaacc';
          ctx.beginPath();
          ctx.ellipse(bx, by, 4, 2.5, now / 600 + b, 0, Math.PI * 2);
          ctx.fill();
        }
        // Faint sword slash echo lines
        ctx.globalAlpha = fadeIn * 0.12;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, GAME_H * 0.38); ctx.lineTo(GAME_W, GAME_H * 0.52); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(GAME_W * 0.2, 0); ctx.lineTo(GAME_W * 0.8, GAME_H); ctx.stroke();
        break;
      }

      case 'reaper': {
        // Drifting soul orbs
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 12;
        for (let s = 0; s < 14; s++) {
          const sx = (s * 67 + 30) % GAME_W;
          const sy = ((s * 43 + now * 0.025 * (0.6 + s * 0.05)) % GAME_H);
          ctx.globalAlpha = fadeIn * (0.18 + 0.14 * Math.sin(now / 320 + s * 0.8));
          ctx.fillStyle = s % 2 === 0 ? '#cc44cc' : '#ee88ee';
          ctx.beginPath(); ctx.arc(sx, sy, 4 + s % 3, 0, Math.PI * 2); ctx.fill();
        }
        // Dark fog wisps at ground level
        ctx.globalAlpha = fadeIn * 0.22;
        ctx.fillStyle = '#330033';
        ctx.shadowBlur = 0;
        for (let w = 0; w < 5; w++) {
          const wx = (w * 180 + now * 0.018) % (GAME_W + 100);
          ctx.beginPath();
          ctx.ellipse(wx, GAME_H - 20, 80, 20, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'sovereign': {
        // Command grid — a lattice of scan lines that reads as the arena being run
        ctx.strokeStyle = '#ff3311';
        ctx.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          const gx = ((i * 104 + now * 0.018) % (GAME_W + 104)) - 52;
          ctx.globalAlpha = fadeIn * 0.10;
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx - 30, GAME_H); ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
          const gy = ((i * 118 + now * 0.032) % (GAME_H + 118)) - 59;
          ctx.globalAlpha = fadeIn * (0.06 + 0.05 * Math.sin(now / 400 + i));
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(GAME_W, gy); ctx.stroke();
        }
        break;
      }

      case 'pugilist': {
        // Impact star sparks
        ctx.shadowColor = '#ee4444'; ctx.shadowBlur = 10;
        for (let i = 0; i < 12; i++) {
          const ix = (i * 79 + 24) % GAME_W;
          const iy = (i * 51 + 18) % GAME_H;
          const pulse = Math.sin(now / (180 + i * 22) + i) * 0.5 + 0.5;
          ctx.globalAlpha = fadeIn * pulse * 0.30;
          ctx.fillStyle = i % 2 === 0 ? '#ff6644' : '#ffcc44';
          // 4-pointed impact star
          const sr = 4 + i % 3;
          ctx.beginPath();
          for (let p = 0; p < 8; p++) {
            const ang = (p / 8) * Math.PI * 2;
            const r   = p % 2 === 0 ? sr : sr * 0.4;
            p === 0 ? ctx.moveTo(ix + Math.cos(ang) * r, iy + Math.sin(ang) * r)
                    : ctx.lineTo(ix + Math.cos(ang) * r, iy + Math.sin(ang) * r);
          }
          ctx.closePath(); ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }

  // ── Entry animation drawing helpers ────────────────────────────────────

  function _dLerp(a, b, t) { return a + (b - a) * t; }
  function _dClamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _dSmooth(t) { return t * t * (3 - 2 * t); }          // smoothstep
  function _dEaseIn(t) { return t * t; }
  function _dEaseOut(t) { return 1 - (1 - t) * (1 - t); }

  // Build a jagged bolt path between two points (stored as [{x,y}] array)
  function _dMakeBoltPath(x1, y1, x2, y2, segs, jitterX, jitterY) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const frac = i / segs;
      const jx = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * jitterX;
      const jy = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * jitterY;
      pts.push({ x: _dLerp(x1, x2, frac) + jx, y: _dLerp(y1, y2, frac) + jy });
    }
    return pts;
  }

  // Draw a pre-generated bolt path (stable across frames)
  function _dDrawBolt(pts, color, lw, blur) {
    if (!pts || pts.length < 2) return;
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.shadowColor = color; ctx.shadowBlur = blur || 14;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  // Legacy single-call lightning (for one-off sparks, not sustained bolts)
  function _dLightning(x1, y1, x2, y2, color, lw) {
    _dDrawBolt(_dMakeBoltPath(x1, y1, x2, y2, 7, 20, 10), color, lw, 14);
  }

  function _drawHammer(cx, cy, glowR, glowColor) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = glowColor || '#4488ff'; ctx.shadowBlur = glowR || 12;
    ctx.fillStyle = '#8B4513'; ctx.fillRect(-4, 0, 8, 32);
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(-20, -22, 40, 20);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-17, -19, 34, 8);
    ctx.fillStyle = '#aaaaaa'; ctx.fillRect(-20, -4, 40, 4);
    ctx.restore();
  }

  // Draws the fighter's equipped weapon pointing upward at (cx, cy) for cinematics.
  function _drawWeaponAtPos(f, cx, cy, sc, glowColor, glowR) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc || 1, sc || 1);
    ctx.shadowColor = glowColor || '#aaddff'; ctx.shadowBlur = glowR || 12;
    ctx.rotate(-Math.PI / 2); // weapon normally points right; rotate so it points up
    f.drawWeapon(0, 0, 0, false, f.weaponKey, 1.3);
    ctx.restore();
  }

  function _drawThorEntry(f, t, now, d) {
    ctx.save();
    const fx = f.cx(), fy = f.cy();
    const hamX = fx;
    let   hamY = fy - 92;
    const isHammer = f.weaponKey === 'hammer';

    // ── Phase 1: Weapon rises (t=295→268) ──────────────────────────────────
    if (t > 268) {
      const p = _dSmooth(_dClamp((RISE_FRAMES - t) / 27, 0, 1));
      hamY = fy - 40 - p * 52;
      const sc = 0.7 + p * 0.55;
      if (isHammer) {
        ctx.save();
        ctx.translate(hamX, hamY); ctx.scale(sc, sc);
        ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 6 + p * 16;
        ctx.fillStyle = '#8B4513'; ctx.fillRect(-4, 0, 8, 32);
        ctx.fillStyle = '#c0c0c0'; ctx.fillRect(-20, -22, 40, 20);
        ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-17, -19, 34, 8);
        ctx.fillStyle = '#aaaaaa'; ctx.fillRect(-20, -4, 40, 4);
        ctx.restore();
      } else {
        _drawWeaponAtPos(f, hamX, hamY, sc, '#aaddff', 6 + p * 16);
      }
      // Faint spark trails rising with the hammer
      if (p > 0.35) {
        ctx.globalAlpha = p * 0.4;
        for (let i = 0; i < Math.floor(p * 4); i++) {
          _dLightning(hamX + (Math.random() - 0.5) * 32, hamY - 20 - Math.random() * 18,
                      hamX, hamY - 8, '#88ccff', 1.2);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ── Phase 2: Held high, anticipation crackle (t=268→260) ───────────────
    if (t <= 268 && t > 260) {
      const p = _dSmooth((268 - t) / 8);
      // Refresh crackle paths every 3 frames so sparks are stable arcs
      if (!d.cracklePaths || !d.crackleRefresh || d.crackleRefresh <= 0) {
        d.cracklePaths = Array.from({ length: 5 }, () => {
          const ang = Math.random() * Math.PI * 2;
          const r   = 14 + Math.random() * 12;
          return _dMakeBoltPath(hamX, hamY - 10,
            hamX + Math.cos(ang) * r, hamY - 10 + Math.sin(ang) * r, 4, 6, 4);
        });
        d.crackleRefresh = 3;
      }
      d.crackleRefresh--;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 45) * p;
      for (const path of d.cracklePaths) _dDrawBolt(path, '#aaddff', 1.8, 12);
      ctx.globalAlpha = 1;
    }

    // ── Phase 3: Massive sky lightning strike (d.lightningTimer 65→0) ──────
    if (d.lightningTimer > 0) {
      const hamHeadY = hamY - 10;
      // Regenerate bolt paths every 3 frames — stable arcs, not per-frame noise
      if (!d.boltRefresh || d.boltRefresh <= 0) {
        d.coreBolt  = _dMakeBoltPath(hamX, -20, hamX, hamHeadY, 12, 18, 8);
        d.midBolt   = _dMakeBoltPath(hamX, -20, hamX, hamHeadY, 12, 10, 5);
        d.innerBolt = _dMakeBoltPath(hamX, -20, hamX, hamHeadY, 10,  5, 3);
        d.sideBolts = Array.from({ length: 4 }, () => {
          const bx = hamX + (Math.random() - 0.5) * 190;
          return _dMakeBoltPath(bx, -10, bx + (Math.random() - 0.5) * 45, hamHeadY + 30, 6, 12, 6);
        });
        d.boltRefresh = 3;
      }
      d.boltRefresh--;

      const a = _dClamp(d.lightningTimer / 55, 0, 1);
      // Draw weapon while it's still held high, charged by lightning
      if (isHammer) _drawHammer(hamX, hamY, 38 * a, '#ffffff');
      else _drawWeaponAtPos(f, hamX, hamY, 1, '#ffffff', 38 * a);

      // Multi-layer core bolt — white → blue → cyan outer glow
      ctx.globalAlpha = a;
      _dDrawBolt(d.coreBolt,  '#ffffff', 14, 45);
      _dDrawBolt(d.midBolt,   '#aaddff',  8, 28);
      _dDrawBolt(d.innerBolt, '#88ccff',  3, 10);

      // Side bolts from sky
      ctx.globalAlpha = a * 0.65;
      for (const bolt of d.sideBolts) _dDrawBolt(bolt, '#88ccff', 2.5, 14);

      // Corona at hammer head — stable radius with subtle breathing
      ctx.globalAlpha = a * 0.92;
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 50;
      const coronaR = 16 + 3 * Math.sin(now / 30);
      ctx.beginPath(); ctx.arc(hamX, hamHeadY, coronaR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cceeff'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(hamX, hamHeadY, coronaR * 0.55, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = 1;
      d.lightningTimer--;
    }

    // ── Phase 4: Supercharge aura, weapon held (t=248→228) ─────────────────
    if (t <= 248 && t > 228) {
      const p = _dSmooth((248 - t) / 20);
      if (isHammer) _drawHammer(hamX, hamY, 28 + p * 28, '#44aaff');
      else _drawWeaponAtPos(f, hamX, hamY, 1, '#44aaff', 28 + p * 28);

      // Outer pulsing ring
      ctx.globalAlpha = (0.45 + 0.2 * Math.sin(now / 70)) * p;
      ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 3 + p * 5;
      ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(hamX, fy, 24 + p * 30, 0, Math.PI * 2); ctx.stroke();

      // Inner fill
      ctx.globalAlpha = 0.18 * p;
      ctx.fillStyle = '#44aaff';
      ctx.beginPath(); ctx.arc(hamX, fy, 18 + p * 18, 0, Math.PI * 2); ctx.fill();

      // Rotating arc bolts — paths stable for 3 frames
      if (!d.auralRefresh || d.auralRefresh <= 0) {
        d.auralBolts = Array.from({ length: 6 }, (_, i) => {
          const ang = (i / 6) * Math.PI * 2 + now / 180;
          return _dMakeBoltPath(hamX, fy,
            hamX + Math.cos(ang) * 58, fy + Math.sin(ang) * 34, 5, 8, 6);
        });
        d.auralRefresh = 3;
      }
      d.auralRefresh--;
      ctx.globalAlpha = (0.48 + 0.28 * Math.sin(now / 90)) * p;
      for (const bolt of d.auralBolts) _dDrawBolt(bolt, '#aaddff', 1.8, 14);

      ctx.globalAlpha = 1;
    }

    // ── Phase 5: Weapon slams DOWN (t=228→215) ─────────────────────────────
    if (d.slamStart && t <= 228 && !d.slamFired) {
      const p = _dEaseIn(_dClamp((228 - t) / 13, 0, 1));
      const startY = fy - 92, endY = GAME_H - 92;
      hamY = startY + (endY - startY) * p;
      if (isHammer) _drawHammer(hamX, hamY, 18 + p * 32, '#44aaff');
      else _drawWeaponAtPos(f, hamX, hamY, 1, '#44aaff', 18 + p * 32);

      // Motion trail — ghost copies fading above the descending weapon
      const trailCount = 5;
      for (let tr = 1; tr <= trailCount; tr++) {
        const trFrac = tr / (trailCount + 1);
        const trY    = hamY - (p * (endY - startY)) * trFrac * 0.38;
        ctx.globalAlpha = (1 - trFrac) * 0.38 * p;
        ctx.fillStyle = '#44aaff'; ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 8;
        if (isHammer) ctx.fillRect(hamX - 20, trY - 22, 40, 20); // hammer head shape
        else          ctx.fillRect(hamX - 4, trY - 16, 8, 16);   // weapon shaft shape
      }
      ctx.globalAlpha = 1;
    }

    // ── Phase 6: Impact shockwave (t=215→165) ──────────────────────────────
    if (d.slamFired && t <= 215 && t > 165) {
      const p = _dEaseOut((215 - t) / 50);

      // Semicircle shockwave expanding from ground
      ctx.globalAlpha = _dSmooth(1 - p) * 0.78;
      ctx.strokeStyle = '#44aaff'; ctx.lineWidth = _dLerp(5, 1, p);
      ctx.shadowColor = '#44aaff'; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(fx, GAME_H - 80, p * 320, Math.PI, Math.PI * 2); ctx.stroke();

      // Stable ground-bolt paths — regenerate every 4 frames
      if (!d.groundBoltRefresh || d.groundBoltRefresh <= 0) {
        d.groundBolts = Array.from({ length: 6 }, () => {
          const ba = (Math.random() - 0.5) * Math.PI;
          const len = 180 + Math.random() * 100;
          return _dMakeBoltPath(fx, GAME_H - 80,
            fx + Math.cos(ba) * len, GAME_H - 80 - Math.sin(Math.abs(ba)) * 65, 7, 16, 10);
        });
        d.groundBoltRefresh = 4;
      }
      d.groundBoltRefresh--;
      ctx.globalAlpha = _dSmooth(1 - p) * 0.62;
      for (const bolt of d.groundBolts) _dDrawBolt(bolt, '#aaddff', 2.2, 18);

      // Weapon resting at ground after slam
      ctx.globalAlpha = _dSmooth(1 - p) * 0.7;
      if (isHammer) _drawHammer(hamX, GAME_H - 92, 18, '#44aaff');
      else _drawWeaponAtPos(f, hamX, GAME_H - 92, 1, '#44aaff', 18);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function _drawKratosEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Axe raised with red energy (t=295→262)
    if (t > 262) {
      const phase = _dClamp((RISE_FRAMES - t) / 33, 0, 1);
      const axeY  = fy - 35 - phase * 25;
      ctx.save();
      ctx.translate(fx + 12, axeY); ctx.rotate(Math.PI * 0.15);
      ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8 + phase * 22;
      ctx.fillStyle = '#6b3a1f'; ctx.fillRect(-3, -25, 6, 50);
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(22, -28); ctx.lineTo(24, -4); ctx.lineTo(2, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bbb';
      ctx.beginPath(); ctx.moveTo(2, -18); ctx.lineTo(18, -24); ctx.lineTo(20, -8); ctx.lineTo(4, -8); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (phase > 0.3) {
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now / 90 + i);
          _dLightning(fx + 12, axeY - 14, fx + 12 + (Math.random() - 0.5) * 55, axeY - 30 - Math.random() * 22, '#ff4400', 1.8);
        }
      }
    }

    // Rage burst ring (t=262→248)
    if (d.rageBurst && d.rageBurstTimer > 0) {
      const ba = d.rageBurstTimer / 45;
      ctx.globalAlpha = ba * 0.55;
      ctx.fillStyle = '#cc2200'; ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 28;
      ctx.beginPath(); ctx.arc(fx, fy, (1 - ba) * 90 + 12, 0, Math.PI * 2); ctx.fill();
      d.rageBurstTimer--;
    }

    // Axe thrown into sky (t=235→200)
    if (d.axeThrown && t <= 235) {
      d.axeY += d.axeVy; d.axeVy += 0.4;
      if (d.axeY > -30) {
        ctx.globalAlpha = Math.min(1, Math.max(0, (d.axeY + 30) / 80));
        ctx.save();
        ctx.translate(d.axeX, d.axeY); ctx.rotate(now / 150);
        ctx.fillStyle = '#888'; ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(-16, -12); ctx.lineTo(0, -22); ctx.lineTo(16, -12); ctx.lineTo(10, 0); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6b3a1f'; ctx.fillRect(-2, 0, 4, 22);
        ctx.globalAlpha *= 0.4;
        ctx.fillStyle = '#ff4400'; ctx.beginPath(); ctx.arc(0, 15, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // Ground heat (t=248+) — soft glow hugging the ground
    // (was a hard glowing rect that read as a floating red bar)
    if (t <= 248) {
      const hp = _dClamp((248 - t) / 60, 0, 0.3);
      ctx.globalAlpha = hp;
      ctx.save();
      ctx.translate(fx, GAME_H - 81);
      ctx.scale(1, 0.22); // flatten into a ground-hugging ellipse
      const _khGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
      _khGrad.addColorStop(0, 'rgba(255,70,0,0.85)');
      _khGrad.addColorStop(1, 'rgba(255,70,0,0)');
      ctx.fillStyle = _khGrad;
      ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function _drawNinjaEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Shadow shroud over the owner while phasing between targets
    if (d.vanished) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#220044'; ctx.shadowColor = '#bb44ff'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.ellipse(fx, fy, 22, 32, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const wa = now / 300 + i * 1.6;
        ctx.globalAlpha = 0.30 + 0.15 * Math.sin(wa * 2);
        ctx.beginPath();
        ctx.arc(fx + Math.cos(wa) * 26, fy + Math.sin(wa * 1.3) * 30, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Launcher slash arcs at each strike point
    if (d.slashes) {
      for (const s of d.slashes) {
        if (s.alpha <= 0) continue;
        s.alpha = Math.max(0, s.alpha - 0.022);
        ctx.globalAlpha = s.alpha * 0.90;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        ctx.globalAlpha = s.alpha * 0.50;
        ctx.strokeStyle = '#330066'; ctx.lineWidth = 8;
        ctx.shadowColor = '#9900cc'; ctx.shadowBlur = 24; ctx.stroke();
        if (s.alpha > 0.25) {
          ctx.globalAlpha = s.alpha * 0.35;
          ctx.strokeStyle = '#bb44ff'; ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const p = i / 4;
            const mx = _dLerp(s.x1, s.x2, p), my = _dLerp(s.y1, s.y2, p);
            ctx.beginPath();
            ctx.moveTo(mx + (Math.random() - 0.5) * 14, my + (Math.random() - 0.5) * 14);
            ctx.lineTo(mx + (Math.random() - 0.5) * 22, my + (Math.random() - 0.5) * 22);
            ctx.stroke();
          }
        }
      }
    }
  }

  function _drawGunnerEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Targeting reticles (t=262+)
    if (d.reticlesActive) {
      const rPos = [{x: fx - 200, y: fy - 30}, {x: fx + 180, y: fy + 20}, {x: fx - 80, y: fy - 80}, {x: fx + 100, y: fy - 60}];
      for (const rp of rPos) {
        ctx.globalAlpha = 0.38 + 0.18 * Math.sin(now / 200 + rp.x);
        ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
        const rr = 18;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rp.x - rr - 8, rp.y); ctx.lineTo(rp.x + rr + 8, rp.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rp.x, rp.y - rr - 8); ctx.lineTo(rp.x, rp.y + rr + 8); ctx.stroke();
      }
    }

    // Bullet trails expanding outward (t=246+)
    if (d.bulletTrails && d.bulletTrails.length > 0) {
      for (const bt of d.bulletTrails) {
        if (bt.len < bt.maxLen) bt.len += bt.speed;
        const endX = bt.x + Math.cos(bt.ang) * bt.len;
        const endY = bt.y + Math.sin(bt.ang) * bt.len;
        const ta = Math.max(0, 1 - bt.len / bt.maxLen);
        ctx.globalAlpha = ta * 0.65;
        ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2;
        ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(bt.x, bt.y); ctx.lineTo(endX, endY); ctx.stroke();
        ctx.globalAlpha = ta;
        ctx.fillStyle = '#ffee88'; ctx.beginPath(); ctx.arc(endX, endY, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Orbital designator beam (t=228+)
    if (d.beamActive && d.beamAlpha > 0) {
      d.beamAlpha = Math.max(0, d.beamAlpha - 0.008);
      const ba = d.beamAlpha;
      const grad = ctx.createLinearGradient(fx, fy, fx, 0);
      grad.addColorStop(0, `rgba(255,200,50,${ba * 0.9})`);
      grad.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad; ctx.lineWidth = 8;
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, 0); ctx.stroke();
      ctx.globalAlpha = ba;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, 0); ctx.stroke();
      ctx.globalAlpha = ba * (0.6 + 0.3 * Math.sin(now / 80));
      ctx.fillStyle = '#ffffaa'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 28;
      ctx.beginPath(); ctx.arc(fx, 12, 14 + Math.random() * 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function _drawArcherEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Giant power arrow nocked (t=264→245)
    if (d.arrowNocked && t > 245) {
      d.arrowCharge = _dClamp(d.arrowCharge + 0.03, 0, 1);
      const sc = 0.7 + d.arrowCharge * 0.8;
      ctx.globalAlpha = 0.75 + d.arrowCharge * 0.25;
      ctx.save();
      ctx.translate(fx + 8, fy - 20 - d.arrowCharge * 20); ctx.rotate(-Math.PI / 2 - 0.2); ctx.scale(sc, sc);
      ctx.strokeStyle = '#2a8a50'; ctx.lineWidth = 5;
      ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 12 + d.arrowCharge * 20;
      ctx.beginPath(); ctx.moveTo(-35, 0); ctx.lineTo(35, 0); ctx.stroke();
      ctx.fillStyle = '#88ffcc'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(22, -10); ctx.lineTo(22, 10); ctx.closePath(); ctx.fill();
      if (d.arrowCharge > 0.5) {
        ctx.globalAlpha = (d.arrowCharge - 0.5) * 0.55;
        ctx.fillStyle = '#44ff88';
        ctx.beginPath(); ctx.arc(35, 0, 14 + d.arrowCharge * 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Arrow flying upward (t=245→220)
    if (d.arrowFired && d.arrowY !== undefined) {
      d.arrowY += d.arrowVy; d.arrowAlpha = Math.max(0, d.arrowAlpha - 0.015);
      if (d.arrowY > -60) {
        ctx.globalAlpha = d.arrowAlpha * 0.88;
        ctx.save();
        ctx.translate(d.arrowX, d.arrowY); ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#44ff88'; ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(6, -8); ctx.lineTo(6, 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2a8a50'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.globalAlpha = d.arrowAlpha * 0.32;
        const tg = ctx.createLinearGradient(0, 0, 0, 70);
        tg.addColorStop(0, 'rgba(68,255,136,0.8)'); tg.addColorStop(1, 'rgba(68,255,136,0)');
        ctx.strokeStyle = tg; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 70); ctx.stroke();
        ctx.restore();
      }
    }

    // Arrow rain falling (t=228+)
    if (d.arrowRain && d.arrowRain.length > 0) {
      for (const ar of d.arrowRain) {
        ar.y += ar.vy; ar.timer = Math.max(0, ar.timer - 1);
        if (ar.y > GAME_H + 10) continue;
        ctx.globalAlpha = ar.alpha * Math.min(1, ar.timer / 20);
        ctx.save();
        ctx.translate(ar.x, ar.y); ctx.rotate(Math.PI / 2 + 0.1);
        ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 2;
        ctx.shadowColor = '#88ff88'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke();
        ctx.fillStyle = '#aaffcc';
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  function _drawPaladinEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Shield glow pre-activation (t=295→264)
    if (t > 264) {
      const phase = _dClamp((RISE_FRAMES - t) / 31, 0, 1);
      ctx.globalAlpha = phase * 0.55;
      ctx.fillStyle = '#ffffaa'; ctx.shadowColor = '#ffe888'; ctx.shadowBlur = 18 + phase * 14;
      ctx.beginPath(); ctx.arc(fx - 10, fy, 20 + phase * 10, 0, Math.PI * 2); ctx.fill();
    }

    // Divine cross in sky (t=264→228)
    if (d.crossFade) {
      d.crossAlpha = Math.min(0.9, d.crossAlpha + 0.04);
      const cx2 = GAME_W / 2, cy2 = GAME_H * 0.22;
      ctx.globalAlpha = d.crossAlpha * 0.62;
      ctx.fillStyle = '#ffffaa'; ctx.shadowColor = '#ffe888'; ctx.shadowBlur = 32;
      ctx.fillRect(cx2 - 9, cy2 - 100, 18, 200);
      ctx.fillRect(cx2 - 80, cy2 - 9, 160, 18);
      ctx.globalAlpha = d.crossAlpha * 0.40;
      ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 16;
      ctx.fillRect(cx2 - 4, cy2 - 85, 8, 170);
      ctx.fillRect(cx2 - 68, cy2 - 4, 136, 8);
      if (t <= 228) d.crossAlpha = Math.max(0, d.crossAlpha - 0.03);
    }

    // Holy pillar (t=246→228)
    if (d.pillarActive && d.pillarAlpha > 0) {
      const pg = ctx.createLinearGradient(fx, fy, fx, 0);
      pg.addColorStop(0, `rgba(255,255,180,${d.pillarAlpha * 0.6})`);
      pg.addColorStop(0.6, `rgba(255,255,220,${d.pillarAlpha * 0.32})`);
      pg.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = pg; ctx.fillRect(fx - 28, 0, 56, fy);
      ctx.globalAlpha = d.pillarAlpha * 0.78;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
      ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, 0); ctx.stroke();
    }

    // Shield slam residual (t=228+)
    if (t <= 228) {
      const sp = _dClamp((228 - t) / 40, 0, 1);
      ctx.globalAlpha = (1 - sp) * 0.28;
      ctx.fillStyle = '#ffffaa'; ctx.shadowColor = '#ffe888'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(fx, fy, sp * 120, 0, Math.PI * 2); ctx.fill();
    }
  }

  function _drawBerserkerEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Red rage veins radiating from body (t=265+)
    if (d.veinsActive && d.veins) {
      for (const v of d.veins) {
        ctx.globalAlpha = (0.65 + 0.25 * Math.sin(now / 150 + v.ang)) * 0.7;
        ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
        const ex = fx + Math.cos(v.ang) * v.len, ey = fy + Math.sin(v.ang) * v.len * 0.7;
        ctx.beginPath(); ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo((fx + ex) / 2 + (Math.random() - 0.5) * 18, (fy + ey) / 2 + (Math.random() - 0.5) * 18, ex, ey);
        ctx.stroke();
      }
    }

    // Frenzy erratic glow (t=265→252)
    if (t <= 265 && t > 252) {
      const phase = (265 - t) / 13;
      ctx.globalAlpha = 0.42 + phase * 0.28;
      ctx.fillStyle = '#880000'; ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 18 + phase * 20;
      const jx = (Math.random() - 0.5) * 12 * phase, jy = (Math.random() - 0.5) * 12 * phase;
      ctx.beginPath(); ctx.ellipse(fx + jx, fy + jy, 22 + phase * 18, 28 + phase * 14, 0, 0, Math.PI * 2); ctx.fill();
    }

    // ROAR shockwave ring (t=252→220)
    if (t <= 252 && t > 220) {
      const phase = (252 - t) / 32;
      ctx.globalAlpha = (1 - phase) * 0.58;
      ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 3 - phase * 2;
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(fx, fy, phase * 200, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = (1 - phase) * 0.32;
      ctx.beginPath(); ctx.arc(fx, fy, Math.max(0, phase * 200 - 20), 0, Math.PI * 2); ctx.stroke();
    }

    // Blood pool at feet (t=252+)
    if (d.bloodPool) {
      d.bloodPoolR = Math.min(60, d.bloodPoolR + 1.2);
      ctx.globalAlpha = 0.52;
      const pg = ctx.createRadialGradient(fx, GAME_H - 80, 0, fx, GAME_H - 80, d.bloodPoolR);
      pg.addColorStop(0, 'rgba(150,0,0,0.8)'); pg.addColorStop(1, 'rgba(80,0,0,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(fx, GAME_H - 78, d.bloodPoolR, d.bloodPoolR * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function _drawMegaknightEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();

    // Reality cracks radiating outward (t=264+)
    if (d.cracks && d.cracks.length > 0) {
      for (const c of d.cracks) {
        if (c.len < 90) c.len += c.growth;
        ctx.globalAlpha = c.alpha * (0.58 + 0.28 * Math.sin(now / 200 + c.ang));
        ctx.strokeStyle = '#9944ff'; ctx.lineWidth = 1.5;
        ctx.shadowColor = '#7700cc'; ctx.shadowBlur = 10;
        const ex = fx + Math.cos(c.ang) * c.len, ey = fy + Math.sin(c.ang) * c.len * 0.7;
        ctx.beginPath(); ctx.moveTo(fx, fy);
        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          const p = s / steps;
          ctx.lineTo(_dLerp(fx, ex, p) + (Math.random() - 0.5) * 12, _dLerp(fy, ey, p) + (Math.random() - 0.5) * 12);
        }
        ctx.stroke();
      }
    }

    // Void gauntlet charging (t=264→248)
    if (t <= 264 && t > 248) {
      const phase = (264 - t) / 16;
      const gx = fx + (f.facing || 1) * 18;
      ctx.globalAlpha = phase * 0.78;
      ctx.fillStyle = '#220044'; ctx.shadowColor = '#9944ff'; ctx.shadowBlur = 22 + phase * 18;
      ctx.beginPath(); ctx.arc(gx, fy, 10 + phase * 18, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const ta = (i / 5) * Math.PI * 2 + now / 300;
        const td = 40 + phase * 20;
        ctx.globalAlpha = phase * 0.38;
        ctx.strokeStyle = '#9944ff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(ta) * td, fy + Math.sin(ta) * td * 0.7);
        ctx.lineTo(gx, fy); ctx.stroke();
      }
    }

    // Void tear growing (t=248→60)
    if (d.voidTear && t <= 248) {
      d.voidTearW = Math.min(80, d.voidTearW + 4);
      d.voidTearH = Math.min(130, d.voidTearH + 6);
      const tw = d.voidTearW, th = d.voidTearH, tx = d.voidTearX, ty = d.voidTearY;
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = '#000000'; ctx.shadowColor = '#9944ff'; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.ellipse(tx, ty, tw / 2, th / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.68;
      ctx.strokeStyle = '#9944ff'; ctx.lineWidth = 4; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(tx, ty, tw / 2, th / 2, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.52;
      ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 4;
      for (let s = 0; s < 6; s++) {
        ctx.beginPath(); ctx.arc(tx + (Math.random() - 0.5) * tw * 0.7, ty + (Math.random() - 0.5) * th * 0.7, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.48;
      ctx.strokeStyle = '#cc77ff'; ctx.lineWidth = 2;
      for (let e = 0; e < 8; e++) {
        const ea = (e / 8) * Math.PI * 2;
        const ex0 = tx + Math.cos(ea) * (tw / 2), ey0 = ty + Math.sin(ea) * (th / 2);
        ctx.beginPath();
        ctx.moveTo(ex0, ey0);
        ctx.lineTo(ex0 + Math.cos(ea) * (8 + Math.random() * 18), ey0 + Math.sin(ea) * (8 + Math.random() * 18));
        ctx.stroke();
      }
    }
  }

  function _drawRoninEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();
    // Spirit blade materializing beside the fighter
    if (d.spiritBladeActive && d.spiritBladeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = d.spiritBladeAlpha;
      ctx.translate(fx + (f.facing || 1) * 22, fy - 8);
      ctx.rotate(-Math.PI * 0.1);
      ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#eeeeff';
      ctx.fillRect(-2, -28, 4, 50);
      ctx.fillStyle = '#888899';
      ctx.fillRect(-7, 18, 14, 3);
      ctx.globalAlpha = d.spiritBladeAlpha * 0.5;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 22); ctx.stroke();
      ctx.restore();
    }
    // Diagonal slash trail
    if (d.slashFired && d.slashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = d.slashAlpha;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(d.slashX1, d.slashY1); ctx.lineTo(d.slashX2, d.slashY2); ctx.stroke();
      ctx.lineWidth = 1; ctx.globalAlpha = d.slashAlpha * 0.6;
      ctx.beginPath(); ctx.moveTo(d.slashX1, d.slashY1 + 6); ctx.lineTo(d.slashX2, d.slashY2 + 6); ctx.stroke();
      ctx.restore();
    }
  }

  function _drawReaperEntry(f, t, now, d) {
    const fx = f.cx(), fy = f.cy();
    // Floating souls
    if (d.souls) {
      for (const s of d.souls) {
        if (s.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#dd88ee';
        ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = s.alpha * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(s.x - 1, s.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    // Rising scythe silhouette
    if (d.scytheRising) {
      d.scytheY = Math.max(d.scytheTargetY, d.scytheY - 8);
      ctx.save();
      ctx.translate(fx, d.scytheY);
      ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 20;
      ctx.strokeStyle = '#dd66dd'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -10, 36, -Math.PI * 0.75, Math.PI * 0.05); ctx.stroke();
      ctx.strokeStyle = '#882288'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 55); ctx.stroke();
      ctx.restore();
    }
  }

  function _drawPugilistEntry(f, t, now, d) {
    // Giant fists dropping from sky
    if (d.fistDropL && d.fistLY !== undefined) {
      ctx.save();
      ctx.translate(d.fistLX || f.cx() - 100, d.fistLY);
      ctx.shadowColor = '#ee4444'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#cc2222';
      ctx.beginPath(); ctx.roundRect(-22, -20, 44, 40, 8); ctx.fill();
      ctx.fillStyle = '#ff6666';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.arc(k * 10, -20, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (d.fistDropR && d.fistRY !== undefined) {
      ctx.save();
      ctx.translate(d.fistRX || f.cx() + 100, d.fistRY);
      ctx.scale(-1, 1);
      ctx.shadowColor = '#ee4444'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#cc2222';
      ctx.beginPath(); ctx.roundRect(-22, -20, 44, 40, 8); ctx.fill();
      ctx.fillStyle = '#ff6666';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.arc(k * 10, -20, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function _drawWarriorEntry(f, t, now, d) {
    // Ring of planted swords rising around the owner
    if (d.swordsPlanted) {
      const rise = d.swordRise || 0;
      ctx.save();
      ctx.shadowColor = '#e0b070'; ctx.shadowBlur = 16;
      for (let i = 0; i < 8; i++) {
        const a  = (i / 8) * Math.PI * 2 + now / 2600;
        const sx = f.cx() + Math.cos(a) * 130;
        const sy = (GAME_H - 62) + Math.sin(a) * 26;
        const hgt = 54 * rise;
        ctx.fillStyle = '#d8d0c0';
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy);
        ctx.lineTo(sx - 3, sy - hgt + 9);
        ctx.lineTo(sx, sy - hgt);
        ctx.lineTo(sx + 3, sy - hgt + 9);
        ctx.lineTo(sx + 4, sy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(sx - 9, sy - 10 * rise, 18, 4);
      }
      ctx.restore();
    }
    // The duel ring snapping shut
    if (d.ringDraw) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#e0b070'; ctx.lineWidth = 4;
      ctx.shadowColor = '#e0b070'; ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.ellipse(f.cx(), f.cy(), d.ringR, d.ringR * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function _drawSummonerEntry(f, t, now, d) {
    // Sigil inscribing itself on the floor
    if (d.sigilDraw) {
      const p = d.sigilProg || 0;
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.4 * p;
      ctx.strokeStyle = '#66ffcc'; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#66ffcc'; ctx.shadowBlur = 20;
      const sy = GAME_H - 56;
      ctx.beginPath();
      ctx.ellipse(f.cx(), sy, 120 * p, 44 * p, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(f.cx(), sy, 78 * p, 28 * p, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + now / 2000;
        ctx.beginPath();
        ctx.moveTo(f.cx() + Math.cos(a) * 78 * p, sy + Math.sin(a) * 28 * p);
        ctx.lineTo(f.cx() + Math.cos(a) * 120 * p, sy + Math.sin(a) * 44 * p);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Familiars converging on the summoner
    if (d.familiars) {
      ctx.save();
      ctx.shadowColor = '#66ffcc'; ctx.shadowBlur = 18;
      for (const fam of d.familiars) {
        if (fam.delay > 0) continue;
        const fx = f.cx() + Math.cos(fam.ang) * fam.r;
        const fy = f.cy() + Math.sin(fam.ang) * fam.r * 0.7;
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = 'rgba(102,255,204,0.4)';
        ctx.beginPath(); ctx.arc(fx, fy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ccfff0';
        ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function _drawSovereignEntry(f, t, now, d) {
    const cx = f.cx(), cy = f.cy();
    const top = GAME_H - 470, bot = GAME_H - 40;

    // Rails slamming in from off-screen to the corridor's opening width
    if (d.railProg !== undefined) {
      const e = _dEaseOut(d.railProg);
      ctx.shadowColor = '#ff3311'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#ff3311';
      for (const side of [-1, 1]) {
        const rx = cx + side * _dLerp(GAME_W * 0.85, 400, e);
        ctx.globalAlpha = 0.35 + 0.55 * e;
        ctx.lineWidth = 3 + (1 - e) * 5;
        ctx.beginPath(); ctx.moveTo(rx, top); ctx.lineTo(rx, bot); ctx.stroke();
        ctx.globalAlpha = 0.20 * e;
        ctx.fillStyle = '#ff3311';
        ctx.fillRect(rx - (side < 0 ? 0 : 26), top, 26, bot - top);
      }
    }

    // Lock ring sealing behind him — brackets closing onto a full circle
    if (d.ringProg !== undefined) {
      const e = _dSmooth(d.ringProg);
      const R = _dLerp(190, 96, e);
      ctx.shadowColor = '#ff5533'; ctx.shadowBlur = 18;
      ctx.strokeStyle = '#ff5533';
      ctx.globalAlpha = 0.30 + 0.55 * e;
      ctx.lineWidth = 4;
      for (let q = 0; q < 4; q++) {
        const a0 = q * Math.PI / 2 + Math.PI / 4 - _dLerp(0.10, 0.72, e);
        const a1 = q * Math.PI / 2 + Math.PI / 4 + _dLerp(0.10, 0.72, e);
        ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
      }
      ctx.globalAlpha = 0.22 * e;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.62, 0, Math.PI * 2); ctx.stroke();
    }

    if (d.lockFlash > 0) {
      ctx.globalAlpha = d.lockFlash / 14 * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#ff3311'; ctx.shadowBlur = 30;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, 96 + (14 - d.lockFlash) * 9, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function _drawDomainEntryAnim(r) {
    if (!r.animData) return;
    const f = r.fighter;
    if (!f || f.health <= 0) return;
    const _dk = _domainKeyOf(f);
    const def = DOMAIN_DEFS[_dk];
    if (!def) return;
    const t = r.timer, d = r.animData, now = performance.now();
    ctx.save();
    ctx.globalAlpha = 1;
    switch (_dk) {
      case 'thor':       _drawThorEntry(f, t, now, d);       break;
      case 'kratos':     _drawKratosEntry(f, t, now, d);     break;
      case 'ninja':      _drawNinjaEntry(f, t, now, d);      break;
      case 'gunner':     _drawGunnerEntry(f, t, now, d);     break;
      case 'archer':     _drawArcherEntry(f, t, now, d);     break;
      case 'paladin':    _drawPaladinEntry(f, t, now, d);    break;
      case 'berserker':  _drawBerserkerEntry(f, t, now, d);  break;
      case 'megaknight': _drawMegaknightEntry(f, t, now, d); break;
      case 'ronin':      _drawRoninEntry(f, t, now, d);      break;
      case 'reaper':     _drawReaperEntry(f, t, now, d);     break;
      case 'pugilist':   _drawPugilistEntry(f, t, now, d);   break;
      case 'warrior':    _drawWarriorEntry(f, t, now, d);    break;
      case 'summoner':   _drawSummonerEntry(f, t, now, d);   break;
      case 'sovereign':  _drawSovereignEntry(f, t, now, d);  break;
    }
    ctx.restore();
  }

  function _activateDomain(fighter, suppressAnnounce = false) {
    const defKey = _domainKeyOf(fighter);
    if (!defKey || defKey === 'none') return;
    const def = DOMAIN_DEFS[defKey];
    if (!def) return;

    // Remove any existing domain by this fighter
    _removeDomainFor(fighter);

    const domain = {
      owner: fighter, defKey, def,
      timer: DOMAIN_FRAMES,
      hazards: [],
      spawnCooldown: 30, // first hazard after 0.5 s
      // Left edge of this domain's GAME_W-wide region, in world coords. Resolved
      // once here so the region can't drift under hazards that are already live.
      originX: _dAnchorOrigin(fighter),
    };

    if (def.hazardType === 'void_rock') _createVoidRocks(domain);
    if (def.hazardType === 'null_wall') _createNullWalls(domain);
    _createWeaponHazards(domain);

    // Thor holds Mjolnir during domain when hammer-equipped; otherwise holds equipped weapon.
    // Kratos holds the Blade of Olympus while his axe tears the arena apart.
    if (defKey === 'thor') fighter._domainDisplayWeapon = 'stormbreaker';
    if (defKey === 'kratos') fighter._domainDisplayWeapon = 'sword';

    _domains.push(domain);

    if (!suppressAnnounce && typeof queueAnnouncement === 'function') {
      // Conviction is the class-bearer name for the system; Sovereign is not a
      // bearer and never earned one.
      const _label = defKey === 'sovereign' ? 'DOMAIN EXPANSION' : 'CONVICTION';
      queueAnnouncement(_label + ' — ' + def.name.toUpperCase(), def.color);
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 28);
    if (typeof spawnParticles === 'function') {
      spawnParticles(fighter.cx(), fighter.cy(), def.color, 40);
      spawnParticles(fighter.cx(), fighter.cy(), '#ffffff', 20);
    }

    // ── Weapon-specific Conviction burst ─────────────────────────────
    _applyWeaponConvictionBonus(fighter, def);

    // Ninja: the ongoing passive is always shuriken volleys — generic weapon
    // passives (energy slashes, bullets, arrows) don't fit the Shadow Realm theme
    if (defKey === 'ninja') {
      fighter._convictionPassive = { key: 'shuriken', timer: DOMAIN_FRAMES, cd: _PASSIVE_CDS.shuriken };
    }

    // Sovereign wields the nullblade, which has no entry in _PASSIVE_CDS or the
    // Conviction bonus table — without this the domain would hold the corridor
    // and fire nothing. Sword slashes are the closest existing passive.
    if (defKey === 'sovereign') {
      fighter._convictionPassive = { key: 'sword', timer: DOMAIN_FRAMES, cd: _PASSIVE_CDS.sword };
    }
  }

  // ── Weapon Conviction Bonus — unique burst per weapon on activation ──
  function _applyWeaponConvictionBonus(fighter, def) {
    const wep  = fighter.weaponKey || '';
    const cx   = fighter.cx(), cy = fighter.cy();
    const f    = fighter.facing || 1;
    const col  = def ? def.color : '#ffffff';
    const _all = [...(typeof players !== 'undefined' ? players : []),
                  ...(typeof minions !== 'undefined' ? minions : [])];
    const _enemies = _all.filter(e => e && e !== fighter && e.health > 0 && !e.godMode
                                    && (typeof areAlliedEntities === 'function' ? !areAlliedEntities(fighter, e) : true));

    switch (wep) {

      case 'sword': {
        // Fan of 5 sword-energy slashes spread in a V in front of the fighter
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 5; i++) {
          const ang = (i - 2) * 0.28;
          const proj = new Projectile(cx, cy, Math.cos(ang) * f * 14, Math.sin(ang) * 14 - 2, fighter, 32, 'sword_slash');
          proj._convictionSlash = true;
          proj.life = 22; proj.radius = 14;
          proj.color = '#aaccff';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#aaccff', 20);
        break;
      }

      case 'hammer': {
        // Ground-pound shockwave: massive radial knockback + damage to all enemies
        screenShake = Math.max(screenShake || 0, 38);
        for (const e of _enemies) {
          const dx = e.cx() - cx, dy = e.cy() - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < 280) {
            dealDamage(fighter, e, 28, 0);
            const kb = (1 - dist / 280) * 22;
            e.vx += (dist > 1 ? dx / dist : f) * kb;
            e.vy  = Math.min(e.vy, -16);
          }
        }
        spawnParticles(cx, cy + 30, '#cc8844', 50);
        spawnParticles(cx, cy, '#ffcc88', 20);
        break;
      }

      case 'gun': {
        // 12-bullet radial burst in all directions
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const proj = new Projectile(cx, cy, Math.cos(ang) * 13, Math.sin(ang) * 13, fighter, 22, 'gun_bullet');
          proj.life = 28; proj.radius = 6; proj.color = '#ffcc44';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#ffcc44', 24);
        break;
      }

      case 'axe': {
        // 3 orbiting axes — stored on fighter, updated in DomainManager.update()
        fighter._convictionOrbitAxes = [];
        for (let i = 0; i < 3; i++) {
          fighter._convictionOrbitAxes.push({ angle: (i / 3) * Math.PI * 2, r: 60, life: 420, hitSet: new Set() });
        }
        spawnParticles(cx, cy, '#ff8800', 28);
        break;
      }

      case 'spear': {
        // Forward charge piercing all enemies in a line
        fighter._convictionSpearCharge = { frames: 20, done: false };
        fighter.vx = f * 28;
        fighter.vy = -3;
        fighter.invincible = Math.max(fighter.invincible || 0, 25);
        spawnParticles(cx, cy, '#88aaff', 22);
        break;
      }

      case 'bow': {
        // 8 tracking arrows fired toward nearest enemy
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const tgt = _enemies.reduce((best, e) => (!best || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(best.cx()-cx,best.cy()-cy)) ? e : best, null);
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const baseVx = tgt ? (tgt.cx()-cx)/Math.max(1,Math.hypot(tgt.cx()-cx,tgt.cy()-cy))*14 : Math.cos(ang)*10;
          const baseVy = tgt ? (tgt.cy()-cy)/Math.max(1,Math.hypot(tgt.cx()-cx,tgt.cy()-cy))*14 : Math.sin(ang)*10;
          const scatter = (i / 8) * Math.PI * 2;
          const proj = new Projectile(cx, cy, baseVx + Math.cos(scatter)*2, baseVy + Math.sin(scatter)*2 - 1, fighter, 20, 'bow_arrow');
          proj._isArrow = true; proj.life = 32; proj.radius = 7; proj.color = '#44ff88';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#44ff88', 18);
        break;
      }

      case 'shield': {
        // Reflective dome: nearby enemy projectiles get reversed for 3 seconds
        fighter._convictionReflectDome = 180; // frames
        fighter.invincible = Math.max(fighter.invincible || 0, 180);
        spawnParticles(cx, cy, '#ffffaa', 35);
        spawnParticles(cx, cy - 20, '#ffffff', 15);
        break;
      }

      case 'scythe': {
        // Lifesteal nova: damages all enemies, heals fighter
        let totalHealed = 0;
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 250) {
            dealDamage(fighter, e, 26, 8);
            totalHealed += 16;
          }
        }
        fighter.health = Math.min(fighter.health + totalHealed, fighter.maxHealth);
        spawnParticles(cx, cy, '#cc44cc', 40);
        spawnParticles(cx, cy, '#ffaaff', 20);
        break;
      }

      case 'fryingpan': {
        // Stun ring: enemies in range are stunned (attack cooldown jammed)
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 220) {
            dealDamage(fighter, e, 14, 6);
            e.stunTimer = Math.max(e.stunTimer || 0, 150);
            if (typeof e.attackTimer !== 'undefined') e.attackTimer = 0;
            spawnParticles(e.cx(), e.cy(), '#ffcc44', 14);
          }
        }
        screenShake = Math.max(screenShake || 0, 20);
        spawnParticles(cx, cy, '#ffdd55', 35);
        break;
      }

      case 'broomstick': {
        // Wind gust: massive knockback sends everyone flying to the edges
        for (const e of _enemies) {
          const dx = e.cx() - cx;
          e.vx  = (dx >= 0 ? 1 : -1) * 26;
          e.vy  = -10;
          dealDamage(fighter, e, 10, 0);
          spawnParticles(e.cx(), e.cy(), '#aaddff', 12);
        }
        spawnParticles(cx, cy, '#88ccff', 30);
        break;
      }

      case 'combat': {
        // Full-force counter slam: AOE punch hitting all nearby enemies
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 180) {
            dealDamage(fighter, e, 30, 20);
            e.vy = -14;
            e.vx = (e.cx() > cx ? 1 : -1) * 16;
            spawnParticles(e.cx(), e.cy(), '#ff4444', 18);
          }
        }
        fighter._counterStance = 180; // extended counter window during conviction
        spawnParticles(cx, cy, '#ff6655', 28);
        break;
      }

      case 'peashooter': {
        // 24-pea radial volley
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 24; i++) {
          const ang = (i / 24) * Math.PI * 2;
          const proj = new Projectile(cx, cy, Math.cos(ang)*11, Math.sin(ang)*11, fighter, 12, 'peashooter_pea');
          proj.life = 30; proj.radius = 8; proj.color = '#44ff44';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#44ff44', 22);
        break;
      }

      case 'slingshot': {
        // 6 large boulders fired in fan, high damage and bounce
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 6; i++) {
          const ang = -0.5 + (i / 5) * 1.0 + (f < 0 ? Math.PI : 0);
          const proj = new Projectile(cx, cy, Math.cos(ang)*12, Math.sin(ang)*12 - 4, fighter, 36, 'stone');
          proj.life = 45; proj.radius = 12; proj.color = '#aaaaaa';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#aaaaaa', 20);
        break;
      }

      case 'paperairplane': {
        // 16 converging planes all targeting nearest enemy
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          const spawnX = cx + Math.cos(ang) * 120;
          const spawnY = cy + Math.sin(ang) * 80;
          const proj = new Projectile(spawnX, spawnY, (cx-spawnX)*0.08, (cy-spawnY)*0.08, fighter, 16, 'paper');
          proj.life = 40; proj.radius = 10; proj.color = '#ffffff';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#ffffff', 26);
        break;
      }

      case 'flail': {
        // Spin mode: fighter deals contact damage while spinning for 2.5 seconds
        fighter._convictionFlailSpin = 150; // frames of spin
        fighter.invincible = Math.max(fighter.invincible || 0, 150);
        spawnParticles(cx, cy, '#cc8844', 26);
        break;
      }

      case 'whip': {
        // Chain pull: all enemies dragged toward fighter's position
        for (const e of _enemies) {
          const dx = cx - e.cx(), dy = cy - e.cy();
          const dist = Math.hypot(dx, dy);
          if (dist > 20 && dist < 500) {
            e.vx += (dx / dist) * 20;
            e.vy += (dy / dist) * 8;
            dealDamage(fighter, e, 18, 0);
            spawnParticles(e.cx(), e.cy(), '#ffaa44', 12);
          }
        }
        spawnParticles(cx, cy, '#ffcc66', 28);
        break;
      }

      case 'boomerang': {
        // 8 boomerangs in wide fan, all return
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 8; i++) {
          const ang = -0.7 + (i / 7) * 1.4 + (f < 0 ? Math.PI : 0);
          const proj = new Projectile(cx, cy, Math.cos(ang)*15, Math.sin(ang)*15 - 3, fighter, 24, 'boomerang');
          proj._isBoomerang = true; proj.oneWay = true; proj.life = 55; proj.radius = 11; proj.color = '#cc9944';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#cc9944', 22);
        break;
      }

      case 'katana': {
        // Phantom flash: instantly deal damage to ALL enemies simultaneously
        for (const e of _enemies) {
          dealDamage(fighter, e, 38, 12);
          e.vy = Math.min(e.vy, -10);
          spawnParticles(e.cx(), e.cy(), '#ccccff', 20);
          spawnParticles(e.cx(), e.cy(), '#ffffff', 10);
        }
        fighter.invincible = Math.max(fighter.invincible || 0, 20);
        screenShake = Math.max(screenShake || 0, 24);
        spawnParticles(cx, cy, '#eeeeff', 30);
        break;
      }

      case 'flamethrower': {
        // 270° fire burst — wide arc, sustained damage
        fighter._convictionFlameBurst = { frames: 60, angle: f < 0 ? Math.PI : 0 };
        spawnParticles(cx, cy, '#ff4400', 35);
        spawnParticles(cx, cy, '#ffaa00', 18);
        break;
      }

      case 'electricstaff': {
        // Chain lightning: arcs between all enemies dealing cumulative damage
        let prev = fighter;
        const chained = new Set();
        for (let chain = 0; chain < Math.min(_enemies.length, 5); chain++) {
          let nearest = null, nearDist = 9999;
          for (const e of _enemies) {
            if (chained.has(e)) continue;
            const d = Math.hypot(e.cx()-prev.cx(), e.cy()-prev.cy());
            if (d < nearDist) { nearDist = d; nearest = e; }
          }
          if (!nearest || nearDist > 350) break;
          dealDamage(fighter, nearest, 30 - chain * 4, 10);
          spawnParticles(nearest.cx(), nearest.cy(), '#4488ff', 16);
          spawnParticles((prev.cx()+nearest.cx())/2, (prev.cy()+nearest.cy())/2, '#88ccff', 10);
          chained.add(nearest);
          prev = nearest;
        }
        spawnParticles(cx, cy, '#4466ff', 30);
        break;
      }

      default:
        // No weapon or unknown weapon: generic nova
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 200) {
            dealDamage(fighter, e, 20, 14);
            e.vy = Math.min(e.vy, -12);
          }
        }
        break;
    }

    // Start domain-duration weapon passive (fires on cooldown for the full 25 s)
    if (wep && _PASSIVE_CDS[wep]) {
      fighter._convictionPassive = { key: wep, timer: DOMAIN_FRAMES, cd: _PASSIVE_CDS[wep] };
    }
  }

  // ── Weapon passive that fires on cooldown throughout active domain ──────
  function _fireWeaponPassive(fighter) {
    if (!fighter || fighter.health <= 0 || !fighter._convictionPassive) return;
    const wep = fighter._convictionPassive.key;
    const cx  = fighter.cx(), cy = fighter.cy();
    const f   = fighter.facing || 1;
    const _all = [...(typeof players !== 'undefined' ? players : []),
                  ...(typeof minions !== 'undefined' ? minions : [])];
    const _enemies = _all.filter(e => e && e !== fighter && e.health > 0 && !e.godMode
                                    && (typeof areAlliedEntities === 'function' ? !areAlliedEntities(fighter, e) : true));

    switch (wep) {
      case 'shuriken': {
        // Ninja domain passive: a spinning shuriken hurled at the nearest enemy
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const _sTgt = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        if (!_sTgt) break;
        const _sdx = _sTgt.cx()-cx, _sdy = _sTgt.cy()-cy, _sd = Math.hypot(_sdx, _sdy) || 1;
        const proj = new Projectile(cx, cy, (_sdx/_sd)*13, (_sdy/_sd)*13 - 0.6, fighter, 12, '#ccccee');
        proj._isShuriken = true; proj.life = 42; proj.radius = 8;
        projectiles.push(proj);
        spawnParticles(cx, cy, '#bb44ff', 6);
        break;
      }
      case 'sword': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 2; i++) {
          const ang = (i - 0.5) * 0.28;
          const proj = new Projectile(cx, cy, Math.cos(ang) * f * 12, Math.sin(ang) * 12 - 1, fighter, 18, 'sword_slash');
          proj._convictionSlash = true; proj.life = 24; proj.radius = 12; proj.color = '#aaccff';
          projectiles.push(proj);
        }
        spawnParticles(cx, cy, '#aaccff', 8);
        break;
      }
      case 'hammer': {
        screenShake = Math.max(screenShake || 0, 14);
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 190) {
            dealDamage(fighter, e, 16, 0);
            const dist = Math.hypot(e.cx()-cx, e.cy()-cy);
            e.vx += ((e.cx()-cx) / Math.max(1, dist)) * 12;
            e.vy  = Math.min(e.vy, -10);
            spawnParticles(e.cx(), e.cy(), '#cc8844', 8);
          }
        }
        spawnParticles(cx, cy + 28, '#cc8844', 14);
        break;
      }
      case 'gun': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const tgt = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        if (!tgt) break;
        const dx = tgt.cx()-cx, dy = tgt.cy()-cy, dist = Math.hypot(dx, dy);
        const proj = new Projectile(cx, cy, (dx/dist)*15, (dy/dist)*15, fighter, 14, 'gun_bullet');
        proj.life = 30; proj.radius = 5; proj.color = '#ffcc44';
        projectiles.push(proj);
        break;
      }
      case 'axe': {
        if (!fighter._convictionOrbitAxes || fighter._convictionOrbitAxes.length === 0) {
          fighter._convictionOrbitAxes = [];
          for (let i = 0; i < 3; i++) {
            fighter._convictionOrbitAxes.push({ angle: (i/3)*Math.PI*2, r: 60, life: 400, hitSet: new Set() });
          }
          spawnParticles(cx, cy, '#ff8800', 18);
        }
        break;
      }
      case 'spear': {
        fighter.vx = f * 18;
        fighter.vy = Math.min(fighter.vy, -2);
        fighter.invincible = Math.max(fighter.invincible || 0, 12);
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 80) {
            dealDamage(fighter, e, 14, 14);
            spawnParticles(e.cx(), e.cy(), '#88aaff', 10);
          }
        }
        spawnParticles(cx, cy, '#88aaff', 12);
        break;
      }
      case 'bow': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const tgt2 = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        const targetX = tgt2 ? tgt2.cx() : cx;
        for (let i = 0; i < 3; i++) {
          const spawnX = targetX + (i - 1) * 40;
          const proj2 = new Projectile(spawnX, -20, (i-1)*0.4, 14, fighter, 16, 'bow_arrow');
          proj2._isArrow = true; proj2.life = 55; proj2.radius = 7; proj2.color = '#44ff88';
          projectiles.push(proj2);
        }
        spawnParticles(cx, cy - 20, '#44ff88', 10);
        break;
      }
      case 'shield': {
        fighter.invincible = Math.max(fighter.invincible || 0, 30);
        fighter._convictionReflectDome = Math.max(fighter._convictionReflectDome || 0, 30);
        spawnParticles(cx, cy, '#ffffaa', 12);
        break;
      }
      case 'scythe': {
        let healed = 0;
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 190) {
            dealDamage(fighter, e, 12, 5);
            healed += 8;
            spawnParticles(e.cx(), e.cy(), '#cc44cc', 6);
          }
        }
        if (healed > 0) {
          fighter.health = Math.min(fighter.health + healed, fighter.maxHealth);
          spawnParticles(cx, cy, '#ffaaff', 14);
        }
        break;
      }
      case 'fryingpan': {
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 170) {
            e.stunTimer = Math.max(e.stunTimer || 0, 70);
            if (typeof e.attackTimer !== 'undefined') e.attackTimer = 0;
            dealDamage(fighter, e, 8, 3);
            spawnParticles(e.cx(), e.cy(), '#ffcc44', 8);
          }
        }
        spawnParticles(cx, cy, '#ffdd55', 14);
        break;
      }
      case 'broomstick': {
        for (const e of _enemies) {
          const dx = e.cx() - cx;
          e.vx += (dx >= 0 ? 1 : -1) * 20;
          e.vy -= 6;
          dealDamage(fighter, e, 8, 0);
          spawnParticles(e.cx(), e.cy(), '#aaddff', 8);
        }
        spawnParticles(cx, cy, '#88ccff', 16);
        break;
      }
      case 'combat': {
        fighter._counterStance = Math.max(fighter._counterStance || 0, 90);
        for (const e of _enemies) {
          if (Math.hypot(e.cx()-cx, e.cy()-cy) < 120) {
            dealDamage(fighter, e, 20, 16);
            e.vy = Math.min(e.vy, -12);
            e.vx = (e.cx() > cx ? 1 : -1) * 14;
            spawnParticles(e.cx(), e.cy(), '#ff4444', 10);
          }
        }
        spawnParticles(cx, cy, '#ff6655', 14);
        break;
      }
      case 'peashooter': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const tgt3 = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        if (!tgt3) break;
        const dx3 = tgt3.cx()-cx, dy3 = tgt3.cy()-cy, d3 = Math.hypot(dx3, dy3);
        const proj3 = new Projectile(cx, cy, (dx3/d3)*12, (dy3/d3)*12, fighter, 8, 'peashooter_pea');
        proj3.life = 32; proj3.radius = 7; proj3.color = '#44ff44';
        projectiles.push(proj3);
        break;
      }
      case 'slingshot': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const tgt4 = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        const tx = tgt4 ? tgt4.cx() : cx;
        for (let i = 0; i < 2; i++) {
          const dropX = tx + (i === 0 ? -30 : 30);
          const proj4 = new Projectile(dropX, -10, 0, 12, fighter, 28, 'stone');
          proj4.life = 60; proj4.radius = 10; proj4.color = '#aaaaaa';
          projectiles.push(proj4);
        }
        spawnParticles(cx, cy - 20, '#aaaaaa', 10);
        break;
      }
      case 'paperairplane': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        const tgt5 = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        const tCx = tgt5 ? tgt5.cx() : cx + f*100;
        const tCy = tgt5 ? tgt5.cy() : cy;
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * Math.PI * 2;
          const spawnX = cx + Math.cos(ang) * 90;
          const spawnY = cy + Math.sin(ang) * 60;
          const proj5 = new Projectile(spawnX, spawnY, (tCx-spawnX)*0.09, (tCy-spawnY)*0.09, fighter, 12, 'paper');
          proj5.life = 40; proj5.radius = 9; proj5.color = '#ffffff';
          projectiles.push(proj5);
        }
        spawnParticles(cx, cy, '#ffffff', 10);
        break;
      }
      case 'flail': {
        if (!fighter._convictionFlailSpin || fighter._convictionFlailSpin <= 0) {
          fighter._convictionFlailSpin = 60;
          fighter.invincible = Math.max(fighter.invincible || 0, 60);
          spawnParticles(cx, cy, '#cc8844', 16);
        }
        break;
      }
      case 'whip': {
        for (const e of _enemies) {
          const dx = cx - e.cx(), dy = cy - e.cy();
          const dist = Math.hypot(dx, dy);
          if (dist > 20 && dist < 460) {
            e.vx += (dx / dist) * 18;
            e.vy += (dy / dist) * 7;
            dealDamage(fighter, e, 10, 0);
            spawnParticles(e.cx(), e.cy(), '#ffaa44', 8);
          }
        }
        spawnParticles(cx, cy, '#ffcc66', 14);
        break;
      }
      case 'boomerang': {
        if (typeof Projectile === 'undefined' || typeof projectiles === 'undefined') break;
        for (let i = 0; i < 2; i++) {
          const ang = -0.35 + i * 0.7 + (f < 0 ? Math.PI : 0);
          const proj6 = new Projectile(cx, cy, Math.cos(ang)*13, Math.sin(ang)*13 - 2, fighter, 20, 'boomerang');
          proj6._isBoomerang = true; proj6.oneWay = true; proj6.life = 50; proj6.radius = 10; proj6.color = '#cc9944';
          projectiles.push(proj6);
        }
        spawnParticles(cx, cy, '#cc9944', 10);
        break;
      }
      case 'katana': {
        const tgt6 = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        if (!tgt6) break;
        dealDamage(fighter, tgt6, 16, 8);
        tgt6.vy = Math.min(tgt6.vy, -8);
        spawnParticles(tgt6.cx(), tgt6.cy(), '#ccccff', 14);
        spawnParticles(tgt6.cx(), tgt6.cy(), '#ffffff', 8);
        break;
      }
      case 'flamethrower': {
        if (!fighter._convictionFlameBurst || fighter._convictionFlameBurst.frames <= 0) {
          fighter._convictionFlameBurst = { frames: 40, angle: f < 0 ? Math.PI : 0 };
          spawnParticles(cx, cy, '#ff4400', 16);
        }
        break;
      }
      case 'electricstaff': {
        const tgt7 = _enemies.reduce((b, e) => (!b || Math.hypot(e.cx()-cx,e.cy()-cy) < Math.hypot(b.cx()-cx,b.cy()-cy)) ? e : b, null);
        if (!tgt7 || Math.hypot(tgt7.cx()-cx, tgt7.cy()-cy) > 380) break;
        dealDamage(fighter, tgt7, 22, 8);
        spawnParticles(tgt7.cx(), tgt7.cy(), '#4488ff', 12);
        spawnParticles((cx+tgt7.cx())/2, (cy+tgt7.cy())/2, '#88ccff', 8);
        break;
      }
    }
  }

  function _removeDomainFor(fighter) {
    const idx = _domains.findIndex(d => d.owner === fighter);
    if (idx === -1) return;
    if (_domains[idx].defKey === 'ronin')  _clearRoninCuts(fighter);
    if (_domains[idx].defKey === 'reaper') _clearSoulTithe(fighter);
    _clearOwnerBuffs(fighter);
    _domains.splice(idx, 1);
  }

  function _endRisingFor(fighter) {
    const idx = _rising.findIndex(r => r.fighter === fighter);
    if (idx !== -1) _rising.splice(idx, 1);
    if (!fighter) return;
    fighter._domainRising = false;
    // Clean up any in-progress domain entry cinematic for this fighter
    if (_domainCinOwner === fighter) {
      if (typeof CinCam !== 'undefined') CinCam.restore();
      if (typeof CinFX  !== 'undefined') CinFX.motionTrailOff(fighter);
      _domainCinActive = false;
      _domainCinOwner  = null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────

  function triggerExpansion(fighter) {
    if (!fighter || fighter.health <= 0) return;
    const _key = _domainKeyOf(fighter);
    if (!_key || _key === 'none') return;
    if (!DOMAIN_DEFS[_key]) return;
    if (_rising.some(r => r.fighter === fighter)) return;
    if (_domains.some(d => d.owner === fighter)) return;

    fighter._domainRising    = true;
    fighter._domainRiseTimer = RISE_FRAMES;
    fighter.invincible = Math.max(fighter.invincible || 0, RISE_FRAMES + 30);
    fighter.vy = -5;  // initial upward impulse

    _rising.push({ fighter, timer: RISE_FRAMES, animData: {} });
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
  }

  function onFighterDied(fighter) {
    if (!fighter) return;
    _endRisingFor(fighter);
    _removeDomainFor(fighter);
    fighter._domainSuperCount = 0;
    fighter._domainRising = false;
    // Death clears any deferred cuts on this fighter — marks never survive a respawn
    fighter._roninCuts = 0;
    fighter._roninCutOwner = null;
  }

  function anyActive() {
    return _domains.length > 0 || _rising.length > 0;
  }

  // True while this fighter's own domain is expanding or live. Supers spent in
  // that window do not advance the counter toward the next domain — a domain
  // that charges its own successor compounds instead of costing anything.
  function ownsDomain(fighter) {
    if (!fighter) return false;
    return _domains.some(d => d.owner === fighter) || _rising.some(r => r.fighter === fighter);
  }

  // ── Ronin Deferred Cuts (Death's Dojo) ─────────────────────────────
  // While owner._roninCutsActive is set, dealDamage (smb-combat.js) stores a cut
  // mark on each target the owner hits (target._roninCuts / _roninCutOwner).
  // Every sheatheEvery frames the blade "sheathes" and all marks detonate at once.
  let _iaiFx = []; // detonation slash fans: {x, y, cuts, life, maxLife, angles[]}

  function _roninCutPool() {
    return []
      .concat(typeof players !== 'undefined' ? players : [])
      .concat(typeof minions !== 'undefined' ? minions : [])
      .concat(typeof trainingDummies !== 'undefined' ? trainingDummies : []);
  }

  function _clearRoninCuts(owner) {
    for (const e of _roninCutPool()) {
      if (e && e._roninCutOwner === owner) { e._roninCuts = 0; e._roninCutOwner = null; }
    }
  }

  function _detonateRoninCuts(domain) {
    const owner = domain.owner;
    if (!owner || owner.health <= 0) { _clearRoninCuts(owner); return; }
    const def = domain.def;
    let hitAny = false;
    // Guard: detonation damage re-enters dealDamage — must not re-apply marks
    owner._roninDetonating = true;
    for (const e of _roninCutPool()) {
      if (!e || e._roninCutOwner !== owner || !(e._roninCuts > 0)) continue;
      const cuts = Math.min(e._roninCuts, def.maxCuts || 5);
      e._roninCuts = 0; e._roninCutOwner = null;
      if (e.health <= 0) continue;
      _dealDomainDamage(owner, e, (def.cutDamage || 9) * cuts, 5 + cuts * 2);
      const angles = [];
      for (let i = 0; i < cuts; i++) {
        angles.push(-Math.PI * 0.35 + (i / Math.max(1, cuts - 1)) * Math.PI * 0.7
                    + (Math.random() - 0.5) * 0.2);
      }
      _iaiFx.push({ x: e.cx(), y: e.cy(), cuts, life: 26, maxLife: 26, angles });
      if (typeof spawnParticles === 'function') {
        spawnParticles(e.cx(), e.cy(), '#ffffff', 8 + cuts * 3);
        spawnParticles(e.cx(), e.cy(), '#ccccff', 6);
      }
      hitAny = true;
    }
    owner._roninDetonating = false;
    if (hitAny) {
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
      if (typeof CinFX !== 'undefined' && CinFX.flash) CinFX.flash('#ffffff', 0.30, 4);
      if (typeof SoundManager !== 'undefined' && SoundManager.iaiSheathe) SoundManager.iaiSheathe();
    }
  }

  // ── Reaper Soul Tithe (Eternal Harvest) ─────────────────────────────
  // While owner._soulTitheActive is set, dealDamage (smb-combat.js) queues a soul
  // rip at each enemy the owner damages. The wisp flies to the Reaper and joins
  // the orbit; every harvestEvery frames the Reaping launches every orbiting soul
  // as a homing skull. Skulls and wisps live at module level (like _iaiFx) so the
  // final Reaping can still land after the domain itself has closed.
  let _soulWisps  = []; // rip wisps flying to the owner: {x, y, owner, life}
  let _soulSkulls = []; // launched harvest skulls: {x, y, vx, vy, target, owner, damage, life}
  let _harvestFx  = []; // reap release rings: {x, y, life, maxLife}

  function _clearSoulTithe(owner) {
    if (!owner) return;
    delete owner._soulTitheActive;
    delete owner._pendingSoulRips;
    delete owner._soulTitheCount;
    _soulWisps = _soulWisps.filter(w => w.owner !== owner);
  }

  function _detonateHarvest(domain) {
    const owner = domain.owner;
    const souls = domain.harvestSouls;
    if (!owner || owner.health <= 0 || !souls || !souls.length) return;
    const targets = _getDomainTargets(owner);
    if (!targets.length) return; // nothing to reap — souls keep orbiting
    const def = domain.def;
    for (let i = 0; i < souls.length; i++) {
      const s   = souls[i];
      const tgt = targets[i % targets.length];
      const sx  = owner.cx() + Math.cos(s.angle) * s.orbitR;
      const sy  = owner.cy() - 26 + Math.sin(s.angle) * s.orbitR * 0.6;
      // Launch outward with scatter, then home in — reads as a burst, not a beam
      const a = Math.atan2(tgt.cy() - sy, tgt.cx() - sx) + (Math.random() - 0.5) * 1.1;
      _soulSkulls.push({
        x: sx, y: sy, vx: Math.cos(a) * 3.5, vy: Math.sin(a) * 3.5,
        target: tgt, owner, damage: def.soulDamage || 11, life: 140,
      });
    }
    domain.harvestSouls = [];
    owner._soulTitheCount = 0;
    _harvestFx.push({ x: owner.cx(), y: owner.cy() - 20, life: 30, maxLife: 30 });
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
    if (typeof CinFX !== 'undefined' && CinFX.flash) CinFX.flash('#cc44cc', 0.18, 4);
    if (typeof SoundManager !== 'undefined' && SoundManager.soulHarvest) SoundManager.soulHarvest();
  }

  // Domain hazards manage hit cadence via hitSet/setTimeout — bypass normal iframes
  // so that being in combat doesn't permanently shield players from the domain.
  //
  // Anti-burst floor: because the normal iframe window is zeroed below, a dense
  // hazard set (a bullet wall, the three holy beams, orbiting void rocks with the
  // vortex pulling you through them) could land several full hits on the same
  // frame — which is what made domains read as unsurvivable rather than hard.
  // A target now takes domain-hazard damage at most once every _DOMAIN_HIT_CD
  // frames; regular attacks from the owner are unaffected.
  function _dealDomainDamage(owner, target, dmg, kbForce) {
    if (!target || target.health <= 0 || !owner || owner.health <= 0) return;
    // Respect the finisher lock (invincible=9999): domain hazards must never
    // damage/kill a target mid-finisher cinematic.
    if (target.invincible > 1000) return;
    if ((target._domainHitCd || 0) > 0) return;
    target._domainHitCd = _DOMAIN_HIT_CD;
    const scaledDmg = (target.isBoss || target.isTrueForm)
      ? Math.max(1, Math.round(dmg * 0.35))
      : dmg;
    const savedInv = target.invincible;
    target.invincible = 0;
    dealDamage(owner, target, scaledDmg, kbForce);
    // Preserve longer iframes from boss hits / special attacks
    target.invincible = Math.max(target.invincible, savedInv);
  }

  function _getDomainTargets(owner) {
    if (!owner || owner.health <= 0) return [];
    const all = []
      .concat(typeof players !== 'undefined' ? players : [])
      .concat(typeof minions !== 'undefined' ? minions : [])
      .concat(typeof trainingDummies !== 'undefined' ? trainingDummies : []);
    const targets = [];
    for (const ent of all) {
      if (!ent || ent === owner || ent.health <= 0 || ent._brOnPlane) continue;
      if (_isDomainAlly(owner, ent)) continue;
      targets.push(ent);
    }
    return targets;
  }

  function _isDomainAlly(owner, ent) {
    if (typeof areAlliedEntities === 'function' && areAlliedEntities(owner, ent)) return true;
    const ownerIsPlayerSide = !owner.isBoss && !owner._brBot && !owner.isMinion;
    const entIsPlayerSide   = !ent.isBoss   && !ent._brBot   && !ent.isMinion;
    if (!ownerIsPlayerSide || !entIsPlayerSide) return false;

    // Co-op modes share the same side even when older setup code did not stamp _teamId.
    if (typeof gameMode !== 'undefined' && (
        gameMode === 'boss' || gameMode === 'god' ||
        (gameMode === 'minigames' && (minigameType === 'survival' || minigameType === 'defense'))
      )) {
      return true;
    }
    return false;
  }

  // ── Update (called once per game frame before player.update()) ─────

  function update() {
    if (!gameRunning) return;

    // ── Rising fighters ───────────────────────────────────────────
    for (let i = _rising.length - 1; i >= 0; i--) {
      const r = _rising[i];
      r.timer--;
      r.fighter._domainRiseTimer = r.timer;

      // Zero horizontal drift; gravity is skipped via _domainRising flag in fighter.js
      r.fighter.vx = 0;
      if (r.timer > RISE_FRAMES - 60) {
        // Rising phase (first second): keep upward velocity
        r.fighter.vy = Math.min(r.fighter.vy, -2);
      } else {
        // Hover phase: lock vertical
        r.fighter.vy = 0;
        r.fighter.y  = Math.max(40, r.fighter.y);
      }

      // Fire cinematic events tied to the rising phase countdown
      _tickDomainEntry(r);

      // Early activation: Thor activates at the hammer slam (t=215), Ninja once the
      // launcher strikes land (t=168) — not at the end of rising
      if ((r.animData.slamActivate || r.animData.earlyActivate) && !r.animData.domainActivated) {
        r.animData.domainActivated = true;
        _activateDomain(r.fighter, true); // nameCard already shown during entry
      }

      if (r.timer <= 0) {
        _endRisingFor(r.fighter);
        if (!r.animData.domainActivated) _activateDomain(r.fighter);
      }
    }

    // ── Ninja time dilation: reset then re-apply so it self-clears when domains end ──
    const _slowPool = []
      .concat(typeof players !== 'undefined' ? players : [])
      .concat(typeof minions !== 'undefined' ? minions : [])
      .concat(typeof trainingDummies !== 'undefined' ? trainingDummies : []);
    for (const e of _slowPool) {
      if (!e) continue;
      if (e._domainSlowFactor !== undefined && e._domainSlowFactor !== 1) e._domainSlowFactor = 1;
      // Tick down the per-target domain hazard damage cooldown
      if (e._domainHitCd > 0) e._domainHitCd--;
    }
    const _slowSources = [];
    for (const dm of _domains) {
      if (dm.defKey === 'ninja' && dm.owner && dm.owner.health > 0) _slowSources.push(dm.owner);
    }
    for (const r of _rising) {
      // Slow starts at the first launcher strike of the entry, before the domain exists
      if (r.fighter.charClass === 'ninja' && r.animData && r.animData.slowStarted &&
          r.fighter.health > 0) _slowSources.push(r.fighter);
    }
    for (const src of _slowSources) {
      const _sf = DOMAIN_DEFS.ninja.slowFactor || 0.5;
      for (const tgt of _getDomainTargets(src)) {
        // Bosses/TrueForm resist part of the dilation so boss fights aren't trivialized
        const _f = (tgt.isBoss || tgt.isTrueForm) ? Math.min(1, _sf + 0.25) : _sf;
        tgt._domainSlowFactor = Math.min(tgt._domainSlowFactor || 1, _f);
      }
    }

    // ── Active domains ────────────────────────────────────────────
    for (let i = _domains.length - 1; i >= 0; i--) {
      const domain = _domains[i];
      const { owner, def } = domain;
      if (!owner || owner.health <= 0) {
        if (domain.defKey === 'ronin')  _clearRoninCuts(owner);
        if (domain.defKey === 'reaper') _clearSoulTithe(owner);
        _clearOwnerBuffs(owner);
        _domains.splice(i, 1);
        continue;
      }
      domain.timer--;

      // Owner buffs: refresh _speedBuff / _powerBuff so they stay active
      if (owner && owner.health > 0) {
        if (def.ownerBuff.speed) owner._speedBuff = Math.max(owner._speedBuff || 0, 10);
        if (def.ownerBuff.power) owner._powerBuff = Math.max(owner._powerBuff || 0, 10);
        if (def.ownerBuff.healPerFrame) {
          owner.health = Math.min(owner.maxHealth, owner.health + def.ownerBuff.healPerFrame);
        }
      }

      // Ronin: sheathe countdown — the click detonates every deferred cut at once
      if (domain.defKey === 'ronin' && domain.sheatheTimer !== undefined) {
        domain.sheatheTimer--;
        if (domain.sheatheTimer <= 0) {
          _detonateRoninCuts(domain);
          domain.sheatheTimer = def.sheatheEvery || 240;
        }
      }

      // Reaper: consume queued soul rips, orbit the harvest, count down the Reaping
      if (domain.defKey === 'reaper' && domain.harvestSouls) {
        if (owner._pendingSoulRips && owner._pendingSoulRips.length) {
          for (const rip of owner._pendingSoulRips) {
            _soulWisps.push({ x: rip.x, y: rip.y, owner, life: 240 });
          }
          owner._pendingSoulRips.length = 0;
        }
        for (const s of domain.harvestSouls) s.angle += 0.045;
        if (domain.harvestSouls.length) {
          owner.health = Math.min(owner.maxHealth,
            owner.health + (def.healPerSoul || 0.006) * domain.harvestSouls.length);
        }
        domain.harvestTimer--;
        if (domain.harvestTimer <= 0) {
          _detonateHarvest(domain);
          domain.harvestTimer = def.harvestEvery || 300;
        }
      }

      // Void rocks: advance orbit angle — inner rock faster, outer slower
      if (def.hazardType === 'void_rock') {
        for (const h of domain.hazards) {
          if (h.type === 'void_rock') {
            // Smaller orbit = higher angular speed (keeps linear speed high for all)
            h.angle += 0.032 * (200 / (h.orbitR || 200));
          }
        }
      }

      // Spawn hazards
      if (def.spawnEvery > 0) {
        domain.spawnCooldown--;
        if (domain.spawnCooldown <= 0) {
          _spawnHazard(domain);
          domain.spawnCooldown = def.spawnEvery;
        }
      }

      // Identify valid targets across all active entity buckets. This keeps
      // Domains useful in boss/minion/training modes without hitting teammates.
      const targets = _getDomainTargets(owner);

      // Left edge of this domain's region — bounds and respawn positions below are
      // authored in 0..GAME_W and must be offset into world space (see _dAnchorOrigin).
      const OX = _dOX(domain);

      // Update individual hazards
      for (let j = domain.hazards.length - 1; j >= 0; j--) {
        const h = domain.hazards[j];
        let remove = false;

        switch (h.type) {
          case 'lightning': {
            if (h.warningTimer > 0) {
              h.warningTimer--;
            } else if (!h.struck) {
              h.struck = true;
              h.strikeTimer = 22;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.abs(t.cx() - h.x) < h.radius + t.w / 2) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, h.damage, 8);
                  if (typeof spawnParticles === 'function')
                    spawnParticles(h.x, t.cy(), '#aaddff', 14);
                }
              }
            } else {
              if (--h.strikeTimer <= 0) remove = true;
            }
            break;
          }

          case 'debris':
          case 'shadow_blade':
          case 'bullet':
          case 'arrow': {
            h.x += h.vx * (typeof slowMotion !== 'undefined' ? slowMotion : 1);
            h.y += h.vy * (typeof slowMotion !== 'undefined' ? slowMotion : 1);
            // Slight gravity on physical projectiles
            if (h.type === 'shadow_blade' || h.type === 'arrow') h.vy += 0.18;
            if (h.type === 'shadow_blade') h.angle += 0.12;
            // Out-of-bounds cleanup
            if (h.x < OX - 80 || h.x > OX + GAME_W + 80 || h.y > GAME_H + 80) {
              remove = true; break;
            }
            // Collision
            for (const t of targets) {
              if (h.hitSet.has(t)) continue;
              const dx = h.x - t.cx(), dy = h.y - t.cy();
              if (Math.hypot(dx, dy) < h.radius + t.w / 2) {
                h.hitSet.add(t);
                _dealDomainDamage(owner, t, h.damage, 6);
                if (typeof spawnParticles === 'function')
                  spawnParticles(h.x, h.y, def.color, 8);
                if (h.type === 'debris' || h.type === 'arrow') remove = true;
              }
            }
            break;
          }

          case 'holy_beam': {
            if (h.warningTimer > 0) {
              h.warningTimer--;
            } else if (h.activeTimer <= 0) {
              h.activeTimer = 42;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.abs(t.cx() - h.x) < h.radius + t.w / 2) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, h.damage, 6);
                  if (typeof spawnParticles === 'function')
                    spawnParticles(h.x, t.cy(), '#ffffaa', 16);
                }
              }
            } else {
              if (--h.activeTimer <= 0) remove = true;
            }
            break;
          }

          // Warrior: telegraphed ground sword. Warns, erupts once, retracts.
          case 'blade_wall': {
            if (h.warningTimer > 0) {
              h.warningTimer--;
              if (h.warningTimer === 0) {
                if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
                if (typeof spawnParticles === 'function')
                  spawnParticles(h.x, GAME_H - 70, '#e0b070', 12);
              }
            } else if (!h.risen) {
              h.risen = true;
              h.riseTimer = 30;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.abs(t.cx() - h.x) < h.radius + t.w / 2
                    && t.cy() > GAME_H - h.height - 120) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, h.damage, 11);
                  if (typeof spawnParticles === 'function')
                    spawnParticles(h.x, t.cy(), '#ffe0a0', 12);
                }
              }
            } else if (--h.riseTimer <= 0) {
              remove = true;
            }
            break;
          }

          // Warrior: the duel ring closes over the domain's life; standing outside
          // it costs you a small, regular tick. Walking back in stops it entirely.
          case 'duel_ring': {
            const _rs = def.ringStart || 300, _re = def.ringEnd || 170;
            const _prog = 1 - Math.max(0, domain.timer) / DOMAIN_FRAMES;
            h.radius = _rs + (_re - _rs) * _prog;
            if (--h.tickTimer <= 0) {
              h.tickTimer = def.ringEvery || 40;
              for (const t of targets) {
                const dx = t.cx() - h.x, dy = (t.cy() - h.y) * 0.75;
                if (Math.hypot(dx, dy) > h.radius) {
                  _dealDomainDamage(owner, t, h.damage, 0);
                  if (typeof spawnParticles === 'function')
                    spawnParticles(t.cx(), t.cy(), '#e0b070', 6);
                }
              }
            }
            break;
          }

          // Sovereign: the corridor walls track him and close. Damage is gated by
          // the shared _DOMAIN_HIT_CD, and the shove is always inward so the walls
          // can never push a target off the stage.
          case 'null_wall': {
            const _ws = def.wallStart || 400, _we = def.wallEnd || 155;
            const _prog = 1 - Math.max(0, domain.timer) / DOMAIN_FRAMES;
            const half  = _ws + (_we - _ws) * _prog;
            const _lo = OX + half + 24, _hi = OX + GAME_W - half - 24;
            let centre = owner.cx();
            if (_lo <= _hi) centre = Math.max(_lo, Math.min(_hi, centre));
            else            centre = OX + GAME_W / 2;
            h.centre = h.centre === undefined ? centre : h.centre + (centre - h.centre) * 0.05;
            h.x = h.centre + h.side * half;
            for (const t of targets) {
              const past = h.side < 0 ? (t.cx() < h.x) : (t.cx() > h.x);
              if (!past) continue;
              _dealDomainDamage(owner, t, h.damage, 0);
              t.vx = -h.side * 9;
              if (typeof spawnParticles === 'function')
                spawnParticles(h.x, t.cy(), '#ff3311', 6);
            }
            break;
          }

          // Summoner: familiars home in slowly and expire on contact.
          case 'spirit_swarm': {
            const _sm = (typeof slowMotion !== 'undefined' ? slowMotion : 1);
            let near = null, nd = Infinity;
            for (const t of targets) {
              const d = Math.hypot(t.cx() - h.x, t.cy() - h.y);
              if (d < nd) { nd = d; near = t; }
            }
            if (near) {
              const ang = Math.atan2(near.cy() - h.y, near.cx() - h.x);
              h.vx += Math.cos(ang) * 0.22;
              h.vy += Math.sin(ang) * 0.22;
            }
            // Cap speed so they can always be outrun / baited into a wall
            const sp = Math.hypot(h.vx, h.vy), MAXSP = 4.6;
            if (sp > MAXSP) { h.vx = h.vx / sp * MAXSP; h.vy = h.vy / sp * MAXSP; }
            h.wobble += 0.18;
            h.x += (h.vx + Math.cos(h.wobble) * 0.6) * _sm;
            h.y += (h.vy + Math.sin(h.wobble) * 0.6) * _sm;
            if (--h.life <= 0) { remove = true; break; }
            for (const t of targets) {
              if (Math.hypot(h.x - t.cx(), h.y - t.cy()) < h.radius + t.w / 2) {
                _dealDomainDamage(owner, t, h.damage, 7);
                if (typeof spawnParticles === 'function')
                  spawnParticles(h.x, h.y, '#66ffcc', 12);
                remove = true;
                break;
              }
            }
            break;
          }

          // Summoner: the sigil is pure telegraph — it brightens as the next wave nears.
          case 'summon_circle': {
            h.angle += 0.014;
            h.pulse = Math.max(0, (h.pulse || 0) - 1);
            if (domain.spawnCooldown <= 6 && h.pulse === 0) {
              h.pulse = 20;
              if (typeof spawnParticles === 'function')
                spawnParticles(h.x, h.y, '#66ffcc', 10);
            }
            break;
          }

          case 'void_rock': {
            for (const t of targets) {
              if (h.hitSet.has(t)) continue;
              const dx = h.x - t.cx(), dy = h.y - t.cy();
              if (Math.hypot(dx, dy) < h.radius + t.w / 2) {
                h.hitSet.add(t);
                _dealDomainDamage(owner, t, h.damage, 12);
                if (typeof spawnParticles === 'function') {
                  spawnParticles(h.x, h.y, '#9944ff', 14);
                  spawnParticles(h.x, h.y, '#220044', 8);
                }
                if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
                setTimeout(() => h.hitSet.delete(t), 1200);
              }
            }
            break;
          }

          case 'shadow_clone': {
            if (h.state === 'patrol') {
              const dx = h.patrolTarget - h.x;
              h.vx = Math.sign(dx) * 5.0;
              h.x += h.vx;
              if (Math.abs(dx) < 8) {
                h.patrolTarget = h.patrolTarget < OX + GAME_W / 2
                  ? OX + 60  + Math.random() * (GAME_W * 0.55)
                  : OX + GAME_W * 0.1 + Math.random() * (GAME_W * 0.4);
              }
              // Lunge from 240 px — very hard to maintain safe distance
              const nearest = targets.reduce((best, t) => {
                const d = Math.hypot(t.cx() - h.x, t.cy() - h.y);
                return (!best || d < best.d) ? { t, d } : best;
              }, null);
              if (nearest && nearest.d < 240) {
                h.state = 'lunge';
                // Aim directly at target
                const tdx = nearest.t.cx() - h.x, tdy = nearest.t.cy() - h.y;
                const tlen = Math.hypot(tdx, tdy) || 1;
                h.vx = (tdx / tlen) * 18;
                h.vy = (tdy / tlen) * 18 - 4;
              }
            } else if (h.state === 'lunge') {
              h.x += h.vx;
              h.y += h.vy;
              h.vy += 0.5;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(h.x - t.cx(), h.y - t.cy()) < h.radius + t.w / 2) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, h.damage, 10);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(h.x, h.y, '#bb44ff', 14);
                    spawnParticles(h.x, h.y, '#220033', 8);
                  }
                  setTimeout(() => h.hitSet.delete(t), 1000);
                }
              }
              if (h.x < OX - 20 || h.x > OX + GAME_W + 20 || h.y > GAME_H + 60) {
                h.x = OX + GAME_W / 2 + (Math.random() - 0.5) * 180;
                h.y = GAME_H * 0.48;
                h.vx = 0; h.vy = 0;
                h.state = 'recover';
                h.recoverTimer = 70;
              }
            } else { // 'recover'
              h.recoverTimer--;
              if (h.recoverTimer <= 0) h.state = 'patrol';
            }
            break;
          }

          case 'turret': {
            h.fireTimer--;
            if (h.fireTimer <= 0) {
              h.fireTimer = h.fireEvery;
              const tgt = targets.reduce((best, t) => {
                const d = Math.hypot(t.cx() - h.x, t.cy() - h.y);
                return (!best || d < best.d) ? { t, d } : best;
              }, null);
              // 4-bullet burst — tighter spread, faster projectiles
              for (let b = 0; b < 4; b++) {
                const spread = (b - 1.5) * 0.09;
                let bvx, bvy;
                if (tgt) {
                  const dx = tgt.t.cx() - h.x, dy = tgt.t.cy() - h.y;
                  const len = Math.hypot(dx, dy) || 1;
                  const spd = 20;
                  const ang = Math.atan2(dy, dx) + spread;
                  bvx = Math.cos(ang) * spd;
                  bvy = Math.sin(ang) * spd;
                } else {
                  bvx = h.facing * 20;
                  bvy = (b - 1.5) * 2;
                }
                domain.hazards.push({
                  type: 'bullet', x: h.x + h.facing * 18, y: h.y,
                  vx: bvx, vy: bvy, damage: h.damage, radius: 7, hitSet: new Set(),
                });
              }
              if (typeof spawnParticles === 'function')
                spawnParticles(h.x + h.facing * 18, h.y, '#ff9900', 8);
            }
            break;
          }

          case 'giant_arrow': {
            if (h.phase === 'cooldown') {
              h.phaseTimer--;
              if (h.phaseTimer <= 0) {
                h.phase = 'warning';
                h.phaseTimer = 72; // 1.2 s warning — shorter reaction window
                h.fromLeft = Math.random() < 0.5;
                h.x = OX + (h.fromLeft ? -60 : GAME_W + 60);
                h.y = GAME_H * 0.22 + Math.random() * GAME_H * 0.35;
              }
            } else if (h.phase === 'warning') {
              h.phaseTimer--;
              if (h.phaseTimer <= 0) {
                h.phase = 'flying';
                h.vx = h.fromLeft ? 8 : -8; // faster flight
                h.vy = 0;
                h.hitSet.clear();
              }
            } else { // 'flying'
              h.x += h.vx;
              h.y += h.vy;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(h.x - t.cx(), h.y - t.cy()) < h.radius + t.w / 2) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, h.damage, 18);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(h.x, h.y, '#44ff88', 28);
                    spawnParticles(h.x, h.y, '#ffffff', 14);
                  }
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 22);
                }
              }
              if (h.x < OX - 120 || h.x > OX + GAME_W + 120) {
                h.phase = 'cooldown';
                h.phaseTimer = 210; // 3.5 s until next
                h.vx = 0;
              }
            }
            break;
          }

          case 'divine_shield': {
            h.angle += 0.058; // faster orbit
            for (const t of targets) {
              if (h.hitSet.has(t)) continue;
              const dx = h.x - t.cx(), dy = h.y - t.cy();
              if (Math.hypot(dx, dy) < h.radius + t.w / 2) {
                h.hitSet.add(t);
                _dealDomainDamage(owner, t, h.damage, 14);
                const len = Math.hypot(dx, dy) || 1;
                t.vx += (dx / len) * 14;
                t.vy += (dy / len) * 8;
                if (typeof spawnParticles === 'function') {
                  spawnParticles(h.x, h.y, '#ffffaa', 16);
                  spawnParticles(h.x, h.y, '#ffffff', 8);
                }
                if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
                setTimeout(() => h.hitSet.delete(t), 1100);
              }
            }
            break;
          }

          case 'rage_pulse': {
            h.pulseTimer--;
            if (h.ringActive) {
              h.ringRadius += 6;
              if (h.ringRadius > h.radius + 50) { h.ringActive = false; h.ringRadius = 0; }
            }
            if (h.pulseTimer <= 0) {
              h.pulseTimer = h.pulseEvery;
              h.ringActive = true;
              h.ringRadius = 0;
              h.hitSet.clear();
              for (const t of targets) {
                if (Math.hypot(t.cx() - owner.cx(), t.cy() - owner.cy()) < h.radius) {
                  _dealDomainDamage(owner, t, h.damage, 9);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(owner.cx(), owner.cy(), '#ff2222', 20);
                    spawnParticles(owner.cx(), owner.cy(), '#ff8800', 10);
                  }
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
                }
              }
            }
            break;
          }

          case 'gravity_vortex': {
            // Pull non-owner players toward arena center — stronger when closer to void rocks
            for (const t of targets) {
              const dx = h.x - t.cx(), dy = h.y - t.cy();
              const dist = Math.hypot(dx, dy) || 1;
              // Pull scales inversely with distance so it's hardest to escape near center
              const scaledPull = h.pull * Math.min(2.0, 260 / dist);
              t.vx += (dx / dist) * scaledPull;
              t.vy += (dy / dist) * scaledPull * 0.55;
            }
            break;
          }

          case 'mjolnir': {
            h.spinAngle += 0.18;
            h.stateTimer--;

            if (h.state === 'roam') {
              // Fly toward random arena waypoints continuously
              if (!h.roamTarget ||
                  Math.hypot(h.x - h.roamTarget.x, h.y - h.roamTarget.y) < 38) {
                h.roamTarget = {
                  x: OX + 70 + Math.random() * (GAME_W - 140),
                  y: GAME_H * 0.12 + Math.random() * (GAME_H * 0.58),
                };
              }
              const rdx = h.roamTarget.x - h.x, rdy = h.roamTarget.y - h.y;
              const rLen = Math.hypot(rdx, rdy) || 1;
              h.vx += (rdx / rLen) * 2.8;
              h.vy += (rdy / rLen) * 2.8;
              const rSp = Math.hypot(h.vx, h.vy);
              if (rSp > 10) { h.vx = (h.vx / rSp) * 10; h.vy = (h.vy / rSp) * 10; }
              h.x += h.vx;
              h.y += h.vy;

              // Hit any enemy Mjolnir passes through while roaming
              for (const t of targets) {
                if (h.orbitHitSet.has(t)) continue;
                if (Math.hypot(h.x - t.cx(), h.y - t.cy()) < h.radius + t.w / 2) {
                  h.orbitHitSet.add(t);
                  _dealDomainDamage(owner, t, h.orbitDamage, 10);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(h.x, h.y, '#ffee44', 14);
                    spawnParticles(h.x, h.y, '#aaddff', 8);
                  }
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
                  setTimeout(() => h.orbitHitSet.delete(t), 1200);
                }
              }

              // Periodically dash at the nearest enemy
              if (h.stateTimer <= 0) {
                const tgt = targets.reduce((best, t) => {
                  const d = Math.hypot(t.cx() - h.x, t.cy() - h.y);
                  return (!best || d < best.d) ? { t, d } : best;
                }, null);
                if (tgt) {
                  h.state = 'strike';
                  h.stateTimer = 85;
                  const sdx = tgt.t.cx() - h.x, sdy = tgt.t.cy() - h.y;
                  const sLen = Math.hypot(sdx, sdy) || 1;
                  h.vx = (sdx / sLen) * 20;
                  h.vy = (sdy / sLen) * 20;
                  h.hitSet.clear();
                } else {
                  h.stateTimer = 50;
                }
              }

            } else { // 'strike'
              // Strong homing during the dash
              const tgt = targets.reduce((best, t) => {
                const d = Math.hypot(t.cx() - h.x, t.cy() - h.y);
                return (!best || d < best.d) ? { t, d } : best;
              }, null);
              if (tgt) {
                const sdx = tgt.t.cx() - h.x, sdy = tgt.t.cy() - h.y;
                const sLen = Math.hypot(sdx, sdy) || 1;
                h.vx += (sdx / sLen) * 3.0;
                h.vy += (sdy / sLen) * 3.0;
              }
              const sp = Math.hypot(h.vx, h.vy);
              if (sp > 22) { h.vx = (h.vx / sp) * 22; h.vy = (h.vy / sp) * 22; }
              h.x += h.vx;
              h.y += h.vy;

              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(h.x - t.cx(), h.y - t.cy()) < h.radius + t.w / 2) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, h.damage, 18);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(h.x, h.y, '#ffee44', 26);
                    spawnParticles(h.x, h.y, '#aaddff', 18);
                  }
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 20);
                }
              }
              // After hit, timer expired, or off-screen — resume roaming
              if (h.stateTimer <= 0 || h.hitSet.size > 0 ||
                  h.x < OX - 120 || h.x > OX + GAME_W + 120 || h.y > GAME_H + 120) {
                // Shield recently-struck targets from roam pass-through damage
                for (const struck of h.hitSet) {
                  h.orbitHitSet.add(struck);
                  setTimeout(() => h.orbitHitSet.delete(struck), 1200);
                }
                h.state = 'roam';
                h.stateTimer = 110;
                h.roamTarget = {
                  x: OX + 70 + Math.random() * (GAME_W - 140),
                  y: GAME_H * 0.12 + Math.random() * (GAME_H * 0.58),
                };
              }
            }

            // Trailing sparks — brighter during strike
            if (typeof spawnParticles === 'function' && Math.random() < (h.state === 'strike' ? 0.55 : 0.28))
              spawnParticles(h.x, h.y, h.state === 'roam' ? '#ffffaa' : '#88ccff', 1);
            break;
          }

          case 'spirit_katana': {
            h.orbitAngle += 0.14;
            h.stateTimer--;
            if (h.state === 'orbit') {
              h.x = owner.cx() + Math.cos(h.orbitAngle) * h.orbitR;
              h.y = owner.cy() + Math.sin(h.orbitAngle) * h.orbitR * 0.5;
              // Contact while orbiting
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(t.cx() - h.x, t.cy() - h.y) < h.radius + t.w / 2) {
                  h.hitSet.add(t); _dealDomainDamage(owner, t, 18, 8);
                  if (typeof spawnParticles === 'function') spawnParticles(h.x, h.y, '#ccccff', 8);
                  setTimeout(() => h.hitSet.delete(t), 900);
                }
              }
              if (h.stateTimer <= 0) {
                h.state = 'launch';
                h.stateTimer = 45;
                // Launch at nearest target or straight ahead
                const nearest = targets.reduce((b, t) => {
                  const d = Math.hypot(t.cx() - h.x, t.cy() - h.y);
                  return (!b || d < b.d) ? { t, d } : b;
                }, null);
                const tdx = nearest ? nearest.t.cx() - h.x : (owner.facing || 1) * 300;
                const tdy = nearest ? nearest.t.cy() - h.y : 0;
                const tlen = Math.hypot(tdx, tdy) || 1;
                h.launchVx = (tdx / tlen) * 20;
                h.launchVy = (tdy / tlen) * 20;
                h.hitSet.clear();
              }
            } else if (h.state === 'launch') {
              h.x += h.launchVx; h.y += h.launchVy;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(t.cx() - h.x, t.cy() - h.y) < h.radius + t.w / 2) {
                  h.hitSet.add(t); _dealDomainDamage(owner, t, h.damage, 14);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(h.x, h.y, '#ffffff', 16);
                    spawnParticles(h.x, h.y, '#ccccff', 8);
                  }
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 16);
                }
              }
              if (h.x < OX - 60 || h.x > OX + GAME_W + 60 || h.y < -60 || h.y > GAME_H + 60 || h.stateTimer <= 0) {
                h.state = 'orbit';
                h.x = owner.cx(); h.y = owner.cy();
                h.stateTimer = 90;
                h.hitSet.clear();
              }
            }
            break;
          }

          case 'scythe_pendulum': {
            // Swing the pendulum
            h.angleVel += -0.0004 * Math.sin(h.angle); // gravity-like restoring force
            h.angle += h.angleVel * h.swingDir;
            // Clamp angle so it stays in visible range
            if (Math.abs(h.angle) > Math.PI * 0.44) {
              h.swingDir *= -1;
              h.angle = Math.sign(h.angle) * Math.PI * 0.44;
            }
            const bladeX = h.anchorX + Math.sin(h.angle) * h.armLength;
            const bladeY = h.anchorY + Math.cos(h.angle) * h.armLength;
            // Decrement per-target hit cooldowns
            for (const [tf, cd] of h.hitCd) {
              if (cd <= 1) h.hitCd.delete(tf); else h.hitCd.set(tf, cd - 1);
            }
            // Check blade tip contact
            for (const t of targets) {
              if (h.hitCd.has(t)) continue;
              if (Math.hypot(t.cx() - bladeX, t.cy() - bladeY) < h.radius + t.w / 2) {
                _dealDomainDamage(owner, t, h.damage, 12);
                h.hitCd.set(t, 55);
                if (typeof spawnParticles === 'function') spawnParticles(bladeX, bladeY, '#cc44cc', 14);
                if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
              }
            }
            // Also sweep the midpoint of the arm for wider coverage
            const midX = h.anchorX + Math.sin(h.angle) * h.armLength * 0.6;
            const midY = h.anchorY + Math.cos(h.angle) * h.armLength * 0.6;
            for (const t of targets) {
              if (h.hitCd.has(t)) continue;
              if (Math.hypot(t.cx() - midX, t.cy() - midY) < h.radius * 0.8 + t.w / 2) {
                _dealDomainDamage(owner, t, Math.floor(h.damage * 0.65), 8);
                h.hitCd.set(t, 55);
                if (typeof spawnParticles === 'function') spawnParticles(midX, midY, '#aa44aa', 8);
              }
            }
            break;
          }

          case 'surge_fist': {
            if (h.phase === 'cooldown') {
              h.phaseTimer--;
              if (h.phaseTimer <= 0) {
                h.phase = 'flying';
                h.x = OX + (h.fromLeft ? -70 : GAME_W + 70);
                h.vx = h.fromLeft ? 14 : -14;
                h.hitSet.clear();
              }
            } else { // flying
              h.x += h.vx;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(t.cx() - h.x, t.cy() - h.y) < h.radius + t.w / 2) {
                  h.hitSet.add(t); _dealDomainDamage(owner, t, h.damage, 20);
                  if (typeof spawnParticles === 'function') {
                    spawnParticles(h.x, h.y, '#ee4444', 22);
                    spawnParticles(h.x, h.y, '#ffaaaa', 10);
                  }
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 22);
                }
              }
              if (h.x < OX - 120 || h.x > OX + GAME_W + 120) {
                h.phase = 'cooldown';
                h.phaseTimer = 150;
                h.vx = 0;
              }
            }
            break;
          }

          case 'chaos_bolt': {
            // Moves like a bullet — reuse bullet movement + out-of-bounds cleanup
            h.x += h.vx; h.y += h.vy;
            if (h.x < OX - 60 || h.x > OX + GAME_W + 60 || h.y < -60 || h.y > GAME_H + 60) {
              remove = true; break;
            }
            for (const t of targets) {
              if (h.hitSet.has(t)) continue;
              if (Math.hypot(h.x - t.cx(), h.y - t.cy()) < h.radius + t.w / 2) {
                h.hitSet.add(t);
                _dealDomainDamage(owner, t, h.damage, 7);
                if (typeof spawnParticles === 'function') spawnParticles(h.x, h.y, '#cccccc', 8);
                remove = true;
              }
            }
            break;
          }

          case 'rage_spray': {
            // Rotating turret fires one bullet every 6 frames in current angle direction
            h.angle += 0.115;
            h.fireTimer--;
            if (h.fireTimer <= 0) {
              h.fireTimer = 6;
              domain.hazards.push({
                type: 'bullet', x: h.x, y: h.y,
                vx: Math.cos(h.angle) * 16, vy: Math.sin(h.angle) * 16,
                damage: h.damage, radius: h.radius, hitSet: new Set(),
              });
            }
            break;
          }

          case 'arc_salvo': {
            // Every fireEvery frames, burst 4 arcing bolts from owner position
            h.fireTimer--;
            if (h.fireTimer <= 0) {
              h.fireTimer = h.fireEvery;
              const ox = owner.cx(), oy = owner.cy();
              for (let i = 0; i < 4; i++) {
                const ang = (i / 4) * Math.PI * 2 + 0.4;
                domain.hazards.push({
                  type: 'bullet', x: ox, y: oy,
                  vx: Math.cos(ang) * 11, vy: Math.sin(ang) * 11 - 5,
                  damage: h.damage, radius: h.radius, hitSet: new Set(),
                });
              }
              if (typeof spawnParticles === 'function') spawnParticles(ox, oy, '#ff4444', 14);
              if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
            }
            break;
          }

          case 'elec_pulse': {
            // Two electric pillars arc between them periodically
            h.arcTimer--;
            if (h.arcTimer <= 0) {
              h.arcTimer = h.arcEvery;
              h.hitSet.clear();
              if (typeof spawnLightningBolt === 'function') {
                spawnLightningBolt(h.pillarX1, GAME_H * 0.28);
                spawnLightningBolt(h.pillarX2, GAME_H * 0.28);
              }
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                const inCol1 = Math.abs(t.cx() - h.pillarX1) < h.radius;
                const inCol2 = Math.abs(t.cx() - h.pillarX2) < h.radius;
                const inBeam = t.cx() > h.pillarX1 && t.cx() < h.pillarX2 && Math.abs(t.cy() - GAME_H * 0.5) < 32;
                if (inCol1 || inCol2 || inBeam) {
                  h.hitSet.add(t);
                  _dealDomainDamage(owner, t, inBeam ? Math.floor(h.damage * 0.6) : h.damage, 9);
                  if (typeof spawnParticles === 'function') spawnParticles(t.cx(), t.cy(), '#00eeff', 12);
                  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
                }
              }
            }
            break;
          }

          case 'blood_blade': {
            if (h.phase === 'cooldown') {
              h.phaseTimer--;
              if (h.phaseTimer <= 0) {
                h.phase = 'flying';
                h.fromLeft = Math.random() < 0.5;
                h.x = OX + (h.fromLeft ? -40 : GAME_W + 40);
                h.y = GAME_H * 0.25 + Math.random() * GAME_H * 0.42;
                h.vx = h.fromLeft ? 16 : -16;
                h.vy = (Math.random() - 0.5) * 3;
                h.hitSet.clear();
              }
            } else {
              h.x += h.vx; h.y += h.vy;
              for (const t of targets) {
                if (h.hitSet.has(t)) continue;
                if (Math.hypot(t.cx() - h.x, t.cy() - h.y) < h.radius + t.w / 2) {
                  h.hitSet.add(t); _dealDomainDamage(owner, t, h.damage, 10);
                  if (typeof spawnParticles === 'function') spawnParticles(h.x, h.y, '#ff2222', 14);
                }
              }
              if (h.x < OX - 80 || h.x > OX + GAME_W + 80 || h.y > GAME_H + 80) {
                h.phase = 'cooldown';
                h.phaseTimer = 90 + Math.floor(Math.random() * 40);
                h.vx = 0;
              }
            }
            break;
          }

          case 'blades_of_chaos': {
            if (h.phase === 'sweep') {
              h.angle += h.sweepSpeed * h.sweepDir;
              const tipX = h.x + Math.cos(h.angle) * h.armLength;
              const tipY = h.y + Math.sin(h.angle) * h.armLength;
              // Check collision at 6 points along the chain length
              const steps = 6;
              for (let s = 2; s <= steps; s++) { // start at s=2 to skip the anchor point
                const t_frac = s / steps;
                const sx = h.x + Math.cos(h.angle) * h.armLength * t_frac;
                const sy = h.y + Math.sin(h.angle) * h.armLength * t_frac;
                for (const t of targets) {
                  if (h.hitSet.has(t)) continue;
                  if (Math.hypot(sx - t.cx(), sy - t.cy()) < h.radius + t.w / 2) {
                    h.hitSet.add(t);
                    _dealDomainDamage(owner, t, h.damage, 10);
                    if (typeof spawnParticles === 'function') {
                      spawnParticles(sx, sy, '#ff5500', 18);
                      spawnParticles(sx, sy, '#ffbb00', 10);
                    }
                    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
                    setTimeout(() => h.hitSet.delete(t), 700);
                  }
                }
              }
              // Sparks along the sweeping tip
              if (Math.random() < 0.65 && typeof spawnParticles === 'function')
                spawnParticles(tipX, tipY, '#ff4400', 4);
              // Reverse at ±160° from center — proper two-sided sweep
              if (h.angle > Math.PI * 0.88 || h.angle < -Math.PI * 0.88) {
                h.sweepDir *= -1;
                h.phase = 'reset';
                h.resetTimer = 30; // 0.5 s pause — just long enough to read, not long enough to breathe
                h.hitSet.clear();
              }
            } else {
              h.resetTimer--;
              if (h.resetTimer <= 0) h.phase = 'sweep';
            }
            break;
          }

        }
        // (stormbreaker is now drawn via fighter._domainDisplayWeapon = 'stormbreaker' — no update needed here)

        if (remove) domain.hazards.splice(j, 1);
      }

      // Domain expired
      if (domain.timer <= 0) {
        if (domain.defKey === 'ronin') {
          // Final sheathe: whatever cuts remain land as the dojo closes
          _detonateRoninCuts(domain);
          _clearRoninCuts(owner);
        }
        if (domain.defKey === 'reaper') {
          // Final Reaping: whatever souls remain launch as the harvest closes
          _detonateHarvest(domain);
          _clearSoulTithe(owner);
        }
        _clearOwnerBuffs(owner);
        _domains.splice(i, 1);
        if (typeof queueAnnouncement === 'function') {
          queueAnnouncement(def.name.toUpperCase() + ' FADES', def.color);
        }
      }
    }

    // Age iai detonation slash fx (independent of domain lifetime)
    for (let fi = _iaiFx.length - 1; fi >= 0; fi--) {
      if (--_iaiFx[fi].life <= 0) _iaiFx.splice(fi, 1);
    }

    // ── Reaper Soul Tithe: rip wisps fly to the owner and join the orbit ──
    for (let wi = _soulWisps.length - 1; wi >= 0; wi--) {
      const w = _soulWisps[wi];
      const o = w.owner;
      if (!o || o.health <= 0 || --w.life <= 0) { _soulWisps.splice(wi, 1); continue; }
      const dx = o.cx() - w.x, dy = (o.cy() - 26) - w.y;
      const dist = Math.hypot(dx, dy) || 1;
      const sp = Math.min(9, 3 + (240 - w.life) * 0.12); // accelerates toward the Reaper
      w.x += dx / dist * sp; w.y += dy / dist * sp;
      if (dist < 16) {
        _soulWisps.splice(wi, 1);
        const dm = _domains.find(d => d.defKey === 'reaper' && d.owner === o);
        if (dm && dm.harvestSouls && dm.harvestSouls.length < (dm.def.maxSouls || 8)) {
          dm.harvestSouls.push({
            angle:  Math.random() * Math.PI * 2,
            orbitR: 34 + Math.random() * 10,
            bobSeed: Math.random() * 10,
          });
          o._soulTitheCount = dm.harvestSouls.length;
          if (typeof SoundManager !== 'undefined' && SoundManager.soulAbsorb) {
            SoundManager.soulAbsorb(dm.harvestSouls.length);
          }
        } else {
          // Orbit full (or domain already closed) — the surplus soul is consumed
          // directly as a small burst heal
          o.health = Math.min(o.maxHealth, o.health + 2);
        }
        if (typeof spawnParticles === 'function') spawnParticles(o.cx(), o.cy() - 20, '#ee88ee', 6);
      }
    }

    // ── Reaper harvest skulls: home in, strike, retarget if the mark dies ──
    for (let si = _soulSkulls.length - 1; si >= 0; si--) {
      const sk = _soulSkulls[si];
      if (!sk.owner || sk.owner.health <= 0 || --sk.life <= 0) {
        if (typeof spawnParticles === 'function') spawnParticles(sk.x, sk.y, '#cc44cc', 5);
        _soulSkulls.splice(si, 1); continue;
      }
      if (!sk.target || sk.target.health <= 0) {
        const near = _getDomainTargets(sk.owner)
          .sort((a, b) => Math.hypot(a.cx() - sk.x, a.cy() - sk.y) - Math.hypot(b.cx() - sk.x, b.cy() - sk.y))[0];
        if (!near) {
          if (typeof spawnParticles === 'function') spawnParticles(sk.x, sk.y, '#cc44cc', 5);
          _soulSkulls.splice(si, 1); continue;
        }
        sk.target = near;
      }
      const tdx = sk.target.cx() - sk.x, tdy = sk.target.cy() - sk.y;
      const tdist = Math.hypot(tdx, tdy) || 1;
      sk.vx += tdx / tdist * 0.38; sk.vy += tdy / tdist * 0.38;
      const spd = Math.hypot(sk.vx, sk.vy);
      if (spd > 7) { sk.vx *= 7 / spd; sk.vy *= 7 / spd; }
      sk.x += sk.vx; sk.y += sk.vy;
      if (tdist < 20) {
        // Guard recursion: skull impact re-enters dealDamage — must not re-rip a soul
        sk.owner._soulTitheDetonating = true;
        _dealDomainDamage(sk.owner, sk.target, sk.damage, 7);
        sk.owner._soulTitheDetonating = false;
        if (typeof spawnParticles === 'function') {
          spawnParticles(sk.x, sk.y, '#ee88ee', 10);
          spawnParticles(sk.x, sk.y, '#ffffff', 5);
        }
        _soulSkulls.splice(si, 1);
      }
    }

    // Age harvest release rings
    for (let hi = _harvestFx.length - 1; hi >= 0; hi--) {
      if (--_harvestFx[hi].life <= 0) _harvestFx.splice(hi, 1);
    }

    // ── Per-frame Conviction weapon effects ───────────────────────────
    const _allFighters = [...(typeof players !== 'undefined' ? players : []),
                          ...(typeof minions !== 'undefined' ? minions : [])];
    for (const fighter of _allFighters) {
      if (!fighter || fighter.health <= 0) continue;

      // Axe orbiting effect
      if (fighter._convictionOrbitAxes && fighter._convictionOrbitAxes.length) {
        const axes = fighter._convictionOrbitAxes;
        const _enemies2 = _allFighters.filter(e => e && e !== fighter && e.health > 0
                            && (typeof areAlliedEntities === 'function' ? !areAlliedEntities(fighter, e) : true));
        for (let ai = axes.length - 1; ai >= 0; ai--) {
          const ax = axes[ai];
          ax.angle += 0.08;
          ax.life--;
          if (ax.life <= 0) { axes.splice(ai, 1); continue; }
          const ax_x = fighter.cx() + Math.cos(ax.angle) * ax.r;
          const ax_y = fighter.cy() + Math.sin(ax.angle) * ax.r;
          for (const e of _enemies2) {
            if (ax.hitSet.has(e)) continue;
            if (Math.hypot(e.cx() - ax_x, e.cy() - ax_y) < 22) {
              ax.hitSet.add(e);
              dealDamage(fighter, e, 18, 10);
              spawnParticles(ax_x, ax_y, '#ff8800', 10);
              setTimeout(() => ax.hitSet.delete(e), 500);
            }
          }
        }
        if (axes.length === 0) delete fighter._convictionOrbitAxes;
      }

      // Flail spin damage aura
      if (fighter._convictionFlailSpin > 0) {
        fighter._convictionFlailSpin--;
        if (fighter._convictionFlailSpin % 8 === 0) {
          const _enemies3 = _allFighters.filter(e => e && e !== fighter && e.health > 0
                              && (typeof areAlliedEntities === 'function' ? !areAlliedEntities(fighter, e) : true));
          for (const e of _enemies3) {
            if (Math.hypot(e.cx() - fighter.cx(), e.cy() - fighter.cy()) < 70) {
              dealDamage(fighter, e, 8, 5);
              spawnParticles(e.cx(), e.cy(), '#cc8844', 8);
            }
          }
        }
        if (fighter._convictionFlailSpin === 0) delete fighter._convictionFlailSpin;
      }

      // Flamethrower burst arc
      if (fighter._convictionFlameBurst && fighter._convictionFlameBurst.frames > 0) {
        const fb = fighter._convictionFlameBurst;
        fb.frames--;
        if (fb.frames % 4 === 0) {
          const _enemies4 = _allFighters.filter(e => e && e !== fighter && e.health > 0
                              && (typeof areAlliedEntities === 'function' ? !areAlliedEntities(fighter, e) : true));
          const arcHalf = Math.PI * 0.75;
          for (const e of _enemies4) {
            const dx = e.cx() - fighter.cx(), dy = e.cy() - fighter.cy();
            const dist = Math.hypot(dx, dy);
            if (dist < 220) {
              const ang = Math.atan2(dy, dx);
              const diff = Math.abs(((ang - fb.angle) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
              if (diff < arcHalf) {
                dealDamage(fighter, e, 7, 2);
                spawnParticles(e.cx(), e.cy(), '#ff4400', 8);
              }
            }
          }
          spawnParticles(fighter.cx() + Math.cos(fb.angle) * 60, fighter.cy() + Math.sin(fb.angle) * 30, '#ff6600', 10);
        }
        if (fb.frames <= 0) delete fighter._convictionFlameBurst;
      }

      // Domain-duration weapon passive tick
      if (fighter._convictionPassive) {
        const p = fighter._convictionPassive;
        p.timer--;
        if (p.timer <= 0) {
          delete fighter._convictionPassive;
        } else {
          p.cd--;
          if (p.cd <= 0) {
            _fireWeaponPassive(fighter);
            p.cd = _PASSIVE_CDS[p.key] || 60;
          }
        }
      }
    }
  }

  // ── Draw — bg tint (screen-space; call before world-space phase) ───

  function draw() {
    if (!gameRunning) return;
    if (_domains.length === 0 && _rising.length === 0) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cW = canvas.width, cH = canvas.height;

    // Clashing domains each tint the screen. Two tints at full strength stack to
    // near-black, so only the first pays full price; the rest read as a wash over it.
    for (let i = 0; i < _domains.length; i++) {
      ctx.globalAlpha = i === 0 ? 1 : 0.45;
      ctx.fillStyle = _domains[i].def.bgTint;
      ctx.fillRect(0, 0, cW, cH);
    }
    ctx.globalAlpha = 1;
    for (const r of _rising) {
      const def = DOMAIN_DEFS[_domainKeyOf(r.fighter)];
      if (!def) continue;
      ctx.globalAlpha = 0.22 * (1 - r.timer / RISE_FRAMES);
      ctx.fillStyle = def.bgTint;
      ctx.fillRect(0, 0, cW, cH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ── Draw — hazards (world-space; call inside game transform) ───────

  function drawHazards() {
    // Entry animations for rising fighters (drawn before active domain hazards)
    for (const r of _rising) _drawDomainEntryAnim(r);

    // Ninja time dilation aura on slowed fighters — ghost shell + drifting ripple ring
    const _slowDrawPool = []
      .concat(typeof players !== 'undefined' ? players : [])
      .concat(typeof minions !== 'undefined' ? minions : [])
      .concat(typeof trainingDummies !== 'undefined' ? trainingDummies : []);
    const _slowNow = Date.now();
    for (const sf of _slowDrawPool) {
      if (!sf || sf.health <= 0 || !(sf._domainSlowFactor > 0 && sf._domainSlowFactor < 1)) continue;
      ctx.save();
      const _pulse = 0.5 + 0.5 * Math.sin(_slowNow / 260 + sf.x * 0.05);
      ctx.globalAlpha = 0.20 + _pulse * 0.14;
      ctx.strokeStyle = '#bb44ff'; ctx.lineWidth = 2;
      ctx.shadowColor = '#bb44ff'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(sf.cx(), sf.cy(), 26 + _pulse * 8, 34 + _pulse * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.10 + _pulse * 0.08;
      ctx.fillStyle = '#330055';
      ctx.fill();
      ctx.restore();
    }

    // ── Ronin Deferred Cuts: marks over targets, sheathe glint, detonation fans ──
    const _roninDomains = _domains.filter(d => d.defKey === 'ronin' && d.owner && d.owner.health > 0);
    if (_roninDomains.length || _iaiFx.length) {
      const _rNow = Date.now();
      for (const rd of _roninDomains) {
        const _imminent = rd.sheatheTimer !== undefined && rd.sheatheTimer < 45;
        // Cut marks hovering over each marked target — flash faster as the click nears
        for (const mf of _roninCutPool()) {
          if (!mf || mf.health <= 0 || mf._roninCutOwner !== rd.owner || !(mf._roninCuts > 0)) continue;
          const n = Math.min(mf._roninCuts, rd.def.maxCuts || 5);
          ctx.save();
          const _mp = 0.6 + 0.4 * Math.sin(_rNow / (_imminent ? 70 : 200) + mf.x * 0.03);
          ctx.globalAlpha = (_imminent ? 0.55 : 0.40) + _mp * 0.35;
          ctx.strokeStyle = _imminent ? '#ffffff' : '#ccccff';
          ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.shadowColor = '#ccccff'; ctx.shadowBlur = _imminent ? 14 : 8;
          const _mbx = mf.cx(), _mby = mf.y - 14;
          for (let mi = 0; mi < n; mi++) {
            const _mox = (mi - (n - 1) / 2) * 9;
            ctx.beginPath();
            ctx.moveTo(_mbx + _mox - 3, _mby + 4);
            ctx.lineTo(_mbx + _mox + 3, _mby - 4);
            ctx.stroke();
          }
          ctx.restore();
        }
        // Sheathe glint on the owner — the tell that every cut is about to land
        if (_imminent) {
          const _ro = rd.owner;
          const _gl = 1 - rd.sheatheTimer / 45;
          ctx.save();
          ctx.globalAlpha = 0.25 + _gl * 0.60;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5 + _gl * 1.5; ctx.lineCap = 'round';
          ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 10 + _gl * 14;
          ctx.beginPath();
          ctx.moveTo(_ro.cx() - (_ro.facing || 1) * 6, _ro.cy() + 10);
          ctx.lineTo(_ro.cx() + (_ro.facing || 1) * (14 + _gl * 10), _ro.cy() + 4);
          ctx.stroke();
          ctx.restore();
        }
      }
      // Detonation slash fans — every deferred cut opens at once
      for (const fx of _iaiFx) {
        const _fp   = fx.life / fx.maxLife; // 1 → 0
        const _flen = 26 + (1 - _fp) * 34;
        ctx.save();
        ctx.globalAlpha = Math.min(1, _fp * 1.6);
        ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
        ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 18;
        ctx.lineWidth = 3 * _fp + 1;
        for (const a of fx.angles) {
          ctx.beginPath();
          ctx.moveTo(fx.x - Math.cos(a) * _flen, fx.y - Math.sin(a) * _flen);
          ctx.lineTo(fx.x + Math.cos(a) * _flen, fx.y + Math.sin(a) * _flen);
          ctx.stroke();
        }
        ctx.globalAlpha = _fp * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 8 + (1 - _fp) * 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // ── Reaper Soul Tithe: orbiting souls, rip wisps, harvest skulls, reap rings ──
    const _reaperDomains = _domains.filter(d => d.defKey === 'reaper' && d.owner && d.owner.health > 0);
    if (_reaperDomains.length || _soulWisps.length || _soulSkulls.length || _harvestFx.length) {
      const _sNow = Date.now();
      // Orbiting souls around each Reaper — pulse faster as the Reaping nears
      for (const rd of _reaperDomains) {
        const souls = rd.harvestSouls || [];
        const _reapSoon = rd.harvestTimer !== undefined && rd.harvestTimer < 45 && souls.length;
        const ocx = rd.owner.cx(), ocy = rd.owner.cy() - 26;
        for (const s of souls) {
          const bob = Math.sin(_sNow / 300 + s.bobSeed) * 3;
          const sx = ocx + Math.cos(s.angle) * s.orbitR;
          const sy = ocy + Math.sin(s.angle) * s.orbitR * 0.6 + bob;
          const _sp = 0.5 + 0.5 * Math.sin(_sNow / (_reapSoon ? 70 : 240) + s.bobSeed * 3);
          ctx.save();
          ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = _reapSoon ? 16 : 10;
          // Wispy tail trailing against the orbit direction
          ctx.globalAlpha = (_reapSoon ? 0.45 : 0.30) + _sp * 0.25;
          ctx.strokeStyle = '#ee88ee'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            sx + Math.sin(s.angle) * 7, sy - Math.cos(s.angle) * 4 + 5,
            sx + Math.sin(s.angle) * 11, sy + 9);
          ctx.stroke();
          // Soul core
          ctx.globalAlpha = (_reapSoon ? 0.75 : 0.55) + _sp * 0.25;
          ctx.fillStyle = _reapSoon ? '#ffffff' : '#ee88ee';
          ctx.beginPath(); ctx.arc(sx, sy, 3.4 + _sp * 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      // Rip wisps streaking toward the Reaper
      for (const w of _soulWisps) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.8, w.life / 60);
        ctx.fillStyle = '#ee88ee';
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(w.x, w.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha *= 0.5;
        ctx.beginPath(); ctx.arc(w.x, w.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Harvest skulls — glowing head with hollow eyes, facing their travel direction
      for (const sk of _soulSkulls) {
        const fdir = sk.vx >= 0 ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, sk.life / 30);
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 14;
        // Trail
        ctx.strokeStyle = '#cc44cc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.moveTo(sk.x, sk.y);
        ctx.lineTo(sk.x - sk.vx * 2.4, sk.y - sk.vy * 2.4);
        ctx.stroke();
        ctx.globalAlpha = Math.min(1, sk.life / 30);
        // Skull
        ctx.fillStyle = '#eeddee';
        ctx.beginPath(); ctx.arc(sk.x, sk.y, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(sk.x - 3.5, sk.y + 3, 7, 4); // jaw
        ctx.fillStyle = '#440044';
        ctx.beginPath(); ctx.arc(sk.x + fdir * 2.6, sk.y - 1, 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sk.x - fdir * 1.4, sk.y - 1, 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Reap release rings
      for (const fx of _harvestFx) {
        const _fp = fx.life / fx.maxLife; // 1 → 0
        ctx.save();
        ctx.globalAlpha = _fp * 0.7;
        ctx.strokeStyle = '#ee88ee'; ctx.lineWidth = 2 + _fp * 2;
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, 14 + (1 - _fp) * 52, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // Draw conviction weapon overlay effects (world-space)
    const _cvFighters = typeof players !== 'undefined' ? players : [];
    for (const fighter of _cvFighters) {
      if (!fighter || fighter.health <= 0) continue;

      // Orbiting axe indicators
      if (fighter._convictionOrbitAxes && fighter._convictionOrbitAxes.length) {
        for (const ax of fighter._convictionOrbitAxes) {
          const ax_x = fighter.cx() + Math.cos(ax.angle) * ax.r;
          const ax_y = fighter.cy() + Math.sin(ax.angle) * ax.r;
          ctx.save();
          ctx.translate(ax_x, ax_y);
          ctx.rotate(ax.angle + Math.PI / 4);
          ctx.fillStyle = '#ff8800';
          ctx.globalAlpha = Math.min(1, ax.life / 60);
          ctx.fillRect(-10, -3, 20, 6);
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }

      // Shield reflect dome ring
      if (fighter._convictionReflectDome > 0) {
        fighter._convictionReflectDome--;
        const alpha = Math.min(1, fighter._convictionReflectDome / 60) * 0.55;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffaa';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.arc(fighter.cx(), fighter.cy(), 55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle   = '#ffffaa';
        ctx.fill();
        ctx.restore();
        if (fighter._convictionReflectDome === 0) delete fighter._convictionReflectDome;
      }

      // Flail spin glow
      if (fighter._convictionFlailSpin > 0) {
        const alpha = Math.min(1, fighter._convictionFlailSpin / 30) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = '#cc8844';
        ctx.beginPath();
        ctx.arc(fighter.cx(), fighter.cy(), 65, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (_domains.length === 0) return;
    for (const domain of _domains) {
      _drawDomainFrame(domain);
      _drawDomainSkyEffects(domain);
      const _hOX = _dOX(domain);
      for (const h of domain.hazards) {
        _drawHazard(h, domain.def, _hOX, domain.owner);
      }
    }
  }

  // ox = left edge of the owning domain's region (see _dAnchorOrigin). Only the
  // few screen-space telegraphs below need it; hazard h.x is already world-space.
  // `owner` was referenced by the rage_pulse case but never bound in this scope,
  // so drawing a Berserker conviction threw ReferenceError every frame and tripped
  // the error boundary. It is now passed in explicitly.
  function _drawHazard(h, def, ox, owner) {
    const OX = isFinite(ox) ? ox : 0;
    ctx.save();
    ctx.globalAlpha = 1;
    switch (h.type) {

      case 'lightning': {
        if (h.warningTimer > 0) {
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(h.warningTimer * 0.35);
          ctx.strokeStyle = '#aaddff';
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 7]);
          ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x, GAME_H); ctx.stroke();
          ctx.setLineDash([]);
        } else if (h.struck && h.strikeTimer > 0) {
          ctx.globalAlpha = h.strikeTimer / 22;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3 + Math.random() * 5;
          ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 22;
          ctx.beginPath();
          let cy = 0; ctx.moveTo(h.x + (Math.random() - 0.5) * 10, cy);
          while (cy < GAME_H) { cy += 20 + Math.random() * 24; ctx.lineTo(h.x + (Math.random() - 0.5) * 18, cy); }
          ctx.stroke();
          ctx.globalAlpha = (h.strikeTimer / 22) * 0.7;
          ctx.fillStyle = '#aaddff';
          ctx.beginPath(); ctx.arc(h.x, GAME_H - 8, 30, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'blade_wall': {
        const _gy = GAME_H - 60;
        if (h.warningTimer > 0) {
          // Telegraph: a widening crack in the floor, brightening as the sword nears
          const w = 1 - h.warningTimer / 44;
          ctx.globalAlpha = 0.30 + 0.35 * w;
          ctx.strokeStyle = '#e0b070';
          ctx.lineWidth = 2 + w * 3;
          ctx.shadowColor = '#ffcc77'; ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(h.x - h.radius * w, _gy + 10);
          ctx.lineTo(h.x, _gy - 6);
          ctx.lineTo(h.x + h.radius * w, _gy + 10);
          ctx.stroke();
          ctx.globalAlpha = 0.15 + 0.25 * w;
          ctx.fillStyle = '#ffcc77';
          ctx.beginPath();
          ctx.ellipse(h.x, _gy + 8, h.radius * (0.4 + w * 0.7), 8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Erupted blade
          const up = Math.min(1, (30 - h.riseTimer) / 6);
          const top = _gy - h.height * up;
          ctx.globalAlpha = Math.min(1, h.riseTimer / 12);
          ctx.shadowColor = '#ffcc77'; ctx.shadowBlur = 18;
          ctx.fillStyle = '#d8d0c0';
          ctx.beginPath();
          ctx.moveTo(h.x - 9, _gy + 8);
          ctx.lineTo(h.x - 5, top + 14);
          ctx.lineTo(h.x, top);
          ctx.lineTo(h.x + 5, top + 14);
          ctx.lineTo(h.x + 9, _gy + 8);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#8a6a3a';
          ctx.fillRect(h.x - 13, _gy - 4, 26, 6);
        }
        break;
      }

      case 'null_wall': {
        const now = performance.now();
        const top = GAME_H - 470, bot = GAME_H - 40;
        const grad = ctx.createLinearGradient(h.x - h.side * 26, 0, h.x + h.side * 10, 0);
        grad.addColorStop(0, 'rgba(255,51,17,0)');
        grad.addColorStop(1, 'rgba(255,51,17,0.34)');
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = grad;
        ctx.fillRect(Math.min(h.x - h.side * 26, h.x + h.side * 10), top, 36, bot - top);
        ctx.globalAlpha = 0.6 + 0.2 * Math.sin(now / 160);
        ctx.strokeStyle = '#ff3311';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff3311'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(h.x, top); ctx.lineTo(h.x, bot); ctx.stroke();
        // Rungs scrolling down the face so the wall reads as a moving boundary
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const ry = top + (((i * 34) + now * 0.06) % (bot - top));
          ctx.beginPath();
          ctx.moveTo(h.x, ry);
          ctx.lineTo(h.x - h.side * 14, ry + 7);
          ctx.stroke();
        }
        break;
      }

      case 'duel_ring': {
        const now = performance.now();
        ctx.globalAlpha = 0.42 + 0.12 * Math.sin(now / 220);
        ctx.strokeStyle = '#e0b070';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#e0b070'; ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Ring notches so the boundary reads at a glance
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + now / 3000;
          const rx = Math.cos(a) * h.radius, ry = Math.sin(a) * h.radius * 0.75;
          ctx.beginPath();
          ctx.moveTo(h.x + rx * 0.95, h.y + ry * 0.95);
          ctx.lineTo(h.x + rx * 1.05, h.y + ry * 1.05);
          ctx.stroke();
        }
        break;
      }

      case 'spirit_swarm': {
        const now = performance.now();
        const pr = h.radius * (0.85 + 0.15 * Math.sin(now / 90 + h.wobble));
        ctx.globalAlpha = Math.min(1, h.life / 45);
        ctx.shadowColor = '#66ffcc'; ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(102,255,204,0.35)';
        ctx.beginPath(); ctx.arc(h.x, h.y, pr * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ccfff0';
        ctx.beginPath(); ctx.arc(h.x, h.y, pr * 0.55, 0, Math.PI * 2); ctx.fill();
        // Trailing wisp tail
        ctx.globalAlpha *= 0.4;
        ctx.fillStyle = '#66ffcc';
        ctx.beginPath(); ctx.arc(h.x - h.vx * 2.2, h.y - h.vy * 2.2, pr * 0.5, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'summon_circle': {
        const now = performance.now();
        const glow = 0.35 + (h.pulse || 0) / 20 * 0.5;
        ctx.globalAlpha = glow;
        ctx.strokeStyle = '#66ffcc';
        ctx.shadowColor = '#66ffcc'; ctx.shadowBlur = 22;
        for (let r = 0; r < 3; r++) {
          const rr = 46 + r * 26;
          ctx.lineWidth = r === 1 ? 3 : 1.5;
          ctx.beginPath();
          ctx.ellipse(h.x, h.y, rr, rr * 0.42, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Rotating sigil spokes
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = h.angle + (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(h.x + Math.cos(a) * 46, h.y + Math.sin(a) * 46 * 0.42);
          ctx.lineTo(h.x + Math.cos(a) * 98, h.y + Math.sin(a) * 98 * 0.42);
          ctx.stroke();
        }
        ctx.globalAlpha = glow * 0.5;
        ctx.fillStyle = '#66ffcc';
        ctx.beginPath();
        ctx.arc(h.x, h.y, 10 + 4 * Math.sin(now / 260), 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'debris': {
        ctx.translate(h.x, h.y);
        ctx.rotate(performance.now() * 0.003 * Math.sign(h.vx));
        ctx.fillStyle = '#7a4a2a';
        ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 10;
        ctx.fillRect(-h.radius, -h.radius * 0.5, h.radius * 2, h.radius);
        ctx.fillStyle = '#5a3015';
        ctx.fillRect(-h.radius + 2, -h.radius * 0.5 + 2, h.radius * 2 - 4, h.radius - 4);
        break;
      }

      case 'shadow_blade': {
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);
        ctx.fillStyle = '#330066';
        ctx.shadowColor = '#bb44ff'; ctx.shadowBlur = 14;
        ctx.fillRect(-2, -h.radius * 2.2, 4, h.radius * 4.4);
        ctx.fillStyle = '#7700cc';
        ctx.beginPath();
        ctx.moveTo(0, -h.radius * 2.2); ctx.lineTo(7, -h.radius * 1.5); ctx.lineTo(0, -h.radius); ctx.closePath();
        ctx.fill();
        break;
      }

      case 'bullet': {
        ctx.fillStyle = def.color;
        ctx.shadowColor = def.color; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(h.x - h.vx * 2, h.y - h.vy * 2, h.radius * 0.6, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'arrow': {
        ctx.translate(h.x, h.y);
        ctx.rotate(Math.atan2(h.vy, h.vx));
        ctx.strokeStyle = def.color; ctx.lineWidth = 2;
        ctx.shadowColor = def.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(-h.radius * 2.5, 0); ctx.lineTo(h.radius * 2.5, 0); ctx.stroke();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.moveTo(h.radius * 2.5, 0); ctx.lineTo(h.radius * 2.5 - 7, -4); ctx.lineTo(h.radius * 2.5 - 7, 4);
        ctx.closePath(); ctx.fill();
        break;
      }

      case 'holy_beam': {
        if (h.warningTimer > 0) {
          ctx.globalAlpha = 0.20 + 0.20 * Math.sin(h.warningTimer * 0.28);
          ctx.fillStyle = '#ffffcc';
          ctx.fillRect(h.x - h.radius, 0, h.radius * 2, GAME_H);
        } else if (h.activeTimer > 0) {
          ctx.globalAlpha = Math.min(1, h.activeTimer / 12);
          ctx.fillStyle   = 'rgba(255,255,180,0.45)';
          ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 28;
          ctx.fillRect(h.x - h.radius, 0, h.radius * 2, GAME_H);
          ctx.fillStyle = 'rgba(255,255,255,0.80)';
          ctx.fillRect(h.x - 4, 0, 8, GAME_H);
        }
        break;
      }

      case 'void_rock': {
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle * 0.35);
        ctx.fillStyle = '#1a0033';
        ctx.shadowColor = '#9944ff'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, h.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#44007a';
        ctx.beginPath(); ctx.arc(-h.radius * 0.32, -h.radius * 0.32, h.radius * 0.48, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'shadow_clone': {
        const pulse = 0.55 + 0.25 * Math.sin(performance.now() / 200);
        ctx.globalAlpha = pulse;
        ctx.translate(h.x, h.y);
        ctx.shadowColor = '#bb44ff'; ctx.shadowBlur = 16;
        // Body silhouette — simple stickman ghost
        ctx.fillStyle = '#220033';
        ctx.beginPath(); ctx.arc(0, -26, 10, 0, Math.PI * 2); ctx.fill(); // head
        ctx.fillRect(-7, -16, 14, 22);  // torso
        ctx.fillRect(-12, 6, 8, 18);    // left leg
        ctx.fillRect(4,   6, 8, 18);    // right leg
        ctx.fillRect(-16, -14, 10, 6);  // left arm
        ctx.fillRect(6,   -14, 10, 6);  // right arm
        // Sword silhouette
        ctx.fillStyle = '#6600aa';
        ctx.fillRect(8, -30, 3, 28);    // blade
        ctx.fillRect(4, -8,  11, 3);    // guard
        break;
      }

      case 'turret': {
        ctx.translate(h.x, h.y);
        ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 12;
        // Base
        ctx.fillStyle = '#333333';
        ctx.fillRect(-h.radius, 0, h.radius * 2, 14);
        // Body
        ctx.fillStyle = '#555555';
        ctx.fillRect(-h.radius + 2, -14, h.radius * 2 - 4, 14);
        // Barrel
        ctx.fillStyle = '#888888';
        ctx.fillRect(h.facing > 0 ? h.radius - 4 : -h.radius - 8, -7, 12, 5);
        // Muzzle glow (pulses with fireTimer)
        const gPulse = Math.max(0, 1 - (h.fireTimer / 20));
        if (gPulse > 0) {
          ctx.globalAlpha = gPulse;
          ctx.fillStyle = '#ff9900';
          ctx.beginPath();
          ctx.arc(h.facing > 0 ? h.radius + 8 : -h.radius - 8, -4, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'giant_arrow': {
        if (h.phase === 'warning') {
          // Show which side it will enter from
          const alpha = 0.30 + 0.25 * Math.sin(performance.now() / 120);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#44ff88';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 8]);
          ctx.beginPath(); ctx.moveTo(OX + (h.fromLeft ? 0 : GAME_W), h.y); ctx.lineTo(OX + (h.fromLeft ? GAME_W : 0), h.y); ctx.stroke();
          ctx.setLineDash([]);
          // Chevron at entry side
          ctx.fillStyle = '#44ff88';
          const ex = OX + (h.fromLeft ? 14 : GAME_W - 14);
          ctx.beginPath();
          ctx.moveTo(ex, h.y - 12);
          ctx.lineTo(h.fromLeft ? ex + 18 : ex - 18, h.y);
          ctx.lineTo(ex, h.y + 12);
          ctx.closePath(); ctx.fill();
        } else if (h.phase === 'flying') {
          ctx.translate(h.x, h.y);
          if (!h.fromLeft) ctx.scale(-1, 1);
          ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 20;
          // Large shaft
          ctx.fillStyle = '#2a8a50';
          ctx.fillRect(-h.radius * 2, -5, h.radius * 4, 10);
          // Arrowhead
          ctx.fillStyle = '#88ffcc';
          ctx.beginPath();
          ctx.moveTo(h.radius * 2,  0);
          ctx.lineTo(h.radius * 2 - 28, -16);
          ctx.lineTo(h.radius * 2 - 28,  16);
          ctx.closePath(); ctx.fill();
          // Fletching
          ctx.fillStyle = '#44ff88';
          ctx.beginPath();
          ctx.moveTo(-h.radius * 2,  0);
          ctx.lineTo(-h.radius * 2 + 16, -12);
          ctx.lineTo(-h.radius * 2 + 8,  0);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-h.radius * 2,  0);
          ctx.lineTo(-h.radius * 2 + 16,  12);
          ctx.lineTo(-h.radius * 2 + 8,   0);
          ctx.closePath(); ctx.fill();
        }
        break;
      }

      case 'divine_shield': {
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle + Math.PI / 2);
        ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 18;
        // Kite shield shape
        ctx.fillStyle = '#ddcc44';
        ctx.beginPath();
        ctx.moveTo(0, -h.radius);
        ctx.bezierCurveTo(h.radius, -h.radius, h.radius, h.radius * 0.4, 0, h.radius * 1.3);
        ctx.bezierCurveTo(-h.radius, h.radius * 0.4, -h.radius, -h.radius, 0, -h.radius);
        ctx.fill();
        // Shield face design
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -h.radius * 0.7);
        ctx.bezierCurveTo(h.radius * 0.6, -h.radius * 0.7, h.radius * 0.6, h.radius * 0.2, 0, h.radius * 0.9);
        ctx.bezierCurveTo(-h.radius * 0.6, h.radius * 0.2, -h.radius * 0.6, -h.radius * 0.7, 0, -h.radius * 0.7);
        ctx.fill();
        // Holy glow pulse
        ctx.globalAlpha = 0.30 + 0.20 * Math.sin(performance.now() / 150);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, h.radius + 6, 0, Math.PI * 2); ctx.stroke();
        break;
      }

      case 'rage_pulse': {
        if (!owner) break;
        // Draw the expanding ring when active
        if (h.ringActive && h.ringRadius > 0) {
          const alpha = Math.max(0, 1 - h.ringRadius / (h.radius + 40));
          ctx.globalAlpha = alpha * 0.7;
          ctx.strokeStyle = '#ff2222';
          ctx.lineWidth = 4 - alpha * 2;
          ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(owner.cx(), owner.cy(), h.ringRadius, 0, Math.PI * 2); ctx.stroke();
        }
        // Constant blood aura around owner
        ctx.globalAlpha = 0.18 + 0.10 * Math.sin(performance.now() / 180);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(owner.cx(), owner.cy(), h.radius, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'gravity_vortex': {
        const now = performance.now();
        // Swirling rings
        for (let ring = 0; ring < 3; ring++) {
          const r    = 28 + ring * 22;
          const spin = now / (400 + ring * 120) + ring * Math.PI * 0.66;
          ctx.globalAlpha = 0.30 - ring * 0.07;
          ctx.strokeStyle = '#9944ff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#9944ff'; ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(h.x, h.y, r, spin, spin + Math.PI * 1.5);
          ctx.stroke();
          // Small arrow-head on the arc to show rotation direction
          const ax = h.x + Math.cos(spin + Math.PI * 1.5) * r;
          const ay = h.y + Math.sin(spin + Math.PI * 1.5) * r;
          ctx.fillStyle = '#9944ff';
          ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Core glow
        ctx.globalAlpha = 0.55 + 0.20 * Math.sin(now / 220);
        ctx.fillStyle = '#220044';
        ctx.shadowColor = '#cc66ff'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(h.x, h.y, 12, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'mjolnir': {
        ctx.globalAlpha = 1;
        ctx.translate(h.x, h.y);
        ctx.rotate(h.spinAngle);
        ctx.shadowColor = '#ffee44'; ctx.shadowBlur = 26;
        // Motion trail when striking
        if (h.state === 'strike') {
          ctx.globalAlpha = 0.38;
          ctx.fillStyle = '#aaddff';
          ctx.beginPath(); ctx.arc(-h.vx * 2.2, -h.vy * 2.2, h.radius * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // Head
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-14, -8, 28, 12);
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(-13, -7, 26, 5);
        ctx.fillStyle = '#888888';
        ctx.fillRect(-14, 3, 28, 2);
        // Handle
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-3, 4, 6, 18);
        ctx.fillStyle = '#5c2e0a';
        ctx.fillRect(-3, 7, 6, 2);
        ctx.fillRect(-3, 12, 6, 2);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(-4, 20, 8, 4);
        // Lightning glow — pulses faster when striking
        const mRate = h.state === 'strike' ? 45 : 95;
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now() / mRate);
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, -2, h.radius + 4, 0, Math.PI * 2); ctx.stroke();
        break;
      }

      case 'spirit_katana': {
        const now2 = performance.now();
        const pulse = 0.7 + 0.3 * Math.sin(now2 / 120);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.orbitAngle + (h.state === 'launch' ? Math.atan2(h.launchVy, h.launchVx) : 0));
        ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 22 * pulse;
        // Blade
        ctx.fillStyle = '#eeeeff';
        ctx.fillRect(-2, -22, 4, 40);
        ctx.fillStyle = '#aaaadd';
        ctx.fillRect(-1.5, -22, 1.5, 40);
        // Guard
        ctx.fillStyle = '#888899';
        ctx.fillRect(-7, 14, 14, 3);
        // Glow outline
        ctx.globalAlpha = 0.55 * pulse;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 18); ctx.stroke();
        ctx.restore();
        break;
      }

      case 'scythe_pendulum': {
        const bladeX2 = h.anchorX + Math.sin(h.angle) * h.armLength;
        const bladeY2 = h.anchorY + Math.cos(h.angle) * h.armLength;
        const now3 = performance.now();
        ctx.save();
        // Chain/arm
        ctx.strokeStyle = '#882288'; ctx.lineWidth = 2;
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.moveTo(h.anchorX, h.anchorY); ctx.lineTo(bladeX2, bladeY2); ctx.stroke();
        // Blade at tip
        ctx.globalAlpha = 0.85 + 0.15 * Math.sin(now3 / 160);
        ctx.translate(bladeX2, bladeY2);
        ctx.rotate(h.angle + Math.PI * 0.5);
        ctx.shadowColor = '#dd66dd'; ctx.shadowBlur = 20;
        ctx.strokeStyle = '#dd66dd'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 28, -Math.PI * 0.7, Math.PI * 0.1); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 28, -Math.PI * 0.7, Math.PI * 0.1); ctx.stroke();
        // Handle spike
        ctx.strokeStyle = '#662266'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 18); ctx.stroke();
        ctx.restore();
        break;
      }

      case 'surge_fist': {
        if (h.phase !== 'flying') break;
        const now4 = performance.now();
        const fpulse = 0.8 + 0.2 * Math.sin(now4 / 90);
        ctx.save();
        ctx.translate(h.x, h.y);
        if (!h.fromLeft) ctx.scale(-1, 1);
        ctx.shadowColor = '#ee4444'; ctx.shadowBlur = 22 * fpulse;
        // Main fist body
        ctx.fillStyle = '#cc2222';
        ctx.beginPath(); ctx.roundRect(-h.radius, -h.radius, h.radius * 2, h.radius * 2 - 4, 10); ctx.fill();
        // Knuckles
        ctx.fillStyle = '#ff6666';
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.arc(k * 9, -h.radius + 4, 5, 0, Math.PI * 2); ctx.fill();
        }
        // Impact glow on front
        ctx.globalAlpha = fpulse * 0.5;
        ctx.fillStyle = '#ffaaaa';
        ctx.beginPath(); ctx.arc(h.radius - 6, 0, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }

      case 'chaos_bolt': {
        const _cbPulse = 0.7 + 0.3 * Math.sin(performance.now() / 90);
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14 * _cbPulse;
        ctx.fillStyle = '#dddddd';
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath(); ctx.arc(h.x - h.vx * 2.2, h.y - h.vy * 2.2, h.radius * 0.6, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'rage_spray': {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 14;
        // Platform base
        ctx.fillStyle = '#441111';
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
        // Rotating barrel
        ctx.rotate(h.angle);
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(0, -3, 17, 6);
        // Muzzle glow
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 50);
        ctx.fillStyle = '#ff6666';
        ctx.beginPath(); ctx.arc(17, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }

      case 'arc_salvo': {
        // Invisible fire source — draws a faint pulsing sigil at owner position
        // (The bolts it creates use bullet draw code)
        break;
      }

      case 'elec_pulse': {
        const _epNow = performance.now();
        const _epPulse = 0.5 + 0.5 * Math.sin(_epNow / 160);
        for (const px of [h.pillarX1, h.pillarX2]) {
          ctx.save();
          ctx.globalAlpha = 0.28 + _epPulse * 0.22;
          ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 20;
          ctx.strokeStyle = '#00ddff'; ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, GAME_H); ctx.stroke();
          ctx.setLineDash([]);
          // Base glow
          ctx.globalAlpha = 0.65 * _epPulse;
          ctx.fillStyle = '#003344';
          ctx.beginPath(); ctx.ellipse(px, GAME_H - 10, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 2; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.ellipse(px, GAME_H - 10, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        // Active arc between pillars (visible for 12 frames after trigger)
        if (h.arcTimer > h.arcEvery - 14) {
          const _arcFade = (h.arcEvery - h.arcTimer) / 14;
          const _mx = (h.pillarX1 + h.pillarX2) / 2;
          ctx.save();
          ctx.globalAlpha = _arcFade;
          ctx.shadowColor = '#00eeff'; ctx.shadowBlur = 18;
          ctx.strokeStyle = '#00eeff'; ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(h.pillarX1, GAME_H * 0.5);
          ctx.lineTo(_mx + (Math.random() - 0.5) * 44, GAME_H * 0.28);
          ctx.lineTo(h.pillarX2, GAME_H * 0.5);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(h.pillarX1, GAME_H * 0.5);
          ctx.lineTo(_mx + (Math.random() - 0.5) * 28, GAME_H * 0.28);
          ctx.lineTo(h.pillarX2, GAME_H * 0.5);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }

      case 'blood_blade': {
        if (h.phase !== 'flying') break;
        ctx.save();
        ctx.translate(h.x, h.y);
        const _bbAng = Math.atan2(h.vy || 0, h.vx || 1);
        ctx.rotate(_bbAng + Math.PI * 0.5);
        ctx.shadowColor = '#ff2222'; ctx.shadowBlur = 16;
        // Bloody crescent slash mark
        ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, h.radius * 1.4, -Math.PI * 0.7, Math.PI * 0.1); ctx.stroke();
        ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, h.radius * 1.4, -Math.PI * 0.7, Math.PI * 0.1); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#aa0000';
        ctx.beginPath(); ctx.arc(0, 0, h.radius * 1.4, -Math.PI * 0.7, Math.PI * 0.1); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }

      case 'blades_of_chaos': {
        if (h.phase !== 'sweep') break;
        ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 20;
        // Draw chain from center to tip
        const segments = 8;
        const segLen = h.armLength / segments;
        for (let s = 0; s < segments; s++) {
          const t0 = s / segments, t1 = (s + 1) / segments;
          const x0 = h.x + Math.cos(h.angle) * h.armLength * t0;
          const y0 = h.y + Math.sin(h.angle) * h.armLength * t0;
          const x1 = h.x + Math.cos(h.angle) * h.armLength * t1;
          const y1 = h.y + Math.sin(h.angle) * h.armLength * t1;
          // Chain link (alternating rectangles)
          ctx.fillStyle = s % 2 === 0 ? '#cc3300' : '#ff6600';
          ctx.globalAlpha = 0.9 - s * 0.06;
          ctx.beginPath();
          ctx.moveTo(x0, y0 - 4); ctx.lineTo(x1, y1 - 4);
          ctx.lineTo(x1, y1 + 4); ctx.lineTo(x0, y0 + 4);
          ctx.closePath(); ctx.fill();
        }
        // Blade tip — glowing fire point
        const tipX = h.x + Math.cos(h.angle) * h.armLength;
        const tipY = h.y + Math.sin(h.angle) * h.armLength;
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.arc(tipX, tipY, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6600';
        ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(tipX, tipY, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, Math.PI * 2); ctx.fill();
        break;
      }

    }
    ctx.restore();
  }

  // ── Draw — speech bubbles (world-space; call after entities) ──────

  function drawSpeechBubbles() {
    for (const r of _rising) {
      const f   = r.fighter;
      const def = DOMAIN_DEFS[_domainKeyOf(f)];
      if (!def) continue;

      const progress = 1 - r.timer / RISE_FRAMES;
      const alpha    = Math.min(1, progress * 2.5);
      if (alpha < 0.04) continue;

      ctx.save();
      ctx.globalAlpha = alpha;

      const bx    = f.cx();
      const by    = f.y - 14;
      const line1 = _domainKeyOf(f) === 'sovereign' ? 'DOMAIN EXPANSION' : 'CONVICTION';
      const line2 = def.name;

      ctx.font = 'bold 13px Arial';
      const w1 = ctx.measureText(line1).width;
      ctx.font = 'bold 11px Arial';
      const w2 = ctx.measureText(line2).width;
      const bW  = Math.max(w1, w2) + 22;
      const bH  = 44;
      const top = by - bH - 8;

      // Bubble
      ctx.fillStyle   = 'rgba(255,255,255,0.93)';
      ctx.strokeStyle = def.color;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx - bW / 2, top, bW, bH, 8);
      else { ctx.rect(bx - bW / 2, top, bW, bH); }
      ctx.fill(); ctx.stroke();

      // Tail
      ctx.fillStyle   = 'rgba(255,255,255,0.93)';
      ctx.strokeStyle = def.color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - 6, top + bH);
      ctx.lineTo(bx + 6, top + bH);
      ctx.lineTo(bx, top + bH + 9);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111';
      ctx.font = 'bold 13px Arial';
      ctx.shadowBlur = 0;
      ctx.fillText(line1, bx, top + 18);
      ctx.fillStyle   = def.color;
      ctx.shadowColor = def.color;
      ctx.shadowBlur  = 8;
      ctx.font = 'bold 11px Arial';
      ctx.fillText(line2, bx, top + 35);

      ctx.restore();
    }
  }

  // ── Draw — HUD (screen-space; call after ctx.setTransform(1,0,0,1,0,0)) ──

  function drawHUD() {
    if (_domains.length === 0) return;
    const cW = canvas.width, cH = canvas.height;
    const DOMAIN_BAR_W = 160, DOMAIN_BAR_H = 8;
    const now = performance.now();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let yOff = cH * 0.09;
    for (const domain of _domains) {
      const frac  = domain.timer / DOMAIN_FRAMES;
      const secs  = Math.ceil(domain.timer / 60);
      const bx    = cW / 2 - DOMAIN_BAR_W / 2;
      const pulse = frac <= (5 / 25) ? (0.85 + 0.15 * Math.sin(now / 100)) : 1;

      // Domain name
      ctx.font      = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle   = domain.def.color;
      ctx.shadowColor = domain.def.color;
      ctx.shadowBlur  = 10;
      ctx.fillText(domain.def.name, cW / 2, yOff);

      // Bar background
      ctx.shadowBlur = 0;
      ctx.fillStyle  = 'rgba(0,0,0,0.52)';
      ctx.fillRect(bx, yOff + 4, DOMAIN_BAR_W, DOMAIN_BAR_H);

      // Bar fill
      ctx.fillStyle = domain.def.color;
      ctx.fillRect(bx, yOff + 4, DOMAIN_BAR_W * frac * pulse, DOMAIN_BAR_H);

      // Seconds label
      ctx.fillStyle   = '#ffffff';
      ctx.font        = '11px Arial';
      ctx.textAlign   = 'center';
      ctx.fillText(secs + 's', cW / 2 + DOMAIN_BAR_W / 2 + 18, yOff + 12);

      yOff += 30;
    }
    ctx.restore();
  }

  function reset() {
    for (const domain of _domains) _clearOwnerBuffs(domain.owner);
    for (const r of _rising) {
      if (!r || !r.fighter) continue;
      r.fighter._domainRising    = false;
      r.fighter._domainRiseTimer = 0;
      delete r.fighter._domainSuperCount;
    }
    _domains.length = 0;
    _rising.length  = 0;
    // Clear any lingering ninja time dilation
    if (typeof players !== 'undefined') {
      for (const p of players) {
        if (p && p._domainSlowFactor !== undefined) { p._domainSlowFactor = 1; p._domainSlowAccum = 0; }
      }
    }
    if (_domainCinOwner && typeof CinFX !== 'undefined') CinFX.motionTrailOff(_domainCinOwner);
    if (_domainCinActive && typeof CinCam !== 'undefined') CinCam.restore();
    _domainCinActive = false;
    _domainCinOwner  = null;
  }

  return {
    triggerExpansion,
    domainKeyOf: _domainKeyOf,
    ownsDomain,
    onFighterDied,
    anyActive,
    reset,
    update,
    draw,
    drawHazards,
    drawSpeechBubbles,
    drawHUD,
    get domains() { return _domains; },
    get rising()  { return _rising; },
  };
})();
