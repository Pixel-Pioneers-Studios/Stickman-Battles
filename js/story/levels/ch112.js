'use strict';
// js/story/levels/ch112.js — Chapter 112 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 112 — Seraph (walk → duel vs Seraph, 1 life)
// The centre of the Quiet Expanse, where energy goes "to stop existing". The
// whole map leans toward the midpoint: ash drifts in slow streams along the
// ground toward it, the ruins on either side tilt inward, and the light in
// the sky bends toward one point above the duel ground the way water bends
// toward a drain. The duel ground itself is a shallow bowl of concentric
// rings worn into the ash by centuries of everything sliding in. Seraph is
// trying to hold it back; the rings pulse slower while the fight is on.
// Tilted ruin slabs are the climbs; the cache shafts are sinkholes the ash
// pours down into.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, CENTER = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const HOLES = [1800, 4680];
  const toward = x => Math.sign(CENTER - x);

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, CENTER - 340, 360, 100); _slLedge(P, CENTER + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020a0c');
    // Light bending toward the point over the duel ground
    for (let k = 0; k < 16; k++) {
      const sx = v.x + (k / 15) * v.w, d = CENTER - sx;
      ctx.strokeStyle = 'rgba(150,210,210,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, v.y); ctx.quadraticCurveTo(sx + d * 0.25, 120, sx + d * 0.6, 200); ctx.stroke();
    }
    _slParallax(v, 0.15, (l, r) => {
      for (let i = Math.floor(l / 150) - 1; i * 150 < r + 150; i++) {
        const x = i * 150 + _slHash(i + 1120) * 60, h = 50 + _slHash(i + 1121) * 110, t = 0.15 * Math.sign(CENTER * 0.15 + 450 - x);
        ctx.save(); ctx.translate(x, G); ctx.rotate(t); ctx.fillStyle = '#16262a'; ctx.fillRect(-30, -h, 60, h); ctx.restore();
      }
    });
  }

  function back(v) {
    // Ash streaming along the ground toward the centre
    for (let k = 0; k < 30; k++) {
      const base = v.x + _slHash(k + 1122) * v.w, dir = toward(base);
      const x = base + dir * ((frameCount * (0.6 + _slHash(k) * 0.8)) % 160);
      ctx.fillStyle = 'rgba(160,180,180,0.35)'; ctx.fillRect(x, G - 4 - _slHash(k + 1123) * 30, 10, 1.5);
    }
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 20, x + w + 20)) {
      ctx.save(); ctx.translate(x + w / 2, G); ctx.rotate(0.05 * toward(x));
      ctx.fillStyle = '#3a4a4e'; ctx.fillRect(-w / 2, y - G, w, G - y); ctx.restore();
      ctx.fillStyle = '#5a6a6e'; ctx.fillRect(x, y, w, 3);
    }
    if (_slVisible(v, CENTER - 420, CENTER + 420)) {
      for (const x of [CENTER - 340, CENTER + 240]) { ctx.fillStyle = '#3a4a4e'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#5a6a6e'; ctx.fillRect(x, 360, 100, 3); }
      ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(CENTER, 200, 10, 26, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Sinkholes the ash pours into, over the cache shafts
    for (const hx of HOLES) if (_slVisible(v, hx - 90, hx + 90)) {
      for (let k = 0; k < 10; k++) { const t = ((frameCount * 0.8 + k * 20) % 100) / 100; ctx.fillStyle = `rgba(160,180,180,${0.5 * (1 - t)})`; ctx.fillRect(hx - 60 + k * 12 + t * (k < 5 ? 20 : -20), G - 2 + t * 30, 3, 3); }
    }
  }

  function surface(v, a, ph) {
    const x0 = v.x - 20, x1 = v.x + v.w + 20;
    if (ph === 'back') {
      for (const f of a.platforms || []) if (f.isFloor) {
        const s0 = Math.max(f.x, x0), s1 = Math.min(f.x + f.w, x1);
        if (s1 > s0) { ctx.fillStyle = '#4a5a5e'; ctx.fillRect(s0, f.y - 12, s1 - s0, 12); }
      }
      // The bowl of rings worn into the ash; slower while Seraph holds it back
      if (_slVisible(v, CENTER - 320, CENTER + 320)) {
        const t = (frameCount * 0.004) % 1;
        for (let k = 1; k <= 5; k++) { ctx.strokeStyle = `rgba(160,210,210,${0.12 + 0.2 * Math.abs(Math.sin((k / 5 - t) * Math.PI))})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(CENTER, G - 6, k * 56, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
      return;
    }
    for (const f of a.platforms || []) if (f.isFloor) {
      const s0 = Math.max(f.x, x0), s1 = Math.min(f.x + f.w, x1);
      if (s1 <= s0) continue;
      const g = ctx.createLinearGradient(0, f.y, 0, f.y + 88); g.addColorStop(0, '#2a3a3e'); g.addColorStop(1, '#0a1416');
      ctx.fillStyle = g; ctx.fillRect(s0, f.y, s1 - s0, Math.min(f.h, 88));
      ctx.fillStyle = 'rgba(200,230,230,0.25)'; ctx.fillRect(s0, f.y, s1 - s0, 1.5);
    }
  }

  STORY_LEVELS[112] = {
    sky: ['#020a0c', '#051216', '#0a1c20'],
    groundColor: '#142022',
    platColor: '#4a5a5e',
    layout, backdrop, back, surface,
  };
})();
