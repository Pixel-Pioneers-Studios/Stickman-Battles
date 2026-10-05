'use strict';
// smb-move-scenes-defs.js — choreography for every weapon's ability (Q) and
// super (E). Runtime, pose schema and conventions: smb-move-scenes.js.
//
// Reading a track: angles are facing-right canonical, canvas convention (0 is
// forward, PI/2 straight down, -PI/2 straight up, PI behind). An arm angle is
// shoulder -> hand; `w` is where the weapon points. Angles stay continuous
// across keys (past 2*PI if a swing keeps going) because keys interpolate
// numerically: 3.3 -> 6.2 sweeps OVER the top, 3.3 -> 0.2 sweeps under.
//
// Depends on: smb-move-scenes.js (msDefine, MS_POSE_DEF).
// ============================================================

const MS_PI = Math.PI;
const MS_TAU = Math.PI * 2;

// One-handed carry at the side, the way the axe/sword/hammer rest.
const MS_STAND = { r: 0.95, w: 0.75, l: 1.40, lean: 0, drop: 0, fr: 7, fl: -7 };

// The opener reaching someone: 'caught' (held when possible), 'blocked' by a
// raised guard, 'stop' when parried (the scene is over), or null to keep going.
function msCatch(sc, v, chip) {
  const r = sc.contact(v, chip);
  if (r === 'miss') return null;
  if (r === 'parried') { sc.end(); return 'stop'; }
  if (r === 'blocked') { sc.shake(6); sc.sfx('clang'); return 'blocked'; }
  sc.vars.v = v;
  sc.vars.locked = sc.lock(v);
  return 'caught';
}

// Is the scene still holding v (false for bosses, which are hit but never held)?
function msHeld(sc, v) { return !!v && sc.vars.locked && v._msLock === sc; }

