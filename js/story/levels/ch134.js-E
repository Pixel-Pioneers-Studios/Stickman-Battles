'use strict';
// js/story/levels/ch134.js — Chapter 134 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 134 — The First Promise (puzzle, 4 sequence locks)
// The Memory Vault: a long gallery where the Creator's oldest records are
// partitioned behind four sequence locks. Each lock stands on a pedestal at
// the height puzzleSwitchDefs gives it, in front of a closed partition of
// lattice; activating it dissolves the partition and lights what was behind
// — a record of what the Creator was before, as a mural: a figure working
// alone at a bench; the same figure making a promise with its hand raised;
// the first shelter it built, too small, to keep something safe; the promise
// broken across the middle. White vault shelving is the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, CORE = 3250;
  const LOCKS = [[600, 390], [1300, 355], [2100, 375], [2900, 360]];
  const SHELVES = [[850, 350, 110], [970, 270, 110], [1650, 350, 100], [1770, 270, 110], [2450, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y] of LOCKS) _slLedge(P, x - 45, y, 90);
    _slLedge(P, 1200, 400, 50); _slLedge(P, 2800, 400, 50);
    for (const [x, y, w] of SHELVES) _slLedge(P, x, y, w);
    return P;
  }

  function mural(x, k, lit) {
    const y0 = 110, w = 200, h = 150;
    ctx.fillStyle = lit ? '#efe8d8' : '#2a1048'; ctx.fillRect(x - w / 2, y0, w, h);
    if (!lit) { _slLattice(x - w / 2, y0, w, h, 0.6, 10); return; }
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const fig = (fx, fy, arm) => { ctx.beginPath(); ctx.arc(fx, fy - 40, 6, 0, Math.PI * 2); ctx.moveTo(fx, fy - 34); ctx.lineTo(fx, fy - 12); ctx.lineTo(fx - 6, fy); ctx.moveTo(fx, fy - 12); ctx.lineTo(fx + 6, fy); ctx.moveTo(fx, fy - 28); ctx.lineTo(fx + arm[0], fy - 28 + arm[1]); ctx.stroke(); };
    if (k === 0) { fig(x - 30, y0 + 120, [16, 8]); ctx.strokeRect(x - 10, y0 + 100, 60, 8); }
    else if (k === 1) { fig(x, y0 + 120, [6, -22]); }
    else if (k === 2) { fig(x - 50, y0 + 120, [14, 4]); ctx.strokeRect(x - 10, y0 + 90, 70, 30); ctx.beginPath(); ctx.arc(x + 25, y0 + 112, 5, 0, Math.PI * 2); ctx.stroke(); }
    else { fig(x, y0 + 120, [6, -22]); ctx.strokeStyle = '#8a1a10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - w / 2 + 10, y0 + 40); ctx.lineTo(x + w / 2 - 10, y0 + 110); ctx.stroke(); }
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
  }

  function back(v) {
    const n = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
    LOCKS.forEach(([x, y], i) => {
      if (!_slVisible(v, x - 130, x + 130)) return;
      mural(x, i, i < n);
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x - 45, y, 90, G - y); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x - 49, y, 98, 5);
    });
    for (const sx of [1200, 2800]) if (_slVisible(v, sx - 10, sx + 60)) { ctx.fillStyle = '#b8b4c8'; ctx.fillRect(sx, 400, 50, G - 400); ctx.fillStyle = '#ece8f8'; ctx.fillRect(sx, 400, 50, 4); }
    for (const [x, y, w] of SHELVES) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, G - y);
      for (let yy = y + 26; yy < G - 4; yy += 28) {
        ctx.fillStyle = '#c4c0d4'; ctx.fillRect(x + 4, yy, w - 8, 3);
        for (let sx = x + 8, k = 0; sx < x + w - 10; k++) { const sw = 3 + _slHash(sx + yy) * 4, sh = 12 + _slHash(sx * 3 + yy) * 10; ctx.fillStyle = k % 3 ? '#a898e0' : '#7864c8'; ctx.fillRect(sx, yy - sh, sw, sh); sx += sw + 1; }
      }
    }
    if (_slVisible(v, CORE - 120, CORE + 120)) {
      ctx.fillStyle = '#2a1048'; ctx.fillRect(CORE - 70, 140, 140, G - 140);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CORE, 240, 4, CORE, 240, 90); g.addColorStop(0, `rgba(240,230,255,${n >= 4 ? 0.85 : 0.3})`); g.addColorStop(1, 'rgba(150,120,255,0)');
      ctx.fillStyle = g; ctx.fillRect(CORE - 90, 150, 180, 180); ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3800, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[134] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#ece8f8',
    layout, backdrop, back, surface,
  };
})();
