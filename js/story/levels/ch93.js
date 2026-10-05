'use strict';
// js/story/levels/ch93.js — Chapter 93 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 93 — Flux Guardian (walk → duel vs the Flux Guardian)
// The Axis: "the exact point where gravity reversed". A line of light runs
// across the whole sky at mid-height, and above it the world is mirrored —
// a second ground hanging upside down, its rocks and stones pointing down,
// close enough that you can see the line where the two halves meet. Toward
// the midpoint the mirror comes lower and the line brightens; the Guardian
// stands under a vast gyroscope turning on the axis, its rings almost still
// ("it no longer noticed the shifts"). The walk is lined with fourteen
// standing stones, one cracked for each "fragment bearer to reach this axis".
// Mirrored stones (ledges whose twins hang overhead) are the climbs; the
// cache shafts are rings of stone sunk into the ground.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DUEL = 3000;
  const CLIMB = [[500, 350, 110], [640, 270, 110], [1130, 340, 110], [1270, 260, 110], [2220, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5060, 340, 110], [5200, 260, 110]];
  const STONES = Array.from({ length: 14 }, (_, i) => 300 + i * 390 + _slHash(i + 930) * 60).filter(x => Math.abs(x - DUEL) > 420 && Math.abs(x - 1800) > 120 && Math.abs(x - 4680) > 120);
  const RINGS = [1800, 4680];

  // Mirror line: lower near the duel
  const axisY = x => 210 - 40 * Math.max(0, 1 - Math.abs(x - DUEL) / 1600);

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, DUEL - 340, 360, 100); _slLedge(P, DUEL + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1a26');
    // The mirrored world above the axis
    const x0 = v.x - 20, x1 = v.x + v.w + 20;
    ctx.fillStyle = '#26302e';
    ctx.beginPath(); ctx.moveTo(x0, v.y - 20);
    for (let x = Math.floor(x0 / 30) * 30; x <= x1 + 30; x += 30) ctx.lineTo(x, axisY(x) - 70 - _slHash(Math.floor(x / 30) + 931) * 26);
    ctx.lineTo(x1 + 30, v.y - 20); ctx.closePath(); ctx.fill();
    for (let i = Math.floor(x0 / 220); i * 220 < x1; i++) {
      const x = i * 220 + 60, y = axisY(x) - 70;
      ctx.fillStyle = '#3a3e3c'; ctx.beginPath(); ctx.moveTo(x - 10, y - 6); ctx.lineTo(x - 6, y + 60); ctx.lineTo(x + 6, y + 64); ctx.lineTo(x + 10, y - 6); ctx.fill();
    }
    // The axis line itself
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const near = Math.max(0, 1 - Math.abs(v.x + v.w / 2 - DUEL) / 1600);
    ctx.strokeStyle = `rgba(160,210,255,${0.35 + near * 0.4 + 0.1 * Math.sin(frameCount * 0.05)})`; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = Math.floor(x0 / 20) * 20; x <= x1; x += 20) ctx.lineTo(x, axisY(x)); ctx.stroke();
    ctx.lineWidth = 10; ctx.strokeStyle = `rgba(100,170,255,${0.08 + near * 0.1})`; ctx.stroke();
    ctx.restore();
  }

  function back(v) {
    for (let i = 0; i < STONES.length; i++) {
      const x = STONES[i];
      if (!_slVisible(v, x - 20, x + 20)) continue;
      ctx.fillStyle = '#4a4640'; ctx.beginPath(); ctx.moveTo(x - 14, G); ctx.lineTo(x - 10, G - 110); ctx.lineTo(x + 8, G - 116); ctx.lineTo(x + 14, G); ctx.fill();
      ctx.strokeStyle = '#1e1c1a'; ctx.lineWidth = 2; ctx.beginPath(); _slJag(x - 2, G - 112, x + 2, G - 10, 6, 5, 932 + i).forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
    }
    // Mirrored stones: each ledge has a twin hanging upside down over it
    for (let i = 0; i < CLIMB.length; i++) {
      const [x, y, w] = CLIMB[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      const ty = 2 * axisY(x + w / 2) - y;
      for (const [yy, s] of [[y, 1], [ty, -1]]) {
        ctx.fillStyle = s > 0 ? '#4a4640' : 'rgba(58,62,60,0.7)';
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x + w - 12, yy + 20 * s); ctx.lineTo(x + w * 0.5, yy + 34 * s); ctx.lineTo(x + 12, yy + 20 * s); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#6a6458'; ctx.fillRect(x, y, w, 4);
    }
    // The gyroscope over the Guardian, rings almost still
    if (_slVisible(v, DUEL - 420, DUEL + 420)) {
      const cy = axisY(DUEL);
      ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 6;
      for (let k = 0; k < 3; k++) { const t = frameCount * 0.002 + k * 1.1; ctx.beginPath(); ctx.ellipse(DUEL, cy, 170 - k * 30, Math.abs(Math.cos(t)) * (170 - k * 30) + 6, k * 0.5, 0, Math.PI * 2); ctx.stroke(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(DUEL, cy, 4, DUEL, cy, 60); g.addColorStop(0, 'rgba(210,235,255,0.8)'); g.addColorStop(1, 'rgba(100,170,255,0)');
      ctx.fillStyle = g; ctx.fillRect(DUEL - 60, cy - 60, 120, 120);
      ctx.restore();
      for (const x of [DUEL - 340, DUEL + 240]) { ctx.fillStyle = '#4a4640'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#6a6458'; ctx.fillRect(x - 4, 356, 108, 8); }
    }
    // Rings of stone sunk around the cache shafts
    for (const rx of RINGS) {
      if (!_slVisible(v, rx - 90, rx + 90)) continue;
      ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(rx, G - 2, 70, 8, 0, Math.PI, 0); ctx.stroke();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'rubble', face: 'soil' }]); }

  STORY_LEVELS[93] = {
    sky: ['#0e1a26', '#1a2e40', '#2c4658'],
    groundColor: '#2a2e2c',
    platColor: '#4a4640',
    layout, backdrop, back, surface,
  };
})();
