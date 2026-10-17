'use strict';
// js/story/levels/ch127.js — Chapter 127 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 127 — Paradox (escape, run right)
// The Threshold destabilizing "in the wake of what happened". The open
// ground of the last chapter is coming apart: the meadow breaks into plates
// with gaps opening between them, and the closer you get to the Creator's
// fracture the more the land is overwritten by its geometry — grass giving
// way to white wireframe, rocks to clean polyhedra. Behind the collapse wall
// the sky folds down over the ground. The fracture itself fills the far end:
// a tall seam of white light with the Creator's lattice visible through it.
// Broken shelves of hillside (green early, white late) are the high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const PLATES = [[0, 900, 440], [960, 1700, 432], [1760, 2600, 440], [2660, 3300, 428], [3360, 4000, 440]];
  const HIGH = [[600, 345, 110], [1300, 330, 110], [1430, 250, 110], [2200, 340, 110], [2900, 330, 110], [3500, 340, 110]];
  const RIFT = 3750;
  const white = x => Math.max(0, Math.min(1, (x - 2000) / 1500));      // how overwritten the land is at x

  function floor() { return PLATES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1220');
    // The fracture: a tall seam of white light with the lattice behind it
    _slParallax(v, 0.3, (l, r) => {
      const fx = RIFT * 0.3 + 500;
      if (fx < l - 300 || fx > r + 300) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(fx - 140, 0, fx + 140, 0);
      g.addColorStop(0, 'rgba(230,230,255,0)'); g.addColorStop(0.5, 'rgba(250,250,255,0.85)'); g.addColorStop(1, 'rgba(230,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 140, -300, 280, 740); ctx.restore();
      ctx.strokeStyle = 'rgba(160,150,220,0.5)'; ctx.lineWidth = 1;
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(fx + k * 20, -300); ctx.lineTo(fx + k * 20, 440); ctx.stroke(); }
    });
  }

  function back(v) {
    // Behind the wall the sky folds down over the ground
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) {
      ctx.fillStyle = '#0a0c16';
      ctx.beginPath(); ctx.moveTo(v.x - 40, v.y - 40); ctx.lineTo(wx, v.y - 40); ctx.quadraticCurveTo(wx - 80, 240, wx, 470); ctx.lineTo(v.x - 40, 470); ctx.closePath(); ctx.fill();
    }
    // Grass giving way to wireframe; rocks to clean polyhedra
    for (let x = Math.floor(v.x / 14) * 14; x < v.x + v.w; x += 14) {
      const w = white(x);
      if (_slHash(x) < w) continue;
      ctx.strokeStyle = '#4a6a3a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x + 4, 430 - _slHash(x + 1) * 6); ctx.stroke();
    }
    for (const [x, y, w] of HIGH) if (_slVisible(v, x - 10, x + w + 10)) {
      const k = white(x);
      if (k < 0.5) {
        ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 20, y + 24); ctx.lineTo(x + 20, y + 28); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a7a4a'; ctx.fillRect(x, y, w, 4);
      } else {
        ctx.fillStyle = 'rgba(230,230,255,0.15)'; ctx.fillRect(x, y, w, 26);
        ctx.strokeStyle = 'rgba(240,240,255,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, 26); ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x + w, y); ctx.stroke();
      }
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of PLATES) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      const k = white((x0 + x1) / 2);
      if (ph === 'back') {
        ctx.fillStyle = k > 0.6 ? '#c8c8e0' : '#5a7a48'; ctx.fillRect(x0, y - 12, x1 - x0, 12);
        continue;
      }
      ctx.fillStyle = k > 0.6 ? '#1c1c30' : '#3a2e22';
      ctx.beginPath(); ctx.moveTo(x0, y);
      for (let i = 0; i <= 10; i++) ctx.lineTo(x0 + (x1 - x0) * i / 10, y + 40 + Math.sin(Math.PI * i / 10) * 100 * (0.7 + 0.3 * _slHash(i + x0)));
      ctx.lineTo(x1, y); ctx.closePath(); ctx.fill();
      if (k > 0.6) { ctx.strokeStyle = 'rgba(220,220,255,0.4)'; ctx.lineWidth = 1; for (let x = Math.ceil(x0 / 40) * 40; x < x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 60); ctx.stroke(); } }
      ctx.fillStyle = 'rgba(230,240,255,0.5)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
    }
  }

  STORY_LEVELS[127] = {
    sky: ['#0e1220', '#1c2438', '#2c3850'],
    groundColor: '#0e1220',
    platColor: '#3a4a3a',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
