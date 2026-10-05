'use strict';
// js/story/levels/ch48.js — Chapter 48 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 48 — The Herald of Nothing (walk → duel vs the Herald)
// The threshold before the rift core. Everything the rift absorbed is
// thinning out here: colour drains toward white the further you walk, and
// the floor's edges dissolve upward in slow flakes. "It drifted into my
// network sixty years ago... Still standing." The Herald's waiting place is
// the midpoint — a single stone bench and, scratched beside it, sixty years
// of tallies. Pale arches (the old threshold gates) step up along the walk.
// Beyond the bench, the rift core opens. Cache shafts are dissolve-hollows.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, BENCH = 3000, CORE = 5600;
  const ARCH = [[400, 350, 110], [530, 270, 120], [1160, 340, 110], [1290, 260, 120], [2240, 350, 100], [2360, 270, 110],
                [3650, 350, 100], [3770, 270, 120], [5000, 340, 110], [5130, 260, 110]];
  const HOLLOW = [1800, 4680];
  // 0 at the start of the walk → 1 at the core: how far the colour has drained
  const pale = x => Math.max(0, Math.min(1, x / 5600));

  function layout() {
    const P = [];
    for (const [x, y, w] of ARCH) _slLedge(P, x, y, w);
    _slLedge(P, BENCH - 50, G - 34, 100);
    return P;
  }

  function backdrop(v) {
    // The sky drains to white the closer the camera is to the core
    const p = pale(v.x + v.w / 2);
    ctx.fillStyle = `rgba(235,235,245,${p * 0.75})`; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, v.h + 20);
    _slParallax(v, 0.06, (l, r) => {
      ctx.fillStyle = `rgba(255,255,255,${0.6 - p * 0.5})`;
      for (let i = Math.floor(l / 30); i * 30 < r; i++) if (_slHash(i + 48) < 0.25) ctx.fillRect(i * 30 + _slHash(i) * 20, -200 + _slHash(i + 3) * 600, 1.2, 1.2);
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // Pale threshold gates, stepping up along the walk
    for (const [x, y, w] of ARCH) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      const p = pale(x), c = Math.round(80 + p * 150);
      ctx.fillStyle = `rgb(${c},${c},${c + 12})`;
      ctx.fillRect(x, y, w, 10); ctx.fillRect(x + 6, y + 10, 12, G - y - 10); ctx.fillRect(x + w - 18, y + 10, 12, G - y - 10);
      ctx.strokeStyle = `rgb(${c},${c},${c + 12})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x + w / 2, y, w / 2 - 6, Math.PI, 0); ctx.stroke();
    }
    // The floor's edge dissolving upward in slow flakes
    for (let k = Math.floor(x0 / 24); k * 24 < x1; k++) {
      const t = ((frameCount * 0.4 + _slHash(k) * 300) % 300) / 300;
      if (_slHash(k + 7) < 0.5) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - t) * (0.3 + pale(k * 24))})`;
      ctx.fillRect(k * 24 + Math.sin(t * 6 + k) * 6, G - t * 220, 3, 3);
    }
    // Dissolve-hollows over the cache shafts
    for (const hx of HOLLOW) {
      if (!_slVisible(v, hx - 70, hx + 70)) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(hx, G, hx, G - 120);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(hx - 46, G - 120, 92, 120);
      ctx.restore();
    }
    // The waiting place: a bench and sixty years of tallies
    if (_slVisible(v, BENCH - 300, BENCH + 300)) {
      ctx.fillStyle = '#9a9aa8'; ctx.fillRect(BENCH - 50, G - 34, 100, 10);
      ctx.fillStyle = '#7a7a88'; ctx.fillRect(BENCH - 42, G - 24, 10, 24); ctx.fillRect(BENCH + 32, G - 24, 10, 24);
      ctx.fillStyle = '#6a6a78'; ctx.fillRect(BENCH + 120, G - 200, 160, 200);
      ctx.fillStyle = 'rgba(30,30,40,0.6)';
      for (let k = 0; k < 60; k++) {
        const tx = BENCH + 140 + (k % 10) * 12, ty = G - 190 + Math.floor(k / 10) * 31;
        if (k % 5 === 4) ctx.fillRect(tx - 50, ty + 11, 54, 2); else ctx.fillRect(tx, ty, 2, 24);
      }
      ctx.fillStyle = 'rgba(40,40,50,0.7)'; ctx.font = 'italic 10px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('LX', BENCH + 200, G - 6);
    }
    // The rift core, opening beyond
    if (_slVisible(v, CORE - 400, CORE + 400)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CORE, G - 160, 10, CORE, G - 160, 340);
      g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(220,220,255,0)');
      ctx.fillStyle = g; ctx.fillRect(CORE - 360, G - 520, 720, 520);
      ctx.restore();
      _slPortal(CORE, G - 160, 70, 240, 48);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]);
    if (ph === 'back') { ctx.fillStyle = `rgba(240,240,250,${pale(v.x + v.w / 2) * 0.5})`; ctx.fillRect(v.x - 20, G - 22, v.w + 40, 22); }
  }

  STORY_LEVELS[48] = {
    sky: ['#14141c', '#3a3a48'],
    groundColor: '#1e1e26',
    platColor: '#9a9aa8',
    layout, backdrop, back, surface,
  };
})();
