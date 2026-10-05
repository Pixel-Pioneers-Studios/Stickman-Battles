'use strict';
// js/story/levels/ch124.js — Chapter 124 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 124 — Everything You Already Know (stealth)
// The approach to the ridge where the hooded figure is waiting, swept by
// Veran's signal drones. The drones are hers — small grey hulls with a blue
// lens — and each one's scan falls on the ground as a blue cone, exactly its
// detection zone (detection sits at guard y = 395). Every post has a high
// route: a boulder to step on, then a shelf of the hillside running over the
// cone. The ridge climbs behind the whole level toward the meeting point at
// its base, a single standing stone with nobody beside it yet. Veran's relay
// mast blinks on the skyline: she can see this ground. (First post moved to
// x=750, clear of the x=450 spawn edge — mirrored in stealthGuardDefs and
// spawnEnemies.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, MEET = 3250;
  const POSTS = [[750, 90], [1300, 95], [2000, 100], [2900, 90]];
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], shelf: [x - r - 90, 270, 2 * r + 180] }));

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.shelf); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1220');
    // The ridge climbing toward the meeting point, Veran's relay mast on it
    _slParallax(v, 0.2, (l, r) => {
      ctx.fillStyle = '#1e2836';
      ctx.beginPath(); ctx.moveTo(l - 40, 440);
      for (let x = Math.floor(l / 60) * 60 - 60; x <= r + 60; x += 60) ctx.lineTo(x, 380 - Math.max(0, (x - 100) * 0.18) + _slHash(Math.floor(x / 60) + 1240) * 20);
      ctx.lineTo(r + 60, 440); ctx.closePath(); ctx.fill();
      const mx = 2600 * 0.2 + 400;
      if (mx > l - 40 && mx < r + 40) { _slAntenna(mx, 380 - (mx - 100) * 0.18, 70, true); }
    });
  }

  function drone(x, r) {
    const y = 395 - r - 60 + Math.sin(frameCount * 0.05 + x) * 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(80,140,230,0.12)';
    ctx.beginPath(); ctx.moveTo(x - 6, y + 8); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x + r, G); ctx.lineTo(x - r, G); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#6a6c74'; ctx.fillRect(x - 16, y - 6, 32, 12); ctx.fillRect(x - 24, y - 2, 8, 3); ctx.fillRect(x + 16, y - 2, 8, 3);
    ctx.fillStyle = '#4488dd'; ctx.beginPath(); ctx.arc(x, y + 6, 4, 0, Math.PI * 2); ctx.fill();
  }

  function back(v) {
    for (let i = 0; i < POSTS.length; i++) {
      const [x, r] = POSTS[i], R = ROUTES[i];
      if (!_slVisible(v, R.step[0] - 20, R.shelf[0] + R.shelf[2] + 20)) continue;
      drone(x, r);
      const [sx, sy, sw] = R.step, [hx, hy, hw] = R.shelf;
      ctx.fillStyle = '#4a4c54'; ctx.beginPath(); ctx.moveTo(sx + 4, G); ctx.lineTo(sx, sy + 8); ctx.quadraticCurveTo(sx + sw / 2, sy - 8, sx + sw, sy + 6); ctx.lineTo(sx + sw - 4, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a6c74'; ctx.fillRect(sx, sy, sw, 3);
      ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + hw, hy); ctx.lineTo(hx + hw - 20, hy + 22); ctx.lineTo(hx + 20, hy + 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a7a4a'; ctx.fillRect(hx, hy, hw, 4);
      ctx.fillStyle = '#2e3a2e'; ctx.fillRect(hx + 6, hy + 22, 14, G - hy - 22); ctx.fillRect(hx + hw - 20, hy + 22, 14, G - hy - 22);
    }
    // The meeting point: a single standing stone, nobody beside it yet
    if (_slVisible(v, MEET - 80, MEET + 80)) {
      ctx.fillStyle = '#4a4c54'; ctx.beginPath(); ctx.moveTo(MEET - 18, G); ctx.lineTo(MEET - 12, G - 150); ctx.lineTo(MEET + 10, G - 156); ctx.lineTo(MEET + 18, G); ctx.fill();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3800, kind: 'lawn', face: 'soil' }]); }

  STORY_LEVELS[124] = {
    sky: ['#0e1220', '#1c2438', '#2c3850'],
    groundColor: '#2a3a24',
    platColor: '#4a4c54',
    layout, backdrop, back, surface,
  };
})();
