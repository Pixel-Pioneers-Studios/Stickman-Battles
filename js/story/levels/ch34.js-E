'use strict';
// js/story/levels/ch34.js — Chapter 34 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 34 — Echo Storm (walk → duel vs the Storm Echo)
// Segment 3 of the Multiversal Core region (local 0..6000, geometry from `a`).
// "A cascade of fracture-born fighters generated from residual dimensional
// energy. The storm has an eye. A generator." The sky is a magenta vortex;
// half-formed echo silhouettes flicker in and out along the walk; storm
// wreckage — torn slabs of other worlds — piles into climbable heaps. The
// generator stands at the midpoint, its coil feeding the storm, guarded by
// the echo that "looks like someone you know." Cache shafts are storm vents.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, GEN = 3000;
  const WRECK = [[500, 360, 110], [640, 280, 100], [1250, 350, 130], [2200, 360, 90], [2320, 280, 120],
                 [3640, 350, 110], [3780, 270, 120], [5100, 360, 120], [5250, 280, 100]];
  const GEN_STEPS = [[GEN - 300, 370, 80], [GEN + 220, 370, 80]];
  const VENTS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of WRECK) _slLedge(P, x, y, w);
    for (const [x, y, w] of GEN_STEPS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    // The vortex: bands spiralling in toward the eye of the storm
    _slParallax(v, 0.05, (l, r) => {
      const cx = l + (r - l) * 0.5, cy = 60, t = frameCount * 0.004;
      for (let k = 0; k < 14; k++) {
        const rr = 80 + k * 55;
        ctx.strokeStyle = `rgba(${170 + k * 4},${40 + k * 6},${200 - k * 4},${0.22 - k * 0.012})`; ctx.lineWidth = 22;
        ctx.beginPath(); ctx.ellipse(cx, cy, rr * 1.6, rr * 0.55, 0, t * (k % 2 ? 1 : -1) + k, t * (k % 2 ? 1 : -1) + k + Math.PI * 1.3); ctx.stroke();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
      g.addColorStop(0, 'rgba(255,200,255,0.6)'); g.addColorStop(1, 'rgba(255,80,255,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 130, cy - 130, 260, 260);
      ctx.restore();
    });
    // Lightning: rare jagged strikes far behind the walk
    _slParallax(v, 0.2, (l, r) => {
      const slot = Math.floor(frameCount / 50);
      if (_slHash(slot) > 0.35 || (frameCount % 50) > 8) return;
      const x = l + _slHash(slot + 7) * (r - l);
      ctx.strokeStyle = 'rgba(255,220,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, -200);
      for (let k = 1; k <= 8; k++) ctx.lineTo(x + (_slHash(slot * 9 + k) - 0.5) * 70, -200 + k * 70);
      ctx.stroke();
    });
  }

  function back(v) {
    // Echo silhouettes flickering in and out along the walk
    for (let k = Math.floor((v.x - 100) / 260); k * 260 < v.x + v.w + 100; k++) {
      if (k < 0 || k * 260 > 6000 || Math.abs(k * 260 - GEN) < 500) continue;
      const on = Math.sin(frameCount * 0.03 + k * 2.1) > 0.4;
      if (!on) continue;
      const ex = k * 260 + _slHash(k) * 120, a = 0.12 + 0.12 * Math.sin(frameCount * 0.2 + k);
      ctx.strokeStyle = `rgba(255,120,255,${a})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex, G - 150, 9, 0, Math.PI * 2);
      ctx.moveTo(ex, G - 141); ctx.lineTo(ex, G - 100); ctx.lineTo(ex - 10, G - 62); ctx.moveTo(ex, G - 100); ctx.lineTo(ex + 10, G - 62);
      ctx.moveTo(ex - 14, G - 128); ctx.lineTo(ex + 14, G - 120); ctx.stroke();
    }
    // Wreckage heaps: torn slabs of other worlds
    for (let i = 0; i < WRECK.length; i++) {
      const [x, y, w] = WRECK[i];
      if (!_slVisible(v, x - 30, x + w + 30)) continue;
      ctx.fillStyle = i % 2 ? '#2a1e30' : '#30222a';
      ctx.beginPath(); ctx.moveTo(x - 20, G); ctx.lineTo(x, y + 10); ctx.lineTo(x + w, y + 4); ctx.lineTo(x + w + 24, G); ctx.fill();
      ctx.fillStyle = '#4a3448'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 6, y + 18, w * 0.4, 3);
    }
    // Storm vents over the cache shafts
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const vx of VENTS) {
      if (!_slVisible(v, vx - 70, vx + 70)) continue;
      for (let k = 0; k < 10; k++) {
        const t = ((frameCount * 2 + k * 29) % 200) / 200;
        ctx.fillStyle = `rgba(255,120,255,${0.35 * (1 - t)})`;
        ctx.beginPath(); ctx.arc(vx + Math.sin(t * 9 + k) * 30, G - t * 220, 10 * (1 - t) + 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    // The generator: coil tower feeding the storm, its beam into the vortex
    if (_slVisible(v, GEN - 500, GEN + 500)) {
      const p = 0.6 + 0.4 * Math.sin(frameCount * 0.09);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(GEN - 20, 0, GEN + 20, 0);
      bg.addColorStop(0, 'rgba(255,100,255,0)'); bg.addColorStop(0.5, `rgba(255,170,255,${0.45 * p})`); bg.addColorStop(1, 'rgba(255,100,255,0)');
      ctx.fillStyle = bg; ctx.fillRect(GEN - 20, v.y - 20, 40, G - 300 - v.y + 20);
      ctx.restore();
      ctx.fillStyle = '#241828'; ctx.fillRect(GEN - 60, G - 300, 120, 300);
      ctx.fillStyle = '#3a2840'; ctx.fillRect(GEN - 80, G - 40, 160, 40); ctx.fillRect(GEN - 70, G - 310, 140, 14);
      for (let k = 0; k < 9; k++) {
        ctx.strokeStyle = k % 2 ? '#7a4a7a' : '#b070b0'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(GEN, G - 70 - k * 26, 64, 9, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createRadialGradient(GEN, G - 180, 6, GEN, G - 180, 140);
      cg.addColorStop(0, `rgba(255,190,255,${0.6 * p})`); cg.addColorStop(1, 'rgba(255,90,255,0)');
      ctx.fillStyle = cg; ctx.fillRect(GEN - 150, G - 330, 300, 300);
      ctx.restore();
      for (const [x, y, w] of GEN_STEPS) { ctx.fillStyle = '#3a2840'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = '#241828'; ctx.fillRect(x + 10, y + 10, w - 20, G - y - 10); }
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -400, x1: 6400, kind: 'rubble', face: 'concrete' }]);
  }

  STORY_LEVELS[34] = {
    sky: ['#14041a', '#3a0a3a'],
    groundColor: '#120612',
    platColor: '#4a3448',
    layout, backdrop, back, surface,
  };
})();
