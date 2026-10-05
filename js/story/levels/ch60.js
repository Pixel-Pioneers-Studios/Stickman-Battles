'use strict';
// js/story/levels/ch60.js — Chapter 60 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 60 — The Preserved Speak (stealth)
// The shelter approach, through a stretch of the interference layer the
// Creator is erasing. Buildings stand half-unmade — solid at the bottom,
// wireframe where they've been erased, the outline still flickering. The
// sweep units hover overhead; each one's erasure beam lights exactly its
// detection zone (detection sits at guard y = 395). Every post has a high
// route: a chunk of rubble to step on, then a floor slab of a half-erased
// building left hanging between its two surviving columns, clear of the
// zone. The shelter chamber, where one of the Preserved hides, is a lit
// doorway sunk in the last solid wall. (First post moved to x=750, clear of
// the x=450 spawn edge — mirrored in stealthGuardDefs.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const POSTS = [[750, 85], [1200, 90], [1900, 100], [2700, 90]];
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], slab: [x - r - 90, 270, 2 * r + 180] }));
  const SHELTER = 3100;

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.slab); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c0e18');
    _slParallax(v, 0.12, (l, r) => {
      // Distant blocks, the upper half of each already wireframe
      for (let i = Math.floor(l / 150) - 1; i * 150 < r + 150; i++) {
        const x = i * 150 + _slHash(i + 60) * 50, h = 140 + _slHash(i + 61) * 160, cut = h * (0.3 + _slHash(i + 62) * 0.5);
        ctx.fillStyle = '#1a1e2c'; ctx.fillRect(x, 440 - cut, 70, cut);
        ctx.strokeStyle = 'rgba(180,200,255,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x, 440 - h, 70, h - cut);
      }
    });
  }

  function erased(x, w, solidTop, top) {
    // A building unmade from the top down: wireframe above solidTop
    ctx.fillStyle = '#2a2e3e'; ctx.fillRect(x, solidTop, w, G - solidTop);
    _slWindowGrid(x + 6, solidTop + 10, w - 12, G - solidTop - 20, Math.max(2, Math.floor(w / 36)), Math.max(1, Math.floor((G - solidTop) / 46)), { lit: 0.1, seed: x, sill: false });
    const fl = 0.4 + 0.3 * Math.sin(frameCount * 0.09 + x);
    ctx.strokeStyle = `rgba(190,210,255,${fl})`; ctx.lineWidth = 1;
    ctx.strokeRect(x, top, w, solidTop - top);
    for (let y = top + 30; y < solidTop; y += 30) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
    // The erasure edge: particles lifting off the solid part
    ctx.fillStyle = 'rgba(200,215,255,0.5)';
    for (let k = 0; k < 6; k++) { const t = ((frameCount + k * 17 + x) % 60) / 60; ctx.fillRect(x + _slHash(k + x) * w, solidTop - t * 30, 2, 2); }
  }

  function back(v) {
    // Rubble steps and the hanging slabs of half-erased buildings
    for (const R of ROUTES) {
      const [sx, sy, sw] = R.step, [lx, ly, lw] = R.slab;
      if (!_slVisible(v, sx - 40, lx + lw + 40)) continue;
      ctx.fillStyle = '#3a3e4c';
      ctx.beginPath(); ctx.moveTo(sx - 10, G); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx + sw - 8, sy + 4); ctx.lineTo(sx + sw + 10, G); ctx.fill();
      erased(lx + 4, 30, ly + 12, 60);
      erased(lx + lw - 34, 30, ly + 12, 80);
      ctx.fillStyle = '#4a4e5e'; ctx.fillRect(lx, ly, lw, 12);
      ctx.strokeStyle = 'rgba(190,210,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(lx + 10, 80, lw - 20, ly - 80);
    }
    // Sweep units: hovering erasure drones, beams lighting their zones
    for (const [x, r] of POSTS) {
      if (!_slVisible(v, x - r - 40, x + r + 40)) continue;
      const hy = 130 + Math.sin(frameCount * 0.03 + x) * 6;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x, hy, x, G);
      g.addColorStop(0, 'rgba(210,225,255,0.04)'); g.addColorStop(1, 'rgba(210,225,255,0.22)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 6, hy); ctx.lineTo(x + 6, hy); ctx.lineTo(x + r, G); ctx.lineTo(x - r, G); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#e8ecf8'; ctx.beginPath(); ctx.moveTo(x - 20, hy); ctx.lineTo(x, hy - 10); ctx.lineTo(x + 20, hy); ctx.lineTo(x, hy + 8); ctx.fill();
    }
    // The shelter: a lit doorway sunk in the last solid wall
    if (_slVisible(v, SHELTER - 300, SHELTER + 300)) {
      ctx.fillStyle = '#2a2e3e'; ctx.fillRect(SHELTER - 200, 120, 500, 320);
      ctx.fillStyle = '#0e1018'; ctx.fillRect(SHELTER - 40, 330, 80, 110);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(SHELTER, 390, 4, SHELTER, 390, 80);
      g.addColorStop(0, 'rgba(255,210,150,0.55)'); g.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = g; ctx.fillRect(SHELTER - 90, 310, 180, 140);
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3600, kind: 'asphalt', face: 'concrete' }]); }

  STORY_LEVELS[60] = {
    sky: ['#0c0e18', '#22283a'],
    groundColor: '#12141e',
    platColor: '#4a4e5e',
    layout, backdrop, back, surface,
  };
})();
