'use strict';
// js/story/levels/ch156.js — Chapter 156 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 156 — Between Everything (escape, run right)
// The Substrate: "older — the substrate God built the universe on". Under the
// collapsed fracture system, the foundation of everything: vast horizontal
// beams of pale stone running off into the dark in both directions, each one
// carrying a world you can't see from here, and below them planes of faint
// grid going down further than the eye goes. You run along the top of one
// beam, broken into sections where the fracture system's collapse cracked it.
// Sovereign's trail runs straight down the beam ahead of you — a line of
// scorched footprints, evenly spaced, never deviating. Behind the collapse
// wall the beam crumbles. God's Boundary at the end is a wall of warm light.
// Fallen capstones are the high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const BEAM = [[0, 1100, 440], [1170, 2200, 440], [2270, 3300, 430], [3370, 4250, 440], [4320, 5000, 440]];
  const CAPS = [[700, 340, 110], [1500, 330, 110], [1630, 250, 110], [2600, 340, 110], [3700, 330, 110], [3830, 250, 110], [4500, 340, 110]];
  const BOUNDARY = 4700;

  function floor() { return BEAM.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of CAPS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04040a');
    // Other beams far off above and below, each carrying a world you can't see
    for (const [par, y, h, a] of [[0.05, 120, 26, 0.35], [0.1, 220, 34, 0.45], [0.15, 560, 40, 0.5], [0.08, 680, 30, 0.3]]) {
      _slParallax(v, par, (l, r) => {
        ctx.fillStyle = `rgba(150,145,130,${a})`; ctx.fillRect(l - 20, y, r - l + 40, h);
        for (let x = Math.floor(l / 300) * 300; x < r + 300; x += 300) { ctx.fillStyle = `rgba(80,76,70,${a})`; ctx.fillRect(x, y, 6, h); }
      });
    }
    // Grid planes going down further than the eye goes
    _slParallax(v, 0.25, (l, r) => {
      for (let k = 0; k < 6; k++) { ctx.strokeStyle = `rgba(160,170,220,${0.12 - k * 0.015})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l - 20, 470 + k * 40); ctx.lineTo(r + 20, 470 + k * 40); ctx.stroke(); }
    });
  }

  function back(v) {
    // Sovereign's trail: scorched footprints, evenly spaced, never deviating
    for (let x = Math.ceil((v.x - 40) / 70) * 70; x < v.x + v.w + 40; x += 70) {
      if (!BEAM.some(([a, b]) => x >= a && x < b)) continue;
      const y = (BEAM.find(([a, b]) => x >= a && x < b) || [0, 0, 440])[2];
      ctx.fillStyle = 'rgba(40,20,30,0.75)'; ctx.beginPath(); ctx.ellipse(x + ((x / 70) % 2 ? 8 : -8), y - 2, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,90,60,0.35)'; ctx.fillRect(x - 2 + ((x / 70) % 2 ? 8 : -8), y - 3, 4, 1);
    }
    for (const [x, y, w] of CAPS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.save(); ctx.translate(x + w / 2, y + 10); ctx.rotate(((x / 10) % 3 - 1) * 0.02);
      ctx.fillStyle = '#9a968a'; ctx.fillRect(-w / 2, -10, w, 22); ctx.fillStyle = '#b8b4a6'; ctx.fillRect(-w / 2, -10, w, 4);
      ctx.restore();
    }
    // God's Boundary: a wall of warm light
    if (_slVisible(v, BOUNDARY - 200, BOUNDARY + 400)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(BOUNDARY, 0, BOUNDARY + 300, 0); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(0.3, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,248,220,0.85)');
      ctx.fillStyle = g; ctx.fillRect(BOUNDARY, v.y - 20, 400, 480 - v.y); ctx.restore();
    }
    // Behind the wall the beam crumbles
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    for (let k = 0; k < 8; k++) { const t = ((frameCount * 0.6 + k * 37) % 120) / 120, x = wx - 30 - _slHash(k + 1560) * 260; if (_slVisible(v, x - 20, x + 20)) { ctx.fillStyle = `rgba(154,150,138,${1 - t})`; ctx.fillRect(x, 445 + t * 220, 18, 10); } }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of BEAM) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#b8b4a6'; ctx.fillRect(x0, y - 12, x1 - x0, 12); ctx.fillStyle = 'rgba(255,255,240,0.25)'; ctx.fillRect(x0, y - 12, x1 - x0, 1.5); continue; }
      const g = ctx.createLinearGradient(0, y, 0, y + 110); g.addColorStop(0, '#9a968a'); g.addColorStop(1, '#3a3834');
      ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, 110);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = Math.ceil(x0 / 300) * 300; x < x1; x += 300) ctx.fillRect(x, y, 4, 110);
      ctx.strokeStyle = 'rgba(30,26,22,0.6)'; ctx.lineWidth = 1.5;
      for (const ex of [x0, x1]) { ctx.beginPath(); _slJag(ex, y, ex, y + 110, 6, 8, 1561 + ex).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); }
    }
  }

  STORY_LEVELS[156] = {
    sky: ['#04040a', '#0a0a14', '#12121e'],
    groundColor: '#04040a',
    platColor: '#9a968a',
    noGroundFill: true,
    sceneX: 600,
    floor, layout, backdrop, back, surface,
  };
})();
