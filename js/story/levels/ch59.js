'use strict';
// js/story/levels/ch59.js — Chapter 59 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 59 — The Deal (defense)
// The fallback terminal, in a bunker at the perimeter. "The fragment's signal
// is broadcasting coordinates." The terminal (the nexus, x=450) sits on its
// pedestal in the bunker's centre with the fragment's signal pulsing up out of
// it through the ceiling; signal trackers break in through the two blast
// doors, which buckle inward a little more with each arrival. The bunker has
// an uneven gantry layout — a long low walk on the left, a high stair on the
// right, a ceiling catwalk — and the Architects' argument scrolls on the
// terminal's side screens: "Can the fragment substitute for the fourth step?"
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const DECK = [[80, 340, 150], [700, 350, 120], [250, 250, 100], [540, 240, 140], [380, 150, 140]];
  const LINES = ['4th: MISSING', 'substitute?', 'fragment ≈ step 4', 'cost: bearer', 'maybe.'];

  function layout() {
    const P = [];
    for (const [x, y, w] of DECK) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0a0c12'); }

  function back(v) {
    const x0 = Math.max(-100, v.x - 40), x1 = Math.min(1000, v.x + v.w + 40);
    // Bunker walls: poured concrete panels, ribbed ceiling
    ctx.fillStyle = '#22262e'; ctx.fillRect(x0, v.y - 20, x1 - x0, G - v.y + 20);
    for (let px = Math.floor(x0 / 120) * 120; px < x1; px += 120) {
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(px + 4, 60, 112, 380);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px, 60, 4, 380);
    }
    ctx.fillStyle = '#1a1d24'; ctx.fillRect(x0, v.y - 20, x1 - x0, 80 - v.y);
    for (let px = Math.floor(x0 / 60) * 60; px < x1; px += 60) { ctx.fillStyle = '#2e323c'; ctx.fillRect(px, 50, 30, 14); }
    // Blast doors at both ends, buckling inward as trackers arrive
    const dents = (typeof minions !== 'undefined' ? minions.length : 0);
    for (const [dx, dir] of [[0, 1], [900, -1]]) {
      const bend = Math.min(30, 6 + dents * 4) * dir;
      ctx.fillStyle = '#3a3e48';
      ctx.beginPath(); ctx.moveTo(dx, 200); ctx.lineTo(dx + 40 * dir, 200); ctx.quadraticCurveTo(dx + 40 * dir + bend, 320, dx + 40 * dir, G); ctx.lineTo(dx, G); ctx.fill();
      ctx.fillStyle = '#d8b030'; for (let k = 0; k < 6; k++) ctx.fillRect(dx + (dir > 0 ? 6 : -34), 214 + k * 36, 28, 8);
    }
    // Gantries
    for (const [x, y, w] of DECK) {
      ctx.fillStyle = '#4a4e5a'; ctx.fillRect(x, y, w, 9);
      ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 2;
      if (y > 300) { ctx.beginPath(); ctx.moveTo(x + 8, y + 9); ctx.lineTo(x + 8, G); ctx.moveTo(x + w - 8, y + 9); ctx.lineTo(x + w - 8, G); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 8, 60); ctx.moveTo(x + w - 8, y); ctx.lineTo(x + w - 8, 60); ctx.stroke(); }
    }
    // The fragment's signal, pulsing up through the ceiling from the terminal
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const t = ((frameCount + k * 30) % 120) / 120;
      ctx.strokeStyle = `rgba(150,200,255,${0.5 * (1 - t)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(NX, G - 100 - t * 300, 20 + t * 60, 6 + t * 14, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // Side screens: the Architects' argument
    for (const sx of [NX - 200, NX + 80]) {
      ctx.fillStyle = '#14161c'; ctx.fillRect(sx, G - 140, 120, 60);
      ctx.strokeStyle = '#4a4e5a'; ctx.lineWidth = 2; ctx.strokeRect(sx, G - 140, 120, 60);
      ctx.fillStyle = 'rgba(150,200,255,0.75)'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
      for (let k = 0; k < 4; k++) ctx.fillText(LINES[((frameCount >> 6) + k + (sx > NX ? 2 : 0)) % LINES.length], sx + 4, G - 126 + k * 13);
    }
    // Terminal pedestal (the nexus crystal itself is drawn by the mode)
    ctx.fillStyle = '#3a3e48'; ctx.fillRect(NX - 46, G - 36, 92, 36);
    ctx.fillStyle = '#4a4e5a'; ctx.fillRect(NX - 54, G - 42, 108, 8);
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -60, x1: 960, kind: 'tunnel', face: 'concrete' }]); }

  STORY_LEVELS[59] = {
    sky: ['#0a0c12', '#1a1d24'],
    groundColor: '#14161c',
    platColor: '#4a4e5a',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
