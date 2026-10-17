'use strict';
// js/story/levels/ch99.js — Chapter 99 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 99 — The Outer Throne (walk → duel vs the Titan Enforcers)
// The Throne Approach: the processional road from the Outer Plain up to the
// Throne Plateau, lined with statues of past kings so big that only their
// feet and shins fit in the world — each pair of stone feet as tall as a
// house. The road climbs in giant's steps (the climbs). The Enforcers hold
// the midpoint, the one landing on the road, standing between the feet of
// the largest statue; the Plateau and its throne are a silhouette on the
// skyline at the far end, watching ("You could feel its attention shift").
// The cache shafts are the footprints of something that walked here once,
// sunk deep into the road.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, LANDING = 3000;
  const STEPS = [[520, 360, 120], [640, 280, 120], [1150, 350, 120], [1270, 270, 120], [2220, 360, 110], [2330, 280, 110],
                 [3660, 360, 110], [3770, 280, 120], [5040, 350, 120], [5160, 270, 120]];
  const FEET = [400, 1500, 2550, 3500, 4250, 5450];
  const PRINTS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of STEPS) _slLedge(P, x, y, w);
    _slLedge(P, LANDING - 340, 360, 100); _slLedge(P, LANDING + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#2a1a12');
    // The Throne Plateau on the skyline, the throne a silhouette on it
    _slParallax(v, 0.08, (l, r) => {
      const px = 5650 * 0.08 + 350;
      ctx.fillStyle = 'rgba(50,32,22,0.85)';
      ctx.beginPath(); ctx.moveTo(px - 500, G); ctx.lineTo(px - 300, 220); ctx.lineTo(px + 300, 220); ctx.lineTo(px + 500, G); ctx.fill();
      ctx.fillRect(px - 40, 120, 80, 100); ctx.fillRect(px - 60, 180, 120, 40);
      ctx.fillStyle = 'rgba(255,200,120,0.25)'; ctx.fillRect(px - 4, 150, 8, 6);
    });
  }

  function feet(x, big) {
    const s = big ? 1.4 : 1;
    for (const dx of [-90 * s, 30 * s]) {
      ctx.fillStyle = '#7a6a58';
      ctx.fillRect(x + dx, G - 150 * s, 60 * s, 150 * s - 40);                        // shin
      ctx.fillRect(x + dx - 10 * s, G - 40, 110 * s, 40);                              // foot
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + dx + 44 * s, G - 150 * s, 16 * s, 150 * s - 40);
      ctx.fillStyle = '#6a5a48'; for (let k = 0; k < 4; k++) ctx.fillRect(x + dx + 100 * s - 10 * s, G - 34 + k * 8, 14 * s, 6);
    }
    ctx.fillStyle = 'rgba(60,40,28,0.6)'; ctx.fillRect(x - 100 * s, G - 150 * s - 60, 210 * s, 60);
  }

  function back(v) {
    for (const x of FEET) if (_slVisible(v, x - 200, x + 200)) feet(x, false);
    if (_slVisible(v, LANDING - 420, LANDING + 420)) {
      feet(LANDING, true);
      for (const x of [LANDING - 340, LANDING + 240]) { ctx.fillStyle = '#8a7460'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#9a8470'; ctx.fillRect(x - 4, 356, 108, 8); }
    }
    for (const [x, y, w] of STEPS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#8a7460'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#9a8470'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + w - 6, y, 6, G - y);
    }
    // Footprints of something that walked here once, around the cache shafts
    for (const px of PRINTS) {
      if (!_slVisible(v, px - 140, px + 140)) continue;
      ctx.fillStyle = '#3a2a1e';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(px - 70 + k * 46, G - 3, 14, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'sandstone', face: 'soil' }]); }

  STORY_LEVELS[99] = {
    sky: ['#2a1a12', '#4a2e1e', '#6a4630'],
    groundColor: '#4a3a2c',
    platColor: '#8a7460',
    layout, backdrop, back, surface,
  };
})();
