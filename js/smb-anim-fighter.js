'use strict';
// smb-anim-fighter.js: fighter model animation helpers, called from Fighter.draw().
// All gated on settings.animQuality. 'classic' restores the old look.
// Depends on smb-anim-core.js (animEase) and smb-globals.js (settings, players).

/** Phase 2 model features on? 'classic' opts back out to the pre-4.0.90 rig. */
function animHiQ() {
  return typeof settings === 'undefined' || settings.animQuality !== 'classic';
}

/**
 * Two-bone IK: solve the middle joint from the law of cosines, so the bend follows the pose.
 * @param bone length of EACH bone (max reach = 2 * bone)
 * @param bend +1 / -1, which side of the chord the joint pops out
 */
function animIK(ax, ay, bx, by, bone, bend) {
  const dx = bx - ax, dy = by - ay;
  const d  = Math.hypot(dx, dy) || 0.0001;
  // Never ask for more reach than the bones have; a hair under, so h stays real
  const reach = Math.min(d, bone * 2 - 0.01);
  const half  = reach * 0.5;
  const h     = Math.sqrt(Math.max(0, bone * bone - half * half));
  const ux = dx / d, uy = dy / d;
  return [
    ax + ux * half - uy * h * bend,
    ay + uy * half + ux * h * bend,
  ];
}

/**
 * Stride phase is driven by distance travelled, not animTimer. A fixed time rate makes feet
 * slide whenever vx doesn't match. Advancing 2*PI per stride length keeps feet on the ground
 * without a lock (a lock runs out of reach at running speed). Exact only at mid-stance.
 * @param legLen leg segment length in px
 * @param amp stride amplitude in radians
 */
function animStridePhase(f, legLen, amp, fallback) {
  if (!animHiQ()) return fallback;
  if (f._stride === undefined) f._stride = 0;
  const perPx = 1 / Math.max(1, legLen * amp);
  f._stride += Math.abs(f.vx || 0) * perPx;
  if (f._stride > Math.PI * 200) f._stride -= Math.PI * 200;
  return f._stride;
}

/** Reset the gait — call on respawn / teleport so a step never carries over. */
function animStrideReset(f) { if (f) { f._stride = 0; if (f._fp) f._fp = { r: null, l: null }; } }

/** Drop all plants — call on respawn / teleport so a foot never tethers. */
function animFootRelease(f) { animStrideReset(f); f && (f._runPh = 0); }

/**
 * Run cycle copied from a side-view treadmill capture (NCAA D1 athlete, 10 mph, 100 fps),
 * not hand-designed. Samples are absolute bone angles in facing-right space (0 = right,
 * PI/2 = down), 16 per stride. Phase 0 = this leg driving its knee forward after the other toe-off.
 */
const RUN_MOCAP = {
  thigh: [1.004,1.117,1.205,1.27,1.36,1.448,1.573,1.691,1.806,1.934,1.955,1.881,1.692,1.363,1.06,0.952],
  shin:  [2.3,1.838,1.503,1.447,1.625,1.95,2.196,2.312,2.408,2.635,3.005,3.325,3.478,3.386,3.056,2.678],
  // Pelvis height offset in px at FIG_LEG_LEN 31 (negative = up), per 1/16.
  bob:   [-1.04,-1.62,-2.23,-1.52,-0.07,0.04,-0.54,-1.11,-1.04,-1.62,-2.23,-1.52,-0.07,0.04,-0.54,-1.11],
  thighFrac: 0.494,   // thigh / FIG_LEG_LEN
  shinFrac:  0.449,   // puts the mid-stance ankle at idle depth
  strideLegs: 2.6,    // ground per cycle, in leg lengths
};

