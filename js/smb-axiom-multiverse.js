// ═══════════════════════════════════════════════════════════════════════════
// ABSOLUTE AXIOM — THE MULTIVERSE FIGHT
//
// The standalone Absolute Axiom fight crosses four locations, one per HP band.
// Each location changes how the fight plays, not just how it looks:
//   100–75%  BROKEN BRANCH     — street slabs collapse, building debris falls
//    75–50%  NAMELESS WORLD    — low gravity, telegraphed meteor strikes
//    50–25%  DEAD UNIVERSE     — darkness; the last stars collapse into black holes
//    25–0%   BETWEEN BRANCHES  — no ground, drifting islands, ring-outs hurt both
// The Dimension Punch is the transition: the world freezes and a full-frame
// cutscene follows the player's real fighter across the universe, smashing
// through asteroids and a planet, until it crashes down in the next location.
//
// Hazards hit AA too (credited to the player), so luring him under debris,
// into a meteor or a collapsed star is real damage.
//
// Story mode (ch 167/169) is untouched — it keeps the original single arena.
// Depends on: smb-absolute-axiom.js (AbsoluteAxiom), smb-data-arenas.js (ARENAS).
// Hooks: AbsoluteAxiom.update/draw/_pickSpecial, gameLoop (flight takeover,
// world draw, screen overlay).
// ═══════════════════════════════════════════════════════════════════════════

const AA_WORLDS = [
  {
    key: 'aa_branch', at: 1.00,
    name: 'BROKEN BRANCH', sub: 'Your city. A version of it that lost.',
    rule: 'The street is collapsing. Debris hits him too.',
    col: '#ff7a3a', globe: ['#ffb070', '#7a2a10', '#1a0805'],
    favor: ['_doColumnBarrage', '_doKernelPulse', '_doAbsoluteStrike'],
    line: 'This place is too small for what you are about to lose.',
  },
  {
    key: 'aa_planet', at: 0.75,
    name: 'NAMELESS WORLD', sub: 'Somewhere nobody named.',
    rule: 'Low gravity. Watch the sky.',
    col: '#4fe0c8', globe: ['#9ff5e0', '#2a7a78', '#06201f'],
    favor: ['_doAerialSlam', '_doVoidRain', '_doGenesisStar'],
    line: 'Let us see how you fight where the ground lets go of you.',
  },
  {
    key: 'aa_dead', at: 0.50,
    name: 'DEAD UNIVERSE', sub: 'Every star here has already gone out.',
    rule: 'Stay near the light. The last stars are collapsing.',
    col: '#9aa4c8', globe: ['#5a5e70', '#1a1c26', '#000000'],
    favor: ['_doSingularity', '_doKernelBeam', '_doTemporalCrush'],
    line: 'Here, the light ran out a long time ago. So will you.',
  },
  {
    key: 'aa_between', at: 0.25,
    name: 'BETWEEN BRANCHES', sub: 'The space the multiverse is built on.',
    rule: 'No ground. Falling costs you. Knock him off right after a hit.',
    col: '#c070ff', globe: ['#ffffff', '#9a40ff', '#14002a'],
    favor: ['_doDimShattering', '_doAbsoluteStrike', '_doVoidRain'],
    line: 'No ground. No branch. No witnesses.',
  },
];

