'use strict';
// js/story/levels/ch95.js — Chapter 95 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 95 — The Unseen Court (walk → duel vs the Phase Hunters)
// The Court of the Shadow Realm, which "operated on a single rule: if you
// could be found, you lost." The walk is its outer galleries — tiered benches
// of black stone rising in steps (the climbs), every seat empty, faceless
// hooded statues standing between them with their backs to the walls. The
// midpoint is the floor of the court itself, sunk below the galleries: a
// round floor inlaid with a ring that lights wherever someone has stood, and
// the high bench at the back where nobody sits, its one lamp unlit. Phase
// Hunters leave afterimages; the court's walls are hung with veils that move
// when nothing has touched them. The cache shafts are grated drains.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, COURT = 3000;
  const BENCH = [[440, 380, 120], [560, 320, 120], [680, 260, 110], [1120, 370, 120], [1240, 300, 120], [2200, 370, 110], [2320, 300, 110],
                 [3660, 370, 110], [3780, 300, 110], [5000, 380, 120], [5120, 320, 120], [5240, 260, 110]];
  const STATUES = [380, 1050, 1500, 2100, 2550, 3450, 3950, 4350, 4950, 5450];
  const DRAINS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of BENCH) _slLedge(P, x, y, w);
    _slLedge(P, COURT - 340, 360, 100); _slLedge(P, COURT + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#030305');
    // Court walls hung with veils that move on their own
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    for (let i = Math.floor(v.x / 120) - 1; i * 120 < v.x + v.w + 120; i++) {
      const x = i * 120;
      ctx.fillStyle = '#14141c';
      ctx.beginPath(); ctx.moveTo(x, 70);
      for (let y = 70; y <= 360; y += 20) ctx.lineTo(x + Math.sin(frameCount * 0.02 + y * 0.03 + i) * 6, y);
      for (let y = 360; y >= 70; y -= 20) ctx.lineTo(x + 70 + Math.sin(frameCount * 0.02 + y * 0.03 + i + 1) * 6, y);
      ctx.fill();
    }
  }

  function statue(x) {
    ctx.fillStyle = '#16161e';
    ctx.beginPath(); ctx.moveTo(x - 24, G); ctx.lineTo(x - 18, G - 120); ctx.quadraticCurveTo(x, G - 170, x + 18, G - 120); ctx.lineTo(x + 24, G); ctx.fill();
    ctx.fillStyle = '#050508'; ctx.beginPath(); ctx.ellipse(x, G - 130, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(160,150,210,0.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 18, G - 120); ctx.lineTo(x + 24, G); ctx.stroke();
  }

  function back(v) {
    for (const x of STATUES) if (_slVisible(v, x - 30, x + 30)) statue(x);
    // Gallery benches, tiered
    for (const [x, y, w] of BENCH) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#121218'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#1e1e26'; ctx.fillRect(x - 3, y, w + 6, 6);
      ctx.fillStyle = 'rgba(170,160,220,0.35)'; ctx.fillRect(x - 3, y, w + 6, 1);
    }
    // The court floor and the high bench nobody sits at
    if (_slVisible(v, COURT - 420, COURT + 420)) {
      ctx.fillStyle = '#0e0e14'; ctx.fillRect(COURT - 120, 236, 240, 70);
      ctx.fillStyle = '#0a0a0f'; ctx.fillRect(COURT - 110, 306, 12, G - 306); ctx.fillRect(COURT + 98, 306, 12, G - 306);
      ctx.fillStyle = '#1e1e26'; ctx.fillRect(COURT - 130, 226, 260, 10);
      ctx.fillStyle = '#0a0a0f'; ctx.fillRect(COURT - 30, 180, 60, 46);
      ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(COURT, 180); ctx.lineTo(COURT, 150); ctx.stroke();
      ctx.fillStyle = '#2a2a34'; ctx.beginPath(); ctx.arc(COURT, 146, 6, 0, Math.PI * 2); ctx.fill();
      for (const x of [COURT - 340, COURT + 240]) { ctx.fillStyle = '#121218'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = 'rgba(170,160,220,0.35)'; ctx.fillRect(x, 360, 100, 1); }
    }
    // Drain grates over the cache shafts
    for (const dx of DRAINS) {
      if (!_slVisible(v, dx - 70, dx + 70)) continue;
      ctx.fillStyle = '#2a2a34'; for (let k = -46; k <= 46; k += 12) ctx.fillRect(dx + k, G - 3, 3, 3);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tunnel', face: 'concrete' }]);
    if (ph === 'front') {
      ctx.fillStyle = 'rgba(4,4,8,0.65)';
      for (const f of a.platforms || []) if (f.isFloor) { const x0 = Math.max(f.x, v.x - 20), x1 = Math.min(f.x + f.w, v.x + v.w + 20); if (x1 > x0) ctx.fillRect(x0, f.y + 12, x1 - x0, Math.min(f.h, 120) - 12); }
    }
    if (ph !== 'back' || !_slVisible(v, COURT - 260, COURT + 260)) return;
    // The court's ring lights where anyone stands on it
    const ps = (typeof players !== 'undefined' ? players : []).filter(p => p && p.health > 0 && Math.abs(p.cx() - COURT) < 240);
    ctx.strokeStyle = 'rgba(120,110,170,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(COURT, G - 8, 230, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) { ctx.fillStyle = 'rgba(190,170,255,0.5)'; ctx.fillRect(p.cx() - 20, G - 10, 40, 4); }
    ctx.restore();
  }

  STORY_LEVELS[95] = {
    sky: ['#030305', '#07070b', '#0c0c12'],
    groundColor: '#0e0e13',
    platColor: '#121218',
    layout, backdrop, back, surface,
  };
})();
