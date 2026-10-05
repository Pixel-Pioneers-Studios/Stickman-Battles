'use strict';
// smb-finisher-moves-defs2.js — one finisher per ranged and weapons-ext move
// scene (gun through crossbow). Melee moves: smb-finisher-moves-defs.js.
// Ranged finishers leave the victim where the shot found them and cut the
// camera between the shooter and the target instead of closing the gap.
//
// Depends on: smb-finisher-moves.js (mfDefine), smb-finisher-moves-defs.js
//   (mfClose, mfCracks, MF_RAISED, MF_CROUCH, MF_AIRUP), smb-move-scenes-defs.js
//   (MS_STAND, MS_AIM, MS_KNEEL, MS_IAI_HOLD, MS_IAI_CUT, MS_PI, MS_TAU).
// ============================================================

// Where the shooter's muzzle / string hand is, in world space.
function mfMuzzle(s, reach, dy) { return { x: s.ax() + s.f * (reach || 30), y: s.ay() + (dy === undefined ? -14 : dy) }; }

// A short arrow or bolt stuck in the victim at (dx, dy) from their centre,
// pointing back the way it came (facing space angle a).
function mfStuck(ctx, s, dx, dy, a, len, color) {
  const x = s.qx() + s.f * dx, y = s.qy() + dy;
  const ca = s.f > 0 ? a : MS_PI - a;
  ctx.save();
  ctx.strokeStyle = color || '#d8c8a0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ca) * (len || 20), y - Math.sin(ca) * (len || 20)); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - Math.cos(ca) * (len || 20), y - Math.sin(ca) * (len || 20), 2, 0, MS_TAU); ctx.fill();
  ctx.restore();
}

// Shooter in shot, then cut to the target for the hit.
function mfShotCam(s, cutAt, z) {
  if (s.t < cutAt) s.cam(z || 1.55, s.ax() + s.f * 40, s.ay() - 6);
  else s.camV(z || 1.55);
}

// ═════════════════════════════════════════════════════════════════════════════
// GUN
// ═════════════════════════════════════════════════════════════════════════════
// Burst Shot as an execution: the long aim, the click, three rounds.
mfDefine('gun:q', {
  name: 'HEADSHOT', color: '#ffdd00', len: 100,
  me: [
    { t: 0,  ...MS_AIM },
    { t: 24, e: 'lin', ...MS_AIM, lean: 4, drop: 4 },
    { t: 60, e: 'lin', ...MS_AIM, lean: 4, drop: 4 },
    { t: 72, e: 'io', r: -1.1, rl: 0.9, w: -1.5, l: 1.3, lean: -2, drop: 1, fr: 9, fl: -9 },
    { t: 100, e: 'lin', r: -1.15, rl: 0.9, w: -1.55, l: 1.3, lean: -2, drop: 0, fr: 9, fl: -9 },
  ],
  poseMod(s, p) {
    for (const at of [30, 35, 40]) if (s.t >= at && s.t < at + 4) { const k = 1 - (s.t - at) / 4; p.r -= k * 0.3; p.w -= k * 0.45; p.lean -= k * 6; }
    return p;
  },
  tick(s) {
    if (s.at(0)) s.vpose('brace');
    if (s.at(22)) { s.sfx('clang'); s.pop(s.ax() + s.f * 20, s.ay() - 40, 'click', '#ffffff'); }
    for (const [i, at] of [30, 35, 40].entries()) {
      if (!s.at(at)) continue;
      const m = mfMuzzle(s);
      s.streak(m.x, m.y, s.qx(), s.qy() - 16 + i * 4, '#fff2a0', 10, 4);
      s.parts(m.x, m.y, '#ffdd00', 6);
      s.sfx('hitPierce');
      if (i < 2) { s.star(s.qx(), s.qy() - 16, false, '#ffdd00'); s.shake(8); s.vpose(i ? 'arch' : 'reel', { air: false }); s.vx += 8; }
      else { s.vpose('arch', { air: false, drop: 4 }); s.kill({ color: '#ffdd00', y: s.qy() - 18, sfx: 'heavyHit' }); }
    }
    s.go('v', s.vx + 14, null, 42, 60, 'out');
    if (s.at(58)) s.vpose('kneel', { lean: -6 });
    if (s.at(74)) { s.vpose('slump', { lean: -14, rot: -0.6 }); s.shake(6); }
    if (s.in(60, 100) && s.t % 4 === 0) s.parts(s.ax() + s.f * 12, s.ay() - 50, '#999999', 1);
    mfShotCam(s, 30);
  },
  exit: [2, 0],
});

// The super's volley, every round of it.
mfDefine('gun:e', {
  name: 'FULL MAGAZINE', color: '#ff8800', len: 104,
  me: [
    { t: 0,  ...MS_AIM, drop: 7, fr: 13, fl: -14 },
    { t: 62, e: 'lin', ...MS_AIM, drop: 8, fr: 14, fl: -14, lean: 0 },
    { t: 66, e: 'snap', ...MS_AIM, r: -0.35, w: -0.55, lean: -8, drop: 7, fr: 14, fl: -14 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  poseMod(s, p) {
    if (s.t < 8 || s.t >= 60) return p;
    const k = Math.max(0, 1 - ((s.t - 8) % 3) / 1.6) * 0.16;
    p.r -= k; p.w -= k * 1.5 + Math.sin(s.t * 1.7) * 0.03; p.lean -= k * 6;
    return p;
  },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.every(3, 8, 60)) {
      const m = mfMuzzle(s);
      const y = s.qy() - 20 + ((s.t * 13) % 30);
      s.streak(m.x, m.y, s.qx(), y, '#ffcc66', 6, 3);
      MoveScene.fx.push({ kind: 'star', x: s.qx() - s.f * 6, y, r: 16, color: '#ff8800', life: 5, max: 5, a: s.t });
      s.parts(s.ax() - s.f * 4, s.ay() - 16, '#ffcc44', 1);
      s.vx += 1.3;
      s.vpose(s.t % 6 < 3 ? 'reel' : 'fold');
      s.shake(3);
      if (s.t % 6 === 2) s.sfx('hitPierce');
    }
    if (s.at(66)) {
      const m = mfMuzzle(s);
      s.streak(m.x, m.y, s.qx(), s.qy() - 10, '#ffffff', 14, 7);
      s.vpose('spread');
      s.kill({ color: '#ff8800' });
    }
    s.fly('v', 5, -5, 0.45, 66);
    if (s.t < 8) s.camMe(1.5); else if (s.t < 66) s.camMid(1.15); else s.camV(1.4);
  },
  exit: [4, -1],
});

// ═════════════════════════════════════════════════════════════════════════════
// PEA SHOOTER
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('peashooter:q', {
  name: 'PEA PELTER', color: '#44cc44', len: 100,
  me: [
    { t: 0,  ...MS_AIM },
    { t: 58, e: 'lin', ...MS_AIM, lean: 4 },
    { t: 64, e: 'snap', ...MS_AIM, r: -0.3, w: -0.4, lean: -6 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  poseMod(s, p) {
    if (s.t < 6 || s.t >= 58) return p;
    const k = Math.max(0, 1 - ((s.t - 6) % 2) / 1.2) * 0.1;
    p.r -= k; p.w -= k * 1.4;
    return p;
  },
  start(s) { s.vars.peas = []; },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.every(2, 6, 58)) {
      const m = mfMuzzle(s);
      s.vars.peas.push({ x: m.x, y: m.y + (Math.random() - 0.5) * 6, t: s.t, ty: s.qy() - 22 + Math.random() * 40 });
      if (s.t % 6 === 0) s.sfx('hit');
    }
    for (const p of s.vars.peas) if (!p.hit && s.t - p.t >= 6) { p.hit = true; s.parts(s.qx() - s.f * 6, p.ty, '#66ff66', 3); s.vx += 0.25; }
    if (s.in(10, 58)) s.vpose(s.t % 4 < 2 ? 'reel' : 'fold');
    if (s.at(64)) { s.vpose('crumple'); s.kill({ color: '#44cc44', hold: 7, sfx: 'hitBlunt' }); s.pop(s.qx(), s.qy() - 40, 'PEA-K', '#66ff66'); }
    if (s.at(80)) s.vpose('slump');
    s.camMid(1.25);
  },
  draw(s, ctx) {
    ctx.save();
    ctx.fillStyle = '#66ee55'; ctx.strokeStyle = '#1d6d14'; ctx.lineWidth = 1;
    for (const p of s.vars.peas) {
      const u = (s.t - p.t) / 6;
      if (u < 0 || u > 1) continue;
      const x = p.x + (s.qx() - s.f * 6 - p.x) * u, y = p.y + (p.ty - p.y) * u;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, MS_TAU); ctx.fill(); ctx.stroke();
    }
    // Green splats left on them.
    const n = Math.min(14, s.vars.peas.filter(p => p.hit).length);
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = 6 + (i * 7) % 12;
      ctx.beginPath(); ctx.arc(s.qx() + Math.cos(a) * r * 0.6, s.qy() + Math.sin(a) * r, 3, 0, MS_TAU); ctx.fill();
    }
    ctx.restore();
  },
  exit: [1, 0],
});

