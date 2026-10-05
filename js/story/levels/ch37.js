'use strict';
// js/story/levels/ch37.js — Chapter 37 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 37 — Resonance Spike (walk → duel vs the Resonance Fighter)
// "The fragment has to be pushed past its baseline." The resonance chamber is
// a long instrument: ranks of giant tuning forks line the approach, each
// humming at a frequency you can see as rings in the air; their prongs carry
// standable crossbars. The fighter is calibrated in the chamber's heart — a
// circular sounding floor under a suspended bell of crystal — and when the
// fragment spikes, "the air bends": the rings there warp toward you. Cache
// shafts are the forks' sounding pits.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, HEART = 3000;
  const FORKS = [520, 1150, 1420, 2250, 3750, 4100, 5100, 5400];
  const BARS = [[490, 330, 60], [1120, 300, 60], [1390, 340, 60], [2220, 320, 60], [3720, 330, 60], [4070, 300, 60], [5070, 340, 60], [5370, 300, 60]];
  const HIGH = [[600, 240, 140], [1220, 220, 140], [3820, 230, 160], [5180, 220, 150]];
  const PITS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of BARS) _slLedge(P, x, y, w);
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    _slLedge(P, HEART - 360, 350, 90); _slLedge(P, HEART + 270, 350, 90);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080410');
    _slParallax(v, 0.1, (l, r) => {
      // The chamber's far wall: a pipe organ of resonance tubes
      for (let i = Math.floor(l / 40); i * 40 < r; i++) {
        const h = 160 + 140 * Math.abs(Math.sin(i * 0.37));
        ctx.fillStyle = i % 2 ? '#1a1228' : '#1e1430';
        ctx.fillRect(i * 40, 380 - h, 30, h + 200);
        ctx.fillStyle = 'rgba(220,150,255,0.18)'; ctx.fillRect(i * 40 + 4, 380 - h, 4, h);
      }
    });
  }

  function rings(x, y, n, hue, warp) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < n; k++) {
      const t = ((frameCount * 0.6 + k * (60 / n)) % 60) / 60;
      ctx.strokeStyle = `hsla(${hue},90%,75%,${0.35 * (1 - t)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, Math.max(4, 20 + t * 110 + warp * Math.sin(frameCount * 0.3 + k) * 10), (20 + t * 110) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function back(v) {
    // Tuning forks: stem, two prongs, a crossbar on the prongs, visible hum
    for (let i = 0; i < FORKS.length; i++) {
      const fx = FORKS[i];
      if (!_slVisible(v, fx - 160, fx + 160)) continue;
      const [bx, by, bw] = BARS[i];
      ctx.fillStyle = '#2e2242'; ctx.fillRect(fx - 8, by + 70, 16, G - by - 70);
      ctx.fillRect(fx - 40, G - 12, 80, 12);
      const sway = Math.sin(frameCount * 0.6 + i) * 1.2;
      ctx.fillStyle = '#3e2e58';
      ctx.fillRect(fx - 26 + sway, by - 70, 10, 150); ctx.fillRect(fx + 16 - sway, by - 70, 10, 150);
      ctx.fillRect(fx - 26, by + 64, 52, 14);
      ctx.fillStyle = '#4e3a70'; ctx.fillRect(bx, by, bw, 8);
      rings(fx, by - 20, 4, 280 + i * 8, 0);
    }
    for (const [x, y, w] of HIGH) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#3e2e58'; ctx.fillRect(x, y, w, 8);
      ctx.strokeStyle = '#2e2242'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, v.y - 10); ctx.moveTo(x + w - 6, y); ctx.lineTo(x + w - 6, v.y - 10); ctx.stroke();
    }
    // Sounding pits over the cache shafts
    for (const px of PITS) if (_slVisible(v, px - 80, px + 80)) { ctx.fillStyle = '#3e2e58'; ctx.fillRect(px - 60, G - 16, 10, 16); ctx.fillRect(px + 50, G - 16, 10, 16); rings(px, G - 10, 3, 300, 0); }
    // The heart: sounding floor under a suspended crystal bell; the air bends
    if (_slVisible(v, HEART - 520, HEART + 520)) {
      const fight = typeof exploreArenaLock !== 'undefined' && exploreArenaLock ? 1 : 0;
      ctx.strokeStyle = '#2e2242'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(HEART, v.y - 10); ctx.lineTo(HEART, G - 330); ctx.stroke();
      ctx.fillStyle = '#5a4080';
      ctx.beginPath(); ctx.moveTo(HEART - 50, G - 230); ctx.quadraticCurveTo(HEART - 46, G - 330, HEART, G - 334); ctx.quadraticCurveTo(HEART + 46, G - 330, HEART + 50, G - 230); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createRadialGradient(HEART, G - 270, 4, HEART, G - 270, 90);
      bg.addColorStop(0, 'rgba(255,200,255,0.55)'); bg.addColorStop(1, 'rgba(200,100,255,0)');
      ctx.fillStyle = bg; ctx.fillRect(HEART - 100, G - 370, 200, 200);
      ctx.restore();
      rings(HEART, G - 130, 7, 300, 1 + fight * 4);
      for (const sx of [HEART - 360, HEART + 270]) { ctx.fillStyle = '#3e2e58'; ctx.fillRect(sx, 350, 90, 10); ctx.fillStyle = '#2e2242'; ctx.fillRect(sx + 35, 360, 20, G - 360); }
      ctx.strokeStyle = 'rgba(220,160,255,0.35)'; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.ellipse(HEART, G, k * 80, 5 + k, 0, Math.PI, 0); ctx.stroke(); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[37] = {
    sky: ['#080410', '#1c0e2c'],
    groundColor: '#0e0818',
    platColor: '#3e2e58',
    layout, backdrop, back, surface,
  };
})();
