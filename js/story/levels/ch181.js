'use strict';
// js/story/levels/ch181.js — Chapter 181 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 181 — What Is Yours (stripped-powers duel vs the Void Vessel)
// The Trial Ground, below all dimensions. Nothing here was built: a dark
// plane of glass under a sky with no light source, and above it the
// attention that has been weighing you — a vast, faint ring with nothing in
// its centre, turning so slowly you only notice it has moved. Around the
// edge of the plane stand eight pale slabs, one for each reckoning, each a
// little brighter or dimmer according to how firmly it held. And in the
// glass under your feet, where the reflections should be, the alley — the
// first street, the first night, the place everything since started ("Only
// what you were before all of this"). Built on the void arena's rules and
// its stepping-stone layout.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460;
  const STONES = [[350, 225, 200], [80, 295, 140], [680, 295, 140], [205, 378, 110], [585, 378, 110], [150, 152, 110], [640, 152, 110]];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of STONES) P.push({ x, y, w, h: 16, noDraw: true });
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020204');
    // The attention: a vast faint ring, nothing at its centre, barely turning
    const t = frameCount * 0.0006;
    ctx.strokeStyle = 'rgba(200,200,220,0.10)'; ctx.lineWidth = 30;
    ctx.beginPath(); ctx.ellipse(450, 120, 520, 160, t, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,220,240,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    // The eight reckonings, pale slabs around the plane, brighter where they held
    for (let k = 0; k < 8; k++) {
      const x = 40 + k * 117, h = 140 + _slHash(k + 1810) * 80, held = 0.15 + 0.35 * _slHash(k + 1811);
      ctx.fillStyle = `rgba(210,210,225,${held})`; ctx.fillRect(x - 14, G - h, 28, h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x - 14, G - h, 4, h);
    }
  }

  function back() {
    for (let i = 0; i < STONES.length; i++) {
      const [x, y, w] = STONES[i];
      ctx.fillStyle = '#121218'; ctx.fillRect(x, y, w, 16);
      ctx.fillStyle = 'rgba(220,220,240,0.6)'; ctx.fillRect(x, y, w, 1.5);
      ctx.fillStyle = 'rgba(220,220,240,0.08)'; ctx.fillRect(x, y + 16, w, 30);
    }
  }

  // The alley, faint in the glass where the reflections should be
  function alley() {
    ctx.save(); ctx.beginPath(); ctx.rect(-60, G, 1020, 160); ctx.clip();
    ctx.globalAlpha = 0.22;
    for (let k = 0; k < 6; k++) { const x = 40 + k * 150, h = 100 + _slHash(k + 1812) * 60; ctx.fillStyle = '#5a4a40'; ctx.fillRect(x, G, 110, h); _slWindowGrid(x + 6, G + 20, 98, h - 30, 3, 2, { lit: 0.3, seed: 181 + k }); }
    _slStreetLamp(470, G + 200, true);
    _slDumpster(700, G + 150, 60, 30);
    ctx.restore();
  }

  function surface(v, a, ph) {
    if (ph === 'back') { ctx.fillStyle = '#1a1a22'; ctx.fillRect(-60, G - 8, 1020, 8); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 220); g.addColorStop(0, '#0e0e14'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    alley();
    ctx.fillStyle = 'rgba(220,220,240,0.5)'; ctx.fillRect(0, G, 900, 1.5);
    _slBossFloor(0, 900, G);
  }

  STORY_LEVELS[181] = {
    sky: ['#020204', '#06060a', '#0a0a10'],
    groundColor: '#0e0e14',
    platColor: '#121218',
    sceneX: 450,
    arena: { base: 'void', platforms },
    backdrop, back, surface,
  };
})();
