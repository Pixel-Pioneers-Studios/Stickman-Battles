'use strict';
// smb-destruction.js — cosmetic impact destruction (scars, chunks, dust).
// Depends on: smb-globals.js, smb-particles-core.js
//
// IMPORTANT: this system is PURELY VISUAL. Nothing here is ever read by
// collision, pathfinding, pickSafeSpawn(), or the network layer. Platform
// geometry is never mutated — a "destroyed" slab is a slab with marks drawn
// on it. That is deliberate: it buys the feel of destruction with none of the
// cost (bot paths index platforms by array position, and online syncs no
// world state at all, so real removal would desync).

const MAX_SCARS  = 46;   // persistent crack decals
const MAX_CHUNKS = 90;   // flying blocky debris

let surfaceScars = [];   // { pl, lx, ly, arms[], life, maxLife, power }
let debrisChunks = [];   // { x, y, vx, vy, rot, vr, size, color, life, maxLife, bounces, pl }

// ── Colour helpers ──────────────────────────────────────────
function _destHexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

// Shade a colour toward black (amt < 0) or white (amt > 0).
function _destShade(hex, amt) {
  const c = _destHexToRgb(hex) || { r: 130, g: 130, b: 130 };
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const ch = v => Math.round(v + (t - v) * k);
  return `rgb(${ch(c.r)},${ch(c.g)},${ch(c.b)})`;
}

// Perceived brightness 0..1 — decides whether a crack should read as a dark
// line (bright slab) or as a lit rim (dark slab, where a dark line is invisible).
function _destLum(hex) {
  const c = _destHexToRgb(hex) || { r: 130, g: 130, b: 130 };
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

// The surface a platform is made of — chunks should look like the thing
// they were knocked off, so ice chips read as ice and stone reads as stone.
function _destSurfaceColor() {
  const a = (typeof currentArena !== 'undefined' && currentArena) ? currentArena : null;
  return (a && (a.platColor || a.groundColor)) || '#8a8a8a';
}

// ── Scar (crack) generation ─────────────────────────────────
// Cracks spread ALONG the slab, so arms are biased toward horizontal and the
// perpendicular jitter is clamped to the platform's own thickness.
function _destMakeArms(power, vJitter, vertical) {
  const arms    = [];
  const armCount = 3 + Math.floor(Math.random() * 3 + power * 2);
  for (let i = 0; i < armCount; i++) {
    const dir   = Math.random() < 0.5 ? -1 : 1;
    const ang   = dir * (0.06 + Math.random() * 0.85) * (Math.random() < 0.5 ? 1 : -1);
    const len   = (13 + Math.random() * 30) * (0.55 + power * 0.75);
    const segs  = 3 + Math.floor(Math.random() * 3);
    const pts   = [{ x: 0, y: 0 }];
    let px = 0, py = 0, a = ang;
    for (let s = 0; s < segs; s++) {
      a += (Math.random() - 0.5) * 0.55;
      const step = len / segs;
      px += Math.cos(a) * step * dir;
      py += Math.sin(a) * step;
      py  = Math.max(-vJitter, Math.min(vJitter, py));
      pts.push({ x: px, y: py });
    }
    // Generated in "along-surface" space (x runs along the face). A wall is the
    // same pattern rotated a quarter turn, so swap the axes rather than writing
    // a second generator.
    if (vertical) for (const q of pts) { const t = q.x; q.x = q.y; q.y = t; }
    arms.push({ pts, branch: null });

    // Some arms fork partway along — that reads as fracture, not scratches.
    if (Math.random() < 0.45 && pts.length > 2) {
      const at  = 1 + Math.floor(Math.random() * (pts.length - 2));
      // pts may already be axis-swapped above, so read the branch root back out
      // in generation space.
      const _sp = pts[at];
      const src = vertical ? { x: _sp.y, y: _sp.x } : _sp;
      const bl  = (6 + Math.random() * 14) * (0.5 + power * 0.6);
      let ba    = a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.7);
      const bp  = [{ x: src.x, y: src.y }];
      let bx = src.x, by = src.y;
      for (let s = 0; s < 2; s++) {
        ba += (Math.random() - 0.5) * 0.4;
        bx += Math.cos(ba) * (bl / 2) * dir;
        by += Math.sin(ba) * (bl / 2);
        by  = Math.max(-vJitter, Math.min(vJitter, by));
        bp.push({ x: bx, y: by });
      }
      if (vertical) for (const q of bp) { const t = q.x; q.x = q.y; q.y = t; }
      arms[arms.length - 1].branch = bp;
    }
  }
  return arms;
}