// ═════════════════════════════════════════════════════════════════════════════
// AXE
// ═════════════════════════════════════════════════════════════════════════════
// Q — Rising Cleave. A short dash that has to land; on contact the axe comes up
// under them and throws them into the air, and as they fall back to chest height
// the axe comes round flat and sends them away.
msDefine('axe:q', {
  color: '#ff8a3d',
  endlag: 6,
  tracks: {
    main: { len: 20, keys: [
      { t: 0,  ...MS_STAND },
      { t: 5,  e: 'out', r: 2.45, w: 2.85, l: 0.55, lean: -3, drop: 9, fr: 10, fl: -12 },
      { t: 7,  e: 'out', r: 2.70, w: 3.05, l: 0.25, lean: 11, drop: 5, fr: 17, fl: -17 },
      { t: 20, e: 'lin', r: 2.75, w: 3.10, l: 0.20, lean: 12, drop: 5, fr: 17, fl: -17 },
    ] },
    whiff: { len: 20, keys: [
      { t: 0,  r: 2.75, w: 3.10, l: 0.20, lean: 12, drop: 5, fr: 17, fl: -17 },
      { t: 6,  e: 'out', r: 1.40, w: 1.10, l: 0.90, lean: -5, drop: 11, fr: 20, fl: -6 },
      { t: 20, e: 'io', ...MS_STAND },
    ] },
    // Uppercut 2-6, hang 6-14, the axe goes back over the shoulder 14-26, coils
    // 26-30, then the flat swing 30-36 crosses the camera (arm and blade shorten
    // as they point at the viewer) and connects at 34.
    hit: { len: 56, keys: [
      { t: 0,  r: 2.75, w: 3.10, l: 0.20, lean: 12, drop: 5, fr: 17, fl: -17 },
      { t: 2,  e: 'in',   r: 2.30, w: 2.55, l: 0.30, lean: 7, drop: 10, fr: 15, fl: -14, trail: true },
      { t: 6,  e: 'snap', r: -1.22, w: -1.42, l: 1.95, lean: -4, drop: 0, fr: 7, fl: -11 },
      { t: 14, e: 'out',  r: -1.32, w: -1.62, l: 2.05, lean: -5, drop: 0, fr: 7, fl: -11 },
      { t: 26, e: 'io',   r: -3.06, w: -3.08, l: 0.35, lean: -6, drop: 7, fr: 15, fl: -13 },
      { t: 30, e: 'out',  r: -3.18, w: -3.22, l: 0.30, lean: -8, drop: 8, fr: 15, fl: -13 },
      { t: 33, e: 'in',   r: -1.56, rl: 0.38, w: -1.57, wl: 0.22, l: 1.6, lean: 2, drop: 7, fr: 16, fl: -13 },
      { t: 36, e: 'out',  r: 0.02, rl: 1.12, w: -0.06, wl: 1, l: 2.4, lean: 10, drop: 6, fr: 18, fl: -11 },
      { t: 44, e: 'out',  r: 0.34, w: 0.52, l: 2.1, lean: 11, drop: 6, fr: 18, fl: -11 },
      { t: 56, e: 'io',   ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.lt >= 6) {
        sc.dash(sc.lt < 9 ? 9 : 13);
        const c = msCatch(sc, sc.findFront(46, 58));
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          sc.play('hit');
          sc.sfx('swing');
          sc.zoom(1.1, 54);
          if (sc.vars.locked) sc.vpose(sc.vars.v, 'fold');
        }
      }
    } else if (sc.track === 'hit') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { if (sc.lt > 40) sc.end(); return; }
      const held = msHeld(sc, v);
      if (sc.lt < 4 && held) sc.place(v, 38, 0, 0.5);
      if (sc.at(4) && (held || sc.near(v, 90))) {
        sc.hit(v, 8, 0, { big: true });
        sc.slash(18, -18, 46, 1.9, -1.35, { color: '#ffb070', w: 12, life: 12 });
        sc.shake(8);
        if (held) { sc.fling(v, 0.3, -10, 0.62); sc.vpose(v, 'lift'); sc.body(v).spin = -0.02; }
      }
      if (held && sc.in(29, 34)) {
        const b = sc.body(v);
        b.x += (sc.ucx() + sc.f * 44 - v.w / 2 - b.x) * 0.3;
      }
      if (sc.at(31)) sc.sfx('swing');
      if (sc.at(34)) {
        sc.slash(0, -22, 72, MS_PI * 0.98, MS_PI * 2.02, { ry: 20, color: '#ffb070', w: 14, life: 13 });
        if (held || sc.near(v, 100)) {
          if (sc.hit(v, 14, 10, { big: true }) === 'hit') {
            sc.freeze(6);
            sc.shake(16);
            sc.flash('#ffffff', 0.12, 5);
            sc.ring(v.cx(), v.cy(), 80, '#ffb070', 16);
          }
        }
        if (held) sc.release(v, 15, -6, { tumble: 30, stun: 26 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});

// A move with no catch: wind-up, release, recovery. The weapon's original
// effect (projectiles, AoE, buff) fires on `fireAt`.
function msCast(o) {
  return {
    color: o.color, endlag: o.endlag || 0, when: o.when, free: o.free, hideWhile: o.hideWhile,
    killWhile: o.killWhile, keepOnSwing: o.keepOnSwing,
    tracks: { main: { len: o.len, keys: o.keys } },
    start: o.start,
    tick(sc) {
      if (sc.at(o.fireAt)) { sc.fire(); if (o.onFire) o.onFire(sc); }
      if (o.tick) o.tick(sc);
    },
    poseMod: o.poseMod,
  };
}

// Small pose helpers shared by the ranged weapons.
const MS_AIM  = { r: 0.02, rl: 1.05, w: 0.0, l: 0.14, ll: 0.78, lean: 2, drop: 3, fr: 9, fl: -10 };   // two-hand level aim
const MS_KNEEL = { r: 0.10, rl: 1.05, w: 0.04, l: 0.22, ll: 0.8, lean: 4, drop: 15, fr: 13, fl: -15 };

// ═════════════════════════════════════════════════════════════════════════════
// AXE — E: Axe Throw. Over the shoulder, a full-body heave, the axe leaves the
// hand on the follow-through.
// ═════════════════════════════════════════════════════════════════════════════
msDefine('axe:e', msCast({
  color: '#ff8a3d', len: 30, fireAt: 14,
  hideWhile: u => !!u._thrownAxe,
  keys: [
    { t: 0,  ...MS_STAND },
    { t: 10, e: 'out',  r: -2.55, w: -2.85, l: 0.35, lean: -8, drop: 6, fr: 14, fl: -14 },
    { t: 12, e: 'hold', r: -2.62, w: -2.95, l: 0.30, lean: -9, drop: 7, fr: 14, fl: -14, trail: true },
    { t: 15, e: 'snap', r: 0.35, w: 0.20, l: 2.3, lean: 14, drop: 5, fr: 18, fl: -12, hide: true },
    { t: 30, e: 'io',   ...MS_STAND, hide: true },
  ],
  onFire(sc) { sc.sfx('swing'); sc.shake(8); },
}));

// ═════════════════════════════════════════════════════════════════════════════
// SWORD
// ═════════════════════════════════════════════════════════════════════════════
// Q — Blade Storm: coil low, then one whole-circle cut that throws the four arcs.
msDefine('sword:q', msCast({
  color: '#88ccff', len: 30, fireAt: 11,
  keys: [
    { t: 0,  ...MS_STAND },
    { t: 7,  e: 'out',  r: -2.55, w: -2.70, l: 0.5, lean: -5, drop: 10, fr: 12, fl: -12 },
    { t: 8,  e: 'hold', r: -2.60, w: -2.78, l: 0.5, lean: -5, drop: 10, fr: 12, fl: -12, trail: true },
    { t: 16, e: 'snap', r: 3.62, w: 3.80, l: -0.6, lean: 6, drop: 9, fr: 14, fl: -12 },
    { t: 30, e: 'io',   r: 0.95, w: 0.75, l: 1.40, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
  onFire(sc) { sc.slash(0, -6, 64, -MS_PI * 0.8, MS_PI * 1.2, { ry: 30, color: '#bfe6ff', w: 11, life: 14 }); sc.sfx('swing'); },
}));
// E — Air Slash: three cuts, each one throws its arc as it finishes.
msDefine('sword:e', msCast({
  color: '#88ccff', len: 40, fireAt: 4, endlag: 4,
  keys: [
    { t: 0,  ...MS_STAND },
    { t: 3,  e: 'out',  r: -2.30, w: -2.45, l: 0.6, lean: -4, drop: 5, fr: 12, fl: -11, trail: true },
    { t: 6,  e: 'snap', r: 0.95, w: 1.20, l: 2.2, lean: 9, drop: 7, fr: 15, fl: -11 },
    { t: 11, e: 'out',  r: 1.05, w: 1.35, l: 2.2, lean: 9, drop: 7, fr: 15, fl: -11, trail: true },
    { t: 15, e: 'snap', r: -1.05, w: -1.30, l: 1.2, lean: -2, drop: 3, fr: 12, fl: -12 },
    { t: 20, e: 'out',  r: -2.90, w: -3.00, l: 0.4, lean: -6, drop: 6, fr: 13, fl: -13, trail: true },
    { t: 25, e: 'snap', r: 0.08, rl: 1.15, w: 0.02, l: 2.6, lean: 14, drop: 6, fr: 19, fl: -12 },
    { t: 40, e: 'io',   ...MS_STAND },
  ],
  onFire(sc) { sc.sfx('swing'); },
  tick(sc) { if (sc.at(14) || sc.at(24)) sc.sfx('swing'); },
}));

// ═════════════════════════════════════════════════════════════════════════════
// HAMMER
// ═════════════════════════════════════════════════════════════════════════════
// Q — Ground Shockwave: a small jump with the hammer overhead, driven into the floor.
msDefine('hammer:q', msCast({
  color: '#ffcc44', len: 34, fireAt: 14, endlag: 4,
  keys: [
    { t: 0,  ...MS_STAND },
    { t: 4,  e: 'out',  r: 2.2, w: 2.5, l: 1.0, lean: 4, drop: 8, fr: 10, fl: -10 },
    { t: 10, e: 'out',  r: -1.85, w: -2.05, l: -1.4, lean: -6, drop: -2, fr: 6, fl: -8, trail: true },
    { t: 14, e: 'in3',  r: 1.15, w: 1.48, l: 1.6, lean: 12, drop: 14, fr: 14, fl: -14 },
    { t: 22, e: 'out',  r: 1.20, w: 1.52, l: 1.7, lean: 11, drop: 13, fr: 14, fl: -14 },
    { t: 34, e: 'io',   ...MS_STAND },
  ],
  tick(sc) { if (sc.at(4)) sc.hop(-6.5, 1.0); },
  onFire(sc) { sc.flash('#ffe08a', 0.10, 5); sc.ring(sc.ucx() + sc.f * 30, sc.ub.y + sc.user.h, 110, '#ffcc44', 18); },
}));

// E — Mjolnir: a sweeping swing that has to catch; whoever it catches is
// swung round twice on the hammer head and thrown, under a lightning strike.
msDefine('hammer:e', {
  color: '#ffcc44', endlag: 8,
  tracks: {
    main: { len: 16, keys: [
      { t: 0,  ...MS_STAND },
      { t: 8,  e: 'out',  r: 3.05, w: 3.15, l: 0.4, lean: -7, drop: 9, fr: 14, fl: -13 },
      { t: 9,  e: 'hold', r: 3.10, w: 3.20, l: 0.4, lean: -7, drop: 9, fr: 14, fl: -13, trail: true },
      { t: 14, e: 'snap', r: 6.2, w: 6.25, l: 2.4, lean: 10, drop: 7, fr: 17, fl: -12 },
      { t: 16, e: 'lin',  r: 6.4, w: 6.5, l: 2.3, lean: 10, drop: 7, fr: 17, fl: -12 },
    ] },
    whiff: { len: 20, keys: [
      { t: 0,  r: 6.4, w: 6.5, l: 2.3, lean: 10, drop: 7, fr: 17, fl: -12 },
      { t: 20, e: 'io', r: 0.95 + MS_TAU, w: 0.75 + MS_TAU, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
    ] },
    // Two turns: the arm sweeps through a full circle per turn while the
    // victim rides the hammer head round a flattened orbit.
    spin: { len: 64, keys: [
      { t: 0,  r: 0.1, w: 0.1, l: 2.4, lean: -8, drop: 8, fr: 12, fl: -12 },
      { t: 6,  e: 'in',  r: -0.2, w: -0.2, l: 2.6, lean: -12, drop: 9, fr: 10, fl: -14, trail: true },
      { t: 46, e: 'lin', r: -0.2 - MS_TAU * 2, w: -0.2 - MS_TAU * 2, l: 2.6, lean: -12, drop: 9, fr: 10, fl: -14 },
      { t: 50, e: 'snap', r: 0.25 - MS_TAU * 2, w: 0.2 - MS_TAU * 2, l: 2.4, lean: 14, drop: 6, fr: 18, fl: -12 },
      { t: 64, e: 'io',  r: 0.95 - MS_TAU * 2, w: 0.75 - MS_TAU * 2, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.in(4, 14)) sc.dash(4);
      if (sc.in(9, 15)) {
        const c = msCatch(sc, sc.findFront(118, 70));
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          const v = sc.vars.v;
          sc.hit(v, 10, 0, { big: true });
          sc.shake(10);
          sc.zoom(1.12, 70);
          sc.sfx('swing');
          if (sc.vars.locked) sc.vpose(v, 'tumble');
          sc.play('spin');
        }
      }
    } else if (sc.track === 'spin') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (held && sc.lt < 47) {
        // Orbit the hammer head: angle follows the arm, flattened like a top seen side-on.
        const a = sc.user._movePose ? sc.user._movePose.r : 0;
        sc.place(v, Math.cos(a) * 64, -10 + Math.sin(a) * 22, sc.lt < 6 ? 0.4 : 1);
        sc.body(v).rot = -a;
      }
      if (sc.at(16) || sc.at(36)) { sc.sfx('swing'); if (held || sc.near(v, 100)) sc.hit(v, 8, 0); sc.shake(6); }
      if (sc.at(26)) { sc.slash(0, -10, 70, 0, MS_TAU, { ry: 24, color: '#ffe08a', w: 9, life: 12 }); }
      if (sc.at(48)) {
        if (held || sc.near(v, 110)) {
          if (sc.hit(v, 16, 14, { big: true }) === 'hit') {
            if (typeof spawnLightningBolt === 'function') spawnLightningBolt(v.cx(), v.cy());
            sc.flash('#fff6c8', 0.25, 7);
            sc.freeze(7);
            sc.shake(22);
          }
        }
        if (held) sc.release(v, 17, -9, { tumble: 34, stun: 26 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SPEAR
// ═════════════════════════════════════════════════════════════════════════════
// Q — Ground Spike: hop, spear reversed overhead, driven point-first into the floor.
msDefine('spear:q', msCast({
  color: '#aaaaff', len: 30, fireAt: 13, endlag: 4,
  keys: [
    { t: 0,  ...MS_STAND },
    { t: 7,  e: 'out',  r: -1.75, rl: 0.95, w: 1.57, l: -1.45, ll: 0.95, lean: -2, drop: -2, fr: 5, fl: -7 },
    { t: 10, e: 'hold', r: -1.80, rl: 0.95, w: 1.57, l: -1.5, ll: 0.95, lean: -2, drop: -2, fr: 5, fl: -7 },
    { t: 13, e: 'in3',  r: 1.25, rl: 0.9, w: 1.57, l: 1.35, ll: 0.75, lean: 13, drop: 15, fr: 14, fl: -14 },
    { t: 21, e: 'out',  r: 1.25, rl: 0.9, w: 1.57, l: 1.35, ll: 0.75, lean: 12, drop: 14, fr: 14, fl: -14 },
    { t: 30, e: 'io',   ...MS_STAND },
  ],
  tick(sc) { if (sc.at(3)) sc.hop(-6, 1.05); },
  onFire(sc) { sc.ring(sc.ucx(), sc.ub.y + sc.user.h, 120, '#aaaaff', 16); },
}));

// E — Lance Charge: couch the spear, charge, and if the point lands, run them
// onto it, carry them, and flick them off the end into the air.
msDefine('spear:e', {
  color: '#aaaaff', endlag: 8,
  tracks: {
    main: { len: 28, keys: [
      { t: 0,  ...MS_STAND },
      { t: 8,  e: 'out', r: 2.5, rl: 0.9, w: 0.0, l: 0.7, ll: 0.75, lean: -6, drop: 9, fr: 11, fl: -14 },
      { t: 11, e: 'snap', r: 0.25, rl: 0.95, w: 0.0, l: 0.2, ll: 0.7, lean: 15, drop: 6, fr: 18, fl: -18 },
      { t: 28, e: 'lin',  r: 0.25, rl: 0.95, w: 0.0, l: 0.2, ll: 0.7, lean: 16, drop: 6, fr: 18, fl: -18 },
    ] },
    whiff: { len: 18, keys: [
      { t: 0,  r: 0.25, rl: 0.95, w: 0.0, l: 0.2, ll: 0.7, lean: 16, drop: 6, fr: 18, fl: -18 },
      { t: 6,  e: 'out', r: 0.6, w: 0.4, l: 1.0, lean: -6, drop: 12, fr: 22, fl: -4 },
      { t: 18, e: 'io', ...MS_STAND },
    ] },
    carry: { len: 40, keys: [
      { t: 0,  r: 0.25, rl: 0.95, w: 0.0, l: 0.2, ll: 0.7, lean: 16, drop: 6, fr: 18, fl: -18 },
      { t: 12, e: 'lin', r: 0.20, rl: 1.0, w: -0.05, l: 0.15, ll: 0.7, lean: 14, drop: 7, fr: 18, fl: -18 },
      { t: 16, e: 'in', r: 0.45, rl: 0.9, w: 0.25, l: 0.5, ll: 0.7, lean: 4, drop: 11, fr: 16, fl: -16, trail: true },
      { t: 20, e: 'snap', r: -1.05, rl: 1.05, w: -1.25, l: -0.9, ll: 0.8, lean: -8, drop: 2, fr: 10, fl: -14 },
      { t: 40, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.lt >= 11) {
        sc.dash(14);
        const c = msCatch(sc, sc.findFront(72, 54));
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          const v = sc.vars.v;
          sc.hit(v, 10, 0, { big: true });
          sc.freeze(4);
          sc.zoom(1.1, 50);
          if (sc.vars.locked) sc.vpose(v, 'skewer');
          sc.play('carry');
        }
      }
    } else if (sc.track === 'carry') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (sc.lt < 12) sc.dash(10 - sc.lt * 0.4);
      if (held && sc.lt < 20) {
        const tipA = sc.user._movePose ? sc.user._movePose.w : 0;
        sc.place(v, 46 + Math.cos(tipA) * 22, -8 + Math.sin(tipA) * 40, sc.lt < 3 ? 0.5 : 1);
      }
      if (sc.at(19)) {
        sc.sfx('swing');
        if (held || sc.near(v, 110)) sc.hit(v, 18, 14, { big: true });
        sc.slash(30, -30, 52, 0.4, -1.4, { color: '#c8c8ff', w: 10, life: 12 });
        sc.shake(14);
        if (held) sc.release(v, 8, -13, { tumble: 30, stun: 24 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// GUN / PEA SHOOTER / FLAMETHROWER / BOW / SLINGSHOT / PAPER AIRPLANE / BOOMERANG
// ═════════════════════════════════════════════════════════════════════════════
// Recoil on top of an aimed pose: the barrel kicks up on each shot interval.
function msRecoil(period, kick, from, to) {
  return (sc, p) => {
    if (sc.lt < from || sc.lt > to) return p;
    const ph = ((sc.lt - from) % period) / period;
    const k = Math.max(0, 1 - ph * 2.2) * kick;
    p.r -= k; p.w -= k * 1.5; p.lean -= k * 6;
    return p;
  };
}
msDefine('gun:q', msCast({
  color: '#ffdd00', len: 24, fireAt: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 4, e: 'snap', ...MS_AIM },
    { t: 16, e: 'lin', ...MS_AIM },
    { t: 24, e: 'io', ...MS_STAND },
  ],
  poseMod: msRecoil(3.6, 0.22, 4, 14),
}));
msDefine('gun:e', msCast({
  color: '#ff8800', len: 52, fireAt: 5, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 5, e: 'snap', ...MS_AIM, drop: 7, fr: 13, fl: -14 },
    { t: 44, e: 'lin', ...MS_AIM, drop: 7, fr: 13, fl: -14 },
    { t: 52, e: 'io', ...MS_STAND },
  ],
  poseMod: msRecoil(3, 0.16, 5, 46),
}));
msDefine('peashooter:q', msCast({
  color: '#44cc44', len: 44, fireAt: 3,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 3, e: 'snap', ...MS_AIM },
    { t: 38, e: 'lin', ...MS_AIM },
    { t: 44, e: 'io', ...MS_STAND },
  ],
  poseMod: msRecoil(3.9, 0.12, 3, 39),
}));
msDefine('peashooter:e', msCast({
  color: '#44ff44', len: 26, fireAt: 12,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 10, e: 'out', ...MS_AIM, r: -0.35, w: -0.38, l: -0.2, lean: -4, drop: 6 },
    { t: 13, e: 'snap', ...MS_AIM, r: -0.75, w: -0.85, l: -0.55, lean: -10, drop: 7 },
    { t: 26, e: 'io', ...MS_STAND },
  ],
}));
msDefine('flamethrower:q', msCast({
  color: '#ff7700', len: 24, fireAt: 8,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 7, e: 'out', ...MS_AIM, lean: 8, drop: 9, fr: 14, fl: -14 },
    { t: 10, e: 'snap', ...MS_AIM, r: -0.35, w: -0.5, lean: -8, drop: 8, fr: 14, fl: -14 },
    { t: 24, e: 'io', ...MS_STAND },
  ],
  tick(sc) { if (sc.in(8, 14)) sc.dash(-3.5); },
}));
// E — Backdraft: brace, the burst goes forward and the shooter is blown back.
msDefine('flamethrower:e', msCast({
  color: '#ff5500', len: 34, fireAt: 10, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 9, e: 'out', ...MS_AIM, lean: 10, drop: 11, fr: 15, fl: -15 },
    { t: 12, e: 'snap', r: -0.55, rl: 1.05, w: -0.4, l: -0.35, ll: 0.8, lean: -12, air: true, lg: 0.9, lgl: 1.3, ls: 0.85, lsl: 0.8, rot: -0.35 },
    { t: 26, e: 'out', r: -0.2, rl: 1.05, w: -0.1, l: 0.1, ll: 0.8, lean: -4, air: true, lg: 1.4, lgl: 1.7, ls: 0.9, lsl: 0.9, rot: -0.1 },
    { t: 34, e: 'io', ...MS_STAND },
  ],
  onFire(sc) { sc.fling(sc.user, -9, -6, 0.6); sc.flash('#ffb060', 0.14, 6); sc.shake(14); },
}));
msDefine('bow:q', msCast({
  color: '#aad47a', len: 22, fireAt: 10,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 4, e: 'out', r: 0.0, rl: 1.1, w: 0.0, l: 0.05, ll: 0.95, lean: 2, drop: 4, fr: 10, fl: -11 },
    { t: 10, e: 'io', r: -0.04, rl: 1.12, w: -0.04, l: 3.2, ll: 0.55, lean: -2, drop: 5, fr: 10, fl: -11 },
    { t: 12, e: 'snap', r: -0.06, rl: 1.12, w: -0.06, l: 2.55, ll: 0.95, lean: -3, drop: 5, fr: 10, fl: -11 },
    { t: 22, e: 'io', ...MS_STAND },
  ],
}));
// E — Arrow Rain: aim high and loose eight times, the string hand cycling.
msDefine('bow:e', msCast({
  color: '#ffee44', len: 46, fireAt: 8, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 8, e: 'out', r: -0.45, rl: 1.12, w: -0.45, l: 3.0, ll: 0.55, lean: -6, drop: 7, fr: 12, fl: -13 },
    { t: 38, e: 'lin', r: -0.45, rl: 1.12, w: -0.45, l: 3.0, ll: 0.55, lean: -6, drop: 7, fr: 12, fl: -13 },
    { t: 46, e: 'io', ...MS_STAND },
  ],
  poseMod(sc, p) {
    if (sc.lt < 8 || sc.lt > 38) return p;
    const ph = ((sc.lt - 8) % 3.3) / 3.3;
    p.l = 2.4 + 0.75 * Math.min(1, ph * 1.6);
    p.ll = 0.95 - 0.4 * Math.min(1, ph * 1.6);
    return p;
  },
}));
msDefine('slingshot:q', msCast({
  color: '#ff9933', len: 26, fireAt: 13,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 5, e: 'out', r: -0.85, rl: 1.1, w: -0.9, l: -0.75, ll: 1.0, lean: -2, drop: 4, fr: 10, fl: -11 },
    { t: 13, e: 'io', r: -0.9, rl: 1.12, w: -0.95, l: 2.4, ll: 0.6, lean: -6, drop: 6, fr: 10, fl: -11 },
    { t: 15, e: 'snap', r: -0.92, rl: 1.12, w: -0.97, l: -0.6, ll: 1.0, lean: 2, drop: 5, fr: 10, fl: -11 },
    { t: 26, e: 'io', ...MS_STAND },
  ],
}));
// E — Gravity Stone: whirl the sling overhead, then let the boulder go.
msDefine('slingshot:e', msCast({
  color: '#ff9933', len: 32, fireAt: 20,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 4, e: 'out', r: -1.6, w: -1.6, l: 1.2, lean: -3, drop: 5, fr: 11, fl: -11 },
    { t: 18, e: 'lin', r: -1.6 - MS_TAU * 1.5, w: -1.6 - MS_TAU * 1.5, l: 1.2, lean: -5, drop: 6, fr: 11, fl: -11, trail: true },
    { t: 21, e: 'snap', r: -0.3 - MS_TAU * 2, w: -0.4 - MS_TAU * 2, l: 2.2, lean: 12, drop: 6, fr: 16, fl: -12 },
    { t: 32, e: 'io', r: 0.95 - MS_TAU * 2, w: 0.75 - MS_TAU * 2, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
}));
msDefine('paperairplane:q', msCast({
  color: '#aaccff', len: 38, fireAt: 2,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 34, e: 'lin', r: -0.4, w: -0.4, l: 1.2, lean: 4, drop: 3, fr: 11, fl: -11 },
    { t: 38, e: 'io', ...MS_STAND },
  ],
  poseMod(sc, p) {
    if (sc.lt < 2 || sc.lt > 32) return p;
    const ph = ((sc.lt - 2) % 7.2) / 7.2;   // one throw per legacy interval
    const k = ph < 0.55 ? ph / 0.55 : 1 - (ph - 0.55) / 0.45;
    p.r = -2.3 + 2.55 * (1 - k); p.w = p.r - 0.2; p.lean = -3 + 9 * (1 - k);
    return p;
  },
}));
msDefine('paperairplane:e', msCast({
  color: '#aaccff', len: 28, fireAt: 11,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 9, e: 'out', r: 1.9, w: 1.9, l: 1.2, lean: 6, drop: 12, fr: 9, fl: -9 },
    { t: 12, e: 'snap', r: -1.25, w: -1.3, l: -1.9, lean: -6, drop: -2, fr: 6, fl: -6 },
    { t: 28, e: 'io', ...MS_STAND },
  ],
}));
msDefine('boomerang:q', msCast({
  color: '#cc9944', len: 22, fireAt: 8,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 6, e: 'out', r: 2.7, w: 3.0, l: 0.6, lean: -6, drop: 7, fr: 12, fl: -12 },
    { t: 9, e: 'snap', r: 0.15, w: 0.3, l: 2.4, lean: 11, drop: 5, fr: 16, fl: -12, trail: true },
    { t: 22, e: 'io', ...MS_STAND },
  ],
}));
msDefine('boomerang:e', msCast({
  color: '#cc9944', len: 28, fireAt: 11,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 9, e: 'out', r: 2.5, w: 2.8, l: 0.4, lean: -9, drop: 10, fr: 13, fl: -13 },
    { t: 12, e: 'snap', r: -0.9 - MS_TAU, w: -0.8 - MS_TAU, l: -2.0, lean: 8, drop: 3, fr: 15, fl: -12 },
    { t: 28, e: 'io', r: 0.95 - MS_TAU, w: 0.75 - MS_TAU, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
  onFire(sc) { sc.slash(0, -10, 58, 0, MS_TAU, { ry: 26, color: '#e8c070', w: 8, life: 12 }); },
}));

