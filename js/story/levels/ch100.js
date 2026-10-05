'use strict';
// js/story/levels/ch100.js — Chapter 100 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 100 — Things That Cannot Be Shattered (defense)
// The Outer Plain, at the dimensional gate (the nexus, x=450) you came through
// — a ring of standing stone the titans never built, much smaller than
// anything of theirs, with the fracture shimmering inside it. The plain runs
// to the horizon, and on it titans are walking: silhouettes the height of
// the sky, slow, far off, one of them turning its head your way. The scouts
// come from both sides across ground printed with their footprints. Boulders
// the size of houses lie where they were dropped: two low ones and a high
// slab between them are the ledges.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const BOULDERS = [[90, 340, 150], [660, 340, 150], [360, 230, 180]];

  function layout() {
    const P = [];
    for (const [x, y, w] of BOULDERS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#2a1a12');
    // Titans walking the plain, far off
    _slParallax(v, 0.05, (l, r) => {
      for (let k = 0; k < 3; k++) {
        const x = 100 + k * 340 + Math.sin(frameCount * 0.0015 + k * 2) * 60, h = 300 + k * 40;
        ctx.fillStyle = `rgba(50,32,22,${0.35 + k * 0.1})`;
        ctx.beginPath(); ctx.arc(x, G - h + 20, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x - 30, G - h + 40, 60, h * 0.45);
        const st = Math.sin(frameCount * 0.01 + k) * 14;
        ctx.fillRect(x - 24 + st, G - h * 0.55 + 40, 18, h * 0.55 - 40); ctx.fillRect(x + 6 - st, G - h * 0.55 + 40, 18, h * 0.55 - 40);
      }
    });
    const g = ctx.createLinearGradient(0, 300, 0, G);
    g.addColorStop(0, 'rgba(106,70,48,0)'); g.addColorStop(1, 'rgba(106,70,48,0.6)');
    ctx.fillStyle = g; ctx.fillRect(v.x - 10, 300, v.w + 20, G - 300);
  }

  function back(v) {
    // Boulders the size of houses
    for (let i = 0; i < BOULDERS.length; i++) {
      const [x, y, w] = BOULDERS[i];
      ctx.fillStyle = '#6a5644';
      ctx.beginPath(); ctx.moveTo(x - 6, G); ctx.lineTo(x, y + 10); ctx.quadraticCurveTo(x + w * 0.5, y - 14, x + w, y + 8); ctx.lineTo(x + w + 8, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + w * 0.6, y + 20, w * 0.4, G - y - 20);
      ctx.fillStyle = '#8a7460'; ctx.fillRect(x, y, w, 4);
      if (y < 300) { ctx.fillStyle = '#5a4838'; ctx.fillRect(x + 20, y + 10, 16, G - y - 10); ctx.fillRect(x + w - 36, y + 10, 16, G - y - 10); }
    }
    // The dimensional gate: a small ring of standing stone, the fracture inside it
    ctx.fillStyle = '#4a3a2c';
    for (const s of [-1, 1]) { ctx.fillRect(NX + s * 70 - 12, G - 170, 24, 170); }
    ctx.fillRect(NX - 90, G - 186, 180, 20);
    _slPortal(NX, G - 90, 64, 30, 100);
    // Footprints across the plain from both sides
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) {
      const fx = NX + s * (160 + k * 50);
      if (fx < -40 || fx > 940) continue;
      ctx.fillStyle = 'rgba(40,26,16,0.5)'; ctx.beginPath(); ctx.ellipse(fx, G - 2, 12, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -400, x1: 1300, kind: 'sandstone', face: 'soil' }]);
  }

  STORY_LEVELS[100] = {
    sky: ['#2a1a12', '#4a2e1e', '#6a4630'],
    groundColor: '#4a3a2c',
    platColor: '#6a5644',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
