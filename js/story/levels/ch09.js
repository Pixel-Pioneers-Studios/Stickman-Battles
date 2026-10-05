'use strict';
// js/story/levels/ch09.js — Chapter 9 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 9 — Veran's Field Notes (puzzle)
// The city records archive Veran turned into a node: a ruined reading hall,
// a basement, a central stacks tower and a records hall with a mezzanine and
// an upper gallery. The three mechanisms are deliberately out of spatial order
// (positions mirrored in the chapter's puzzleSwitchDefs): 1 is up in the far
// gallery, 2 is in the basement alcove under the reading-hall floor, 3 is on
// top of the stacks tower. The Archive Core waits in its vault at the end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const BASE_Y = 560;                                  // basement floor
  const HOLE = [1030, 1200];                           // open drop into the basement
  const ALCOVE = [900, 1030];                          // basement under the overhang (switch 2)
  const DESK = { x: 160, w: 120, h: 50 };
  const TABLES = [[420, 110], [640, 110]];
  const TOWER = [[1390, G - 70, 80], [1430, G - 140, 80], [1450, G - 200, 120]];
  const SPIRAL = [[1950, G - 40], [1985, G - 80], [2020, G - 120]];
  const MEZ = { x: 2050, w: 560, y: G - 150 };
  const RUNGS = [[2300, G - 205, 44]];
  const GALLERY = { x: 2350, w: 230, y: G - 260 };
  const CORE_X = 2700;

  function floor() {
    return [
      _slFloorSeg(0, G, ALCOVE[0], 600 - G),
      _slFloorSeg(ALCOVE[0], G, ALCOVE[1] - ALCOVE[0], 20),
      _slFloorSeg(ALCOVE[0], BASE_Y, HOLE[1] - ALCOVE[0], 600 - BASE_Y + 40),
      _slFloorSeg(HOLE[1], G, 3400 - HOLE[1], 600 - G),
    ];
  }

  function layout() {
    const P = [];
    _slLedge(P, DESK.x, G - DESK.h, DESK.w);
    for (const [x, w] of TABLES) _slLedge(P, x, G - 36, w);
    _slLedge(P, 820, G - 150, 70);                     // top of a toppled shelf leaning on the wall
    for (const [x, y, w] of TOWER) _slLedge(P, x, y, w);
    for (const [x, y] of SPIRAL) _slLedge(P, x, y, 40);
    _slLedge(P, MEZ.x, MEZ.y, MEZ.w);
    for (const [x, y, w] of RUNGS) _slLedge(P, x, y, w);
    _slLedge(P, GALLERY.x, GALLERY.y, GALLERY.w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#060810');
    // Seen through the broken roof: a night sky with the city's glow
    _slParallax(v, 0.06, (l, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = Math.floor(l / 34); i * 34 < r; i++) if (_slHash(i + 3) < 0.3) ctx.fillRect(i * 34 + _slHash(i) * 20, -300 + _slHash(i + 5) * 400, 1.2, 1.2);
    });
  }

  function back(v) {
    // Interior shell: stone walls with pilasters; the roof is open in places
    if (_slVisible(v, -200, 3400)) {
      const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3400, v.x + v.w + 40);
      ctx.fillStyle = '#2a2622'; ctx.fillRect(x0, G - 440, x1 - x0, 440);
      for (let px = Math.floor(x0 / 200) * 200; px < x1; px += 200) {
        ctx.fillStyle = '#34302a'; ctx.fillRect(px, G - 440, 30, 440);
        ctx.fillStyle = 'rgba(255,240,210,0.05)'; ctx.fillRect(px, G - 440, 4, 440);
      }
      ctx.fillStyle = '#1e1a16'; ctx.fillRect(x0, G - 460, x1 - x0, 24);
      // Roof holes: moonlight spills in
      for (const [hx, hw] of [[560, 160], [1480, 140], [2440, 120]]) {
        if (!_slVisible(v, hx - 60, hx + hw + 120)) continue;
        ctx.fillStyle = '#060810'; ctx.fillRect(hx, G - 460, hw, 30);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, G - 440, 0, G);
        g.addColorStop(0, 'rgba(170,190,255,0.20)'); g.addColorStop(1, 'rgba(170,190,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx, G - 440); ctx.lineTo(hx + hw, G - 440); ctx.lineTo(hx + hw + 90, G); ctx.lineTo(hx + 40, G); ctx.fill();
        ctx.restore();
        // Dust motes in the beam
        for (let k = 0; k < 8; k++) {
          const t = (frameCount * 0.3 + k * 40) % 400;
          ctx.fillStyle = 'rgba(230,230,255,0.35)'; ctx.fillRect(hx + 30 + _slHash(k + hx) * hw + t * 0.15, G - 420 + t, 1.5, 1.5);
        }
      }
    }
    // ── Foyer: doors off their hinges, the reception desk
    if (_slVisible(v, -100, 400)) {
      ctx.fillStyle = '#1a1612'; ctx.fillRect(10, G - 190, 90, 190);
      ctx.fillStyle = '#4a3424'; ctx.save(); ctx.translate(100, G); ctx.rotate(-0.25); ctx.fillRect(0, -170, 40, 170); ctx.restore();
      ctx.fillStyle = '#d8c8a0'; ctx.font = 'bold 13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('CITY RECORDS', 56, G - 206);
      const D = DESK;
      ctx.fillStyle = '#5a3e2a'; ctx.fillRect(D.x, G - D.h, D.w, D.h);
      ctx.fillStyle = '#6a4a34'; ctx.fillRect(D.x - 6, G - D.h - 6, D.w + 12, 8);
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(D.x + 20, G - D.h - 18, 26, 12);
      ctx.fillStyle = '#e8e0d0'; for (let k = 0; k < 6; k++) ctx.fillRect(D.x - 30 + _slHash(k) * 180, G - 3, 10, 3);
    }
    // ── Reading hall: tall shelves, toppled ones, tables, Veran's wall of notes
    if (_slVisible(v, 300, 1300)) {
      for (const sx of [330, 520, 1080, 1220]) _slBookshelf(sx, G - 260, 90, 260);
      // One shelf toppled against the wall — its top is standable
      ctx.save(); ctx.translate(780, G); ctx.rotate(-0.42);
      _slBookshelf(0, -230, 80, 230);
      ctx.restore();
      for (const [tx, w] of TABLES) {
        ctx.fillStyle = '#5a3e2a'; ctx.fillRect(tx, G - 36, w, 8);
        ctx.fillRect(tx + 6, G - 28, 6, 28); ctx.fillRect(tx + w - 12, G - 28, 6, 28);
        ctx.fillStyle = '#e8dcc0'; ctx.fillRect(tx + 20, G - 40, 30, 4); ctx.fillRect(tx + 60, G - 42, 22, 6);
        ctx.fillStyle = '#3a6a3a'; ctx.fillRect(tx + 86, G - 54, 4, 18); ctx.beginPath(); ctx.arc(tx + 88, G - 56, 7, Math.PI, 0); ctx.fill();
      }
      // Evidence wall: pinned pages joined by red string, "CULTIVATION" circled
      const EW = 640;
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(EW - 10, G - 330, 300, 150);
      ctx.fillStyle = '#6a5440'; ctx.fillRect(EW - 4, G - 324, 288, 138);
      const pins = [];
      for (let k = 0; k < 9; k++) {
        const px = EW + 10 + (k % 3) * 92 + _slHash(k) * 20, py = G - 314 + Math.floor(k / 3) * 42 + _slHash(k + 4) * 10;
        ctx.fillStyle = '#e8dcc0'; ctx.fillRect(px, py, 50, 32);
        ctx.fillStyle = 'rgba(40,30,20,0.6)'; for (let ln = 0; ln < 4; ln++) ctx.fillRect(px + 5, py + 6 + ln * 6, 38 - (ln * 7) % 15, 1.5);
        pins.push([px + 25, py + 3]);
      }
      ctx.strokeStyle = '#b8302a'; ctx.lineWidth = 1;
      ctx.beginPath(); [0, 4, 8, 5, 1, 3, 7].forEach((k, i) => i ? ctx.lineTo(...pins[k]) : ctx.moveTo(...pins[k])); ctx.stroke();
      for (const [px, py] of pins) { ctx.fillStyle = '#d8402a'; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#2a1a10'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('CULTIVATION', pins[4][0], pins[4][1] + 22);
      ctx.strokeStyle = '#b8302a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(pins[4][0], pins[4][1] + 19, 32, 9, 0, 0, Math.PI * 2); ctx.stroke();
      // Chandelier on the floor
      ctx.strokeStyle = '#8a7a4a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(960, G - 10, 44, 8, 0, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 6; k++) { ctx.fillStyle = '#d8ccb0'; ctx.fillRect(922 + k * 15, G - 22, 3, 10); }
    }
    // ── Basement: drawn behind the floor, visible through the hole and the alcove
    if (_slVisible(v, ALCOVE[0] - 20, HOLE[1] + 20)) {
      ctx.fillStyle = '#16120e'; ctx.fillRect(ALCOVE[0], G, HOLE[1] - ALCOVE[0], BASE_Y - G);
      for (let bx = ALCOVE[0] + 6; bx < HOLE[1] - 30; bx += 34) {
        for (let k = 0; k < 2; k++) { ctx.fillStyle = k ? '#7a6448' : '#8a7454'; ctx.fillRect(bx, BASE_Y - 26 - k * 24, 30, 22); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(bx + 10, BASE_Y - 18 - k * 24, 10, 6); }
      }
      // Hanging bulb over the alcove
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(950, G + 20); ctx.lineTo(950, G + 40); ctx.stroke();
      _slWallLamp(950, G + 46, BASE_Y, true);
      // Broken floorboards hanging into the hole
      ctx.fillStyle = '#5a3e2a';
      for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(HOLE[0] + 6 + k * 12, G + 4); ctx.rotate(0.9 + k * 0.2); ctx.fillRect(0, -3, 40, 6); ctx.restore(); }
    }
    // ── Stacks tower
    if (_slVisible(v, 1300, 1700)) {
      for (const [x, y, w] of TOWER) _slBookshelf(x, y, w, G - y);
      ctx.fillStyle = '#6a4a34'; for (const [x, y, w] of TOWER) ctx.fillRect(x - 3, y - 4, w + 6, 6);
      // A rolling ladder against the tower
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(1360, G); ctx.lineTo(1400, G - 210); ctx.moveTo(1376, G); ctx.lineTo(1416, G - 210); ctx.stroke();
      ctx.lineWidth = 1.5; for (let k = 1; k < 12; k++) { const t = k / 12; ctx.beginPath(); ctx.moveTo(1360 + 40 * t, G - 210 * t); ctx.lineTo(1376 + 40 * t, G - 210 * t); ctx.stroke(); }
      _slBookshelf(1640, G - 230, 90, 230);
      _slBookshelf(1760, G - 230, 90, 230);
    }
    // ── Records hall: spiral stair, mezzanine, upper gallery, chalkboards
    if (_slVisible(v, 1900, 2650)) {
      ctx.fillStyle = '#3a2e24'; ctx.fillRect(1995, G - 160, 10, 160);
      for (const [x, y] of SPIRAL) { ctx.fillStyle = '#6a4a34'; ctx.fillRect(x, y, 40, 6); }
      ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(1950, G - 70); ctx.quadraticCurveTo(2000, G - 110, 2050, G - 180); ctx.stroke();
      const M = MEZ;
      ctx.fillStyle = '#5a4030'; ctx.fillRect(M.x, M.y, M.w, 12);
      ctx.fillStyle = '#3a2a1e'; ctx.fillRect(M.x, M.y + 12, M.w, 6);
      ctx.strokeStyle = '#6a4a34'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(M.x, M.y - 24); ctx.lineTo(M.x + M.w, M.y - 24); ctx.stroke();
      for (let bx = M.x; bx <= M.x + M.w; bx += 12) { ctx.beginPath(); ctx.moveTo(bx, M.y); ctx.lineTo(bx, M.y - 24); ctx.stroke(); }
      for (const px of [M.x + 40, M.x + 300, M.x + M.w - 30]) { ctx.fillStyle = '#4a3424'; ctx.fillRect(px, M.y + 18, 12, G - M.y - 18); }
      // Filing cabinets under the mezzanine
      for (let fx = 2080; fx < 2560; fx += 54) {
        ctx.fillStyle = '#5a6066'; ctx.fillRect(fx, G - 100, 46, 100);
        ctx.fillStyle = '#3a3e44'; for (let d = 0; d < 4; d++) ctx.fillRect(fx + 4, G - 96 + d * 24, 38, 2);
        ctx.fillStyle = '#c8c8c8'; for (let d = 0; d < 4; d++) ctx.fillRect(fx + 19, G - 86 + d * 24, 8, 3);
      }
      // Chalkboards behind the mezzanine with Veran's equations
      ctx.fillStyle = '#5a3e2a'; ctx.fillRect(2090, G - 300, 220, 110);
      ctx.fillStyle = '#1e2a24'; ctx.fillRect(2096, G - 294, 208, 98);
      ctx.fillStyle = 'rgba(230,230,220,0.75)'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
      ctx.fillText('Φ(k) = Σ fₙ · e^(iθ)', 2106, G - 274);
      ctx.fillText('95th → ∂/∂t → 0 ?', 2106, G - 256);
      ctx.fillText('not a cage. a FIELD.', 2106, G - 238);
      ctx.fillText('— harvest window? —', 2106, G - 220);
      // Ladder rung up to the gallery, the gallery itself
      ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(2306, M.y); ctx.lineTo(2306, GALLERY.y); ctx.moveTo(2338, M.y); ctx.lineTo(2338, GALLERY.y); ctx.stroke();
      for (let ly = GALLERY.y + 12; ly < M.y; ly += 14) { ctx.beginPath(); ctx.moveTo(2306, ly); ctx.lineTo(2338, ly); ctx.stroke(); }
      const Gl = GALLERY;
      ctx.fillStyle = '#5a4030'; ctx.fillRect(Gl.x, Gl.y, Gl.w, 10);
      ctx.strokeStyle = '#6a4a34'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(Gl.x, Gl.y - 24); ctx.lineTo(Gl.x + Gl.w, Gl.y - 24); ctx.stroke();
      for (let bx = Gl.x; bx <= Gl.x + Gl.w; bx += 12) { ctx.beginPath(); ctx.moveTo(bx, Gl.y); ctx.lineTo(bx, Gl.y - 24); ctx.stroke(); }
      _slBookshelf(Gl.x + 10, Gl.y - 150, 80, 126);
      _slBookshelf(Gl.x + 140, Gl.y - 150, 80, 126);
    }
    // ── The Archive Core vault
    if (_slVisible(v, CORE_X - 120, CORE_X + 400)) {
      ctx.fillStyle = '#1a1e24'; ctx.fillRect(CORE_X - 60, G - 320, 300, 320);
      ctx.fillStyle = '#3a4048'; ctx.fillRect(CORE_X - 70, G - 330, 320, 14); ctx.fillRect(CORE_X - 70, G - 330, 14, 330); ctx.fillRect(CORE_X + 236, G - 330, 14, 330);
      const solved = (typeof puzzleStep !== 'undefined' && typeof puzzleSwitches !== 'undefined') ? puzzleStep / Math.max(1, puzzleSwitches.length) : 0;
      const pulse = 0.6 + 0.4 * Math.sin(frameCount * 0.06);
      const cx = CORE_X + 90, cy = G - 170;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 140);
      g.addColorStop(0, `rgba(120,240,220,${(0.25 + 0.45 * solved) * pulse})`); g.addColorStop(1, 'rgba(120,240,220,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 140, cy - 140, 280, 280);
      ctx.restore();
      ctx.fillStyle = `rgba(160,250,230,${0.5 + 0.4 * solved})`;
      ctx.beginPath(); ctx.moveTo(cx, cy - 70); ctx.lineTo(cx + 30, cy); ctx.lineTo(cx, cy + 70); ctx.lineTo(cx - 30, cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e8fff8'; ctx.lineWidth = 1.5; ctx.stroke();
      // Three rings, one per mechanism, lighting as each is solved
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = solved * 3 > k ? '#7af0dc' : 'rgba(120,140,150,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, 50 + k * 18, 12 + k * 5, frameCount * 0.004 * (k % 2 ? 1 : -1), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#3a4048'; ctx.fillRect(cx - 50, G - 40, 100, 40);
      ctx.fillStyle = '#8af0dc'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText('ARCHIVE CORE · V.', cx, G - 22);
    }
  }

  const ZONES = [{ x0: -200, x1: 3600, kind: 'parquet', face: 'concrete' }];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    // The overhang over the alcove is a thin floor: give it a joist edge, not a slab face
    if (ph === 'front' && _slVisible(v, ALCOVE[0], ALCOVE[1])) {
      ctx.fillStyle = '#4a3222'; ctx.fillRect(ALCOVE[0], G + 14, ALCOVE[1] - ALCOVE[0], 6);
      for (let jx = ALCOVE[0] + 10; jx < ALCOVE[1]; jx += 30) ctx.fillRect(jx, G + 20, 6, 10);
    }
  }

  STORY_LEVELS[9] = { floor, layout, backdrop, back, surface };
})();
