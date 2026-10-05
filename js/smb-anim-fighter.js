'use strict';
// smb-anim-fighter.js — fighter model animation helpers (Phase 2 of
// docs/animation-quality-plan.md)
//
// Pure-ish helpers called from Fighter.draw(). Everything here is additive: the
// draw path keeps its existing pose branches and only swaps HOW the joints,
// feet, head and cape are derived from them. All of it is gated on
// settings.animQuality — 'classic' restores the old look exactly.
//
// Depends on: smb-anim-core.js (animEase), smb-globals.js (settings, players).
// ============================================================

/** Phase 2 model features on? 'classic' opts back out to the pre-4.0.90 rig. */
function animHiQ() {
  return typeof settings === 'undefined' || settings.animQuality !== 'classic';
}

// ── Two-bone IK ─────────────────────────────────────────────────────────────
/**
 * Solve the middle joint of a two-bone limb from the law of cosines.
 *
 * The rig previously placed elbows and knees at the segment midpoint plus a
 * CONSTANT perpendicular offset, so the bend never responded to the pose — a
 * reaching arm stayed as bent as a tucked one, which is why limbs read as
 * pre-bent sticks. Here the bend falls out of the geometry: as the hand moves
 * away from the shoulder the joint straightens on its own.
 *
 * @param bone  length of EACH of the two bones (max reach = 2 * bone)
 * @param bend  +1 / -1 — which side of the chord the joint pops out
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

// ── Foot planting ───────────────────────────────────────────────────────────
/**
 * Stride phase driven by DISTANCE TRAVELLED rather than by animTimer.
 *
 * This is the actual cause of foot skating, and it is not a tuning problem. The
 * walk cycle advances at a fixed `animTimer * 0.24` rad/frame while the body
 * moves at whatever `vx` happens to be, so the two are unrelated: at a normal
 * run the cycle is roughly three times too slow for the ground going past, and
 * every foot slides to make up the difference. Locking the foot's world X
 * cannot fix that — this rig's legs are only 27px, so a lock runs out of reach
 * in about two frames at running speed.
 *
 * Advancing the phase by 2π per stride LENGTH instead makes the feet track the
 * ground for free, with no lock and no clamp.
 *
 * Calibration: at mid-stance the foot's speed relative to the hips is
 * legLen * amp * dPhase, and no skate means that exactly cancels vx. So
 * dPhase = vx / (legLen * amp). Measured against the old rule, this cuts the
 * stance-foot slide at running speed from ~6.1 px/frame to ~2.7 (and from 3.6
 * to 1.8 at walking speed). It does not reach zero: a scissor gait's relative
 * foot speed varies as cos(phase), so it can only match vx at one point in the
 * cycle. Flattening that out needs a real stance trajectory, which is a larger
 * rig change than this phase.
 *
 * @param legLen  leg segment length in px
 * @param amp     stride amplitude in radians
 */
function animStridePhase(f, legLen, amp, fallback) {
  if (!animHiQ()) return fallback;
  if (f._stride === undefined) f._stride = 0;
  const perPx = 1 / Math.max(1, legLen * amp);
  f._stride += Math.abs(f.vx || 0) * perPx;
  if (f._stride > Math.PI * 200) f._stride -= Math.PI * 200; // keep it small
  return f._stride;
}

/** Reset the gait — call on respawn / teleport so a step never carries over. */
function animStrideReset(f) { if (f) { f._stride = 0; if (f._fp) f._fp = { r: null, l: null }; } }

/** Drop all plants — call on respawn / teleport so a foot never tethers. */
function animFootRelease(f) { animStrideReset(f); f && (f._runPh = 0); }

// ── Run cycle (reference-captured) ──────────────────────────────────────────
/**
 * The run is COPIED, not designed. Joint positions were read frame by frame off
 * a side-view treadmill capture with a marker overlay (Eastern Michigan
 * University Running Science Lab, "Slow motion running - side view": an NCAA
 * D1 athlete at 10 mph, 100 fps) — 8 frames across half a stride, the other
 * half taken from the opposite leg, one light [1,2,1] smoothing pass.
 *
 * What the reference shows that the old sine scissor could not:
 *  - the swing knee folds to ~120° and the heel comes up under the hip;
 *  - the stance leg lands only slightly ahead of the hip, bends ~40° as it
 *    loads, and is behind the hip at toe-off;
 *  - the body is HIGHEST in flight and lowest at mid-stance (two bobs per
 *    stride, ~2px at this scale);
 *  - the torso is nearly upright (~8° lean), and the elbows hold ~90–100°
 *    while the arms dwell at each end of the swing and switch quickly.
 *
 * Angles are ABSOLUTE bone directions in facing-right space (0 = right,
 * PI/2 = straight down), 16 samples per stride; phase 0 = this leg driving
 * its knee forward just after the other foot's toe-off.
 */
