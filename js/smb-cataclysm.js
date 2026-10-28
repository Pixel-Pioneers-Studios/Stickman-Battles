'use strict';
// smb-cataclysm.js: Cataclysm, a secret weapon built to be the most overpowered thing in the game.
// Not in menus or loot (enemyOnly). Equip it from the developer console:  setweapon cataclysm me
//
//   Basic swing  a normal heavy swing that also casts a random Conviction: a short, local version of one
//                class domain's hazards around the foe (Storm Realm lightning, Ashen Warpath logs, ...).
//                The real domain rewrites the whole arena, and Battle Royale forbids it, so these are
//                world-space and last ~2.5s. They stack: every swing casts one, up to three at once.
//   Q            Meteor Swarm: seven meteors walk across the foe's ground.
//   E (super)    Cosmic Axiom: a rift opens and Axiom comes through, drawn by the TrueForm renderer as an
//                untouchable puppet. He opens a black hole that drags the foes in (pull only: chip ticks
//                would spend the i-frames and combo scaling before the collapse lands), collapses it, tears
//                an Unmaking across the ground, then leaves.
//
// Every hit goes through dealDamage() with the wielder as attacker. The combo limiter counts every foe a move
// hits as one combo, so the base numbers are high: a full Axiom still kills a 150 HP bot caught in it. Blasts call brStructuresBlast()
// (smb-br-structures.js), so meteors bring down towers and windows in Battle Royale.
// Depends on: smb-combat.js, smb-particles-core.js, smb-fighter.js, smb-data-weapons.js. TrueForm and
// CinFX are used at call time, typeof-guarded.

var cxEffects = [];
var _cxArena  = null;
var _cxLastConv = null;
var _cxBoomAt = -99;

const CX_CONVICTIONS = [
  { key: 'storm',     cls: 'thor',    name: 'Storm Realm',         color: '#44aaff' },
  { key: 'warpath',   cls: 'kratos',  name: 'Ashen Warpath',       color: '#ff5500' },
  { key: 'siege',     cls: 'gunner',  name: 'Siege Line',          color: '#ff9900' },
  { key: 'hunt',      cls: 'archer',  name: 'Verdant Hunt',        color: '#44ff88' },
  { key: 'sanctuary', cls: 'paladin', name: 'Holy Sanctuary',      color: '#ffffaa' },
  { key: 'shadow',    cls: 'ninja',   name: 'Shadow Realm',        color: '#bb44ff' },
  { key: 'blades',    cls: 'warrior', name: 'The Proving Grounds', color: '#e0b070' },
];
const CX_CONV_FRAMES = 150;
const CX_CONV_MAX    = 3;

if (typeof WEAPON_SWINGS !== 'undefined') {
  WEAPON_SWINGS.cataclysm = { archetype: 'smash', dur: 14, a0: -1.85, a1: 0.95, ease: 'heavy', tilt: 0.7, tipLen: 34,
                              trail: { life: 14, cap: 9, width: 10 }, hitSound: 'blunt', carry: { arm: -0.90, tilt: -0.50 } };
}

// Helpers
function _cxFrame() { return typeof frameCount !== 'undefined' ? frameCount : 0; }

function _cxAll() {
  var out = [];
  [typeof players !== 'undefined' ? players : [], typeof minions !== 'undefined' ? minions : [],
   typeof trainingDummies !== 'undefined' ? trainingDummies : []].forEach(function (L) {
    for (var i = 0; i < L.length; i++) if (L[i]) out.push(L[i]);
  });
  return out;
}

function _cxFoes(owner) {
  return _cxAll().filter(function (f) {
    return f !== owner && f.health > 0 && !f._brSleep && !f._brOnPlane && typeof f.cx === 'function' &&
           (typeof isHostileTarget !== 'function' || isHostileTarget(owner, f));
  });
}

function _cxOnScreen(x, y, pad) {
  if (typeof camXCur === 'undefined') return true;
  var z = (typeof camZoomCur !== 'undefined' && camZoomCur > 0) ? camZoomCur : 1;
  pad = pad || 150;
  return Math.abs(x - camXCur) < GAME_W / (2 * z) + pad && Math.abs(y - camYCur) < GAME_H / (2 * z) + pad;
}

