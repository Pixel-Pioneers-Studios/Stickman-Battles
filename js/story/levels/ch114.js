'use strict';
// js/story/levels/ch114.js — Chapter 114 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 114 — The Foreseen Path (puzzle, 4 locks)
// A stretch of the Fracture Coast that VAEL arranged before you arrived. The
// sea runs along behind it in layers — every wave shown three times, where it
// was, where it is, where it will be. The beach is laid out like a board:
// standing stones in rows, each lock on a stone set at the height
// puzzleSwitchDefs gives it, and beside every lock VAEL left a marker for
// where they predicted you would stand — an outline of a figure that never
// resolves, only static where the face should be ("They couldn't predict
// you"). Each lock you take wipes its marker away. Tide-worn stones are the
// climbs. The Blind Node at the end is a lens of glass that shows nothing.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NODE = 3300;
  const LOCKS = [[500, 390], [1400, 355], [2400, 370], [3100, 345]];
  const STONES = [[800, 350, 100], [920, 270, 110], [1800, 350, 100], [1920, 270, 110], [2700, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y] of LOCKS) _slLedge(P, x - 45, y, 90);
    _slLedge(P, 1300, 400, 50); _slLedge(P, 3000, 395, 50);
    for (const [x, y, w] of STONES) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#020614'); _slTimeSea(v, 330); }

  function marker(x, y) {
    ctx.strokeStyle = 'rgba(180,200,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(x, y - 66, 9, 0, Math.PI * 2); ctx.moveTo(x, y - 57); ctx.lineTo(x, y - 26); ctx.lineTo(x - 9, y); ctx.moveTo(x, y - 26); ctx.lineTo(x + 9, y); ctx.moveTo(x - 12, y - 46); ctx.lineTo(x + 12, y - 46); ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 8; k++) { ctx.fillStyle = `rgba(200,220,255,${0.5 * _slHash(k + (frameCount >> 2))})`; ctx.fillRect(x - 6 + _slHash(k * 3 + frameCount) * 12, y - 72 + _slHash(k * 7 + frameCount) * 12, 2, 2); }
  }

  function back(v) {
    const n = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
    // Rows of standing stones laid out like a board
    for (let k = Math.max(0, Math.floor(v.x / 160)); k * 160 < Math.min(3600, v.x + v.w + 160); k++) {
      const x = k * 160 + 60;
      ctx.fillStyle = '#26282c'; ctx.fillRect(x - 6, G - 50, 12, 50); ctx.fillStyle = '#3e4044'; ctx.fillRect(x - 8, G - 54, 16, 6);
    }
    LOCKS.forEach(([x, y], i) => {
      if (!_slVisible(v, x - 100, x + 100)) return;
      ctx.fillStyle = '#3e4044'; ctx.fillRect(x - 45, y, 90, G - y); ctx.fillStyle = '#5a5c62'; ctx.fillRect(x - 49, y, 98, 4);
      if (i >= n) marker(x + 70, G);
    });
    for (const sx of [1300, 3000]) if (_slVisible(v, sx - 10, sx + 60)) { ctx.fillStyle = '#3e4044'; ctx.fillRect(sx, sx === 1300 ? 400 : 395, 50, 45); }
    for (const [x, y, w] of STONES) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#3e4044'; ctx.beginPath(); ctx.moveTo(x + 4, G); ctx.lineTo(x, y + 8); ctx.quadraticCurveTo(x + w / 2, y - 8, x + w, y + 6); ctx.lineTo(x + w - 4, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a5c62'; ctx.fillRect(x, y, w, 3);
      ctx.strokeStyle = 'rgba(150,200,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 8, y - 8, w, G - y);   // its future outline
    }
    // The Blind Node: a lens of glass that shows nothing
    if (_slVisible(v, NODE - 120, NODE + 120)) {
      ctx.fillStyle = '#26282c'; ctx.fillRect(NODE - 8, 260, 16, G - 260);
      ctx.fillStyle = 'rgba(200,220,255,0.12)'; ctx.beginPath(); ctx.ellipse(NODE, 220, 50, 60, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3800, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#5a5850'; ctx.fillRect(x0, G - 14, x1 - x0, 14); ctx.fillStyle = 'rgba(220,230,255,0.2)'; ctx.fillRect(x0, G - 14, x1 - x0, 1); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 200); g.addColorStop(0, '#3a3a3a'); g.addColorStop(1, '#020614');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 200);
  }

  STORY_LEVELS[114] = {
    sky: ['#020614', '#06102a', '#0e1c3a'],
    groundColor: '#2a2a2c',
    platColor: '#3e4044',
    layout, backdrop, back, surface,
  };
})();