/** Periodic Catmull-Rom sample of a 16-entry table at phase u in [0,1). */
function _runTab(a, u) {
  const n = a.length, x = (((u % 1) + 1) % 1) * n, i = Math.floor(x), t = x - i;
  const p0 = a[(i + n - 1) % n], p1 = a[i], p2 = a[(i + 1) % n], p3 = a[(i + 2) % n];
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

/**
 * Advance the run phase by distance travelled so the stance foot stays put on
 * the ground. Returns the phase in [0,1).
 */
function animRunAdvance(f, legLen, amp) {
  if (f._runPh === undefined) f._runPh = 0;
  const stride = Math.max(8, RUN_MOCAP.strideLegs * legLen * amp);
  // Backpedalling runs the cycle in reverse, or the planted foot slides at 2x body speed.
  const dir = ((f.vx || 0) * (f.facing || 1)) < 0 ? -1 : 1;
  f._runPh = ((f._runPh + dir * Math.abs(f.vx || 0) / stride) % 1 + 1) % 1;
  return f._runPh;
}

/**
 * One leg of the run in facing-right space. `amp` (0..1) eases the whole cycle
 * toward standing for slow movement; at 1 it is the reference exactly.
 */
function animRunLeg(u, legLen, amp) {
  const H = Math.PI / 2;
  const th = _runTab(RUN_MOCAP.thigh, u), sh = _runTab(RUN_MOCAP.shin, u);
  const thigh = H + (th - H) * amp;
  const shin  = thigh + (sh - th) * amp;
  const tl = legLen * RUN_MOCAP.thighFrac, sl = legLen * RUN_MOCAP.shinFrac;
  const kx = Math.cos(thigh) * tl, ky = Math.sin(thigh) * tl;
  return { thigh, shin, kx, ky, ax: kx + Math.cos(shin) * sl, ay: ky + Math.sin(shin) * sl };
}

/** Pelvis bob for the run at phase u (px, negative = up). */
function animRunBob(u, legLen, amp) {
  return _runTab(RUN_MOCAP.bob, u) * (legLen / 31) * amp;
}

/**
 * One arm of the run in facing-right space: upper-arm and forearm angles.
 * Same-side arm is back while the same-side knee drives forward. The arm holds
 * at each end and switches fast (a flattened cosine), which is what the
 * reference does — a pure sine reads as a pendulum, not a runner.
 */
function animRunArm(u, amp) {
  const w = Math.tanh(1.8 * Math.cos(2 * Math.PI * (u - 1 / 16))) / Math.tanh(1.8);  // +1 = back
  const D = Math.PI / 180;
  return {
    upper: (117.5 + 32.5 * w * amp) * D + (1 - amp) * -20 * D,
    fore:  (23.5 + 38.5 * w * amp) * D + (1 - amp) * 40 * D,
  };
}

/**
 * Head lag. Push the torso's lean into a short ring buffer and read it back a
 * few frames late: the head arrives after the body does, which is free
 * follow-through and the cheapest overlap there is.
 */
function animHeadLag(f, lean, frames = 4, cap = 3) {
  if (!animHiQ()) return lean;
  if (!f._leanBuf) f._leanBuf = [];
  const buf = f._leanBuf;
  buf.push(lean);
  while (buf.length > 12) buf.shift();
  const i = Math.max(0, buf.length - 1 - frames);
  // Capped at 3px. Hats get no drag: drawAccessory anchors them to cx, rewiring that isn't worth it.
  const v = buf[i];
  return v < -cap ? -cap : v > cap ? cap : v;
}

/**
 * Impact squash from knockback, on top of the rig's existing landing squash.
 * `_hitSquash` is stamped where the hit nudge is (smb-combat.js) so the scale
 * of the deformation tracks the scale of the blow.
 */
function animHitSquash(f) {
  if (!animHiQ() || !f._hitSquash || f._hitSquash.t <= 0) return null;
  const hs = f._hitSquash;
  hs.t--;
  const u = hs.t / hs.max;
  const e = (typeof animEase !== 'undefined') ? animEase.outElastic(1 - u) : 1 - u;
  const amt = hs.amt * (1 - e);
  // 'x' = squashed along the horizontal (hit a wall). Default is a vertical blow.
  return hs.axis === 'x' ? { x: 1 - amt, y: 1 + amt }
                         : { x: 1 + amt, y: 1 - amt };
}

/**
 * Where this fighter is looking: a unit-ish offset toward the nearest live
 * opponent, so pupils track the fight instead of staring straight ahead.
 */
function animEyeTarget(f) {
  if (!animHiQ()) return { x: 0, y: 0 };
  let best = null, bd = Infinity;
  const scan = (list) => {
    if (!list) return;
    for (const o of list) {
      if (!o || o === f || o.health <= 0) continue;
      if (typeof areAlliedEntities === 'function' && areAlliedEntities(f, o)) continue;
      const d = Math.hypot(o.cx() - f.cx(), o.cy() - f.cy());
      if (d < bd) { bd = d; best = o; }
    }
  };
  scan(typeof players !== 'undefined' ? players : null);
  scan(typeof minions !== 'undefined' ? minions : null);
  if (!best || bd > 620) return { x: 0, y: 0 };
  const dx = best.cx() - f.cx(), dy = best.cy() - f.cy();
  const d  = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: Math.max(-1, Math.min(1, dy / d)) };
}

