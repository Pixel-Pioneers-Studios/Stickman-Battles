'use strict';
// js/story/levels/ch94.js — Chapter 94 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 94 — Into the Dark (walk → duel vs two Shadow Prowlers)
// The Shadow Realm's edge. "The light left first. Then the sound. Then any
// reliable sense of where the ground was." The walk runs from the last of the
// light into the dark: at the fracture the sky still holds a dusk glow; by
// the midpoint it is gone, and the world is obsidian spires and dead trees
// that only show where a thin pale rim catches them. Eyes open in the dark —
// pairs of them, blinking out when you get close. The fragment pulses: a
// faint ring goes out from where you stand every two seconds ("the fragment
// can feel them before you can see them"). Shattered spires are the climbs;
// the cache shafts are pits of deeper black with a violet edge.
// (The realm's own fog closes in around you as you go.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DUEL = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2360, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const PITS = [1800, 4680];
  const TREES = [300, 900, 1450, 2050, 2600, 3450, 4050, 4400, 5000, 5500];

  const light = x => Math.max(0, 1 - x / 2400);

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, DUEL - 340, 360, 100); _slLedge(P, DUEL + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#030305');
    // The last of the dusk, fading out across the first half of the walk
    const l = light(v.x + v.w / 2);
    if (l > 0) {
      const g = ctx.createLinearGradient(0, 200, 0, G);
      g.addColorStop(0, 'rgba(80,60,110,0)'); g.addColorStop(1, `rgba(120,80,140,${0.5 * l})`);
      ctx.fillStyle = g; ctx.fillRect(v.x - 10, 200, v.w + 20, G - 200);
    }
    // Obsidian spires on the horizon, rim-lit
    _slParallax(v, 0.15, (lx, rx) => {
      for (let i = Math.floor(lx / 90) - 1; i * 90 < rx + 90; i++) {
        const x = i * 90 + _slHash(i + 940) * 40, h = 80 + _slHash(i + 941) * 200;
        ctx.fillStyle = '#07070b'; ctx.beginPath(); ctx.moveTo(x - 18, G); ctx.lineTo(x, G - h); ctx.lineTo(x + 18, G); ctx.fill();
        ctx.strokeStyle = 'rgba(150,140,200,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, G - h); ctx.lineTo(x + 18, G); ctx.stroke();
      }
    });
  }

  function back(v) {
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    // Eyes in the dark, closing when you come near
    for (let k = 0; k < 40; k++) {
      const ex = 200 + k * 145 + _slHash(k + 942) * 80, ey = 250 + _slHash(k + 943) * 150;
      if (!_slVisible(v, ex - 10, ex + 10)) continue;
      if (p1 && Math.abs(p1.cx() - ex) < 260) continue;
      if (((frameCount + k * 37) % 300) < 12) continue;
      ctx.fillStyle = `rgba(200,180,255,${0.35 + 0.2 * Math.sin(frameCount * 0.05 + k)})`;
      ctx.fillRect(ex - 6, ey, 4, 2); ctx.fillRect(ex + 3, ey, 4, 2);
    }
    for (let i = 0; i < TREES.length; i++) {
      const x = TREES[i];
      if (!_slVisible(v, x - 80, x + 80)) continue;
      ctx.strokeStyle = '#0c0c12'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + 6, G - 150);
      ctx.moveTo(x + 4, G - 100); ctx.lineTo(x - 40, G - 160); ctx.moveTo(x + 6, G - 130); ctx.lineTo(x + 50, G - 190); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,150,210,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 4, G); ctx.lineTo(x + 10, G - 150); ctx.moveTo(x + 10, G - 130); ctx.lineTo(x + 52, G - 190); ctx.stroke();
    }
    // Shattered spires (the climbs)
    for (const [x, y, w] of CLIMB) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#121218';
      ctx.beginPath(); ctx.moveTo(x + 6, G); ctx.lineTo(x, y); ctx.lineTo(x + w * 0.3, y - 8); ctx.lineTo(x + w * 0.6, y + 2); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 6, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(170,160,220,0.5)'; ctx.fillRect(x, y, w, 2);
    }
    if (_slVisible(v, DUEL - 420, DUEL + 420)) for (const x of [DUEL - 340, DUEL + 240]) {
      ctx.fillStyle = '#121218'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = 'rgba(170,160,220,0.5)'; ctx.fillRect(x, 360, 100, 2);
    }
    // Pits of deeper black over the cache shafts
    for (const px of PITS) {
      if (!_slVisible(v, px - 90, px + 90)) continue;
      ctx.strokeStyle = 'rgba(160,90,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 46, G); ctx.lineTo(px - 46, G + 30); ctx.moveTo(px + 46, G); ctx.lineTo(px + 46, G + 30); ctx.stroke();
    }
    // The fragment's pulse, out from where you stand
    if (p1) {
      const t = (frameCount % 120) / 120;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(180,140,255,${0.35 * (1 - t)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p1.cx(), p1.y + p1.h, 30 + t * 320, 8 + t * 40, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tunnel', face: 'concrete' }]);
    if (ph === 'front') {
      ctx.fillStyle = 'rgba(4,4,8,0.65)';
      for (const f of a.platforms || []) if (f.isFloor) { const x0 = Math.max(f.x, v.x - 20), x1 = Math.min(f.x + f.w, v.x + v.w + 20); if (x1 > x0) ctx.fillRect(x0, f.y + 12, x1 - x0, Math.min(f.h, 120) - 12); }
    } }

  STORY_LEVELS[94] = {
    sky: ['#030305', '#07070b', '#0c0c12'],
    groundColor: '#0e0e13',
    platColor: '#121218',
    layout, backdrop, back, surface,
  };
})();
