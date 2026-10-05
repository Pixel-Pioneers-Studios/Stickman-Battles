'use strict';
// js/story/levels/ch55.js — Chapter 55 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 55 — The Hidden Page (puzzle, 3 sequence locks)
// The neutral dimension's archive vault: grey stacks that rise out of frame,
// memory crystals shelved like books, rolling ladders. The three sequence
// locks are out of spatial order (positions mirrored in the chapter's
// puzzleSwitchDefs): 1 at the top of the tall shelf, 2 down in the sunken
// reading pit, 3 on the far gallery. Each lock that opens lights a line of
// the hidden page on the vault door: "The original protocol requires two
// fragment bearers. Not one."
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const FLOOR = [[0, 700, 440], [700, 1000, 500], [1000, 3200, 440]];
  const SHELF = [[1700, 350, 100], [1820, 270, 100], [1900, 190, 120]];
  const GALLERY = [[2380, 350, 90], [2480, 260, 140]];
  const PIT_STEPS = [[700, 470, 44], [956, 470, 44]];
  const DOOR = 2850;
  const LINES = ['THE ORIGINAL PROTOCOL', 'REQUIRES TWO', 'FRAGMENT BEARERS.'];

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const L of [SHELF, GALLERY]) for (const [x, y, w] of L) _slLedge(P, x, y, w);
    for (const [x, y, w] of PIT_STEPS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#7a7a80'); }

  function back(v) {
    const solved = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3400, v.x + v.w + 40);
    // Stacks: grey shelves of memory crystals rising out of frame
    ctx.fillStyle = '#5a5a62'; ctx.fillRect(x0, v.y - 20, x1 - x0, G - v.y + 20);
    for (let k = Math.floor(x0 / 150); k * 150 < x1; k++) {
      const sx = k * 150;
      if (sx > DOOR - 260 && sx < DOOR + 200) continue;
      ctx.fillStyle = '#4a4a52'; ctx.fillRect(sx + 8, v.y - 20, 134, G - v.y + 20);
      for (let sy = Math.ceil((v.y - 20) / 40) * 40; sy < G; sy += 40) {
        ctx.fillStyle = '#6a6a72'; ctx.fillRect(sx + 8, sy, 134, 4);
        for (let c = 0; c < 9; c++) {
          const h = _slHash(k * 131 + sy + c);
          ctx.fillStyle = h < 0.12 ? `hsla(${200 + h * 600},60%,70%,0.8)` : `rgba(180,180,190,${0.25 + h * 0.3})`;
          ctx.fillRect(sx + 14 + c * 14, sy - 22 + h * 6, 8, 18 - h * 6);
        }
      }
      // Rolling ladder on every third stack
      if (k % 3 === 0) { ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 110, v.y); ctx.lineTo(sx + 130, G); ctx.moveTo(sx + 128, v.y); ctx.lineTo(sx + 148, G); ctx.stroke(); }
    }
    // Reading pit: a sunken desk well
    if (_slVisible(v, 600, 1100)) {
      ctx.fillStyle = '#3a3a42'; ctx.fillRect(700, 440, 300, 60);
      ctx.fillStyle = '#6a5a4a'; ctx.fillRect(760, 470, 80, 8); ctx.fillRect(770, 478, 6, 22); ctx.fillRect(824, 478, 6, 22);
      for (const [x, y, w] of PIT_STEPS) { ctx.fillStyle = '#6a6a72'; ctx.fillRect(x, y, w, 30); }
    }
    // Tall shelf top and gallery: catwalks with rails
    for (const [x, y, w] of SHELF.concat(GALLERY)) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#7a7a82'; ctx.fillRect(x, y, w, 8);
      ctx.strokeStyle = '#7a7a82'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + w, y - 20); ctx.stroke();
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(x + w / 2 - 4, y + 8, 8, G - y - 8);
    }
    // The vault door with the hidden page, one line lit per lock
    if (_slVisible(v, DOOR - 260, DOOR + 200)) {
      ctx.fillStyle = '#3a3a42'; ctx.fillRect(DOOR - 160, 160, 320, 280);
      ctx.strokeStyle = '#8a8a92'; ctx.lineWidth = 6; ctx.strokeRect(DOOR - 160, 160, 320, 280);
      ctx.fillStyle = 'rgba(230,225,210,0.12)'; ctx.fillRect(DOOR - 120, 190, 240, 130);
      ctx.font = 'bold 12px Georgia'; ctx.textAlign = 'center';
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k < solved ? '#f0e8d0' : 'rgba(240,232,208,0.12)';
        ctx.fillText(LINES[k], DOOR, 225 + k * 32);
      }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3400, kind: 'parquet', face: 'concrete' }]); }

  STORY_LEVELS[55] = {
    sky: ['#6a6a70', '#8a8a90'],
    groundColor: '#3a3a42',
    platColor: '#7a7a82',
    floor, layout, backdrop, back, surface,
  };
})();
