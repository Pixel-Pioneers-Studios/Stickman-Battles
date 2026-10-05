'use strict';
// smb-finisher-moves-defs.js — one finisher per melee move scene (axe through
// katana). Ranged and weapons-ext moves: smb-finisher-moves-defs2.js.
// Runtime, staging and the def schema: smb-finisher-moves.js. Pose schema and
// angle conventions: smb-move-scenes.js / smb-move-scenes-defs.js.
//
// Depends on: smb-finisher-moves.js (mfDefine, MF_PROTO), smb-move-scenes-defs.js
//   (MS_STAND, MS_AIM, MS_IAI_HOLD, MS_IAI_CUT, MS_SHIELD_UP, MS_BROOM_SIT, MS_PI, MS_TAU).
// ============================================================

// Bring them together for a melee finish. A long gap (a projectile kill) is
// closed by the performer; a short one by the victim reeling in.
function mfClose(s, gap, a, b) {
  if (s.vars._closeMe === undefined) s.vars._closeMe = s.v0x > gap + 70;
  if (s.vars._closeMe) { s.go('m', s.v0x - gap, 0, a, b, 'snap'); s.go('v', null, s.vfloor, a, b, 'out'); }
  else s.go('v', gap, s.vfloor, a, b, 'out');
}

// Cracks radiating along the floor from x, fading with k (1 fresh, 0 gone).
function mfCracks(ctx, s, x, k, color, spread) {
  if (k <= 0) return;
  const y = s.gy;
  if (!s.vars._cracks) {
    s.vars._cracks = [];
    for (let i = 0; i < 9; i++) {
      const dir = i % 2 ? 1 : -1, len = (spread || 90) * (0.4 + Math.random() * 0.6);
      const pts = [[0, 0]];
      for (let j = 1; j <= 4; j++) pts.push([dir * len * j / 4, (Math.random() - 0.3) * 7 * j / 4]);
      s.vars._cracks.push(pts);
    }
  }
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.strokeStyle = color || '#ffffff'; ctx.lineWidth = 2.2; ctx.shadowColor = color || '#ffffff'; ctx.shadowBlur = 10;
  for (const pts of s.vars._cracks) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(x + p[0], y + p[1]) : ctx.moveTo(x + p[0], y + p[1])));
    ctx.stroke();
  }
  ctx.restore();
}

// Common performer poses (facing-right canonical).
const MF_RAISED  = { r: -1.5, rl: 1.1, w: -1.6, l: 1.3, lean: -2, drop: 0, fr: 8, fl: -8 };            // weapon held high, done
const MF_CROUCH  = { r: 1.2, w: 1.5, l: 1.6, lean: 12, drop: 15, fr: 15, fl: -15 };                   // landed from a slam
const MF_COILED  = { r: 2.75, w: 3.10, l: 0.2, lean: 12, drop: 5, fr: 17, fl: -17 };                  // weapon trailing low behind
const MF_CHOPUP  = { r: -2.7, w: -3.0, l: -1.4, lean: -8, drop: 4, fr: 9, fl: -9 };                    // overhead, cocked back
const MF_AIRUP   = { air: true, lg: 1.2, lgl: 1.9, ls: 0.75, lsl: 0.8 };                               // tucked legs in the air
const MF_FLAT    = { r: 0.02, rl: 1.12, w: -0.06, l: 2.4, lean: 10, drop: 6, fr: 18, fl: -11 };        // flat swing, follow-through

// ═════════════════════════════════════════════════════════════════════════════
// AXE
// ═════════════════════════════════════════════════════════════════════════════
// Rising Cleave carried through: the uppercut sends them up, the performer
// follows them into the air and chops them back into the floor.
mfDefine('axe:q', {
  name: "HEADSMAN'S RISE", color: '#ff8a3d', len: 104,
  me: [
    { t: 0,  ...MF_COILED },
    { t: 8,  e: 'out',  r: 2.35, w: 2.6, l: 0.3, lean: 6, drop: 11, fr: 15, fl: -14 },
    { t: 12, e: 'snap', r: -1.25, w: -1.45, l: 1.95, lean: -4, drop: 0, fr: 7, fl: -11, trail: true },
    { t: 21, e: 'out',  r: -1.3, w: -1.6, l: 2.0, lean: 2, drop: 12, fr: 12, fl: -12 },
    { t: 25, e: 'snap', ...MF_CHOPUP, ...MF_AIRUP, rot: -0.15 },
    { t: 37, e: 'out',  r: -2.95, w: -3.25, l: -1.5, lean: -10, ...MF_AIRUP, rot: -0.3 },
    { t: 41, e: 'snap', r: 1.25, w: 1.55, l: 1.4, lean: 14, air: true, lg: 1.0, lgl: 2.0, ls: 0.7, lsl: 0.7, rot: 0.35, trail: true },
    { t: 49, e: 'in',   ...MF_CROUCH },
    { t: 82, e: 'lin',  ...MF_CROUCH, lean: 10 },
    { t: 100, e: 'io',  ...MF_RAISED },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('fold');
    mfClose(s, 40, 0, 8);
    if (s.at(12)) {
      s.star(s.qx(), s.qy(), false); s.slash(18, -18, 48, 1.9, -1.35, { color: '#ffb070', w: 13 });
      s.shake(10); s.sfx('swing'); s.vpose('lift'); s.hold(3);
    }
    s.fly('v', 0.5, -9, 0.32, 12, 40);
    if (s.in(12, 41)) s.vrot = -(s.t - 12) * 0.05;
    s.go('m', s.vx - 34, -150, 23, 37, 'out');
    if (s.at(39)) s.sfx('swing');
    s.go('v', null, s.vfloor, 41, 46, 'in3');
    s.go('m', null, 0, 41, 49, 'in3');
    if (s.at(41)) { s.vpose('spread'); s.slash(10, 0, 64, -1.9, 1.3, { color: '#ffb070', w: 14, life: 14 }); }
    if (s.at(46)) {
      s.vrot = 0; s.vpose('slump');
      s.kill({ y: s.gy - 6, ring: 150 });
      s.ring(s.qx(), s.gy, 190, '#ffb070', 26);
      s.vars.crack = s.t;
    }
    if (s.in(0, 22)) s.camMid(1.4);
    else if (s.in(22, 46)) s.camMid(1.18);
    else s.camV(1.5);
  },
  draw(s, ctx) { if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 50, '#ffb070', 120); },
  exit: [2, -3],
});

// Axe Throw: the axe is already in them. They stagger back with it buried,
// the thrower walks in, takes hold of the haft and tears it out.
mfDefine('axe:e', {
  name: 'WOODSPLITTER', color: '#ff8a3d', len: 108,
  me: [
    { t: 0,  r: 0.35, w: 0.2, l: 2.3, lean: 14, drop: 5, fr: 18, fl: -12, hide: true },
    { t: 14, e: 'io',  ...MS_STAND, hide: true },
    { t: 44, e: 'lin', ...MS_STAND, r: 0.6, hide: true },
    { t: 50, e: 'out', r: 0.15, rl: 1.15, w: -0.2, l: 0.1, ll: 1.0, lean: 10, drop: 8, fr: 15, fl: -12, hide: true },
    { t: 56, e: 'lin', r: 0.2, rl: 1.1, w: 0.1, l: 0.2, ll: 1.0, lean: -6, drop: 10, fr: 16, fl: -10 },
    { t: 62, e: 'snap', r: -1.9 - MS_TAU, w: -2.2 - MS_TAU, l: 1.6, lean: -10, drop: 2, fr: 9, fl: -12, trail: true },
    { t: 66, e: 'out', r: -2.6 - MS_TAU, w: -2.9 - MS_TAU, l: 1.5, lean: -8, drop: 4, fr: 10, fl: -12 },
    { t: 71, e: 'snap', r: 1.3, w: 1.6, l: 1.5, lean: 15, drop: 14, fr: 16, fl: -14, trail: true },
    { t: 90, e: 'lin', ...MF_CROUCH },
    { t: 108, e: 'io', ...MS_STAND, r: 1.2, w: 1.45 },
  ],
  tick(s) {
    if (s.at(0)) { s.vpose('fold', { lean: 12 }); s.star(s.qx(), s.qy(), true); s.hold(6); s.shake(16); s.sfx('heavyHit'); }
    s.go('v', s.v0x + 26, s.vfloor, 0, 16, 'out');
    if (s.at(18)) s.vpose('kneel');
    // Walk in.
    s.go('m', null, 0, 0, 10, 'out');
    s.go('m', s.v0x + 26 - 34, 0, 20, 50, 'io');
    // Wrench it out: a rising tear, a full turn and down.
    if (s.at(56)) { s.sfx('swing'); s.parts(s.qx(), s.qy(), '#ff8a3d', 18); s.vpose('arch', { air: false, drop: 6 }); }
    if (s.at(62)) s.slash(16, -10, 56, 1.4, -2.2, { color: '#ffb070', w: 12 });
    if (s.at(71)) {
      s.slash(14, -6, 66, -2.4, 1.4, { color: '#ffb070', w: 15, life: 15 });
      s.vpose('slump');
      s.kill({ ring: 120 });
      s.vars.crack = s.t;
    }
    if (s.t < 56) s.cam(1.45, s.qx() - s.f * 20, s.qy());
    else s.camV(1.6);
  },
  draw(s, ctx) {
    // The buried axe until it is pulled.
    if (s.t < 56) s.prop(s.qx() - s.f * 6, s.qy() - 2, -2.5 + Math.sin(s.t * 0.3) * 0.04 * Math.max(0, 1 - s.t / 20));
    if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 36, '#ffb070', 70);
  },
  exit: [1, -2],
});

