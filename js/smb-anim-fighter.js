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
