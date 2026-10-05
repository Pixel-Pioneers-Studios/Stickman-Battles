'use strict';
// js/story/levels/ch109.js — Chapter 109 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 109 — The Drained Records (puzzle, 4 memory conduits)
// Deeper in the Quiet Expanse, among the remains of what it was before Seraph
// drained it: the stubs of buildings worn down to their footings, a road you
// can still trace under the ash. Four memory conduits stand along it — grey
// pillars with a cracked lens at the top, each lock on a footing at the
// height puzzleSwitchDefs gives it. When a conduit is restored its lens
// shows, for a few seconds, what the expanse held: colour, weather, figures
// walking, lit windows — then it drains back to grey ("a dimension with
// people and weather and the kind of noise that comes from things being
// alive"). Restored conduits stay faintly warm. Building stubs are the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, CORE = 3300;
  const CONDUITS = [[500, 390], [1200, 355], [2200, 370], [3000, 350]];
  const STUBS = [[800, 350, 110], [920, 270, 110], [1550, 350, 110], [1680, 270, 110], [2500, 340, 110], [2620, 260, 100]];
  const SCENES = ['rain', 'market', 'windows', 'field'];
  const lit = [];                                  // frame each conduit was restored

  function layout() {
    const P = [];
    for (const [x, y] of CONDUITS) _slLedge(P, x - 45, y, 90);
    _slLedge(P, 1100, 400, 50); _slLedge(P, 2900, 400, 50);   // steps to the raised footings
    for (const [x, y, w] of STUBS) _slLedge(P, x, y, w);
    return P;
  }

  function scene(kind, x, y, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.clip();
    if (kind === 'rain') {
      ctx.fillStyle = '#5a7a9a'; ctx.fillRect(x - 46, y - 46, 92, 92);
      ctx.strokeStyle = 'rgba(220,235,255,0.8)'; ctx.lineWidth = 1;
      for (let k = 0; k < 20; k++) { const rx = x - 46 + _slHash(k + 1090) * 92, ry = y - 46 + ((frameCount * 4 + k * 23) % 92); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 10); ctx.stroke(); }
    } else if (kind === 'market') {
      ctx.fillStyle = '#d8a860'; ctx.fillRect(x - 46, y - 46, 92, 92);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#c84040', '#4080c8', '#40a060', '#e0c040'][k]; ctx.fillRect(x - 40 + k * 22, y - 10, 18, 8); }
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const fx = x - 36 + ((frameCount * 0.6 + k * 24) % 72); ctx.beginPath(); ctx.arc(fx, y + 14, 3, 0, Math.PI * 2); ctx.moveTo(fx, y + 17); ctx.lineTo(fx, y + 30); ctx.stroke(); }
    } else if (kind === 'windows') {
      ctx.fillStyle = '#1a2440'; ctx.fillRect(x - 46, y - 46, 92, 92);
      _slWindowGrid(x - 40, y - 36, 80, 72, 4, 4, { lit: 0.6, seed: 109, glow: true });
    } else {
      const g = ctx.createLinearGradient(0, y - 46, 0, y + 46); g.addColorStop(0, '#8ac0e8'); g.addColorStop(0.55, '#d8e8f0'); g.addColorStop(0.56, '#7aa040'); g.addColorStop(1, '#4a7a28');
      ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 14 + Math.sin(frameCount * 0.01) * 6, y - 22, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020a0c');
    _slParallax(v, 0.12, (l, r) => {
      for (let i = Math.floor(l / 140) - 1; i * 140 < r + 140; i++) {
        const x = i * 140 + _slHash(i + 1091) * 60, h = 40 + _slHash(i + 1092) * 90;
        ctx.fillStyle = '#16262a'; ctx.fillRect(x, G - h, 70, h);
      }
    });
  }

  function back(v) {
    const n = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
    for (let i = 0; i < CONDUITS.length; i++) if (i < n && lit[i] == null) lit[i] = frameCount;
    if (n === 0) lit.length = 0;
    // Building stubs worn to their footings (the climbs)
    for (const [x, y, w] of STUBS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#3a4a4e'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#5a6a6e'; ctx.fillRect(x, y, w, 3);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = '#26363a'; ctx.fillRect(x + 12 + k * 32, y + 20, 18, 26); }
    }
    for (const [sx] of [[1100], [2900]]) if (_slVisible(v, sx - 10, sx + 60)) { ctx.fillStyle = '#3a4a4e'; ctx.fillRect(sx, 400, 50, G - 400); ctx.fillStyle = '#5a6a6e'; ctx.fillRect(sx, 400, 50, 3); }
    // The conduits: a lens that shows what the expanse held, then drains back
    CONDUITS.forEach(([x, y], i) => {
      if (!_slVisible(v, x - 80, x + 80)) return;
      ctx.fillStyle = '#3a4a4e'; ctx.fillRect(x - 45, y, 90, G - y); ctx.fillStyle = '#5a6a6e'; ctx.fillRect(x - 49, y, 98, 4);
      ctx.fillStyle = '#4a5a5e'; ctx.fillRect(x - 10, y - 150, 20, 120);
      const ly = y - 190;
      ctx.fillStyle = '#26363a'; ctx.beginPath(); ctx.arc(x, ly, 50, 0, Math.PI * 2); ctx.fill();
      if (lit[i] != null) {
        const age = frameCount - lit[i], a = age < 300 ? 1 : Math.max(0.15, 1 - (age - 300) / 120);
        scene(SCENES[i], x, ly, a);
      }
      ctx.strokeStyle = lit[i] != null ? 'rgba(220,200,150,0.7)' : '#5a6a6e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, ly, 50, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 30, ly - 30); ctx.lineTo(x - 4, ly + 4); ctx.lineTo(x + 20, ly + 2); ctx.stroke();
    });
    // The core memory at the end, under the ash
    if (_slVisible(v, CORE - 120, CORE + 120)) {
      ctx.fillStyle = '#26363a'; ctx.fillRect(CORE - 60, G - 60, 120, 60);
      ctx.fillStyle = n >= 4 ? 'rgba(220,200,150,0.8)' : 'rgba(90,106,110,0.6)'; ctx.fillRect(CORE - 40, G - 76, 80, 16);
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3800, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#4a5a5e'; ctx.fillRect(x0, G - 12, x1 - x0, 12);
      // The old road, still traceable under the ash
      ctx.fillStyle = 'rgba(30,44,48,0.6)'; for (let x = Math.ceil(x0 / 90) * 90; x < x1; x += 90) ctx.fillRect(x, G - 7, 40, 2);
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 200); g.addColorStop(0, '#2a3a3e'); g.addColorStop(1, '#020a0c');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 200);
  }

  STORY_LEVELS[109] = {
    sky: ['#020a0c', '#051216', '#0a1c20'],
    groundColor: '#142022',
    platColor: '#4a5a5e',
    layout, backdrop, back, surface,
  };
})();
