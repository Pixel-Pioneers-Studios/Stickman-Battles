'use strict';
// js/story/levels/ch118.js — Chapter 118 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 118 — VAEL (walk → duel vs VAEL, 1 life)
// The Outcome: the point on the Fracture Coast where the three temporal
// layers intersect and VAEL has been "waiting in the same spot for a very
// long time". The walk runs along the headland above the layered sea; as it
// nears the midpoint the land itself starts to show in three — a faint copy
// of every rock and pillar a little behind it (what was) and a little ahead
// of it (what will be). At the duel ground the three copies of the world
// overlap almost exactly, and the sky splits into three bands. VAEL's
// thousands of foreseen fights are scratched into the standing stones as
// tallies. Past the midpoint the copies drift apart again. Rock stacks are
// the climbs; the chest climbs at 1800 / 4680 are the engine's.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, OUTCOME = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const STONES = [400, 1000, 1500, 2100, 2550, 3450, 3950, 4350, 5000, 5450];

  // How far apart the three layers sit at x: together at the outcome, apart away from it
  const spread = x => 4 + 26 * Math.min(1, Math.abs(x - OUTCOME) / 1800);

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, OUTCOME - 340, 360, 100); _slLedge(P, OUTCOME + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020614');
    // Near the outcome the sky splits into three bands
    const near = Math.max(0, 1 - Math.abs(v.x + v.w / 2 - OUTCOME) / 1400);
    if (near > 0) for (const [k, c] of [[0, '120,160,255'], [1, '200,200,255'], [2, '160,120,255']]) {
      ctx.fillStyle = `rgba(${c},${0.08 * near})`; ctx.fillRect(v.x - 10, v.y + k * (300 - v.y) / 3, v.w + 20, (300 - v.y) / 3);
    }
    _slTimeSea(v, 360);
  }

  function stone(x, dx, a) {
    ctx.fillStyle = `rgba(62,64,68,${a})`;
    ctx.beginPath(); ctx.moveTo(x + dx - 16, G); ctx.lineTo(x + dx - 10, G - 130); ctx.lineTo(x + dx + 10, G - 136); ctx.lineTo(x + dx + 16, G); ctx.fill();
  }

  function back(v) {
    for (let i = 0; i < STONES.length; i++) {
      const x = STONES[i];
      if (!_slVisible(v, x - 60, x + 60)) continue;
      const s = spread(x);
      stone(x, -s, 0.25); stone(x, s, 0.25); stone(x, 0, 1);
      // Tallies of foreseen fights
      ctx.strokeStyle = 'rgba(200,210,240,0.45)'; ctx.lineWidth = 1;
      for (let k = 0; k < 12; k++) { const tx = x - 8 + (k % 4) * 4, ty = G - 110 + Math.floor(k / 4) * 16; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + 10); ctx.stroke(); }
    }
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 40, x + w + 40)) {
      const s = spread(x + w / 2);
      for (const [dx, a] of [[-s, 0.2], [s, 0.2], [0, 1]]) {
        ctx.fillStyle = `rgba(62,64,68,${a})`;
        ctx.beginPath(); ctx.moveTo(x + dx + 4, G); ctx.lineTo(x + dx, y + 8); ctx.quadraticCurveTo(x + dx + w / 2, y - 8, x + dx + w, y + 6); ctx.lineTo(x + dx + w - 4, G); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#5a5c62'; ctx.fillRect(x, y, w, 3);
    }
    if (_slVisible(v, OUTCOME - 420, OUTCOME + 420)) {
      for (const x of [OUTCOME - 340, OUTCOME + 240]) { ctx.fillStyle = '#3e4044'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#5a5c62'; ctx.fillRect(x, 360, 100, 3); }
      // Where the layers meet: three rings on the ground, almost one
      for (const [dx, c] of [[-4, '120,160,255'], [0, '220,220,255'], [4, '160,120,255']]) { ctx.strokeStyle = `rgba(${c},0.5)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(OUTCOME + dx, G - 4, 200, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(6020, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#4a4a48'; ctx.fillRect(x0, G - 14, x1 - x0, 14); ctx.fillStyle = 'rgba(220,230,255,0.2)'; ctx.fillRect(x0, G - 14, x1 - x0, 1); return; }
    ctx.fillStyle = '#2a2a2c';
    ctx.beginPath(); ctx.moveTo(x0, G);
    for (let x = Math.floor(x0 / 60) * 60; x <= x1 + 60; x += 60) ctx.lineTo(x, G + 70 + _slHash(Math.floor(x / 60) + 1180) * 50);
    ctx.lineTo(x1 + 60, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3e4044'; ctx.fillRect(x0, G, x1 - x0, 10);
  }

  STORY_LEVELS[118] = {
    sky: ['#020614', '#06102a', '#0e1c3a'],
    groundColor: '#020614',
    platColor: '#3e4044',
    noGroundFill: true,
    layout, backdrop, back, surface,
  };
})();
