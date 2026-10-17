'use strict';
// js/story/levels/ch33.js — Chapter 33 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 33 — The Orbital Duel (walk → duel vs two Stolen Champions)
// Segment 2 of the Multiversal Core region (local 0..6000, geometry from `a`).
// "The orbital ring circled the core's eye." The walkway is the inner face of
// a vast ring: its far arc climbs the sky behind you, the core's eye burns
// below the horizon, and strut gantries make the high route. Two champions
// wait on the docking cradle at the midpoint, tethered to it by chains of
// stolen fragment light — "Release us. Destroy what holds us." The cache
// shafts are maintenance hatches into the ring's hull.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DOCK = 3000;
  const GANTRY = [[420, 350, 90], [540, 270, 140], [1150, 340, 110], [1290, 260, 120], [2250, 340, 100], [2380, 260, 120],
                  [3600, 340, 100], [3740, 260, 130], [5150, 340, 100], [5290, 260, 140]];
  const CRADLE = [[DOCK - 330, 360, 90], [DOCK + 240, 360, 90]];
  const HATCH = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of GANTRY) _slLedge(P, x, y, w);
    for (const [x, y, w] of CRADLE) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slParallax(v, 0.04, (l, r) => {
      ctx.fillStyle = 'rgba(220,210,255,0.55)';
      for (let i = Math.floor(l / 26); i * 26 < r; i++) if (_slHash(i + 13) < 0.3) ctx.fillRect(i * 26 + _slHash(i) * 20, -300 + _slHash(i + 4) * 700, 1.2, 1.2);
      // The core's eye, half-risen over the ring's horizon
      const cx = l + (r - l) * 0.5;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, 330, 20, cx, 330, 520);
      g.addColorStop(0, 'rgba(200,150,255,0.55)'); g.addColorStop(0.4, 'rgba(120,60,220,0.25)'); g.addColorStop(1, 'rgba(60,20,120,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 520, -200, 1040, 640);
      ctx.restore();
      ctx.fillStyle = '#1a0e2e'; ctx.beginPath(); ctx.arc(cx, 400, 230, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(220,180,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, 400, 230, Math.PI, 0); ctx.stroke();
    });
    // The ring's far arc, climbing the sky — the walkway you are on, seen from across
    _slParallax(v, 0.12, (l, r) => {
      const cx = l + (r - l) * 0.5;
      ctx.strokeStyle = '#2a2040'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.ellipse(cx, 560, 1300, 380, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,170,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 560, 1288, 368, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      for (let k = 0; k < 28; k++) {
        const a = Math.PI * 1.08 + k / 28 * Math.PI * 0.84;
        ctx.fillStyle = (k + (frameCount >> 4)) % 7 ? 'rgba(255,230,180,0.35)' : 'rgba(255,230,180,0.9)';
        ctx.fillRect(cx + Math.cos(a) * 1300 - 2, 560 + Math.sin(a) * 380 - 2, 4, 4);
      }
    });
  }

  function back(v) {
    // Ring hull: ribbed inner wall behind the walkway
    const x0 = Math.max(-400, v.x - 40), x1 = Math.min(6400, v.x + v.w + 40);
    ctx.fillStyle = '#140e20'; ctx.fillRect(x0, G - 120, x1 - x0, 120);
    for (let px = Math.floor(x0 / 150) * 150; px < x1; px += 150) {
      ctx.fillStyle = '#20182e'; ctx.fillRect(px, G - 120, 10, 120);
      ctx.fillStyle = 'rgba(255,220,170,0.5)'; ctx.fillRect(px + 60, G - 100, 24, 4);
    }
    ctx.fillStyle = '#2a2040'; ctx.fillRect(x0, G - 124, x1 - x0, 4);
    // Strut gantries
    for (const [x, y, w] of GANTRY) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.strokeStyle = '#2e2444'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + w - 8, G); ctx.moveTo(x + w - 8, y + 8); ctx.lineTo(x + 8, G); ctx.stroke();
      ctx.fillStyle = '#3a2e56'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = 'rgba(255,220,170,0.6)'; ctx.fillRect(x + 4, y + 8, w - 8, 2);
    }
    // Maintenance hatches over the cache shafts
    for (const hx of HATCH) {
      if (!_slVisible(v, hx - 80, hx + 80)) continue;
      ctx.fillStyle = '#3a2e56'; ctx.fillRect(hx - 62, G - 8, 12, 8); ctx.fillRect(hx + 50, G - 8, 12, 8);
      ctx.fillStyle = '#ffcc55'; for (let k = 0; k < 4; k++) ctx.fillRect(hx - 60 + k * 30, G - 30, 14, 4);
    }
    // Docking cradle: the champions' post, chained to it by stolen fragment light
    if (_slVisible(v, DOCK - 600, DOCK + 600)) {
      ctx.fillStyle = '#20182e';
      ctx.beginPath(); ctx.moveTo(DOCK - 380, G); ctx.lineTo(DOCK - 300, G - 260); ctx.lineTo(DOCK + 300, G - 260); ctx.lineTo(DOCK + 380, G); ctx.fill();
      ctx.fillStyle = '#2e2444'; ctx.fillRect(DOCK - 300, G - 268, 600, 10);
      for (const [x, y, w] of CRADLE) { ctx.fillStyle = '#3a2e56'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = '#20182e'; ctx.fillRect(x + w / 2 - 6, y + 10, 12, G - y - 10); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 2; s++) {
        const ax = DOCK + (s ? 120 : -120);
        for (let k = 0; k < 9; k++) {
          const t = k / 8, wob = Math.sin(frameCount * 0.05 + k + s * 2) * 6;
          ctx.strokeStyle = `rgba(200,110,255,${0.55 - t * 0.25})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(ax + wob, G - 250 + t * 200, 6, 10, 0.4, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(220,190,255,0.45)'; ctx.font = 'italic 10px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('release us', DOCK, G - 276);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -400, x1: 6400, kind: 'tile', face: 'concrete' }]);
  }

  STORY_LEVELS[33] = {
    sky: ['#04020c', '#140a2a'],
    groundColor: '#0e0818',
    platColor: '#3a2e56',
    layout, backdrop, back, surface,
  };
})();