// Top of the first standable surface at x, at or below y.
function _cxGroundY(x, y) {
  var best = null;
  var pls = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
  for (var i = 0; i < pls.length; i++) {
    var pl = pls[i];
    if (pl.isWall || pl.isFloorDisabled || x < pl.x || x > pl.x + pl.w || pl.y < y - 4) continue;
    if (best === null || pl.y < best) best = pl.y;
  }
  return best === null ? y + 120 : best;
}

// Who the move is aimed at: the given target if close, else the nearest foe, else a point ahead.
function _cxFocus(owner, target, reach) {
  reach = reach || 750;
  var foes = _cxFoes(owner);
  var pick = null;
  if (target && foes.indexOf(target) >= 0 && Math.abs(target.cx() - owner.cx()) < reach) pick = target;
  if (!pick) {
    var bd = reach;
    foes.forEach(function (f) { var d = Math.hypot(f.cx() - owner.cx(), f.cy() - owner.cy()); if (d < bd) { bd = d; pick = f; } });
  }
  if (pick) return { f: pick, x: pick.cx(), y: pick.cy() };
  return { f: null, x: owner.cx() + (owner.facing || 1) * 260, y: owner.cy() };
}

function _cxHit(owner, f, dmg, kb, set) {
  if (!f || f.health <= 0 || (set && set.has(f))) return false;
  if (set) set.add(f);
  if (typeof dealDamage === 'function') dealDamage(owner, f, dmg, kb);
  return true;
}

function _cxBoom(x, y, power) {
  if (!_cxOnScreen(x, y)) return;
  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 6 + power * 5);
  var fc = _cxFrame();
  if (fc - _cxBoomAt > 5 && typeof SoundManager !== 'undefined' && SoundManager.explosion) { SoundManager.explosion(); _cxBoomAt = fc; }
}

function _cxStructures(x, y, power) {
  if (typeof brStructuresBlast === 'function') brStructuresBlast(x, y, power);
}

// Basic swing: a random Conviction
function cxCastConviction(user, target) {
  if (!user || user.health <= 0) return;
  // Convictions stack: every swing casts one, up to CX_CONV_MAX live at once, never two of the same kind.
  var live = cxEffects.filter(function (e) { return e.type === 'conv' && e.owner === user; });
  if (live.length >= CX_CONV_MAX) return;
  var busy = live.map(function (e) { return e.kind; });
  var pool = CX_CONVICTIONS.filter(function (c) { return c.key !== _cxLastConv && busy.indexOf(c.key) < 0; });
  var c = pool[Math.floor(Math.random() * pool.length)];
  _cxLastConv = c.key;
  var def = (typeof DOMAIN_DEFS !== 'undefined' && DOMAIN_DEFS[c.cls]) || null;
  var focus = _cxFocus(user, target, 650);
  cxEffects.push({ type: 'conv', kind: c.key, owner: user, t: 0, slot: live.length, name: ((def && def.name) || c.name).toUpperCase(),
                   color: (def && def.color) || c.color, ax: focus.x, ay: focus.y, haz: [] });
  if (_cxOnScreen(user.cx(), user.cy()) && typeof SoundManager !== 'undefined' && SoundManager.phaseUp) SoundManager.phaseUp();
}

