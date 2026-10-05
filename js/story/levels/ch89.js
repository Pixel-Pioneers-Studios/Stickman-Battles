'use strict';
// js/story/levels/ch89.js — Chapter 89 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 89 — War Champion (walk → duel vs the War Champion, flanked)
// The front line itself, where the Champion has never lost. The walk is the
// churned middle of the battle — wreckage of both armies, a siege tower
// broken in half (its two decks are the climbs), a burning barricade behind
// you: "Retreat is not an option. Go forward." At the midpoint, the
// Champion's ground: a ring of weapons planted point-down in the earth, one
// for every fragment bearer it ended — "every fragment bearer the War-Torn
// Dimension had ever seen" — rags of their colours still tied to the hilts,
// the Champion's own standard at the back. Past it, at the far end, "the
// war-torn sky cracks open": the next fracture, a seam of light splitting
// the smoke. The cache shafts are collapsed sap tunnels, timber-framed.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, RING = 3000, CRACK = 5650;
  const TOWER = { x: 1150, lo: [1150, 350, 110], hi: [1280, 260, 120] };
  const CLIMB = [[520, 350, 100], [640, 270, 110], TOWER.lo, TOWER.hi, [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3780, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const SAPS = [1800, 4680];
  const WEAPONS = Array.from({ length: 22 }, (_, i) => RING - 320 + i * 30 + (_slHash(i + 890) - 0.5) * 10);

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, RING - 340, 360, 100); _slLedge(P, RING + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slWarSky(v, 89);
    // The sky cracking open over the far end
    if (v.x + v.w > 4300) _slParallax(v, 0.1, (l, r) => {
      const cx = CRACK * 0.1 + 300;
      if (cx < l - 300 || cx > r + 300) return;
      const pts = _slJag(cx - 60, -200, cx + 40, 260, 14, 26, 89);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,240,220,${0.7 + 0.2 * Math.sin(frameCount * 0.07)})`; ctx.lineWidth = 3;
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(255,200,160,0.15)'; ctx.stroke();
      ctx.restore();
    });
    _slWarLine(v, 0.2, 890, '#2a1810');
  }

  function weapon(x, i) {
    const tilt = (_slHash(i + 891) - 0.5) * 0.3, kind = Math.floor(_slHash(i + 892) * 3);
    ctx.save(); ctx.translate(x, G); ctx.rotate(tilt);
    ctx.fillStyle = '#7a7a7a'; ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3;
    if (kind === 0) { ctx.fillRect(-2, -70, 4, 70); ctx.fillStyle = '#5a4a30'; ctx.fillRect(-9, -74, 18, 4); ctx.fillRect(-2, -92, 4, 18); }
    else if (kind === 1) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -100); ctx.stroke(); ctx.fillStyle = '#7a7a7a'; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(16, -86); ctx.lineTo(0, -76); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -84); ctx.stroke(); ctx.fillRect(-4, -12, 8, 12); }
    ctx.fillStyle = `hsl(${Math.floor(_slHash(i + 893) * 360)},45%,40%)`;
    ctx.beginPath(); ctx.moveTo(-2, -60); ctx.lineTo(12 + Math.sin(frameCount * 0.07 + i) * 3, -54); ctx.lineTo(-2, -50); ctx.fill();
    ctx.restore();
  }

  function back(v) {
    // The burning barricade behind you at the start
    if (_slVisible(v, 0, 300)) { _slStakes(80, G, 140); _slFire(70, G, 160, 1.2); _slSmoke(150, G - 40, 260, true, 89); }
    for (const [x, w] of [[860, 70], [1600, 60], [2500, 80], [3500, 60], [4300, 80], [5400, 70]]) if (_slVisible(v, x - w, x + w)) _slCrater(x, G, w);
    for (const [x, c] of [[420, '#2a3a5a'], [1000, '#7a1e14'], [2100, '#2a3a5a'], [4000, '#7a1e14'], [4900, '#2a3a5a']]) if (_slVisible(v, x - 10, x + 60)) _slBanner(x, G, 140, c, x);
    // Old palisade stubs carrying the outer climbs
    for (let i = 0; i < CLIMB.length; i += 2) {
      if (i === 2) continue;
      const [sx, sy, sw] = CLIMB[i], [hx, hy, hw] = CLIMB[i + 1];
      if (!_slVisible(v, sx - 30, hx + hw + 30)) continue;
      _slPalisade(sx - 20, G, hx + hw - sx + 40, 110);
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(sx, sy, sw, 8); ctx.fillRect(hx, hy, hw, 8);
      ctx.fillStyle = '#3a2a1c'; for (const [x, y, w] of [[sx, sy, sw], [hx, hy, hw]]) { ctx.fillRect(x + 6, y + 8, 6, G - y - 8); ctx.fillRect(x + w - 12, y + 8, 6, G - y - 8); }
    }
    // The siege tower broken in half: its two decks are the climbs
    if (_slVisible(v, TOWER.x - 40, TOWER.x + 300)) {
      const [lx, ly, lw] = TOWER.lo, [hx, hy, hw] = TOWER.hi;
      ctx.fillStyle = '#4a3420'; ctx.fillRect(lx, ly, lw, G - ly);
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 2; for (let y = ly + 16; y < G; y += 18) { ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke(); }
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(lx - 4, ly, lw + 8, 8);
      ctx.save(); ctx.translate(hx + hw / 2, G); ctx.rotate(0.06);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(-hw / 2, hy - G, hw, G - hy);
      ctx.strokeStyle = '#3a2a1c'; for (let y = hy - G + 16; y < 0; y += 18) { ctx.beginPath(); ctx.moveTo(-hw / 2, y); ctx.lineTo(hw / 2, y); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(hx - 4, hy, hw + 8, 8);
      ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 20, hy - 26); ctx.lineTo(hx + 50, hy - 10); ctx.lineTo(hx + 80, hy - 30); ctx.lineTo(hx + hw, hy); ctx.fill();
    }
    // The Champion's ground: a ring of planted weapons, one per bearer it ended
    if (_slVisible(v, RING - 420, RING + 420)) {
      for (const [x, w] of [[RING - 340, 100], [RING + 240, 100]]) {
        ctx.fillStyle = '#4a3626'; ctx.fillRect(x, 360, w, G - 360);
        ctx.fillStyle = '#5e4632'; ctx.fillRect(x - 4, 356, w + 8, 8);
      }
      _slBanner(RING - 10, G - 40, 220, '#aa1a0a', 89);
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(RING - 14, G - 40, 28, 40);
      for (let i = 0; i < WEAPONS.length; i++) if (Math.abs(WEAPONS[i] - RING) > 40) weapon(WEAPONS[i], i);
    }
    // Collapsed sap tunnels over the cache shafts
    for (const sx of SAPS) {
      if (!_slVisible(v, sx - 90, sx + 90)) continue;
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(sx - 56, G - 54, 10, 54); ctx.fillRect(sx + 46, G - 54, 10, 54);
      ctx.save(); ctx.translate(sx, G - 56); ctx.rotate(0.12); ctx.fillRect(-62, -5, 124, 10); ctx.restore();
      _slRubble(sx - 110, G, 50, 26, '#4a3626'); _slRubble(sx + 60, G, 50, 20, '#4a3626');
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'mud', face: 'soil' }]); }

  STORY_LEVELS[89] = {
    sky: ['#1a0e08', '#3a1e10', '#6a3a1c'],
    groundColor: '#2e2016',
    platColor: '#5a3e26',
    layout, backdrop, back, surface,
  };
})();
