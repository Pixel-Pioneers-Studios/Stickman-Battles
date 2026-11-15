'use strict';

// ─── Rigged figures ───────────────────────────────────────────────────────────
// Poses come from Stickman Evolution's keyframed rig (../js/smb-figure-rig.js),
// so everyone here walks, strikes and falls the way the main game's story
// figures do. The look stays this game's own: skin-toned heads, coloured bodies.

// px travelled per run cycle at scale 1. Longer than the pose's true stride: at
// this game's speeds an exact match cycles the legs too fast to read.
const RIG_RUN_STRIDE = 100;
// The rig's legs reach below its anchor, and its neck sits this far above the feet.
const RIG_FOOT_DROP = (() => {
  const j = FigureRig.solve(FigureRig.sample('idle', 0), 0, 0, 1, 1);
  return Math.max(j.footF.y, j.footB.y);
})();
const RIG_NECK_HEIGHT = (() => {
  const j = FigureRig.solve(FigureRig.sample('idle', 0), 0, 0, 1, 1);
  return RIG_FOOT_DROP - j.neck.y;
})();

// Joints for a rig clip at time t (frames). The figure stands on (x, footY) and is
// h px tall from foot to crown with a head of radius headR.
function rigPose(state, t, x, footY, h, headR, facing, seed) {
  const pose  = FigureRig.sample(state, t, { phase: seed || 0 }) || FigureRig.sample('idle', t);
  const scale = (h - headR * 1.9) / RIG_NECK_HEIGHT;
  return FigureRig.solve(pose, x, footY - RIG_FOOT_DROP * scale, scale, facing);
}

// Run time from distance travelled, so the feet plant instead of skating.
// Call once per drawn frame; it advances the entity's own distance counter.
function rigRunTime(ent, scale) {
  if (hitStopFrames <= 0) ent._rigDist = (ent._rigDist || 0) + Math.abs(ent.vx);
  return (ent._rigDist || 0) / (RIG_RUN_STRIDE * scale) * FigureRig.CLIPS.run.dur;
}

// Rig clip for a light strike, from 0 (start) to 1 (recovered).
function rigStrikeTime(p) { return 20 + clamp(p, 0, 1) * 20; }

// Draws the body and returns where the head landed.
// o: headR, skin, line (head outline), body (torso), limbs, limbW, torsoW, eye, white,
//    edge (outline colour; the bodies are near-black and the streets are dark).
function drawRigFigure(j, o) {
  const white = o.white;
  ctx.save();
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  const limb = (a, b, c, col, w) => {
    ctx.strokeStyle = white ? '#ffffff' : col;
    ctx.lineWidth   = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
  };
  const lw = o.limbW ?? 2.5, tw = o.torsoW ?? 3;

  // Head position first: the outline pass needs it
  const r  = o.headR;
  const dx = j.head.x - j.neck.x, dy = j.head.y - j.neck.y;
  const dl = Math.hypot(dx, dy) || 1;
  const hx = j.neck.x + dx / dl * r * 0.9;
  const hy = j.neck.y + dy / dl * r * 0.9;

  // Outline pass: every bone and the head, wider, underneath
  if (!white) {
    const edge = o.edge ?? '#6b665c', ew = 2.6;
    limb(j.hip, j.kneeB, j.footB, edge, lw + ew);
    limb(j.hip, j.kneeF, j.footF, edge, lw + ew);
    limb(j.shoulder, j.elbowB, j.handB, edge, lw + ew);
    limb(j.shoulder, j.elbowF, j.handF, edge, lw + ew);
    ctx.strokeStyle = edge;
    ctx.lineWidth   = tw + ew;
    ctx.beginPath();
    ctx.moveTo(j.hip.x, j.hip.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.arc(hx, hy, r + ew / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  limb(j.hip, j.kneeB, j.footB, o.limbs, lw);
  limb(j.shoulder, j.elbowB, j.handB, o.limbs, lw);

  ctx.strokeStyle = white ? '#ffffff' : o.body;
  ctx.lineWidth   = tw;
  ctx.beginPath();
  ctx.moveTo(j.hip.x, j.hip.y);
  ctx.lineTo(j.neck.x, j.neck.y);
  ctx.stroke();

  limb(j.hip, j.kneeF, j.footF, o.limbs, lw);

  // Head sits on the neck along the spine line
  ctx.fillStyle   = white ? '#ffffff' : o.skin;
  ctx.strokeStyle = white ? '#ffffff' : (o.line ?? '#111');
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (o.eye !== false) {
    ctx.fillStyle = white ? '#aaaaaa' : '#111';
    ctx.beginPath();
    ctx.arc(hx + j.facing * r * 0.42, hy - r * 0.05, Math.max(1.5, r * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  limb(j.shoulder, j.elbowF, j.handF, o.limbs, lw);

  ctx.restore();
  return { x: hx, y: hy, r };
}
