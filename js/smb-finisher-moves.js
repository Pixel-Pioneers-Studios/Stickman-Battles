'use strict';
// smb-finisher-moves.js — every move scene has its own finisher. When a Q or E
// lands the killing blow, the kill plays out as that move carried to its end
// (MOVE_FINISHERS['axe:q']) instead of the weapon's generic finisher. The
// finishers speak the move scenes' language: the same pose rig (_movePose),
// the same slash/ring/star FX, the move's colour.
//
// A kill belongs to a move while its scene runs and for MS_KILL_TAIL frames
// after (a cast's projectiles are still in the air), unless the performer has
// started a normal swing since — see Fighter._msKill in smb-move-scenes.js.
//
// A def (mfDefine in smb-finisher-moves-defs.js):
//   name, color, len           title card, accent, duration in frames
//   line                       optional subtitle under the action
//   me / them                  pose tracks (move-scene schema) for performer / victim
//   tick(s)                    per frame: stage bodies with go()/fly(), fire FX on at()
//   draw(s, ctx)               optional world-space drawing
//   exit: [vx, vy]             victim's velocity (facing space) when the death takes over
//
// Staging is in facing space around the performer's spot when the kill
// landed: (mx, my) is the performer's centre offset, (vx, vy) the victim's.
// The performer is tethered to the stage span; the victim may go anywhere.
//
// Depends on: smb-move-scenes.js (msSample, msEase, msLerpAngle, MS_VPOSE,
//   MS_POSE_KEYS, MS_BLEND_OUT, MoveScene, _msGroundTop, _msSpan),
//   smb-finisher-helpers.js (_finTitle, _finBars, _finSubtitle, _finGameTransform).
// Picked by triggerFinisher() in smb-finisher-engine.js.
// ============================================================

const MOVE_FINISHERS = {};
const MF_BLEND_IN = 7;       // frames to ease from the kill-frame pose into the finisher's

function _mfRgba(hex, a) {
  const h = String(hex || '#ffffff').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16) || 0xffffff;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function mfDefine(key, o) {
  MOVE_FINISHERS[key] = {
    name: o.name, accentColor: _mfRgba(o.color, 0.95), duration: o.len, moveKey: key,
    face: false, smear: false, holds: [],
    setup(att, tgt, data) { data.fs = _mfStart(o, att, tgt); },
    update(att, tgt, timer, data) { _mfTick(data.fs, timer); },
    draw(ctx, att, tgt, t, timer, data) { _mfDraw(ctx, data.fs, t, timer); },
  };
}

// The move that owns this kill, if any.
function _pickMoveFinisher(att) {
  const k = att && att._msKill;
  if (!k) return null;
  const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
  const live = att._msScene && att._msScene.key === k.key;
  if (!live && !(k.end && fc - k.end <= MS_KILL_TAIL)) return null;
  return MOVE_FINISHERS[k.key] || null;
}

// Extra victim poses for the finishers (victim-facing canonical, like MS_VPOSE).
const MF_VPOSE = {
  kneel:  { r: 1.45, l: 1.75, rl: 0.8, ll: 0.8, lean: 6, drop: 20, fr: 15, fl: -3 },
  limp:   { r: 1.75, l: 1.45, lean: 3, air: true, lg: 1.75, lgl: 1.45, ls: 0.95, lsl: 0.95, rot: 0.25 },
  spread: { r: -2.75, l: 2.85, air: true, lg: 2.35, lgl: 0.85, ls: 0.95, lsl: 0.9, rot: -0.55 },
  arch:   { r: -2.2, l: -2.5, lean: -12, air: true, lg: 2.2, lgl: 1.9, ls: 0.9, lsl: 0.9, rot: -0.7 },
  slump:  { r: 1.65, l: 1.5, rl: 0.75, ll: 0.75, lean: 14, drop: 24, fr: 13, fl: 0, rot: 0.25 },
  brace:  { r: -0.6, l: -0.9, rl: 0.7, ll: 0.7, lean: -5, drop: 6, fr: 4, fl: -14 },
  hang:   { r: -1.6, l: -1.5, rl: 1.05, ll: 1.05, air: true, lg: 1.6, lgl: 1.55, ls: 1.0, lsl: 1.0 },
};

