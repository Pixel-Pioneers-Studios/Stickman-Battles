'use strict';
// smb-drawing-arenas2.js — Cave, mirror, underwater, volcano, colosseum, cyberpunk, haunted, clouds, neon grid, mushroom arena draw functions
// Depends on: smb-globals.js, smb-data-arenas.js, smb-particles-core.js

// ============================================================
// NEW ARENA DRAW FUNCTIONS
// ============================================================

// ── Crystal Cave ──────────────────────────────────────────────────────────
// The arena is called Crystal Cave and had no crystals in it — just ten brown
// triangles hanging off the ceiling. This adds the actual subject: faceted
// glowing clusters on the walls, floor and ceiling, each casting a coloured
// pool of light onto the rock, plus a layered rock backdrop, a shaft of
// daylight through a ceiling crack, drips, and dust. Static geometry is cached
// (same pattern as _iceBg) so nothing rerolls per frame.
function _caveBg() {
  if (_caveBg._c) return _caveBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const HUES = [
    { core: '#dff6ff', mid: '#5fd8ff', deep: '#1a6ea8', glow: '95,216,255' },  // cyan
    { core: '#f3e4ff', mid: '#b478ff', deep: '#4a2288', glow: '180,120,255' }, // violet
    { core: '#e6fff2', mid: '#5fffbe', deep: '#136b4c', glow: '95,255,190' },  // aqua
  ];
  // A crystal is a bundle of tapered prisms sharing a root point
  const cluster = (x, y, dir, scale, hue) => ({
    x, y, dir, hue,
    phase: rnd(0, Math.PI * 2),
    spd:   rnd(0.012, 0.032),
    shards: Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({
      len:  rnd(30, 72) * scale,
      // Thin shards read as glowing reeds, not crystal — these need real mass
      w:    rnd(16, 34) * scale,
      lean: rnd(-0.30, 0.30),
      // facet split, as a fraction of the half-width — off-centre reads faceted
      split: rnd(-0.35, 0.35),
      a:    rnd(0.72, 1),
    })),
  });
  const c = {
    // Rock strata behind everything, two parallax bands
    strata: [0, 1].map(i => ({
      par:  0.05 + i * 0.07,
      fill: i === 0 ? 'rgba(19,12,9,0.92)' : 'rgba(28,18,12,0.9)',
      pts:  Array.from({ length: 34 }, (_, k) => ({
        x: -60 + k * 32,
        // Low, broad rock shelves. Tall peaks here looked like a mountain
        // range seen through the cave rather than the far wall of it.
        y: (i === 0 ? 196 : 248) + Math.sin(k * 0.5 + i * 2.1) * (14 - i * 4)
                                 + Math.sin(k * 1.3 + i) * (6 - i * 2),
      })),
    })),
    // Stalactites (ceiling) and stalagmites (floor)
    tites: Array.from({ length: 16 }, (_, i) => ({
      x: -20 + i * 60 + rnd(-16, 16),
      h: rnd(26, 88),
      w: rnd(9, 22),
      lean: rnd(-6, 6),
      drip: rnd(0, 200),
    })),
    mites: Array.from({ length: 11 }, (_, i) => ({
      x: 10 + i * 82 + rnd(-24, 24),
      h: rnd(16, 54),
      w: rnd(11, 26),
      lean: rnd(-5, 5),
    })),
    // Crystal clusters: ceiling-hung, wall/ledge, and floor-grown
    crystals: [
      cluster(72,  22,  1,  0.95, HUES[0]), cluster(206, 20,  1,  0.7,  HUES[1]),
      cluster(438, 24,  1,  1.1,  HUES[0]), cluster(662, 20,  1,  0.8,  HUES[2]),
      cluster(830, 22,  1,  0.9,  HUES[1]),
      cluster(38,  478, -1, 1.15, HUES[1]), cluster(168, 478, -1, 0.72, HUES[0]),
      cluster(305, 478, -1, 0.95, HUES[2]), cluster(520, 478, -1, 1.25, HUES[0]),
      cluster(700, 478, -1, 0.85, HUES[1]), cluster(866, 478, -1, 1.0,  HUES[2]),
      cluster(120, 300, -1, 0.6,  HUES[0]), cluster(775, 312, -1, 0.65, HUES[2]),
    ],
    HUES,
    // Motes catching the crystal light
    motes: Array.from({ length: 34 }, () => ({
      x:     rnd(-20, 920),
      y:     rnd(20, 500),
      r:     rnd(0.6, 2.0),
      spd:   rnd(0.04, 0.20),
      drift: rnd(0.005, 0.016),
      amp:   rnd(6, 26),
      phase: rnd(0, Math.PI * 2),
      a:     rnd(0.10, 0.34),
      hue:   HUES[Math.floor(Math.random() * HUES.length)],
    })),
  };
  _caveBg._c = c;
  return c;
}

