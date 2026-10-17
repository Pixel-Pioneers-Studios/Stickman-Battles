'use strict';
// js/story/levels/ch46.js — Chapter 46 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 46 — What the Ancients Left (traversal)
// "The first dimension to ever fracture. It looked like your world might.
// Broken towers. Cracked sky. A planet mid-collapse, frozen in time." Nothing
// here moves: towers hang mid-topple, chunks of street hang in the air where
// they were thrown, dust is a still cloud. The frozen debris is the high
// route — chunks stepping up in threes — over ground split into craters and
// heaved slabs. The fourth Architect's vault, where the Fracture Diagram is
// kept, is the one intact building, at the far end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 600, 440], [600, 900, 470], [900, 1500, 440], [1500, 1700, 405], [1700, 2300, 440], [2300, 2550, 480],
                 [2550, 3300, 440], [3300, 3500, 410], [3500, 4800, 440]];
  const DEBRIS = [[400, 350, 90], [540, 270, 100], [700, 200, 120], [1000, 340, 110], [1150, 260, 100], [1300, 190, 130],
                  [1850, 340, 100], [2000, 260, 120], [2700, 350, 100], [2840, 270, 110], [2990, 190, 120],
                  [3650, 340, 110], [3800, 260, 120], [3950, 180, 110]];
  const TOPPLE = [[820, -0.35], [1620, 0.28], [2420, -0.22], [3220, 0.4], [3900, -0.3]];
  const VAULT = 4450;

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of DEBRIS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#100808');
    _slParallax(v, 0.04, (l, r) => {
      // Cracked sky: the fracture that started everything, frozen open
      _slSkyCrack([[l + 100, -200], [l + 260, -60], [l + 230, 40], [l + 420, 150], [l + 380, 230]], 0.45);
      _slSkyCrack([[l + 700, -150], [l + 640, -20], [l + 760, 80]], 0.35);
      // The planet's own horizon, broken into a stepped edge
      ctx.fillStyle = '#2a1a14';
      ctx.beginPath(); ctx.moveTo(l - 20, 360);
      for (let x = l; x < r + 40; x += 60) ctx.lineTo(x, 330 + _slHash(Math.floor(x / 60)) * 50);
      ctx.lineTo(r + 40, 600); ctx.lineTo(l - 20, 600); ctx.fill();
    });
    _slParallax(v, 0.2, (l, r) => {
      // Far city, half its towers hanging mid-fall
      for (let i = Math.floor(l / 130) - 1; i * 130 < r + 130; i++) {
        const x = i * 130 + _slHash(i) * 40, h = 120 + _slHash(i + 1) * 180, tilt = (_slHash(i + 2) - 0.5) * 0.5;
        ctx.save(); ctx.translate(x, 440); ctx.rotate(tilt);
        ctx.fillStyle = '#241612'; ctx.fillRect(-26, -h, 52, h);
        ctx.restore();
      }
    });
  }

  function back(v) {
    // Toppling towers frozen mid-fall
    for (const [tx, tilt] of TOPPLE) {
      if (!_slVisible(v, tx - 260, tx + 260)) continue;
      ctx.save(); ctx.translate(tx, 440); ctx.rotate(tilt);
      ctx.fillStyle = '#3a2a22'; ctx.fillRect(-45, -420, 90, 420);
      _slWindowGrid(-38, -400, 76, 360, 3, 9, { lit: 0.04, seed: tx, dark: '#1a1210', sill: false });
      ctx.restore();
      // The break at its base: a fan of debris stopped in the air
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = '#4a3a30';
        ctx.fillRect(tx - 60 + _slHash(tx + k) * 120, 380 - _slHash(tx + k + 9) * 90 + Math.sin(frameCount * 0.01 + k) * 0.6, 8 + _slHash(k) * 10, 6 + _slHash(k + 2) * 8);
      }
    }
    // Frozen debris chunks: the high route
    for (let i = 0; i < DEBRIS.length; i++) {
      const [x, y, w] = DEBRIS[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = i % 3 === 2 ? '#5a4a3e' : '#4a3a30';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + 30 + _slHash(i) * 20); ctx.lineTo(x + 10, y + 26); ctx.fill();
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x, y, w, 4);
      // Motion streaks frozen with them: they were moving when time stopped
      ctx.strokeStyle = 'rgba(200,170,150,0.18)'; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 10 + k * w / 3, y + 30); ctx.lineTo(x + k * w / 3 - 20, y + 90); ctx.stroke(); }
    }
    // Still dust: suspended motes that never settle
    ctx.fillStyle = 'rgba(210,180,150,0.35)';
    for (let k = Math.floor(v.x / 37); k * 37 < v.x + v.w; k++) ctx.fillRect(k * 37 + _slHash(k) * 30, 100 + _slHash(k + 4) * 320, 2, 2);
    // Crater rims around the sunken floor
    for (const [x0, x1, y] of FLOOR) {
      if (y <= 440 || !_slVisible(v, x0 - 40, x1 + 40)) continue;
      ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.moveTo(x0 - 40, 440); ctx.lineTo(x0, 424); ctx.lineTo(x0 + 10, 440); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x1 - 10, 440); ctx.lineTo(x1, 422); ctx.lineTo(x1 + 40, 440); ctx.fill();
    }
    // The vault: the one intact building, door of the fourth Architect
    if (_slVisible(v, VAULT - 300, VAULT + 300)) {
      ctx.fillStyle = '#5a4a3e'; ctx.fillRect(VAULT - 200, 160, 400, 280);
      ctx.fillStyle = '#6a5a4a'; ctx.beginPath(); ctx.moveTo(VAULT - 230, 160); ctx.lineTo(VAULT, 80); ctx.lineTo(VAULT + 230, 160); ctx.fill();
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#4a3a30'; ctx.fillRect(VAULT - 180 + k * 80, 180, 24, 260); }
      ctx.fillStyle = '#1a1210'; ctx.fillRect(VAULT - 45, 300, 90, 140);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,200,120,${0.4 + 0.3 * Math.sin(frameCount * 0.04)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(VAULT, 130, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); for (let s = 0; s <= 5; s++) { const a = s / 5 * Math.PI * 2; ctx.lineTo(VAULT + Math.cos(a) * 14, 130 + Math.sin(a) * 14); } ctx.stroke();
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 5000, kind: 'rubble', face: 'soil' }]); }

  STORY_LEVELS[46] = {
    sky: ['#100808', '#1e1010'],
    groundColor: '#3a2e20',
    platColor: '#4a3e30',
    floor, layout, backdrop, back, surface,
  };
})();
