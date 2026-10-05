'use strict';
// js/story/levels/ch63.js — Chapter 63 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 63 — Veran's Confession (puzzle, 3 sequence locks)
// Veran's research archive: fifteen years of one person's work. The walls are
// covered in pinned notes, photographs and red string; filing cabinets stack
// to the ceiling; her desk is buried under one lamp's worth of paper. The
// locks are out of spatial order (positions mirrored in puzzleSwitchDefs):
// 1 on top of the filing stacks, 2 on her desk, 3 on the middle shelf. In the
// centre of the wall, the first fracture event — a diagram she drew of the
// moment, with her own name circled underneath. Each lock lights more of it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const DESK = [540, 400, 140];
  const SHELF = [[1280, 350, 100], [1380, 260, 120]];
  const CABS = [[2040, 350, 100], [2140, 270, 100], [2240, 190, 110]];
  const DIAGRAM = 1000, CORE = 2650;

  function layout() {
    const P = [];
    _slLedge(P, ...DESK);
    for (const L of [SHELF, CABS]) for (const [x, y, w] of L) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#100c0a'); }

  function back(v) {
    const solved = (typeof puzzleStep !== 'undefined') ? puzzleStep : 0;
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3200, v.x + v.w + 40);
    // Walls of pinned notes and photographs, red string between them
    ctx.fillStyle = '#3a2e26'; ctx.fillRect(x0, 60, x1 - x0, 380);
    for (let k = Math.floor(x0 / 34); k * 34 < x1; k++) for (let r = 0; r < 8; r++) {
      const h = _slHash(k * 17 + r * 3);
      if (h < 0.35) continue;
      const nx = k * 34 + h * 10, ny = 80 + r * 44 + _slHash(k + r) * 10;
      ctx.fillStyle = h < 0.6 ? '#e8dfc8' : h < 0.8 ? '#d8d0e8' : '#c8b898';
      ctx.save(); ctx.translate(nx, ny); ctx.rotate((h - 0.6) * 0.3); ctx.fillRect(-11, -9, 22, 18);
      ctx.fillStyle = 'rgba(40,30,20,0.4)'; ctx.fillRect(-8, -5, 16, 1); ctx.fillRect(-8, -1, 12, 1); ctx.fillRect(-8, 3, 14, 1);
      ctx.fillStyle = '#cc3333'; ctx.fillRect(-1, -10, 2, 2); ctx.restore();
    }
    ctx.strokeStyle = 'rgba(200,40,40,0.6)'; ctx.lineWidth = 1;
    for (let k = Math.floor(x0 / 120); k * 120 < x1; k++) { ctx.beginPath(); ctx.moveTo(k * 120 + 10, 90 + _slHash(k) * 200); ctx.lineTo(k * 120 + 130, 90 + _slHash(k + 1) * 200); ctx.stroke(); }
    // Her desk and lamp
    if (_slVisible(v, 500, 720)) {
      const [x, y, w] = DESK;
      ctx.fillStyle = '#5a3e2a'; ctx.fillRect(x, y, w, 10); ctx.fillRect(x + 8, y + 10, 10, G - y - 10); ctx.fillRect(x + w - 18, y + 10, 10, G - y - 10);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = '#e8dfc8'; ctx.fillRect(x + 20 + k * 16, y - 2 - k % 3 * 2, 20, 3); }
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + 110, y - 40, 3, 40); ctx.fillRect(x + 100, y - 44, 22, 8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x + 111, y - 30, 2, x + 111, y - 30, 90); g.addColorStop(0, 'rgba(255,220,150,0.4)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(x + 20, y - 120, 190, 160); ctx.restore();
    }
    // Middle shelf of binders
    for (const [x, y, w] of SHELF) if (_slVisible(v, x - 10, x + w + 10)) _slBookshelf(x, y, w, G - y, '#4a3424');
    // Filing cabinets stacked to the ceiling
    for (const [x, y, w] of CABS) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#5a6068'; ctx.fillRect(x, y, w, G - y);
      for (let dy = y + 8; dy < G - 10; dy += 30) { ctx.fillStyle = '#4a5058'; ctx.fillRect(x + 6, dy, w - 12, 24); ctx.fillStyle = '#8a9098'; ctx.fillRect(x + w / 2 - 8, dy + 10, 16, 3); }
    }
    // The first fracture event, as she drew it — lit a piece per lock
    if (_slVisible(v, DIAGRAM - 200, DIAGRAM + 200)) {
      ctx.fillStyle = '#e8dfc8'; ctx.fillRect(DIAGRAM - 150, 100, 300, 220);
      ctx.strokeStyle = '#3a2e26'; ctx.lineWidth = 2;
      if (solved >= 1) { ctx.beginPath(); ctx.arc(DIAGRAM, 190, 50, 0, Math.PI * 2); ctx.stroke(); }
      if (solved >= 2) { ctx.beginPath(); ctx.moveTo(DIAGRAM - 50, 190); ctx.lineTo(DIAGRAM - 10, 170); ctx.lineTo(DIAGRAM + 5, 205); ctx.lineTo(DIAGRAM + 50, 185); ctx.stroke(); }
      if (solved >= 3) {
        ctx.fillStyle = '#3a2e26'; ctx.font = 'italic 12px Georgia'; ctx.textAlign = 'center'; ctx.fillText('origin: V.', DIAGRAM, 280);
        ctx.strokeStyle = '#cc3333'; ctx.beginPath(); ctx.ellipse(DIAGRAM, 276, 40, 14, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#3a2e26'; ctx.font = '10px Georgia'; ctx.textAlign = 'center'; ctx.fillText('FIRST FRACTURE — 15 yrs', DIAGRAM, 120);
    }
    // The research core
    if (_slVisible(v, CORE - 120, CORE + 120)) {
      ctx.fillStyle = '#2a2420'; ctx.fillRect(CORE - 60, 300, 120, 140);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(150,200,255,${0.25 + 0.1 * solved})`; ctx.fillRect(CORE - 46, 314, 92, 112); ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3200, kind: 'parquet', face: 'concrete' }]); }

  STORY_LEVELS[63] = {
    sky: ['#100c0a', '#2a201a'],
    groundColor: '#1a1410',
    platColor: '#5a3e2a',
    layout, backdrop, back, surface,
  };
})();