function _cxConvSpawn(e) {
  var t = e.t, foes = _cxFoes(e.owner);
  var near = foes.filter(function (f) { return Math.abs(f.cx() - e.ax) < 520 && Math.abs(f.cy() - e.ay) < 400; });
  var gy = _cxGroundY(e.ax, e.ay - 20);
  var rnd = function (a) { return (Math.random() - 0.5) * 2 * a; };
  var aim = function (spread) {
    var f = near.length ? near[Math.floor(Math.random() * near.length)] : null;
    return f ? f.cx() + rnd(30) : e.ax + rnd(spread);
  };
  switch (e.kind) {
    case 'storm':
      if (t % 25 === 0 && t <= 125) {
        var bx = aim(220);
        e.haz.push({ k: 'bolt', x: bx, gy: _cxGroundY(bx, e.ay - 60), warn: 26, life: 36, r: 46, hit: new Set() });
      }
      break;
    case 'warpath':
      if (t % 50 === 0 && t <= 100) {
        [-1, 1].forEach(function (s) {
          e.haz.push({ k: 'log', x: e.ax - s * 540, y: gy - 22, vx: s * 16, life: 70, r: 24, rot: 0, hit: new Set() });
        });
      }
      break;
    case 'siege':
      if (t % 40 === 0 && t <= 120) {
        [-1, 1].forEach(function (s) {
          for (var i = 0; i < 4; i++) {
            e.haz.push({ k: 'bullet', x: e.ax - s * 520, y: e.ay + rnd(70), vx: s * 22, vy: rnd(1.5), life: 50, r: 8, hit: new Set() });
          }
        });
      }
      break;
    case 'hunt':
      if (t % 60 === 0 && t <= 120) {
        for (var i = 0; i < 7; i++) {
          e.haz.push({ k: 'arrow', x: e.ax - 300 + i * 100 + rnd(25), y: e.ay - 520, vx: rnd(2), vy: 18, life: 60, r: 11, gy: gy, hit: new Set() });
        }
      }
      break;
    case 'sanctuary':
      if (t === 0 || t === 75) {
        [aim(40), e.ax + 170 + rnd(60), e.ax - 170 + rnd(60)].forEach(function (x) {
          e.haz.push({ k: 'beam', x: x, gy: _cxGroundY(x, e.ay - 60), warn: 40, life: 62, r: 30, hit: new Set() });
        });
      }
      break;
    case 'shadow':
      if (t % 30 === 0 && t <= 120) {
        for (var j = 0; j < 4; j++) {
          e.haz.push({ k: 'shade', x: aim(280), y: e.ay - 460 - Math.random() * 60, vx: rnd(3), vy: 16 + Math.random() * 5,
                       life: 60, r: 15, rot: Math.random() * 6, gy: gy, hit: new Set() });
        }
      }
      break;
    case 'blades':
      if (t % 60 === 0 && t <= 120) {
        var spots = near.slice(0, 3).map(function (f) { return f.cx() + rnd(25); });
        if (!spots.length) spots = [e.ax];
        spots.forEach(function (x) {
          e.haz.push({ k: 'sword', x: x, gy: _cxGroundY(x, e.ay - 60), warn: 36, life: 72, r: 28, hit: new Set() });
        });
      }
      break;
  }
}

function _cxConvUpdate(e) {
  if (e.t < CX_CONV_FRAMES) _cxConvSpawn(e);
  var foes = _cxFoes(e.owner);
  for (var i = e.haz.length - 1; i >= 0; i--) {
    var h = e.haz[i];
    h.age = (h.age || 0) + 1;
    if (h.vx !== undefined) { h.x += h.vx; h.y += (h.vy || 0); }
    if (h.rot !== undefined) h.rot += 0.3;
    var live = false;
    if (h.k === 'bolt' || h.k === 'beam' || h.k === 'sword') live = h.age > h.warn;
    else live = true;
    if (h.k === 'arrow' || h.k === 'shade') {
      if (h.y >= h.gy) { h.life = 0; if (typeof spawnParticles === 'function' && _cxOnScreen(h.x, h.y)) spawnParticles(h.x, h.gy, e.color, 3); }
    }
    if (live) {
      for (var j = 0; j < foes.length; j++) {
        var f = foes[j], fx = f.cx();
        if (h.k === 'bolt' || h.k === 'beam') {
          if (Math.abs(fx - h.x) < h.r && f.y + f.h > h.gy - 700 && f.y < h.gy + 4) {
            if (_cxHit(e.owner, f, h.k === 'bolt' ? 16 : 18, 8, h.hit) && h.k === 'bolt' && typeof spawnParticles === 'function') spawnParticles(fx, f.cy(), '#cfe9ff', 6);
          }
        } else if (h.k === 'sword') {
          var rise = Math.min(1, (h.age - h.warn) / 8);
          if (Math.abs(fx - h.x) < h.r && f.y + f.h > h.gy - 96 * rise && f.y < h.gy + 4) {
            if (_cxHit(e.owner, f, 15, 6, h.hit)) f.vy = Math.min(f.vy || 0, -12);
          }
        } else {
          var dx = fx - h.x, dy = f.cy() - h.y;
          if (Math.abs(dx) < h.r + f.w / 2 && Math.abs(dy) < h.r + f.h / 2) {
            var dmg = h.k === 'log' ? 14 : h.k === 'bullet' ? 7 : h.k === 'arrow' ? 11 : 12;
            var kb  = h.k === 'log' ? 12 : 6;
            _cxHit(e.owner, f, dmg, kb, h.hit);
          }
        }
      }
    }
    if (h.k === 'bolt' && h.age === h.warn + 1) {
      if (_cxOnScreen(h.x, h.gy) && typeof SoundManager !== 'undefined' && SoundManager.hitZap) SoundManager.hitZap();
      if (typeof spawnParticles === 'function' && _cxOnScreen(h.x, h.gy)) spawnParticles(h.x, h.gy, '#aaddff', 8);
    }
    if (--h.life <= 0) e.haz.splice(i, 1);
  }
  return e.t < CX_CONV_FRAMES || e.haz.length > 0;
}

