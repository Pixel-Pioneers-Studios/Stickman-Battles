'use strict';
// js/story/levels/ch87.js — Chapter 87 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 87 — The War Camp (walk → duel vs two War Veterans)
// The War Champion's camp, behind the front. Tents and cook fires, weapon
// racks, a supply wagon you can climb, a watchtower, the war drums on their
// stage. At the midpoint the command post that "had never fallen. Not in
// three hundred years": a gatehouse of stone and timber between two towers,
// with the Champion's personal guard waiting in the gate. Inside the post,
// the wall the chapter ends on: "a record of every fighter who reached this
// point. The list is not short. None of the names have a victory beside
// them." It runs on and on, column after column, every line ending in a
// blank where the mark would go. The cache shafts are supply cellar hatches,
// their trapdoors propped open.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, GATE = 3000, WALL0 = 3500, WALL1 = 4500;
  const WAGON = { x: 500, w: 140, bed: 370, roof: 300 };
  const TOWER = { x: 1150, w: 110, y: 270 }, CRATES = [1060, 360, 70];
  const DRUMS = [2230, 360, 110];
  const POST = [[GATE - 340, 360, 100], [GATE + 240, 360, 100], [GATE - 240, 250, 480]];
  const INNER = [[3700, 370, 140], [4050, 350, 100], [4170, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const TENTS = [[820, '#6a5a40'], [1450, '#5a4a36'], [2050, '#6a5a40'], [5450, '#5a4a36']];
  const HATCHES = [1800, 4680];

  const NAMES = [];
  function recordName(i) {
    if (!NAMES[i]) {
      const len = 3 + Math.floor(_slHash(i * 31) * 5);
      let n = ''; for (let k = 0; k < len; k++) n += String.fromCharCode(65 + Math.floor(_slHash(i * 97 + k * 13) * 26));
      NAMES[i] = n + ' ......';
    }
    return NAMES[i];
  }

  function layout() {
    const P = [];
    _slLedge(P, WAGON.x, WAGON.bed, WAGON.w); _slLedge(P, WAGON.x + 20, WAGON.roof, WAGON.w - 40);
    _slLedge(P, TOWER.x, TOWER.y, TOWER.w); _slLedge(P, ...CRATES);
    _slLedge(P, ...DRUMS);
    for (const L of [POST, INNER]) for (const [x, y, w] of L) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slWarSky(v, 87);
    _slWarLine(v, 0.18, 870, '#2a1810');
  }

  function tent(x, col) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - 70, G); ctx.lineTo(x, G - 90); ctx.lineTo(x + 70, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(x - 14, G); ctx.lineTo(x, G - 60); ctx.lineTo(x + 14, G); ctx.fill();
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, G - 90); ctx.lineTo(x, G - 104); ctx.moveTo(x - 70, G); ctx.lineTo(x - 90, G); ctx.stroke();
  }

  function rack(x) {
    ctx.fillStyle = '#4a3420'; ctx.fillRect(x, G - 60, 70, 5); ctx.fillRect(x + 4, G - 60, 4, 60); ctx.fillRect(x + 62, G - 60, 4, 60);
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + 10 + k * 12, G - 4); ctx.lineTo(x + 14 + k * 12, G - 78); ctx.stroke(); }
  }

  function back(v) {
    for (const [x, c] of TENTS) if (_slVisible(v, x - 90, x + 90)) tent(x, c);
    for (const x of [700, 1600, 2450, 3900, 5300]) if (_slVisible(v, x - 10, x + 80)) rack(x);
    for (const x of [960, 1950, 5600]) if (_slVisible(v, x - 40, x + 40)) { _slFire(x - 14, G, 28, 0.7); _slSmoke(x, G - 30, 140, true, x); }
    // Supply wagon: bed and canopy are both standable
    if (_slVisible(v, WAGON.x - 30, WAGON.x + WAGON.w + 30)) {
      const { x, w, bed, roof } = WAGON;
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(x, bed, w, 24);
      for (const wx of [x + 26, x + w - 26]) { ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.arc(wx, G - 22, 22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6a4e32'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = '#c8b890';
      ctx.beginPath(); ctx.moveTo(x + 20, bed); ctx.lineTo(x + 20, roof + 10); ctx.quadraticCurveTo(x + w / 2, roof - 12, x + w - 20, roof + 10); ctx.lineTo(x + w - 20, bed); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 3; k++) _slCrate(x + 8 + k * 30, bed - 22, 22);
    }
    // Watchtower with its crate step
    if (_slVisible(v, CRATES[0] - 20, TOWER.x + TOWER.w + 20)) {
      _slCrate(CRATES[0], CRATES[1], 40); _slCrate(CRATES[0] + 34, CRATES[1] + 40, 40); _slCrate(CRATES[0], CRATES[1] + 40, 34);
      const { x, w, y } = TOWER;
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x + 8, G); ctx.lineTo(x + 16, y); ctx.moveTo(x + w - 8, G); ctx.lineTo(x + w - 16, y); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, G - 20); ctx.lineTo(x + w - 14, y + 30); ctx.moveTo(x + w - 10, G - 20); ctx.lineTo(x + 14, y + 30); ctx.stroke();
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x, y - 30, 6, 30); ctx.fillRect(x + w - 6, y - 30, 6, 30); ctx.fillRect(x - 6, y - 40, w + 12, 10);
    }
    // War drums on their stage
    if (_slVisible(v, DRUMS[0] - 20, DRUMS[0] + DRUMS[2] + 20)) {
      const [x, y, w] = DRUMS;
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#5a3e26'; ctx.fillRect(x - 4, y, w + 8, 7);
      for (const dx of [x + 26, x + w - 30]) {
        ctx.fillStyle = '#7a2a1c'; ctx.fillRect(dx - 18, y - 44, 36, 44);
        ctx.fillStyle = '#d8c8a8'; ctx.beginPath(); ctx.ellipse(dx, y - 44, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(dx - 18 + k * 12, y - 44); ctx.lineTo(dx - 12 + k * 12, y); ctx.stroke(); }
      }
    }
    // The command post: gatehouse between two towers
    if (_slVisible(v, GATE - 420, GATE + 420)) {
      _slBrick(GATE - 360, 220, 120, G - 220, '#5a4a3a');
      _slBrick(GATE + 240, 220, 120, G - 220, '#5a4a3a');
      for (const tx of [GATE - 360, GATE + 240]) for (let b = 0; b < 5; b++) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect(tx + b * 26, 206, 16, 14); }
      ctx.fillStyle = '#5e4632'; ctx.fillRect(GATE - 344, 356, 108, 8); ctx.fillRect(GATE + 236, 356, 108, 8);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(GATE - 240, 250, 480, 26);
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(GATE - 240, 250, 480, 6);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(GATE - 200, 276, 400, G - 276);
      ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3;
      for (let gx = GATE - 196; gx < GATE + 200; gx += 28) { ctx.beginPath(); ctx.moveTo(gx, 276); ctx.lineTo(gx, 300); ctx.stroke(); }
      _slBanner(GATE - 300, 220, 80, '#8a1a10', 1); _slBanner(GATE + 300, 220, 80, '#8a1a10', 2);
    }
    // The record wall: every fighter who reached this point, none with a victory
    if (_slVisible(v, WALL0, WALL1)) {
      _slBrick(Math.max(WALL0, v.x - 40), 120, Math.min(WALL1, v.x + v.w + 40) - Math.max(WALL0, v.x - 40), G - 120, '#5a4a3a');
      ctx.fillStyle = 'rgba(30,20,12,0.7)'; ctx.font = '7px monospace'; ctx.textAlign = 'left';
      for (let c = Math.max(0, Math.floor((v.x - WALL0) / 70)); c * 70 + WALL0 < Math.min(WALL1, v.x + v.w + 40); c++) {
        for (let r = 0; r < 26; r++) {
          ctx.fillText(recordName(c * 26 + r), WALL0 + 10 + c * 70, 136 + r * 11);
        }
      }
    }
    for (const [x, y, w] of INNER) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x + 6, y + 8, 6, G - y - 8); ctx.fillRect(x + w - 12, y + 8, 6, G - y - 8);
      if (y === 370) { ctx.fillStyle = '#c8b890'; ctx.fillRect(x + 10, y - 3, w - 20, 3); ctx.fillStyle = '#8a1a10'; ctx.fillRect(x + 50, y - 4, 6, 2); }
    }
    // Supply cellar hatches over the cache shafts, trapdoors propped open
    for (const hx of HATCHES) {
      if (!_slVisible(v, hx - 90, hx + 90)) continue;
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(hx - 52, G - 6, 8, 6); ctx.fillRect(hx + 44, G - 6, 8, 6);
      ctx.save(); ctx.translate(hx - 46, G - 4); ctx.rotate(-1.2);
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(0, -4, 60, 8); ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1; for (let k = 10; k < 60; k += 12) { ctx.beginPath(); ctx.moveTo(k, -4); ctx.lineTo(k, 4); ctx.stroke(); }
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'mud', face: 'soil' }]); }

  STORY_LEVELS[87] = {
    sky: ['#1a0e08', '#3a1e10', '#6a3a1c'],
    groundColor: '#2e2016',
    platColor: '#5a3e26',
    layout, backdrop, back, surface,
  };
})();
