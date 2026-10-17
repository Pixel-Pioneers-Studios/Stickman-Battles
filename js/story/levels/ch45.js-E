'use strict';
// js/story/levels/ch45.js — Chapter 45 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 45 — Third Architect's Doubt (puzzle, 4 calculation nodes)
// The Third Architect's probability engine: a hall-sized machine of frost
// glass and nested gyroscope rings, every ring etched with odds. The four
// calculation nodes are spread through its height (positions mirrored in the
// chapter's puzzleSwitchDefs) and the order zig-zags: 1 on the floor dais at
// the engine's base, 2 on top of the gyroscope tower, 3 back on the west
// gallery, 4 on the lift's top stop. The read-out over the seal shows the
// survival estimate — it climbs with every node, and stops at fourteen.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const GALLERY = [[300, 350, 100], [420, 270, 140]];
  const TOWER = [[2200, 350, 90], [2300, 270, 90], [2390, 190, 110]];
  const LIFT = { x: 2800, y: 320, w: 90, travel: 60 };
  const LIFT_TOP = { x: 2920, y: 210, w: 140 };
  const DAIS = 1300, GYRO = 2340, SEAL = 3350;

  function layout() {
    const P = [];
    for (const [x, y, w] of GALLERY) _slLedge(P, x, y, w);
    for (const [x, y, w] of TOWER) _slLedge(P, x, y, w);
    _slMover(P, 'lift45', LIFT.x, LIFT.y, LIFT.w, 0, LIFT.travel, 0.014, 0);
    _slLedge(P, LIFT_TOP.x, LIFT_TOP.y, LIFT_TOP.w);
    _slLedge(P, DAIS - 70, G - 20, 140);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#081420');
    _slParallax(v, 0.08, (l, r) => {
      ctx.fillStyle = 'rgba(200,230,255,0.5)';
      for (let i = Math.floor(l / 30); i * 30 < r; i++) if (_slHash(i + 45) < 0.25) ctx.fillRect(i * 30 + _slHash(i) * 20, -200 + _slHash(i + 3) * 600, 1.2, 1.2);
    });
  }

  function ring(cx, cy, rx, ry, rot, label) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(170,215,245,0.55)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(220,240,255,0.6)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.fillText(label[k % label.length], Math.cos(a) * rx, Math.sin(a) * ry + 3); }
    ctx.restore();
  }

  function back(v, a) {
    const solved = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3800, v.x + v.w + 40);
    // The machine hall: frost-glass panels in a steel lattice
    ctx.fillStyle = '#122030'; ctx.fillRect(x0, -300, x1 - x0, 740);
    for (let px = Math.floor(x0 / 160) * 160; px < x1; px += 160) {
      ctx.fillStyle = 'rgba(160,210,240,0.08)'; ctx.fillRect(px + 8, -300, 144, 740);
      ctx.fillStyle = '#1e3044'; ctx.fillRect(px, -300, 8, 740);
    }
    // West gallery
    for (const [x, y, w] of GALLERY) if (_slVisible(v, x - 10, x + w + 10)) { ctx.fillStyle = '#4a6a88'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = '#2a3e54'; ctx.fillRect(x + 10, y + 10, 8, G - y - 10); }
    // Floor dais at the engine's base
    if (_slVisible(v, DAIS - 120, DAIS + 120)) { ctx.fillStyle = '#4a6a88'; ctx.fillRect(DAIS - 70, G - 20, 140, 20); ctx.fillStyle = '#c8e4f8'; ctx.fillRect(DAIS - 70, G - 22, 140, 3); }
    // Gyroscope tower: nested rings turning around the stepped core
    if (_slVisible(v, GYRO - 400, GYRO + 400)) {
      for (const [x, y, w] of TOWER) { ctx.fillStyle = '#2a3e54'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#c8e4f8'; ctx.fillRect(x, y, w, 4); }
      const t = frameCount * 0.01;
      ring(GYRO, 160, 260, 70, t, ['p=.31', 'p=.07', 'p=.14', 'p=.02']);
      ring(GYRO, 160, 200, 120, -t * 1.3, ['812', '813', '814']);
      ring(GYRO, 160, 140, 140, t * 0.7 + 1, ['Ω', 'Δ', 'ψ']);
    }
    // Lift rails and top stop
    if (_slVisible(v, LIFT.x - 40, LIFT_TOP.x + LIFT_TOP.w + 20)) {
      ctx.fillStyle = '#2a3e54'; ctx.fillRect(LIFT.x - 10, 200, 8, 240); ctx.fillRect(LIFT.x + LIFT.w + 2, 200, 8, 240);
      const lf = _slPlat(a, 'lift45');
      if (lf) { ctx.fillStyle = '#4a6a88'; ctx.fillRect(lf.x, lf.y, lf.w, 10); ctx.fillStyle = 'rgba(200,235,255,0.5)'; ctx.fillRect(lf.x + 8, lf.y + 10, lf.w - 16, 2); }
      ctx.fillStyle = '#4a6a88'; ctx.fillRect(LIFT_TOP.x, LIFT_TOP.y, LIFT_TOP.w, 10);
      ctx.fillStyle = '#2a3e54'; ctx.fillRect(LIFT_TOP.x + LIFT_TOP.w - 20, LIFT_TOP.y + 10, 10, G - LIFT_TOP.y - 10);
    }
    // The seal and its read-out: the survival estimate climbs with each node
    if (_slVisible(v, SEAL - 200, SEAL + 200)) {
      ctx.fillStyle = '#1e3044'; ctx.fillRect(SEAL - 110, 200, 220, 240);
      ctx.strokeStyle = '#c8e4f8'; ctx.lineWidth = 3; ctx.strokeRect(SEAL - 110, 200, 220, 240);
      const pct = [0, 3, 7, 11, 14][Math.min(4, solved)];
      ctx.fillStyle = 'rgba(200,235,255,0.15)'; ctx.fillRect(SEAL - 90, 110, 180, 70);
      ctx.fillStyle = '#c8e4f8'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText(pct + '%', SEAL, 156);
      ctx.font = '9px monospace'; ctx.fillText('P(bearer survives closure)', SEAL, 174);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k < solved ? '#88f0ff' : '#2a3e54'; ctx.fillRect(SEAL - 80 + k * 44, 220, 30, 10); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3800, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[45] = {
    sky: ['#081420', '#1a3048'],
    groundColor: '#0e1a28',
    platColor: '#4a6a88',
    layout, backdrop, back, surface,
  };
})();
