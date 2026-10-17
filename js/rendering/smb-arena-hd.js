'use strict';
// smb-arena-hd.js: HD layers for the base arenas.
// Arena art is a 900x520 box, so its edges showed when the camera pulled back. These layers
// paint the visible world rect from the live transform instead.
// Hooks: drawArenaHDBack(key, groundTop) after the sky fill, drawArenaHDFront(key) at the end
// of the decoration pass, _platDress(pl, baseColor) per platform. window.ARENA_HD_OFF = true
// disables all of it. Loads after smb-drawing-bg.js.

// Visible world rect under the current transform, or null mid-transition.
function arenaViewRect() {
  const m = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  if (!m || !m.a || !m.d) return null;
  const r = { x: -m.e / m.a, y: -m.f / m.d, w: canvas.width / m.a, h: canvas.height / m.d };
  return [r.x, r.y, r.w, r.h].every(Number.isFinite) ? r : null;
}

function _hdOn() { return !(typeof window !== 'undefined' && window.ARENA_HD_OFF); }

// Seeded random, so a layer's geometry is the same every load.
function _hdRand(seed) {
  let s = seed >>> 0;
  return function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function _hdCamOff() { return (typeof camXCur === 'number' ? camXCur - 450 : 0); }

// Per-arena HD entries: { back(groundTop), front(), material, skyTop }.
// Entries are registered here and in smb-arena-hd-arenas.js.
const ARENA_HD = {};

// Top sky colour above y=0. Falls back to the colour measured offline (tools/arena-shots/skytop.js).
const _hdSkySample = {};
function _arenaSkyTop(key) {
  if (!_hdOn()) return null;
  const e = ARENA_HD[key];
  if (e && e.skyTop) return e.skyTop;
  return _hdSkySample[key] || null;
}
function _hdSampleSkyTop(key) {
  // Dev only (window.ARENA_HD_SAMPLE). Reading the canvas back forces CPU rendering, so never in play.
  if (!window.ARENA_HD_SAMPLE) return;
  if (_hdSampleSkyTop.off || _hdSkySample[key] || (ARENA_HD[key] && ARENA_HD[key].skyTop)) return;
  const m = ctx.getTransform();
  const sy = Math.round(m.f + m.d * 3);
  if (sy < 0 || sy >= canvas.height) return;
  const lum = [];
  try {
    for (let i = 0; i < 7; i++) {
      const sx = Math.round(m.e + m.a * (90 + i * 120));
      if (sx < 0 || sx >= canvas.width) continue;
      const d = ctx.getImageData(sx, sy, 1, 1).data;
      lum.push([d[0] * 0.3 + d[1] * 0.59 + d[2] * 0.11, d]);
    }
  } catch (e) { _hdSkySample[key] = null; _hdSampleSkyTop.off = true; return; }
  if (lum.length < 3) return;
  lum.sort((p, q) => p[0] - q[0]);
  const d = lum[lum.length >> 1][1];
  _hdSkySample[key] = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
}

function drawArenaHDBack(key, groundTop) {
  if (!_hdOn()) return;
  const e = ARENA_HD[key];
  if (e && e.back) e.back(groundTop);
}

// Called after the arena's own decoration pass, behind platforms and fighters.
function drawArenaHDFront(key) {
  if (!_hdOn()) return;
  _hdSampleSkyTop(key);
  const e = ARENA_HD[key];
  if (e && e.front) { ctx.save(); e.front(); ctx.restore(); }
}

// Grass arena: summer field, cumulus, snowy range, sun rays, petals.

const _HD_SUN = { x: 764, y: 74 };

function _hdGrassGeo() {
  if (_hdGrassGeo._c) return _hdGrassGeo._c;
  const R = _hdRand(9051);
  const peaks = [];
  for (let x = -1800; x <= 2700; x += 60 + R() * 90) peaks.push({ x, y: 300 + R() * 70 - (R() < 0.25 ? 50 : 0) });
  const range = new Path2D();
  range.moveTo(peaks[0].x, 420);
  for (let i = 0; i < peaks.length; i++) {
    const p = peaks[i], n = peaks[i + 1];
    range.lineTo(p.x, p.y);
    if (n) range.lineTo((p.x + n.x) / 2 + (R() - 0.5) * 20, Math.max(p.y, n.y) + 18 + R() * 26);
  }
  range.lineTo(peaks[peaks.length - 1].x, 420);
  range.closePath();
  const snow = new Path2D();
  for (const p of peaks) {
    if (p.y > 330) continue;
    const d = 10 + (330 - p.y) * 0.55, w = d * (0.9 + R() * 0.4);
    snow.moveTo(p.x, p.y);
    snow.lineTo(p.x + w * 0.62, p.y + d);
    snow.lineTo(p.x + w * 0.25, p.y + d * 0.78);
    snow.lineTo(p.x, p.y + d * 1.02);
    snow.lineTo(p.x - w * 0.3, p.y + d * 0.74);
    snow.lineTo(p.x - w * 0.55, p.y + d);
    snow.closePath();
  }
  const towers = [];
  for (const [cx, h, w] of [[-520, 210, 300], [120, 250, 340], [560, 190, 260], [1180, 240, 320], [1700, 200, 280]]) {
    const lobes = [];
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      const rowW = w * (1 - t * 0.62);
      const n = 4 - Math.floor(t * 2.5);
      for (let k = 0; k < n; k++) {
        const fx = n === 1 ? 0 : (k / (n - 1) - 0.5);
        lobes.push({ dx: fx * rowW * 0.8 + (R() - 0.5) * 30, dy: -t * h, r: (rowW / n) * (0.62 + R() * 0.3) + 18 });
      }
    }
    towers.push({ x: cx, base: 392, lobes });
  }
  const petals = Array.from({ length: 30 }, () => { const sp = 0.6 + R() * 0.9; return { x: R() * 1400, y: R() * 700, s: 2 + R() * 2.4, vx: sp * 1.6, vy: sp * 0.55, ph: R() * 6.28, col: R() < 0.7 ? '#ffd3e6' : '#ffffff' }; });
  const streaks = Array.from({ length: 6 }, () => ({ x: R() * 1800, y: R() * 600, len: 90 + R() * 160, vx: 7 + R() * 6, bend: (R() - 0.5) * 14 }));
  return (_hdGrassGeo._c = { range, snow, towers, petals, streaks });
}

