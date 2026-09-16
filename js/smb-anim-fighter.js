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
function animFootRelease(f) { animStrideReset(f); }

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
