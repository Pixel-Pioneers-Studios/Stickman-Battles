'use strict';
// js/story/levels/ch11.js — Chapter 11 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 11 — The Relay Station (walk → duel vs Veran)
// "The relay station hummed like a living thing. Crystal pillars. Dimensional
// conduits. Equations scratched on every surface." Off the cooled lava bank
// (where chapter 10 ended), through the station's blast gate, along the
// crystal hall — conduits overhead double as catwalks — to the atrium around
// the great crystal where Veran steps out of the light. Past her: the ring
// gallery, rising in tiers toward the deep station (chapter 12).
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const GATE = 1250;
  const SLAG = [[260, G - 50, 110], [520, G - 84, 90], [760, G - 46, 120]];
  const COND = [{ x: 1500, w: 380, y: G - 170 }, { x: 2050, w: 400, y: G - 210 }];
  const STEPS = [[1420, G - 60, 70], [1460, G - 115, 60]];
  const ATRIUM = 3000;
  const TIERS = [[3600, G - 70, 220], [3880, G - 140, 220], [4160, G - 210, 260], [4980, G - 90, 200], [5200, G - 180, 200]];
  const RING = { x: 4500, w: 300, y: G - 260 };

  function layout() {
    const P = [];
    for (const [x, y, w] of SLAG) _slLedge(P, x, y, w);
    for (const [x, y, w] of STEPS) _slLedge(P, x, y, w);
    for (const c of COND) _slLedge(P, c.x, c.y, c.w);
    _slLedge(P, 1940, G - 120, 80);                 // instrument rack between the conduits
    for (const [x, y, w] of TIERS) _slLedge(P, x, y, w);
    _slLedge(P, RING.x, RING.y, RING.w);
    _slMover(P, 'disc', 4440, G - 300, 70, 0, 50, 0.016, 0);   // floating calibration disc
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#140608');
    // Outside: the lava field glowing behind; inside: the station walls cover it
    _slParallax(v, 0.1, (l, r) => {
      const g = ctx.createLinearGradient(0, 100, 0, G);
      g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(1, 'rgba(255,90,30,0.35)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, 100, r - l + 40, G - 100);
      for (let i = Math.floor(l / 110) - 1; i * 110 < r + 110; i++) {
        const x = i * 110, h = 80 + _slHash(i) * 110;
        ctx.fillStyle = '#240c08'; ctx.fillRect(x, G - h, 90, h);
        if (_slHash(i + 2) < 0.4) _slSmoke(x + 60, G - h, 200, true, i);
      }
    });
  }

  function back(v) {
    // ── The bank: cooled lava rock, slag heaps, the station's outer wall
    if (_slVisible(v, -200, GATE + 60)) {
      ctx.fillStyle = '#2a1e1a';
      ctx.beginPath(); ctx.moveTo(-200, G); ctx.lineTo(-200, G - 60);
      for (let x = -200; x <= GATE; x += 40) ctx.lineTo(x, G - 30 - _slHash(x) * 40);
      ctx.lineTo(GATE, G); ctx.fill();
      ctx.strokeStyle = 'rgba(255,110,40,0.45)'; ctx.lineWidth = 1.5;
      for (let x = -160; x < GATE; x += 90) { ctx.beginPath(); ctx.moveTo(x, G - 6); ctx.lineTo(x + 20, G - 20); ctx.lineTo(x + 34, G - 8); ctx.stroke(); }
      for (const [x, y, w] of SLAG) {
        ctx.fillStyle = '#3a2a24';
        ctx.beginPath(); ctx.moveTo(x - 10, G); ctx.lineTo(x, y + 6); ctx.quadraticCurveTo(x + w / 2, y - 10, x + w, y + 6); ctx.lineTo(x + w + 10, G); ctx.fill();
        ctx.fillStyle = 'rgba(255,120,40,0.25)'; ctx.fillRect(x + 10, y + 10, w - 20, 3);
      }
      // Outer wall + blast gate standing open
      _slBrick(GATE - 120, G - 360, 160, 360, '#3a3a44');
      ctx.fillStyle = '#1a1c22'; ctx.fillRect(GATE - 70, G - 180, 110, 180);
      ctx.fillStyle = '#5a5e66'; ctx.fillRect(GATE - 70, G - 300, 110, 116);
      ctx.fillStyle = '#d0a020'; for (let k = 0; k < 6; k++) ctx.fillRect(GATE - 70 + k * 20, G - 192, 10, 6);
      ctx.fillStyle = '#9ad8f0'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('RELAY STATION · V', GATE - 15, G - 314);
    }
    // ── Interior: hall wall with equations, crystal pillars, conduits
    if (_slVisible(v, GATE, 6200)) {
      const x0 = Math.max(GATE + 40, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
      ctx.fillStyle = '#1c1e26'; ctx.fillRect(x0, G - 520, x1 - x0, 520);
      for (let px = Math.floor(x0 / 240) * 240; px < x1; px += 240) {
        ctx.fillStyle = '#252833'; ctx.fillRect(px, G - 520, 34, 520);
        ctx.fillStyle = 'rgba(150,220,255,0.06)'; ctx.fillRect(px + 34, G - 520, 2, 520);
        _slEquations(px + 50, G - 400, 170, 150, px / 240 | 0);
      }
      ctx.fillStyle = '#14161c'; ctx.fillRect(x0, G - 540, x1 - x0, 30);
      for (const c of COND) if (_slVisible(v, c.x, c.x + c.w)) _slConduit(c.x - 60, c.x + c.w + 60, c.y + 6, 190, 8);
      _slConduit(Math.max(GATE + 40, x0), x1, G - 470, 280, 10);
      for (const cx of [1380, 1720, 2300, 2560, 3420, 3700, 4350, 5400, 5700]) if (_slVisible(v, cx - 60, cx + 60)) _slCrystal(cx, G, 120 + _slHash(cx) * 60, 190 + (cx % 3) * 20, cx);
      // Instrument rack + steps up to the first conduit
      if (_slVisible(v, 1400, 2000)) {
        ctx.fillStyle = '#2a2e36'; ctx.fillRect(1420, G - 60, 70, 60); ctx.fillRect(1460, G - 115, 60, 55);
        ctx.fillStyle = '#5affc8'; for (let k = 0; k < 4; k++) ctx.fillRect(1430 + k * 14, G - 50, 6, 3);
        ctx.fillStyle = '#2a2e36'; ctx.fillRect(1940, G - 120, 80, 120);
        _slHolo(1946, G - 112, 68, 50, 190);
      }
    }
    // ── The atrium and the great crystal
    if (_slVisible(v, ATRIUM - 420, ATRIUM + 420)) {
      ctx.fillStyle = '#16181f'; ctx.beginPath(); ctx.ellipse(ATRIUM, G - 240, 380, 260, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(150,220,255,0.25)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(ATRIUM, G - 240, 380 - k * 60, 260 - k * 40, 0, Math.PI, 0); ctx.stroke(); }
      // Rotating rings around the crystal
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `hsla(${190 + k * 40},90%,70%,0.55)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(ATRIUM, G - 260, 110 + k * 30, 26 + k * 6, frameCount * 0.006 * (k % 2 ? 1 : -1) + k, 0, Math.PI * 2); ctx.stroke();
      }
      _slCrystal(ATRIUM, G - 120, 200, 195, 99);
      ctx.fillStyle = '#2a2c34'; ctx.fillRect(ATRIUM - 40, G - 120, 80, 120);
      ctx.fillStyle = 'rgba(150,230,255,0.15)'; ctx.fillRect(ATRIUM - 2, G - 120, 4, 120);
      // The light Veran stepped out of
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createLinearGradient(0, G - 500, 0, G);
      lg.addColorStop(0, 'rgba(200,240,255,0.25)'); lg.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(ATRIUM - 40, G - 500); ctx.lineTo(ATRIUM + 40, G - 500); ctx.lineTo(ATRIUM + 160, G); ctx.lineTo(ATRIUM - 160, G); ctx.fill();
      ctx.restore();
    }
    // ── Ring gallery: tiers rising toward the deep station
    if (_slVisible(v, 3560, 5500)) {
      for (const [x, y, w] of TIERS) {
        if (!_slVisible(v, x, x + w)) continue;
        ctx.fillStyle = '#2a2e38'; ctx.fillRect(x, y, w, G - y);
        ctx.fillStyle = '#3a3f4c'; ctx.fillRect(x, y, w, 8);
        ctx.fillStyle = 'rgba(150,220,255,0.5)'; ctx.fillRect(x, y + 8, w, 2);
        _slWindowGrid(x + 10, y + 20, w - 20, Math.max(30, G - y - 30), Math.max(2, Math.round(w / 60)), 1, { lit: 0.6, litColor: '#7ad8f0', dark: '#16181e', seed: x, sill: false });
      }
      const R = RING;
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(R.x, R.y, R.w, 10);
      ctx.strokeStyle = 'rgba(150,220,255,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R.x, R.y - 24); ctx.lineTo(R.x + R.w, R.y - 24); ctx.stroke();
      for (let k = R.x; k <= R.x + R.w; k += 20) { ctx.beginPath(); ctx.moveTo(k, R.y); ctx.lineTo(k, R.y - 24); ctx.stroke(); }
      const d = _slPlat(currentArena, 'disc');
      if (d) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(150,230,255,0.25)'; ctx.beginPath(); ctx.ellipse(d.x + d.w / 2, d.y + 4, d.w * 0.7, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#4a5060'; ctx.beginPath(); ctx.ellipse(d.x + d.w / 2, d.y + 4, d.w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#9ae8ff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.fillStyle = '#9ad8f0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('DEEP STATION →', 5600, G - 300);
    }
  }

  const ZONES = [
    { x0: -200, x1: GATE, kind: 'rubble', face: 'soil' },
    { x0: GATE, x1: 6200, kind: 'tile', face: 'concrete' },
  ];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph !== 'back') return;
    // Coolant maintenance pits over the cache shafts
    for (const r of (a.undergroundRects || []).filter(q => q.kind === 'shaft')) {
      if (!_slVisible(v, r.x - 40, r.x + r.w + 40)) continue;
      ctx.fillStyle = '#d0a020'; for (let k = 0; k < 4; k++) { ctx.fillRect(r.x - 30 + k * 8, G - 4, 4, 4); ctx.fillRect(r.x + r.w + 6 + k * 8, G - 4, 4, 4); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(r.x + r.w / 2, G, 4, r.x + r.w / 2, G, 70);
      g.addColorStop(0, 'rgba(120,230,255,0.35)'); g.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(r.x - 30, G - 70, r.w + 60, 70); ctx.restore();
    }
  }

  STORY_LEVELS[11] = {
    sky: ['#140608', '#2a1012'],
    groundColor: '#1a1a20',
    platColor: '#2a2c34',
    layout, backdrop, back, surface,
  };
})();
