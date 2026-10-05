'use strict';
// js/story/levels/ch50.js — Chapter 50 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 50 — The Probe (walk → duel vs the Creator's Probe)
// The neutral dimension's entry point, where the probe "materialized at the
// perimeter. Smooth. Uniform. No face." The same paper-grey plain as the
// assembly approach (chapter 49), here ringed by the boundary stones that
// mark where the neutral ground begins. The probe measures: a calibration
// grid is laid over the ground where it waits, and scan lines sweep the air.
// "One of us fights it. Alone." The Architects watch from a low rise behind
// the duel ground — four figures in their colours. The cache shafts are
// survey bores in the plain.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DUEL = 3000;
  const STONES = [[420, 350, 100], [540, 270, 110], [1150, 340, 120], [1290, 260, 100], [2240, 350, 100], [2360, 270, 120],
                  [3640, 350, 100], [3760, 270, 120], [5080, 340, 110], [5220, 260, 110]];
  const RISE = { x: DUEL + 380, w: 260, y: 360 };
  const ARCH_COL = ['#88aacc', '#88cc66', '#88ccff', '#ccaa66'];
  const BORES = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of STONES) _slLedge(P, x, y, w);
    _slLedge(P, DUEL - 360, 360, 90);
    _slLedge(P, RISE.x, RISE.y, RISE.w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#9a9a9e');
    _slParallax(v, 0.08, (l, r) => {
      for (let i = Math.floor(l / 200) - 1; i * 200 < r + 200; i++) {
        const x = i * 200 + _slHash(i + 50) * 80, h = 50 + _slHash(i + 51) * 90;
        ctx.fillStyle = 'rgba(115,115,122,0.55)'; ctx.fillRect(x, 440 - h, 20 + _slHash(i) * 20, h);
      }
    });
  }

  function back(v, a) {
    // Boundary stones: plain grey monoliths, the high route
    for (const [x, y, w] of STONES) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#6a6a72'; ctx.fillRect(x + 8, y, w - 16, G - y);
      ctx.fillStyle = '#7e7e86'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 8, y + 8, 3, G - y - 8);
    }
    // Survey bores over the cache shafts
    for (const bx of BORES) if (_slVisible(v, bx - 80, bx + 80)) {
      ctx.fillStyle = '#5a5a62'; ctx.fillRect(bx - 60, G - 14, 12, 14); ctx.fillRect(bx + 48, G - 14, 12, 14);
      ctx.fillStyle = '#ffcc44'; ctx.fillRect(bx - 58, G - 18, 8, 4); ctx.fillRect(bx + 50, G - 18, 8, 4);
    }
    // The calibration grid where the probe waits, scan lines sweeping
    if (_slVisible(v, DUEL - 500, DUEL + 700)) {
      ctx.strokeStyle = 'rgba(80,90,120,0.35)'; ctx.lineWidth = 1;
      for (let gx = DUEL - 400; gx <= DUEL + 400; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, G - 300); ctx.lineTo(gx, G); ctx.stroke(); }
      for (let gy = G - 300; gy <= G; gy += 40) { ctx.beginPath(); ctx.moveTo(DUEL - 400, gy); ctx.lineTo(DUEL + 400, gy); ctx.stroke(); }
      const sy = G - 300 + ((frameCount * 2) % 300);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(140,200,255,0.35)'; ctx.fillRect(DUEL - 400, sy, 800, 2);
      const sx = DUEL - 400 + ((frameCount * 3) % 800);
      ctx.fillStyle = 'rgba(140,200,255,0.25)'; ctx.fillRect(sx, G - 300, 2, 300);
      ctx.restore();
      ctx.fillStyle = 'rgba(60,70,100,0.6)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
      ctx.fillText('SUBJECT: KAEL   SAMPLES ' + (frameCount % 9999), DUEL - 396, G - 306);
      ctx.fillStyle = '#6a6a72'; ctx.fillRect(DUEL - 360, 360, 90, G - 360); ctx.fillStyle = '#7e7e86'; ctx.fillRect(DUEL - 360, 360, 90, 6);
      // The Architects' rise and the four who watch
      ctx.fillStyle = '#74747c'; ctx.beginPath(); ctx.moveTo(RISE.x - 40, G); ctx.lineTo(RISE.x, RISE.y); ctx.lineTo(RISE.x + RISE.w, RISE.y); ctx.lineTo(RISE.x + RISE.w + 40, G); ctx.fill();
      ctx.fillStyle = '#8a8a92'; ctx.fillRect(RISE.x, RISE.y, RISE.w, 5);
      for (let k = 0; k < 4; k++) {
        const fx = RISE.x + 50 + k * 55;
        ctx.strokeStyle = ARCH_COL[k]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx, RISE.y - 56, 7, 0, Math.PI * 2);
        ctx.moveTo(fx, RISE.y - 49); ctx.lineTo(fx, RISE.y - 22); ctx.lineTo(fx - 7, RISE.y); ctx.moveTo(fx, RISE.y - 22); ctx.lineTo(fx + 7, RISE.y); ctx.stroke();
      }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'sidewalk', face: 'concrete' }]); }

  STORY_LEVELS[50] = {
    sky: ['#8a8a90', '#b4b4b8'],
    groundColor: '#5a5a62',
    platColor: '#74747c',
    layout, backdrop, back, surface,
  };
})();
