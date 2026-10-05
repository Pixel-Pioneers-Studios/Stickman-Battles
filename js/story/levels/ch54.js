'use strict';
// js/story/levels/ch54.js — Chapter 54 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 54 — The Upload (walk → duel vs two probe waves, protect Veran)
// The neutral dimension's relay node. "The closure data needs to reach the
// dimensional relay before the Creator seals it." Thick data trunks run along
// the walk into the relay mast at the midpoint — a lattice spire with a
// column of light climbing it. Veran kneels at the uplink console at its foot,
// "completely exposed"; the read-out over her counts the upload as you hold
// the line (0% on arrival, climbing through the fight, 100% once the probes
// are down). Probe drop points glow at the horizon. Junction cabinets are
// the climbs; the cache shafts are cable vaults.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, MAST = 3000;
  const CAB = [[420, 350, 100], [540, 270, 120], [1150, 340, 110], [1280, 260, 120], [2230, 350, 100], [2350, 270, 120],
               [3650, 350, 100], [3770, 270, 120], [5080, 340, 110], [5210, 260, 110]];
  const VAULTS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CAB) _slLedge(P, x, y, w);
    _slLedge(P, MAST - 340, 360, 90); _slLedge(P, MAST + 250, 360, 90);
    return P;
  }

  function progress() {
    if (typeof exploreArenaLock === 'undefined') return 0;
    const fought = (exploreCheckpoints || []).some(c => c.hit && !c.rest);
    if (!fought) return 0;
    if (!exploreArenaLock) return 1;
    return Math.min(0.95, (frameCount - (exploreArenaLock.bornFrame || frameCount)) / 5400);
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05020e');
    _slParallax(v, 0.12, (l, r) => {
      ctx.strokeStyle = 'rgba(120,80,255,0.16)'; ctx.lineWidth = 1;
      for (let y = 200; y < 440; y += 24) { ctx.beginPath(); ctx.moveTo(l - 20, y); ctx.lineTo(r + 20, y); ctx.stroke(); }
      for (let x = Math.floor(l / 70) * 70; x < r + 70; x += 70) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x + (x - (l + r) / 2) * 0.6, 440); ctx.stroke(); }
      // Probe drop points on the horizon
      for (let k = 0; k < 3; k++) {
        const px = l + (r - l) * (0.2 + k * 0.3);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,80,140,${0.25 + 0.2 * Math.sin(frameCount * 0.08 + k)})`;
        ctx.beginPath(); ctx.arc(px, 190, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // Data trunks running along the walk into the mast
    _slConduit(x0, x1, G - 24, 265, 8);
    _slConduit(x0, x1, G - 56, 200, 5);
    for (const [x, y, w] of CAB) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#1e1a34'; ctx.fillRect(x + 6, y, w - 12, G - y);
      ctx.fillStyle = '#2e2850'; ctx.fillRect(x, y, w, 8);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = (frameCount >> 3) % 4 === k ? '#88ffcc' : '#2a6050'; ctx.fillRect(x + 14 + k * 12, y + 16, 6, 4); }
    }
    for (const vx of VAULTS) if (_slVisible(v, vx - 80, vx + 80)) { ctx.fillStyle = '#2e2850'; ctx.fillRect(vx - 62, G - 10, 14, 10); ctx.fillRect(vx + 48, G - 10, 14, 10); }
    // The relay mast, Veran at the uplink, the upload read-out
    if (_slVisible(v, MAST - 500, MAST + 500)) {
      const p = progress();
      ctx.strokeStyle = '#3a3260'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(MAST - 70, G); ctx.lineTo(MAST - 10, v.y - 20); ctx.moveTo(MAST + 70, G); ctx.lineTo(MAST + 10, v.y - 20); ctx.stroke();
      ctx.lineWidth = 2;
      for (let y = G - 40; y > v.y; y -= 40) { const t = (G - y) / (G - v.y + 20), hw = 70 - 60 * t; ctx.beginPath(); ctx.moveTo(MAST - hw, y); ctx.lineTo(MAST + hw, y - 40); ctx.moveTo(MAST + hw, y); ctx.lineTo(MAST - hw, y - 40); ctx.stroke(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const top = G - (G - v.y) * p;
      const bg = ctx.createLinearGradient(MAST - 14, 0, MAST + 14, 0);
      bg.addColorStop(0, 'rgba(120,255,220,0)'); bg.addColorStop(0.5, 'rgba(160,255,230,0.6)'); bg.addColorStop(1, 'rgba(120,255,220,0)');
      ctx.fillStyle = bg; ctx.fillRect(MAST - 14, top, 28, G - top);
      ctx.restore();
      // Uplink console and Veran kneeling at it
      ctx.fillStyle = '#2e2850'; ctx.fillRect(MAST - 150, G - 50, 70, 50);
      ctx.fillStyle = 'rgba(120,255,220,0.5)'; ctx.fillRect(MAST - 144, G - 46, 58, 20);
      const vx = MAST - 60;
      ctx.strokeStyle = '#4488dd'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(vx, G - 44, 8, 0, Math.PI * 2); ctx.moveTo(vx, G - 36); ctx.lineTo(vx + 2, G - 16); ctx.lineTo(vx + 14, G - 12); ctx.lineTo(vx + 14, G);
      ctx.moveTo(vx + 2, G - 16); ctx.lineTo(vx - 10, G); ctx.moveTo(vx, G - 30); ctx.lineTo(vx - 20, G - 34); ctx.stroke();
      ctx.fillStyle = 'rgba(10,8,24,0.75)'; ctx.fillRect(MAST - 110, G - 220, 220, 46);
      ctx.fillStyle = '#2a6050'; ctx.fillRect(MAST - 96, G - 194, 192, 10);
      ctx.fillStyle = '#88ffcc'; ctx.fillRect(MAST - 96, G - 194, 192 * p, 10);
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('UPLOAD ' + Math.round(p * 100) + '%', MAST, G - 202);
      for (const sx of [MAST - 340, MAST + 250]) { ctx.fillStyle = '#2e2850'; ctx.fillRect(sx, 360, 90, 10); ctx.fillStyle = '#1e1a34'; ctx.fillRect(sx + 10, 370, 70, G - 370); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[54] = {
    sky: ['#05020e', '#1a0e30'],
    groundColor: '#0c0818',
    platColor: '#2e2850',
    layout, backdrop, back, surface,
  };
})();
