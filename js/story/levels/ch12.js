'use strict';
// js/story/levels/ch12.js — Chapter 12 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 12 — What Veran Knew (walk → duel vs a Rift Collector)
// The deep station, where Veran explains the rift entity. Server stacks, her
// control deck with holographic maps of every dimension she has charted, the
// containment cells, an observation window over the burning city — and the
// portal ring at the midpoint: "As if on cue, a portal opened behind you."
// The far end is where she sends you next: the primary fracture, torn open.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const SERVERS = [[300, 120], [440, 120], [580, 120]];
  const DECK = { x: 900, w: 520, y: G - 130 };
  const DECK_STAIRS = [[820, G - 44, 60], [860, G - 88, 60]];
  const CELLS = { x: 2050, w: 420 };
  const RING_X = 3000;
  const WINDOW = { x: 3500, w: 900 };
  const GANTRY = [[3600, G - 120, 160], [3840, G - 200, 180], [4100, G - 120, 160]];
  const LIFT = { x: 4900, w: 90, y: G - 40, travel: 110 };
  const FRACTURE_X = 5650;

  function layout() {
    const P = [];
    for (const [x, w] of SERVERS) _slLedge(P, x, G - 150, w);
    for (const [x, y, w] of DECK_STAIRS) _slLedge(P, x, y, w);
    _slLedge(P, DECK.x, DECK.y, DECK.w);
    _slLedge(P, 1500, G - 70, 120);                     // console bank
    _slLedge(P, CELLS.x, G - 160, CELLS.w);              // cell-block roof walk
    for (const [x, y, w] of GANTRY) _slLedge(P, x, y, w);
    _slMover(P, 'lift', LIFT.x, LIFT.y - LIFT.travel, LIFT.w, 0, LIFT.travel, 0.015, 0);
    _slLedge(P, 5020, G - 240, 200);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0a0c12'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // Station shell
    ctx.fillStyle = '#181a22'; ctx.fillRect(x0, G - 560, x1 - x0, 560);
    for (let px = Math.floor(x0 / 200) * 200; px < x1; px += 200) {
      ctx.fillStyle = '#20232d'; ctx.fillRect(px, G - 560, 26, 560);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = G - 540; y < G; y += 60) ctx.fillRect(px + 26, y, 174, 2);
    }
    _slConduit(x0, x1, G - 500, 200, 9);
    _slConduit(x0, x1, G - 470, 280, 6);
    // ── Server stacks
    if (_slVisible(v, 260, 740)) for (const [x, w] of SERVERS) {
      ctx.fillStyle = '#20232a'; ctx.fillRect(x, G - 150, w, 150);
      ctx.fillStyle = '#2a2e36'; ctx.fillRect(x, G - 150, w, 6);
      for (let ry = G - 140; ry < G - 6; ry += 12) {
        ctx.fillStyle = '#14161c'; ctx.fillRect(x + 6, ry, w - 12, 9);
        for (let k = 0; k < 6; k++) { const on = _slHash(k + ry + x + (frameCount >> 4)) < 0.6; ctx.fillStyle = on ? (k % 3 ? '#5affc8' : '#ffb04a') : '#1e3a30'; ctx.fillRect(x + 10 + k * 8, ry + 3, 3, 3); }
      }
    }
    // ── Control deck: holo maps of the dimensions Veran has charted
    if (_slVisible(v, 800, 1650)) {
      for (const [x, y, w] of DECK_STAIRS) { ctx.fillStyle = '#2a2e38'; ctx.fillRect(x, y, w, G - y); }
      const D = DECK;
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(D.x, D.y, D.w, 12);
      ctx.fillStyle = 'rgba(150,220,255,0.5)'; ctx.fillRect(D.x, D.y + 12, D.w, 2);
      ctx.strokeStyle = '#3a3f4c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(D.x, D.y - 24); ctx.lineTo(D.x + D.w, D.y - 24); ctx.stroke();
      for (let k = D.x; k <= D.x + D.w; k += 24) { ctx.beginPath(); ctx.moveTo(k, D.y); ctx.lineTo(k, D.y - 24); ctx.stroke(); }
      for (const px of [D.x + 40, D.x + D.w - 50]) { ctx.fillStyle = '#20232d'; ctx.fillRect(px, D.y + 14, 14, G - D.y - 14); }
      // Wall of holograms above the deck — each labelled with a world
      const MAPS = [['HOME', 200], ['FRACTURE NET', 270], ['MIRROR', 300], ['VOID', 330], ['CORE', 20]];
      MAPS.forEach(([name, hue], i) => {
        const hx = D.x + 20 + i * 100;
        _slHolo(hx, D.y - 190, 86, 110, hue);
        ctx.fillStyle = `hsla(${hue},90%,80%,0.9)`; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText(name, hx + 43, D.y - 196);
      });
      // Veran's chair and coffee, still warm
      ctx.fillStyle = '#3a2e2a'; ctx.fillRect(D.x + 220, D.y - 40, 30, 6); ctx.fillRect(D.x + 232, D.y - 34, 6, 34); ctx.fillRect(D.x + 244, D.y - 70, 6, 36);
      ctx.fillStyle = '#e8e2d8'; ctx.fillRect(D.x + 300, D.y - 12, 8, 12);
      _slSmoke(D.x + 304, D.y - 12, 30, false, 4);
      // Console bank below
      ctx.fillStyle = '#2a2e36'; ctx.fillRect(1500, G - 70, 120, 70);
      _slHolo(1506, G - 64, 108, 30, 160);
    }
    // ── Containment cells (one holds a collector husk)
    if (_slVisible(v, CELLS.x - 20, CELLS.x + CELLS.w + 20)) {
      const C = CELLS;
      ctx.fillStyle = '#20232a'; ctx.fillRect(C.x, G - 160, C.w, 160);
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(C.x, G - 160, C.w, 8);
      for (let k = 0; k < 4; k++) {
        const cx = C.x + 10 + k * 104;
        ctx.fillStyle = '#0e1016'; ctx.fillRect(cx, G - 140, 90, 130);
        ctx.fillStyle = 'rgba(120,230,255,0.10)'; ctx.fillRect(cx, G - 140, 90, 130);
        ctx.strokeStyle = 'rgba(120,230,255,0.5)'; ctx.lineWidth = 1;
        for (let bx = cx + 10; bx < cx + 90; bx += 14) { ctx.beginPath(); ctx.moveTo(bx, G - 140); ctx.lineTo(bx, G - 10); ctx.stroke(); }
        if (k === 2) {
          ctx.fillStyle = 'rgba(40,20,60,0.9)';
          ctx.beginPath(); ctx.arc(cx + 45, G - 96, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(cx + 38, G - 86, 14, 50); ctx.fillRect(cx + 36, G - 36, 6, 26); ctx.fillRect(cx + 48, G - 36, 6, 26);
          ctx.fillStyle = (frameCount % 120) < 6 ? '#ff4466' : '#5a2040'; ctx.fillRect(cx + 41, G - 98, 8, 3);
        }
        ctx.fillStyle = '#9ad8f0'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.fillText('CELL ' + (k + 1), cx + 45, G - 146);
      }
    }
    // ── The portal ring (the collector comes through here)
    if (_slVisible(v, RING_X - 320, RING_X + 320)) {
      ctx.fillStyle = '#2a2e38';
      ctx.beginPath(); ctx.arc(RING_X, G - 200, 190, 0, Math.PI * 2); ctx.arc(RING_X, G - 200, 160, 0, Math.PI * 2, true); ctx.fill();
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2, on = ((frameCount >> 3) + k) % 12 < 8;
        ctx.fillStyle = on ? '#c9a2ff' : '#3a3050';
        ctx.fillRect(RING_X + Math.cos(a) * 175 - 4, G - 200 + Math.sin(a) * 175 - 4, 8, 8);
      }
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(RING_X - 120, G - 40, 240, 40);
      _slPortal(RING_X, G - 200, 100, 280, 0);
    }
    // ── Observation window over the burning city, gantries in front of it
    if (_slVisible(v, WINDOW.x, WINDOW.x + WINDOW.w)) {
      const W = WINDOW;
      ctx.fillStyle = '#2a1008'; ctx.fillRect(W.x, G - 420, W.w, 330);
      const g = ctx.createLinearGradient(0, G - 420, 0, G - 90);
      g.addColorStop(0, '#1a0a14'); g.addColorStop(1, '#7a2a10'); ctx.fillStyle = g; ctx.fillRect(W.x, G - 420, W.w, 330);
      for (let i = 0; i < 24; i++) {
        const bx = W.x + i * 38, h = 60 + _slHash(i + 30) * 160;
        ctx.fillStyle = '#140a0a'; ctx.fillRect(bx, G - 90 - h, 32, h);
        if (_slHash(i + 31) < 0.3) _slFire(bx + 2, G - 90 - h, 28, 0.6);
      }
      for (let i = 0; i < 6; i++) _slPortal(W.x + 80 + i * 150, G - 360 + _slHash(i) * 60, 8, 280, i);
      ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 8;
      for (let mx = W.x; mx <= W.x + W.w; mx += 150) { ctx.beginPath(); ctx.moveTo(mx, G - 420); ctx.lineTo(mx, G - 90); ctx.stroke(); }
      ctx.strokeRect(W.x, G - 420, W.w, 330);
      for (const [x, y, w] of GANTRY) {
        ctx.fillStyle = '#3a3f4c'; ctx.fillRect(x, y, w, 8);
        ctx.strokeStyle = '#3a3f4c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + w, y - 22); ctx.stroke();
        for (let k = x; k <= x + w; k += 20) { ctx.beginPath(); ctx.moveTo(k, y); ctx.lineTo(k, y - 22); ctx.stroke(); }
        ctx.fillStyle = '#20232d'; ctx.fillRect(x + w / 2 - 5, y + 8, 10, G - y - 8);
      }
    }
    // ── Lift up to the fracture mouth
    if (_slVisible(v, 4860, 6200)) {
      const lf = _slPlat(currentArena, 'lift');
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(LIFT.x - 10, G - 300, 8, 300); ctx.fillRect(LIFT.x + LIFT.w + 2, G - 300, 8, 300);
      if (lf) {
        ctx.fillStyle = '#4a5060'; ctx.fillRect(lf.x, lf.y, lf.w, 10);
        ctx.fillStyle = '#d0a020'; for (let k = 0; k < lf.w; k += 18) ctx.fillRect(lf.x + k, lf.y, 9, 3);
      }
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(5020, G - 240, 200, 10);
      // The primary fracture: Veran's next destination, held open by clamps
      const p = 0.75 + 0.25 * Math.sin(frameCount * 0.05);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(FRACTURE_X, G - 200, 10, FRACTURE_X, G - 200, 260);
      fg.addColorStop(0, `rgba(220,180,255,${0.45 * p})`); fg.addColorStop(1, 'rgba(160,100,255,0)');
      ctx.fillStyle = fg; ctx.fillRect(FRACTURE_X - 260, G - 460, 520, 460);
      ctx.restore();
      const pts = _slJag(FRACTURE_X, G - 420, FRACTURE_X + 10, G, 12, 26, 777);
      ctx.fillStyle = '#06030c';
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const w = 40 * Math.sin(Math.PI * i / (pts.length - 1)); i ? ctx.lineTo(x - w, y) : ctx.moveTo(x, y); });
      for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = pts[i]; const w = 40 * Math.sin(Math.PI * i / (pts.length - 1)); ctx.lineTo(x + w, y); }
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.shadowColor = '#d8b8ff'; ctx.shadowBlur = 18; ctx.strokeStyle = '#f2e8ff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      for (const cy of [G - 330, G - 200, G - 70]) { ctx.fillStyle = '#3a3f4c'; ctx.fillRect(FRACTURE_X - 90, cy, 40, 14); ctx.fillRect(FRACTURE_X + 50, cy, 40, 14); }
      ctx.fillStyle = '#c9a2ff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('PRIMARY FRACTURE · HOLD', FRACTURE_X, G - 440);
    }
  }

  const ZONES = [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph !== 'back') return;
    for (const r of (a.undergroundRects || []).filter(q => q.kind === 'shaft')) {
      if (!_slVisible(v, r.x - 40, r.x + r.w + 40)) continue;
      ctx.fillStyle = '#d0a020'; ctx.fillRect(r.x - 8, G - 3, r.w + 16, 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(r.x + r.w / 2, G, 4, r.x + r.w / 2, G, 70);
      g.addColorStop(0, 'rgba(120,230,255,0.35)'); g.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(r.x - 30, G - 70, r.w + 60, 70); ctx.restore();
    }
  }

  STORY_LEVELS[12] = {
    sky: ['#0a0c12', '#141820'],
    groundColor: '#1a1a20',
    platColor: '#2a2c34',
    layout, backdrop, back, surface,
  };
})();