// Q: Meteor Swarm
function cxMeteorSwarm(user, target) {
  if (!user || user.health <= 0) return;
  var focus = _cxFocus(user, target, 800);
  var dir = user.facing || 1;
  var gy = focus.f ? focus.f.y + focus.f.h : _cxGroundY(focus.x, user.y);
  cxEffects.push({ type: 'meteors', owner: user, t: 0, tx: focus.x, ty: gy - 40, dir: dir, rocks: [], craters: [], n: 0 });
  if (typeof SoundManager !== 'undefined' && SoundManager.stingRise) SoundManager.stingRise();
}

function _cxMeteorUpdate(e) {
  if (e.n < 7 && e.t % 11 === 0) {
    var x = e.tx + (e.n - 3) * 95 * e.dir + (Math.random() - 0.5) * 50;
    var gy = _cxGroundY(x, e.ty - 60);
    e.rocks.push({ x0: x - e.dir * 380, y0: gy - 700, x1: x, y1: gy, t: 0, dur: 42, size: 18 + Math.random() * 10 });
    e.n++;
  }
  for (var i = e.rocks.length - 1; i >= 0; i--) {
    var R = e.rocks[i];
    if (++R.t < R.dur) continue;
    e.rocks.splice(i, 1);
    _cxBlast(e.owner, R.x1, R.y1, 92, 40, 15, 1.6);
    e.craters.push({ x: R.x1, y: R.y1, life: 80 });
  }
  for (var c = e.craters.length - 1; c >= 0; c--) if (--e.craters[c].life <= 0) e.craters.splice(c, 1);
  return e.n < 7 || e.rocks.length > 0 || e.craters.length > 0;
}

function _cxBlast(owner, x, y, r, dmg, kb, power) {
  var foes = _cxFoes(owner);
  for (var i = 0; i < foes.length; i++) {
    var f = foes[i], dx = f.cx() - x, dy = f.cy() - (y - 30);
    if (dx * dx + dy * dy > r * r) continue;
    if (_cxHit(owner, f, dmg, kb, null)) f.vy = Math.min(f.vy || 0, -10);
  }
  if (_cxOnScreen(x, y)) {
    if (typeof spawnParticles === 'function') { spawnParticles(x, y - 8, '#ff7a2a', 16); spawnParticles(x, y - 8, '#ffd27a', 8); spawnParticles(x, y - 8, '#5a4a48', 10); }
    if (typeof spawnImpact === 'function') spawnImpact(x, y, power, { shake: 0 });
  }
  _cxBoom(x, y, power);
  _cxStructures(x, y, power);
}

// E: Cosmic Axiom
const CX_AXIOM_FRAMES = 360;

function cxSummonAxiom(user, target) {
  if (!user || user.health <= 0) return;
  for (var i = 0; i < cxEffects.length; i++) if (cxEffects[i].type === 'axiom') return;   // one Axiom at a time
  var dir = user.facing || 1;
  var rx = user.cx() - dir * 50, ry = user.y - 150;
  var puppet = null;
  if (typeof TrueForm === 'function') {
    try {
      puppet = new TrueForm();
      // Full power: near-zero health on a huge pool drives the renderer's "rage" palette (white-blue, nova flare).
      puppet.maxHealth = 1e6; puppet.health = 1;
      puppet.invincible = 0; puppet.facing = dir; puppet.tfDrawScale = 1.7;
      puppet.isPuppet = true;
    } catch (err) { puppet = null; }
  }
  cxEffects.push({ type: 'axiom', owner: user, t: 0, rx: rx, ry: ry, dir: dir, puppet: puppet, target: target,
                   hole: null, tear: null, shards: [] });
  if (typeof CinFX !== 'undefined' && CinFX.nameCard) CinFX.nameCard('COSMIC AXIOM', '#c9b8ff', { dur: 110, accent: '#ffffff' });
  if (typeof SoundManager !== 'undefined' && SoundManager.portalOpen) SoundManager.portalOpen();
  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
}

