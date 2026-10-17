'use strict';
// js/story/levels/ch58.js — Chapter 58 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 58 — Converted (walk → duel vs two Converted Guards)
// The fallback perimeter in the interference layer: the Architects' defensive
// line, already half taken. Crystal barricades and watchtowers line the walk;
// the Third Architect's blue banners hang from them — and the Creator's white
// geometry is crawling across every one, "overlaid on their original
// programming," the same overlay as on the guards. Watchtower platforms and
// barricade tops are the climbs. At the midpoint, the guard post the
// converted guards still hold. Cache shafts are bunker hatches.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, POST = 3000;
  const TOWER = [[400, 350, 100], [520, 260, 110], [1150, 340, 110], [1290, 260, 110], [2220, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3780, 270, 110], [5060, 340, 110], [5200, 260, 110]];
  const BANNERS = [700, 1500, 2500, 3500, 4300, 5500];
  const HATCH = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of TOWER) _slLedge(P, x, y, w);
    _slLedge(P, POST - 330, 360, 100); _slLedge(P, POST + 230, 360, 100);
    return P;
  }

  // The Creator's overlay: white hexagonal geometry crawling over a rect
  function overlay(x, y, w, h, seed, amt) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = `rgba(240,240,255,${0.35 + 0.15 * Math.sin(frameCount * 0.04 + seed)})`; ctx.lineWidth = 1;
    const reach = y + h * amt;
    for (let hy = y; hy < reach; hy += 14) for (let hx = x + ((hy / 14) % 2) * 8; hx < x + w; hx += 16) {
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.lineTo(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6); } ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0a0c16');
    _slParallax(v, 0.08, (l, r) => {
      for (let y = -200; y < 520; y += 8) { ctx.fillStyle = `rgba(150,170,220,${0.02 + 0.025 * _slHash(y + (frameCount >> 3))})`; ctx.fillRect(l - 20, y, r - l + 40, 2); }
    });
    _slParallax(v, 0.25, (l, r) => {
      for (let i = Math.floor(l / 260) - 1; i * 260 < r + 260; i++) {
        const x = i * 260 + _slHash(i + 58) * 100;
        ctx.fillStyle = '#161a28'; ctx.fillRect(x, 300, 18, 140); ctx.fillRect(x - 20, 290, 58, 14);
      }
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // The defensive line: a low crystal barricade along the whole walk
    ctx.fillStyle = '#2a3446'; ctx.fillRect(x0, G - 36, x1 - x0, 36);
    for (let k = Math.floor(x0 / 60); k * 60 < x1; k++) { ctx.fillStyle = '#3a4a62'; ctx.beginPath(); ctx.moveTo(k * 60, G - 36); ctx.lineTo(k * 60 + 30, G - 52); ctx.lineTo(k * 60 + 60, G - 36); ctx.fill(); }
    // Watchtowers
    for (const [x, y, w] of TOWER) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.strokeStyle = '#3a4a62'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 4, G); ctx.moveTo(x + w - 10, y); ctx.lineTo(x + w - 4, G); ctx.moveTo(x + 10, y + 30); ctx.lineTo(x + w - 4, G - 40); ctx.stroke();
      ctx.fillStyle = '#4a5a78'; ctx.fillRect(x, y, w, 9);
      ctx.fillStyle = '#2a3446'; ctx.fillRect(x, y - 24, 6, 24); ctx.fillRect(x + w - 6, y - 24, 6, 24); ctx.fillRect(x, y - 26, w, 4);
    }
    // The Third Architect's banners, being overwritten
    for (let i = 0; i < BANNERS.length; i++) {
      const bx = BANNERS[i];
      if (!_slVisible(v, bx - 40, bx + 40)) continue;
      ctx.fillStyle = '#3a4a62'; ctx.fillRect(bx - 3, G - 220, 6, 220);
      const wave = Math.sin(frameCount * 0.04 + i) * 4;
      ctx.fillStyle = '#2266bb'; ctx.fillRect(bx + 3, G - 216, 50 + wave, 110);
      ctx.strokeStyle = 'rgba(200,230,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx + 28, G - 170, 14, 0, Math.PI * 2); ctx.stroke();
      overlay(bx + 3, G - 216, 50 + wave, 110, i, 0.3 + 0.12 * i);
    }
    // Bunker hatches over the cache shafts
    for (const hx of HATCH) if (_slVisible(v, hx - 80, hx + 80)) { ctx.fillStyle = '#4a5a78'; ctx.fillRect(hx - 64, G - 20, 16, 20); ctx.fillRect(hx + 48, G - 20, 16, 20); }
    // The guard post the converted still hold: Creator geometry over everything
    if (_slVisible(v, POST - 500, POST + 500)) {
      ctx.fillStyle = '#2a3446'; ctx.fillRect(POST - 200, G - 180, 400, 180);
      ctx.fillStyle = '#3a4a62'; ctx.fillRect(POST - 210, G - 188, 420, 10);
      ctx.fillStyle = '#0e1220'; ctx.fillRect(POST - 50, G - 130, 100, 130);
      overlay(POST - 200, G - 180, 400, 180, 7, 0.75);
      for (const sx of [POST - 330, POST + 230]) { ctx.fillStyle = '#4a5a78'; ctx.fillRect(sx, 360, 100, 9); ctx.fillStyle = '#2a3446'; ctx.fillRect(sx + 40, 369, 20, G - 369); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'rubble', face: 'concrete' }]); }

  STORY_LEVELS[58] = {
    sky: ['#0a0c16', '#1e2436'],
    groundColor: '#0e1220',
    platColor: '#4a5a78',
    layout, backdrop, back, surface,
  };
})();
