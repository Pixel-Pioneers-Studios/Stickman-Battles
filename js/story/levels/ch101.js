'use strict';
// js/story/levels/ch101.js — Chapter 101 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 101 — Titan King (walk → duel vs the Titan King, 1 life)
// The Throne Plateau. The walk crosses the top of the plateau through the
// King's court: banners hung from poles as tall as trees, braziers the size
// of wells, the kneeling statues of everyone who served the throne. At the
// midpoint the throne itself, against the sky — a seat of stone you could
// fit a house on, and the King rising from it when you walk out onto the
// flagstones in front ("It stood up"); after the fight the court beyond is
// empty and the next fracture is a glow over the plateau's edge ("the
// Creator's domain is next"). The stepped dais blocks of the court are the
// climbs; the cache shafts are drains cut into the flagstones.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, THRONE = 3000, EDGE = 5650;
  const DAIS = [[520, 360, 120], [640, 280, 120], [1150, 350, 120], [1270, 270, 120], [2210, 360, 110], [2320, 280, 110],
                [3670, 360, 110], [3780, 280, 120], [5040, 350, 120], [5160, 270, 120]];
  const KNEEL = [380, 950, 1500, 2050, 3450, 4050, 4400, 4950];
  const BRAZIERS = [800, 2550, 3550, 5450];
  const DRAINS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of DAIS) _slLedge(P, x, y, w);
    _slLedge(P, THRONE - 340, 360, 100); _slLedge(P, THRONE + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#2a1a12');
    _slParallax(v, 0.06, (l, r) => {
      ctx.fillStyle = 'rgba(70,46,30,0.6)';
      for (let i = Math.floor(l / 300) - 1; i * 300 < r + 300; i++) { const x = i * 300 + _slHash(i + 1010) * 100; ctx.beginPath(); ctx.moveTo(x - 200, G); ctx.lineTo(x, G - 120 - _slHash(i + 1011) * 80); ctx.lineTo(x + 200, G); ctx.fill(); }
    });
  }

  function kneeler(x) {
    ctx.fillStyle = '#6a5a48';
    ctx.beginPath(); ctx.arc(x + 10, G - 112, 14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 12, G - 100); ctx.lineTo(x + 24, G - 96); ctx.lineTo(x + 30, G - 40); ctx.lineTo(x - 20, G - 40); ctx.fill();
    ctx.fillRect(x - 30, G - 40, 50, 14); ctx.fillRect(x + 10, G - 40, 16, 40);
    ctx.fillStyle = '#5a4a38'; ctx.fillRect(x - 40, G - 12, 80, 12);
  }

  function back(v) {
    for (const x of KNEEL) if (_slVisible(v, x - 50, x + 50)) kneeler(x);
    for (let i = 0; i < BRAZIERS.length; i++) {
      const x = BRAZIERS[i];
      if (!_slVisible(v, x - 80, x + 80)) continue;
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x - 50, G - 90, 100, 90); ctx.fillStyle = '#6a5644'; ctx.fillRect(x - 60, G - 96, 120, 10);
      _slFire(x - 50, G - 96, 100, 1.3);
      _slBanner(x + 90, G, 260, '#7a2a1a', i);
    }
    for (const [x, y, w] of DAIS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#8a7460'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#9a8470'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + w - 6, y, 6, G - y);
    }
    // The throne: a seat of stone you could fit a house on
    if (_slVisible(v, THRONE - 460, THRONE + 460)) {
      ctx.fillStyle = '#5a4838'; ctx.fillRect(THRONE - 220, 40, 440, 160);                 // back
      ctx.fillStyle = '#6a5644'; ctx.fillRect(THRONE - 260, 200, 520, 70);                 // seat
      ctx.fillRect(THRONE - 300, 120, 60, 150); ctx.fillRect(THRONE + 240, 120, 60, 150);  // arms
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(THRONE - 240, 270, 60, G - 270); ctx.fillRect(THRONE + 180, 270, 60, G - 270);
      ctx.fillStyle = '#a8884a'; for (let k = 0; k < 5; k++) ctx.fillRect(THRONE - 180 + k * 80, 26, 40, 20);
      for (const x of [THRONE - 340, THRONE + 240]) { ctx.fillStyle = '#8a7460'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#9a8470'; ctx.fillRect(x - 4, 356, 108, 8); }
    }
    // The next fracture: a glow over the plateau's edge
    if (_slVisible(v, EDGE - 300, EDGE + 300)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(EDGE + 100, 260, 10, EDGE + 100, 260, 260);
      g.addColorStop(0, 'rgba(255,240,230,0.45)'); g.addColorStop(1, 'rgba(255,200,160,0)');
      ctx.fillStyle = g; ctx.fillRect(EDGE - 160, 0, 520, G);
      ctx.restore();
    }
    for (const dx of DRAINS) if (_slVisible(v, dx - 70, dx + 70)) { ctx.fillStyle = '#5a4838'; ctx.fillRect(dx - 56, G - 6, 10, 6); ctx.fillRect(dx + 46, G - 6, 10, 6); }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'sandstone', face: 'soil' }]); }

  STORY_LEVELS[101] = {
    sky: ['#2a1a12', '#4a2e1e', '#6a4630'],
    groundColor: '#4a3a2c',
    platColor: '#8a7460',
    layout, backdrop, back, surface,
  };
})();