const MF_PROTO = {
  at(n)      { return this.t === n; },
  in(a, b)   { return this.t >= a && this.t < b; },
  u(a, b, e) { return msEase(e || 'lin', (this.t - a) / (b - a)); },
  every(n, a, b) { return this.t >= (a || 0) && this.t < (b === undefined ? 1e9 : b) && (this.t - (a || 0)) % n === 0; },

  // Ease a body ('m' performer, 'v' victim) from wherever it is at frame a to
  // (x, y) by frame b. null leaves that axis alone. Once it arrives it lets go,
  // so anything written afterwards sticks.
  go(w, x, y, a, b, e) {
    if (this.t < a) return;
    const id = w + ':' + a + ':' + b;
    const c = this.caps[id] || (this.caps[id] = { x: this[w + 'x'], y: this[w + 'y'] });
    if (c.done) return;
    if (this.t >= b) c.done = true;
    const u = b > a ? msEase(e || 'io', (this.t - a) / (b - a)) : 1;
    if (x !== null) this[w + 'x'] = c.x + (x - c.x) * u;
    if (y !== null) this[w + 'y'] = c.y + (y - c.y) * u;
  },
  // Ballistic from frame a (vx in facing space, +vy down), let go after b.
  fly(w, vx, vy, g, a, b) {
    if (this.t < a) return;
    const id = w + '~' + a;
    const c = this.caps[id] || (this.caps[id] = { x: this[w + 'x'], y: this[w + 'y'] });
    if (c.done) return;
    if (b !== undefined && this.t >= b) c.done = true;
    const d = Math.min(this.t, b === undefined ? 1e9 : b) - a;
    this[w + 'x'] = c.x + vx * d;
    this[w + 'y'] = c.y + vy * d + 0.5 * (g || 0) * d * d;
  },

  // World coordinates.
  wx(dx) { return this.hx + this.f * dx; },
  wy(dy) { return this.hy + dy; },
  ax() { return this.att.cx(); },
  ay() { return this.att.cy(); },
  qx() { return this.tgt.cx(); },
  qy() { return this.tgt.cy(); },
  foot() { return this.gy; },

  vpose(name, extra) { this.vp = Object.assign({}, MF_VPOSE[name] || MS_VPOSE[name] || MS_VPOSE.reel, extra || null); },

  // ── FX: the move scenes' own vocabulary ──────────────────────────────────
  // Crescent at world (x, y), angles in facing space.
  arc(x, y, r, a0, a1, o) {
    o = o || {};
    MoveScene.fx.push({ kind: 'arc', x, y, r, ry: o.ry || r, a0, a1, f: o.f || this.f, tilt: o.tilt || 0,
      color: o.color || this.color, w: o.w || 10, life: o.life || 12, max: o.life || 12 });
  },
  // Crescent around the performer's centre, offset (dx, dy) in facing space.
  slash(dx, dy, r, a0, a1, o) { this.arc(this.ax() + this.f * dx, this.ay() + dy, r, a0, a1, o); },
  ring(x, y, r, color, life) { MoveScene.fx.push({ kind: 'ring', x, y, r0: 8, r: r || 80, color: color || this.color, life: life || 18, max: life || 18 }); },
  streak(x0, y0, x1, y1, color, life, w) { MoveScene.fx.push({ kind: 'line', x0, y0, x1, y1, color: color || this.color, life: life || 12, max: life || 12, w: w || 6 }); },
  star(x, y, big, color) {
    const c = color || this.color;
    MoveScene.fx.push({ kind: 'star', x, y, r: big ? 58 : 34, color: c, life: big ? 14 : 10, max: big ? 14 : 10, a: Math.random() * Math.PI });
    this.parts(x, y, c, big ? 22 : 12);
    this.parts(x, y, '#ffffff', big ? 12 : 6);
  },
  parts(x, y, color, n) { if (typeof spawnParticles === 'function') spawnParticles(x, y, color || this.color, n || 8); },
  flash(color, a, life) { MoveScene.screen.push({ kind: 'flash', color: color || '#ffffff', a: Math.min(0.6, a || 0.2), life: life || 8, max: life || 8 }); },
  invert(life) { MoveScene.screen.push({ kind: 'invert', life: life || 5, max: life || 5 }); },
  shake(n) { if (typeof screenShake !== 'undefined' && (!settings || settings.screenShake !== false)) screenShake = Math.max(screenShake, n); },
  // A real freeze: the loop skips update (finisher timer included) for n frames.
  hold(n) { if (typeof animHold === 'function') animHold(n); },
  bolt(x, y) { if (typeof spawnLightningBolt === 'function') spawnLightningBolt(x, y); },
  sfx(name) { if (typeof SoundManager !== 'undefined' && typeof SoundManager[name] === 'function') { try { SoundManager[name](); } catch (e) {} } },
  pop(x, y, text, color) {
    if (typeof damageTexts !== 'undefined' && typeof DamageText !== 'undefined') damageTexts.push(new DamageText(x, y, text, color || this.color));
  },
  // The impact beat most kills share: star, flash, freeze, shake, sound.
  kill(o) {
    o = o || {};
    const x = o.x !== undefined ? o.x : this.qx(), y = o.y !== undefined ? o.y : this.qy();
    this.star(x, y, true, o.color);
    this.ring(x, y, o.ring || 110, o.color || this.color, 20);
    this.flash(o.flash || '#ffffff', o.a === undefined ? 0.3 : o.a, 9);
    this.hold(o.hold === undefined ? 9 : o.hold);
    this.shake(o.shake || 24);
    this.sfx(o.sfx || 'heavyHit');
  },

  // Camera for this frame (zoom, world focus). Without a call the shot frames both.
  cam(z, x, y) { this._cam = { z, x, y }; },
  camMid(z) { this.cam(z, (this.ax() + this.qx()) / 2, (this.ay() + this.qy()) / 2); },
  camMe(z) { this.cam(z, this.ax(), this.ay()); },
  camV(z) { this.cam(z, this.qx(), this.qy()); },

  // Draw the performer's weapon free of the hand this frame (thrown, planted,
  // orbiting). ang is facing space: 0 points the way the performer faces.
  prop(x, y, ang, o) { this.props.push(Object.assign({ x, y, ang: this.f > 0 ? ang : Math.PI - ang }, o || null)); },
};

