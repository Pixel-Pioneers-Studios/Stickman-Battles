'use strict';
// smb-drawing-arenas4.js — Story location arenas: the places the story names
// that no general-purpose arena depicts (the lab, the relay, the war front, ...).
// Depends on: smb-globals.js, smb-data-arenas.js
//
// Every drawer paints one 900-wide backdrop against a floor at y=460 and nothing
// below it: the ground fill and platforms own everything under the floor line,
// and explore worlds clip the art there anyway. None of them read camXCur —
// explore worlds lay these out as viewport panels while camXCur runs into the
// thousands, which would slide parallax layers clean out of the panel.
//
// Style: grounded palette, light from the upper left, silhouettes separated by
// value rather than outlines, one restrained accent per location.

const _SA_FY = 460;

function _saRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

// Static geometry is generated once per location; only animation runs per frame.
function _saLayout(key, build) {
  const c = _saLayout._c || (_saLayout._c = {});
  return c[key] || (c[key] = build(_saRng(key.length * 7919 + key.charCodeAt(0) * 131)));
}

function _saBand(y0, y1, rgb, a0, a1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(${rgb},${a0})`);
  g.addColorStop(1, `rgba(${rgb},${a1})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, GAME_W, y1 - y0);
}

function _saGlow(x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function _saPoly(pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// Explore worlds mirror every other backdrop panel so the art meets itself at
// the seams; lettering has to be flipped back or it reads backwards there.
function _saText(str, x, y) {
  const m = ctx.getTransform();
  if (m.a >= 0) { ctx.fillText(str, x, y); return; }
  ctx.save();
  ctx.translate(x + ctx.measureText(str).width, y);
  ctx.scale(-1, 1);
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

// Drifting motes shared by several locations. `dir` < 0 rises, > 0 falls.
function _saMotes(key, n, rgb, alpha, speed, dir) {
  const L = _saLayout('motes_' + key, rng => Array.from({ length: n }, () => ({
    x: rng() * GAME_W, y: rng() * _SA_FY, s: 0.6 + rng() * 1.6, p: rng() * 6.28,
  })));
  const t = frameCount;
  ctx.fillStyle = `rgba(${rgb},${alpha})`;
  for (const m of L) {
    const y = ((m.y + dir * t * speed * m.s) % _SA_FY + _SA_FY) % _SA_FY;
    const x = m.x + Math.sin(t * 0.01 + m.p) * 12;
    ctx.fillRect(x, y, m.s, m.s);
  }
}

// ── Research Facility (the lab) ─────────────────────────────────────────────
function drawStoryLabArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('lab', rng => ({
    panels: Array.from({ length: 30 }, () => rng()),
    bubbles: Array.from({ length: 18 }, () => ({ tube: (rng() * 2) | 0, x: rng(), p: rng() * 400, s: 0.4 + rng() * 0.6 })),
    shards: Array.from({ length: 9 }, () => ({ x: 232 + rng() * 60, w: 4 + rng() * 9, r: rng() * 3 })),
  }));

  // Back wall — panelled, lit from the upper left.
  const wall = ctx.createLinearGradient(0, 40, 0, FY);
  wall.addColorStop(0, '#1b2224'); wall.addColorStop(1, '#101517');
  ctx.fillStyle = wall; ctx.fillRect(0, 40, GAME_W, FY - 40);
  for (let i = 0; i < 10; i++) {
    for (let r = 0; r < 3; r++) {
      const v = L.panels[i * 3 + r];
      ctx.fillStyle = `rgba(${v > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + Math.abs(v - 0.5) * 0.05})`;
      ctx.fillRect(i * 90 + 2, 100 + r * 120 + 2, 86, 116);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
  for (let x = 0; x <= GAME_W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 100); ctx.lineTo(x, FY); ctx.stroke(); }
  for (const y of [100, 220, 340]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(190,210,205,0.06)'; ctx.lineWidth = 1;
  for (let x = 1; x <= GAME_W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 100); ctx.lineTo(x, FY); ctx.stroke(); }

  // Ceiling and service pipes
  ctx.fillStyle = '#0a0d0e'; ctx.fillRect(0, 0, GAME_W, 44);
  for (const [py, pr] of [[62, 7], [80, 5]]) {
    const pg = ctx.createLinearGradient(0, py - pr, 0, py + pr);
    pg.addColorStop(0, '#48524f'); pg.addColorStop(0.45, '#2a3130'); pg.addColorStop(1, '#141918');
    ctx.fillStyle = pg; ctx.fillRect(0, py - pr, GAME_W, pr * 2);
  }
  ctx.fillStyle = '#0e1212';
  for (let x = 30; x < GAME_W; x += 150) ctx.fillRect(x, 50, 8, 38);

  // Stencil
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = 'rgba(200,214,206,0.16)';
  _saText('CONTAINMENT  04', 30, 130);
  _saText('BEARER INTAKE', 560, 130);

  // Observation window into a dark room
  ctx.fillStyle = '#05080a'; ctx.fillRect(560, 150, 190, 110);
  ctx.strokeStyle = '#3a4442'; ctx.lineWidth = 6; ctx.strokeRect(560, 150, 190, 110);
  ctx.strokeStyle = 'rgba(200,230,225,0.07)'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(580, 250); ctx.lineTo(650, 158); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(640, 250); ctx.lineTo(700, 170); ctx.stroke();

  // Hanging cable bundle
  ctx.strokeStyle = '#0c0f10'; ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath(); ctx.moveTo(420 + k * 6, 44);
    ctx.bezierCurveTo(420 + k * 6, 100, 450 + k * 8, 118 + k * 6, 468 + k * 4, 88);
    ctx.stroke();
  }

  // Strip lights — the middle one is failing.
  for (const lx of [120, 450, 780]) {
    let a = 1;
    if (lx === 450) { const h = Math.sin(Math.floor(t / 3) * 12.9898) * 43758.5; a = (h - Math.floor(h)) > 0.82 ? 0.15 : 1; }
    ctx.fillStyle = `rgba(214,236,228,${0.85 * a})`; ctx.fillRect(lx - 55, 44, 110, 5);
    const cone = ctx.createLinearGradient(0, 49, 0, FY);
    cone.addColorStop(0, `rgba(200,230,220,${0.11 * a})`); cone.addColorStop(1, 'rgba(200,230,220,0)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(lx - 55, 49); ctx.lineTo(lx + 55, 49); ctx.lineTo(lx + 150, FY); ctx.lineTo(lx - 150, FY); ctx.closePath(); ctx.fill();
  }

  // Stasis tubes: intact, shattered (empty), occupied.
  const tubes = [{ x: 170, state: 'fluid' }, { x: 262, state: 'broken' }, { x: 354, state: 'held' }];
  for (let i = 0; i < tubes.length; i++) {
    const tb = tubes[i], x = tb.x, top = 210, w = 58;
    ctx.fillStyle = '#1e2524'; ctx.fillRect(x - w / 2 - 8, FY - 26, w + 16, 26);
    ctx.fillStyle = '#39423f'; ctx.fillRect(x - w / 2 - 8, FY - 26, w + 16, 3);
    ctx.fillStyle = '#1e2524'; ctx.fillRect(x - w / 2 - 8, top - 20, w + 16, 20);
    ctx.fillStyle = '#39423f'; ctx.fillRect(x - w / 2 - 8, top - 20, w + 16, 3);
    if (tb.state === 'broken') {
      _saPoly([[x - w / 2, FY - 26], [x - w / 2, FY - 92], [x - 12, FY - 70], [x + 4, FY - 108], [x + 16, FY - 80], [x + w / 2, FY - 98], [x + w / 2, FY - 26]], 'rgba(150,200,195,0.07)');
      _saPoly([[x - w / 2, top], [x - 6, top], [x - 18, top + 30], [x - w / 2, top + 52]], 'rgba(150,200,195,0.06)');
      ctx.fillStyle = 'rgba(170,215,210,0.28)';
      for (const s of L.shards) { ctx.save(); ctx.translate(s.x, FY - 2); ctx.rotate(s.r); ctx.fillRect(0, 0, s.w, 2); ctx.restore(); }
      continue;
    }
    const glass = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    glass.addColorStop(0, 'rgba(120,190,180,0.10)'); glass.addColorStop(0.5, 'rgba(90,170,160,0.16)'); glass.addColorStop(1, 'rgba(60,120,115,0.08)');
    ctx.fillStyle = glass; ctx.fillRect(x - w / 2, top, w, FY - 26 - top);
    const fluid = ctx.createLinearGradient(0, top + 30, 0, FY);
    fluid.addColorStop(0, 'rgba(80,190,165,0.10)'); fluid.addColorStop(1, 'rgba(80,190,165,0.28)');
    ctx.fillStyle = fluid; ctx.fillRect(x - w / 2, top + 30 + Math.sin(t * 0.03 + i) * 2, w, FY - 56 - top);
    if (tb.state === 'held') {
      ctx.strokeStyle = 'rgba(20,34,32,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const cy = 300 + Math.sin(t * 0.02) * 3;
      ctx.beginPath(); ctx.arc(x, cy - 34, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, cy - 25); ctx.lineTo(x, cy + 30);
      ctx.moveTo(x, cy - 12); ctx.lineTo(x - 14, cy + 12); ctx.moveTo(x, cy - 12); ctx.lineTo(x + 14, cy + 12);
      ctx.moveTo(x, cy + 30); ctx.lineTo(x - 10, cy + 70); ctx.moveTo(x, cy + 30); ctx.lineTo(x + 10, cy + 70);
      ctx.stroke(); ctx.lineCap = 'butt';
    }
    ctx.fillStyle = 'rgba(210,240,235,0.16)'; ctx.fillRect(x - w / 2 + 6, top + 6, 5, FY - 40 - top);
    ctx.fillStyle = 'rgba(190,235,225,0.35)';
    for (const b of L.bubbles) {
      if ((b.tube === 0 ? 0 : 2) !== i) continue;
      const by = FY - 30 - ((t * b.s + b.p) % (FY - 70 - top));
      ctx.beginPath(); ctx.arc(x - w / 2 + 8 + b.x * (w - 16), by, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  _saGlow(262, FY - 40, 90, '90,190,165', 0.06);

  // Terminal bank
  ctx.fillStyle = '#161c1c'; ctx.fillRect(600, 392, 210, FY - 392);
  ctx.fillStyle = '#2c3534'; ctx.fillRect(600, 392, 210, 4);
  for (let m = 0; m < 2; m++) {
    const mx = 614 + m * 100;
    ctx.fillStyle = '#0b1010'; ctx.fillRect(mx, 316, 86, 64);
    ctx.fillStyle = 'rgba(95,200,170,0.10)'; ctx.fillRect(mx + 4, 320, 78, 56);
    ctx.save(); ctx.beginPath(); ctx.rect(mx + 4, 320, 78, 56); ctx.clip();
    ctx.fillStyle = 'rgba(120,225,190,0.55)';
    for (let r = 0; r < 9; r++) {
      const ly = 322 + ((r * 7 - t * 0.35 * (m ? 1.4 : 1)) % 63 + 63) % 63;
      const lw = 18 + ((r * 37 + m * 11) % 50);
      ctx.fillRect(mx + 8, ly, lw, 2);
    }
    ctx.restore();
    ctx.fillStyle = '#0e1313'; ctx.fillRect(mx + 38, 380, 10, 12);
  }
  _saGlow(700, 350, 120, '90,200,170', 0.07);

  // Holding cell on the far right
  ctx.fillStyle = '#0a0e0e'; ctx.fillRect(826, 300, 74, FY - 300);
  ctx.fillStyle = '#343d3b';
  for (let bx = 832; bx < 900; bx += 11) ctx.fillRect(bx, 300, 3, FY - 300);
  ctx.fillRect(826, 300, 74, 5); ctx.fillRect(826, 380, 74, 4);

  // Hazard striping along the base of the wall
  ctx.save(); ctx.beginPath(); ctx.rect(0, FY - 10, GAME_W, 10); ctx.clip();
  ctx.fillStyle = '#6e5e2c'; ctx.fillRect(0, FY - 10, GAME_W, 10);
  ctx.fillStyle = '#16140e';
  for (let x = -20; x < GAME_W + 20; x += 24) {
    ctx.beginPath(); ctx.moveTo(x, FY); ctx.lineTo(x + 12, FY); ctx.lineTo(x + 22, FY - 10); ctx.lineTo(x + 10, FY - 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ── Architect's Relay Station ───────────────────────────────────────────────
function drawStoryRelayArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('relay', rng => ({
    far: Array.from({ length: 26 }, (_, i) => ({ x: i * 36 + rng() * 10, w: 22 + rng() * 18, h: 16 + rng() * 44, lit: rng() })),
  }));

  // Home City glow on the horizon, and its low skyline
  _saBand(330, FY, '205,150,95', 0, 0.12);
  for (const b of L.far) {
    ctx.fillStyle = '#121822'; ctx.fillRect(b.x, 400 - b.h, b.w, FY - 400 + b.h);
    if (b.lit > 0.55) { ctx.fillStyle = 'rgba(225,185,120,0.35)'; ctx.fillRect(b.x + 5, 408 - b.h, 3, 3); }
  }
  _saPoly([[0, 420], [140, 402], [300, 414], [480, 398], [700, 412], [900, 400], [900, FY], [0, FY]], '#0f141b');

  // Lattice transmission tower
  const tx = 300, baseW = 150, topW = 16, topY = 78;
  const legX = (side, y) => tx + side * (topW / 2 + (baseW - topW) / 2 * ((y - topY) / (FY - topY)));
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.strokeStyle = side < 0 ? '#4a5561' : '#262e38'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(legX(side, topY), topY); ctx.lineTo(legX(side, FY), FY); ctx.stroke();
  }
  ctx.strokeStyle = '#2e3743'; ctx.lineWidth = 2;
  for (let y = topY; y < FY - 4; y += 38) {
    const y2 = Math.min(FY, y + 38);
    ctx.beginPath();
    ctx.moveTo(legX(-1, y), y); ctx.lineTo(legX(1, y2), y2);
    ctx.moveTo(legX(1, y), y); ctx.lineTo(legX(-1, y2), y2);
    ctx.moveTo(legX(-1, y), y); ctx.lineTo(legX(1, y), y);
    ctx.stroke();
  }
  for (const [y, span] of [[140, 70], [230, 100]]) {
    ctx.strokeStyle = '#3a4450'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(tx - span, y); ctx.lineTo(tx + span, y); ctx.stroke();
    ctx.fillStyle = '#1c232c';
    for (const s of [-1, 1]) ctx.fillRect(tx + s * span - 3, y, 6, 16);
  }
  ctx.strokeStyle = '#3a4450'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(tx, topY); ctx.lineTo(tx, 30); ctx.stroke();
  ctx.lineCap = 'butt';
  const blink = (t % 90) < 12;
  for (const [bx, by] of [[tx, 30], [tx - 70, 140], [tx + 70, 140]]) {
    ctx.fillStyle = blink ? '#ff5a48' : '#5a1c16';
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
    if (blink) _saGlow(bx, by, 22, '255,80,60', 0.45);
  }

  // The relay's signal, pulsing out from the mast
  for (let k = 0; k < 3; k++) {
    const ph = ((t * 0.6 + k * 60) % 180) / 180;
    ctx.strokeStyle = `rgba(160,215,230,${0.35 * (1 - ph)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tx, 30, 12 + ph * 170, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }

  // Control building
  const bx0 = 520, bw = 150, by0 = 372;
  ctx.fillStyle = '#1a212a'; ctx.fillRect(bx0, by0, bw, FY - by0);
  ctx.fillStyle = '#2c3540'; ctx.fillRect(bx0 - 6, by0 - 6, bw + 12, 7);
  ctx.fillStyle = '#10151b'; ctx.fillRect(bx0 + 20, by0 - 26, 40, 20);
  for (const [wx, on] of [[bx0 + 16, 0.5], [bx0 + 62, 0.32], [bx0 + 108, 0]]) {
    ctx.fillStyle = on ? `rgba(225,180,105,${on})` : '#0c1015'; ctx.fillRect(wx, by0 + 20, 28, 20);
    if (on) _saGlow(wx + 14, by0 + 30, 36, '225,180,105', 0.10);
  }
  ctx.fillStyle = '#0c1015'; ctx.fillRect(bx0 + 110, by0 + 48, 24, FY - by0 - 48);

  // Dish
  const dx = 760, dy = 318;
  ctx.fillStyle = '#20272f'; ctx.fillRect(dx - 8, dy + 20, 16, FY - dy - 20);
  ctx.fillRect(dx - 30, FY - 12, 60, 12);
  ctx.save(); ctx.translate(dx, dy); ctx.rotate(-0.55);
  const dg = ctx.createLinearGradient(-60, -30, 60, 30);
  dg.addColorStop(0, '#6a7580'); dg.addColorStop(0.5, '#3a444f'); dg.addColorStop(1, '#1c232b');
  ctx.fillStyle = dg;
  ctx.beginPath(); ctx.ellipse(0, 0, 62, 20, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#141a20';
  ctx.beginPath(); ctx.ellipse(0, 0, 62, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a444f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(0, -48); ctx.lineTo(40, 0); ctx.stroke();
  ctx.restore();

  // Cables from the tower down to the building
  ctx.strokeStyle = 'rgba(10,14,18,0.9)'; ctx.lineWidth = 1.5;
  for (const [x0, y0, x1, y1] of [[tx + 70, 146, bx0 + 20, by0 - 26], [tx + 100, 236, bx0, by0 + 10], [bx0 + bw, by0 + 6, dx - 8, dy + 40]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 30, x1, y1); ctx.stroke();
  }

  // Perimeter fence
  ctx.fillStyle = '#1c232b';
  for (let fx = 10; fx < GAME_W; fx += 110) ctx.fillRect(fx, 418, 4, FY - 418);
  ctx.strokeStyle = 'rgba(80,95,110,0.18)'; ctx.lineWidth = 1;
  for (let fx = 0; fx < GAME_W; fx += 12) {
    ctx.beginPath(); ctx.moveTo(fx, 422); ctx.lineTo(fx + 38, FY); ctx.moveTo(fx + 38, 422); ctx.lineTo(fx, FY); ctx.stroke();
  }
  ctx.fillStyle = '#28303a'; ctx.fillRect(0, 418, GAME_W, 3);
}

// ── Multiversal Core ────────────────────────────────────────────────────────
function drawStoryCoreArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('core', rng => ({
    cols: Array.from({ length: 9 }, (_, i) => ({ x: 30 + i * 105 + rng() * 20, w: 14 + rng() * 14, p: rng() * 300 })),
    frags: Array.from({ length: 16 }, () => ({ x: rng() * GAME_W, y: 60 + rng() * 300, s: 3 + rng() * 7, r: rng() * 6.28, v: (rng() - 0.5) * 0.01 })),
  }));
  const cx = 450, cy = 190;

  // Conduits carrying light down into the floor
  for (const c of L.cols) {
    const g = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
    g.addColorStop(0, '#2a2640'); g.addColorStop(1, '#121020');
    ctx.fillStyle = g; ctx.fillRect(c.x, 0, c.w, FY);
    const py = (t * 1.6 + c.p) % (FY + 80) - 40;
    const pg = ctx.createLinearGradient(0, py - 40, 0, py + 40);
    pg.addColorStop(0, 'rgba(185,166,255,0)'); pg.addColorStop(0.5, 'rgba(185,166,255,0.45)'); pg.addColorStop(1, 'rgba(185,166,255,0)');
    ctx.fillStyle = pg; ctx.fillRect(c.x + c.w / 2 - 1.5, py - 40, 3, 80);
  }

  // Orbital rings behind the eye
  const rings = [[160, 26, -0.16, 0.012], [225, 36, 0.10, -0.008], [292, 46, -0.05, 0.005]];
  const ringPass = (front) => {
    for (const [rx, ry, tilt, sp] of rings) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
      ctx.strokeStyle = front ? 'rgba(200,188,255,0.42)' : 'rgba(150,135,220,0.16)';
      ctx.lineWidth = front ? 2.5 : 2;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const a = t * sp + k * 2.094;
        const inFront = Math.sin(a) > 0;
        if (inFront !== front) continue;
        ctx.fillStyle = front ? '#e4dcff' : 'rgba(170,155,230,0.5)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, front ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };
  ringPass(false);

  // The eye
  _saGlow(cx, cy, 170, '150,130,240', 0.12);
  const eg = ctx.createRadialGradient(cx - 22, cy - 24, 6, cx, cy, 72);
  eg.addColorStop(0, '#4a4270'); eg.addColorStop(0.7, '#1a1630'); eg.addColorStop(1, '#0a0814');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, 72, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(210,198,255,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 72, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.004);
  ctx.strokeStyle = 'rgba(200,185,255,0.5)'; ctx.lineWidth = 5;
  for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(0, 0, 40, k * 0.785, k * 0.785 + 0.5); ctx.stroke(); }
  ctx.restore();
  const pulse = 0.6 + Math.sin(t * 0.05) * 0.25;
  _saGlow(cx, cy, 30, '235,228,255', pulse);
  ringPass(true);

  // Drifting fragments
  for (const f of L.frags) {
    ctx.save(); ctx.translate(f.x, f.y + Math.sin(t * 0.015 + f.r) * 6); ctx.rotate(f.r + t * f.v);
    _saPoly([[-f.s, 0], [0, -f.s * 0.7], [f.s * 0.8, f.s * 0.2], [0, f.s * 0.6]], 'rgba(170,160,215,0.22)');
    ctx.restore();
  }

  // Catwalk
  ctx.fillStyle = '#16131f'; ctx.fillRect(0, 336, GAME_W, 8);
  ctx.fillStyle = '#2e2a42'; ctx.fillRect(0, 336, GAME_W, 2);
  ctx.strokeStyle = '#1e1a2c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 312); ctx.lineTo(GAME_W, 312); ctx.stroke();
  for (let x = 0; x < GAME_W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 312); ctx.lineTo(x, 336); ctx.stroke(); }
  ctx.fillStyle = '#100e18';
  for (let x = 60; x < GAME_W; x += 180) ctx.fillRect(x, 344, 10, FY - 344);
}

// ── Neutral Dimension: the Assembly ─────────────────────────────────────────
function drawStoryAssemblyArena() {
  const t = frameCount;
  const FY = _SA_FY;
  _saBand(300, FY, '190,185,170', 0, 0.10);
  _saPoly([[0, 408], [900, 400], [900, FY], [0, FY]], '#1c1d22');

  // Colonnade of plain monoliths
  const banners = ['#3a4658', '#6a5a34', '#3e5236', '#5a2e2c'];
  const colX = [40, 170, 300, 560, 690, 820];
  for (let i = 0; i < colX.length; i++) {
    const x = colX[i];
    const g = ctx.createLinearGradient(x, 0, x + 40, 0);
    g.addColorStop(0, '#4a4b52'); g.addColorStop(0.25, '#34353c'); g.addColorStop(1, '#202127');
    ctx.fillStyle = g; ctx.fillRect(x, 140, 40, FY - 140);
    ctx.fillStyle = '#2a2b31'; ctx.fillRect(x - 6, 130, 52, 12);
    if (i < colX.length - 1 && i !== 2) {
      const nx = colX[i + 1];
      const col = banners[(i > 2 ? i - 1 : i) % 4];
      const sway = Math.sin(t * 0.02 + i) * 4;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x + 58, 150); ctx.lineTo(nx - 18, 150);
      ctx.lineTo(nx - 18 + sway, 300); ctx.lineTo((x + nx) / 2 + 20 + sway, 286); ctx.lineTo(x + 58 + sway, 300); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 58, 150, 10, 146);
      ctx.fillStyle = '#18191d'; ctx.fillRect(x + 50, 146, nx - x - 60, 5);
    }
  }
  ctx.fillStyle = '#2a2b31'; ctx.fillRect(0, 120, GAME_W, 10);

  // The anchor pylon
  const px = 450;
  const pg = ctx.createLinearGradient(px - 28, 0, px + 28, 0);
  pg.addColorStop(0, '#56565c'); pg.addColorStop(0.3, '#3a3a40'); pg.addColorStop(1, '#1e1e23');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(px - 28, FY); ctx.lineTo(px - 18, 70); ctx.lineTo(px, 40); ctx.lineTo(px + 18, 70); ctx.lineTo(px + 28, FY); ctx.closePath(); ctx.fill();
  const seam = 0.35 + Math.sin(t * 0.03) * 0.2;
  ctx.fillStyle = `rgba(230,222,195,${seam})`; ctx.fillRect(px - 1.5, 70, 3, FY - 90);
  _saGlow(px, 200, 90, '230,222,195', seam * 0.18);

  // Tiered steps of the assembly floor
  for (let s = 0; s < 3; s++) {
    const w = 460 - s * 110, y = FY - 10 * (s + 1);
    ctx.fillStyle = s % 2 ? '#2c2d33' : '#34353b'; ctx.fillRect(px - w / 2, y, w, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(px - w / 2, y, w, 1);
  }
  _saMotes('assembly', 30, '220,215,200', 0.25, 0.08, 1);
}

// ── The Creator's Interference Layer ────────────────────────────────────────
function drawStoryInterferenceArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('interference', rng => {
    const mk = (n, hMin, hMax, step) => Array.from({ length: n }, (_, i) => ({
      x: i * step + rng() * 10, w: step * (0.6 + rng() * 0.35), h: hMin + rng() * (hMax - hMin),
      erase: rng() < 0.35 ? { y: rng(), h: 0.2 + rng() * 0.4 } : null, win: rng(),
    }));
    return { back: mk(16, 120, 250, 58), front: mk(10, 160, 300, 92) };
  });
  const glitch = Math.floor(t / 7);

  for (const [layer, col, lit] of [[L.back, '#221c27', 0.22], [L.front, '#17131b', 0.4]]) {
    for (const b of layer) {
      const top = FY - b.h;
      ctx.fillStyle = col; ctx.fillRect(b.x, top, b.w, b.h);
      ctx.fillStyle = `rgba(215,190,160,${lit})`;
      for (let wy = top + 10; wy < FY - 16; wy += 16)
        for (let wx = b.x + 5; wx < b.x + b.w - 6; wx += 11)
          if (((wx * 7 + wy * 13) | 0) % 13 === 0) ctx.fillRect(wx, wy, 4, 5);
      ctx.fillStyle = 'rgba(200,190,210,0.08)'; ctx.fillRect(b.x, top, b.w, 1.5);
      if (b.erase) {
        const ey = top + b.h * b.erase.y * 0.6, eh = b.h * b.erase.h;
        ctx.fillStyle = '#050407'; ctx.fillRect(b.x - 2, ey, b.w + 4, eh);
        ctx.fillStyle = 'rgba(210,70,60,0.22)';
        for (let sy = ey; sy < ey + eh; sy += 4) ctx.fillRect(b.x - 2, sy, b.w + 4, 1);
        const jitter = (Math.sin(glitch * 3.1 + b.x) > 0.7) ? (Math.sin(glitch * 9.7 + b.x) * 14) : 0;
        if (jitter) { ctx.fillStyle = col; ctx.fillRect(b.x + jitter, ey + eh * 0.3, b.w, 6); }
      }
    }
  }

  // Sweep beams
  for (const [ox, sp, ph] of [[220, 0.011, 0], [700, 0.009, 2.1]]) {
    const a = Math.sin(t * sp + ph) * 0.45;
    const ex = ox + Math.tan(a) * FY;
    const g = ctx.createLinearGradient(ox, 0, ex, FY);
    g.addColorStop(0, 'rgba(220,80,65,0.20)'); g.addColorStop(1, 'rgba(220,80,65,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(ox - 4, 0); ctx.lineTo(ox + 4, 0); ctx.lineTo(ex + 60, FY); ctx.lineTo(ex - 60, FY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1014'; ctx.fillRect(ox - 14, 0, 28, 10);
    ctx.fillStyle = '#e05a48'; ctx.fillRect(ox - 3, 8, 6, 3);
  }

  // Horizontal tears in the sky
  for (let k = 0; k < 4; k++) {
    const h = Math.sin((glitch + k * 17) * 12.9898) * 43758.5;
    const r = h - Math.floor(h);
    if (r < 0.55) continue;
    const y = 30 + r * 200 + k * 20, x = (r * 1300 + k * 211) % 700;
    ctx.fillStyle = 'rgba(235,225,230,0.20)'; ctx.fillRect(x, y, 120 + r * 160, 1.5);
    ctx.fillStyle = 'rgba(210,70,60,0.18)'; ctx.fillRect(x + 6, y + 3, 90 + r * 100, 1);
  }
}

// ── War-Torn Dimension ──────────────────────────────────────────────────────
function drawStoryWarArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('war', rng => ({
    smoke: Array.from({ length: 5 }, (_, i) => ({ x: 80 + i * 190 + rng() * 60, s: 0.6 + rng() * 0.6 })),
    flashes: Array.from({ length: 6 }, () => ({ x: rng() * GAME_W, p: (rng() * 400) | 0 })),
  }));

  _saBand(260, 420, '230,120,50', 0, 0.22);
  // Artillery on the horizon
  for (const f of L.flashes) {
    const ph = (t + f.p) % 400;
    if (ph < 10) _saGlow(f.x, 388, 70, '255,190,110', 0.5 * (1 - ph / 10));
  }
  _saPoly([[0, 392], [120, 376], [260, 390], [420, 370], [560, 386], [720, 368], [900, 384], [900, FY], [0, FY]], '#24150e');
  _saPoly([[0, 418], [180, 404], [360, 416], [540, 400], [760, 414], [900, 406], [900, FY], [0, FY]], '#180e09');

  // Smoke columns rising from the front
  for (const s of L.smoke) {
    for (let k = 0; k < 9; k++) {
      const ph = ((t * 0.25 * s.s + k * 30) % 270);
      const y = 410 - ph, r = 14 + ph * 0.16;
      ctx.fillStyle = `rgba(40,32,30,${0.22 * (1 - ph / 270)})`;
      ctx.beginPath(); ctx.arc(s.x + Math.sin(ph * 0.02) * 16 + ph * 0.12, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Wrecked war machine
  ctx.save(); ctx.translate(690, FY); ctx.rotate(-0.06);
  _saPoly([[-120, 0], [-104, -58], [96, -62], [128, -10], [118, 0]], '#1d1611');
  _saPoly([[-60, -58], [-40, -96], [44, -98], [62, -60]], '#241b14');
  ctx.fillStyle = '#1d1611'; ctx.save(); ctx.translate(40, -84); ctx.rotate(-0.35); ctx.fillRect(0, -5, 110, 10); ctx.restore();
  ctx.fillStyle = 'rgba(255,170,90,0.10)'; ctx.fillRect(-104, -58, 200, 3);
  ctx.fillStyle = '#120d0a';
  for (let w = -96; w < 110; w += 30) { ctx.beginPath(); ctx.arc(w, -12, 12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  _saGlow(610, FY - 30, 60, '255,140,60', 0.18 + Math.sin(t * 0.2) * 0.05);

  // Sandbag line
  for (let row = 0; row < 2; row++) {
    for (let x = 40 + row * 14; x < 300; x += 30) {
      const y = FY - 11 - row * 15;
      const g = ctx.createLinearGradient(0, y - 8, 0, y + 8);
      g.addColorStop(0, '#5a4a36'); g.addColorStop(1, '#2e251b');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Barbed wire
  ctx.fillStyle = '#1a130e';
  for (const px of [340, 430, 520]) ctx.fillRect(px, FY - 40, 4, 40);
  ctx.strokeStyle = 'rgba(90,80,70,0.7)'; ctx.lineWidth = 1;
  for (let x = 336; x < 530; x += 9) { ctx.beginPath(); ctx.ellipse(x, FY - 22, 7, 13, 0.3, 0, Math.PI * 2); ctx.stroke(); }

  // Torn standard
  ctx.fillStyle = '#15100c'; ctx.fillRect(118, 250, 4, FY - 250);
  ctx.fillStyle = '#5e3024';
  ctx.beginPath(); ctx.moveTo(122, 254);
  for (let k = 0; k <= 6; k++) ctx.lineTo(122 + k * 12, 254 + Math.sin(t * 0.06 + k * 0.8) * 4 + k * 0.6);
  for (let k = 6; k >= 0; k--) ctx.lineTo(122 + k * 12 - (k === 5 ? 8 : 0), 296 + Math.sin(t * 0.06 + k * 0.8) * 4 + k * 0.6 - (k % 2) * 6);
  ctx.closePath(); ctx.fill();

  _saMotes('war_embers', 28, '255,160,80', 0.55, 0.5, -1);
}

// ── Gravity Flux World ──────────────────────────────────────────────────────
function drawStoryFluxArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('flux', rng => ({
    isles: [
      { x: 120, y: 150, w: 150, inv: false }, { x: 400, y: 90, w: 120, inv: true },
      { x: 640, y: 170, w: 180, inv: false }, { x: 820, y: 60, w: 90, inv: false },
      { x: 280, y: 290, w: 80, inv: false },
    ].map(i => ({ ...i, p: rng() * 6.28, jag: Array.from({ length: 7 }, () => 0.5 + rng() * 0.5) })),
    rocks: Array.from({ length: 14 }, () => ({ x: rng() * GAME_W, y: rng() * 400, s: 3 + rng() * 6, v: (rng() - 0.5) * 0.5, r: rng() * 6.28 })),
  }));

  _saBand(260, FY, '140,200,210', 0, 0.10);
  for (let k = 0; k < 3; k++) {
    const ph = ((t * 0.4 + k * 90) % 270) / 270;
    ctx.strokeStyle = `rgba(150,210,220,${0.16 * (1 - ph)})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(450, 250, 60 + ph * 420, 18 + ph * 120, 0, 0, Math.PI * 2); ctx.stroke();
  }

  for (const is of L.isles) {
    const y = is.y + Math.sin(t * 0.015 + is.p) * 7;
    const hw = is.w / 2, dir = is.inv ? -1 : 1;
    const pts = [[is.x - hw, y]];
    for (let k = 0; k < is.jag.length; k++) {
      const f = (k + 1) / (is.jag.length + 1);
      pts.push([is.x - hw + is.w * f, y + dir * is.w * 0.55 * is.jag[k] * Math.sin(f * Math.PI)]);
    }
    pts.push([is.x + hw, y]);
    const g = ctx.createLinearGradient(is.x - hw, y, is.x + hw, y + dir * is.w * 0.5);
    g.addColorStop(0, '#4a4640'); g.addColorStop(1, '#1e1c1a');
    _saPoly(pts, g);
    ctx.fillStyle = is.inv ? '#2e3c2c' : '#46583a';
    ctx.fillRect(is.x - hw, is.inv ? y : y - 5, is.w, 5);
    ctx.strokeStyle = 'rgba(40,52,34,0.8)'; ctx.lineWidth = 1.5;
    for (let r = 0; r < 4; r++) {
      const rx = is.x - hw * 0.5 + r * hw / 2;
      ctx.beginPath(); ctx.moveTo(rx, y + dir * 18);
      ctx.quadraticCurveTo(rx + 6, y + dir * 40, rx - 3, y + dir * (50 + r * 6)); ctx.stroke();
    }
    if (is.inv) {
      ctx.fillStyle = '#2a3626';
      for (const tx of [is.x - 30, is.x + 18]) {
        ctx.fillRect(tx - 2, y, 4, 30);
        ctx.beginPath(); ctx.moveTo(tx - 16, y + 24); ctx.lineTo(tx, y + 60); ctx.lineTo(tx + 16, y + 24); ctx.closePath(); ctx.fill();
      }
    }
  }

  // Water falling UP from a pool into the largest island
  const wx = 640, wTop = L.isles[2].y + Math.sin(t * 0.015 + L.isles[2].p) * 7 + 70;
  const wg = ctx.createLinearGradient(0, FY, 0, wTop);
  wg.addColorStop(0, 'rgba(140,205,215,0.30)'); wg.addColorStop(1, 'rgba(140,205,215,0.08)');
  ctx.fillStyle = wg; ctx.fillRect(wx - 12, wTop, 24, FY - wTop);
  ctx.fillStyle = 'rgba(210,240,245,0.5)';
  for (let k = 0; k < 10; k++) {
    const y = FY - ((t * 2.2 + k * 37) % (FY - wTop));
    ctx.fillRect(wx - 8 + (k * 7) % 16, y, 2, 10);
  }
  ctx.fillStyle = 'rgba(140,205,215,0.25)'; ctx.beginPath(); ctx.ellipse(wx, FY - 2, 50, 6, 0, 0, Math.PI * 2); ctx.fill();

  for (const r of L.rocks) {
    const y = ((r.y + t * r.v) % 420 + 420) % 420;
    ctx.save(); ctx.translate(r.x, y); ctx.rotate(r.r + t * 0.004);
    ctx.fillStyle = '#34312d'; ctx.fillRect(-r.s / 2, -r.s / 2, r.s, r.s * 0.8);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-r.s / 2, -r.s / 2, r.s, 1);
    ctx.restore();
  }
}

// ── Shadow Realm: the Unseen Court ──────────────────────────────────────────
function drawStoryShadowArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('shadow', rng => ({
    eyes: Array.from({ length: 9 }, () => ({ x: 30 + rng() * 840, y: 90 + rng() * 280, p: (rng() * 500) | 0, s: 0.7 + rng() * 0.6 })),
  }));

  for (let x = 20; x < GAME_W; x += 128) {
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(x, 60, 44, FY - 60);
    ctx.fillStyle = 'rgba(150,160,190,0.07)'; ctx.fillRect(x, 60, 2, FY - 60);
  }

  // Cold light shaft onto the court floor
  const sg = ctx.createLinearGradient(0, 0, 0, FY);
  sg.addColorStop(0, 'rgba(170,185,215,0.14)'); sg.addColorStop(1, 'rgba(170,185,215,0.03)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(420, 0); ctx.lineTo(480, 0); ctx.lineTo(560, FY); ctx.lineTo(340, FY); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.moveTo(420, 0); ctx.lineTo(480, 0); ctx.lineTo(560, FY); ctx.lineTo(340, FY); ctx.closePath(); ctx.clip();
  _saMotes('shadow_dust', 26, '200,210,235', 0.35, 0.1, 1);
  ctx.restore();

  // Dais of empty thrones
  ctx.fillStyle = '#0d0d12'; ctx.fillRect(150, FY - 20, 600, 20);
  ctx.fillStyle = 'rgba(150,160,190,0.08)'; ctx.fillRect(150, FY - 20, 600, 1);
  const thrones = [[210, 0.8], [330, 0.9], [450, 1.15], [570, 0.9], [690, 0.8]];
  for (const [x, s] of thrones) {
    const h = 150 * s, w = 54 * s, base = FY - 20;
    ctx.fillStyle = '#07070a';
    ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w / 2, base - h * 0.45);
    ctx.lineTo(x - w * 0.38, base - h); ctx.lineTo(x, base - h - 16 * s); ctx.lineTo(x + w * 0.38, base - h);
    ctx.lineTo(x + w / 2, base - h * 0.45); ctx.lineTo(x + w / 2, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,172,205,0.12)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#0c0c11'; ctx.fillRect(x - w / 2 - 6, base - h * 0.42, w + 12, 7);
  }

  // Watchers in the dark
  for (const e of L.eyes) {
    const ph = (t + e.p) % 500;
    const open = ph < 200 ? Math.min(1, ph / 20) * Math.min(1, (200 - ph) / 20) : 0;
    if (open <= 0) continue;
    const dx = Math.sin(t * 0.004 + e.p) * 3;
    ctx.fillStyle = `rgba(215,225,240,${0.55 * open})`;
    for (const sx of [-6, 6]) {
      ctx.beginPath(); ctx.ellipse(e.x + sx * e.s + dx, e.y, 2.6 * e.s, 1.3 * e.s * open, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ── Titan World ─────────────────────────────────────────────────────────────
function drawStoryTitanArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const stone = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#8a7560'); g.addColorStop(0.35, '#5e4e40'); g.addColorStop(1, '#2e251e');
    return g;
  };

  _saBand(240, FY, '220,170,120', 0, 0.16);
  _saPoly([[0, 380], [60, 330], [130, 330], [170, 380], [520, 384], [560, 340], [680, 340], [720, 384], [900, 380], [900, FY], [0, FY]], '#3a2a20');

  // Colossal legs, broken at the thigh
  for (const [lx, w] of [[110, 62], [230, 66]]) {
    _saPoly([[lx - w / 2, FY - 30], [lx - w / 2 + 8, 150], [lx - 4, 128], [lx + 10, 146], [lx + w / 2 - 6, 138], [lx + w / 2, FY - 30]], stone(lx - w / 2, lx + w / 2));
    _saPoly([[lx - w / 2 - 24, FY - 30], [lx - w / 2 - 14, FY - 56], [lx + w / 2 + 34, FY - 50], [lx + w / 2 + 44, FY - 30]], stone(lx - w, lx + w));
    ctx.strokeStyle = 'rgba(20,14,10,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx - 10, 200); ctx.lineTo(lx + 4, 250); ctx.lineTo(lx - 6, 300); ctx.stroke();
  }
  ctx.fillStyle = '#4a3c30'; ctx.fillRect(40, FY - 30, 290, 30);
  ctx.fillStyle = 'rgba(255,230,190,0.10)'; ctx.fillRect(40, FY - 30, 290, 2);
  ctx.fillStyle = '#140e0a'; ctx.fillRect(166, FY - 30, 10, 18);

  // The great sword, driven into the ground
  ctx.save(); ctx.translate(470, FY); ctx.rotate(0.16);
  const bg = ctx.createLinearGradient(-18, 0, 18, 0);
  bg.addColorStop(0, '#9aa0a2'); bg.addColorStop(0.45, '#5a6064'); bg.addColorStop(1, '#2a2e32');
  _saPoly([[-18, 0], [-16, -300], [0, -316], [16, -300], [18, 0]], bg);
  ctx.fillStyle = '#3a2e22'; ctx.fillRect(-70, -318, 140, 16);
  ctx.fillStyle = 'rgba(255,230,190,0.12)'; ctx.fillRect(-70, -318, 140, 2);
  ctx.fillStyle = '#2a2018'; ctx.fillRect(-10, -380, 20, 62);
  ctx.beginPath(); ctx.arc(0, -390, 16, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Fallen head on its side, half buried
  ctx.save(); ctx.translate(700, FY - 20);
  ctx.fillStyle = stone(560, 840);
  ctx.beginPath(); ctx.ellipse(0, 0, 130, 92, -0.12, Math.PI * 0.98, Math.PI * 2.02); ctx.fill();
  ctx.strokeStyle = 'rgba(25,18,12,0.55)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-70, -40); ctx.quadraticCurveTo(-40, -52, -10, -44); ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-60, -28); ctx.quadraticCurveTo(-38, -22, -18, -30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -60); ctx.quadraticCurveTo(30, -30, 16, -8); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, -82); ctx.lineTo(48, -50); ctx.lineTo(70, -30); ctx.lineTo(58, -6); ctx.stroke();
  ctx.restore();

  _saMotes('titan_dust', 34, '230,200,160', 0.22, 0.12, 1);
  const drift = (t * 0.2) % 1100 - 100;
  _saGlow(drift, 360, 140, '210,170,130', 0.06);
}

// ── Null Space ──────────────────────────────────────────────────────────────
function drawStoryNullArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('null', rng => ({
    shapes: [
      { k: 'cube', x: 160, y: 170, s: 48, sp: 0.006, fill: true }, { k: 'cube', x: 610, y: 110, s: 34, sp: -0.009, fill: false },
      { k: 'sphere', x: 360, y: 250, s: 40, sp: 0.01 }, { k: 'pyr', x: 770, y: 250, s: 44, sp: 0.007 },
      { k: 'cube', x: 480, y: 330, s: 22, sp: 0.012, fill: false }, { k: 'sphere', x: 60, y: 330, s: 24, sp: -0.008 },
    ],
    vault: Array.from({ length: 24 }, () => rng()),
  }));

  ctx.strokeStyle = 'rgba(150,170,225,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x <= GAME_W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FY); ctx.stroke(); }
  for (let y = 10; y <= FY; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(150,170,225,0.11)';
  for (let x = 0; x <= GAME_W; x += 150) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FY); ctx.stroke(); }

  // Pattern vault: shelves of stored patterns, some already erased
  ctx.strokeStyle = 'rgba(170,190,235,0.28)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(640, 300, 230, FY - 300);
  for (let r = 0; r < 3; r++) {
    const sy = 300 + (r + 1) * ((FY - 300) / 3);
    ctx.beginPath(); ctx.moveTo(640, sy); ctx.lineTo(870, sy); ctx.stroke();
    for (let c = 0; c < 8; c++) {
      const v = L.vault[r * 8 + c];
      const bx = 648 + c * 28, by = sy - 26;
      if (v < 0.3) { ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(170,190,235,0.14)'; ctx.strokeRect(bx, by, 20, 20); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(170,190,235,0.28)'; continue; }
      ctx.fillStyle = `rgba(190,205,240,${0.08 + v * 0.1})`; ctx.fillRect(bx, by, 20, 20);
      ctx.strokeRect(bx, by, 20, 20);
      ctx.beginPath(); ctx.moveTo(bx + 4, by + 4 + v * 12); ctx.lineTo(bx + 16, by + 16 - v * 8); ctx.stroke();
    }
  }

  // Unfinished primitives, still being worked out
  const proj = (p, a, x, y) => {
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(0.5), sb = Math.sin(0.5);
    const X = p[0] * ca - p[2] * sa, Z = p[0] * sa + p[2] * ca;
    return [x + X, y + p[1] * cb - Z * sb];
  };
  for (const s of L.shapes) {
    const a = t * s.sp;
    ctx.strokeStyle = 'rgba(185,200,245,0.45)'; ctx.lineWidth = 1.2;
    if (s.k === 'sphere') {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.stroke();
      for (let m = 0; m < 3; m++) {
        const rx = Math.abs(Math.cos(a + m * 1.047)) * s.s;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, s.s, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(s.x, s.y, s.s, s.s * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    const h = s.s / 2;
    const V = s.k === 'cube'
      ? [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]]
      : [[-h, h, -h], [h, h, -h], [h, h, h], [-h, h, h], [0, -h, 0]];
    const E = s.k === 'cube'
      ? [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
      : [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]];
    const P = V.map(p => proj(p, a, s.x, s.y));
    if (s.fill) _saPoly([P[0], P[1], P[5], P[4]], 'rgba(200,212,245,0.10)');
    ctx.beginPath();
    for (const [i, j] of E) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }
    ctx.stroke();
  }

  // Dimension callouts
  ctx.strokeStyle = 'rgba(170,190,235,0.22)'; ctx.fillStyle = 'rgba(170,190,235,0.30)';
  ctx.font = '10px monospace';
  ctx.beginPath(); ctx.moveTo(110, 110); ctx.lineTo(210, 110); ctx.moveTo(110, 104); ctx.lineTo(110, 116); ctx.moveTo(210, 104); ctx.lineTo(210, 116); ctx.stroke();
  _saText('— — .— —', 130, 104);
  _saText('PATTERN ??', 330, 196);

  const sy = (t * 1.2) % (FY + 40) - 20;
  ctx.fillStyle = 'rgba(185,200,245,0.10)'; ctx.fillRect(0, sy, GAME_W, 2);
}

// ── The Quiet Expanse ───────────────────────────────────────────────────────
function drawStoryQuietArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('quiet', rng => {
    const trees = [];
    const branch = (segs, x, y, a, len, d) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push([x, y, x2, y2, d]);
      if (d <= 0) return;
      const n = 2 + (rng() < 0.3 ? 1 : 0);
      for (let k = 0; k < n; k++) branch(segs, x2, y2, a + (rng() - 0.5) * 1.1, len * (0.62 + rng() * 0.15), d - 1);
    };
    for (const [x, h, dep] of [[90, 120, 5], [300, 70, 4], [520, 95, 5], [760, 130, 5], [650, 55, 3]]) {
      const segs = []; branch(segs, x, FY, -Math.PI / 2 + (rng() - 0.5) * 0.2, h * 0.5, dep); trees.push({ segs, far: h < 80 });
    }
    return { trees };
  });

  _saBand(330, FY, '165,190,190', 0, 0.12);
  ctx.fillStyle = 'rgba(190,210,210,0.10)'; ctx.fillRect(0, 438, GAME_W, 1);

  // Drained conduits — one still has a trace of what it carried
  for (const [x, h] of [[200, 250], [430, 300], [860, 210]]) {
    ctx.fillStyle = '#131c1d'; ctx.fillRect(x - 5, FY - h, 10, h);
    ctx.fillStyle = 'rgba(200,220,220,0.07)'; ctx.fillRect(x - 5, FY - h, 2, h);
    for (let r = 0; r < 4; r++) { ctx.fillStyle = '#1a2526'; ctx.fillRect(x - 12, FY - h + 20 + r * 50, 24, 5); }
  }
  const trace = Math.max(0, Math.sin(t * 0.013)) * 0.4;
  if (trace > 0.02) { ctx.fillStyle = `rgba(150,215,210,${trace})`; ctx.fillRect(428, FY - 300, 4, 300); _saGlow(430, FY - 300, 30, '150,215,210', trace * 0.5); }

  for (const tr of L.trees) {
    ctx.strokeStyle = tr.far ? '#1a2426' : '#0f1718';
    for (const [x1, y1, x2, y2, d] of tr.segs) {
      ctx.lineWidth = Math.max(1, d * (tr.far ? 1.1 : 1.8));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }
  _saMotes('quiet', 40, '200,215,215', 0.25, 0.03, -1);
}

// ── Fracture Coast ──────────────────────────────────────────────────────────
function drawStoryCoastArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const HZ = 352;
  const L = _saLayout('coast', rng => ({
    spray: Array.from({ length: 40 }, () => ({ x: 560 + rng() * 200, y: 120 + rng() * 90, s: 1 + rng() * 2 })),
    glints: Array.from({ length: 18 }, () => ({ x: rng() * GAME_W, y: HZ + 6 + rng() * 90, p: (rng() * 300) | 0 })),
  }));

  // Sea
  const sea = ctx.createLinearGradient(0, HZ, 0, FY);
  sea.addColorStop(0, '#1a2c3e'); sea.addColorStop(1, '#0a141e');
  ctx.fillStyle = sea; ctx.fillRect(0, HZ, GAME_W, FY - HZ);
  ctx.fillStyle = 'rgba(200,220,235,0.22)'; ctx.fillRect(0, HZ, GAME_W, 1);
  ctx.fillStyle = 'rgba(190,210,225,0.08)';
  for (let k = 0; k < 7; k++) { const y = HZ + 10 + k * 13; ctx.fillRect((k * 131) % 300, y, 380 + k * 40, 1); }

  // The standing wave, stopped mid-break. Faint copies trail where it will be.
  const wave = (ox, a) => {
    ctx.beginPath();
    ctx.moveTo(420 + ox, HZ + 40);
    ctx.bezierCurveTo(520 + ox, HZ, 560 + ox, 190, 650 + ox, 132);
    ctx.bezierCurveTo(720 + ox, 92, 800 + ox, 118, 792 + ox, 170);
    ctx.bezierCurveTo(760 + ox, 150, 720 + ox, 160, 716 + ox, 196);
    ctx.bezierCurveTo(740 + ox, 260, 800 + ox, 320, 880 + ox, HZ + 40);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 100, 0, HZ + 40);
    g.addColorStop(0, `rgba(120,165,180,${a})`); g.addColorStop(0.35, `rgba(38,74,96,${a})`); g.addColorStop(1, `rgba(16,34,50,${a})`);
    ctx.fillStyle = g; ctx.fill();
  };
  // Kept clear of the panel edges: explore worlds mirror alternate panels, and
  // a wave at the seam meets its own reflection.
  ctx.save(); ctx.translate(-170, 0);
  wave(90, 0.08); wave(45, 0.14); wave(0, 1);
  ctx.strokeStyle = 'rgba(220,235,240,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(650, 132); ctx.bezierCurveTo(720, 92, 800, 118, 792, 170); ctx.stroke();
  ctx.fillStyle = 'rgba(225,238,242,0.55)';
  for (const s of L.spray) ctx.fillRect(s.x + 40, s.y - 20, s.s, s.s);
  ctx.restore();

  // Headland with VAEL's watch-spire
  _saPoly([[0, 190], [60, 176], [130, 210], [170, 300], [200, FY], [0, FY]], '#141a1f');
  _saPoly([[0, 190], [60, 176], [80, 186], [20, 230], [0, 240]], 'rgba(170,190,205,0.08)');
  ctx.fillStyle = '#10151a'; ctx.fillRect(52, 70, 16, 110);
  ctx.fillStyle = '#1c242c'; ctx.fillRect(46, 64, 28, 10);
  ctx.fillStyle = 'rgba(227,199,122,0.85)'; ctx.fillRect(56, 76, 8, 8);
  const beam = ctx.createLinearGradient(64, 80, 420, 150);
  beam.addColorStop(0, 'rgba(227,199,122,0.22)'); beam.addColorStop(1, 'rgba(227,199,122,0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(64, 78); ctx.lineTo(420, 120); ctx.lineTo(420, 176); ctx.lineTo(64, 84); ctx.closePath(); ctx.fill();

  // Glints of time caught on the water
  for (const g of L.glints) {
    const ph = (t + g.p) % 300;
    if (ph > 40) continue;
    const a = Math.sin((ph / 40) * Math.PI) * 0.8;
    ctx.fillStyle = `rgba(227,199,122,${a})`;
    ctx.fillRect(g.x - 3, g.y, 7, 1); ctx.fillRect(g.x, g.y - 3, 1, 7);
  }
}

// ── Collision Realm ─────────────────────────────────────────────────────────
function drawStoryCollisionArena() {
  const t = frameCount;
  const FY = _SA_FY;
  const L = _saLayout('collision', rng => ({
    debris: Array.from({ length: 6 }, () => ({ x: rng() * 1100, p: (rng() * 240) | 0, s: 3 + rng() * 5 })),
    rings: Array.from({ length: 2 }, (_, i) => ({ x: 200 + i * 460 + rng() * 80, p: (rng() * 300) | 0 })),
  }));

  _saBand(280, FY, '240,130,60', 0, 0.16);
  for (const r of L.rings) {
    const ph = ((t + r.p) % 300) / 300;
    ctx.strokeStyle = `rgba(255,190,120,${0.35 * (1 - ph)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(r.x, 396, 20 + ph * 280, 4 + ph * 34, 0, Math.PI, Math.PI * 2); ctx.stroke();
  }
  _saPoly([[0, 400], [200, 394], [360, 404], [600, 392], [900, 402], [900, FY], [0, FY]], '#24120a');

  // A building from somewhere else, driven into the ground at an angle
  ctx.save(); ctx.translate(150, FY + 10); ctx.rotate(-0.34);
  const bg = ctx.createLinearGradient(-50, 0, 50, 0);
  bg.addColorStop(0, '#4a4648'); bg.addColorStop(1, '#1c1a1c');
  ctx.fillStyle = bg; ctx.fillRect(-50, -230, 100, 230);
  _saPoly([[-50, -230], [-30, -250], [0, -236], [24, -262], [50, -238], [50, -230]], '#1c1a1c');
  ctx.fillStyle = 'rgba(200,190,160,0.18)';
  for (let y = -214; y < -20; y += 26) for (let x = -38; x < 40; x += 22) ctx.fillRect(x, y, 10, 12);
  ctx.restore();

  // An upturned slab of another world's meadow
  ctx.save(); ctx.translate(450, FY - 6); ctx.rotate(0.22);
  _saPoly([[-90, 0], [-70, -70], [60, -86], [96, -8]], '#2e2016');
  ctx.fillStyle = '#3e5a2e'; ctx.fillRect(-80, -86, 150, 10);
  ctx.fillStyle = '#2c4222';
  for (let x = -76; x < 66; x += 7) ctx.fillRect(x, -76, 2, 6 + (x * 13 % 5));
  ctx.restore();

  // Snapped girder
  ctx.save(); ctx.translate(730, FY); ctx.rotate(-0.9);
  ctx.fillStyle = '#2a1e18'; ctx.fillRect(0, -9, 220, 18);
  ctx.strokeStyle = '#1a120e'; ctx.lineWidth = 3;
  for (let x = 0; x < 200; x += 22) { ctx.beginPath(); ctx.moveTo(x, -9); ctx.lineTo(x + 22, 9); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,200,150,0.12)'; ctx.fillRect(0, -9, 220, 2);
  ctx.restore();

  // Crater rims along the floor line
  for (const [x, w] of [[300, 90], [590, 120], [840, 70]]) {
    ctx.fillStyle = '#2c160c'; ctx.beginPath(); ctx.ellipse(x, FY, w, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#120806'; ctx.beginPath(); ctx.ellipse(x, FY, w * 0.7, 5, 0, Math.PI, Math.PI * 2); ctx.fill();
  }

  // Debris still coming down
  for (const d of L.debris) {
    const ph = (t + d.p) % 240;
    if (ph > 80) continue;
    const x = d.x - ph * 3, y = -20 + ph * 5.6;
    const g = ctx.createLinearGradient(x + 40, y - 70, x, y);
    g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,190,120,0.55)');
    ctx.strokeStyle = g; ctx.lineWidth = d.s * 0.6;
    ctx.beginPath(); ctx.moveTo(x + 40, y - 70); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#3a2418'; ctx.fillRect(x - d.s / 2, y - d.s / 2, d.s, d.s);
  }
  _saMotes('collision', 24, '255,170,100', 0.4, 0.3, -1);
}
