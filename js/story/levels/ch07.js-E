'use strict';
// js/story/levels/ch07.js — Chapter 7 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 7 — The Long Walk (traversal)
// "The fracture had split the streets. Dimensional tears everywhere. People —
// or things that looked like people — wandering the gaps. The signal beacon is
// somewhere in the collapsed mall district." First half: street slabs pushed
// up and down by the fracture, with tears that look into other worlds. Second
// half: inside Eastgate Mall — escalators up to a broken mezzanine, an upper
// balcony, the caved-in skylight. The beacon sits by the mall directory.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const MALL = 2600;          // facade x; interior from here to the world's end
  const SLABS = [
    [0, 400, 440], [400, 640, 400], [640, 900, 440], [900, 1080, 498], [1080, 1400, 440],
    [1400, 1560, 372], [1560, 1800, 430], [1800, 2050, 470], [2050, 2300, 440], [2300, 2450, 408], [2450, 4500, 440],
  ];
  const ESC1  = { x: 2790, steps: 4 };                  // escalator up to the mezzanine
  const MEZ1  = { x: 2920, w: 430, y: G - 150 };
  const MEZ2  = { x: 3480, w: 440, y: G - 150 };
  const ESC2  = { x: 3540, steps: 4 };                  // second escalator, mezzanine → balcony
  const TOP   = { x: 3660, w: 220, y: G - 280 };
  const KIOSK = { x: 3140, w: 90, h: 70 };
  const BEACON_X = 3850;
  // Tears into other places: [x, y, r, palette]
  const TEARS = [[520, G - 210, 60, 'desert'], [1230, G - 240, 70, 'ocean'], [1950, G - 220, 64, 'forest'], [2380, G - 260, 44, 'void']];

  function floor() { return SLABS.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }

  function layout() {
    const P = [];
    _slLedge(P, 700, G - 60, 90);              // tilted car roof
    _slLedge(P, 1640, 430 - 70, 110);           // newsstand roof
    for (let i = 0; i < ESC1.steps; i++) _slLedge(P, ESC1.x + i * 32, G - 30 - i * 30, 40);
    _slLedge(P, MEZ1.x, MEZ1.y, MEZ1.w);
    _slLedge(P, KIOSK.x, G - KIOSK.h, KIOSK.w);
    _slLedge(P, MEZ2.x, MEZ2.y, MEZ2.w);
    for (let i = 0; i < ESC2.steps; i++) _slLedge(P, ESC2.x + i * 30, MEZ2.y - 28 - i * 26, 38);
    _slLedge(P, TOP.x, TOP.y, TOP.w);
    return P;
  }

  function _tearView(x, y, r, kind) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.65, r, 0.15, 0, Math.PI * 2); ctx.clip();
    if (kind === 'desert') {
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#f2b26a'); g.addColorStop(0.6, '#f6d49a'); g.addColorStop(1, '#c8884a');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#b8743a'; ctx.beginPath(); ctx.ellipse(x - 10, y + r * 0.5, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff2cc'; ctx.beginPath(); ctx.arc(x + 12, y - r * 0.4, 9, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'ocean') {
      const g = ctx.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#8ac8e8'); g.addColorStop(0.5, '#2a6a9a'); g.addColorStop(1, '#0a2a4a');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { const wy = y + k * 12 - 6 + Math.sin(frameCount * 0.05 + k) * 2; ctx.beginPath(); ctx.moveTo(x - r, wy); ctx.quadraticCurveTo(x, wy - 6, x + r, wy); ctx.stroke(); }
    } else if (kind === 'forest') {
      ctx.fillStyle = '#1e3a24'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#2e5a34';
      for (let k = 0; k < 6; k++) { const tx = x - r + k * r * 0.4; ctx.beginPath(); ctx.moveTo(tx, y + r); ctx.lineTo(tx + 14, y - r * 0.5 + _slHash(k) * 20); ctx.lineTo(tx + 28, y + r); ctx.fill(); }
      ctx.fillStyle = 'rgba(200,240,180,0.25)'; ctx.fillRect(x - r, y - r, r * 2, r * 0.5);
    } else {
      ctx.fillStyle = '#04020a'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 20; k++) ctx.fillRect(x - r + _slHash(k + x) * r * 2, y - r + _slHash(k * 3 + x) * r * 2, 1.4, 1.4);
    }
    ctx.restore();
    ctx.save(); ctx.shadowColor = '#c9a2ff'; ctx.shadowBlur = 14;
    ctx.strokeStyle = '#efe4ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.65, r, 0.15, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0d0d1e');
    _slParallax(v, 0.08, (l, r) => {
      for (let i = Math.floor(l / 300); i * 300 < r + 300; i++) {
        const x = i * 300 + _slHash(i) * 120;
        _slSkyCrack(_slJag(x, -100, x + 80, 140, 6, 16, i * 3), 0.3);
      }
    });
    _slParallax(v, 0.25, (l, r) => {
      for (let i = Math.floor(l / 84) - 1; i * 84 < r + 84; i++) {
        const h = 140 + _slHash(i) * 200, w = 54 + _slHash(i + 40) * 24, x = i * 84;
        const off = (_slHash(i + 70) < 0.25) ? (_slHash(i + 71) - 0.5) * 60 : 0;   // displaced storeys
        ctx.fillStyle = '#1c1a2c'; ctx.fillRect(x, G - h * 0.55, w, h * 0.55); ctx.fillRect(x + off, G - h, w, h * 0.45);
        ctx.fillStyle = 'rgba(200,180,255,0.35)';
        for (let wy = G - h + 8; wy < G - 30; wy += 15) for (let wx = x + 6; wx < x + w - 6; wx += 11)
          if (_slHash(wx * 3 + wy + i) < 0.06) ctx.fillRect(wx + (wy < G - h * 0.55 ? off : 0), wy, 4, 6);
      }
    });
  }

  function back(v) {
    // ── Fractured streets
    if (_slVisible(v, -100, MALL + 40)) {
      const ROW = [[-100, 380, 300, '#3a3640'], [380, 860, 260, '#443a3a'], [860, 1300, 320, '#363a46'], [1300, 1800, 280, '#46403a'], [1800, 2300, 300, '#3a3844'], [2300, MALL, 240, '#403a40']];
      for (const [x0, x1, h, col] of ROW) {
        if (!_slVisible(v, x0, x1)) continue;
        _slBrick(x0, G - h, x1 - x0, h, col);
        _slWindowGrid(x0 + 10, G - h + 20, x1 - x0 - 20, h - 80, Math.max(2, Math.round((x1 - x0) / 80)), Math.max(1, Math.round((h - 80) / 70)), { lit: 0.08, seed: x0, dark: '#14121c' });
        // The fracture sliced the facade: a band shifted sideways
        ctx.save(); ctx.beginPath(); ctx.rect(x0, G - h * 0.6, x1 - x0, 24); ctx.clip();
        ctx.translate(18, 0); _slBrick(x0 - 18, G - h * 0.6, x1 - x0 + 36, 24, col); ctx.restore();
        ctx.fillStyle = 'rgba(200,160,255,0.45)'; ctx.fillRect(x0, G - h * 0.6, x1 - x0, 1.5); ctx.fillRect(x0, G - h * 0.6 + 24, x1 - x0, 1.5);
      }
      for (const [x, y, r, k] of TEARS) if (_slVisible(v, x - r, x + r)) _tearView(x, y, r, k);
      // Car tipped onto its side against a slab edge
      if (_slVisible(v, 640, 820)) {
        ctx.save(); ctx.translate(745, G - 20); ctx.rotate(-0.12);
        _slCar(-75, 20, 150, '#5a5a6a', {});
        ctx.restore();
      }
      // Newsstand
      if (_slVisible(v, 1620, 1780)) {
        ctx.fillStyle = '#2a5a4a'; ctx.fillRect(1650, 430 - 70, 90, 70);
        ctx.fillStyle = '#1e3e34'; ctx.fillRect(1640, 430 - 74, 110, 8);
        ctx.fillStyle = '#d8d0c0'; ctx.fillRect(1660, 430 - 56, 70, 30);
        ctx.fillStyle = '#9c2a22'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('THE DAILY', 1695, 430 - 44); ctx.fillText('SKY TEARS?', 1695, 430 - 34);
      }
      // Figures in the gaps: half-there silhouettes that drift and flicker
      for (let k = 0; k < 7; k++) {
        const fx = 300 + k * 330 + Math.sin(frameCount * 0.004 + k) * 40;
        if (!_slVisible(v, fx - 20, fx + 20)) continue;
        const a = 0.12 + 0.12 * Math.max(0, Math.sin(frameCount * 0.03 + k * 2));
        ctx.fillStyle = `rgba(200,190,230,${a})`;
        ctx.beginPath(); ctx.arc(fx, G - 72, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(fx - 4, G - 64, 8, 34); ctx.fillRect(fx - 4, G - 30, 3, 26); ctx.fillRect(fx + 1, G - 30, 3, 26);
      }
      _slStreetLamp(1100, G, false);
      _slHydrant(2120, G);
    }
    // ── Eastgate Mall
    if (_slVisible(v, MALL - 40, 4500)) {
      // Facade + entrance
      ctx.fillStyle = '#8a8478'; ctx.fillRect(MALL, G - 320, 120, 320);
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(MALL - 10, G - 330, 140, 14);
      ctx.fillStyle = '#2a2420'; ctx.fillRect(MALL + 10, G - 130, 100, 130);
      ctx.fillStyle = '#e8d8b0'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.fillText('EASTGATE', MALL + 60, G - 290); ctx.font = 'bold 10px Arial'; ctx.fillText('MALL', MALL + 60, G - 274);
      // Interior back wall up past the ceiling, ceiling with caved skylight
      const IX = MALL + 120;
      ctx.fillStyle = '#4a4440'; ctx.fillRect(IX, -400, 4500 - IX, G + 400);
      ctx.fillStyle = '#3a3430'; ctx.fillRect(IX, G - 420, 4500 - IX, 20);
      const SKY0 = 3300, SKY1 = 3560;
      ctx.fillStyle = '#0d0d1e'; ctx.fillRect(SKY0, G - 420, SKY1 - SKY0, 20);
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(SKY0, G - 400); ctx.lineTo(SKY0 + 80, G - 300); ctx.moveTo(SKY1, G - 400); ctx.lineTo(SKY1 - 50, G - 330); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createLinearGradient(0, G - 400, 0, G);
      lg.addColorStop(0, 'rgba(180,160,255,0.22)'); lg.addColorStop(1, 'rgba(180,160,255,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(SKY0, G - 400); ctx.lineTo(SKY1, G - 400); ctx.lineTo(SKY1 + 80, G); ctx.lineTo(SKY0 - 40, G); ctx.fill();
      ctx.restore();
      // Upper-floor storefronts (behind the mezzanine) and ground-floor shops
      const SHOPS = [['CINEMA 8', '#d84a6a'], ['SHOE CITY', '#4ab0d8'], ['BOOKNOOK', '#d8b04a'], ['TECHHUB', '#5ad88a'], ['FOOD COURT', '#e8884a'], ['GIFTS', '#b88ad8']];
      for (let i = 0; i < SHOPS.length; i++) {
        const sx = IX + 40 + i * 270;
        if (!_slVisible(v, sx, sx + 240)) continue;
        for (const [y0, h] of [[G - 140, 130], [G - 390, 110]]) {
          ctx.fillStyle = '#2a2622'; ctx.fillRect(sx, y0, 220, h);
          ctx.fillStyle = 'rgba(150,170,180,0.18)'; ctx.fillRect(sx + 8, y0 + 26, 204, h - 30);
          ctx.fillStyle = '#16141a'; ctx.fillRect(sx, y0, 220, 22);
          const dark = _slHash(i + y0) < 0.5;
          ctx.fillStyle = dark ? '#4a4048' : SHOPS[i][1]; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
          ctx.fillText(y0 < G - 200 ? SHOPS[(i + 3) % 6][0] : SHOPS[i][0], sx + 110, y0 + 16);
          // Shutters half down
          ctx.fillStyle = '#6a6460'; ctx.fillRect(sx + 8, y0 + 26, 204, (h - 30) * (0.3 + _slHash(i * 7 + y0) * 0.5));
        }
      }
      // Escalator 1: truss and steps
      ctx.fillStyle = '#5a5a5e';
      ctx.beginPath(); ctx.moveTo(ESC1.x - 10, G); ctx.lineTo(MEZ1.x, MEZ1.y); ctx.lineTo(MEZ1.x, MEZ1.y + 20); ctx.lineTo(ESC1.x + 20, G); ctx.fill();
      ctx.strokeStyle = '#1e1e22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ESC1.x - 10, G - 30); ctx.lineTo(MEZ1.x, MEZ1.y - 30); ctx.stroke();
      for (let i = 0; i < ESC1.steps; i++) { ctx.fillStyle = '#8a8a8e'; ctx.fillRect(ESC1.x + i * 32, G - 30 - i * 30, 40, 5); }
      // Mezzanines: slab, glass balustrade; the gap between them is where it broke
      for (const M of [MEZ1, MEZ2]) {
        ctx.fillStyle = '#7a746a'; ctx.fillRect(M.x, M.y, M.w, 16);
        ctx.fillStyle = 'rgba(180,210,220,0.18)'; ctx.fillRect(M.x, M.y - 30, M.w, 30);
        ctx.fillStyle = '#c8c8cc'; ctx.fillRect(M.x, M.y - 32, M.w, 3);
        for (let px = M.x + 60; px < M.x + M.w; px += 140) { ctx.fillStyle = '#8a847a'; ctx.fillRect(px, M.y + 16, 14, G - M.y - 16); }
      }
      ctx.fillStyle = '#7a746a';
      ctx.beginPath(); ctx.moveTo(MEZ1.x + MEZ1.w, MEZ1.y); ctx.lineTo(MEZ1.x + MEZ1.w + 30, MEZ1.y + 40); ctx.lineTo(MEZ1.x + MEZ1.w, MEZ1.y + 16); ctx.fill();
      _slRubble(MEZ1.x + MEZ1.w - 10, G, 150, 34, '#6a645a');
      // Escalator 2 up to the balcony
      ctx.fillStyle = '#5a5a5e';
      ctx.beginPath(); ctx.moveTo(ESC2.x - 6, MEZ2.y); ctx.lineTo(TOP.x, TOP.y); ctx.lineTo(TOP.x, TOP.y + 16); ctx.lineTo(ESC2.x + 20, MEZ2.y); ctx.fill();
      for (let i = 0; i < ESC2.steps; i++) { ctx.fillStyle = '#8a8a8e'; ctx.fillRect(ESC2.x + i * 30, MEZ2.y - 28 - i * 26, 38, 5); }
      ctx.fillStyle = '#7a746a'; ctx.fillRect(TOP.x, TOP.y, TOP.w, 14);
      ctx.fillStyle = '#c8c8cc'; ctx.fillRect(TOP.x, TOP.y - 30, TOP.w, 3);
      // Food-court kiosk (standable), planters, the directory + beacon
      const K = KIOSK;
      ctx.fillStyle = '#c86a3a'; ctx.fillRect(K.x, G - K.h, K.w, K.h);
      ctx.fillStyle = '#e8d8b0'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('PRETZELS', K.x + K.w / 2, G - K.h + 18);
      ctx.fillStyle = '#8a3a1a'; ctx.fillRect(K.x - 6, G - K.h - 6, K.w + 12, 8);
      for (const px of [3020, 3420, 4060]) {
        ctx.fillStyle = '#6a645a'; ctx.fillRect(px, G - 30, 60, 30);
        ctx.fillStyle = '#3e5a34'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(px + 12 + k * 18, G - 40, 14, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(BEACON_X + 30, G - 110, 50, 110);
      ctx.fillStyle = '#d8d0c0'; ctx.fillRect(BEACON_X + 34, G - 104, 42, 60);
      ctx.fillStyle = '#9c2a22'; ctx.beginPath(); ctx.arc(BEACON_X + 50, G - 80, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a30'; ctx.font = 'bold 6px Arial'; ctx.fillText('YOU ARE HERE', BEACON_X + 55, G - 96);
      const on = (frameCount % 50) < 25;
      ctx.fillStyle = '#3a3e44'; ctx.fillRect(BEACON_X - 6, G - 56, 12, 56);
      ctx.fillStyle = on ? '#7ff0ff' : '#2a5a60'; ctx.fillRect(BEACON_X - 9, G - 66, 18, 12);
      if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const bg = ctx.createRadialGradient(BEACON_X, G - 60, 1, BEACON_X, G - 60, 60); bg.addColorStop(0, 'rgba(120,240,255,0.5)'); bg.addColorStop(1, 'rgba(120,240,255,0)'); ctx.fillStyle = bg; ctx.fillRect(BEACON_X - 60, G - 120, 120, 120); ctx.restore(); }
    }
  }

  const ZONES = [
    { x0: -200, x1: MALL, kind: 'rubble', face: 'soil' },
    { x0: MALL, x1: 4600, kind: 'tile', face: 'concrete' },
  ];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[7] = { floor, layout, backdrop, back, surface };
})();
