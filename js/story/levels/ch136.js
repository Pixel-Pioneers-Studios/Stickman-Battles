'use strict';
// js/story/levels/ch136.js — Chapter 136 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 136 — Blind Spot (escape, run right)
// The Maintenance Layer, under the domain's white floor: the place the
// Creator doesn't look. Low ceilings of exposed lattice, cable runs, service
// conduits; the white architecture overhead is visible through grates in the
// ceiling, and the sweep units' scan light passes across those grates without
// coming down. "A voice through a maintenance conduit": the conduits carry a
// faint pulse along with you, a little ahead, showing the way. The floor is
// service walkways with gaps over the dark machinery below. Pipe brackets
// are the high routes. The Maintenance Exit is a hatch of daylight-white at
// the end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const WALKS = [[0, 900, 440], [960, 1700, 440], [1760, 2500, 430], [2560, 3600, 440]];
  const HIGH = [[600, 340, 110], [1300, 330, 110], [1430, 260, 100], [2100, 340, 110], [2800, 330, 110]];
  const EXIT = 3320;

  function floor() { return WALKS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#06020c');
    ctx.fillStyle = '#100820'; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, 460 - v.y);
    // The ceiling: lattice with grates showing the white domain above, scan light passing over
    ctx.fillStyle = '#1a1030'; ctx.fillRect(v.x - 10, 40, v.w + 20, 50); _slLattice(Math.floor(v.x / 16) * 16, 40, v.w + 40, 50, 0.3, 16);
    const scan = ((frameCount * 4) % 1600) + Math.floor(v.x / 1600) * 1600;
    for (let x = Math.floor(v.x / 200) * 200 + 60; x < v.x + v.w + 200; x += 200) {
      ctx.fillStyle = '#d8d4e4'; ctx.fillRect(x, 50, 80, 30);
      ctx.fillStyle = '#100820'; for (let k = 0; k < 8; k++) ctx.fillRect(x + 4 + k * 10, 50, 3, 30);
      if (Math.abs(scan - x) < 120) { ctx.fillStyle = 'rgba(255,80,80,0.35)'; ctx.fillRect(x, 50, 80, 30); }
    }
    // Cable runs
    ctx.strokeStyle = '#2a1a3a'; ctx.lineWidth = 3;
    for (let c = 0; c < 3; c++) { ctx.beginPath(); for (let x = Math.floor(v.x / 60) * 60; x <= v.x + v.w + 60; x += 60) ctx.lineTo(x, 110 + c * 22 + Math.sin(x * 0.01 + c) * 8); ctx.stroke(); }
  }

  function back(v) {
    // The voice's pulse running along the conduit, a little ahead of you
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    ctx.fillStyle = '#2a1a3a'; ctx.fillRect(v.x - 10, 180, v.w + 20, 10);
    if (p1) {
      const px = p1.cx() + 160 + ((frameCount * 3) % 200);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(px, 185, 2, px, 185, 30); g.addColorStop(0, 'rgba(200,170,255,0.8)'); g.addColorStop(1, 'rgba(150,100,255,0)');
      ctx.fillStyle = g; ctx.fillRect(px - 30, 155, 60, 60); ctx.restore();
    }
    // Pipe brackets hung from the conduit (the high routes)
    for (const [x, y, w] of HIGH) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x + w / 2 - 3, 190, 6, y - 190);
    }
    if (_slVisible(v, EXIT - 100, EXIT + 100)) {
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(EXIT - 60, 260, 120, 180);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(245,242,255,0.8)'; ctx.fillRect(EXIT - 46, 274, 92, 166); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of WALKS) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x0, y - 8, x1 - x0, 8); continue; }
      ctx.fillStyle = '#1a1030'; ctx.fillRect(x0, y, x1 - x0, 30);
      ctx.fillStyle = '#3a2a4a'; for (let x = x0; x < x1; x += 14) ctx.fillRect(x, y, 3, 30);
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x0 + 20, y + 30, 8, 200); ctx.fillRect(x1 - 28, y + 30, 8, 200);
    }
  }

  STORY_LEVELS[136] = {
    sky: ['#06020c', '#0c0618', '#100820'],
    groundColor: '#06020c',
    platColor: '#3a2a4a',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
