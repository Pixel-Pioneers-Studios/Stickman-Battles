'use strict';
// js/story/levels/ch57.js — Chapter 57 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 57 — Empty Sanctum (escape)
// The Third Architect's post inside the interference layer, abandoned. "They
// didn't flee. They left on their own terms." Their instruments are still
// running on the floating plates of the post — frost-glass slates mid-
// calculation, the outcome board frozen on its last number, a stool pushed
// back from a desk. The interference static eats the post from behind as the
// constructs sweep in; the plates have short gaps (one jump each). The
// Fallback Point, a doorway of the Architects' colours, is the far end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const PLATES = [[0, 560, 440], [640, 1080, 425], [1160, 1560, 445], [1640, 2000, 430], [2080, 2560, 440],
                  [2640, 3000, 430], [3080, 3480, 440], [3560, 4200, 440]];
  const SLATES = [[380, 'p(stay) = 0'], [900, 'Preserved: 52'], [1400, 'trade: accept'], [1820, '1,400 models'], [2780, 'I hope you succeed'], [3250, 'cost ≠ 0']];
  const DESKS = [[760, 340, 120], [1300, 350, 110], [2250, 345, 120], [2800, 330, 110], [3200, 350, 120], [3800, 340, 110]];
  const BOARD = 2320, EXIT_X = 3850;

  function floor() { return PLATES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of DESKS) _slLedge(P, x, y, w);
    return P;
  }
  const base = x => { const f = PLATES.find(([a, b]) => x >= a && x < b); return f ? f[2] : 440; };

  function backdrop(v) {
    _slSkyAbove(v, '#0a0a14');
    // Interference static: scanline noise across the layer
    _slParallax(v, 0.05, (l, r) => {
      for (let y = -200; y < 520; y += 8) {
        ctx.fillStyle = `rgba(160,170,200,${0.02 + 0.03 * _slHash(y + (frameCount >> 2))})`;
        ctx.fillRect(l - 20, y, r - l + 40, 2);
      }
    });
  }

  function back(v) {
    // The static eating the post from behind (left edge of the view)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 30; k++) {
      ctx.fillStyle = `rgba(200,210,255,${0.12 * _slHash(k + (frameCount >> 1))})`;
      ctx.fillRect(v.x + _slHash(k * 3 + frameCount) * 140, v.y + _slHash(k * 5 + (frameCount >> 1)) * v.h, 30 + _slHash(k) * 60, 3);
    }
    ctx.restore();
    // Frost-glass slates, still calculating
    for (const [sx, txt] of SLATES) {
      if (!_slVisible(v, sx - 60, sx + 60)) continue;
      const b = base(sx);
      ctx.fillStyle = '#3a4a60'; ctx.fillRect(sx - 3, b - 120, 6, 120);
      ctx.fillStyle = 'rgba(200,225,250,0.30)'; ctx.fillRect(sx - 45, b - 200, 90, 80);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(sx - 45, b - 200, 90, 80);
      ctx.fillStyle = 'rgba(20,30,60,0.75)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(txt, sx, b - 156);
      for (let k = 0; k < 6; k++) ctx.fillRect(sx - 38 + k * 13, b - 190, 2, 8 + ((frameCount >> 4) + k) % 4 * 3);
    }
    // Desks and consoles on the plates (the high steps)
    for (const [x, y, w] of DESKS) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      const b = base(x + w / 2);
      ctx.fillStyle = '#4a5a70'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#2a3446'; ctx.fillRect(x + 8, y + 8, 10, b - y - 8); ctx.fillRect(x + w - 18, y + 8, 10, b - y - 8);
    }
    // The stool pushed back from the desk where they sat last
    if (_slVisible(v, 2700, 3000)) {
      const b = base(2900);
      ctx.save(); ctx.translate(2930, b); ctx.rotate(0.15);
      ctx.fillStyle = '#4a5a70'; ctx.fillRect(-14, -34, 28, 6); ctx.fillRect(-12, -28, 4, 28); ctx.fillRect(8, -28, 4, 28);
      ctx.restore();
    }
    // The outcome board, frozen on its last number
    if (_slVisible(v, BOARD - 200, BOARD + 200)) {
      ctx.fillStyle = 'rgba(200,225,250,0.45)'; ctx.fillRect(BOARD - 150, 160, 300, 110);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(BOARD - 150, 160, 300, 110);
      ctx.fillStyle = '#1a2e48'; ctx.font = 'bold 32px Georgia'; ctx.textAlign = 'center'; ctx.fillText('1,400', BOARD, 220);
      ctx.font = 'italic 11px Georgia'; ctx.fillText('models run — one outcome accepted', BOARD, 248);
      ctx.fillStyle = '#3a4a60'; ctx.fillRect(BOARD - 4, 270, 8, base(BOARD) - 270);
    }
    // The Fallback Point
    if (_slVisible(v, EXIT_X - 200, EXIT_X + 200)) {
      const cols = ['#88aacc', '#88cc66', '#88ccff', '#ccaa66'];
      ctx.fillStyle = '#2a3446'; ctx.fillRect(EXIT_X - 70, 250, 140, 190);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = cols[k]; ctx.globalAlpha = 0.5; ctx.fillRect(EXIT_X - 50 + k * 26, 270, 20, 170); }
      ctx.globalAlpha = 1;
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < PLATES.length; i++) {
      const [x0, x1, y] = PLATES[i];
      if (_slVisible(v, x0 - 20, x1 + 20)) _slIsland(x0, x1, y, 'crystal', ph, i * 57);
    }
  }

  STORY_LEVELS[57] = {
    sky: ['#0a0a14', '#1e2236'],
    groundColor: '#0a0a14',
    platColor: '#4a5a70',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
