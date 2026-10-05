'use strict';
// js/story/levels/ch25.js — Chapter 25 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 25 — Collector's Network (scavenge, 5 data caches)
// The Collectors' junction node: a machine for routing stolen fragments. The
// floor drops into a sunken sorting trench and rises onto loading decks; data
// terminals stand at every level. Caches (positions mirrored in the chapter's
// scavengeItemDefs): Log A on top of the first terminal tower, Log B down in
// the trench, Origin Data on the freight lift's upper stop, the Fracture Map
// up on the main conduit, the Creator's Mark at the routing core — the mark
// that shows who built all of it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 1100, 440], [1100, 1700, 520], [1700, 2600, 440], [2600, 3300, 400], [3300, 5400, 440]];
  const TOWER = [[480, 360, 90], [530, 280, 90], [600, 200, 100]];
  const TRENCH_STEPS = [[1640, 480, 60]];
  const LIFT = { x: 2240, y: 400, w: 90, travel: 130 };
  const LIFT_TOP = { x: 2340, y: 270, w: 120 };
  const CONDUIT = { x: 2900, w: 420, y: 230 };
  const CONDUIT_STEPS = [[2700, 330, 90], [2790, 280, 80]];
  const CORE = 4300;
  const CORE_STEPS = [[4060, 370, 90], [4150, 310, 90], [4240, 250, 120]];

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 620 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of TOWER) _slLedge(P, x, y, w);
    for (const [x, y, w] of TRENCH_STEPS) _slLedge(P, x, y, w);
    _slLedge(P, 1100, 480, 50);
    _slMover(P, 'lift', LIFT.x, LIFT.y - LIFT.travel / 2, LIFT.w, 0, LIFT.travel / 2, 0.014, 0);
    _slLedge(P, LIFT_TOP.x, LIFT_TOP.y, LIFT_TOP.w);
    for (const [x, y, w] of CONDUIT_STEPS) _slLedge(P, x, y, w);
    _slLedge(P, CONDUIT.x, CONDUIT.y, CONDUIT.w);
    for (const [x, y, w] of CORE_STEPS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05060c');
    _slParallax(v, 0.12, (l, r) => {
      // Endless routing lattice in the dark
      ctx.strokeStyle = 'rgba(120,180,255,0.10)'; ctx.lineWidth = 1;
      for (let x = Math.floor(l / 80) * 80; x < r + 80; x += 80) { ctx.beginPath(); ctx.moveTo(x, -300); ctx.lineTo(x + 200, 520); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 200, -300); ctx.lineTo(x, 520); ctx.stroke(); }
      for (let i = Math.floor(l / 200); i * 200 < r; i++) {
        const t = (frameCount * 2 + i * 70) % 800;
        ctx.fillStyle = 'rgba(160,210,255,0.6)'; ctx.fillRect(i * 200 + t * 0.25, -300 + t, 3, 3);
      }
    });
  }

  function _terminal(x, y, w, h, hue) {
    ctx.fillStyle = '#1a1e2a'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2a3040'; ctx.fillRect(x, y, w, 6);
    _slHolo(x + 6, y + 12, w - 12, Math.min(40, h - 20), hue);
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(5400, v.x + v.w + 40);
    ctx.fillStyle = '#10141e'; ctx.fillRect(x0, -300, x1 - x0, 740);
    for (let px = Math.floor(x0 / 180) * 180; px < x1; px += 180) { ctx.fillStyle = '#161c28'; ctx.fillRect(px, -300, 20, 740); }
    _slConduit(x0, x1, 60, 210, 10);
    // Terminal tower (Log A on top)
    if (_slVisible(v, 440, 720)) for (const [x, y, w] of TOWER) _terminal(x, y, w, 440 - y, 200);
    // Sorting trench: conveyor, fragment crates riding it
    if (_slVisible(v, 1060, 1720)) {
      ctx.fillStyle = '#0a0c12'; ctx.fillRect(1100, 440, 600, 80);
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(1100, 500, 600, 10);
      for (let k = 0; k < 8; k++) {
        const cx = 1100 + ((frameCount * 0.8 + k * 75) % 600);
        ctx.fillStyle = '#3a4050'; ctx.fillRect(cx, 480, 30, 22);
        ctx.fillStyle = `hsla(${200 + k * 20},80%,65%,0.8)`; ctx.fillRect(cx + 11, 486, 8, 8);
      }
      for (const [x, y, w] of TRENCH_STEPS) { ctx.fillStyle = '#2a2e38'; ctx.fillRect(x, y, w, 520 - y); }
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(1100, 480, 50, 40);
      ctx.fillStyle = '#d0a020'; for (let k = 0; k < 8; k++) ctx.fillRect(1100 + k * 75, 436, 36, 4);
      _terminal(1400, 420, 70, 80, 280);
    }
    // Freight lift to the upper stop (Origin Data)
    if (_slVisible(v, 2200, 2500)) {
      ctx.fillStyle = '#2a2e38'; ctx.fillRect(LIFT.x - 10, 220, 8, 220); ctx.fillRect(LIFT.x + LIFT.w + 2, 220, 8, 220);
      const lf = _slPlat(currentArena, 'lift');
      if (lf) { ctx.fillStyle = '#4a5060'; ctx.fillRect(lf.x, lf.y, lf.w, 10); ctx.fillStyle = '#d0a020'; for (let k = 0; k < lf.w; k += 18) ctx.fillRect(lf.x + k, lf.y, 9, 3); }
      ctx.fillStyle = '#2a3040'; ctx.fillRect(LIFT_TOP.x, LIFT_TOP.y, LIFT_TOP.w, 10);
      _terminal(LIFT_TOP.x + 20, LIFT_TOP.y - 70, 80, 70, 160);
    }
    // Loading deck → main conduit (Fracture Map)
    if (_slVisible(v, 2600, 3400)) {
      for (const [x, y, w] of CONDUIT_STEPS) { ctx.fillStyle = '#2a2e38'; ctx.fillRect(x, y, w, 400 - y); }
      _slConduit(CONDUIT.x - 20, CONDUIT.x + CONDUIT.w + 20, CONDUIT.y + 8, 190, 12);
      for (let k = 0; k < 4; k++) { const cx = 2640 + k * 160; ctx.fillStyle = '#3a4050'; ctx.fillRect(cx, 400 - 40, 50, 40); }
    }
    // Routing core: the Creator's mark burned into it
    if (_slVisible(v, CORE - 300, CORE + 400)) {
      for (const [x, y, w] of CORE_STEPS) { ctx.fillStyle = '#2a2e38'; ctx.fillRect(x, y, w, 440 - y); }
      const p = 0.7 + 0.3 * Math.sin(frameCount * 0.05);
      ctx.fillStyle = '#1a1e2a'; ctx.beginPath(); ctx.arc(CORE + 200, 230, 130, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(160,210,255,0.5)'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(CORE + 200, 230, 60 + k * 30, frameCount * 0.01 * (k % 2 ? 1 : -1), frameCount * 0.01 * (k % 2 ? 1 : -1) + Math.PI * 1.4); ctx.stroke(); }
      ctx.save(); ctx.shadowColor = '#ffd890'; ctx.shadowBlur = 16 * p;
      ctx.strokeStyle = `rgba(255,220,150,${p})`; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let a = 0; a < 6; a++) ctx.lineTo(CORE + 200 + Math.cos(a * Math.PI / 3) * 34, 230 + Math.sin(a * Math.PI / 3) * 34);
      ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
  }

  const ZONES = [{ x0: -200, x1: 5600, kind: 'tunnel', face: 'concrete' }];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[25] = {
    sky: ['#05060c', '#10141e'],
    groundColor: '#0a0c14',
    platColor: '#1e2230',
    floor, layout, backdrop, back, surface,
  };
})();