mfDefine('peashooter:e', {
  name: 'GIANT PEA', color: '#44ff44', len: 104,
  me: [
    { t: 0,  ...MS_AIM },
    { t: 40, e: 'lin', ...MS_AIM, lean: -2, drop: 6, fr: 12, fl: -14 },
    { t: 44, e: 'snap', ...MS_AIM, r: -0.75, w: -0.85, l: -0.55, lean: -10, drop: 7 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('brace');
    if (s.every(6, 4, 40)) { s.parts(mfMuzzle(s, 40).x, mfMuzzle(s, 40).y, '#88ff88', 3); s.shake(2); }
    if (s.at(44)) { s.sfx('hitBlunt'); s.shake(10); s.vars.fired = s.t; s.vars.from = mfMuzzle(s, 40); }
    if (s.at(56)) {
      s.vpose('spread');
      s.kill({ color: '#44ff44', ring: 170, flash: '#c8ffc0', a: 0.35, sfx: 'explosion' });
      s.ring(s.qx(), s.qy(), 220, '#88ff88', 26);
      s.pop(s.qx(), s.qy() - 46, 'SPLOOSH!', '#66ff66');
    }
    s.fly('v', 6, -7, 0.4, 56);
    if (s.t > 56) s.vrot = -(s.t - 56) * 0.12;
    if (s.t < 44) s.cam(1.6, s.ax() + s.f * 40, s.ay() - 10); else s.camMid(1.2);
  },
  draw(s, ctx) {
    let x, y, r;
    if (s.t < 44) {
      const m = mfMuzzle(s, 40);
      x = m.x; y = m.y; r = 3 + s.u(0, 40, 'in') * 24;
    } else if (s.t < 56) {
      const u = s.u(44, 56, 'in'), m = s.vars.from;
      x = m.x + (s.qx() - m.x) * u; y = m.y + (s.qy() - m.y) * u; r = 27;
    } else return;
    ctx.save();
    ctx.fillStyle = '#5ee04a'; ctx.strokeStyle = '#1d6d14'; ctx.lineWidth = 2; ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, r, 0, MS_TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, MS_TAU); ctx.fill();
    ctx.restore();
  },
  exit: [5, -3],
});

