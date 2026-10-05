'use strict';
// js/story/levels/ch90.js — Chapter 90 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 90 — Into the Flux (walk → duel vs two Flux Drifters)
// Gravity Flux World. "The fracture opened sideways" — it lies on its side at
// the left edge. The world here has two grounds: the one under your feet and
// a second one hanging upside down overhead, its trees and rocks pointing
// down at you. Between them the loose things drift — boulders bobbing on the
// flux (the climbs move: one floats up and down, the next sways), a waterfall
// pouring upward off a ledge, dust motes that reverse direction every twelve
// seconds with the flux cycle. "The ground shifted. Then wasn't the ground
// anymore." The cache shafts are sinkholes where gravity pulled the earth out.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DUEL = 3000;
  const ROCKS = [[520, 350, 100, 0, 22], [660, 270, 110, 30, 0], [1150, 340, 110, 0, 26], [1290, 260, 110, 26, 0], [2230, 350, 100, 0, 20], [2360, 270, 110, 0, 24],
                 [3660, 350, 100, 0, 22], [3790, 270, 110, 28, 0], [5050, 340, 110, 0, 24], [5190, 260, 110, 26, 0]];
  const FALLS = [1450, 4200];
  const HOLES = [1800, 4680];

  // Flux cycle: 720 frames, matches the world's flip interval
  const flux = () => ((frameCount % 1440) < 720 ? 1 : -1);

  function layout() {
    const P = [];
    ROCKS.forEach(([x, y, w, ax, ay], i) => (ax || ay) ? _slMover(P, 'r' + i, x, y, w, ax, ay, 0.02, i) : _slLedge(P, x, y, w));
    _slLedge(P, DUEL - 340, 360, 100); _slLedge(P, DUEL + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1a26');
    // The upside-down ground overhead: a hanging crust with trees pointing down
    _slParallax(v, 0.3, (l, r) => {
      ctx.fillStyle = '#2a2e2c';
      ctx.beginPath(); ctx.moveTo(l - 40, -400);
      for (let x = Math.floor(l / 40) * 40 - 40; x <= r + 40; x += 40) ctx.lineTo(x, 60 + _slHash(Math.floor(x / 40) + 900) * 40);
      ctx.lineTo(r + 40, -400); ctx.closePath(); ctx.fill();
      for (let i = Math.floor(l / 160) - 1; i * 160 < r + 160; i++) {
        const x = i * 160 + _slHash(i + 901) * 80, y = 70 + _slHash(Math.floor(x / 40) + 900) * 30;
        ctx.fillStyle = '#3a3226'; ctx.fillRect(x - 4, y, 8, 40);
        ctx.fillStyle = '#2c4a3a'; ctx.beginPath(); ctx.arc(x, y + 60, 26, 0, Math.PI * 2); ctx.arc(x - 18, y + 48, 18, 0, Math.PI * 2); ctx.arc(x + 18, y + 50, 18, 0, Math.PI * 2); ctx.fill();
      }
    });
    // Dust motes that reverse with the flux
    const d = flux();
    for (let k = 0; k < 50; k++) {
      const y = ((_slHash(k + 902) * 520 - d * frameCount * (0.3 + _slHash(k) * 0.5)) % 520 + 520) % 520;
      ctx.fillStyle = 'rgba(170,200,230,0.35)'; ctx.fillRect(v.x + _slHash(k + 903) * v.w, y - 40, 2, 2);
    }
  }

  function back(v, a) {
    // The sideways fracture at the left edge
    if (_slVisible(v, 0, 260)) {
      ctx.save(); ctx.translate(130, 330); ctx.rotate(Math.PI / 2); _slPortal(0, 0, 60, 210, 90); ctx.restore();
    }
    // Waterfalls pouring upward off ledges of rock
    for (const fx of FALLS) {
      if (!_slVisible(v, fx - 60, fx + 60)) continue;
      ctx.fillStyle = '#4a4640'; ctx.fillRect(fx - 40, G - 30, 80, 30);
      const g = ctx.createLinearGradient(0, 0, 0, G - 30);
      g.addColorStop(0, 'rgba(150,200,240,0)'); g.addColorStop(1, 'rgba(150,200,240,0.55)');
      ctx.fillStyle = g; ctx.fillRect(fx - 18, 0, 36, G - 30);
      for (let k = 0; k < 6; k++) { const y = G - 30 - ((frameCount * 4 + k * 70) % (G - 30)); ctx.fillStyle = 'rgba(220,240,255,0.5)'; ctx.fillRect(fx - 14 + k * 5, y, 2, 18); }
    }
    // Drifting boulders (live positions)
    ROCKS.forEach(([x0, y0, w], i) => {
      const p = _slPlat(a, 'r' + i) || { x: x0, y: y0 };
      if (!_slVisible(v, p.x - 20, p.x + w + 20)) return;
      ctx.fillStyle = '#4a4640';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + w, p.y); ctx.lineTo(p.x + w - 12, p.y + 22); ctx.lineTo(p.x + w * 0.55, p.y + 40 + _slHash(i + 904) * 16); ctx.lineTo(p.x + 14, p.y + 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a6458'; ctx.fillRect(p.x, p.y, w, 4);
      ctx.fillStyle = 'rgba(120,180,255,0.25)'; ctx.beginPath(); ctx.ellipse(p.x + w / 2, p.y + 58, w * 0.3, 4, 0, 0, Math.PI * 2); ctx.fill();
    });
    // Duel ground: two leaning stones
    if (_slVisible(v, DUEL - 420, DUEL + 420)) for (const x of [DUEL - 340, DUEL + 240]) {
      ctx.fillStyle = '#4a4640'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#6a6458'; ctx.fillRect(x - 4, 356, 108, 8);
    }
    // Sinkholes over the cache shafts: earth torn upward
    for (const hx of HOLES) {
      if (!_slVisible(v, hx - 100, hx + 100)) continue;
      for (let k = 0; k < 8; k++) {
        const t = ((frameCount * 0.5 + k * 30) % 240) / 240;
        ctx.fillStyle = `rgba(74,70,64,${1 - t})`; ctx.fillRect(hx - 40 + _slHash(k + 905) * 80, G - t * 220, 6 + _slHash(k) * 6, 6);
      }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'rubble', face: 'soil' }]); }

  STORY_LEVELS[90] = {
    sky: ['#0e1a26', '#1a2e40', '#2c4658'],
    groundColor: '#2a2e2c',
    platColor: '#4a4640',
    layout, backdrop, back, surface,
  };
})();
