'use strict';
// js/story/levels/ch20.js — Chapter 20 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 20 — The Shattered Mirror (assassination, scrolling)
// "A bounty hunter materialized in the debris field. Eliminate them before
// they transmit your location." Three screens of wreckage drifting in a grid
// dimension: a derelict hull walkway is the floor; airliner fuselage, a slow
// satellite, a bus, building chunks and rocks float above it. The target runs
// right toward a transmitter mast at the far end — it charges up as the
// assassination timer runs down, so the stakes are on screen.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const W = 2700, FLOOR = 470;
  const PLANE = { x: 300, w: 420, y: 330 };
  const BUS = { x: 900, w: 240, y: 300 };
  const ROCKS = [[220, 230, 90], [780, 210, 80], [1240, 220, 100], [1700, 190, 90], [2150, 230, 100]];
  const CHUNK = { x: 1450, w: 200, y: 330 };
  const SAT = { x: 1880, y: 300, w: 150 };
  const MAST_X = 2550;

  function platforms() {
    const P = [{ x: -60, y: FLOOR, w: W + 120, h: 60, isFloor: true, noDraw: true }];
    _slLedge(P, PLANE.x, PLANE.y, PLANE.w);
    _slLedge(P, BUS.x, BUS.y, BUS.w);
    for (const [x, y, w] of ROCKS) _slLedge(P, x, y, w);
    _slLedge(P, CHUNK.x, CHUNK.y, CHUNK.w);
    _slMover(P, 'sat', SAT.x, SAT.y, SAT.w, 0, 40, 0.012, 0);
    _slLedge(P, MAST_X - 120, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#000000');
    // The grid dimension: green lines receding to a horizon
    _slParallax(v, 0.15, (l, r) => {
      ctx.strokeStyle = 'rgba(0,255,90,0.18)'; ctx.lineWidth = 1;
      for (let y = 40; y < 520; y += 40) { ctx.beginPath(); ctx.moveTo(l - 20, y); ctx.lineTo(r + 20, y); ctx.stroke(); }
      for (let x = Math.floor(l / 60) * 60; x < r + 60; x += 60) { ctx.beginPath(); ctx.moveTo(x, -100); ctx.lineTo(x, 520); ctx.stroke(); }
    });
    _slParallax(v, 0.35, (l, r) => {
      // Distant debris tumbling
      for (let i = Math.floor(l / 160) - 1; i * 160 < r + 160; i++) {
        const x = i * 160 + _slHash(i) * 80, y = 60 + _slHash(i + 3) * 300, s = 8 + _slHash(i + 5) * 26;
        ctx.save(); ctx.translate(x, y); ctx.rotate(frameCount * 0.004 * (i % 2 ? 1 : -1) + i);
        ctx.fillStyle = 'rgba(20,40,30,0.9)'; ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
        ctx.strokeStyle = 'rgba(0,255,90,0.35)'; ctx.strokeRect(-s, -s * 0.6, s * 2, s * 1.2);
        ctx.restore();
      }
    });
  }

  function _rock(x, y, w) {
    ctx.fillStyle = '#1e2422';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.8, y + 40); ctx.lineTo(x + w * 0.4, y + 52); ctx.lineTo(x + w * 0.1, y + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2e3632'; ctx.fillRect(x, y, w, 6);
    ctx.strokeStyle = 'rgba(0,255,90,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  }

  function back(v) {
    // Airliner fuselage section, torn at both ends
    if (_slVisible(v, PLANE.x - 40, PLANE.x + PLANE.w + 40)) {
      const P = PLANE;
      ctx.fillStyle = '#c8ccd0'; ctx.beginPath(); ctx.ellipse(P.x + P.w / 2, P.y + 40, P.w / 2, 46, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a5a9a'; ctx.fillRect(P.x + 20, P.y + 44, P.w - 40, 8);
      ctx.fillStyle = '#26323c'; for (let wx = P.x + 40; wx < P.x + P.w - 40; wx += 22) { ctx.beginPath(); ctx.ellipse(wx, P.y + 30, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(P.x + 6, P.y + 40, 12, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1e22'; ctx.beginPath(); ctx.moveTo(P.x + 160, P.y + 70); ctx.lineTo(P.x + 300, P.y + 70); ctx.lineTo(P.x + 340, P.y + 110); ctx.lineTo(P.x + 140, P.y + 110); ctx.fill();
      ctx.fillStyle = '#e8ecef'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.fillText('NORTHWIND', P.x + 70, P.y + 20);
    }
    // City bus, upside down
    if (_slVisible(v, BUS.x - 20, BUS.x + BUS.w + 20)) {
      const B = BUS;
      ctx.fillStyle = '#2a6a8a'; ctx.fillRect(B.x, B.y, B.w, 70);
      ctx.fillStyle = '#16181a'; for (let wx = B.x + 14; wx < B.x + B.w - 20; wx += 32) ctx.fillRect(wx, B.y + 30, 24, 26);
      ctx.fillStyle = '#16181a'; for (const wx of [B.x + 40, B.x + B.w - 40]) { ctx.beginPath(); ctx.arc(wx, B.y + 2, 13, Math.PI, 0); ctx.fill(); }
    }
    for (const [x, y, w] of ROCKS) if (_slVisible(v, x - 10, x + w + 10)) _rock(x, y, w);
    // A building chunk: three storeys of an apartment, floating
    if (_slVisible(v, CHUNK.x - 20, CHUNK.x + CHUNK.w + 20)) {
      _slBrick(CHUNK.x, CHUNK.y, CHUNK.w, 110, '#4a3a34');
      _slWindowGrid(CHUNK.x + 10, CHUNK.y + 10, CHUNK.w - 20, 90, 3, 2, { lit: 0.2, seed: 20 });
      ctx.fillStyle = '#2a2420';
      ctx.beginPath(); ctx.moveTo(CHUNK.x, CHUNK.y + 110); ctx.lineTo(CHUNK.x + CHUNK.w, CHUNK.y + 110); ctx.lineTo(CHUNK.x + CHUNK.w * 0.7, CHUNK.y + 150); ctx.lineTo(CHUNK.x + 40, CHUNK.y + 140); ctx.fill();
    }
    // Satellite drifting on its slow bob (live platform)
    const s = _slPlat(currentArena, 'sat');
    if (s && _slVisible(v, s.x - 60, s.x + s.w + 60)) {
      ctx.fillStyle = '#c8b060'; ctx.fillRect(s.x + 50, s.y, 50, 40);
      ctx.fillStyle = '#1e2c4a'; ctx.fillRect(s.x - 40, s.y + 10, 90, 20); ctx.fillRect(s.x + 100, s.y + 10, 90, 20);
      ctx.strokeStyle = 'rgba(120,160,220,0.5)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(s.x - 40 + k * 15, s.y + 10); ctx.lineTo(s.x - 40 + k * 15, s.y + 30); ctx.moveTo(s.x + 100 + k * 15, s.y + 10); ctx.lineTo(s.x + 100 + k * 15, s.y + 30); ctx.stroke(); }
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(s.x, s.y, s.w, 5);
      _slDish(s.x + 75, s.y - 18, 14, 1);
    }
    // The transmitter: charges toward "location sent" as the timer runs
    if (_slVisible(v, MAST_X - 200, MAST_X + 200)) {
      const ch = (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) || {};
      const total = ch.assassinationTimer || 5400;
      const left = (typeof assassinationTimer !== 'undefined') ? assassinationTimer : total;
      const charge = Math.max(0, Math.min(1, 1 - left / total));
      ctx.strokeStyle = '#4a5a50'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(MAST_X - 30, FLOOR); ctx.lineTo(MAST_X, FLOOR - 360); ctx.lineTo(MAST_X + 30, FLOOR); ctx.stroke();
      ctx.lineWidth = 1;
      for (let y = FLOOR; y > FLOOR - 360; y -= 20) { const t = (FLOOR - y) / 360, a = MAST_X - 30 + 30 * t, b = MAST_X + 30 - 30 * t; ctx.beginPath(); ctx.moveTo(a, y); ctx.lineTo(b, y - 20); ctx.stroke(); }
      ctx.fillStyle = '#2a3430'; ctx.fillRect(MAST_X - 120, 360, 100, 10);
      ctx.fillStyle = '#1a201e'; ctx.fillRect(MAST_X - 70, FLOOR - 60, 60, 60);
      ctx.fillStyle = '#0a1a10'; ctx.fillRect(MAST_X - 64, FLOOR - 54, 48, 10);
      ctx.fillStyle = charge > 0.8 ? '#ff4433' : '#33ff88'; ctx.fillRect(MAST_X - 64, FLOOR - 54, 48 * charge, 10);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const t = ((frameCount * (0.6 + charge)) + k * 40) % 120;
        ctx.strokeStyle = `rgba(80,255,140,${(1 - t / 120) * (0.3 + charge * 0.6)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(MAST_X, FLOOR - 360, 10 + t, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = charge > 0.8 ? '#ff6655' : '#88ffb0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('UPLINK ' + Math.round(charge * 100) + '%', MAST_X, FLOOR - 70);
    }
  }

  // Derelict hull walkway: plated, ribbed, open void under it
  function surface(v, a, ph) {
    const x0 = Math.max(-60, v.x - 20), x1 = Math.min(W + 60, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#3a423e'; ctx.fillRect(x0, FLOOR - 14, x1 - x0, 14);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      for (let k = Math.ceil(x0 / 64) * 64; k < x1; k += 64) { ctx.beginPath(); ctx.moveTo(k, FLOOR - 14); ctx.lineTo(k - 4, FLOOR); ctx.stroke(); }
      return;
    }
    ctx.fillStyle = '#2a302c'; ctx.fillRect(x0, FLOOR, x1 - x0, 22);
    ctx.fillStyle = 'rgba(0,255,90,0.5)'; ctx.fillRect(x0, FLOOR, x1 - x0, 1.5);
    ctx.fillStyle = '#1a1e1c';
    for (let k = Math.ceil(x0 / 90) * 90; k < x1; k += 90) { ctx.fillRect(k, FLOOR + 22, 10, 40); ctx.beginPath(); ctx.moveTo(k - 30, FLOOR + 22); ctx.lineTo(k + 5, FLOOR + 60); ctx.lineTo(k + 40, FLOOR + 22); ctx.fill(); }
  }

  STORY_LEVELS[20] = {
    sky: ['#000000', '#001208'],
    groundColor: '#000805',
    platColor: '#002200',
    platEdge: '#00ff44',
    arena: { base: 'neonGrid', platforms, props: { worldWidth: W, mapLeft: 0, mapRight: W, deathY: 640 } },
    backdrop, back, surface,
  };
})();
