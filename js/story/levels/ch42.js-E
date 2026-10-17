'use strict';
// js/story/levels/ch42.js — Chapter 42 map. See smb-story-levels.js for the
// contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 42 — The Ice Dimension (walk → duel vs the Ice Dimension Elite)
// "The ice dimension was perfect. Not beautiful — perfect. Every surface was
// optimized. Every angle calculated." The ice here is cut, not frozen: the
// floor is polished plate that mirrors whoever stands on it, the cliffs are
// faceted prisms at exact angles, and the ledges are stepped crystal terraces
// in a strict 30-degree rhythm. "Their arenas were traps": the duel ground is
// a geometric bowl ringed with prism spikes. The Third Architect's summit
// watches from the far horizon. Cache shafts are crevasses.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, BOWL = 3000;
  const TERRACE = [[380, 350, 100], [480, 270, 100], [580, 190, 120], [1160, 350, 100], [1260, 270, 120],
                   [2240, 350, 100], [2340, 270, 110], [3660, 350, 100], [3760, 270, 100], [3860, 190, 130],
                   [5100, 350, 100], [5200, 270, 120]];
  const CREVASSE = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of TERRACE) _slLedge(P, x, y, w);
    _slLedge(P, BOWL - 340, 360, 90); _slLedge(P, BOWL + 250, 360, 90);
    return P;
  }

  function prism(x, base, w, h, seed) {
    const g = ctx.createLinearGradient(x, base - h, x + w, base);
    g.addColorStop(0, '#cfe6f6'); g.addColorStop(0.5, '#7aa6c8'); g.addColorStop(1, '#3a5a7a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w * 0.3, base - h); ctx.lineTo(x + w * 0.62, base - h * 0.86); ctx.lineTo(x + w, base); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, base - h); ctx.lineTo(x + w * 0.45, base); ctx.stroke();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c1a2a');
    _slParallax(v, 0.05, (l, r) => {
      // The Third Architect's summit, far off: a perfect spire on a perfect peak
      const sx = l + (r - l) * 0.78;
      ctx.fillStyle = '#9ab8d0';
      ctx.beginPath(); ctx.moveTo(sx - 260, 440); ctx.lineTo(sx, 60); ctx.lineTo(sx + 260, 440); ctx.fill();
      ctx.fillStyle = '#c8dcec'; ctx.beginPath(); ctx.moveTo(sx, 60); ctx.lineTo(sx + 40, 120); ctx.lineTo(sx - 40, 120); ctx.fill();
      ctx.fillStyle = '#e8f4ff'; ctx.fillRect(sx - 3, 10, 6, 52);
      ctx.fillStyle = `rgba(160,220,255,${0.5 + 0.4 * Math.sin(frameCount * 0.05)})`; ctx.fillRect(sx - 2, 6, 4, 4);
    });
    _slParallax(v, 0.25, (l, r) => {
      for (let i = Math.floor(l / 180) - 1; i * 180 < r + 180; i++) prism(i * 180 + _slHash(i) * 60, 440, 120 + _slHash(i + 1) * 80, 140 + _slHash(i + 2) * 160, i);
    });
  }

  function back(v) {
    // Calculated terraces: stepped crystal, exactly stacked
    for (const [x, y, w] of TERRACE) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = 'rgba(150,200,235,0.55)'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#d8eefc'; ctx.fillRect(x, y, w, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + w * 0.5, G); ctx.stroke();
    }
    // Measurement marks etched in the ice wall — the place is a calculation
    ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    for (let k = Math.floor((v.x - 100) / 600); k * 600 < v.x + v.w + 100; k++) {
      if (k < 0 || Math.abs(k * 600 + 300 - BOWL) < 400) continue;
      ctx.fillText(['θ = 30.000°', 'μ → 0.02', 'Δ = 0', 'opt: true'][k % 4], k * 600 + 300, 90);
      for (let t = 0; t < 10; t++) ctx.fillRect(k * 600 + 300 + t * 8, 100, 1, t % 5 ? 4 : 8);
    }
    // Crevasses over the cache shafts
    for (const cx of CREVASSE) {
      if (!_slVisible(v, cx - 90, cx + 90)) continue;
      prism(cx - 90, G, 40, 50, cx); prism(cx + 50, G, 40, 60, cx + 1);
    }
    // The bowl: geometric trap ringed by prism spikes, mirror floor
    if (_slVisible(v, BOWL - 520, BOWL + 520)) {
      for (let k = -4; k <= 4; k++) { if (k === 0) continue; prism(BOWL + k * 110 - 25, G, 50, 70 + Math.abs(k) * 22, k + 50); }
      for (const sx of [BOWL - 340, BOWL + 250]) { ctx.fillStyle = 'rgba(150,200,235,0.6)'; ctx.fillRect(sx, 360, 90, 80); ctx.fillStyle = '#d8eefc'; ctx.fillRect(sx, 360, 90, 5); }
      ctx.strokeStyle = 'rgba(200,235,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(BOWL, G, 360, 10, 0, Math.PI, 0); ctx.stroke();
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]);
    if (ph === 'front') {
      // The slab is ice too: frost the concrete face, floor by floor (shafts stay open)
      for (const fl of (a.platforms || []).filter(p => p.isFloor)) {
        const x0 = Math.max(fl.x, v.x - 20), x1 = Math.min(fl.x + fl.w, v.x + v.w + 20);
        if (x1 <= x0) continue;
        ctx.fillStyle = 'rgba(160,205,240,0.45)'; ctx.fillRect(x0, G + 10, x1 - x0, 110);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
        for (let k = Math.ceil(x0 / 140); k * 140 < x1; k++) { ctx.beginPath(); ctx.moveTo(k * 140, G + 12); ctx.lineTo(k * 140 + 40, G + 118); ctx.stroke(); }
      }
    }
    if (ph === 'back') {
      // Polished plate: a faint mirror sheen and cold glints over the tile
      ctx.fillStyle = 'rgba(200,230,255,0.22)'; ctx.fillRect(v.x - 20, G - 20, v.w + 40, 20);
      for (let k = Math.floor(v.x / 90); k * 90 < v.x + v.w; k++) {
        if (_slHash(k + 4) < 0.6) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(frameCount * 0.07 + k)})`; ctx.fillRect(k * 90 + _slHash(k) * 60, G - 12, 12, 1.5);
      }
    }
  }

  STORY_LEVELS[42] = {
    sky: ['#0c1a2a', '#4a6e8e'],
    groundColor: '#1a2a3a',
    platColor: '#7aa6c8',
    layout, backdrop, back, surface,
  };
})();
