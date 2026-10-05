'use strict';
// js/story/levels/ch139.js — Chapter 139 map (story ARENA, gauntlet). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 139 — Between Forms (3-wave gauntlet, one screen)
// The Recalibration Chamber, while the Creator rebuilds itself. The room is
// half dismantled: the white panels hang open on their hinges with the
// lattice behind them exposed and being rewritten, lines of it erasing and
// redrawing in a slow scan. In the middle of the back wall the Creator's
// recalibration frame stands empty, a tall violet outline with the progress
// of its rebuild filling it from the bottom. Residual constructs leak out of
// the open panels. Built on the Creator arena's rules (as before); the
// ledges are panels that have come loose and lodged in the frame.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460;
  const LEDGES = [[80, 300, 150, 16], [670, 300, 150, 16], [340, 220, 220, 16], [180, 140, 120, 14], [600, 140, 120, 14]];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w, h] of LEDGES) P.push({ x, y, w, h, noDraw: true });
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#1a1030'; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, G - v.y + 10);
    // Lattice being rewritten in a slow scan
    const scan = (frameCount * 2) % 520;
    _slLattice(-40, 0, 980, G, 0.15, 20);
    ctx.fillStyle = 'rgba(200,190,255,0.12)'; ctx.fillRect(-40, scan - 6, 980, 12);
    // Panels hanging open on their hinges
    for (let k = 0; k < 8; k++) {
      const x = -20 + k * 120, ang = 0.25 + 0.15 * Math.sin(frameCount * 0.01 + k);
      ctx.save(); ctx.translate(x, 30); ctx.transform(Math.cos(ang), 0, 0, 1, 0, 0);
      ctx.fillStyle = '#d8d4e4'; ctx.fillRect(0, 0, 100, 380); ctx.strokeStyle = '#7864c8'; ctx.strokeRect(0, 0, 100, 380);
      ctx.restore();
    }
    // The empty recalibration frame, filling as the rebuild progresses
    const fill = (frameCount % 3600) / 3600;
    ctx.fillStyle = 'rgba(120,100,220,0.25)'; ctx.fillRect(400, 60 + 300 * (1 - fill), 100, 300 * fill);
    ctx.strokeStyle = '#a088ff'; ctx.lineWidth = 3; ctx.strokeRect(400, 60, 100, 300);
  }

  function back() {
    for (const [x, y, w, h] of LEDGES) {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(((x * 7) % 5 - 2) * 0.01);
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = 'rgba(120,100,200,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') { ctx.fillStyle = '#d8d4e4'; ctx.fillRect(-60, G - 10, 1020, 10); return; }
    ctx.fillStyle = '#1a1030'; ctx.fillRect(-400, G, 1700, 300); _slLattice(-60, G, 1020, 120, 0.25, 20);
    ctx.fillStyle = '#b8b4c8'; ctx.fillRect(0, G, 900, 4);
    _slBossFloor(0, 900, G);
  }

  STORY_LEVELS[139] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#ece8f8',
    sceneX: 450,
    arena: { base: 'creator', platforms, props: { hasLava: false, deathY: 640 } },
    backdrop, back, surface,
  };
})();