function _cxAxiomUpdate(e) {
  var t = e.t, P = e.puppet;
  // Descend from the rift, hover, then rise back into it.
  var hover = { x: e.rx, y: e.ry + 70 };
  var k = t < 30 ? 0 : t < 70 ? (t - 30) / 40 : t < 290 ? 1 : t < 330 ? 1 - (t - 290) / 40 : 0;
  e.ax = e.rx; e.ay = e.ry + (hover.y - e.ry) * k;
  e.vis = t >= 30 && t < 330 ? Math.min(1, (t - 30) / 12, (330 - t) / 12) : 0;
  if (P) { P.x = e.ax - P.w / 2; P.y = e.ay - P.h / 2; P.facing = e.dir; }

  if (t === 80) {
    var focus = _cxFocus(e.owner, e.target, 800);
    e.hole = { x: focus.x, y: focus.y - 10, t: 0 };
    e.dir = focus.x >= e.ax ? 1 : -1;
    if (typeof SoundManager !== 'undefined' && SoundManager.soulAbsorb) SoundManager.soulAbsorb();
  }
  if (e.hole) {
    var H = e.hole; H.t++;
    var foes = _cxFoes(e.owner);
    if (H.t < 120) {
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i], dx = H.x - f.cx(), dy = H.y - f.cy(), d = Math.hypot(dx, dy);
        if (d > 480 || d < 1) continue;
        var pull = 1.4 * (1 - d / 500);
        f.vx = (f.vx || 0) * 0.9 + (dx / d) * pull * 6;
        f.vy = (f.vy || 0) * 0.9 + (dy / d) * pull * 5;
      }
      if (_cxOnScreen(H.x, H.y) && H.t % 3 === 0 && typeof spawnParticles === 'function') {
        var a = Math.random() * 6.28;
        spawnParticles(H.x + Math.cos(a) * 140, H.y + Math.sin(a) * 140, Math.random() < 0.5 ? '#b48cff' : '#ffffff', 1);
      }
    } else if (H.t === 120) {
      var hitSet = new Set();
      for (var j = 0; j < foes.length; j++) {
        var g = foes[j], gx = g.cx() - H.x, gyy = g.cy() - H.y, gd = Math.hypot(gx, gyy);
        if (gd > 210) continue;
        if (_cxHit(e.owner, g, 90, 20, hitSet)) { g.vx = (gx >= 0 ? 1 : -1) * 14; g.vy = Math.min(g.vy || 0, -12); }
      }
      _cxBoom(H.x, H.y, 1.8);
      _cxStructures(H.x, H.y + 40, 1.8);
      if (typeof spawnParticles === 'function' && _cxOnScreen(H.x, H.y)) { spawnParticles(H.x, H.y, '#ffffff', 24); spawnParticles(H.x, H.y, '#b48cff', 30); }
    } else if (H.t > 150) e.hole = null;
  }

  // The Unmaking: a tear runs along the ground away from Axiom, toward where the foes were.
  if (t === 215) {
    var gy = _cxGroundY(e.ax + e.dir * 80, e.ay);
    e.tear = { x0: e.ax, y: gy, len: 0, max: 720, hit: new Set(), life: 70 };
    if (typeof SoundManager !== 'undefined' && SoundManager.stingImpact) SoundManager.stingImpact();
  }
  if (e.tear) {
    var T = e.tear;
    T.len = Math.min(T.max, T.len + 24);
    var x1 = T.x0 + e.dir * T.len;
    var foes2 = _cxFoes(e.owner);
    for (var m = 0; m < foes2.length; m++) {
      var h = foes2[m], hx = h.cx();
      var inSpan = e.dir > 0 ? (hx >= T.x0 && hx <= x1) : (hx <= T.x0 && hx >= x1);
      if (inSpan && h.y + h.h > T.y - 120 && h.y < T.y + 6) {
        if (_cxHit(e.owner, h, 70, 16, T.hit)) h.vy = Math.min(h.vy || 0, -14);
      }
    }
    if (T.len < T.max && T.len % 96 < 24) _cxStructures(x1, T.y, 1.2);
    if (_cxOnScreen(x1, T.y) && typeof spawnParticles === 'function' && T.len < T.max) spawnParticles(x1, T.y - 4, Math.random() < 0.5 ? '#ffffff' : '#c9b8ff', 3);
    if (--T.life <= 0) e.tear = null;
  }
  if (t === 290 && typeof SoundManager !== 'undefined' && SoundManager.portalOpen) SoundManager.portalOpen();
  return t < CX_AXIOM_FRAMES;
}

