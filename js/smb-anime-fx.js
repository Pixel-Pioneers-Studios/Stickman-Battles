'use strict';
// smb-anime-fx.js — Anime-style cinematic effect utilities (AniFX)
// Depends on: smb-globals.js (canvas, GAME_W, GAME_H, camXCur, camYCur, camZoomCur)
// Loaded after smb-cinematics-core.js, before smb-cinematics-boss-thresh.js

// ── World-to-screen coordinate helper (no shake component) ────────────────────
function _cinWorldToScreen(wx, wy) {
  const sc = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * camZoomCur;
  return {
    x: wx * sc + (canvas.width  / 2 - camXCur * sc),
    y: wy * sc + (canvas.height / 2 - camYCur * sc),
  };
}

// Stickman silhouette for afterimage rendering (screen-space coords, sy = foot)
function _drawAfterSilhouette(rctx, sx, sy, sc, color) {
  const headR  = FIG_HEAD_R * sc;
  const neckL  = 5  * sc;
  const bodyL  = 30 * sc;
  const footY  = sy;
  const hipY   = footY - bodyL - neckL;
  const headCY = hipY - neckL - headR;

  rctx.save();
  rctx.strokeStyle = color;
  rctx.fillStyle   = color;
  rctx.lineWidth   = Math.max(1, 2 * sc);
  rctx.lineCap     = 'round';

  rctx.beginPath();
  rctx.arc(sx, headCY, headR, 0, Math.PI * 2);
  rctx.fill();

  rctx.beginPath();
  rctx.moveTo(sx, headCY + headR);
  rctx.lineTo(sx, footY);
  rctx.stroke();

  const elbowY = hipY + bodyL * 0.4;
  rctx.beginPath();
  rctx.moveTo(sx - 14 * sc, elbowY - 12 * sc);
  rctx.lineTo(sx,            elbowY);
  rctx.lineTo(sx + 14 * sc, elbowY - 12 * sc);
  rctx.stroke();

  rctx.beginPath();
  rctx.moveTo(sx, footY - 2 * sc);
  rctx.lineTo(sx - 10 * sc, footY + 22 * sc);
  rctx.moveTo(sx, footY - 2 * sc);
  rctx.lineTo(sx + 10 * sc, footY + 22 * sc);
  rctx.stroke();

  rctx.restore();
}

// Parse #rrggbb hex → [r, g, b] integers
function _aniFxHexToRgb(hex) {
  const n = parseInt((hex || '#ffffff').replace('#', ''), 16);
  return isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}


// ── AniFX — anime-style screen-space effect library ────────────────────────────
// All functions receive rctx (the canvas 2D context in identity/screen-space transform).
// Entity positions are world-space and converted internally via _cinWorldToScreen().