function _mfStart(o, att, tgt) {
  let f = tgt.cx() >= att.cx() ? 1 : -1;
  if (Math.abs(tgt.cx() - att.cx()) < 4) f = att.facing < 0 ? -1 : 1;
  const foot = att.y + att.h;
  let gy = _msGroundTop(att.cx(), foot - 4, 900);
  if (gy === null) gy = foot;
  const s = Object.create(MF_PROTO);
  Object.assign(s, {
    o, att, tgt, f, gy, t: -1, color: o.color || '#ffffff',
    span: _msSpan(att.cx(), Math.min(foot, gy)),
    hx: att.cx(), hy: gy - att.h / 2,
    caps: {}, vars: {}, props: [], vp: null, vrot: 0, aface: f, vface: null, noFloor: !!o.noFloor,
    pose0: att._movePose || (att._msOut && att._msOut.p) || null,
    vpose0: tgt._movePose || null,
  });
  s.mx = 0; s.my = att.cy() - s.hy;
  s.vx = (tgt.cx() - s.hx) * f; s.vy = tgt.cy() - s.hy;
  s.m0y = s.my; s.v0x = s.vx; s.v0y = s.vy;
  s.vfloor = att.h / 2 - tgt.h / 2;
  // Whatever the move scene was doing to them stops here.
  tgt.ragdollTimer = 0; tgt.ragdollSpin = 0;
  tgt._msLock = null;
  if (o.start) o.start(s);
  return s;
}

// Ease the first frames from the pose the kill landed in.
function _mfBlendIn(p, p0, t) {
  if (!p || !p0 || t >= MF_BLEND_IN) return p;
  const k = 1 - msEase('out', t / MF_BLEND_IN);
  for (const key of MS_POSE_KEYS) {
    if (p0[key] === undefined || p[key] === undefined) continue;
    p[key] = (key === 'r' || key === 'l' || key === 'w' || key === 'lg' || key === 'rot')
      ? msLerpAngle(p[key], p0[key], k) : p[key] + (p0[key] - p[key]) * k;
  }
  return p;
}

