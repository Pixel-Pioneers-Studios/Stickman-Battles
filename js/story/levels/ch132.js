'use strict';
// js/story/levels/ch132.js — Chapter 132 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 132 — The Architect's Message (escape, run right)
// The Signal Alcove. The Second Architect's message is a thread of green
// light — her colour — running through the white architecture, flickering
// from wall seam to wall seam toward the relay; the domain's violet lattice
// is closing in over it from behind (the collapse wall), and ahead the
// corridor's floor breaks into sections where panels have already pulled
// away to trap you. Where the green thread passes, the lattice holds back for
// a moment. The Secure Relay at the end is a green-lit mast in a niche.
// Floating panel sections are the high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const SECTS = [[0, 1000, 440], [1060, 1900, 440], [1960, 2800, 430], [2860, 3600, 440], [3660, 4400, 440]];
  const HIGH = [[650, 340, 110], [1400, 330, 110], [1530, 250, 110], [2400, 340, 110], [3200, 330, 110], [3900, 340, 110]];
  const RELAY = 4100;

  function floor() { return SECTS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 10, 60, v.w + 20, 380);
    for (let x = Math.floor(v.x / 160) * 160; x < v.x + v.w + 160; x += 160) { ctx.fillStyle = '#c4c0d4'; ctx.fillRect(x, 60, 3, 380); }
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
    // The green thread of her message, seam to seam toward the relay
    ctx.save();
    ctx.strokeStyle = `rgba(60,150,50,${0.65 + 0.25 * Math.sin(frameCount * 0.1)})`; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = Math.floor(v.x / 80) * 80; x < Math.min(RELAY, v.x + v.w + 80); x += 80) ctx.lineTo(x, 120 + Math.sin(x * 0.01) * 50 + _slHash(Math.floor(x / 80) + 1320) * 20);
    ctx.stroke();
    const px = (frameCount * 6) % 4400;
    if (_slVisible(v, px - 20, px + 20)) { ctx.fillStyle = '#3a9a2a'; ctx.beginPath(); ctx.arc(px, 120 + Math.sin(px * 0.01) * 50 + 10, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function back(v) {
    // Lattice closing in from behind
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) { ctx.fillStyle = 'rgba(42,16,72,0.85)'; ctx.fillRect(v.x - 40, v.y - 40, wx - v.x + 40, v.h + 80); _slLattice(Math.floor((v.x - 40) / 16) * 16, 40, wx - v.x + 40, 420, 0.5, 16); }
    for (const [x, y, w] of HIGH) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x, y + 10, w, 2);
      ctx.strokeStyle = 'rgba(120,100,200,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + w / 2, y + 12); ctx.lineTo(x + w / 2, 440); ctx.stroke();
    }
    // The Secure Relay: a green-lit mast in a niche
    if (_slVisible(v, RELAY - 120, RELAY + 120)) {
      ctx.fillStyle = '#2a1048'; ctx.fillRect(RELAY - 70, 160, 140, 280);
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(RELAY - 6, 190, 12, 250);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(RELAY, 190, 4, RELAY, 190, 90); g.addColorStop(0, 'rgba(160,230,120,0.8)'); g.addColorStop(1, 'rgba(100,200,80,0)');
      ctx.fillStyle = g; ctx.fillRect(RELAY - 90, 100, 180, 180); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of SECTS) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#ece8f8'; ctx.fillRect(x0, y - 10, x1 - x0, 10); continue; }
      ctx.fillStyle = '#1a1030'; ctx.fillRect(x0, y, x1 - x0, 600 - y); _slLattice(x0, y, x1 - x0, 120, 0.3, 20);
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x0, y, x1 - x0, 6);
    }
  }

  STORY_LEVELS[132] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#080012',
    platColor: '#ece8f8',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
