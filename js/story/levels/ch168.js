'use strict';
// js/story/levels/ch168.js — Chapter 168 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 168 — God's Foundation (escape, run right)
// God's domain, rewritten: "Axiom's patterns threading through God's
// foundations and finding them useful." The warm white architecture of the
// earlier chapters is still here, but violet lattice runs through every
// joint like a vine, and the domain is building against you — walls
// assembling themselves out of nothing ahead (they appear block by block,
// "as if it had always been there and reality was only now admitting it"),
// arches closing over the route. The floor is God's stone in sections, the
// gaps edged in violet where the rewrite pulled slabs away. Behind the
// collapse wall the whole domain folds into lattice. The Center at the end
// glows red-violet — Absolute Axiom's colour. Lattice-bound cornices are the
// high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const SECTS = [[0, 1000, 440], [1060, 1900, 440], [1960, 2900, 430], [2960, 3700, 440], [3760, 4200, 440]];
  const CORN = [[650, 340, 110], [1400, 330, 110], [1530, 250, 110], [2300, 340, 110], [3100, 330, 110], [3230, 250, 110], [3900, 340, 100]];
  const CENTER = 3950;

  function floor() { return SECTS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of CORN) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0a0018');
    _slParallax(v, 0.2, (l, r) => {
      for (let x = Math.floor(l / 160) * 160 - 160; x < r + 160; x += 160) {
        ctx.strokeStyle = 'rgba(216,200,160,0.35)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x, 300); ctx.arc(x + 80, 300, 80, Math.PI, 0); ctx.lineTo(x + 160, 440); ctx.stroke();
        ctx.strokeStyle = 'rgba(180,90,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); for (let t = 0; t <= 1; t += 0.1) ctx.lineTo(x + 80 + Math.cos(Math.PI + t * Math.PI) * 80 + Math.sin(t * 20) * 4, 300 + Math.sin(Math.PI + t * Math.PI) * 80); ctx.stroke();
      }
    });
  }

  function back(v) {
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    // Walls assembling themselves out of nothing ahead of you, block by block
    for (let k = Math.floor(v.x / 420); k * 420 < v.x + v.w + 420; k++) {
      const x = k * 420 + 260;
      if (x < 300 || x > 3800) continue;
      const ahead = p1 ? Math.max(0, Math.min(1, 1 - (x - p1.cx()) / 500)) : 0;
      const n = Math.floor(ahead * 12);
      for (let b = 0; b < 12; b++) {
        const bx = x + (b % 3) * 34, by = 400 - Math.floor(b / 3) * 34;
        if (b < n) { ctx.fillStyle = 'rgba(232,220,192,0.4)'; ctx.fillRect(bx, by, 32, 32); ctx.strokeStyle = 'rgba(180,90,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, 32, 32); }
        else if (b === n) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.setLineDash([3, 3]); ctx.strokeRect(bx, by, 32, 32); ctx.setLineDash([]); }
      }
    }
    for (const [x, y, w] of CORN) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#c89820'; ctx.fillRect(x, y, w, 3);
      ctx.strokeStyle = 'rgba(180,90,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let t = 0; t <= w; t += 10) ctx.lineTo(x + t, y + 7 + Math.sin(t * 0.3 + frameCount * 0.05) * 5); ctx.stroke();
    }
    // Behind the wall the domain folds into lattice
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) { ctx.fillStyle = 'rgba(10,0,24,0.85)'; ctx.fillRect(v.x - 40, v.y - 40, wx - v.x + 40, v.h + 80); _slLattice(Math.floor((v.x - 40) / 16) * 16, 40, wx - v.x + 40, 420, 0.4, 16); }
    if (_slVisible(v, CENTER - 200, CENTER + 300)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CENTER + 80, 250, 10, CENTER + 80, 250, 220); g.addColorStop(0, 'rgba(255,90,160,0.6)'); g.addColorStop(1, 'rgba(150,40,200,0)');
      ctx.fillStyle = g; ctx.fillRect(CENTER - 140, 30, 440, 440); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of SECTS) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x0, y - 12, x1 - x0, 12); continue; }
      const g = ctx.createLinearGradient(0, y, 0, y + 140); g.addColorStop(0, '#c8b488'); g.addColorStop(1, '#2a1838');
      ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, 140);
      ctx.fillStyle = 'rgba(180,90,255,0.8)'; ctx.fillRect(x0, y, 3, 140); ctx.fillRect(x1 - 3, y, 3, 140);
      ctx.fillStyle = '#c89820'; ctx.fillRect(x0, y, x1 - x0, 3);
    }
  }

  STORY_LEVELS[168] = {
    sky: ['#0a0018', '#1a0830', '#3a1840'],
    groundColor: '#0a0018',
    platColor: '#e8dcc0',
    noGroundFill: true,
    sceneX: 500,
    floor, layout, backdrop, back, surface,
  };
})();
