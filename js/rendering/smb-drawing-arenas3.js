'use strict';
// smb-drawing-arenas3.js — Online/large arenas + home world arenas (megacity, warpzone, homeyard, alley, suburb, rural, portal edge, realm entry, boss sanctum)
// Depends on: smb-globals.js, smb-data-arenas.js, smb-particles-core.js

// ─── ONLINE-ONLY LARGE ARENA DRAW FUNCTIONS ─────────────────────────────────

// ── Shared helpers for the large online arenas ────────────────────────────
// These maps span mapLeft..mapRight (-900..2700 for the 3600-wide set), but the
// original draw functions all hardcoded `W = 1800` starting at x=0, so the whole
// left half of every one of them had no art at all. _arenaSpan returns the real
// world extent, and _arenaVis the slice the camera can actually see so wide maps
// don't pay to draw thousands of off-screen windows.
function _arenaSpan(pad) {
  const a  = currentArena || {};
  const x0 = (a.mapLeft !== undefined ? a.mapLeft : 0) - (pad || 0);
  const x1 = (a.mapRight !== undefined ? a.mapRight
             : (a.worldWidth ? x0 + a.worldWidth : GAME_W)) + (pad || 0);
  return { x0, x1, w: x1 - x0 };
}
function _arenaVis(margin) {
  const c = (typeof camXCur === 'number') ? camXCur : GAME_W / 2;
  const m = margin || 700;
  return { lo: c - GAME_W - m, hi: c + GAME_W + m };
}

// ── Mega City ─────────────────────────────────────────────────────────────
function _megacityBg() {
  if (_megacityBg._c) return _megacityBg._c;
  const sp = _arenaSpan(400);
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Three parallax skyline layers, far to near
  const layers = [
    { par: 0.05, step: 74, hMin:  90, hMax: 190, fill: '#141430', win: 'rgba(180,200,255,',  winStep: 22, alpha: 0.30, base: 0 },
    { par: 0.12, step: 88, hMin: 140, hMax: 280, fill: '#101028', win: 'rgba(255,220,120,',  winStep: 18, alpha: 0.55, base: 18 },
    { par: 0.22, step: 116, hMin: 190, hMax: 380, fill: '#0a0a1c', win: 'rgba(255,225,140,', winStep: 16, alpha: 0.75, base: 40 },
  ];
  for (const L of layers) {
    L.blds = [];
    for (let x = sp.x0; x < sp.x1; x += L.step) {
      const w = L.step * rnd(0.62, 0.92);
      const h = rnd(L.hMin, L.hMax);
      const wins = [];
      for (let wy = 10; wy < h - 12; wy += L.winStep) {
        for (let wx = 6; wx < w - 8; wx += L.winStep * 0.8) {
          if (Math.random() < 0.34) continue;              // dark units
          wins.push({ x: wx, y: wy, seed: Math.random() * 100 });
        }
      }
      L.blds.push({
        x: x + rnd(-6, 6), w, h, wins,
        mast:   Math.random() < 0.30,
        holo:   Math.random() < 0.14,
        hue:    [190, 300, 340, 165][(Math.random() * 4) | 0],
      });
    }
  }
  // Flying traffic on two lanes
  const cars = Array.from({ length: 14 }, () => ({
    y:    rnd(60, 230),
    x:    rnd(sp.x0, sp.x1),
    spd:  rnd(0.9, 2.4) * (Math.random() < 0.5 ? -1 : 1),
    len:  rnd(14, 34),
    warm: Math.random() < 0.5,
  }));
  // Rain
  const rain = Array.from({ length: 90 }, () => ({
    x: rnd(-100, GAME_W + 100), y: rnd(-40, 560),
    len: rnd(9, 22), spd: rnd(7, 13), slant: rnd(1.4, 2.6),
  }));
  _megacityBg._c = { layers, cars, rain, sp };
  return _megacityBg._c;
}

