'use strict';
// js/story/levels/ch64.js — Chapter 64 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 64 — The Enforcer (walk → duel vs the Enforcer)
// The Gate: the threshold of the Creator's domain, built in its white,
// faceless geometry. A processional avenue of pylons — each a smooth white
// slab with a seam of light — leads to the plaza where the Enforcer waits;
// the plaza floor is scorched with the outlines of the fighters "I've seen
// records of what it does." Beyond, the Gate itself fills the end of the map:
// two doors taller than the sky, a line of light where they meet. Pylon
// plinths are the climbs; the cache shafts are seams in the white paving.
// One life: no falls here, only the plinths.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, PLAZA = 3000, GATE = 5650;
  const PLINTH = [[420, 350, 100], [540, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                  [3660, 350, 100], [3780, 270, 110], [4960, 340, 110], [5090, 260, 110]];
  const PYLONS = [700, 1000, 1450, 2050, 2500, 3500, 4000, 4350, 4800];
  const SEAMS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of PLINTH) _slLedge(P, x, y, w);
    _slLedge(P, PLAZA - 340, 360, 100); _slLedge(P, PLAZA + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1a1a22');
    _slParallax(v, 0.06, (l, r) => {
      const g = ctx.createLinearGradient(0, -200, 0, 440);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(230,232,240,0.25)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, -200, r - l + 40, 640);
    });
    _slParallax(v, 0.2, (l, r) => {
      for (let i = Math.floor(l / 180) - 1; i * 180 < r + 180; i++) {
        const x = i * 180 + _slHash(i + 64) * 60, h = 180 + _slHash(i + 65) * 140;
        ctx.fillStyle = 'rgba(200,202,212,0.25)';
        ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x + 20, 440 - h); ctx.lineTo(x + 40, 440); ctx.fill();
      }
    });
  }

  function back(v) {
    // The processional pylons: smooth white slabs with a seam of light
    for (const px of PYLONS) {
      if (!_slVisible(v, px - 40, px + 40)) continue;
      ctx.fillStyle = '#d8dae2'; ctx.fillRect(px - 22, G - 300, 44, 300);
      ctx.fillStyle = '#b8bac4'; ctx.fillRect(px + 12, G - 300, 10, 300);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.3 * Math.sin(frameCount * 0.04 + px)})`; ctx.fillRect(px - 2, G - 290, 4, 270);
      ctx.restore();
    }
    for (const [x, y, w] of PLINTH) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#c8cad4'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#e8eaf2'; ctx.fillRect(x, y, w, 6);
    }
    for (const sx of SEAMS) if (_slVisible(v, sx - 80, sx + 80)) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(sx - 70, G - 3, 24, 3); ctx.fillRect(sx + 46, G - 3, 24, 3); }
    // The plaza: scorched outlines of the fighters it has ended
    if (_slVisible(v, PLAZA - 500, PLAZA + 500)) {
      for (let k = 0; k < 6; k++) {
        const fx = PLAZA - 260 + k * 104 + _slHash(k) * 30, rot = (_slHash(k + 4) - 0.5) * 1.6;
        ctx.save(); ctx.translate(fx, G - 6); ctx.scale(1, 0.18); ctx.rotate(rot);
        ctx.strokeStyle = 'rgba(30,28,34,0.55)'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, -60, 10, 0, Math.PI * 2); ctx.moveTo(0, -50); ctx.lineTo(0, -10); ctx.lineTo(-12, 20); ctx.moveTo(0, -10); ctx.lineTo(12, 20); ctx.moveTo(-18, -38); ctx.lineTo(18, -30); ctx.stroke();
        ctx.restore();
      }
      for (const sx of [PLAZA - 340, PLAZA + 240]) { ctx.fillStyle = '#c8cad4'; ctx.fillRect(sx, 360, 100, G - 360); ctx.fillStyle = '#e8eaf2'; ctx.fillRect(sx, 360, 100, 6); }
    }
    // The Gate: two doors taller than the sky, light where they meet
    if (_slVisible(v, GATE - 500, GATE + 400)) {
      ctx.fillStyle = '#e0e2ea'; ctx.fillRect(GATE - 420, v.y - 20, 400, G - v.y + 20);
      ctx.fillStyle = '#d0d2dc'; ctx.fillRect(GATE + 20, v.y - 20, 400, G - v.y + 20);
      ctx.strokeStyle = 'rgba(160,162,176,0.5)'; ctx.lineWidth = 2;
      for (let y = G - 60; y > v.y; y -= 120) { ctx.strokeRect(GATE - 390, y - 100, 340, 100); ctx.strokeRect(GATE + 50, y - 100, 340, 100); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(GATE - 40, 0, GATE + 40, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(GATE - 40, v.y - 20, 80, G - v.y + 20);
      ctx.restore();
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]);
    if (ph === 'back') { ctx.fillStyle = 'rgba(235,237,245,0.35)'; ctx.fillRect(v.x - 20, G - 20, v.w + 40, 20); }
  }

  STORY_LEVELS[64] = {
    sky: ['#2a2a34', '#7a7c88'],
    groundColor: '#3a3a44',
    platColor: '#c8cad4',
    layout, backdrop, back, surface,
  };
})();
