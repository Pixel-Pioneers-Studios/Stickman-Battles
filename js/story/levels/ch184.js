'use strict';
// js/story/levels/ch184.js — Chapter 184 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 184 — Against Erasure (duel vs the Erasure Construct)
// The Confrontation: the Trial Ground again, but now the Void Mind's argument
// is being made physical. The plane is being erased from the edges inward —
// the dark eats the glass in ragged bites that grow while the fight goes on,
// and the grid of the Substrate under it dissolves line by line. The eight
// reckoning slabs are still standing, half-erased, and where each one held
// it glows: thin threads of light run from them to the middle of the arena,
// to you ("You carry everything"). The more the construct is hurt, the more
// the erasure recedes. Built on the void arena's rules and its
// stepping-stone layout.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460;
  const STONES = [[350, 225, 200], [80, 295, 140], [680, 295, 140], [205, 378, 110], [585, 378, 110], [150, 152, 110], [640, 152, 110]];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of STONES) P.push({ x, y, w, h: 16, noDraw: true });
    return P;
  }

  // 1 = erasure at full reach, falling as the construct takes damage
  function reach() {
    const e = (typeof players !== 'undefined' ? players : []).find(p => p && p.isAI && p.health > 0);
    return e && e.maxHealth ? 0.3 + 0.7 * (e.health / e.maxHealth) : 0.5;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#000000');
    const r = reach();
    // The Substrate's grid, dissolving line by line from the edges
    ctx.strokeStyle = 'rgba(200,200,230,0.12)'; ctx.lineWidth = 1;
    for (let x = 0; x <= 900; x += 30) { const d = Math.abs(x - 450) / 450; if (d > 1 - r * 0.7) continue; ctx.beginPath(); ctx.moveTo(x, v.y); ctx.lineTo(x, G); ctx.stroke(); }
    // The reckoning slabs, half erased, glowing where they held; threads to the centre
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    for (let k = 0; k < 8; k++) {
      const x = 40 + k * 117, h = 140 + _slHash(k + 1810) * 80, keep = 1 - r * (0.3 + 0.5 * _slHash(k + 1840));
      ctx.fillStyle = 'rgba(210,210,225,0.35)'; ctx.fillRect(x - 14, G - h * keep, 28, h * keep);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(230,225,255,${0.18 + 0.1 * Math.sin(frameCount * 0.05 + k)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, G - h * keep); ctx.lineTo(p1 ? p1.cx() : 450, p1 ? p1.y + 20 : 300); ctx.stroke();
      ctx.restore();
    }
  }

  function back(v) {
    // The dark eating the space in ragged bites from both edges
    const r = reach();
    ctx.fillStyle = '#000000';
    for (const side of [-1, 1]) {
      const edge = side < 0 ? -60 : 960, depth = 60 + r * 220;
      ctx.beginPath(); ctx.moveTo(edge, v.y - 20);
      for (let y = v.y - 20; y <= G; y += 24) ctx.lineTo(edge - side * (depth + Math.sin(y * 0.05 + frameCount * 0.02) * 20 + _slHash(Math.floor(y / 24) + (side < 0 ? 1841 : 1842)) * 30), y);
      ctx.lineTo(edge, G); ctx.closePath(); ctx.fill();
    }
    for (const [x, y, w] of STONES) { ctx.fillStyle = '#121218'; ctx.fillRect(x, y, w, 16); ctx.fillStyle = 'rgba(220,220,240,0.6)'; ctx.fillRect(x, y, w, 1.5); }
  }

  function surface(v, a, ph) {
    if (ph === 'back') { ctx.fillStyle = '#1a1a22'; ctx.fillRect(-60, G - 8, 1020, 8); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 220); g.addColorStop(0, '#0e0e14'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    ctx.fillStyle = 'rgba(220,220,240,0.5)'; ctx.fillRect(0, G, 900, 1.5);
    _slBossFloor(0, 900, G);
  }

  STORY_LEVELS[184] = {
    sky: ['#000000', '#040406', '#08080c'],
    groundColor: '#0e0e14',
    platColor: '#121218',
    sceneX: 450,
    arena: { base: 'void', platforms },
    backdrop, back, surface,
  };
})();
