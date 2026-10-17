'use strict';
// Chapter 19 map. Contract in smb-story-levels.js.

// Chapter 19, Mirror Fracture (walk, then duel your fracture echo). Built from STORY_LEVELS[0]
// at draw time, so it always matches the original street.
(function () {
  const WL = 6000, G = 440;
  const L0 = () => STORY_LEVELS[0];
  const mv = v => ({ x: WL - (v.x + v.w), y: v.y, w: v.w, h: v.h });
  const mirrored = fn => { ctx.save(); ctx.translate(WL, 0); ctx.scale(-1, 1); try { fn(); } finally { ctx.restore(); } };
  // Inversion of whatever is already on screen inside a world rect
  function invert(x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(40,10,60,0.30)'; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function layout(worldLen) {
    const L = L0(); if (!L || !L.layout) return [];
    return L.layout(WL).map(p => Object.assign({}, p, { x: WL - p.x - p.w }));
  }

  function backdrop(v) {
    const L = L0(); if (!L) return;
    mirrored(() => L.backdrop(mv(v)));
  }

  function back(v, a) {
    const L = L0(); if (!L) return;
    mirrored(() => L.back(mv(v), a));
    invert(v.x - 2, v.y - 2, v.w + 4, G - v.y + 2);
    // Seams where the mirror meets itself: hairline reflections in the air
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(220,200,255,0.25)'; ctx.lineWidth = 1;
    for (let k = Math.floor(v.x / 700); k * 700 < v.x + v.w; k++) {
      const sx = k * 700 + 350;
      ctx.beginPath(); ctx.moveTo(sx, v.y); ctx.lineTo(sx + 30, G); ctx.stroke();
    }
    ctx.restore();
  }

  function surface(v, a, ph) {
    const L = L0(); if (!L) return;
    mirrored(() => L.surface(mv(v), Object.assign({}, a, { undergroundRects: [] }), ph));
    if (ph === 'front') invert(v.x - 2, G, v.w + 4, v.y + v.h - G + 2);
  }

  STORY_LEVELS[19] = {
    sky: ['#79a7cc', '#e4d6bc'],
    groundColor: '#3a3029',
    platColor: '#4a4038',
    layout, backdrop, back, surface,
  };
})();
