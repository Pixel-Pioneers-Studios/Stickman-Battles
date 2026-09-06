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

  // ── Yard dressing ──────────────────────────────────────────────────────
  // The yard was a flat wall, a fence and two pots. These are the props that
  // make it read as somewhere lived-in rather than a backdrop.
  const yt = frameCount * 0.02;

  // Sun and a couple of birds in the sky strip above the roofline
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ysg = ctx.createRadialGradient(120, 66, 4, 120, 66, 86);
  ysg.addColorStop(0,   'rgba(255,250,222,0.55)');
  ysg.addColorStop(0.3, 'rgba(255,242,190,0.16)');
  ysg.addColorStop(1,   'rgba(255,236,168,0)');
  ctx.fillStyle = ysg; ctx.fillRect(24, 0, 200, 160);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,252,236,0.9)';
  ctx.beginPath(); ctx.arc(120, 66, 20, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60,80,110,0.45)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const bxx = ((frameCount * 0.22 + i * 90) % 1100) - 100;
    const byy = 96 + i * 16 + Math.sin(frameCount * 0.02 + i) * 4;
    const wg = Math.sin(frameCount * 0.16 + i) * 4;
    ctx.beginPath();
    ctx.moveTo(bxx - 6, byy + wg);
    ctx.quadraticCurveTo(bxx - 2, byy - wg, bxx, byy);
    ctx.quadraticCurveTo(bxx + 2, byy - wg, bxx + 6, byy + wg);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Tree behind the right-hand fence, leaning over the yard
  const trX = 800;
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(trX - 7, 300, 14, 180);
  ctx.fillStyle = '#3f7f34';
  for (const o of [[0, 0, 1], [-0.7, 0.2, 0.66], [0.7, 0.18, 0.7], [0, -0.5, 0.6], [-0.35, -0.3, 0.55]]) {
    ctx.beginPath();
    ctx.arc(trX + o[0] * 58 + Math.sin(yt) * 2, 296 - o[1] * 58, 44 * o[2], 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(150,205,120,0.35)';
  ctx.beginPath(); ctx.arc(trX - 16 + Math.sin(yt) * 2, 272, 28, 0, Math.PI * 2); ctx.fill();

  // Garden bed against the wall, left of the patio
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(96, 446, 168, 16);
  ctx.fillStyle = '#7d5836';
  ctx.fillRect(96, 442, 168, 5);
  for (let i = 0; i < 11; i++) {
    const fx = 106 + i * 15;
    const fsw = Math.sin(yt * 1.4 + i) * 2;
    ctx.strokeStyle = '#3a7020'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(fx, 444);
    ctx.quadraticCurveTo(fx + fsw, 432, fx + fsw * 1.6, 422);
    ctx.stroke();
    ctx.fillStyle = ['#ff7a9c', '#ffd24a', '#ffffff', '#b98bff'][i % 4];
    for (let k = 0; k < 5; k++) {
      const a2 = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(fx + fsw * 1.6 + Math.cos(a2) * 3, 421 + Math.sin(a2) * 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(fx + fsw * 1.6, 421, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // Barbecue on the patio
  const bqX = 620;
  ctx.fillStyle = '#3a3a40';
  ctx.beginPath();
  ctx.moveTo(bqX - 26, 424); ctx.lineTo(bqX + 26, 424);
  ctx.quadraticCurveTo(bqX + 22, 452, bqX, 452);
  ctx.quadraticCurveTo(bqX - 22, 452, bqX - 26, 424);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b2b30';
  ctx.beginPath(); ctx.ellipse(bqX, 424, 27, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bqX - 16, 452); ctx.lineTo(bqX - 22, 480); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bqX + 16, 452); ctx.lineTo(bqX + 22, 480); ctx.stroke();
  ctx.fillStyle = '#6a6a74';
  ctx.beginPath(); ctx.arc(bqX + 30, 436, 5, 0, Math.PI * 2); ctx.fill();

  // Coiled hose on the wall
  const hsX = 268, hsY = 400;
  ctx.strokeStyle = '#2f7a44'; ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath(); ctx.arc(hsX, hsY, 9 + k * 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = '#2f7a44'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hsX + 20, hsY + 4);
  ctx.quadraticCurveTo(hsX + 34, hsY + 40, hsX + 20, 462);
  ctx.stroke();
  ctx.fillStyle = '#5a5a62'; ctx.fillRect(hsX - 3, hsY - 22, 6, 12);

  // Doormat under the sliding door
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(414, 452, 72, 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
  for (let mx = 418; mx < 486; mx += 8) { ctx.beginPath(); ctx.moveTo(mx, 452); ctx.lineTo(mx, 462); ctx.stroke(); }

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
// ── City Rooftop ──────────────────────────────────────────────────────────
// This arena had NO draw function at all — it fell through to the bare sky
// gradient plus the generic ARENA_DEPTH hills, which put rolling countryside
// behind a rooftop. Built as a night rooftop: the city dropping away below the
// parapet in three parallax bands, a moon and light dome above it, and the
// clutter that actually lives on a roof — water tower, HVAC plant, vents,
// dishes, a stairwell bulkhead, aerials with warning lamps and pigeons.
function _rooftopBg() {
  const sp  = _arenaSpan(400);
  const key = sp.x0 + '|' + sp.w;
  if (_rooftopBg._c && _rooftopBg._key === key) return _rooftopBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Skyline bands below the parapet — nearer bands are taller and darker
  const bands = [
    { par: 0.05, step: 68,  hMin: 40,  hMax: 130, top: 300, fill: '#141b30', win: 'rgba(180,205,255,', a: 0.22 },
    { par: 0.11, step: 88,  hMin: 60,  hMax: 180, top: 330, fill: '#0e1426', win: 'rgba(255,222,140,', a: 0.42 },
    { par: 0.19, step: 116, hMin: 90,  hMax: 230, top: 362, fill: '#080c18', win: 'rgba(255,226,150,', a: 0.6  },
  ];
  for (const L of bands) {
    L.blds = [];
    for (let x = sp.x0; x < sp.x1; x += L.step) {
      const w = L.step * rnd(0.62, 0.9);
      const h = rnd(L.hMin, L.hMax);
      const wins = [];
      for (let wy = 8; wy < h - 8; wy += 15) {
        for (let wx = 5; wx < w - 7; wx += 12) {
          if (Math.random() < 0.4) continue;
          wins.push({ x: wx, y: wy });
        }
      }
      L.blds.push({ x: x + rnd(-6, 6), w, h, wins, mast: Math.random() < 0.22, blink: rnd(0, 6.28) });
    }
  }

  // Roof clutter, spaced along the deck
  const props = [];
  for (let x = sp.x0 + 120; x < sp.x1 - 120; x += rnd(180, 300)) {
    props.push({ x, kind: Math.floor(rnd(0, 5)), s: rnd(0.8, 1.35), blink: rnd(0, 6.28) });
  }
  const nStars = Math.max(60, Math.min(260, Math.round(sp.w / 24)));
  const nPig   = Math.max(6, Math.min(40, Math.round(sp.w / 260)));

  _rooftopBg._key = key;
  _rooftopBg._c = {
    sp, bands, props,
    stars: Array.from({ length: nStars }, () => ({
      x: rnd(sp.x0, sp.x1), y: rnd(0, 250), r: rnd(0.4, 1.4), phase: rnd(0, 6.28),
    })),
    pigeons: Array.from({ length: nPig }, () => ({
      x: rnd(sp.x0, sp.x1), bob: rnd(0, 6.28), s: rnd(0.8, 1.2),
    })),
    planes: Array.from({ length: 3 }, () => ({
      y: rnd(50, 150), spd: rnd(0.3, 0.7) * (Math.random() < 0.5 ? 1 : -1),
      off: rnd(0, 2000), blink: rnd(0, 6.28),
    })),
  };
  return _rooftopBg._c;
}

function drawHomeRooftopArena() {
  const bg  = _rooftopBg();
  const sp  = bg.sp;
  const vis = _arenaVis(1800);
  const f   = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const deck = 480;                       // the rooftop floor
  const seen = (x, pad) => x > vis.lo - (pad || 0) && x < vis.hi + (pad || 0);

  ctx.save();

  // ── Night sky with a light dome rising off the city ──────────────────────
  const sky = ctx.createLinearGradient(0, -200, 0, deck);
  sky.addColorStop(0,    '#05070f');
  sky.addColorStop(0.55, '#111828');
  sky.addColorStop(1,    '#2a3044');
  ctx.fillStyle = sky;
  ctx.fillRect(sp.x0, -300, sp.w, deck + 300);

  for (const st of bg.stars) {
    if (!seen(st.x)) continue;
    ctx.globalAlpha = (0.15 + Math.abs(Math.sin(f * 0.03 + st.phase)) * 0.5) * (1 - st.y / 340);
    ctx.fillStyle = '#cfe0ff';
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Moon, parked relative to the camera so it stays on the horizon as you move
  const mX = (typeof camXCur === 'number' ? camXCur : 450) + 300, mY = 92;
  const mg = ctx.createRadialGradient(mX, mY, 6, mX, mY, 150);
  mg.addColorStop(0,   'rgba(190,206,244,0.30)');
  mg.addColorStop(0.3, 'rgba(140,160,214,0.10)');
  mg.addColorStop(1,   'rgba(110,130,190,0)');
  ctx.fillStyle = mg; ctx.fillRect(mX - 160, mY - 160, 320, 320);
  ctx.fillStyle = '#dfe6fb';
  ctx.beginPath(); ctx.arc(mX, mY, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(158,168,206,0.45)';
  ctx.beginPath(); ctx.arc(mX - 7, mY - 5, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mX + 6, mY + 5, 4, 0, Math.PI * 2); ctx.fill();

  // Aircraft
  for (const pl of bg.planes) {
    const span = 2200;
    const raw = ((f * Math.abs(pl.spd) + pl.off) % span + span) % span;
    const px = pl.spd > 0 ? sp.x0 + raw - 300 : sp.x1 + 300 - raw;
    if (!seen(px, 40)) continue;
    ctx.fillStyle = `rgba(255,80,70,${0.25 + Math.abs(Math.sin(f * 0.08 + pl.blink)) * 0.75})`;
    ctx.beginPath(); ctx.arc(px, pl.y, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // ── City dropping away below the parapet ─────────────────────────────────
  for (const L of bg.bands) {
    ctx.save();
    ctx.translate(-camOff * L.par, 0);
    const lo = vis.lo + camOff * L.par, hi = vis.hi + camOff * L.par;
    for (const b of L.blds) {
      if (b.x + b.w < lo - 200 || b.x > hi + 200) continue;
      ctx.fillStyle = L.fill;
      ctx.fillRect(b.x, L.top, b.w, deck - L.top + 120);
      // Roofline cap so the towers read as separate blocks
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(b.x, L.top, b.w, 3);
      for (const w of b.wins) {
        if (L.top + w.y > deck) continue;
        ctx.fillStyle = L.win + L.a + ')';
        ctx.fillRect(b.x + w.x, L.top + w.y, 4, 6);
      }
      if (b.mast) {
        ctx.strokeStyle = 'rgba(40,52,80,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w * 0.5, L.top);
        ctx.lineTo(b.x + b.w * 0.5, L.top - 26);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,60,50,${0.3 + Math.abs(Math.sin(f * 0.05 + b.blink)) * 0.7})`;
        ctx.beginPath(); ctx.arc(b.x + b.w * 0.5, L.top - 26, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // Light haze sitting over the streets below
  const haze = ctx.createLinearGradient(0, 300, 0, deck);
  haze.addColorStop(0, 'rgba(120,96,170,0)');
  haze.addColorStop(1, 'rgba(140,110,180,0.22)');
  ctx.fillStyle = haze;
  ctx.fillRect(sp.x0, 300, sp.w, deck - 300);

  // ── Roof clutter ─────────────────────────────────────────────────────────
  for (const pr of bg.props) {
    if (!seen(pr.x, 120)) continue;
    const s = pr.s;
    ctx.fillStyle = '#2b2b34';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    if (pr.kind === 0) {
      // Water tower on a steel frame
      const tw = 46 * s, th = 52 * s, base = deck - 34 * s;
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr.x - tw * 0.4, deck); ctx.lineTo(pr.x - tw * 0.28, base);
      ctx.moveTo(pr.x + tw * 0.4, deck); ctx.lineTo(pr.x + tw * 0.28, base);
      ctx.moveTo(pr.x - tw * 0.36, deck - 16 * s); ctx.lineTo(pr.x + tw * 0.36, deck - 16 * s);
      ctx.stroke();
      ctx.fillStyle = '#4a3a2e';
      ctx.fillRect(pr.x - tw * 0.5, base - th, tw, th);
      ctx.beginPath();
      ctx.moveTo(pr.x - tw * 0.5, base - th);
      ctx.lineTo(pr.x, base - th - 18 * s);
      ctx.lineTo(pr.x + tw * 0.5, base - th);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) {
        const yy = base - th + (th * k) / 4;
        ctx.beginPath(); ctx.moveTo(pr.x - tw * 0.5, yy); ctx.lineTo(pr.x + tw * 0.5, yy); ctx.stroke();
      }
    } else if (pr.kind === 1) {
      // HVAC plant with a turning fan
      const w = 66 * s, h = 34 * s;
      ctx.fillRect(pr.x - w * 0.5, deck - h, w, h);
      ctx.strokeRect(pr.x - w * 0.5, deck - h, w, h);
      ctx.fillStyle = '#3c3c46';
      ctx.fillRect(pr.x - w * 0.36, deck - h - 5 * s, w * 0.72, 5 * s);
      ctx.save();
      ctx.translate(pr.x, deck - h * 0.5);
      ctx.rotate(f * 0.05);
      ctx.strokeStyle = '#15151a'; ctx.lineWidth = 2.5;
      for (let k = 0; k < 3; k++) {
        const a2 = (k / 3) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a2) * 11 * s, Math.sin(a2) * 11 * s);
        ctx.stroke();
      }
      ctx.restore();
    } else if (pr.kind === 2) {
      // Stairwell bulkhead with a lit doorway
      const w = 58 * s, h = 62 * s;
      ctx.fillStyle = '#26262e';
      ctx.fillRect(pr.x - w * 0.5, deck - h, w, h);
      ctx.strokeRect(pr.x - w * 0.5, deck - h, w, h);
      ctx.fillStyle = '#33333d';
      ctx.fillRect(pr.x - w * 0.56, deck - h - 6, w * 1.12, 7);
      ctx.fillStyle = `rgba(255,196,96,${0.35 + Math.sin(f * 0.03 + pr.blink) * 0.1})`;
      ctx.fillRect(pr.x - w * 0.18, deck - h * 0.62, w * 0.36, h * 0.62);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dg = ctx.createRadialGradient(pr.x, deck - h * 0.3, 2, pr.x, deck - h * 0.3, 70);
      dg.addColorStop(0, 'rgba(255,170,60,0.16)');
      dg.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = dg; ctx.fillRect(pr.x - 74, deck - h - 30, 148, 148);
      ctx.restore();
    } else if (pr.kind === 3) {
      // Vent pipes
      for (let k = -1; k <= 1; k++) {
        const vx = pr.x + k * 15 * s;
        const vh = (20 + Math.abs(k) * 8) * s;
        ctx.fillStyle = '#33333c';
        ctx.fillRect(vx - 5 * s, deck - vh, 10 * s, vh);
        ctx.beginPath();
        ctx.arc(vx, deck - vh, 6.5 * s, Math.PI, 0);
        ctx.fill();
      }
    } else {
      // Satellite dish on a mast, plus an aerial with a warning lamp
      const mh = 44 * s;
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(pr.x, deck); ctx.lineTo(pr.x, deck - mh); ctx.stroke();
      ctx.fillStyle = '#4a4a56';
      ctx.beginPath();
      ctx.ellipse(pr.x + 10 * s, deck - mh - 4, 15 * s, 11 * s, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a2a32'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, deck - mh); ctx.lineTo(pr.x + 16 * s, deck - mh - 6); ctx.stroke();
      ctx.fillStyle = `rgba(255,70,60,${0.25 + Math.abs(Math.sin(f * 0.05 + pr.blink)) * 0.75})`;
      ctx.beginPath(); ctx.arc(pr.x, deck - mh - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Parapet along the roof edge, and its warning-light string ────────────
  ctx.fillStyle = '#2e2e38';
  ctx.fillRect(sp.x0, deck - 12, sp.w, 12);
  ctx.fillStyle = '#3c3c48';
  ctx.fillRect(sp.x0, deck - 14, sp.w, 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  const c0 = Math.floor((vis.lo - 100) / 48) * 48;
  for (let x = c0; x < vis.hi + 100; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, deck - 12); ctx.lineTo(x, deck); ctx.stroke();
  }

  // ── Pigeons perched on the parapet ───────────────────────────────────────
  ctx.fillStyle = 'rgba(60,64,78,0.95)';
  for (const pg of bg.pigeons) {
    if (!seen(pg.x, 20)) continue;
    const bob = Math.sin(f * 0.05 + pg.bob) * 0.8;
    const s = pg.s;
    ctx.beginPath();
    ctx.ellipse(pg.x, deck - 18 + bob, 5 * s, 3.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pg.x + 4 * s, deck - 21 + bob, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,160,60,0.9)';
    ctx.fillRect(pg.x + 6 * s, deck - 21.5 + bob, 2 * s, 1);
    ctx.fillStyle = 'rgba(60,64,78,0.95)';
  }

  // NOTE: there is deliberately no deck-surface art here. The isFloor platform
  // (y480, h200) is opaque and drawn AFTER the background, so anything painted
  // below the floor line is covered before the frame is presented. Roof props
  // therefore all sit ABOVE y480, standing on the deck.

  // ── Wind streaks drifting across the deck ────────────────────────────────
  ctx.strokeStyle = 'rgba(200,215,240,0.10)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const wx = sp.x0 + (((f * (1.1 + i * 0.35) + i * 420) % (sp.w + 400)));
    if (!seen(wx, 220)) continue;
    const wy = 200 + i * 38;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 70, wy - 8, wx + 150, wy);
    ctx.stroke();
  }

  ctx.restore();
}

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

  // Alley depth. This used to fill from y=0, which painted over the sky strip
  // and left the entire middle of the map as one flat dark rectangle — the
  // alley had no back to it. It now starts below the roofline so the sky shows
  // through the gap, and a detailed end wall closes the alley off.
  const backTop = 150;
  const depthGrad = ctx.createLinearGradient(0,backTop,0,groundY);
  depthGrad.addColorStop(0,'#141820'); depthGrad.addColorStop(1,'#1e2028');
  ctx.fillStyle=depthGrad; ctx.fillRect(leftW,backTop,rightX-leftW,groundY-backTop);

  // ── Back wall of the alley ─────────────────────────────────────────────
  const bwX = leftW, bwW = rightX - leftW;
  ctx.fillStyle = '#332d25';
  ctx.fillRect(bwX, backTop, bwW, groundY - backTop);
  // Brick courses
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
  for (let ry = backTop; ry < groundY; ry += 15) {
    ctx.beginPath(); ctx.moveTo(bwX, ry); ctx.lineTo(bwX + bwW, ry); ctx.stroke();
    const off = ((ry / 15) | 0) % 2 === 0 ? 0 : 45;
    for (let rx = off; rx < bwW; rx += 90) {
      ctx.beginPath(); ctx.moveTo(bwX + rx, ry); ctx.lineTo(bwX + rx, ry + 15); ctx.stroke();
    }
  }
  // Grime wash down the wall
  const grime = ctx.createLinearGradient(0, backTop, 0, groundY);
  grime.addColorStop(0, 'rgba(0,0,0,0.45)');
  grime.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  grime.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = grime; ctx.fillRect(bwX, backTop, bwW, groundY - backTop);

  // Graffiti tag — loose overlapping strokes, no attempt at letters
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const tagX = bwX + bwW * 0.30, tagY = 352;
  const tagPath = (dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(tagX + dx, tagY + 24 + dy);
    ctx.quadraticCurveTo(tagX + 22 + dx, tagY - 16 + dy, tagX + 46 + dx, tagY + 20 + dy);
    ctx.quadraticCurveTo(tagX + 70 + dx, tagY + 44 + dy, tagX + 96 + dx, tagY - 6 + dy);
    ctx.quadraticCurveTo(tagX + 116 + dx, tagY - 26 + dy, tagX + 138 + dx, tagY + 22 + dy);
    ctx.stroke();
  };
  // Dark outline first, then muted fills at low alpha. Bright saturated strokes
  // on their own float off the brick and read as a ribbon, not spray paint.
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#0d0b08'; ctx.lineWidth = 13; tagPath(0, 0);
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = '#a8365c'; ctx.lineWidth = 7; tagPath(0, 0);
  ctx.strokeStyle = '#2f8fae'; ctx.lineWidth = 5; tagPath(6, 4);
  ctx.strokeStyle = '#b09338'; ctx.lineWidth = 4; tagPath(-5, -3);
  ctx.lineCap = 'butt';
  ctx.restore();
  ctx.globalAlpha = 1;

  // Fire door with an EXIT lamp above it
  const doorX = bwX + bwW * 0.72;
  ctx.fillStyle = '#3d4a44'; ctx.fillRect(doorX, groundY - 96, 52, 96);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
  ctx.strokeRect(doorX, groundY - 96, 52, 96);
  ctx.fillStyle = '#556660';
  ctx.fillRect(doorX + 40, groundY - 56, 8, 4);
  ctx.fillStyle = `rgba(90,255,140,${0.5 + Math.sin(t * 3) * 0.12})`;
  ctx.fillRect(doorX + 12, groundY - 112, 28, 9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const eg = ctx.createRadialGradient(doorX + 26, groundY - 107, 2, doorX + 26, groundY - 107, 54);
  eg.addColorStop(0, 'rgba(70,255,130,0.22)');
  eg.addColorStop(1, 'rgba(70,255,130,0)');
  ctx.fillStyle = eg; ctx.fillRect(doorX - 30, groundY - 165, 112, 112);
  ctx.restore();

  // Barred window
  const bwinX = bwX + bwW * 0.12;
  ctx.fillStyle = 'rgba(255,196,86,0.20)';
  ctx.fillRect(bwinX, 246, 56, 46);
  ctx.strokeStyle = '#4a4438'; ctx.lineWidth = 2;
  ctx.strokeRect(bwinX, 246, 56, 46);
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(bwinX + (56 * k) / 4, 246);
    ctx.lineTo(bwinX + (56 * k) / 4, 292);
    ctx.stroke();
  }

  // Drainpipes running down the wall
  ctx.strokeStyle = '#3b352c'; ctx.lineWidth = 6;
  for (const px of [bwX + bwW * 0.06, bwX + bwW * 0.55, bwX + bwW * 0.9]) {
    ctx.beginPath();
    ctx.moveTo(px, backTop);
    ctx.lineTo(px, groundY - 34);
    ctx.lineTo(px + 12, groundY - 22);
    ctx.stroke();
    ctx.fillStyle = '#4a4238';
    ctx.fillRect(px - 5, 260, 10, 5);
    ctx.fillRect(px - 5, 370, 10, 5);
  }

  // AC units bolted to the wall, each with a slow-turning fan
  for (const [ax, ay, as] of [[bwX + bwW * 0.24, 200, 1], [bwX + bwW * 0.63, 232, 0.8]]) {
    ctx.fillStyle = '#4a4a44';
    ctx.fillRect(ax, ay, 46 * as, 34 * as);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ax, ay, 46 * as, 34 * as);
    ctx.save();
    ctx.translate(ax + 23 * as, ay + 17 * as);
    ctx.rotate(t * 2);
    ctx.strokeStyle = '#2c2c28'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) {
      const a2 = (k / 3) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a2) * 12 * as, Math.sin(a2) * 12 * as);
      ctx.stroke();
    }
    ctx.restore();
    // Drip stain under it
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ax + 18 * as, ay + 34 * as, 8 * as, groundY - (ay + 34 * as));
  }

  // Steam venting from a floor grate
  ctx.fillStyle = '#1a1a18';
  ctx.fillRect(bwX + bwW * 0.44, groundY - 6, 54, 6);
  ctx.strokeStyle = '#33332e'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    const gx2 = bwX + bwW * 0.44 + 4 + k * 9;
    ctx.beginPath(); ctx.moveTo(gx2, groundY - 6); ctx.lineTo(gx2, groundY); ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const sp = ((frameCount * 0.5 + k * 38) % 230) / 230;
    const sx2 = bwX + bwW * 0.46 + Math.sin(sp * 5 + k) * 14;
    const sy2 = groundY - 8 - sp * 150;
    const sr  = 12 + sp * 34;
    // Radial falloff, additive: flat grey ellipses on a dark wall just looked
    // like smudges rather than steam catching the light.
    const g2 = ctx.createRadialGradient(sx2, sy2, 1, sx2, sy2, sr);
    g2.addColorStop(0, `rgba(190,206,222,${(1 - sp) * 0.16})`);
    g2.addColorStop(1, 'rgba(190,206,222,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(sx2 - sr, sy2 - sr, sr * 2, sr * 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

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

// ── Suburbs ───────────────────────────────────────────────────────────────
// Was five beige boxes with triangle roofs. Rebuilt as an actual street: two
// depth bands of houses with varied rooflines, porches, chimneys and garage
// doors, street trees, lamp posts, a parked car, a road with kerb and markings,
// and distant hills — with the portal haze and picket-fence walls kept.
function _suburbBg() {
  if (_suburbBg._c) return _suburbBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const WALL = ['#e8d8b0', '#dcc9a4', '#e4dcc8', '#d8c0a0', '#eee0c4'];
  const ROOF = ['#aa5522', '#8a4a2a', '#96603a', '#7a4630'];
  const mkHouse = (x, s) => ({
    x, s,
    w:      rnd(110, 175) * s,
    h:      rnd(96, 150) * s,
    wall:   WALL[Math.floor(Math.random() * WALL.length)],
    roof:   ROOF[Math.floor(Math.random() * ROOF.length)],
    gable:  Math.random() < 0.55,          // gable end facing us vs. hipped roof
    chimney: Math.random() < 0.7,
    garage: Math.random() < 0.5,
    porch:  Math.random() < 0.6,
    lit:    Array.from({ length: 8 }, () => Math.random() < 0.45),
  });
  _suburbBg._c = {
    far:  [40, 210, 400, 590, 760].map(x => mkHouse(x, 0.72)),
    near: [-20, 190, 415, 640, 830].map(x => mkHouse(x, 1)),
    trees: Array.from({ length: 7 }, (_, i) => ({
      x: 65 + i * 128 + rnd(-30, 30),
      h: rnd(70, 130),
      r: rnd(26, 44),
      phase: rnd(0, 6.28),
      col: ['#3f7f34', '#4f9040', '#356e2e'][Math.floor(Math.random() * 3)],
    })),
    lamps: [130, 430, 730],
    clouds: Array.from({ length: 5 }, (_, i) => ({
      x: i * 220 + rnd(-40, 40), y: rnd(30, 110), r: rnd(20, 40), spd: rnd(0.04, 0.11),
    })),
  };
  return _suburbBg._c;
}

function drawSuburbArena() {
  const bg = _suburbBg();
  const f  = frameCount;
  const W  = GAME_W;
  const groundY = 480;

  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#6fbfe4'); sky.addColorStop(0.6, '#a9dcf2'); sky.addColorStop(1, '#dcf2ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GAME_H);

  // Sun and drifting clouds
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(150, 70, 6, 150, 70, 150);
  sg.addColorStop(0, 'rgba(255,250,220,0.75)');
  sg.addColorStop(1, 'rgba(255,235,170,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, 320, 240);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of bg.clouds) {
    const cx2 = ((c.x + f * c.spd) % 1080) - 90;
    ctx.beginPath();
    ctx.arc(cx2, c.y, c.r, 0, Math.PI * 2);
    ctx.arc(cx2 + c.r * 0.8, c.y - c.r * 0.28, c.r * 0.68, 0, Math.PI * 2);
    ctx.arc(cx2 - c.r * 0.65, c.y - c.r * 0.16, c.r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant hills behind the street
  ctx.fillStyle = 'rgba(126,168,132,0.55)';
  ctx.beginPath();
  ctx.moveTo(-40, groundY);
  for (let x = -40; x <= W + 40; x += 30) {
    ctx.lineTo(x, 372 - Math.abs(Math.sin(x * 0.005 + 1.3)) * 42 - Math.abs(Math.sin(x * 0.014)) * 16);
  }
  ctx.lineTo(W + 40, groundY);
  ctx.lineTo(-40, groundY);
  ctx.closePath();
  ctx.fill();

  // ── Houses, far band then near band ──────────────────────────────────────
  const drawHouse = (h, alpha) => {
    const top = groundY - h.h;
    ctx.globalAlpha = alpha;
    // Body
    ctx.fillStyle = h.wall;
    ctx.fillRect(h.x, top, h.w, h.h);
    // Wall shading down the right-hand third
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(h.x + h.w * 0.66, top, h.w * 0.34, h.h);
    // Roof — gable end or hipped
    ctx.fillStyle = h.roof;
    ctx.beginPath();
    if (h.gable) {
      ctx.moveTo(h.x - 10, top);
      ctx.lineTo(h.x + h.w * 0.5, top - h.h * 0.42);
      ctx.lineTo(h.x + h.w + 10, top);
    } else {
      ctx.moveTo(h.x - 10, top);
      ctx.lineTo(h.x + h.w * 0.26, top - h.h * 0.34);
      ctx.lineTo(h.x + h.w * 0.74, top - h.h * 0.34);
      ctx.lineTo(h.x + h.w + 10, top);
    }
    ctx.closePath();
    ctx.fill();
    // Fascia board under the eaves
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(h.x - 10, top - 3, h.w + 20, 4);
    // Chimney
    if (h.chimney) {
      ctx.fillStyle = '#8a5a4a';
      ctx.fillRect(h.x + h.w * 0.72, top - h.h * 0.36, 12 * h.s, h.h * 0.30);
      ctx.fillStyle = '#6e463a';
      ctx.fillRect(h.x + h.w * 0.72 - 2, top - h.h * 0.36, 16 * h.s, 5);
    }
    // Windows, some lit
    const wy = top + h.h * 0.22, ww = 22 * h.s, wh = 24 * h.s;
    for (let i = 0; i < 3; i++) {
      const wx = h.x + h.w * (0.12 + i * 0.30);
      ctx.fillStyle = h.lit[i] ? 'rgba(255,236,168,0.95)' : 'rgba(120,175,215,0.8)';
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.beginPath();                      // mullions
      ctx.moveTo(wx + ww * 0.5, wy); ctx.lineTo(wx + ww * 0.5, wy + wh);
      ctx.moveTo(wx, wy + wh * 0.5); ctx.lineTo(wx + ww, wy + wh * 0.5);
      ctx.stroke();
    }
    // Door, or garage door
    if (h.garage) {
      ctx.fillStyle = '#d8d4cc';
      ctx.fillRect(h.x + h.w * 0.56, groundY - h.h * 0.42, h.w * 0.36, h.h * 0.42);
      ctx.strokeStyle = 'rgba(150,146,138,0.9)';
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) {
        const yy = groundY - h.h * 0.42 + (h.h * 0.42 * k) / 4;
        ctx.beginPath(); ctx.moveTo(h.x + h.w * 0.56, yy); ctx.lineTo(h.x + h.w * 0.92, yy); ctx.stroke();
      }
    }
    ctx.fillStyle = '#6b4326';
    ctx.fillRect(h.x + h.w * 0.14, groundY - h.h * 0.36, 22 * h.s, h.h * 0.36);
    ctx.fillStyle = '#e8c860';
    ctx.beginPath(); ctx.arc(h.x + h.w * 0.14 + 17 * h.s, groundY - h.h * 0.18, 1.8, 0, Math.PI * 2); ctx.fill();
    // Porch roof over the door
    if (h.porch) {
      ctx.fillStyle = 'rgba(120,86,58,0.9)';
      ctx.fillRect(h.x + h.w * 0.06, groundY - h.h * 0.42, h.w * 0.28, 5);
      ctx.fillStyle = 'rgba(228,222,208,0.9)';
      ctx.fillRect(h.x + h.w * 0.07, groundY - h.h * 0.40, 4, h.h * 0.40);
      ctx.fillRect(h.x + h.w * 0.30, groundY - h.h * 0.40, 4, h.h * 0.40);
    }
    ctx.globalAlpha = 1;
  };
  for (const h of bg.far)  drawHouse(h, 0.55);
  for (const h of bg.near) drawHouse(h, 1);

  // ── Street trees ─────────────────────────────────────────────────────────
  for (const t of bg.trees) {
    const sway = Math.sin(f * 0.012 + t.phase) * 3;
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(t.x - 4, groundY - t.h, 8, t.h);
    ctx.fillStyle = t.col;
    for (const o of [[0, 0, 1], [-0.6, 0.22, 0.7], [0.6, 0.20, 0.72], [0, -0.42, 0.66]]) {
      ctx.beginPath();
      ctx.arc(t.x + o[0] * t.r + sway, groundY - t.h - o[1] * t.r, t.r * o[2], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(t.x - t.r * 0.25 + sway, groundY - t.h - t.r * 0.35, t.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Lamp posts ───────────────────────────────────────────────────────────
  for (const lx of bg.lamps) {
    ctx.fillStyle = '#3c4048';
    ctx.fillRect(lx - 3, groundY - 132, 6, 132);
    ctx.fillRect(lx - 8, groundY - 4, 16, 5);
    ctx.beginPath();
    ctx.moveTo(lx, groundY - 132); ctx.lineTo(lx + 26, groundY - 146);
    ctx.lineWidth = 5; ctx.strokeStyle = '#3c4048'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,236,170,0.9)';
    ctx.beginPath(); ctx.ellipse(lx + 28, groundY - 143, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ── Parked car ───────────────────────────────────────────────────────────
  const carX = 590;
  ctx.fillStyle = '#2f6fb0';
  ctx.beginPath();
  ctx.moveTo(carX - 46, groundY - 6);
  ctx.lineTo(carX - 40, groundY - 24);
  ctx.lineTo(carX - 16, groundY - 38);
  ctx.lineTo(carX + 16, groundY - 38);
  ctx.lineTo(carX + 40, groundY - 24);
  ctx.lineTo(carX + 46, groundY - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(190,226,250,0.85)';
  ctx.beginPath();
  ctx.moveTo(carX - 30, groundY - 25);
  ctx.lineTo(carX - 13, groundY - 35);
  ctx.lineTo(carX + 13, groundY - 35);
  ctx.lineTo(carX + 30, groundY - 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1a1e';
  ctx.beginPath(); ctx.arc(carX - 26, groundY - 5, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(carX + 26, groundY - 5, 9, 0, Math.PI * 2); ctx.fill();

  // ── Portal haze creeping in (story atmosphere — kept) ────────────────────
  const smokeAlpha = 0.08 + Math.sin(f * 0.04) * 0.03;
  ctx.fillStyle = `rgba(80,0,80,${smokeAlpha})`;
  ctx.fillRect(0, 0, W, GAME_H);

  // ── Lawn, kerb and road ──────────────────────────────────────────────────
  const lawn = ctx.createLinearGradient(0, groundY, 0, groundY + 90);
  lawn.addColorStop(0, '#6a9c46'); lawn.addColorStop(1, '#40682c');
  ctx.fillStyle = lawn; ctx.fillRect(0, groundY, W, 600);
  ctx.fillStyle = '#c8b890'; ctx.fillRect(0, 472, W, 8);
  ctx.strokeStyle = '#a09070'; ctx.lineWidth = 1;
  for (let sx = 0; sx < W; sx += 80) { ctx.beginPath(); ctx.moveTo(sx, 472); ctx.lineTo(sx, 480); ctx.stroke(); }
  ctx.fillStyle = '#4c4c52'; ctx.fillRect(0, 500, W, 120);
  ctx.fillStyle = 'rgba(240,226,140,0.75)';
  for (let sx = 10; sx < W; sx += 66) ctx.fillRect(sx, 546, 34, 5);

  // ── Picket fence walls (hard boundaries — kept) ──────────────────────────
  [[0, 40], [W - 40, 40]].forEach(([bx, bw]) => {
    ctx.fillStyle = '#5a8a3a'; ctx.fillRect(bx, 0, bw, 480);
    ctx.fillStyle = '#f0ece0'; ctx.strokeStyle = '#c8c0a0'; ctx.lineWidth = 1.5;
    ctx.fillRect(bx, 300, bw, 8); ctx.strokeRect(bx, 300, bw, 8);
    ctx.fillRect(bx, 340, bw, 8); ctx.strokeRect(bx, 340, bw, 8);
    for (let fy = 260; fy < 480; fy += 16) {
      ctx.fillStyle = '#f5f0e0'; ctx.fillRect(bx + 4, fy, bw - 8, 14); ctx.strokeRect(bx + 4, fy, bw - 8, 14);
      ctx.beginPath(); ctx.moveTo(bx + 4, fy); ctx.lineTo(bx + bw / 2, fy - 8); ctx.lineTo(bx + bw - 4, fy); ctx.closePath();
      ctx.fillStyle = '#f5f0e0'; ctx.fill(); ctx.stroke();
    }
  });
}

// ── Rural Fields ──────────────────────────────────────────────────────────
// Was a flat sunset, one red rectangle "barn" and a silo. Rebuilt as a farm at
// golden hour: banded sun with cloud streaks, rolling wheat fields in three
// parallax depths that actually sway, a barn with a gambrel roof and hayloft, a
// banded silo, a turning windmill, a receding fence line, and crows.
function _ruralBg() {
  if (_ruralBg._c) return _ruralBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  _ruralBg._c = {
    // Wheat bands: near ones are taller, darker and sway more
    fields: [
      { y: 400, h: 16, n: 330, col: '#c9963a', a: 0.55, amp: 1.6, par: 0.05 },
      { y: 428, h: 24, n: 280, col: '#b47c28', a: 0.75, amp: 2.6, par: 0.09 },
      { y: 458, h: 34, n: 230, col: '#8f5d18', a: 0.95, amp: 3.8, par: 0.15 },
    ].map(b => ({
      ...b,
      stalks: Array.from({ length: b.n }, (_, i) => ({
        x: -40 + i * (980 / b.n) + rnd(-4, 4),
        h: b.h * rnd(0.6, 1.3),
        phase: rnd(0, 6.28),
      })),
    })),
    clouds: Array.from({ length: 6 }, (_, i) => ({
      y: 60 + i * 26 + rnd(-10, 10), w: rnd(120, 300), h: rnd(6, 16),
      spd: rnd(0.05, 0.16), off: rnd(0, 1000), a: rnd(0.18, 0.42),
    })),
    crows: Array.from({ length: 5 }, () => ({
      y: rnd(70, 200), spd: rnd(0.4, 1.0) * (Math.random() < 0.5 ? 1 : -1),
      off: rnd(0, 1400), s: rnd(0.7, 1.2), flap: rnd(0.16, 0.3),
    })),
    // Receding fence posts along the field edge
    posts: Array.from({ length: 16 }, (_, i) => ({ x: -20 + i * 62, h: 26 + (i % 3) * 4 })),
  };
  return _ruralBg._c;
}

function drawRuralArena() {
  const bg = _ruralBg();
  const f  = frameCount;
  const W  = GAME_W;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const groundY = 480;

  // ── Sunset sky ───────────────────────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0,    '#4a72b4');
  sky.addColorStop(0.32, '#e88f3a');
  sky.addColorStop(0.62, '#f4b83c');
  sky.addColorStop(1,    '#f6d47a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GAME_H);

  // ── Sun low on the horizon ───────────────────────────────────────────────
  const sunX = 700, sunY = 300;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 260);
  sg.addColorStop(0,    'rgba(255,246,200,0.85)');
  sg.addColorStop(0.14, 'rgba(255,210,110,0.35)');
  sg.addColorStop(1,    'rgba(255,170,60,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 270, sunY - 270, 540, 540);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,242,186,0.95)';
  ctx.beginPath(); ctx.arc(sunX, sunY, 52, 0, Math.PI * 2); ctx.fill();

  // ── Cloud streaks, backlit ───────────────────────────────────────────────
  for (const c of bg.clouds) {
    const cx2 = (((c.off + f * c.spd) % 1300) + 1300) % 1300 - 220;
    ctx.globalAlpha = c.a;
    ctx.fillStyle = '#c86a2c';
    ctx.beginPath();
    ctx.ellipse(cx2, c.y, c.w * 0.5, c.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,222,150,0.7)';        // lit underside
    ctx.beginPath();
    ctx.ellipse(cx2, c.y + c.h * 0.28, c.w * 0.42, c.h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Crows ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(28,18,10,0.7)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const cr of bg.crows) {
    const span = 1400;
    const raw = ((f * Math.abs(cr.spd) + cr.off) % span + span) % span;
    const cx2 = cr.spd > 0 ? raw - 250 : W + 250 - raw;
    const w = Math.sin(f * cr.flap + cr.off) * 6 * cr.s;
    const s = 7 * cr.s;
    ctx.beginPath();
    ctx.moveTo(cx2 - s, cr.y + w);
    ctx.quadraticCurveTo(cx2 - s * 0.4, cr.y - w * 0.5, cx2, cr.y);
    ctx.quadraticCurveTo(cx2 + s * 0.4, cr.y - w * 0.5, cx2 + s, cr.y + w);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // ── Distant treeline ─────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.03, 0);
  ctx.fillStyle = 'rgba(72,58,34,0.55)';
  for (let x = -60; x < W + 60; x += 26) {
    const th = 16 + Math.abs(Math.sin(x * 0.05)) * 22;
    ctx.beginPath();
    ctx.ellipse(x, 392, 18, th * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(-60, 388, W + 120, 10);
  ctx.restore();

  // ── Windmill ─────────────────────────────────────────────────────────────
  const wmX = 118, wmY = 236;
  ctx.fillStyle = 'rgba(60,44,26,0.9)';
  ctx.beginPath();
  ctx.moveTo(wmX - 16, 400); ctx.lineTo(wmX - 5, wmY);
  ctx.lineTo(wmX + 5, wmY);  ctx.lineTo(wmX + 16, 400);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,28,16,0.7)'; ctx.lineWidth = 1.5;
  for (let k = 1; k <= 4; k++) {
    const t2 = k / 5, yy = wmY + (400 - wmY) * t2;
    const hw = 5 + (16 - 5) * t2;
    ctx.beginPath(); ctx.moveTo(wmX - hw, yy); ctx.lineTo(wmX + hw, yy); ctx.stroke();
  }
  const spin = f * 0.02;
  ctx.strokeStyle = 'rgba(48,34,20,0.92)';
  ctx.lineWidth = 3;
  for (let k = 0; k < 8; k++) {
    const a = spin + (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(wmX, wmY);
    ctx.lineTo(wmX + Math.cos(a) * 30, wmY + Math.sin(a) * 30);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(48,34,20,0.95)';
  ctx.beginPath(); ctx.arc(wmX, wmY, 4, 0, Math.PI * 2); ctx.fill();

  // ── Barn ─────────────────────────────────────────────────────────────────
  const bX = 226, bY = 296, bW = 186, bH = 186;
  // Gambrel roof — two pitches, which is what says "barn" and not "shed"
  ctx.fillStyle = '#6b1010';
  ctx.beginPath();
  ctx.moveTo(bX - 14, bY);
  ctx.lineTo(bX + bW * 0.22, bY - 34);
  ctx.lineTo(bX + bW * 0.5, bY - 62);
  ctx.lineTo(bX + bW * 0.78, bY - 34);
  ctx.lineTo(bX + bW + 14, bY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8b1a1a';
  ctx.fillRect(bX, bY, bW, bH);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(bX + bW * 0.66, bY, bW * 0.34, bH);
  // White trim boards
  ctx.strokeStyle = 'rgba(240,232,214,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(bX + 6, bY + 8, bW - 12, bH - 14);
  // Big sliding doors with the classic X brace
  const dX = bX + bW * 0.28, dW = bW * 0.44, dY = bY + bH * 0.42, dH = bH * 0.58;
  ctx.fillStyle = '#4a0808';
  ctx.fillRect(dX, dY, dW, dH);
  ctx.strokeStyle = 'rgba(240,232,214,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dX, dY); ctx.lineTo(dX + dW, dY + dH);
  ctx.moveTo(dX + dW, dY); ctx.lineTo(dX, dY + dH);
  ctx.moveTo(dX + dW * 0.5, dY); ctx.lineTo(dX + dW * 0.5, dY + dH);
  ctx.stroke();
  ctx.strokeRect(dX, dY, dW, dH);
  // Hayloft opening under the peak, lit from inside
  ctx.fillStyle = '#3a0606';
  ctx.fillRect(bX + bW * 0.42, bY - 26, bW * 0.16, 26);
  ctx.fillStyle = `rgba(255,190,90,${0.3 + Math.sin(f * 0.03) * 0.12})`;
  ctx.fillRect(bX + bW * 0.44, bY - 22, bW * 0.12, 20);

  // ── Silo ─────────────────────────────────────────────────────────────────
  const sX = 470, sTop = 268;
  ctx.fillStyle = '#cfc188';
  ctx.fillRect(sX, sTop, 64, groundY - sTop);
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  ctx.fillRect(sX + 42, sTop, 22, groundY - sTop);
  ctx.fillStyle = '#a9a06a';
  ctx.beginPath(); ctx.arc(sX + 32, sTop, 32, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(140,130,86,0.65)';
  ctx.lineWidth = 1.5;
  for (let yy = sTop + 16; yy < groundY; yy += 22) {
    ctx.beginPath(); ctx.moveTo(sX, yy); ctx.lineTo(sX + 64, yy); ctx.stroke();
  }

  // ── Portal glow in the distance (story atmosphere — kept) ────────────────
  const pg = ctx.createRadialGradient(150, 380, 10, 150, 380, 80);
  pg.addColorStop(0, `rgba(180,0,255,${0.35 + Math.sin(f * 0.06) * 0.12})`);
  pg.addColorStop(1, 'rgba(180,0,255,0)');
  ctx.fillStyle = pg; ctx.fillRect(0, 200, 300, 280);

  // ── Wheat fields, far to near ────────────────────────────────────────────
  for (const bd of bg.fields) {
    ctx.save();
    ctx.translate(-camOff * bd.par, 0);
    ctx.globalAlpha = bd.a;
    // Field mass first so the stalks read as a top edge, not floating lines
    ctx.fillStyle = bd.col;
    ctx.fillRect(-60, bd.y, W + 120, groundY - bd.y + 10);
    ctx.strokeStyle = bd.col;
    ctx.lineWidth = 1.1;
    for (const st of bd.stalks) {
      const sway = Math.sin(f * 0.02 + st.phase + st.x * 0.01) * bd.amp;
      ctx.beginPath();
      ctx.moveTo(st.x, bd.y + 2);
      ctx.quadraticCurveTo(st.x + sway * 0.5, bd.y - st.h * 0.6, st.x + sway, bd.y - st.h);
      ctx.stroke();
      // Grain head
      ctx.fillStyle = bd.col;
      ctx.beginPath();
      ctx.ellipse(st.x + sway, bd.y - st.h, 0.9, 2.2, sway * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Fence line along the field edge ──────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.15, 0);
  ctx.strokeStyle = 'rgba(88,64,34,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40, 452); ctx.lineTo(W + 40, 452); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-40, 464); ctx.lineTo(W + 40, 464); ctx.stroke();
  ctx.fillStyle = 'rgba(96,70,38,0.9)';
  for (const p of bg.posts) ctx.fillRect(p.x, 470 - p.h, 5, p.h);
  ctx.restore();

  // ── Ground ───────────────────────────────────────────────────────────────
  const dirt = ctx.createLinearGradient(0, groundY, 0, groundY + 80);
  dirt.addColorStop(0, '#8a6a38'); dirt.addColorStop(1, '#5c421f');
  ctx.fillStyle = dirt; ctx.fillRect(0, groundY, W, 600);
  ctx.fillStyle = '#7a5c30'; ctx.fillRect(0, groundY, W, 6);
  ctx.strokeStyle = '#5c4010'; ctx.lineWidth = 1;
  for (let fx = 0; fx < W; fx += 18) {
    ctx.beginPath(); ctx.moveTo(fx, groundY); ctx.lineTo(fx + 5, groundY - 6); ctx.stroke();
  }

  // ── Wire fence walls (hard boundaries — kept) ────────────────────────────
  [[0, 36], [W - 36, 36]].forEach(([bx, bw]) => {
    ctx.fillStyle = '#8a6a38'; ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2;
    for (let py = 200; py < groundY; py += 100) {
      ctx.fillRect(bx + bw / 2 - 4, py, 8, groundY - py);
      ctx.strokeRect(bx + bw / 2 - 4, py, 8, groundY - py);
      ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 5, py); ctx.lineTo(bx + bw / 2, py - 10); ctx.lineTo(bx + bw / 2 + 5, py); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,150,100,0.7)'; ctx.lineWidth = 1.5;
    [240, 280, 320, 360, 400, 440, 480].forEach(wy => {
      ctx.beginPath(); ctx.moveTo(bx, wy); ctx.lineTo(bx + bw, wy); ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(150,150,100,0.4)'; ctx.lineWidth = 1;
    for (let wy = 240; wy < 480; wy += 20) {
      ctx.beginPath(); ctx.moveTo(bx, wy); ctx.lineTo(bx + bw, wy + 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, wy + 20); ctx.lineTo(bx + bw, wy); ctx.stroke();
    }
  });
}

// ── Portal Threshold ──────────────────────────────────────────────────────
// Was one radial-gradient ellipse, 60 fixed stars and a flat floor — and it
// only covered the first 900px of a 5760px-wide world. This gives the rift a
// structure (event horizon, accretion ring, arc discharge, debris being pulled
// in), tears the sky open behind it, and spans the whole world width so the
// scene doesn't run out from under the camera.
function _portalBg() {
  if (_portalBg._c) return _portalBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  _portalBg._c = {
    stars: Array.from({ length: 220 }, () => ({
      u: Math.random(), y: rnd(0, 400), r: rnd(0.5, 2.0),
      phase: rnd(0, 6.28), spd: rnd(0.02, 0.06),
    })),
    // Sky tears — thin bright rifts on their own parallax layer
    tears: Array.from({ length: 9 }, () => ({
      u: Math.random(), y: rnd(40, 300), len: rnd(50, 190),
      ang: rnd(-1.2, 1.2), phase: rnd(0, 6.28), w: rnd(1, 3),
    })),
    // Broken land silhouettes on the horizon
    shards: Array.from({ length: 26 }, () => ({
      u: Math.random(), w: rnd(30, 120), h: rnd(30, 130),
    })),
    // Debris being drawn toward the rift
    debris: Array.from({ length: 30 }, () => ({
      a: rnd(0, 6.28), d: rnd(140, 460), spd: rnd(0.0016, 0.005),
      r: rnd(1.5, 5), phase: rnd(0, 6.28), rot: rnd(-0.05, 0.05),
    })),
  };
  return _portalBg._c;
}

function drawPortalEdgeArena() {
  const bg = _portalBg();
  const f  = frameCount;
  const sp = _arenaSpan(0);
  const left = sp.x0, world = sp.w;
  const vis = _arenaVis(1800);
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const groundY = 480;

  ctx.save();

  // ── Sky ──────────────────────────────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_H);
  sky.addColorStop(0, '#08001c'); sky.addColorStop(0.6, '#22004e'); sky.addColorStop(1, '#3a0068');
  ctx.fillStyle = sky;
  ctx.fillRect(left - 400, -400, world + 800, GAME_H + 800);

  // ── Stars, spread over the whole world ───────────────────────────────────
  for (const st of bg.stars) {
    const sx = left + st.u * world;
    if (sx < vis.lo || sx > vis.hi) continue;
    ctx.globalAlpha = 0.25 + Math.abs(Math.sin(f * st.spd + st.phase)) * 0.65;
    ctx.fillStyle = '#dcb4ff';
    ctx.beginPath(); ctx.arc(sx, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Sky tears ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const t of bg.tears) {
    const tx = left + t.u * world;
    if (tx < vis.lo - 200 || tx > vis.hi + 200) continue;
    const pulse = 0.4 + Math.abs(Math.sin(f * 0.02 + t.phase)) * 0.6;
    const dx = Math.cos(t.ang) * t.len * 0.5, dy = Math.sin(t.ang) * t.len * 0.5;
    const g = ctx.createLinearGradient(tx - dx, t.y - dy, tx + dx, t.y + dy);
    g.addColorStop(0,   'rgba(190,110,255,0)');
    g.addColorStop(0.5, `rgba(240,210,255,${0.7 * pulse})`);
    g.addColorStop(1,   'rgba(190,110,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = t.w;
    ctx.beginPath(); ctx.moveTo(tx - dx, t.y - dy); ctx.lineTo(tx + dx, t.y + dy); ctx.stroke();
  }
  ctx.restore();

  // ── Broken land on the horizon ───────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.05, 0);
  ctx.fillStyle = 'rgba(20,4,44,0.9)';
  for (const sh of bg.shards) {
    const sx = left + sh.u * world;
    if (sx < vis.lo - 200 || sx > vis.hi + 200) continue;
    ctx.beginPath();
    ctx.moveTo(sx, groundY);
    ctx.lineTo(sx + sh.w * 0.3, groundY - sh.h);
    ctx.lineTo(sx + sh.w * 0.7, groundY - sh.h * 0.6);
    ctx.lineTo(sx + sh.w, groundY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── The rift ─────────────────────────────────────────────────────────────
  // At the END of the run, not at x=450. The parkour reads left-to-right and
  // the last platform sits around x5670, so the threshold you are crossing
  // toward belongs at that end of the hall — pinned mid-screen it sat in the
  // first sixth of a 5760px world with nothing to walk toward.
  const px = sp.x1 - 300, py = 260;
  const pr = 120 + Math.sin(f * 0.04) * 12;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(px, py, 10, px, py, pr * 2.6);
  halo.addColorStop(0,   'rgba(190,120,255,0.35)');
  halo.addColorStop(0.4, 'rgba(120,40,220,0.12)');
  halo.addColorStop(1,   'rgba(60,0,140,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(px - pr * 2.7, py - pr * 2.7, pr * 5.4, pr * 5.4);
  ctx.restore();
  // Event horizon — dark core so the rift reads as a hole, not a lamp
  const core = ctx.createRadialGradient(px, py, 2, px, py, pr);
  core.addColorStop(0,    'rgba(255,255,255,0.95)');
  core.addColorStop(0.10, 'rgba(210,140,255,0.9)');
  core.addColorStop(0.34, 'rgba(70,0,150,0.92)');
  core.addColorStop(0.72, 'rgba(16,0,40,0.95)');
  core.addColorStop(1,    'rgba(30,0,70,0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.ellipse(px, py, pr * 0.55, pr, 0, 0, Math.PI * 2); ctx.fill();
  // Accretion rings spinning at different rates
  for (let i = 0; i < 3; i++) {
    const rr = pr * (0.62 + i * 0.16);
    ctx.strokeStyle = `rgba(210,140,255,${0.5 - i * 0.13})`;
    ctx.lineWidth = 3 - i;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(f * (0.006 + i * 0.003)) * 0.4);
    ctx.beginPath(); ctx.ellipse(0, 0, rr * 0.55, rr, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // Arc discharge off the rim
  ctx.strokeStyle = `rgba(230,180,255,${0.5 + Math.sin(f * 0.09) * 0.3})`;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + f * 0.02;
    const len = 26 + Math.sin(f * 0.1 + i) * 16;
    let ax = px + Math.cos(ang) * pr * 0.55, ay = py + Math.sin(ang) * pr;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    for (let s = 1; s <= 3; s++) {
      ax += Math.cos(ang) * (len / 3) + Math.sin(f * 0.2 + i * 2 + s) * 5;
      ay += Math.sin(ang) * (len / 3) + Math.cos(f * 0.2 + i * 2 + s) * 5;
      ctx.lineTo(ax, ay);
    }
    ctx.stroke();
  }

  // ── Debris spiralling in ─────────────────────────────────────────────────
  for (const d of bg.debris) {
    const t2 = ((f * d.spd + d.phase) % 1);
    const dist = d.d * (1 - t2);
    const ang  = d.a + t2 * 5.2;
    const dx = px + Math.cos(ang) * dist * 0.7;
    const dy = py + Math.sin(ang) * dist;
    ctx.globalAlpha = Math.min(1, t2 * 3) * (1 - t2 * 0.3) * 0.85;
    ctx.fillStyle = '#c69cff';
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(f * d.rot + d.phase);
    ctx.fillRect(-d.r, -d.r * 0.5, d.r * 2, d.r);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // ── Ground and its rift glow ─────────────────────────────────────────────
  ctx.fillStyle = '#150030';
  ctx.fillRect(left - 400, groundY, world + 800, GAME_H + 400 - groundY);
  const gGlow = ctx.createLinearGradient(0, 434, 0, groundY);
  gGlow.addColorStop(0, 'rgba(100,0,200,0)');
  gGlow.addColorStop(1, `rgba(140,40,230,${0.35 + Math.sin(f * 0.04) * 0.12})`);
  ctx.fillStyle = gGlow;
  ctx.fillRect(left - 400, 434, world + 800, 46);
  ctx.strokeStyle = `rgba(190,110,255,${0.5 + Math.sin(f * 0.05) * 0.2})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(left - 400, groundY); ctx.lineTo(left + world + 400, groundY); ctx.stroke();

  ctx.restore();
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

// ── Boss Sanctum ──────────────────────────────────────────────────────────
// Throne room: a colonnade receding into the dark, a throne on a dais under a
// bleeding rose window, braziers with live flame, hanging banners and chains,
// floating embers, and a cracked floor lit from below.
//
// IMPORTANT: this arena is 5880px wide (`worldWidth`), not GAME_W. Everything
// here is laid out in WORLD coordinates and repeated across the full span —
// an earlier version drew at fixed 0..900 and left five sixths of the map as
// bare floor. The throne and rose window sit at the world's centre so the
// room reads as symmetrical around its centrepiece.
function _sanctumBg() {
  const sp   = _arenaSpan(0);
  const key  = sp.x0 + '|' + sp.w;
  if (_sanctumBg._c && _sanctumBg._key === key) return _sanctumBg._c;

  const rnd = (v) => { const s = Math.sin(v * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const left = sp.x0, world = sp.w, cx = (sp.x0 + sp.x1) * 0.5;
  const PILLAR_GAP  = 196;
  const BRAZIER_GAP = 248;
  const CHAIN_GAP   = 172;
  const THRONE_CLR  = 190;      // keep the architecture clear of the throne

  const pillars = [];
  for (let x = left - PILLAR_GAP; x < left + world + PILLAR_GAP; x += PILLAR_GAP) {
    if (Math.abs(x - cx) < THRONE_CLR) continue;
    pillars.push({ x, w: 34 + rnd(x) * 14 });
  }
  const braziers = [];
  for (let x = left + 90; x < left + world; x += BRAZIER_GAP) {
    if (Math.abs(x - cx) < 130) continue;
    braziers.push(x);
  }
  const banners = [];
  for (let i = 0; i < pillars.length - 1; i++) {
    if (rnd(pillars[i].x + 7) > 0.55) continue;
    const bx = (pillars[i].x + pillars[i + 1].x) * 0.5;
    if (Math.abs(bx - cx) < THRONE_CLR) continue;
    banners.push({ x: bx, h: 120 + rnd(bx) * 70, phase: rnd(bx + 3) * 6.28 });
  }
  const chains = [];
  for (let x = left + 60; x < left + world; x += CHAIN_GAP) {
    chains.push({ x, len: 60 + rnd(x + 11) * 90, phase: rnd(x + 5) * 6.28 });
  }
  const cracks = [];
  for (let x = left - 60; x < left + world + 60; x += 180) {
    cracks.push([x, 484 + rnd(x + 2) * 10, x + 180, 484 + rnd(x + 182) * 10]);
  }
  const nEmbers = Math.max(34, Math.min(140, Math.round(world / 58)));

  _sanctumBg._key = key;
  _sanctumBg._c = {
    left, world, right: left + world, cx,
    pillars, braziers, banners, chains, cracks,
    embers: Array.from({ length: nEmbers }, (_, i) => ({
      x:     left + rnd(i + 0.5) * world,
      y:     rnd(i + 1.5) * 520,
      r:     0.9 + rnd(i + 2.5) * 1.7,
      spd:   0.20 + rnd(i + 3.5) * 0.5,
      drift: 0.008 + rnd(i + 4.5) * 0.016,
      amp:   6 + rnd(i + 5.5) * 20,
      phase: rnd(i + 6.5) * 6.28,
    })),
  };
  return _sanctumBg._c;
}

function drawBossSanctumArena() {
  const bg = _sanctumBg();
  const f  = frameCount;
  const H  = GAME_H;
  const groundY = 480;
  const throb = 0.5 + Math.sin(f * 0.04) * 0.2;
  const L = bg.left - 400, WW = bg.world + 800;
  // Generous cull window — this arena is played very zoomed out, so anything
  // tighter than this pops geometry in at the screen edges.
  // Margin is deliberately wide: when the two fighters are at opposite ends the
  // camera zooms far out and shows ~4000px of world, so the default 700 would
  // pop the colonnade in at the screen edges.
  const vis = _arenaVis(1800);
  const vis0 = vis.lo, vis1 = vis.hi;
  const seen = (x, pad) => x > vis0 - (pad || 0) && x < vis1 + (pad || 0);

  ctx.save();

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0d0004'); sky.addColorStop(0.6, '#26000f'); sky.addColorStop(1, '#3d0018');
  ctx.fillStyle = sky; ctx.fillRect(L, -300, WW, H + 600);

  // ── Rose window bleeding light down the nave (world centre) ──────────────
  const rw = { x: bg.cx, y: 96, r: 54 };
  if (seen(rw.x, 300)) {
    const rg = ctx.createRadialGradient(rw.x, rw.y, 4, rw.x, rw.y, 240);
    rg.addColorStop(0,   `rgba(255,60,90,${0.5 * throb + 0.2})`);
    rg.addColorStop(0.3, `rgba(180,0,50,${0.16 * throb})`);
    rg.addColorStop(1,   'rgba(120,0,30,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(rw.x - 250, rw.y - 250, 500, 500);
    ctx.fillStyle = `rgba(255,40,80,${0.55 * throb + 0.25})`;
    ctx.beginPath(); ctx.arc(rw.x, rw.y, rw.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0008'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(rw.x, rw.y, rw.r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3;
    for (let k = 0; k < 10; k++) {
      const ang = (k / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(rw.x, rw.y);
      ctx.lineTo(rw.x + Math.cos(ang) * rw.r, rw.y + Math.sin(ang) * rw.r);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(rw.x, rw.y, rw.r * 0.45, 0, Math.PI * 2); ctx.stroke();
    // Shaft of red light falling on the dais
    const shaft = ctx.createLinearGradient(rw.x, rw.y, rw.x, groundY);
    shaft.addColorStop(0, `rgba(255,50,90,${0.14 * throb + 0.05})`);
    shaft.addColorStop(1, 'rgba(255,30,70,0)');
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(rw.x - rw.r * 0.8, rw.y);
    ctx.lineTo(rw.x + rw.r * 0.8, rw.y);
    ctx.lineTo(rw.x + 130, groundY);
    ctx.lineTo(rw.x - 130, groundY);
    ctx.closePath();
    ctx.fill();
  }

  // ── Colonnade, repeating the length of the hall ──────────────────────────
  for (let i = 0; i < bg.pillars.length; i++) {
    const p = bg.pillars[i];
    if (!seen(p.x, 140)) continue;
    const g = ctx.createLinearGradient(p.x - p.w * 0.5, 0, p.x + p.w * 0.5, 0);
    g.addColorStop(0,    'rgba(28,0,14,1)');
    g.addColorStop(0.35, 'rgba(58,6,28,1)');
    g.addColorStop(1,    'rgba(20,0,10,1)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.w * 0.5, 40, p.w, groundY - 40);
    ctx.fillStyle = 'rgba(72,10,34,1)';
    ctx.fillRect(p.x - p.w * 0.62, 40, p.w * 1.24, 14);
    ctx.fillRect(p.x - p.w * 0.62, groundY - 18, p.w * 1.24, 18);
    ctx.strokeStyle = 'rgba(12,0,6,0.6)';
    ctx.lineWidth = 1.5;
    for (let k = 1; k <= 3; k++) {
      const fx = p.x - p.w * 0.5 + (p.w * k) / 4;
      ctx.beginPath(); ctx.moveTo(fx, 56); ctx.lineTo(fx, groundY - 20); ctx.stroke();
    }
    // Arch spanning to the next pillar. A true semicircle over a 196px bay
    // springs to y=-44 — above the top of the frame — so only the two feet
    // were visible. A shallow ellipse keeps the whole span on screen.
    const nx = bg.pillars[i + 1];
    if (nx && nx.x - p.x < 260) {
      ctx.strokeStyle = 'rgba(66,8,30,0.9)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.ellipse((p.x + nx.x) / 2, 56, (nx.x - p.x) / 2, 40, 0, Math.PI, 0);
      ctx.stroke();
      // Keystone
      ctx.fillStyle = 'rgba(84,12,38,0.95)';
      ctx.fillRect((p.x + nx.x) / 2 - 7, 10, 14, 14);
    }
  }

  // ── Hanging banners ──────────────────────────────────────────────────────
  for (const b of bg.banners) {
    if (!seen(b.x, 60)) continue;
    const sw = Math.sin(f * 0.016 + b.phase) * 4;
    ctx.fillStyle = 'rgba(96,4,26,0.85)';
    ctx.beginPath();
    ctx.moveTo(b.x - 15, 62);
    ctx.lineTo(b.x + 15, 62);
    ctx.lineTo(b.x + 15 + sw, 62 + b.h);
    ctx.lineTo(b.x + sw, 62 + b.h + 12);
    ctx.lineTo(b.x - 15 + sw, 62 + b.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(220,40,70,${0.35 + Math.sin(f * 0.03 + b.phase) * 0.15})`;
    ctx.beginPath();
    ctx.arc(b.x + sw * 0.5, 62 + b.h * 0.4, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Chains from the vault ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(70,18,30,0.8)';
  ctx.lineWidth = 2;
  for (const ch of bg.chains) {
    if (!seen(ch.x, 40)) continue;
    const sw = Math.sin(f * 0.012 + ch.phase) * 5;
    ctx.beginPath();
    ctx.moveTo(ch.x, 0);
    ctx.quadraticCurveTo(ch.x + sw * 0.5, ch.len * 0.6, ch.x + sw, ch.len);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,24,38,0.85)';
    for (let k = 1; k <= 4; k++) {
      const t2 = k / 5;
      ctx.beginPath();
      ctx.ellipse(ch.x + sw * t2 * t2, ch.len * t2, 3, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Throne on its dais, dead centre of the hall ──────────────────────────
  const tX = bg.cx;
  if (seen(tX, 260)) {
    ctx.fillStyle = '#160009';
    ctx.fillRect(tX - 120, 452, 240, 28);
    ctx.fillRect(tX - 96, 424, 192, 28);
    ctx.fillStyle = '#230011';
    ctx.fillRect(tX - 46, 300, 92, 128);
    ctx.beginPath();
    ctx.moveTo(tX - 46, 300);
    ctx.lineTo(tX - 40, 214);
    ctx.lineTo(tX - 22, 244);
    ctx.lineTo(tX - 8, 178);
    ctx.lineTo(tX + 8, 178);
    ctx.lineTo(tX + 22, 244);
    ctx.lineTo(tX + 40, 214);
    ctx.lineTo(tX + 46, 300);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(210,20,60,${0.35 + throb * 0.3})`;
    ctx.fillRect(tX - 30, 306, 60, 8);
    ctx.strokeStyle = `rgba(255,60,90,${0.4 + throb * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tX - 40, 214); ctx.lineTo(tX - 8, 178);
    ctx.lineTo(tX + 8, 178);  ctx.lineTo(tX + 40, 214);
    ctx.stroke();
  }

  // ── Braziers with live flame ─────────────────────────────────────────────
  for (const bx of bg.braziers) {
    if (!seen(bx, 130)) continue;
    ctx.fillStyle = '#2a0812';
    ctx.fillRect(bx - 4, groundY - 52, 8, 52);
    ctx.beginPath();
    ctx.moveTo(bx - 18, groundY - 62);
    ctx.lineTo(bx + 18, groundY - 62);
    ctx.lineTo(bx + 11, groundY - 48);
    ctx.lineTo(bx - 11, groundY - 48);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const hgt = 26 + Math.sin(f * (0.09 + k * 0.04) + bx + k) * 10;
      const off = Math.sin(f * (0.07 + k * 0.03) + k * 2 + bx) * 4;
      const g = ctx.createLinearGradient(bx, groundY - 62, bx, groundY - 62 - hgt);
      g.addColorStop(0, 'rgba(255,140,20,0.75)');
      g.addColorStop(0.6, 'rgba(255,60,20,0.35)');
      g.addColorStop(1, 'rgba(255,30,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - 10 + k * 3, groundY - 60);
      ctx.quadraticCurveTo(bx + off, groundY - 62 - hgt * 0.6, bx + off * 0.5, groundY - 62 - hgt);
      ctx.quadraticCurveTo(bx + off - 6, groundY - 62 - hgt * 0.5, bx + 8 - k * 3, groundY - 60);
      ctx.closePath();
      ctx.fill();
    }
    const pg2 = ctx.createRadialGradient(bx, groundY - 50, 3, bx, groundY - 50, 110);
    pg2.addColorStop(0, 'rgba(255,120,30,0.20)');
    pg2.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = pg2;
    ctx.fillRect(bx - 115, groundY - 165, 230, 230);
    ctx.restore();
  }

  // ── Embers ───────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of bg.embers) {
    if (!seen(e.x, 60)) continue;
    const ey = ((e.y - f * e.spd) % 560 + 560) % 560;
    const ex = e.x + Math.sin(f * e.drift + e.phase) * e.amp;
    ctx.globalAlpha = (ey / 560) * 0.8;
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, e.r * 4);
    g.addColorStop(0, 'rgba(255,190,110,1)');
    g.addColorStop(0.4, 'rgba(255,80,40,0.5)');
    g.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ex, ey, e.r * 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // ── Floor, cracked and lit from beneath ──────────────────────────────────
  ctx.fillStyle = '#180010'; ctx.fillRect(L, groundY, WW, H + 300 - groundY);
  ctx.strokeStyle = `rgba(230,20,50,${0.45 + Math.sin(f * 0.06) * 0.18})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#e6143c'; ctx.shadowBlur = 8;
  for (const [x1, y1, x2, y2] of bg.cracks) {
    if (!seen(x1, 220)) continue;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // Flagstone joints — stepped through the visible span only
  ctx.strokeStyle = 'rgba(50,0,24,0.9)';
  ctx.lineWidth = 1;
  const j0 = Math.floor((vis0 - 200) / 54) * 54;
  for (let x = j0; x < vis1 + 200; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x - 20, H + 120); ctx.stroke();
  }

  ctx.restore();
}