/**
 * Blink phase, 0 = open, 1 = shut. Each fighter gets its own offset so a crowd
 * never blinks in unison — the narrative renderer does the same thing.
 */
function animBlink(f) {
  if (!animHiQ()) return 0;
  const t = (typeof frameCount !== 'undefined') ? frameCount : 0;
  if (f._blinkSeed === undefined) f._blinkSeed = Math.floor(Math.random() * 400);
  const period = 190;
  const p = (t + f._blinkSeed) % period;
  if (p > 6) return 0;
  return Math.sin((p / 6) * Math.PI);  // 0 to 1 to 0 over six frames
}

/**
 * Cape state from velocity: streams with speed, lifts on falls, whips in turns. The trail
 * direction is a lagged spring, not a hard read of facing.
 */
function animCapeDrive(f) {
  const base = { dir: -(f.facing || 1), sweep: 0, lift: 0 };
  if (!animHiQ()) return base;
  if (f._capeDir === undefined) f._capeDir = base.dir;
  // Lagged trail direction: the cape keeps going the old way for a few frames
  f._capeDir += (base.dir - f._capeDir) * 0.14;
  const spd = Math.max(-1, Math.min(1, (f.vx || 0) / 9));
  const fall = Math.max(-1, Math.min(1, (f.vy || 0) / 12));
  return {
    dir:   f._capeDir,
    sweep: Math.abs(spd) * 16 - Math.sign(spd) * (f.facing || 1) * spd * 4,
    lift:  -fall * 12,
  };
}

/**
 * Body layer on top of the state rig: torso lean and head offset (world-space px), and
 * extra scale. Everything here is render-only and decays on its own, so a dropped frame or a
 * skipped state never leaves the figure stuck in a pose.
 */
