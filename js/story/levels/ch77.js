'use strict';
// js/story/levels/ch77.js — Chapter 77 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 77 — What Was Lost (scavenge, 4 shards)
// Remnant space: what a dimension looks like after its wall fails. The ground
// is islands torn out of one lost world — a city block with its lamp still
// on, the ruin of a colonnaded hall, a stand of forest, more ruin — drifting
// apart with short gaps between them. The colour is draining out of all of
// it from the edges in: "it erases the idea that they were ever worth
// protecting." Behind, the failed wall itself hangs in shards of gold-rimmed
// glass. Shards sit where the world left them: the collapsed wall fragment
// in the street, the dimension echo on a fallen wall block in the hall, the
// trace among the trees, the residue on a toppled column drum.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const ISLES = [[0, 900, 440, 'city'], [960, 1500, 430, 'ruins'], [1540, 2270, 420, 'forest'], [2330, 2900, 435, 'ruins'], [2960, 3200, 440, 'void']];
  const BLOCKS = [[1050, 375, 100], [2550, 375, 110]];          // under the shards at 1100 / 2600
  const FACADE = { x: 620, w: 150, sill: 340, roof: 250 };
  const COLS = [[1230, 300], [1360, 330], [2420, 300], [2760, 320]];
  const TREES = [1650, 1900, 2120];

  function floor() { return ISLES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }

  function layout() {
    const P = [];
    for (const [x, y, w] of BLOCKS) _slLedge(P, x, y, w);
    _slLedge(P, FACADE.x - 20, FACADE.sill, 70); _slLedge(P, FACADE.x, FACADE.roof, FACADE.w);
    for (const [x, y] of COLS) _slLedge(P, x - 22, y, 44);
    _slLedge(P, 1960, 300, 120);                                  // the big oak's limb
    return P;
  }

  // 0 at an island's centre → 1 at its torn edge: how much colour is gone
  function drain(x) {
    const I = ISLES.find(([a, b]) => x >= a - 40 && x < b + 40);
    if (!I) return 1;
    const t = Math.abs(x - (I[0] + I[1]) / 2) / ((I[1] - I[0]) / 2);
    return Math.max(0, Math.min(1, (t - 0.55) / 0.45));
  }
  function grey(x, x0, y0, w, h) {
    const d = drain(x);
    if (d <= 0) return;
    ctx.fillStyle = `rgba(120,120,128,${0.6 * d})`; ctx.fillRect(x0, y0, w, h);
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c0c12');
    // The failed wall: shards of gold-rimmed glass hanging in the void
    _slParallax(v, 0.15, (l, r) => {
      for (let i = Math.floor(l / 160) - 1; i * 160 < r + 160; i++) {
        const cx = i * 160 + _slHash(i + 770) * 80, cy = -40 + _slHash(i + 771) * 300 + Math.sin(frameCount * 0.01 + i) * 8;
        const s = 30 + _slHash(i + 772) * 50, a = _slHash(i + 773) * Math.PI;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + frameCount * 0.0008 * (i % 2 ? 1 : -1));
        ctx.fillStyle = 'rgba(200,210,230,0.07)'; ctx.strokeStyle = 'rgba(255,210,120,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.3); ctx.lineTo(s * 0.4, -s); ctx.lineTo(s, s * 0.5); ctx.lineTo(-s * 0.2, s * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    });
  }

  function back(v) {
    // The city block: a lamp still on, the front of a building, a car in the street
    if (_slVisible(v, 0, 900)) {
      _slBrick(FACADE.x, FACADE.roof, FACADE.w, 440 - FACADE.roof, '#6e4a3c');
      _slWindowGrid(FACADE.x + 6, FACADE.roof + 20, FACADE.w - 12, 150, 3, 2, { lit: 0.3, seed: 77 });
      ctx.fillStyle = '#8a7c6c'; ctx.fillRect(FACADE.x - 6, FACADE.roof - 6, FACADE.w + 12, 8);
      ctx.fillStyle = '#5a5650'; ctx.fillRect(FACADE.x - 20, FACADE.sill, 70, 6);
      ctx.strokeStyle = '#5a5650'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(FACADE.x - 16, FACADE.sill + 6); ctx.lineTo(FACADE.x, FACADE.sill + 30); ctx.stroke();
      _slStreetLamp(300, 440, true);
      _slCar(380, 440, 110, '#6a7a8a', { doorOpen: true });
      _slHydrant(140, 440);
      grey(FACADE.x + 75, FACADE.x, FACADE.roof, FACADE.w, 440 - FACADE.roof);
    }
    // Ruined halls: column stumps (the climbs) and fallen wall blocks
    for (const [x, y] of COLS) {
      if (!_slVisible(v, x - 30, x + 30)) continue;
      const base = ISLES.find(([a, b]) => x >= a && x < b)[2];
      ctx.fillStyle = '#9a9284'; ctx.fillRect(x - 18, y, 36, base - y);
      ctx.fillStyle = '#aaa294'; ctx.fillRect(x - 22, y, 44, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = -10; k <= 10; k += 7) ctx.fillRect(x + k, y + 8, 2, base - y - 8);
      grey(x, x - 22, y, 44, base - y);
    }
    for (const [x, y, w] of BLOCKS) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      const base = ISLES.find(([a, b]) => x >= a && x < b)[2];
      ctx.fillStyle = '#8a8274'; ctx.fillRect(x, y, w, base - y);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, base - y - 1);
      ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x + w, y + 34); ctx.stroke();
      grey(x + w / 2, x, y, w, base - y);
    }
    // The forest stand; the oak's lowest limb is a ledge
    for (let i = 0; i < TREES.length; i++) if (_slVisible(v, TREES[i] - 90, TREES[i] + 90)) { _slTree(TREES[i], 420, 1.3 + i * 0.15, '#4a6a34'); grey(TREES[i], TREES[i] - 60, 250, 120, 170); }
    if (_slVisible(v, 1900, 2120)) { ctx.fillStyle = '#4a3a2c'; ctx.fillRect(1960, 300, 120, 9); ctx.fillRect(2050, 300, 12, 120); }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < ISLES.length; i++) {
      const [x0, x1, y, b] = ISLES[i];
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      _slIsland(x0, x1, y, b, ph, i * 77);
      if (ph === 'back') { grey(x0 + 1, x0, y - 16, 60, 16); grey(x1 - 1, x1 - 60, y - 16, 60, 16); }
    }
  }

  STORY_LEVELS[77] = {
    sky: ['#0c0c12', '#1c1c24'],
    groundColor: '#0c0c12',
    platColor: '#8a8274',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