// ── Arenas ────────────────────────────────────────────────────────────────────
// Registered here (not in smb-data-arenas.js) so the whole fight lives in one
// file. Never randomized: randomizeArenaLayout() has no base layout for them.
ARENAS.aa_branch = {
  name: 'Broken Branch',
  sky: ['#1a0a10', '#4a1a14', '#7a3418'],
  groundColor: '#1c1618', platColor: '#3a3236', platEdge: '#ff7a3a',
  hasLava: false, deathY: 640, isBossArena: true, isAAWorld: true,
  platforms: [
    { x: 270, y: 460, w: 360, h: 60, isFloor: true },   // centre street — never collapses
    { x: -60, y: 460, w: 330, h: 60, _aaSlab: true },    // left street slab
    { x: 630, y: 460, w: 330, h: 60, _aaSlab: true },    // right street slab
    { x: 70,  y: 300, w: 150, h: 16 },                   // left rooftop
    { x: 680, y: 300, w: 150, h: 16 },                   // right rooftop
    { x: 360, y: 230, w: 180, h: 16 },                   // overpass
    { x: 190, y: 140, w: 110, h: 14 },
    { x: 600, y: 140, w: 110, h: 14 },
  ],
};
ARENAS.aa_planet = {
  name: 'Nameless World',
  sky: ['#05141c', '#123a44', '#2f6a64'],
  groundColor: '#20302c', platColor: '#3a5048', platEdge: '#4fe0c8',
  hasLava: false, deathY: 640, isBossArena: true, isAAWorld: true,
  isLowGravity: true,
  platforms: [
    { x: -60, y: 470, w: 1020, h: 50, isFloor: true },
    { x: 110, y: 330, w: 130, h: 16 },                   // mesa tops
    { x: 660, y: 330, w: 130, h: 16 },
    { x: 380, y: 250, w: 140, h: 16 },
    { x: 60,  y: 160, w: 110, h: 14 },
    { x: 730, y: 160, w: 110, h: 14 },
    { x: 395, y: 80,  w: 110, h: 14 },
  ],
};
ARENAS.aa_dead = {
  name: 'Dead Universe',
  sky: ['#000000', '#04040a', '#08080e'],
  groundColor: '#0a0a0e', platColor: '#1a1a22', platEdge: '#3a3c50',
  hasLava: false, deathY: 640, isBossArena: true, isAAWorld: true,
  platforms: [
    { x: -60, y: 470, w: 1020, h: 50, isFloor: true },
    { x: 90,  y: 320, w: 140, h: 16 },
    { x: 670, y: 320, w: 140, h: 16 },
    { x: 360, y: 300, w: 180, h: 16 },
    { x: 220, y: 190, w: 120, h: 14 },
    { x: 560, y: 190, w: 120, h: 14 },
  ],
};
ARENAS.aa_between = {
  name: 'Between Branches',
  sky: ['#0a0018', '#1a0838', '#06000e'],
  groundColor: '#14062a', platColor: '#2a1450', platEdge: '#c070ff',
  hasLava: false, deathY: 900, isBossArena: true, isAAWorld: true,
  noGroundFill: true,
  platforms: [
    { x: 340, y: 400, w: 220, h: 22, isFloor: true },   // anchor island — never drifts
    { x: 60,  y: 320, w: 150, h: 16, _aaDrift: { ax: 55, ay: 22, sp: 0.007, ph: 0.0 } },
    { x: 690, y: 320, w: 150, h: 16, _aaDrift: { ax: 55, ay: 22, sp: 0.007, ph: 2.1 } },
    { x: 190, y: 205, w: 120, h: 14, _aaDrift: { ax: 40, ay: 30, sp: 0.009, ph: 1.0 } },
    { x: 590, y: 205, w: 120, h: 14, _aaDrift: { ax: 40, ay: 30, sp: 0.009, ph: 3.3 } },
    { x: 380, y: 110, w: 140, h: 14, _aaDrift: { ax: 70, ay: 12, sp: 0.005, ph: 0.6 } },
  ],
};
for (const _w of AA_WORLDS) {
  for (const pl of ARENAS[_w.key].platforms) { pl._bx = pl.x; pl._by = pl.y; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _aaMvHero() {
  if (typeof players === 'undefined') return null;
  return players.find(p => p && !p.isRemote && !p.isAI && p.health > 0) || players[0] || null;
}

function _aaMvFighters() {
  const out = [];
  if (typeof players !== 'undefined') for (const p of players) if (p && p.health > 0) out.push(p);
  if (typeof minions !== 'undefined') for (const m of minions) if (m && m.health > 0) out.push(m);
  return out;
}

// Highest walkable surface under x (smallest y), or GAME_H if none.
function _aaMvGroundY(x) {
  let best = GAME_H;
  if (!currentArena) return best;
  for (const pl of currentArena.platforms) {
    if (pl.isFloorDisabled) continue;
    if (x >= pl.x && x <= pl.x + pl.w && pl.y < best && pl.y > 60) best = pl.y;
  }
  return best;
}

// Hazard on AA: a fixed fraction of max HP, credited to the player.
function _aaMvHurtBoss(aa, frac, kb) {
  const hero = _aaMvHero();
  if (!hero || !aa || aa.health <= 0 || aa._portalInvincible) return;
  if (typeof dealDamage !== 'function') return;
  const mult = hero.dmgMult || 1;
  dealDamage(hero, aa, Math.max(1, Math.round(aa.maxHealth * frac / mult)), kb || 0);
}

// Hazard on anyone else: environmental damage (capped at 14/frame in dealDamage).
function _aaMvHurt(f, dmg, pushX, pushY) {
  if (!f || f.health <= 0 || typeof dealDamage !== 'function') return;
  const before = f.health;
  dealDamage(null, f, dmg, 0);
  if (f.health < before) {
    if (pushX) f.vx = pushX;
    if (pushY) { f.vy = pushY; f.onGround = false; }
  }
}

function _aaMvRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ══════════════════════════════════════════════════════════════════════════════
// Controller
// ══════════════════════════════════════════════════════════════════════════════
const AAMultiverse = {
  idx: -1,          // index into AA_WORLDS of the current location, -1 = not started
  trans: null,      // { to, stage:'wait'|'windup'|'arrive', t }
  flight: null,     // active flight cutscene (owns the whole frame)
  card: null,       // { w, t } location title card after landing
  hz: null,         // per-location hazard state
  _aa: null,
  _lastHp: 0,
  _lastHitF: -9999,
  _opener: 90,
  _dark: null,

  reset() {
    this.idx = -1; this.trans = null; this.flight = null; this.card = null;
    this.hz = null; this._aa = null; this._lastHp = 0; this._lastHitF = -9999; this._opener = 90;
    for (const w of AA_WORLDS) {
      for (const pl of ARENAS[w.key].platforms) {
        pl.x = pl._bx; pl.y = pl._by; pl.isFloorDisabled = false;
        delete pl._aaCrack; delete pl._aaFall;
      }
    }
  },

  enabled() {
    return !(typeof storyModeActive !== 'undefined' && storyModeActive);
  },

  inWorld() {
    return this.idx >= 0 && currentArenaKey === AA_WORLDS[this.idx].key && !!this._aa && this._aa.health > 0;
  },

  // AA.update returns early while this is true (windup is scripted, arrival is off-screen).
  holdBoss(aa) {
    if (!this.enabled() || aa !== this._aa || !this.trans) return false;
    return this.trans.stage === 'windup' || this.trans.stage === 'arrive';
  },

  // AA.draw returns early while this is true.
  hideBoss(aa) {
    if (aa._aaMvFlightDraw) return false;
    if (!this.enabled() || aa !== this._aa) return false;
    return !!this.flight || (this.trans && this.trans.stage === 'arrive');
  },

  // Called first thing in AbsoluteAxiom.update().
  tick(aa) {
    if (!this.enabled() || !aa || aa.health <= 0) return;
    if (this._aa !== aa) { this.reset(); this._aa = aa; this._lastHp = aa.health; }
    if (aa.health < this._lastHp) this._lastHitF = frameCount;
    this._lastHp = aa.health;

    if (this.idx < 0 && !this.trans) {
      const here = AA_WORLDS.findIndex(w => w.key === currentArenaKey);
      if (here >= 0) this._enterWorld(here, false);
      else if (--this._opener <= 0) this.trans = { to: 0, stage: 'wait', t: 0 };
    } else if (!this.trans) {
      const next = this.idx + 1;
      if (next < AA_WORLDS.length && aa.health / aa.maxHealth <= AA_WORLDS[next].at)
        this.trans = { to: next, stage: 'wait', t: 0 };
    }

    if (this.trans) this._tickTrans(aa);
    if (this.inWorld() && !(this.trans && this.trans.stage !== 'wait')) this._tickRules(aa);
    if (this.card && --this.card.t <= 0) this.card = null;
  },

  // One extra roll in AA's special picker: the location's favoured attacks.
  favorPick(aa) {
    if (!this.inWorld() || aa !== this._aa) return null;
    const fav = AA_WORLDS[this.idx].favor.filter(m => typeof aa[m] === 'function');
    if (!fav.length || Math.random() > 0.40) return null;
    return fav[Math.floor(Math.random() * fav.length)];
  },

  // ── Transition: wait → windup → (flight) → arrive ──────────────────────────
  _tickTrans(aa) {
    const tr = this.trans;
    const hero = _aaMvHero();
    tr.t++;
    if (tr.stage === 'wait') {
      const blocked =
        (typeof isCinematic !== 'undefined' && isCinematic) ||
        (typeof activeCinematic !== 'undefined' && activeCinematic) ||
        (typeof activeFinisher !== 'undefined' && activeFinisher) ||
        (typeof QTE_STATE !== 'undefined' && QTE_STATE) ||
        aa._finalAssaultPending || aa._finalAssaultDelay > 0 ||
        !hero || hero.health <= 0;
      if (blocked) return;
      tr.stage = 'windup'; tr.t = 0;
      this._clearBossFx(aa);
      const side = hero.cx() < GAME_W / 2 ? 1 : -1;   // AA steps in on the open side
      aa.x = Math.max(18, Math.min(GAME_W - aa.w - 18, hero.cx() + side * 70 - aa.w / 2));
      aa.y = hero.y + hero.h - aa.h;
      aa.vx = 0; aa.vy = 0;
      aa.facing = -side;
      aa.invincible = Math.max(aa.invincible || 0, 600);
      hero.invincible = Math.max(hero.invincible || 0, 600);
      tr.dir = -side;
      _aaAttackName('DIMENSION PUNCH');
      if (typeof showBossDialogue === 'function') showBossDialogue(AA_WORLDS[tr.to].line, 200);
      if (typeof CinFX !== 'undefined') CinFX.flash('#000000', 0.45, 20);
      if (typeof spawnParticles === 'function') spawnParticles(aa.cx(), aa.cy(), '#cc00ff', 22);
      return;
    }
    if (tr.stage === 'windup') {
      if (!hero) { this.trans = null; return; }
      hero.vx *= 0.5;
      aa._auraPhase = (aa._auraPhase || 0) + 0.2;
      if (tr.t === 30 && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
      if (tr.t >= 48) {
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 40);
        if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.95, 10);
        this.flight = this._makeFlight(tr.to, hero, aa);
        tr.stage = 'flight';
      }
      return;
    }
    if (tr.stage === 'arrive') {
      aa.invincible = Math.max(aa.invincible || 0, 4);
      if (tr.t === 40 && typeof spawnParticles === 'function') {
        spawnParticles(tr.ax, tr.ay, '#cc00ff', 30);
        spawnParticles(tr.ax, tr.ay, '#ffffff', 14);
      }
      if (tr.t >= 70) {
        aa.x = tr.ax - aa.w / 2; aa.y = tr.ay - aa.h;
        aa.vx = 0; aa.vy = 0;
        aa._locomotionMode = 'walk';
        aa.invincible = 30;
        aa._specialCd = Math.max(aa._specialCd || 0, 90);
        aa._attackCd  = Math.max(aa._attackCd || 0, 50);
        if (typeof CinFX !== 'undefined') CinFX.flash('#8800ff', 0.5, 16);
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
        if (typeof spawnParticles === 'function') spawnParticles(aa.cx(), aa.cy(), '#ff2266', 26);
        this.trans = null;
      }
    }
  },

  _clearBossFx(aa) {
    aa._kernelPulseRings = []; aa._voidSpears = []; aa._columnBarrage = []; aa._aaNova = [];
    aa._kernelBeam = null; aa._singularity = null; aa._genesisStar = null;
    aa._absoluteStrike = null; aa._aerialSlam = null;
    aa._meleeWindup = 0; aa._meleeRecover = 0; aa._meleeWindupTarget = null;
    aa._dashFrames = 0; aa._smiteTimer = 0; aa._locomotionMode = 'walk';
    if (aa._temporalActive) { aa._temporalActive = false; if (typeof slowMotion !== 'undefined') slowMotion = 1.0; }
    aa._shatterTimer = 0;
    if (Array.isArray(aa._columns))    aa._columns.length = 0;
    if (Array.isArray(aa._novaRings))  aa._novaRings.length = 0;
    if (Array.isArray(aa._smiteRings)) aa._smiteRings.length = 0;
    if (typeof tfGravityInverted !== 'undefined') tfGravityInverted = false;
  },

  // Flight finished: swap to the destination and drop the player in from the sky.
  _land() {
    const tr = this.trans, aa = this._aa;
    this.flight = null;
    if (!tr || !aa) { this.trans = null; return; }
    this._enterWorld(tr.to, true);

    // Cleared on arrival: AA's summons and everything in flight belong to the old place.
    if (typeof projectiles !== 'undefined') projectiles = [];
    if (typeof minions !== 'undefined') minions = minions.filter(m => m === aa || m.isAAPortalAlly);
    this._clearBossFx(aa);

    const hero = _aaMvHero();
    const w = AA_WORLDS[tr.to];
    const landX = tr.to === 3 ? 450 : (tr.dir > 0 ? 260 : 640);
    for (const p of players) {
      if (!p) continue;
      p.spawnX = 450; p.spawnY = _aaMvGroundY(450);
      if (p.health <= 0) continue;
      p.x = landX - p.w / 2; p.y = -80;
      p.vx = tr.dir * 3; p.vy = 16; p.onGround = false;
      p.invincible = 120;   // replaces the windup's 600-frame lock
      p._aaMvLanding = true;
    }
    tr.stage = 'arrive'; tr.t = 0;
    tr.ax = landX > 450 ? 220 : 680;
    tr.ay = _aaMvGroundY(tr.ax);
    aa.x = -400; aa.y = -400; aa.vx = 0; aa.vy = 0;
    this.card = { w, t: 240 };
    if (hero && typeof showBossDialogue === 'function') showBossDialogue(w.rule, 260);
  },

  _enterWorld(i, swap) {
    this.idx = i;
    const w = AA_WORLDS[i];
    if (swap) {
      currentArenaKey = w.key;
      currentArena = ARENAS[w.key];
      if (typeof initMapPerks === 'function') initMapPerks(w.key);
      if (typeof generateBgElements === 'function') generateBgElements();
    }
    for (const pl of ARENAS[w.key].platforms) {
      pl.x = pl._bx; pl.y = pl._by; pl.isFloorDisabled = false;
      delete pl._aaCrack; delete pl._aaFall;
    }
    this.hz = {
      t: 0,
      debris: [], nextDebris: 150, nextCollapse: 420,    // branch
      meteors: [], nextMeteor: 160,                      // planet
      stars: [                                            // dead universe
        { x: 150, y: 120, st: 'lit', t: 380 },
        { x: 450, y: 70,  st: 'lit', t: 640 },
        { x: 750, y: 120, st: 'lit', t: 900 },
      ],
      rifts: [],                                          // between: ring-out flashes
    };
  },

  // ── Per-location rules ─────────────────────────────────────────────────────
  _tickRules(aa) {
    const hz = this.hz; if (!hz) return;
    hz.t++;
    const hero = _aaMvHero();
    const k = AA_WORLDS[this.idx].key;
    // Landing impact: the first touchdown after a flight cracks the ground.
    if (hero && hero._aaMvLanding && hero.onGround) {
      hero._aaMvLanding = false;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 30);
      if (typeof spawnParticles === 'function') {
        spawnParticles(hero.cx(), hero.y + hero.h, AA_WORLDS[this.idx].col, 30);
        spawnParticles(hero.cx(), hero.y + hero.h, '#ffffff', 12);
      }
      if (typeof CinFX !== 'undefined' && CinFX.groundCrack) {
        try { CinFX.groundCrack(hero.cx(), hero.y + hero.h, { count: 7, color: AA_WORLDS[this.idx].col }); } catch (e) {}
      }
    }
    if (k === 'aa_branch')  this._rulesBranch(aa, hz, hero);
    if (k === 'aa_planet')  this._rulesPlanet(aa, hz, hero);
    if (k === 'aa_dead')    this._rulesDead(aa, hz, hero);
    if (k === 'aa_between') this._rulesBetween(aa, hz, hero);
  },

  // AbsoluteAxiom._aaFallRecover() calls this when he starts flying back from a
  // fall. Between branches, being knocked off right after a hit still costs him.
  onBossFall(aa) {
    if (!this.inWorld() || aa !== this._aa) return;
    if (AA_WORLDS[this.idx].key !== 'aa_between' || frameCount - this._lastHitF >= 50) return;
    aa.invincible = 0;   // the hit's own i-frames would otherwise swallow it
    _aaMvHurtBoss(aa, 0.02, 0);
    if (typeof showBossDialogue === 'function') showBossDialogue('…You knocked me into the space between.', 150);
  },

  _rulesBranch(aa, hz, hero) {
    const slabs = currentArena.platforms.filter(pl => pl._aaSlab);
    // Collapse: a side slab cracks for 90f, drops for 420f, then the branch re-knits it.
    if (--hz.nextCollapse <= 0) {
      const live = slabs.filter(pl => !pl._aaCrack && !pl.isFloorDisabled);
      const pick = live.length ? live[Math.floor(Math.random() * live.length)] : null;
      if (pick) {
        pick._aaCrack = 90;
        if (typeof showBossDialogue === 'function') showBossDialogue('The street is giving way.', 120);
      }
      hz.nextCollapse = 600 + Math.floor(Math.random() * 240);
    }
    for (const pl of slabs) {
      if (pl._aaCrack > 0) {
        pl._aaCrack--;
        if (pl._aaCrack % 12 === 0 && typeof spawnParticles === 'function')
          spawnParticles(pl.x + Math.random() * pl.w, pl.y, '#8a7a70', 4);
        if (pl._aaCrack === 0) {
          pl.isFloorDisabled = true; pl._aaFall = 420;
          if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 16);
          if (typeof spawnParticles === 'function')
            for (let i = 0; i < 5; i++) spawnParticles(pl.x + (i + 0.5) * pl.w / 5, pl.y + 10, '#5a4a44', 8);
        }
      } else if (pl._aaFall > 0 && --pl._aaFall === 0) {
        pl.isFloorDisabled = false;
        if (typeof spawnParticles === 'function') spawnParticles(pl.x + pl.w / 2, pl.y, '#ff7a3a', 16);
      }
    }
    // Debris: a shadow marks the spot for 75f, then a slab of building lands there.
    if (--hz.nextDebris <= 0) {
      const onBoss = Math.random() < 0.35;
      const src = onBoss ? aa : hero;
      if (src) {
        const x = Math.max(40, Math.min(GAME_W - 40, src.cx() + (Math.random() - 0.5) * 120));
        hz.debris.push({ x, gy: _aaMvGroundY(x), t: 0, warn: 75, fall: 18, w: 70 + Math.random() * 40, rot: (Math.random() - 0.5) * 0.6 });
      }
      const frac = aa.health / aa.maxHealth;
      hz.nextDebris = Math.round((frac > 0.85 ? 200 : 150) + Math.random() * 80);
    }
    for (let i = hz.debris.length - 1; i >= 0; i--) {
      const d = hz.debris[i];
      d.t++;
      if (d.t === d.warn + d.fall) {
        const r = d.w * 0.6;
        for (const f of _aaMvFighters()) {
          if (Math.abs(f.cx() - d.x) > r + f.w / 2) continue;
          if (Math.abs((f.y + f.h) - d.gy) > 90) continue;
          if (f === aa) {
            _aaMvHurtBoss(aa, 0.012, 0);
            if ((aa._stunImmune || 0) <= 0) aa._stunFrames = Math.max(aa._stunFrames || 0, 30);
          } else _aaMvHurt(f, 14, Math.sign(f.cx() - d.x || 1) * 7, -6);
        }
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
        if (typeof spawnParticles === 'function') {
          spawnParticles(d.x, d.gy, '#6a5a50', 16);
          spawnParticles(d.x, d.gy, '#ffaa66', 6);
        }
      }
      if (d.t > d.warn + d.fall + 50) hz.debris.splice(i, 1);
    }
  },

  _rulesPlanet(aa, hz, hero) {
    // Meteors: a reticle marks the impact for 65f, then a meteor comes in at an angle.
    if (--hz.nextMeteor <= 0) {
      const targets = [hero, aa].filter(Boolean);
      for (const tgt of targets) {
        const x = Math.max(40, Math.min(GAME_W - 40, tgt.cx() + (Math.random() - 0.5) * 90));
        const dir = Math.random() < 0.5 ? -1 : 1;
        hz.meteors.push({ x, gy: _aaMvGroundY(x), t: 0, warn: 65, fall: 22, dir, r: 14 + Math.random() * 6 });
      }
      const frac = (aa.health / aa.maxHealth - 0.5) / 0.25;   // 1 at band start → 0 at band end
      hz.nextMeteor = Math.round(110 + Math.max(0, frac) * 70 + Math.random() * 50);
    }
    for (let i = hz.meteors.length - 1; i >= 0; i--) {
      const m = hz.meteors[i];
      m.t++;
      if (m.t === m.warn + m.fall) {
        for (const f of _aaMvFighters()) {
          const dx = f.cx() - m.x, dy = (f.y + f.h / 2) - m.gy;
          if (Math.hypot(dx, dy) > 72) continue;
          if (f === aa) _aaMvHurtBoss(aa, 0.01, 0);
          else _aaMvHurt(f, 14, Math.sign(dx || 1) * 9, -9);
        }
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
        if (typeof spawnParticles === 'function') {
          spawnParticles(m.x, m.gy, '#ffcc66', 18);
          spawnParticles(m.x, m.gy, '#4fe0c8', 10);
        }
      }
      if (m.t > m.warn + m.fall + 40) hz.meteors.splice(i, 1);
    }
  },

  _rulesDead(aa, hz, hero) {
    // Each of the last three stars burns, flickers for 90f, then collapses into a
    // black hole for 220f that pulls everyone in and hurts at the core.
    for (const s of hz.stars) {
      s.t--;
      if (s.st === 'lit' && s.t <= 0)        { s.st = 'dying'; s.t = 90; }
      else if (s.st === 'dying' && s.t <= 0) {
        s.st = 'hole'; s.t = 220;
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 20);
        if (typeof CinFX !== 'undefined') CinFX.flash('#000000', 0.5, 14);
        if (typeof showBossDialogue === 'function') showBossDialogue('Another one goes out.', 110);
      } else if (s.st === 'hole' && s.t <= 0) {
        s.st = 'lit'; s.t = 480 + Math.floor(Math.random() * 240);
        if (typeof spawnParticles === 'function') spawnParticles(s.x, s.y, '#fff4d0', 24);
      }
      if (s.st !== 'hole') continue;
      for (const f of _aaMvFighters()) {
        const dx = s.x - f.cx(), dy = s.y - (f.y + f.h / 2);
        const d = Math.hypot(dx, dy);
        if (d > 340 || d < 1) continue;
        const pull = 2.6 * (1 - d / 340);
        f.x += dx / d * pull;
        if (!f.onGround) f.vy += dy / d * pull * 0.25;
        if (d < 46 && hz.t % 20 === 0) {
          if (f === aa) _aaMvHurtBoss(aa, 0.006, 0);
          else _aaMvHurt(f, 14, 0, 0);
        }
      }
    }
  },

  _rulesBetween(aa, hz, hero) {
    // Islands drift; anyone standing on one rides it.
    for (const pl of currentArena.platforms) {
      const dr = pl._aaDrift; if (!dr) continue;
      const nx = pl._bx + Math.sin(hz.t * dr.sp + dr.ph) * dr.ax;
      const ny = pl._by + Math.cos(hz.t * dr.sp * 1.3 + dr.ph) * dr.ay;
      const dx = nx - pl.x, dy = ny - pl.y;
      for (const f of _aaMvFighters()) {
        if (!f.onGround) continue;
        if (Math.abs(f.y + f.h - pl.y) <= 6 && f.x + f.w > pl.x && f.x < pl.x + pl.w) { f.x += dx; f.y += dy; }
      }
      pl.x = nx; pl.y = ny;
    }
    // Ring-out: falling out of the space between branches (either direction —
    // Dimension Shattering flips gravity) drops you back in from above, hurt.
    for (const f of _aaMvFighters()) {
      const out = f.y > GAME_H + 30 || f.y < -260;
      if (!out) continue;
      if (f === aa) continue;   // AA flies back on his own (_aaFallRecover)
      const isles = currentArena.platforms;
      const pl = isles[Math.floor(Math.random() * isles.length)];
      f.x = pl.x + pl.w / 2 - f.w / 2; f.y = -f.h - 30; f.vx = 0; f.vy = 4;
      if (typeof tfGravityInverted !== 'undefined' && tfGravityInverted) f.y = GAME_H - 40;
      if (!f.isAAPortalAlly && f.invincible <= 0) _aaMvHurt(f, 14, 0, 0);
      f.invincible = Math.max(f.invincible || 0, 45);
      hz.rifts.push({ x: f.cx(), y: 20, t: 40 });
    }
    for (let i = hz.rifts.length - 1; i >= 0; i--) if (--hz.rifts[i].t <= 0) hz.rifts.splice(i, 1);
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Drawing — world space (called after minions draw)
  // ══════════════════════════════════════════════════════════════════════════
  drawWorld() {
    if (!this.enabled() || !this._aa) return;
    const tr = this.trans;
    // Windup: energy drawn into AA's fist.
    if (tr && tr.stage === 'windup' && this._aa) {
      const aa = this._aa, p = Math.min(1, tr.t / 48);
      const fx = aa.cx() + tr.dir * 22, fy = aa.y + aa.h * 0.42;
      ctx.save();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 + tr.t * 0.12;
        const r = 120 * (1 - p) + 8;
        ctx.strokeStyle = i % 2 ? '#cc00ff' : '#ffffff';
        ctx.globalAlpha = 0.35 + p * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx + Math.cos(a) * (r + 30), fy + Math.sin(a) * (r + 30));
        ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 10 + p * 34);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.4, 'rgba(200,0,255,0.6)');
      g.addColorStop(1, 'rgba(80,0,140,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, 10 + p * 34, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (!this.inWorld() || !this.hz) return;
    const hz = this.hz, k = AA_WORLDS[this.idx].key;
    ctx.save();
    if (k === 'aa_branch') {
      for (const pl of currentArena.platforms) {
        if (!pl._aaSlab || !(pl._aaCrack > 0)) continue;
        const jit = (Math.random() - 0.5) * 2;
        ctx.strokeStyle = '#ffb070'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(frameCount * 0.5) * 0.3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const cx = pl.x + (i + 0.5) * pl.w / 6;
          ctx.moveTo(cx + jit, pl.y); ctx.lineTo(cx + 10 + jit, pl.y + 18); ctx.lineTo(cx - 4 + jit, pl.y + 34);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const d of hz.debris) {
        const sh = Math.min(1, d.t / d.warn);
        if (d.t < d.warn + d.fall) {
          ctx.fillStyle = `rgba(0,0,0,${0.25 + sh * 0.4})`;
          ctx.beginPath(); ctx.ellipse(d.x, d.gy + 2, d.w * 0.6 * (0.4 + sh * 0.6), 7, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(255,120,60,${0.4 + 0.4 * Math.sin(d.t * 0.4)})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(d.x, d.gy + 2, d.w * 0.6, 9, 0, 0, Math.PI * 2); ctx.stroke();
        }
        if (d.t >= d.warn - 10) {
          const fp = Math.min(1, Math.max(0, (d.t - d.warn) / d.fall));
          const y = d.t < d.warn + d.fall ? -120 + (d.gy - 30 + 120) * fp * fp : d.gy - 26;
          const a = d.t > d.warn + d.fall + 20 ? Math.max(0, 1 - (d.t - d.warn - d.fall - 20) / 30) : 1;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(d.x, y); ctx.rotate(d.rot);
          ctx.fillStyle = '#2a2226'; ctx.fillRect(-d.w / 2, -24, d.w, 48);
          ctx.strokeStyle = '#5a4a48'; ctx.lineWidth = 2; ctx.strokeRect(-d.w / 2, -24, d.w, 48);
          ctx.fillStyle = 'rgba(255,190,110,0.55)';
          for (let wx = -d.w / 2 + 8; wx < d.w / 2 - 8; wx += 16)
            for (let wy = -16; wy < 16; wy += 14) ctx.fillRect(wx, wy, 7, 8);
          ctx.restore();
        }
      }
    } else if (k === 'aa_planet') {
      for (const m of hz.meteors) {
        if (m.t < m.warn + m.fall) {
          const p = Math.min(1, m.t / m.warn);
          ctx.strokeStyle = `rgba(255,210,120,${0.5 + 0.4 * Math.sin(m.t * 0.5)})`; ctx.lineWidth = 2;
          const rr = 72 - p * 40;
          ctx.beginPath(); ctx.ellipse(m.x, m.gy, rr, rr * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(m.x - 10, m.gy); ctx.lineTo(m.x + 10, m.gy); ctx.stroke();
        }
        if (m.t >= m.warn && m.t < m.warn + m.fall) {
          const fp = (m.t - m.warn) / m.fall;
          const sx = m.x + m.dir * 300 * (1 - fp), sy = -60 + (m.gy + 60) * fp;
          const tg = ctx.createLinearGradient(sx, sy, sx + m.dir * 90, sy - 110);
          tg.addColorStop(0, 'rgba(255,230,160,0.9)'); tg.addColorStop(1, 'rgba(79,224,200,0)');
          ctx.strokeStyle = tg; ctx.lineWidth = m.r * 1.4;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + m.dir * 90, sy - 110); ctx.stroke();
          ctx.fillStyle = '#ffe2a0';
          ctx.beginPath(); ctx.arc(sx, sy, m.r, 0, Math.PI * 2); ctx.fill();
        }
        if (m.t >= m.warn + m.fall) {
          const e = (m.t - m.warn - m.fall) / 40;
          ctx.strokeStyle = `rgba(255,220,140,${1 - e})`; ctx.lineWidth = 4 * (1 - e) + 1;
          ctx.beginPath(); ctx.ellipse(m.x, m.gy, 20 + e * 70, (20 + e * 70) * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    } else if (k === 'aa_dead') {
      for (const s of hz.stars) {
        if (s.st === 'hole') {
          const life = s.t / 220;
          ctx.strokeStyle = 'rgba(150,140,210,0.35)'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) {
            const r = ((frameCount * 1.6 + i * 40) % 160) + 30;
            ctx.globalAlpha = 0.5 * (1 - (r - 30) / 160);
            ctx.beginPath(); ctx.arc(s.x, s.y, 200 - r, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 54);
          g.addColorStop(0, '#000'); g.addColorStop(0.7, '#000'); g.addColorStop(0.85, `rgba(180,160,255,${0.6 * life + 0.2})`); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 54, 0, Math.PI * 2); ctx.fill();
        } else {
          const flick = s.st === 'dying' ? (Math.random() < 0.35 ? 0.2 : 1) : 1;
          const r = s.st === 'dying' ? 16 + (s.t / 90) * 10 : 24;
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3);
          g.addColorStop(0, `rgba(255,250,230,${flick})`);
          g.addColorStop(0.3, `rgba(255,200,140,${0.6 * flick})`);
          g.addColorStop(1, 'rgba(255,160,80,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (k === 'aa_between') {
      for (const r of hz.rifts) {
        const a = r.t / 40;
        ctx.strokeStyle = `rgba(200,120,255,${a})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, 40 * (1.4 - a), 12, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  },

  // ── Screen-space overlay: darkness (dead universe) + location title card ─────
  drawOverlay(scX, scY, camX, camY) {
    if (!this.enabled() || !this._aa) return;
    const W = canvas.width, H = canvas.height;
    const toS = (wx, wy) => [W / 2 + (wx - camX) * scX, H / 2 + (wy - camY) * scY];
    if (this.inWorld() && AA_WORLDS[this.idx].key === 'aa_dead' && this.hz) {
      if (!this._dark) this._dark = document.createElement('canvas');
      const dk = this._dark;
      if (dk.width !== W || dk.height !== H) { dk.width = W; dk.height = H; }
      const d = dk.getContext('2d');
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, W, H);
      d.fillStyle = 'rgba(2,2,6,0.88)';
      d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const hole = (wx, wy, r) => {
        const [sx, sy] = toS(wx, wy); const rr = r * scX;
        const g = d.createRadialGradient(sx, sy, 0, sx, sy, rr);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g; d.beginPath(); d.arc(sx, sy, rr, 0, Math.PI * 2); d.fill();
      };
      for (const p of players) if (p && p.health > 0) hole(p.cx(), p.cy(), 165);
      for (const s of this.hz.stars) {
        if (s.st === 'lit') hole(s.x, s.y + 110, 235);
        else if (s.st === 'dying' && Math.random() < 0.65) hole(s.x, s.y + 110, 170);
      }
      const aa = this._aa;
      if (aa && aa.health > 0) hole(aa.cx(), aa.y + 12, 60);   // his kernel is the only light he carries
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dk, 0, 0);
      ctx.restore();
    }
    if (this.card) {
      const c = this.card, a = Math.min(1, (240 - c.t) / 20, c.t / 30);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.fillStyle = c.w.col;
      ctx.fillRect(W * 0.3, H * 0.205, W * 0.4, 2);
      ctx.shadowColor = c.w.col; ctx.shadowBlur = 24;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(H * 0.07)}px serif`;
      ctx.fillText(c.w.name, W / 2, H * 0.18);
      ctx.shadowBlur = 0;
      ctx.font = `${Math.round(H * 0.026)}px monospace`;
      ctx.fillStyle = c.w.col;
      ctx.fillText(c.w.sub, W / 2, H * 0.245);
      ctx.restore();
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // The flight — a full-frame cutscene that follows the player's real body.
  // gameLoop calls flightFrame() before any simulation; while it returns true
  // nothing else runs or draws that frame.
  // ══════════════════════════════════════════════════════════════════════════
  _makeFlight(toIdx, hero, aa) {
    const R = _aaMvRand(0xA5A5 + toIdx * 7919 + (frameCount | 0));
    const DUR = 400;
    // Speed profile → camera distance table (travel units along +x)
    const cam = [0];
    for (let t = 1; t <= DUR; t++) {
      const v = t < 12 ? 6 : t < 40 ? 6 + (t - 12) * 1.3 : t < 300 ? 42 : Math.max(8, 42 - (t - 300) * 0.45);
      cam.push(cam[t - 1] + v);
    }
    const at = (tHit, z, screenX) => cam[tHit] + (screenX - 300) / z;   // object x so it crosses screenX at tHit
    const stars = Array.from({ length: 170 }, () => ({
      x: R() * 2000, y: R() * GAME_H, z: 0.03 + R() * 0.35, r: 0.5 + R() * 1.6,
      col: ['#ffffff', '#cfe4ff', '#ffe2c0', '#e0c8ff'][Math.floor(R() * 4)],
    }));
    const nebulae = [0, 1, 2].map(i => ({
      x: at(60 + i * 110, 0.05, 450 + (R() - 0.5) * 300), y: 60 + R() * 400, z: 0.05,
      r: 140 + R() * 120, col: ['120,40,200', '30,90,200', '200,60,120'][i],
    }));
    const galaxies = [0, 1].map(i => ({ x: at(90 + i * 170, 0.03, 300 + R() * 400), y: 80 + R() * 360, z: 0.03, rot: R() * 6, s: 0.8 + R() * 0.6 }));
    const system = { x: at(150, 0.12, 640), y: 110 + R() * 60, z: 0.12 };
    const fightWorlds = [0, 1, 2].map(i => ({
      x: at(80 + i * 75, 0.4, 420 + (R() - 0.5) * 200), y: i % 2 ? 90 + R() * 50 : 400 + R() * 60, z: 0.4,
      r: 46 + R() * 34, col: ['#3a6aa0', '#a0603a', '#5a9a5a', '#8a4aa0'][Math.floor(R() * 4)], kind: i === 1 ? 'war' : 'duel',
    }));
    const rocks = [];
    for (const tHit of [70, 120, 175, 205]) rocks.push({ x: at(tHit, 1, 300), y: 0, z: 1, r: 22 + R() * 16, hit: true, rot: R() * 6, seed: R() });
    for (let i = 0; i < 14; i++) {
      const y = R() < 0.5 ? 40 + R() * 120 : 380 + R() * 120;
      rocks.push({ x: at(40 + Math.floor(R() * 260), 1.5, 450), y, z: 1.5, r: 10 + R() * 26, hit: false, rot: R() * 6, seed: R() });
    }
    const crash = { x: at(250, 1, 300), r: 170, col: ['#6a4a7a', '#4a6a8a', '#7a5a3a'][toIdx % 3], hit: false, split: 0 };
    return {
      t: 0, dur: DUR, to: toIdx, hero, aa, cam, stars, nebulae, galaxies, system, fightWorlds, rocks, crash,
      spin: 0, spinV: 0.42, shake: 0, shards: [], flash: 0,
    };
  },

  flightFrame() {
    const F = this.flight;
    if (!F) return false;
    // Orphan guard: the match ended or AA is gone — drop the cutscene.
    if (!gameRunning || !this._aa || this._aa.health <= 0 || !F.hero) { this.flight = null; this.trans = null; return false; }
    F.t++;
    this._drawFlight(F);
    if (F.t >= F.dur) this._land();
    return true;
  },

  _drawFlight(F) {
    const W = canvas.width, H = canvas.height;
    const kx = W / GAME_W, ky = H / GAME_H;
    const t = F.t, cam = F.cam[Math.min(t, F.dur)];
    const v = F.cam[Math.min(t, F.dur)] - F.cam[Math.max(0, Math.min(t, F.dur) - 1)];
    const px = 300 + Math.sin(t * 0.021) * 26, py = 260 + Math.sin(t * 0.047) * 22;
    const sx = (o) => 300 + (o.x - cam) * o.z;
    const dest = AA_WORLDS[F.to];

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000003';
    ctx.fillRect(0, 0, W, H);
    F.shake *= 0.86;
    ctx.setTransform(kx, 0, 0, ky, (Math.random() - 0.5) * F.shake * kx, (Math.random() - 0.5) * F.shake * ky);

    // Deep layers: nebulae, galaxies, star streaks
    for (const n of F.nebulae) {
      const x = sx(n); if (x < -n.r || x > GAME_W + n.r) continue;
      const g = ctx.createRadialGradient(x, n.y, 0, x, n.y, n.r);
      g.addColorStop(0, `rgba(${n.col},0.28)`); g.addColorStop(1, `rgba(${n.col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const gx of F.galaxies) {
      const x = sx(gx); if (x < -120 || x > GAME_W + 120) continue;
      ctx.save(); ctx.translate(x, gx.y); ctx.rotate(gx.rot + t * 0.004); ctx.scale(gx.s, gx.s * 0.55);
      for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 36; s++) {
        const a = arm / 3 * Math.PI * 2 + s * 0.2, d = s * 2.4;
        ctx.globalAlpha = 0.7 * (1 - s / 36);
        ctx.fillStyle = s < 8 ? '#ffffff' : s < 20 ? '#bcd6ff' : '#9a7acc';
        ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 2, 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const s of F.stars) {
      const x = ((s.x - cam * s.z) % 2000 + 2000) % 2000 - 550;
      if (x < -60 || x > GAME_W + 60) continue;
      const len = Math.min(220, v * s.z * 2.2);
      ctx.strokeStyle = s.col; ctx.globalAlpha = 0.35 + s.z * 1.4; ctx.lineWidth = s.r;
      ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x + len, s.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // A solar system sliding past in the distance
    {
      const S = F.system, x = sx(S);
      if (x > -260 && x < GAME_W + 260) {
        const g = ctx.createRadialGradient(x, S.y, 0, x, S.y, 60);
        g.addColorStop(0, '#fff8e0'); g.addColorStop(0.3, '#ffcc66'); g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, S.y, 60, 0, Math.PI * 2); ctx.fill();
        const orbits = [40, 66, 96, 132, 176];
        orbits.forEach((o, i) => {
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(x, S.y, o, o * 0.32, 0, 0, Math.PI * 2); ctx.stroke();
          const a = t * (0.03 - i * 0.004) + i * 1.7;
          ctx.fillStyle = ['#c8a070', '#70a0d0', '#d07050', '#a0d090', '#d0c0ff'][i];
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * o, S.y + Math.sin(a) * o * 0.32, 2.5 + i * 0.8, 0, Math.PI * 2); ctx.fill();
        });
      }
    }

    // Worlds with fights on them
    for (const w of F.fightWorlds) {
      const x = sx(w); if (x < -w.r - 60 || x > GAME_W + w.r + 60) continue;
      const g = ctx.createRadialGradient(x - w.r * 0.35, w.y - w.r * 0.35, 0, x, w.y, w.r);
      g.addColorStop(0, _lightenHex(w.col, 50)); g.addColorStop(0.65, w.col); g.addColorStop(1, _darkenHex(w.col, 60));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, w.y, w.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.stroke();
      if (w.kind === 'duel') {
        ctx.save(); ctx.globalAlpha = 0.9;
        _drawSpaceStickFight(ctx, x, w.y - w.r + 2, t);
        if (t % 14 < 3) { ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.arc(x, w.y - w.r - 18, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      } else {
        // A war: flashes all over the night side and tiny ships in orbit
        for (let i = 0; i < 6; i++) {
          if ((t + i * 7) % 18 > 4) continue;
          const a = i * 1.1 + 0.4, rr = w.r * (0.3 + (i % 3) * 0.2);
          ctx.fillStyle = i % 2 ? '#ffcc66' : '#ff6644';
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, w.y + Math.sin(a) * rr, 3 + (i % 2) * 2, 0, Math.PI * 2); ctx.fill();
        }
        for (let i = 0; i < 4; i++) {
          const a = t * 0.05 + i * 1.57, ox = x + Math.cos(a) * (w.r + 22), oy = w.y + Math.sin(a) * (w.r + 22) * 0.4;
          ctx.fillStyle = i % 2 ? '#aabbcc' : '#ff8866';
          ctx.fillRect(ox - 3, oy - 1, 6, 2);
          if ((t + i * 5) % 20 < 2) { ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, w.y); ctx.stroke(); }
        }
      }
    }

    // AA, left behind as you fly away from him
    if (t < 70 && F.aa) {
      const aa = F.aa, sc = Math.max(0.15, 1.6 - t * 0.02);
      const ax = px - 60 - t * 7, ay = py;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 70);
      ctx.translate(ax, ay); ctx.scale(sc, sc); ctx.translate(-aa.cx(), -(aa.y + aa.h / 2));
      aa._aaMvFlightDraw = true;
      try { aa.draw(); } catch (e) {}
      aa._aaMvFlightDraw = false;
      ctx.restore();
    }

    // Crash planet: the player goes through it.
    {
      const C = F.crash, x = 300 + (C.x - cam), cy = py + 150;
      if (!C.hit && x - C.r < px + 10 && t > 150) {
        C.hit = true; F.shake = 34; F.flash = 1; F.spinV += 0.5;
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 12;
          F.shards.push({ x: px, y: py, vx: Math.cos(a) * s - 6, vy: Math.sin(a) * s, r: 3 + Math.random() * 9, col: i % 3 ? C.col : '#ffb070', life: 60 + Math.random() * 40, rot: 0 });
        }
      }
      if (x > -C.r * 2 && x < GAME_W + C.r) {
        if (C.hit) C.split = Math.min(1, C.split + 0.03);
        const gap = C.split * 120;
        for (const half of [-1, 1]) {
          ctx.save();
          ctx.translate(0, half * gap);
          ctx.beginPath();
          ctx.rect(x - C.r - 10, half < 0 ? cy - C.r - 10 : cy - 16, C.r * 2 + 20, half < 0 ? C.r - 6 : C.r + 26);
          ctx.clip();
          const g = ctx.createRadialGradient(x - C.r * 0.4, cy - C.r * 0.4, 0, x, cy, C.r);
          g.addColorStop(0, _lightenHex(C.col, 60)); g.addColorStop(0.6, C.col); g.addColorStop(1, _darkenHex(C.col, 70));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, C.r, 0, Math.PI * 2); ctx.fill();
          if (C.hit) {
            ctx.fillStyle = 'rgba(255,140,60,0.8)';
            ctx.fillRect(x - C.r, half < 0 ? cy - 14 : cy - 16, C.r * 2, 6);
          }
          ctx.restore();
        }
      }
    }

    // Asteroids: the ones on your line shatter as you go through them.
    for (const r of F.rocks) {
      const x = sx(r), y = r.hit ? py + Math.sin(r.seed * 9) * 8 : r.y;
      if (r.hit && !r.done && x <= px + r.r) {
        r.done = true; F.shake = Math.max(F.shake, 18); F.spinV += 0.25; F.flash = Math.max(F.flash, 0.4);
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 9;
          F.shards.push({ x, y, vx: Math.cos(a) * s - 5, vy: Math.sin(a) * s, r: 2 + Math.random() * r.r * 0.35, col: '#8a7a6a', life: 40 + Math.random() * 30, rot: 0 });
        }
      }
      if (r.done || x < -60 || x > GAME_W + 60) continue;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(r.rot + t * 0.03);
      ctx.fillStyle = r.z > 1 ? '#3a342e' : '#7a6a5a';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, rr = r.r * (0.75 + 0.25 * Math.sin(r.seed * 40 + i * 2.3));
        i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Shards
    for (let i = F.shards.length - 1; i >= 0; i--) {
      const s = F.shards[i];
      s.x += s.vx - v * 0.25; s.y += s.vy; s.rot += 0.1; s.life--;
      if (s.life <= 0 || s.x < -40) { F.shards.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, s.life / 30);
      ctx.fillStyle = s.col;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.fillRect(-s.r / 2, -s.r / 2, s.r, s.r); ctx.restore();
    }
    ctx.globalAlpha = 1;

    // The destination grows out of the dark ahead of you.
    if (t > 290) {
      const p = (t - 290) / (F.dur - 290);
      const r = 6 * Math.pow(1.055, t - 290);
      const dx = GAME_W * 0.72 - p * (GAME_W * 0.72 - px), dy = 250 + (py - 250) * p;
      const g = ctx.createRadialGradient(dx - r * 0.3, dy - r * 0.3, 0, dx, dy, r);
      g.addColorStop(0, dest.globe[0]); g.addColorStop(0.6, dest.globe[1]); g.addColorStop(1, dest.globe[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dest.col; ctx.globalAlpha = 0.6; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(dx, dy, r + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Trail, then the player — the real fighter, tumbling.
    {
      const len = Math.min(320, 40 + v * 6);
      const tg = ctx.createLinearGradient(px - len, py, px, py);
      tg.addColorStop(0, 'rgba(160,60,255,0)'); tg.addColorStop(0.7, 'rgba(200,120,255,0.45)'); tg.addColorStop(1, 'rgba(255,255,255,0.85)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.moveTo(px - len, py); ctx.lineTo(px, py - 16); ctx.lineTo(px + 6, py); ctx.lineTo(px, py + 16); ctx.closePath(); ctx.fill();
      const p = F.hero;
      F.spinV += (0.14 - F.spinV) * 0.02;
      F.spin += F.spinV;
      const savedPose = p._finPoseState, savedInv = p.invincible;
      p._finPoseState = 'hurt'; p.invincible = 0;
      ctx.save();
      ctx.translate(px, py); ctx.rotate(F.spin); ctx.scale(1.7, 1.7);
      ctx.translate(-p.cx(), -(p.y + p.h / 2));
      try { p.draw(); } catch (e) {}
      ctx.restore();
      p._finPoseState = savedPose; p.invincible = savedInv;
    }

    // Titles
    ctx.textAlign = 'center';
    if (t < 80) {
      const a = t < 10 ? t / 10 : t > 60 ? (80 - t) / 20 : 1;
      ctx.globalAlpha = a;
      ctx.shadowColor = '#cc00ff'; ctx.shadowBlur = 26;
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px serif';
      ctx.fillText('DIMENSION PUNCH', GAME_W / 2, 80);
      ctx.shadowBlur = 0;
    }
    if (t > 300) {
      ctx.globalAlpha = Math.min(1, (t - 300) / 20);
      ctx.fillStyle = dest.col; ctx.font = '14px monospace';
      ctx.fillText('INCOMING', GAME_W / 2, 72);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px serif';
      ctx.fillText(dest.name, GAME_W / 2, 104);
    }
    ctx.globalAlpha = 1;

    // Impact flashes; the opening white-out; the final white-out into the landing.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (t < 10) { ctx.fillStyle = `rgba(255,255,255,${1 - t / 10})`; ctx.fillRect(0, 0, W, H); }
    if (F.flash > 0.01) { ctx.fillStyle = `rgba(255,240,220,${F.flash * 0.7})`; ctx.fillRect(0, 0, W, H); F.flash *= 0.85; }
    if (t > F.dur - 22) { ctx.fillStyle = `rgba(255,255,255,${(t - (F.dur - 22)) / 22})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// Arena backdrops (dispatched from drawBackground for any isAAWorld arena)
// ══════════════════════════════════════════════════════════════════════════════
function drawAAWorldArena() {
  if (!currentArena || !currentArena.isAAWorld) return;
  const k = currentArenaKey, f = typeof frameCount !== 'undefined' ? frameCount : 0;
  const R = _aaMvRand(k.length * 1013 + 7);
  ctx.save();
  if (k === 'aa_branch') {
    // A wound in the sky where this branch was cut off
    ctx.strokeStyle = 'rgba(255,200,160,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(520, -10);
    for (let i = 1; i <= 8; i++) ctx.lineTo(520 + (R() - 0.5) * 70, i * 34);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,80,255,0.25)'; ctx.lineWidth = 12; ctx.stroke();
    // Skyline: some towers sheared in half, the top halves drifting upward
    for (let i = 0; i < 14; i++) {
      const bx = i * 68 - 20 + R() * 20, bw = 44 + R() * 36, bh = 140 + R() * 200;
      const sheared = R() < 0.45, cut = bh * (0.35 + R() * 0.3);
      const top = 460 - bh;
      ctx.fillStyle = '#140c10';
      if (sheared) {
        ctx.fillRect(bx, 460 - cut, bw, cut);
        const lift = 30 + Math.sin(f * 0.01 + i) * 8 + R() * 50;
        ctx.save(); ctx.translate(bx + bw / 2, top + (bh - cut) / 2 - lift); ctx.rotate((R() - 0.5) * 0.3);
        ctx.fillRect(-bw / 2, -(bh - cut) / 2, bw, bh - cut);
        ctx.restore();
      } else ctx.fillRect(bx, top, bw, bh);
      ctx.fillStyle = 'rgba(255,170,90,0.35)';
      for (let wy = 460 - (sheared ? cut : bh) + 10; wy < 450; wy += 18)
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) if (R() < 0.35) ctx.fillRect(wx, wy, 5, 7);
    }
    // Fires on the street
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 180 + R() * 40;
      const g = ctx.createRadialGradient(x, 460, 0, x, 460, 60);
      g.addColorStop(0, `rgba(255,140,60,${0.25 + Math.sin(f * 0.2 + i) * 0.06})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 60, 400, 120, 60);
    }
  } else if (k === 'aa_planet') {
    // A ringed giant on the horizon and two moons
    const g = ctx.createRadialGradient(660, 170, 0, 700, 210, 220);
    g.addColorStop(0, '#5ab0a0'); g.addColorStop(0.7, '#1e5a58'); g.addColorStop(1, 'rgba(10,40,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(700, 210, 200, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,240,220,0.35)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(700, 210, 300, 46, -0.25, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#cfd8d0'; ctx.beginPath(); ctx.arc(170, 90, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8aa0a0'; ctx.beginPath(); ctx.arc(250, 140, 10, 0, Math.PI * 2); ctx.fill();
    // Far-off flashes: fights on other worlds
    for (let i = 0; i < 6; i++) {
      if ((f + i * 37) % 90 > 6) continue;
      ctx.fillStyle = 'rgba(255,240,200,0.8)';
      ctx.beginPath(); ctx.arc(60 + i * 140 + R() * 40, 30 + R() * 80, 2, 0, Math.PI * 2); ctx.fill();
    }
    // Mesas
    ctx.fillStyle = '#16302c';
    ctx.beginPath(); ctx.moveTo(-60, 470);
    for (let x = -60; x <= 960; x += 60) ctx.lineTo(x, 400 - R() * 90);
    ctx.lineTo(960, 470); ctx.closePath(); ctx.fill();
  } else if (k === 'aa_dead') {
    // Grey dust and the husks of stars that already went out
    ctx.fillStyle = 'rgba(120,124,150,0.35)';
    for (let i = 0; i < 70; i++) ctx.fillRect(R() * 900, R() * 440, 1.5, 1.5);
    for (let i = 0; i < 5; i++) {
      const x = 60 + R() * 780, y = 40 + R() * 200, r = 10 + R() * 18;
      ctx.strokeStyle = 'rgba(90,94,120,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (k === 'aa_between') {
    // Threads between branches, and windows into other versions of the world
    ctx.strokeStyle = 'rgba(190,120,255,0.18)'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.moveTo(R() * 900, -10);
      ctx.bezierCurveTo(R() * 900, 150, R() * 900, 350, R() * 900, 540); ctx.stroke();
    }
    const views = [['#ffcc88', '#884422'], ['#88ddff', '#224466'], ['#aaffaa', '#226633'], ['#ff8888', '#551122'], ['#ffffff', '#666688'], ['#ffaaee', '#552244']];
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 145 + R() * 40, y = 60 + R() * 330, w = 60 + R() * 50, h = 40 + R() * 40;
      const bob = Math.sin(f * 0.01 + i) * 6;
      const g = ctx.createLinearGradient(0, y + bob, 0, y + h + bob);
      g.addColorStop(0, views[i][0]); g.addColorStop(1, views[i][1]);
      ctx.globalAlpha = 0.28; ctx.fillStyle = g; ctx.fillRect(x, y + bob, w, h);
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#c070ff'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y + bob, w, h);
    }
    ctx.globalAlpha = 1;
    // The drop: nothing below the islands
    const g = ctx.createLinearGradient(0, 380, 0, 560);
    g.addColorStop(0, 'rgba(6,0,14,0)'); g.addColorStop(1, 'rgba(6,0,14,0.9)');
    ctx.fillStyle = g; ctx.fillRect(-200, 380, 1300, 300);
  }
  ctx.restore();
}
