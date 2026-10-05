'use strict';
// js/story/levels/ch98.js — Chapter 98 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 98 — The Scale of Things (scavenge, 4 relics)
// Titan World's outer ruins: the city of the civilization before the current
// King, built at a scale you only reach the ankles of. Columns you can't see
// the tops of; a staircase whose every step is taller than you (the climbs);
// glyphs cut into the walls the size of doors. The relics lie where the
// titans left them: the civilization record on the ground at the first gate,
// the record of the First Wall's collapse on a toppled tablet, the record of
// isolation on the rim of a giant's cup, and the Last King's failure in the
// open palm of his own fallen statue — the statue's head lies further on, on
// its side, crown still on. "They grew larger and refused to bend."
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const TABLET = [1150, 370, 110], CUP = [1950, 390, 100], PALM = [2740, 375, 120];
  const STAIR = [[560, 360, 120], [680, 280, 120], [800, 200, 120]];
  const COLS = [300, 1500, 1750, 2450];
  const HEAD = 3150;

  function layout() {
    const P = [];
    for (const [x, y, w] of [TABLET, CUP, PALM, ...STAIR]) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#2a1a12');
    // Colossal ruins far off: columns and broken arches the size of hills
    _slParallax(v, 0.12, (l, r) => {
      for (let i = Math.floor(l / 240) - 1; i * 240 < r + 240; i++) {
        const x = i * 240 + _slHash(i + 980) * 100, h = 260 + _slHash(i + 981) * 200;
        ctx.fillStyle = 'rgba(60,40,28,0.7)'; ctx.fillRect(x, G - h, 50, h);
        if (_slHash(i + 982) < 0.4) { ctx.beginPath(); ctx.arc(x + 120, G - h + 20, 95, Math.PI, 0); ctx.lineWidth = 34; ctx.strokeStyle = 'rgba(60,40,28,0.7)'; ctx.stroke(); }
      }
    });
  }

  function back(v) {
    // Columns you can't see the tops of
    for (const x of COLS) if (_slVisible(v, x - 90, x + 90)) {
      ctx.fillStyle = '#7a6450'; ctx.fillRect(x - 70, v.y - 20, 140, G - v.y + 20);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = -56; k <= 56; k += 18) ctx.fillRect(x + k, v.y - 20, 5, G - v.y + 20);
      ctx.fillStyle = '#8a7460'; ctx.fillRect(x - 84, G - 30, 168, 30);
    }
    // Door-sized glyphs on the wall behind the first gate
    if (_slVisible(v, 200, 560)) {
      ctx.strokeStyle = 'rgba(40,26,16,0.55)'; ctx.lineWidth = 8;
      for (let k = 0; k < 3; k++) { const x = 230 + k * 100; ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x + 40, 150); ctx.lineTo(x + 20, 230); ctx.moveTo(x + 10, 190); ctx.lineTo(x + 50, 210); ctx.stroke(); }
    }
    // The giants' staircase: every step taller than you
    for (const [x, y, w] of STAIR) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = "#8a7460"; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = "#9a8470"; ctx.fillRect(x, y, w, 6);
    }
    // A toppled tablet, the giant's cup, the fallen statue's open palm
    if (_slVisible(v, TABLET[0] - 20, TABLET[0] + 140)) {
      const [x, y, w] = TABLET;
      ctx.save(); ctx.translate(x + w / 2, G); ctx.rotate(-0.06);
      ctx.fillStyle = '#6a5644'; ctx.fillRect(-w / 2 - 10, y - G, w + 20, G - y);
      ctx.strokeStyle = 'rgba(40,26,16,0.5)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-w / 2, y - G + 16 + k * 14); ctx.lineTo(w / 2 - 10, y - G + 16 + k * 14); ctx.stroke(); }
      ctx.restore();
    }
    if (_slVisible(v, CUP[0] - 40, CUP[0] + CUP[2] + 40)) {
      const [x, y, w] = CUP;
      ctx.fillStyle = '#8a6a3a';
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + w + 10, y); ctx.lineTo(x + w - 10, G - 14); ctx.lineTo(x + 10, G - 14); ctx.closePath(); ctx.fill();
      ctx.fillRect(x + w / 2 - 20, G - 14, 40, 14);
      ctx.fillStyle = '#a8884a'; ctx.fillRect(x - 12, y - 2, w + 24, 6);
    }
    if (_slVisible(v, PALM[0] - 200, PALM[0] + PALM[2] + 40)) {
      const [x, y, w] = PALM;
      ctx.fillStyle = '#7a6a58';
      ctx.fillRect(x - 220, y + 20, 230, G - y - 20);                                   // forearm on the ground
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 10, G); ctx.lineTo(x - 10, G); ctx.fill();
      ctx.fillStyle = '#8a7a68'; for (let k = 0; k < 4; k++) ctx.fillRect(x + w - 6, y - 50 + k * 14, 34 - k * 4, 10);   // curled fingers
      ctx.fillStyle = '#9a8a78'; ctx.fillRect(x, y, w, 5);
    }
    // The Last King's head, on its side, crown still on
    if (_slVisible(v, HEAD - 220, HEAD + 220)) {
      ctx.fillStyle = '#7a6a58'; ctx.beginPath(); ctx.ellipse(HEAD, G - 110, 190, 110, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.ellipse(HEAD - 40, G - 130, 26, 12, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(HEAD - 90, G - 80, 80, 8);
      ctx.fillStyle = '#a8884a';
      ctx.beginPath(); ctx.moveTo(HEAD + 150, G - 200); for (let k = 0; k < 5; k++) { ctx.lineTo(HEAD + 190 + 14, G - 190 + k * 34); ctx.lineTo(HEAD + 190, G - 174 + k * 34); } ctx.lineTo(HEAD + 160, G - 30); ctx.fill();
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3600, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#8a7460'; ctx.fillRect(x0, G - 16, x1 - x0, 16);
      ctx.strokeStyle = 'rgba(40,26,16,0.35)'; ctx.lineWidth = 1;
      for (let jx = Math.ceil(x0 / 140) * 140; jx < x1; jx += 140) { ctx.beginPath(); ctx.moveTo(jx, G - 16); ctx.lineTo(jx - 8, G); ctx.stroke(); }
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 160);
    g.addColorStop(0, '#6a5644'); g.addColorStop(1, '#2a1a12');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 160);
    ctx.fillStyle = '#7a6450'; ctx.fillRect(x0, G, x1 - x0, 10);
  }

  STORY_LEVELS[98] = {
    sky: ['#2a1a12', '#4a2e1e', '#6a4630'],
    groundColor: '#4a3a2c',
    platColor: '#8a7460',
    layout, backdrop, back, surface,
  };
})();
