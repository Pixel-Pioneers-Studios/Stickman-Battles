'use strict';
// js/story/levels/ch91.js — Chapter 91 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 91 — Drifters in the Flux (walk → duel vs the Flux Veterans)
// The Mid-Zone, deeper into the flux, where the Veterans have trained for
// decades. The ground here is anchored by flux pylons — standing stones with
// rings of light turning around them, reversing with every inversion — and
// the Veterans' training ground at the midpoint is built in three tiers
// "spaced so that when gravity flipped, at least two were already in a
// dominant position": a low step, a mid ledge and a high perch either side.
// Overhead the hanging ground is closer now, and chunks of it have fallen
// halfway and stopped. The axis corridor ("ahead") glows at the far end. The
// cache shafts are flux wells, the air above them shimmering upward.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DUEL = 3000, AXIS = 5650;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1180, 340, 110], [1310, 260, 110], [2200, 350, 100], [2330, 270, 110],
                 [3680, 350, 100], [3810, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const TIERS = [[DUEL - 360, 360, 110], [DUEL - 250, 280, 100], [DUEL - 140, 200, 90], [DUEL + 250, 360, 110], [DUEL + 150, 280, 100], [DUEL + 50, 200, 90]];
  const PYLONS = [380, 950, 1550, 2550, 3450, 4100, 4950, 5450];
  const WELLS = [1800, 4680];
  const flux = () => ((frameCount % 1440) < 720 ? 1 : -1);

  function layout() {
    const P = [];
    for (const [x, y, w] of [...CLIMB, ...TIERS]) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1a26');
    _slParallax(v, 0.35, (l, r) => {
      ctx.fillStyle = '#2a2e2c';
      ctx.beginPath(); ctx.moveTo(l - 40, -400);
      for (let x = Math.floor(l / 40) * 40 - 40; x <= r + 40; x += 40) ctx.lineTo(x, 50 + _slHash(Math.floor(x / 40) + 910) * 50);
      ctx.lineTo(r + 40, -400); ctx.closePath(); ctx.fill();
      // Chunks that fell halfway and stopped
      for (let i = Math.floor(l / 260) - 1; i * 260 < r + 260; i++) {
        const x = i * 260 + _slHash(i + 911) * 120, y = 140 + _slHash(i + 912) * 120 + Math.sin(frameCount * 0.01 + i) * 6;
        ctx.fillStyle = '#34383a';
        ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x + 40, y - 6); ctx.lineTo(x + 30, y + 30); ctx.lineTo(x - 26, y + 26); ctx.closePath(); ctx.fill();
      }
    });
  }

  function pylon(x) {
    ctx.fillStyle = '#4a4640';
    ctx.beginPath(); ctx.moveTo(x - 16, G); ctx.lineTo(x - 10, G - 190); ctx.lineTo(x + 10, G - 196); ctx.lineTo(x + 16, G); ctx.fill();
    const d = flux();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const y = G - 60 - k * 50, a = frameCount * 0.04 * d + k;
      ctx.strokeStyle = 'rgba(100,170,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x, y, 30, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(180,220,255,0.9)'; ctx.fillRect(x + Math.cos(a) * 30 - 2, y + Math.sin(a) * 7 - 2, 4, 4);
    }
    ctx.restore();
  }

  function back(v) {
    for (const x of PYLONS) if (_slVisible(v, x - 40, x + 40)) pylon(x);
    for (const [x, y, w] of [...CLIMB, ...TIERS]) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#3e3a36'; ctx.fillRect(x + w / 2 - 6, y + 10, 12, G - y - 10);
      ctx.fillStyle = '#4a4640';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 10, y + 16); ctx.lineTo(x + 10, y + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a6458'; ctx.fillRect(x, y, w, 4);
    }
    // The training ground: scuffed circle where the Veterans drill
    if (_slVisible(v, DUEL - 400, DUEL + 400)) {
      ctx.strokeStyle = 'rgba(100,170,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(DUEL, G - 3, 220, 6, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Flux wells over the cache shafts
    for (const wx of WELLS) {
      if (!_slVisible(v, wx - 80, wx + 80)) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 10; k++) {
        const t = ((frameCount * 1.2 + k * 25) % 250) / 250;
        ctx.fillStyle = `rgba(120,180,255,${0.4 * (1 - t)})`; ctx.fillRect(wx - 40 + _slHash(k + 913) * 80, G - t * 260, 2, 10);
      }
      ctx.restore();
    }
    // The axis corridor ahead: a horizontal seam of light
    if (_slVisible(v, AXIS - 400, AXIS + 400)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 220, 0, 300);
      g.addColorStop(0, 'rgba(100,170,255,0)'); g.addColorStop(0.5, `rgba(160,210,255,${0.45 + 0.15 * Math.sin(frameCount * 0.05)})`); g.addColorStop(1, 'rgba(100,170,255,0)');
      ctx.fillStyle = g; ctx.fillRect(AXIS - 400, 220, 800, 80);
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'rubble', face: 'soil' }]); }

  STORY_LEVELS[91] = {
    sky: ['#0e1a26', '#1a2e40', '#2c4658'],
    groundColor: '#2a2e2c',
    platColor: '#4a4640',
    layout, backdrop, back, surface,
  };
})();