const RUN_MOCAP = {
  thigh: [1.004,1.117,1.205,1.27,1.36,1.448,1.573,1.691,1.806,1.934,1.955,1.881,1.692,1.363,1.06,0.952],
  shin:  [2.3,1.838,1.503,1.447,1.625,1.95,2.196,2.312,2.408,2.635,3.005,3.325,3.478,3.386,3.056,2.678],
  // Pelvis height offset in px at FIG_LEG_LEN 31 (negative = up), per 1/16.
  bob:   [-1.04,-1.62,-2.23,-1.52,-0.07,0.04,-0.54,-1.11,-1.04,-1.62,-2.23,-1.52,-0.07,0.04,-0.54,-1.11],
  thighFrac: 0.494,   // thigh / FIG_LEG_LEN  (142:129 thigh:shin in the capture)
  shinFrac:  0.449,   // puts the mid-stance ankle exactly at the idle pose's depth
  strideLegs: 2.6,    // ground covered per full cycle, in leg lengths (~80px)
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
  // Moving against facing (backpedalling) runs the cycle in reverse, or the
  // planted foot would slide at twice the body's speed.
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

// ── Overlap & drag ──────────────────────────────────────────────────────────
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
  // Capped deliberately. The head+face block gets the drag but hats do not —
  // drawAccessory anchors ~40 draws to cx and rewiring all of them to follow
  // the head is more risk than the effect is worth. At 3px a hat never visibly
  // separates, and at a full sprint the raw lag would otherwise reach ~11px.
  const v = buf[i];
  return v < -cap ? -cap : v > cap ? cap : v;
}

// ── Squash & stretch ────────────────────────────────────────────────────────
/**
 * Impact squash from knockback, on top of the rig's existing landing squash.
 * `_hitSquash` is stamped where the hit nudge is (smb-combat.js) so the scale
 * of the deformation tracks the scale of the blow.
 */
function animHitSquash(f) {
  if (!animHiQ() || !f._hitSquash || f._hitSquash.t <= 0) return null;
  const hs = f._hitSquash;
  hs.t--;
  const u = hs.t / hs.max;                      // 1 → 0
  const e = (typeof animEase !== 'undefined') ? animEase.outElastic(1 - u) : 1 - u;
  const amt = hs.amt * (1 - e);
  // axis 'x' = compressed ALONG the horizontal (slammed into a wall); the
  // default is a vertical blow, which widens the body and flattens it.
  return hs.axis === 'x' ? { x: 1 - amt, y: 1 + amt }
                         : { x: 1 + amt, y: 1 - amt };
}

// ── Eyes ────────────────────────────────────────────────────────────────────
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
  return Math.sin((p / 6) * Math.PI);     // 0 → 1 → 0 over six frames
}

// ── Cape ────────────────────────────────────────────────────────────────────
/**
 * Velocity-driven cape state. The existing cape waves on a sine of frameCount
 * and the fighter's position, so a sprint and a standstill look identical.
 * This gives it something to react to: it streams out with speed, lifts on a
 * fall, and whips through a turn because the trail direction is a lagged spring
 * rather than a hard read of `facing`.
 */
function animCapeDrive(f) {
  const base = { dir: -(f.facing || 1), sweep: 0, lift: 0 };
  if (!animHiQ()) return base;
  if (f._capeDir === undefined) f._capeDir = base.dir;
  // Lagged trail direction — the cape keeps going the old way for a few frames
  f._capeDir += (base.dir - f._capeDir) * 0.14;
  const spd = Math.max(-1, Math.min(1, (f.vx || 0) / 9));
  const fall = Math.max(-1, Math.min(1, (f.vy || 0) / 12));
  return {
    dir:   f._capeDir,
    sweep: Math.abs(spd) * 16 - Math.sign(spd) * (f.facing || 1) * spd * 4,
    lift:  -fall * 12,
  };
}