const AniFX = {

  // Radial speed lines emanating outward from a world-space entity center.
  // opts: count, minLen, maxLen, color, alpha, gap, lw
  speedLines(rctx, entity, opts = {}) {
    if (!entity) return;
    const s       = _cinWorldToScreen(entity.cx(), entity.cy ? entity.cy() : entity.y);
    const count   = opts.count  || 60;
    const minLen  = opts.minLen || 40;
    const maxLen  = opts.maxLen || 160;
    const color   = opts.color  || '#ffffff';
    const alpha   = opts.alpha  || 0.55;
    const gap     = opts.gap    || 22;
    const lw      = opts.lw     || 1.5;

    rctx.save();
    rctx.strokeStyle = color;
    rctx.lineWidth   = lw;
    rctx.lineCap     = 'butt';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const len   = minLen + Math.random() * (maxLen - minLen);
      const g     = gap + Math.random() * 14;
      rctx.globalAlpha = alpha * (0.35 + Math.random() * 0.65);
      rctx.beginPath();
      rctx.moveTo(s.x + Math.cos(angle) * g,         s.y + Math.sin(angle) * g);
      rctx.lineTo(s.x + Math.cos(angle) * (g + len), s.y + Math.sin(angle) * (g + len));
      rctx.stroke();
    }
    rctx.restore();
  },

  // Full-screen convergence lines radiating outward from a canvas center point.
  // opts: cx, cy, count, color, alpha, lw
  screenSpeedLines(rctx, opts = {}) {
    const W     = canvas.width, H = canvas.height;
    const cx    = opts.cx !== undefined ? opts.cx : W / 2;
    const cy    = opts.cy !== undefined ? opts.cy : H / 2;
    const count = opts.count || 70;
    const color = opts.color || '#ffffff';
    const alpha = opts.alpha || 0.15;
    const lw    = opts.lw   || 1;
    const reach = Math.hypot(W, H);

    rctx.save();
    rctx.strokeStyle = color;
    rctx.lineWidth   = lw;
    rctx.lineCap     = 'butt';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      rctx.globalAlpha = alpha * (0.3 + Math.random() * 0.7);
      rctx.beginPath();
      rctx.moveTo(cx + Math.cos(angle) * 6,     cy + Math.sin(angle) * 6);
      rctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
      rctx.stroke();
    }
    rctx.restore();
  },

  // Afterimage ghost trail from an array of world-space position snapshots.
  // snapshots: [{wx, wy, color}] ordered oldest→newest; wy = foot world-Y (entity.y + entity.h)
  // opts: alpha (max trail opacity), tint (override color for all ghosts)
  afterimage(rctx, snapshots, opts = {}) {
    if (!snapshots || snapshots.length === 0) return;
    const baseAlpha = opts.alpha || 0.28;
    const tint      = opts.tint  || null;
    const sc = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * camZoomCur;

    rctx.save();
    snapshots.forEach((snap, i) => {
      const prog = (i + 1) / snapshots.length;
      const a    = baseAlpha * prog * prog;
      if (a < 0.01) return;
      rctx.globalAlpha = a;
      const s = _cinWorldToScreen(snap.wx, snap.wy);
      _drawAfterSilhouette(rctx, s.x, s.y, sc, tint || snap.color || '#ffffff');
    });
    rctx.restore();
  },

  // Pulsing energy aura: expanding rings + orbiting sparks around a world-space entity.
  // t: elapsed seconds. opts: color, rings, orbits, radius (world units)
  aura(rctx, entity, t, opts = {}) {
    if (!entity) return;
    const cy   = entity.cy ? entity.cy() : entity.y + (entity.h || 60) / 2;
    const s    = _cinWorldToScreen(entity.cx(), cy);
    const sc   = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * camZoomCur;
    const baseR  = (opts.radius || (entity.h || 60) * 0.72) * sc;
    const color  = opts.color  || '#ffffff';
    const rings  = opts.rings  || 3;
    const orbits = opts.orbits || 8;

    rctx.save();
    rctx.shadowColor = color;

    for (let r = 0; r < rings; r++) {
      const phase  = ((t * 2.2 + r * 0.38) % 1);
      const radius = baseR * (0.7 + phase * 0.65 + r * 0.18);
      rctx.globalAlpha = (1 - phase) * 0.5;
      rctx.shadowBlur  = 16;
      rctx.strokeStyle = color;
      rctx.lineWidth   = Math.max(0.5, 3 - r * 0.7);
      rctx.beginPath();
      rctx.arc(s.x, s.y, Math.max(1, radius), 0, Math.PI * 2);
      rctx.stroke();
    }

    rctx.shadowBlur = 8;
    for (let k = 0; k < orbits; k++) {
      const angle  = t * 2.6 + (k / orbits) * Math.PI * 2;
      const dist   = baseR * (0.92 + Math.sin(t * 3 + k) * 0.14);
      const sparkR = Math.max(0.5, (2 + Math.sin(t * 5 + k * 1.4)) * sc);
      rctx.globalAlpha = 0.72;
      rctx.fillStyle   = color;
      rctx.beginPath();
      rctx.arc(
        s.x + Math.cos(angle) * dist,
        s.y + Math.sin(angle) * dist,
        sparkR, 0, Math.PI * 2
      );
      rctx.fill();
    }
    rctx.restore();
  },

  // Manga-style panel dividers: bold diagonal lines splitting the canvas into N panels.
  // opts: color, lw, alpha, slant (0–0.12, fraction of canvas width per divider)
  panels(rctx, count, opts = {}) {
    const W     = canvas.width, H = canvas.height;
    const color = opts.color !== undefined ? opts.color : '#000000';
    const lw    = opts.lw    !== undefined ? opts.lw    : 12;
    const alpha = opts.alpha !== undefined ? opts.alpha : 1.0;
    const slant = (opts.slant !== undefined ? opts.slant : 0.04) * W;

    rctx.save();
    rctx.globalAlpha = alpha;
    rctx.strokeStyle = color;
    rctx.lineWidth   = lw;
    rctx.lineCap     = 'butt';
    for (let i = 1; i < count; i++) {
      const x = (i / count) * W;
      rctx.beginPath();
      rctx.moveTo(x - slant, 0);
      rctx.lineTo(x + slant, H);
      rctx.stroke();
    }
    rctx.restore();
  },

  // Building charge glow: radial gradient radiating outward from entity. intensity 0→1.
  // opts: color
  charge(rctx, entity, intensity, opts = {}) {
    if (!entity || intensity <= 0) return;
    const cy   = entity.cy ? entity.cy() : entity.y + (entity.h || 60) / 2;
    const s    = _cinWorldToScreen(entity.cx(), cy);
    const W    = canvas.width, H = canvas.height;
    const color = opts.color || '#ffffff';
    const reach = Math.max(W, H) * 0.72;
    const [r, g, b] = _aniFxHexToRgb(color);

    rctx.save();
    rctx.globalAlpha = 1;
    const grad = rctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, reach);
    grad.addColorStop(0,    `rgba(${r},${g},${b},${(intensity * 0.32).toFixed(3)})`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},${(intensity * 0.11).toFixed(3)})`);
    grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    rctx.fillStyle = grad;
    rctx.fillRect(0, 0, W, H);
    rctx.restore();
  },

  // Anime impact slash mark at a screen-space point.
  // sx/sy in canvas pixels. angle in radians. opts: color, len, lw, alpha, num
  slashMark(rctx, sx, sy, angle, opts = {}) {
    const color = opts.color || '#ffffff';
    const len   = opts.len   || 80;
    const lw    = opts.lw    || 4;
    const alpha = opts.alpha || 0.85;
    const num   = opts.num   || 2;

    rctx.save();
    rctx.shadowColor = color;
    rctx.shadowBlur  = 14;
    rctx.lineCap     = 'round';
    for (let n = 0; n < num; n++) {
      const a = angle + n * 0.22;
      rctx.globalAlpha = alpha * (1 - n * 0.3);
      rctx.strokeStyle = color;
      rctx.lineWidth   = Math.max(0.5, lw - n * 1.5);
      rctx.beginPath();
      rctx.moveTo(sx - Math.cos(a) * len * 0.5, sy - Math.sin(a) * len * 0.5);
      rctx.lineTo(sx + Math.cos(a) * len * 0.5, sy + Math.sin(a) * len * 0.5);
      rctx.stroke();
    }
    rctx.restore();
  },
};
