'use strict';
// js/story/levels/ch01.js — Chapter 1 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 1 — First Contact (stealth)
// Night, the service alley behind the shop block chapter 0 ends at. Scouts
// patrol the ground; detection zones sit at ground height (guard y = 395), so
// every patrol post has an overhead route — fire escapes, a pipe catwalk, a
// loading-dock canopy, a skybridge — that clears its radius. Staying low is the
// fast way; going high is the quiet way. Veran's signal beacon is wired to a
// utility pole where the alley opens onto the next street.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const BEACON_X = 3270;
  // Building backs lining the alley: [x0, x1, top, base colour]
  const BLDG = [
    [-200, 380, G - 360, '#5b3a30'], [380, 900, G - 400, '#4f4440'], [900, 1380, G - 330, '#634236'],
    [1380, 2000, G - 420, '#4a4a4c'], [2000, 2560, G - 370, '#5a3c34'], [2560, 3200, G - 400, '#4e4742'],
    [3200, 3700, G - 340, '#5d4034'],
  ];
  // Overhead routes (each clears the patrol radius below it)
  const DUMP1   = { x: 500, w: 92, h: 54 };
  const ESC1    = { x: 590, w: 250, ys: [G - 140, G - 240] };
  const CRATES  = [{ x: 960, y: G - 46, s: 46 }, { x: 1006, y: G - 46, s: 46 }, { x: 985, y: G - 92, s: 46 }];
  const PIPE    = { x: 1050, w: 300, y: G - 150 };
  const ACBOX   = { x: 1360, w: 70, h: 64 };
  const DOCK    = { x: 1540, w: 120, h: 56 };
  const CANOPY  = { x: 1640, w: 330, y: G - 150 };
  const ESC2    = { x: 2250, w: 290, ys: [G - 120, G - 220, G - 320] };
  const PALLETS = { x: 2740, w: 70, h: 34 };
  const SHED    = { x: 2800, w: 90, y: G - 96 };
  const BRIDGE  = { x: 2880, w: 290, y: G - 176 };

  function layout() {
    const P = [];
    _slLedge(P, DUMP1.x, G - DUMP1.h, DUMP1.w);
    for (const y of ESC1.ys) _slLedge(P, ESC1.x, y, ESC1.w);
    for (const c of CRATES) _slLedge(P, c.x, c.y, c.s);
    _slLedge(P, PIPE.x, PIPE.y, PIPE.w);
    _slLedge(P, ACBOX.x, G - ACBOX.h, ACBOX.w);
    _slLedge(P, DOCK.x, G - DOCK.h, DOCK.w);
    _slLedge(P, CANOPY.x, CANOPY.y, CANOPY.w);
    for (const y of ESC2.ys) _slLedge(P, ESC2.x, y, ESC2.w);
    _slLedge(P, PALLETS.x, G - PALLETS.h, PALLETS.w);
    _slLedge(P, SHED.x, SHED.y, SHED.w);
    _slLedge(P, BRIDGE.x, BRIDGE.y, BRIDGE.w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05070d');
    // Night sky + the glow of the city over the rooftops
    _slParallax(v, 0.06, (l, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = Math.floor(l / 40); i * 40 < r; i++) if (_slHash(i) < 0.35) ctx.fillRect(i * 40 + _slHash(i + 3) * 30, 10 + _slHash(i + 8) * 120, 1.2, 1.2);
      const gl = ctx.createLinearGradient(0, G - 320, 0, G - 100);
      gl.addColorStop(0, 'rgba(255,150,90,0)'); gl.addColorStop(1, 'rgba(255,150,90,0.16)');
      ctx.fillStyle = gl; ctx.fillRect(l - 20, G - 320, r - l + 40, 220);
    });
    _slParallax(v, 0.2, (l, r) => {
      for (let i = Math.floor(l / 90) - 1; i * 90 < r + 90; i++) {
        const h = 280 + _slHash(i) * 160, w = 60 + _slHash(i + 50) * 40, x = i * 90;
        ctx.fillStyle = '#141820'; ctx.fillRect(x, G - h, w, h);
        ctx.fillStyle = 'rgba(255,214,140,0.5)';
        for (let wy = G - h + 10; wy < G - 60; wy += 14) for (let wx = x + 6; wx < x + w - 6; wx += 10)
          if (_slHash(wx * 3 + wy) < 0.12) ctx.fillRect(wx, wy, 4, 6);
        if (_slHash(i + 4) < 0.2) _slAntenna(x + w / 2, G - h, 30, true);
      }
    });
  }

  function back(v) {
    // Building backs, world-anchored: the alley's two walls collapsed into one plane
    for (const [x0, x1, top, col] of BLDG) {
      if (!_slVisible(v, x0, x1)) continue;
      _slBrick(x0, top, x1 - x0, G - top, col);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0, top, x1 - x0, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x1 - 6, top, 6, G - top);
      _slWindowGrid(x0 + 10, top + 24, x1 - x0 - 20, G - top - 150, Math.max(2, Math.round((x1 - x0) / 80)), Math.max(1, Math.round((G - top - 150) / 80)),
        { lit: 0.22, seed: x0, glow: true, dark: '#1a1e24' });
      // Downpipe
      ctx.fillStyle = '#2c2f33'; ctx.fillRect(x0 + 18, top + 8, 6, G - top - 8);
      ctx.fillRect(x0 + 14, G - 12, 14, 6);
    }
    // Back doors with caged lamps — the light pools the scouts stand in
    for (const [dx, warm] of [[260, true], [720, false], [1210, true], [1800, true], [2410, false], [3010, true]]) {
      if (!_slVisible(v, dx - 90, dx + 90)) continue;
      ctx.fillStyle = '#2b2f33'; ctx.fillRect(dx - 22, G - 84, 44, 84);
      ctx.fillStyle = '#3a4046'; ctx.fillRect(dx - 18, G - 80, 36, 80);
      ctx.fillStyle = '#5a6066'; ctx.fillRect(dx + 10, G - 44, 5, 3);
      ctx.fillStyle = '#d6d0c0'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
      ctx.fillText(dx % 3 ? 'DELIVERIES' : 'NO ENTRY', dx, G - 90);
      _slWallLamp(dx, G - 110, G, warm);
    }
    // Graffiti
    const tag = (x, y, txt, col, rot) => {
      if (!_slVisible(v, x - 80, x + 80)) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = 'italic bold 22px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = col; ctx.globalAlpha = 0.55; ctx.fillText(txt, 0, 0); ctx.restore();
    };
    tag(420, G - 60, 'NO KINGS', '#c8486a', -0.08);
    tag(1500, G - 200, '17', '#64c8d8', 0.05);
    tag(2650, G - 70, 'THEY CAME FROM UP', '#d8c048', -0.03);
    // Steam vents
    for (const sx of [880, 2090, 3140]) if (_slVisible(v, sx - 40, sx + 40)) {
      ctx.fillStyle = '#34383c'; ctx.fillRect(sx - 14, G - 120, 28, 18);
      _slSmoke(sx, G - 120, 140, false, sx);
    }
    // Laundry line strung across the alley
    if (_slVisible(v, 1400, 1700)) {
      ctx.strokeStyle = 'rgba(200,200,200,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(1400, G - 250); ctx.quadraticCurveTo(1550, G - 220, 1700, G - 255); ctx.stroke();
      const cols = ['#c8b8a0', '#6a86a8', '#a84848', '#e0e0d8'];
      for (let k = 0; k < 6; k++) {
        const lx = 1430 + k * 44, ly = G - 245 + Math.sin((k + 1) / 7 * Math.PI) * 26;
        const sway = Math.sin(frameCount * 0.04 + k) * 2;
        ctx.fillStyle = cols[k % 4]; ctx.fillRect(lx + sway, ly, 22, 26 + (k % 2) * 8);
      }
    }

    // ── Route 1: dumpster → fire escape over the first patrol ─────────────
    if (_slVisible(v, 460, 880)) {
      _slTrashBags(470, G, 2);
      _slDumpster(DUMP1.x, G, DUMP1.w, DUMP1.h, '#2e5a46');
      _slFireEscape(ESC1.x, ESC1.w, ESC1.ys);
      _slWindowGrid(ESC1.x + 30, G - 300, ESC1.w - 60, 180, 3, 2, { lit: 0.3, seed: 77 });
    }
    // ── Route 2: crates → pipe catwalk → AC box ──────────────────────────
    if (_slVisible(v, 940, 1450)) {
      for (const c of CRATES) _slCrate(c.x, c.y, c.s);
      ctx.fillStyle = '#5d636a'; ctx.fillRect(PIPE.x - 10, PIPE.y, PIPE.w + 20, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(PIPE.x - 10, PIPE.y + 2, PIPE.w + 20, 2);
      ctx.fillStyle = '#44494f';
      for (let bx = PIPE.x + 20; bx < PIPE.x + PIPE.w; bx += 70) { ctx.fillRect(bx, PIPE.y + 12, 4, 30); ctx.fillRect(bx - 6, PIPE.y - 2, 16, 3); }
      ctx.fillStyle = '#ffd04a'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'left'; ctx.fillText('GAS · DO NOT STEP', PIPE.x + 100, PIPE.y + 10);
      _slAcUnit(ACBOX.x, G - ACBOX.h, ACBOX.w, ACBOX.h);
    }
    // ── Route 3: loading dock → corrugated canopy ────────────────────────
    if (_slVisible(v, 1500, 2000)) {
      ctx.fillStyle = '#5a5c5e'; ctx.fillRect(DOCK.x, G - DOCK.h, DOCK.w, DOCK.h);
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(DOCK.x + 6, G - DOCK.h + 8, DOCK.w - 12, 6);
      ctx.fillStyle = '#d0a020';
      for (let k = 0; k < 6; k++) ctx.fillRect(DOCK.x + k * 20, G - DOCK.h, 10, 4);
      // Roll-up door behind the dock
      ctx.fillStyle = '#7c8086'; ctx.fillRect(DOCK.x + 140, G - 130, 160, 130);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      for (let ry = G - 126; ry < G; ry += 8) { ctx.beginPath(); ctx.moveTo(DOCK.x + 140, ry); ctx.lineTo(DOCK.x + 300, ry); ctx.stroke(); }
      // Canopy: corrugated sheet on brackets
      ctx.fillStyle = '#6a7076'; ctx.fillRect(CANOPY.x, CANOPY.y, CANOPY.w, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let cx = CANOPY.x; cx < CANOPY.x + CANOPY.w; cx += 8) ctx.fillRect(cx, CANOPY.y + 2, 3, 8);
      ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 2;
      for (const bx of [CANOPY.x + 20, CANOPY.x + CANOPY.w / 2, CANOPY.x + CANOPY.w - 20]) {
        ctx.beginPath(); ctx.moveTo(bx, CANOPY.y + 10); ctx.lineTo(bx + 30, CANOPY.y - 40); ctx.stroke();
      }
    }
    // ── Route 4: tall fire escape ────────────────────────────────────────
    if (_slVisible(v, 2200, 2600)) {
      _slWindowGrid(ESC2.x + 30, G - 390, ESC2.w - 60, 300, 3, 3, { lit: 0.3, seed: 123 });
      _slFireEscape(ESC2.x, ESC2.w, ESC2.ys);
      ctx.strokeStyle = '#25282c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ESC2.x + 20, ESC2.ys[0]); ctx.lineTo(ESC2.x + 20, G - 40); ctx.moveTo(ESC2.x + 34, ESC2.ys[0]); ctx.lineTo(ESC2.x + 34, G - 40); ctx.stroke();
      for (let ly = ESC2.ys[0] + 10; ly < G - 40; ly += 12) { ctx.beginPath(); ctx.moveTo(ESC2.x + 20, ly); ctx.lineTo(ESC2.x + 34, ly); ctx.stroke(); }
      _slTrashBags(2560, G, 3);
    }
    // ── Route 5: pallets → shed → skybridge ──────────────────────────────
    if (_slVisible(v, 2700, 3200)) {
      _slChainFence(2600, G, 130, 110);
      ctx.fillStyle = '#9a7a4c';
      for (let k = 0; k < 3; k++) ctx.fillRect(PALLETS.x, G - 10 - k * 12, PALLETS.w, 8);
      ctx.fillStyle = '#5c4630'; ctx.fillRect(SHED.x + 6, SHED.y, SHED.w - 12, G - SHED.y);
      ctx.fillStyle = '#3c3e40'; ctx.fillRect(SHED.x, SHED.y, SHED.w, 8);
      ctx.fillStyle = '#2a1e14'; ctx.fillRect(SHED.x + 30, G - 60, 30, 60);
      // Enclosed skybridge between the two buildings
      ctx.fillStyle = '#3e4246'; ctx.fillRect(BRIDGE.x, BRIDGE.y - 70, BRIDGE.w, 80);
      ctx.fillStyle = '#2a2e32'; ctx.fillRect(BRIDGE.x, BRIDGE.y, BRIDGE.w, 10);
      ctx.fillStyle = 'rgba(200,220,240,0.20)';
      for (let wx = BRIDGE.x + 10; wx < BRIDGE.x + BRIDGE.w - 20; wx += 46) ctx.fillRect(wx, BRIDGE.y - 60, 34, 40);
      ctx.fillStyle = '#26292c'; ctx.fillRect(BRIDGE.x, BRIDGE.y - 76, BRIDGE.w, 8);
      ctx.fillStyle = '#26292c';
      ctx.fillRect(BRIDGE.x + 40, BRIDGE.y + 10, 8, G - BRIDGE.y - 10); ctx.fillRect(BRIDGE.x + BRIDGE.w - 48, BRIDGE.y + 10, 8, G - BRIDGE.y - 10);
    }
    // ── Exit: Veran's beacon on the utility pole, street light beyond ─────
    if (_slVisible(v, BEACON_X - 200, BEACON_X + 400)) {
      const sg = ctx.createLinearGradient(BEACON_X + 40, 0, BEACON_X + 300, 0);
      sg.addColorStop(0, 'rgba(255,200,130,0)'); sg.addColorStop(1, 'rgba(255,200,130,0.22)');
      ctx.fillStyle = sg; ctx.fillRect(BEACON_X + 40, G - 300, 300, 300);
      ctx.fillStyle = '#4a3a2e'; ctx.fillRect(BEACON_X - 4, G - 300, 8, 300);
      ctx.fillRect(BEACON_X - 30, G - 290, 60, 5);
      ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(BEACON_X - 30, G - 288); ctx.quadraticCurveTo(BEACON_X - 300, G - 250, BEACON_X - 600, G - 292); ctx.stroke();
      // Taped-on device: a phone, a battery pack and a coil of wire
      ctx.fillStyle = '#1e2226'; ctx.fillRect(BEACON_X - 12, G - 150, 24, 36);
      ctx.fillStyle = '#c8c0a8'; ctx.fillRect(BEACON_X - 14, G - 140, 28, 5); ctx.fillRect(BEACON_X - 14, G - 124, 28, 5);
      const on = (frameCount % 60) < 30;
      ctx.fillStyle = on ? '#7ff0ff' : '#2a5a60'; ctx.fillRect(BEACON_X - 8, G - 146, 16, 10);
      if (on) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const bg = ctx.createRadialGradient(BEACON_X, G - 140, 1, BEACON_X, G - 140, 40);
        bg.addColorStop(0, 'rgba(120,240,255,0.5)'); bg.addColorStop(1, 'rgba(120,240,255,0)');
        ctx.fillStyle = bg; ctx.fillRect(BEACON_X - 40, G - 180, 80, 80); ctx.restore();
      }
      ctx.strokeStyle = '#c84a3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(BEACON_X + 12, G - 120); ctx.bezierCurveTo(BEACON_X + 30, G - 110, BEACON_X + 10, G - 90, BEACON_X + 26, G - 70); ctx.stroke();
      ctx.fillStyle = '#e8e2d0'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.fillText('V.', BEACON_X, G - 104);
    }
    // Light rain, world-anchored so it parallaxes with the walls
    ctx.strokeStyle = 'rgba(180,200,230,0.20)'; ctx.lineWidth = 1;
    for (let k = 0; k < 60; k++) {
      const rx = v.x + ((_slHash(k) * v.w + frameCount * 1.5) % v.w);
      const ry = v.y + ((_slHash(k + 99) * v.h + frameCount * 9) % v.h);
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 12); ctx.stroke();
    }
  }

  const ZONES = [{ x0: -200, x1: 3800, kind: 'alley', face: 'soil' }];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[1] = {
    sky: ['#05070d', '#161a24'],
    groundColor: '#1d1b19',
    platColor: '#2c2a28',
    layout, backdrop, back, surface,
  };
})();
