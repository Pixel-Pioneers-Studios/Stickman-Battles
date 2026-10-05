'use strict';
// js/story/levels/ch126.js — Chapter 126 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 126 — The Weight of a Choice (walk → duel vs Veran, 1 life)
// The Threshold's open ground, where "you went back anyway". The walk starts
// at Veran's field camp at the foot of the ridge: her relay mast, a crystal
// on a tripod, a slate wall of her equations, a lamp left burning on a
// folding table. Past the camp the ground opens into meadow under the
// fractured sky — the Creator's fracture always on the horizon. The duel
// is in the open, beside a single lone tree, where she stepped forward
// ("She isn't trying to win. She's trying to reach you"). Past it, the wind
// has scattered pages of her equations across the grass. Low stone walls of
// an old field system are the climbs; the cache shafts are her survey pits.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, TREE = 3000, CAMP = 420;
  const CLIMB = [[700, 350, 100], [820, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const PITS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, TREE - 340, 360, 100); _slLedge(P, TREE + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1220');
    _slParallax(v, 0.05, (l, r) => {
      const fx = 6000 * 0.05 + 500;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(fx - 50, 0, fx + 50, 0);
      g.addColorStop(0, 'rgba(230,230,255,0)'); g.addColorStop(0.5, 'rgba(240,240,255,0.45)'); g.addColorStop(1, 'rgba(230,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 50, -300, 100, 720); ctx.restore();
      // Cracks running out from it across the sky
      for (let k = 0; k < 4; k++) _slSkyCrack(_slJag(fx, 40 + k * 60, fx - 300 - k * 120, 20 + k * 70, 8, 14, 1260 + k), 0.25);
    });
    _slParallax(v, 0.15, (l, r) => {
      ctx.fillStyle = '#1e2836';
      ctx.beginPath(); ctx.moveTo(l - 40, 440);
      for (let x = Math.floor(l / 80) * 80 - 80; x <= r + 80; x += 80) ctx.lineTo(x, 330 + _slHash(Math.floor(x / 80) + 1261) * 60);
      ctx.lineTo(r + 80, 440); ctx.closePath(); ctx.fill();
    });
  }

  function back(v) {
    // Veran's field camp
    if (_slVisible(v, CAMP - 300, CAMP + 300)) {
      _slAntenna(CAMP - 200, G, 180, true);
      ctx.fillStyle = '#3a3c44'; ctx.fillRect(CAMP - 110, G - 160, 180, 120); _slEquations(CAMP - 106, G - 156, 172, 112, 3);
      ctx.fillStyle = '#3a3c44'; ctx.fillRect(CAMP - 100, G - 40, 4, 40); ctx.fillRect(CAMP + 56, G - 40, 4, 40);
      ctx.strokeStyle = '#5a5c64'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CAMP + 110, G); ctx.lineTo(CAMP + 130, G - 60); ctx.lineTo(CAMP + 150, G); ctx.stroke();
      _slCrystal(CAMP + 130, G - 56, 60, 200, 126);
      ctx.fillStyle = '#5a4030'; ctx.fillRect(CAMP + 180, G - 36, 70, 5); ctx.fillRect(CAMP + 186, G - 31, 4, 31); ctx.fillRect(CAMP + 240, G - 31, 4, 31);
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(CAMP + 226, G - 54, 8, 18);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CAMP + 230, G - 50, 2, CAMP + 230, G - 50, 70); g.addColorStop(0, 'rgba(255,210,140,0.5)'); g.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = g; ctx.fillRect(CAMP + 160, G - 120, 140, 120); ctx.restore();
    }
    // Low stone walls of an old field system (the climbs)
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#5a5c64'; ctx.fillRect(x, y, w, G - y);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; for (let yy = y + 14; yy < G; yy += 14) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
      ctx.fillStyle = '#6a7a5a'; ctx.fillRect(x, y, w, 4);
    }
    // The lone tree in the open, where she stepped forward
    if (_slVisible(v, TREE - 420, TREE + 420)) {
      _slTree(TREE - 120, G, 1.6, '#4a6a34');
      for (const x of [TREE - 340, TREE + 240]) { ctx.fillStyle = '#5a5c64'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#6a7a5a'; ctx.fillRect(x, 360, 100, 4); }
    }
    // Pages of her equations scattered across the grass past the duel
    for (let k = 0; k < 12; k++) {
      const px = TREE + 300 + k * 160 + _slHash(k + 1262) * 60;
      if (!_slVisible(v, px - 20, px + 20)) continue;
      ctx.save(); ctx.translate(px, G - 3 - Math.max(0, Math.sin(frameCount * 0.02 + k)) * 6); ctx.rotate((_slHash(k) - 0.5) * 0.6);
      ctx.fillStyle = '#e8e0cc'; ctx.fillRect(-10, -6, 20, 12); ctx.fillStyle = 'rgba(40,40,60,0.5)'; ctx.fillRect(-7, -3, 14, 1); ctx.fillRect(-7, 1, 10, 1);
      ctx.restore();
    }
    // Survey pits over the cache shafts: stakes and string
    for (const px of PITS) if (_slVisible(v, px - 90, px + 90)) {
      ctx.fillStyle = '#5a4030'; ctx.fillRect(px - 60, G - 24, 4, 24); ctx.fillRect(px + 56, G - 24, 4, 24);
      ctx.strokeStyle = '#d8c060'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 58, G - 20); ctx.lineTo(px + 58, G - 20); ctx.stroke();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'lawn', face: 'soil' }]); }

  STORY_LEVELS[126] = {
    sky: ['#0e1220', '#1c2438', '#2c3850'],
    groundColor: '#2a3a24',
    platColor: '#5a5c64',
    layout, backdrop, back, surface,
  };
})();