// Draws one crystal cluster. dir = 1 grows downward (ceiling), -1 upward (floor).
function _drawCrystalCluster(cl, f) {
  const pulse = 0.72 + Math.sin(f * cl.spd + cl.phase) * 0.28;
  const h = cl.hue;

  // Light pool on the surrounding rock
  const gr = ctx.createRadialGradient(cl.x, cl.y, 2, cl.x, cl.y, 90);
  gr.addColorStop(0,    `rgba(${h.glow},${0.42 * pulse})`);
  gr.addColorStop(0.35, `rgba(${h.glow},${0.16 * pulse})`);
  gr.addColorStop(1,    `rgba(${h.glow},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr;
  ctx.fillRect(cl.x - 95, cl.y - 95, 190, 190);
  ctx.restore();

  for (const s of cl.shards) {
    const tipX = cl.x + s.lean * s.len;
    const tipY = cl.y + cl.dir * s.len;
    const bx   = cl.x;
    const by   = cl.y;
    const hw   = s.w * 0.5;

    // Body — dark face and lit face split along the crystal's long axis
    const mid = bx + s.split * hw;
    ctx.globalAlpha = s.a;
    ctx.fillStyle = h.deep;
    ctx.beginPath();
    ctx.moveTo(bx - hw, by);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(mid,  by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = h.mid;
    ctx.beginPath();
    ctx.moveTo(mid, by);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bx + hw, by);
    ctx.closePath();
    ctx.fill();

    // Inner light running up the spine, brightest at the tip
    const lg = ctx.createLinearGradient(bx, by, tipX, tipY);
    lg.addColorStop(0, `rgba(${h.glow},0)`);
    lg.addColorStop(1, `rgba(${h.glow},${0.85 * pulse})`);
    ctx.strokeStyle = lg;
    ctx.lineWidth   = Math.max(1.2, s.w * 0.28);
    ctx.beginPath();
    ctx.moveTo(mid, by);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Facet highlight running down the lit flank — a round tip bead read as a
    // pin stuck on a stem, this reads as a polished face catching light.
    ctx.globalAlpha = s.a * pulse * 0.75;
    ctx.fillStyle   = h.core;
    ctx.beginPath();
    ctx.moveTo(mid + (bx + hw - mid) * 0.25, by);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(mid + (bx + hw - mid) * 0.62, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCaveArena() {
  const bg = _caveBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const ceilY = 20, floorY = 480;

  ctx.save();

  // ── Rock strata behind everything ─────────────────────────────────────────
  for (const st of bg.strata) {
    ctx.save();
    ctx.translate(-camOff * st.par, 0);
    ctx.fillStyle = st.fill;
    ctx.beginPath();
    ctx.moveTo(st.pts[0].x, -40);
    for (const p of st.pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(st.pts[st.pts.length - 1].x, -40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Daylight shaft through a crack in the ceiling ─────────────────────────
  const shaftPulse = 0.8 + Math.sin(f * 0.006) * 0.2;
  const sg = ctx.createLinearGradient(392, ceilY, 300, floorY);
  sg.addColorStop(0,   `rgba(214,232,255,${0.16 * shaftPulse})`);
  sg.addColorStop(0.7, `rgba(180,208,246,${0.05 * shaftPulse})`);
  sg.addColorStop(1,   'rgba(160,190,240,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(374, ceilY); ctx.lineTo(414, ceilY);
  ctx.lineTo(352, floorY); ctx.lineTo(250, floorY);
  ctx.closePath();
  ctx.fill();

  // ── Stalactites — tapered with a lit left edge, not flat triangles ────────
  for (const s of bg.tites) {
    const tipX = s.x + s.lean, tipY = ceilY + s.h;
    ctx.fillStyle = '#3a2418';
    ctx.beginPath();
    ctx.moveTo(s.x - s.w * 0.5, ceilY);
    ctx.quadraticCurveTo(s.x - s.w * 0.22, ceilY + s.h * 0.6, tipX, tipY);
    ctx.quadraticCurveTo(s.x + s.w * 0.22, ceilY + s.h * 0.6, s.x + s.w * 0.5, ceilY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(122,84,54,0.55)';
    ctx.beginPath();
    ctx.moveTo(s.x - s.w * 0.5, ceilY);
    ctx.quadraticCurveTo(s.x - s.w * 0.22, ceilY + s.h * 0.6, tipX, tipY);
    ctx.lineTo(s.x - s.w * 0.1, ceilY);
    ctx.closePath();
    ctx.fill();

    // Water bead swelling at the tip, then falling
    const cyc = (f * 1.6 + s.drip) % 200;
    if (cyc < 130) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle   = '#8fd8ff';
      ctx.beginPath();
      ctx.arc(tipX, tipY + 2, 1 + (cyc / 130) * 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const fall = (cyc - 130) / 70;
      const dy = tipY + fall * (floorY - tipY);
      // A 10px dash mid-air read as a rendering artifact; a stretched bead does not
      ctx.globalAlpha = 0.4 * (1 - fall * 0.5);
      ctx.fillStyle   = '#8fd8ff';
      ctx.beginPath();
      ctx.ellipse(tipX, dy, 1.6, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (fall > 0.93) {
        ctx.globalAlpha = (1 - fall) * 5;
        ctx.strokeStyle = '#8fd8ff';
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.ellipse(tipX, floorY, 10 * (fall - 0.93) * 14, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Stalagmites rising from the floor ─────────────────────────────────────
  for (const s of bg.mites) {
    ctx.fillStyle = '#331e12';
    ctx.beginPath();
    ctx.moveTo(s.x - s.w * 0.5, floorY);
    ctx.quadraticCurveTo(s.x - s.w * 0.2, floorY - s.h * 0.6, s.x + s.lean, floorY - s.h);
    ctx.quadraticCurveTo(s.x + s.w * 0.2, floorY - s.h * 0.6, s.x + s.w * 0.5, floorY);
    ctx.closePath();
    ctx.fill();
  }

  // ── The crystals ──────────────────────────────────────────────────────────
  for (const cl of bg.crystals) _drawCrystalCluster(cl, f);

  // ── Motes catching crystal light ──────────────────────────────────────────
  for (const m of bg.motes) {
    const my = ((m.y - f * m.spd) % 540 + 540) % 540;
    const mx = m.x + Math.sin(f * m.drift + m.phase) * m.amp;
    ctx.globalAlpha = m.a;
    ctx.fillStyle   = m.hue.core;
    ctx.beginPath();
    ctx.arc(mx, my, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Cave-edge vignette: the walls swallow light toward the corners ────────
  const vg = ctx.createRadialGradient(450, 250, 180, 450, 250, 620);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(-200, -100, GAME_W + 400, GAME_H + 200);

  ctx.restore();

  // ── Falling stalactites from the map perk (kept as-is, now shaped) ────────
  if (mapPerkState.stalactites) {
    for (const st of mapPerkState.stalactites) {
      const warn = st.warnTimer > 0;
      ctx.globalAlpha = warn ? 0.4 + Math.abs(Math.sin(frameCount * 0.3)) * 0.5 : 1;
      ctx.fillStyle   = '#5a3520';
      ctx.beginPath();
      ctx.moveTo(st.x - 9, st.y);
      ctx.quadraticCurveTo(st.x - 4, st.y + 16, st.x, st.y + 28);
      ctx.quadraticCurveTo(st.x + 4, st.y + 16, st.x + 9, st.y);
      ctx.closePath();
      ctx.fill();
      // Crystal seam so falling debris reads as part of this cave
      ctx.strokeStyle = warn ? 'rgba(255,120,120,0.9)' : 'rgba(95,216,255,0.75)';
      ctx.lineWidth   = 1.6;
      ctx.beginPath(); ctx.moveTo(st.x - 2, st.y + 4); ctx.lineTo(st.x, st.y + 24); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// ── Mirror Realm ──────────────────────────────────────────────────────────
// Was five rotating wireframe polygons at 7-12% alpha, which is close to
// invisible. Rebuilt around the thing the map is named for: a mirror plane
// with an inverted reflected world under it, drifting glass shards that each
// carry a shifted reflection, a kaleidoscope bloom at the centre, expanding
// ripple rings, and a chromatic split along the seam.
function _mirrorBg() {
  if (_mirrorBg._c) return _mirrorBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  _mirrorBg._c = {
    // Floating glass shards — irregular triangles/quads that catch the light
    shards: Array.from({ length: 16 }, () => ({
      x:     rnd(-30, 930),
      y:     rnd(20, 460),
      r:     rnd(16, 58),
      rot:   rnd(0, 6.28),
      spin:  rnd(-0.004, 0.004),
      drift: rnd(0.004, 0.012),
      amp:   rnd(8, 34),
      phase: rnd(0, 6.28),
      // Array.from's map fn gets (value, index) only — never the array — so the
      // vertex count has to be captured before the map, not read off `arr`.
      pts:   ((n) => Array.from({ length: n }, (_, i) => ({
        a: (i / n) * Math.PI * 2 + rnd(-0.4, 0.4),
        d: rnd(0.55, 1),
      })))(3 + Math.floor(Math.random() * 2)),
      tint:  Math.random() < 0.5 ? '120,190,255' : '235,140,220',
    })),
    // Distant spires reflected in the plane
    spires: Array.from({ length: 12 }, (_, i) => ({
      x: -30 + i * 82 + rnd(-20, 20),
      h: rnd(40, 150),
      w: rnd(10, 30),
    })),
    ripples: Array.from({ length: 4 }, (_, i) => ({ off: i * 90, x: 160 + i * 200 })),
    motes: Array.from({ length: 34 }, () => ({
      x: rnd(-20, 920), y: rnd(0, 520), r: rnd(0.6, 2.2), spd: rnd(0.05, 0.24),
      drift: rnd(0.005, 0.016), amp: rnd(6, 26), phase: rnd(0, 6.28), a: rnd(0.10, 0.35),
    })),
  };
  return _mirrorBg._c;
}

function drawMirrorArena() {
  const bg = _mirrorBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const seam = 250;                    // the mirror plane

  ctx.save();

  // ── Kaleidoscope bloom behind everything ─────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(450, seam);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + f * 0.0015;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * 420, Math.sin(a) * 420);
    g.addColorStop(0, 'rgba(90,150,240,0.13)');
    g.addColorStop(1, 'rgba(200,110,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.14) * 460, Math.sin(a - 0.14) * 460);
    ctx.lineTo(Math.cos(a + 0.14) * 460, Math.sin(a + 0.14) * 460);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── Spire skyline, and its inversion under the plane ─────────────────────
  // Drawing the same silhouette twice — once flipped about `seam` — is what
  // makes the plane read as a mirror rather than as a horizon line.
  for (const flip of [1, -1]) {
    ctx.save();
    ctx.translate(-camOff * 0.06, 0);
    ctx.globalAlpha = flip === 1 ? 0.55 : 0.26;
    const grd = ctx.createLinearGradient(0, seam - 160 * flip, 0, seam);
    grd.addColorStop(0, 'rgba(28,58,104,1)');
    grd.addColorStop(1, 'rgba(52,96,158,1)');
    ctx.fillStyle = grd;
    for (const sp of bg.spires) {
      ctx.beginPath();
      ctx.moveTo(sp.x - sp.w * 0.5, seam);
      ctx.lineTo(sp.x - sp.w * 0.2, seam - sp.h * flip * 0.72);
      ctx.lineTo(sp.x, seam - sp.h * flip);
      ctx.lineTo(sp.x + sp.w * 0.2, seam - sp.h * flip * 0.72);
      ctx.lineTo(sp.x + sp.w * 0.5, seam);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── The plane itself: a bright seam with a sheen sliding along it ────────
  const sheen = ((f * 1.6) % 1400) - 250;
  const sg = ctx.createLinearGradient(sheen - 180, 0, sheen + 180, 0);
  sg.addColorStop(0,   'rgba(180,225,255,0)');
  sg.addColorStop(0.5, 'rgba(220,245,255,0.5)');
  sg.addColorStop(1,   'rgba(180,225,255,0)');
  ctx.fillStyle = 'rgba(150,205,255,0.20)';
  ctx.fillRect(-200, seam - 1.5, GAME_W + 400, 3);
  ctx.fillStyle = sg;
  ctx.fillRect(-200, seam - 2.5, GAME_W + 400, 5);
  // Chromatic split either side of the seam
  ctx.fillStyle = 'rgba(255,80,160,0.13)';
  ctx.fillRect(-200, seam - 5, GAME_W + 400, 2);
  ctx.fillStyle = 'rgba(80,220,255,0.13)';
  ctx.fillRect(-200, seam + 3, GAME_W + 400, 2);

  // ── Ripple rings spreading across the plane ──────────────────────────────
  ctx.strokeStyle = 'rgba(170,220,255,0.5)';
  for (const rp of bg.ripples) {
    const t2 = (((f * 0.9 + rp.off) % 320) / 320);
    ctx.globalAlpha = (1 - t2) * 0.35;
    ctx.lineWidth = 2 - t2;
    ctx.beginPath();
    ctx.ellipse(rp.x, seam, t2 * 230, t2 * 34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── Floating shards ──────────────────────────────────────────────────────
  for (const sh of bg.shards) {
    const sx = sh.x + Math.sin(f * sh.drift + sh.phase) * sh.amp - camOff * 0.10;
    const sy = sh.y + Math.cos(f * sh.drift * 0.8 + sh.phase) * sh.amp * 0.5;
    const rot = sh.rot + f * sh.spin;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    // Glass body
    ctx.beginPath();
    sh.pts.forEach((p, i) => {
      const px = Math.cos(p.a) * sh.r * p.d, py = Math.sin(p.a) * sh.r * p.d;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    const gg = ctx.createLinearGradient(-sh.r, -sh.r, sh.r, sh.r);
    gg.addColorStop(0,   `rgba(${sh.tint},0.30)`);
    gg.addColorStop(0.45, `rgba(255,255,255,0.16)`);
    gg.addColorStop(1,   `rgba(${sh.tint},0.06)`);
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = `rgba(220,242,255,0.55)`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Specular streak across the face
    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const st = ctx.createLinearGradient(-sh.r, 0, sh.r, 0);
    st.addColorStop(0,   'rgba(255,255,255,0)');
    st.addColorStop(0.5, `rgba(255,255,255,${0.22 + Math.sin(f * 0.03 + sh.phase) * 0.12})`);
    st.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = st;
    ctx.fillRect(-sh.r, -sh.r * 0.3, sh.r * 2, sh.r * 0.6);
    ctx.restore();
    ctx.restore();
  }

  // ── Drifting motes ───────────────────────────────────────────────────────
  ctx.fillStyle = '#cfe8ff';
  for (const m of bg.motes) {
    const my = ((m.y - f * m.spd) % 560 + 560) % 560;
    const mx = m.x + Math.sin(f * m.drift + m.phase) * m.amp;
    ctx.globalAlpha = m.a;
    ctx.beginPath(); ctx.arc(mx, my, m.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Mirror arena gimmick: invert controls every 20s ───────────────────────────
const MIRROR_FLIP_INTERVAL = 1200; // 20 seconds at 60fps
const MIRROR_WARN_FRAMES   = 90;   // 1.5s warning before flip

function updateMirrorGimmick() {
  if (!gameRunning || currentArenaKey !== 'mirror') {
    // Reset when leaving mirror arena
    if (mirrorFlipped) { mirrorFlipped = false; mirrorFlipTimer = 0; mirrorFlipWarning = 0; }
    return;
  }
  mirrorFlipTimer++;
  if (mirrorFlipWarning > 0) mirrorFlipWarning--;

  // Warn players before the flip
  if (mirrorFlipTimer === MIRROR_FLIP_INTERVAL - MIRROR_WARN_FRAMES) {
    mirrorFlipWarning = MIRROR_WARN_FRAMES;
    showBossDialogue(mirrorFlipped ? '⟳ Reality restoring…' : '↔ Mirror flipping…', MIRROR_WARN_FRAMES + 20);
  }

  if (mirrorFlipTimer >= MIRROR_FLIP_INTERVAL) {
    mirrorFlipped = !mirrorFlipped;
    mirrorFlipTimer = 0;
    screenShake = mirrorFlipped ? 22 : 14;
    CinFX && CinFX.flash(mirrorFlipped ? '#88ccff' : '#ccaaff', 0.45, 12);
    // All fighters: instantly swap their facing/vx as visual "pop"
    if (Array.isArray(players)) {
      for (const p of players) { if (p && p.health > 0) { p.vx = -p.vx * 0.5; } }
    }
  }
}

// Draw mirror warning overlay (screen-space)
function drawMirrorGimmickOverlay() {
  if (currentArenaKey !== 'mirror') return;
  if (mirrorFlipWarning <= 0 && !mirrorFlipped) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = canvas.width, ch = canvas.height;

  // Warning pulse when about to flip
  if (mirrorFlipWarning > 0) {
    const alpha = (mirrorFlipWarning / MIRROR_WARN_FRAMES) * 0.22 * (0.5 + 0.5 * Math.sin(mirrorFlipWarning * 0.3));
    ctx.fillStyle = `rgba(136,204,255,${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, cw, ch);
  }

  // Persistent "MIRRORED" indicator when controls are inverted
  if (mirrorFlipped) {
    ctx.globalAlpha = 0.7;
    ctx.font = `bold ${Math.round(ch * 0.022)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaddff';
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur  = 10;
    ctx.fillText('↔ CONTROLS MIRRORED', cw / 2, _hudBottom() + Math.round(ch * 0.04) + 12);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ── Sunken Reef ───────────────────────────────────────────────────────────
// The ocean map had eight caustic ellipses, some bubbles and nothing alive in
// it. This gives it the things that make water read as water — a lit surface,
// crepuscular rays, a caustic net on the seabed, kelp, coral — and, more to the
// point, inhabitants: two schools of fish that move as a shoal, solitary
// cruisers, pulsing jellyfish, and a whale silhouette in the far haze.
function _uwBg() {
  if (_uwBg._c) return _uwBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FISH_COL = ['#ffb347', '#ffd166', '#8be0ff', '#7ee8b0', '#ff8fa3', '#c9a2ff'];
  const c = {
    // Reef ridge silhouettes, two parallax bands
    reef: [0, 1].map(i => ({
      par:  0.05 + i * 0.07,
      fill: i === 0 ? 'rgba(3,32,62,0.75)' : 'rgba(4,48,86,0.7)',
      base: i === 0 ? 452 : 470,
      amp:  i === 0 ? 46 : 30,
      seed: 1.9 + i * 2.7,
    })),
    // Kelp rooted on the seabed
    kelp: Array.from({ length: 22 }, (_, i) => ({
      x:     -30 + i * 44 + rnd(-16, 16),
      h:     rnd(90, 260),
      w:     rnd(3, 7),
      lean:  rnd(-0.25, 0.25),
      phase: rnd(0, Math.PI * 2),
      spd:   rnd(0.010, 0.022),
      blades: 4 + Math.floor(Math.random() * 5),
      col:   ['rgba(24,92,58,0.75)', 'rgba(34,112,68,0.7)', 'rgba(18,74,52,0.8)'][Math.floor(Math.random() * 3)],
    })),
    // Coral heads and anemones along the floor
    coral: Array.from({ length: 14 }, (_, i) => ({
      x:     10 + i * 66 + rnd(-22, 22),
      s:     rnd(0.6, 1.5),
      kind:  Math.floor(Math.random() * 3),          // 0 branch, 1 fan, 2 anemone
      col:   ['#ff7ab0', '#ffa86b', '#9d7dff', '#5fd8c8'][Math.floor(Math.random() * 4)],
      phase: rnd(0, Math.PI * 2),
    })),
    // Two shoals. Each fish keeps a fixed offset from the shoal's leader path,
    // so the group turns together instead of scattering.
    shoals: [
      { n: 24, cx: 300, cy: 190, rx: 330, ry: 80, spd: 0.0055, phase: 0.0, size: 7,   col: FISH_COL[0] },
      { n: 18, cx: 560, cy: 350, rx: 280, ry: 60, spd: 0.0080, phase: 2.1, size: 5.5, col: FISH_COL[2] },
    ].map(s => ({
      ...s,
      members: Array.from({ length: s.n }, () => ({
        ox: rnd(-70, 70), oy: rnd(-42, 42), lag: rnd(0, 1.5),
        wag: rnd(0.15, 0.30), sc: rnd(0.75, 1.25),
      })),
    })),
    // Solitary cruisers on their own long paths
    loners: [
      { y: 150, h: 34, spd: 0.55, size: 15, col: '#ffd166', off: 0 },
      { y: 400, h: 20, spd: -0.38, size: 19, col: '#8be0ff', off: 420 },
      { y: 268, h: 26, spd: 0.30, size: 12, col: '#ff8fa3', off: 760 },
    ],
    jellies: Array.from({ length: 5 }, () => ({
      x:     rnd(-20, 920),
      y:     rnd(90, 420),
      r:     rnd(9, 18),
      spd:   rnd(0.10, 0.26),
      drift: rnd(0.006, 0.015),
      amp:   rnd(10, 34),
      phase: rnd(0, Math.PI * 2),
      pulse: rnd(0.04, 0.08),
      col:   ['160,120,255', '120,220,255', '255,150,200'][Math.floor(Math.random() * 3)],
    })),
    // Marine snow
    snow: Array.from({ length: 46 }, () => ({
      x: rnd(-20, 920), y: rnd(0, 520), r: rnd(0.6, 2.0), spd: rnd(0.05, 0.22),
      drift: rnd(0.004, 0.013), amp: rnd(5, 22), phase: rnd(0, 6.28), a: rnd(0.08, 0.26),
    })),
    // Ambient bubble columns rising off the reef
    vents: [120, 470, 780].map(x => ({ x, phase: Math.random() * 200 })),
    rays: Array.from({ length: 6 }, (_, i) => ({
      x: 60 + i * 150 + rnd(-30, 30), w: rnd(30, 76), a: rnd(0.05, 0.11), phase: rnd(0, 6.28),
    })),
  };
  _uwBg._c = c;
  return c;
}

// Darken a #rrggbb toward black by k (0..1). Fish fins were drawn in
// rgba(0,0,0,0.35), which is invisible against deep water — every fish read as
// a plain oval with no tail.
function _uwShade(hex, k) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = Math.round(((n >> 16) & 255) * (1 - k));
  const g = Math.round(((n >> 8) & 255) * (1 - k));
  const b = Math.round((n & 255) * (1 - k));
  return `rgb(${r},${g},${b})`;
}

// One fish: body, tail that wags, dorsal and pectoral fins, eye. `dir` is +1
// swimming right, -1 left.
function _uwFish(x, y, len, dir, col, wag, dark) {
  const h = len * 0.52;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  // Tail — hinged at the body, so the wag reads as propulsion
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-len * 0.75, 0);
  ctx.lineTo(-len * 1.25, -h * 0.62 + wag * h * 0.5);
  ctx.lineTo(-len * 1.10, 0);
  ctx.lineTo(-len * 1.25, h * 0.62 + wag * h * 0.5);
  ctx.closePath();
  ctx.fill();
  // Dorsal + pelvic fins
  ctx.beginPath();
  ctx.moveTo(-len * 0.1, -h * 0.5);
  ctx.lineTo(-len * 0.45, -h * 1.05 - wag * 2);
  ctx.lineTo(-len * 0.55, -h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-len * 0.15, h * 0.45);
  ctx.lineTo(-len * 0.45, h * 0.95 - wag * 2);
  ctx.lineTo(-len * 0.55, h * 0.3);
  ctx.closePath();
  ctx.fill();
  // Body
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(-len * 0.15, 0, len * 0.78, h, 0, 0, Math.PI * 2);
  ctx.fill();
  // Belly lift
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(-len * 0.2, h * 0.28, len * 0.5, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#06121e';
  ctx.beginPath(); ctx.arc(len * 0.38, -h * 0.16, Math.max(0.9, len * 0.10), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawUnderwaterArena() {
  const bg = _uwBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const floorY = 480;

  ctx.save();

  // ── Depth grade: light pools near the surface, blue-black at the seabed ───
  const dep = ctx.createLinearGradient(0, 0, 0, floorY + 40);
  dep.addColorStop(0,    'rgba(56,150,208,0.42)');
  dep.addColorStop(0.28, 'rgba(20,84,142,0.20)');
  dep.addColorStop(1,    'rgba(0,10,28,0.45)');
  ctx.fillStyle = dep;
  ctx.fillRect(-200, 0, GAME_W + 400, floorY + 60);

  // ── The surface, seen from below ─────────────────────────────────────────
  ctx.fillStyle = 'rgba(150,220,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(-200, 0);
  for (let x = -200; x <= GAME_W + 200; x += 16) {
    ctx.lineTo(x, 14 + Math.sin(x * 0.035 + f * 0.045) * 6 + Math.sin(x * 0.011 - f * 0.02) * 4);
  }
  ctx.lineTo(GAME_W + 200, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,245,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -200; x <= GAME_W + 200; x += 16) {
    const y = 14 + Math.sin(x * 0.035 + f * 0.045) * 6 + Math.sin(x * 0.011 - f * 0.02) * 4;
    if (x === -200) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // ── Crepuscular rays from the surface ────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(-camOff * 0.06, 0);
  for (const ry of bg.rays) {
    const sway  = Math.sin(f * 0.006 + ry.phase) * 16;
    const pulse = 0.65 + Math.sin(f * 0.011 + ry.phase) * 0.35;
    const g = ctx.createLinearGradient(ry.x, 10, ry.x - 60 + sway, floorY);
    g.addColorStop(0,   `rgba(180,235,255,${ry.a * pulse})`);
    g.addColorStop(0.6, `rgba(120,200,250,${ry.a * pulse * 0.3})`);
    g.addColorStop(1,   'rgba(90,170,230,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(ry.x - ry.w * 0.22, 10);
    ctx.lineTo(ry.x + ry.w * 0.22, 10);
    ctx.lineTo(ry.x + sway + ry.w * 1.1, floorY);
    ctx.lineTo(ry.x + sway - ry.w * 1.1, floorY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── Whale, far off in the haze — the map's sense of scale ────────────────
  const whX = ((f * 0.16 + 300) % 1700) - 400;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.translate(-camOff * 0.03, 0);
  ctx.fillStyle = '#7fb6dc';
  ctx.beginPath();
  ctx.ellipse(whX, 140 + Math.sin(f * 0.005) * 10, 105, 26, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();                                    // fluke
  ctx.moveTo(whX - 100, 138 + Math.sin(f * 0.005) * 10);
  ctx.lineTo(whX - 148, 116 + Math.sin(f * 0.005) * 10);
  ctx.lineTo(whX - 138, 140 + Math.sin(f * 0.005) * 10);
  ctx.lineTo(whX - 148, 164 + Math.sin(f * 0.005) * 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();                                    // dorsal
  ctx.moveTo(whX + 6, 118 + Math.sin(f * 0.005) * 10);
  ctx.lineTo(whX - 14, 96 + Math.sin(f * 0.005) * 10);
  ctx.lineTo(whX - 28, 120 + Math.sin(f * 0.005) * 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Reef ridges ──────────────────────────────────────────────────────────
  for (const rf of bg.reef) {
    ctx.save();
    ctx.translate(-camOff * rf.par, 0);
    ctx.fillStyle = rf.fill;
    ctx.beginPath();
    ctx.moveTo(-260, floorY + 60);
    for (let x = -260; x <= GAME_W + 260; x += 26) {
      ctx.lineTo(x, rf.base - Math.abs(Math.sin(x * 0.0055 + rf.seed)) * rf.amp
                            - Math.abs(Math.sin(x * 0.017 + rf.seed * 2)) * rf.amp * 0.4);
    }
    ctx.lineTo(GAME_W + 260, floorY + 60);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Kelp forest ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.11, 0);
  for (const k of bg.kelp) {
    const sway = Math.sin(f * k.spd + k.phase);
    const topX = k.x + k.lean * k.h + sway * 22;
    ctx.strokeStyle = k.col;
    ctx.lineWidth   = k.w;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(k.x, floorY + 6);
    ctx.quadraticCurveTo(k.x + sway * 10, floorY - k.h * 0.55, topX, floorY - k.h);
    ctx.stroke();
    // Blades along the stipe
    ctx.fillStyle = k.col;
    for (let b = 1; b <= k.blades; b++) {
      const p  = b / (k.blades + 1);
      const bx = k.x + (topX - k.x) * p * p + sway * 6 * p;
      const by = floorY + 6 - k.h * p;
      const s  = b % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(bx + s * 7, by, 10, 3.4, s * (0.5 + sway * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
  ctx.restore();

  // ── Coral heads on the seabed ────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.14, 0);
  for (const co of bg.coral) {
    const s = co.s, sway = Math.sin(f * 0.02 + co.phase) * 1.6;
    ctx.globalAlpha = 0.85;
    if (co.kind === 0) {                       // branching coral
      ctx.strokeStyle = co.col;
      ctx.lineWidth   = 4 * s;
      ctx.lineCap     = 'round';
      for (const d of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(co.x, floorY + 4);
        ctx.quadraticCurveTo(co.x + d * 9 * s, floorY - 12 * s,
                             co.x + d * 15 * s + sway, floorY - 26 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(co.x + d * 11 * s, floorY - 18 * s);
        ctx.lineTo(co.x + d * 20 * s + sway, floorY - 30 * s);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else if (co.kind === 1) {                // sea fan
      ctx.strokeStyle = co.col;
      ctx.lineWidth   = 1.6 * s;
      for (let r = -3; r <= 3; r++) {
        ctx.beginPath();
        ctx.moveTo(co.x, floorY + 4);
        ctx.quadraticCurveTo(co.x + r * 5 * s, floorY - 18 * s,
                             co.x + r * 9 * s + sway, floorY - 32 * s);
        ctx.stroke();
      }
      ctx.strokeStyle = co.col;
      ctx.lineWidth   = 1.2 * s;
      for (let a = 1; a <= 2; a++) {
        ctx.beginPath();
        ctx.ellipse(co.x + sway * 0.5, floorY - (12 + a * 9) * s, (a * 9 + 6) * s, 4 * s, 0, Math.PI, 0);
        ctx.stroke();
      }
    } else {                                   // anemone
      ctx.fillStyle = co.col;
      ctx.beginPath();
      ctx.ellipse(co.x, floorY, 11 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = co.col;
      ctx.lineWidth   = 2 * s;
      ctx.lineCap     = 'round';
      for (let t2 = -4; t2 <= 4; t2++) {
        const wob = Math.sin(f * 0.05 + co.phase + t2) * 3;
        ctx.beginPath();
        ctx.moveTo(co.x + t2 * 2 * s, floorY - 2);
        ctx.quadraticCurveTo(co.x + t2 * 4 * s + wob, floorY - 12 * s,
                             co.x + t2 * 5 * s + wob * 1.6, floorY - 19 * s);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ── Caustic net on the seabed ────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(120,210,255,0.13)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const cx2 = -40 + i * 72 + Math.sin(f * 0.02 + i) * 12;
    const r   = 26 + Math.sin(f * 0.03 + i * 0.9) * 10;
    ctx.beginPath();
    ctx.ellipse(cx2, floorY - 4, r, r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx2, floorY - 4, r * 0.55, r * 0.15, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // ── Jellyfish ────────────────────────────────────────────────────────────
  for (const j of bg.jellies) {
    const jy = ((j.y - f * j.spd) % 560 + 560) % 560;
    const jx = j.x + Math.sin(f * j.drift + j.phase) * j.amp;
    const pu = 0.78 + Math.sin(f * j.pulse + j.phase) * 0.22;   // bell contraction
    ctx.save();
    ctx.globalAlpha = 0.55;
    const g = ctx.createRadialGradient(jx, jy, 1, jx, jy, j.r * 2.4);
    g.addColorStop(0, `rgba(${j.col},0.5)`);
    g.addColorStop(1, `rgba(${j.col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(jx, jy, j.r * 2.4, 0, Math.PI * 2); ctx.fill();
    // Bell
    ctx.fillStyle = `rgba(${j.col},0.55)`;
    ctx.beginPath();
    ctx.ellipse(jx, jy, j.r * pu, j.r * (1.6 - pu) * 0.72, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,0.35)`;
    ctx.beginPath();
    ctx.ellipse(jx - j.r * 0.3, jy - j.r * 0.28, j.r * 0.3, j.r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tentacles trailing behind the pulse
    ctx.strokeStyle = `rgba(${j.col},0.42)`;
    ctx.lineWidth = 1.4;
    for (let t2 = -2; t2 <= 2; t2++) {
      const tx = jx + t2 * j.r * 0.34;
      ctx.beginPath();
      ctx.moveTo(tx, jy);
      ctx.quadraticCurveTo(tx + Math.sin(f * 0.06 + t2 + j.phase) * 5, jy + j.r * 1.4,
                           tx + Math.sin(f * 0.05 + t2 * 2 + j.phase) * 8, jy + j.r * 2.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Shoals ───────────────────────────────────────────────────────────────
  for (const sh of bg.shoals) {
    const ang  = f * sh.spd + sh.phase;
    const lead = { x: sh.cx + Math.cos(ang) * sh.rx, y: sh.cy + Math.sin(ang * 1.7) * sh.ry };
    // Heading from the leader's velocity, so the whole shoal flips together
    const dir  = Math.sin(ang) < 0 ? 1 : -1;
    for (const m of sh.members) {
      const a2 = ang - m.lag * 0.10;
      const px = sh.cx + Math.cos(a2) * sh.rx + m.ox;
      const py = sh.cy + Math.sin(a2 * 1.7) * sh.ry + m.oy;
      _uwFish(px, py, sh.size * m.sc, dir, sh.col,
              Math.sin(f * m.wag + m.ox), _uwShade(sh.col, 0.42));
    }
    void lead;
  }

  // ── Solitary cruisers ────────────────────────────────────────────────────
  for (const l of bg.loners) {
    const span = 1200;
    const raw  = ((f * l.spd + l.off) % span + span) % span;
    const lx   = l.spd > 0 ? raw - 150 : GAME_W + 150 - raw;
    const ly   = l.y + Math.sin(f * 0.012 + l.off) * l.h;
    _uwFish(lx, ly, l.size, l.spd > 0 ? 1 : -1, l.col,
            Math.sin(f * 0.14 + l.off) * 1.2, _uwShade(l.col, 0.42));
  }

  // ── Vent bubble columns off the reef ─────────────────────────────────────
  ctx.strokeStyle = 'rgba(190,235,255,0.4)';
  ctx.lineWidth = 1;
  for (const v of bg.vents) {
    for (let b = 0; b < 7; b++) {
      const t2 = ((f * 1.4 + v.phase + b * 46) % 480) / 480;
      const by = floorY - t2 * 470;
      const bx = v.x + Math.sin(t2 * 9 + b) * 9;
      ctx.globalAlpha = (1 - t2) * 0.5;
      ctx.beginPath(); ctx.arc(bx, by, 1.6 + t2 * 3.4, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // ── Perk bubbles (kept — these are gameplay state, not decoration) ───────
  const bubbles = (mapPerkState.bubbles) ? mapPerkState.bubbles : [];
  if ((typeof gameFrozen === 'undefined' || !gameFrozen) && (typeof paused === 'undefined' || !paused)) {
    for (const b of bubbles) {
      b.y -= b.speed;
      if (b.y < -10) b.y = 490 + Math.random() * 30;
    }
  }
  for (const b of bubbles) {
    const wobble = Math.sin(f * 0.06 + b.x * 0.05) * 4;
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(b.x + wobble, b.y, 3 + (b.speed * 2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#cfefff';
    ctx.beginPath();
    ctx.arc(b.x + wobble - 1, b.y - 1, 1.2 + b.speed, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Marine snow ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#dff2ff';
  for (const s of bg.snow) {
    const sy = ((s.y + f * s.spd) % 560 + 560) % 560 - 20;
    const sx = s.x + Math.sin(f * s.drift + s.phase) * s.amp;
    ctx.globalAlpha = s.a;
    ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Volcanic Caldera ──────────────────────────────────────────────────────
// Was the shared lava floor, seven flat black triangles and nothing above the
// horizon. This adds what an active caldera actually looks like: erupting cones
// in parallax with lava running down their flanks, an ash column with volcanic
// lightning in it, heat haze over the lava, obsidian outcrops veined with
// magma, and falling ash.
function _volcBg() {
  if (_volcBg._c) return _volcBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const c = {
    // Cones, far to near
    cones: [
      { x: 175, base: 470, w: 300, h: 250, fill: 'rgba(38,14,8,0.75)', par: 0.04, glow: 0.5, streams: 2 },
      { x: 690, base: 470, w: 250, h: 190, fill: 'rgba(30,10,6,0.8)',  par: 0.06, glow: 0.35, streams: 1 },
      { x: 430, base: 480, w: 190, h: 120, fill: 'rgba(20,6,4,0.9)',   par: 0.10, glow: 0.2,  streams: 1 },
    ].map(k => ({
      ...k,
      // Lava runs down the flanks, each with its own wander
      lava: Array.from({ length: k.streams }, () => ({
        side: Math.random() < 0.5 ? -1 : 1,
        off:  rnd(0.15, 0.55),
        wob:  rnd(0.008, 0.02),
        phase: rnd(0, 6.28),
      })),
    })),
    // Ash plume puffs rising from the main cone
    plume: Array.from({ length: 22 }, (_, i) => ({
      t0:  i / 22,
      rx:  rnd(26, 70),
      dx:  rnd(-60, 60),
      spd: rnd(0.0012, 0.0026),
      phase: rnd(0, 6.28),
    })),
    // Obsidian outcrops in the foreground
    rocks: Array.from({ length: 8 }, (_, i) => ({
      x: i * 128 - 20 + rnd(-20, 20),
      w: rnd(70, 130),
      h: rnd(40, 105),
      seams: Array.from({ length: 2 }, () => ({ o: rnd(-0.3, 0.3), y: rnd(0.25, 0.7), len: rnd(8, 16) })),
    })),
    // Ash falling and embers rising
    ash: Array.from({ length: 44 }, () => ({
      x: rnd(-20, 920), y: rnd(0, 520), r: rnd(0.7, 2.3), spd: rnd(0.10, 0.42),
      drift: rnd(0.006, 0.02), amp: rnd(8, 34), phase: rnd(0, 6.28), a: rnd(0.10, 0.35),
    })),
    embers: Array.from({ length: 26 }, () => ({
      x: rnd(-20, 920), y: rnd(0, 520), r: rnd(0.9, 2.4), spd: rnd(0.35, 1.1),
      drift: rnd(0.01, 0.03), amp: rnd(6, 26), phase: rnd(0, 6.28),
    })),
  };
  _volcBg._c = c;
  return c;
}

function drawVolcanoArena() {
  const bg = _volcBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const ly = currentArena.lavaY || 442;

  ctx.save();

  // ── Ash sky: a hot glow near the ground fading to soot overhead ──────────
  const sky = ctx.createLinearGradient(0, 0, 0, ly + 40);
  sky.addColorStop(0,    'rgba(18,6,4,0.55)');
  sky.addColorStop(0.55, 'rgba(64,16,6,0.28)');
  sky.addColorStop(1,    'rgba(190,60,10,0.30)');
  ctx.fillStyle = sky;
  ctx.fillRect(-200, 0, GAME_W + 400, ly + 60);

  // ── Ash column boiling out of the main cone ──────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.04, 0);
  for (const p of bg.plume) {
    const t2 = ((p.t0 + f * p.spd) % 1);
    const py = 226 - t2 * 260;
    const px = 175 + p.dx * t2 + Math.sin(f * 0.01 + p.phase) * 14 * t2;
    const r  = p.rx * (0.35 + t2 * 1.5);
    ctx.globalAlpha = (1 - t2) * 0.30;
    const g = ctx.createRadialGradient(px, py, 2, px, py, r);
    g.addColorStop(0, t2 < 0.2 ? 'rgba(120,52,20,1)' : 'rgba(58,44,42,1)');
    g.addColorStop(1, 'rgba(40,30,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Volcanic lightning — a rare crack inside the column
  const strike = (f % 220);
  if (strike < 7) {
    ctx.globalAlpha = (1 - strike / 7) * 0.85;
    ctx.strokeStyle = '#cfe0ff';
    ctx.shadowColor = '#8fb4ff';
    ctx.shadowBlur  = 14;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    let lx = 160 + ((f / 220 | 0) % 5) * 18, lyy = 20;
    ctx.moveTo(lx, lyy);
    for (let s = 0; s < 7; s++) {
      lx += Math.sin(s * 3.7 + (f / 220 | 0)) * 22;
      lyy += 26;
      ctx.lineTo(lx, lyy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ── Cones ────────────────────────────────────────────────────────────────
  for (const k of bg.cones) {
    ctx.save();
    ctx.translate(-camOff * k.par, 0);
    const apexY = k.base - k.h;
    const craterHW = k.w * 0.11;
    ctx.fillStyle = k.fill;
    ctx.beginPath();
    ctx.moveTo(k.x - k.w * 0.5, k.base);
    ctx.lineTo(k.x - craterHW, apexY);
    ctx.lineTo(k.x + craterHW, apexY);
    ctx.lineTo(k.x + k.w * 0.5, k.base);
    ctx.closePath();
    ctx.fill();
    // Lit flank — the crater throws light down one side. Without it the cones
    // are the same value as the sky and the whole silhouette disappears.
    ctx.fillStyle = `rgba(140,54,20,${0.30 + k.glow * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(k.x + craterHW, apexY);
    ctx.lineTo(k.x + k.w * 0.5, k.base);
    ctx.lineTo(k.x + k.w * 0.16, k.base);
    ctx.closePath();
    ctx.fill();
    // Rim light, confined to the crater lip. Run down the full flank it drew a
    // bright wireframe 'A' over the cone instead of catching an edge.
    const lipT = 0.14;
    ctx.strokeStyle = `rgba(255,150,60,${0.35 * k.glow + 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(k.x - craterHW - (k.w * 0.5 - craterHW) * lipT, apexY + k.h * lipT);
    ctx.lineTo(k.x - craterHW, apexY);
    ctx.lineTo(k.x + craterHW, apexY);
    ctx.lineTo(k.x + craterHW + (k.w * 0.5 - craterHW) * lipT, apexY + k.h * lipT);
    ctx.stroke();
    // Crater mouth glow
    const cg = ctx.createRadialGradient(k.x, apexY, 1, k.x, apexY, k.w * 0.3);
    cg.addColorStop(0, `rgba(255,180,60,${0.85 * k.glow})`);
    cg.addColorStop(0.4, `rgba(255,90,10,${0.35 * k.glow})`);
    cg.addColorStop(1, 'rgba(220,60,0,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(k.x - k.w * 0.32, apexY - k.w * 0.3, k.w * 0.64, k.w * 0.6);
    ctx.fillStyle = `rgba(255,206,110,${0.9 * k.glow})`;
    ctx.beginPath();
    ctx.ellipse(k.x, apexY + 2, craterHW * 0.9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lava running down a flank — bright at the crater, cooling as it falls
    for (const lv of k.lava) {
      const grd = ctx.createLinearGradient(k.x, apexY, k.x + lv.side * k.w * 0.5, k.base);
      grd.addColorStop(0,   'rgba(255,232,150,0.95)');
      grd.addColorStop(0.4, 'rgba(255,120,20,0.8)');
      grd.addColorStop(1,   'rgba(150,26,0,0.25)');
      ctx.strokeStyle = grd;
      // Two passes: a soft wide glow, then a hot narrow core. One 3.5px stroke
      // arcing off the cone read as a wire strung across the sky.
      const sx0 = k.x + lv.side * craterHW * 0.7, sy0 = apexY + 3;
      const ex0 = k.x + lv.side * k.w * 0.40, ey0 = k.base;
      const mx0 = k.x + lv.side * k.w * (0.16 + lv.off * 0.22) + Math.sin(f * lv.wob + lv.phase) * 4;
      const my0 = apexY + k.h * 0.55;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth   = 8;
      ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.quadraticCurveTo(mx0, my0, ex0, ey0); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth   = 2.6;
      ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.quadraticCurveTo(mx0, my0, ex0, ey0); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Lava floor (shared helper — gameplay-relevant, keep it) ──────────────
  _drawLavaFloor(ly);

  // ── Heat haze over the lava ──────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const hx = -20 + i * 82 + Math.sin(f * 0.02 + i) * 14;
    const hh = 40 + Math.abs(Math.sin(f * 0.017 + i * 1.3)) * 60;
    const g = ctx.createLinearGradient(hx, ly, hx, ly - hh);
    g.addColorStop(0, 'rgba(255,120,30,0.16)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hx - 16, ly + 4);
    ctx.quadraticCurveTo(hx + Math.sin(f * 0.05 + i) * 10, ly - hh * 0.6, hx, ly - hh);
    ctx.quadraticCurveTo(hx - Math.sin(f * 0.05 + i) * 10, ly - hh * 0.6, hx + 16, ly + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── Obsidian outcrops, veined with magma ─────────────────────────────────
  for (const r of bg.rocks) {
    const top = ly + 18 - r.h;
    ctx.fillStyle = '#180402';
    ctx.beginPath();
    ctx.moveTo(r.x, ly + 26);
    ctx.lineTo(r.x + r.w * 0.22, top + r.h * 0.22);
    ctx.lineTo(r.x + r.w * 0.44, top);
    ctx.lineTo(r.x + r.w * 0.68, top + r.h * 0.3);
    ctx.lineTo(r.x + r.w, ly + 18);
    ctx.lineTo(r.x + r.w, GAME_H + 60);
    ctx.lineTo(r.x, GAME_H + 60);
    ctx.closePath();
    ctx.fill();
    // Lit left face
    ctx.fillStyle = 'rgba(84,26,12,0.55)';
    ctx.beginPath();
    ctx.moveTo(r.x, ly + 26);
    ctx.lineTo(r.x + r.w * 0.22, top + r.h * 0.22);
    ctx.lineTo(r.x + r.w * 0.44, top);
    ctx.lineTo(r.x + r.w * 0.34, ly + 26);
    ctx.closePath();
    ctx.fill();
    // Magma seams, breathing
    const seamA = 0.5 + Math.sin(f * 0.03 + r.x) * 0.3;
    ctx.strokeStyle = `rgba(255,110,26,${seamA * 0.6})`;
    ctx.shadowColor = '#ff6a10';
    ctx.shadowBlur  = 5;
    ctx.lineWidth   = 1.2;
    for (const sm of r.seams) {
      const sx = r.x + r.w * (0.5 + sm.o);
      const sy = top + r.h * sm.y;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sm.len * 0.22, sy + sm.len * 0.6);
      ctx.lineTo(sx - sm.len * 0.10, sy + sm.len * 1.3);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── Geyser visuals from perk state (gameplay — kept) ─────────────────────
  if (mapPerkState.geysers) {
    for (const gy of mapPerkState.geysers) {
      const h = Math.min(gy.timer * 1.2, 220);
      const gg = ctx.createLinearGradient(gy.x, ly - h, gy.x, ly);
      gg.addColorStop(0, 'rgba(255,220,120,0)');
      gg.addColorStop(0.6, 'rgba(255,140,20,0.4)');
      gg.addColorStop(1, 'rgba(255,60,0,0.6)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(gy.x - 18, ly);
      ctx.quadraticCurveTo(gy.x, ly - h, gy.x + 18, ly);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Ash falling, embers rising ───────────────────────────────────────────
  ctx.fillStyle = '#6b625e';
  for (const a of bg.ash) {
    const ay = ((a.y + f * a.spd) % 560 + 560) % 560 - 20;
    const ax = a.x + Math.sin(f * a.drift + a.phase) * a.amp;
    ctx.globalAlpha = a.a;
    ctx.beginPath(); ctx.arc(ax, ay, a.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of bg.embers) {
    const ey = ((e.y - f * e.spd) % 560 + 560) % 560;
    const ex = e.x + Math.sin(f * e.drift + e.phase) * e.amp;
    const fade = ey / 560;
    ctx.globalAlpha = fade * 0.8;
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, e.r * 4);
    g.addColorStop(0, 'rgba(255,210,120,1)');
    g.addColorStop(0.4, 'rgba(255,110,20,0.6)');
    g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ex, ey, e.r * 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Colosseum ─────────────────────────────────────────────────────────────
// Was flat rectangles with a row of dots for a crowd. Rebuilt as an actual
// amphitheatre: a shaded arcade with recessed arches, two banked tiers of
// seating with an individually-coloured crowd that reacts to screen shake,
// hanging banners, a velarium (sun awning) along the top edge, and raked sand.
function _coloBg() {
  if (_coloBg._c) return _coloBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TOGA = ['#d8c8a8', '#c8b090', '#b89878', '#e0d4bc', '#a88c6c', '#c4a882'];
  const mkRow = (y, step, size, alpha) => Array.from({ length: Math.ceil(940 / step) }, (_, i) => ({
    x:     -10 + i * step + rnd(-3, 3),
    y:     y + rnd(-2, 2),
    r:     size,
    col:   TOGA[Math.floor(Math.random() * TOGA.length)],
    a:     alpha,
    phase: rnd(0, Math.PI * 2),
    bob:   rnd(0.6, 1.4),
  }));
  const c = {
    rows: [
      mkRow(50,  17, 4.0, 0.32),
      mkRow(66,  17, 4.4, 0.40),
      mkRow(84,  19, 5.0, 0.50),
      mkRow(104, 21, 5.6, 0.60),
    ],
    arches: [30, 150, 270, 390, 510, 630, 750, 870],
    banners: [110, 300, 480, 690, 850].map(x => ({
      x, w: rnd(24, 34), h: rnd(70, 118),
      col: ['#8a2020', '#7a1a3a', '#8a6a18', '#2a4a7a'][Math.floor(Math.random() * 4)],
      phase: rnd(0, Math.PI * 2),
    })),
    // Velarium panels along the very top
    velum: Array.from({ length: 12 }, (_, i) => ({ x: -20 + i * 82, phase: rnd(0, Math.PI * 2) })),
    // Sand: rake arcs and old stains
    rakes: Array.from({ length: 9 }, () => ({ x: rnd(-20, 900), y: rnd(486, 516), w: rnd(60, 190), a: rnd(0.05, 0.13) })),
    stains: Array.from({ length: 7 }, () => ({ x: rnd(20, 880), y: rnd(486, 512), r: rnd(9, 26), a: rnd(0.05, 0.14) })),
  };
  _coloBg._c = c;
  return c;
}

function drawColosseumArena() {
  const bg = _coloBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const shake = (typeof screenShake === 'number' ? screenShake : 0);
  const roar  = shake > 4 ? Math.min(1, shake / 12) : 0;

  ctx.save();

  // ── Velarium: sun awning slung across the top of the bowl ─────────────────
  for (const v of bg.velum) {
    const sag = 16 + Math.sin(f * 0.012 + v.phase) * 3;
    ctx.fillStyle = 'rgba(226,196,148,0.30)';
    ctx.beginPath();
    ctx.moveTo(v.x, -4);
    ctx.quadraticCurveTo(v.x + 41, sag, v.x + 82, -4);
    ctx.lineTo(v.x + 82, -20);
    ctx.lineTo(v.x, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,116,72,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(v.x, -4);
    ctx.quadraticCurveTo(v.x + 41, sag, v.x + 82, -4);
    ctx.stroke();
  }

  // ── Banked seating: two shaded tiers behind the crowd ─────────────────────
  const tier = ctx.createLinearGradient(0, 20, 0, 136);
  tier.addColorStop(0,   'rgba(96,74,48,0.55)');
  tier.addColorStop(0.6, 'rgba(132,104,68,0.55)');
  tier.addColorStop(1,   'rgba(160,128,86,0.55)');
  ctx.fillStyle = tier;
  ctx.fillRect(-200, 20, GAME_W + 400, 116);
  // Step lines
  ctx.strokeStyle = 'rgba(70,52,32,0.35)';
  ctx.lineWidth   = 1;
  for (let y = 34; y < 136; y += 17) {
    ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(GAME_W + 200, y); ctx.stroke();
  }
  // Vomitoria — stairway mouths cut into the stands. These have to stay low and
  // faint: at full height and opacity they punched through the (translucent)
  // crowd drawn over them and read as dark spikes standing in the seating.
  ctx.fillStyle = 'rgba(24,14,6,0.26)';
  for (let i = 0; i < 6; i++) {
    const vx = 40 + i * 160;
    ctx.beginPath();
    ctx.moveTo(vx - 9, 136); ctx.lineTo(vx - 4, 112);
    ctx.lineTo(vx + 4, 112); ctx.lineTo(vx + 9, 136);
    ctx.closePath();
    ctx.fill();
  }

  // ── Crowd ─────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.03, 0);
  for (let ri = 0; ri < bg.rows.length; ri++) {
    for (const p of bg.rows[ri]) {
      // Idle shuffle always; a real jump on a heavy hit
      const idle  = Math.sin(f * 0.03 * p.bob + p.phase) * 1.2;
      const jump  = roar * Math.abs(Math.sin(f * 0.28 + p.phase)) * 9 * p.bob;
      const y     = p.y - idle - jump;
      ctx.globalAlpha = p.a;
      ctx.fillStyle   = p.col;
      ctx.beginPath(); ctx.arc(p.x, y, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(p.x - p.r * 0.55, y + p.r * 0.4, p.r * 1.1, p.r * 1.7);
      // Arms up while roaring
      if (roar > 0.35 && (p.x | 0) % 3 === 0) {
        ctx.strokeStyle = p.col;
        ctx.lineWidth   = Math.max(1, p.r * 0.28);
        ctx.beginPath();
        ctx.moveTo(p.x - p.r * 0.5, y + p.r * 0.7); ctx.lineTo(p.x - p.r * 0.95, y - p.r * 0.6);
        ctx.moveTo(p.x + p.r * 0.5, y + p.r * 0.7); ctx.lineTo(p.x + p.r * 0.95, y - p.r * 0.6);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Arcade wall with recessed arches ──────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.07, 0);
  const wall = ctx.createLinearGradient(0, 136, 0, 480);
  wall.addColorStop(0, 'rgba(150,120,80,0.62)');
  wall.addColorStop(1, 'rgba(108,86,58,0.62)');
  ctx.fillStyle = wall;
  ctx.fillRect(-200, 136, GAME_W + 400, 344);
  // Cornice
  ctx.fillStyle = 'rgba(178,146,102,0.7)';
  ctx.fillRect(-200, 130, GAME_W + 400, 13);

  for (let i = 0; i < bg.arches.length; i++) {
    // abot used to be 480 — the recesses ran straight into the sand and left
    // the whole lower two-thirds of the wall as one empty tan field.
    const ax = bg.arches[i], aw = 86, atop = 210, abot = 398;
    // Recess: dark interior
    ctx.fillStyle = 'rgba(26,16,8,0.62)';
    ctx.beginPath();
    ctx.moveTo(ax - aw * 0.5, abot);
    ctx.lineTo(ax - aw * 0.5, atop);
    ctx.arc(ax, atop, aw * 0.5, Math.PI, 0);
    ctx.lineTo(ax + aw * 0.5, abot);
    ctx.closePath();
    ctx.fill();
    // Light falling into the top of the recess
    const ig = ctx.createLinearGradient(0, atop - 40, 0, atop + 90);
    ig.addColorStop(0, 'rgba(255,214,140,0.20)');
    ig.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = ig;
    ctx.fillRect(ax - aw * 0.5, atop - 40, aw, 130);
    // Voussoir ring
    ctx.strokeStyle = 'rgba(196,162,112,0.75)';
    ctx.lineWidth   = 7;
    ctx.beginPath();
    ctx.arc(ax, atop, aw * 0.5 + 3, Math.PI, 0);
    ctx.stroke();
    // Pilasters flanking it
    ctx.fillStyle = 'rgba(186,152,104,0.6)';
    ctx.fillRect(ax - aw * 0.5 - 11, atop, 9, abot - atop);
    ctx.fillRect(ax + aw * 0.5 + 2,  atop, 9, abot - atop);
  }

  // Podium wall the arcade stands on — coursed masonry, then a shading pass so
  // the arena floor sits in the bowl's shadow rather than in flat light.
  const pod = ctx.createLinearGradient(0, 396, 0, 486);
  pod.addColorStop(0, 'rgba(168,138,96,0.85)');
  pod.addColorStop(1, 'rgba(112,88,58,0.85)');
  ctx.fillStyle = pod;
  ctx.fillRect(-200, 396, GAME_W + 400, 90);
  ctx.fillStyle = 'rgba(196,164,116,0.7)';
  ctx.fillRect(-200, 392, GAME_W + 400, 9);
  ctx.strokeStyle = 'rgba(84,64,42,0.35)';
  ctx.lineWidth   = 1;
  for (let y = 416; y < 486; y += 22) {
    ctx.beginPath(); ctx.moveTo(-200, y); ctx.lineTo(GAME_W + 200, y); ctx.stroke();
  }
  for (let x = -190; x < GAME_W + 200; x += 46) {
    const off = ((x / 46) | 0) % 2 ? 11 : 0;
    for (let y = 416; y < 486; y += 22) {
      ctx.beginPath(); ctx.moveTo(x + off, y); ctx.lineTo(x + off, y + 22); ctx.stroke();
    }
  }
  const shade = ctx.createLinearGradient(0, 240, 0, 486);
  shade.addColorStop(0, 'rgba(38,22,8,0)');
  shade.addColorStop(1, 'rgba(38,22,8,0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(-200, 240, GAME_W + 400, 246);

  // ── Hanging banners ───────────────────────────────────────────────────────
  for (const b of bg.banners) {
    const sw = Math.sin(f * 0.018 + b.phase) * 4;
    ctx.fillStyle = b.col;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(b.x - b.w * 0.5, 150);
    ctx.lineTo(b.x + b.w * 0.5, 150);
    ctx.lineTo(b.x + b.w * 0.5 + sw, 150 + b.h);
    ctx.lineTo(b.x + sw,            150 + b.h + 11);
    ctx.lineTo(b.x - b.w * 0.5 + sw, 150 + b.h);
    ctx.closePath();
    ctx.fill();
    // Emblem
    ctx.globalAlpha = 0.35;
    ctx.fillStyle   = '#e8d8a8';
    ctx.beginPath();
    ctx.arc(b.x + sw * 0.5, 150 + b.h * 0.42, b.w * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // ── Raked sand on the arena floor ─────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#8a6438';
  ctx.lineWidth   = 2;
  for (const rk of bg.rakes) {
    ctx.globalAlpha = rk.a;
    ctx.beginPath();
    ctx.moveTo(rk.x, rk.y);
    ctx.quadraticCurveTo(rk.x + rk.w * 0.5, rk.y - 5, rk.x + rk.w, rk.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#6a3018';
  for (const st of bg.stains) {
    ctx.globalAlpha = st.a;
    ctx.beginPath();
    ctx.ellipse(st.x, st.y, st.r, st.r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.restore();
}

// ── Neon District ─────────────────────────────────────────────────────────
// Was a flat 45px grid and six neon strokeRects. Rebuilt as a rain-soaked
// street under a cyberpunk skyline: three parallax bands of towers with lit
// window grids, holographic billboards running scanlines, vertical sign
// strips, traffic streaking between the buildings, rain, and neon smeared
// across the wet floor.
function _cyberBg() {
  if (_cyberBg._c) return _cyberBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const NEON = ['#ff0066', '#00eeff', '#ff00ff', '#00ffaa', '#ffaa00', '#7d5bff'];
  const band = (n, par, hMin, hMax, wMin, wMax, fill, winA) => ({
    par, fill, winA,
    towers: Array.from({ length: n }, (_, i) => {
      const w = rnd(wMin, wMax);
      return {
        x: -60 + i * (1060 / n) + rnd(-14, 14),
        w,
        h: rnd(hMin, hMax),
        // Window grid: a fixed lit/dark mask so the lights don't strobe
        mask: Array.from({ length: 260 }, () => Math.random() < 0.42),
        crown: Math.random() < 0.45 ? NEON[Math.floor(Math.random() * NEON.length)] : null,
        mast:  Math.random() < 0.4 ? rnd(18, 56) : 0,
        blink: rnd(0, 6.28),
      };
    }),
  });
  const c = {
    NEON,
    bands: [
      band(11, 0.03, 200, 360, 46, 86, 'rgba(10,16,34,0.95)', 0.16),
      band(8,  0.07, 240, 420, 58, 104, 'rgba(7,11,26,0.97)', 0.26),
      band(6,  0.13, 170, 330, 74, 128, 'rgba(4,7,18,1)',     0.38),
    ],
    // Holographic billboards on the mid band
    boards: [
      { x: 120, y: 150, w: 92,  h: 128, col: '#ff2d78', rows: 7 },
      { x: 452, y: 118, w: 118, h: 92,  col: '#00e5ff', rows: 5 },
      { x: 742, y: 168, w: 84,  h: 116, col: '#b26bff', rows: 6 },
    ].map(b => ({ ...b, glyphs: Array.from({ length: b.rows * 6 }, () => Math.random() < 0.55) })),
    // Vertical sign strips hanging off building faces
    signs: Array.from({ length: 9 }, () => ({
      x: rnd(20, 880), y: rnd(150, 330), h: rnd(50, 130), w: rnd(6, 12),
      col: NEON[Math.floor(Math.random() * NEON.length)],
      blink: rnd(0.02, 0.09), phase: rnd(0, 6.28),
    })),
    // Traffic lanes: craft crossing at fixed altitudes
    traffic: Array.from({ length: 7 }, () => ({
      y: rnd(90, 300), spd: rnd(0.7, 2.2) * (Math.random() < 0.5 ? 1 : -1),
      off: rnd(0, 1400), len: rnd(14, 34),
      col: Math.random() < 0.5 ? '#ff3b30' : '#e8f6ff',
    })),
    rain: Array.from({ length: 120 }, () => ({
      x: rnd(-100, 1000), y: rnd(0, 520), len: rnd(10, 30),
      spd: rnd(7, 15), a: rnd(0.06, 0.22),
    })),
    // Neon smears in the wet floor, one per sign colour
    pools: Array.from({ length: 8 }, () => ({
      x: rnd(0, 900), w: rnd(30, 90),
      col: NEON[Math.floor(Math.random() * NEON.length)],
      phase: rnd(0, 6.28),
    })),
  };
  _cyberBg._c = c;
  return c;
}

function drawCyberpunkArena() {
  const bg = _cyberBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const floorY = 480;

  ctx.save();

  // ── Smog glow above the city ─────────────────────────────────────────────
  const smog = ctx.createLinearGradient(0, 90, 0, floorY);
  smog.addColorStop(0,   'rgba(20,0,44,0)');
  smog.addColorStop(0.55, 'rgba(58,0,86,0.30)');
  smog.addColorStop(1,   'rgba(120,10,120,0.22)');
  ctx.fillStyle = smog;
  ctx.fillRect(-200, 90, GAME_W + 400, floorY - 90);

  // ── Tower bands, far to near ─────────────────────────────────────────────
  for (const bd of bg.bands) {
    ctx.save();
    ctx.translate(-camOff * bd.par, 0);
    for (const tw of bd.towers) {
      const top = floorY - tw.h;
      ctx.fillStyle = bd.fill;
      ctx.fillRect(tw.x, top, tw.w, tw.h);
      // Window grid — a static lit/dark mask, so nothing strobes
      const cols = Math.max(2, Math.floor(tw.w / 11));
      const rows = Math.max(3, Math.floor(tw.h / 15));
      for (let r = 0; r < rows; r++) {
        for (let cN = 0; cN < cols; cN++) {
          if (!tw.mask[(r * cols + cN) % tw.mask.length]) continue;
          ctx.fillStyle = `rgba(180,236,255,${bd.winA})`;
          ctx.fillRect(tw.x + 4 + cN * 11, top + 6 + r * 15, 5, 7);
        }
      }
      // Neon crown along the parapet
      if (tw.crown) {
        ctx.strokeStyle = tw.crown;
        ctx.shadowColor = tw.crown;
        ctx.shadowBlur  = 10;
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.moveTo(tw.x, top); ctx.lineTo(tw.x + tw.w, top); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // Antenna with a red aircraft-warning lamp
      if (tw.mast) {
        ctx.strokeStyle = 'rgba(40,52,80,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tw.x + tw.w * 0.5, top);
        ctx.lineTo(tw.x + tw.w * 0.5, top - tw.mast);
        ctx.stroke();
        const blip = 0.3 + Math.abs(Math.sin(f * 0.05 + tw.blink)) * 0.7;
        ctx.fillStyle = `rgba(255,60,50,${blip})`;
        ctx.shadowColor = '#ff3c32'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(tw.x + tw.w * 0.5, top - tw.mast, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  // ── Holographic billboards ───────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.09, 0);
  for (const b of bg.boards) {
    // Panel
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = b.col;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = b.col;
    ctx.shadowColor = b.col;
    ctx.shadowBlur  = 12;
    ctx.lineWidth   = 1.6;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
    // Glyph block — reads as advertising copy without being any real language
    const gw = b.w / 6, gh = b.h / b.rows;
    for (let r = 0; r < b.rows; r++) {
      for (let cN = 0; cN < 6; cN++) {
        if (!b.glyphs[r * 6 + cN]) continue;
        ctx.globalAlpha = 0.30 + 0.25 * Math.abs(Math.sin(f * 0.03 + r + cN));
        ctx.fillStyle = b.col;
        ctx.fillRect(b.x + cN * gw + 2, b.y + r * gh + 2, gw - 4, gh - 5);
      }
    }
    ctx.globalAlpha = 1;
    // Scanline sweeping down the panel
    const scan = b.y + ((f * 1.6 + b.x) % (b.h + 40)) - 20;
    if (scan > b.y && scan < b.y + b.h) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(b.x, scan, b.w, 3);
    }
    // Static interlace
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = b.y; y < b.y + b.h; y += 4) ctx.fillRect(b.x, y, b.w, 1);
  }
  ctx.restore();

  // ── Vertical sign strips ─────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.11, 0);
  for (const sg of bg.signs) {
    const on = Math.sin(f * sg.blink + sg.phase) > -0.75;   // occasional dropout
    const a  = on ? 0.55 + Math.abs(Math.sin(f * 0.06 + sg.phase)) * 0.45 : 0.08;
    ctx.globalAlpha = a;
    ctx.fillStyle   = sg.col;
    ctx.shadowColor = sg.col;
    ctx.shadowBlur  = 14;
    ctx.fillRect(sg.x, sg.y, sg.w, sg.h);
    ctx.shadowBlur  = 0;
    // Dark segment breaks so it reads as stacked characters
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = 'rgba(2,4,12,0.85)';
    for (let y = sg.y + 6; y < sg.y + sg.h; y += 13) ctx.fillRect(sg.x, y, sg.w, 3);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Traffic streaking between the towers ─────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const tr of bg.traffic) {
    const span = 1300;
    const raw  = ((f * Math.abs(tr.spd) + tr.off) % span + span) % span;
    const x    = tr.spd > 0 ? raw - 200 : GAME_W + 200 - raw;
    const dir  = tr.spd > 0 ? 1 : -1;
    const g = ctx.createLinearGradient(x - dir * tr.len, tr.y, x, tr.y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, tr.col);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - dir * tr.len, tr.y); ctx.lineTo(x, tr.y); ctx.stroke();
    ctx.fillStyle = tr.col;
    ctx.beginPath(); ctx.arc(x, tr.y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // ── Wet floor: neon smeared into vertical reflections ───────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const pl of bg.pools) {
    const wob = Math.sin(f * 0.03 + pl.phase) * 3;
    // Upward from the floor line: the floor platform is opaque and drawn after
    // the background, so anything below floorY is simply never seen.
    const g = ctx.createLinearGradient(0, floorY, 0, floorY - 54);
    g.addColorStop(0, pl.col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.20 + Math.sin(f * 0.04 + pl.phase) * 0.07;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pl.x - pl.w * 0.5 + wob, floorY);
    ctx.lineTo(pl.x + pl.w * 0.5 + wob, floorY);
    ctx.lineTo(pl.x + pl.w * 0.30 - wob, floorY - 54);
    ctx.lineTo(pl.x - pl.w * 0.30 - wob, floorY - 54);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // ── Rain ─────────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#9fd8ff';
  ctx.lineWidth = 1;
  for (const r of bg.rain) {
    const ry = ((r.y + f * r.spd) % 600 + 600) % 600 - 40;
    const rx = ((r.x - f * r.spd * 0.28) % 1100 + 1100) % 1100 - 100;
    ctx.globalAlpha = r.a;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - r.len * 0.28, ry + r.len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── Zap visual from perk state (gameplay — kept) ─────────────────────────
  if (mapPerkState.zapActive) {
    const pulse = 0.4 + Math.abs(Math.sin(f * 0.35)) * 0.6;
    ctx.globalAlpha = pulse * 0.7;
    ctx.strokeStyle = '#00eeff';
    ctx.shadowColor = '#00eeff';
    ctx.shadowBlur  = 20;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(mapPerkState.zapLine, 460);
    ctx.lineTo(mapPerkState.zapLine, 490);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = pulse * 0.4;
    ctx.beginPath();
    let zx = mapPerkState.zapLine, zy = 460;
    ctx.moveTo(zx, zy);
    for (let s = 0; s < 5; s++) {
      zx += (Math.random() - 0.5) * 24;
      zy  = 460 + (s / 5) * 30;
      ctx.lineTo(zx, zy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ── Haunted Cathedral ─────────────────────────────────────────────────────
// Was five rectangles with a yellow fill for "windows" plus four fog ellipses.
// Rebuilt as a ruined churchyard: a broken cathedral facade with tracery in the
// windows and a rose window, dead trees clawing at a clouded moon, gravestones,
// bats crossing, layered ground fog and drifting will-o'-wisps.
function _hauntBg() {
  if (_hauntBg._c) return _hauntBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const c = {
    windows: [70, 232, 450, 668, 830].map((x, i) => ({
      x, y: 150 + (i % 2) * 34, w: 34, h: 96,
      phase: rnd(0, 6.28), spd: rnd(0.018, 0.034),
      lit:   Math.random() < 0.8,
    })),
    // Dead trees, two depth bands
    trees: Array.from({ length: 7 }, (_, i) => ({
      x:    -30 + i * 150 + rnd(-40, 40),
      h:    rnd(120, 250),
      w:    rnd(6, 13),
      par:  i % 2 ? 0.13 : 0.07,
      lean: rnd(-0.1, 0.1),
      phase: rnd(0, 6.28),
      // Bare branches: angle, length, and a fork on each
      limbs: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, () => ({
        y: rnd(0.25, 0.9), dir: Math.random() < 0.5 ? -1 : 1,
        len: rnd(22, 62), rise: rnd(-26, -6), fork: rnd(0.4, 0.8),
      })),
    })),
    graves: Array.from({ length: 13 }, (_, i) => ({
      x: 12 + i * 70 + rnd(-20, 20),
      w: rnd(14, 26), h: rnd(20, 40),
      kind: Math.random() < 0.3 ? 1 : 0,          // 1 = cross
      tilt: rnd(-0.14, 0.14),
    })),
    bats: Array.from({ length: 7 }, () => ({
      x: rnd(-100, 900), y: rnd(50, 240), rx: rnd(120, 320), ry: rnd(18, 60),
      spd: rnd(0.004, 0.010), phase: rnd(0, 6.28), s: rnd(0.7, 1.5),
      flap: rnd(0.22, 0.42),
    })),
    wisps: Array.from({ length: 8 }, () => ({
      x: rnd(-20, 920), y: rnd(240, 460), rx: rnd(20, 70), ry: rnd(10, 40),
      spd: rnd(0.005, 0.013), phase: rnd(0, 6.28),
      col: ['150,230,190', '190,150,255', '120,200,255'][Math.floor(Math.random() * 3)],
    })),
    fog: Array.from({ length: 7 }, (_, i) => ({
      y: 400 + i * 16, rx: rnd(120, 260), ry: rnd(14, 30),
      spd: rnd(0.10, 0.32) * (i % 2 ? 1 : -1), off: rnd(0, 900), a: rnd(0.05, 0.12),
    })),
  };
  _hauntBg._c = c;
  return c;
}

function drawHauntedArena() {
  const bg = _hauntBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const groundY = 480;

  ctx.save();

  // ── Moon behind ragged cloud ─────────────────────────────────────────────
  const moonX = 742, moonY = 78;
  const mg = ctx.createRadialGradient(moonX, moonY, 6, moonX, moonY, 150);
  mg.addColorStop(0,    'rgba(196,206,240,0.34)');
  mg.addColorStop(0.28, 'rgba(150,160,210,0.12)');
  mg.addColorStop(1,    'rgba(120,130,190,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(moonX - 160, moonY - 160, 320, 320);
  ctx.fillStyle = '#d6dcf2';
  ctx.beginPath(); ctx.arc(moonX, moonY, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,158,196,0.5)';                 // maria
  ctx.beginPath(); ctx.arc(moonX - 9, moonY - 7, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + 8, moonY + 6, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(moonX + 2, moonY - 14, 3.5, 0, Math.PI * 2); ctx.fill();
  // Cloud bands sliding across it
  for (let i = 0; i < 3; i++) {
    const cx2 = ((f * (0.12 + i * 0.05) + i * 420) % 1500) - 300;
    ctx.fillStyle = `rgba(24,18,36,${0.5 - i * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(cx2, moonY - 6 + i * 22, 190, 15 + i * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Cathedral facade ─────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.05, 0);
  ctx.fillStyle = 'rgba(18,12,26,0.88)';
  // Broken roofline
  ctx.beginPath();
  ctx.moveTo(-200, groundY);
  ctx.lineTo(-200, 128);
  const roof = [[-40, 120], [60, 104], [130, 128], [220, 96], [300, 116],
                [400, 62], [500, 112], [590, 92], [680, 124], [780, 100], [880, 126], [1100, 118]];
  for (const [rx, ry] of roof) ctx.lineTo(rx, ry);
  ctx.lineTo(1100, groundY);
  ctx.closePath();
  ctx.fill();
  // Buttresses
  ctx.fillStyle = 'rgba(30,20,44,0.85)';
  for (const bx of [10, 165, 385, 605, 765, 890]) {
    ctx.beginPath();
    ctx.moveTo(bx - 11, groundY);
    ctx.lineTo(bx - 7, 150);
    ctx.lineTo(bx + 7, 150);
    ctx.lineTo(bx + 11, groundY);
    ctx.closePath();
    ctx.fill();
  }
  // Gothic windows with tracery
  for (const w of bg.windows) {
    const glow = w.lit ? 0.35 + Math.abs(Math.sin(f * w.spd + w.phase)) * 0.55 : 0.06;
    // Reveal
    ctx.fillStyle = 'rgba(10,6,16,0.95)';
    ctx.beginPath();
    ctx.moveTo(w.x - w.w * 0.5 - 4, w.y + w.h);
    ctx.lineTo(w.x - w.w * 0.5 - 4, w.y);
    ctx.quadraticCurveTo(w.x, w.y - w.w * 0.9, w.x + w.w * 0.5 + 4, w.y);
    ctx.lineTo(w.x + w.w * 0.5 + 4, w.y + w.h);
    ctx.closePath();
    ctx.fill();
    // Candlelight inside
    const wg = ctx.createLinearGradient(w.x, w.y + w.h, w.x, w.y - w.w);
    wg.addColorStop(0, `rgba(255,168,60,${glow})`);
    wg.addColorStop(1, `rgba(255,220,140,${glow * 0.5})`);
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(w.x - w.w * 0.5, w.y + w.h);
    ctx.lineTo(w.x - w.w * 0.5, w.y);
    ctx.quadraticCurveTo(w.x, w.y - w.w * 0.8, w.x + w.w * 0.5, w.y);
    ctx.lineTo(w.x + w.w * 0.5, w.y + w.h);
    ctx.closePath();
    ctx.fill();
    // Mullions — the detail that makes it a window and not a lit slot
    ctx.strokeStyle = 'rgba(14,8,20,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w.x, w.y - w.w * 0.5); ctx.lineTo(w.x, w.y + w.h); ctx.stroke();
    for (let k = 1; k <= 3; k++) {
      const yy = w.y + (w.h * k) / 4;
      ctx.beginPath(); ctx.moveTo(w.x - w.w * 0.5, yy); ctx.lineTo(w.x + w.w * 0.5, yy); ctx.stroke();
    }
    // Spill onto the stone
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(w.x, w.y + w.h * 0.4, 2, w.x, w.y + w.h * 0.4, 78);
    sg.addColorStop(0, `rgba(255,150,50,${glow * 0.28})`);
    sg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(w.x - 80, w.y - 40, 160, 200);
    ctx.restore();
  }
  // Rose window over the nave
  const roseGlow = 0.4 + Math.abs(Math.sin(f * 0.02)) * 0.4;
  ctx.fillStyle = `rgba(150,60,180,${roseGlow * 0.5})`;
  ctx.beginPath(); ctx.arc(400, 116, 30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(12,6,18,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(400, 116, 30, 0, Math.PI * 2); ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(400, 116);
    ctx.lineTo(400 + Math.cos(a) * 30, 116 + Math.sin(a) * 30);
    ctx.stroke();
  }
  ctx.restore();

  // ── Dead trees ───────────────────────────────────────────────────────────
  for (const tr of bg.trees) {
    ctx.save();
    ctx.translate(-camOff * tr.par, 0);
    const sway = Math.sin(f * 0.006 + tr.phase) * 3;
    const topX = tr.x + tr.lean * tr.h + sway;
    ctx.strokeStyle = 'rgba(38,28,52,0.95)';
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tr.w;
    ctx.beginPath();
    ctx.moveTo(tr.x, groundY + 6);
    ctx.quadraticCurveTo(tr.x + sway * 0.5, groundY - tr.h * 0.55, topX, groundY - tr.h);
    ctx.stroke();
    for (const lm of tr.limbs) {
      const ly2 = groundY - tr.h * lm.y;
      const lx2 = tr.x + (topX - tr.x) * lm.y;
      ctx.lineWidth = Math.max(1.4, tr.w * 0.42 * (1 - lm.y * 0.4));
      const ex = lx2 + lm.dir * lm.len, ey = ly2 + lm.rise;
      ctx.beginPath();
      ctx.moveTo(lx2, ly2);
      ctx.quadraticCurveTo(lx2 + lm.dir * lm.len * 0.6, ly2 + lm.rise * 0.3, ex, ey);
      ctx.stroke();
      // Fork at the tip — bare branches need to split or they read as spikes
      ctx.lineWidth = Math.max(1, tr.w * 0.24);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + lm.dir * lm.len * 0.3, ey - lm.len * lm.fork * 0.4);
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + lm.dir * lm.len * 0.36, ey + lm.len * 0.14);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // ── Gravestones ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.16, 0);
  for (const g of bg.graves) {
    ctx.save();
    ctx.translate(g.x, groundY + 4);
    ctx.rotate(g.tilt);
    ctx.fillStyle = 'rgba(46,40,58,0.85)';
    if (g.kind === 1) {
      ctx.fillRect(-3, -g.h, 6, g.h);
      ctx.fillRect(-g.w * 0.42, -g.h * 0.78, g.w * 0.84, 5);
    } else {
      ctx.beginPath();
      ctx.moveTo(-g.w * 0.5, 0);
      ctx.lineTo(-g.w * 0.5, -g.h * 0.72);
      ctx.quadraticCurveTo(0, -g.h * 1.05, g.w * 0.5, -g.h * 0.72);
      ctx.lineTo(g.w * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(76,68,92,0.5)';   // moonlit edge
      ctx.fillRect(-g.w * 0.5, -g.h * 0.72, 3, g.h * 0.72);
    }
    ctx.restore();
  }
  ctx.restore();

  // ── Bats ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(10,6,16,0.85)';
  for (const b of bg.bats) {
    const a2 = f * b.spd + b.phase;
    const bx = b.x + Math.cos(a2) * b.rx;
    const by = b.y + Math.sin(a2 * 1.6) * b.ry;
    const fl = Math.sin(f * b.flap + b.phase);          // wing beat
    const s  = b.s;
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(Math.cos(a2) < 0 ? -s : s, s);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, -4 - fl * 5, -13, -1 - fl * 3);
    ctx.quadraticCurveTo(-8, 1, -5, 3);
    ctx.lineTo(0, 1);
    ctx.quadraticCurveTo(5, 1, 8, 3);
    ctx.quadraticCurveTo(11, 1, 13, -1 - fl * 3);
    ctx.quadraticCurveTo(5, -4 - fl * 5, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, -1, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Ground fog, in layered banks ─────────────────────────────────────────
  for (const fg of bg.fog) {
    const fx = (((fg.off + f * fg.spd) % 1300) + 1300) % 1300 - 200;
    const fy = fg.y + Math.sin(f * 0.01 + fg.off) * 4;
    // Squash the SPACE, not the path: a flat fill in a squashed ellipse leaves a
    // visible hard rim where a fog bank should have none.
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(1, fg.ry / fg.rx);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, fg.rx);
    g.addColorStop(0, `rgba(185,168,216,${fg.a})`);
    g.addColorStop(1, 'rgba(185,168,216,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-fg.rx, -fg.rx, fg.rx * 2, fg.rx * 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // ── Will-o'-wisps ────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const w of bg.wisps) {
    const a2 = f * w.spd + w.phase;
    const wx = w.x + Math.cos(a2) * w.rx;
    const wy = w.y + Math.sin(a2 * 1.9) * w.ry;
    const al = 0.35 + Math.sin(f * 0.05 + w.phase) * 0.35;
    const g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 16);
    g.addColorStop(0, `rgba(${w.col},${Math.max(0, al)})`);
    g.addColorStop(0.3, `rgba(${w.col},${Math.max(0, al) * 0.3})`);
    g.addColorStop(1, `rgba(${w.col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(wx, wy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(240,255,250,${Math.max(0, al)})`;
    ctx.beginPath(); ctx.arc(wx, wy, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // ── Ghost sprites from perk state (gameplay — kept) ──────────────────────
  if (mapPerkState.ghosts) {
    for (const gh of mapPerkState.ghosts) {
      const ga = 0.35 + Math.sin(f * 0.08 + gh.x * 0.02) * 0.2;
      ctx.globalAlpha = Math.max(0, ga);
      ctx.fillStyle   = '#ddc8ff';
      ctx.shadowColor = '#aa66ff';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(gh.x, gh.y - 10, 14, Math.PI, 0);
      ctx.lineTo(gh.x + 14, gh.y + 12);
      ctx.quadraticCurveTo(gh.x + 7,  gh.y + 6,  gh.x,     gh.y + 12);
      ctx.quadraticCurveTo(gh.x - 7,  gh.y + 6,  gh.x - 14, gh.y + 12);
      ctx.closePath();
      ctx.fill();
      // Hollow eyes so it reads as a ghost rather than a blob
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(40,10,60,0.8)';
      ctx.beginPath(); ctx.arc(gh.x - 5, gh.y - 12, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gh.x + 5, gh.y - 12, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Skyward ───────────────────────────────────────────────────────────────
// Was five three-circle puffs and a flat golden wash. Rebuilt as a proper sky:
// a low sun with rays, three parallax depths of cumulus banks that are lit on
// top and shadowed underneath, mountain peaks breaking through the cloud sea,
// birds in formation, and wind streaks.
function _cloudsBg() {
  if (_cloudsBg._c) return _cloudsBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  // A cumulus is a cluster of lobes; storing the lobes lets it be lit from
  // above and shaded below instead of being one flat blob.
  const puff = (scale) => ({
    lobes: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, (_, i) => ({
      dx: rnd(-1, 1) * 46 * scale,
      dy: rnd(-0.5, 0.35) * 20 * scale,
      r:  rnd(16, 34) * scale,
      i,
    })),
    w: 100 * scale,
  });
  const band = (n, par, y0, y1, scale, alpha, spd) => ({
    par, alpha, spd,
    clouds: Array.from({ length: n }, (_, i) => ({
      ...puff(scale * rnd(0.75, 1.3)),
      x: -80 + i * (1160 / n) + rnd(-40, 40),
      y: rnd(y0, y1),
      off: rnd(0, 1000),
    })),
  });
  _cloudsBg._c = {
    bands: [
      band(7, 0.03, 150, 240, 0.55, 0.45, 0.05),
      band(6, 0.07, 70,  185, 0.9,  0.7,  0.09),
      band(5, 0.13, 30,  130, 1.35, 0.95, 0.15),
    ],
    // Peaks poking through the cloud sea
    peaks: Array.from({ length: 6 }, (_, i) => ({
      x: -40 + i * 190 + rnd(-40, 40),
      w: rnd(120, 240),
      h: rnd(50, 130),
    })),
    // Bird flocks in V formation
    flocks: Array.from({ length: 3 }, () => ({
      y: rnd(120, 300), spd: rnd(0.35, 0.8) * (Math.random() < 0.5 ? 1 : -1),
      off: rnd(0, 1400), n: 5 + Math.floor(Math.random() * 4), s: rnd(0.7, 1.3),
      flap: rnd(0.12, 0.24),
    })),
    streaks: Array.from({ length: 9 }, () => ({
      y: rnd(60, 420), len: rnd(70, 220), spd: rnd(0.5, 1.6),
      off: rnd(0, 1200), a: rnd(0.05, 0.14),
    })),
  };
  return _cloudsBg._c;
}

function drawCloudsArena() {
  const bg = _cloudsBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);

  ctx.save();

  // ── Low sun and its rays ─────────────────────────────────────────────────
  const sunX = 726, sunY = 118;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 230);
  sg.addColorStop(0,    'rgba(255,250,225,0.9)');
  sg.addColorStop(0.16, 'rgba(255,226,150,0.35)');
  sg.addColorStop(1,    'rgba(255,200,110,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 240, sunY - 240, 480, 480);
  // Radial shafts
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + f * 0.0012;
    const len = 210 + Math.sin(f * 0.02 + i) * 40;
    const g = ctx.createLinearGradient(sunX, sunY, sunX + Math.cos(a) * len, sunY + Math.sin(a) * len);
    g.addColorStop(0, 'rgba(255,238,180,0.16)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + Math.cos(a - 0.05) * len, sunY + Math.sin(a - 0.05) * len);
    ctx.lineTo(sunX + Math.cos(a + 0.05) * len, sunY + Math.sin(a + 0.05) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,252,238,0.95)';
  ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();

  // ── Warm haze toward the horizon ─────────────────────────────────────────
  const haze = ctx.createLinearGradient(0, 200, 0, GAME_H);
  haze.addColorStop(0, 'rgba(255,220,140,0)');
  haze.addColorStop(1, 'rgba(255,198,110,0.26)');
  ctx.fillStyle = haze;
  ctx.fillRect(-200, 200, GAME_W + 400, GAME_H - 160);

  // ── Peaks breaking the cloud sea ─────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.05, 0);
  for (const p of bg.peaks) {
    const base = 448;
    ctx.fillStyle = 'rgba(150,168,206,0.5)';
    ctx.beginPath();
    ctx.moveTo(p.x, base);
    ctx.lineTo(p.x + p.w * 0.42, base - p.h);
    ctx.lineTo(p.x + p.w, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.62)';       // snow cap
    ctx.beginPath();
    ctx.moveTo(p.x + p.w * 0.42, base - p.h);
    ctx.lineTo(p.x + p.w * 0.26, base - p.h * 0.7);
    ctx.lineTo(p.x + p.w * 0.36, base - p.h * 0.72);
    ctx.lineTo(p.x + p.w * 0.48, base - p.h * 0.62);
    ctx.lineTo(p.x + p.w * 0.58, base - p.h * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── Wind streaks ─────────────────────────────────────────────────────────
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (const st of bg.streaks) {
    const x = (((st.off + f * st.spd) % 1300) + 1300) % 1300 - 200;
    ctx.globalAlpha = st.a;
    ctx.beginPath();
    ctx.moveTo(x, st.y);
    ctx.quadraticCurveTo(x + st.len * 0.5, st.y - 6, x + st.len, st.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── Cumulus banks, far to near ───────────────────────────────────────────
  for (const bd of bg.bands) {
    ctx.save();
    ctx.translate(-camOff * bd.par, 0);
    for (const cl of bd.clouds) {
      const cx2 = (((cl.x + cl.off + f * bd.spd) % 1240) + 1240) % 1240 - 170;
      const bob = Math.sin(f * 0.006 + cl.off) * 3;
      // Shadowed underside first
      ctx.globalAlpha = bd.alpha * 0.55;
      ctx.fillStyle = '#b9c9e6';
      for (const lo of cl.lobes) {
        ctx.beginPath();
        ctx.arc(cx2 + lo.dx, cl.y + lo.dy + bob + lo.r * 0.30, lo.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Body
      ctx.globalAlpha = bd.alpha;
      ctx.fillStyle = '#eef4ff';
      for (const lo of cl.lobes) {
        ctx.beginPath();
        ctx.arc(cx2 + lo.dx, cl.y + lo.dy + bob, lo.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Sunlit crown — a small cap high on each lobe. A large offset disc read
      // as a cream ring on the far band's little puffs.
      ctx.globalAlpha = bd.alpha * 0.6;
      ctx.fillStyle = '#fff6df';
      for (const lo of cl.lobes) {
        ctx.beginPath();
        ctx.arc(cx2 + lo.dx + lo.r * 0.10, cl.y + lo.dy + bob - lo.r * 0.34, lo.r * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Birds ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(32,44,72,0.7)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const fl of bg.flocks) {
    const span = 1500;
    const raw  = ((f * Math.abs(fl.spd) + fl.off) % span + span) % span;
    const lead = fl.spd > 0 ? raw - 250 : GAME_W + 250 - raw;
    for (let i = 0; i < fl.n; i++) {
      const side = i % 2 ? 1 : -1;
      const rank = Math.floor(i / 2) + (i === 0 ? 0 : 1);
      const bx = lead - (fl.spd > 0 ? 1 : -1) * rank * 16 * fl.s;
      const by = fl.y + side * rank * 9 * fl.s * (i === 0 ? 0 : 1);
      const w  = Math.sin(f * fl.flap + i * 0.7);
      const s  = fl.s * 7;
      ctx.beginPath();
      ctx.moveTo(bx - s, by + w * s * 0.5);
      ctx.quadraticCurveTo(bx - s * 0.4, by - w * s * 0.4, bx, by);
      ctx.quadraticCurveTo(bx + s * 0.4, by - w * s * 0.4, bx + s, by + w * s * 0.5);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';

  ctx.restore();
}

// ── Neon Grid ─────────────────────────────────────────────────────────────
// Was a flat 50px screen-space grid. A grid only reads as a floor if it has
// perspective, so this rebuilds it as a synthwave plane: lines converging on a
// vanishing point, horizontal rungs spaced by depth and scrolling toward the
// camera, a banded sun on the horizon, wireframe ridges, and a starfield.
function _neonBg() {
  if (_neonBg._c) return _neonBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  _neonBg._c = {
    stars: Array.from({ length: 90 }, () => ({
      x: rnd(-20, 920), y: rnd(0, 300), r: rnd(0.4, 1.6),
      phase: rnd(0, 6.28), spd: rnd(0.01, 0.05),
    })),
    // Wireframe ridges either side of the sun
    ridges: [0, 1].map(i => ({
      par: 0.04 + i * 0.05,
      y:   306 - i * 8,
      amp: 46 - i * 16,
      seed: 2.3 + i * 3.1,
      a:   0.35 - i * 0.12,
    })),
    streams: Array.from({ length: 12 }, () => ({
      x: rnd(-20, 920), y: rnd(0, 520), h: rnd(6, 18), spd: rnd(1.2, 3.4),
      col: Math.random() < 0.5 ? '#00ff44' : '#66ffcc', a: rnd(0.12, 0.32),
    })),
  };
  return _neonBg._c;
}

function drawNeonGridArena() {
  const bg = _neonBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const horizon = 306;                 // where the grid plane vanishes
  const vpX = 450;                     // vanishing point
  const pulse = 0.55 + Math.abs(Math.sin(f * 0.03)) * 0.45;

  ctx.save();

  // ── Starfield above the horizon ──────────────────────────────────────────
  for (const st of bg.stars) {
    ctx.globalAlpha = 0.2 + Math.abs(Math.sin(f * st.spd + st.phase)) * 0.6;
    ctx.fillStyle = '#9dffc4';
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Banded sun sitting on the horizon ────────────────────────────────────
  const sunR = 96;
  ctx.save();
  ctx.beginPath();
  ctx.arc(vpX, horizon - 4, sunR, Math.PI, 0);      // upper half only
  ctx.clip();
  const sg = ctx.createLinearGradient(0, horizon - sunR, 0, horizon);
  sg.addColorStop(0,   'rgba(180,255,210,0.85)');
  sg.addColorStop(0.5, 'rgba(0,255,110,0.55)');
  sg.addColorStop(1,   'rgba(0,150,60,0.25)');
  ctx.fillStyle = sg;
  ctx.fillRect(vpX - sunR, horizon - sunR, sunR * 2, sunR);
  // Horizontal cut bands, widening toward the bottom
  ctx.fillStyle = 'rgba(0,10,0,0.9)';
  let by = horizon - 6, gap = 4;
  for (let i = 0; i < 9; i++) {
    ctx.fillRect(vpX - sunR, by, sunR * 2, gap);
    by -= gap + 7 + i * 1.6;
    gap = Math.max(1.5, gap - 0.35);
  }
  ctx.restore();
  // Sun bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bl = ctx.createRadialGradient(vpX, horizon - 10, 8, vpX, horizon - 10, 220);
  bl.addColorStop(0, `rgba(0,255,110,${0.20 * pulse})`);
  bl.addColorStop(1, 'rgba(0,255,110,0)');
  ctx.fillStyle = bl;
  ctx.fillRect(vpX - 230, horizon - 240, 460, 300);
  ctx.restore();

  // ── Wireframe ridges on the horizon ──────────────────────────────────────
  for (const rg of bg.ridges) {
    ctx.save();
    ctx.translate(-camOff * rg.par, 0);
    ctx.strokeStyle = `rgba(0,255,68,${rg.a})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = -260; x <= GAME_W + 260; x += 22) {
      const y = rg.y - Math.abs(Math.sin(x * 0.006 + rg.seed)) * rg.amp
                     - Math.abs(Math.sin(x * 0.019 + rg.seed * 2)) * rg.amp * 0.35;
      if (x === -260) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Facet lines dropping to the horizon so it reads as wireframe terrain
    ctx.globalAlpha = 0.5;
    for (let x = -260; x <= GAME_W + 260; x += 44) {
      const y = rg.y - Math.abs(Math.sin(x * 0.006 + rg.seed)) * rg.amp
                     - Math.abs(Math.sin(x * 0.019 + rg.seed * 2)) * rg.amp * 0.35;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, rg.y + 6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Horizon glow bar ─────────────────────────────────────────────────────
  ctx.strokeStyle = `rgba(0,255,68,${0.55 * pulse})`;
  ctx.shadowColor = '#00ff44';
  ctx.shadowBlur  = 18;
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(-200, horizon); ctx.lineTo(GAME_W + 200, horizon); ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Perspective floor grid ───────────────────────────────────────────────
  // Rungs are placed by depth d in (0,1]; screen y = horizon + k/d puts them
  // closer together near the horizon and scrolling them by fract(t) makes the
  // plane appear to move under the player.
  ctx.save();
  ctx.strokeStyle = `rgba(0,255,68,${0.30 * pulse})`;
  ctx.lineWidth = 1;
  const planeH = GAME_H + 120 - horizon;
  const scroll = (f * 0.004) % 1;
  for (let i = 0; i < 22; i++) {
    const d = (i + scroll) / 22;              // 0 = at horizon, 1 = at the camera
    const y = horizon + planeH * (d * d);     // quadratic falloff ≈ perspective
    if (y < horizon || y > GAME_H + 120) continue;
    ctx.globalAlpha = Math.min(1, d * 2.2) * 0.45 * pulse;
    ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(GAME_W + 300, y); ctx.stroke();
  }
  ctx.globalAlpha = 0.30 * pulse;
  for (let i = -14; i <= 14; i++) {
    const spread = i * 96;
    ctx.beginPath();
    ctx.moveTo(vpX + spread * 0.06 - camOff * 0.02, horizon);
    ctx.lineTo(vpX + spread - camOff * 0.18, GAME_H + 120);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // ── Speed-boost pad indicators (gameplay — kept) ─────────────────────────
  if (MAP_PERK_DEFS.neonGrid && MAP_PERK_DEFS.neonGrid.boostPads) {
    ctx.save();
    for (const pad of MAP_PERK_DEFS.neonGrid.boostPads) {
      const a = 0.35 + Math.abs(Math.sin(f * 0.08 + pad.x * 0.01)) * 0.35;
      ctx.globalAlpha = a;
      ctx.fillStyle   = '#00ff44';
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur  = 10;
      ctx.fillRect(pad.x - 20, pad.y, 40, 8);
      // Chevrons so the pad reads as a direction, not just a lit bar
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = '#001a00';
      ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(pad.x + k * 11 - 4, pad.y + 1);
        ctx.lineTo(pad.x + k * 11 + 2, pad.y + 4);
        ctx.lineTo(pad.x + k * 11 - 4, pad.y + 7);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Data streams falling through the scene ───────────────────────────────
  for (const s of bg.streams) {
    const sy = ((s.y + f * s.spd) % 560 + 560) % 560 - 30;
    ctx.globalAlpha = s.a;
    const g = ctx.createLinearGradient(s.x, sy - s.h, s.x, sy + s.h);
    g.addColorStop(0, 'rgba(0,255,68,0)');
    g.addColorStop(0.5, s.col);
    g.addColorStop(1, 'rgba(0,255,68,0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x, sy - s.h, 2, s.h * 2);
  }
  ctx.globalAlpha = 1;

  // ── CRT scanlines over everything ────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 0; y < GAME_H; y += 3) ctx.fillRect(-200, y, GAME_W + 400, 1);

  ctx.restore();
}

// ── Bioluminescent Grove ──────────────────────────────────────────────────
// Was seven flat-shaded toadstools on a purple wash. Rebuilt as a glowing
// fungal forest: three parallax bands of caps whose gills actually emit light
// onto the ground, a mycelium web on the floor, drifting spore clouds, rising
// glow motes and a slow colour pulse through the whole grove.
function _mushBg() {
  if (_mushBg._c) return _mushBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PAL = [
    { cap: '#ff44cc', lit: '#ffb0f0', glow: '255,80,220' },
    { cap: '#ff8822', lit: '#ffd49a', glow: '255,150,60'  },
    { cap: '#44ffaa', lit: '#b8ffe0', glow: '80,255,190'  },
    { cap: '#8866ff', lit: '#cfc0ff', glow: '150,110,255' },
    { cap: '#ffcc00', lit: '#fff0a0', glow: '255,210,60'  },
    { cap: '#44ccff', lit: '#b8ecff', glow: '80,200,255'  },
  ];
  const band = (n, par, sMin, sMax, alpha) => ({
    par, alpha,
    caps: Array.from({ length: n }, (_, i) => {
      const s = rnd(sMin, sMax);
      return {
        x:      -60 + i * (1020 / n) + rnd(-40, 40),
        capR:   36 * s,
        stemH:  rnd(34, 78) * s,
        stemW:  rnd(11, 18) * s,
        lean:   rnd(-0.14, 0.14),
        pal:    PAL[Math.floor(Math.random() * PAL.length)],
        phase:  rnd(0, Math.PI * 2),
        spd:    rnd(0.010, 0.022),
        spots:  Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({ o: rnd(-0.72, 0.72), h: rnd(0.18, 0.62), r: rnd(0.07, 0.16) })),
        gills:  5 + Math.floor(Math.random() * 4),
      };
    }),
  });
  const c = {
    bands: [
      // Far band is deliberately over-scaled: at grove scale the whole cavern
      // was empty above the horizon, so these tall caps fill the upper screen.
      band(7, 0.04, 1.9, 3.1, 0.20),
      band(9, 0.07, 0.42, 0.8, 0.36),
      band(7, 0.13, 0.7, 1.05, 0.62),
      band(5, 0.20, 1.05, 1.55, 0.92),
    ],
    PAL,
    // Mycelium threads webbing across the floor
    myco: Array.from({ length: 16 }, () => ({
      x: rnd(-30, 900), y: 480 + rnd(0, 26), len: rnd(40, 130), curve: rnd(-14, 14),
      phase: rnd(0, 6.28), pal: PAL[Math.floor(Math.random() * PAL.length)],
    })),
    spores: Array.from({ length: 40 }, () => ({
      x: rnd(-30, 930), y: rnd(0, 520), r: rnd(1, 3.2), spd: rnd(0.10, 0.42),
      drift: rnd(0.006, 0.020), amp: rnd(10, 44), phase: rnd(0, 6.28),
      a: rnd(0.18, 0.55), pal: PAL[Math.floor(Math.random() * PAL.length)],
    })),
    // Fat, slow spore clouds
    clouds: Array.from({ length: 5 }, () => ({
      x: rnd(-40, 940), y: rnd(120, 400), rx: rnd(60, 140), ry: rnd(22, 52),
      spd: rnd(0.06, 0.18), phase: rnd(0, 6.28), pal: PAL[Math.floor(Math.random() * PAL.length)],
    })),
  };
  _mushBg._c = c;
  return c;
}

function drawMushroomArena() {
  const bg = _mushBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const groundY = 480;

  ctx.save();

  // ── Slow chromatic wash through the cavern air ────────────────────────────
  const wash = ctx.createRadialGradient(450, 250, 40, 450, 250, 560);
  wash.addColorStop(0, `rgba(170,80,255,${0.10 + Math.sin(f * 0.005) * 0.04})`);
  wash.addColorStop(1, 'rgba(120,40,180,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(-200, -100, GAME_W + 400, GAME_H + 200);

  // ── Drifting spore clouds, behind the caps ────────────────────────────────
  for (const cd of bg.clouds) {
    const cx = ((cd.x + f * cd.spd) % 1100 + 1100) % 1100 - 100;
    const cy = cd.y + Math.sin(f * 0.008 + cd.phase) * 14;
    // Filling a SQUASHED ellipse path with a circular gradient cuts the falloff
    // off early along y and leaves a hard rim; squash the space instead.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, cd.ry / cd.rx);
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, cd.rx);
    g.addColorStop(0, `rgba(${cd.pal.glow},0.13)`);
    g.addColorStop(1, `rgba(${cd.pal.glow},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-cd.rx, -cd.rx, cd.rx * 2, cd.rx * 2);
    ctx.restore();
  }

  // ── Mushroom bands, far to near ───────────────────────────────────────────
  for (const bnd of bg.bands) {
    ctx.save();
    ctx.translate(-camOff * bnd.par, 0);
    for (const m of bnd.caps) {
      const bob   = Math.sin(f * m.spd + m.phase) * 4;
      const pulse = 0.68 + Math.sin(f * m.spd * 1.6 + m.phase) * 0.32;
      const topY  = groundY - m.stemH + bob;
      const tipX  = m.x + m.lean * m.stemH;

      // Light this cap throws down onto the floor
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pool = ctx.createRadialGradient(m.x, groundY, 3, m.x, groundY, m.capR * 2.1);
      pool.addColorStop(0, `rgba(${m.pal.glow},${0.20 * pulse * bnd.alpha})`);
      pool.addColorStop(1, `rgba(${m.pal.glow},0)`);
      ctx.fillStyle = pool;
      ctx.fillRect(m.x - m.capR * 2.2, groundY - m.capR * 1.4, m.capR * 4.4, m.capR * 2.8);
      ctx.restore();

      ctx.globalAlpha = bnd.alpha;

      // Stem — tapered, graded so it reads round, with a flared base
      const sg = ctx.createLinearGradient(tipX - m.stemW, 0, tipX + m.stemW, 0);
      sg.addColorStop(0,    'rgba(150,132,150,0.85)');
      sg.addColorStop(0.35, 'rgba(238,224,232,0.9)');
      sg.addColorStop(1,    'rgba(140,120,146,0.85)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(m.x - m.stemW * 0.85, groundY + 4);
      ctx.quadraticCurveTo(m.x - m.stemW * 0.4, groundY - m.stemH * 0.5, tipX - m.stemW * 0.42, topY);
      ctx.lineTo(tipX + m.stemW * 0.42, topY);
      ctx.quadraticCurveTo(m.x + m.stemW * 0.4, groundY - m.stemH * 0.5, m.x + m.stemW * 0.85, groundY + 4);
      ctx.closePath();
      ctx.fill();

      // Gills glowing under the cap, drawn before the cap so it overlaps them
      ctx.save();
      // Clipped to the underside of the cap. Unclipped, the fan's outer spokes
      // ran past the rim and read as whiskers sticking out of the mushroom.
      ctx.beginPath();
      ctx.ellipse(tipX, topY, m.capR * 0.72, m.capR * 0.26, 0, 0, Math.PI);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${m.pal.glow},${0.6 * pulse})`;
      ctx.lineWidth   = Math.max(1, m.capR * 0.05);
      for (let k = 0; k < m.gills; k++) {
        const gx = tipX - m.capR * 0.6 + (k / (m.gills - 1)) * m.capR * 1.2;
        ctx.beginPath();
        ctx.moveTo(tipX, topY - 2);
        ctx.lineTo(gx, topY + m.capR * 0.24);
        ctx.stroke();
      }
      ctx.restore();

      // Cap — domed, lit from the crown
      const cg = ctx.createLinearGradient(tipX, topY - m.capR * 0.6, tipX, topY + m.capR * 0.1);
      cg.addColorStop(0, m.pal.lit);
      cg.addColorStop(1, m.pal.cap);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(tipX, topY, m.capR, m.capR * 0.62, 0, Math.PI, 0);
      ctx.fill();
      // Rim lip
      ctx.fillStyle = m.pal.cap;
      ctx.beginPath();
      ctx.ellipse(tipX, topY, m.capR, m.capR * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing spots
      for (const sp of m.spots) {
        const sx = tipX + sp.o * m.capR * 0.86;
        const sy = topY - Math.cos(sp.o * 1.4) * m.capR * sp.h * 0.62;
        ctx.globalAlpha = bnd.alpha * (0.5 + pulse * 0.5);
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, m.capR * sp.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = bnd.alpha * 0.35 * pulse;
        ctx.fillStyle   = `rgba(${m.pal.glow},1)`;
        ctx.beginPath(); ctx.arc(sx, sy, m.capR * sp.r * 2.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = bnd.alpha;
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Mycelium threads creeping across the floor ────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const my of bg.myco) {
    const a = 0.14 + Math.sin(f * 0.02 + my.phase) * 0.10;
    ctx.strokeStyle = `rgba(${my.pal.glow},${Math.max(0, a)})`;
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.moveTo(my.x, my.y);
    ctx.quadraticCurveTo(my.x + my.len * 0.5, my.y + my.curve, my.x + my.len, my.y);
    ctx.stroke();
  }
  ctx.restore();

  // ── Rising spores ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of bg.spores) {
    const sy = ((s.y - f * s.spd) % 560 + 560) % 560 - 20;
    const sx = s.x + Math.sin(f * s.drift + s.phase) * s.amp;
    const tw = 0.55 + Math.sin(f * 0.06 + s.phase) * 0.45;
    ctx.globalAlpha = s.a * tw;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 4);
    g.addColorStop(0, `rgba(${s.pal.glow},1)`);
    g.addColorStop(1, `rgba(${s.pal.glow},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, s.r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(sx, sy, s.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Desert ────────────────────────────────────────────────────────────────
// The sun and heat shimmer were fine; everything else was an empty orange wash
// with five flat dune blobs at 28% alpha. This gives the map a landscape:
// layered dunes with lit crests and cast shadows, mesas on the horizon,
// saguaro cacti, scrub and bones in the foreground, vultures circling, and
// blowing sand.
function _desertBg() {
  if (_desertBg._c) return _desertBg._c;
  const rnd = (a, b) => a + Math.random() * (b - a);
  _desertBg._c = {
    // Dune bands, far to near. Each is a sine ridge with a lit crest.
    dunes: [
      { base: 402, amp: 30, seed: 1.3, fill: '#d79a4e', crest: 'rgba(255,226,160,0.55)', par: 0.04 },
      { base: 428, amp: 26, seed: 3.9, fill: '#c9873c', crest: 'rgba(255,214,142,0.5)',  par: 0.08 },
      { base: 456, amp: 22, seed: 6.1, fill: '#b3722c', crest: 'rgba(255,204,126,0.42)', par: 0.14 },
    ],
    mesas: Array.from({ length: 5 }, (_, i) => ({
      x: -20 + i * 210 + rnd(-50, 50),
      w: rnd(110, 230),
      h: rnd(50, 116),
    })),
    cacti: Array.from({ length: 7 }, (_, i) => ({
      x: 40 + i * 128 + rnd(-38, 38),
      h: rnd(46, 104),
      w: rnd(9, 15),
      arms: Math.random() < 0.75 ? (Math.random() < 0.4 ? 2 : 1) : 0,
      armY: rnd(0.4, 0.66),
      side: Math.random() < 0.5 ? -1 : 1,
      band: Math.random() < 0.5,
    })),
    scrub: Array.from({ length: 12 }, (_, i) => ({
      x: 10 + i * 76 + rnd(-26, 26), r: rnd(7, 16), phase: rnd(0, 6.28),
    })),
    // Vultures circling on a thermal
    birds: Array.from({ length: 4 }, () => ({
      cx: rnd(200, 760), cy: rnd(90, 190), rx: rnd(70, 170), ry: rnd(16, 42),
      spd: rnd(0.004, 0.009), phase: rnd(0, 6.28), s: rnd(0.7, 1.2),
    })),
    sand: Array.from({ length: 44 }, () => ({
      y: rnd(300, 486), len: rnd(24, 90), spd: rnd(1.2, 3.6),
      off: rnd(0, 1200), a: rnd(0.05, 0.18),
    })),
  };
  return _desertBg._c;
}

function drawDesertArena() {
  const bg = _desertBg();
  const f  = frameCount;
  const camOff = (typeof camXCur === 'number' ? camXCur - 450 : 0);
  const groundY = 480;

  ctx.save();

  // ── Sun, high and hard ───────────────────────────────────────────────────
  const sunX = GAME_W * 0.82, sunY = 62;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 190);
  sg.addColorStop(0,    'rgba(255,250,214,0.85)');
  sg.addColorStop(0.16, 'rgba(255,224,130,0.30)');
  sg.addColorStop(1,    'rgba(255,200,90,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  ctx.restore();
  ctx.fillStyle = '#ffeeae';
  ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#ffdd66';
  ctx.lineWidth = 2;
  for (let r = 0; r < 8; r++) {
    const ang = r * Math.PI / 4 + f * 0.004;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(ang) * 36, sunY + Math.sin(ang) * 36);
    ctx.lineTo(sunX + Math.cos(ang) * 56, sunY + Math.sin(ang) * 56);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── Vultures circling ────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(70,42,20,0.5)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const b of bg.birds) {
    const a2 = f * b.spd + b.phase;
    const bx = b.cx + Math.cos(a2) * b.rx;
    const by = b.cy + Math.sin(a2) * b.ry;
    const s  = 8 * b.s;
    const w  = Math.sin(f * 0.06 + b.phase) * 2;
    ctx.beginPath();
    ctx.moveTo(bx - s, by + w);
    ctx.quadraticCurveTo(bx - s * 0.4, by - 3 - w, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - 3 - w, bx + s, by + w);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // ── Mesas on the horizon ─────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.03, 0);
  for (const m of bg.mesas) {
    const top = 392 - m.h;
    ctx.fillStyle = 'rgba(160,96,58,0.5)';
    ctx.beginPath();
    ctx.moveTo(m.x, 400);
    ctx.lineTo(m.x + m.w * 0.12, top + 6);
    ctx.lineTo(m.x + m.w * 0.2, top);
    ctx.lineTo(m.x + m.w * 0.8, top);
    ctx.lineTo(m.x + m.w * 0.88, top + 6);
    ctx.lineTo(m.x + m.w, 400);
    ctx.closePath();
    ctx.fill();
    // Strata bands
    ctx.fillStyle = 'rgba(190,124,74,0.35)';
    ctx.fillRect(m.x + m.w * 0.14, top + m.h * 0.35, m.w * 0.72, 5);
    ctx.fillRect(m.x + m.w * 0.16, top + m.h * 0.62, m.w * 0.68, 4);
  }
  ctx.restore();

  // ── Dunes ────────────────────────────────────────────────────────────────
  const duneY = (d, x) => d.base
    - Math.sin(x * 0.0042 + d.seed) * d.amp
    - Math.sin(x * 0.0113 + d.seed * 2.1) * d.amp * 0.42;
  for (const d of bg.dunes) {
    ctx.save();
    ctx.translate(-camOff * d.par, 0);
    ctx.fillStyle = d.fill;
    ctx.beginPath();
    ctx.moveTo(-260, groundY + 60);
    for (let x = -260; x <= GAME_W + 260; x += 20) ctx.lineTo(x, duneY(d, x));
    ctx.lineTo(GAME_W + 260, groundY + 60);
    ctx.closePath();
    ctx.fill();
    // Lit crest — a hairline of sun along the ridge is what gives a dune form
    ctx.strokeStyle = d.crest;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = -260; x <= GAME_W + 260; x += 20) {
      const y = duneY(d, x);
      if (x === -260) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Slip-face shadow just under the crest
    ctx.fillStyle = 'rgba(120,62,20,0.18)';
    ctx.beginPath();
    for (let x = -260; x <= GAME_W + 260; x += 20) {
      const y = duneY(d, x);
      if (x === -260) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let x = GAME_W + 260; x >= -260; x -= 20) ctx.lineTo(x, duneY(d, x) + 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Saguaro cacti ────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.17, 0);
  for (const c of bg.cacti) {
    const top = groundY - c.h;
    ctx.fillStyle = '#2f6b34';
    ctx.strokeStyle = '#20512a';
    ctx.lineWidth = 2;
    // Trunk with a rounded cap
    ctx.beginPath();
    ctx.moveTo(c.x - c.w * 0.5, groundY + 4);
    ctx.lineTo(c.x - c.w * 0.5, top + c.w * 0.5);
    ctx.arc(c.x, top + c.w * 0.5, c.w * 0.5, Math.PI, 0);
    ctx.lineTo(c.x + c.w * 0.5, groundY + 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Arms
    // Arm = an elbow drawn as one thick round-capped stroke out of the trunk and
    // up. The previous arc-based outline detached from the trunk and rendered as
    // a free-floating green rectangle beside the cactus.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let k = 0; k < c.arms; k++) {
      const sd = k === 0 ? c.side : -c.side;
      const ay = groundY - c.h * (c.armY + k * 0.16);
      const reach = c.w * 1.25;
      const rise  = c.h * 0.34;
      ctx.strokeStyle = '#20512a';
      ctx.lineWidth = c.w * 0.78 + 4;
      ctx.beginPath();
      ctx.moveTo(c.x + sd * c.w * 0.3, ay);
      ctx.lineTo(c.x + sd * reach, ay);
      ctx.lineTo(c.x + sd * reach, ay - rise);
      ctx.stroke();
      ctx.strokeStyle = '#2f6b34';
      ctx.lineWidth = c.w * 0.78;
      ctx.beginPath();
      ctx.moveTo(c.x + sd * c.w * 0.3, ay);
      ctx.lineTo(c.x + sd * reach, ay);
      ctx.lineTo(c.x + sd * reach, ay - rise);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    // Ribs
    ctx.strokeStyle = 'rgba(20,64,32,0.5)';
    ctx.lineWidth = 1.2;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(c.x + k * c.w * 0.26, top + c.w * 0.6);
      ctx.lineTo(c.x + k * c.w * 0.26, groundY);
      ctx.stroke();
    }
    // Flower on some of them
    if (c.band) {
      ctx.fillStyle = '#ff5a7a';
      ctx.beginPath(); ctx.arc(c.x, top + c.w * 0.2, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // ── Scrub bushes and a bleached skull ────────────────────────────────────
  ctx.save();
  ctx.translate(-camOff * 0.2, 0);
  for (const s of bg.scrub) {
    const sw = Math.sin(f * 0.03 + s.phase) * 1.5;
    ctx.strokeStyle = 'rgba(122,96,44,0.8)';
    ctx.lineWidth = 1.4;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s.x, groundY + 2);
      ctx.quadraticCurveTo(s.x + k * s.r * 0.35 + sw, groundY - s.r * 0.6,
                           s.x + k * s.r * 0.5 + sw * 1.5, groundY - s.r);
      ctx.stroke();
    }
  }
  // Skull half-buried in the sand
  const skX = 214;
  ctx.fillStyle = '#e8ddc4';
  ctx.beginPath(); ctx.ellipse(skX, groundY - 5, 11, 8, 0, Math.PI, 0); ctx.fill();
  ctx.fillRect(skX - 7, groundY - 5, 14, 5);
  ctx.fillStyle = '#8f8468';
  ctx.beginPath(); ctx.arc(skX - 4, groundY - 7, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(skX + 4, groundY - 7, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e8ddc4'; ctx.lineWidth = 3;                 // horns
  ctx.beginPath();
  ctx.moveTo(skX - 10, groundY - 11); ctx.quadraticCurveTo(skX - 22, groundY - 16, skX - 26, groundY - 6);
  ctx.moveTo(skX + 10, groundY - 11); ctx.quadraticCurveTo(skX + 22, groundY - 16, skX + 26, groundY - 6);
  ctx.stroke();
  ctx.restore();

  // ── Blowing sand ─────────────────────────────────────────────────────────
  ctx.strokeStyle = '#ffe6b0';
  ctx.lineWidth = 1.5;
  for (const s of bg.sand) {
    const x = (((s.off + f * s.spd) % 1300) + 1300) % 1300 - 200;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.moveTo(x, s.y);
    ctx.quadraticCurveTo(x + s.len * 0.5, s.y - 4, x + s.len, s.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── Heat shimmer rising off the sand ─────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shimmerAmt = Math.sin(f * 0.03) * 2;
  for (let i = 0; i < 10; i++) {
    const sx = 60 + i * 92 + Math.sin(f * 0.04 + i) * 18;
    const sh = 40 + Math.abs(Math.sin(f * 0.025 + i * 1.3)) * 62;
    const g = ctx.createLinearGradient(sx, groundY, sx, groundY - sh);
    g.addColorStop(0, 'rgba(255,214,130,0.14)');
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - 7, groundY);
    ctx.quadraticCurveTo(sx + shimmerAmt, groundY - sh * 0.5, sx, groundY - sh);
    ctx.quadraticCurveTo(sx - shimmerAmt, groundY - sh * 0.5, sx + 7, groundY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── Quicksand zone indicator (gameplay — kept) ───────────────────────────
  if (currentArena && currentArena.hasQuicksand) {
    const qsX = currentArena.quicksandX || 280;
    const qsW = currentArena.quicksandW || 340;
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(f * 0.04) * 0.08;
    const qg = ctx.createLinearGradient(0, groundY - 4, 0, groundY + 16);
    qg.addColorStop(0, '#9a7028');
    qg.addColorStop(1, '#6d4a14');
    ctx.fillStyle = qg;
    ctx.fillRect(qsX, groundY - 4, qsW, 20);
    // Sinking ripples across the zone
    ctx.strokeStyle = 'rgba(220,180,110,0.6)';
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 5; k++) {
      const rr = ((f * 0.6 + k * 40) % 200) / 200;
      ctx.globalAlpha = (1 - rr) * 0.35;
      ctx.beginPath();
      ctx.ellipse(qsX + qsW * 0.5, groundY + 2, rr * qsW * 0.5, rr * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(255,236,180,0.6)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QUICKSAND', qsX + qsW * 0.5, groundY - 9);
    ctx.restore();
  }

  ctx.restore();
}
