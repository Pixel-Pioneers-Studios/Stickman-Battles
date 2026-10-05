'use strict';
// js/story/levels/ch18.js — Chapter 18 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 18 — Fragment Theory (escape)
// "The stable pocket is collapsing. The walls are caving in from the left."
// A bubble of ordered geometry inside the fracture network — hexagonal floor
// plates, pillars of light, staircases that float — coming apart from behind.
// The floor steps up and down (inside one jump so the wall can be outrun); a
// floating stair route runs above the floor for anyone who wants height. Past
// the collapse line everything behind you crumbles into the void. The Stable
// Exit is a doorway of light at the far end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const PLATES = [
    [0, 600, 440], [600, 900, 404], [900, 1250, 440], [1250, 1400, 476], [1400, 1800, 440],
    [1800, 1950, 396], [1950, 2400, 440], [2400, 2550, 480], [2550, 3000, 440], [3000, 3200, 410],
    [3200, 3700, 440], [3700, 3850, 470], [3850, 5200, 440],
  ];
  const STAIRS = [[700, 300], [780, 260], [860, 220], [1600, 300], [1680, 260], [2700, 300], [2780, 260], [2860, 220], [3400, 300], [3480, 260]];
  const EXIT_X = 4470;

  function floor() { return PLATES.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }

  function layout() {
    const P = [];
    for (const [x, y] of STAIRS) _slLedge(P, x, y, 70);
    _slLedge(P, 940, 180, 240);        // upper gallery after stair 1
    _slLedge(P, 2940, 180, 220);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05040c');
    _slParallax(v, 0.08, (l, r) => {
      // The fracture network outside the pocket, seen through its membrane
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = Math.floor(l / 30); i * 30 < r; i++) if (_slHash(i + 21) < 0.3) ctx.fillRect(i * 30 + _slHash(i) * 20, -300 + _slHash(i + 6) * 760, 1.2, 1.2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(150,200,255,0.12)'; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(l + (r - l) / 2, 200, 900 - k * 120, 420 - k * 50, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    });
    _slParallax(v, 0.3, (l, r) => {
      // Pillars of light holding the pocket open
      for (let i = Math.floor(l / 260) - 1; i * 260 < r + 260; i++) {
        const x = i * 260 + 60;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
        g.addColorStop(0, 'rgba(140,200,255,0)'); g.addColorStop(0.5, 'rgba(160,210,255,0.22)'); g.addColorStop(1, 'rgba(140,200,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 20, -400, 40, 900);
        ctx.restore();
      }
    });
  }

  function _hexRow(x0, x1, y, h) {
    const s = 22;
    for (let k = Math.floor(x0 / (s * 1.6)); k * s * 1.6 < x1; k++) {
      const cx = k * s * 1.6 + s * 0.8, cy = y + (k % 2) * 6;
      ctx.beginPath();
      for (let a = 0; a < 6; a++) ctx.lineTo(cx + Math.cos(a * Math.PI / 3) * s * 0.8, cy + Math.sin(a * Math.PI / 3) * h);
      ctx.closePath(); ctx.stroke();
    }
  }

  function back(v) {
    // Geometry walls: ordered panels with hex inlays
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(5200, v.x + v.w + 40);
    ctx.fillStyle = '#141826'; ctx.fillRect(x0, -200, x1 - x0, 640);
    ctx.strokeStyle = 'rgba(140,190,255,0.12)'; ctx.lineWidth = 1;
    for (let y = 0; y < 420; y += 60) _hexRow(x0, x1, y, 18);
    // Floating stairs (each a plate with a glow underside)
    for (const [x, y] of STAIRS) {
      if (!_slVisible(v, x - 10, x + 80)) continue;
      ctx.fillStyle = '#3a4466'; ctx.fillRect(x, y, 70, 8);
      ctx.fillStyle = 'rgba(160,210,255,0.35)'; ctx.fillRect(x + 6, y + 8, 58, 3);
    }
    for (const [gx, gw] of [[940, 240], [2940, 220]]) {
      if (!_slVisible(v, gx, gx + gw)) continue;
      ctx.fillStyle = '#3a4466'; ctx.fillRect(gx, 180, gw, 10);
      ctx.strokeStyle = 'rgba(160,210,255,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(gx, 156); ctx.lineTo(gx + gw, 156); ctx.stroke();
      for (let k = gx; k <= gx + gw; k += 20) { ctx.beginPath(); ctx.moveTo(k, 180); ctx.lineTo(k, 156); ctx.stroke(); }
    }
    // Equations of the pocket's own physics, floating
    for (let k = 0; k < 12; k++) {
      const ex = 300 + k * 420;
      if (!_slVisible(v, ex - 100, ex + 100)) continue;
      ctx.fillStyle = 'rgba(180,220,255,0.35)'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
      ctx.fillText(['g = −g?', 'Σ = stable', 'r → 0', 'frag ⊂ you', 'adaptive', 'collapse t−'][k % 6], ex, 110 + Math.sin(frameCount * 0.02 + k) * 6);
    }
    // Behind the collapse: the pocket crumbling into the void
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -100;
    if (wx > v.x - 200) {
      ctx.fillStyle = '#05040c'; ctx.fillRect(v.x - 20, -400, Math.max(0, wx - v.x + 20), 1100);
      for (let k = 0; k < 18; k++) {
        const t = (frameCount * 1.4 + k * 33) % 300;
        const px = wx - 40 - _slHash(k) * 260, py = 440 - t * 1.2 + _slHash(k + 5) * 40;
        ctx.save(); ctx.translate(px, py); ctx.rotate(t * 0.02 * (k % 2 ? 1 : -1));
        ctx.fillStyle = `rgba(58,68,102,${1 - t / 300})`; ctx.fillRect(-10, -6, 20, 12);
        ctx.restore();
      }
    }
    // Stable Exit: a doorway of light
    if (_slVisible(v, EXIT_X - 200, EXIT_X + 300)) {
      ctx.fillStyle = '#20263a'; ctx.fillRect(EXIT_X - 40, 440 - 230, 160, 230);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(EXIT_X + 40, 440 - 110, 10, EXIT_X + 40, 440 - 110, 200);
      g.addColorStop(0, 'rgba(240,250,255,0.85)'); g.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.fillStyle = g; ctx.fillRect(EXIT_X - 160, 440 - 310, 400, 310);
      ctx.restore();
      ctx.fillStyle = 'rgba(250,252,255,0.9)'; ctx.fillRect(EXIT_X - 10, 440 - 200, 100, 200);
      ctx.fillStyle = '#c8e8ff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('STABLE EXIT', EXIT_X + 40, 440 - 240);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 5400, kind: 'tile', face: 'concrete' }]);
    if (ph !== 'back') return;
    ctx.strokeStyle = 'rgba(160,210,255,0.35)'; ctx.lineWidth = 1;
    for (const [x0, x1, y] of PLATES) if (_slVisible(v, x0, x1)) { ctx.save(); ctx.beginPath(); ctx.rect(x0, y - 20, x1 - x0, 20); ctx.clip(); _hexRow(x0, x1, y - 10, 5); ctx.restore(); }
  }

  STORY_LEVELS[18] = {
    sky: ['#05040c', '#141826'],
    groundColor: '#0e1020',
    platColor: '#2a3048',
    floor, layout, backdrop, back, surface,
  };
})();
