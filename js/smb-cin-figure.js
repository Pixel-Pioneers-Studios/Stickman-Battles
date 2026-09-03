'use strict';
// smb-cin-figure.js — deformable cinematic figure + keyframe/hold/spacing track.
//
// WHY THIS IS SEPARATE FROM Fighter.draw()
// Fighter.draw() has a contract: hitboxes, weapon anchors, accessories, shields
// and a dozen other systems read positions off it, so its bones are fixed
// lengths and the body never leaves the vertical. That is exactly what stops it
// looking hand-animated. Nothing reads off a cinematic figure, so here a limb
// may stretch to 3x, a body may compress to 40% height for two frames, and the
// whole figure may rotate freely — the shape violations that separate drawn
// animation from interpolated parameters.
//
// Provides:
//   CIN_POSE      — the pose schema + defaults
//   CinRig.draw   — render one pose
//   CinRig.joints — resolve a pose to world joint positions (for measurement)
//   CinTrack      — keyframes with explicit HOLDS and per-segment easing
//   CinRig.smear  — a swept smear SHAPE, not alpha ghosts
//   CinRig.spacing / CinRig.arc — diagnostics; animation is verified by
//                   measuring spacing charts, not by eyeballing stills
//
// Depends on: smb-anim-core.js (animEase). Canvas-agnostic — every entry point
// takes an explicit ctx, so it renders to the game canvas or an offscreen one.
// ============================================================

// ── Pose schema ─────────────────────────────────────────────────────────────
// Angles are canvas convention: 0 = +X (right), PI/2 = +Y (down).
// Every *Len is a MULTIPLIER on the base bone length; every *W multiplies line
// width. Those two families are what make the drawing deformable.
const CIN_POSE = {
  x: 0, y: 0,              // feet anchor
  rot: 0,                  // whole-body rotation about the hips
  scale: 1,
  sx: 1, sy: 1,            // squash / stretch about the feet
  facing: 1,
  alpha: 1,

  torso: 0,                // lean, radians (+ = leaning along facing)
  headTilt: 0,
  headScale: 1,
  headOff: 0,              // head x offset in px (drag / overlap)

  // Upper arm then forearm, each an ABSOLUTE angle so a pose may hyperextend
  rArm: Math.PI * 0.58, rFore: Math.PI * 0.58,
  lArm: Math.PI * 0.42, lFore: Math.PI * 0.42,
  rLeg: Math.PI * 0.56, rShin: Math.PI * 0.56,
  lLeg: Math.PI * 0.44, lShin: Math.PI * 0.44,

  rArmLen: 1, lArmLen: 1, rLegLen: 1, lLegLen: 1,
  rArmW: 1, lArmW: 1, rLegW: 1, lLegW: 1,
  torsoW: 1,
};

const CIN_BONE = { arm: 15, fore: 15, thigh: 17, shin: 17, torso: 34, headR: 13 };

/** Fill in every missing field of a partial pose. */
function cinPose(p) {
  const out = {};
  for (const k in CIN_POSE) out[k] = (p && p[k] !== undefined) ? p[k] : CIN_POSE[k];
  return out;
}

