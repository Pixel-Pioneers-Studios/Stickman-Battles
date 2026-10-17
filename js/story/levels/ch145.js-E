'use strict';
// js/story/levels/ch145.js — Chapter 145 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 145 — What Remains (escape, run right)
// The Void, breached, "as Cosmic Axiom stirs". The ground is islands of
// every world the fracture system touched, torn loose and drifting at
// different heights with gaps between them; behind the collapse wall they
// crumble and fall away into the dark. Far below and behind everything a
// shape the size of a continent shifts in the void — not visible so much as
// a place where the faint starlight bends and goes out — and each time it
// moves, the islands shudder. The Stable Core at the end is a pale sphere
// with the void curving around it. Shards drifting at mid-height are the
// high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const ISLES = [[0, 950, 440, 'city'], [1010, 1800, 430, 'ruins'], [1860, 2700, 440, 'forest'], [2760, 3500, 432, 'crystal'], [3560, 4200, 440, 'void']];
  const SHARDS = [[650, 340, 110], [1400, 330, 110], [1520, 250, 110], [2300, 340, 110], [3100, 330, 110], [3800, 340, 100]];
  const CORE = 3900;

  function floor() { return ISLES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of SHARDS) _slLedge(P, x, y, w);
    return P;
  }

  const stir = () => Math.max(0, Math.sin(frameCount * 0.004)) ** 8;

  function backdrop(v) {
    _slSkyAbove(v, '#000000');
    // Faint starlight, bending and going out where the vast shape moves
    const cx = v.x + v.w * 0.5 + Math.sin(frameCount * 0.002) * 400, cy = 600;
    for (let k = 0; k < 120; k++) {
      const sx = v.x + _slHash(k + 1450) * v.w, sy = v.y + _slHash(k + 1451) * (440 - v.y);
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < 360) continue;
      ctx.fillStyle = `rgba(220,215,255,${0.2 + 0.5 * _slHash(k + 1452)})`; ctx.fillRect(sx + (sx - cx) * 2000 / (d * d), sy, 1.5, 1.5);
    }
  }

  function back(v) {
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200, sh = stir() * 3 * Math.sin(frameCount * 0.8);
    for (let k = 0; k < 10; k++) {
      const t = ((frameCount * 0.6 + k * 31) % 140) / 140, x = wx - 30 - _slHash(k + 1453) * 300;
      if (!_slVisible(v, x - 20, x + 20)) continue;
      ctx.fillStyle = `rgba(60,50,80,${1 - t})`; ctx.fillRect(x, 440 + t * 240, 16, 10);
    }
    for (const [x, y, w] of SHARDS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#2a2440'; ctx.beginPath(); ctx.moveTo(x + sh, y); ctx.lineTo(x + w + sh, y); ctx.lineTo(x + w * 0.6 + sh, y + 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(200,180,255,0.6)'; ctx.fillRect(x + sh, y, w, 2);
    }
    if (_slVisible(v, CORE - 200, CORE + 200)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CORE, 250, 10, CORE, 250, 110); g.addColorStop(0, 'rgba(240,236,255,0.9)'); g.addColorStop(0.5, 'rgba(200,190,255,0.35)'); g.addColorStop(1, 'rgba(150,120,255,0)');
      ctx.fillStyle = g; ctx.fillRect(CORE - 110, 140, 220, 220); ctx.restore();
      ctx.strokeStyle = 'rgba(200,190,255,0.3)'; ctx.lineWidth = 1; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(CORE, 250, 60 + k * 40, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    }
  }

  function surface(v, a, ph) {
    const sh = stir() * 2 * Math.sin(frameCount * 0.8);
    for (let i = 0; i < ISLES.length; i++) {
      const [x0, x1, y, b] = ISLES[i];
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      ctx.save(); ctx.translate(0, sh); _slIsland(x0, x1, y, b, ph, i * 145); ctx.restore();
    }
  }

  STORY_LEVELS[145] = {
    sky: ['#000000', '#050505', '#0a0814'],
    groundColor: '#000000',
    platColor: '#2a2440',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
