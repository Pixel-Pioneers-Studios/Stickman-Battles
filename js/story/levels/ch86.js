'use strict';
// js/story/levels/ch86.js — Chapter 86 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 86 — A World at War (walk → duel vs two War Conscripts)
// The War-Torn Dimension, where "the fracture opened onto a sky that was
// already burning". You come through the fracture (still open at the left
// edge) into the rear of a battlefield that has been fought over for three
// hundred years: churned earth, craters, stake lines, palisade fragments of
// a dozen forgotten fronts, banners of armies nobody remembers. The far line
// of siege towers and trebuchets never stops moving. Ahead, past the duel,
// "something very large was collapsing": a siege fortress the size of a hill
// leaning over the horizon, shedding stone, falling and never finished
// falling. Watch platforms on the old palisades are the climbs; the cache
// shafts are dugout entrances shored with timber.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DUEL = 3000;
  const CLIMB = [[520, 350, 100], [640, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3780, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const DUGOUTS = [1800, 4680];
  const BANNERS = [[380, '#7a1e14'], [960, '#2a3a5a'], [1560, '#7a1e14'], [2560, '#5a4a14'], [3420, '#2a3a5a'], [4300, '#7a1e14'], [5500, '#5a4a14']];
  const CRATERS = [[820, 70], [1450, 60], [2050, 90], [3300, 70], [4100, 80], [4900, 60]];
  const STAKES = [[1000, 90], [2480, 70], [3500, 90], [4450, 80]];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, DUEL - 340, 360, 100); _slLedge(P, DUEL + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slWarSky(v, 86);
    // The collapsing fortress on the horizon — always falling, never finished
    _slParallax(v, 0.1, (l, r) => {
      const fx = 4600 * 0.1 + 300;
      if (fx < l - 400 || fx > r + 400) return;
      const lean = 0.18 + 0.03 * Math.sin(frameCount * 0.004);
      ctx.save(); ctx.translate(fx, 420); ctx.rotate(lean);
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(-120, -300, 240, 300); ctx.fillRect(-160, -220, 40, 220); ctx.fillRect(120, -250, 40, 250);
      for (let b = 0; b < 8; b++) ctx.fillRect(-120 + b * 32, -316, 18, 16);
      ctx.restore();
      for (let k = 0; k < 12; k++) {
        const t = ((frameCount * 0.6 + k * 40) % 400) / 400;
        ctx.fillStyle = `rgba(42,26,16,${1 - t})`; ctx.fillRect(fx + 60 + _slHash(k + 860) * 140, 160 + t * 260, 10 + _slHash(k) * 12, 8);
      }
      _slSmoke(fx + 40, 140, 200, true, 86);
    });
    _slWarLine(v, 0.2, 860, '#2a1810');
  }

  function back(v) {
    // The fracture you came through, still open at the left edge
    if (_slVisible(v, 0, 200)) _slPortal(90, 300, 70, 30, 86);
    for (const [x, w] of CRATERS) if (_slVisible(v, x - w, x + w)) _slCrater(x, G, w);
    for (const [x, w] of STAKES) if (_slVisible(v, x - 10, x + w + 10)) _slStakes(x, G, w);
    for (let i = 0; i < BANNERS.length; i++) { const [x, c] = BANNERS[i]; if (_slVisible(v, x - 10, x + 60)) _slBanner(x, G, 150 + _slHash(i + 861) * 40, c, i); }
    // Old palisades with watch platforms (the climbs)
    for (let i = 0; i < CLIMB.length; i += 2) {
      const [sx, sy, sw] = CLIMB[i], [hx, hy, hw] = CLIMB[i + 1];
      if (!_slVisible(v, sx - 40, hx + hw + 40)) continue;
      _slPalisade(sx - 30, G, hx + hw - sx + 60, 120);
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(sx, sy, sw, 8); ctx.fillRect(hx, hy, hw, 8);
      ctx.fillStyle = '#3a2a1c';
      for (const [x, y, w] of [[sx, sy, sw], [hx, hy, hw]]) { ctx.fillRect(x + 6, y + 8, 6, G - y - 8); ctx.fillRect(x + w - 12, y + 8, 6, G - y - 8); }
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 2;
      for (let ry = hy + 14; ry < G; ry += 16) { ctx.beginPath(); ctx.moveTo(hx - 8, ry); ctx.lineTo(hx + 4, ry); ctx.stroke(); }
    }
    // The duel ground: no-man's land between two shattered wall stubs
    if (_slVisible(v, DUEL - 420, DUEL + 420)) {
      for (const [x, w] of [[DUEL - 340, 100], [DUEL + 240, 100]]) {
        ctx.fillStyle = '#4a3626'; ctx.fillRect(x, 360, w, G - 360);
        ctx.fillStyle = '#5e4632'; ctx.fillRect(x - 4, 356, w + 8, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 10 + k * 22, 370 + (k % 2) * 20, 14, 10);
      }
      _slFire(DUEL - 60, G, 30, 0.8); _slSmoke(DUEL - 45, G - 30, 160, true, 3);
    }
    // Dugout entrances over the cache shafts
    for (const dx of DUGOUTS) {
      if (!_slVisible(v, dx - 90, dx + 90)) continue;
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(dx - 56, G - 70, 10, 70); ctx.fillRect(dx + 46, G - 70, 10, 70); ctx.fillRect(dx - 60, G - 76, 120, 10);
      ctx.fillStyle = '#6a5a40';
      for (let k = 0; k < 3; k++) { ctx.fillRect(dx - 92, G - 12 - k * 11, 34, 11); ctx.fillRect(dx + 58, G - 12 - k * 11, 34, 11); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'mud', face: 'soil' }]); }

  STORY_LEVELS[86] = {
    sky: ['#1a0e08', '#3a1e10', '#6a3a1c'],
    groundColor: '#2e2016',
    platColor: '#5a3e26',
    layout, backdrop, back, surface,
  };
})();