function animBodyLayer(f, s, atkP) {
  if (!animHiQ() || f.isBoss) return null;
  const out = { lean: 0, head: 0, sx: 1, sy: 1, rot: 0 };
  const face = f.facing || 1;
  const prevS = f._layerS;
  f._layerS = s;

  // Attack: rock back on the wind-up, drive the shoulders through the strike, settle half way.
  if (s === 'attacking') {
    const p = animClamp(atkP || 0, 0, 1);
    const drive = animEase.anticipate(Math.min(1, p / 0.6), 0.5) * (1 - 0.5 * Math.max(0, (p - 0.6) / 0.4));
    out.lean += face * 5.5 * drive;
    out.head += face * 2.0 * drive;
  }
  if (f._finAnticip) out.lean -= face * f._finAnticip * 7;

  // Hit reaction: the feet go with the knockback and the shoulders lag behind, head last.
  // Read from velocity, not the torso spring, which carries a running lean into the hit.
  if (s === 'hurt') {
    const kb = animClamp(f.vx || 0, -12, 12);
    out.lean -= kb * 1.3;
    out.head -= kb * 0.7;
  } else if (s === 'stunned') {
    const w = (f.animTimer || 0) * 0.06;
    out.lean += Math.sin(w) * 3;
    out.head += Math.sin(w - 0.7) * 2.5;
  }

  // Walk-to-stop: the body carries on a little past the feet, then rocks back upright.
  if (prevS === 'walking' && s === 'idle') f._settle = { t: 0, dir: Math.sign(f._layerVx || face) };
  if (s !== 'idle') f._settle = null;
  if (f._settle) {
    const u = f._settle.t++ / 16;
    if (u >= 1) f._settle = null;
    else {
      const k = Math.sin(u * Math.PI * 1.6) * (1 - u) * (1 - u);
      out.lean += f._settle.dir * 4.5 * k;
      out.head += f._settle.dir * 2.5 * k;
    }
  }
  f._layerVx = f.vx;

  // Idle weight shift, slow enough to read as breathing rather than fidgeting.
  if (s === 'idle') out.lean += Math.sin((f.animTimer || 0) * 0.021) * 0.9;

  // Turnaround: pinch through the side view and spring back out, instead of a one-frame mirror.
  if (f._layerFace !== undefined && f._layerFace !== face &&
      (s === 'idle' || s === 'walking' || s === 'jumping' || s === 'falling' || s === 'shielding')) f._turnT = 8;
  f._layerFace = face;
  if (f._turnT > 0) {
    const k = 1 - f._turnT / 8;
    out.sx *= 0.6 + 0.4 * animEase.outBack(k, 2.2);
    f._turnT--;
  }

  // Air: stretch with rising speed, a slight stretch on a fast fall, nothing at the apex.
  if (!f.onGround && s !== 'ragdoll') {
    const st = animClamp(-(f.vy || 0) / 14, 0, 1) * 0.12 + animClamp(((f.vy || 0) - 7) / 10, 0, 1) * 0.05;
    out.sy *= 1 + st;
    out.sx *= 1 - st * 0.6;
  }

  // Landing: squash scaled by impact speed, then one small rebound stretch. Anything else that
  // sets the legacy squashTimer (smb-death-anim.js) gets a mid-sized landing.
  if (f.squashTimer > 0) {
    if (!f._landVy) f._landVy = 10;
    f.squashTimer = 0;
  }
  if (f._landVy) {
    f._land = { t: 0, amt: animClamp(0.06 + (f._landVy - 5) * 0.014, 0.06, 0.24) };
    f._landVy = 0;
  }
  if (f._land) {
    const u = f._land.t++ / 16;
    if (u >= 1) f._land = null;
    else {
      const k = Math.exp(-u * 4.2) * Math.cos(u * Math.PI * 2.1) * f._land.amt;
      out.sx *= 1 + k * 1.1;
      out.sy *= 1 - k;
    }
  }

  // Getting up from a ragdoll: tip back upright with a small overshoot rather than snapping.
  if (f.ragdollTimer > 0) {
    f._ragLast = f.ragdollAngle || 0;
    f._getUp = null;
  } else if (f._ragLast) {
    const a = Math.atan2(Math.sin(f._ragLast), Math.cos(f._ragLast));
    if (Math.abs(a) > 0.08) f._getUp = { t: 0, a };
    f._ragLast = 0;
  }
  if (f._getUp) {
    const u = f._getUp.t++ / 18;
    if (u >= 1) f._getUp = null;
    else {
      out.rot = f._getUp.a * (1 - animEase.outBack(u, 1.4));
      const c = Math.sin(u * Math.PI) * 0.10;
      out.sy *= 1 - c;
      out.sx *= 1 + c * 0.6;
    }
  }
  return out;
}

/**
 * Arm blend across state changes, so leaving a swing, a flinch or a guard eases out instead of
 * popping to the next pose. Entering an attack is never blended: the wind-up has to read at once.
 * Returns the blended [rAng, lAng].
 */
function animArmBlend(f, s, rAng, lAng, skip = false, frames = 7) {
  if (!animHiQ() || f.isBoss) return [rAng, lAng];
  // Authored poses (spins, move scenes, the run's own FK) own the arms outright; just track them.
  if (skip) { f._armBlend = null; f._armS = s; f._armR = rAng; f._armL = lAng; return [rAng, lAng]; }
  if (f._armS !== undefined && f._armS !== s && s !== 'attacking' && f._armR !== undefined) {
    f._armBlend = { t: 0, r: f._armR, l: f._armL };
  }
  f._armS = s;
  if (f._armBlend) {
    const b = f._armBlend;
    const k = animEase.outCubic(Math.min(1, ++b.t / frames));
    rAng = animLerpAngle(b.r, rAng, k);
    lAng = animLerpAngle(b.l, lAng, k);
    if (k >= 1) f._armBlend = null;
  }
  f._armR = rAng;
  f._armL = lAng;
  return [rAng, lAng];
}

