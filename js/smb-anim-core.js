'use strict';
// smb-anim-core.js — shared animation substrate (Phase 0 of docs/animation-quality-plan.md)
//
// Pure helpers + small stateful classes used by the death animation, the fighter
// model upgrade, finishers, domain entry and chapter transitions. Nothing here
// mutates game globals except animHold(), which raises the existing hitStopFrames.
//
// Depends on: smb-globals.js (settings, hitStopFrames), smb-particles-core.js
//             (spawnParticles) — both loaded earlier. Every call site guards.
// ============================================================

// ── Easing / curve library ──────────────────────────────────────────────────
// Anticipation and overshoot are the single largest perceptual difference
// between "lerped" and "animated". Nothing in the codebase overshoots without
// these.
const animEase = {
  linear:    t => t,
  inQuad:    t => t * t,
  outQuad:   t => t * (2 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic:   t => t * t * t,
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  inOutQuint:t => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo:   t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo:    t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),

  /** Overshoots past 1 then settles. s = overshoot strength (1.70158 ≈ 10%). */
  outBack(t, s = 1.70158) {
    const c3 = s + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  },
  /** Springy settle — good for barrier walls, name cards, snap-to poses. */
  outElastic(t, p = 0.35) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (Math.PI * 2) / p) + 1;
  },
  /** Dips BELOW 0 before rising — the wind-up curve. amt = dip depth (0..1). */
  anticipate(t, amt = 0.22) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    if (t < 0.3) return -amt * Math.sin((t / 0.3) * Math.PI);
    const u = (t - 0.3) / 0.7;
    return animEase.outBack(u);
  },
};

/** Angle-aware lerp (takes the short way round). */
function animLerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI)  d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// ── Reusable spring ─────────────────────────────────────────────────────────
// So systems stop hand-rolling `vel += (target-cur)*k; vel *= d`.
class AnimSpring {
  constructor(value = 0, stiffness = 0.18, damping = 0.82) {
    this.value     = value;
    this.target    = value;
    this.vel       = 0;
    this.stiffness = stiffness;
    this.damping   = damping;
  }
  set(v)  { this.value = v; this.target = v; this.vel = 0; return this; }
  to(v)   { this.target = v; return this; }
  kick(v) { this.vel += v; return this; }
  step(scale = 1) {
    this.vel   += (this.target - this.value) * this.stiffness * scale;
    this.vel   *= this.damping;
    this.value += this.vel * scale;
    if (!isFinite(this.value)) { this.value = this.target; this.vel = 0; }
    return this.value;
  }
  /** True once the spring has effectively arrived. */
  settled(eps = 0.001) {
    return Math.abs(this.target - this.value) < eps && Math.abs(this.vel) < eps;
  }
}

// ── Motion smear ────────────────────────────────────────────────────────────
/**
 * Draw `drawFn` several times along a motion path at falling alpha.
 * This is the "Animator vs. Animation" signature: fast limbs become streaks,
 * not blurs. drawFn(offsetX, offsetY, alpha, i) draws one sample; it is
 * responsible for its own path — the offsets are applied via ctx.translate.
 */
function animSmear(drawFn, fromX, fromY, toX, toY, samples = 4, alpha = 0.42) {
  if (typeof ctx === 'undefined' || typeof drawFn !== 'function') return;
  if (typeof settings !== 'undefined' && settings.particles === false) { drawFn(0, 0, 1, samples); return; }
  const n = Math.max(2, Math.min(8, samples | 0));
  for (let i = 0; i < n; i++) {
    const u  = i / n;                       // 0 = oldest sample
    const ox = fromX + (toX - fromX) * u;
    const oy = fromY + (toY - fromY) * u;
    const a  = alpha * (u * u);             // trailing ghosts fade fastest
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(ox, oy);
    drawFn(ox, oy, a, i);
    ctx.restore();
  }
  // The head of the smear is the real, fully-opaque figure
  drawFn(toX, toY, 1, n);
}

// ── Impact holds ────────────────────────────────────────────────────────────
/**
 * Named "hold on the impact pose" built on the existing hitStopFrames
 * vocabulary (smb-combat.js). Never lowers an in-flight hold.
 */
function animHold(frames) {
  if (typeof hitStopFrames === 'undefined') return;
  const f = Math.max(0, Math.min(30, frames | 0));
  if (f > hitStopFrames) hitStopFrames = f;
}

// ── Arcs ────────────────────────────────────────────────────────────────────
/**
 * Quadratic arc interpolation between two points. Straight-line limb travel is
 * the other cheap-animation tell; real animation moves on arcs.
 * `sag` is perpendicular offset in px at the midpoint (positive = "below" the
 * chord in screen space, following the travel direction's right-hand normal).
 */
function animArc(p, from, to, sag = 0) {
  const t  = Math.max(0, Math.min(1, p));
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Control point = midpoint pushed along the chord normal
  const mx = (from.x + to.x) / 2 - (dy / len) * sag;
  const my = (from.y + to.y) / 2 + (dx / len) * sag;
  const it = 1 - t;
  return {
    x: it * it * from.x + 2 * it * t * mx + t * t * to.x,
    y: it * it * from.y + 2 * it * t * my + t * t * to.y,
  };
}

// ── Ground contact ──────────────────────────────────────────────────────────
/** Dust puff at a ground contact point, routed through the existing pool. */
function animDust(x, y, dir = 0, count = 8, color = 'rgba(190,180,160,0.9)') {
  if (typeof spawnParticles !== 'function') return;
  if (typeof settings !== 'undefined' && !settings.particles) return;
  spawnParticles(x, y, color, Math.max(1, count | 0));
  // A second, tighter burst biased in the travel direction reads as a scuff
  if (dir) spawnParticles(x + dir * 8, y - 2, color, Math.max(1, (count / 2) | 0));
}

/** Low, wide scuff — sliding/skidding contact rather than an impact. */
function animScuff(x, y, dir = 1, count = 5) {
  animDust(x + dir * 6, y, dir, count, 'rgba(170,165,150,0.75)');
}

// ── Small utilities used by the animation layers ─────────────────────────────
/** Clamp helper that is safe before smb-combat.js's clamp() exists. */
function animClamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** Sample an eased 0..1 through a named animEase key, with fallback. */
function animCurve(name, t, ...args) {
  const fn = animEase[name];
  return typeof fn === 'function' ? fn(animClamp(t, 0, 1), ...args) : animClamp(t, 0, 1);
}
