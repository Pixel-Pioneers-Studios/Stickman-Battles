'use strict';
// js/story/levels/ch69.js — Chapter 69 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 69 — What the Lab Taught (walk → duel vs two Lockdown Enforcers)
// The exit corridor, back out through the facility during the lockdown sweep.
// The walk passes the cell block again — the terminal said nineteen subjects,
// the doors say seventeen; two numbers simply aren't there. "This place still
// works": stasis columns hum behind a glass wall. At the midpoint the two
// architectures of the facility meet — Axiom's concrete and the older
// section's green enamel pressed together along a jagged seam that glows —
// what Calix means by a seam, built into the walls. Past it, the stairwell
// climbs toward the surface and daylight. Lockdown shutters (half-dropped)
// are the climbs; the cache shafts are floor grates.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SEAM = 3000, EXIT = 5500;
  const SHUT = [[420, 350, 100], [540, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                [3660, 350, 100], [3780, 270, 110], [4960, 340, 110], [5090, 260, 110]];
  const CELL_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 18, 19];   // 9 and 17 aren't there
  const GRATES = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of SHUT) _slLedge(P, x, y, w);
    _slLedge(P, SEAM - 340, 360, 100); _slLedge(P, SEAM + 240, 360, 100);
    for (let k = 0; k < 4; k++) _slLedge(P, EXIT - 260 + k * 70, G - 40 - k * 50, 70);   // stairwell
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0c0c0e'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // Axiom concrete left of the seam, older green enamel right of it
    if (x0 < SEAM) { ctx.fillStyle = '#3a3c3e'; ctx.fillRect(x0, 60, Math.min(SEAM, x1) - x0, 380); }
    if (x1 > SEAM) { ctx.fillStyle = '#3a4a42'; ctx.fillRect(Math.max(SEAM, x0), 60, x1 - Math.max(SEAM, x0), 380); }
    // Cell block: seventeen doors where there should be nineteen
    for (let i = 0; i < CELL_NUMS.length; i++) {
      const cx = 300 + i * 140;
      if (cx > SEAM - 500 || !_slVisible(v, cx - 60, cx + 60)) continue;
      ctx.fillStyle = '#26282a'; ctx.fillRect(cx - 45, G - 170, 90, 170);
      ctx.fillStyle = '#16181a'; ctx.fillRect(cx - 36, G - 160, 72, 160);
      for (let b = 0; b < 5; b++) { ctx.fillStyle = '#5a5c60'; ctx.fillRect(cx - 30 + b * 14, G - 160, 3, 160); }
      ctx.fillStyle = '#d8b030'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(CELL_NUMS[i]).padStart(2, '0'), cx, G - 176);
    }
    // Stasis columns humming behind a glass wall — "this place still works"
    if (_slVisible(v, SEAM + 500, SEAM + 1900)) {
      ctx.fillStyle = 'rgba(160,220,200,0.08)'; ctx.fillRect(SEAM + 500, 110, 1400, 330);
      for (let k = 0; k < 7; k++) {
        const sx = SEAM + 600 + k * 190;
        ctx.fillStyle = 'rgba(120,220,200,0.25)'; ctx.fillRect(sx - 22, 140, 44, 260);
        ctx.strokeStyle = 'rgba(200,240,230,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(sx - 22, 140, 44, 260);
      }
      ctx.strokeStyle = 'rgba(200,240,230,0.3)'; ctx.lineWidth = 3; ctx.strokeRect(SEAM + 500, 110, 1400, 330);
    }
    // The seam: two architectures pressed together, glowing where they meet
    if (_slVisible(v, SEAM - 400, SEAM + 400)) {
      const pts = _slJag(SEAM, 60, SEAM, G, 14, 26, 69);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,150,255,${0.5 + 0.3 * Math.sin(frameCount * 0.06)})`; ctx.lineWidth = 4;
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(160,110,255,0.15)'; ctx.stroke();
      ctx.restore();
      for (const sx of [SEAM - 340, SEAM + 240]) { ctx.fillStyle = sx < SEAM ? '#4a4c50' : '#5a6a62'; ctx.fillRect(sx, 360, 100, G - 360); }
    }
    // Half-dropped lockdown shutters
    for (const [x, y, w] of SHUT) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#4a4c50'; ctx.fillRect(x, 60, w, y - 60 + 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; for (let sy = 70; sy < y; sy += 10) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); ctx.stroke(); }
      ctx.fillStyle = '#d8b030'; for (let k = 0; k < w; k += 20) ctx.fillRect(x + k, y, 10, 8);
    }
    for (const gx of GRATES) if (_slVisible(v, gx - 80, gx + 80)) { ctx.fillStyle = '#5a5c60'; ctx.fillRect(gx - 70, G - 4, 24, 4); ctx.fillRect(gx + 46, G - 4, 24, 4); }
    // Stairwell up to the surface, daylight at the top
    if (_slVisible(v, EXIT - 400, EXIT + 500)) {
      for (let k = 0; k < 4; k++) { const sx = EXIT - 260 + k * 70, sy = G - 40 - k * 50; ctx.fillStyle = '#6a7a72'; ctx.fillRect(sx, sy, 70, 8); ctx.fillStyle = '#26302c'; ctx.fillRect(sx, sy + 8, 70, G - sy - 8); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 40, 0, 300);
      g.addColorStop(0, 'rgba(255,245,220,0.7)'); g.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = g; ctx.fillRect(EXIT - 40, 40, 300, 260);
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: SEAM, kind: 'tile', face: 'concrete' }, { x0: SEAM, x1: 6200, kind: 'tunnel', face: 'concrete' }]); }

  STORY_LEVELS[69] = {
    sky: ['#0c0c0e', '#1a1c1e'],
    groundColor: '#14161a',
    platColor: '#4a4c50',
    layout, backdrop, back, surface,
  };
})();
