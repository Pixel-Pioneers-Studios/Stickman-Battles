'use strict';
// js/story/levels/ch40.js — Chapter 40 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 40 — The Second Architect (walk → duel vs the Second Architect)
// Through the root door from chapter 39, inside the sanctum: a hall hollowed
// out of one living tree. "We built those portals together, you know." The
// walls are the Architect's notebook — portal schematics grown into the grain
// and glowing green. Shelf-fungus brackets climb the walls; workbenches with
// half-built portal rings line the walk. The Architect tests you in the
// sanctum's heart, a moss clearing under a circle of light from the hollow
// trunk above. The cache shafts are root holes down into the tree's
// underground. Beyond: the dimensional key on its stand, and the way out.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, HEART = 3000, KEY = 5500;
  const FUNGUS = [[420, 350, 100], [560, 270, 110], [1150, 340, 110], [1290, 260, 120], [2250, 350, 100], [2380, 270, 120],
                  [3640, 340, 100], [3780, 260, 120], [5050, 350, 110], [5200, 270, 110]];
  const BENCHES = [[800, 160], [2050, 140], [4100, 160], [5250, 140]];
  const HOLES = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of FUNGUS) _slLedge(P, x, y, w);
    for (const [x, w] of BENCHES) _slLedge(P, x, G - 44, w);
    _slLedge(P, HEART - 330, 360, 90); _slLedge(P, HEART + 240, 360, 90);    // moss stones
    return P;
  }

  function schematic(cx, cy, r, seed) {
    ctx.strokeStyle = `rgba(140,255,140,${0.18 + 0.1 * Math.sin(frameCount * 0.03 + seed)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + seed; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6); ctx.lineTo(cx + Math.cos(a) * r * 1.2, cy + Math.sin(a) * r * 1.2); ctx.stroke(); }
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(140,255,140,0.35)'; ctx.textAlign = 'center';
    ctx.fillText(['seal ≠ cage', 'anchor: inside', 'Ω closes Ω', 'two keys, one door'][seed % 4], cx, cy + r * 1.5);
  }

  function backdrop(v) { _slSkyAbove(v, '#0a0804'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // The hollow: living wood walls, grain lines, grown-in schematics
    ctx.fillStyle = '#2a1e12'; ctx.fillRect(x0, v.y - 20, x1 - x0, G - v.y + 20);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
    for (let k = Math.floor(x0 / 34); k * 34 < x1; k++) { ctx.beginPath(); ctx.moveTo(k * 34, v.y); ctx.bezierCurveTo(k * 34 + 14, 120, k * 34 - 14, 280, k * 34 + 6, G); ctx.stroke(); }
    for (let k = Math.floor(x0 / 700); k * 700 < x1; k++) {
      const sx = k * 700 + 350;
      if (Math.abs(sx - HEART) < 500) continue;
      schematic(sx, 150, 50, k);
    }
    // Shelf-fungus brackets
    for (const [x, y, w] of FUNGUS) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#22180e'; ctx.fillRect(x + w * 0.35, y + 12, w * 0.3, G - y - 12);   // the root column it grows from
      ctx.fillStyle = '#8a7a52';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.quadraticCurveTo(x + w - 10, y + 28, x + w / 2, y + 30); ctx.quadraticCurveTo(x + 10, y + 28, x, y); ctx.fill();
      ctx.fillStyle = '#a89a6a'; ctx.fillRect(x, y, w, 3);
    }
    // Workbenches with half-built portal rings
    for (const [x, w] of BENCHES) {
      if (!_slVisible(v, x - 40, x + w + 40)) continue;
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x, G - 44, w, 10);
      ctx.fillStyle = '#3a2816'; ctx.fillRect(x + 8, G - 34, 10, 34); ctx.fillRect(x + w - 18, G - 34, 10, 34);
      ctx.strokeStyle = '#6a8a5a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x + w / 2, G - 100, 40, Math.PI * 0.8, Math.PI * 2.1); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(140,255,140,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + w / 2, G - 100, 40, Math.PI * 0.8, Math.PI * (0.8 + 1.3 * (0.5 + 0.5 * Math.sin(frameCount * 0.02 + x)))); ctx.stroke();
      ctx.restore();
    }
    // Root holes into the tree's underground (the cache shafts)
    for (const hx of HOLES) {
      if (!_slVisible(v, hx - 100, hx + 100)) continue;
      ctx.strokeStyle = '#3a2816'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(hx - 110, G); ctx.quadraticCurveTo(hx - 60, G - 40, hx - 46, G); ctx.moveTo(hx + 110, G); ctx.quadraticCurveTo(hx + 60, G - 40, hx + 46, G); ctx.stroke();
    }
    // The heart: a moss clearing under light from the hollow trunk above
    if (_slVisible(v, HEART - 500, HEART + 500)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(HEART, v.y, HEART, G);
      g.addColorStop(0, 'rgba(220,255,200,0.30)'); g.addColorStop(1, 'rgba(160,255,140,0.08)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(HEART - 90, v.y); ctx.lineTo(HEART + 90, v.y); ctx.lineTo(HEART + 300, G); ctx.lineTo(HEART - 300, G); ctx.fill();
      ctx.restore();
      for (const sx of [HEART - 330, HEART + 240]) {
        ctx.fillStyle = '#4a5a3a'; ctx.beginPath(); ctx.moveTo(sx, G); ctx.lineTo(sx + 6, 360); ctx.lineTo(sx + 84, 360); ctx.lineTo(sx + 90, G); ctx.fill();
        ctx.fillStyle = '#5a7a3e'; ctx.fillRect(sx + 4, 356, 82, 6);
      }
      schematic(HEART, 120, 80, 3);
    }
    // The dimensional key on its stand
    if (_slVisible(v, KEY - 100, KEY + 100)) {
      ctx.fillStyle = '#3a2816'; ctx.fillRect(KEY - 12, G - 90, 24, 90); ctx.fillRect(KEY - 30, G - 96, 60, 8);
      const p = 0.6 + 0.4 * Math.sin(frameCount * 0.06);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(160,255,200,${0.4 * p})`; ctx.beginPath(); ctx.arc(KEY, G - 120, 26, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#c8ffd8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(KEY, G - 128, 8, 0, Math.PI * 2); ctx.moveTo(KEY, G - 120); ctx.lineTo(KEY, G - 100); ctx.lineTo(KEY + 8, G - 100); ctx.stroke();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'parquet', face: 'soil' }]); }

  STORY_LEVELS[40] = {
    sky: ['#0a0804', '#1a1408'],
    groundColor: '#1a1208',
    platColor: '#4a3420',
    layout, backdrop, back, surface,
  };
})();