// Whole-body basic swings and hit reactions. Classic animation quality turns these off, as does ?noswingbody.
// Draw-only: during a swing the hand stays where swingPose() puts it, so the blade still matches its hitbox while the body moves around it.
// A swing has to start on the press, so there is no real wind-up: the weight is in the strike and the held follow-through.
// Pose: lean/hip px forward; head px ahead of the shoulders; drop px crouch; front/rear feet offset from the body centre; l off-arm angle; ll off-arm reach.
let SWING_BODY_ON = !(typeof location !== 'undefined' && /[?&]noswingbody\b/.test(location.search));

// [load, strike, held], a pair per archetype: consecutive swings alternate so a chain doesn't repeat one pose.
const _SB_SLASH = [
  [{ lean: -2, hip: 2, drop: 5, front: 13, rear: -12, l: 0.60 }, { lean: 13, hip: 7, drop: 10, front: 23, rear: -19, l: 2.75 }, { lean: 11, hip: 6, drop: 9, front: 23, rear: -19, l: 2.85 }],
  [{ lean: 3, hip: 3, drop: 8, front: 15, rear: -13, l: 2.40 }, { lean: 8, hip: 5, drop: 2, front: 17, rear: -16, l: 0.72 }, { lean: 7, hip: 4, drop: 3, front: 17, rear: -16, l: 0.84 }],
];
const _SB_SMASH = [
  [{ lean: -5, hip: -1, drop: -2, front: 10, rear: -11, l: -1.00 }, { lean: 16, hip: 8, drop: 15, front: 24, rear: -20, l: 2.20 }, { lean: 14, hip: 7, drop: 14, front: 24, rear: -20, l: 2.30 }],
  [{ lean: -3, hip: 0, drop: 1, front: 12, rear: -12, l: 2.70 }, { lean: 13, hip: 7, drop: 13, front: 21, rear: -22, l: 0.95 }, { lean: 12, hip: 6, drop: 12, front: 21, rear: -22, l: 1.05 }],
];
const _SB_CLEAVE = [
  [{ lean: -4, hip: 1, drop: 6, front: 14, rear: -14, l: 0.20 }, { lean: 12, hip: 6, drop: 11, front: 25, rear: -21, l: 3.00 }, { lean: 8, hip: 5, drop: 10, front: 25, rear: -21, l: 2.90 }],
  [{ lean: 2, hip: 2, drop: 9, front: 16, rear: -14, l: 2.60 }, { lean: 10, hip: 5, drop: 5, front: 20, rear: -20, l: 0.50 }, { lean: 8, hip: 4, drop: 6, front: 20, rear: -20, l: 0.65 }],
];
const _SB_SWEEP = [
  [{ lean: -6, hip: 0, drop: 8, front: 16, rear: -16, l: 0.30 }, { lean: 10, hip: 4, drop: 14, front: 28, rear: -24, l: 2.90 }, { lean: 12, hip: 5, drop: 13, front: 28, rear: -24, l: 3.05 }],
  [{ lean: -3, hip: 1, drop: 10, front: 18, rear: -18, l: 2.50 }, { lean: 11, hip: 3, drop: 12, front: 24, rear: -27, l: 0.40 }, { lean: 10, hip: 3, drop: 11, front: 24, rear: -27, l: 0.55 }],
];
const _SB_THRUST = [
  [{ lean: -4, hip: -2, drop: 6, front: 10, rear: -12, l: 2.30 }, { lean: 15, hip: 10, drop: 9, front: 27, rear: -22, l: 2.95 }, { lean: 13, hip: 9, drop: 8, front: 27, rear: -22, l: 2.90 }],
  [{ lean: -2, hip: -1, drop: 4, front: 11, rear: -13, l: 2.10 }, { lean: 12, hip: 9, drop: 12, front: 25, rear: -24, l: 2.70 }, { lean: 11, hip: 8, drop: 11, front: 25, rear: -24, l: 2.75 }],
];
const _SB_CRACK = [
  [{ lean: -3, hip: 0, drop: 3, front: 11, rear: -11, l: 1.00 }, { lean: 9, hip: 5, drop: 6, front: 17, rear: -15, l: 2.60 }, { lean: 8, hip: 4, drop: 5, front: 17, rear: -15, l: 2.70 }],
  [{ lean: 1, hip: 1, drop: 7, front: 13, rear: -11, l: 2.20 }, { lean: 6, hip: 4, drop: 2, front: 15, rear: -15, l: 0.90 }, { lean: 5, hip: 3, drop: 3, front: 15, rear: -15, l: 1.00 }],
];
const _SB_JAB = [
  [{ lean: 1, hip: 1, drop: 4, front: 10, rear: -10, l: -0.50, ll: 0.55 }, { lean: 10, hip: 6, drop: 6, front: 15, rear: -12, l: -0.45, ll: 0.55 }, { lean: 7, hip: 4, drop: 5, front: 15, rear: -12, l: -0.45, ll: 0.55 }],
  [{ lean: 3, hip: 2, drop: 6, front: 11, rear: -11, l: -0.70, ll: 0.50 }, { lean: 7, hip: 7, drop: 8, front: 16, rear: -14, l: -0.65, ll: 0.50 }, { lean: 5, hip: 5, drop: 7, front: 16, rear: -14, l: -0.65, ll: 0.50 }],
];
// Guns and bows push back on the shot instead of lunging.
const _SB_POINT = [
  [{ lean: 2, hip: 1, drop: 3, front: 11, rear: -11, l: 0.90, ll: 0.8 }, { lean: -4, hip: -1, drop: 4, front: 12, rear: -13, l: 0.95, ll: 0.8 }, { lean: -2, hip: 0, drop: 3, front: 12, rear: -13, l: 0.95, ll: 0.8 }],
  [{ lean: 3, hip: 1, drop: 4, front: 11, rear: -12, l: 0.85, ll: 0.8 }, { lean: -3, hip: -1, drop: 5, front: 12, rear: -14, l: 0.90, ll: 0.8 }, { lean: -1, hip: 0, drop: 4, front: 12, rear: -14, l: 0.90, ll: 0.8 }],
];
const _SB_AIM = [
  [{ lean: -1, hip: 0, drop: 3, front: 14, rear: -13, l: 3.00, ll: 0.6 }, { lean: 3, hip: 1, drop: 4, front: 15, rear: -14, l: 3.05, ll: 0.9 }, { lean: 2, hip: 1, drop: 4, front: 15, rear: -14, l: 3.05, ll: 0.9 }],
  [{ lean: -2, hip: 0, drop: 4, front: 14, rear: -14, l: 3.05, ll: 0.6 }, { lean: 2, hip: 1, drop: 5, front: 15, rear: -15, l: 3.10, ll: 0.9 }, { lean: 1, hip: 1, drop: 5, front: 15, rear: -15, l: 3.10, ll: 0.9 }],
];
const _SB_THROW = [
  [{ lean: -5, hip: 0, drop: 3, front: 12, rear: -12, l: 0.40 }, { lean: 14, hip: 8, drop: 7, front: 20, rear: -17, l: 2.70 }, { lean: 11, hip: 6, drop: 6, front: 20, rear: -17, l: 2.80 }],
  [{ lean: -4, hip: 1, drop: 5, front: 13, rear: -12, l: 0.70 }, { lean: 11, hip: 6, drop: 4, front: 18, rear: -18, l: 2.45 }, { lean: 9, hip: 5, drop: 4, front: 18, rear: -18, l: 2.55 }],
];
const _SB_HOSE = [
  [{ lean: 3, hip: 1, drop: 5, front: 13, rear: -13, l: 0.80, ll: 0.75 }, { lean: 4, hip: 2, drop: 6, front: 14, rear: -14, l: 0.80, ll: 0.75 }, { lean: 3, hip: 2, drop: 6, front: 14, rear: -14, l: 0.80, ll: 0.75 }],
  [{ lean: 3, hip: 1, drop: 5, front: 13, rear: -13, l: 0.80, ll: 0.75 }, { lean: 4, hip: 2, drop: 6, front: 14, rear: -14, l: 0.80, ll: 0.75 }, { lean: 3, hip: 2, drop: 6, front: 14, rear: -14, l: 0.80, ll: 0.75 }],
];
const SWING_BODY_ARCH = {
  slash: _SB_SLASH, iai: _SB_SLASH, strike: _SB_SLASH,
  smash: _SB_SMASH, cleave: _SB_CLEAVE,
  sweep: _SB_SWEEP, whirl: _SB_SWEEP,
  thrust: _SB_THRUST, poke: _SB_THRUST, bash: _SB_THRUST,
  crack: _SB_CRACK, jab: _SB_JAB,
  point: _SB_POINT, aim: _SB_AIM, throw: _SB_THROW, hose: _SB_HOSE,
};
const SWING_BODY_HEAVY = { smash: 1, sweep: 1, whirl: 1 };

