'use strict';
// js/story/levels/ch96.js — Chapter 96 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 96 — What You Cannot See (stealth)
// The road to the Shadow Court, watched by sentinels. Each sentinel hangs over
// the path as a cage of black glass with one violet eye in it, and its sight
// falls on the ground as a dim violet pool — exactly its detection zone
// (detection sits at guard y = 395). Every post has a high route: a broken
// spire to step on, then an obsidian bridge thrown over the pool, out of its
// sight. Between posts the realm is spires and dead trees picked out by thin
// rims of light. "Use the fragment's pulse to navigate": the pulse ring goes
// out from you as in the entry, and sentinels' eyes flare when it reaches
// them. The Shadow Court is a gate of black stone at the end, its threshold
// lit violet. (First post moved to x=750, clear of the x=450 spawn edge —
// mirrored in stealthGuardDefs and spawnEnemies.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, GATE = 3300;
  const POSTS = [[750, 100], [1300, 95], [2000, 105], [2800, 95]];
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], bridge: [x - r - 90, 270, 2 * r + 180] }));

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.bridge); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#030305');
    _slParallax(v, 0.15, (l, r) => {
      for (let i = Math.floor(l / 90) - 1; i * 90 < r + 90; i++) {
        const x = i * 90 + _slHash(i + 960) * 40, h = 80 + _slHash(i + 961) * 220;
        ctx.fillStyle = '#07070b'; ctx.beginPath(); ctx.moveTo(x - 18, G); ctx.lineTo(x, G - h); ctx.lineTo(x + 18, G); ctx.fill();
        ctx.strokeStyle = 'rgba(150,140,200,0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, G - h); ctx.lineTo(x + 18, G); ctx.stroke();
      }
    });
  }

  function back(v) {
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    const pulseT = (frameCount % 120) / 120, pulseR = 30 + pulseT * 320;
    for (let i = 0; i < POSTS.length; i++) {
      const [x, r] = POSTS[i], R = ROUTES[i];
      if (!_slVisible(v, R.step[0] - 20, R.bridge[0] + R.bridge[2] + 20)) continue;
      // The sentinel's sight: a dim violet pool on the ground
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, 395, 10, x, 395, r);
      g.addColorStop(0, 'rgba(150,80,255,0.16)'); g.addColorStop(1, 'rgba(120,60,220,0.03)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 395, r, Math.PI, 0); ctx.lineTo(x + r, G); ctx.lineTo(x - r, G); ctx.fill();
      ctx.restore();
      // The cage of black glass, its eye flaring when the pulse reaches it
      const cy = 395 - r - 80 + Math.sin(frameCount * 0.03 + i) * 3;
      const hit = p1 && Math.abs(Math.abs(p1.cx() - x) - pulseR) < 30;
      ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, cy - 16); ctx.lineTo(x, cy - 60); ctx.stroke();
      ctx.fillStyle = 'rgba(20,20,30,0.9)'; ctx.fillRect(x - 12, cy - 16, 24, 32);
      ctx.strokeStyle = 'rgba(170,160,220,0.5)'; ctx.strokeRect(x - 12, cy - 16, 24, 32);
      ctx.fillStyle = hit ? '#e0c8ff' : '#9a5aff'; ctx.beginPath(); ctx.ellipse(x, cy, 6, hit ? 4 : 2.5, 0, 0, Math.PI * 2); ctx.fill();
      // Step (a broken spire) and the obsidian bridge over the pool
      const [sx, sy, sw] = R.step, [bx, by, bw] = R.bridge;
      ctx.fillStyle = '#121218';
      ctx.beginPath(); ctx.moveTo(sx + 6, G); ctx.lineTo(sx, sy); ctx.lineTo(sx + sw * 0.4, sy - 6); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx + sw - 6, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(170,160,220,0.5)'; ctx.fillRect(sx, sy, sw, 2);
      ctx.fillStyle = '#16161e';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw - 10, by + 14); ctx.quadraticCurveTo(bx + bw / 2, by + 40, bx + 10, by + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(170,160,220,0.55)'; ctx.fillRect(bx, by, bw, 2);
      ctx.fillStyle = '#121218'; ctx.fillRect(bx + 4, by + 10, 10, G - by - 10); ctx.fillRect(bx + bw - 14, by + 10, 10, G - by - 10);
    }
    // The Shadow Court's gate
    if (_slVisible(v, GATE - 160, GATE + 160)) {
      ctx.fillStyle = '#121218'; ctx.fillRect(GATE - 120, 160, 50, G - 160); ctx.fillRect(GATE + 70, 160, 50, G - 160); ctx.fillRect(GATE - 140, 140, 280, 30);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 170, 0, G);
      g.addColorStop(0, 'rgba(150,80,255,0)'); g.addColorStop(1, `rgba(150,80,255,${0.35 + 0.1 * Math.sin(frameCount * 0.05)})`);
      ctx.fillStyle = g; ctx.fillRect(GATE - 70, 170, 140, G - 170);
      ctx.restore();
    }
    if (p1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(180,140,255,${0.35 * (1 - pulseT)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p1.cx(), p1.y + p1.h, pulseR, 8 + pulseT * 40, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3800, kind: 'tunnel', face: 'concrete' }]);
    if (ph === 'front') {
      ctx.fillStyle = 'rgba(4,4,8,0.65)';
      for (const f of a.platforms || []) if (f.isFloor) { const x0 = Math.max(f.x, v.x - 20), x1 = Math.min(f.x + f.w, v.x + v.w + 20); if (x1 > x0) ctx.fillRect(x0, f.y + 12, x1 - x0, Math.min(f.h, 120) - 12); }
    } }

  STORY_LEVELS[96] = {
    sky: ['#030305', '#07070b', '#0c0c12'],
    groundColor: '#0e0e13',
    platColor: '#121218',
    layout, backdrop, back, surface,
  };
})();