// ═════════════════════════════════════════════════════════════════════════════
// SHIELD
// ═════════════════════════════════════════════════════════════════════════════
const MS_SHIELD_UP = { r: 0.12, rl: 0.85, w: -1.45, l: 0.4, ll: 0.75, lean: 12, drop: 7, fr: 17, fl: -16 };
// Q — Shield Bash: rush behind the shield, pin them to its face, drive, shove.
msDefine('shield:q', {
  color: '#88aaff', endlag: 6,
  tracks: {
    main: { len: 18, keys: [
      { t: 0, ...MS_STAND },
      { t: 5, e: 'out', ...MS_SHIELD_UP, lean: -2, drop: 9 },
      { t: 8, e: 'snap', ...MS_SHIELD_UP },
      { t: 18, e: 'lin', ...MS_SHIELD_UP },
    ] },
    whiff: { len: 16, keys: [
      { t: 0, ...MS_SHIELD_UP },
      { t: 5, e: 'out', ...MS_SHIELD_UP, lean: -4, drop: 11, fr: 20, fl: -4 },
      { t: 16, e: 'io', ...MS_STAND },
    ] },
    drive: { len: 26, keys: [
      { t: 0, ...MS_SHIELD_UP },
      { t: 9, e: 'lin', ...MS_SHIELD_UP, lean: 14 },
      { t: 11, e: 'in', ...MS_SHIELD_UP, r: 0.6, rl: 0.7, lean: 4, drop: 10 },
      { t: 14, e: 'snap', ...MS_SHIELD_UP, r: -0.15, rl: 1.15, lean: 18, drop: 6, fr: 20, fl: -14 },
      { t: 26, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.lt >= 6) {
        sc.dash(sc.lt < 8 ? 8 : 12);
        const c = msCatch(sc, sc.findFront(54, 56), 4);
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          sc.shake(8); sc.sfx('clang');
          if (sc.vars.locked) sc.vpose(sc.vars.v, 'reel');
          sc.play('drive');
        }
      }
    } else if (sc.track === 'drive') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (sc.lt < 10) { sc.dash(9); if (held) sc.place(v, 40, 0, 0.6); }
      if (sc.at(13)) {
        if (held || sc.near(v, 90)) {
          if (sc.hit(v, 12, 22, { big: true }) === 'hit') { sc.ring(v.cx(), v.cy(), 70, '#aaccff', 14); sc.freeze(4); }
        }
        sc.shake(14);
        if (held) sc.release(v, 14, -3, { stun: 24 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});
// E — Fortress Charge: a long blazing rush; whoever it meets is carried on the
// shield face and launched by a rising bash at the end of it.
msDefine('shield:e', {
  color: '#88aaff', endlag: 8,
  tracks: {
    main: { len: 30, keys: [
      { t: 0, ...MS_STAND },
      { t: 7, e: 'out', ...MS_SHIELD_UP, lean: -4, drop: 11, fr: 10, fl: -14 },
      { t: 10, e: 'snap', ...MS_SHIELD_UP, lean: 16 },
      { t: 30, e: 'lin', ...MS_SHIELD_UP, lean: 16 },
    ] },
    whiff: { len: 18, keys: [
      { t: 0, ...MS_SHIELD_UP, lean: 16 },
      { t: 6, e: 'out', ...MS_SHIELD_UP, lean: -6, drop: 12, fr: 22, fl: -4 },
      { t: 18, e: 'io', ...MS_STAND },
    ] },
    drive: { len: 40, keys: [
      { t: 0, ...MS_SHIELD_UP, lean: 16 },
      { t: 16, e: 'lin', ...MS_SHIELD_UP, lean: 18 },
      { t: 20, e: 'in', ...MS_SHIELD_UP, r: 1.0, rl: 0.7, w: -1.2, lean: 2, drop: 14 },
      { t: 24, e: 'snap', r: -1.2, rl: 1.1, w: -1.57, l: -0.9, ll: 0.8, lean: -4, drop: -2, fr: 10, fl: -12 },
      { t: 40, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.lt >= 9) {
        sc.dash(17);
        if (sc.lt % 2 < 1) spawnParticles(sc.ucx() - sc.f * 12, sc.ucy(), '#4488ff', 3);
        const c = msCatch(sc, sc.findFront(56, 58), 8);
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          const v = sc.vars.v;
          sc.hit(v, 8, 0, { big: true });
          sc.freeze(5); sc.shake(14); sc.sfx('clang');
          sc.zoom(1.1, 60);
          if (sc.vars.locked) sc.vpose(v, 'reel');
          sc.play('drive');
        }
      }
    } else if (sc.track === 'drive') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (sc.lt < 16) {
        sc.dash(14);
        if (sc.lt % 2 < 1) spawnParticles(sc.ucx() - sc.f * 12, sc.ucy(), '#88aaff', 3);
        if (held) sc.place(v, 42, 0, 0.7);
      } else if (held && sc.lt < 23) sc.place(v, 40, -10, 0.4);
      if (sc.at(23)) {
        if (held || sc.near(v, 100)) {
          if (sc.hit(v, 24, 18, { big: true }) === 'hit') {
            sc.flash('#cfe0ff', 0.2, 6); sc.freeze(7);
            sc.ring(v.cx(), v.cy(), 96, '#aaccff', 18);
          }
        }
        sc.shake(24);
        if (held) sc.release(v, 9, -16, { tumble: 32, stun: 26 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SCYTHE
// ═════════════════════════════════════════════════════════════════════════════
msDefine('scythe:q', msCast({
  color: '#aa44aa', len: 26, fireAt: 11,
  hideWhile: u => !!u._scytheToss,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 8, e: 'out', r: -2.5, w: -2.75, l: 0.5, lean: -8, drop: 7, fr: 13, fl: -13 },
    { t: 9, e: 'hold', r: -2.55, w: -2.8, l: 0.5, lean: -8, drop: 7, fr: 13, fl: -13, trail: true },
    { t: 12, e: 'snap', r: 0.2, w: 0.05, l: 2.4, lean: 13, drop: 5, fr: 17, fl: -12, hide: true },
    { t: 26, e: 'io', ...MS_STAND, hide: true },
  ],
}));
// E — Soul Reap: the blade hooks them from range and reels them in, three
// reaping turns drink from them, the last one tears them upward.
msDefine('scythe:e', {
  color: '#cc44cc', endlag: 6,
  tracks: {
    main: { len: 18, keys: [
      { t: 0, ...MS_STAND },
      { t: 8, e: 'out', r: -2.4, w: -1.9, l: 0.4, lean: -9, drop: 6, fr: 13, fl: -13 },
      { t: 9, e: 'hold', r: -2.45, w: -1.95, l: 0.4, lean: -9, drop: 6, fr: 13, fl: -13, trail: true },
      { t: 13, e: 'snap', r: 0.75, rl: 1.1, w: 1.55, l: 2.3, lean: 14, drop: 9, fr: 18, fl: -12 },
      { t: 18, e: 'lin', r: 0.8, rl: 1.1, w: 1.6, l: 2.3, lean: 14, drop: 9, fr: 18, fl: -12 },
    ] },
    whiff: { len: 16, keys: [
      { t: 0, r: 0.8, rl: 1.1, w: 1.6, l: 2.3, lean: 14, drop: 9, fr: 18, fl: -12 },
      { t: 16, e: 'io', ...MS_STAND },
    ] },
    reap: { len: 64, keys: [
      { t: 0, r: 0.8, rl: 1.1, w: 1.6, l: 2.3, lean: 14, drop: 9, fr: 18, fl: -12 },
      { t: 10, e: 'out', r: 2.4, w: 2.9, l: 0.6, lean: -10, drop: 8, fr: 14, fl: -14 },
      { t: 12, e: 'hold', r: 2.4, w: 2.9, l: 0.6, lean: -10, drop: 8, fr: 14, fl: -14, trail: true },
      { t: 40, e: 'lin', r: 2.4 - MS_TAU * 3, w: 2.9 - MS_TAU * 3, l: 0.6, lean: -10, drop: 8, fr: 14, fl: -14, trail: true },
      { t: 44, e: 'in', r: 2.2 - MS_TAU * 3, w: 2.6 - MS_TAU * 3, l: 1.6, lean: 6, drop: 13, fr: 15, fl: -13, trail: true },
      { t: 48, e: 'snap', r: -1.35 - MS_TAU * 3, w: -1.0 - MS_TAU * 3, l: -1.6, lean: -6, drop: 0, fr: 8, fl: -10 },
      { t: 64, e: 'io', r: 0.95 - MS_TAU * 4, w: 0.75 - MS_TAU * 4, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.in(11, 14)) {
        const c = msCatch(sc, sc.findFront(160, 80), 8);
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          const v = sc.vars.v;
          sc.hit(v, 6, 0);
          sc.zoom(1.12, 70);
          if (sc.vars.locked) sc.vpose(v, 'reel');
          sc.vars.heal = 0;
          sc.play('reap');
        }
      }
    } else if (sc.track === 'reap') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (held && sc.lt < 10) sc.place(v, 50, -2, msEase('in', sc.lt / 10));
      if (held && sc.in(10, 46)) sc.place(v, 50, -2);
      for (const at of [19, 28, 37]) {
        if (sc.at(at)) {
          sc.sfx('swing');
          if ((held || sc.near(v, 100)) && sc.hit(v, 8, 0, { color: '#ee88ee' }) === 'hit') {
            const heal = Math.min(5, sc.user.maxHealth - sc.user.health);
            if (heal > 0) { sc.user.health += heal; sc.vars.heal += heal; }
            spawnParticles(sc.ucx(), sc.ucy(), '#ee88ee', 6);
          }
        }
      }
      if (sc.at(47)) {
        if (held || sc.near(v, 110)) {
          if (sc.hit(v, 12, 12, { big: true, color: '#ee88ee' }) === 'hit') {
            const heal = Math.min(5, sc.user.maxHealth - sc.user.health);
            if (heal > 0) { sc.user.health += heal; sc.vars.heal += heal; }
            sc.flash('#e8b0ff', 0.16, 6); sc.freeze(5);
          }
        }
        if (sc.vars.heal > 0 && typeof damageTexts !== 'undefined' && typeof DamageText !== 'undefined') {
          damageTexts.push(new DamageText(sc.ucx(), sc.user.y - 30, '+' + sc.vars.heal, '#44ff88'));
        }
        sc.shake(16);
        if (held) sc.release(v, 5, -14, { tumble: 30, stun: 24 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// FRYING PAN
// ═════════════════════════════════════════════════════════════════════════════
// Q — Ground Pound: a high hop with the pan overhead, slammed flat on landing.
msDefine('fryingpan:q', msCast({
  color: '#ffdd66', len: 40, fireAt: 999, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 4, e: 'out', r: 2.0, w: 2.2, l: 1.2, lean: 4, drop: 10, fr: 10, fl: -10 },
    { t: 10, e: 'out', r: -1.9, w: -2.1, l: -1.3, lean: -6, air: true, lg: 1.2, lgl: 1.9, ls: 0.75, lsl: 0.8, rot: -0.1 },
    { t: 18, e: 'io', r: -2.0, w: -2.3, l: -1.4, lean: -8, air: true, lg: 1.5, lgl: 1.75, ls: 0.85, lsl: 0.85, rot: -0.15 },
    { t: 22, e: 'in3', r: 1.15, w: 1.45, l: 1.7, lean: 12, drop: 14, fr: 14, fl: -14 },
    { t: 30, e: 'out', r: 1.2, w: 1.5, l: 1.7, lean: 11, drop: 13, fr: 14, fl: -14 },
    { t: 40, e: 'io', ...MS_STAND },
  ],
  tick(sc) {
    if (sc.at(4)) sc.hop(-9, 0.85);
    if (!sc.fired && sc.lt > 8 && sc.ub.landed) {
      sc.fire();
      sc.ring(sc.ucx(), sc.ub.y + sc.user.h, 150, '#ffdd66', 18);
      // Hold the slam pose from here regardless of how long the jump took.
      if (sc.lt < 22) { sc.t0 -= 22 - sc.lt; sc.lt = 22; }
    }
    if (sc.lt >= 22 && !sc.fired) sc.fire();
  },
}));
// E — Grand Slam: BONK on the head (they crumple, seeing stars), a golfer's
// wind-up, and a swing that sends them straight up.
msDefine('fryingpan:e', {
  color: '#ffdd44', endlag: 8,
  tracks: {
    main: { len: 16, keys: [
      { t: 0, ...MS_STAND },
      { t: 8, e: 'out', r: -2.2, w: -2.5, l: 0.6, lean: -6, drop: -1, fr: 12, fl: -10 },
      { t: 9, e: 'hold', r: -2.25, w: -2.55, l: 0.6, lean: -6, drop: -1, fr: 12, fl: -10, trail: true },
      { t: 12, e: 'in3', r: 0.12, rl: 1.1, w: 0.42, l: 1.5, lean: 14, drop: 9, fr: 17, fl: -12 },
      { t: 16, e: 'lin', r: 0.16, rl: 1.1, w: 0.48, l: 1.5, lean: 14, drop: 9, fr: 17, fl: -12 },
    ] },
    whiff: { len: 18, keys: [
      { t: 0, r: 0.16, rl: 1.1, w: 0.48, l: 1.5, lean: 14, drop: 9, fr: 17, fl: -12 },
      { t: 18, e: 'io', ...MS_STAND },
    ] },
    slam: { len: 52, keys: [
      { t: 0, r: 0.16, rl: 1.1, w: 0.48, l: 1.5, lean: 14, drop: 9, fr: 17, fl: -12 },
      { t: 8, e: 'out', r: 0.3, rl: 1.05, w: 0.75, l: 1.5, lean: 12, drop: 9, fr: 17, fl: -12 },
      { t: 22, e: 'io', r: 2.55, w: 2.75, l: 2.45, ll: 0.9, lean: -4, drop: 12, fr: 13, fl: -15 },
      { t: 26, e: 'out', r: 2.65, w: 2.9, l: 2.55, ll: 0.9, lean: -6, drop: 13, fr: 13, fl: -15, trail: true },
      { t: 30, e: 'snap', r: -1.35, w: -1.6, l: -1.2, ll: 0.95, lean: -6, drop: 0, fr: 9, fl: -12 },
      { t: 40, e: 'out', r: -1.45, w: -1.8, l: -1.3, lean: -7, drop: 0, fr: 9, fl: -12 },
      { t: 52, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.lt < 9) sc.dash(4);
      if (sc.in(10, 13)) {
        const c = msCatch(sc, sc.findFront(108, 70), 6);
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          const v = sc.vars.v;
          if (sc.hit(v, 12, 0, { big: true }) === 'hit') {
            if (typeof damageTexts !== 'undefined' && typeof DamageText !== 'undefined') damageTexts.push(new DamageText(v.cx(), v.y - 30, 'BONK!', '#ffdd44'));
          }
          sc.sfx('clang'); sc.shake(10); sc.freeze(5);
          sc.zoom(1.12, 60);
          if (sc.vars.locked) sc.vpose(v, 'crumple');
          sc.play('slam');
        }
      }
    } else if (sc.track === 'slam') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (held && sc.lt < 29) {
        sc.place(v, 40, 0, 0.5);
        if (sc.lt % 4 < 1) spawnParticles(v.cx() + Math.cos(sc.lt * 0.6) * 12, v.y - 4, '#ffee66', 1);
      }
      if (sc.at(28)) {
        if (held || sc.near(v, 100)) {
          if (sc.hit(v, 33, 8, { big: true }) === 'hit') { sc.flash('#fff2b0', 0.2, 7); sc.freeze(8); sc.ring(v.cx(), v.cy(), 100, '#ffdd44', 18); }
        }
        sc.shake(24);
        sc.slash(14, -10, 54, 2.4, -1.4, { color: '#ffe680', w: 13, life: 14 });
        if (held) sc.release(v, 1.5, -21, { tumble: 36, stun: 28 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// BROOMSTICK
// ═════════════════════════════════════════════════════════════════════════════
// Q — Broom Ride: hop on and fly a short arc, ramming anything in the way. The
// flight is a scene arc, so it stops at the ledge rather than flying off it.
const MS_BROOM_SIT = { r: 1.05, rl: 0.75, w: 0.0, l: 0.9, ll: 0.7, lean: 6, air: true, lg: 0.55, lgl: 0.9, ls: 0.62, lsl: 0.66, rot: -0.12 };
msDefine('broomstick:q', {
  color: '#cc9966', endlag: 4,
  tracks: {
    main: { len: 30, keys: [
      { t: 0, ...MS_STAND },
      { t: 5, e: 'out', r: 1.5, w: 0.1, l: 1.2, lean: 4, drop: 11, fr: 9, fl: -9 },
      { t: 8, e: 'snap', ...MS_BROOM_SIT },
      { t: 26, e: 'lin', ...MS_BROOM_SIT, rot: 0.1 },
      { t: 30, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.at(6)) { sc.fling(sc.user, 13, -5, 0.42); sc.vars.hit = new Set(); spawnParticles(sc.ucx(), sc.ucy() + 10, '#ffdd88', 8); }
    if (sc.in(6, 27)) {
      if (sc.lt % 2 < 1) spawnParticles(sc.ucx() - sc.f * 20, sc.ucy() + 12, '#cc9966', 2);
      for (const t of sc.allNear(58)) {
        if (sc.vars.hit.has(t)) continue;
        sc.vars.hit.add(t);
        if (sc.hit(t, 16, 14) === 'hit') sc.shake(10);
      }
      if (sc.lt > 12 && sc.ub.landed) { sc.stop(sc.user); if (sc.lt < 26) { sc.t0 -= 26 - sc.lt; sc.lt = 26; } }
    }
  },
});
// E — Tornado Spin: arms out, the broom whirls round twice and blasts everyone out.
msDefine('broomstick:e', msCast({
  color: '#cc9966', len: 40, fireAt: 18, endlag: 6,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 6, e: 'out', r: 0.0, w: 0.0, l: 3.14, lean: 0, drop: 6, fr: 12, fl: -12 },
    { t: 30, e: 'in', r: -MS_TAU * 2.5, w: -MS_TAU * 2.5, l: 3.14 - MS_TAU * 2.5, lean: 0, drop: 6, fr: 12, fl: -12, trail: true },
    { t: 40, e: 'out', r: 0.95 - MS_TAU * 3, w: 0.75 - MS_TAU * 3, l: 1.4 - MS_TAU * 3, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
  tick(sc) { if (sc.in(6, 30) && sc.lt % 6 < 1) sc.slash(0, -8, 74, 0, MS_TAU, { ry: 22, color: '#e0c090', w: 6, life: 8 }); },
}));

// ═════════════════════════════════════════════════════════════════════════════
// COMBAT (fists)
// ═════════════════════════════════════════════════════════════════════════════
// Q — Roundhouse: chamber, spin, the kicking leg comes round at head height.
msDefine('combat:q', msCast({
  color: '#ff4444', len: 24, fireAt: 8,
  keys: [
    { t: 0, ...MS_STAND, r: 1.3, l: 1.0 },
    { t: 4, e: 'out', r: -0.5, rl: 0.6, l: -0.8, ll: 0.6, lean: -4, drop: 7, fr: 9, fl: -9 },
    { t: 8, e: 'snap', r: 2.6, rl: 0.8, l: 2.2, ll: 0.8, lean: -12, air: true, lg: -0.15, lgl: 1.62, ls: 1.08, lsl: 0.95, rot: -0.3 },
    { t: 13, e: 'out', r: 2.7, rl: 0.8, l: 2.3, ll: 0.8, lean: -12, air: true, lg: 0.1, lgl: 1.62, ls: 1.05, lsl: 0.95, rot: -0.3 },
    { t: 24, e: 'io', ...MS_STAND, r: 1.3, l: 1.0 },
  ],
  onFire(sc) { sc.slash(6, -14, 62, 2.9, 6.6, { ry: 18, color: '#ff8080', w: 10, life: 10 }); sc.sfx('swing'); },
  tick(sc) { if (sc.lt < 7) sc.dash(4); },
}));
// E — Combo Strike: the dash must land; then an uppercut, a hang, an aimed kick.
// Aim with left/right (bots aim at the nearer side), commit with attack.
msDefine('combat:e', {
  color: '#ff4444', endlag: 8,
  tracks: {
    main: { len: 28, keys: [
      { t: 0, r: 1.3, l: 1.0 },
      { t: 3, e: 'out', r: 2.3, rl: 0.7, l: 0.4, ll: 0.75, lean: 14, drop: 8, fr: 17, fl: -17 },
      { t: 28, e: 'lin', r: 2.3, rl: 0.7, l: 0.4, ll: 0.75, lean: 15, drop: 8, fr: 17, fl: -17 },
    ] },
    whiff: { len: 22, keys: [
      { t: 0, r: 2.3, rl: 0.7, l: 0.4, ll: 0.75, lean: 15, drop: 8, fr: 17, fl: -17 },
      { t: 6, e: 'out', r: 1.6, l: 1.4, lean: -6, drop: 12, fr: 21, fl: -4 },
      { t: 22, e: 'io', r: 1.3, l: 1.0 },
    ] },
    upper: { len: 38, keys: [
      { t: 0, r: 2.3, rl: 0.7, l: 0.4, ll: 0.75, lean: 15, drop: 8, fr: 17, fl: -17 },
      { t: 2, e: 'in', r: 1.9, rl: 0.6, l: 0.8, ll: 0.7, lean: 6, drop: 13, fr: 12, fl: -14 },
      { t: 5, e: 'snap', r: -1.35, rl: 1.15, l: 1.9, ll: 0.8, lean: -6, air: true, lg: 1.35, lgl: 2.1, ls: 0.95, lsl: 0.7 },
      { t: 38, e: 'out', r: -0.9, rl: 0.9, l: 2.2, ll: 0.8, lean: -4, air: true, lg: 1.0, lgl: 2.0, ls: 0.7, lsl: 0.7, rot: -0.2 },
    ] },
    aim: { len: 999, keys: [
      { t: 0, r: -0.9, rl: 0.9, l: 2.2, ll: 0.8, lean: -4, air: true, lg: 1.0, lgl: 2.0, ls: 0.7, lsl: 0.7, rot: -0.2 },
      { t: 10, e: 'out', r: 2.6, rl: 0.75, l: 2.3, ll: 0.75, lean: -8, air: true, lg: 2.4, lgl: 1.4, ls: 0.6, lsl: 0.8, rot: -0.5 },
    ] },
    kick: { len: 22, keys: [
      { t: 0, r: 2.6, rl: 0.75, l: 2.3, ll: 0.75, lean: -8, air: true, lg: 2.4, lgl: 1.4, ls: 0.6, lsl: 0.8, rot: -0.5 },
      { t: 3, e: 'snap', r: 2.8, rl: 0.8, l: 2.5, ll: 0.8, lean: -12, air: true, lg: 0.0, lgl: 1.9, ls: 1.1, lsl: 0.75, rot: -0.35 },
      { t: 22, e: 'out', r: 1.6, l: 1.3, lean: 0, air: true, lg: 1.3, lgl: 1.9, ls: 0.9, lsl: 0.9, rot: 0 },
    ] },
  },
  start(sc) {
    const t = sc.findNear(9999);
    if (t) sc.f = t.cx() > sc.user.cx() ? 1 : -1;
    sc.vars.t = t;
  },
  // The aim line and the auto-fire clock, for the human doing the aiming.
  draw(sc) {
    const u = sc.user;
    if (!sc.vars.aimShow || u.isAI || sc.track !== 'aim') return;
    const a = sc.vars.aim || 0;
    const px = u.cx(), py = u.cy() - 18;
    const ox = px + Math.cos(a) * 30, oy = py + Math.sin(a) * 30;
    const hx = ox + Math.cos(a) * 150, hy = oy + Math.sin(a) * 150;
    const left = Math.max(0, 1 - sc.lt / COMBO_SUPER_AIM_FRAMES);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 12;
    ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffee66';
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14);
    ctx.lineTo(hx + Math.cos(a + 2.5) * 13, hy + Math.sin(a + 2.5) * 13);
    ctx.lineTo(hx + Math.cos(a - 2.5) * 13, hy + Math.sin(a - 2.5) * 13);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = left < 0.3 ? '#ff4433' : '#ffcc44';
    ctx.beginPath(); ctx.arc(px, py, 26, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); ctx.stroke();
  },
  poseMod(sc, p) {
    // The kick leg points down the aim line while aiming and on the strike.
    if ((sc.track === 'aim' && sc.lt > 8) || (sc.track === 'kick' && sc.lt >= 3)) {
      const a = sc.vars.aim || 0;
      const ca = sc.f > 0 ? a : Math.PI - a;
      if (sc.track === 'kick') { p.lg = ca; p.rot = 0; }
      else { p.lg = ca + 2.2; p.ls = 0.6; }
    }
    return p;
  },
  tick(sc) {
    const u = sc.user;
    if (sc.track === 'main') {
      sc.dash(sc.lt < 4 ? 10 : 18);
      const c = msCatch(sc, sc.findFront(COMBO_SUPER_REACH, 70), 8);
      if (c === 'blocked') sc.play('whiff');
      else if (c === 'caught') { sc.zoom(1.14, 120); sc.play('upper'); }
    } else if (sc.track === 'upper') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (held && sc.lt < 3) sc.place(v, 34, 0, 0.5);
      if (sc.at(3)) {
        if (held || sc.near(v, 90)) sc.hit(v, 20, 0, { big: true });
        sc.shake(14);
        if (held) { sc.fling(v, 0.6, -15, 0.6); sc.vpose(v, 'lift'); }
        sc.hop(-12.5, 0.6);
      }
      // Both bodies hang near the top of the arc for the aim.
      if (sc.lt > 22) {
        sc.stop(u);
        if (held) sc.place(v, 44, -40, 0.25);
      }
    } else if (sc.track === 'aim') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      if (msHeld(sc, v)) sc.place(v, 44, -40, 0.4);
      if (sc.vars.aim === undefined) sc.vars.aim = sc.f > 0 ? -0.55 : MS_PI + 0.55;
      if (u.isAI || !u.controls) {
        const outLeft = u.cx() < ((sc.span.L + sc.span.R) / 2);
        sc.vars.aim = outLeft ? MS_PI + 0.35 : -0.35;
        if (sc.lt >= 18) sc.play('kick');
      } else {
        const c = u.controls;
        if (typeof keysDown !== 'undefined') {
          if (keysDown.has(c.left)) sc.vars.aim -= COMBO_SUPER_AIM_RATE * sc.dt;
          if (keysDown.has(c.right)) sc.vars.aim += COMBO_SUPER_AIM_RATE * sc.dt;
          const atk = keysDown.has(c.attack);
          if ((atk && !sc.vars.atkWas && sc.lt > 6) || sc.lt >= COMBO_SUPER_AIM_FRAMES) sc.play('kick');
          sc.vars.atkWas = atk;
        }
      }
      sc.vars.aimShow = true;
    } else if (sc.track === 'kick') {
      sc.vars.aimShow = false;
      const v = sc.vars.v;
      if (sc.at(3) && v && v.health > 0) {
        const a = sc.vars.aim || 0;
        sc.f = Math.cos(a) >= 0 ? 1 : -1;
        const held = msHeld(sc, v);
        if (held || sc.near(v, 100, 100)) {
          if (sc.hit(v, 34, 0, { big: true }) === 'hit') { sc.flash('#ffd0d0', 0.2, 7); sc.freeze(8); sc.ring(v.cx(), v.cy(), 110, '#ff6666', 18); }
        }
        sc.shake(22);
        if (held) {
          sc.release(v, 0, 0, { raw: true, tumble: 36, stun: 30 });
          v.vx = Math.cos(a) * 26; v.vy = Math.sin(a) * 26;
        }
        sc.fling(u, -2, -2, 0.6);
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    if (track === 'upper') {
      // Nobody is hanging there to aim at (a boss is hit, never held): kick now.
      const v = sc.vars.v;
      if (!msHeld(sc, v)) { sc.vars.aim = v && v.cx() < sc.ucx() ? MS_PI + 0.3 : -0.3; sc.play('kick'); }
      else sc.play('aim');
      return true;
    }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// FLAIL
// ═════════════════════════════════════════════════════════════════════════════
msDefine('flail:q', msCast({
  color: '#aaaaaa', len: 26, fireAt: 12,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 10, e: 'in', r: -MS_TAU - 1.6, w: -MS_TAU - 1.6, l: 1.0, lean: -6, drop: 6, fr: 12, fl: -12, trail: true },
    { t: 13, e: 'snap', r: -MS_TAU + 0.15, w: -MS_TAU + 0.05, l: 2.3, lean: 12, drop: 6, fr: 16, fl: -12 },
    { t: 26, e: 'io', r: 0.95 - MS_TAU, w: 0.75 - MS_TAU, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
}));
msDefine('flail:e', msCast({
  color: '#aaaaaa', len: 20, fireAt: 10,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 10, e: 'in', r: -1.57 - MS_TAU, w: -1.57 - MS_TAU, l: 1.0, lean: -2, drop: 6, fr: 12, fl: -12, trail: true },
    { t: 20, e: 'out', r: -1.4 - MS_TAU, w: -1.5 - MS_TAU, l: 1.2, lean: 0, drop: 4, fr: 10, fl: -10 },
  ],
}));

// ═════════════════════════════════════════════════════════════════════════════
// WHIP
// ═════════════════════════════════════════════════════════════════════════════
// Q — Lasso: an overhead crack throws the loop; whoever it lands on is reeled
// in hand over hand and cracked point-blank, hooked and bleeding.
msDefine('whip:q', {
  color: '#cc8833', endlag: 4,
  tracks: {
    main: { len: 18, keys: [
      { t: 0, ...MS_STAND },
      { t: 7, e: 'out', r: -2.35, w: -2.6, l: 0.6, lean: -7, drop: 5, fr: 12, fl: -12 },
      { t: 11, e: 'snap', r: 0.05, rl: 1.15, w: 0.0, l: 2.2, lean: 12, drop: 5, fr: 16, fl: -12 },
      { t: 18, e: 'lin', r: 0.1, rl: 1.15, w: 0.05, l: 2.2, lean: 12, drop: 5, fr: 16, fl: -12 },
    ] },
    whiff: { len: 14, keys: [
      { t: 0, r: 0.1, rl: 1.15, w: 0.05, l: 2.2, lean: 12, drop: 5, fr: 16, fl: -12 },
      { t: 14, e: 'io', ...MS_STAND },
    ] },
    reel: { len: 36, keys: [
      { t: 0, r: 0.1, rl: 1.15, w: 0.05, l: 2.2, lean: 12, drop: 5, fr: 16, fl: -12 },
      { t: 4, e: 'out', r: 2.3, rl: 0.8, w: 2.4, l: 0.3, ll: 1.0, lean: -12, drop: 9, fr: 15, fl: -13 },
      { t: 8, e: 'io', r: 0.4, rl: 0.9, w: 0.3, l: 2.4, ll: 0.8, lean: -10, drop: 9, fr: 15, fl: -13 },
      { t: 12, e: 'io', r: 2.3, rl: 0.8, w: 2.4, l: 0.3, ll: 1.0, lean: -12, drop: 9, fr: 15, fl: -13 },
      { t: 15, e: 'out', r: -2.3, w: -2.5, l: 0.5, lean: -6, drop: 6, fr: 12, fl: -12 },
      { t: 18, e: 'snap', r: 0.3, rl: 1.1, w: 0.4, l: 2.2, lean: 12, drop: 6, fr: 16, fl: -12, trail: true },
      { t: 36, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main') {
      if (sc.at(10)) sc.sfx('hitSnap');
      if (sc.in(10, 13)) {
        const c = msCatch(sc, sc.findFront(280, 80), 6);
        if (c === 'blocked') sc.play('whiff');
        else if (c === 'caught') {
          const v = sc.vars.v;
          sc.hit(v, 8, 0, { color: '#ffcc44' });
          sc.user._whipCrack = { x: v.cx(), y: v.cy(), timer: 12, big: true };
          if (sc.vars.locked) sc.vpose(v, 'reel', { lean: 8 });
          sc.vars.from = { dx: (v.cx() - sc.ucx()) * sc.f, dy: v.cy() - sc.ucy() };
          sc.play('reel');
        }
      }
    } else if (sc.track === 'reel') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (held && sc.lt < 14) {
        // Two hauls: the rope comes in in two pulls, not one smooth slide.
        const k = sc.lt < 7 ? msEase('out', sc.lt / 7) * 0.55 : 0.55 + msEase('out', (sc.lt - 7) / 7) * 0.45;
        const fr = sc.vars.from;
        sc.place(v, fr.dx + (46 - fr.dx) * k, fr.dy * (1 - k));
      }
      if (sc.lt < 15) sc.user._whipRope = { tx: v.cx(), ty: v.cy(), timer: 2, isLasso: true, tgt: v };
      if (sc.at(17)) {
        sc.sfx('hitSnap');
        if (held || sc.near(v, 90)) {
          if (sc.hit(v, 16, 4, { big: true, color: '#ffcc44' }) === 'hit') {
            v._whipSlow = 22; v._whipHooked = 90; v._whipHookSrc = sc.user;
            if (typeof sc.user._whipApplyBleed === 'function') sc.user._whipApplyBleed(v, true);
            sc.freeze(4);
          }
        }
        sc.user._whipCrack = { x: v.cx(), y: v.cy(), timer: 14, big: true };
        sc.shake(12);
        if (held) sc.release(v, 3, -4, { stun: 22 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('whiff'); return true; }
    return false;
  },
});
// E — Serpent's Coil: three full-body lashes, timed to the coil's own reach.
msDefine('whip:e', msCast({
  color: '#ffcc55', len: 70, fireAt: 1, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 70, e: 'lin', ...MS_STAND },
  ],
  poseMod(sc, p) {
    if (sc.lt < 1 || sc.lt > 67) return p;
    const ph = ((sc.lt - 1) % 22) / 22;
    if (ph < 0.4) {
      const k = msEase('snap', ph / 0.4);
      p.r = -2.4 + 2.5 * k; p.w = p.r + 0.1; p.lean = -6 + 18 * k; p.trail = ph > 0.08;
    } else {
      const k = msEase('io', (ph - 0.4) / 0.6);
      p.r = 0.1 - 2.5 * k; p.w = p.r + 0.1; p.lean = 12 - 18 * k;
    }
    p.l = 1.9; p.drop = 7; p.fr = 15; p.fl = -13; p.rl = 1.1;
    return p;
  },
}));

// ═════════════════════════════════════════════════════════════════════════════
// KATANA
// ═════════════════════════════════════════════════════════════════════════════
// Q — Iaijutsu: hand on the hilt, a blink-fast draw that passes THROUGH them,
// a held pose — and the cut only lands when the blade goes back in its sheath.
// Standing still: a longer draw, 28. Moving: a shorter one, 22.
const MS_IAI_HOLD = { r: 2.05, rl: 0.75, w: 2.95, l: 1.85, ll: 0.7, lean: 6, drop: 12, fr: 13, fl: -15 };
const MS_IAI_CUT  = { r: -0.15, rl: 1.15, w: -0.35, l: 2.7, ll: 0.9, lean: 14, drop: 9, fr: 20, fl: -14 };
msDefine('katana:q', {
  color: '#ccccff', endlag: 4,
  tracks: {
    main: { len: 50, keys: [
      { t: 0, ...MS_STAND },
      { t: 10, e: 'out', ...MS_IAI_HOLD },
      { t: 14, e: 'hold', ...MS_IAI_HOLD, trail: true },
      { t: 16, e: 'snap', ...MS_IAI_CUT },
      { t: 30, e: 'lin', ...MS_IAI_CUT, w: -0.3 },
      { t: 34, e: 'io', r: 1.6, rl: 0.8, w: 3.1, l: 1.9, ll: 0.7, lean: 2, drop: 6, fr: 12, fl: -12 },
      { t: 50, e: 'io', ...MS_STAND },
    ] },
  },
  start(sc) {
    const u = sc.user;
    sc.vars.still = Math.abs(u.vx) < 2 && Math.abs(u.vy) < 2;
    sc.vars.cut = [];
  },
  tick(sc) {
    const still = sc.vars.still;
    if (sc.at(14)) {
      // The draw: one blink across the gap. Everything it passes is marked.
      const dist = still ? 150 : 190;
      const x0 = sc.ucx();
      for (let i = 0; i < 4; i++) sc.dash(dist / 4 / sc.dt);
      const x1 = sc.ucx();
      const lo = Math.min(x0, x1) - 16, hi = Math.max(x0, x1) + 30;
      for (const t of _msAllFighters()) {
        if (!sc._targetable(t)) continue;
        if (t.cx() < lo || t.cx() > hi || Math.abs(t.cy() - sc.ucy()) > 64) continue;
        const c = msCatch(sc, t, 6);
        if (c === 'caught') { sc.vars.cut.push(t); if (msHeld(sc, t)) sc.vpose(t, 'frozen'); }
      }
      sc.streak(x0, sc.ucy() - 2, x1 + sc.f * 30, sc.ucy() - 2, still ? '#ffffff' : '#ccccff', 22, still ? 7 : 5);
      sc.sfx('swing');
      sc.shake(still ? 10 : 6);
      if (sc.vars.cut.length) sc.zoom(1.15, 40);
    }
    if (sc.in(15, 36)) for (const t of sc.vars.cut) if (msHeld(sc, t)) sc.stop(t);
    if (sc.at(34)) sc.sfx('iaiSheathe');
    if (sc.at(37)) {
      for (const t of sc.vars.cut) {
        if (t.health <= 0) continue;
        const r = sc.hit(t, still ? 28 : 22, still ? 20 : 10, { big: true, color: '#ffffff' });
        if (r === 'hit') {
          MoveScene.fx.push({ kind: 'line', x0: t.cx() - 38, y0: t.cy() + 26, x1: t.cx() + 38, y1: t.cy() - 26, color: '#ffffff', life: 14, max: 14, w: 9 });
          if (sc.user.charClass === 'ronin' && t.health <= 0) {
            sc.user.cooldown = 0; sc.vars.roninReset = true;
            sc.user.superMeter = Math.min(100, sc.user.superMeter + 30);
          }
        }
        if (msHeld(sc, t)) sc.release(t, still ? -9 : -6, -7, { tumble: still ? 28 : 0, stun: 22 });
      }
      if (sc.vars.cut.length) { sc.flash('#ffffff', still ? 0.3 : 0.18, 7); sc.freeze(still ? 8 : 5); sc.shake(still ? 22 : 12); }
    }
  },
  onEnd(sc) {
    if (sc.vars.roninReset) sc.user.abilityCooldown = 0;
    return false;
  },
});
// E — Shadow Step: vanish, reappear behind them, three cuts from behind and a
// final draw-through that sends them flying.
msDefine('katana:e', {
  color: '#ffffff', endlag: 6,
  tracks: {
    main: { len: 8, keys: [
      { t: 0, ...MS_STAND },
      { t: 6, e: 'out', ...MS_IAI_HOLD },
      { t: 8, e: 'lin', ...MS_IAI_HOLD },
    ] },
    alone: { len: 26, keys: [
      { t: 0, ...MS_IAI_HOLD },
      { t: 4, e: 'snap', ...MS_IAI_CUT, trail: true },
      { t: 26, e: 'io', ...MS_STAND },
    ] },
    cuts: { len: 62, keys: [
      { t: 0,  ...MS_IAI_HOLD },
      { t: 6,  e: 'out', r: -2.3, w: -2.5, l: 0.6, lean: -4, drop: 6, fr: 12, fl: -12, trail: true },
      { t: 10, e: 'snap', r: 1.0, w: 1.3, l: 2.0, lean: 10, drop: 8, fr: 15, fl: -12, trail: true },
      { t: 18, e: 'snap', r: -1.1, w: -1.4, l: 1.2, lean: -2, drop: 4, fr: 12, fl: -12, trail: true },
      { t: 26, e: 'out', r: 3.0, w: 3.1, l: 0.4, lean: -6, drop: 8, fr: 14, fl: -13 },
      { t: 30, e: 'snap', r: 0.05 + MS_TAU, rl: 1.15, w: -0.05 + MS_TAU, l: 2.6, lean: 14, drop: 7, fr: 18, fl: -12 },
      { t: 38, e: 'out', ...MS_IAI_HOLD, r: MS_IAI_HOLD.r + MS_TAU, w: MS_IAI_HOLD.w + MS_TAU },
      { t: 42, e: 'snap', ...MS_IAI_CUT, r: MS_IAI_CUT.r + MS_TAU, w: MS_IAI_CUT.w + MS_TAU, trail: true },
      { t: 62, e: 'io', r: 0.95 + MS_TAU, w: 0.75 + MS_TAU, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main' && sc.at(6)) {
      const t = sc.findNear(450);
      spawnParticles(sc.ucx(), sc.ucy(), '#888899', 14);
      if (!t) { sc.play('alone'); return; }
      const c = msCatch(sc, t, 8);
      if (c !== 'caught') { sc.play('alone'); return; }
      // Reappear on their far side, facing back at them.
      const dir = t.cx() > sc.ucx() ? 1 : -1;
      const b = sc.ub;
      b.x = t.cx() + dir * (t.w / 2 + 34) - sc.user.w / 2;
      b.y = t.y + t.h - sc.user.h;
      sc._clampBody(b);
      sc.f = -dir;
      sc.stop(sc.user);
      spawnParticles(sc.ucx(), sc.ucy(), '#ffffff', 16);
      sc.zoom(1.16, 70);
      if (msHeld(sc, t)) sc.vpose(t, 'frozen');
      sc.play('cuts');
    } else if (sc.track === 'alone' && sc.at(3)) {
      sc.fire();   // the original in-place burst
    } else if (sc.track === 'cuts') {
      const v = sc.vars.v;
      if (!v || v.health <= 0) { sc.end(); return; }
      const held = msHeld(sc, v);
      if (held && sc.lt < 40) sc.place(v, 36, 0, 0.35);
      const cut = (at, dmg, a0, a1) => {
        if (!sc.at(at)) return;
        sc.sfx('swing');
        if (held || sc.near(v, 90)) sc.hit(v, dmg, 0, { color: '#ffffff' });
        sc.slash(30, -6, 40, a0, a1, { color: '#ffffff', w: 8, life: 9 });
      };
      cut(9, 7, -2.2, 1.1);
      cut(17, 7, 1.2, -1.2);
      cut(29, 8, MS_PI, MS_TAU);
      if (sc.at(41)) {
        if (held || sc.near(v, 100)) {
          if (sc.hit(v, 16, 14, { big: true, color: '#ffffff' }) === 'hit') { sc.flash('#ffffff', 0.25, 7); sc.freeze(7); }
        }
        sc.streak(sc.ucx() - sc.f * 20, sc.ucy(), sc.ucx() + sc.f * 90, sc.ucy() - 6, '#ffffff', 16, 7);
        sc.shake(20);
        if (held) sc.release(v, 14, -8, { tumble: 30, stun: 24 });
      }
    }
  },
  onEnd(sc, track) {
    if (track === 'main') { sc.play('alone'); return true; }
    return false;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// ELECTRIC STAFF
// ═════════════════════════════════════════════════════════════════════════════
msDefine('electricstaff:q', msCast({
  color: '#00eeff', len: 22, fireAt: 7,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 5, e: 'out', r: 2.6, rl: 0.8, w: 0.0, l: 0.6, ll: 0.7, lean: -6, drop: 7, fr: 11, fl: -13 },
    { t: 8, e: 'snap', r: 0.05, rl: 1.15, w: 0.0, l: 0.15, ll: 0.8, lean: 14, drop: 6, fr: 18, fl: -14 },
    { t: 22, e: 'io', ...MS_STAND },
  ],
}));
// E — Thunderstrike: the staff goes up and stays up while the sky answers.
msDefine('electricstaff:e', msCast({
  color: '#00eeff', len: 68, fireAt: 8, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 6, e: 'out', r: 1.9, w: 1.6, l: 1.3, lean: 4, drop: 12, fr: 10, fl: -10 },
    { t: 9, e: 'snap', r: -1.5, rl: 1.15, w: -1.57, l: -1.8, ll: 0.9, lean: -4, drop: -2, fr: 9, fl: -9 },
    { t: 60, e: 'lin', r: -1.52, rl: 1.15, w: -1.57, l: -1.82, ll: 0.9, lean: -4, drop: -2, fr: 9, fl: -9 },
    { t: 68, e: 'io', ...MS_STAND },
  ],
  tick(sc) {
    if (sc.in(9, 60) && sc.lt % 5 < 1 && typeof spawnLightningBolt === 'function') {
      const u = sc.user;
      spawnParticles(u.cx() + sc.f * 4, u.y - 30, '#aaeeff', 3);
    }
  },
}));

// ═════════════════════════════════════════════════════════════════════════════
// WEAPONS-EXT (Bomb, Fragment, Knives, Glass Blade, Anchor, Crossbow)
// ═════════════════════════════════════════════════════════════════════════════
// Bomb Q stays an input mechanic (tap throws, hold detonates) with no scene.
msDefine('bomb:e', msCast({
  color: '#ff8a3d', len: 30, fireAt: 14,
  // The Giga Bomb's fuse outlasts the scene by seconds; its blast is still this move's kill.
  killWhile: u => (u._wxBombs || []).some(b => b.giga && !b.dead),
  keys: [
    { t: 0, ...MS_STAND },
    { t: 10, e: 'out', r: -2.2, rl: 0.85, w: -2.2, l: -2.0, ll: 0.85, lean: -9, drop: 9, fr: 12, fl: -12 },
    { t: 15, e: 'snap', r: -0.5, rl: 1.1, w: -0.5, l: -0.3, ll: 1.05, lean: 12, drop: 4, fr: 16, fl: -12, hide: true },
    { t: 30, e: 'io', ...MS_STAND },
  ],
}));
// Fragment Barrage keeps its own footwork (it follows the victim in), so the
// scene only poses it: four alternating punches, then both palms for the laser.
msDefine('fragment:q', msCast({
  color: '#8fd8ff', len: 56, fireAt: 0, free: true,
  keys: [
    { t: 0, r: 0.0, rl: 1.2, l: 2.0, ll: 0.6, lean: 10, drop: 6, fr: 15, fl: -13 },
    { t: 30, e: 'lin', r: 0.0, rl: 1.2, l: 2.0, ll: 0.6, lean: 10, drop: 6, fr: 15, fl: -13 },
    { t: 36, e: 'out', r: 2.3, rl: 0.6, l: 2.2, ll: 0.6, lean: -6, drop: 10, fr: 13, fl: -14 },
    { t: 40, e: 'snap', r: 0.0, rl: 1.25, l: 0.08, ll: 1.2, lean: 12, drop: 8, fr: 17, fl: -14 },
    { t: 50, e: 'lin', r: 0.0, rl: 1.25, l: 0.08, ll: 1.2, lean: 12, drop: 8, fr: 17, fl: -14 },
    { t: 56, e: 'io', r: 1.3, l: 1.0 },
  ],
  poseMod(sc, p) {
    if (sc.lt >= 34) return p;
    // WX_BARRAGE_PUNCH = [0, 9, 18, 27]: a jab out on each, retract between.
    const i = Math.floor(sc.lt / 9), ph = (sc.lt % 9) / 9;
    const out = ph < 0.3 ? msEase('snap', ph / 0.3) : 1 - msEase('io', (ph - 0.3) / 0.7) * 0.85;
    const lead = i % 2 === 0;
    const jab = 0.55 + 0.65 * out, guard = 0.6;
    p.r = lead ? -0.05 : 1.2 - out * 0.4; p.rl = lead ? jab : guard;
    p.l = lead ? 1.6 : -0.02; p.ll = lead ? guard : jab;
    return p;
  },
}));
msDefine('fragment:e', msCast({
  color: '#8fd8ff', len: 32, fireAt: 15,
  // Overdrive is a buff: the kills it makes are the swings thrown while it burns.
  killWhile: u => u._wxOverdrive > 0, keepOnSwing: true,
  keys: [
    { t: 0, r: 1.3, l: 1.0 },
    { t: 12, e: 'out', r: 2.2, rl: 0.55, l: 0.9, ll: 0.55, lean: 8, drop: 14, fr: 9, fl: -9 },
    { t: 16, e: 'snap', r: -0.75, rl: 1.15, l: -2.4, ll: 1.15, lean: -8, drop: -3, fr: 12, fl: -12 },
    { t: 32, e: 'io', r: 1.3, l: 1.0 },
  ],
  onFire(sc) { sc.flash('#bfeaff', 0.2, 8); sc.ring(sc.ucx(), sc.ucy(), 120, '#8fd8ff', 20); },
}));
msDefine('knives:q', msCast({
  color: '#c8d0da', len: 20, fireAt: 4,
  // Nothing to recall: the press does nothing, so there is no scene either.
  when(u) { return (u._wxKnives || []).some(k => k.state !== 'recall'); },
  keys: [
    { t: 0, ...MS_STAND },
    { t: 4, e: 'snap', r: 0.0, rl: 1.15, w: -1.4, l: 1.5, lean: 6, drop: 4, fr: 12, fl: -12 },
    { t: 12, e: 'io', r: 2.2, rl: 0.6, w: -1.0, l: 1.5, lean: -6, drop: 7, fr: 12, fl: -12 },
    { t: 20, e: 'io', ...MS_STAND },
  ],
}));
msDefine('knives:e', msCast({
  color: '#c8d0da', len: 24, fireAt: 10,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 8, e: 'out', r: 2.9, w: 3.0, l: 0.6, lean: -8, drop: 7, fr: 13, fl: -13 },
    { t: 11, e: 'snap', r: -0.3 + MS_TAU, w: -0.3 + MS_TAU, l: 2.4, lean: 12, drop: 5, fr: 16, fl: -12, trail: true, hide: true },
    { t: 24, e: 'io', r: 0.95 + MS_TAU, w: 0.75 + MS_TAU, l: 1.4, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
}));
msDefine('glassblade:q', msCast({
  color: '#d8f6ff', len: 24, fireAt: 7,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 5, e: 'out', ...MS_IAI_HOLD },
    { t: 8, e: 'snap', ...MS_IAI_CUT, trail: true },
    { t: 24, e: 'io', ...MS_STAND },
  ],
  tick(sc) { if (sc.in(5, 14)) sc.dash(13); },
}));
msDefine('glassblade:e', msCast({
  color: '#d8f6ff', len: 26, fireAt: 11,
  // The mirror stands for seconds and kills with its reflections and burst.
  killWhile: u => !!u._wxMirror,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 8, e: 'out', r: -1.7, w: 1.57, l: -1.4, ll: 0.9, lean: -2, drop: -2, fr: 8, fl: -8 },
    { t: 11, e: 'in3', r: 1.25, rl: 0.95, w: 1.57, l: 1.2, ll: 0.8, lean: 12, drop: 15, fr: 14, fl: -14 },
    { t: 18, e: 'out', r: 1.25, rl: 0.95, w: 1.57, l: 1.2, ll: 0.8, lean: 11, drop: 14, fr: 14, fl: -14 },
    { t: 26, e: 'io', ...MS_STAND },
  ],
}));
// Drop Anchor: first press throws it; the second, once it has bitten, hauls.
msDefine('anchor:q', {
  color: '#8a939c',
  // Hauling yourself to the anchor is travel, possibly across a gap the scene
  // would tether you short of, so only the throw and the drag are scenes.
  when(u) { const a = u._wxAnchor; return !a || (a.state === 'embedded' && !a.pull && !!a.hooked && a.hooked.health > 0); },
  start(sc) { if (sc.user._wxAnchor) sc.play('haul'); },
  tracks: {
    main: { len: 26, keys: [
      { t: 0, ...MS_STAND },
      { t: 10, e: 'out', r: -2.3, rl: 0.9, w: -2.4, l: -2.0, ll: 0.9, lean: -9, drop: 9, fr: 13, fl: -13 },
      { t: 13, e: 'snap', r: 0.1, rl: 1.1, w: 0.0, l: 0.25, ll: 1.0, lean: 13, drop: 5, fr: 17, fl: -12, hide: true },
      { t: 26, e: 'io', ...MS_STAND, hide: true },
    ] },
    haul: { len: 22, keys: [
      { t: 0, r: 0.2, rl: 1.1, w: 0.0, l: 0.3, ll: 1.0, lean: 6, drop: 6, fr: 14, fl: -12, hide: true },
      { t: 5, e: 'out', r: 2.6, rl: 0.7, w: 0.0, l: 2.4, ll: 0.7, lean: -14, drop: 12, fr: 18, fl: -10, hide: true },
      { t: 10, e: 'io', r: 0.5, rl: 1.0, w: 0.0, l: 0.6, ll: 1.0, lean: -2, drop: 9, fr: 16, fl: -11, hide: true },
      { t: 15, e: 'out', r: 2.7, rl: 0.65, w: 0.0, l: 2.5, ll: 0.65, lean: -15, drop: 12, fr: 18, fl: -10, hide: true },
      { t: 22, e: 'io', ...MS_STAND },
    ] },
  },
  tick(sc) {
    if (sc.track === 'main' && sc.at(12)) sc.fire();
    if (sc.track === 'haul' && sc.at(1)) sc.fire();
  },
});
// Keelhaul: the arms follow the anchor round its circle, then the slam.
msDefine('anchor:e', msCast({
  color: '#8a939c', len: 80, fireAt: 0,
  keys: [
    { t: 0, r: 0.0, rl: 1.1, w: 0.0, l: 0.1, ll: 1.0, lean: -6, drop: 9, fr: 14, fl: -14 },
    { t: 70, e: 'lin', r: 0.0, rl: 1.1, w: 0.0, l: 0.1, ll: 1.0, lean: -6, drop: 9, fr: 14, fl: -14 },
    { t: 72, e: 'snap', r: 1.2, rl: 1.0, w: 1.5, l: 1.3, ll: 0.9, lean: 14, drop: 15, fr: 15, fl: -15 },
    { t: 80, e: 'io', ...MS_STAND },
  ],
  poseMod(sc, p) {
    const k = sc.user._wxKeel;
    if (!k || sc.lt > 69) return p;
    // The keel angle is world-space; convert to this facing's canonical angle.
    const wa = Math.atan2(Math.sin(k.ang) * 55, Math.cos(k.ang) * 95);
    const a = sc.f > 0 ? wa : Math.PI - wa;
    p.r = a; p.l = a + 0.12; p.w = a; p.rl = 1.15; p.ll = 1.0; p.hide = true;
    p.lean = -Math.cos(a) * 6;
    return p;
  },
}));
msDefine('crossbow:q', msCast({
  color: '#c89a5a', len: 26, fireAt: 10,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 7, e: 'out', ...MS_KNEEL, r: 0.35, w: 0.3 },
    { t: 13, e: 'lin', ...MS_KNEEL, r: 0.30, w: 0.24 },
    { t: 26, e: 'io', ...MS_STAND },
  ],
  poseMod: msRecoil(4, 0.18, 10, 14),
}));
msDefine('crossbow:e', msCast({
  color: '#c89a5a', len: 32, fireAt: 16, endlag: 4,
  keys: [
    { t: 0, ...MS_STAND },
    { t: 10, e: 'out', ...MS_KNEEL },
    { t: 16, e: 'lin', ...MS_KNEEL },
    { t: 18, e: 'snap', ...MS_KNEEL, r: -0.35, w: -0.45, lean: -10 },
    { t: 32, e: 'io', ...MS_STAND },
  ],
  onFire(sc) { sc.flash('#ffe0b0', 0.12, 5); sc.dash(-6); },
}));
