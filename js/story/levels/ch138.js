'use strict';
// js/story/levels/ch138.js — Chapter 138 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 138 — First Form (walk → duel vs the Creator, 2 lives)
// The Combat Space: "The architecture rearranged itself into a fighting
// space." The walk passes through the domain as it is being rebuilt around
// you — white blocks sliding out of the walls and locking into tiers, the
// lattice folding away overhead to open the sky of the domain, the floor
// panels resetting in a wave that runs toward the midpoint. At the midpoint
// the arena it made: a clean square floor framed by four white pylons with
// lines of violet light strung between them, the Creator's "final exam"
// hall. Sliding tiers are the climbs; the chest climbs at 1800 / 4680 are
// the engine's.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, EXAM = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, EXAM - 340, 360, 100); _slLedge(P, EXAM + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    // The lattice ceiling folding away toward the midpoint, opening the domain's sky
    const open = x => Math.max(0, 1 - Math.abs(x - EXAM) / 2000);
    for (let x = Math.floor(v.x / 80) * 80; x < v.x + v.w + 80; x += 80) {
      const o = open(x);
      ctx.fillStyle = '#2a1048'; ctx.fillRect(x, v.y - 20, 80, (80 - v.y + 20) * (1 - o) + 4);
      _slLattice(x, 40, 80, 40 * (1 - o), 0.3, 20);
    }
    // White blocks sliding out of the walls and locking into tiers
    for (let k = Math.floor(v.x / 140); k * 140 < v.x + v.w + 140; k++) {
      const x = k * 140, ph = Math.min(1, ((frameCount + k * 40) % 400) / 120);
      ctx.fillStyle = '#d8d4e4'; ctx.fillRect(x + 10, 200 + (k % 3) * 50, 100 * ph, 40);
      ctx.strokeStyle = 'rgba(120,100,200,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(x + 10, 200 + (k % 3) * 50, 100, 40);
    }
  }

  function back(v) {
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = 'rgba(120,100,200,0.5)'; ctx.fillRect(x, y, w, 3); }
    // The exam hall: four pylons with violet light strung between them
    if (_slVisible(v, EXAM - 440, EXAM + 440)) {
      const pyl = [EXAM - 400, EXAM - 140, EXAM + 140, EXAM + 400];
      for (const px of pyl) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(px - 12, 120, 24, G - 120); ctx.fillStyle = '#c4c0d4'; ctx.fillRect(px + 4, 120, 8, G - 120); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(160,120,255,${0.5 + 0.2 * Math.sin(frameCount * 0.08)})`; ctx.lineWidth = 2;
      for (const y of [150, 200]) { ctx.beginPath(); ctx.moveTo(pyl[0], y); for (const px of pyl) ctx.lineTo(px, y); ctx.stroke(); }
      ctx.restore();
      for (const x of [EXAM - 340, EXAM + 240]) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = 'rgba(120,100,200,0.5)'; ctx.fillRect(x, 360, 100, 3); }
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(6020, v.x + v.w + 20);
    if (ph === 'back') {
      // Floor panels resetting in a wave that runs toward the midpoint
      for (let x = Math.floor(x0 / 60) * 60; x < x1; x += 60) {
        const d = Math.abs(x - EXAM), w = ((frameCount * 4 - d) % 600 + 600) % 600 < 40;
        ctx.fillStyle = w ? '#ffffff' : '#d8d4e4'; ctx.fillRect(x + 1, G - 10, 58, 10);
      }
      return;
    }
    ctx.fillStyle = '#1a1030'; ctx.fillRect(x0, G, x1 - x0, 200); _slLattice(Math.floor(x0 / 20) * 20, G, x1 - x0 + 40, 120, 0.25, 20);
    ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x0, G, x1 - x0, 6);
  }

  STORY_LEVELS[138] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#080012',
    platColor: '#ece8f8',
    noGroundFill: true,
    layout, backdrop, back, surface,
  };
})();