// ═════════════════════════════════════════════════════════════════════════════
// SWORD
// ═════════════════════════════════════════════════════════════════════════════
// Blade Storm's eye: the spin pulls them into it, the four arcs orbit, and the
// last whole-circle cut sends all four through them at once.
mfDefine('sword:q', {
  name: "STORM'S EYE", color: '#88ccff', len: 100,
  me: [
    { t: 0,  r: 3.62, w: 3.80, l: -0.6, lean: 6, drop: 9, fr: 14, fl: -12 },
    { t: 8,  e: 'out', r: -2.55, w: -2.70, l: 0.5, lean: -5, drop: 10, fr: 12, fl: -12 },
    { t: 48, e: 'lin', r: -2.55 + MS_TAU * 3, w: -2.70 + MS_TAU * 3, l: 0.5 + MS_TAU * 3, lean: -5, drop: 10, fr: 12, fl: -12, trail: true },
    { t: 54, e: 'out', r: -2.75 + MS_TAU * 3, w: -2.9 + MS_TAU * 3, l: 0.4 + MS_TAU * 3, lean: -8, drop: 13, fr: 13, fl: -13 },
    { t: 60, e: 'snap', r: 0.9 + MS_TAU * 4, w: 1.1 + MS_TAU * 4, l: 2.4 + MS_TAU * 3, lean: 12, drop: 8, fr: 16, fl: -12, trail: true },
    { t: 84, e: 'lin', r: 1.0 + MS_TAU * 4, w: 1.2 + MS_TAU * 4, l: 2.4 + MS_TAU * 3, lean: 11, drop: 8, fr: 16, fl: -12 },
    { t: 100, e: 'io', ...MS_STAND, r: 0.95 + MS_TAU * 4, w: 0.75 + MS_TAU * 4, l: 1.4 + MS_TAU * 4 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    // Drawn into the eye, rising, turning.
    s.go('v', 40, -34, 4, 46, 'io');
    if (s.in(10, 60)) { s.vrot = Math.sin(s.t * 0.25) * 0.4; if (s.t % 2 === 0) s.vpose(s.t % 8 < 4 ? 'tumble' : 'reel'); }
    if (s.every(6, 10, 48)) { s.slash(0, -6, 70, 0, MS_TAU, { ry: 26, color: '#bfe6ff', w: 6, life: 8 }); s.sfx('swing'); }
    if (s.every(10, 14, 50)) s.star(s.qx(), s.qy(), false, '#bfe6ff');
    if (s.at(60)) {
      s.vrot = 0; s.vpose('spread');
      s.slash(0, -6, 92, -MS_PI * 0.8, MS_PI * 1.2, { ry: 34, color: '#ffffff', w: 16, life: 16 });
      s.kill({ color: '#88ccff', ring: 150 });
    }
    s.fly('v', 2.2, -1.2, 0.18, 60);
    s.camMid(s.t < 60 ? 1.25 + s.u(0, 60) * 0.3 : 1.5);
  },
  draw(s, ctx) {
    // The four arcs riding the storm, closing in until the cut.
    if (s.t < 8 || s.t >= 62) return;
    const k = s.u(8, 60, 'in');
    const R = 110 - k * 70, cx = s.ax(), cy = s.ay() - 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#bfe6ff'; ctx.lineCap = 'round'; ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i++) {
      const a = s.t * (0.18 + k * 0.2) + i * MS_PI / 2;
      ctx.globalAlpha = 0.5 + 0.4 * k;
      ctx.lineWidth = 3 + k * 4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R, R * 0.42, 0, a, a + 0.9);
      ctx.stroke();
    }
    ctx.restore();
  },
  exit: [6, -4],
});