function _hdGrassBack(groundTop) {
  const v = arenaViewRect(); if (!v) return;
  const g = _hdGrassGeo();
  const f = frameCount, cam = _hdCamOff();
  const x0 = v.x - 40, x1 = v.x + v.w + 40;

  const sky = ctx.createLinearGradient(0, -700, 0, groundTop);
  sky.addColorStop(0,    '#1d63c4');
  sky.addColorStop(0.42, '#3f97e4');
  sky.addColorStop(0.78, '#86c8f2');
  sky.addColorStop(1,    '#d6f0fb');
  ctx.fillStyle = sky;
  ctx.fillRect(x0, Math.min(v.y, -700) - 10, x1 - x0, groundTop - Math.min(v.y, -700) + 10);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rot = f * 0.0009;
  for (let i = 0; i < 14; i++) {
    const a = rot + i * (Math.PI * 2 / 14);
    const spread = 0.05 + (i % 3) * 0.025;
    const len = 900;
    const rg = ctx.createRadialGradient(_HD_SUN.x, _HD_SUN.y, 20, _HD_SUN.x, _HD_SUN.y, len);
    rg.addColorStop(0, 'rgba(255,248,214,' + (0.085 - (i % 3) * 0.02) + ')');
    rg.addColorStop(1, 'rgba(255,248,214,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(_HD_SUN.x, _HD_SUN.y);
    ctx.arc(_HD_SUN.x, _HD_SUN.y, len, a - spread, a + spread);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-cam * 0.02, 0);
  for (const t of g.towers) {
    const drift = Math.sin(f * 0.0015 + t.x) * 6;
    const cx = t.x + drift;
    const lobeUnion = (ox, oy, k) => {
      ctx.beginPath();
      for (const l of t.lobes) { const r = l.r * k; ctx.moveTo(cx + l.dx + ox + r, t.base + l.dy + oy); ctx.arc(cx + l.dx + ox, t.base + l.dy + oy, r, 0, Math.PI * 2); }
    };
    // Shadow mass shifted toward the sun, so no circles show inside the cloud.
    ctx.fillStyle = '#a9bfdf';
    lobeUnion(0, 0, 1); ctx.fill();
    const lit = ctx.createLinearGradient(0, t.base - 260, 0, t.base);
    lit.addColorStop(0, '#fffaf0');
    lit.addColorStop(0.55, '#f4f8ff');
    lit.addColorStop(1, '#d4e2f4');
    ctx.fillStyle = lit;
    lobeUnion(7, -6, 0.97); ctx.fill();
  }
  const hz = ctx.createLinearGradient(0, 300, 0, 400);
  hz.addColorStop(0, 'rgba(214,240,251,0)');
  hz.addColorStop(1, 'rgba(214,240,251,0.85)');
  ctx.fillStyle = hz;
  ctx.fillRect(x0 + cam * 0.02, 300, x1 - x0, 100);
  ctx.restore();

  ctx.save();
  ctx.translate(-cam * 0.035, 0);
  const rg = ctx.createLinearGradient(0, 240, 0, 420);
  rg.addColorStop(0, '#6f97cc');
  rg.addColorStop(1, '#a9cfe9');
  ctx.fillStyle = rg;
  ctx.fill(g.range);
  ctx.fillStyle = 'rgba(248,252,255,0.92)';
  ctx.fill(g.snow);
  ctx.save();
  ctx.clip(g.range);
  const lw = ctx.createLinearGradient(0, 250, 0, 380);
  lw.addColorStop(0, 'rgba(255,244,214,0.22)');
  lw.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = lw;
  ctx.fillRect(x0 + cam * 0.035, 230, x1 - x0, 190);
  ctx.restore();
  ctx.restore();
}

function _hdGrassFront() {
  const g = _hdGrassGeo();
  const f = frameCount;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  _hdField(g.streaks, 1800, 600, (s, x, y) => {
    const lg = ctx.createLinearGradient(x, 0, x + s.len, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.7, 'rgba(255,255,255,0.5)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + s.len * 0.5, y + s.bend, x + s.len, y);
    ctx.stroke();
  });
  ctx.globalAlpha = 0.85;
  _hdField(g.petals, 1400, 700, (p, x, y) => {
    const flip = Math.sin(f * 0.07 + p.ph);
    const a = f * 0.03 + p.ph;
    const sy = Math.abs(flip) * 0.8 + 0.2;
    ctx.setTransform(_hdField._m);
    ctx.translate(x, y + Math.sin(f * 0.03 + p.ph) * 18);
    ctx.rotate(a);
    ctx.scale(1, sy);
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.s * 1.4, p.s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

ARENA_HD.grass = { back: _hdGrassBack, front: _hdGrassFront, material: 'grass', skyTop: '#1d63c4' };

// World-anchored particle field. Items keep a base position in a PW x PH tile and a
// velocity in px/frame. Only copies inside the visible rect draw, so camera movement never
// moves a particle. draw() may change the transform; it is reset per item.
function _hdField(items, PW, PH, draw) {
  const v = arenaViewRect(); if (!v) return;
  const f = frameCount;
  const m = ctx.getTransform();
  _hdField._m = m;
  const pad = 200;
  const tx0 = Math.floor((v.x - pad) / PW), tx1 = Math.floor((v.x + v.w + pad) / PW);
  const ty0 = Math.floor((v.y - pad) / PH), ty1 = Math.floor((v.y + v.h + pad) / PH);
  for (const it of items) {
    const bx = ((it.x + f * (it.vx || 0)) % PW + PW) % PW;
    const by = ((it.y + f * (it.vy || 0)) % PH + PH) % PH;
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        const x = bx + tx * PW, y = by + ty * PH;
        if (x < v.x - pad || x > v.x + v.w + pad || y < v.y - pad || y > v.y + v.h + pad) continue;
        draw(it, x, y);
        ctx.setTransform(m);
      }
    }
  }
}

// Platform materials
const _HD_MATERIALS = { grass: _platDressGrass };

function _platDress(pl, baseColor) {
  if (!_hdOn() || !pl || pl.isInvisible) return;
  const e = ARENA_HD[(currentArena && currentArena.designerBase) || currentArenaKey];
  const fn = e && _HD_MATERIALS[e.material];
  if (fn) { ctx.save(); fn(pl, baseColor); ctx.restore(); }
}

// Grass platform: soil underside, hanging roots, blade fringe along the top edge.
function _platDressGrass(pl) {
  const f = frameCount;
  const segTop = pl._segTop || [[pl.x, pl.x + pl.w]];
  const x2 = pl.x + pl.w, y2 = pl.y + pl.h;
  if (!pl.isFloor) {
    ctx.save();
    ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
    const eg = ctx.createLinearGradient(0, pl.y + pl.h * 0.45, 0, y2);
    eg.addColorStop(0, 'rgba(120,82,48,0)');
    eg.addColorStop(0.35, 'rgba(120,82,48,0.9)');
    eg.addColorStop(1, 'rgba(70,46,28,1)');
    ctx.fillStyle = eg;
    ctx.fillRect(pl.x, pl.y + pl.h * 0.45, pl.w, pl.h * 0.6);
    ctx.restore();
    ctx.strokeStyle = 'rgba(78,52,32,0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const n = Math.max(2, Math.floor(pl.w / 26));
    for (let i = 0; i < n; i++) {
      const rx = pl.x + 8 + (i + _platNoise(pl.x + i, pl.y)) * ((pl.w - 16) / n);
      const len = 5 + _platNoise(rx, pl.y + 3) * 12;
      const sw = Math.sin(f * 0.02 + rx) * 1.5;
      ctx.moveTo(rx, y2 - 1);
      ctx.quadraticCurveTo(rx + 2, y2 + len * 0.5, rx + sw, y2 + len);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,46,28,0.95)';
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const rx = pl.x + 4 + _platNoise(pl.y + i * 7, pl.x) * (pl.w - 8);
      const d = 3 + _platNoise(rx, pl.w) * 5;
      ctx.moveTo(rx - 6, y2 - 1); ctx.lineTo(rx, y2 + d); ctx.lineTo(rx + 7, y2 - 1);
    }
    ctx.fill();
  }
  for (const [col, hMul, step, ph] of [['#3f8a36', 1, 3.2, 0], ['#7fcf5a', 0.7, 4.1, 1.7]]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (const sp of segTop) {
      for (let x = sp[0] + 1; x < sp[1] - 1; x += step) {
        const nz = _platNoise(x * 1.3 + ph, pl.y);
        const h = (3 + nz * 6) * hMul;
        const sw = Math.sin(f * 0.035 + x * 0.05 + ph) * 1.6;
        ctx.moveTo(x - 1.4, pl.y + 1.5);
        ctx.lineTo(x + sw, pl.y - h);
        ctx.lineTo(x + 1.4, pl.y + 1.5);
      }
    }
    ctx.fill();
  }
  if (!pl.isFloor) {
    ctx.fillStyle = '#4f9a3e';
    ctx.beginPath();
    for (const [ex, dir] of [[pl.x, -1], [x2, 1]]) {
      for (let k = 0; k < 4; k++) {
        const yy = pl.y + 1 + k * 1.5;
        ctx.moveTo(ex, yy);
        ctx.quadraticCurveTo(ex + dir * (4 + k), yy + 1, ex + dir * (3 + k * 1.2), yy + 5 + k * 2);
        ctx.lineTo(ex - dir * 1.5, yy + 2);
      }
    }
    ctx.fill();
  }
}