// ── Public entry point ──────────────────────────────────────
// spawnImpact(x, y, power, opts)
//   power : 0..1+ — scales crack spread, chunk count, dust and shake
//   opts  : { pl, color, shake, chunks, noScar, axis, eject }
//           axis 'v' cracks a WALL face (cracks run vertically, chunks spray
//           sideways along `eject`); default is a floor/top surface.
// Finds the surface under (x, y) when no platform is supplied.
function spawnImpact(x, y, power, opts) {
  if (typeof settings !== 'undefined' && settings && !settings.particles) return;
  if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return;
  power = Math.max(0.15, Math.min(2.2, power == null ? 1 : power));
  opts  = opts || {};

  // Resolve the surface: explicit platform, else nearest top edge under the point.
  let pl = opts.pl || null;
  if (!pl) {
    let best = null, bestD = 30;
    for (const p of currentArena.platforms) {
      if (p.isFloorDisabled) continue;
      if (x < p.x - 6 || x > p.x + p.w + 6) continue;
      const d = Math.abs(y - p.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    pl = best;
  }
  if (!pl) return;

  const base = opts.color || _destSurfaceColor();

  // 1. Crack decal — stored in PLATFORM-LOCAL coords so marks ride moving
  //    platforms instead of hanging in the air where the slab used to be.
  const vertical = opts.axis === 'v';
  if (!opts.noScar) {
    // Perpendicular jitter is bounded by the slab's own thickness on that axis,
    // so cracks never wander off the face they were cut into.
    const vJit = vertical ? Math.max(1.5, Math.min(6, pl.w * 0.42))
                          : Math.max(1.5, Math.min(6, pl.h * 0.42));
    const life = Math.round((520 + Math.random() * 260) * (0.6 + power * 0.5));
    surfaceScars.push({
      pl,
      // A crack is the surface in shadow, not a hole punched through it — pure
      // black reads as a gap on bright slabs (grass, ice, gold), and vanishes
      // entirely on dark ones (volcanic rock), where the lit rim carries the
      // read instead. Both colours come from the material, never from #000/#fff.
      crackColor: _destShade(base, _destLum(base) > 0.45 ? -0.62 : -0.40),
      rimColor:   _destShade(base, 0.40),
      rimAlpha:   _destLum(base) > 0.45 ? 0.10 : 0.24,
      // A wall crack originates exactly ON the edge, so the clip would eat the
      // half of the pattern that spreads outward. Nudge it inboard so the whole
      // fracture sits on the visible face.
      lx: vertical ? Math.max(3, Math.min(pl.w - 3, x - pl.x)) : (x - pl.x),
      ly: vertical ? Math.max(3, Math.min(pl.h - 3, y - pl.y)) : 1,
      arms: _destMakeArms(power, vJit, vertical),
      power,
      life, maxLife: life,
    });
    while (surfaceScars.length > MAX_SCARS) surfaceScars.shift();
  }

  // 2. Blocky debris — knocked loose, spins, bounces once or twice, fades.
  const want = opts.chunks == null ? Math.round(3 + power * 6) : opts.chunks;
  const room = Math.max(0, MAX_CHUNKS - debrisChunks.length);
  const n    = Math.min(want, room);
  for (let i = 0; i < n; i++) {
    const spread = (Math.random() - 0.5) * 2;
    const life   = 40 + Math.random() * 45;
    const ej     = opts.eject || 0;
    debrisChunks.push({
      x: vertical ? x + ej * (1 + Math.random() * 3)
                  : x + (Math.random() - 0.5) * 16 * power,
      y: vertical ? y + (Math.random() - 0.5) * 22 * power
                  : pl.y - 1 - Math.random() * 3,
      vx: vertical ? ej * (2.0 + Math.random() * 4.0) * (0.6 + power * 0.6)
                   : spread * (2.2 + power * 3.4),
      vy: vertical ? -(1.0 + Math.random() * 3.4) * (0.5 + power * 0.5)
                   : -(2.4 + Math.random() * 4.2) * (0.6 + power * 0.5),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.42,
      size: (1.8 + Math.random() * 3.4) * (0.7 + power * 0.4),
      color: _destShade(base, (Math.random() - 0.45) * 0.34),
      rim:   _destShade(base, 0.45),
      life, maxLife: life,
      bounces: 0,
      pl: vertical ? null : pl,
    });
  }

  // 3. Dust puff — low, wide, and the colour of the pulverised surface.
  if (typeof spawnParticles === 'function') {
    const dx = vertical ? x + (opts.eject || 0) * 3 : x;
    const dy = vertical ? y : pl.y - 2;
    spawnParticles(dx, dy, _destShade(base, 0.30), Math.round(4 + power * 7));
    spawnParticles(dx, vertical ? y - 3 : pl.y - 5, _destShade(base, 0.52), Math.round(2 + power * 4));
  }

  // 4. Weight.
  const sh = opts.shake == null ? Math.round(4 + power * 9) : opts.shake;
  if (sh > 0 && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, sh);
}

// ── Per-frame update ────────────────────────────────────────
function updateDestruction() {
  const ts = (typeof slowMotion === 'number' && slowMotion > 0) ? slowMotion : 1;

  for (let i = surfaceScars.length - 1; i >= 0; i--) {
    const s = surfaceScars[i];
    s.life -= ts;
    if (s.life <= 0) surfaceScars.splice(i, 1);
  }

  for (let i = debrisChunks.length - 1; i >= 0; i--) {
    const c = debrisChunks[i];
    const py = c.y;
    c.x   += c.vx * ts;
    c.y   += c.vy * ts;
    c.vy  += 0.42 * ts;
    c.vx  *= 0.985;
    c.rot += c.vr * ts;
    c.life -= ts;

    // Settle on the surface it came off, then stop skittering.
    if (c.bounces < 2 && c.vy > 0 && c.pl &&
        c.x > c.pl.x && c.x < c.pl.x + c.pl.w &&
        c.y >= c.pl.y && py < c.pl.y) {
      c.y  = c.pl.y;
      c.vy = -c.vy * 0.34;
      c.vx *= 0.55;
      c.vr *= 0.5;
      c.bounces++;
      if (Math.abs(c.vy) < 1.1) { c.vy = 0; c.vr = 0; c.bounces = 2; }
    }

    if (c.life <= 0 || c.y > GAME_H + 60) debrisChunks.splice(i, 1);
  }
}

// ── Draw: crack decals (call right after drawPlatforms) ─────
function drawSurfaceScars() {
  if (!surfaceScars.length) return;
  if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return;

  for (const s of surfaceScars) {
    const pl = s.pl;
    // Stale reference guard — arena may have changed under us.
    if (!pl || currentArena.platforms.indexOf(pl) < 0 || pl.isFloorDisabled) continue;

    const t     = s.life / s.maxLife;
    const alpha = t > 0.75 ? 1 : (t / 0.75);      // hold, then fade out
    const ox    = pl.x + s.lx;
    const oy    = pl.y + s.ly;

    ctx.save();
    // Clip to the slab so cracks can never bleed off into empty air.
    ctx.beginPath();
    ctx.rect(pl.x, pl.y, pl.w, pl.h);
    ctx.clip();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Pulverised patch at the point of impact.
    ctx.globalAlpha = 0.13 * alpha;
    ctx.fillStyle   = s.crackColor || '#000000';
    ctx.beginPath();
    ctx.ellipse(ox, oy + 1, 3 + s.power * 4, 1.4 + s.power * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const arm of s.arms) {
      // Chiselled highlight, offset down a pixel — sells depth on a flat slab.
      ctx.globalAlpha = (s.rimAlpha == null ? 0.13 : s.rimAlpha) * alpha;
      ctx.strokeStyle = s.rimColor || '#ffffff';
      ctx.lineWidth   = 1.1;
      ctx.beginPath();
      ctx.moveTo(ox + arm.pts[0].x, oy + arm.pts[0].y + 1);
      for (let i = 1; i < arm.pts.length; i++) ctx.lineTo(ox + arm.pts[i].x, oy + arm.pts[i].y + 1);
      ctx.stroke();

      // The crack itself, tapering as it runs out.
      ctx.globalAlpha = 0.46 * alpha;
      ctx.strokeStyle = s.crackColor || '#000000';
      for (let i = 1; i < arm.pts.length; i++) {
        ctx.lineWidth = Math.max(0.35, (1.4 + s.power * 0.4) * (1 - (i - 0.5) / arm.pts.length));
        ctx.beginPath();
        ctx.moveTo(ox + arm.pts[i - 1].x, oy + arm.pts[i - 1].y);
        ctx.lineTo(ox + arm.pts[i].x,     oy + arm.pts[i].y);
        ctx.stroke();
      }

      if (arm.branch) {
        ctx.globalAlpha = 0.32 * alpha;
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.moveTo(ox + arm.branch[0].x, oy + arm.branch[0].y);
        for (let i = 1; i < arm.branch.length; i++) ctx.lineTo(ox + arm.branch[i].x, oy + arm.branch[i].y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ── Draw: flying debris (call with the particle pass) ───────
function drawDebrisChunks() {
  if (!debrisChunks.length) return;
  ctx.save();
  for (const c of debrisChunks) {
    const t = c.life / c.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, t > 0.3 ? 1 : t / 0.3));
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.78);
    // Lit top edge so chunks read as solid rather than as flat squares.
    ctx.globalAlpha *= 0.42;
    ctx.fillStyle = c.rim || 'rgba(255,255,255,0.55)';
    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, 0.9);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function resetDestruction() {
  surfaceScars = [];
  debrisChunks = [];
}

if (typeof window !== 'undefined') {
  window.spawnImpact      = spawnImpact;
  window.resetDestruction = resetDestruction;
}