// Air Slash taken skyward: three cuts carry them up, the performer goes with
// them, an X cut at the top, and they land with their back to the fall.
mfDefine('sword:e', {
  name: 'SKY SEVERANCE', color: '#88ccff', len: 104,
  me: [
    { t: 0,  r: 0.08, rl: 1.15, w: 0.02, l: 2.6, lean: 14, drop: 6, fr: 19, fl: -12 },
    { t: 6,  e: 'out', r: 2.4, w: 2.7, l: 0.5, lean: -4, drop: 10, fr: 13, fl: -13 },
    { t: 10, e: 'snap', r: -1.3, w: -1.5, l: 1.8, lean: -6, ...MF_AIRUP, trail: true },
    { t: 18, e: 'snap', r: 1.1, w: 1.4, l: 2.0, lean: 8, ...MF_AIRUP, rot: 0.1, trail: true },
    { t: 26, e: 'snap', r: -1.2, w: -1.4, l: 1.0, lean: -4, ...MF_AIRUP, rot: -0.1, trail: true },
    { t: 34, e: 'out', r: -2.9, w: -3.0, l: -2.6, lean: -8, ...MF_AIRUP, rot: -0.25 },
    { t: 40, e: 'snap', r: 1.0, w: 1.25, l: 0.9, lean: 12, ...MF_AIRUP, rot: 0.3, trail: true },
    { t: 54, e: 'in', ...MF_CROUCH, r: 0.6, w: 0.9 },
    { t: 84, e: 'lin', ...MF_CROUCH, r: 0.65, w: 0.95, lean: 8 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 42, 0, 6);
    const cut = (at, a0, a1, dy) => {
      if (!s.at(at)) return;
      s.slash(26, dy, 46, a0, a1, { color: '#bfe6ff', w: 10 });
      s.star(s.qx(), s.qy(), false); s.sfx('swing'); s.shake(8); s.hold(2);
    };
    cut(10, 1.6, -1.4, -6); cut(18, -1.2, 1.4, 0); cut(26, 1.4, -1.3, -4);
    s.go('v', null, -150, 10, 34, 'out');
    s.go('m', s.vx - 40, -140, 8, 32, 'out');
    if (s.in(10, 40)) s.vpose(s.t % 8 < 4 ? 'lift' : 'tumble');
    if (s.at(40)) {
      // The X.
      s.streak(s.qx() - 46, s.qy() - 46, s.qx() + 46, s.qy() + 46, '#ffffff', 18, 8);
      s.streak(s.qx() - 46, s.qy() + 46, s.qx() + 46, s.qy() - 46, '#ffffff', 18, 8);
      s.vpose('spread');
      s.kill({ color: '#88ccff' });
    }
    // Passes through and drops behind them; they fall the other way.
    if (s.at(41)) s.vars.passX = s.vx + 56;
    if (s.t >= 41) s.go('m', s.vars.passX, 0, 41, 54, 'in');
    if (s.at(42)) s.aface = -s.f;
    s.fly('v', -1.4, -2, 0.52, 42, 70);
    if (s.at(70)) { s.vpose('crumple'); s.shake(10); s.parts(s.qx(), s.gy, '#88ccff', 12); }
    if (s.t < 40) s.camMid(1.25); else s.camMe(1.45);
  },
  exit: [-2, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// HAMMER
// ═════════════════════════════════════════════════════════════════════════════
// Ground Shockwave twice over: the first slam throws them up off the cracked
// floor, the second meets them on the way down.
mfDefine('hammer:q', {
  name: 'FAULT LINE', color: '#ffcc44', len: 104,
  me: [
    { t: 0,  r: 1.2, w: 1.52, l: 1.7, lean: 11, drop: 13, fr: 14, fl: -14 },
    { t: 10, e: 'out', r: -1.85, w: -2.05, l: -1.4, lean: -6, drop: -2, fr: 6, fl: -8 },
    { t: 16, e: 'hold', r: -1.95, w: -2.15, l: -1.5, lean: -7, drop: -2, fr: 6, fl: -8, trail: true },
    { t: 20, e: 'in3', r: 1.15, w: 1.48, l: 1.6, lean: 12, drop: 14, fr: 14, fl: -14 },
    { t: 30, e: 'out', r: 1.2, w: 1.5, l: 1.7, lean: 11, drop: 13, fr: 14, fl: -14 },
    { t: 40, e: 'io', r: -2.0, w: -2.3, l: -1.6, lean: -9, drop: -2, fr: 7, fl: -8 },
    { t: 50, e: 'hold', r: -2.05, w: -2.35, l: -1.6, lean: -10, drop: -3, fr: 7, fl: -8, trail: true },
    { t: 54, e: 'in3', r: 0.6, w: 0.9, l: 0.9, lean: 16, drop: 12, fr: 16, fl: -14 },
    { t: 86, e: 'lin', r: 0.65, w: 0.95, l: 1.0, lean: 14, drop: 12, fr: 16, fl: -14 },
    { t: 104, e: 'io', ...MF_RAISED },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 60, 0, 10);
    if (s.at(20)) {
      s.ring(s.ax() + s.f * 30, s.gy, 130, '#ffcc44', 20); s.shake(18); s.sfx('heavyHit'); s.hold(4);
      s.flash('#ffe08a', 0.18, 6); s.vars.crack = s.t; s.vpose('lift');
    }
    s.fly('v', -0.6, -11, 0.42, 21, 52);
    if (s.in(21, 54)) s.vrot = -(s.t - 21) * 0.08;
    if (s.at(54)) {
      s.vrot = 0; s.vpose('spread');
      s.kill({ color: '#ffcc44', ring: 140 });
      s.bolt(s.qx(), s.gy);
    }
    s.fly('v', 9, -4, 0.5, 54, 80);
    if (s.at(80)) s.vpose('crumple');
    s.camMid(s.t < 20 ? 1.35 : s.t < 54 ? 1.2 : 1.4);
  },
  draw(s, ctx) {
    if (!s.vars.crack) return;
    const k = 1 - (s.t - s.vars.crack) / 70;
    if (k <= 0) return;
    // The fault: one jagged split running out from the impact under them.
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.5);
    ctx.strokeStyle = '#ffe08a'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 16; ctx.lineWidth = 3;
    const x0 = s.ax() + s.f * 30, len = 40 + Math.min(1, (s.t - s.vars.crack) / 6) * 180;
    ctx.beginPath(); ctx.moveTo(x0, s.gy);
    for (let i = 1; i <= 8; i++) ctx.lineTo(x0 + s.f * len * i / 8, s.gy + ((i * 37) % 7 - 3));
    ctx.stroke();
    ctx.restore();
    mfCracks(ctx, s, x0, k, '#ffcc44', 70);
  },
  exit: [3, -1],
});

// Mjolnir: swung round on the hammer head, hoisted to the sky, the sky answers,
// and the hammer brings them and the lightning down together.
mfDefine('hammer:e', {
  name: 'STORMCALLER', color: '#ffcc44', len: 112,
  me: [
    { t: 0,  r: 0.1, w: 0.1, l: 2.4, lean: -8, drop: 8, fr: 12, fl: -12, trail: true },
    { t: 36, e: 'lin', r: 0.1 - MS_TAU * 3, w: 0.1 - MS_TAU * 3, l: 2.6, lean: -12, drop: 9, fr: 10, fl: -14, trail: true },
    { t: 44, e: 'out', r: -1.57 - MS_TAU * 3, rl: 1.15, w: -1.57 - MS_TAU * 3, l: -1.5, ll: 1.0, lean: -2, drop: -2, fr: 8, fl: -8 },
    { t: 64, e: 'lin', r: -1.6 - MS_TAU * 3, rl: 1.15, w: -1.6 - MS_TAU * 3, l: -1.55, ll: 1.0, lean: -3, drop: -2, fr: 8, fl: -8 },
    { t: 70, e: 'in3', r: 1.15 - MS_TAU * 3, w: 1.48 - MS_TAU * 3, l: 1.6, lean: 14, drop: 16, fr: 15, fl: -15, trail: true },
    { t: 92, e: 'lin', r: 1.2 - MS_TAU * 3, w: 1.5 - MS_TAU * 3, l: 1.6, lean: 12, drop: 15, fr: 15, fl: -15 },
    { t: 112, e: 'io', ...MF_RAISED, r: -1.5 - MS_TAU * 3, w: -1.6 - MS_TAU * 3 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('tumble');
    if (s.t < 44) {
      // Riding the hammer head round a flattened orbit.
      const a = s.att._movePose ? s.att._movePose.r : 0;
      const k = s.u(0, 6, 'out');
      s.vx = s.v0x + (Math.cos(a) * 64 - s.v0x) * k;
      s.vy = s.v0y + (-10 + Math.sin(a) * 22 - s.v0y) * k;
      s.vrot = -a;
      if (s.every(12, 0, 40)) { s.sfx('swing'); s.slash(0, -10, 70, 0, MS_TAU, { ry: 24, color: '#ffe08a', w: 8, life: 10 }); }
    }
    // Hoisted on the hammer head.
    s.go('v', 6, -96, 44, 52, 'out');
    if (s.at(44)) { s.vrot = 0; s.vpose('limp'); }
    if (s.in(50, 66) && s.t % 3 === 0) s.bolt(s.qx() + (Math.random() - 0.5) * 140, s.gy);
    if (s.at(64)) { s.bolt(s.qx(), s.qy()); s.flash('#fff6c8', 0.5, 10); s.invert(4); s.shake(20); s.sfx('hitZap'); s.vpose('arch'); }
    s.go('v', 44, s.vfloor, 66, 71, 'in3');
    if (s.at(71)) {
      s.vpose('slump');
      s.kill({ color: '#ffcc44', ring: 170, flash: '#fff6c8', a: 0.45 });
      s.bolt(s.qx(), s.gy); s.bolt(s.qx() + 30, s.gy); s.bolt(s.qx() - 30, s.gy);
      s.vars.crack = s.t;
    }
    if (s.t < 44) s.camMe(1.3);
    else if (s.t < 71) s.cam(1.15, s.ax() + s.f * 10, s.ay() - 50);
    else s.camV(1.45);
  },
  draw(s, ctx) {
    // The storm gathering over the hoist.
    if (s.t >= 44 && s.t < 90) {
      const k = s.t < 64 ? s.u(44, 64) : 1 - s.u(64, 90);
      ctx.save();
      ctx.globalAlpha = 0.35 * k;
      ctx.fillStyle = '#1a1830';
      ctx.fillRect(s.ax() - 900, s.ay() - 900, 1800, 760);
      ctx.restore();
    }
    if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#ffe08a', 110);
  },
  exit: [2, -2],
});

// ═════════════════════════════════════════════════════════════════════════════
// SPEAR
// ═════════════════════════════════════════════════════════════════════════════
// Ground Spike, a field of them: the spear goes into the floor and a row of
// spikes runs out under them, the last one lifting them off the ground.
mfDefine('spear:q', {
  name: "IMPALER'S FIELD", color: '#aaaaff', len: 100,
  me: [
    { t: 0,  r: 1.25, rl: 0.9, w: 1.57, l: 1.35, ll: 0.75, lean: 12, drop: 14, fr: 14, fl: -14 },
    { t: 8,  e: 'out', r: -1.75, rl: 0.95, w: 1.57, l: -1.45, ll: 0.95, lean: -2, drop: -2, fr: 5, fl: -7 },
    { t: 18, e: 'hold', r: -1.8, rl: 0.95, w: 1.57, l: -1.5, ll: 0.95, lean: -3, drop: -2, fr: 5, fl: -7 },
    { t: 22, e: 'in3', r: 1.25, rl: 0.9, w: 1.57, l: 1.35, ll: 0.75, lean: 13, drop: 15, fr: 14, fl: -14 },
    { t: 84, e: 'lin', r: 1.25, rl: 0.9, w: 1.57, l: 1.35, ll: 0.75, lean: 12, drop: 14, fr: 14, fl: -14 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.dist = Math.max(80, Math.min(200, s.v0x)); },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    s.go('v', s.vars.dist, s.vfloor, 0, 10, 'out');
    if (s.at(22)) { s.ring(s.ax(), s.gy, 90, '#aaaaff', 14); s.shake(12); s.sfx('heavyHit'); s.hold(3); }
    // Spikes run out one after another; the last is under them.
    for (let i = 0; i < 5; i++) if (s.at(26 + i * 5)) { s.shake(5 + i * 2); s.parts(s.wx(s.vars.dist * (i + 1) / 5), s.gy, '#aaaaff', 6); }
    if (s.at(46)) { s.vpose('skewer'); s.kill({ color: '#aaaaff', y: s.qy() + 10, hold: 10 }); }
    s.go('v', null, -86, 46, 52, 'snap');
    if (s.at(52)) s.vpose('limp');
    if (s.t < 46) s.camMid(1.3); else s.camV(1.5);
  },
  draw(s, ctx) {
    if (s.t < 26) return;
    ctx.save();
    ctx.shadowColor = '#aaaaff'; ctx.shadowBlur = 12;
    for (let i = 0; i < 5; i++) {
      const at = 26 + i * 5;
      if (s.t < at) continue;
      const grow = Math.min(1, (s.t - at) / 4);
      const fade = s.t > 84 ? Math.max(0, 1 - (s.t - 84) / 14) : 1;
      const big = i === 4;
      const x = s.wx(s.vars.dist * (i + 1) / 5), h = (big ? 120 : 34 + i * 8) * grow * fade, w = big ? 13 : 9;
      ctx.fillStyle = big ? '#d8d8ff' : '#9a9ae8';
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - w, s.gy); ctx.lineTo(x, s.gy - h); ctx.lineTo(x + w, s.gy); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },
  exit: [0, 1],
});

// Lance Charge to the end of the line: run them down on the point, hoist them
// overhead on the shaft, and drive spear and rider into the floor.
mfDefine('spear:e', {
  name: 'LAST CHARGE', color: '#aaaaff', len: 108,
  me: [
    { t: 0,  r: 0.25, rl: 0.95, w: 0.0, l: 0.2, ll: 0.7, lean: 16, drop: 6, fr: 18, fl: -18 },
    { t: 34, e: 'lin', r: 0.2, rl: 1.0, w: -0.05, l: 0.15, ll: 0.7, lean: 18, drop: 7, fr: 20, fl: -20 },
    { t: 40, e: 'out', r: 0.6, rl: 0.9, w: 0.3, l: 0.6, ll: 0.7, lean: 2, drop: 12, fr: 16, fl: -16 },
    { t: 48, e: 'snap', r: -1.55, rl: 1.1, w: -1.57, l: -1.5, ll: 1.1, lean: -4, drop: 0, fr: 9, fl: -9 },
    { t: 62, e: 'lin', r: -1.6, rl: 1.1, w: -1.6, l: -1.55, ll: 1.1, lean: -5, drop: 0, fr: 9, fl: -9 },
    { t: 66, e: 'out', r: -2.5, rl: 1.1, w: -2.6, l: -2.4, ll: 1.1, lean: -10, drop: 3, fr: 10, fl: -10 },
    { t: 71, e: 'snap', r: 1.15, rl: 1.0, w: 1.4, l: 1.2, ll: 0.9, lean: 15, drop: 15, fr: 15, fl: -15, trail: true },
    { t: 92, e: 'lin', r: 1.2, rl: 1.0, w: 1.45, l: 1.25, ll: 0.9, lean: 13, drop: 14, fr: 15, fl: -15 },
    { t: 108, e: 'io', ...MS_STAND },
  ],
  start(s) {
    // Run as far as the stage allows, up to 220px.
    const room = s.span.open ? 220 : (s.f > 0 ? s.span.R - s.hx : s.hx - s.span.L) - 120;
    s.vars.run = Math.max(40, Math.min(220, room));
  },
  tick(s) {
    if (s.at(0)) { s.vpose('skewer'); s.star(s.qx(), s.qy(), false); }
    s.go('m', s.vars.run, 0, 2, 34, 'in');
    if (s.t < 40) {
      const tip = s.att._movePose ? s.att._movePose.w : 0;
      s.go('v', s.mx + 46 + Math.cos(tip) * 22, -8 + Math.sin(tip) * 40, 0, 4);
      if (s.t > 4) { s.vx = s.mx + 46 + Math.cos(tip) * 22; s.vy = -8 + Math.sin(tip) * 40; }
      if (s.t % 2 === 0) { s.parts(s.ax() - s.f * 14, s.gy - 4, '#aaaaff', 2); s.streak(s.ax() - s.f * 40, s.ay() + (s.t % 6) * 6 - 18, s.ax() - s.f * 120, s.ay() + (s.t % 6) * 6 - 18, '#c8c8ff', 6, 2); }
    }
    if (s.at(36)) { s.shake(10); s.sfx('clang'); }
    // Hoisted overhead on the point.
    s.go('v', s.mx + 4, -100, 40, 50, 'out');
    if (s.at(48)) { s.vpose('limp'); s.vrot = 0.3; s.sfx('swing'); }
    s.go('v', s.mx - 30, -110, 62, 67, 'out');
    s.go('v', s.mx + 54, s.vfloor + 4, 67, 72, 'in3');
    if (s.at(67)) s.vpose('spread');
    if (s.at(72)) {
      s.vrot = 0; s.vpose('slump');
      s.kill({ color: '#aaaaff', y: s.gy - 10, ring: 150 });
      s.vars.crack = s.t;
    }
    if (s.t < 40) s.cam(1.2, s.ax() + s.f * 60, s.ay() - 10);
    else s.cam(1.25, s.ax() + s.f * 20, s.ay() - 40);
  },
  draw(s, ctx) { if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#c8c8ff', 90); },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// SHIELD
// ═════════════════════════════════════════════════════════════════════════════
// Shield Bash to a standstill: pinned to the face of the shield, driven, and
// finished with the rim brought down on them.
mfDefine('shield:q', {
  name: 'BULWARK CRUSH', color: '#88aaff', len: 100,
  me: [
    { t: 0,  ...MS_SHIELD_UP, r: -0.15, rl: 1.15, lean: 18, drop: 6, fr: 20, fl: -14 },
    { t: 6,  e: 'out', ...MS_SHIELD_UP },
    { t: 30, e: 'lin', ...MS_SHIELD_UP, lean: 16 },
    { t: 36, e: 'out', r: -1.6, rl: 1.1, w: -1.57, l: -1.5, ll: 0.9, lean: -4, drop: -2, fr: 9, fl: -10 },
    { t: 44, e: 'hold', r: -1.65, rl: 1.1, w: -1.6, l: -1.55, ll: 0.9, lean: -6, drop: -2, fr: 9, fl: -10 },
    { t: 48, e: 'in3', r: 1.2, rl: 0.9, w: 1.57, l: 1.2, ll: 0.8, lean: 16, drop: 18, fr: 15, fl: -15, trail: true },
    { t: 86, e: 'lin', r: 1.2, rl: 0.9, w: 1.57, l: 1.25, ll: 0.8, lean: 14, drop: 17, fr: 15, fl: -15 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 36, 0, 4);
    // Driven along on the shield face.
    s.go('m', s.mx + 70, 0, 6, 30, 'in');
    if (s.t >= 6 && s.t < 34) { s.vx = s.mx + 36; if (s.t % 3 === 0) s.parts(s.qx(), s.gy - 2, '#88aaff', 2); }
    if (s.every(8, 8, 32)) { s.shake(6); s.sfx('clang'); s.star(s.qx() - s.f * 10, s.qy(), false); }
    if (s.at(34)) { s.vpose('kneel'); s.hold(3); }
    s.go('v', s.mx + 40, s.vfloor, 34, 40, 'out');
    if (s.at(48)) {
      s.vpose('crumple', { drop: 26, lean: 16 });
      s.kill({ color: '#88aaff', y: s.qy() + 6, ring: 120, sfx: 'clang' });
      s.vars.crack = s.t;
    }
    s.camMid(s.t < 34 ? 1.3 : 1.5);
  },
  draw(s, ctx) { if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#aaccff', 80); },
  exit: [1, 0],
});

// Fortress Charge, then the fortress falls: the rising bash sends them up,
// the performer leaps after them, and the shield comes down like a wall.
mfDefine('shield:e', {
  name: 'FORTRESS FALL', color: '#88aaff', len: 108,
  me: [
    { t: 0,  r: -1.2, rl: 1.1, w: -1.57, l: -0.9, ll: 0.8, lean: -4, drop: -2, fr: 10, fl: -12 },
    { t: 16, e: 'out', r: -0.4, rl: 1.0, w: -1.2, l: 0.3, ll: 0.8, lean: 4, drop: 12, fr: 12, fl: -12 },
    { t: 22, e: 'snap', r: -1.3, rl: 1.1, w: -1.5, l: -1.2, ll: 1.0, lean: -4, ...MF_AIRUP, rot: -0.1 },
    { t: 40, e: 'out', r: -1.9, rl: 1.1, w: -1.9, l: -1.8, ll: 1.0, lean: -6, ...MF_AIRUP, rot: -0.2 },
    { t: 46, e: 'snap', r: 1.4, rl: 1.0, w: 1.57, l: 1.3, ll: 0.9, lean: 12, air: true, lg: 1.0, lgl: 2.0, ls: 0.7, lsl: 0.7, rot: 0.4 },
    { t: 54, e: 'in', r: 1.3, rl: 0.9, w: 1.57, l: 1.3, ll: 0.8, lean: 16, drop: 18, fr: 15, fl: -15 },
    { t: 90, e: 'lin', r: 1.3, rl: 0.9, w: 1.57, l: 1.3, ll: 0.8, lean: 14, drop: 17, fr: 15, fl: -15 },
    { t: 108, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('spread');
    s.go('v', 40, -150, 0, 22, 'out');
    if (s.in(0, 40)) s.vrot = -s.t * 0.06;
    s.go('m', 30, -175, 18, 40, 'out');
    if (s.at(22)) s.sfx('swing');
    s.go('v', 52, s.vfloor, 44, 52, 'in3');
    s.go('m', 34, 0, 44, 54, 'in3');
    if (s.in(44, 53) && s.t % 2 === 0) s.streak(s.ax(), s.ay() - 70, s.ax(), s.ay() - 10, '#aaccff', 8, 5);
    if (s.at(52)) {
      s.vrot = 0; s.vpose('crumple', { drop: 26 });
      s.kill({ color: '#88aaff', y: s.gy - 8, ring: 180, flash: '#cfe0ff', a: 0.4, sfx: 'clang' });
      s.vars.dome = s.t;
      s.vars.crack = s.t;
    }
    if (s.t < 52) s.cam(1.1, (s.ax() + s.qx()) / 2, (s.ay() + s.qy()) / 2 - 30);
    else s.camV(1.45);
  },
  draw(s, ctx) {
    if (!s.vars.dome) return;
    const k = (s.t - s.vars.dome) / 30;
    if (k > 1) { mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 50, '#aaccff', 110); return; }
    // A dome of force over the impact.
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = '#cfe0ff'; ctx.lineWidth = 4; ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.ellipse(s.qx(), s.gy, 40 + k * 140, 30 + k * 90, 0, MS_PI, MS_TAU); ctx.stroke();
    ctx.restore();
    mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 50, '#aaccff', 110);
  },
  exit: [1, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// SCYTHE
// ═════════════════════════════════════════════════════════════════════════════
// Scythe Toss coming home: the blade circles back through them twice, lands in
// the thrower's hand, and the cut it left only opens when it is caught.
mfDefine('scythe:q', {
  name: "REAPER'S RETURN", color: '#aa44aa', len: 100,
  me: [
    { t: 0,  r: 0.2, w: 0.05, l: 2.4, lean: 13, drop: 5, fr: 17, fl: -12, hide: true },
    { t: 12, e: 'io', ...MS_STAND, hide: true },
    { t: 40, e: 'lin', ...MS_STAND, r: 0.3, w: 0.3, l: 2.2, hide: true },
    { t: 44, e: 'snap', r: 0.1, rl: 1.1, w: -1.4, l: 2.0, lean: -4, drop: 6, fr: 12, fl: -12 },
    { t: 50, e: 'out', r: 2.4, w: 2.9, l: 0.6, lean: -8, drop: 7, fr: 14, fl: -13 },
    { t: 80, e: 'lin', r: 2.45, w: 2.95, l: 0.6, lean: -9, drop: 7, fr: 14, fl: -13 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('frozen');
    if (s.at(14) || s.at(30)) { s.star(s.qx(), s.qy(), false, '#ee88ee'); s.sfx('swing'); s.shake(6); }
    if (s.at(44)) { s.sfx('clang'); s.parts(s.ax() + s.f * 20, s.ay(), '#cc66cc', 10); }
    // Caught; the cut opens.
    if (s.at(56)) {
      s.streak(s.qx() - 40, s.qy() - 30, s.qx() + 40, s.qy() + 30, '#ffffff', 22, 9);
      s.streak(s.qx() - 40, s.qy() + 24, s.qx() + 40, s.qy() - 24, '#ee88ee', 22, 7);
      s.vpose('arch', { air: false, drop: 6 });
      s.kill({ color: '#cc44cc' });
    }
    if (s.at(64)) s.vpose('kneel');
    if (s.at(78)) s.vpose('slump');
    if (s.t < 44) s.cam(1.35, (s.ax() + s.qx()) / 2, s.qy() - 10); else s.camMid(1.45);
  },
  draw(s, ctx) {
    if (s.t >= 44) return;
    // The blade on its loop: out past them, round, back through, home.
    const u = s.t / 44;
    const a = u * MS_TAU * 1.5;
    const cx = (s.ax() + s.qx()) / 2 + s.f * 30, rx = Math.abs(s.qx() - s.ax()) / 2 + 50;
    const x = cx + s.f * Math.cos(a + MS_PI) * rx * (1 - u * 0.3), y = s.qy() - 8 + Math.sin(a) * 34;
    s.prop(x, y, s.t * 0.55);
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#ee88ee'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, s.qy() - 8, rx, 34, 0, 0, MS_TAU); ctx.stroke();
    ctx.restore();
  },
  exit: [-1, 0],
});

// Soul Reap to the last drop: hooked and lifted on the blade, the soul is
// drawn out of them into the scythe, and the empty body is let fall.
mfDefine('scythe:e', {
  name: 'HARVEST', color: '#cc44cc', len: 116,
  me: [
    { t: 0,  r: -1.35, w: -1.0, l: -1.6, lean: -6, drop: 0, fr: 8, fl: -10 },
    { t: 12, e: 'out', r: 0.8, rl: 1.1, w: 1.6, l: 2.3, lean: 14, drop: 9, fr: 18, fl: -12 },
    { t: 22, e: 'io', r: -0.9, rl: 1.15, w: -0.2, l: -1.0, ll: 1.0, lean: -6, drop: 2, fr: 9, fl: -10 },
    { t: 70, e: 'lin', r: -1.0, rl: 1.15, w: -0.3, l: -1.1, ll: 1.0, lean: -8, drop: 2, fr: 9, fl: -10 },
    { t: 76, e: 'out', r: -1.6, w: -1.2, l: -1.5, lean: -10, drop: 0, fr: 9, fl: -10 },
    { t: 82, e: 'snap', r: 1.6, w: 2.4, l: 1.3, lean: 14, drop: 12, fr: 15, fl: -13, trail: true },
    { t: 100, e: 'lin', r: 1.6, w: 2.4, l: 1.3, lean: 12, drop: 12, fr: 15, fl: -13 },
    { t: 116, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 52, 0, 10);
    // Lifted on the blade's hook.
    s.go('v', 50, -58, 14, 26, 'out');
    if (s.at(20)) { s.vpose('hang'); s.sfx('soulRip'); }
    if (s.in(26, 72)) {
      s.vy = -58 + Math.sin(s.t * 0.4) * 2;
      if (s.t % 3 === 0) s.parts(s.qx(), s.qy() - 10, '#ee88ee', 2);
    }
    if (s.at(72)) { s.flash('#e8b0ff', 0.35, 10); s.pop(s.qx(), s.qy() - 50, 'HARVESTED', '#ee88ee'); s.vpose('limp'); }
    if (s.at(82)) {
      s.slash(10, -10, 70, -1.0, 2.4, { color: '#ee88ee', w: 14, life: 16 });
      s.kill({ color: '#cc44cc', a: 0.25, sfx: 'soulRip' });
    }
    s.go('v', 60, s.vfloor, 82, 92, 'in');
    if (s.at(92)) { s.vpose('slump'); s.shake(8); }
    if (s.t < 26) s.camMid(1.3); else s.cam(1.5, (s.ax() + s.qx()) / 2, s.qy() - 10);
  },
  draw(s, ctx) {
    // The soul: a pale copy of them drawn out, stretched toward the blade.
    if (s.t < 30 || s.t > 86) return;
    const k = s.u(30, 72, 'io'), fade = s.t > 72 ? 1 - s.u(72, 86) : 1;
    const bx = s.qx(), by = s.qy();
    const tipX = s.ax() + s.f * 40, tipY = s.ay() - 40;
    const x = bx + (tipX - bx) * k, y = by + (tipY - by) * k - Math.sin(k * MS_PI) * 30;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = '#f0c0ff'; ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 20; ctx.lineWidth = 3;
    // Head, body, a tether back to the body it came out of.
    ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, MS_TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 14);
    ctx.moveTo(x, y - 4); ctx.lineTo(x - s.f * 12, y - 12); ctx.moveTo(x, y - 4); ctx.lineTo(x + s.f * 12, y - 14);
    ctx.stroke();
    ctx.globalAlpha = 0.3 * fade * (1 - k);
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + x) / 2, Math.min(by, y) - 30, x, y + 14); ctx.stroke();
    ctx.restore();
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// FRYING PAN
// ═════════════════════════════════════════════════════════════════════════════
// Ground Pound from a great height, landed on them.
mfDefine('fryingpan:q', {
  name: 'PANCAKE', color: '#ffdd66', len: 100,
  me: [
    { t: 0,  r: 1.2, w: 1.5, l: 1.7, lean: 11, drop: 13, fr: 14, fl: -14 },
    { t: 8,  e: 'out', r: 2.0, w: 2.2, l: 1.2, lean: 4, drop: 12, fr: 10, fl: -10 },
    { t: 14, e: 'snap', r: -1.9, w: -2.1, l: -1.3, lean: -6, air: true, lg: 1.2, lgl: 1.9, ls: 0.75, lsl: 0.8, rot: -0.1 },
    { t: 40, e: 'io', r: -2.1, w: -2.4, l: -1.5, lean: -8, air: true, lg: 1.5, lgl: 1.75, ls: 0.85, lsl: 0.85, rot: -0.15 },
    { t: 46, e: 'in3', r: 1.15, w: 1.45, l: 1.7, lean: 12, drop: 14, fr: 14, fl: -14, trail: true },
    { t: 82, e: 'lin', r: 1.2, w: 1.5, l: 1.7, lean: 11, drop: 13, fr: 14, fl: -14 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('crumple');
    s.go('v', Math.max(30, Math.min(160, s.v0x)), s.vfloor, 0, 10, 'out');
    // Up out of frame, over them, and down.
    s.go('m', s.vx - 6, -230, 12, 34, 'out');
    if (s.at(14)) { s.sfx('swing'); s.parts(s.ax(), s.gy, '#ffdd66', 10); }
    if (s.at(30)) { s.vpose('brace'); s.pop(s.qx(), s.qy() - 46, '!', '#ffffff'); }
    s.go('m', null, -40, 38, 46, 'in3');
    s.go('m', null, 0, 46, 48, 'lin');
    if (s.at(46)) {
      s.vpose('crumple', { drop: 30, lean: 4, fr: 18, fl: -18, r: 0.2, l: 2.9 });
      s.kill({ color: '#ffdd66', y: s.gy - 6, ring: 170, sfx: 'clang' });
      s.pop(s.qx(), s.qy() - 40, 'SPLAT!', '#ffdd44');
      s.vars.crack = s.t;
    }
    if (s.t < 12) s.camMid(1.3);
    else if (s.t < 46) s.cam(1.05, s.qx(), s.gy - 120);
    else s.camV(1.55);
  },
  draw(s, ctx) {
    if (s.t >= 30 && s.t < 46) {
      // Its shadow growing over them.
      const k = s.u(30, 46, 'in');
      ctx.save(); ctx.globalAlpha = 0.25 + 0.4 * k; ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(s.ax(), s.gy, 10 + 26 * k, 4 + 4 * k, 0, 0, MS_TAU); ctx.fill(); ctx.restore();
    }
    if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 50, '#ffe680', 120);
  },
  exit: [0, 0],
});

// Grand Slam, sent all the way: BONK, the golfer's backswing, and a drive that
// puts them out of the sky with a twinkle.
mfDefine('fryingpan:e', {
  name: 'HOLE IN ONE', color: '#ffdd44', len: 116, noFloor: true,
  me: [
    { t: 0,  r: -1.35, w: -1.6, l: -1.2, ll: 0.95, lean: -6, drop: 0, fr: 9, fl: -12 },
    { t: 10, e: 'out', r: 0.3, rl: 1.05, w: 0.75, l: 1.5, lean: 12, drop: 9, fr: 17, fl: -12 },
    { t: 30, e: 'io', r: 2.55, w: 2.75, l: 2.45, ll: 0.9, lean: -4, drop: 12, fr: 13, fl: -15 },
    { t: 36, e: 'out', r: 2.7, w: 2.95, l: 2.55, ll: 0.9, lean: -7, drop: 13, fr: 13, fl: -15, trail: true },
    { t: 40, e: 'snap', r: -1.35, w: -1.6, l: -1.2, ll: 0.95, lean: -6, drop: 0, fr: 9, fl: -12 },
    { t: 96, e: 'lin', r: -1.45, w: -1.8, l: -1.3, lean: -7, drop: 0, fr: 9, fl: -12 },
    { t: 116, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('crumple');
    mfClose(s, 40, 0, 10);
    if (s.in(4, 36) && s.t % 5 === 0) s.parts(s.qx() + Math.cos(s.t * 0.6) * 12, s.tgt.y - 4, '#ffee66', 1);
    if (s.at(38)) {
      s.vpose('spread');
      s.kill({ color: '#ffdd44', hold: 10, sfx: 'clang' });
      s.slash(14, -10, 60, 2.4, -1.4, { color: '#ffe680', w: 15, life: 16 });
      s.pop(s.qx(), s.qy() - 40, 'FORE!', '#ffdd44');
    }
    s.fly('v', 3.2, -17, 0.12, 38, 96);
    if (s.in(38, 96)) s.vrot = -(s.t - 38) * 0.22;
    if (s.at(96)) { s.vars.twinkle = s.t; s.sfx('hitSnap'); }
    if (s.t < 38) s.camMid(1.4);
    else s.cam(1.0 + 0.2 * (1 - s.u(38, 70)), (s.ax() + s.qx()) / 2, Math.max(s.qy(), s.ay() - 260));
  },
  draw(s, ctx) {
    if (!s.vars.twinkle) return;
    const k = (s.t - s.vars.twinkle) / 18;
    if (k > 1) return;
    const x = s.qx(), y = s.qy(), r = 6 + Math.sin(k * MS_PI) * 18;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1 - k * 0.6;
    ctx.fillStyle = '#fff6c8'; ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 22;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * MS_PI / 4 + k * 2, rr = i % 2 ? r * 0.25 : r;
      i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  exit: [2, -6],
});

// ═════════════════════════════════════════════════════════════════════════════
// BROOMSTICK
// ═════════════════════════════════════════════════════════════════════════════
// Broom Ride with a passenger: scooped onto the bristles, a full loop in the
// air, and dropped from the top of it.
mfDefine('broomstick:q', {
  name: 'JOYRIDE', color: '#cc9966', len: 112,
  me: [
    { t: 0,  ...MS_BROOM_SIT },
    { t: 80, e: 'lin', ...MS_BROOM_SIT, rot: 0.1 },
    { t: 92, e: 'out', ...MS_STAND, r: 1.5, w: 0.1, l: 1.2, lean: 4, drop: 11, fr: 9, fl: -9 },
    { t: 112, e: 'io', ...MS_STAND },
  ],
  start(s) {
    const room = s.span.open ? 140 : Math.min(140, (s.f > 0 ? s.span.R - s.hx : s.hx - s.span.L) - 140);
    s.vars.cx = Math.max(0, room);
  },
  poseMod(s, p) {
    if (s.t < 20 || s.t >= 72) return p;
    p.rot = -((s.t - 20) / 52) * MS_TAU;
    return p;
  },
  tick(s) {
    if (s.at(0)) s.vpose('tumble');
    s.go('m', 20, -40, 0, 20, 'out');
    // A vertical loop centred above the stage, passenger on the back of the broom.
    if (s.in(20, 72)) {
      const a = ((s.t - 20) / 52) * MS_TAU;
      s.mx = s.vars.cx * s.u(20, 30, 'out') + 20 + Math.sin(a) * 90;
      s.my = -130 + Math.cos(a) * 90;
      if (s.t % 2 === 0) s.parts(s.ax() - s.f * 20, s.ay() + 12, '#ffdd88', 2);
    }
    if (s.t < 72) {
      const rot = s.att._movePose ? s.att._movePose.rot : 0;
      const bx = s.mx - Math.cos(rot) * 34, by = s.my + 14 + Math.sin(rot) * 34;
      if (s.t < 20) s.go('v', bx, by, 0, 20, 'io'); else { s.vx = bx; s.vy = by; }
      s.vrot = s.t >= 20 ? -((s.t - 20) / 52) * MS_TAU : 0;
    }
    if (s.at(72)) { s.vrot = 0; s.vpose('spread'); s.sfx('swing'); s.shake(8); s.pop(s.qx(), s.qy() - 30, 'BYE!', '#cc9966'); }
    s.fly('v', 2.5, -2, 0.5, 72);
    s.go('m', 30, 0, 74, 92, 'in');
    if (s.at(90)) {
      s.vpose('slump');
      s.kill({ color: '#cc9966', y: s.gy - 8, hold: 7 });
    }
    s.cam(1.0, s.hx + s.f * (s.vars.cx + 30), s.hy - 90);
  },
  exit: [1, 0],
});

// Tornado Spin grown into a twister: it pulls them in, spins them up the
// column, and throws them out of the top.
mfDefine('broomstick:e', {
  name: 'DUST DEVIL', color: '#cc9966', len: 108,
  me: [
    { t: 0,  r: 0.0, w: 0.0, l: 3.14, lean: 0, drop: 6, fr: 12, fl: -12 },
    { t: 70, e: 'in', r: -MS_TAU * 6, w: -MS_TAU * 6, l: 3.14 - MS_TAU * 6, lean: 0, drop: 6, fr: 12, fl: -12, trail: true },
    { t: 84, e: 'out', r: -MS_TAU * 6 - 1.57, rl: 1.1, w: -MS_TAU * 6 - 1.57, l: 1.3 - MS_TAU * 6, lean: -2, drop: 0, fr: 8, fl: -8 },
    { t: 108, e: 'io', ...MF_RAISED, r: -1.5 - MS_TAU * 6, w: -1.6 - MS_TAU * 6, l: 1.3 - MS_TAU * 6 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('tumble');
    // Into the column, then up it on a widening spiral.
    if (s.t < 70) {
      const k = s.u(0, 70, 'in');
      const a = s.t * (0.25 + k * 0.35);
      const R = (1 - Math.min(1, s.t / 18)) * Math.max(40, s.v0x) + 34 + k * 20;
      s.vx = Math.cos(a) * R;
      s.vy = s.vfloor - k * 200 + Math.sin(a) * 6;
      s.vrot = a * 1.4;
      if (s.t % 6 === 0) s.slash(0, -8, 74, 0, MS_TAU, { ry: 22, color: '#e0c090', w: 6, life: 8 });
      if (s.t % 4 === 0) s.parts(s.ax() + (Math.random() - 0.5) * 80, s.gy - Math.random() * 150, '#cc9966', 2);
    }
    if (s.at(70)) { s.vrot = 0; s.vpose('spread'); s.kill({ color: '#cc9966', hold: 8, sfx: 'heavyHit' }); }
    s.fly('v', 5, -6, 0.35, 70);
    if (s.t < 70) s.cam(1.1, s.ax(), s.ay() - 70 * s.u(0, 70)); else s.cam(1.0, (s.ax() + s.qx()) / 2, s.ay() - 140);
  },
  draw(s, ctx) {
    if (s.t > 86) return;
    const k = s.t < 70 ? s.u(0, 30, 'out') : 1 - s.u(70, 86);
    const x = s.ax(), y0 = s.gy;
    ctx.save();
    ctx.globalAlpha = 0.5 * k;
    ctx.strokeStyle = '#e8d0a8'; ctx.lineWidth = 2; ctx.shadowColor = '#cc9966'; ctx.shadowBlur = 8;
    for (let i = 0; i < 12; i++) {
      const h = i * 22, w = 26 + i * 7, ph = s.t * 0.45 + i * 0.7;
      ctx.beginPath(); ctx.ellipse(x + Math.sin(ph) * 6, y0 - h, w, 5 + i * 0.5, 0, ph % MS_TAU, ph % MS_TAU + 4.2); ctx.stroke();
    }
    ctx.restore();
  },
  exit: [5, -4],
});

// ═════════════════════════════════════════════════════════════════════════════
// COMBAT (fists)
// ═════════════════════════════════════════════════════════════════════════════
// Roundhouse, slowed to a crawl at the moment of contact, then let go.
mfDefine('combat:q', {
  name: 'LIGHTS OUT', color: '#ff4444', len: 100,
  me: [
    { t: 0,  r: 1.3, l: 1.0, lean: 0, drop: 0, fr: 7, fl: -7 },
    { t: 8,  e: 'out', r: -0.5, rl: 0.6, l: -0.8, ll: 0.6, lean: -4, drop: 7, fr: 9, fl: -9 },
    { t: 30, e: 'in', r: 2.6, rl: 0.8, l: 2.2, ll: 0.8, lean: -12, air: true, lg: -0.15, lgl: 1.62, ls: 1.08, lsl: 0.95, rot: -0.3 },
    { t: 34, e: 'snap', r: 2.7, rl: 0.8, l: 2.3, ll: 0.8, lean: -12, air: true, lg: 0.15, lgl: 1.62, ls: 1.05, lsl: 0.95, rot: -0.3 },
    { t: 50, e: 'out', r: 2.6, rl: 0.8, l: 2.3, ll: 0.8, lean: -10, air: true, lg: 0.6, lgl: 1.7, ls: 1.0, lsl: 0.95, rot: -0.2 },
    { t: 62, e: 'io', r: 1.3, rl: 0.7, l: 1.0, ll: 0.7, lean: 0, drop: 2, fr: 9, fl: -9 },
    { t: 100, e: 'lin', r: 1.35, rl: 0.75, l: 1.05, ll: 0.75, lean: 0, drop: 1, fr: 8, fl: -8 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 44, 0, 8);
    if (s.at(30)) { s.flash('#000000', 0.5, 14); s.invert(3); s.hold(14); s.slash(6, -14, 62, 2.9, 6.6, { ry: 18, color: '#ff8080', w: 12, life: 22 }); }
    if (s.at(32)) {
      s.vpose('arch', { air: false, drop: 4 });
      s.kill({ color: '#ff4444', y: s.qy() - 20, hold: 4, sfx: 'hitBlunt' });
    }
    // Spun round where they stood, then down.
    if (s.in(32, 60)) s.vrot = (s.t - 32) * 0.35;
    if (s.at(60)) { s.vrot = 0; s.vpose('crumple'); }
    if (s.at(74)) { s.vpose('slump', { drop: 30, lean: 20, rot: 0.6 }); s.shake(8); s.parts(s.qx(), s.gy, '#ff8080', 8); }
    if (s.t < 30) s.camMid(1.4 + s.u(8, 30) * 0.3); else s.camV(1.6);
  },
  exit: [0, 0],
});

// Combo Strike as a flurry: a storm of alternating fists, the uppercut that
// lifts them, and an axe kick from above that ends it on the floor.
mfDefine('combat:e', {
  name: 'HUNDRED FISTS', color: '#ff4444', len: 112,
  me: [
    { t: 0,  r: 1.6, l: 1.3, lean: 0, drop: 2, fr: 9, fl: -9 },
    { t: 6,  e: 'out', r: 0.0, rl: 1.2, l: 2.0, ll: 0.6, lean: 10, drop: 6, fr: 15, fl: -13 },
    { t: 48, e: 'lin', r: 0.0, rl: 1.2, l: 2.0, ll: 0.6, lean: 10, drop: 6, fr: 15, fl: -13 },
    { t: 51, e: 'in', r: 1.9, rl: 0.6, l: 0.8, ll: 0.7, lean: 6, drop: 13, fr: 12, fl: -14 },
    { t: 54, e: 'snap', r: -1.35, rl: 1.15, l: 1.9, ll: 0.8, lean: -6, air: true, lg: 1.35, lgl: 2.1, ls: 0.95, lsl: 0.7 },
    { t: 66, e: 'out', r: -0.9, rl: 0.9, l: 2.2, ll: 0.8, lean: -4, air: true, lg: -1.2, lgl: 2.0, ls: 1.1, lsl: 0.7, rot: -0.4 },
    { t: 70, e: 'snap', r: 2.6, rl: 0.75, l: 2.3, ll: 0.75, lean: 8, air: true, lg: 1.2, lgl: 1.9, ls: 1.1, lsl: 0.7, rot: 0.3 },
    { t: 78, e: 'in', r: 1.6, l: 1.3, lean: 6, drop: 12, fr: 12, fl: -12 },
    { t: 112, e: 'io', r: 1.3, l: 1.0, lean: 0, drop: 0, fr: 7, fl: -7 },
  ],
  poseMod(s, p) {
    if (s.t < 6 || s.t >= 48) return p;
    // A jab every three frames, hands alternating.
    const i = Math.floor((s.t - 6) / 3), ph = ((s.t - 6) % 3) / 3;
    const out = ph < 0.4 ? msEase('snap', ph / 0.4) : 1 - (ph - 0.4) / 0.6;
    const lead = i % 2 === 0;
    p.r = lead ? -0.05 + (i % 3) * 0.12 - 0.12 : 1.2 - out * 0.4; p.rl = lead ? 0.55 + 0.7 * out : 0.6;
    p.l = lead ? 1.6 : -0.02 + (i % 3) * 0.1 - 0.1; p.ll = lead ? 0.6 : 0.55 + 0.7 * out;
    return p;
  },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 40, 0, 6);
    if (s.every(3, 7, 48)) {
      const y = s.qy() - 14 + ((s.t * 7) % 24);
      MoveScene.fx.push({ kind: 'star', x: s.qx() - s.f * 8, y, r: 18, color: '#ff8080', life: 5, max: 5, a: s.t });
      if (s.t % 6 === 1) s.sfx('hit');
      s.vx += 0.4; s.vpose(s.t % 6 < 3 ? 'reel' : 'fold');
      s.shake(3);
    }
    if (s.in(6, 48)) s.mx = s.vx - 40;
    if (s.at(54)) { s.star(s.qx(), s.qy() - 10, true, '#ff8080'); s.shake(12); s.hold(4); s.vpose('lift'); s.sfx('hitBlunt'); }
    s.go('v', null, -120, 54, 66, 'out');
    s.go('m', null, -140, 54, 66, 'out');
    if (s.at(70)) {
      s.vpose('spread');
      s.kill({ color: '#ff4444', hold: 8, sfx: 'hitBlunt' });
    }
    s.go('v', null, s.vfloor, 70, 76, 'in3');
    s.go('m', null, 0, 70, 78, 'in3');
    if (s.at(76)) { s.vpose('slump'); s.ring(s.qx(), s.gy, 150, '#ff8080', 20); s.shake(16); s.vars.crack = s.t; }
    if (s.t < 54) s.camMid(1.55); else s.camMid(1.2);
  },
  draw(s, ctx) { if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#ff8080', 90); },
  exit: [1, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// FLAIL
// ═════════════════════════════════════════════════════════════════════════════
// Chain Yank, wrapped: the chain coils round them, hauls them in, and the
// ball comes down on them from overhead.
mfDefine('flail:q', {
  name: 'CHAIN GANG', color: '#aaaaaa', len: 104,
  me: [
    { t: 0,  r: -MS_TAU + 0.15, w: -MS_TAU + 0.05, l: 2.3, lean: 12, drop: 6, fr: 16, fl: -12 },
    { t: 10, e: 'out', r: 0.2, rl: 1.1, w: 0.1, l: 0.3, ll: 1.0, lean: 2, drop: 6, fr: 13, fl: -12 },
    { t: 20, e: 'io', r: 2.4, rl: 0.8, w: 2.5, l: 2.3, ll: 0.8, lean: -14, drop: 10, fr: 17, fl: -10 },
    { t: 34, e: 'io', r: 2.5, rl: 0.8, w: 2.6, l: 2.4, ll: 0.8, lean: -12, drop: 10, fr: 17, fl: -10 },
    { t: 48, e: 'lin', r: -1.6, w: -1.6, l: 1.0, lean: -4, drop: 6, fr: 12, fl: -12, trail: true },
    { t: 58, e: 'lin', r: -1.6 - MS_TAU, w: -1.6 - MS_TAU, l: 1.0, lean: -4, drop: 6, fr: 12, fl: -12, trail: true },
    { t: 63, e: 'snap', r: 1.2 - MS_TAU, w: 1.45 - MS_TAU, l: 1.4, lean: 15, drop: 14, fr: 15, fl: -15, trail: true },
    { t: 88, e: 'lin', r: 1.2 - MS_TAU, w: 1.5 - MS_TAU, l: 1.4, lean: 13, drop: 14, fr: 15, fl: -15 },
    { t: 104, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU, w: 0.75 - MS_TAU },
  ],
  tick(s) {
    if (s.at(0)) { s.vpose('frozen', { r: 1.7, l: 1.45, rl: 0.6, ll: 0.6 }); s.sfx('clang'); }
    s.go('v', Math.max(120, Math.min(220, s.v0x)), s.vfloor, 0, 10, 'out');
    // Two hauls on the chain.
    s.go('v', 90, s.vfloor, 18, 24, 'snap');
    s.go('v', 50, s.vfloor, 30, 36, 'snap');
    if (s.at(18) || s.at(30)) { s.shake(8); s.sfx('clang'); s.parts(s.qx(), s.gy, '#aaaaaa', 6); }
    if (s.at(63)) {
      s.vpose('crumple', { drop: 26 });
      s.kill({ color: '#cccccc', y: s.qy() - 10, ring: 140, sfx: 'hitBlunt' });
      s.vars.crack = s.t;
    }
    if (s.t < 40) s.camMid(1.25); else s.camMid(1.45);
  },
  draw(s, ctx) {
    // The chain wrapped round them, running back to the handle.
    if (s.t < 40) {
      const hx = s.ax() + s.f * 16, hy = s.ay() - 4;
      ctx.save();
      ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(s.qx() - s.f * 10, s.qy()); ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(s.qx(), s.qy() - 10 + i * 9, 13, 4, 0, 0, MS_TAU); ctx.stroke();
      }
      ctx.restore();
    }
    if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#dddddd', 90);
  },
  exit: [1, 0],
});

// The flail's whirl, swung like a wrecking ball through them.
mfDefine('flail:e', {
  name: 'WRECKING BALL', color: '#aaaaaa', len: 100,
  me: [
    { t: 0,  r: -1.4 - MS_TAU, w: -1.5 - MS_TAU, l: 1.2, lean: 0, drop: 4, fr: 10, fl: -10 },
    { t: 40, e: 'in', r: -1.57 - MS_TAU * 4, w: -1.57 - MS_TAU * 4, l: 1.0, lean: -4, drop: 7, fr: 12, fl: -12, trail: true },
    { t: 44, e: 'lin', r: 2.6 - MS_TAU * 5, w: 2.7 - MS_TAU * 5, l: 0.6, lean: -9, drop: 9, fr: 14, fl: -13, trail: true },
    { t: 48, e: 'snap', r: 0.0 - MS_TAU * 5, rl: 1.15, w: -0.05 - MS_TAU * 5, l: 2.4, lean: 14, drop: 7, fr: 18, fl: -12, trail: true },
    { t: 80, e: 'lin', r: -0.1 - MS_TAU * 5, rl: 1.15, w: -0.15 - MS_TAU * 5, l: 2.4, lean: 12, drop: 7, fr: 18, fl: -12 },
    { t: 100, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU * 5, w: 0.75 - MS_TAU * 5 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    s.go('v', 70, s.vfloor, 0, 10, 'out');
    if (s.at(14)) s.vpose('brace');
    if (s.every(8, 4, 40)) s.sfx('swing');
    if (s.at(47)) {
      s.vpose('spread');
      s.kill({ color: '#cccccc', hold: 10, ring: 150, sfx: 'hitBlunt' });
    }
    s.fly('v', 11, -7, 0.32, 47);
    if (s.t > 47) s.vrot = -(s.t - 47) * 0.2;
    if (s.t < 47) s.camMe(1.35); else s.cam(1.15, (s.ax() + s.qx()) / 2, s.ay() - 30);
  },
  draw(s, ctx) {
    if (s.t > 50) return;
    // The ball's orbit, swelling as it spins up.
    const p = s.att._movePose; if (!p) return;
    const k = s.u(0, 40, 'in');
    const a = s.f > 0 ? p.w : MS_PI - p.w, R = 46 + k * 34;
    const x = s.ax() + Math.cos(a) * R, y = s.ay() - 6 + Math.sin(a) * R * 0.75;
    ctx.save();
    ctx.strokeStyle = '#bbbbbb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.ax(), s.ay() - 6); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#777777'; ctx.strokeStyle = '#eeeeee'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8 + k * 10;
    ctx.beginPath(); ctx.arc(x, y, 8 + k * 9, 0, MS_TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  exit: [8, -5],
});

// ═════════════════════════════════════════════════════════════════════════════
// WHIP
// ═════════════════════════════════════════════════════════════════════════════
// Lasso to the last: yanked off their feet, swung overhead on the rope in a
// full arc, and slammed down on the performer's other side.
mfDefine('whip:q', {
  name: 'HOGTIED', color: '#cc8833', len: 108,
  me: [
    { t: 0,  r: 0.3, rl: 1.1, w: 0.4, l: 2.2, lean: 12, drop: 6, fr: 16, fl: -12 },
    { t: 10, e: 'out', r: 2.3, rl: 0.8, w: 2.4, l: 0.3, ll: 1.0, lean: -12, drop: 9, fr: 15, fl: -13 },
    { t: 18, e: 'io', r: -1.2, rl: 1.1, w: -1.3, l: 2.0, lean: -6, drop: 5, fr: 12, fl: -12 },
    { t: 52, e: 'lin', r: -1.2 - MS_TAU, rl: 1.1, w: -1.3 - MS_TAU, l: 2.0, lean: -6, drop: 5, fr: 12, fl: -12 },
    { t: 58, e: 'snap', r: -4.4 - MS_TAU, rl: 1.1, w: -4.5 - MS_TAU, l: 2.0, lean: -14, drop: 12, fr: 15, fl: -12, trail: true },
    { t: 90, e: 'lin', r: -4.4 - MS_TAU, rl: 1.1, w: -4.5 - MS_TAU, l: 2.0, lean: -12, drop: 11, fr: 15, fl: -12 },
    { t: 108, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU * 2, w: 0.75 - MS_TAU * 2 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel', { lean: 8 });
    if (s.t < 10) s.go('v', Math.max(80, Math.min(220, s.v0x)), s.vfloor, 0, 10, 'out');
    if (s.at(10)) { s.sfx('hitSnap'); s.vpose('spread'); s.shake(8); }
    // On the rope: off their feet, round over the top, down behind.
    if (s.t >= 10 && s.t < 58) {
      const p = s.att._movePose;
      const a = p ? p.w : -1.2;
      const R = 70 + 60 * (1 - s.u(10, 20, 'out'));
      const tx = Math.cos(a) * R, ty = -14 + Math.sin(a) * R;
      if (s.t < 18) s.go('v', tx, ty, 10, 18, 'out'); else { s.vx = tx; s.vy = ty; }
      s.vrot = a + 1.57;
    }
    if (s.at(58)) {
      s.vrot = 0; s.vpose('slump', { lean: -10, rot: -0.5 });
      s.kill({ color: '#cc8833', y: s.gy - 8, ring: 150, sfx: 'hitSnap' });
      s.vars.crack = s.t;
    }
    s.cam(1.25, s.ax(), s.ay() - 30);
  },
  draw(s, ctx) {
    if (s.t >= 58) { if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#ffcc66', 90); return; }
    const hx = s.ax() + s.f * 12, hy = s.ay() - 10;
    ctx.save();
    ctx.strokeStyle = '#cc8833'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo((hx + s.qx()) / 2, (hy + s.qy()) / 2 + 14, s.qx(), s.qy());
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s.qx(), s.qy(), 15, 6, 0, 0, MS_TAU); ctx.stroke();
    ctx.restore();
  },
  exit: [-1, 0],
});

// Serpent's Coil closes: the whip winds round them in a tightening helix and
// the last crack is point-blank.
mfDefine('whip:e', {
  name: "SERPENT'S BITE", color: '#ffcc55', len: 104,
  me: [
    { t: 0,  r: 0.1, rl: 1.1, w: 0.2, l: 1.9, lean: 12, drop: 7, fr: 15, fl: -13 },
    { t: 12, e: 'out', r: -0.6, rl: 1.1, w: -0.4, l: 1.9, lean: 4, drop: 7, fr: 15, fl: -13 },
    { t: 44, e: 'lin', r: -0.7, rl: 1.1, w: -0.5, l: 1.9, lean: -4, drop: 8, fr: 15, fl: -13 },
    { t: 54, e: 'io', r: -2.4, w: -2.5, l: 0.5, lean: -8, drop: 6, fr: 12, fl: -12 },
    { t: 58, e: 'snap', r: 0.1, rl: 1.15, w: 0.0, l: 2.3, lean: 15, drop: 6, fr: 18, fl: -12, trail: true },
    { t: 88, e: 'lin', r: 0.15, rl: 1.15, w: 0.05, l: 2.3, lean: 12, drop: 6, fr: 18, fl: -12 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('frozen', { r: 1.75, l: 1.5, rl: 0.6, ll: 0.6 });
    s.go('v', Math.max(70, Math.min(150, s.v0x)), s.vfloor, 0, 12, 'out');
    if (s.every(8, 12, 44)) { s.sfx('hitSnap'); s.shake(4); }
    if (s.at(44)) { s.go('v', 60, s.vfloor, 44, 50); s.vpose('arch', { air: false, drop: 4 }); }
    s.go('v', 52, s.vfloor, 44, 54, 'snap');
    if (s.at(58)) {
      s.vpose('spread');
      s.kill({ color: '#ffcc55', sfx: 'hitSnap' });
      s.att._whipCrack = { x: s.qx(), y: s.qy(), timer: 14, big: true };
    }
    s.fly('v', 7, -5, 0.4, 58, 82);
    if (s.at(82)) s.vpose('slump');
    s.camMid(1.4 + s.u(12, 44) * 0.2);
  },
  draw(s, ctx) {
    if (s.t < 4 || s.t > 58) return;
    // A helix of whip round them, tightening.
    const k = s.u(4, 44, 'out');
    const x = s.qx(), y = s.qy(), R = 34 - k * 18;
    const hx = s.ax() + s.f * 14, hy = s.ay() - 6;
    ctx.save();
    ctx.strokeStyle = '#ffcc55'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ffcc55'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, a = u * MS_TAU * 3.5 + s.t * 0.2;
      ctx.lineTo(x + Math.cos(a) * R, y + 26 - u * 52 + Math.sin(a) * R * 0.3);
    }
    ctx.stroke();
    ctx.restore();
  },
  exit: [5, -2],
});

// ═════════════════════════════════════════════════════════════════════════════
// KATANA
// ═════════════════════════════════════════════════════════════════════════════
// Iaijutsu, the one that counts: the performer is already past them. The blade
// goes back into the sheath, slowly, and only when it clicks home does the cut
// show.
mfDefine('katana:q', {
  name: 'ONE CUT', color: '#ccccff', len: 112,
  me: [
    { t: 0,  ...MS_IAI_CUT },
    { t: 30, e: 'lin', ...MS_IAI_CUT, w: -0.3 },
    { t: 60, e: 'io', r: 1.6, rl: 0.8, w: 3.1, l: 1.9, ll: 0.7, lean: 2, drop: 6, fr: 12, fl: -12 },
    { t: 64, e: 'snap', r: 1.75, rl: 0.75, w: 3.05, l: 1.85, ll: 0.7, lean: 4, drop: 7, fr: 12, fl: -12 },
    { t: 112, e: 'io', ...MS_STAND },
  ],
  start(s) {
    // The scene's cut lands after the draw, so the performer is normally past
    // them already, back turned. Otherwise go through them now.
    s.vars.already = s.att.facing !== s.f;
    const room = s.span.open ? 1e9 : (s.f > 0 ? s.span.R - s.hx : s.hx - s.span.L) - 30;
    s.vars.past = s.vars.already ? 0 : Math.min(room, s.v0x + 70);
    if (s.vars.already) s.aface = -s.f;
  },
  tick(s) {
    if (s.at(0)) {
      s.vpose('frozen');
      if (!s.vars.already) s.streak(s.ax() - s.f * 20, s.ay() - 2, s.wx(s.vars.past), s.ay() - 2, '#ffffff', 26, 7);
    }
    if (!s.vars.already) { s.go('m', s.vars.past, 0, 0, 3, 'snap'); if (s.at(3)) s.aface = s.f; }
    s.vface = s.vars.already ? s.f : -s.f;
    if (s.at(56)) s.sfx('iaiSheathe');
    if (s.at(64)) {
      MoveScene.fx.push({ kind: 'line', x0: s.qx() - 46, y0: s.qy() + 30, x1: s.qx() + 46, y1: s.qy() - 30, color: '#ffffff', life: 26, max: 26, w: 10 });
      s.vpose('arch', { air: false, drop: 4 });
      s.kill({ color: '#ccccff', a: 0.4, hold: 12, sfx: 'iaiMark' });
    }
    if (s.at(72)) s.vpose('kneel');
    if (s.at(90)) { s.vpose('slump', { lean: 22, rot: 0.7 }); s.shake(6); }
    if (s.t < 64) s.cam(1.5 + s.u(0, 64) * 0.25, (s.ax() + s.qx()) / 2, s.ay() - 8);
    else s.camV(1.6);
  },
  draw(s, ctx) {
    if (s.t >= 64) return;
    // A hairline on them that brightens as the blade goes home.
    const k = s.u(20, 64, 'in');
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.6 * k;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 + k; ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 6 + 12 * k;
    ctx.beginPath(); ctx.moveTo(s.qx() - 30, s.qy() + 20); ctx.lineTo(s.qx() + 30, s.qy() - 20); ctx.stroke();
    ctx.restore();
  },
  exit: [0, 0],
});

// Shadow Step without end: the performer is everywhere round them at once,
// a cut from every side, then back in front, the blade sheathed, and every
// cut lands together.
mfDefine('katana:e', {
  name: 'THOUSAND STEPS', color: '#ffffff', len: 112,
  me: [
    { t: 0,  ...MS_IAI_CUT },
    { t: 6,  e: 'out', ...MS_IAI_HOLD },
    { t: 48, e: 'lin', ...MS_IAI_HOLD },
    { t: 52, e: 'snap', ...MS_IAI_CUT, trail: true },
    { t: 66, e: 'lin', ...MS_IAI_CUT, w: -0.3 },
    { t: 74, e: 'io', r: 1.6, rl: 0.8, w: 3.1, l: 1.9, ll: 0.7, lean: 2, drop: 6, fr: 12, fl: -12 },
    { t: 78, e: 'snap', r: 1.75, rl: 0.75, w: 3.05, l: 1.85, ll: 0.7, lean: 4, drop: 7, fr: 12, fl: -12 },
    { t: 112, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.cuts = []; },
  tick(s) {
    if (s.at(0)) s.vpose('frozen');
    s.go('v', Math.min(160, Math.max(60, s.v0x)), s.vfloor, 0, 6, 'out');
    // Blinks: the performer is drawn at each spot as an afterimage only.
    if (s.every(4, 8, 48)) {
      const i = (s.t - 8) / 4, a = i * 2.39996;
      const r0 = 54;
      const x = s.qx() + Math.cos(a) * r0, y = s.qy() + Math.sin(a) * 30;
      const x2 = s.qx() - Math.cos(a) * r0, y2 = s.qy() - Math.sin(a) * 30;
      s.streak(x, y, x2, y2, '#ffffff', 10, 3);
      s.vars.cuts.push([x, y, x2, y2]);
      s.sfx('swing');
      s.parts(x, y, '#888899', 3);
    }
    if (s.in(8, 48)) s.vpose(s.t % 8 < 4 ? 'frozen' : 'reel');
    // The performer between blinks is never where you look.
    if (s.in(8, 50)) { const i = Math.floor((s.t - 8) / 4); s.mx = s.vx + (i % 2 ? 60 : -60); s.aface = i % 2 ? -s.f : s.f; }
    if (s.at(50)) { s.mx = s.vx - 90; s.aface = s.f; }
    if (s.at(78)) {
      s.sfx('iaiSheathe');
      for (const c of s.vars.cuts) s.streak(c[0], c[1], c[2], c[3], '#ffffff', 22, 6);
      s.vpose('spread', { air: false });
      s.kill({ color: '#ffffff', a: 0.45, hold: 12, ring: 160, sfx: 'iaiMark' });
    }
    if (s.at(86)) s.vpose('kneel');
    if (s.at(98)) s.vpose('slump');
    s.camV(s.t < 50 ? 1.55 : 1.4);
  },
  draw(s, ctx) {
    if (s.t < 8 || s.t >= 50) return;
    // Afterimages of the last few blinks.
    ctx.save();
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#ccccff';
    for (let j = 1; j <= 3; j++) {
      const i = Math.floor((s.t - 8) / 4) - j;
      if (i < 0) continue;
      const x = s.qx() + (i % 2 ? 60 : -60) * s.f;
      ctx.fillRect(x - s.att.w / 2, s.ay() - s.att.h / 2, s.att.w, s.att.h);
    }
    ctx.restore();
  },
  exit: [0, 0],
});
