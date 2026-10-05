'use strict';
// js/story/levels/ch78.js — Chapter 78 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 78 — A Voice Between Worlds (stealth)
// The seam between dimensions. The walls the Fallen God built stand edge-on
// along the path as tall translucent membranes, each tinted by the world
// behind it, a faint skyline or treeline showing through. The Fallen God's
// observers hang over the path — golden lanterns with one eye — and each
// one's light falls in a cone that is exactly its detection zone (detection
// sits at guard y = 395). Every post has a high route: a drifting shard of
// wall to step on, then a membrane's folded top edge, a rib running over the
// zone clear of the light. The voice's source — the First Principle — is a
// column of gold at the far end with the law turning around it in rings.
// (First post moved to x=750, clear of the x=450 spawn edge — mirrored in
// stealthGuardDefs and spawnEnemies.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SOURCE = 3100;
  const POSTS = [[750, 95], [1300, 100], [2000, 90], [2800, 100]];
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], rib: [x - r - 90, 270, 2 * r + 180] }));
  const MEMBRANES = [[520, 210], [1060, 40], [1650, 120], [2350, 300], [2560, 160], [3300, 260]];

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.rib); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#06060c');
    // Far membranes, stacked edge-on into the distance
    _slParallax(v, 0.1, (l, r) => {
      for (let i = Math.floor(l / 90) - 1; i * 90 < r + 90; i++) {
        const x = i * 90 + _slHash(i + 780) * 40, h = _slHash(i + 781) * 360;
        ctx.fillStyle = `hsla(${Math.floor(_slHash(i + 782) * 360)},40%,60%,0.05)`;
        ctx.fillRect(x, 60 + h * 0.3, 10, 440);
      }
    });
  }

  function membrane(x, hue) {
    ctx.fillStyle = `hsla(${hue},45%,60%,0.10)`; ctx.fillRect(x - 70, 40, 140, G - 40);
    ctx.strokeStyle = `hsla(${hue},70%,75%,0.35)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 70, 40); ctx.lineTo(x - 70, G); ctx.moveTo(x + 70, 40); ctx.lineTo(x + 70, G); ctx.stroke();
    // What shows through: a skyline or a treeline of the world behind it
    ctx.fillStyle = `hsla(${hue},30%,40%,0.25)`;
    for (let k = 0; k < 6; k++) {
      const bx = x - 64 + k * 22, bh = 40 + _slHash(hue + k) * 90;
      if (hue % 2) { ctx.beginPath(); ctx.moveTo(bx, G); ctx.lineTo(bx + 10, G - bh); ctx.lineTo(bx + 20, G); ctx.fill(); }
      else ctx.fillRect(bx, G - bh, 18, bh);
    }
  }

  function observer(x, r) {
    const bob = Math.sin(frameCount * 0.03 + x) * 4, oy = 395 - r - 70 + bob;
    // Its light falls exactly on the zone
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, 395, 10, x, 395, r);
    g.addColorStop(0, 'rgba(255,210,110,0.16)'); g.addColorStop(1, 'rgba(255,200,100,0.02)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, oy + 16); ctx.lineTo(x + r, 395); ctx.arc(x, 395, r, 0, Math.PI); ctx.lineTo(x, oy + 16); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#8a7240';
    ctx.beginPath(); ctx.moveTo(x - 14, oy - 10); ctx.lineTo(x + 14, oy - 10); ctx.lineTo(x + 10, oy + 16); ctx.lineTo(x - 10, oy + 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.ellipse(x, oy + 3, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a10'; ctx.beginPath(); ctx.arc(x, oy + 3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a7240'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, oy - 10); ctx.lineTo(x, oy - 30); ctx.stroke();
  }

  function back(v) {
    for (const [x, hue] of MEMBRANES) if (_slVisible(v, x - 80, x + 80)) membrane(x, hue);
    for (let i = 0; i < POSTS.length; i++) {
      const [x, r] = POSTS[i], R = ROUTES[i];
      if (!_slVisible(v, R.step[0] - 20, R.rib[0] + R.rib[2] + 20)) continue;
      // The step: a drifting shard of wall
      const [sx, sy, sw] = R.step;
      ctx.fillStyle = 'rgba(200,190,160,0.5)';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx + sw - 20, sy + 26); ctx.lineTo(sx + 30, sy + 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,120,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy); ctx.stroke();
      // The rib: a membrane folded over at the top, running across the zone
      const [rx, ry, rw] = R.rib;
      ctx.fillStyle = 'rgba(220,200,150,0.18)'; ctx.fillRect(rx, ry, rw, 30);
      ctx.fillStyle = '#c8b080'; ctx.fillRect(rx, ry, rw, 5);
      ctx.strokeStyle = 'rgba(255,220,140,0.45)'; ctx.lineWidth = 1;
      for (const ex of [rx + 6, rx + rw - 6]) { ctx.beginPath(); ctx.moveTo(ex, ry + 5); ctx.lineTo(ex, G); ctx.stroke(); }
      observer(x, r);
    }
    // The First Principle: a column of gold, the law turning around it
    if (_slVisible(v, SOURCE - 200, SOURCE + 200)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(SOURCE - 50, 0, SOURCE + 50, 0);
      g.addColorStop(0, 'rgba(255,210,120,0)'); g.addColorStop(0.5, `rgba(255,225,150,${0.5 + 0.15 * Math.sin(frameCount * 0.04)})`); g.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = g; ctx.fillRect(SOURCE - 50, v.y - 20, 100, G - v.y + 20);
      for (let k = 0; k < 4; k++) {
        const y = 140 + k * 70, t = frameCount * 0.01 * (k % 2 ? 1 : -1);
        ctx.strokeStyle = 'rgba(255,220,140,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(SOURCE, y, 90 - k * 8, 14, 0, 0, Math.PI * 2); ctx.stroke();
        for (let j = 0; j < 8; j++) { const a = t + j * Math.PI / 4; ctx.fillStyle = 'rgba(255,230,160,0.8)'; ctx.fillRect(SOURCE + Math.cos(a) * (90 - k * 8) - 2, y + Math.sin(a) * 14 - 2, 4, 4); }
      }
      ctx.restore();
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(3420, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#2a2638'; ctx.fillRect(x0, G - 12, x1 - x0, 12);
      ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.fillRect(x0, G - 12, x1 - x0, 1);
      return;
    }
    // The seam's floor: a thin bright line with nothing under it but layered light
    const g = ctx.createLinearGradient(0, G, 0, G + 260);
    g.addColorStop(0, '#1c1a28'); g.addColorStop(1, '#06060c');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 260);
    ctx.fillStyle = 'rgba(255,220,150,0.55)'; ctx.fillRect(x0, G, x1 - x0, 1.5);
    for (let k = 1; k < 5; k++) { ctx.fillStyle = `rgba(200,180,255,${0.12 / k})`; ctx.fillRect(x0, G + k * 22, x1 - x0, 1); }
  }

  STORY_LEVELS[78] = {
    sky: ['#06060c', '#14121e'],
    groundColor: '#06060c',
    platColor: '#c8b080',
    layout, backdrop, back, surface,
  };
})();
