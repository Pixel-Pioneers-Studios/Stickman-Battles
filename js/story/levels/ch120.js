'use strict';
// Chapter 120 map (scavenge). See smb-story-levels.js.

// What Thresh Kept: scavenge four fragments from the wreck. Wreck piles are the climbs.
(function () {
  const G = 440;
  const WALL = 450, BENCH = [1150, 380, 110], ARCH = 2100, NOTE = [2945, 385, 110];
  const PILES = [[750, 350, 110], [870, 270, 110], [1650, 340, 110], [2400, 350, 110], [2520, 270, 110], [3250, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [BENCH, NOTE, ...PILES]) _slLedge(P, x, y, w);
    return P;
  }

  function cleared(x, r) { ctx.strokeStyle = 'rgba(200,140,90,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, G - 3, r, 4, 0, 0, Math.PI * 2); ctx.stroke(); }

  function backdrop(v) {
    _slSkyAbove(v, '#100400');
    _slParallax(v, 0.12, (l, r) => {
      for (let i = Math.floor(l / 120) - 1; i * 120 < r + 120; i++) {
        const x = i * 120 + _slHash(i + 1200) * 60, h = 40 + _slHash(i + 1201) * 140;
        ctx.save(); ctx.translate(x, 440); ctx.rotate((_slHash(i + 1202) - 0.5) * 0.8); ctx.fillStyle = '#2a160c'; ctx.fillRect(-20, -h, 40 + _slHash(i) * 40, h); ctx.restore();
      }
    });
  }

  function back(v) {
    for (const [x, y, w] of PILES) if (_slVisible(v, x - 20, x + w + 20)) { _slRubble(x - 10, G, w + 20, G - y, '#4a2e1e'); ctx.fillStyle = '#6a4a32'; ctx.fillRect(x, y, w, 4); }
    if (_slVisible(v, WALL - 120, WALL + 120)) {
      cleared(WALL, 100);
      ctx.save(); ctx.translate(WALL + 30, G); ctx.rotate(-0.06);
      _slBrick(-50, -140, 100, 140, '#6a4a3a');
      ctx.strokeStyle = 'rgba(20,10,4,0.8)'; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) { const lx = -32 + k * 15; ctx.beginPath(); ctx.moveTo(lx, -92); ctx.lineTo(lx + 4 + _slHash(k + 1203) * 6, -72); ctx.lineTo(lx + 10, -90 + _slHash(k + 1204) * 8); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(WALL + 90, G); ctx.lineTo(WALL + 60, G - 100); ctx.stroke();
    }
    // Last meeting point
    if (_slVisible(v, BENCH[0] - 40, BENCH[0] + BENCH[2] + 40)) {
      const [x, y, w] = BENCH;
      ctx.fillStyle = '#4a2e1e'; ctx.fillRect(x - 10, y + 24, w + 20, G - y - 24);
      ctx.fillStyle = '#6a4a32'; ctx.fillRect(x, y, w, 8); ctx.fillRect(x + 8, y + 8, 8, 16); ctx.fillRect(x + w - 16, y + 8, 8, 16);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 10 + k * 34, y + 1, 24, 3); }
      cleared(x + w / 2, 90);
    }
    // A lantern that survived the crossing
    if (_slVisible(v, ARCH - 120, ARCH + 120)) {
      cleared(ARCH, 90);
      ctx.fillStyle = '#5a3a26';
      ctx.fillRect(ARCH - 60, G - 70, 24, 70); ctx.fillRect(ARCH + 36, G - 70, 24, 70); ctx.fillRect(ARCH - 66, G - 86, 132, 18);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(ARCH, G - 22, 2, ARCH, G - 22, 60); g.addColorStop(0, 'rgba(255,210,140,0.6)'); g.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = g; ctx.fillRect(ARCH - 60, G - 82, 120, 82); ctx.restore();
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(ARCH - 7, G - 30, 14, 22); ctx.fillStyle = '#ffd890'; ctx.fillRect(ARCH - 4, G - 26, 8, 12);
    }
    // A note in someone else's hand
    if (_slVisible(v, NOTE[0] - 40, NOTE[0] + NOTE[2] + 40)) {
      const [x, y, w] = NOTE;
      ctx.fillStyle = '#4a2e1e'; ctx.beginPath(); ctx.moveTo(x + 4, G); ctx.lineTo(x, y + 8); ctx.quadraticCurveTo(x + w / 2, y - 8, x + w, y + 6); ctx.lineTo(x + w - 4, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x + 36, y - 4, 30, 6); ctx.fillStyle = '#5a3a26'; ctx.fillRect(x + 44, y - 10, 14, 7);
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3800, kind: 'mud', face: 'soil' }]); }

  STORY_LEVELS[120] = {
    sky: ['#100400', '#241006', '#44200c'],
    groundColor: '#2e1a10',
    platColor: '#4a2e1e',
    layout, backdrop, back, surface,
  };
})();
