'use strict';

// ─── Shared stickman figure ───────────────────────────────────────────────────
// Poses come from Stickman Evolution's keyframed rig (../js/smb-figure-rig.js),
// so he walks, strikes and falls the way the main game's story figures do. The
// look stays this game's own: one silhouette, value-ramped rather than keylined.

const RIG_HEIGHT = 89;   // foot to crown at scale 1, with this game's smaller head
const RIG_STRIDE = 46;   // px travelled per walk cycle at scale 1
// The rig's legs reach below its anchor; this lifts a standing figure onto the floor.
const RIG_FOOT_DROP = (() => {
  const j = FigureRig.solve(FigureRig.sample('idle', 0), 0, 0, 1, 1);
  return Math.max(j.footF.y, j.footB.y);
})();

// Joints for a rig clip at time t (frames), standing on (x, footY), h px tall.
function rigPose(state, t, x, footY, h, facing, seed) {
  const pose  = FigureRig.sample(state, t, { phase: seed || 0 }) || FigureRig.sample('idle', t);
  const scale = h / RIG_HEIGHT;
  return FigureRig.solve(pose, x, footY - RIG_FOOT_DROP * scale, scale, facing);
}

// Walk time from distance travelled, so the feet plant instead of skating.
function rigWalkTime(dist, h) {
  return dist / (RIG_STRIDE * h / RIG_HEIGHT) * FigureRig.CLIPS.walk.dur;
}

// opt: h, facing, state (a rig clip), t (frames into it), dist (px walked),
// tone, rim, alpha, seed (offsets idle loops so figures don't breathe in step).
function drawFigure(sx, by, opt) {
  const o      = opt || {};
  const h      = o.h ?? 84;
  const facing = o.facing ?? 1;
  const tone   = o.tone ?? '#1d1c1a';
  const rim    = o.rim ?? 'rgba(210,200,180,0.16)';
  const state  = o.state ?? 'idle';
  const t      = state === 'walk' ? rigWalkTime(o.dist ?? 0, h) : (o.t ?? frameCount);
  const j      = rigPose(state, t, sx, by, h, facing, o.seed);
  const u      = j.scale;

  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;

  // Contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(sx, by + 2, 13 * u, 3.4 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = tone;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // Far limbs, torso, near limbs
  ctx.lineWidth = 4.4 * u; _bone(j.hip, j.kneeB, j.footB);
  ctx.lineWidth = 3.8 * u; _bone(j.shoulder, j.elbowB, j.handB);
  ctx.lineWidth = 5.8 * u; _bone(j.hip, j.neck);
  ctx.lineWidth = 4.4 * u; _bone(j.hip, j.kneeF, j.footF);

  // Head sits on the neck along the spine line
  const headR = 7.5 * u;
  const dx = j.head.x - j.neck.x, dy = j.head.y - j.neck.y;
  const dl = Math.hypot(dx, dy) || 1;
  const hx = j.neck.x + dx / dl * headR * 0.9;
  const hy = j.neck.y + dy / dl * headR * 0.9;
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.arc(hx, hy, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 3.8 * u; _bone(j.shoulder, j.elbowF, j.handF);

  // Rim light down the leading edge
  ctx.strokeStyle = rim;
  ctx.lineWidth   = 1.4 * u;
  const off = 2.6 * u * facing;
  ctx.beginPath();
  ctx.moveTo(j.neck.x + off, j.neck.y + 2 * u);
  ctx.lineTo(j.hip.x + off, j.hip.y);
  ctx.stroke();
  const a0 = facing > 0 ? -1.1 : Math.PI - 0.5;
  ctx.beginPath();
  ctx.arc(hx, hy, headR - 0.7, a0, a0 + 1.6);
  ctx.stroke();

  ctx.restore();
  return j;
}

function _bone(a, b, c) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  if (c) ctx.lineTo(c.x, c.y);
  ctx.stroke();
}
