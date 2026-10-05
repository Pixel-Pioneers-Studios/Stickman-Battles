'use strict';
// js/story/levels/ch131.js — Chapter 131 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 131 — Twin Enforcers (walk → duel vs the Twin Enforcers, 1 life)
// The Corridor of Forms, where "the architecture shifted" as they arrived.
// Plinths along the corridor carry the domain's primitive forms — a cube, a
// sphere, a prism, a ring — each slowly turning, each with its wireframe
// twin turning in exact step beside it ("They share a single coordination
// system"). At the midpoint the corridor becomes a hall built in perfect
// mirror symmetry about a bright centre line: two of everything, two arches,
// two standing marks, the Enforcers' formation built into the room. Plinths
// stacked in pairs are the climbs; the cache shafts are floor vents.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, HALL = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const FORMS = [[380, 0], [960, 1], [1520, 2], [2050, 3], [3450, 0], [4000, 1], [4400, 2], [4950, 3], [5450, 0]];
  const VENTS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, HALL - 340, 360, 100); _slLedge(P, HALL + 240, 360, 100);
    return P;
  }

  function form(x, y, kind, t, solid) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = solid ? '#2a1048' : 'rgba(120,100,200,0.7)'; ctx.fillStyle = solid ? '#b8b4c8' : 'rgba(0,0,0,0)'; ctx.lineWidth = 2;
    if (kind === 0) { ctx.rotate(t); ctx.beginPath(); ctx.rect(-18, -18, 36, 36); }
    else if (kind === 1) { ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.moveTo(-20, 0); ctx.ellipse(0, 0, 20, 20 * Math.abs(Math.cos(t)), 0, 0, Math.PI * 2); }
    else if (kind === 2) { ctx.rotate(t); ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(20, 14); ctx.lineTo(-20, 14); ctx.closePath(); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, 22, 22 * Math.abs(Math.sin(t)), 0, 0, Math.PI * 2); }
    if (solid) ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
    for (let x = Math.floor(v.x / 120) * 120; x < v.x + v.w + 120; x += 120) { ctx.fillStyle = '#c4c0d4'; ctx.fillRect(x, 60, 3, G - 60); }
  }

  function back(v) {
    const t = frameCount * 0.015;
    for (const [x, kind] of FORMS) if (_slVisible(v, x - 80, x + 80)) {
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x - 60, G - 60, 50, 60); ctx.fillRect(x + 10, G - 60, 50, 60);
      form(x - 35, G - 100, kind, t, true); form(x + 35, G - 100, kind, t, false);
    }
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + w - 8, y, 8, G - y);
    }
    // The mirror hall: two of everything about a bright centre line
    if (_slVisible(v, HALL - 440, HALL + 440)) {
      for (const s of [-1, 1]) {
        const ax = HALL + s * 160;
        ctx.strokeStyle = '#2a1048'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(ax - 60, G); ctx.lineTo(ax - 60, 200); ctx.arc(ax, 200, 60, Math.PI, 0); ctx.lineTo(ax + 60, G); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,100,200,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(ax - 22, G - 12, 44, 10);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(230,220,255,0.6)'; ctx.fillRect(HALL - 1, 60, 2, G - 60); ctx.restore();
      for (const x of [HALL - 340, HALL + 240]) { ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, 360, 100, 5); }
    }
    for (const vx of VENTS) if (_slVisible(v, vx - 70, vx + 70)) { ctx.fillStyle = '#7864c8'; ctx.fillRect(vx - 56, G - 4, 10, 4); ctx.fillRect(vx + 46, G - 4, 10, 4); }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[131] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#b8b4c8',
    layout, backdrop, back, surface,
  };
})();
