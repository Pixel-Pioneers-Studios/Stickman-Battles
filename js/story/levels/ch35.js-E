'use strict';
// js/story/levels/ch35.js — Chapter 35 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 35 — The Core's Eye (walk → duel vs the Rift Entity)
// Segment 4 of the Multiversal Core region (local 0..6000, geometry from `a`).
// "At the center of everything: not a monster. A person." The Eye's inside is
// a reliquary: the walls are niches, each holding a fragment the first bearer
// consumed "to fill the void" — most gone dark, a few still flickering. Stair
// galleries run along the niche walls. At the midpoint, a plain stone seat
// worn smooth by ten thousand years, ringed by the slow orbit of its last
// fragments. Past it, a sealed gate carries four sigils — "You need the
// Architects. All of them." Cache shafts are the wells the spent fragments
// sank into.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SEAT = 3000, GATE = 5560;
  const GALLERY = [[380, 360, 100], [500, 280, 180], [1180, 350, 110], [1300, 270, 160], [2220, 360, 100], [2340, 280, 150],
                   [3620, 360, 100], [3740, 280, 160], [4980, 350, 110], [5100, 270, 150]];
  const WELLS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of GALLERY) _slLedge(P, x, y, w);
    _slLedge(P, SEAT - 50, G - 46, 100);   // the seat
    return P;
  }

  function backdrop(v) {
    _slParallax(v, 0.1, (l, r) => {
      // The Eye's dome: a dim vault far overhead with one shaft of light
      const g = ctx.createRadialGradient(l + (r - l) / 2, -200, 40, l + (r - l) / 2, -200, 900);
      g.addColorStop(0, 'rgba(140,110,200,0.35)'); g.addColorStop(1, 'rgba(20,12,36,0)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, -400, r - l + 40, 900);
    });
  }

  function back(v) {
    const x0 = Math.max(-400, v.x - 40), x1 = Math.min(6400, v.x + v.w + 40);
    // Niche walls: row upon row of consumed fragments, nearly all gone dark
    ctx.fillStyle = '#16101e'; ctx.fillRect(x0, v.y - 20, x1 - x0, G - v.y + 20);
    for (let row = 0; row < 9; row++) {
      const ny = G - 60 - row * 52;
      if (ny < v.y - 60) break;
      for (let k = Math.floor(x0 / 46); k * 46 < x1; k++) {
        const nx = k * 46 + (row % 2) * 23;
        if (Math.abs(nx - SEAT) < 360) continue;
        ctx.fillStyle = '#0c0814'; ctx.fillRect(nx, ny, 30, 38);
        ctx.fillStyle = '#221a2c'; ctx.fillRect(nx - 3, ny + 38, 36, 4);
        const h = _slHash(k * 13 + row * 101);
        if (h < 0.06) {
          const fl = 0.4 + 0.5 * Math.max(0, Math.sin(frameCount * (0.02 + h) + k));
          ctx.fillStyle = `hsla(${200 + h * 900},70%,70%,${fl})`;
          ctx.beginPath(); ctx.moveTo(nx + 15, ny + 10); ctx.lineTo(nx + 21, ny + 20); ctx.lineTo(nx + 15, ny + 30); ctx.lineTo(nx + 9, ny + 20); ctx.fill();
        } else if (h < 0.5) {
          ctx.fillStyle = 'rgba(120,110,140,0.25)';
          ctx.beginPath(); ctx.moveTo(nx + 15, ny + 12); ctx.lineTo(nx + 20, ny + 20); ctx.lineTo(nx + 15, ny + 28); ctx.lineTo(nx + 10, ny + 20); ctx.fill();
        }
      }
    }
    // Stair galleries along the niche walls
    for (const [x, y, w] of GALLERY) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#2e2438'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = '#1e1628'; ctx.fillRect(x + 6, y + 10, 8, G - y - 10); ctx.fillRect(x + w - 14, y + 10, 8, G - y - 10);
    }
    // Wells the spent fragments sank into
    for (const wx of WELLS) {
      if (!_slVisible(v, wx - 80, wx + 80)) continue;
      ctx.fillStyle = '#2e2438'; ctx.fillRect(wx - 64, G - 20, 14, 20); ctx.fillRect(wx + 50, G - 20, 14, 20);
      ctx.fillStyle = 'rgba(160,140,200,0.25)'; ctx.fillRect(wx - 46, G - 2, 92, 2);
    }
    // The seat, worn smooth, and the last fragments' slow orbit
    if (_slVisible(v, SEAT - 400, SEAT + 400)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createLinearGradient(SEAT, v.y, SEAT, G);
      sg.addColorStop(0, 'rgba(220,200,255,0)'); sg.addColorStop(1, 'rgba(220,200,255,0.22)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(SEAT - 40, v.y); ctx.lineTo(SEAT + 40, v.y); ctx.lineTo(SEAT + 220, G); ctx.lineTo(SEAT - 220, G); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#3a3044'; ctx.fillRect(SEAT - 50, G - 46, 100, 46);
      ctx.fillStyle = '#4a3e56'; ctx.fillRect(SEAT - 56, G - 50, 112, 6);
      ctx.fillStyle = '#3a3044'; ctx.fillRect(SEAT - 50, G - 130, 100, 84);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(SEAT - 30, G - 46, 60, 4);
      for (let k = 0; k < 7; k++) {
        const a = frameCount * 0.006 + k / 7 * Math.PI * 2;
        ctx.fillStyle = `hsla(${250 + k * 20},70%,75%,0.75)`;
        const fx = SEAT + Math.cos(a) * 170, fy = G - 160 + Math.sin(a) * 50;
        ctx.beginPath(); ctx.moveTo(fx, fy - 7); ctx.lineTo(fx + 5, fy); ctx.lineTo(fx, fy + 7); ctx.lineTo(fx - 5, fy); ctx.fill();
      }
      // Ten thousand years, scratched into the floor in front of the seat
      ctx.strokeStyle = 'rgba(200,180,220,0.18)'; ctx.lineWidth = 1;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(SEAT, G, 100 + k * 50, 6 + k * 2, 0, Math.PI, 0); ctx.stroke(); }
    }
    // The sealed gate: four Architects' sigils, one per lock
    if (_slVisible(v, GATE - 300, GATE + 300)) {
      ctx.fillStyle = '#1e1628'; ctx.fillRect(GATE - 150, G - 300, 300, 300);
      ctx.strokeStyle = '#4a3e56'; ctx.lineWidth = 8; ctx.strokeRect(GATE - 150, G - 300, 300, 300);
      ctx.fillStyle = '#0c0814'; ctx.fillRect(GATE - 4, G - 292, 8, 292);
      const SIG = ['#88aacc', '#88cc66', '#88ccff', '#ccaa66'];
      for (let k = 0; k < 4; k++) {
        const sx = GATE - 105 + k * 70, sy = G - 200;
        ctx.strokeStyle = SIG[k]; ctx.globalAlpha = 0.6; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); for (let s = 0; s <= k + 2; s++) { const a = s / (k + 3) * Math.PI * 2; ctx.lineTo(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12); } ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -400, x1: 6400, kind: 'tile', face: 'brick', brick: '#241c2e', windows: false }]);
  }

  STORY_LEVELS[35] = {
    sky: ['#0a0612', '#1c1228'],
    groundColor: '#0c0814',
    platColor: '#2e2438',
    layout, backdrop, back, surface,
  };
})();
