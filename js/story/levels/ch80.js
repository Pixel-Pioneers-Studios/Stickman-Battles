'use strict';
// js/story/levels/ch80.js — Chapter 80 map (story ARENA, boss). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 80 — Proof of Understanding (boss vs the Fallen God, one screen)
// The Fallen God's trial ground, at the centre of the thing it built: the
// walls between dimensions, seen from inside as rings of gold light nested
// out to the horizon, each with a world faintly showing through it — the
// blueprint from the origin vault, made real. The dais you fight on is
// inlaid with the same plan. High on the back wall is the seat it no longer
// sits in, cracked down the middle. The walls brighten through the fight as
// it is satisfied ("Good. Do not stop."). Golden stepping stones in the
// void-arena layout the boss floor hazard was tuned for. Built on the
// Creator arena's boss rules.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460;
  const STONES = [[350, 225, 200], [80, 295, 140], [680, 295, 140], [205, 378, 110], [585, 378, 110], [150, 152, 110], [640, 152, 110]];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of STONES) P.push({ x, y, w, h: 16, noDraw: true });
    return P;
  }

  function stage() {
    const n = (typeof storyFightScript !== 'undefined' && storyFightScript.length) || 4;
    const i = (typeof storyFightScriptIdx !== 'undefined') ? storyFightScriptIdx : 0;
    return Math.max(0, Math.min(1, i / n));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#040308');
    const s = stage();
    // Gold dust
    for (let k = 0; k < 90; k++) {
      ctx.fillStyle = `rgba(255,220,140,${0.15 + 0.35 * _slHash(k + 800) * (0.6 + 0.4 * Math.sin(frameCount * 0.02 + k))})`;
      ctx.fillRect(v.x + _slHash(k + 801) * v.w, v.y + _slHash(k + 802) * (G - v.y), 1.5, 1.5);
    }
    // The walls between dimensions: nested rings of gold to the horizon
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {
      const R = 60 + k * 70, ry = R * 0.32, cy = 290;
      ctx.strokeStyle = `rgba(255,${200 - k * 8},${120 - k * 8},${0.10 + s * 0.15 + (k === 6 ? 0.05 : 0)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(450, cy, R, ry, 0, 0, Math.PI * 2); ctx.stroke();
      // A world showing through each wall, faintly
      const hue = Math.floor(_slHash(k + 805) * 360);
      for (let j = 0; j < 4; j++) {
        const a = Math.PI * (1.15 + j * 0.23) + k * 0.4;
        ctx.fillStyle = `hsla(${hue},50%,60%,${0.05 + s * 0.05})`;
        ctx.fillRect(450 + Math.cos(a) * R - 8, cy + Math.sin(a) * ry - 14, 16, 14);
      }
    }
    ctx.restore();
    // The seat it no longer sits in, high on the back wall, cracked through
    ctx.fillStyle = '#3a3020';
    ctx.beginPath(); ctx.moveTo(400, 120); ctx.lineTo(500, 120); ctx.lineTo(492, 30); ctx.lineTo(470, 10); ctx.lineTo(430, 10); ctx.lineTo(408, 30); ctx.closePath(); ctx.fill();
    ctx.fillRect(390, 120, 120, 16);
    ctx.strokeStyle = '#0a0806'; ctx.lineWidth = 2;
    ctx.beginPath(); _slJag(450, 10, 452, 136, 7, 6, 80).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    ctx.strokeStyle = `rgba(255,210,120,${0.35 + s * 0.3})`; ctx.lineWidth = 1; ctx.strokeRect(390, 120, 120, 16);
  }

  function back() {
    for (let i = 0; i < STONES.length; i++) {
      const [x, y, w] = STONES[i];
      ctx.fillStyle = '#5a4a28';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 10, y + 16);
      for (let k = 5; k >= 0; k--) ctx.lineTo(x + 10 + (w - 20) * k / 5, y + 16 + 6 + _slHash(i * 9 + k + 800) * 18);
      ctx.lineTo(x + 10, y + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8c088'; ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = 'rgba(255,230,160,0.35)'; ctx.fillRect(x, y, w, 1.5);
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#b8a070'; ctx.fillRect(-60, G - 12, 1020, 12);
      ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.fillRect(-60, G - 12, 1020, 1.5);
      // The dais inlaid with the plan of the walls
      ctx.strokeStyle = 'rgba(90,70,30,0.6)'; ctx.lineWidth = 1;
      for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.ellipse(450, G - 6, k * 90, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 300);
    g.addColorStop(0, '#6a5a38'); g.addColorStop(0.2, '#3a3020'); g.addColorStop(1, '#040308');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    ctx.fillStyle = '#d8c088'; ctx.fillRect(0, G, 900, 2);
    _slBossFloor(0, 900, G);
  }

  STORY_LEVELS[80] = {
    sky: ['#040308', '#16100a'],
    groundColor: '#16100a',
    platColor: '#5a4a28',
    platEdge: '#d8c088',
    sceneX: 450,
    arena: { base: 'creator', platforms, props: { hasLava: false, deathY: 640 } },
    backdrop, back, surface,
  };
})();
