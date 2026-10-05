'use strict';
// js/story/levels/ch39.js — Chapter 39 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 39 — Into the Green (traversal)
// "The forest had no edges. Ash from collapsed worlds drifted through the
// canopy." Trunks wider than houses rise out of frame; the forest floor dips
// into root hollows and climbs over root humps; branches step up in three
// tiers to a canopy road high in the green, so the walk can be taken low
// (through the hollows, past the scouts) or high (along the canopy, where
// something large hunts). Ash falls the whole way. The Second Architect's
// sanctum is a door grown into the last great trunk, hidden in roots.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 500, 440], [500, 760, 470], [760, 1300, 440], [1300, 1500, 410], [1500, 2100, 440], [2100, 2350, 480],
                 [2350, 2900, 440], [2900, 3100, 405], [3100, 4500, 440]];
  const LOW = [[380, 350, 110], [1050, 350, 120], [1650, 340, 110], [2500, 350, 120], [3250, 350, 120], [3700, 340, 110]];
  const MID = [[520, 265, 140], [1180, 260, 150], [1780, 250, 140], [2640, 260, 150], [3380, 260, 140]];
  const CANOPY = [[700, 175, 200], [960, 170, 170], [1330, 170, 180], [1960, 165, 190], [2200, 170, 170], [2820, 170, 220], [3560, 175, 200]];
  const TRUNKS = [300, 900, 1550, 2050, 2780, 3300, 3900];
  const SANCTUM = 4150;

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const L of [LOW, MID, CANOPY]) for (const [x, y, w] of L) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#030803');
    _slParallax(v, 0.12, (l, r) => {
      // Far trunks fading into green haze — no edge, no end
      for (let i = Math.floor(l / 90) - 1; i * 90 < r + 90; i++) {
        const x = i * 90 + _slHash(i + 3) * 40, w = 24 + _slHash(i + 4) * 30;
        ctx.fillStyle = `rgba(${16 + _slHash(i) * 10},${34 + _slHash(i + 1) * 14},${16},0.9)`;
        ctx.fillRect(x, -300, w, 900);
      }
      const g = ctx.createLinearGradient(0, -300, 0, 440);
      g.addColorStop(0, 'rgba(10,30,10,0.0)'); g.addColorStop(1, 'rgba(40,70,30,0.35)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, -300, r - l + 40, 740);
    });
  }

  function leaves(x, y, w, seed) {
    for (let k = 0; k < Math.max(3, w / 30); k++) {
      const lx = x + _slHash(seed + k) * w, ly = y - 10 - _slHash(seed + k + 9) * 30, r = 18 + _slHash(seed + k + 3) * 18;
      ctx.fillStyle = k % 2 ? '#1e3a18' : '#244620';
      ctx.beginPath(); ctx.ellipse(lx, ly, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function back(v) {
    // Great trunks
    for (const tx of TRUNKS) {
      if (!_slVisible(v, tx - 120, tx + 120)) continue;
      ctx.fillStyle = '#2a2016'; ctx.fillRect(tx - 70, v.y - 20, 140, 460 - v.y + 20);
      ctx.fillStyle = '#34281c'; ctx.fillRect(tx - 70, v.y - 20, 18, 460 - v.y + 20);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) { const bx = tx - 50 + k * 20; ctx.beginPath(); ctx.moveTo(bx, v.y); ctx.lineTo(bx + _slHash(tx + k) * 8, 440); ctx.stroke(); }
      // Root flare into the floor
      ctx.fillStyle = '#2a2016';
      ctx.beginPath(); ctx.moveTo(tx - 140, 440); ctx.quadraticCurveTo(tx - 80, 420, tx - 70, 360); ctx.lineTo(tx + 70, 360); ctx.quadraticCurveTo(tx + 80, 420, tx + 140, 440); ctx.fill();
    }
    // Branches: low and mid are boughs off the trunks, the canopy is a leaf road
    for (const [x, y, w] of LOW.concat(MID)) {
      if (!_slVisible(v, x - 30, x + w + 30)) continue;
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x, y, w, 12);
      ctx.fillStyle = '#4a3a24'; ctx.fillRect(x, y, w, 3);
      leaves(x, y, w, x);
    }
    for (const [x, y, w] of CANOPY) {
      if (!_slVisible(v, x - 40, x + w + 40)) continue;
      ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x, y, w, 12);
      leaves(x - 20, y + 4, w + 40, x + 77);
      ctx.fillStyle = '#2a4a22'; ctx.fillRect(x, y - 3, w, 4);
    }
    // Root hollows: arching roots over the dips in the floor
    for (const [x0, x1, y] of FLOOR) {
      if (y <= 440 || !_slVisible(v, x0 - 40, x1 + 40)) continue;
      ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(x0 - 20, 440); ctx.quadraticCurveTo((x0 + x1) / 2, 330, x1 + 20, 440); ctx.stroke();
    }
    // The sanctum: a door grown into the last great trunk, hidden in roots
    if (_slVisible(v, SANCTUM - 300, SANCTUM + 300)) {
      ctx.fillStyle = '#241a10'; ctx.fillRect(SANCTUM - 140, v.y - 20, 280, 460 - v.y + 20);
      ctx.fillStyle = '#100a06';
      ctx.beginPath(); ctx.moveTo(SANCTUM - 50, 440); ctx.lineTo(SANCTUM - 50, 320); ctx.quadraticCurveTo(SANCTUM, 260, SANCTUM + 50, 320); ctx.lineTo(SANCTUM + 50, 440); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(SANCTUM, 380, 4, SANCTUM, 380, 90);
      g.addColorStop(0, 'rgba(140,255,140,0.35)'); g.addColorStop(1, 'rgba(60,200,60,0)');
      ctx.fillStyle = g; ctx.fillRect(SANCTUM - 100, 290, 200, 160);
      ctx.restore();
      ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 9;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(SANCTUM - 140 + k * 14, 440); ctx.quadraticCurveTo(SANCTUM - 60, 300 - k * 10, SANCTUM + 20 + k * 20, 260 + k * 6); ctx.stroke(); }
    }
    // Ash from collapsed worlds, drifting down through the canopy
    ctx.fillStyle = 'rgba(200,200,190,0.55)';
    for (let k = 0; k < 40; k++) {
      const fx = v.x + ((_slHash(k) * v.w + frameCount * (0.2 + _slHash(k + 1) * 0.3)) % v.w);
      const fy = v.y + ((_slHash(k + 2) * v.h + frameCount * (0.5 + _slHash(k + 3) * 0.6)) % v.h);
      ctx.fillRect(fx + Math.sin(frameCount * 0.02 + k) * 10, fy, 2, 2);
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4700, kind: 'lawn', face: 'soil' }]); }

  STORY_LEVELS[39] = {
    sky: ['#050d05', '#0a1a0a'],
    groundColor: '#1a3316',
    platColor: '#2a4a22',
    floor, layout, backdrop, back, surface,
  };
})();