// Reactions start at full pose on frame 0, so the hit-stop freezes the body already taking the blow.
// lean, hip and head are written for a blow from the front and flip for one from behind.
const _SB_STAND = { w: 0, lean: 0, hip: 0, head: 0, drop: 0, front: 7, rear: -7, l: 1.32, ll: 1 };
const _SB_REACT = {
  head: [
    { t: 0, w: 1, lean: -9, hip: 3, head: -7, drop: 4, front: 11, rear: -15, l: 2.40, ll: 1 },
    { t: 6, e: 'lin', w: 1, lean: -11, hip: 4, head: -9, drop: 5, front: 11, rear: -15, l: 2.55, ll: 1 },
    { t: 24, e: 'io', ..._SB_STAND },
  ],
  gut: [
    { t: 0, w: 1, lean: 9, hip: -6, head: 4, drop: 11, front: 9, rear: -9, l: 0.90, ll: 0.7 },
    { t: 7, e: 'lin', w: 1, lean: 11, hip: -7, head: 5, drop: 12, front: 9, rear: -9, l: 0.85, ll: 0.7 },
    { t: 26, e: 'io', ..._SB_STAND },
  ],
  heavy: [
    { t: 0, w: 1, lean: -16, hip: 7, head: -10, drop: 8, front: 15, rear: -20, l: -2.20, ll: 1 },
    { t: 8, e: 'lin', w: 1, lean: -18, hip: 8, head: -11, drop: 10, front: 15, rear: -20, l: -2.35, ll: 1 },
    { t: 30, e: 'io', ..._SB_STAND },
  ],
};
const SWING_BODY_FIELDS = ['w', 'lean', 'hip', 'head', 'drop', 'front', 'rear', 'l', 'll'];
const _sbTrackCache = {};

