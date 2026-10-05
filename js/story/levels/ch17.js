'use strict';
// js/story/levels/ch17.js — Chapter 17 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 17 — Between Worlds (walk → duel)
// "The primary fracture swallowed you whole. There was no up. No down. Just
// space folding around you." The fracture network is made of torn-off pieces
// of other worlds drifting in the void: a city street, a forest floor, ruins,
// sea bed, a crystal nexus (where the wanderer fights you), desert, snowfield.
// The gaps between them are real — the void below is a fall. Stepping stones
// drift across the widest gaps. Upside-down chunks hang overhead.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  // [x0, x1, y, biome]
  const CHUNKS = [
    [0, 700, 440, 'city'], [820, 1300, 410, 'forest'], [1500, 2100, 440, 'ruins'],
    [2240, 2560, 470, 'ocean'], [2560, 3440, 440, 'crystal'], [3560, 4100, 400, 'desert'],
    [4300, 5000, 440, 'snow'], [5120, 6000, 440, 'void'],
  ];
  const STONES = [{ tag: 'st0', x: 1340, y: 400, w: 80, ay: 28, ph: 0 }, { tag: 'st1', x: 4140, y: 410, w: 90, ax: 50, ph: 1.2 }];
  const EXIT_X = 5650;

  function floor() { return CHUNKS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }

  function layout() {
    const P = [];
    for (const s of STONES) _slMover(P, s.tag, s.x, s.y, s.w, s.ax || 0, s.ay || 0, 0.018, s.ph);
    _slLedge(P, 300, 440 - 34, 160);                 // car roof on the city chunk
    _slLedge(P, 980, 410 - 150, 120);                // forest: a branch
    _slLedge(P, 2300, 470 - 90, 90);                 // ocean: a ship's ribs
    _slLedge(P, 3700, 400 - 110, 120);               // desert: an arch top
    _slLedge(P, 5300, 440 - 120, 140);
    _slLedge(P, 5480, 440 - 230, 120);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#06040e');
    _slParallax(v, 0.05, (l, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = Math.floor(l / 26); i * 26 < r; i++) if (_slHash(i + 11) < 0.35) ctx.fillRect(i * 26 + _slHash(i) * 20, -400 + _slHash(i + 4) * 1000, 1.3, 1.3);
      // Folding space: slow ribbons of light
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = `hsla(${260 + k * 25},80%,65%,0.18)`; ctx.lineWidth = 18 - k * 3;
        ctx.beginPath();
        for (let x = l - 50; x < r + 50; x += 30) ctx.lineTo(x, 80 + k * 70 + Math.sin(x * 0.004 + frameCount * 0.004 + k) * 60);
        ctx.stroke();
      }
      ctx.restore();
    });
    _slParallax(v, 0.25, (l, r) => {
      // Distant upside-down chunks hanging in the dark
      for (let i = Math.floor(l / 400) - 1; i * 400 < r + 400; i++) {
        const x = i * 400 + _slHash(i) * 200, y = 40 + _slHash(i + 3) * 120, w = 120 + _slHash(i + 5) * 100;
        ctx.fillStyle = '#1a1628';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.6, y - 60 - _slHash(i) * 40); ctx.lineTo(x + w * 0.3, y - 50); ctx.fill();
        ctx.fillStyle = ['#3a5a2e', '#4a4c50', '#c8b88a'][i % 3]; ctx.fillRect(x, y, w, 8);
        // an upside-down house on one of them
        if (i % 3 === 1) { ctx.fillStyle = '#2a2638'; ctx.fillRect(x + w * 0.3, y + 8, 40, 36); ctx.beginPath(); ctx.moveTo(x + w * 0.3 - 6, y + 44); ctx.lineTo(x + w * 0.3 + 20, y + 64); ctx.lineTo(x + w * 0.3 + 46, y + 44); ctx.fill(); }
      }
    });
    // The void glow below the chunks
    _slParallax(v, 0.1, (l, r) => {
      const g = ctx.createLinearGradient(0, 480, 0, 700);
      g.addColorStop(0, 'rgba(120,70,200,0)'); g.addColorStop(1, 'rgba(120,70,200,0.35)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, 480, r - l + 40, 300);
    });
  }

  function back(v) {
    for (const [x0, x1, y, b] of CHUNKS) {
      if (!_slVisible(v, x0, x1)) continue;
      if (b === 'city') {
        _slStreetLamp(120, y, true); _slCar(300, y, 160, '#6a3a34', { hazard: true }); _slHydrant(560, y);
        ctx.fillStyle = '#3a3640'; ctx.fillRect(x0 + 10, y - 250, 160, 234); _slWindowGrid(x0 + 20, y - 240, 140, 180, 2, 3, { lit: 0.3, seed: 5 });
      } else if (b === 'forest') {
        _slTree(900, y - 16, 1.4, '#3e5a34'); _slTree(1040, y - 16, 1.7, '#4a6a3e'); _slTree(1220, y - 16, 1.2, '#3e5a34');
        ctx.fillStyle = '#5a4030'; ctx.fillRect(980, y - 150, 120, 10);
      } else if (b === 'ruins') {
        for (const cx of [1560, 1680, 2000]) { ctx.fillStyle = '#9a9284'; ctx.fillRect(cx, y - 200 - (cx % 3) * 30, 34, 184 + (cx % 3) * 30); ctx.fillStyle = '#aaa294'; ctx.fillRect(cx - 6, y - 206 - (cx % 3) * 30, 46, 10); }
        ctx.fillStyle = '#8a8274'; ctx.fillRect(1900, y - 30, 160, 14);
      } else if (b === 'ocean') {
        ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 6;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(2340, y - 10, 30 + k * 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
        ctx.fillStyle = '#5a4a3a'; ctx.fillRect(2300, y - 90, 90, 8);
        for (const [cx, col] of [[2440, '#d86a6a'], [2480, '#e8a84a'], [2520, '#a86ad8']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, y - 20, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 3, y - 20, 6, 20); }
        // Water still clinging above the sea-bed chunk
        ctx.fillStyle = 'rgba(60,120,170,0.25)'; ctx.fillRect(x0, y - 200, x1 - x0, 184);
        for (let k = 0; k < 6; k++) { const t = (frameCount * 0.6 + k * 30) % 180; ctx.fillStyle = 'rgba(200,230,255,0.5)'; ctx.beginPath(); ctx.arc(x0 + 40 + k * 46, y - 20 - t, 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (b === 'crystal') {
        for (const cx of [2640, 2800, 3200, 3380]) _slCrystal(cx, y, 140 + _slHash(cx) * 80, 270, cx);
        _slPortal(3000, y - 230, 50, 300, 1);
      } else if (b === 'desert') {
        ctx.fillStyle = '#c8a868'; ctx.beginPath(); ctx.moveTo(x0, y - 16); ctx.quadraticCurveTo(x0 + 200, y - 90, x0 + 360, y - 16); ctx.fill();
        // Sandstone arch (top is standable)
        ctx.fillStyle = '#b8885a';
        ctx.beginPath(); ctx.moveTo(3700, y); ctx.lineTo(3700, y - 110); ctx.lineTo(3820, y - 110); ctx.lineTo(3820, y); ctx.lineTo(3790, y); ctx.lineTo(3790, y - 70); ctx.quadraticCurveTo(3760, y - 96, 3730, y - 70); ctx.lineTo(3730, y); ctx.fill();
        ctx.fillStyle = '#4a6a3a'; ctx.fillRect(3980, y - 70, 10, 54); ctx.fillRect(3970, y - 50, 10, 6); ctx.fillRect(3966, y - 62, 6, 16);
      } else if (b === 'snow') {
        for (const tx of [4380, 4560, 4900]) { ctx.fillStyle = '#2a3a3a'; ctx.beginPath(); ctx.moveTo(tx - 30, y - 16); ctx.lineTo(tx, y - 140); ctx.lineTo(tx + 30, y - 16); ctx.fill(); ctx.fillStyle = '#e8eef2'; ctx.beginPath(); ctx.moveTo(tx - 14, y - 90); ctx.lineTo(tx, y - 140); ctx.lineTo(tx + 14, y - 90); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let k = 0; k < 20; k++) ctx.fillRect(x0 + ((_slHash(k) * (x1 - x0) + frameCount * 0.4) % (x1 - x0)), y - 300 + ((_slHash(k + 7) * 280 + frameCount * 0.8) % 280), 2, 2);
      } else if (b === 'void') {
        ctx.fillStyle = '#2a2440'; ctx.fillRect(5300, 440 - 120, 140, 10); ctx.fillRect(5480, 440 - 230, 120, 10);
        // The compass's next rift: deeper into the network
        _slPortal(EXIT_X + 20, 440 - 150, 60, 250, 4);
      }
    }
    for (const s of STONES) {
      const pl = _slPlat(currentArena, s.tag);
      if (!pl || !_slVisible(v, pl.x - 10, pl.x + pl.w + 10)) continue;
      ctx.fillStyle = '#3a3448';
      ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + pl.w, pl.y); ctx.lineTo(pl.x + pl.w * 0.7, pl.y + 34); ctx.lineTo(pl.x + pl.w * 0.3, pl.y + 30); ctx.fill();
      ctx.fillStyle = '#5a5470'; ctx.fillRect(pl.x, pl.y, pl.w, 6);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(190,150,255,0.25)'; ctx.fillRect(pl.x, pl.y + 34, pl.w, 4); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < CHUNKS.length; i++) {
      const [x0, x1, y, b] = CHUNKS[i];
      if (_slVisible(v, x0 - 20, x1 + 20)) _slIsland(x0, x1, y, b, ph, i * 17);
    }
  }

  STORY_LEVELS[17] = {
    sky: ['#06040e', '#140c26'],
    groundColor: '#140c26',
    platColor: '#2a2440',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
