'use strict';
// js/story/levels/ch06.js — Chapter 6 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 6 — Ground Zero (walk → duel vs a two-fighter squad)
// "In your city, right now, the portal fighters are burning everything. You
// need to move through the chaos. Find the relay station." Down off the roofs
// onto the avenue: police lines, a jackknifed trailer, smashed storefronts, the
// subway entrance (first cache shaft), a fallen billboard up to the theatre
// marquee, the fountain plaza the clearance squad sweeps, a fire truck's ladder,
// the impact crater (second shaft), and the relay station gate.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const COP      = { x: 330, w: 170 };
  const TRAILER  = { x: 700, w: 290, h: 72 };
  const CAB      = { x: 990, w: 80 };
  const BOARD    = [[2010, G - 58, 90], [2090, G - 116, 90], [2170, G - 174, 90]];   // fallen billboard steps
  const MARQUEE  = { x: 2260, w: 280, y: G - 214 };
  const FOUNTAIN = 3000;
  const BUSX     = { x: 3480, w: 280, y: G - 108 };
  const LADDER   = [[3880, G - 120, 70], [3950, G - 196, 70], [4020, G - 272, 70]];
  const LEDGE    = { x: 4090, w: 220, y: G - 300 };
  const VAN      = { x: 4860, w: 200, y: G - 92 };
  const JERSEY   = [[5150, 90], [5300, 90]];
  const GATE     = 5600;

  function layout() {
    const P = [];
    _slLedge(P, COP.x + 6, G - 34, COP.w - 12);
    _slLedge(P, COP.x + COP.w * 0.26, G - 56, COP.w * 0.5);
    _slBlock(P, TRAILER.x, G - TRAILER.h, TRAILER.w, TRAILER.h);
    _slLedge(P, CAB.x, G - 64, CAB.w);
    for (const [x, y, w] of BOARD) _slLedge(P, x, y, w);
    _slLedge(P, MARQUEE.x, MARQUEE.y, MARQUEE.w);
    _slLedge(P, BUSX.x, BUSX.y, BUSX.w);
    for (const [x, y, w] of LADDER) _slLedge(P, x, y, w);
    _slLedge(P, LEDGE.x, LEDGE.y, LEDGE.w);
    _slLedge(P, VAN.x, VAN.y, VAN.w);
    for (const [x, w] of JERSEY) _slLedge(P, x, G - 40, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1e0e0c');
    _slParallax(v, 0.06, (l, r) => {
      const hz = ctx.createLinearGradient(0, G - 340, 0, G);
      hz.addColorStop(0, 'rgba(255,110,40,0)'); hz.addColorStop(1, 'rgba(255,110,40,0.45)');
      ctx.fillStyle = hz; ctx.fillRect(l - 20, G - 340, r - l + 40, 340);
      for (let i = Math.floor(l / 180) - 1; i * 180 < r + 180; i++) {
        const x = i * 180 + _slHash(i) * 90;
        _slPortal(x, -40 + _slHash(i + 3) * 160, 6 + _slHash(i + 5) * 9, 270 + _slHash(i + 7) * 40, i);
      }
    });
    _slParallax(v, 0.2, (l, r) => {
      for (let i = Math.floor(l / 76) - 1; i * 76 < r + 76; i++) {
        const h = 160 + _slHash(i) * 240, w = 50 + _slHash(i + 40) * 26, x = i * 76;
        ctx.fillStyle = '#1e1414'; ctx.fillRect(x, G - h, w, h);
        ctx.fillStyle = 'rgba(255,170,90,0.45)';
        for (let wy = G - h + 10; wy < G - 30; wy += 13) for (let wx = x + 6; wx < x + w - 6; wx += 10)
          if (_slHash(wx * 3 + wy + i) < 0.07) ctx.fillRect(wx, wy, 4, 6);
        if (_slHash(i + 13) < 0.18) { _slFire(x + 6, G - h + 4, w - 12, 0.8); _slSmoke(x + w / 2, G - h, 260, true, i); }
      }
    });
    // Embers on the wind
    _slParallax(v, 0.6, (l, r) => {
      for (let i = Math.floor(l / 40); i * 40 < r; i++) {
        const t = (frameCount * (0.5 + _slHash(i) * 0.6) + _slHash(i + 3) * 500) % 500;
        const x = i * 40 + t * 0.6 + Math.sin(t * 0.05 + i) * 12, y = G - t;
        ctx.fillStyle = `rgba(255,${150 + _slHash(i) * 80},60,${0.8 * (1 - t / 500)})`;
        ctx.fillRect(x, y, 2, 2);
      }
    });
  }

  function _building(x, w, h, col, seed, storefront) {
    _slBrick(x, G - h, w, h, col);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, G - h, w, 8);
    _slWindowGrid(x + 10, G - h + 20, w - 20, h - 150, Math.max(2, Math.round(w / 70)), Math.max(1, Math.round((h - 150) / 70)), { lit: 0.12, seed, dark: '#181212' });
    if (storefront) {
      ctx.fillStyle = '#1e1c1a'; ctx.fillRect(x + 8, G - 110, w - 16, 110);
      ctx.fillStyle = '#2c2420'; ctx.fillRect(x + 8, G - 130, w - 16, 20);
      ctx.fillStyle = '#d8c8a8'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText(storefront, x + w / 2, G - 116);
      // Smashed glass: jagged hole and shards on the walk
      ctx.fillStyle = 'rgba(160,190,200,0.25)'; ctx.fillRect(x + 14, G - 100, w - 28, 96);
      ctx.fillStyle = '#100c0a';
      ctx.beginPath(); const cx = x + w / 2;
      ctx.moveTo(cx - 40, G - 4); ctx.lineTo(cx - 30, G - 70); ctx.lineTo(cx - 6, G - 88); ctx.lineTo(cx + 26, G - 64); ctx.lineTo(cx + 44, G - 4); ctx.fill();
      ctx.fillStyle = 'rgba(210,230,240,0.7)';
      for (let k = 0; k < 10; k++) ctx.fillRect(x + 20 + _slHash(k + x) * (w - 40), G - 3 + _slHash(k * 3) * 4, 3, 2);
    }
  }

  function back(v) {
    // Street wall: buildings lining the avenue the whole way
    const ROW = [[-200, 300, 300, '#4a3632', 0, null], [300, 680, 360, '#3e3434', 1, 'PHARMACY'], [680, 1150, 300, '#4e3a30', 2, null],
      [1150, 1520, 340, '#463a3a', 3, 'ELECTRONICS'], [1520, 1990, 280, '#3a3436', 4, 'CAFE LUNA'], [1990, 2600, 380, '#4a302c', 5, null],
      [3420, 3850, 320, '#3e3634', 6, 'BANK'], [3850, 4400, 420, '#42363a', 7, null], [4400, 4800, 300, '#4a3a34', 8, 'DELI'],
      [4800, 5450, 340, '#3a3434', 9, null]];
    for (const [x0, x1, h, col, seed, sf] of ROW) if (_slVisible(v, x0, x1)) _building(x0, x1 - x0, h, col, seed, sf);
    if (_slVisible(v, 2600, 3420)) {
      // Plaza: a civic building with columns behind the fountain
      ctx.fillStyle = '#6a625a'; ctx.fillRect(2640, G - 260, 720, 260);
      ctx.fillStyle = '#7a7268';
      ctx.beginPath(); ctx.moveTo(2620, G - 260); ctx.lineTo(3000, G - 330); ctx.lineTo(3380, G - 260); ctx.fill();
      ctx.fillStyle = '#8a8276'; for (let cx = 2680; cx < 3340; cx += 60) ctx.fillRect(cx, G - 240, 22, 222);
      ctx.fillStyle = '#4a443e'; ctx.fillRect(2640, G - 18, 720, 18);
      ctx.fillStyle = '#d8d0c0'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillText('CITY HALL', 3000, G - 270);
      _slFire(2700, G - 240, 120, 1.2); _slSmoke(2760, G - 270, 320, true, 21);
    }
    // ── Police line + cruiser, lights still going
    if (_slVisible(v, 120, 700)) {
      _slCar(COP.x, G, COP.w, '#1e2230', {});
      ctx.fillStyle = '#e8e8ec'; ctx.fillRect(COP.x + 30, G - 26, COP.w - 60, 8);
      ctx.fillStyle = '#1e2230'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLICE', COP.x + COP.w / 2, G - 19.5);
      const ph = (frameCount % 30) < 15;
      ctx.fillStyle = ph ? '#ff2a2a' : '#2a6aff'; ctx.fillRect(COP.x + COP.w / 2 - 14, G - 62, 12, 5);
      ctx.fillStyle = ph ? '#2a6aff' : '#ff2a2a'; ctx.fillRect(COP.x + COP.w / 2 + 2, G - 62, 12, 5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createRadialGradient(COP.x + COP.w / 2, G - 60, 2, COP.x + COP.w / 2, G - 60, 120);
      lg.addColorStop(0, ph ? 'rgba(255,40,40,0.35)' : 'rgba(40,100,255,0.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lg; ctx.fillRect(COP.x - 40, G - 180, COP.w + 80, 180); ctx.restore();
      for (const bx of [170, 560]) {
        ctx.fillStyle = '#d8d0c0'; ctx.fillRect(bx, G - 36, 70, 10);
        ctx.fillStyle = '#2a2a2a'; for (let s = 0; s < 70; s += 14) ctx.fillRect(bx + s, G - 36, 7, 10);
        ctx.fillStyle = '#4a4a4a'; ctx.fillRect(bx + 6, G - 26, 4, 26); ctx.fillRect(bx + 60, G - 26, 4, 26);
      }
      ctx.strokeStyle = '#e8c830'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(240, G - 30); ctx.quadraticCurveTo(400, G - 20, 560, G - 32); ctx.stroke();
    }
    // ── Jackknifed trailer (solid; climb the cab)
    if (_slVisible(v, TRAILER.x - 40, CAB.x + CAB.w + 60)) {
      const T = TRAILER;
      ctx.fillStyle = '#c8c4bc'; ctx.fillRect(T.x, G - T.h, T.w, T.h);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let rx = T.x + 10; rx < T.x + T.w; rx += 18) ctx.fillRect(rx, G - T.h + 4, 2, T.h - 8);
      ctx.fillStyle = '#2a6a9a'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText('FRESHWAY FOODS', T.x + T.w / 2, G - T.h / 2 + 6);
      ctx.fillStyle = '#16181a'; for (const wx of [T.x + 30, T.x + 64, T.x + T.w - 40]) { ctx.beginPath(); ctx.arc(wx, G - 4, 10, Math.PI, 0); ctx.fill(); }
      ctx.save(); ctx.translate(CAB.x + CAB.w / 2, G); ctx.rotate(0.12);
      ctx.fillStyle = '#8a2a22'; ctx.fillRect(-CAB.w / 2, -64, CAB.w, 64);
      ctx.fillStyle = '#26323c'; ctx.fillRect(-CAB.w / 2 + 40, -56, 32, 22);
      ctx.restore();
      _slFire(CAB.x, G - 64, CAB.w, 1); _slSmoke(CAB.x + 40, G - 90, 280, true, 2);
      // Spilled crates of produce
      for (const [cx, s] of [[T.x - 40, 30], [T.x - 70, 24], [T.x - 54, 22]]) _slCrate(cx, G - s, s, '#9a7a4a');
    }
    if (_slVisible(v, 1200, 1700)) {
      _slCar(1300, G, 160, '#3a4a5a', {}); _slFire(1310, G - 34, 140, 1); _slSmoke(1380, G - 60, 300, true, 4);
      // Traffic light hanging by its cable
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(1150, G - 290); ctx.quadraticCurveTo(1450, G - 230, 1700, G - 280); ctx.stroke();
      const sw = Math.sin(frameCount * 0.03) * 0.15;
      ctx.save(); ctx.translate(1440, G - 238); ctx.rotate(sw + 0.4);
      ctx.fillStyle = '#d8ae32'; ctx.fillRect(-10, 0, 20, 56);
      ctx.fillStyle = '#2a1a1a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 10 + k * 18, 5.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    // ── Subway entrance (dressed around the first shaft in surface())
    if (_slVisible(v, 1700, 1990)) { _slStreetLamp(1940, G, false); _slHydrant(1700, G); }
    // ── Fallen billboard leaning from the building to the street → marquee
    if (_slVisible(v, 1990, 2600)) {
      ctx.save(); ctx.translate(2000, G); ctx.rotate(-0.58);
      ctx.fillStyle = '#16181c'; ctx.fillRect(0, -10, 330, 70);
      ctx.fillStyle = '#d8c8a0'; ctx.fillRect(6, -4, 318, 58);
      ctx.fillStyle = '#a83a2a'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('GRAND OPENING', 165, 32);
      ctx.restore();
      const M = MARQUEE;
      ctx.fillStyle = '#2a1a20'; ctx.fillRect(M.x, M.y, M.w, 60);
      ctx.fillStyle = '#6a2a3a'; ctx.fillRect(M.x, M.y, M.w, 8);
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(M.x + 14, M.y + 14, M.w - 28, 34);
      ctx.fillStyle = '#2a1a20'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center'; ctx.fillText('THE ORPHEUM', M.x + M.w / 2, M.y + 37);
      for (let k = 0; k < 20; k++) {
        const on = ((frameCount >> 3) + k) % 4 !== 0;
        ctx.fillStyle = on ? '#ffd27a' : '#5a4020';
        ctx.beginPath(); ctx.arc(M.x + 8 + k * (M.w - 16) / 19, M.y + 54, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#2a1a20'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(M.x + 20, M.y); ctx.lineTo(M.x + 60, M.y - 60); ctx.moveTo(M.x + M.w - 20, M.y); ctx.lineTo(M.x + M.w - 60, M.y - 60); ctx.stroke();
    }
    // ── Fountain plaza
    if (_slVisible(v, FOUNTAIN - 200, FOUNTAIN + 200)) {
      ctx.fillStyle = '#8a8478'; ctx.fillRect(FOUNTAIN - 140, G - 30, 280, 30);
      ctx.fillStyle = '#5a7a8a'; ctx.fillRect(FOUNTAIN - 130, G - 26, 260, 8);
      ctx.fillStyle = '#9a9488'; ctx.fillRect(FOUNTAIN - 12, G - 120, 24, 90);
      ctx.fillRect(FOUNTAIN - 46, G - 124, 92, 8);
      for (let k = 0; k < 12; k++) {
        const t = (frameCount * 1.6 + k * 11) % 60;
        ctx.fillStyle = `rgba(170,200,220,${0.6 * (1 - t / 60)})`;
        ctx.beginPath(); ctx.arc(FOUNTAIN + (k - 6) * 7 * (t / 60 + 0.3), G - 128 + t * t * 0.03 - t * 0.6 + 20, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      _slPortal(FOUNTAIN, G - 250, 30, 20, 3);
    }
    // ── Burning city bus + fire truck ladder up to a building ledge
    if (_slVisible(v, BUSX.x - 40, LEDGE.x + LEDGE.w + 40)) {
      const B = BUSX;
      ctx.fillStyle = '#2a6a8a'; ctx.fillRect(B.x, B.y, B.w, G - 20 - B.y);
      ctx.fillStyle = '#e8e2d0'; ctx.fillRect(B.x, B.y + 50, B.w, 10);
      ctx.fillStyle = '#16181a'; for (let wx = B.x + 16; wx < B.x + B.w - 30; wx += 36) ctx.fillRect(wx, B.y + 12, 28, 30);
      ctx.fillStyle = '#f2e6a0'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'left'; ctx.fillText('22 CROSSTOWN', B.x + 8, B.y + 9);
      ctx.fillStyle = '#16181a'; for (const wx of [B.x + 50, B.x + B.w - 50]) { ctx.beginPath(); ctx.arc(wx, G - 12, 14, 0, Math.PI * 2); ctx.fill(); }
      _slFire(B.x + 20, B.y, 150, 1.3); _slSmoke(B.x + 90, B.y - 30, 340, true, 9);
      // Fire truck: body, ladder raised at an angle onto the ledge
      ctx.fillStyle = '#b82a22'; ctx.fillRect(3800, G - 76, 220, 56);
      ctx.fillStyle = '#d8d0c0'; ctx.fillRect(3800, G - 44, 220, 6);
      ctx.fillStyle = '#26323c'; ctx.fillRect(3990, G - 70, 24, 20);
      ctx.fillStyle = '#16181a'; for (const wx of [3830, 3880, 3990]) { ctx.beginPath(); ctx.arc(wx, G - 14, 13, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#c8c8c8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(3840, G - 80); ctx.lineTo(4110, LEDGE.y + 6); ctx.moveTo(3852, G - 70); ctx.lineTo(4122, LEDGE.y + 16); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let t = 0; t <= 1; t += 0.06) { const x = 3840 + 270 * t, y = G - 80 + (LEDGE.y + 6 - G + 80) * t; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y + 10); ctx.stroke(); }
      const L = LEDGE;
      ctx.fillStyle = '#6a625a'; ctx.fillRect(L.x, L.y, L.w, 10);
      ctx.fillStyle = '#4a443e'; ctx.fillRect(L.x, L.y + 10, L.w, 4);
      ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x, L.y - 26); ctx.lineTo(L.x + L.w, L.y - 26); ctx.stroke();
      for (let rx = L.x; rx <= L.x + L.w; rx += 14) { ctx.beginPath(); ctx.moveTo(rx, L.y); ctx.lineTo(rx, L.y - 26); ctx.stroke(); }
      // A water jet arcing from the abandoned hose
      for (let k = 0; k < 18; k++) {
        const t = ((frameCount * 2 + k * 9) % 120) / 120;
        ctx.fillStyle = `rgba(190,220,240,${0.5 * (1 - t)})`;
        ctx.beginPath(); ctx.arc(4020 + t * 160, G - 70 - Math.sin(t * Math.PI) * 90, 2 + t * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // ── News van, jersey barriers, the relay station gate
    if (_slVisible(v, VAN.x - 40, GATE + 400)) {
      const V = VAN;
      ctx.fillStyle = '#e6e2d8'; ctx.fillRect(V.x, V.y, V.w, G - 20 - V.y);
      ctx.fillStyle = '#2a5aa8'; ctx.fillRect(V.x, V.y + 30, V.w, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillText('CH 7 NEWS', V.x + V.w / 2, V.y + 42);
      ctx.fillStyle = '#16181a'; for (const wx of [V.x + 40, V.x + V.w - 40]) { ctx.beginPath(); ctx.arc(wx, G - 12, 13, 0, Math.PI * 2); ctx.fill(); }
      _slDish(V.x + 60, V.y - 34, 20, 1);
      ctx.fillStyle = '#5a6066'; ctx.fillRect(V.x + 140, V.y - 60, 4, 60);
      for (const [x, w] of JERSEY) {
        ctx.fillStyle = '#a8a49a';
        ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + 14, G - 30); ctx.lineTo(x + 18, G - 40); ctx.lineTo(x + w - 18, G - 40); ctx.lineTo(x + w - 14, G - 30); ctx.lineTo(x + w, G); ctx.fill();
        ctx.fillStyle = '#c8442a'; ctx.fillRect(x + 20, G - 30, w - 40, 5);
      }
      // Relay station: fenced compound with a lit lattice tower
      _slChainFence(GATE - 60, G, 400, 140);
      ctx.fillStyle = '#efe9da'; ctx.fillRect(GATE - 30, G - 110, 120, 40);
      ctx.fillStyle = '#9c2a22'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('MUNICIPAL RELAY STATION', GATE + 30, G - 94);
      ctx.fillStyle = '#2b2b2b'; ctx.font = '7px Arial'; ctx.fillText('AUTHORIZED PERSONNEL ONLY', GATE + 30, G - 80);
      ctx.strokeStyle = '#6a6e74'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(GATE + 180, G); ctx.lineTo(GATE + 220, G - 440); ctx.lineTo(GATE + 260, G); ctx.stroke();
      ctx.lineWidth = 1;
      for (let y = G; y > G - 440; y -= 22) { const t = (G - y) / 440, a = GATE + 180 + 40 * t, b = GATE + 260 - 40 * t; ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y - 22); ctx.moveTo(b, y); ctx.lineTo(a, y - 22); ctx.stroke(); }
      _slAntenna(GATE + 220, G - 440, 30, true);
    }
  }

  const ZONES = [
    { x0: -200, x1: 600, kind: 'sidewalk', face: 'soil' },
    { x0: 600, x1: 2620, kind: 'asphalt', face: 'soil' },
    { x0: 2620, x1: 3380, kind: 'tile', face: 'concrete' },
    { x0: 3380, x1: 5450, kind: 'asphalt', face: 'soil' },
    { x0: 5450, x1: 6200, kind: 'sidewalk', face: 'soil' },
  ];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph === 'front') return;
    const shafts = (a.undergroundRects || []).filter(q => q.kind === 'shaft');
    // Shaft 1: subway entrance — railings, the globe lamps, the sign
    const s1 = shafts[0];
    if (s1 && _slVisible(v, s1.x - 60, s1.x + s1.w + 60)) {
      ctx.fillStyle = '#2a4a3a';
      ctx.fillRect(s1.x - 6, G - 44, 6, 44); ctx.fillRect(s1.x + s1.w, G - 44, 6, 44);
      ctx.fillRect(s1.x - 6, G - 44, s1.w + 12, 4);
      for (const gx of [s1.x - 3, s1.x + s1.w + 3]) {
        ctx.fillStyle = '#3a5a4a'; ctx.fillRect(gx - 2, G - 80, 4, 36);
        ctx.fillStyle = '#e8f0c8'; ctx.beginPath(); ctx.arc(gx, G - 86, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#1a2a22'; ctx.fillRect(s1.x + 6, G - 64, s1.w - 12, 16);
      ctx.fillStyle = '#e8f0c8'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('SUBWAY', s1.x + s1.w / 2, G - 52);
    }
    // Shaft 2: impact crater ringed with cones, a burst main spraying
    const s2 = shafts[1];
    if (s2 && _slVisible(v, s2.x - 80, s2.x + s2.w + 80)) {
      _slRubble(s2.x - 70, G, 64, 22, '#4a4640'); _slRubble(s2.x + s2.w + 6, G, 64, 26, '#4a4640');
      _slCone(s2.x - 84, G - 2); _slCone(s2.x + s2.w + 84, G - 2);
      for (let k = 0; k < 14; k++) {
        const t = (frameCount * 2.4 + k * 21) % 120;
        ctx.fillStyle = `rgba(170,200,230,${0.55 * (1 - t / 120)})`;
        ctx.beginPath(); ctx.arc(s2.x + s2.w / 2 + Math.sin(k) * t * 0.2, G - t * (1.6 - t / 150), 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  STORY_LEVELS[6] = {
    sky: ['#24100c', '#7a3420'],
    groundColor: '#2a221e',
    platColor: '#3a322c',
    layout, backdrop, back, surface,
  };
})();
