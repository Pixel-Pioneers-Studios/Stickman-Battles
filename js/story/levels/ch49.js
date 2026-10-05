'use strict';
// js/story/levels/ch49.js — Chapter 49 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 49 — The Assembly (stealth)
// "The neutral dimension — the anchor point." A grey plain that belongs to no
// world: no sun, no weather, a flat sky the colour of paper, and standing
// monoliths of every faction's architecture planted as neutral markers. The
// Creator's scouts sweep it; each post's scan beam lights exactly its
// detection zone on the floor (detection sits at guard y = 395). Every post
// has a high route over it: a marker stone to step on, then a long lintel
// bridging two monoliths clear of the zone. The Assembly Hall — a ring of
// seats under an open dome, the four Architects' colours on its pillars — is
// the far end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const POSTS = [[750, 85], [1200, 90], [1900, 100], [2600, 90], [3200, 100]];   // mirrors stealthGuardDefs
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], lintel: [x - r - 90, 270, 2 * r + 180] }));
  const HALL = 3500;

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.lintel); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#9a9a9e');
    _slParallax(v, 0.1, (l, r) => {
      // Neutral markers far off: silhouettes of every faction's architecture
      for (let i = Math.floor(l / 160) - 1; i * 160 < r + 160; i++) {
        const x = i * 160 + _slHash(i) * 60, h = 60 + _slHash(i + 1) * 120, kind = Math.floor(_slHash(i + 2) * 3);
        ctx.fillStyle = 'rgba(110,110,118,0.6)';
        if (kind === 0) ctx.fillRect(x, 440 - h, 26, h);
        else if (kind === 1) { ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x + 20, 440 - h); ctx.lineTo(x + 40, 440); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(x + 20, 440 - h * 0.5, h * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + 16, 440 - h * 0.5, 8, h * 0.5); }
      }
    });
  }

  function back(v) {
    // Lintel routes: marker stone, two monoliths, a slab across them
    for (const R of ROUTES) {
      const [sx, sy, sw] = R.step, [lx, ly, lw] = R.lintel;
      if (!_slVisible(v, sx - 20, lx + lw + 20)) continue;
      ctx.fillStyle = '#6a6a72'; ctx.fillRect(sx, sy, sw, G - sy);
      ctx.fillStyle = '#7e7e86'; ctx.fillRect(sx, sy, sw, 4);
      ctx.fillStyle = '#5a5a62'; ctx.fillRect(lx + 6, ly + 12, 26, G - ly - 12); ctx.fillRect(lx + lw - 32, ly + 12, 26, G - ly - 12);
      ctx.fillStyle = '#74747c'; ctx.fillRect(lx, ly, lw, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(lx, ly, lw, 2);
    }
    // Scout posts: a hovering scan drone whose beam lights its detection zone
    for (const [x, r] of POSTS) {
      if (!_slVisible(v, x - r - 40, x + r + 40)) continue;
      const hy = 150 + Math.sin(frameCount * 0.03 + x) * 6;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x, hy, x, G);
      g.addColorStop(0, 'rgba(255,220,120,0.05)'); g.addColorStop(1, 'rgba(255,220,120,0.22)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 8, hy); ctx.lineTo(x + 8, hy); ctx.lineTo(x + r, G); ctx.lineTo(x - r, G); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#3a3a48'; ctx.beginPath(); ctx.ellipse(x, hy, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffcc44'; ctx.fillRect(x - 3, hy + 3, 6, 3);
    }
    // The Assembly Hall: ring of seats under an open dome, Architects' colours
    if (_slVisible(v, HALL - 300, HALL + 400)) {
      ctx.fillStyle = '#7a7a82'; ctx.fillRect(HALL - 220, 160, 440, 280);
      ctx.fillStyle = '#8a8a92'; ctx.beginPath(); ctx.arc(HALL, 160, 220, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#9a9a9e'; ctx.beginPath(); ctx.arc(HALL, 160, 60, Math.PI, 0); ctx.fill();
      const COLS = ['#88aacc', '#88cc66', '#88ccff', '#ccaa66'];
      for (let k = 0; k < 4; k++) {
        const px = HALL - 180 + k * 120;
        ctx.fillStyle = '#5a5a62'; ctx.fillRect(px - 14, 180, 28, 260);
        ctx.fillStyle = COLS[k]; ctx.fillRect(px - 14, 200, 28, 8);
      }
      ctx.fillStyle = '#2a2a32'; ctx.fillRect(HALL - 50, 320, 100, 120);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.fillRect(HALL - 46, 324, 92, 116);
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4000, kind: 'sidewalk', face: 'concrete' }]); }

  STORY_LEVELS[49] = {
    sky: ['#8a8a90', '#b4b4b8'],
    groundColor: '#5a5a62',
    platColor: '#74747c',
    layout, backdrop, back, surface,
  };
})();
