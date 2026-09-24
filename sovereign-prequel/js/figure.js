'use strict';

// ─── Shared stickman figure ───────────────────────────────────────────────────
// One silhouette, value-ramped rather than keylined (matches the main game's
// grounded art direction). Bone angles are absolute, facing right; mirroring is
// done by the caller flipping the x scale, not by negating angles.

function drawFigure(sx, by, opt) {
  const o       = opt || {};
  const h       = o.h ?? 84;
  const facing  = o.facing ?? 1;
  const phase   = o.phase ?? 0;       // gait phase, radians
  const moving  = o.moving ?? false;
  const tone    = o.tone ?? '#1d1c1a';
  const rim     = o.rim ?? 'rgba(210,200,180,0.16)';
  const alpha   = o.alpha ?? 1;

  const u       = h / 84;             // unit scale
  const hipY    = by - 34 * u;
  const shY     = by - 60 * u;
  const headR   = 7.5 * u;
  const headY   = shY - 10 * u;

  const swing   = moving ? Math.sin(phase) : 0;
  const bob     = moving ? Math.abs(Math.cos(phase)) * 1.6 * u : 0;
  // Idle needs a STANCE. With every limb offset driven only by `swing`, a
  // standing figure collapses into one vertical line and reads as a post.
  const idle    = moving ? 0 : 1;
  const breath  = idle * Math.sin(frameCount * 0.032) * 0.7 * u;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, -bob);
  ctx.scale(facing, 1);

  // Contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, by + bob + 2, 13 * u, 3.4 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = tone;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  const shYb = shY + breath;

  // Legs — lead leg forward, trailing leg back, even at rest
  ctx.lineWidth = 5.4 * u;
  _limb(0, hipY,  7 * u * swing + 2.6 * u * idle, by, -6 * u * swing + 4.4 * u * idle);
  _limb(0, hipY, -7 * u * swing - 1.8 * u * idle, by,  6 * u * swing - 3.8 * u * idle);

  // Torso
  ctx.lineWidth = 6.4 * u;
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(1.2 * u, shYb);
  ctx.stroke();

  // Arms — hang slightly off the body line at rest
  ctx.lineWidth = 4.6 * u;
  _limb(1.2 * u, shYb, -6 * u * swing - 2.6 * u * idle, shYb + 26 * u, -3 * u * swing - 3.4 * u * idle);
  _limb(1.2 * u, shYb,  6 * u * swing + 3.0 * u * idle, shYb + 26 * u,  3 * u * swing + 4.0 * u * idle);

  // Head
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.arc(1.6 * u, headY + breath, headR, 0, Math.PI * 2);
  ctx.fill();

  // Rim light down the leading edge
  ctx.strokeStyle = rim;
  ctx.lineWidth   = 1.4 * u;
  ctx.beginPath();
  ctx.moveTo(4 * u, shYb + 2 * u);
  ctx.lineTo(3.2 * u, hipY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1.6 * u, headY + breath, headR - 0.7, -1.1, 0.5);
  ctx.stroke();

  ctx.restore();
}

function _limb(x0, y0, dxMid, yEnd, dxEnd) {
  const midY = (y0 + yEnd) / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + dxMid, midY);
  ctx.lineTo(x0 + dxEnd, yEnd);
  ctx.stroke();
}
