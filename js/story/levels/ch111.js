'use strict';
// js/story/levels/ch111.js — Chapter 111 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 111 — The Drain Expands (escape, run right)
// Seraph's absorption field surging outward from the centre of the expanse
// ("Everything is being pulled inward"). The chasing wall is the field's
// edge; behind it the ash streams back toward the centre in long bands and
// the ground is stripped to bare plates. Ahead, the expanse breaks into
// drifts of ash with short cracks between them where the ground has already
// started to slide inward. The ruins of the expanse lean back toward the
// field. At the far end the colour comes back — the expanse edge, where a
// little green and a little blue sky still exist — the place you're
// running for. Leaning slabs are the high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const DRIFTS = [[0, 1000, 440], [1060, 1900, 430], [1960, 2900, 440], [2960, 3600, 432], [3660, 4400, 440]];
  const SLABS = [[700, 340, 110], [1500, 330, 110], [1630, 250, 110], [2500, 340, 110], [3200, 330, 110], [3330, 250, 100]];
  const EDGE = 3900;

  function floor() { return DRIFTS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of SLABS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020a0c');
    // Colour returning toward the expanse edge
    const c = Math.max(0, Math.min(1, (v.x + v.w / 2 - 3000) / 1000));
    if (c > 0) {
      const g = ctx.createLinearGradient(0, v.y, 0, 440);
      g.addColorStop(0, `rgba(110,170,220,${0.5 * c})`); g.addColorStop(1, `rgba(200,220,200,${0.3 * c})`);
      ctx.fillStyle = g; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, 450 - v.y);
    }
    _slParallax(v, 0.12, (l, r) => {
      for (let i = Math.floor(l / 140) - 1; i * 140 < r + 140; i++) {
        const x = i * 140 + _slHash(i + 1110) * 60, h = 40 + _slHash(i + 1111) * 100;
        ctx.save(); ctx.translate(x, 440); ctx.rotate(-0.12); ctx.fillStyle = '#16262a'; ctx.fillRect(0, -h, 60, h); ctx.restore();
      }
    });
  }

  function back(v) {
    // Behind the field's edge: ash streaming back toward the centre
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) {
      for (let k = 0; k < 40; k++) {
        const y = 60 + _slHash(k + 1112) * 380, len = 40 + _slHash(k) * 120;
        const x = wx - ((frameCount * (3 + _slHash(k + 1113) * 4) + k * 53) % (wx - v.x + 200));
        ctx.fillStyle = 'rgba(140,160,160,0.3)'; ctx.fillRect(x, y, len, 2);
      }
    }
    // Leaning slabs of the old expanse
    for (const [x, y, w] of SLABS) if (_slVisible(v, x - 20, x + w + 20)) {
      ctx.save(); ctx.translate(x + w / 2, y); ctx.rotate(-0.03);
      ctx.fillStyle = '#4a5a5e'; ctx.fillRect(-w / 2, 0, w, 16); ctx.fillStyle = '#5a6a6e'; ctx.fillRect(-w / 2, 0, w, 3);
      ctx.restore();
      ctx.fillStyle = '#3a4a4e'; ctx.fillRect(x + 12, y + 16, 12, 440 - y - 16);
    }
    // The expanse edge: a little green, a stretch of living ground
    if (_slVisible(v, EDGE - 200, EDGE + 700)) {
      for (let k = 0; k < 40; k++) { ctx.fillStyle = '#4a7a3a'; ctx.fillRect(EDGE + k * 13, 432 - _slHash(k + 1114) * 8, 3, 9); }
      _slTree(EDGE + 280, 440, 1.0, '#4a7a3a');
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < DRIFTS.length; i++) {
      const [x0, x1, y] = DRIFTS[i];
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') {
        ctx.fillStyle = x0 >= EDGE - 300 ? '#5a6a50' : '#4a5a5e'; ctx.fillRect(x0, y - 12, x1 - x0, 12);
        ctx.fillStyle = 'rgba(200,230,230,0.15)'; ctx.fillRect(x0, y - 12, x1 - x0, 1);
        continue;
      }
      ctx.fillStyle = '#2a3a3e';
      ctx.beginPath(); ctx.moveTo(x0, y);
      for (let k = 0; k <= 10; k++) ctx.lineTo(x0 + (x1 - x0) * k / 10, y + 40 + Math.sin(Math.PI * k / 10) * 100 * (0.7 + 0.3 * _slHash(k + i * 11 + 1115)));
      ctx.lineTo(x1, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(200,230,230,0.3)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
    }
  }

  STORY_LEVELS[111] = {
    sky: ['#020a0c', '#051216', '#0a1c20'],
    groundColor: '#020a0c',
    platColor: '#4a5a5e',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
