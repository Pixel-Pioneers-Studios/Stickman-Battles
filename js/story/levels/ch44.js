'use strict';
// js/story/levels/ch44.js — Chapter 44 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 44 — The Fragment Breathes (escape)
// "A fracture pressure wave is sweeping the ice dimension from behind." The
// approach to the summit is an ice shelf, and the wave has already broken it
// into floes over a fracture chasm glowing violet below. Floes ride at
// slightly different heights with short gaps (one jump each — the wave
// punishes hesitation, not precision). Frozen pressure ridges stand on the
// floes as cover and high steps. The Summit Refuge is a lit shelter cut into
// the cliff at the far end; the summit spire of chapter 43 rises behind it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOES = [[0, 560, 440], [640, 1100, 430], [1180, 1500, 450], [1580, 1900, 440], [1980, 2500, 420],
                 [2580, 2950, 445], [3030, 3450, 430], [3530, 4400, 440]];
  const RIDGES = [[300, 360, 90], [860, 345, 100], [1320, 370, 90], [1720, 355, 100], [2200, 330, 110], [2740, 360, 90], [3200, 345, 110], [3800, 355, 100]];
  const REFUGE = 4050;

  function floor() { return FLOES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of RIDGES) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c1828');
    _slParallax(v, 0.06, (l, r) => {
      // Summit spire far right, the sky cracked by the wave
      const sx = l + (r - l) * 0.8;
      ctx.fillStyle = '#8aa8c4'; ctx.beginPath(); ctx.moveTo(sx - 300, 460); ctx.lineTo(sx, 40); ctx.lineTo(sx + 300, 460); ctx.fill();
      ctx.fillStyle = '#d8eaf8'; ctx.beginPath(); ctx.moveTo(sx, 40); ctx.lineTo(sx + 50, 110); ctx.lineTo(sx - 50, 110); ctx.fill();
      _slSkyCrack([[l + 60, -60], [l + 140, 20], [l + 120, 90], [l + 220, 160]], 0.5);
    });
    // The chasm: violet fracture light far below the floes
    _slParallax(v, 0.2, (l, r) => {
      const g = ctx.createLinearGradient(0, 470, 0, 640);
      g.addColorStop(0, 'rgba(60,40,120,0)'); g.addColorStop(1, 'rgba(150,90,255,0.45)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, 470, r - l + 40, 200);
    });
  }

  function back(v) {
    // The pressure wave behind you: a moving front of shattered light at the left edge of the view
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const wg = ctx.createLinearGradient(v.x, 0, v.x + 160, 0);
    wg.addColorStop(0, `rgba(170,200,255,${0.25 + 0.1 * Math.sin(frameCount * 0.2)})`); wg.addColorStop(1, 'rgba(170,200,255,0)');
    ctx.fillStyle = wg; ctx.fillRect(v.x, v.y, 160, v.h);
    ctx.restore();
    // Pressure ridges: jagged frozen upthrusts on the floes
    for (const [x, y, w] of RIDGES) {
      if (!_slVisible(v, x - 30, x + w + 30)) continue;
      const fl = FLOES.find(([a, b]) => x >= a && x < b);
      const base = fl ? fl[2] : 440;
      ctx.fillStyle = '#9ab8d2';
      ctx.beginPath(); ctx.moveTo(x - 20, base); ctx.lineTo(x, y + 4); ctx.lineTo(x + w * 0.4, y - 6); ctx.lineTo(x + w, y + 2); ctx.lineTo(x + w + 20, base); ctx.fill();
      ctx.fillStyle = '#e8f4fc'; ctx.fillRect(x, y, w, 4);
    }
    // The Summit Refuge: a lit shelter cut into the cliff
    if (_slVisible(v, REFUGE - 300, REFUGE + 400)) {
      // The cliff the refuge is cut into: jagged rock face, snow on its ledges
      ctx.fillStyle = '#6a86a0';
      ctx.beginPath(); ctx.moveTo(REFUGE + 440, 460); ctx.lineTo(REFUGE - 150, 460);
      for (let k = 0; k <= 12; k++) ctx.lineTo(REFUGE - 160 + (k % 2 ? 26 : 0) + _slHash(k + 44) * 30, 440 - k * 50);
      ctx.lineTo(REFUGE + 440, 440 - 12 * 50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8f4fc';
      for (let k = 1; k < 12; k += 2) ctx.fillRect(REFUGE - 150 + _slHash(k + 44) * 30, 440 - k * 50 - 4, 60 + _slHash(k) * 60, 5);
      ctx.fillStyle = 'rgba(40,60,90,0.25)';
      for (let k = 0; k < 9; k++) ctx.fillRect(REFUGE - 80 + _slHash(k + 7) * 480, 120 + _slHash(k + 8) * 160, 3, 40 + _slHash(k) * 60);
      ctx.fillStyle = '#2a3a4a'; ctx.fillRect(REFUGE - 60, 320, 120, 120);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(REFUGE, 380, 4, REFUGE, 380, 110);
      g.addColorStop(0, 'rgba(255,220,160,0.7)'); g.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = g; ctx.fillRect(REFUGE - 120, 280, 240, 180);
      ctx.restore();
      ctx.fillStyle = '#e8f4fc'; ctx.fillRect(REFUGE - 70, 314, 140, 6);
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < FLOES.length; i++) {
      const [x0, x1, y] = FLOES[i];
      if (_slVisible(v, x0 - 20, x1 + 20)) _slIsland(x0, x1, y, 'snow', ph, i * 31);
    }
  }

  STORY_LEVELS[44] = {
    sky: ['#0c1828', '#3a5878'],
    groundColor: '#0c1020',
    platColor: '#9ab8d2',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
