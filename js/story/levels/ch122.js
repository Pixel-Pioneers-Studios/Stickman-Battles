'use strict';
// js/story/levels/ch122.js — Chapter 122 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 122 — Thresh (walk → duel vs Thresh, 1 life)
// "You're standing in the middle of what my grief looks like when it has
// nowhere to go." Pieces of the places Thresh tried to protect, rammed into
// each other at the angles they hit: the front of a house buried to the
// windows in a bank of forest, a road surface standing on end, the bow of a
// ship through a wall, a playground frame half-swallowed by rock. Every one
// of them is cracked from the point of impact outward. At the midpoint, the
// crater: the deepest impact in the realm, rings of fractures radiating from
// where Thresh stands, the ground still shuddering. The jammed fragments are
// the climbs; the cache shafts are the deepest cracks.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, CRATER = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const CRACKS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, CRATER - 340, 360, 100); _slLedge(P, CRATER + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#100400');
    _slParallax(v, 0.15, (l, r) => {
      for (let i = Math.floor(l / 200) - 1; i * 200 < r + 200; i++) {
        const x = i * 200 + _slHash(i + 1220) * 80, h = 80 + _slHash(i + 1221) * 160;
        ctx.save(); ctx.translate(x, 440); ctx.rotate((_slHash(i + 1222) - 0.5) * 0.9);
        ctx.fillStyle = 'rgba(42,22,12,0.85)'; ctx.fillRect(-40, -h, 80, h); ctx.restore();
      }
    });
  }

  function impact(x, y, n) {
    ctx.strokeStyle = 'rgba(255,140,60,0.55)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n; ctx.beginPath(); _slJag(x, y, x + Math.cos(a) * 50, y + Math.sin(a) * 40, 4, 5, 1223 + k + x).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); }
  }

  // The jammed fragments, one per climb pair, each from a different place
  function fragment(i, x0, x1) {
    const kind = i % 4, w = x1 - x0;
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 40, 120, w + 80, G - 120); ctx.clip();
    if (kind === 0) {           // a house buried to the windows in forest
      _slHouse(x0, G + 40, w, 160, 60, '#8a7a68', '#5a4a3a', '#4a3028');
      _slWindow(x0 + 20, G - 100, 30, 30, '#5a4a3a', false, null);
      for (let k = 0; k < 4; k++) _slTree(x0 + k * (w / 3), G, 0.9, '#3a5a2a');
    } else if (kind === 1) {    // a road standing on end
      ctx.save(); ctx.translate(x0 + w / 2, G); ctx.rotate(-0.25);
      ctx.fillStyle = '#4a4c50'; ctx.fillRect(-50, -260, 100, 260); ctx.fillStyle = '#d8c060'; for (let y = -250; y < 0; y += 40) ctx.fillRect(-3, y, 6, 22);
      ctx.restore();
    } else if (kind === 2) {    // a ship's bow through a wall
      _slBrick(x0 + w * 0.4, G - 220, w * 0.6, 220, '#6a4a3a');
      ctx.fillStyle = '#3a4a5a'; ctx.beginPath(); ctx.moveTo(x0 - 30, G - 60); ctx.lineTo(x0 + w * 0.7, G - 150); ctx.lineTo(x0 + w * 0.7, G - 60); ctx.closePath(); ctx.fill();
    } else {                    // a playground frame half-swallowed by rock
      ctx.strokeStyle = '#a84a2a'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x0 + 10, G); ctx.lineTo(x0 + 40, G - 160); ctx.lineTo(x0 + w - 40, G - 160); ctx.lineTo(x0 + w - 10, G); ctx.stroke();
      _slRubble(x0 + w * 0.4, G, w * 0.7, 120, '#4a2e1e');
    }
    ctx.restore();
    impact(x0 + w * 0.5, G - 120, 6);
  }

  function back(v) {
    for (let i = 0; i < CLIMB.length; i += 2) {
      const [sx, sy, sw] = CLIMB[i], [hx, hy, hw] = CLIMB[i + 1];
      if (!_slVisible(v, sx - 60, hx + hw + 60)) continue;
      fragment(i / 2, sx, hx + hw);
      for (const [x, y, w] of [[sx, sy, sw], [hx, hy, hw]]) { ctx.fillStyle = '#4a2e1e'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = '#6a4a32'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = '#3a2214'; ctx.fillRect(x + 8, y + 10, 8, G - y - 10); }
    }
    // The crater where Thresh stands, still shuddering
    if (_slVisible(v, CRATER - 420, CRATER + 420)) {
      const sh = Math.sin(frameCount * 0.9) * 1.2;
      for (let k = 0; k < 14; k++) {
        const a = Math.PI + k * Math.PI / 13;
        ctx.strokeStyle = 'rgba(255,140,60,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); _slJag(CRATER + sh, G - 2, CRATER + Math.cos(a) * 380 + sh, G - 2 + Math.sin(a) * 14, 6, 4, 1224 + k).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
      }
      for (const x of [CRATER - 340, CRATER + 240]) { ctx.fillStyle = '#4a2e1e'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#6a4a32'; ctx.fillRect(x, 360, 100, 3); }
    }
    for (const cx of CRACKS) if (_slVisible(v, cx - 120, cx + 120)) impact(cx, G - 2, 5);
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'rubble', face: 'soil' }]); }

  STORY_LEVELS[122] = {
    sky: ['#100400', '#241006', '#44200c'],
    groundColor: '#2e1a10',
    platColor: '#4a2e1e',
    layout, backdrop, back, surface,
  };
})();
