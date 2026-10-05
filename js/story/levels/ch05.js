'use strict';
// js/story/levels/ch05.js — Chapter 5 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 5 — Quiet Before (scavenge)
// Night on the rooftops, after the Watcher. Four buildings at four heights,
// planked across. Veran's relay components sit where a patrol would not think
// to look — the top of the radio mast, a greenhouse shelf, the top of a
// billboard and the lid of a water tower (positions mirrored in the chapter's
// scavengeItemDefs). The city below is quiet in a way that is wrong.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G0 = 440;
  const ROOFS = [[0, 700, 440, '#4a3a44'], [700, 1310, 400, '#3e3a4e'], [1310, 1370, 440, null],
                 [1370, 2010, 440, '#4c3c3a'], [2010, 2590, 470, '#3a3e4a'], [2590, 2650, 440, null], [2650, 3400, 440, '#4a3c46']];
  const MAST   = { x: 1150, base: 400, ys: [300, 200, 100] };
  const SOLAR  = { x: 800, w: 240 };
  const GREEN  = { x: 1620, w: 170, shelf: 380 };
  const BOARD  = { x: 2160, w: 300, base: 470, cat: 340, top: 210 };
  const TOWER  = { x: 2720, w: 120, legTop: 320, tankH: 80 };

  // Plank spans are thin and undrawn so the drop between buildings stays open below them
  function floor() {
    return ROOFS.map(([x0, x1, y, col]) => col ? _slFloorSeg(x0, y, x1 - x0, 600 - y)
      : Object.assign(_slFloorSeg(x0, y, x1 - x0, 10), { noDraw: true }));
  }

  function layout() {
    const P = [];
    _slLedge(P, 300, 440 - 56, 70);                     // AC unit by the start bulkhead
    _slLedge(P, SOLAR.x, 400 - 40, SOLAR.w);           // solar array top
    for (const y of MAST.ys) _slLedge(P, MAST.x, y, 70);
    _slLedge(P, GREEN.x + 20, GREEN.shelf, 80);
    _slLedge(P, GREEN.x, 440 - 120, GREEN.w);           // greenhouse roof ridge
    _slLedge(P, BOARD.x - 80, BOARD.base - 64, 70);     // vent box
    _slLedge(P, BOARD.x, BOARD.cat, BOARD.w);
    _slLedge(P, BOARD.x + 40, BOARD.cat - 66, 60);      // ladder cage landing
    _slLedge(P, BOARD.x + 90, BOARD.top, BOARD.w - 180);
    _slLedge(P, TOWER.x, TOWER.legTop, TOWER.w);
    _slLedge(P, TOWER.x + 8, TOWER.legTop - TOWER.tankH, TOWER.w - 16);
    _slLedge(P, TOWER.x - 90, 440 - 60, 70);             // crate stack
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1a0e20');
    _slParallax(v, 0.03, (l, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = Math.floor(l / 30); i * 30 < r; i++) if (_slHash(i + 7) < 0.3) ctx.fillRect(i * 30 + _slHash(i) * 20, -200 + _slHash(i + 2) * 380, 1.3, 1.3);
      const mx = l + 260;
      const mg = ctx.createRadialGradient(mx, 60, 10, mx, 60, 120);
      mg.addColorStop(0, 'rgba(230,220,255,0.35)'); mg.addColorStop(1, 'rgba(230,220,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 120, -60, 240, 240);
      ctx.fillStyle = '#ece6f4'; ctx.beginPath(); ctx.arc(mx, 60, 18, 0, Math.PI * 2); ctx.fill();
      // A thin fracture line across the moon — the only sign of the war tonight
      _slSkyCrack(_slJag(mx - 40, 30, mx + 60, 100, 6, 6, 5), 0.5);
    });
    _slParallax(v, 0.18, (l, r) => {
      for (let i = Math.floor(l / 70) - 1; i * 70 < r + 70; i++) {
        const h = 150 + _slHash(i) * 230, w = 44 + _slHash(i + 30) * 26, x = i * 70;
        ctx.fillStyle = '#1e1428'; ctx.fillRect(x, G0 + 60 - h, w, h);
        ctx.fillStyle = 'rgba(255,200,150,0.5)';
        for (let wy = G0 + 70 - h; wy < G0 + 40; wy += 12) for (let wx = x + 5; wx < x + w - 5; wx += 9)
          if (_slHash(wx * 3 + wy + i) < 0.08) ctx.fillRect(wx, wy, 3, 5);
        if (_slHash(i + 9) < 0.15) _slAntenna(x + w / 2, G0 + 60 - h, 26, true);
      }
    });
    _slParallax(v, 0.45, (l, r) => {
      for (let i = Math.floor(l / 140) - 1; i * 140 < r + 140; i++) {
        const x = i * 140, w = 110 + _slHash(i * 3) * 30, h = _slHash(i * 5) * 50;
        ctx.fillStyle = '#2a2034'; ctx.fillRect(x, G0 - 10 - h, w, 300);
        ctx.fillStyle = 'rgba(255,214,150,0.4)';
        for (let wx = x + 10; wx < x + w - 10; wx += 20) if (_slHash(wx + i * 7) < 0.3) ctx.fillRect(wx, G0 + 10 - h, 7, 9);
      }
    });
  }
  function back(v) {
    // Building faces behind each roof edge: the roofline steps up and down
    for (const [x0, x1, y, col] of ROOFS) {
      if (!col || !_slVisible(v, x0, x1)) continue;
      _slParapet(x0, x1, y, '#5a4e58');
    }
    if (_slVisible(v, 0, 700)) {
      _slBulkhead(110, 440, 120, 116, '#5a4440');
      _slAcUnit(300, 440 - 56, 70, 56);
      _slSkylight(470, 440, 90);
      // Strings of fairy lights someone hung for a rooftop party that never happened
      ctx.strokeStyle = 'rgba(40,30,40,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(230, 440 - 110); ctx.quadraticCurveTo(450, 440 - 70, 680, 400 - 130); ctx.stroke();
      for (let k = 0; k < 16; k++) {
        const t = k / 15, x = 230 + 450 * t, y = (1 - t) * (1 - t) * 330 + 2 * (1 - t) * t * 370 + t * t * 270;
        const on = _slHash(k + Math.floor(frameCount / 40)) < 0.85;
        ctx.fillStyle = on ? ['#ffd27a', '#ff9a7a', '#a8e0ff'][k % 3] : '#3a3040';
        ctx.beginPath(); ctx.arc(x, y + 4, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#6a5040'; ctx.fillRect(560, 440 - 30, 70, 6); ctx.fillRect(566, 440 - 24, 4, 24); ctx.fillRect(620, 440 - 24, 4, 24);
    }
    if (_slVisible(v, 700, 1320)) {
      // Solar array, tilted panels on a frame
      for (let px = SOLAR.x; px < SOLAR.x + SOLAR.w; px += 60) {
        ctx.fillStyle = '#4a4e54'; ctx.fillRect(px + 8, 400 - 40, 4, 40); ctx.fillRect(px + 46, 400 - 30, 4, 30);
        ctx.fillStyle = '#1e2c4a';
        ctx.beginPath(); ctx.moveTo(px, 400 - 40); ctx.lineTo(px + 56, 400 - 40); ctx.lineTo(px + 56, 400 - 30); ctx.lineTo(px, 400 - 44); ctx.fill();
        ctx.strokeStyle = 'rgba(120,160,220,0.35)'; ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(px + k * 14, 400 - 42); ctx.lineTo(px + k * 14, 400 - 31); ctx.stroke(); }
      }
      // Radio mast — three service platforms; the booster is at the top
      ctx.strokeStyle = '#4a4f55'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(MAST.x + 18, 400); ctx.lineTo(MAST.x + 30, 40); ctx.moveTo(MAST.x + 52, 400); ctx.lineTo(MAST.x + 40, 40); ctx.stroke();
      ctx.lineWidth = 1;
      for (let y = 400; y > 40; y -= 18) { ctx.beginPath(); ctx.moveTo(MAST.x + 20, y); ctx.lineTo(MAST.x + 50, y - 18); ctx.moveTo(MAST.x + 50, y); ctx.lineTo(MAST.x + 20, y - 18); ctx.stroke(); }
      for (const y of MAST.ys) {
        ctx.fillStyle = '#34383c'; ctx.fillRect(MAST.x, y, 70, 6);
        ctx.strokeStyle = '#34383c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(MAST.x, y - 22); ctx.lineTo(MAST.x + 70, y - 22); ctx.stroke();
      }
      _slAntenna(MAST.x + 35, 40, 50, true);
      _slDish(MAST.x + 66, 250, 16, 1);
    }
    if (_slVisible(v, 1300, 1400)) {
      ctx.fillStyle = '#08060c'; ctx.fillRect(1310, 440, 60, 200);
    }
    if (_slVisible(v, 1370, 2010)) {
      // Greenhouse: the power cell is on its potting shelf
      const Gh = GREEN;
      ctx.fillStyle = 'rgba(150,200,180,0.18)'; ctx.fillRect(Gh.x, 440 - 110, Gh.w, 110);
      ctx.fillStyle = 'rgba(150,200,180,0.14)';
      ctx.beginPath(); ctx.moveTo(Gh.x, 440 - 110); ctx.lineTo(Gh.x + Gh.w / 2, 440 - 130); ctx.lineTo(Gh.x + Gh.w, 440 - 110); ctx.fill();
      ctx.strokeStyle = 'rgba(210,220,220,0.7)'; ctx.lineWidth = 2;
      ctx.strokeRect(Gh.x, 440 - 110, Gh.w, 110);
      for (let mx = Gh.x + 34; mx < Gh.x + Gh.w; mx += 34) { ctx.beginPath(); ctx.moveTo(mx, 440 - 110); ctx.lineTo(mx, 440); ctx.stroke(); }
      ctx.fillStyle = '#5a4030'; ctx.fillRect(Gh.x + 20, Gh.shelf, 80, 6); ctx.fillRect(Gh.x + 24, Gh.shelf + 6, 4, 54); ctx.fillRect(Gh.x + 92, Gh.shelf + 6, 4, 54);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = '#8a4a30'; ctx.fillRect(Gh.x + 110 + k * 14, 440 - 14, 10, 14); ctx.fillStyle = '#4e7a3e'; ctx.beginPath(); ctx.arc(Gh.x + 115 + k * 14, 440 - 20, 7, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,230,160,0.12)'; ctx.fillRect(Gh.x + 2, 440 - 108, Gh.w - 4, 106);
      _slAcUnit(1450, 440 - 50, 64, 50);
      _slChainFence(1840, 440, 150, 80);
    }
    if (_slVisible(v, 2010, 2600)) {
      _slAcUnit(BOARD.x - 80, BOARD.base - 64, 70, 64);
      // Tall billboard frame: catwalk, a caged ladder, the top deck
      const B = BOARD;
      ctx.fillStyle = '#2a2e32';
      for (const px of [B.x + 30, B.x + B.w - 36]) ctx.fillRect(px, B.top, 6, B.base - B.top);
      ctx.strokeStyle = '#2a2e32'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(B.x + 33, B.base); ctx.lineTo(B.x + B.w - 33, B.cat + 8); ctx.moveTo(B.x + B.w - 33, B.base); ctx.lineTo(B.x + 33, B.cat + 8); ctx.stroke();
      ctx.fillStyle = '#34383c'; ctx.fillRect(B.x, B.cat, B.w, 7);
      ctx.fillStyle = '#121418'; ctx.fillRect(B.x, B.top + 10, B.w, B.cat - B.top - 30);
      const bg = ctx.createLinearGradient(B.x, 0, B.x + B.w, 0);
      bg.addColorStop(0, '#3a1a4a'); bg.addColorStop(1, '#8a3a6a');
      ctx.fillStyle = bg; ctx.fillRect(B.x + 8, B.top + 18, B.w - 16, B.cat - B.top - 46);
      ctx.fillStyle = '#f6eef4'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('NIGHT MARKET', B.x + B.w / 2, B.top + 66);
      ctx.font = '11px Arial'; ctx.fillText('SATURDAYS · PIER 9 · ALL WELCOME', B.x + B.w / 2, B.top + 88);
      ctx.fillStyle = '#34383c'; ctx.fillRect(B.x + 90, B.top, B.w - 180, 7);
      ctx.strokeStyle = '#34383c'; ctx.lineWidth = 1.5;
      ctx.strokeRect(B.x + 40, B.cat - 66, 60, 66);
      for (let ly = B.cat - 60; ly < B.cat; ly += 10) { ctx.beginPath(); ctx.moveTo(B.x + 54, ly); ctx.lineTo(B.x + 86, ly); ctx.stroke(); }
      ctx.fillStyle = '#34383c'; ctx.fillRect(B.x + 40, B.cat - 66, 60, 5);
    }
    if (_slVisible(v, 2580, 2660)) { ctx.fillStyle = '#08060c'; ctx.fillRect(2590, 440, 60, 200); }
    if (_slVisible(v, 2600, 3400)) {
      _slWaterTower(TOWER.x, TOWER.legTop, TOWER.w, TOWER.tankH);
      _slCrate(TOWER.x - 90, 440 - 60, 60, '#6a5a44');
      _slBulkhead(3000, 440, 110, 110, '#5a4448');
      _slAntenna(3120, 440 - 6, 60, true);
    }
  }

  // Planks over the two gaps between buildings
  function _planks(v, ph, x0, x1, y) {
    if (!_slVisible(v, x0 - 20, x1 + 20)) return;
    ctx.fillStyle = '#8a6a44';
    if (ph === 'front') { ctx.fillRect(x0 - 12, y, x1 - x0 + 24, 8); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x0 - 12, y + 8, x1 - x0 + 24, 2); }
    else for (let k = 0; k < 3; k++) ctx.fillRect(x0 - 12, y - 16 + k * 5, x1 - x0 + 24, 4);
  }

  const ZONES = [
    { x0: -200, x1: 1310, kind: 'roof', face: 'brick', brick: '#4a3a44' },
    { x0: 1370, x1: 2590, kind: 'roof', face: 'brick', brick: '#4c3c3a' },
    { x0: 2650, x1: 3600, kind: 'roof', face: 'brick', brick: '#4a3c46' },
  ];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    _planks(v, ph, 1310, 1370, 440);
    _planks(v, ph, 2590, 2650, 440);
  }

  STORY_LEVELS[5] = { floor, layout, backdrop, back, surface };
})();
