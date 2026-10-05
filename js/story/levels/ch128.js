'use strict';
// js/story/levels/ch128.js — Chapter 128 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 128 — The Architecture (traversal, 12 guards)
// The Creator's domain: "built from compressed dimensional logic". You enter
// alone — at the threshold, the Architects stand outside the boundary line
// and do not cross ("The fragment bearer goes alone"). Inside, everything is
// the same white-violet lattice compressed to different densities: terraces
// of it at different heights (the floor here rises and falls in steps),
// beams of it hanging in the air (the high routes), and walls of it in the
// distance packed so tight they read as solid. The garrison waits in
// sequence along the way. At the far end, the Dimensional Anchor Node — a
// knot where every lattice line in the domain is tied down — with its last
// three keepers stood in front of it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const TERR = [[0, 700, 440], [700, 1150, 410], [1150, 1600, 440], [1600, 2000, 400], [2000, 2700, 440], [2700, 3100, 415],
                [3100, 3700, 440], [3700, 4100, 400], [4100, 5500, 440]];
  const BEAMS = [[900, 300, 120], [1400, 320, 110], [1750, 280, 110], [2350, 320, 120], [2850, 300, 110], [3400, 320, 120], [3850, 280, 110]];
  const BOUNDARY = 360, NODE = 4900;

  function floor() { return TERR.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of BEAMS) _slLedge(P, x, y, w);
    return P;
  }

  function lattice(x, y, w, h, a, step) {
    ctx.strokeStyle = `rgba(200,190,255,${a})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = x; gx <= x + w; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (let gy = y; gy <= y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    ctx.stroke();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    // Walls of lattice packed so tight they read as solid
    _slParallax(v, 0.15, (l, r) => {
      for (let i = Math.floor(l / 260) - 1; i * 260 < r + 260; i++) {
        const x = i * 260 + _slHash(i + 1280) * 80, h = 160 + _slHash(i + 1281) * 220;
        ctx.fillStyle = 'rgba(60,40,110,0.35)'; ctx.fillRect(x, 440 - h, 140, h);
        lattice(x, 440 - h, 140, h, 0.18, 10);
      }
    });
  }

  function back(v) {
    // The threshold: the Architects stand outside the boundary and don't cross
    if (_slVisible(v, BOUNDARY - 300, BOUNDARY + 80)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(220,210,255,0.5)'; ctx.fillRect(BOUNDARY - 2, 40, 4, 400); ctx.restore();
      for (const [ax, c] of [[BOUNDARY - 120, 'rgba(136,204,102,0.45)'], [BOUNDARY - 200, 'rgba(204,170,102,0.45)']]) {
        ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(ax, 440 - 72, 8, 0, Math.PI * 2); ctx.moveTo(ax, 440 - 64); ctx.lineTo(ax, 440 - 30); ctx.lineTo(ax - 8, 440); ctx.moveTo(ax, 440 - 30); ctx.lineTo(ax + 8, 440); ctx.stroke();
      }
    }
    // Terraces of compressed lattice
    for (const [x0, x1, y] of TERR) if (_slVisible(v, x0, x1) && y < 440) { ctx.fillStyle = 'rgba(80,60,140,0.4)'; ctx.fillRect(x0, y, x1 - x0, 440 - y); lattice(x0, y, x1 - x0, 440 - y, 0.35, 8); }
    // Hanging beams (the high routes)
    for (const [x, y, w] of BEAMS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = 'rgba(120,100,200,0.5)'; ctx.fillRect(x, y, w, 12); lattice(x, y, w, 12, 0.6, 6);
      ctx.strokeStyle = 'rgba(200,190,255,0.25)'; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, v.y - 20); ctx.stroke();
    }
    // The Dimensional Anchor Node: every lattice line in the domain tied down
    if (_slVisible(v, NODE - 400, NODE + 400)) {
      for (let k = 0; k < 24; k++) {
        const a = k * Math.PI / 12, ex = NODE + Math.cos(a) * 700, ey = 220 + Math.sin(a) * 400;
        ctx.strokeStyle = 'rgba(200,190,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(NODE, 220); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(NODE, 220, 4, NODE, 220, 80); g.addColorStop(0, 'rgba(240,230,255,0.9)'); g.addColorStop(1, 'rgba(150,120,255,0)');
      ctx.fillStyle = g; ctx.fillRect(NODE - 80, 140, 160, 160); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of TERR) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#d8d0f0'; ctx.fillRect(x0, y - 8, x1 - x0, 8); continue; }
      ctx.fillStyle = '#1a1030'; ctx.fillRect(x0, y, x1 - x0, 600 - y);
      lattice(x0, y, x1 - x0, 140, 0.25, 20);
      ctx.fillStyle = 'rgba(240,235,255,0.7)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
    }
  }

  STORY_LEVELS[128] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#7864c8',
    sceneX: 420,
    floor, layout, backdrop, back, surface,
  };
})();