function drawMegacityArena() {
  const bg = _megacityBg();
  const f  = frameCount;
  const sp = bg.sp;
  const vis = _arenaVis();
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const H = 600;                                 // floor sits at y560 on this map

  ctx.save();

  // ── Sky: smog gradient plus light pollution rising off the city ───────────
  const sky = ctx.createLinearGradient(0, -120, 0, H);
  sky.addColorStop(0,    '#05060f');
  sky.addColorStop(0.55, '#0e0b26');
  sky.addColorStop(1,    '#2a1140');
  ctx.fillStyle = sky;
  ctx.fillRect(sp.x0, -300, sp.w, H + 320);

  // ── Moon low over the skyline ─────────────────────────────────────────────
  const mx = 380 - camOff * 0.02, my = 92;
  const mg = ctx.createRadialGradient(mx, my, 6, mx, my, 96);
  mg.addColorStop(0,   'rgba(255,238,210,0.30)');
  mg.addColorStop(1,   'rgba(255,238,210,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - 100, my - 100, 200, 200);
  ctx.fillStyle = 'rgba(248,240,222,0.88)';
  ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,190,175,0.30)';
  ctx.beginPath(); ctx.arc(mx - 8, my - 6, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 9, my + 7, 4, 0, Math.PI * 2); ctx.fill();

  // ── Searchlights sweeping the sky ─────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const bx = sp.x0 + sp.w * (0.22 + i * 0.28);
    if (bx < vis.lo || bx > vis.hi) continue;
    const ang = -Math.PI / 2 + Math.sin(f * 0.006 + i * 2.1) * 0.55;
    ctx.save();
    ctx.translate(bx, H - 40);
    ctx.rotate(ang);
    const lg = ctx.createLinearGradient(0, 0, 0, -520);
    lg.addColorStop(0, 'rgba(160,200,255,0.16)');
    lg.addColorStop(1, 'rgba(160,200,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(52, -520); ctx.lineTo(-52, -520);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ── Skyline layers ────────────────────────────────────────────────────────
  for (const L of bg.layers) {
    ctx.save();
    ctx.translate(-camOff * L.par, 0);
    const shift = camOff * L.par;
    for (const b of L.blds) {
      if (b.x + shift < vis.lo || b.x + shift > vis.hi) continue;   // cull off-screen
      const top = H - L.base - b.h;
      ctx.fillStyle = L.fill;
      ctx.fillRect(b.x, top, b.w, b.h + L.base);
      // roof edge catches the sky glow
      ctx.fillStyle = 'rgba(120,140,220,0.18)';
      ctx.fillRect(b.x, top, b.w, 2);
      // windows — precomputed positions, lit state cycles per unit
      for (const w of b.wins) {
        const lit = ((f * 0.012 + w.seed) % 3) < 1.9;
        ctx.fillStyle = L.win + (lit ? L.alpha : 0.06) + ')';
        ctx.fillRect(b.x + w.x, top + w.y, 5, 6);
      }
      // antenna with a blinking aircraft warning light
      if (b.mast) {
        ctx.fillStyle = '#2a2a48';
        ctx.fillRect(b.x + b.w * 0.5 - 1, top - 26, 2, 26);
        if (Math.sin(f * 0.09 + b.x) > 0.4) {
          ctx.fillStyle = 'rgba(255,60,60,0.95)';
          ctx.beginPath(); ctx.arc(b.x + b.w * 0.5, top - 28, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      // holographic billboard on the building face
      if (b.holo) {
        const hh = Math.min(b.h * 0.42, 84), hw = b.w * 0.72;
        const hx = b.x + b.w * 0.14, hy = top + 16;
        ctx.globalAlpha = 0.42 + Math.sin(f * 0.05 + b.x) * 0.10;
        ctx.fillStyle = `hsla(${b.hue},85%,55%,0.30)`;
        ctx.fillRect(hx, hy, hw, hh);
        ctx.strokeStyle = `hsla(${b.hue},90%,68%,0.75)`;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(hx, hy, hw, hh);
        // scan bands travelling down the panel
        ctx.fillStyle = `hsla(${b.hue},90%,72%,0.35)`;
        for (let k = 0; k < 4; k++) {
          const sy = hy + ((f * 0.9 + k * hh / 4) % hh);
          ctx.fillRect(hx, sy, hw, 2.5);
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  // ── Flying traffic ────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.16, 0);
  for (const c of bg.cars) {
    const span = sp.w + 200;
    const cx = sp.x0 - 100 + (((c.x - sp.x0 + f * c.spd) % span) + span) % span;
    if (cx + camOff * 0.16 < vis.lo || cx + camOff * 0.16 > vis.hi) continue;
    const dir = c.spd > 0 ? 1 : -1;
    const col = c.warm ? '255,190,90' : '120,210,255';
    const tg = ctx.createLinearGradient(cx, c.y, cx - dir * c.len, c.y);
    tg.addColorStop(0, `rgba(${col},0.85)`);
    tg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = tg;
    ctx.fillRect(Math.min(cx, cx - dir * c.len), c.y, c.len, 2);
  }
  ctx.restore();

  // ── Street-level glow haze under the skyline ──────────────────────────────
  const haze = ctx.createLinearGradient(0, H - 150, 0, H);
  haze.addColorStop(0, 'rgba(120,60,180,0)');
  haze.addColorStop(1, 'rgba(150,70,200,0.30)');
  ctx.fillStyle = haze;
  ctx.fillRect(sp.x0, H - 150, sp.w, 150);

  // ── Rain, drawn in screen space so it stays even on a panning map ─────────
  ctx.strokeStyle = 'rgba(170,190,240,0.20)';
  ctx.lineWidth   = 1;
  ctx.save();
  ctx.translate(camOff, 0);
  for (const r of bg.rain) {
    const ry = ((r.y + f * r.spd) % 640 + 640) % 640 - 60;
    ctx.beginPath();
    ctx.moveTo(r.x, ry);
    ctx.lineTo(r.x - r.slant * (r.len / 6), ry + r.len);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

// ── Warp Zone ─────────────────────────────────────────────────────────────
function _warpBg() {
  if (_warpBg._c) return _warpBg._c;
  const sp = _arenaSpan(400);
  const rnd = (a, b) => a + Math.random() * (b - a);
  _warpBg._c = {
    sp,
    stars: Array.from({ length: 300 }, () => ({
      x: rnd(sp.x0, sp.x1), y: rnd(-40, 560), r: rnd(0.5, 2.0),
      a: rnd(0.2, 0.9), ph: rnd(0, Math.PI * 2),
    })),
    // Rifts the map is named for — each a stack of concentric ellipses
    rifts: Array.from({ length: 7 }, (_, i) => ({
      x: sp.x0 + 260 + i * ((sp.w - 460) / 6),
      y: 110 + (i % 3) * 105,
      rx: rnd(48, 92), ry: rnd(26, 50),
      hue: [278, 300, 195, 320][(Math.random() * 4) | 0],
      spin: rnd(0.010, 0.026) * (Math.random() < 0.5 ? -1 : 1),
      ph: rnd(0, Math.PI * 2),
    })),
    // Tumbling debris pulled toward the rifts
    debris: Array.from({ length: 26 }, () => ({
      x: rnd(sp.x0, sp.x1), y: rnd(0, 540),
      s: rnd(4, 13), spd: rnd(0.3, 1.1), spin: rnd(-0.03, 0.03),
      n: 3 + ((Math.random() * 3) | 0),
    })),
    // Streaks radiating from the vanishing point
    streaks: Array.from({ length: 40 }, () => ({
      a: rnd(0, Math.PI * 2), r0: rnd(40, 260), len: rnd(30, 120),
      spd: rnd(0.9, 2.6), w: rnd(1, 2.6), hue: rnd(255, 320),
    })),
  };
  return _warpBg._c;
}

function drawWarpzoneArena() {
  const bg = _warpBg();
  const sp = bg.sp;
  const f  = frameCount;
  const vis = _arenaVis();
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const H = 600;

  ctx.save();

  // ── Void backdrop with a colour-shifting nebula wash ──────────────────────
  const g = ctx.createLinearGradient(0, -200, 0, H);
  g.addColorStop(0, '#0d0024');
  g.addColorStop(0.6, '#12003a');
  g.addColorStop(1, '#00001a');
  ctx.fillStyle = g;
  ctx.fillRect(sp.x0, -300, sp.w, H + 320);

  for (let i = 0; i < 4; i++) {
    const nx = sp.x0 + sp.w * (0.12 + i * 0.26) - camOff * 0.02;
    if (nx < vis.lo - 400 || nx > vis.hi + 400) continue;
    const ny = 120 + (i % 2) * 190;
    const hue = (250 + i * 26 + Math.sin(f * 0.004 + i) * 20) | 0;
    const ng = ctx.createRadialGradient(nx, ny, 10, nx, ny, 330);
    ng.addColorStop(0, `hsla(${hue},85%,55%,0.13)`);
    ng.addColorStop(1, `hsla(${hue},85%,45%,0)`);
    ctx.fillStyle = ng;
    ctx.fillRect(nx - 340, ny - 340, 680, 680);
  }

  // ── Star field ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.04, 0);
  for (const st of bg.stars) {
    if (st.x + camOff * 0.04 < vis.lo || st.x + camOff * 0.04 > vis.hi) continue;
    ctx.globalAlpha = st.a * (0.55 + Math.abs(Math.sin(f * 0.03 + st.ph)) * 0.45);
    ctx.fillStyle = '#dcc8ff';
    ctx.fillRect(st.x, st.y, st.r, st.r);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Hyperspace streaks radiating from the centre of the view ─────────────
  ctx.save();
  ctx.translate(450 + camOff * 0.02, 270);
  for (const s of bg.streaks) {
    const r = s.r0 + ((f * s.spd) % 300);
    const a = s.a + f * 0.0009;
    ctx.strokeStyle = `hsla(${s.hue},90%,72%,${Math.max(0, 0.30 - r / 1900)})`;
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.62);
    ctx.lineTo(Math.cos(a) * (r + s.len), Math.sin(a) * (r + s.len) * 0.62);
    ctx.stroke();
  }
  ctx.restore();

  // ── Warp rifts: nested rotating rings with a dark core ───────────────────
  ctx.save();
  ctx.translate(-camOff * 0.10, 0);
  for (const rf of bg.rifts) {
    if (rf.x + camOff * 0.10 < vis.lo || rf.x + camOff * 0.10 > vis.hi) continue;
    const puls = Math.sin(f * 0.03 + rf.ph);
    ctx.save();
    ctx.translate(rf.x, rf.y);
    // event-horizon core
    const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, rf.rx);
    cg.addColorStop(0,   'rgba(0,0,0,0.85)');
    cg.addColorStop(0.6, `hsla(${rf.hue},90%,45%,0.35)`);
    cg.addColorStop(1,   `hsla(${rf.hue},90%,60%,0)`);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.ellipse(0, 0, rf.rx, rf.ry, 0, 0, Math.PI * 2); ctx.fill();
    // rings
    for (let k = 0; k < 4; k++) {
      const t = k / 4;
      ctx.rotate(f * rf.spin * (1 - t * 0.5));
      ctx.strokeStyle = `hsla(${rf.hue + k * 12},95%,${62 + k * 6}%,${(0.55 - t * 0.10) + puls * 0.18})`;
      ctx.lineWidth = 3 - t * 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, rf.rx * (1 + t * 0.28) + puls * 5, rf.ry * (1 + t * 0.28) + puls * 3,
                  t * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // arcs jumping across the mouth
    ctx.strokeStyle = `hsla(${rf.hue},100%,84%,${0.30 + puls * 0.25})`;
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      const a0 = f * 0.05 + k * 2.1 + rf.ph;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * rf.rx, Math.sin(a0) * rf.ry);
      ctx.quadraticCurveTo(0, 0,
        Math.cos(a0 + 2.4) * rf.rx, Math.sin(a0 + 2.4) * rf.ry);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  // ── Tumbling debris ───────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.14, 0);
  for (const d of bg.debris) {
    const span = sp.w + 200;
    const dx = sp.x0 - 100 + (((d.x - sp.x0 + f * d.spd) % span) + span) % span;
    if (dx + camOff * 0.14 < vis.lo || dx + camOff * 0.14 > vis.hi) continue;
    ctx.save();
    ctx.translate(dx, d.y + Math.sin(f * 0.01 + d.x) * 12);
    ctx.rotate(f * d.spin);
    ctx.fillStyle = 'rgba(80,40,140,0.75)';
    ctx.strokeStyle = 'rgba(200,150,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < d.n; k++) {
      const a = (k / d.n) * Math.PI * 2;
      const x = Math.cos(a) * d.s, y = Math.sin(a) * d.s;
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ── Energy grid floor glow ────────────────────────────────────────────────
  const fg = ctx.createLinearGradient(0, H - 130, 0, H);
  fg.addColorStop(0, 'rgba(136,0,255,0)');
  fg.addColorStop(1, 'rgba(136,0,255,0.32)');
  ctx.fillStyle = fg;
  ctx.fillRect(sp.x0, H - 130, sp.w, 130);
  ctx.strokeStyle = 'rgba(180,110,255,0.20)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const gx = sp.x0 + ((i * 150 + f * 0.6) % sp.w);
    ctx.beginPath();
    ctx.moveTo(gx, H - 130);
    ctx.lineTo(gx + 70, H);
    ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const gy = H - 130 + i * 26;
    ctx.beginPath(); ctx.moveTo(sp.x0, gy); ctx.lineTo(sp.x1, gy); ctx.stroke();
  }

  ctx.restore();
}

// ── Grand Colosseum ───────────────────────────────────────────────────────
function _colo10Bg() {
  if (_colo10Bg._c) return _colo10Bg._c;
  const sp = _arenaSpan(400);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const robes = ['#c8a06a', '#b0603a', '#8a4a3a', '#d8c090', '#7a5a48', '#a08050'];
  const crowd = [];
  for (let tier = 0; tier < 2; tier++) {
    const rows = tier === 0 ? 5 : 6;
    for (let row = 0; row < rows; row++) {
      const y = (tier === 0 ? 236 : 152) + row * 12;
      for (let x = sp.x0; x < sp.x1; x += 11) {
        if (Math.random() < 0.14) continue;
        crowd.push({
          x: x + rnd(-2, 2), y: y + rnd(-1.5, 1.5), r: 2.5 + rnd(0, 1.1),
          c: robes[(Math.random() * robes.length) | 0], ph: rnd(0, Math.PI * 2),
        });
      }
    }
  }
  // Dust motes hanging in the sun shafts
  const motes = Array.from({ length: 60 }, () => ({
    x: rnd(-100, GAME_W + 100), y: rnd(120, 560),
    r: rnd(0.7, 2.2), spd: rnd(0.06, 0.24), drift: rnd(0.004, 0.013),
    amp: rnd(8, 30), ph: rnd(0, Math.PI * 2), a: rnd(0.10, 0.34),
  }));
  _colo10Bg._c = { sp, crowd, motes };
  return _colo10Bg._c;
}

function drawColosseum10Arena() {
  const bg = _colo10Bg();
  const sp = bg.sp;
  const f  = frameCount;
  const vis = _arenaVis();
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const H = 600;

  ctx.save();

  // ── Dusk sky over the open roof ───────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, -200, 0, 200);
  sky.addColorStop(0,   '#160600');
  sky.addColorStop(0.6, '#3a1400');
  sky.addColorStop(1,   '#7a3208');
  ctx.fillStyle = sky;
  ctx.fillRect(sp.x0, -300, sp.w, 500);

  // ── Velarium: the awning ring around the top of the bowl ──────────────────
  ctx.fillStyle = '#2a1206';
  ctx.fillRect(sp.x0, 96, sp.w, 22);
  for (let x = sp.x0; x < sp.x1; x += 74) {
    if (x < vis.lo || x > vis.hi) continue;
    const sag = 16 + Math.sin(x * 0.02 + f * 0.01) * 2.5;
    ctx.fillStyle = ((x / 74) | 0) % 2 ? 'rgba(180,60,30,0.72)' : 'rgba(210,150,70,0.72)';
    ctx.beginPath();
    ctx.moveTo(x, 118);
    ctx.quadraticCurveTo(x + 37, 118 + sag, x + 74, 118);
    ctx.lineTo(x + 74, 118); ctx.lineTo(x, 118);
    ctx.closePath();
    ctx.fill();
  }

  // ── Stands ────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#3a1c08'; ctx.fillRect(sp.x0, 140, sp.w, 88);   // upper tier
  ctx.fillStyle = '#2e1506'; ctx.fillRect(sp.x0, 228, sp.w, 12);   // walkway
  ctx.fillStyle = '#432008'; ctx.fillRect(sp.x0, 240, sp.w, 78);   // lower tier

  // ── Crowd — sways constantly, erupts on a big hit ─────────────────────────
  const hype = screenShake > 4 ? 1 : 0;
  ctx.globalAlpha = 0.62;
  for (const c of bg.crowd) {
    if (c.x < vis.lo || c.x > vis.hi) continue;
    const bob = Math.sin(f * 0.05 + c.ph) * 1.2 + hype * Math.abs(Math.sin(f * 0.38 + c.ph)) * 6;
    ctx.fillStyle = c.c;
    ctx.beginPath();
    ctx.arc(c.x, c.y - bob, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Arcade of stone arches below the stands ───────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.05, 0);
  for (let x = sp.x0; x < sp.x1; x += 155) {
    if (x + camOff * 0.05 < vis.lo || x + camOff * 0.05 > vis.hi) continue;
    const ax = x, aw = 118, ah = 190, top = H - ah - 40;
    ctx.fillStyle = '#4a2808';
    ctx.fillRect(ax, top, 22, ah);
    ctx.fillRect(ax + aw - 22, top, 22, ah);
    ctx.beginPath();
    ctx.arc(ax + aw / 2, top, aw / 2, Math.PI, 0);
    ctx.fill();
    // shadowed void inside the arch
    ctx.fillStyle = 'rgba(12,4,0,0.72)';
    ctx.beginPath();
    ctx.arc(ax + aw / 2, top + 4, aw / 2 - 22, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(ax + 22, top + 4, aw - 44, ah - 4);
    // capital + base highlights
    ctx.fillStyle = 'rgba(200,150,80,0.20)';
    ctx.fillRect(ax, top, 22, 4);
    ctx.fillRect(ax + aw - 22, top, 22, 4);
  }
  ctx.restore();

  // ── Banners hung between the arches ───────────────────────────────────────
  for (let x = sp.x0 + 60; x < sp.x1; x += 310) {
    if (x < vis.lo || x > vis.hi) continue;
    const sway = Math.sin(f * 0.018 + x * 0.01) * 4;
    ctx.fillStyle = 'rgba(150,30,25,0.80)';
    ctx.beginPath();
    ctx.moveTo(x, 320);
    ctx.lineTo(x + 44, 320);
    ctx.lineTo(x + 44 + sway, 420);
    ctx.lineTo(x + 22 + sway, 408);
    ctx.lineTo(x + sway, 420);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(225,190,90,0.75)';
    ctx.beginPath();
    ctx.arc(x + 22 + sway * 0.5, 362, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Torches on the arcade piers, each with a glow pool ────────────────────
  for (let x = sp.x0 + 100; x < sp.x1; x += 155) {
    if (x < vis.lo || x > vis.hi) continue;
    const ty = H - 210;
    const flick = Math.sin(f * 0.2 + x) * 0.3 + Math.sin(f * 0.53 + x * 0.4) * 0.15;
    ctx.fillStyle = '#2a1a0c';
    ctx.fillRect(x - 2, ty, 4, 22);
    const tg = ctx.createRadialGradient(x, ty, 2, x, ty, 54 + flick * 14);
    tg.addColorStop(0,   `rgba(255,${170 + flick * 60},60,0.55)`);
    tg.addColorStop(0.4, 'rgba(255,120,20,0.16)');
    tg.addColorStop(1,   'rgba(255,120,20,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(x - 70, ty - 70, 140, 140);
    ctx.fillStyle = `rgba(255,${190 + flick * 50},80,${0.8 + flick * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, ty - 4, 5 + flick * 2, 9 + flick * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Sun shafts raking in over the rim ─────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.09;
  for (let i = 0; i < 5; i++) {
    const bx = sp.x0 + sp.w * (0.12 + i * 0.19) - camOff * 0.05;
    if (bx < vis.lo - 300 || bx > vis.hi + 300) continue;
    const shg = ctx.createLinearGradient(bx, 130, bx + 150, H);
    shg.addColorStop(0, 'rgba(255,200,120,1)');
    shg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = shg;
    ctx.beginPath();
    ctx.moveTo(bx - 30, 130); ctx.lineTo(bx + 40, 130);
    ctx.lineTo(bx + 230, H);  ctx.lineTo(bx + 110, H);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // ── Sand haze at the arena floor ──────────────────────────────────────────
  const hz = ctx.createLinearGradient(0, H - 150, 0, H);
  hz.addColorStop(0, 'rgba(190,140,70,0)');
  hz.addColorStop(1, 'rgba(190,140,70,0.26)');
  ctx.fillStyle = hz;
  ctx.fillRect(sp.x0, H - 150, sp.w, 150);

  // ── Dust motes drifting in the shafts (screen space) ──────────────────────
  ctx.save();
  ctx.translate(camOff, 0);
  ctx.fillStyle = '#e8cf9a';
  for (const m of bg.motes) {
    const my = ((m.y - f * m.spd) % 620 + 620) % 620 - 40;
    const mx = m.x + Math.sin(f * m.drift + m.ph) * m.amp;
    ctx.globalAlpha = m.a;
    ctx.beginPath(); ctx.arc(mx, my, m.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.restore();
}

// ── Home world: Backyard ───────────────────────────────────────────────────────
function drawHomeYardArena() {
  const W = GAME_W;
  const groundY = 480;

  // Sky — clear afternoon
  const sky = ctx.createLinearGradient(0,0,0,groundY);
  sky.addColorStop(0,'#5aaddb'); sky.addColorStop(1,'#c0e8f8');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,groundY);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  [[120,60,55,22],[360,40,70,26],[640,70,50,20],[800,50,60,24]].forEach(([cx,cy,rx,ry])=>{
    ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+30,cy-8,rx*0.7,ry*0.7,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx-28,cy-4,rx*0.6,ry*0.6,0,0,Math.PI*2); ctx.fill();
  });

  // Back wall of house — large, spans most of the width
  ctx.fillStyle = '#c8b89a'; ctx.strokeStyle='#a09070'; ctx.lineWidth=2;
  ctx.fillRect(0, 180, W, groundY-180);
  // Brick texture rows
  ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=1;
  for(let ry=200; ry<groundY; ry+=18){
    ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(W,ry); ctx.stroke();
    const off = ((ry/18)|0)%2 === 0 ? 0 : 55;
    for(let rx=off; rx<W; rx+=110){
      ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx,ry+18); ctx.stroke();
    }
  }

  // Sliding glass door (center)
  ctx.fillStyle='rgba(180,220,255,0.35)'; ctx.strokeStyle='#8aadcc'; ctx.lineWidth=2;
  ctx.fillRect(360,270,180,210); ctx.strokeRect(360,270,180,210);
  ctx.beginPath(); ctx.moveTo(450,270); ctx.lineTo(450,480); ctx.stroke();
  // Door frame
  ctx.strokeStyle='#6a8aa8'; ctx.lineWidth=3;
  ctx.strokeRect(360,270,180,210);
  // Reflection shimmer
  ctx.fillStyle='rgba(255,255,255,0.18)';
  ctx.fillRect(366,276,24,180);

  // Window (left of door)
  ctx.fillStyle='rgba(180,220,255,0.3)'; ctx.strokeStyle='#8aadcc'; ctx.lineWidth=1.5;
  ctx.fillRect(180,290,120,90); ctx.strokeRect(180,290,120,90);
  ctx.beginPath(); ctx.moveTo(240,290); ctx.lineTo(240,380); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(180,335); ctx.lineTo(300,335); ctx.stroke();
  // Curtains
  ctx.fillStyle='rgba(255,220,180,0.5)';
  ctx.fillRect(180,290,28,90); ctx.fillRect(272,290,28,90);

  // Window (right)
  ctx.fillStyle='rgba(180,220,255,0.3)'; ctx.strokeStyle='#8aadcc'; ctx.lineWidth=1.5;
  ctx.fillRect(600,290,120,90); ctx.strokeRect(600,290,120,90);
  ctx.beginPath(); ctx.moveTo(660,290); ctx.lineTo(660,380); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(600,335); ctx.lineTo(720,335); ctx.stroke();
  ctx.fillStyle='rgba(255,220,180,0.5)';
  ctx.fillRect(600,290,28,90); ctx.fillRect(692,290,28,90);

  // Wooden fence (back of yard)
  ctx.fillStyle='#c4966a'; ctx.strokeStyle='#9a7040'; ctx.lineWidth=1.5;
  // Horizontal rails
  ctx.fillRect(0,195,W,10); ctx.strokeRect(0,195,W,10);
  ctx.fillRect(0,218,W,8);  ctx.strokeRect(0,218,W,8);
  // Vertical pickets (left section and right section, door gap in middle)
  for(let fx=0; fx<360; fx+=22){
    ctx.fillRect(fx+2,170,16,50); ctx.strokeRect(fx+2,170,16,50);
  }
  for(let fx=540; fx<W; fx+=22){
    ctx.fillRect(fx+2,170,16,50); ctx.strokeRect(fx+2,170,16,50);
  }

  // Patio concrete slab
  ctx.fillStyle='#b0a898'; ctx.strokeStyle='#908878'; ctx.lineWidth=1;
  ctx.fillRect(300,460,300,20); ctx.strokeRect(300,460,300,20);
  // Patio grout lines
  ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1;
  for(let px=300; px<600; px+=50){ ctx.beginPath(); ctx.moveTo(px,460); ctx.lineTo(px,480); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(300,470); ctx.lineTo(600,470); ctx.stroke();

  // Lawn — green ground (extends well past canvas so camera zoom-out never shows void)
  const grass = ctx.createLinearGradient(0,groundY-30,0,groundY+40);
  grass.addColorStop(0,'#5a9040'); grass.addColorStop(1,'#3d6e28');
  ctx.fillStyle = grass; ctx.fillRect(0,groundY,W,600);
  ctx.fillStyle='#4a8030'; ctx.fillRect(0,groundY,W,8);

  // Lawn texture — random darker blades
  ctx.strokeStyle='rgba(40,80,20,0.25)'; ctx.lineWidth=1;
  for(let bx=0; bx<W; bx+=14){
    ctx.beginPath(); ctx.moveTo(bx,groundY); ctx.lineTo(bx+3,groundY-8); ctx.stroke();
  }

  // Small flower pots on patio
  [[328,460],[560,460]].forEach(([px,py])=>{
    ctx.fillStyle='#9a5030'; ctx.strokeStyle='#7a3820'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px-8,py); ctx.lineTo(px+8,py); ctx.lineTo(px+6,py-14); ctx.lineTo(px-6,py-14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e06040'; ctx.beginPath(); ctx.arc(px,py-18,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#3a7020'; ctx.fillRect(px-1,py-28,2,12);
  });

  // Left & right wooden fence barriers (hard walls)
  [[0, 40],[W-40, 40]].forEach(([bx, bw])=>{
    ctx.fillStyle='#c4966a'; ctx.strokeStyle='#9a7040'; ctx.lineWidth=1.5;
    ctx.fillRect(bx,0,bw,groundY);
    // Horizontal rails
    ctx.fillStyle='#b08050'; ctx.fillRect(bx,200,bw,10); ctx.fillRect(bx,260,bw,10);
    // Vertical pickets
    for(let fy=0; fy<groundY; fy+=22){
      ctx.fillStyle='#c4966a'; ctx.fillRect(bx+4,fy,bw-8,18); ctx.strokeRect(bx+4,fy,bw-8,18);
    }
  });
}

// ── Home world: City Alley ─────────────────────────────────────────────────────
function drawHomeAlleyArena() {
  const W = GAME_W;
  const groundY = 480;
  const t = frameCount * 0.02;

  // Sky strip between buildings — dark/dusk
  const sky = ctx.createLinearGradient(0,0,0,160);
  sky.addColorStop(0,'#1a2030'); sky.addColorStop(1,'#2a3040');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,160);

  // Stars in the narrow sky strip
  ctx.fillStyle='rgba(255,255,255,0.7)';
  [[60,20],[130,40],[200,15],[300,35],[400,22],[500,38],[620,18],[730,42],[820,28],[880,15]].forEach(([sx,sy])=>{
    const blink = Math.sin(t + sx*0.1) * 0.3 + 0.7;
    ctx.globalAlpha = blink * 0.7;
    ctx.beginPath(); ctx.arc(sx,sy,1,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // LEFT building wall — brick
  const leftW = 130;
  ctx.fillStyle='#3a3028'; ctx.fillRect(0,0,leftW,groundY);
  // Brick pattern
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
  for(let ry=0; ry<groundY; ry+=16){
    ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(leftW,ry); ctx.stroke();
    const off = ((ry/16)|0)%2===0 ? 0 : 50;
    for(let rx=off; rx<leftW; rx+=100){ ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx,ry+16); ctx.stroke(); }
  }
  // Fire escape on left wall
  ctx.strokeStyle='#555545'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(leftW-2,160); ctx.lineTo(leftW-2,groundY); ctx.stroke();
  [220,310,400,groundY-10].forEach(fy=>{
    ctx.fillStyle='#444434'; ctx.fillRect(leftW-30,fy,30,6);
    ctx.strokeStyle='#333324'; ctx.lineWidth=1;
    ctx.strokeRect(leftW-30,fy,30,6);
    // Railing
    for(let rx=leftW-28; rx<leftW; rx+=8){ ctx.beginPath(); ctx.moveTo(rx,fy); ctx.lineTo(rx,fy-20); ctx.stroke(); }
  });
  // Lit window on left
  ctx.fillStyle='rgba(255,200,80,0.35)'; ctx.strokeStyle='#555'; ctx.lineWidth=1;
  ctx.fillRect(8,100,60,50); ctx.strokeRect(8,100,60,50);
  ctx.fillStyle='rgba(255,200,80,0.12)'; // window glow
  ctx.beginPath(); ctx.ellipse(38,125,50,40,0,0,Math.PI*2); ctx.fill();

  // RIGHT building wall
  const rightX = W-130;
  ctx.fillStyle='#2e2a24'; ctx.fillRect(rightX,0,130,groundY);
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
  for(let ry=0; ry<groundY; ry+=16){
    ctx.beginPath(); ctx.moveTo(rightX,ry); ctx.lineTo(W,ry); ctx.stroke();
    const off = ((ry/16)|0)%2===0 ? 0 : 50;
    for(let rx=off; rx<130; rx+=100){ ctx.beginPath(); ctx.moveTo(rightX+rx,ry); ctx.lineTo(rightX+rx,ry+16); ctx.stroke(); }
  }
  ctx.fillStyle='rgba(255,200,80,0.3)'; ctx.strokeStyle='#555'; ctx.lineWidth=1;
  ctx.fillRect(rightX+12,80,70,45); ctx.strokeRect(rightX+12,80,70,45);
  ctx.fillStyle='rgba(255,200,80,0.10)';
  ctx.beginPath(); ctx.ellipse(rightX+47,105,60,40,0,0,Math.PI*2); ctx.fill();

  // Alley depth — dark background between buildings
  const depthGrad = ctx.createLinearGradient(0,0,0,groundY);
  depthGrad.addColorStop(0,'#141820'); depthGrad.addColorStop(1,'#1e2028');
  ctx.fillStyle=depthGrad; ctx.fillRect(leftW,0,rightX-leftW,groundY);

  // Overhead wires
  ctx.strokeStyle='rgba(40,40,40,0.9)'; ctx.lineWidth=1.5;
  [[leftW,80,rightX,100],[leftW,120,rightX,108]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    const mid=(x1+x2)/2;
    ctx.quadraticCurveTo(mid,y1+18,x2,y2);
    ctx.stroke();
  });
  // Hanging light
  const lightX = W*0.5, lightY = 110;
  const swing = Math.sin(t) * 8;
  ctx.strokeStyle='rgba(40,40,40,0.8)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(lightX,90); ctx.lineTo(lightX+swing,lightY); ctx.stroke();
  ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(lightX+swing,lightY,6,0,Math.PI*2); ctx.fill();
  // Light cone
  const lightFlicker = 0.15 + Math.sin(t*3)*0.05;
  const lgrad = ctx.createRadialGradient(lightX+swing,lightY,0,lightX+swing,lightY,180);
  lgrad.addColorStop(0,`rgba(255,200,100,${lightFlicker*2})`);
  lgrad.addColorStop(1,'rgba(255,200,100,0)');
  ctx.fillStyle=lgrad;
  ctx.beginPath(); ctx.moveTo(lightX+swing,lightY); ctx.lineTo(lightX+swing-100,groundY); ctx.lineTo(lightX+swing+100,groundY); ctx.closePath(); ctx.fill();

  // Ground — wet asphalt (fill well past canvas to eliminate void on zoom-out)
  const road = ctx.createLinearGradient(0,groundY,0,groundY+60);
  road.addColorStop(0,'#252525'); road.addColorStop(1,'#1a1a1a');
  ctx.fillStyle=road; ctx.fillRect(0,groundY,W,600);
  // Cracks
  ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1;
  [[200,groundY,220,groundY+20],[450,groundY,440,groundY+15],[700,groundY,715,groundY+18]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
  // Puddle reflection
  ctx.fillStyle='rgba(255,200,100,0.06)';
  ctx.beginPath(); ctx.ellipse(lightX,groundY+12,60,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(100,140,200,0.08)';
  ctx.beginPath(); ctx.ellipse(250,groundY+10,40,6,0,0,Math.PI*2); ctx.fill();
  // Ground line
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,groundY,W,4);

  // Graffiti on left wall (simple colored shapes)
  ctx.save(); ctx.globalAlpha=0.45;
  ctx.fillStyle='#dd4422'; ctx.font='bold 18px Arial';
  ctx.fillText('NO', 20, 340);
  ctx.fillStyle='#2244cc';
  ctx.fillText('WAY', 22, 360);
  ctx.restore();

  // Graffiti arrow on right
  ctx.save(); ctx.globalAlpha=0.35; ctx.strokeStyle='#cc8800'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(rightX+15,300); ctx.lineTo(rightX+55,300); ctx.lineTo(rightX+48,293); ctx.moveTo(rightX+55,300); ctx.lineTo(rightX+48,307); ctx.stroke();
  ctx.restore();

  // Dumpsters — decorative, flush against ground (no collision)
  [[80,480],[700,480]].forEach(([dx,dy])=>{
    ctx.fillStyle='#2a7a3a'; ctx.strokeStyle='#1a5a2a'; ctx.lineWidth=2;
    ctx.fillRect(dx,dy-38,120,38); ctx.strokeRect(dx,dy-38,120,38);
    ctx.fillStyle='#1a6a2a'; ctx.fillRect(dx-2,dy-42,124,8); ctx.strokeRect(dx-2,dy-42,124,8);
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
    ctx.strokeRect(dx+10,dy-28,30,18);
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font='7px Arial';
    ctx.fillText('WASTE', dx+8, dy-16);
  });

  // Rats (tiny animated)
  const ratX = 180 + Math.sin(t*0.8)*15;
  ctx.fillStyle='#555'; ctx.save();
  ctx.translate(ratX, groundY+5);
  ctx.beginPath(); ctx.ellipse(0,0,8,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-8,0,3,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#555'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(8,0); ctx.quadraticCurveTo(16,-3,20,1); ctx.stroke();
  ctx.restore();

  // Left & right solid brick barrier walls (hard walls matching physics boundary)
  [[0,40],[W-40,40]].forEach(([bx,bw])=>{
    ctx.fillStyle='#3a3028'; ctx.fillRect(bx,0,bw,groundY);
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
    for(let ry=0; ry<groundY; ry+=16){
      ctx.beginPath(); ctx.moveTo(bx,ry); ctx.lineTo(bx+bw,ry); ctx.stroke();
      const off=((ry/16)|0)%2===0?0:50;
      for(let rx=off; rx<bw; rx+=100){ ctx.beginPath(); ctx.moveTo(bx+rx,ry); ctx.lineTo(bx+rx,ry+16); ctx.stroke(); }
    }
    // Grime/moss patches
    ctx.fillStyle='rgba(40,60,20,0.2)'; ctx.fillRect(bx, groundY-80, bw, 80);
  });
}

function drawSuburbArena() {
  const W = GAME_W;
  const sky = ctx.createLinearGradient(0,0,0,480);
  sky.addColorStop(0,'#87CEEB'); sky.addColorStop(1,'#daf0ff');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,GAME_H);
  // Houses in background
  const houses = [{x:60,w:120,h:140},{x:230,w:140,h:160},{x:430,w:160,h:150},{x:640,w:130,h:145},{x:780,w:110,h:130}];
  for (const hh of houses) {
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(hh.x, 480-hh.h, hh.w, hh.h);
    ctx.fillStyle = '#aa5522';
    ctx.beginPath();
    ctx.moveTo(hh.x - 10, 480 - hh.h);
    ctx.lineTo(hh.x + hh.w/2, 480 - hh.h - 60);
    ctx.lineTo(hh.x + hh.w + 10, 480 - hh.h);
    ctx.fill();
    ctx.fillStyle = 'rgba(100,180,255,0.6)';
    ctx.fillRect(hh.x + 15, 480 - hh.h + 25, 30, 30);
    ctx.fillRect(hh.x + hh.w - 45, 480 - hh.h + 25, 30, 30);
  }
  // Portal smoke effect (chaos beginning)
  const smokeAlpha = 0.08 + Math.sin(frameCount * 0.04) * 0.03;
  ctx.fillStyle = `rgba(80,0,80,${smokeAlpha})`;
  ctx.fillRect(0,0,W,GAME_H);
  // Lawn — extend well below canvas to eliminate void on zoom-out
  ctx.fillStyle = '#5a8a3a'; ctx.fillRect(0, 480, W, 600);
  // Sidewalk strip
  ctx.fillStyle = '#c8b890'; ctx.fillRect(0, 472, W, 8);
  ctx.strokeStyle = '#a09070'; ctx.lineWidth = 1;
  for (let sx = 0; sx < W; sx += 80) { ctx.beginPath(); ctx.moveTo(sx,472); ctx.lineTo(sx,480); ctx.stroke(); }

  // Left & right picket fence barriers (hard wall boundaries)
  [[0,40],[W-40,40]].forEach(([bx,bw])=>{
    // Lawn behind fence
    ctx.fillStyle='#5a8a3a'; ctx.fillRect(bx,0,bw,480);
    // Fence rails
    ctx.fillStyle='#f0ece0'; ctx.strokeStyle='#c8c0a0'; ctx.lineWidth=1.5;
    ctx.fillRect(bx,300,bw,8); ctx.strokeRect(bx,300,bw,8);
    ctx.fillRect(bx,340,bw,8); ctx.strokeRect(bx,340,bw,8);
    // Pickets
    for(let fy=260; fy<480; fy+=16){
      ctx.fillStyle='#f5f0e0'; ctx.fillRect(bx+4,fy,bw-8,14); ctx.strokeRect(bx+4,fy,bw-8,14);
      // Pointed top
      ctx.beginPath(); ctx.moveTo(bx+4,fy); ctx.lineTo(bx+bw/2,fy-8); ctx.lineTo(bx+bw-4,fy); ctx.closePath();
      ctx.fillStyle='#f5f0e0'; ctx.fill(); ctx.stroke();
    }
  });
}

function drawRuralArena() {
  const W = GAME_W;
  const groundY = 480;

  // Sky — sunset gradient
  const sky = ctx.createLinearGradient(0,0,0,groundY);
  sky.addColorStop(0,'#f5c842'); sky.addColorStop(0.5,'#f0a020'); sky.addColorStop(1,'#c87010');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,groundY);

  // Sun
  ctx.fillStyle = 'rgba(255,220,80,0.9)';
  ctx.beginPath(); ctx.arc(740, 100, 55, 0, Math.PI*2); ctx.fill();

  // Background barn (purely decorative — does not reach ground)
  ctx.fillStyle = '#8b1a1a';
  ctx.fillRect(220, 300, 180, 180);
  ctx.fillStyle = '#6b1010';
  ctx.beginPath(); ctx.moveTo(210,300); ctx.lineTo(310,230); ctx.lineTo(410,300); ctx.fill();
  ctx.fillStyle = '#4a0808';
  ctx.fillRect(285, 390, 60, 90);

  // Background silo
  ctx.fillStyle = '#c8b870';
  ctx.fillRect(500, 300, 60, 180);
  ctx.beginPath(); ctx.arc(530, 300, 30, Math.PI, 0); ctx.fill();

  // Portal glow in distance (story atmosphere)
  const pg = ctx.createRadialGradient(150, 380, 10, 150, 380, 80);
  pg.addColorStop(0, `rgba(180,0,255,${0.35 + Math.sin(frameCount*0.06)*0.12})`);
  pg.addColorStop(1, 'rgba(180,0,255,0)');
  ctx.fillStyle = pg; ctx.fillRect(0,200,300,280);

  // Ground — dirt/earth, extend far below to eliminate void
  const dirt = ctx.createLinearGradient(0,groundY,0,groundY+60);
  dirt.addColorStop(0,'#8a6a38'); dirt.addColorStop(1,'#6a4e28');
  ctx.fillStyle = dirt; ctx.fillRect(0,groundY,W,600);
  // Top soil strip
  ctx.fillStyle = '#7a5c30'; ctx.fillRect(0,groundY,W,6);
  // Dirt texture lines
  ctx.strokeStyle = '#5c4010'; ctx.lineWidth = 1;
  for (let fx = 0; fx < W; fx += 18) {
    ctx.beginPath(); ctx.moveTo(fx,groundY); ctx.lineTo(fx+5,groundY-6); ctx.stroke();
  }

  // Left & right wire/chain-link fence barriers (hard wall boundaries)
  [[0,36],[W-36,36]].forEach(([bx,bw])=>{
    // Wood posts
    ctx.fillStyle='#8a6a38'; ctx.strokeStyle='#5a4020'; ctx.lineWidth=2;
    for(let py=200; py<groundY; py+=100){
      ctx.fillRect(bx+bw/2-4,py,8,groundY-py);
      ctx.strokeRect(bx+bw/2-4,py,8,groundY-py);
      // Post cap
      ctx.beginPath(); ctx.moveTo(bx+bw/2-5,py); ctx.lineTo(bx+bw/2,py-10); ctx.lineTo(bx+bw/2+5,py); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // Horizontal wire strands
    ctx.strokeStyle='rgba(150,150,100,0.7)'; ctx.lineWidth=1.5;
    [240,280,320,360,400,440,480].forEach(wy=>{
      ctx.beginPath(); ctx.moveTo(bx,wy); ctx.lineTo(bx+bw,wy); ctx.stroke();
    });
    // Diagonal cross-wire pattern
    ctx.strokeStyle='rgba(150,150,100,0.4)'; ctx.lineWidth=1;
    for(let wy=240; wy<480; wy+=20){
      ctx.beginPath(); ctx.moveTo(bx,wy); ctx.lineTo(bx+bw,wy+20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx,wy+20); ctx.lineTo(bx+bw,wy); ctx.stroke();
    }
  });
}

function drawPortalEdgeArena() {
  const W = GAME_W, H = GAME_H;
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#0a0020'); sky.addColorStop(1,'#300060');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
  for (let i=0; i<60; i++) {
    const sx=(i*227+13)%W, sy=(i*131+7)%(H*0.7);
    const br = 0.4 + Math.sin(frameCount*0.05+i)*0.3;
    ctx.fillStyle=`rgba(220,180,255,${br})`; ctx.fillRect(sx,sy,2,2);
  }
  const px = W/2, py = 260;
  const pr = 120 + Math.sin(frameCount*0.04)*12;
  const portalGrad = ctx.createRadialGradient(px,py,0,px,py,pr);
  portalGrad.addColorStop(0,'rgba(255,255,255,0.95)');
  portalGrad.addColorStop(0.15,'rgba(180,80,255,0.9)');
  portalGrad.addColorStop(0.5,'rgba(80,0,200,0.7)');
  portalGrad.addColorStop(1,'rgba(20,0,60,0)');
  ctx.fillStyle = portalGrad;
  ctx.beginPath(); ctx.ellipse(px,py,pr*0.55,pr,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = `rgba(200,100,255,${0.7+Math.sin(frameCount*0.07)*0.2})`;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(px,py,pr*0.55,pr,0,0,Math.PI*2); ctx.stroke();
  for (let i=0; i<8; i++) {
    const angle = (i/8)*Math.PI*2 + frameCount*0.02;
    const len = 30 + Math.sin(frameCount*0.1+i)*15;
    ctx.strokeStyle = `rgba(200,100,255,0.6)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(angle)*pr*0.5, py + Math.sin(angle)*pr*0.85);
    ctx.lineTo(px + Math.cos(angle)*(pr*0.5+len), py + Math.sin(angle)*(pr*0.85+len));
    ctx.stroke();
  }
  ctx.fillStyle = '#150030'; ctx.fillRect(0,480,W,H-480);
  const gGlow = ctx.createLinearGradient(0,460,0,480);
  gGlow.addColorStop(0,`rgba(100,0,200,${0.4+Math.sin(frameCount*0.04)*0.1})`);
  gGlow.addColorStop(1,'rgba(100,0,200,0)');
  ctx.fillStyle = gGlow; ctx.fillRect(0,440,W,40);
}

// ── The New Realm ─────────────────────────────────────────────────────────
// This map is 5740px wide but the original draw painted only GAME_W (900), so
// ~85% of it was bare sky. Everything below spans mapLeft..mapRight.
function _realmBg() {
  if (_realmBg._c) return _realmBg._c;
  const sp = _arenaSpan(300);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mono = (step, hMin, hMax, par) => {
    const out = [];
    for (let x = sp.x0; x < sp.x1; x += step) {
      out.push({ x: x + rnd(-step * 0.2, step * 0.2), w: rnd(26, 70),
                 h: rnd(hMin, hMax), lean: rnd(-0.10, 0.10), lit: Math.random() < 0.5 });
    }
    return { par, blds: out };
  };
  _realmBg._c = {
    sp,
    // Two ranges of crystal monoliths
    far:  mono(150, 90, 210, 0.05),
    near: mono(210, 140, 300, 0.12),
    stars: Array.from({ length: 260 }, () => ({
      x: rnd(sp.x0, sp.x1), y: rnd(-20, 430), r: rnd(0.5, 1.8),
      a: rnd(0.15, 0.8), ph: rnd(0, Math.PI * 2),
    })),
    // Floating islands drifting slowly
    isles: Array.from({ length: 14 }, () => ({
      x: rnd(sp.x0, sp.x1), y: rnd(90, 300), w: rnd(50, 140),
      h: rnd(16, 34), bob: rnd(0, Math.PI * 2), spd: rnd(0.004, 0.012),
    })),
    // Motes of light rising off the ground
    motes: Array.from({ length: 70 }, () => ({
      x: rnd(-100, GAME_W + 100), y: rnd(0, 520), r: rnd(0.8, 2.4),
      spd: rnd(0.12, 0.5), drift: rnd(0.004, 0.014), amp: rnd(6, 26),
      ph: rnd(0, Math.PI * 2), a: rnd(0.2, 0.7),
    })),
    curtains: Array.from({ length: 3 }, (_, i) => ({
      y: 50 + i * 42, amp: 22 + i * 10, freq: 0.0016 + i * 0.0007,
      spd: 0.004 + i * 0.0015, hue: [190, 210, 165][i], alpha: 0.13 - i * 0.028,
    })),
  };
  return _realmBg._c;
}

function drawRealmEntryArena() {
  const bg = _realmBg();
  const sp = bg.sp;
  const f  = frameCount;
  const vis = _arenaVis();
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const groundY = 480;

  ctx.save();

  // ── Sky ───────────────────────────────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, -200, 0, groundY);
  sky.addColorStop(0,   '#000410');
  sky.addColorStop(0.55,'#000e2a');
  sky.addColorStop(1,   '#012a5c');
  ctx.fillStyle = sky;
  ctx.fillRect(sp.x0, -300, sp.w, groundY + 300);

  // ── Star field ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.02, 0);
  for (const st of bg.stars) {
    if (st.x + camOff * 0.02 < vis.lo || st.x + camOff * 0.02 > vis.hi) continue;
    ctx.globalAlpha = st.a * (0.5 + Math.abs(Math.sin(f * 0.035 + st.ph)) * 0.5);
    ctx.fillStyle = '#bfe4ff';
    ctx.fillRect(st.x, st.y, st.r, st.r);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Aurora curtains — these DO read here, unlike on the daylit ice map ────
  for (const cu of bg.curtains) {
    ctx.save();
    ctx.globalAlpha = cu.alpha;
    const cg = ctx.createLinearGradient(0, cu.y - cu.amp - 40, 0, cu.y + cu.amp + 70);
    cg.addColorStop(0,   `hsla(${cu.hue},85%,65%,0)`);
    cg.addColorStop(0.5, `hsla(${cu.hue},85%,65%,1)`);
    cg.addColorStop(1,   `hsla(${cu.hue},85%,65%,0)`);
    ctx.fillStyle = cg;
    ctx.beginPath();
    const lo = Math.max(sp.x0, vis.lo), hi = Math.min(sp.x1, vis.hi);
    ctx.moveTo(lo, cu.y);
    for (let x = lo; x <= hi; x += 26) ctx.lineTo(x, cu.y + Math.sin(x * cu.freq + f * cu.spd) * cu.amp);
    for (let x = hi; x >= lo; x -= 26) ctx.lineTo(x, cu.y + 54 + Math.sin(x * cu.freq + f * cu.spd) * cu.amp);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── The gate: a vast ring standing on the horizon ────────────────────────
  const gx = sp.x0 + sp.w * 0.5 - camOff * 0.03, gy = groundY - 150;
  if (gx > vis.lo - 400 && gx < vis.hi + 400) {
    const pulse = 0.6 + Math.sin(f * 0.02) * 0.4;
    ctx.save();
    ctx.strokeStyle = `rgba(60,150,255,${0.18 + pulse * 0.14})`;
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(gx, gy, 190, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(150,215,255,${0.20 + pulse * 0.18})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(gx, gy, 205, 0, Math.PI * 2); ctx.stroke();
    const ig = ctx.createRadialGradient(gx, gy, 20, gx, gy, 186);
    ig.addColorStop(0, `rgba(20,80,180,${0.14 * pulse})`);
    ig.addColorStop(1, 'rgba(20,80,180,0)');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(gx, gy, 186, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Crystal monolith ranges ───────────────────────────────────────────────
  for (const R of [bg.far, bg.near]) {
    const isNear = R === bg.near;
    ctx.save();
    ctx.translate(-camOff * R.par, 0);
    for (const b2 of R.blds) {
      if (b2.x + camOff * R.par < vis.lo || b2.x + camOff * R.par > vis.hi) continue;
      const top = groundY - b2.h;
      const tipX = b2.x + b2.lean * b2.h;
      ctx.fillStyle = isNear ? 'rgba(0,26,66,0.95)' : 'rgba(0,34,80,0.72)';
      ctx.beginPath();
      ctx.moveTo(b2.x - b2.w * 0.5, groundY);
      ctx.lineTo(tipX - b2.w * 0.16, top);
      ctx.lineTo(tipX + b2.w * 0.16, top);
      ctx.lineTo(b2.x + b2.w * 0.5, groundY);
      ctx.closePath();
      ctx.fill();
      // lit edge — the crystals glow along one face
      ctx.strokeStyle = isNear ? 'rgba(0,140,255,0.50)' : 'rgba(0,120,220,0.30)';
      ctx.lineWidth = isNear ? 2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(b2.x + b2.w * 0.5, groundY);
      ctx.lineTo(tipX + b2.w * 0.16, top);
      ctx.stroke();
      // a few carry a bright vein
      if (b2.lit) {
        const vp = 0.5 + Math.sin(f * 0.03 + b2.x * 0.05) * 0.5;
        ctx.strokeStyle = `rgba(120,210,255,${0.18 + vp * 0.28})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tipX, top + b2.h * 0.12);
        ctx.lineTo(tipX - b2.w * 0.14, top + b2.h * 0.55);
        ctx.lineTo(tipX + b2.w * 0.08, groundY);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Floating islands ──────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.09, 0);
  for (const il of bg.isles) {
    if (il.x + camOff * 0.09 < vis.lo || il.x + camOff * 0.09 > vis.hi) continue;
    const iy = il.y + Math.sin(f * il.spd + il.bob) * 7;
    ctx.fillStyle = 'rgba(0,40,90,0.85)';
    ctx.beginPath();
    ctx.moveTo(il.x - il.w * 0.5, iy);
    ctx.lineTo(il.x + il.w * 0.5, iy);
    ctx.lineTo(il.x + il.w * 0.16, iy + il.h);
    ctx.lineTo(il.x - il.w * 0.10, iy + il.h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,110,200,0.40)';        // lit top plate
    ctx.fillRect(il.x - il.w * 0.5, iy - 2, il.w, 3);
    ctx.strokeStyle = 'rgba(90,190,255,0.22)';     // glow under the rock
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(il.x - il.w * 0.10, iy + il.h * 0.7);
    ctx.lineTo(il.x + il.w * 0.16, iy + il.h);
    ctx.stroke();
  }
  ctx.restore();

  // ── Horizon glow along the ground plane ───────────────────────────────────
  const hg = ctx.createLinearGradient(0, groundY - 70, 0, groundY);
  hg.addColorStop(0, 'rgba(0,90,200,0)');
  hg.addColorStop(1, `rgba(0,110,240,${0.24 + Math.sin(f * 0.04) * 0.06})`);
  ctx.fillStyle = hg;
  ctx.fillRect(sp.x0, groundY - 70, sp.w, 70);
  ctx.fillStyle = '#001030';
  ctx.fillRect(sp.x0, groundY, sp.w, GAME_H + 200 - groundY);

  // ── Rising motes (screen space) ───────────────────────────────────────────
  ctx.save();
  ctx.translate(camOff, 0);
  ctx.fillStyle = '#9fd8ff';
  for (const m of bg.motes) {
    const my = ((m.y - f * m.spd) % 560 + 560) % 560 - 20;
    const mx = m.x + Math.sin(f * m.drift + m.ph) * m.amp;
    ctx.globalAlpha = m.a * 0.7;
    ctx.beginPath(); ctx.arc(mx, my, m.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.restore();
}

function drawBossSanctumArena() {
  const W = GAME_W, H = GAME_H;
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#100005'); sky.addColorStop(1,'#350020');
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = `rgba(200,0,60,${0.3+Math.sin(frameCount*0.05)*0.2})`;
  ctx.lineWidth = 2;
  for (let i=0; i<6; i++) {
    const vx = i*(W/5);
    ctx.beginPath(); ctx.moveTo(vx,0);
    ctx.bezierCurveTo(vx+80,60, vx-50,120, vx+30,200);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a0015';
  ctx.fillRect(W/2-60, 280, 120, 200);
  ctx.fillRect(W/2-100, 275, 200, 20);
  ctx.fillRect(W/2-40, 210, 80, 80);
  ctx.fillRect(W/2-50, 205, 100, 15);
  const tg = ctx.createRadialGradient(W/2,350,0,W/2,350,200);
  tg.addColorStop(0,`rgba(180,0,50,${0.2+Math.sin(frameCount*0.04)*0.08})`);
  tg.addColorStop(1,'rgba(180,0,50,0)');
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,H);
  for (let i=0; i<6; i++) {
    const cx2 = 80+i*140, cy2 = 150+Math.sin(frameCount*0.02+i)*12;
    ctx.fillStyle = `rgba(80,0,40,0.7)`;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2-25); ctx.lineTo(cx2+12,cy2); ctx.lineTo(cx2,cy2+25); ctx.lineTo(cx2-12,cy2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(200,0,60,0.5)'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.fillStyle='#1a0010'; ctx.fillRect(0,480,W,H-480);
  ctx.strokeStyle=`rgba(200,0,40,${0.4+Math.sin(frameCount*0.06)*0.15})`; ctx.lineWidth=2;
  const cracks = [[0,490,200,485],[200,485,350,492],[350,492,500,480],[500,480,700,488],[700,488,900,483]];
  for (const [x1,y1,x2,y2] of cracks) { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
}
