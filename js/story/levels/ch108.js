'use strict';
// js/story/levels/ch108.js — Chapter 108 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 108 — Into the Silence (stealth)
// The Quiet Expanse: a dimension drained of energy. Everything is the colour
// of ash under a teal sky with no sun; the dunes are still, nothing moves but
// you. Seraph's constructs stand over the path, hollow shells with the
// middle missing, and the ground around each one is visibly drained — a
// pool where even the dust has gone dark (its detection zone; detection sits
// at guard y = 395). "Stay in the drain gaps": each post has a high route, a
// dead stone to step on and then a leaning slab of the old world carried
// over the pool. At the far end, the centre of the expanse: light bending
// inward toward a shape that is less a presence than an absence. (First post
// moved to x=750, clear of the x=450 spawn edge — mirrored in
// stealthGuardDefs and spawnEnemies.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, CENTER = 3500;
  const POSTS = [[750, 95], [1200, 100], [1900, 95], [2700, 100], [3400, 105]];
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], slab: [x - r - 90, 270, 2 * r + 180] }));

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.slab); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020a0c');
    _slParallax(v, 0.1, (l, r) => {
      ctx.fillStyle = '#16262a';
      ctx.beginPath(); ctx.moveTo(l - 40, G);
      for (let x = Math.floor(l / 80) * 80 - 80; x <= r + 80; x += 80) ctx.lineTo(x, 330 + Math.sin(x * 0.004) * 30 + _slHash(Math.floor(x / 80) + 1080) * 20);
      ctx.lineTo(r + 80, G); ctx.closePath(); ctx.fill();
    });
  }

  function hollow(x, r) {
    const y = 395 - r - 40;
    ctx.strokeStyle = '#3a4a4e'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y - 30, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 18, y - 14); ctx.lineTo(x - 22, y + 30); ctx.moveTo(x + 18, y - 14); ctx.lineTo(x + 22, y + 30); ctx.moveTo(x - 18, y - 14); ctx.lineTo(x + 18, y - 14); ctx.stroke();
  }

  function back(v) {
    for (let i = 0; i < POSTS.length; i++) {
      const [x, r] = POSTS[i], R = ROUTES[i];
      if (!_slVisible(v, R.step[0] - 20, R.slab[0] + R.slab[2] + 20)) continue;
      // The drained pool: the dust gone dark
      const g = ctx.createRadialGradient(x, 395, 10, x, 395, r);
      g.addColorStop(0, 'rgba(0,6,8,0.55)'); g.addColorStop(1, 'rgba(0,6,8,0.12)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 395, r, Math.PI, 0); ctx.lineTo(x + r, G); ctx.lineTo(x - r, G); ctx.fill();
      hollow(x, r);
      const [sx, sy, sw] = R.step, [bx, by, bw] = R.slab;
      ctx.fillStyle = '#3a4a4e';
      ctx.beginPath(); ctx.moveTo(sx + 8, G); ctx.lineTo(sx, sy + 6); ctx.quadraticCurveTo(sx + sw / 2, sy - 8, sx + sw, sy + 4); ctx.lineTo(sx + sw - 6, G); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a6a6e'; ctx.fillRect(sx, sy, sw, 3);
      ctx.save(); ctx.translate(bx + bw / 2, by); ctx.rotate(-0.02);
      ctx.fillStyle = '#4a5a5e'; ctx.fillRect(-bw / 2, 0, bw, 18);
      ctx.fillStyle = '#5a6a6e'; ctx.fillRect(-bw / 2, 0, bw, 3);
      ctx.restore();
      ctx.fillStyle = '#3a4a4e'; ctx.fillRect(bx + 10, by + 18, 12, G - by - 18); ctx.fillRect(bx + bw - 22, by + 18, 12, G - by - 18);
    }
    // The centre of the expanse: light bending in toward an absence
    if (_slVisible(v, CENTER - 300, CENTER + 400)) {
      for (let k = 0; k < 18; k++) {
        const a = k * Math.PI / 9 + frameCount * 0.003, R = 160 + Math.sin(frameCount * 0.02 + k) * 10;
        ctx.strokeStyle = 'rgba(160,220,220,0.18)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(CENTER + 120 + Math.cos(a) * R, 230 + Math.sin(a) * R * 0.7); ctx.quadraticCurveTo(CENTER + 120 + Math.cos(a + 0.5) * R * 0.4, 230 + Math.sin(a + 0.5) * R * 0.3, CENTER + 120, 230); ctx.stroke();
      }
      ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(CENTER + 120, 230, 16, 40, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(4000, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#4a5a5e'; ctx.fillRect(x0, G - 12, x1 - x0, 12); ctx.fillStyle = 'rgba(200,230,230,0.15)'; ctx.fillRect(x0, G - 12, x1 - x0, 1); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 200); g.addColorStop(0, '#2a3a3e'); g.addColorStop(1, '#020a0c');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 200);
  }

  STORY_LEVELS[108] = {
    sky: ['#020a0c', '#051216', '#0a1c20'],
    groundColor: '#142022',
    platColor: '#4a5a5e',
    layout, backdrop, back, surface,
  };
})();