function _mfTick(s, timer) {
  if (!s) return;
  const { att, tgt, o } = s;
  s.t = timer;
  s.props.length = 0;
  s._cam = null;
  try { if (o.tick) o.tick(s); } catch (e) { console.warn('[MoveFinisher] ' + o.name + ' tick failed', e); }

  // Performer: tethered to the stage, never under the floor.
  let acx = s.hx + s.f * s.mx;
  if (!s.span.open) acx = Math.max(s.span.L + MS_SPAN_MARGIN, Math.min(s.span.R - MS_SPAN_MARGIN, acx));
  s.mx = (acx - s.hx) * s.f;
  s.my = Math.min(0, s.my);
  const acy = s.hy + s.my;
  att.x = acx - att.w / 2; att.y = acy - att.h / 2;
  att.vx = 0; att.vy = 0;
  att.facing = s.aface;
  // Victim.
  const vy = s.noFloor ? s.vy : Math.min(s.vy, s.vfloor);
  tgt.x = s.hx + s.f * s.vx - tgt.w / 2; tgt.y = s.hy + vy - tgt.h / 2;
  tgt.vx = 0; tgt.vy = 0;
  tgt.ragdollTimer = 0; tgt.ragdollSpin = 0;
  tgt.facing = s.vface || (att.cx() >= tgt.cx() ? 1 : -1);

  // Poses.
  let p = o.me ? msSample(o.me, timer) : null;
  if (p && o.poseMod) p = o.poseMod(s, p) || p;
  p = _mfBlendIn(p, s.pose0, timer);
  att._movePose = p;
  if (p) att._hideWeapon = !!p.hide;
  let vp = o.them ? msSample(o.them, timer) : (s.vp ? Object.assign({}, s.vp) : null);
  if (vp) {
    vp = _mfBlendIn(vp, s.vpose0, timer);
    const out = {};
    for (const k of MS_POSE_KEYS) out[k] = vp[k] !== undefined ? vp[k] : MS_POSE_DEF[k];
    out.w = undefined; out.air = !!vp.air; out.keepState = true;
    out.rot = (vp.rot || 0) + s.vrot;
    tgt._movePose = out;
  } else tgt._movePose = null;

  // Camera.
  const c = s._cam;
  if (typeof CinCam !== 'undefined') {
    if (c) CinCam.focusPoint(c.x, c.y, c.z);
    else CinCam.focusPoint((att.cx() + tgt.cx()) / 2, (att.cy() + tgt.cy()) / 2 - 10, o.zoom || 1.3);
  }

  // Hand back on the last frame: the engine sets health to 0 right after this.
  if (timer >= o.len - 1) {
    if (att._movePose) {
      att._msOut = { p: att._movePose, t: MS_BLEND_OUT };
      if (!MoveScene.outs.includes(att)) MoveScene.outs.push(att);
    }
    att._movePose = null;
    tgt._movePose = null;
    if (s.my < -2) att.canDoubleJump = true;
    const ex = o.exit || [0, 0];
    tgt.vx = s.f * ex[0]; tgt.vy = ex[1];
  }
}

function _mfDraw(ctx, s, t, timer) {
  if (!s) return;
  const o = s.o;
  const bars = timer < 10 ? timer / 10 : timer > o.len - 14 ? Math.max(0, (o.len - timer) / 14) : 1;
  if (o.draw || s.props.length) {
    const { scX, scY, ox, oy } = _finGameTransform();
    ctx.save();
    ctx.setTransform(scX, 0, 0, scY, ox, oy);
    try { if (o.draw) o.draw(s, ctx); } catch (e) { /* never take the frame down */ }
    ctx.restore();
    for (const pr of s.props) {
      ctx.save();
      ctx.setTransform(scX, 0, 0, scY, ox, oy);
      if (pr.alpha !== undefined) ctx.globalAlpha = pr.alpha;
      try { s.att.drawWeapon(pr.x, pr.y, pr.ang, false, pr.key || null, pr.scale || 1); } catch (e) {}
      ctx.restore();
    }
  }
  _finBars(ctx, bars);
  _finTitle(ctx, o.name, t, _mfRgba(o.color, 0.95));
  if (o.line) _finSubtitle(ctx, o.line, t, 0.86);
}
