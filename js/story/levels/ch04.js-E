'use strict';
// js/story/levels/ch04.js — Chapter 4 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 4 — Bleeding Sky (walk → duel)
// "You climbed. The rooftops gave you altitude, perspective — and more targets.
// From up here you could see the fracture lines in the sky." The floor is the
// roof deck of a run of buildings; plank bridges span the gaps between them,
// and the roof hatches drop into the stairwells (the underground caches).
// Taller buildings, a water tower, an antenna mast, a billboard catwalk and a
// glass tower with a window-washer rig make the run climb and fall. The Watcher
// waits on the helipad roof at the midpoint.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const GAPS     = [[1400, 1470], [3420, 3490], [5240, 5310]];   // planked alleys between roofs
  const AC_A     = { x: 360, w: 70, h: 52 };
  const TOWER    = { x: 700, w: 110, legTop: G - 110, tankH: 80 };
  const TALL     = { x: 960, w: 330, h: 120 };
  const MAST     = { x: 1190, ys: [G - 220, G - 320] };
  const AC_B     = { x: 880, w: 64, h: 56 };
  const BOARD    = { x: 2040, w: 320, y: G - 150 };
  const AC_C     = { x: 1960, w: 70, h: 64 };
  const HELI     = 3000;
  const STEP     = { x: 3600, w: 110, h: 90 };
  const GLASS    = { x: 3710, w: 400, h: 190 };
  const GONDOLA  = { x: 4130, w: 110, y: G - 290 };
  const TANK2    = { x: 4900, w: 100, legTop: G - 100, tankH: 70 };
  const COOP     = { x: 5040, w: 120, h: 70 };
  const EXIT     = 5640;

  function layout() {
    const P = [];
    _slLedge(P, AC_A.x, G - AC_A.h, AC_A.w);
    _slLedge(P, TOWER.x, TOWER.legTop, TOWER.w);
    _slLedge(P, TOWER.x + 6, TOWER.legTop - TOWER.tankH, TOWER.w - 12);
    _slLedge(P, AC_B.x, G - AC_B.h, AC_B.w);
    _slBlock(P, TALL.x, G - TALL.h, TALL.w, TALL.h);
    for (const y of MAST.ys) _slLedge(P, MAST.x, y, 70);
    _slLedge(P, AC_C.x, G - AC_C.h, AC_C.w);
    _slLedge(P, BOARD.x, BOARD.y, BOARD.w);
    _slBlock(P, STEP.x, G - STEP.h, STEP.w, STEP.h);
    _slBlock(P, GLASS.x, G - GLASS.h, GLASS.w, GLASS.h);
    _slLedge(P, GONDOLA.x, GONDOLA.y, GONDOLA.w);
    _slLedge(P, TANK2.x, TANK2.legTop, TANK2.w);
    _slLedge(P, TANK2.x + 6, TANK2.legTop - TANK2.tankH, TANK2.w - 12);
    _slLedge(P, COOP.x, G - COOP.h, COOP.w);
    return P;
  }

  // Fixed crack geometry across the sky (world-space parallax 0.04)
  const CRACKS = [];
  for (let i = 0; i < 26; i++) {
    const x = i * 260 + _slHash(i + 1) * 120;
    CRACKS.push(_slJag(x, -260 + _slHash(i + 2) * 80, x + (_slHash(i + 3) - 0.5) * 300, 60 + _slHash(i + 4) * 130, 9, 22, i * 17));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1e2240');
    _slParallax(v, 0.04, (l, r) => {
      // Dusk: a band of light low on the horizon under the purple
      const hz = ctx.createLinearGradient(0, G - 260, 0, G - 40);
      hz.addColorStop(0, 'rgba(240,150,120,0)'); hz.addColorStop(1, 'rgba(240,150,120,0.35)');
      ctx.fillStyle = hz; ctx.fillRect(l - 20, G - 260, r - l + 40, 220);
      for (let i = 0; i < CRACKS.length; i++) {
        const c = CRACKS[i];
        if (c[0][0] > r + 200 || c[0][0] < l - 400) continue;
        _slSkyCrack(c, 0.55 + 0.25 * Math.sin(frameCount * 0.02 + i));
        // Branches
        for (let b = 2; b < c.length - 2; b += 3) {
          const [bx, by] = c[b];
          _slSkyCrack(_slJag(bx, by, bx + (b % 2 ? 60 : -60), by + 30, 4, 8, i * 31 + b), 0.35);
        }
      }
    });
    _slParallax(v, 0.16, (l, r) => {
      // Downtown in the distance — one tower sheared forty feet to the left
      for (let i = Math.floor(l / 64) - 1; i * 64 < r + 64; i++) {
        const h = 120 + _slHash(i) * 220, w = 40 + _slHash(i + 40) * 26, x = i * 64;
        ctx.fillStyle = '#2a2a44'; ctx.fillRect(x, G + 40 - h, w, h);
        ctx.fillStyle = 'rgba(255,210,150,0.35)';
        for (let wy = G + 50 - h; wy < G + 20; wy += 12) for (let wx = x + 5; wx < x + w - 5; wx += 9)
          if (_slHash(wx * 3 + wy + i) < 0.1) ctx.fillRect(wx, wy, 3, 5);
        if (i % 37 === 11) {
          ctx.fillStyle = '#2a2a44'; ctx.fillRect(x - 40, G + 40 - h - 120, w, 120);
          ctx.fillStyle = 'rgba(200,160,255,0.6)'; ctx.fillRect(x - 40, G + 40 - h - 2, w + 40, 2);
        }
      }
    });
    _slParallax(v, 0.4, (l, r) => {
      // Nearer rooftops, roughly level with ours
      for (let i = Math.floor(l / 150) - 1; i * 150 < r + 150; i++) {
        const x = i * 150 + _slHash(i * 3) * 30, w = 120 + _slHash(i * 5) * 30, h = _slHash(i * 7) * 60;
        ctx.fillStyle = '#3c3a4c'; ctx.fillRect(x, G - 20 - h, w, 200);
        ctx.fillStyle = 'rgba(255,214,150,0.35)';
        for (let wx = x + 10; wx < x + w - 10; wx += 22) if (_slHash(wx + i) < 0.25) ctx.fillRect(wx, G - h, 8, 10);
        if (_slHash(i + 20) < 0.3) _slWaterTower(x + 30, G - 40 - h, 30, 26);
        if (_slHash(i + 21) < 0.3) _slAntenna(x + w - 20, G - 20 - h, 40, true);
      }
    });
  }

  function _roofBlock(b, col) {
    _slBrick(b.x, G - b.h, b.w, b.h, col);
    _slParapet(b.x - 4, b.x + b.w + 4, G - b.h + 12, '#8a7c6c');
    _slWindowGrid(b.x + 10, G - b.h + 26, b.w - 20, b.h - 40, Math.max(2, Math.round(b.w / 70)), Math.max(1, Math.round((b.h - 40) / 60)), { lit: 0.35, seed: b.x, glow: true });
  }

  function back(v) {
    if (_slVisible(v, 0, 700)) {
      _slBulkhead(120, G, 110, 110, '#6a4a3e');
      _slAcUnit(AC_A.x, G - AC_A.h, AC_A.w, AC_A.h);
      _slSkylight(500, G, 80);
      _slAntenna(220, G - 116, 50, true);
    }
    if (_slVisible(v, 640, 1360)) {
      _slWaterTower(TOWER.x, TOWER.legTop, TOWER.w, TOWER.tankH);
      _slAcUnit(AC_B.x, G - AC_B.h, AC_B.w, AC_B.h);
      _roofBlock({ x: TALL.x, w: TALL.w, h: TALL.h }, '#5a4038');
      // Radio mast with two service platforms
      ctx.strokeStyle = '#4a4f55'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(MAST.x + 20, G - TALL.h); ctx.lineTo(MAST.x + 30, G - 420); ctx.moveTo(MAST.x + 50, G - TALL.h); ctx.lineTo(MAST.x + 40, G - 420); ctx.stroke();
      ctx.lineWidth = 1;
      for (let y = G - TALL.h; y > G - 420; y -= 16) { ctx.beginPath(); ctx.moveTo(MAST.x + 22, y); ctx.lineTo(MAST.x + 48, y - 16); ctx.stroke(); }
      for (const y of MAST.ys) { ctx.fillStyle = '#3a3e42'; ctx.fillRect(MAST.x, y, 70, 6); ctx.strokeStyle = '#3a3e42'; ctx.beginPath(); ctx.moveTo(MAST.x, y - 20); ctx.lineTo(MAST.x + 70, y - 20); ctx.stroke(); }
      _slAntenna(MAST.x + 35, G - 420, 40, true);
      _slDish(MAST.x + 60, MAST.ys[0] - 40, 18, 1);
    }
    if (_slVisible(v, 1480, 1800)) {
      // Rooftop garden beds and a greenhouse
      for (let bx = 1490; bx < 1610; bx += 64) {
        ctx.fillStyle = '#6a4e34'; ctx.fillRect(bx, G - 26, 54, 26);
        ctx.fillStyle = '#4e7a3e'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(bx + 6 + k * 11, G - 28, 7, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(190,220,210,0.35)'; ctx.fillRect(1630, G - 90, 70, 90);
      ctx.strokeStyle = '#d0d6d4'; ctx.lineWidth = 2; ctx.strokeRect(1630, G - 90, 70, 90);
      ctx.beginPath(); ctx.moveTo(1665, G - 90); ctx.lineTo(1665, G); ctx.stroke();
    }
    if (_slVisible(v, 1940, 2420)) {
      _slAcUnit(AC_C.x, G - AC_C.h, AC_C.w, AC_C.h);
      // Billboard: catwalk is the ledge; the board above glitches with the sky
      const B = BOARD;
      ctx.fillStyle = '#2c3034';
      for (const px of [B.x + 30, B.x + B.w - 36]) ctx.fillRect(px, B.y, 6, G - B.y);
      ctx.strokeStyle = '#2c3034'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(B.x + 33, G); ctx.lineTo(B.x + B.w - 33, B.y + 10); ctx.moveTo(B.x + B.w - 33, G); ctx.lineTo(B.x + 33, B.y + 10); ctx.stroke();
      ctx.fillStyle = '#3a3e42'; ctx.fillRect(B.x, B.y, B.w, 8);
      ctx.beginPath(); ctx.moveTo(B.x, B.y - 24); ctx.lineTo(B.x + B.w, B.y - 24); ctx.stroke();
      ctx.fillStyle = '#16181c'; ctx.fillRect(B.x - 10, B.y - 170, B.w + 20, 150);
      const gl = (frameCount % 150) < 8;
      const bg = ctx.createLinearGradient(B.x, 0, B.x + B.w, 0);
      bg.addColorStop(0, gl ? '#6a3aa8' : '#1e6a8a'); bg.addColorStop(1, gl ? '#c9a2ff' : '#3ab0c8');
      ctx.fillStyle = bg; ctx.fillRect(B.x, B.y - 160, B.w, 130);
      ctx.fillStyle = '#f2f6f8'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center';
      ctx.fillText(gl ? 'STAY INSIDE' : 'STAY HYDRATED', B.x + B.w / 2 + (gl ? 4 : 0), B.y - 88);
      ctx.font = '12px Arial'; ctx.fillText('AQUA PURE · CITY WATER YOU CAN TRUST', B.x + B.w / 2, B.y - 56);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(255,240,200,0.6)'; ctx.fillRect(B.x + 30 + k * 86, B.y - 4, 10, 4); }
    }
    if (_slVisible(v, 2600, 3400)) {
      // Helipad roof: windsock, light posts. The Watcher's ground.
      for (const lx of [2700, 3300]) {
        ctx.fillStyle = '#3a3e42'; ctx.fillRect(lx - 2, G - 30, 4, 30);
        ctx.fillStyle = (frameCount % 60) < 30 ? '#ff5a3a' : '#5a2a1a'; ctx.beginPath(); ctx.arc(lx, G - 32, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#3a3e42'; ctx.fillRect(3340, G - 110, 3, 110);
      const ws = Math.sin(frameCount * 0.06) * 6;
      ctx.fillStyle = '#e86a2a';
      ctx.beginPath(); ctx.moveTo(3343, G - 110); ctx.lineTo(3390, G - 104 + ws); ctx.lineTo(3390, G - 96 + ws); ctx.lineTo(3343, G - 92); ctx.fill();
    }
    if (_slVisible(v, 3560, 4300)) {
      _roofBlock({ x: STEP.x, w: STEP.w, h: STEP.h }, '#4e4a48');
      // Glass office tower edge: curtain wall, mullions, reflections of the sky
      const B = GLASS;
      const cg = ctx.createLinearGradient(B.x, G - B.h - 200, B.x + B.w, G);
      cg.addColorStop(0, '#5a6a8a'); cg.addColorStop(0.5, '#3a4a6a'); cg.addColorStop(1, '#2a3450');
      ctx.fillStyle = cg; ctx.fillRect(B.x, G - B.h - 260, B.w, B.h + 260);
      ctx.fillStyle = 'rgba(200,170,255,0.18)';
      ctx.beginPath(); ctx.moveTo(B.x + 40, G - B.h - 260); ctx.lineTo(B.x + 140, G - B.h - 260); ctx.lineTo(B.x + 60, G); ctx.lineTo(B.x, G); ctx.fill();
      ctx.strokeStyle = 'rgba(20,24,34,0.8)'; ctx.lineWidth = 2;
      for (let mx = B.x; mx <= B.x + B.w; mx += 40) { ctx.beginPath(); ctx.moveTo(mx, G - B.h - 260); ctx.lineTo(mx, G); ctx.stroke(); }
      for (let my = G - B.h - 260; my < G; my += 36) { ctx.beginPath(); ctx.moveTo(B.x, my); ctx.lineTo(B.x + B.w, my); ctx.stroke(); }
      // Setback terrace (the block top you climb onto)
      ctx.fillStyle = '#8a8478'; ctx.fillRect(B.x - 4, G - B.h, B.w + 8, 10);
      ctx.fillStyle = '#c8c8cc'; ctx.fillRect(B.x - 4, G - B.h - 30, B.w + 8, 3);
      for (let px = B.x; px <= B.x + B.w; px += 25) ctx.fillRect(px, G - B.h - 30, 2, 30);
      // Window-washer gondola on its cables, hanging past the terrace
      const G2 = GONDOLA;
      ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(G2.x + 10, G2.y); ctx.lineTo(G2.x + 10, G - B.h - 260); ctx.moveTo(G2.x + G2.w - 10, G2.y); ctx.lineTo(G2.x + G2.w - 10, G - B.h - 260); ctx.stroke();
      ctx.fillStyle = '#c8b030'; ctx.fillRect(G2.x, G2.y, G2.w, 8);
      ctx.strokeStyle = '#c8b030'; ctx.lineWidth = 2; ctx.strokeRect(G2.x, G2.y - 26, G2.w, 26);
      ctx.fillStyle = '#5a6066'; ctx.fillRect(G2.x + 20, G2.y - 14, 18, 14);
    }
    if (_slVisible(v, 4600, 5240)) {
      _slWaterTower(TANK2.x, TANK2.legTop, TANK2.w, TANK2.tankH);
      // Pigeon coop on legs (top is standable)
      const C = COOP;
      ctx.fillStyle = '#8a7a5a'; ctx.fillRect(C.x, G - C.h, C.w, C.h - 20);
      ctx.fillStyle = '#5a4a36'; ctx.fillRect(C.x - 4, G - C.h, C.w + 8, 6);
      ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 1;
      for (let wx = C.x + 6; wx < C.x + C.w; wx += 8) { ctx.beginPath(); ctx.moveTo(wx, G - C.h + 8); ctx.lineTo(wx, G - 22); ctx.stroke(); }
      ctx.fillStyle = '#5a4a36'; ctx.fillRect(C.x + 6, G - 20, 4, 20); ctx.fillRect(C.x + C.w - 10, G - 20, 4, 20);
      for (let k = 0; k < 4; k++) {
        const px = C.x + 14 + k * 28, py = G - C.h - 6 + Math.sin(frameCount * 0.2 + k) * 0.8;
        ctx.fillStyle = '#7a7e86'; ctx.beginPath(); ctx.ellipse(px, py, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 5, py - 3, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      _slDish(4720, G - 40, 22, -1);
      _slDish(4780, G - 30, 16, -1);
    }
    if (_slVisible(v, 5300, 5800)) {
      // Next building over is taller; its fire-escape ladder is the way on
      _slBrick(EXIT + 40, G - 420, 400, 420, '#4e3a32');
      _slWindowGrid(EXIT + 60, G - 400, 360, 330, 4, 4, { lit: 0.35, seed: 44, glow: true });
      _slFireEscape(EXIT + 70, 120, [G - 140, G - 240, G - 340]);
      ctx.strokeStyle = '#25282c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(EXIT - 10, G - 340); ctx.lineTo(EXIT - 10, G); ctx.moveTo(EXIT + 6, G - 340); ctx.lineTo(EXIT + 6, G); ctx.stroke();
      for (let ly = G - 330; ly < G; ly += 14) { ctx.beginPath(); ctx.moveTo(EXIT - 10, ly); ctx.lineTo(EXIT + 6, ly); ctx.stroke(); }
    }
  }

  const ZONES = [{ x0: -200, x1: 6200, kind: 'roof', face: 'brick', brick: '#5a4038' }];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    const front = ph === 'front';
    // Alleys between buildings, planked over
    for (const [x0, x1] of GAPS) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      ctx.fillStyle = '#08080c';
      if (front) ctx.fillRect(x0, G + 10, x1 - x0, 120);
      else ctx.fillRect(x0, G - 18, x1 - x0, 18);
      ctx.fillStyle = '#8a6a44';
      if (front) { ctx.fillRect(x0 - 10, G, x1 - x0 + 20, 8); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0 - 10, G + 8, x1 - x0 + 20, 2); }
      else for (let k = 0; k < 3; k++) ctx.fillRect(x0 - 10, G - 16 + k * 5, x1 - x0 + 20, 4);
    }
    if (front) return;
    // Helipad markings
    if (_slVisible(v, HELI - 120, HELI + 120)) {
      ctx.save(); ctx.translate(HELI, G - 8); ctx.scale(1, 0.12);
      ctx.strokeStyle = 'rgba(240,220,90,0.8)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(240,240,230,0.85)';
      ctx.fillRect(HELI - 30, G - 13, 8, 10); ctx.fillRect(HELI + 22, G - 13, 8, 10); ctx.fillRect(HELI - 30, G - 9, 60, 3);
    }
    // Roof hatches over the stairwell shafts
    for (const r of (a.undergroundRects || []).filter(q => q.kind === 'shaft')) {
      if (!_slVisible(v, r.x - 40, r.x + r.w + 40)) continue;
      ctx.fillStyle = '#3a3e42'; ctx.fillRect(r.x - 8, G - 20, 8, 20); ctx.fillRect(r.x + r.w, G - 20, 8, 20);
      ctx.save(); ctx.translate(r.x + r.w, G - 20); ctx.rotate(-1.1);
      ctx.fillStyle = '#5a6066'; ctx.fillRect(0, -4, r.w * 0.9, 6); ctx.restore();
      ctx.fillStyle = '#d0a020'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('ROOF ACCESS', r.x + r.w / 2, G - 24);
    }
  }

  STORY_LEVELS[4] = {
    sky: ['#24284a', '#7a5a72'],
    groundColor: '#2e2422',
    platColor: '#3a2c28',
    layout, backdrop, back, surface,
  };
})();
