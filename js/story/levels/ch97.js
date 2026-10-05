'use strict';
// js/story/levels/ch97.js — Chapter 97 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 97 — Shadow Warden (walk → duel vs the Shadow Warden, 1 life)
// The inner Court, where the Warden "had never been found". The walls are
// lined with masks — rows of pale blank faces in niches, every one turned
// slightly away from you, and the ones nearest you turn further. The floor
// is black glass that reflects nothing. At the midpoint the Warden's ground:
// a ring of tall mirrors standing in a circle, each showing only darkness —
// except that, for a moment, one of them shows a figure that isn't there.
// Past it, the way out of the realm, where a thin vertical line of daylight
// has opened (the realm giving you up). Mask niches stacked into ledges are
// the climbs; the cache shafts are cracks in the glass floor.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, RING = 3000, OUT = 5650;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2220, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const MIRRORS = [-320, -220, -120, 120, 220, 320];
  const CRACKS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, RING - 340, 360, 100); _slLedge(P, RING + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#030305');
    ctx.fillStyle = '#09090d'; ctx.fillRect(v.x - 10, 40, v.w + 20, G - 40);
    // The masks, turned away; nearer ones turn further
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    for (let c = Math.floor(v.x / 70) - 1; c * 70 < v.x + v.w + 70; c++) for (let r = 0; r < 4; r++) {
      const x = c * 70 + 35, y = 90 + r * 70;
      if (_slHash(c * 7 + r + 970) < 0.15) continue;
      ctx.fillStyle = '#050508'; ctx.fillRect(x - 22, y - 28, 44, 56);
      const away = p1 ? Math.max(-1, Math.min(1, (x - p1.cx()) / 300)) : 0.4;
      ctx.fillStyle = '#b8b4c8';
      ctx.beginPath(); ctx.ellipse(x + away * 6, y, 13 - Math.abs(away) * 5, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#050508'; ctx.fillRect(x + away * 9 - 6, y - 5, 4, 2); ctx.fillRect(x + away * 9 + 2, y - 5, 4, 2);
    }
  }

  function back(v) {
    for (const [x, y, w] of CLIMB) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#121218'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = 'rgba(170,160,220,0.4)'; ctx.fillRect(x, y, w, 1.5);
      for (let k = 0; k < Math.floor(w / 36); k++) { ctx.fillStyle = '#b8b4c8'; ctx.beginPath(); ctx.ellipse(x + 18 + k * 36, y + 24, 8, 11, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // The ring of mirrors showing only darkness — mostly
    if (_slVisible(v, RING - 420, RING + 420)) {
      const flash = Math.floor(frameCount / 200) % MIRRORS.length, on = (frameCount % 200) < 14;
      MIRRORS.forEach((dx, i) => {
        const x = RING + dx;
        ctx.fillStyle = '#2a2a34'; ctx.fillRect(x - 30, 210, 60, G - 210);
        ctx.fillStyle = '#020203'; ctx.fillRect(x - 24, 218, 48, G - 226);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(x - 20, 222); ctx.lineTo(x - 6, 222); ctx.lineTo(x - 20, 280); ctx.fill();
        if (on && i === flash) {
          ctx.strokeStyle = 'rgba(200,190,240,0.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, 300, 7, 0, Math.PI * 2); ctx.moveTo(x, 307); ctx.lineTo(x, 350); ctx.lineTo(x - 8, 380); ctx.moveTo(x, 350); ctx.lineTo(x + 8, 380); ctx.stroke();
        }
      });
      for (const x of [RING - 340, RING + 240]) { ctx.fillStyle = '#121218'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = 'rgba(170,160,220,0.4)'; ctx.fillRect(x, 360, 100, 1.5); }
    }
    // The way out: a line of daylight opening in the dark
    if (_slVisible(v, OUT - 200, OUT + 200)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(OUT - 30, 0, OUT + 30, 0);
      g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.5, `rgba(255,245,225,${0.6 + 0.1 * Math.sin(frameCount * 0.04)})`); g.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = g; ctx.fillRect(OUT - 30, 60, 60, G - 60);
      ctx.restore();
    }
    // Cracks in the glass floor over the cache shafts
    for (const cx of CRACKS) {
      if (!_slVisible(v, cx - 120, cx + 120)) continue;
      ctx.strokeStyle = 'rgba(170,160,220,0.4)'; ctx.lineWidth = 1;
      for (const s of [-1, 1]) { ctx.beginPath(); _slJag(cx + s * 46, G - 2, cx + s * 120, G - 4, 5, 3, 971 + s).forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tunnel', face: 'concrete' }]);
    if (ph === 'front') {
      ctx.fillStyle = 'rgba(4,4,8,0.65)';
      for (const f of a.platforms || []) if (f.isFloor) { const x0 = Math.max(f.x, v.x - 20), x1 = Math.min(f.x + f.w, v.x + v.w + 20); if (x1 > x0) ctx.fillRect(x0, f.y + 12, x1 - x0, Math.min(f.h, 120) - 12); }
    }
    if (ph === 'back') { ctx.fillStyle = 'rgba(5,5,8,0.75)'; ctx.fillRect(v.x - 20, G - 20, v.w + 40, 20); }
  }

  STORY_LEVELS[97] = {
    sky: ['#030305', '#07070b', '#0c0c12'],
    groundColor: '#0e0e13',
    platColor: '#121218',
    layout, backdrop, back, surface,
  };
})();
