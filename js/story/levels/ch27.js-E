'use strict';
// js/story/levels/ch27.js — Chapter 27 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 27 — Creator's Mark (puzzle, 4 mechanisms)
// The inner threshold of the Fracture Core. The Creator's hexagonal mark is
// carved into the far seal; four mechanisms break it, spread across a vertical
// warp chamber: two tower levels, a lift, and a pit (positions mirrored in
// the chapter's puzzleSwitchDefs). The order zig-zags — 1 in the pit, 2 on the
// high tower, 3 on the lift's top stop, 4 at the bottom of the west wall —
// so the player has to read the room. Each solved mechanism lights one
// segment of the mark. "It's letting you."
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 1500, 440], [1500, 1760, 540], [1760, 3800, 440]];
  const TOWER = [[2100, 360, 110], [2160, 280, 100], [2220, 200, 110], [2300, 120, 140]];
  const LIFT = { x: 2800, y: 340, w: 90, travel: 120 };
  const LIFT_TOP = { x: 2920, y: 220, w: 140 };
  const WEST = [[300, 340, 100], [420, 260, 100]];
  const SEAL = 3400;

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 640 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of TOWER) _slLedge(P, x, y, w);
    _slMover(P, 'lift', LIFT.x, LIFT.y - LIFT.travel / 2, LIFT.w, 0, LIFT.travel / 2, 0.014, 0);
    _slLedge(P, LIFT_TOP.x, LIFT_TOP.y, LIFT_TOP.w);
    for (const [x, y, w] of WEST) _slLedge(P, x, y, w);
    _slLedge(P, 1500, 490, 50); _slLedge(P, 1710, 490, 50);   // pit steps out
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0a0418');
    _slParallax(v, 0.1, (l, r) => {
      // Warp tunnel streaks converging on the seal
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 40; k++) {
        const a = _slHash(k) * Math.PI * 2, t = ((frameCount * 4 + k * 40) % 600) / 600;
        const cx = l + (r - l) * 0.75, cy = 200;
        const x0 = cx + Math.cos(a) * 900 * (1 - t), y0 = cy + Math.sin(a) * 500 * (1 - t);
        ctx.strokeStyle = `hsla(${270 + k * 3},90%,70%,${0.25 * t})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * 60, y0 + Math.sin(a) * 34); ctx.stroke();
      }
      ctx.restore();
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3800, v.x + v.w + 40);
    ctx.fillStyle = '#140a24'; ctx.fillRect(x0, -300, x1 - x0, 740);
    for (let px = Math.floor(x0 / 220) * 220; px < x1; px += 220) {
      ctx.fillStyle = '#1e1234'; ctx.fillRect(px, -300, 30, 740);
      ctx.strokeStyle = 'rgba(200,160,255,0.10)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let a = 0; a < 6; a++) ctx.lineTo(px + 110 + Math.cos(a * Math.PI / 3) * 40, 100 + Math.sin(a * Math.PI / 3) * 40); ctx.closePath(); ctx.stroke();
    }
    // Pit with the first mechanism
    if (_slVisible(v, 1400, 1800)) {
      ctx.fillStyle = '#0a0414'; ctx.fillRect(1500, 440, 260, 100);
      ctx.fillStyle = '#2a1e44'; ctx.fillRect(1500, 490, 50, 50); ctx.fillRect(1710, 490, 50, 50);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(1630, 540, 4, 1630, 540, 120); g.addColorStop(0, 'rgba(200,160,255,0.3)'); g.addColorStop(1, 'rgba(200,160,255,0)');
      ctx.fillStyle = g; ctx.fillRect(1500, 420, 260, 120); ctx.restore();
    }
    // West wall shelves
    for (const [x, y, w] of WEST) if (_slVisible(v, x, x + w)) { ctx.fillStyle = '#2a1e44'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = 'rgba(200,160,255,0.4)'; ctx.fillRect(x, y + 10, w, 2); }
    // Tower
    if (_slVisible(v, 2080, 2460)) for (const [x, y, w] of TOWER) {
      ctx.fillStyle = '#241838'; ctx.fillRect(x, y, w, 440 - y);
      ctx.fillStyle = '#3a2a5a'; ctx.fillRect(x, y, w, 6);
    }
    // Lift + top stop
    if (_slVisible(v, 2760, 3100)) {
      ctx.fillStyle = '#241838'; ctx.fillRect(LIFT.x - 10, 160, 8, 280); ctx.fillRect(LIFT.x + LIFT.w + 2, 160, 8, 280);
      const lf = _slPlat(currentArena, 'lift');
      if (lf) { ctx.fillStyle = '#3a2a5a'; ctx.fillRect(lf.x, lf.y, lf.w, 10); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,160,255,0.35)'; ctx.fillRect(lf.x + 8, lf.y + 10, lf.w - 16, 3); ctx.restore(); }
      ctx.fillStyle = '#2a1e44'; ctx.fillRect(LIFT_TOP.x, LIFT_TOP.y, LIFT_TOP.w, 10);
    }
    // The Creator's seal: a hex mark in segments, one lit per solved mechanism
    if (_slVisible(v, SEAL - 300, SEAL + 400)) {
      const solved = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
      ctx.fillStyle = '#0e0618'; ctx.fillRect(SEAL - 40, 440 - 380, 340, 380);
      ctx.fillStyle = '#2a1e44'; ctx.fillRect(SEAL - 60, 440 - 400, 380, 24);
      const cx = SEAL + 130, cy = 440 - 200, R = 110;
      for (let s = 0; s < 6; s++) {
        const lit = s < Math.round(solved * 6 / 4);
        ctx.save();
        if (lit) { ctx.shadowColor = '#ffd890'; ctx.shadowBlur = 14; }
        ctx.strokeStyle = lit ? '#ffe0a0' : 'rgba(200,160,255,0.35)'; ctx.lineWidth = lit ? 5 : 3;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(s * Math.PI / 3) * R, cy + Math.sin(s * Math.PI / 3) * R); ctx.lineTo(cx + Math.cos((s + 1) * Math.PI / 3) * R, cy + Math.sin((s + 1) * Math.PI / 3) * R); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(200,160,255,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let a = 0; a < 6; a++) ctx.lineTo(cx + Math.cos(a * Math.PI / 3) * 50, cy + Math.sin(a * Math.PI / 3) * 50); ctx.closePath(); ctx.stroke();
    }
  }

  const ZONES = [{ x0: -200, x1: 4000, kind: 'tile', face: 'concrete' }];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[27] = {
    sky: ['#0a0418', '#1a0a30'],
    groundColor: '#0e0618',
    platColor: '#241838',
    floor, layout, backdrop, back, surface,
  };
})();