function _swingBodyEase(e, u) {
  if (e === 'out')  return 1 - (1 - u) * (1 - u);
  if (e === 'snap') return 1 - Math.pow(1 - u, 4);
  if (e === 'io')   return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  return u;
}

// Key times follow the weapon's own swing length, so a hammer's strike lands late and a jab's lands at once.
function _sbTrack(arch, alt, dur) {
  const id = arch + (alt ? 1 : 0) + ':' + dur;
  if (_sbTrackCache[id]) return _sbTrackCache[id];
  const set = SWING_BODY_ARCH[arch][alt ? 1 : 0];
  const tLoad = Math.max(1, Math.round(dur * 0.25));
  const tStrike = Math.max(tLoad + 1, Math.round(dur * 0.7));
  const heavy = SWING_BODY_HEAVY[arch];
  const tHold = tStrike + (heavy ? 12 : 9);
  const key = (t, e, p) => Object.assign({ t, e, w: 1, head: 0, ll: 1 }, p);
  return (_sbTrackCache[id] = [
    key(tLoad, 'out', set[0]), key(tStrike, 'snap', set[1]), key(tHold, 'lin', set[2]),
    Object.assign({ t: tHold + (heavy ? 18 : 14), e: 'io' }, _SB_STAND),
  ]);
}

// Body track for a hand-keyed move (WEAPON_SWINGS moves): its keys as written, ending back at stand.
function _sbMoveTrack(mv) {
  if (mv._sbTrack) return mv._sbTrack;
  const keys = mv.body.map(k => (k.lean === undefined && k.drop === undefined)
    ? Object.assign({}, _SB_STAND, { t: k.t, e: k.e })
    : Object.assign({ w: 1, head: 0, ll: 1 }, k));
  return (mv._sbTrack = keys);
}

