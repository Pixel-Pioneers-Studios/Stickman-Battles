'use strict';
// js/story/levels/ch160.js — Chapter 160 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 160 — Before Contact (scavenge, 4 sediments)
// The Convergence Zone, "shifting as its decision forms". God's architecture
// here is mid-thought: arches half-built, blocks hanging in place waiting to
// be set, the gold light pulsing as something decides. Memory sediments lie
// in the strata of the floor and walls — layers of older stone, banded like
// rock, each one holding a scene too faint to make out until you're close:
// a world before the war (a city skyline in the first band), the boundary
// still intact (an unbroken ring), ninety-four names (rows of tiny marks
// cut in a wall of strata), and the weight it carried (a great block
// pressing down on a slender column that never broke). Waiting blocks are
// the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const SKYLINE = 500, RING = [1250, 380, 110], NAMES = 2200, WEIGHT = [2945, 385, 110];
  const BLOCKS = [[780, 350, 110], [900, 270, 110], [1650, 340, 110], [2450, 350, 100], [2570, 270, 110], [3250, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [RING, WEIGHT, ...BLOCKS]) _slLedge(P, x, y, w);
    return P;
  }

  function strata(x, y, w, h) {
    for (let k = 0; k < h / 12; k++) { ctx.fillStyle = ['#d8c8a0', '#c8b488', '#e0d4b0', '#b8a078'][k % 4]; ctx.fillRect(x, y + k * 12, w, 12); }
  }

  function backdrop(v) {
    _slSkyAbove(v, '#f0e4c0');
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.02);
    ctx.fillStyle = `rgba(255,220,140,${0.08 + 0.08 * pulse})`; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, 460 - v.y);
    // Arches half-built; blocks hanging in place waiting to be set
    _slParallax(v, 0.2, (l, r) => {
      for (let x = Math.floor(l / 200) * 200; x < r + 200; x += 200) {
        const done = _slHash(x + 1600);
        ctx.strokeStyle = 'rgba(200,170,110,0.45)'; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x, 260); ctx.arc(x + 80, 260, 80, Math.PI, Math.PI + Math.PI * done); ctx.stroke();
        ctx.fillStyle = 'rgba(216,200,160,0.6)'; ctx.fillRect(x + 140, 140 + Math.sin(frameCount * 0.01 + x) * 4, 30, 20);
      }
    });
  }

  function back(v) {
    // A world before the war: a city skyline in the first band of strata
    if (_slVisible(v, SKYLINE - 140, SKYLINE + 140)) {
      strata(SKYLINE - 130, 300, 260, 140);
      ctx.fillStyle = 'rgba(90,70,40,0.55)'; for (let k = 0; k < 12; k++) { const h = 14 + _slHash(k + 1601) * 30; ctx.fillRect(SKYLINE - 120 + k * 20, 336 - h, 16, h); }
    }
    // The boundary still intact: an unbroken ring
    if (_slVisible(v, RING[0] - 40, RING[0] + RING[2] + 40)) {
      const [x, y, w] = RING; strata(x, y, w, G - y);
      ctx.strokeStyle = '#c89820'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + w / 2, y - 50, 30, 0, Math.PI * 2); ctx.stroke();
    }
    // Ninety-four names: rows of tiny marks cut in a wall of strata
    if (_slVisible(v, NAMES - 160, NAMES + 160)) {
      strata(NAMES - 150, 220, 300, 220);
      ctx.fillStyle = 'rgba(80,60,30,0.7)'; for (let k = 0; k < 94; k++) ctx.fillRect(NAMES - 140 + (k % 14) * 20, 236 + Math.floor(k / 14) * 22, 12 + _slHash(k + 1602) * 4, 2);
    }
    // The weight it carried: a great block on a slender column that never broke
    if (_slVisible(v, WEIGHT[0] - 60, WEIGHT[0] + WEIGHT[2] + 60)) {
      const [x, y, w] = WEIGHT;
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x + w / 2 - 8, 200, 16, y - 200);
      ctx.fillStyle = '#b8a078'; ctx.fillRect(x - 30, 120, w + 60, 80);
      strata(x, y, w, G - y);
    }
    for (const [x, y, w] of BLOCKS) if (_slVisible(v, x - 10, x + w + 10)) { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x, y, w, 24); ctx.fillStyle = '#c89820'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = 'rgba(216,200,160,0.7)'; ctx.fillRect(x + 8, y + 24, w - 16, G - y - 24); }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3800, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#efe6cc'; ctx.fillRect(x0, G - 12, x1 - x0, 12); return; }
    for (let k = 0; k < 10; k++) { ctx.fillStyle = ['#d8c8a0', '#c8b488', '#e0d4b0', '#b8a078'][k % 4]; ctx.fillRect(x0, G + k * 14, x1 - x0, 14); }
    ctx.fillStyle = '#c89820'; ctx.fillRect(x0, G, x1 - x0, 3);
  }

  STORY_LEVELS[160] = {
    sky: ['#f0e4c0', '#d8c090', '#8a6a3a'],
    groundColor: '#8a6a3a',
    platColor: '#e8dcc0',
    sceneX: 3200,
    layout, backdrop, back, surface,
  };
})();