// Update: called once per frame from gameLoop
function updateCataclysm() {
  if (typeof gameRunning === 'undefined' || !gameRunning || _cxArena !== currentArena) {
    cxEffects.length = 0; _cxArena = (typeof currentArena !== 'undefined') ? currentArena : null;
    return;
  }
  for (var i = cxEffects.length - 1; i >= 0; i--) {
    var e = cxEffects[i], keep;
    if (e.type === 'conv')         keep = _cxConvUpdate(e);
    else if (e.type === 'meteors') keep = _cxMeteorUpdate(e);
    else                           keep = _cxAxiomUpdate(e);
    e.t++;
    if (!keep) cxEffects.splice(i, 1);
  }
}

// Drawing (world space, after the fighters)
function drawCataclysmFX() {
  if (!cxEffects.length) return;
  ctx.save();
  for (var i = 0; i < cxEffects.length; i++) {
    var e = cxEffects[i];
    if (e.type === 'conv') _cxDrawConv(e);
    else if (e.type === 'meteors') _cxDrawMeteors(e);
    else _cxDrawAxiom(e);
  }
  ctx.restore();
}

function _cxDrawConv(e) {
  var fc = _cxFrame();
  // The Conviction's name, rising off the caster.
  if (e.t < 80 && e.owner && e.owner.health > 0) {
    var a = Math.min(1, e.t / 8, (80 - e.t) / 20);
    ctx.globalAlpha = a;
    ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = e.color; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.fillText(e.name, e.owner.cx(), e.owner.y - 34 - e.t * 0.35 - (e.slot || 0) * 22);   // stacked casts get their own row
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  for (var i = 0; i < e.haz.length; i++) {
    var h = e.haz[i];
    if (!_cxOnScreen(h.x, h.y !== undefined ? h.y : h.gy, 200)) continue;
    var warm = (h.age || 0) <= (h.warn || 0);
    switch (h.k) {
      case 'bolt':
        if (warm) {
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(fc * 0.6);
          ctx.fillStyle = e.color; ctx.fillRect(h.x - 2, h.gy - 600, 4, 600);
          ctx.beginPath(); ctx.ellipse(h.x, h.gy, h.r, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = '#e6f6ff'; ctx.lineWidth = 4; ctx.shadowColor = e.color; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.moveTo(h.x, h.gy - 620);
          for (var s = 1; s <= 8; s++) ctx.lineTo(h.x + (Math.random() - 0.5) * 34, h.gy - 620 + s * 77.5);
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        break;
      case 'beam':
        if (warm) {
          ctx.strokeStyle = 'rgba(255,250,190,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
          ctx.strokeRect(h.x - h.r, h.gy - 700, h.r * 2, 700); ctx.setLineDash([]);
        } else {
          var g = ctx.createLinearGradient(h.x - h.r, 0, h.x + h.r, 0);
          g.addColorStop(0, 'rgba(255,240,150,0)'); g.addColorStop(0.5, 'rgba(255,255,220,0.9)'); g.addColorStop(1, 'rgba(255,240,150,0)');
          ctx.fillStyle = g; ctx.fillRect(h.x - h.r, h.gy - 700, h.r * 2, 700);
        }
        break;
      case 'sword':
        if (warm) {
          ctx.fillStyle = 'rgba(224,176,112,' + (0.25 + 0.2 * Math.sin(fc * 0.5)).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(h.x, h.gy, h.r, 6, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          var rise = Math.min(1, (h.age - h.warn) / 8) * Math.min(1, h.life / 12), ht = 96 * rise;
          ctx.fillStyle = '#d9dde6'; ctx.strokeStyle = '#e0b070'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(h.x - 7, h.gy); ctx.lineTo(h.x - 7, h.gy - ht + 14); ctx.lineTo(h.x, h.gy - ht); ctx.lineTo(h.x + 7, h.gy - ht + 14); ctx.lineTo(h.x + 7, h.gy); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e0b070'; ctx.fillRect(h.x - 14, h.gy - 6, 28, 5);
        }
        break;
      case 'log':
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.x * 0.06);
        ctx.fillStyle = '#6a3a1e'; ctx.beginPath(); ctx.arc(0, 0, h.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a0643a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, h.r * 0.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, h.r * 0.25, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,110,30,0.45)';
        ctx.beginPath(); ctx.ellipse(h.x - Math.sign(h.vx) * 26, h.y, 26, 14, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case 'bullet':
        ctx.strokeStyle = '#ffcf7a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(h.x - h.vx * 2, h.y - h.vy * 2); ctx.lineTo(h.x, h.y); ctx.stroke();
        break;
      case 'arrow':
        ctx.strokeStyle = '#d8f5e0'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(h.x - h.vx * 1.6, h.y - 26); ctx.lineTo(h.x, h.y); ctx.stroke();
        ctx.fillStyle = '#44ff88';
        ctx.beginPath(); ctx.moveTo(h.x, h.y + 6); ctx.lineTo(h.x - 4, h.y - 2); ctx.lineTo(h.x + 4, h.y - 2); ctx.fill();
        break;
      case 'shade':
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
        ctx.fillStyle = 'rgba(187,68,255,0.85)';
        ctx.beginPath(); ctx.arc(0, 0, h.r, 0.3, Math.PI * 1.3); ctx.arc(4, -2, h.r * 0.75, Math.PI * 1.3, 0.3, true); ctx.fill();
        ctx.restore();
        break;
    }
  }
}

function _cxDrawMeteors(e) {
  var fc = _cxFrame();
  for (var c = 0; c < e.craters.length; c++) {
    var C = e.craters[c];
    ctx.fillStyle = 'rgba(255,120,40,' + (C.life / 80 * 0.6).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(C.x, C.y - 2, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (var i = 0; i < e.rocks.length; i++) {
    var R = e.rocks[i], u = R.t / R.dur, uu = u * u;
    // Ground telegraph: a ring that closes as the rock arrives.
    ctx.strokeStyle = 'rgba(255,90,40,' + (0.35 + 0.4 * u).toFixed(3) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(R.x1, R.y1, 92 * (1.3 - u * 0.3), 12, 0, 0, Math.PI * 2); ctx.stroke();
    var x = R.x0 + (R.x1 - R.x0) * uu, y = R.y0 + (R.y1 - R.y0) * uu;
    if (!_cxOnScreen(x, y, 300)) continue;
    var dx = R.x1 - R.x0, dy = R.y1 - R.y0, L = Math.hypot(dx, dy);
    var tx = x - dx / L * 160, ty = y - dy / L * 160;
    var tr = ctx.createLinearGradient(tx, ty, x, y);
    tr.addColorStop(0, 'rgba(255,90,20,0)'); tr.addColorStop(1, 'rgba(255,200,90,0.9)');
    ctx.strokeStyle = tr; ctx.lineWidth = R.size * 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,150,50,0.35)';
    ctx.beginPath(); ctx.arc(x, y, R.size * 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a221a';
    ctx.beginPath(); ctx.arc(x, y, R.size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,140,' + (0.5 + 0.5 * Math.sin(fc * 0.8 + i)).toFixed(3) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - R.size * 0.5, y - 2); ctx.lineTo(x + R.size * 0.2, y + R.size * 0.3); ctx.stroke();
  }
}

function _cxDrawAxiom(e) {
  var t = e.t, fc = _cxFrame();
  // The rift: violet-white fracture lines out of a bright seam.
  var open = t < 30 ? t / 30 : t < 300 ? 1 : Math.max(0, 1 - (t - 300) / 40);
  if (open > 0 && _cxOnScreen(e.rx, e.ry, 300)) {
    ctx.save();
    ctx.translate(e.rx, e.ry);
    var w = 120 * open, hgt = 30 * open;
    var g = ctx.createRadialGradient(0, 0, 4, 0, 0, w);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.4, 'rgba(180,140,255,0.55)'); g.addColorStop(1, 'rgba(80,40,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, w, hgt + 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w, 0);
    for (var s = -4; s <= 4; s++) ctx.lineTo(s * w / 4, (s % 2 ? -1 : 1) * hgt * 0.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(201,184,255,0.8)'; ctx.lineWidth = 1.5;
    for (var r = 0; r < 7; r++) {
      var a = r / 7 * Math.PI * 2 + fc * 0.004;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * w * 0.5, Math.sin(a) * hgt * 0.5);
      ctx.lineTo(Math.cos(a) * w * 1.15, Math.sin(a) * (hgt + 30)); ctx.stroke();
    }
    ctx.restore();
  }
  // Axiom himself.
  if (e.puppet && e.vis > 0) {
    ctx.save(); ctx.globalAlpha = e.vis;
    // The renderer always draws a boss HP bar over his head; clip it out (an even-odd hole where it sits).
    var P = e.puppet, bx = P.cx() - 40, by = P.y - 30;
    ctx.beginPath(); ctx.rect(P.cx() - 2000, P.y - 2000, 4000, 4000); ctx.rect(bx, by, 80, 22); ctx.clip('evenodd');
    try { P.draw(); } catch (err) { e.puppet = null; }
    ctx.restore();
  }
  // Black hole.
  if (e.hole) {
    var H = e.hole, k = H.t < 15 ? H.t / 15 : H.t < 120 ? 1 : Math.max(0, 1 - (H.t - 120) / 30);
    var R = 46 * k + (H.t >= 120 ? (H.t - 120) * 9 : 0);
    if (_cxOnScreen(H.x, H.y, 300)) {
      for (var ring = 0; ring < 3; ring++) {
        var rr = 160 - ((fc * 3 + ring * 53) % 160);
        ctx.strokeStyle = 'rgba(180,140,255,' + (0.4 * (rr / 160) * k).toFixed(3) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(H.x, H.y, rr + 40, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.save(); ctx.translate(H.x, H.y); ctx.rotate(fc * 0.05);
      ctx.strokeStyle = 'rgba(255,170,80,' + (0.85 * k).toFixed(3) + ')'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(0, 0, R * 1.9, R * 0.55, 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = H.t >= 120 ? 'rgba(255,255,255,' + k.toFixed(3) + ')' : '#05000a';
      ctx.beginPath(); ctx.arc(H.x, H.y, Math.max(1, R), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * k).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  // The Unmaking.
  if (e.tear) {
    var T = e.tear, x1 = T.x0 + e.dir * T.len, a2 = Math.min(1, T.life / 20);
    ctx.save(); ctx.globalAlpha = a2;
    ctx.strokeStyle = 'rgba(201,184,255,0.55)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(T.x0, T.y); ctx.lineTo(x1, T.y); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(T.x0, T.y);
    for (var x = 0; x <= T.len; x += 24) ctx.lineTo(T.x0 + e.dir * x, T.y + ((x / 24) % 2 ? -6 : 5));
    ctx.stroke();
    // Shards standing up out of the tear.
    ctx.fillStyle = 'rgba(230,220,255,0.8)';
    for (var sx = 40; sx < T.len; sx += 70) {
      var px = T.x0 + e.dir * sx, sh = 26 + ((sx * 7) % 30);
      ctx.beginPath(); ctx.moveTo(px - 6, T.y); ctx.lineTo(px + e.dir * 4, T.y - sh); ctx.lineTo(px + 8, T.y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// Weapon art (from wxDrawWeaponArt): an obsidian greatsword with a molten seam and a captive star at the guard.
function cxDrawWeaponArt(f, attacking) {
  var c = (typeof _weaponArtCtx === 'function') ? _weaponArtCtx() : ctx;
  var fc = _cxFrame(), pulse = 0.5 + 0.5 * Math.sin(fc * 0.12);
  c.save();
  // Grip and pommel.
  c.fillStyle = '#1c1426'; c.beginPath(); c.roundRect(-8, -2.5, 10, 5, 1.5); c.fill();
  c.fillStyle = '#b48cff'; c.beginPath(); c.arc(-9, 0, 3, 0, Math.PI * 2); c.fill();
  // Blade.
  c.shadowColor = '#ff7a2a'; c.shadowBlur = 10 + pulse * 10;
  c.fillStyle = '#120c18';
  c.beginPath(); c.moveTo(2, -5); c.lineTo(30, -4); c.lineTo(38, 0); c.lineTo(30, 4); c.lineTo(2, 5); c.closePath(); c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(255,' + Math.round(120 + pulse * 80) + ',40,0.95)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(5, 0); c.lineTo(12, -1.5); c.lineTo(19, 1); c.lineTo(26, -1); c.lineTo(34, 0); c.stroke();
  c.strokeStyle = 'rgba(180,140,255,0.8)'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(2, -5); c.lineTo(30, -4); c.lineTo(38, 0); c.lineTo(30, 4); c.lineTo(2, 5); c.stroke();
  // Guard with the star.
  c.fillStyle = '#3a2a55'; c.fillRect(0, -8, 3, 16);
  c.shadowColor = '#ffffff'; c.shadowBlur = 8 + pulse * 6;
  c.fillStyle = '#fff6e0'; c.beginPath(); c.arc(1.5, 0, 2.6, 0, Math.PI * 2); c.fill();
  c.restore();
}
