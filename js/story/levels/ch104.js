'use strict';
// js/story/levels/ch104.js — Chapter 104 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 104 — Erasure Protocol (escape, run right)
// The Core Corridor, with the architecture turned against you. The corridor
// is a long machined tube: ribbed walls, pistons that slam out of them and
// retract on a cycle, wall panels sliding shut one after another ahead of
// the erasure. Behind the escape wall the corridor is being erased line by
// line — scanlines wiping it to nothing. The floor breaks into sections with
// short gaps where the panels have already pulled away. As the run goes on
// the warning light along the ceiling changes from red to amber to off: the
// point where "something in Null's model has stalled". The Dimensional Anchor
// at the end is a heavy clamp holding the corridor to something real.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const SECTS = [[0, 1100, 440], [1180, 2000, 440], [2080, 3060, 430], [3140, 3700, 440], [3780, 4600, 440]];
  const HIGH = [[700, 340, 110], [1500, 330, 110], [1630, 250, 110], [2500, 340, 110], [3350, 330, 110], [4000, 340, 110]];
  const ANCHOR = 4300;

  function floor() { return SECTS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04030c');
    ctx.fillStyle = '#0c0a1e'; ctx.fillRect(v.x - 10, 40, v.w + 20, 400);
    // Ribbed tube walls
    for (let x = Math.floor(v.x / 50) * 50; x < v.x + v.w + 50; x += 50) { ctx.fillStyle = '#14122a'; ctx.fillRect(x, 40, 10, 400); }
    // Ceiling warning strip: red, then amber, then dark as Null's model stalls
    const mid = v.x + v.w / 2, col = mid < 1800 ? '255,60,60' : mid < 3300 ? '255,170,60' : null;
    ctx.fillStyle = '#1a1830'; ctx.fillRect(v.x - 10, 40, v.w + 20, 18);
    if (col) for (let x = Math.floor(v.x / 120) * 120; x < v.x + v.w + 120; x += 120) {
      const on = ((frameCount >> 4) + x / 120) % 2 < 1;
      ctx.fillStyle = `rgba(${col},${on ? 0.8 : 0.25})`; ctx.fillRect(x + 20, 44, 60, 8);
    }
  }

  function back(v) {
    // Erasure behind the wall: the corridor wiped away line by line
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) {
      ctx.fillStyle = '#020108'; ctx.fillRect(v.x - 40, v.y - 40, wx - v.x + 40, v.h + 80);
      for (let y = 40; y < 520; y += 6) { ctx.fillStyle = `rgba(160,150,255,${0.1 * _slHash(y + (frameCount >> 1))})`; ctx.fillRect(wx - 120, y, 120, 2); }
    }
    // Pistons slamming out of the walls on a cycle (back wall, dimmed: scenery, not a hazard)
    ctx.globalAlpha = 0.55;
    for (let k = Math.floor(v.x / 320); k * 320 < v.x + v.w + 320; k++) {
      if (k < 1 || k * 320 > 4400) continue;
      const x = k * 320 + 80, ph = ((frameCount + k * 37) % 150) / 150, ext = ph < 0.15 ? ph / 0.15 : ph < 0.4 ? 1 : Math.max(0, 1 - (ph - 0.4) / 0.3);
      const y = 120 + (k % 3) * 70;
      ctx.fillStyle = '#262440'; ctx.fillRect(x - 30, 58, 60, 20);
      ctx.fillStyle = '#3a3860'; ctx.fillRect(x - 10, 78, 20, (y - 78) * ext + 10);
      ctx.fillStyle = '#4a4878'; ctx.fillRect(x - 34, 78 + (y - 78) * ext, 68, 16);
    }
    ctx.globalAlpha = 1;
    // Wall panels sliding shut ahead of the erasure
    for (let k = Math.floor(v.x / 600); k * 600 < v.x + v.w + 600; k++) {
      const x = k * 600 + 300, shut = Math.max(0, Math.min(1, (wx + 900 - x) / 600));
      ctx.fillStyle = '#1e1c36'; ctx.fillRect(x - 80, 80, 80 * shut, 330); ctx.fillRect(x + 80 - 80 * shut, 80, 80 * shut, 330);
      ctx.strokeStyle = 'rgba(160,150,255,0.3)'; ctx.strokeRect(x - 80, 80, 160, 330);
    }
    for (const [x, y, w] of HIGH) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#262440'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = 'rgba(200,190,255,0.6)'; ctx.fillRect(x, y, w, 1.5);
      ctx.fillStyle = '#1a1830'; ctx.fillRect(x + w / 2 - 5, y + 10, 10, 440 - y - 10);
    }
    // The Dimensional Anchor: a clamp holding the corridor to something real
    if (_slVisible(v, ANCHOR - 160, ANCHOR + 160)) {
      ctx.fillStyle = '#3a3860'; ctx.fillRect(ANCHOR - 120, 60, 40, 380); ctx.fillRect(ANCHOR + 80, 60, 40, 380); ctx.fillRect(ANCHOR - 120, 200, 240, 30);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(ANCHOR, 215, 6, ANCHOR, 215, 120);
      g.addColorStop(0, 'rgba(230,230,255,0.7)'); g.addColorStop(1, 'rgba(150,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(ANCHOR - 120, 95, 240, 240);
      ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of SECTS) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#262440'; ctx.fillRect(x0, y - 12, x1 - x0, 12); ctx.fillStyle = 'rgba(200,190,255,0.35)'; ctx.fillRect(x0, y - 12, x1 - x0, 1); continue; }
      ctx.fillStyle = '#1a1830'; ctx.fillRect(x0, y, x1 - x0, 160);
      ctx.fillStyle = '#3a3860'; ctx.fillRect(x0, y, x1 - x0, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = Math.ceil(x0 / 80) * 80; x < x1; x += 80) ctx.fillRect(x, y + 8, 2, 150);
      ctx.fillStyle = 'rgba(200,190,255,0.5)'; ctx.fillRect(x0, y, 2, 160); ctx.fillRect(x1 - 2, y, 2, 160);
    }
  }

  STORY_LEVELS[104] = {
    sky: ['#04030c', '#080614', '#0c0a1e'],
    groundColor: '#04030c',
    platColor: '#262440',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
