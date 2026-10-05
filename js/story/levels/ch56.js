'use strict';
// js/story/levels/ch56.js — Chapter 56 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 56 — Signal Maze (traversal)
// "City blocks that shouldn't exist next to each other. Streets that looped
// back." The Creator's interference has scrambled a city into pieces: each
// block sits at its own height with a violet seam between it and the next,
// the same corner — MERIDIAN AVE, the same diner, the same lamp — comes
// round three times, one block hangs upside down from the sky, and a stretch
// of road is tilted up into the distance. Rooftops and awnings make a high
// route. The Fallback Beacon, a pillar of light in the Architects' colours,
// is at the far end past its guards.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 600, 440], [600, 1000, 400], [1000, 1500, 440], [1500, 1750, 480], [1750, 2300, 440],
                 [2300, 2700, 410], [2700, 3300, 440], [3300, 3500, 470], [3500, 5000, 440]];
  const ROOF = [[700, 300, 180], [1200, 330, 140], [1340, 250, 120], [2000, 340, 120], [2120, 260, 140],
                [2850, 330, 150], [3000, 250, 120], [3880, 340, 120], [4020, 260, 140]];
  const LOOP = [400, 1950, 3600];          // the same corner, three times
  const BEACON = 4650;

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of ROOF) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#140a20');
    _slParallax(v, 0.12, (l, r) => {
      // A road tilted up into the distance, and towers at wrong angles
      ctx.save(); ctx.translate(l + (r - l) * 0.3, 380); ctx.rotate(-0.35);
      ctx.fillStyle = '#2a2632'; ctx.fillRect(0, -20, 700, 40);
      ctx.fillStyle = 'rgba(255,220,120,0.4)'; for (let k = 0; k < 14; k++) ctx.fillRect(k * 50, -2, 24, 4);
      ctx.restore();
      for (let i = Math.floor(l / 150) - 1; i * 150 < r + 150; i++) {
        const x = i * 150 + _slHash(i + 56) * 50, h = 120 + _slHash(i + 57) * 200, tilt = (_slHash(i + 58) - 0.5) * 0.6;
        ctx.save(); ctx.translate(x, 440); ctx.rotate(tilt);
        ctx.fillStyle = '#221c2c'; ctx.fillRect(-30, -h, 60, h);
        _slWindowGrid(-24, -h + 10, 48, h - 30, 3, Math.floor(h / 40), { lit: 0.2, seed: i, sill: false });
        ctx.restore();
      }
    });
  }

  function corner(x, base) {
    // MERIDIAN AVE: the same diner, sign and lamp every time it comes round
    _slShopfront(x, base, 220, 150, '#5a4a5a', 'DINER', '#ff8899', '#aa3344', true);
    _slStreetLamp(x + 250, base, true);
    ctx.fillStyle = '#2a6a3a'; ctx.fillRect(x + 300, base - 120, 90, 20);
    ctx.fillStyle = '#e8f0e8'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MERIDIAN AVE', x + 345, base - 106);
    ctx.fillStyle = '#5a5a60'; ctx.fillRect(x + 343, base - 100, 4, 100);
  }

  function back(v) {
    const base = x => { const f = FLOOR.find(([a, b]) => x >= a && x < b); return f ? f[2] : 440; };
    // Block seams: violet cracks where two pieces of city were pushed together
    for (const [x0] of FLOOR) {
      if (x0 === 0 || !_slVisible(v, x0 - 20, x0 + 20)) continue;
      _slSkyCrack([[x0, base(x0 - 1) - 260], [x0 + 8, base(x0 - 1) - 170], [x0 - 4, base(x0 - 1) - 80], [x0 + 3, 480]], 0.45);
    }
    for (const lx of LOOP) if (_slVisible(v, lx - 40, lx + 420)) corner(lx, base(lx + 100));
    // Rooftops and awnings: the high route
    for (const [x, y, w] of ROOF) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      const b = base(x + w / 2);
      ctx.fillStyle = '#3a3242'; ctx.fillRect(x, y, w, b - y);
      _slWindowGrid(x + 8, y + 18, w - 16, b - y - 30, Math.max(2, Math.floor(w / 40)), Math.max(1, Math.floor((b - y) / 50)), { lit: 0.25, seed: x });
      ctx.fillStyle = '#4a4252'; ctx.fillRect(x - 4, y, w + 8, 8);
    }
    // One block hangs upside down from the sky
    if (_slVisible(v, 2400, 2700)) {
      ctx.save(); ctx.translate(0, 60); ctx.scale(1, -1);
      _slShopfront(2420, -40, 240, 150, '#4a5a6a', 'PHARMACY', '#88ffcc', '#337766', false);
      ctx.restore();
    }
    // The Fallback Beacon
    if (_slVisible(v, BEACON - 200, BEACON + 200)) {
      const cols = ['#88aacc', '#88cc66', '#88ccff', '#ccaa66'];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = cols[k]; ctx.globalAlpha = 0.18 + 0.08 * Math.sin(frameCount * 0.05 + k);
        ctx.fillRect(BEACON - 30 + k * 15, v.y - 20, 12, 460 - v.y);
      }
      ctx.restore();
      ctx.fillStyle = '#3a3242'; ctx.fillRect(BEACON - 50, 400, 100, 40);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 5200, kind: 'asphalt', face: 'brick' }, { x0: 600, x1: 1000, kind: 'sidewalk', face: 'brick' }, { x0: 2300, x1: 2700, kind: 'sidewalk', face: 'brick' }]);
  }

  STORY_LEVELS[56] = {
    sky: ['#140a20', '#3a1a40'],
    groundColor: '#1a1420',
    platColor: '#4a4252',
    floor, layout, backdrop, back, surface,
  };
})();
