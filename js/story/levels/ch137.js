'use strict';
// js/story/levels/ch137.js — Chapter 137 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 137 — The Face (scavenge, 4 records)
// The approach to the Inner Sanctum, where the Creator left the records of
// the fracture system's origin. The walls here are lined with record panes
// — glass sheets with text scrolling in them — and the architecture keeps
// trying to purge them: panes ahead of you go dark one after another. Each
// record you need is kept somewhere specific: the Void Mind report on a
// reading stand by the entry; Project: Paradox — Origin on a raised lectern;
// the cost assessment on a desk stacked with tallies; the Creator's own
// admission on a plinth at the end, under the only pane still showing a face
// — a plain, tired one. White plinths are the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const STAND = 500, LECTERN = [1150, 370, 100], DESK = 2000, PLINTH = [2945, 380, 110];
  const BLOCKS = [[780, 350, 110], [900, 270, 110], [1600, 340, 110], [2400, 350, 100], [2520, 270, 110], [3300, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [LECTERN, PLINTH, ...BLOCKS]) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
    // Record panes; the purge darkens them one after another
    const purge = (frameCount * 1.5) % 4200;
    for (let k = Math.floor(v.x / 110); k * 110 < v.x + v.w + 110; k++) {
      const x = k * 110 + 20, dark = Math.abs(x - purge) < 160;
      ctx.fillStyle = dark ? '#1a1030' : 'rgba(200,215,255,0.55)'; ctx.fillRect(x, 100, 70, 150);
      ctx.strokeStyle = '#7864c8'; ctx.lineWidth = 1; ctx.strokeRect(x, 100, 70, 150);
      if (!dark) { ctx.fillStyle = 'rgba(40,30,80,0.6)'; for (let r = 0; r < 9; r++) ctx.fillRect(x + 6, 110 + ((r * 16 + frameCount * 0.3) % 140), 20 + _slHash(k * 9 + r) * 40, 2); }
    }
  }

  function back(v) {
    if (_slVisible(v, STAND - 50, STAND + 50)) { ctx.fillStyle = '#b8b4c8'; ctx.fillRect(STAND - 4, G - 60, 8, 60); ctx.fillRect(STAND - 24, G - 66, 48, 8); }
    if (_slVisible(v, LECTERN[0] - 20, LECTERN[0] + LECTERN[2] + 20)) { const [x, y, w] = LECTERN; ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x + w / 2 - 14, y, 28, G - y); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 8); }
    if (_slVisible(v, DESK - 80, DESK + 80)) {
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(DESK - 70, G - 44, 140, 6); ctx.fillRect(DESK - 64, G - 38, 6, 38); ctx.fillRect(DESK + 58, G - 38, 6, 38);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(DESK - 60 + k * 24, G - 44 - (k % 3 + 1) * 6, 18, (k % 3 + 1) * 6); ctx.fillStyle = 'rgba(40,30,80,0.6)'; for (let t = 0; t < 4; t++) ctx.fillRect(DESK - 58 + k * 24 + t * 4, G - 50, 1, 4); }
    }
    for (const [x, y, w] of BLOCKS) if (_slVisible(v, x - 10, x + w + 10)) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + w - 8, y, 8, G - y); }
    // The admission, under the only pane still showing a face
    if (_slVisible(v, PLINTH[0] - 80, PLINTH[0] + PLINTH[2] + 80)) {
      const [x, y, w] = PLINTH, cx = x + w / 2;
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.fillRect(cx - 50, 120, 100, 130); ctx.strokeStyle = '#7864c8'; ctx.lineWidth = 2; ctx.strokeRect(cx - 50, 120, 100, 130);
      ctx.strokeStyle = 'rgba(40,30,80,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 180, 26, 34, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 14, 172); ctx.lineTo(cx - 6, 174); ctx.moveTo(cx + 6, 174); ctx.lineTo(cx + 14, 172); ctx.moveTo(cx - 8, 198); ctx.lineTo(cx + 8, 198); ctx.stroke();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4000, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[137] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#ece8f8',
    layout, backdrop, back, surface,
  };
})();