/** Same colour at zero alpha — for gradient stops that must fade to nothing. */
function cinFade(color) {
  if (typeof color !== 'string') return 'rgba(0,0,0,0)';
  const m = color.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(',').map(v => v.trim());
    return `rgba(${p[0]},${p[1]},${p[2]},0)`;
  }
  const h = color.replace('#', '');
  if (h.length === 3) {
    return `rgba(${parseInt(h[0] + h[0], 16)},${parseInt(h[1] + h[1], 16)},${parseInt(h[2] + h[2], 16)},0)`;
  }
  if (h.length >= 6) {
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},0)`;
  }
  return 'rgba(0,0,0,0)';
}

const CinRig = {

  BASE: CIN_BONE,

  /**
   * Resolve a pose to world joint positions. Everything else (draw, smear,
   * measurement) goes through this, so a diagnostic can never disagree with
   * what was drawn.
   */
  joints(pose) {
    const p = cinPose(pose);
    const B = CIN_BONE, s = p.scale, f = p.facing;
    const hipY  = p.y - B.thigh * s - B.shin * s;
    const hipX  = p.x;
    const shX   = hipX + Math.sin(p.torso) * B.torso * s * f;
    const shY   = hipY - Math.cos(p.torso) * B.torso * s;
    const neckX = shX, neckY = shY - 6 * s;
    const headX = neckX + p.headOff * s + Math.sin(p.headTilt) * B.headR * s;
    const headY = neckY - B.headR * s;

    const limb = (ox, oy, a1, a2, l1, l2, mult) => {
      const jx = ox + Math.cos(a1) * l1 * s * mult;
      const jy = oy + Math.sin(a1) * l1 * s * mult;
      return { j: { x: jx, y: jy },
               e: { x: jx + Math.cos(a2) * l2 * s * mult,
                    y: jy + Math.sin(a2) * l2 * s * mult } };
    };
    const rA = limb(shX, shY, p.rArm, p.rFore, B.arm, B.fore, p.rArmLen);
    const lA = limb(shX, shY, p.lArm, p.lFore, B.arm, B.fore, p.lArmLen);
    const rL = limb(hipX, hipY, p.rLeg, p.rShin, B.thigh, B.shin, p.rLegLen);
    const lL = limb(hipX, hipY, p.lLeg, p.lShin, B.thigh, B.shin, p.lLegLen);

    return {
      pose: p,
      hip: { x: hipX, y: hipY }, shoulder: { x: shX, y: shY },
      neck: { x: neckX, y: neckY }, head: { x: headX, y: headY },
      headR: B.headR * s * p.headScale,
      rElbow: rA.j, rHand: rA.e, lElbow: lA.j, lHand: lA.e,
      rKnee: rL.j, rFoot: rL.e, lKnee: lL.j, lFoot: lL.e,
    };
  },

  /**
   * Draw one pose. `opts.width` is the base line width; per-limb *W multipliers
   * scale it. Bones are drawn as tapered capsules so a smear can thin toward
   * its trailing edge — a uniform stroke cannot.
   */
  draw(ctx, pose, color, opts) {
    const o = opts || {};
    const J = CinRig.joints(pose);
    const p = J.pose;
    const w = (o.width || 4.5) * p.scale;

    ctx.save();
    ctx.globalAlpha = (o.alpha !== undefined ? o.alpha : 1) * p.alpha;
    // Whole-body rotation + squash about the hips / feet respectively
    if (p.rot) { ctx.translate(J.hip.x, J.hip.y); ctx.rotate(p.rot); ctx.translate(-J.hip.x, -J.hip.y); }
    if (p.sx !== 1 || p.sy !== 1) {
      ctx.translate(p.x, p.y); ctx.scale(p.sx, p.sy); ctx.translate(-p.x, -p.y);
    }
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.glow) { ctx.shadowColor = o.glow === true ? color : o.glow; ctx.shadowBlur = o.glowBlur || 10; }

    const bone = (a, b, wa, wb) => CinRig._capsule(ctx, a, b, wa, wb);

    // Legs first so the torso and arms read in front
    bone(J.hip, J.rKnee, w * p.rLegW, w * p.rLegW * 0.92);
    bone(J.rKnee, J.rFoot, w * p.rLegW * 0.92, w * p.rLegW * 0.78);
    bone(J.hip, J.lKnee, w * p.lLegW, w * p.lLegW * 0.92);
    bone(J.lKnee, J.lFoot, w * p.lLegW * 0.92, w * p.lLegW * 0.78);
    // Torso
    bone(J.neck, J.hip, w * p.torsoW * 1.05, w * p.torsoW);
    // Arms
    bone(J.shoulder, J.lElbow, w * p.lArmW, w * p.lArmW * 0.9);
    bone(J.lElbow, J.lHand, w * p.lArmW * 0.9, w * p.lArmW * 0.72);
    bone(J.shoulder, J.rElbow, w * p.rArmW, w * p.rArmW * 0.9);
    bone(J.rElbow, J.rHand, w * p.rArmW * 0.9, w * p.rArmW * 0.72);
    // Head
    ctx.beginPath();
    ctx.ellipse(J.head.x, J.head.y, J.headR, J.headR * (o.headSquash || 1), p.headTilt, 0, Math.PI * 2);
    ctx.fill();
    if (o.face !== false) CinRig._face(ctx, J, p, o);
    ctx.restore();
    return J;
  },

  /** Tapered capsule between two points — the deformable bone primitive. */
  _capsule(ctx, a, b, wa, wb) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.01) return;
    const nx = -dy / d, ny = dx / d;
    const ra = Math.max(0.4, wa * 0.5), rb = Math.max(0.4, wb * 0.5);
    ctx.beginPath();
    ctx.moveTo(a.x + nx * ra, a.y + ny * ra);
    ctx.lineTo(b.x + nx * rb, b.y + ny * rb);
    ctx.arc(b.x, b.y, rb, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    ctx.lineTo(a.x - nx * ra, a.y - ny * ra);
    ctx.arc(a.x, a.y, ra, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    ctx.closePath();
    ctx.fill();
  },

  /** Minimal expressive face — eyes + brow + mouth, driven by opts.expr. */
  _face(ctx, J, p, o) {
    const f = p.facing, R = J.headR;
    const ex = J.head.x + f * R * 0.34, ey = J.head.y - R * 0.12;
    const e2x = J.head.x - f * R * 0.14;
    const expr = o.expr || 'neutral';
    if (o.blink) {
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 1.7; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(ex - R * 0.2, ey); ctx.lineTo(ex + R * 0.2, ey);
      ctx.moveTo(e2x - R * 0.18, ey); ctx.lineTo(e2x + R * 0.18, ey); ctx.stroke();
      return;
    }
    const sb = ctx.shadowBlur; ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, R * 0.20, 0, Math.PI * 2);
    ctx.arc(e2x, ey, R * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = expr === 'hurt' ? '#e03030' : '#111';
    const lx = (o.look && o.look.x || 0) * R * 0.09, ly = (o.look && o.look.y || 0) * R * 0.07;
    ctx.beginPath();
    ctx.arc(ex + f * R * 0.05 + lx, ey + ly, R * 0.10, 0, Math.PI * 2);
    ctx.arc(e2x + f * R * 0.045 + lx, ey + ly, R * 0.085, 0, Math.PI * 2);
    ctx.fill();
    // Brow — the single strongest expression cue on a stick figure
    const browIn = expr === 'angry' || expr === 'intense' ? 1.7
                 : expr === 'hurt' || expr === 'afraid' ? -1.7 : 0;
    if (browIn) {
      ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ex + f * R * 0.26, ey - R * 0.36 - browIn * 0.4);
      ctx.lineTo(ex - f * R * 0.24, ey - R * 0.36 + browIn);
      ctx.moveTo(e2x + f * R * 0.20, ey - R * 0.34 - browIn * 0.3);
      ctx.lineTo(e2x - f * R * 0.18, ey - R * 0.34 + browIn * 0.7);
      ctx.stroke();
    }
    ctx.shadowBlur = sb;
  },

  /**
   * A real smear: one filled shape swept through the interpolated poses of a
   * limb, tapering and fading toward the trailing edge. Ghosting the same limb
   * at falling alpha (what smb-anim-core's animSmear does for gameplay) reads
   * as motion blur; this reads as a drawn smear frame.
   *
   * @param limb 'rArm' | 'lArm' | 'rLeg' | 'lLeg'
   * @param band how much of the limb's outer end sweeps the shape, 0..1.
   *        Sweeping the WHOLE limb from the root produces a fan that swallows
   *        the torso and head; a real smear is a thin crescent following the
   *        tip's arc.
   */
  smear(ctx, poseA, poseB, limb, color, samples, band) {
    const n = Math.max(3, Math.min(12, samples || 6));
    const tipKey  = { rArm: 'rHand', lArm: 'lHand', rLeg: 'rFoot', lLeg: 'lFoot' }[limb];
    const midKey  = { rArm: 'rElbow', lArm: 'lElbow', rLeg: 'rKnee', lLeg: 'lKnee' }[limb];
    const rootKey = (limb === 'rArm' || limb === 'lArm') ? 'shoulder' : 'hip';
    if (!tipKey) return;
    const bw = (band === undefined ? 0.5 : band);
    const tips = [], inner = [];
    for (let i = 0; i < n; i++) {
      const J = CinRig.joints(cinLerpPose(poseA, poseB, i / (n - 1)));
      const tp = J[tipKey], md = J[midKey];
      tips.push(tp);
      // Inner edge sits partway back toward the mid joint, so the shape is a
      // crescent along the tip's path rather than a fan off the shoulder.
      inner.push({ x: tp.x + (md.x - tp.x) * bw, y: tp.y + (md.y - tp.y) * bw });
    }
    ctx.save();
    ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(tips[0].x, tips[0].y, tips[n - 1].x, tips[n - 1].y);
    // Fade to a TRANSPARENT version of the same colour. Fading to transparent
    // white washes the trailing edge grey against a dark scene.
    g.addColorStop(0, cinFade(color));
    g.addColorStop(0.45, cinFade(color));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(tips[0].x, tips[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(tips[i].x, tips[i].y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  // ── Diagnostics ───────────────────────────────────────────────────────────
  /**
   * Per-frame travel of one joint across a track. This is a spacing chart: an
   * animator draws these by hand to check that an action eases rather than
   * running at constant velocity. Constant spacing is the signature of
   * interpolation; real animation accelerates and decelerates.
   */
  spacing(track, jointName, from, to) {
    const out = [];
    let prev = null;
    for (let f = from; f <= to; f++) {
      const j = CinRig.joints(track.sample(f))[jointName];
      if (prev) out.push(+Math.hypot(j.x - prev.x, j.y - prev.y).toFixed(2));
      prev = j;
    }
    return out;
  },

  /**
   * How far a joint's path bows off the straight line between its endpoints.
   * Straight-line limb travel is the other tell — real motion moves on arcs.
   * Returns peak perpendicular deviation in px.
   */
  arc(track, jointName, from, to) {
    const pts = [];
    for (let f = from; f <= to; f++) pts.push(CinRig.joints(track.sample(f))[jointName]);
    if (pts.length < 3) return 0;
    const a = pts[0], b = pts[pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    let peak = 0;
    for (const pt of pts) {
      const dev = Math.abs((pt.x - a.x) * dy - (pt.y - a.y) * dx) / d;
      if (dev > peak) peak = dev;
    }
    return +peak.toFixed(2);
  },
};

/** Linear blend of two poses, field by field. */
function cinLerpPose(a, b, u) {
  const pa = cinPose(a), pb = cinPose(b), out = {};
  for (const k in CIN_POSE) out[k] = pa[k] + (pb[k] - pa[k]) * u;
  out.facing = u < 0.5 ? pa.facing : pb.facing;   // facing must not interpolate
  return out;
}

// ── Keyframe track with real holds ──────────────────────────────────────────
/**
 * Keys are `{ at, hold, ease, pose }` in frames.
 *
 *   at    — frame the key lands on
 *   hold  — frames to SIT on this pose before moving to the next. This is the
 *           single most important field: an interpolated action never stops,
 *           and stopping is what makes a beat read. Nothing in the existing
 *           cinematic system can express a hold.
 *   ease  — name in animEase, or a function, applied over the segment AFTER
 *           the hold. Per-segment, so one action can snap out and settle in.
 */
class CinTrack {
  constructor(keys) {
    this.keys = (keys || []).slice().sort((a, b) => a.at - b.at);
  }
  get duration() {
    if (!this.keys.length) return 0;
    const last = this.keys[this.keys.length - 1];
    return last.at + (last.hold || 0);
  }
  sample(frame) {
    const K = this.keys;
    if (!K.length) return cinPose({});
    if (frame <= K[0].at) return cinPose(K[0].pose);
    for (let i = 0; i < K.length - 1; i++) {
      const k = K[i], nx = K[i + 1];
      if (frame >= nx.at) continue;
      const hold = k.hold || 0;
      if (frame < k.at + hold) return cinPose(k.pose);      // sit on the pose
      const span = (nx.at - k.at - hold);
      if (span <= 0) return cinPose(nx.pose);
      let u = (frame - k.at - hold) / span;
      u = Math.max(0, Math.min(1, u));
      const e = k.ease;
      if (typeof e === 'function') u = e(u);
      else if (typeof e === 'string' && typeof animEase !== 'undefined' && animEase[e]) u = animEase[e](u);
      return cinLerpPose(k.pose, nx.pose, u);
    }
    return cinPose(K[K.length - 1].pose);
  }
}