// ═════════════════════════════════════════════════════════════════════════════
// FLAMETHROWER
// ═════════════════════════════════════════════════════════════════════════════
function mfFlames(ctx, s, x, y, h, w, k, n) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (n || 7); i++) {
    const ph = s.t * 0.4 + i * 1.3, fx = x + (i - (n || 7) / 2) * w / (n || 7);
    const fh = h * (0.55 + 0.45 * Math.sin(ph)) * k;
    const g = ctx.createLinearGradient(fx, y, fx, y - fh);
    g.addColorStop(0, 'rgba(255,90,0,0.85)'); g.addColorStop(0.6, 'rgba(255,180,40,0.55)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(fx - 9, y); ctx.quadraticCurveTo(fx + Math.sin(ph) * 8, y - fh * 0.6, fx, y - fh); ctx.quadraticCurveTo(fx + 4, y - fh * 0.4, fx + 9, y);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

mfDefine('flamethrower:q', {
  name: 'NAPALM BLOOM', color: '#ff7700', len: 108,
  me: [
    { t: 0,  ...MS_AIM, r: -0.35, w: -0.5, lean: -8, drop: 8, fr: 14, fl: -14 },
    { t: 10, e: 'out', ...MS_AIM, lean: 8, drop: 9, fr: 14, fl: -14 },
    { t: 14, e: 'snap', ...MS_AIM, r: -0.45, w: -0.6, lean: -8, drop: 8, fr: 14, fl: -14 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.at(14)) { s.vars.from = mfMuzzle(s, 34); s.sfx('swing'); }
    if (s.at(32)) { s.star(s.qx(), s.qy(), false, '#ff9933'); s.vpose('fold'); s.sfx('explosion'); s.shake(8); s.vars.bloom = s.t; }
    if (s.in(32, 72) && s.t % 3 === 0) s.parts(s.qx() + (Math.random() - 0.5) * 30, s.qy() + 10, '#ff8800', 3);
    if (s.at(50)) s.vpose('kneel');
    if (s.at(72)) { s.vars.pillar = s.t; s.vpose('arch', { air: false, drop: 10 }); s.kill({ color: '#ff7700', ring: 140, flash: '#ffb060', sfx: 'explosion' }); }
    if (s.at(84)) s.vpose('slump');
    if (s.t < 32) s.camMid(1.3); else s.camV(1.5);
  },
  draw(s, ctx) {
    if (s.vars.from && s.t < 32) {
      const u = s.u(14, 32, 'lin'), m = s.vars.from;
      const x = m.x + (s.qx() - m.x) * u, y = m.y + (s.qy() - m.y) * u - Math.sin(u * MS_PI) * 70;
      ctx.save(); ctx.fillStyle = '#ffaa33'; ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, MS_TAU); ctx.fill(); ctx.restore();
    }
    if (s.vars.bloom) {
      const k = s.t < 72 ? s.u(32, 46, 'out') : 1 - s.u(84, 104);
      mfFlames(ctx, s, s.qx(), s.gy, 46, 50, k, 7);
    }
    if (s.vars.pillar) mfFlames(ctx, s, s.qx(), s.gy, 170 * (1 - s.u(72, 100, 'in')), 40, 1 - s.u(88, 104), 5);
  },
  exit: [0, 0],
});

mfDefine('flamethrower:e', {
  name: 'BACKDRAFT INFERNO', color: '#ff5500', len: 104,
  me: [
    { t: 0,  r: -0.2, rl: 1.05, w: -0.1, l: 0.1, ll: 0.8, lean: -4, air: true, lg: 1.4, lgl: 1.7, ls: 0.9, lsl: 0.9, rot: -0.1 },
    { t: 10, e: 'out', ...MS_AIM, lean: 10, drop: 11, fr: 15, fl: -15 },
    { t: 58, e: 'lin', ...MS_AIM, lean: 12, drop: 12, fr: 17, fl: -15 },
    { t: 62, e: 'snap', r: -0.55, rl: 1.05, w: -0.4, l: -0.35, ll: 0.8, lean: -12, air: true, lg: 0.9, lgl: 1.3, ls: 0.85, lsl: 0.8, rot: -0.35 },
    { t: 80, e: 'out', ...MS_STAND, drop: 8, fr: 14, fl: -14 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('brace');
    s.go('m', null, 0, 0, 10, 'in');
    s.go('v', Math.max(90, Math.min(170, s.v0x)), s.vfloor, 0, 12, 'out');
    if (s.in(12, 60)) {
      s.vx += 0.5;
      if (s.t % 4 === 0) s.parts(s.qx(), s.qy(), '#ff8800', 4);
      if (s.t % 10 === 0) { s.sfx('explosion'); s.shake(5); }
      if (s.t === 30) s.vpose('arch', { air: false, drop: 6 });
    }
    if (s.at(62)) {
      s.vpose('spread');
      s.kill({ color: '#ff5500', ring: 190, flash: '#ffb060', a: 0.4, sfx: 'explosion' });
      s.ring(s.qx(), s.qy(), 260, '#ffcc66', 28);
    }
    s.go('m', -50, -16, 62, 72, 'out');
    s.go('m', null, 0, 72, 80, 'in');
    s.fly('v', 9, -7, 0.4, 62);
    if (s.t > 62) s.vrot = -(s.t - 62) * 0.15;
    s.camMid(s.t < 62 ? 1.25 : 1.1);
  },
  draw(s, ctx) {
    if (s.t < 10 || s.t > 66) return;
    // The cone of fire from the nozzle to them, collapsing into the blast.
    const m = mfMuzzle(s, 34);
    const k = s.t < 58 ? s.u(10, 20, 'out') : 1 - s.u(58, 66);
    const tx = s.qx() + s.f * 30, spread = 50 * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(m.x, m.y, tx, s.qy());
    g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.4, 'rgba(255,140,30,0.7)'); g.addColorStop(1, 'rgba(255,60,0,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - 4);
    ctx.quadraticCurveTo((m.x + tx) / 2, s.qy() - spread - Math.sin(s.t) * 6, tx, s.qy() - spread);
    ctx.lineTo(tx, s.qy() + spread * 0.7);
    ctx.quadraticCurveTo((m.x + tx) / 2, s.qy() + spread * 0.6 + Math.sin(s.t * 1.3) * 6, m.x, m.y + 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  exit: [6, -3],
});

// ═════════════════════════════════════════════════════════════════════════════
// BOW
// ═════════════════════════════════════════════════════════════════════════════
const MF_BOW_DRAW = { r: -0.04, rl: 1.12, w: -0.04, l: 3.2, ll: 0.55, lean: -2, drop: 5, fr: 10, fl: -11 };
const MF_BOW_LOOSE = { r: -0.06, rl: 1.12, w: -0.06, l: 2.55, ll: 0.95, lean: -3, drop: 5, fr: 10, fl: -11 };

// Triple Shot pins them where they stand, and the fourth, fully drawn, finishes it.
mfDefine('bow:q', {
  name: 'PINNED', color: '#aad47a', len: 104,
  me: [
    { t: 0,  ...MF_BOW_LOOSE },
    { t: 12, e: 'io', ...MF_BOW_DRAW }, { t: 14, e: 'snap', ...MF_BOW_LOOSE },
    { t: 22, e: 'io', ...MF_BOW_DRAW }, { t: 24, e: 'snap', ...MF_BOW_LOOSE },
    { t: 32, e: 'io', ...MF_BOW_DRAW }, { t: 34, e: 'snap', ...MF_BOW_LOOSE },
    { t: 60, e: 'in', ...MF_BOW_DRAW, ll: 0.4, lean: -5 },
    { t: 63, e: 'snap', ...MF_BOW_LOOSE },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.stuck = []; },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    const pins = [[14, -6, -14], [24, -8, 2], [34, -4, 16]];
    for (const [at, dx, dy] of pins) {
      if (!s.at(at)) continue;
      const m = mfMuzzle(s, 24, -12);
      s.streak(m.x, m.y, s.qx() + s.f * dx, s.qy() + dy, '#e8ffd0', 8, 3);
      s.vars.stuck.push([dx, dy]);
      s.star(s.qx() + s.f * dx, s.qy() + dy, false, '#aad47a');
      s.sfx('hitPierce'); s.shake(6);
      s.vpose('spread', { air: false, drop: 2 });
    }
    if (s.at(63)) {
      const m = mfMuzzle(s, 24, -12);
      s.streak(m.x, m.y, s.qx() + s.f * 60, s.qy() - 2, '#ffffff', 16, 6);
      s.vars.stuck.push([0, -2]);
      s.kill({ color: '#aad47a', sfx: 'hitPierce' });
    }
    if (s.at(72)) s.vpose('kneel');
    if (s.at(88)) s.vpose('slump');
    if (s.t < 14) s.camMe(1.55); else if (s.t < 40) s.camV(1.5); else if (s.t < 63) s.camMe(1.6); else s.camV(1.6);
  },
  draw(s, ctx) { for (const [dx, dy] of s.vars.stuck) mfStuck(ctx, s, dx, dy, 0.05, 22, '#c8e6a0'); },
  exit: [0, 0],
});

// Arrow Rain on one target, and then the last arrow, from straight above.
mfDefine('bow:e', {
  name: 'RAIN OF RUIN', color: '#ffee44', len: 108,
  me: [
    { t: 0,  r: -0.45, rl: 1.12, w: -0.45, l: 3.0, ll: 0.55, lean: -6, drop: 7, fr: 12, fl: -13 },
    { t: 10, e: 'out', r: -1.05, rl: 1.12, w: -1.05, l: 2.4, ll: 0.95, lean: -9, drop: 8, fr: 12, fl: -13 },
    { t: 60, e: 'lin', r: -1.05, rl: 1.12, w: -1.05, l: 2.4, ll: 0.95, lean: -9, drop: 8, fr: 12, fl: -13 },
    { t: 108, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.stuck = []; },
  tick(s) {
    if (s.at(0)) s.vpose('brace', { r: -1.8, l: -1.5 });
    if (s.every(3, 30, 64)) {
      const dx = (Math.random() - 0.5) * 50;
      s.streak(s.qx() + dx - s.f * 30, s.qy() - 260, s.qx() + dx, s.qy() - 10 + Math.random() * 24, '#fff6b0', 7, 2);
      if (Math.abs(dx) < 18 && s.vars.stuck.length < 7) s.vars.stuck.push([dx * 0.5, -16 + Math.random() * 30]);
      if (s.t % 6 === 0) s.sfx('hitPierce');
      s.shake(2);
    }
    if (s.at(44)) s.vpose('kneel', { r: -1.9, l: -1.6 });
    if (s.at(72)) {
      s.streak(s.qx(), s.qy() - 420, s.qx(), s.qy(), '#ffffff', 18, 7);
      s.vars.stuck.push([0, -30, true]);
      s.vpose('slump', { lean: 24, rot: 0.6 });
      s.kill({ color: '#ffee44', ring: 150, sfx: 'hitPierce' });
    }
    if (s.t < 18) s.camMe(1.45); else s.cam(1.25, s.qx(), s.qy() - 50);
  },
  draw(s, ctx) {
    if (s.t >= 18 && s.t < 90) {
      const k = s.t < 72 ? s.u(18, 34) : 1 - s.u(72, 90);
      ctx.save(); ctx.globalAlpha = 0.3 * k; ctx.fillStyle = '#10101c';
      ctx.fillRect(s.qx() - 900, s.qy() - 900, 1800, 860); ctx.restore();
    }
    for (const [dx, dy, top] of s.vars.stuck) mfStuck(ctx, s, dx, dy, top ? MS_PI / 2 : 1.35, top ? 28 : 18, '#e8dca0');
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// SLINGSHOT
// ═════════════════════════════════════════════════════════════════════════════
// Mortar Stone, the long way round: up out of the shot, and down on their head.
mfDefine('slingshot:q', {
  name: 'MORTAR DROP', color: '#ff9933', len: 104,
  me: [
    { t: 0,  r: -0.92, rl: 1.12, w: -0.97, l: -0.6, ll: 1.0, lean: 2, drop: 5, fr: 10, fl: -11 },
    { t: 10, e: 'io', r: -1.2, rl: 1.12, w: -1.25, l: 2.4, ll: 0.6, lean: -8, drop: 7, fr: 10, fl: -11 },
    { t: 13, e: 'snap', r: -1.2, rl: 1.12, w: -1.25, l: -0.6, ll: 1.0, lean: 2, drop: 5, fr: 10, fl: -11 },
    { t: 60, e: 'lin', r: -1.2, rl: 1.12, w: -1.25, l: -0.6, ll: 1.0, lean: 2, drop: 5, fr: 10, fl: -11 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.at(13)) { s.sfx('swing'); s.vars.from = mfMuzzle(s, 20, -24); }
    if (s.at(44)) { s.vpose('brace', { r: -1.6, l: -1.9 }); s.pop(s.qx(), s.qy() - 50, '?', '#ffffff'); }
    if (s.at(58)) {
      s.vpose('crumple', { drop: 22 });
      s.kill({ color: '#ff9933', y: s.qy() - 24, sfx: 'hitBlunt' });
      s.pop(s.qx(), s.qy() - 46, 'BONK!', '#ff9933');
      s.vars.dust = s.t;
    }
    if (s.at(80)) s.vpose('slump');
    if (s.t < 13) s.camMe(1.5);
    else if (s.t < 40) s.cam(1.05, (s.ax() + s.qx()) / 2, s.ay() - 140 * s.u(13, 30, 'out'));
    else s.cam(1.45, s.qx(), s.qy() - 30 * (1 - s.u(40, 58)));
  },
  draw(s, ctx) {
    if (s.vars.from && s.t < 58) {
      const u = s.u(13, 58, 'lin'), m = s.vars.from;
      const x = m.x + (s.qx() - m.x) * u, y = m.y + (s.qy() - 30 - m.y) * u - Math.sin(u * MS_PI) * 300;
      ctx.save(); ctx.fillStyle = '#8a7058'; ctx.strokeStyle = '#ffcc88'; ctx.lineWidth = 1.5; ctx.shadowColor = '#ff9933'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, MS_TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      if (s.t > 40) {
        const k = s.u(40, 58);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.35 * k; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(s.qx(), s.gy, 6 + 10 * k, 3, 0, 0, MS_TAU); ctx.fill(); ctx.restore();
      }
    }
  },
  exit: [0, 0],
});

// Gravity Stone made a well: it hangs over them, pulls them up into it, and
// falls with them under it.
mfDefine('slingshot:e', {
  name: 'SINGULARITY STONE', color: '#ff9933', len: 108,
  me: [
    { t: 0,  r: -0.3 - MS_TAU * 2, w: -0.4 - MS_TAU * 2, l: 2.2, lean: 12, drop: 6, fr: 16, fl: -12 },
    { t: 16, e: 'out', r: -1.5 - MS_TAU * 2, rl: 1.15, w: -1.57 - MS_TAU * 2, l: -1.3, lean: -4, drop: 0, fr: 9, fl: -9 },
    { t: 62, e: 'lin', r: -1.55 - MS_TAU * 2, rl: 1.15, w: -1.57 - MS_TAU * 2, l: -1.35, lean: -5, drop: 0, fr: 9, fl: -9 },
    { t: 68, e: 'snap', r: 1.1 - MS_TAU * 2, w: 1.3 - MS_TAU * 2, l: 1.4, lean: 12, drop: 12, fr: 14, fl: -14 },
    { t: 108, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU * 2, w: 0.75 - MS_TAU * 2 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    s.go('v', null, -70, 18, 60, 'io');
    if (s.at(18)) s.vpose('hang');
    if (s.in(18, 66)) { s.vrot = Math.sin(s.t * 0.3) * 0.5; if (s.t % 4 === 0) s.parts(s.qx() + (Math.random() - 0.5) * 120, s.qy() + 40, '#ffcc88', 2); }
    if (s.at(64)) { s.vrot = 0; s.vpose('spread'); }
    s.go('v', null, s.vfloor, 64, 69, 'in3');
    if (s.at(69)) {
      s.vpose('crumple', { drop: 28 });
      s.kill({ color: '#ff9933', y: s.gy - 8, ring: 180, sfx: 'hitBlunt' });
      s.vars.crack = s.t;
    }
    s.cam(1.2, s.qx(), s.qy() - 50);
  },
  draw(s, ctx) {
    const sx = s.qx(), top = s.qy() - 50;
    if (s.t < 69) {
      const sy = s.t < 64 ? top - 40 + Math.sin(s.t * 0.15) * 3 : top - 40 + (s.qy() - top) * s.u(64, 69, 'in3');
      const r = 26;
      // The well: rings drawn in toward the stone.
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const ph = ((s.t * 0.04 + i / 4) % 1);
        ctx.globalAlpha = 0.5 * (1 - ph); ctx.strokeStyle = '#ffcc88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, r + (1 - ph) * 90, 0, MS_TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#5a4636'; ctx.strokeStyle = '#ff9933'; ctx.lineWidth = 2; ctx.shadowColor = '#ff9933'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, MS_TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else {
      ctx.save(); ctx.fillStyle = '#5a4636'; ctx.strokeStyle = '#ff9933'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, s.gy - 22, 26, MS_PI, MS_TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      mfCracks(ctx, s, sx, 1 - (s.t - s.vars.crack) / 40, '#ffcc88', 100);
    }
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// PAPER AIRPLANE
// ═════════════════════════════════════════════════════════════════════════════
function mfPlane(ctx, x, y, a, sz, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = color || '#e8f0ff'; ctx.strokeStyle = '#7a90c0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz, -sz * 0.6); ctx.lineTo(-sz * 0.55, 0); ctx.lineTo(-sz, sz * 0.6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

mfDefine('paperairplane:q', {
  name: 'PAPER CUTS', color: '#aaccff', len: 100,
  me: [
    { t: 0,  r: -0.4, w: -0.4, l: 1.2, lean: 4, drop: 3, fr: 11, fl: -11 },
    { t: 10, e: 'out', r: -1.4, rl: 1.1, w: -1.4, l: 1.3, lean: -2, drop: 2, fr: 9, fl: -9 },
    { t: 58, e: 'lin', r: -1.45, rl: 1.1, w: -1.45, l: 1.3, lean: -2, drop: 2, fr: 9, fl: -9 },
    { t: 64, e: 'snap', r: 0.1, rl: 1.15, w: 0.1, l: 2.2, lean: 12, drop: 6, fr: 15, fl: -12 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.every(6, 14, 58)) {
      const a = s.t * 0.7;
      s.streak(s.qx() + Math.cos(a) * 60, s.qy() + Math.sin(a) * 30, s.qx() - Math.cos(a) * 30, s.qy() - Math.sin(a) * 15, '#e8f0ff', 8, 3);
      MoveScene.fx.push({ kind: 'star', x: s.qx(), y: s.qy() + Math.sin(a) * 10, r: 16, color: '#aaccff', life: 6, max: 6, a });
      s.sfx('hit');
      s.vpose(s.t % 12 < 6 ? 'reel' : 'fold');
    }
    if (s.in(14, 64)) s.vrot = Math.sin(s.t * 0.2) * 0.25;
    if (s.at(64)) { s.vrot = 0; s.vpose('arch', { air: false, drop: 6 }); s.kill({ color: '#aaccff', a: 0.25, sfx: 'hitSnap' }); }
    if (s.at(76)) s.vpose('kneel');
    if (s.at(88)) s.vpose('slump');
    s.camV(1.45);
  },
  draw(s, ctx) {
    if (s.t > 66) return;
    // The swarm, tightening round them, all diving in on the last frame.
    const k = s.u(4, 64, 'in');
    for (let i = 0; i < 8; i++) {
      const a = s.t * 0.12 + i * MS_TAU / 8;
      const R = 90 - 60 * k;
      const x = s.qx() + Math.cos(a) * R, y = s.qy() - 10 + Math.sin(a) * R * 0.45;
      mfPlane(ctx, x, y, a + MS_PI / 2, 8);
    }
  },
  exit: [0, 0],
});

mfDefine('paperairplane:e', {
  name: 'SKY DELIVERY', color: '#aaccff', len: 104, noFloor: true,
  me: [
    { t: 0,  r: -1.25, w: -1.3, l: -1.9, lean: -6, drop: -2, fr: 6, fl: -6 },
    { t: 30, e: 'io', r: -1.5, rl: 1.1, w: -1.5, l: 1.3, lean: -2, drop: 0, fr: 8, fl: -8 },
    { t: 60, e: 'io', r: -1.2, rl: 1.1, w: -1.3, l: -1.4, lean: -4, drop: 0, fr: 8, fl: -8 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.at(30)) s.vpose('brace');
    if (s.at(44)) {
      s.vpose('spread');
      s.kill({ color: '#aaccff', hold: 8, sfx: 'hitBlunt' });
      s.pop(s.qx(), s.qy() - 40, 'SPECIAL DELIVERY', '#e8f0ff');
    }
    if (s.t >= 44) {
      const u = s.u(44, 104, 'in');
      s.vx = s.vars.gx + u * 620; s.vy = s.vfloor - 20 - u * 380;
      s.vrot = -0.3;
    }
    if (s.at(43)) s.vars.gx = s.vx;
    if (s.t < 44) s.camMid(1.2); else s.cam(1.1 - 0.15 * s.u(44, 80), (s.ax() + s.qx()) / 2, (s.ay() + s.qy()) / 2);
  },
  draw(s, ctx) {
    // The big one: comes in low behind the thrower, scoops them, climbs away.
    let x, y, a;
    if (s.t < 44) {
      const u = s.u(10, 44, 'in');
      if (s.t < 10) return;
      x = s.wx(-260 + (s.vx + 260) * u); y = s.gy - 30 - Math.sin(u * MS_PI) * 40; a = s.f > 0 ? 0 : MS_PI;
    } else {
      x = s.qx() + s.f * 6; y = s.qy() + 22; a = s.f > 0 ? -0.55 : MS_PI + 0.55;
    }
    mfPlane(ctx, x, y, a, 46, '#f4f8ff');
  },
  exit: [6, -10],
});

// ═════════════════════════════════════════════════════════════════════════════
// BOOMERANG
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('boomerang:q', {
  name: 'TIGHT ORBIT', color: '#cc9944', len: 100,
  me: [
    { t: 0,  r: 0.15, w: 0.3, l: 2.4, lean: 11, drop: 5, fr: 16, fl: -12, hide: true },
    { t: 12, e: 'io', ...MS_STAND, r: 0.4, hide: true },
    { t: 70, e: 'lin', r: 0.2, rl: 1.1, w: -1.0, l: 1.6, lean: 2, drop: 3, fr: 10, fl: -10, hide: true },
    { t: 74, e: 'snap', r: 0.5, rl: 0.9, w: -1.3, l: 1.4, lean: -6, drop: 7, fr: 12, fl: -12 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.every(10, 10, 58)) { s.star(s.qx(), s.qy() - 6, false, '#e8c070'); s.sfx('hitSnap'); s.vpose(s.t % 20 < 10 ? 'reel' : 'fold'); s.shake(4); }
    if (s.at(60)) { s.vpose('spread', { air: false }); s.kill({ color: '#cc9944', sfx: 'hitSnap' }); }
    if (s.at(74)) { s.sfx('clang'); s.parts(s.ax() + s.f * 16, s.ay() - 8, '#cc9944', 8); }
    if (s.at(70)) s.vpose('kneel');
    if (s.at(86)) s.vpose('slump');
    s.camMid(1.35);
  },
  draw(s, ctx) {
    if (s.t >= 74) return;
    let x, y;
    if (s.t < 60) {
      const k = s.u(0, 60, 'in'), a = s.t * 0.42;
      const R = 70 - 44 * k;
      x = s.qx() + Math.cos(a) * R; y = s.qy() - 6 + Math.sin(a) * R * 0.4;
    } else {
      const u = s.u(60, 74, 'io');
      x = s.qx() + (s.ax() + s.f * 16 - s.qx()) * u; y = s.qy() - 6 + (s.ay() - 8 - s.qy() + 6) * u - Math.sin(u * MS_PI) * 30;
    }
    s.prop(x, y, s.t * 0.9);
    void ctx;
  },
  exit: [0, 0],
});

mfDefine('boomerang:e', {
  name: 'RETURN FLIGHT', color: '#cc9944', len: 104,
  me: [
    { t: 0,  r: -0.9 - MS_TAU, w: -0.8 - MS_TAU, l: -2.0, lean: 8, drop: 3, fr: 15, fl: -12, hide: true },
    { t: 14, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU, w: 0.75 - MS_TAU, hide: true },
    { t: 64, e: 'lin', r: 0.3 - MS_TAU, rl: 1.1, w: -1.0 - MS_TAU, l: 1.5, lean: 0, drop: 3, fr: 10, fl: -10, hide: true },
    { t: 68, e: 'snap', r: 0.6 - MS_TAU, rl: 0.9, w: -1.3 - MS_TAU, l: 1.3, lean: -8, drop: 8, fr: 13, fl: -12 },
    { t: 104, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU, w: 0.75 - MS_TAU },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    s.go('v', Math.max(100, Math.min(200, s.v0x)), s.vfloor, 0, 10, 'out');
    // A figure eight through them: front, behind, front again.
    for (const at of [16, 36]) if (s.at(at)) { s.star(s.qx(), s.qy() - 4, false, '#e8c070'); s.sfx('hitSnap'); s.shake(6); s.vpose(at === 16 ? 'reel' : 'fold'); }
    if (s.at(54)) { s.vpose('spread', { air: false }); s.kill({ color: '#cc9944', sfx: 'hitSnap' }); }
    if (s.at(68)) { s.sfx('clang'); s.parts(s.ax() + s.f * 16, s.ay() - 8, '#cc9944', 8); }
    if (s.at(70)) s.vpose('kneel');
    if (s.at(86)) s.vpose('slump');
    s.camMid(1.3);
  },
  draw(s, ctx) {
    if (s.t >= 68) return;
    // Lemniscate between the hand and a point past them, crossing at the victim.
    const u = s.u(2, 68, 'lin'), a = u * MS_TAU - MS_PI / 2;
    const hx = s.ax() + s.f * 16, cx = s.qx(), d = cx - hx;
    const den = 1 + Math.sin(a) * Math.sin(a);
    const lx = Math.cos(a) / den, ly = Math.sin(a) * Math.cos(a) / den;
    s.prop(cx + lx * Math.abs(d) * s.f * -1 * 1.0 + 0, s.qy() - 6 + ly * 90, s.t * 0.9);
    void ctx;
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// ELECTRIC STAFF
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('electricstaff:q', {
  name: 'OVERLOAD', color: '#00eeff', len: 104,
  me: [
    { t: 0,  r: 0.05, rl: 1.15, w: 0.0, l: 0.15, ll: 0.8, lean: 14, drop: 6, fr: 18, fl: -14 },
    { t: 60, e: 'lin', r: -0.2, rl: 1.15, w: -0.25, l: 0.0, ll: 0.8, lean: 10, drop: 8, fr: 18, fl: -14 },
    { t: 66, e: 'snap', r: -0.5, rl: 1.15, w: -0.6, l: -0.3, ll: 0.8, lean: -8, drop: 6, fr: 16, fl: -14 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('arch', { air: false });
    s.go('v', null, -40, 6, 40, 'io');
    if (s.in(6, 64)) {
      s.vrot = (Math.random() - 0.5) * 0.4;
      if (s.t % 3 === 0) s.vpose(s.t % 6 ? 'spread' : 'arch', { air: true });
      if (s.t % 5 === 0) { s.parts(s.qx(), s.qy(), '#aaeeff', 3); s.shake(3); }
      if (s.t % 8 === 0) s.sfx('hitZap');
    }
    if (s.at(64)) {
      s.vrot = 0; s.vpose('limp');
      s.kill({ color: '#00eeff', flash: '#bff8ff', a: 0.45, sfx: 'hitZap', ring: 160 });
      s.invert(3);
    }
    s.go('v', null, s.vfloor, 66, 76, 'in');
    if (s.at(76)) s.vpose('slump');
    if (s.in(76, 104) && s.t % 4 === 0) s.parts(s.qx(), s.qy() - 20, '#666666', 1);
    s.camMid(1.35);
  },
  draw(s, ctx) {
    if (s.t < 2 || s.t > 64) return;
    const m = mfMuzzle(s, 44, -10);
    _finLightning(ctx, m.x, m.y, s.qx(), s.qy(), '#aaf6ff', 2.5, 9);
    if (s.t % 2 === 0) _finLightning(ctx, m.x, m.y, s.qx(), s.qy() - 10, '#ffffff', 1.2, 7);
  },
  exit: [0, 0],
});

mfDefine('electricstaff:e', {
  name: 'JUDGMENT BOLT', color: '#00eeff', len: 108,
  me: [
    { t: 0,  r: -1.52, rl: 1.15, w: -1.57, l: -1.82, ll: 0.9, lean: -4, drop: -2, fr: 9, fl: -9 },
    { t: 46, e: 'lin', r: -1.55, rl: 1.15, w: -1.57, l: -1.85, ll: 0.9, lean: -5, drop: -2, fr: 9, fl: -9 },
    { t: 52, e: 'snap', r: 0.9, rl: 1.1, w: 1.1, l: 1.4, lean: 10, drop: 12, fr: 13, fl: -13 },
    { t: 108, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('brace', { r: -1.8, l: -1.5 });
    if (s.every(5, 14, 44)) s.bolt(s.qx() + (Math.random() - 0.5) * 220, s.gy);
    if (s.at(30)) s.vpose('kneel', { r: -1.9, l: -1.6 });
    if (s.at(50)) {
      s.vars.beam = s.t;
      s.vpose('arch', { air: false, drop: 8 });
      s.kill({ color: '#00eeff', flash: '#ffffff', a: 0.6, hold: 12, ring: 200, sfx: 'hitZap' });
      s.invert(5);
    }
    if (s.at(70)) s.vpose('kneel');
    if (s.at(86)) s.vpose('slump');
    if (s.in(56, 108) && s.t % 4 === 0) s.parts(s.qx(), s.qy() - 20, '#555555', 1);
    if (s.t < 50) s.cam(1.15, (s.ax() + s.qx()) / 2, s.ay() - 60); else s.camV(1.45);
  },
  draw(s, ctx) {
    if (s.t < 70) {
      const k = s.t < 50 ? s.u(4, 30) : 1 - s.u(50, 70);
      ctx.save(); ctx.globalAlpha = 0.4 * k; ctx.fillStyle = '#0a1020';
      ctx.fillRect(s.qx() - 900, s.qy() - 900, 1800, 900); ctx.restore();
    }
    if (s.vars.beam && s.t < s.vars.beam + 20) {
      const k = 1 - (s.t - s.vars.beam) / 20, x = s.qx();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
      g.addColorStop(0, 'rgba(0,238,255,0)'); g.addColorStop(0.5, `rgba(220,255,255,${0.9 * k})`); g.addColorStop(1, 'rgba(0,238,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 40 * k - 8, s.gy - 900, 80 * k + 16, 900);
      ctx.restore();
      _finLightning(ctx, x, s.gy - 600, x, s.gy, '#ffffff', 4 * k + 1, 14);
    }
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// BOMB
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('bomb:e', {
  name: 'BIG BADDA BOOM', color: '#ff8a3d', len: 108, noFloor: true,
  me: [
    { t: 0,  r: -0.5, rl: 1.1, w: -0.5, l: -0.3, ll: 1.05, lean: 12, drop: 4, fr: 16, fl: -12, hide: true },
    { t: 14, e: 'io', ...MS_STAND, hide: true },
    { t: 46, e: 'lin', ...MS_STAND, hide: true },
    { t: 52, e: 'out', r: -1.9, rl: 0.8, w: -1.9, l: -2.1, ll: 0.8, lean: -12, drop: 10, fr: 6, fl: -16, hide: true },
    { t: 108, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.at(18)) { s.vpose('fold', { lean: 16 }); s.pop(s.qx(), s.qy() - 46, '!?', '#ffffff'); }
    if (s.at(22)) s.pop(s.wx(s.v0x - 14), s.gy - 30, '3', '#ffcc66');
    if (s.at(32)) s.pop(s.wx(s.v0x - 14), s.gy - 30, '2', '#ff9944');
    if (s.at(42)) s.pop(s.wx(s.v0x - 14), s.gy - 30, '1', '#ff5522');
    if (s.at(42)) s.vpose('brace');
    if (s.in(16, 54) && s.t % 2 === 0) s.parts(s.wx(s.v0x - 14), s.gy - 18, '#ffee88', 1);
    if (s.at(54)) {
      s.vpose('spread');
      s.kill({ color: '#ff8a3d', flash: '#ffd0a0', a: 0.5, hold: 10, ring: 220, sfx: 'explosion' });
      s.ring(s.qx(), s.gy - 10, 300, '#ffcc66', 30);
      s.ring(s.qx(), s.gy - 10, 160, '#ffffff', 16);
      s.pop(s.qx(), s.qy() - 50, 'KA-BOOM!', '#ff8a3d');
      s.vars.boom = s.t;
    }
    s.fly('v', 4, -15, 0.32, 54);
    if (s.t > 54) s.vrot = -(s.t - 54) * 0.2;
    if (s.t < 54) s.cam(1.5, s.wx(s.v0x - 6), s.gy - 30); else s.cam(1.0, (s.ax() + s.qx()) / 2, s.ay() - 80);
  },
  draw(s, ctx) {
    if (!s.vars.boom) {
      // The bomb skids in and sits at their feet, fuse burning.
      const u = s.u(0, 16, 'out');
      const x = s.wx(s.v0x - 60 + 46 * u), y = s.gy - 10 - Math.abs(Math.sin(u * MS_PI * 2)) * 16 * (1 - u);
      s.prop(x, y, 0, { key: 'bomb' });
      return;
    }
    const k = (s.t - s.vars.boom) / 30;
    if (k > 1) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(s.wx(s.v0x - 14), s.gy - 20, 4, s.wx(s.v0x - 14), s.gy - 20, 30 + k * 160);
    g.addColorStop(0, `rgba(255,255,220,${1 - k})`); g.addColorStop(0.4, `rgba(255,150,40,${0.8 * (1 - k)})`); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.wx(s.v0x - 14), s.gy - 20, 30 + k * 160, 0, MS_TAU); ctx.fill();
    ctx.restore();
  },
  exit: [3, -6],
});

// ═════════════════════════════════════════════════════════════════════════════
// FRAGMENT
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('fragment:q', {
  name: 'SHATTER BARRAGE', color: '#8fd8ff', len: 100,
  me: [
    { t: 0,  r: 0.0, rl: 1.2, l: 2.0, ll: 0.6, lean: 10, drop: 6, fr: 15, fl: -13 },
    { t: 36, e: 'lin', r: 0.0, rl: 1.2, l: 2.0, ll: 0.6, lean: 10, drop: 6, fr: 15, fl: -13 },
    { t: 42, e: 'out', r: 2.3, rl: 0.6, l: 2.2, ll: 0.6, lean: -6, drop: 10, fr: 13, fl: -14 },
    { t: 46, e: 'snap', r: 0.0, rl: 1.25, l: 0.08, ll: 1.2, lean: 12, drop: 8, fr: 17, fl: -14 },
    { t: 72, e: 'lin', r: 0.0, rl: 1.25, l: 0.08, ll: 1.2, lean: 14, drop: 9, fr: 18, fl: -14 },
    { t: 100, e: 'io', r: 1.3, l: 1.0 },
  ],
  poseMod(s, p) {
    if (s.t < 4 || s.t >= 38) return p;
    const i = Math.floor((s.t - 4) / 4), ph = ((s.t - 4) % 4) / 4;
    const out = ph < 0.35 ? msEase('snap', ph / 0.35) : 1 - (ph - 0.35) / 0.65 * 0.85;
    const lead = i % 2 === 0;
    p.r = lead ? -0.05 : 1.2 - out * 0.4; p.rl = lead ? 0.55 + 0.65 * out : 0.6;
    p.l = lead ? 1.6 : -0.02; p.ll = lead ? 0.6 : 0.55 + 0.65 * out;
    return p;
  },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    mfClose(s, 40, 0, 4);
    if (s.every(4, 5, 38)) {
      const y = s.qy() - 14 + ((s.t * 11) % 26);
      MoveScene.fx.push({ kind: 'star', x: s.qx() - s.f * 8, y, r: 20, color: '#8fd8ff', life: 6, max: 6, a: s.t });
      s.parts(s.qx(), y, '#d8f6ff', 3);
      s.vpose(s.t % 8 < 4 ? 'reel' : 'fold');
      s.vx += 0.6; s.mx += 0.6;
      if (s.t % 8 === 1) s.sfx('hit');
      s.shake(3);
    }
    if (s.at(48)) {
      s.vpose('arch', { air: false, drop: 6 });
      s.kill({ color: '#8fd8ff', flash: '#bfeaff', a: 0.35, sfx: 'hitZap' });
      s.vars.beam = s.t;
    }
    if (s.in(48, 72)) s.vx += 1.6;
    if (s.at(74)) s.vpose('slump');
    s.camMid(s.t < 48 ? 1.55 : 1.3);
  },
  draw(s, ctx) {
    if (!s.vars.beam || s.t > s.vars.beam + 26) return;
    const k = 1 - (s.t - s.vars.beam) / 26;
    const x0 = s.ax() + s.f * 22, y = s.ay() - 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(143,216,255,${0.8 * k})`; ctx.lineWidth = 22 * k + 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + s.f * 700, y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 6 * k + 1;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + s.f * 700, y); ctx.stroke();
    ctx.restore();
  },
  exit: [5, -2],
});

mfDefine('fragment:e', {
  name: 'PRISM BURST', color: '#8fd8ff', len: 100,
  me: [
    { t: 0,  r: -0.75, rl: 1.15, l: -2.4, ll: 1.15, lean: -8, drop: -3, fr: 12, fl: -12 },
    { t: 20, e: 'io', r: 2.2, rl: 0.55, l: 0.9, ll: 0.55, lean: 8, drop: 14, fr: 9, fl: -9 },
    { t: 26, e: 'snap', r: 0.0, rl: 1.25, l: 0.1, ll: 1.2, lean: 12, drop: 6, fr: 16, fl: -13 },
    { t: 48, e: 'lin', r: 0.0, rl: 1.25, l: 0.1, ll: 1.2, lean: 10, drop: 6, fr: 16, fl: -13 },
    { t: 54, e: 'snap', r: -1.3, rl: 0.7, l: 1.2, ll: 0.8, lean: -4, drop: 2, fr: 10, fl: -10 },
    { t: 100, e: 'io', r: 1.3, l: 1.0 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    s.go('v', Math.max(70, Math.min(170, s.v0x)), s.vfloor, 0, 10, 'out');
    if (s.every(2, 28, 40)) { s.sfx('hitPierce'); s.parts(s.qx(), s.qy(), '#d8f6ff', 2); s.vpose(s.t % 4 ? 'reel' : 'fold'); }
    if (s.at(42)) s.vpose('frozen');
    if (s.at(56)) {
      s.vpose('spread', { air: false });
      s.kill({ color: '#8fd8ff', flash: '#e8faff', a: 0.4, ring: 170, sfx: 'hitZap' });
      s.vars.burst = s.t;
    }
    if (s.at(70)) s.vpose('kneel');
    if (s.at(84)) s.vpose('slump');
    s.camMid(1.35);
  },
  draw(s, ctx) {
    const N = 10;
    ctx.save();
    ctx.fillStyle = 'rgba(200,240,255,0.85)'; ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 1.2; ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 10;
    for (let i = 0; i < N; i++) {
      let x, y, a = i * 1.7 + s.t * 0.1;
      if (s.t < 28) {
        const o = s.t * 0.2 + i * MS_TAU / N;
        x = s.ax() + Math.cos(o) * 40; y = s.ay() - 6 + Math.sin(o) * 28;
      } else if (s.t < 56) {
        const u = s.u(28 + i, 30 + i, 'in');
        const o = 28 * 0.2 + i * MS_TAU / N;
        const ex = s.qx() + Math.cos(i * 2.3) * 10, ey = s.qy() + Math.sin(i * 1.9) * 20;
        x = s.ax() + Math.cos(o) * 40 + (ex - s.ax() - Math.cos(o) * 40) * u;
        y = s.ay() - 6 + Math.sin(o) * 28 + (ey - s.ay() + 6 - Math.sin(o) * 28) * u;
        a = u < 1 ? a : i;
      } else {
        const d = (s.t - s.vars.burst) * 7;
        if (d > 200) break;
        const o = i * MS_TAU / N;
        x = s.qx() + Math.cos(o) * d; y = s.qy() + Math.sin(o) * d * 0.7;
        ctx.globalAlpha = Math.max(0, 1 - d / 200);
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// THROWING KNIVES
// ═════════════════════════════════════════════════════════════════════════════
function mfKnife(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#e8eef4'; ctx.strokeStyle = '#6a7480'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(0, -2.5); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a3a44'; ctx.fillRect(-6, -1.5, 6, 3);
  ctx.restore();
}

mfDefine('knives:q', {
  name: 'RECALL: ALL', color: '#c8d0da', len: 100,
  me: [
    { t: 0,  r: 0.0, rl: 1.15, w: -1.4, l: 1.5, lean: 6, drop: 4, fr: 12, fl: -12 },
    { t: 16, e: 'out', r: 0.1, rl: 1.15, w: -1.4, l: 1.5, lean: 4, drop: 4, fr: 12, fl: -12 },
    { t: 22, e: 'snap', r: 2.4, rl: 0.6, w: -1.0, l: 1.5, lean: -8, drop: 8, fr: 12, fl: -12 },
    { t: 48, e: 'lin', r: 2.3, rl: 0.6, w: -1.0, l: 1.5, lean: -6, drop: 8, fr: 12, fl: -12 },
    { t: 100, e: 'io', ...MS_STAND },
  ],
  start(s) {
    s.vars.k = [];
    for (let i = 0; i < 8; i++) {
      const a = i * MS_TAU / 8 + 0.3;
      s.vars.k.push({ ox: Math.cos(a) * (120 + (i % 3) * 30), oy: Math.min(30, Math.sin(a) * 90), at: 22 + i * 3 });
    }
  },
  tick(s) {
    if (s.at(0)) s.vpose('frozen');
    for (const k of s.vars.k) if (s.at(k.at + 6)) {
      s.star(s.qx(), s.qy() - 6, false, '#e8eef4'); s.sfx('hitPierce'); s.shake(4);
      s.vpose(k.at % 2 ? 'reel' : 'fold');
      if (k === s.vars.k[s.vars.k.length - 1]) { s.vpose('spread', { air: false }); s.kill({ color: '#c8d0da', sfx: 'hitPierce' }); }
    }
    if (s.at(70)) s.vpose('kneel');
    if (s.at(86)) s.vpose('slump');
    s.camMid(1.3);
  },
  draw(s, ctx) {
    // Every knife on the ground round them lifts and comes home through them.
    for (const k of s.vars.k) {
      const sx = s.qx() + k.ox * s.f, sy = s.qy() + k.oy;
      const hx = s.ax() + s.f * 12, hy = s.ay() - 6;
      let x, y, a;
      if (s.t < k.at) { x = sx; y = sy - Math.max(0, s.t - 12) * 0.6; a = Math.atan2(s.qy() - sy, s.qx() - sx) + Math.sin(s.t * 0.5) * 0.1; }
      else {
        const u = s.u(k.at, k.at + 12, 'in');
        if (u >= 1) continue;
        // Through the victim on a straight line home.
        const px = u < 0.5 ? sx + (s.qx() - sx) * u * 2 : s.qx() + (hx - s.qx()) * (u - 0.5) * 2;
        const py = u < 0.5 ? sy + (s.qy() - sy) * u * 2 : s.qy() + (hy - s.qy()) * (u - 0.5) * 2;
        x = px; y = py; a = Math.atan2(u < 0.5 ? s.qy() - sy : hy - s.qy(), u < 0.5 ? s.qx() - sx : hx - s.qx());
      }
      mfKnife(ctx, x, y, a);
    }
  },
  exit: [0, 0],
});

mfDefine('knives:e', {
  name: 'FAN OF KNIVES', color: '#c8d0da', len: 100,
  me: [
    { t: 0,  r: -0.3 + MS_TAU, w: -0.3 + MS_TAU, l: 2.4, lean: 12, drop: 5, fr: 16, fl: -12, hide: true },
    { t: 34, e: 'io', r: 2.9 + MS_TAU, w: 3.0 + MS_TAU, l: 0.6, lean: -8, drop: 7, fr: 13, fl: -13, hide: true },
    { t: 40, e: 'snap', r: -0.3 + MS_TAU * 2, w: -0.3 + MS_TAU * 2, l: 2.4, lean: 12, drop: 5, fr: 16, fl: -12, trail: true, hide: true },
    { t: 100, e: 'io', ...MS_STAND, r: 0.95 + MS_TAU * 2, w: 0.75 + MS_TAU * 2 },
  ],
  start(s) { s.vars.pins = []; },
  tick(s) {
    if (s.at(0)) s.vpose('spread', { air: false });
    const pins = [[8, -12, -16], [12, -12, 14], [16, -6, 28], [20, -6, -2], [24, 0, -26]];
    for (const [at, dx, dy] of pins) if (s.at(at)) {
      s.vars.pins.push([dx, dy]); s.sfx('hitPierce'); s.shake(4);
      const m = mfMuzzle(s, 20, -10);
      s.streak(m.x, m.y, s.qx() + s.f * dx, s.qy() + dy, '#e8eef4', 6, 2);
    }
    if (s.at(52)) {
      s.vars.pins.push([0, -22]);
      s.kill({ color: '#c8d0da', y: s.qy() - 22, sfx: 'hitPierce' });
    }
    if (s.at(64)) s.vpose('kneel');
    if (s.at(82)) s.vpose('slump');
    if (s.t < 40) s.camV(1.5); else if (s.t < 52) s.camMid(1.25); else s.camV(1.6);
  },
  draw(s, ctx) {
    for (const [dx, dy] of s.vars.pins) mfStuck(ctx, s, dx, dy, 0.0, 12, '#e8eef4');
    if (s.t >= 40 && s.t < 52) {
      const u = s.u(40, 52, 'lin'), m = mfMuzzle(s, 20, -10);
      mfKnife(ctx, m.x + (s.qx() - m.x) * u, m.y + (s.qy() - 22 - m.y) * u, s.t * 1.1);
    }
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// GLASS BLADE
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('glassblade:q', {
  name: 'MIRROR STEP', color: '#d8f6ff', len: 104,
  me: [
    { t: 0,  ...MS_IAI_CUT },
    { t: 30, e: 'lin', ...MS_IAI_CUT, w: -0.3 },
    { t: 46, e: 'io', ...MS_STAND, r: 1.2, w: 2.6 },
    { t: 104, e: 'lin', ...MS_STAND, r: 1.2, w: 2.6 },
  ],
  start(s) {
    s.vars.already = s.att.facing !== s.f;
    const room = s.span.open ? 1e9 : (s.f > 0 ? s.span.R - s.hx : s.hx - s.span.L) - 30;
    s.vars.past = s.vars.already ? 0 : Math.min(room, s.v0x + 80);
    if (s.vars.already) s.aface = -s.f;
    s.vars.cracks = [];
  },
  tick(s) {
    if (s.at(0)) s.vpose('frozen');
    if (!s.vars.already) {
      s.go('m', s.vars.past, 0, 0, 5, 'snap');
      if (s.at(1)) s.streak(s.ax(), s.ay(), s.wx(s.vars.past), s.ay(), '#ffffff', 22, 6);
      if (s.at(5)) s.aface = s.f;
    }
    s.vface = s.vars.already ? s.f : -s.f;
    if (s.every(4, 10, 56)) {
      const a = Math.random() * MS_TAU;
      s.vars.cracks.push({ a, l: 14 + Math.random() * 22, b: Math.random() * 1.2 - 0.6 });
      s.sfx('hitSnap');
    }
    if (s.at(60)) { s.kill({ color: '#d8f6ff', a: 0.35, sfx: 'clang' }); s.vars.shatter = s.t; s.vpose('spread', { air: false }); }
    if (s.at(68)) s.vpose('kneel');
    if (s.at(84)) s.vpose('slump');
    s.camV(1.6);
  },
  draw(s, ctx) {
    const x = s.qx(), y = s.qy();
    if (!s.vars.shatter) {
      ctx.save();
      ctx.strokeStyle = 'rgba(230,250,255,0.9)'; ctx.lineWidth = 1.4; ctx.shadowColor = '#d8f6ff'; ctx.shadowBlur = 8;
      for (const c of s.vars.cracks) {
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(c.a) * c.l * 0.6, y + Math.sin(c.a) * c.l * 0.6 * 1.4);
        ctx.lineTo(x + Math.cos(c.a + c.b) * c.l, y + Math.sin(c.a + c.b) * c.l * 1.4);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    const d = (s.t - s.vars.shatter);
    if (d > 36) return;
    ctx.save();
    ctx.fillStyle = 'rgba(220,248,255,0.85)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const a = i * 0.35 + 0.2, sp = 3 + (i % 5);
      const px = x + Math.cos(a * 3.1) * sp * d, py = y + Math.sin(a * 3.1) * sp * d * 0.6 + 0.12 * d * d;
      ctx.globalAlpha = 1 - d / 36;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + d * 0.2);
      ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(5, 0); ctx.lineTo(-2, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
  exit: [0, 0],
});

mfDefine('glassblade:e', {
  name: 'CATHEDRAL GLASS', color: '#d8f6ff', len: 104, noFloor: true,
  me: [
    { t: 0,  r: 1.25, rl: 0.95, w: 1.57, l: 1.2, ll: 0.8, lean: 11, drop: 14, fr: 14, fl: -14 },
    { t: 8,  e: 'out', r: -1.7, w: 1.57, l: -1.4, ll: 0.9, lean: -2, drop: -2, fr: 8, fl: -8 },
    { t: 14, e: 'in3', r: 1.25, rl: 0.95, w: 1.57, l: 1.2, ll: 0.8, lean: 12, drop: 15, fr: 14, fl: -14 },
    { t: 84, e: 'lin', r: 1.25, rl: 0.95, w: 1.57, l: 1.2, ll: 0.8, lean: 11, drop: 14, fr: 14, fl: -14 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    s.go('v', Math.max(80, Math.min(170, s.v0x)), s.vfloor, 0, 10, 'out');
    if (s.at(14)) { s.ring(s.ax(), s.gy, 80, '#d8f6ff', 14); s.sfx('clang'); s.shake(8); }
    if (s.every(3, 18, 42)) { s.sfx('hitSnap'); s.shake(3); }
    if (s.at(30)) s.vpose('frozen');
    if (s.at(52)) {
      s.vpose('spread');
      s.kill({ color: '#d8f6ff', a: 0.4, ring: 160, sfx: 'clang' });
      s.vars.shatter = s.t;
    }
    s.fly('v', 1, -10, 0.36, 52);
    if (s.t > 52) s.vrot = -(s.t - 52) * 0.12;
    s.cam(1.3, s.qx(), s.gy - 70);
  },
  draw(s, ctx) {
    // A ring of glass spires round them, rising, leaning in, then breaking upward.
    const N = 9, x0 = s.wx(s.vars.vx0 = s.vars.vx0 || Math.max(80, Math.min(170, s.v0x)));
    ctx.save();
    ctx.shadowColor = '#d8f6ff'; ctx.shadowBlur = 12;
    for (let i = 0; i < N; i++) {
      const at = 18 + i * 2.6;
      if (s.t < at) continue;
      const grow = Math.min(1, (s.t - at) / 6);
      const off = (i - (N - 1) / 2) * 13;
      const lean = s.t < 52 ? -off * 0.02 * s.u(36, 50) : 0;
      let base = s.gy, h = (70 + (4 - Math.abs(i - 4)) * 18) * grow;
      if (s.vars.shatter) {
        const d = s.t - s.vars.shatter;
        if (d > 30) continue;
        ctx.globalAlpha = 1 - d / 30;
        base -= d * (5 + (i % 3));
      }
      const x = x0 + off;
      ctx.fillStyle = 'rgba(200,240,255,0.55)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 6, base); ctx.lineTo(x + Math.sin(lean) * h, base - h); ctx.lineTo(x + 6, base); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },
  exit: [1, -5],
});

// ═════════════════════════════════════════════════════════════════════════════
// ANCHOR
// ═════════════════════════════════════════════════════════════════════════════
function mfChain(ctx, x0, y0, x1, y1, sag) {
  ctx.save();
  ctx.strokeStyle = '#b8c0c8'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + (sag || 0), x1, y1); ctx.stroke();
  ctx.restore();
}

mfDefine('anchor:q', {
  name: 'DEAD WEIGHT', color: '#8a939c', len: 112,
  me: [
    { t: 0,  r: 0.2, rl: 1.1, w: 0.0, l: 0.3, ll: 1.0, lean: 6, drop: 6, fr: 14, fl: -12, hide: true },
    { t: 24, e: 'lin', r: 0.2, rl: 1.1, w: 0.0, l: 0.3, ll: 1.0, lean: 6, drop: 6, fr: 14, fl: -12, hide: true },
    { t: 30, e: 'out', r: 2.6, rl: 0.7, w: 0.0, l: 2.4, ll: 0.7, lean: -14, drop: 12, fr: 18, fl: -10, hide: true },
    { t: 38, e: 'io', r: 0.5, rl: 1.0, w: 0.0, l: 0.6, ll: 1.0, lean: -2, drop: 9, fr: 16, fl: -11, hide: true },
    { t: 46, e: 'out', r: 2.7, rl: 0.65, w: 0.0, l: 2.5, ll: 0.65, lean: -15, drop: 12, fr: 18, fl: -10, hide: true },
    { t: 58, e: 'io', r: 0.4, rl: 1.0, w: 0.0, l: 0.5, ll: 1.0, lean: 0, drop: 8, fr: 14, fl: -12, hide: true },
    { t: 70, e: 'io', r: -2.3, rl: 0.9, w: -2.4, l: -2.0, ll: 0.9, lean: -9, drop: 9, fr: 13, fl: -13, hide: true },
    { t: 76, e: 'snap', r: 1.2, rl: 1.0, w: 1.5, l: 1.3, ll: 0.9, lean: 14, drop: 15, fr: 15, fl: -15, hide: true },
    { t: 112, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.ax = s.vx; },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.at(16)) { s.vpose('crumple', { drop: 24 }); s.star(s.qx(), s.qy() - 6, true, '#b8c0c8'); s.shake(16); s.hold(5); s.sfx('hitBlunt'); s.vars.crack = s.t; }
    // Dragged in on the chain in two hauls.
    s.go('v', Math.max(60, s.v0x * 0.55), null, 30, 38, 'snap');
    s.go('v', 50, null, 46, 54, 'snap');
    if (s.at(30) || s.at(46)) { s.sfx('clang'); s.parts(s.qx(), s.gy, '#8a939c', 8); s.shake(8); }
    if (s.at(58)) s.vpose('kneel');
    if (s.at(76)) {
      s.vpose('crumple', { drop: 30, lean: 18 });
      s.kill({ color: '#b8c0c8', y: s.gy - 10, ring: 170, sfx: 'hitBlunt' });
      s.vars.crack = s.t;
    }
    if (s.t < 30) s.camV(1.35); else s.camMid(1.35);
  },
  draw(s, ctx) {
    const hx = s.ax() + s.f * 14, hy = s.ay() - 4;
    let x, y, a = MS_PI / 2;
    if (s.t < 16) { x = s.qx(); y = s.qy() - 260 + 230 * s.u(0, 16, 'in'); }
    else if (s.t < 58) { x = s.qx() - s.f * 2; y = s.qy() - 22; }
    else if (s.t < 76) {
      // Round over the top on the chain.
      const u = s.u(58, 76, 'io'), ang = -MS_PI / 2 - (1 - u) * 2.4;
      const cx = hx, cy = hy - 10;
      x = cx + Math.cos(ang) * 70 * s.f * (u < 0.5 ? -1 : 1); y = cy + Math.sin(ang) * 70;
      if (u > 0.75) { x = hx + (s.qx() - hx) * ((u - 0.75) / 0.25); y = cy - 70 + (s.qy() - 20 - cy + 70) * ((u - 0.75) / 0.25); }
      a = u * 3;
    } else { x = s.qx(); y = s.gy - 14; }
    mfChain(ctx, hx, hy, x, y, s.t < 58 ? 20 : 0);
    s.prop(x, y, a);
    if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#b8c0c8', 90);
  },
  exit: [0, 0],
});

mfDefine('anchor:e', {
  name: 'KEELHAUL', color: '#8a939c', len: 108,
  me: [
    { t: 0,  r: 1.2, rl: 1.0, w: 1.5, l: 1.3, ll: 0.9, lean: 14, drop: 15, fr: 15, fl: -15, hide: true },
    { t: 8,  e: 'out', r: 0.0, rl: 1.1, w: 0.0, l: 0.1, ll: 1.0, lean: -6, drop: 9, fr: 14, fl: -14, hide: true },
    { t: 44, e: 'lin', r: -MS_TAU * 2, rl: 1.1, w: -MS_TAU * 2, l: 0.1 - MS_TAU * 2, ll: 1.0, lean: -6, drop: 9, fr: 14, fl: -14, hide: true },
    { t: 54, e: 'out', r: -1.6 - MS_TAU * 2, rl: 1.1, w: -1.6 - MS_TAU * 2, l: -1.5 - MS_TAU * 2, ll: 1.0, lean: -8, drop: 4, fr: 12, fl: -12, hide: true },
    { t: 60, e: 'snap', r: 1.2 - MS_TAU * 2, rl: 1.0, w: 1.5 - MS_TAU * 2, l: 1.3 - MS_TAU * 2, ll: 0.9, lean: 14, drop: 15, fr: 15, fl: -15, hide: true },
    { t: 108, e: 'io', ...MS_STAND, r: 0.95 - MS_TAU * 2, w: 0.75 - MS_TAU * 2, l: 1.4 - MS_TAU * 2 },
  ],
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    // The chain wraps them as the anchor goes round; then up, and down.
    s.go('v', 70, s.vfloor, 0, 10, 'out');
    if (s.every(12, 10, 44)) { s.sfx('swing'); s.star(s.qx(), s.qy(), false, '#b8c0c8'); s.vpose(s.t % 24 < 12 ? 'fold' : 'reel'); }
    if (s.at(44)) s.vpose('frozen', { r: 1.7, l: 1.45, rl: 0.6, ll: 0.6 });
    s.go('v', 30, -120, 46, 56, 'out');
    if (s.at(50)) s.vpose('limp');
    s.go('v', 66, s.vfloor, 56, 61, 'in3');
    if (s.at(61)) {
      s.vpose('crumple', { drop: 28 });
      s.kill({ color: '#b8c0c8', y: s.gy - 8, ring: 180, sfx: 'hitBlunt' });
      s.vars.crack = s.t;
    }
    s.cam(1.25, (s.ax() + s.qx()) / 2, s.ay() - 30);
  },
  draw(s, ctx) {
    const hx = s.ax() + s.f * 12, hy = s.ay() - 4;
    let x, y;
    if (s.t < 44) {
      const a = s.t * 0.36;
      x = s.ax() + Math.cos(a) * 95 * s.f; y = s.ay() - 6 + Math.sin(a) * 55;
    } else { x = s.qx(); y = s.t < 61 ? s.qy() + 18 : s.gy - 14; }
    mfChain(ctx, hx, hy, x, y, 0);
    if (s.t >= 14 && s.t < 61) {
      ctx.save(); ctx.strokeStyle = '#b8c0c8'; ctx.lineWidth = 2.5;
      const loops = Math.min(3, Math.floor((s.t - 14) / 10) + 1);
      for (let i = 0; i < loops; i++) { ctx.beginPath(); ctx.ellipse(s.qx(), s.qy() - 12 + i * 10, 14, 4, 0, 0, MS_TAU); ctx.stroke(); }
      ctx.restore();
    }
    s.prop(x, y, s.t * 0.36 + 1.57);
    if (s.vars.crack) mfCracks(ctx, s, s.qx(), 1 - (s.t - s.vars.crack) / 40, '#b8c0c8', 100);
  },
  exit: [0, 0],
});

// ═════════════════════════════════════════════════════════════════════════════
// CROSSBOW
// ═════════════════════════════════════════════════════════════════════════════
mfDefine('crossbow:q', {
  name: 'SNARE', color: '#c89a5a', len: 104,
  me: [
    { t: 0,  ...MS_KNEEL, r: 0.3, w: 0.24 },
    { t: 30, e: 'io', ...MS_KNEEL, r: 0.22, w: 0.32 },
    { t: 44, e: 'lin', ...MS_KNEEL, r: 0.24, w: 0.34 },
    { t: 47, e: 'snap', ...MS_KNEEL, r: -0.1, w: -0.05, lean: -6 },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.stuck = []; },
  tick(s) {
    if (s.at(0)) s.vpose('reel');
    if (s.at(8)) { s.sfx('hitSnap'); s.vpose('spread', { air: false, lean: 14 }); }
    // Tripped flat.
    if (s.at(14)) { s.vpose('slump', { lean: 26, drop: 34, rot: 1.2 }); s.shake(10); s.parts(s.qx(), s.gy, '#c89a5a', 10); s.sfx('hitBlunt'); }
    if (s.at(46)) {
      const m = mfMuzzle(s, 30, -4);
      s.streak(m.x, m.y, s.qx(), s.gy - 12, '#ffffff', 14, 5);
      s.vars.stuck.push([0, 14]);
      s.kill({ color: '#c89a5a', y: s.gy - 14, sfx: 'hitPierce' });
    }
    if (s.t < 14) s.camV(1.45); else if (s.t < 46) s.camMe(1.6); else s.camV(1.6);
  },
  draw(s, ctx) {
    if (s.t < 16) {
      // The wire across their path.
      ctx.save(); ctx.strokeStyle = 'rgba(255,230,180,0.9)'; ctx.lineWidth = 1.5; ctx.shadowColor = '#c89a5a'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(s.qx() - 40, s.gy - 6); ctx.lineTo(s.qx() + 40, s.gy - 6); ctx.stroke(); ctx.restore();
    }
    for (const [dx, dy] of s.vars.stuck) mfStuck(ctx, s, dx, dy, 0.35, 24, '#c89a5a');
  },
  exit: [0, 0],
});

mfDefine('crossbow:e', {
  name: 'BALLISTA', color: '#c89a5a', len: 104,
  me: [
    { t: 0,  ...MS_KNEEL, r: -0.35, w: -0.45, lean: -10 },
    { t: 10, e: 'io', ...MS_KNEEL },
    { t: 36, e: 'lin', ...MS_KNEEL, lean: 6 },
    { t: 39, e: 'snap', ...MS_KNEEL, r: -0.4, w: -0.5, lean: -12 },
    { t: 70, e: 'out', ...MS_KNEEL },
    { t: 104, e: 'io', ...MS_STAND },
  ],
  start(s) { s.vars.stuck = []; },
  tick(s) {
    if (s.at(0)) s.vpose('brace');
    if (s.in(10, 36) && s.t % 3 === 0) s.parts(mfMuzzle(s, 34, -4).x, mfMuzzle(s, 34, -4).y, '#ffe0b0', 2);
    if (s.at(39)) {
      const m = mfMuzzle(s, 34, -4);
      s.streak(m.x, m.y, s.qx() + s.f * 30, s.qy(), '#ffffff', 16, 9);
      s.flash('#ffe0b0', 0.2, 6);
      s.vars.stuck.push([0, 0]);
      s.vpose('spread', { air: false });
      s.kill({ color: '#c89a5a', sfx: 'hitPierce' });
    }
    s.go('m', -36, 0, 39, 50, 'out');
    s.go('v', s.vx + 160, null, 40, 60, 'out');
    if (s.at(60)) { s.ring(s.qx() + s.f * 10, s.qy(), 90, '#c89a5a', 16); s.shake(10); s.sfx('hitBlunt'); }
    if (s.at(74)) s.vpose('slump');
    if (s.t < 39) s.camMe(1.55); else s.camV(1.35);
  },
  draw(s, ctx) {
    if (s.t < 39) {
      const m = mfMuzzle(s, 34, -4), k = s.u(10, 36);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,220,160,${0.6 * k})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, 3 + 9 * k, 0, MS_TAU); ctx.fill(); ctx.restore();
    }
    for (const [dx, dy] of s.vars.stuck) mfStuck(ctx, s, dx, dy, 0.0, 34, '#c89a5a');
  },
  exit: [1, 0],
});