/** A landed hit picks a reaction. Render-only; called from dealDamage. */
function animHitReact(attacker, target, dmg, kb, guardUp) {
  if (!SWING_BODY_ON || !attacker || !target || guardUp || !(dmg > 0) || target.isBoss) return;
  const g = attacker._swingG ? attacker._swingG() : (typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[attacker.weaponKey] : null);
  const arch = g && g.archetype;
  let kind;
  if (dmg >= 26 || (kb || 0) >= 16 || arch === 'smash') kind = 'heavy';
  else if (arch === 'thrust' || arch === 'poke' || arch === 'bash') kind = 'gut';
  // Alternating with the attacker's chain, so a string of cuts doesn't play one flinch.
  else kind = attacker._sbAlt ? 'head' : 'gut';
  const front = (attacker.cx() - target.cx()) * (target.facing || 1) >= 0 ? 1 : -1;
  target._sbReact = { t0: target.animTimer || 0, track: _SB_REACT[kind], front, face: target.facing };
  target._sbSwing = target._sbCur = null;
}

function _sbSample(track, t, from) {
  let i = 0;
  while (i < track.length - 1 && track[i].t <= t) i++;
  const b = track[i];
  const a = i > 0 ? track[i - 1] : (from || _SB_STAND);
  const t0 = i > 0 ? a.t : 0;
  const k = b.t > t0 ? _swingBodyEase(b.e, Math.min(1, (t - t0) / (b.t - t0))) : 1;
  const out = {};
  for (const n of SWING_BODY_FIELDS) {
    const av = a[n] === undefined ? _SB_STAND[n] : a[n], bv = b[n] === undefined ? _SB_STAND[n] : b[n];
    out[n] = av + (bv - av) * k;
  }
  return out;
}

/** The body pose for this frame, or null. Pauses with hit-stop, since animTimer does. */
function animSwingBody(f, s) {
  if (!SWING_BODY_ON || !animHiQ() || f.isBoss) return null;
  const clock = f.animTimer || 0;
  const prevAtk = f._sbAtk || 0;
  f._sbAtk = f.attackTimer || 0;
  const g = f._swingG ? f._swingG() : (typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[f.weaponKey] : null);
  // Knight's gauntlet has no swing entry of its own; it fights like a hammer.
  const arch = g && SWING_BODY_ARCH[g.archetype] ? g.archetype : (f.charClass === 'megaknight' ? 'smash' : null);
  if (s === 'attacking' && f._sbAtk > prevAtk && (arch || (g && g.body))) {
    // A hand-keyed move brings its own body keys, timed to its own startup.
    const track = (g && g.body) ? _sbMoveTrack(g) : _sbTrack(arch, !!f._sbAlt, f.attackDuration || (g && g.dur) || 10);
    f._sbSwing = { t0: clock, track, from: f._sbCur || null, face: f.facing };
    f._sbAlt = !f._sbAlt;
    f._sbReact = null;
  }
  const r = f._sbReact;
  if (r) {
    const t = clock - r.t0;
    if (s === 'ragdoll' || s === 'dead' || s === 'attacking' || s === 'shielding' || r.face !== f.facing || t >= r.track[r.track.length - 1].t) f._sbReact = null;
    else {
      const out = _sbSample(r.track, t);
      out.lean *= r.front; out.hip *= r.front; out.head *= r.front;
      return out;
    }
  }
  const sw = f._sbSwing;
  if (!sw) return null;
  const t = clock - sw.t0;
  if (t >= sw.track[sw.track.length - 1].t || sw.face !== f.facing ||
      (s !== 'attacking' && s !== 'idle' && s !== 'walking' && s !== 'jumping' && s !== 'falling')) {
    f._sbSwing = f._sbCur = null;
    return null;
  }
  const out = _sbSample(sw.track, t, sw.from);
  f._sbCur = out;
  out.anchor = true;
  // Back to running: the follow-through hands off to the run cycle quickly.
  if (s === 'walking') {
    sw.run = (sw.run || 0) + 1;
    out.w *= Math.max(0, 1 - sw.run / 8);
  } else sw.run = 0;
  return out;
}
