'use strict';
// js/story/levels/ch66.js — Chapter 66 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 66 — Laboratory Infiltration (walk → duel vs the Lab Guardian)
// An abandoned facility "buried beneath a collapsed district." The walk is
// Axiom's main corridor: poured concrete, ceiling pipes, fluorescent tubes
// that flicker or are dead, hazard stripes, observation windows onto empty
// test rigs. Terminals along the wall still show the logs — "Axiom War —
// Phase 1 — Fracture Acceleration ... Authorized by: the Creator." The
// guardian waits in the test arena at the midpoint, under an observation
// gallery. Past it, the cell block: doors standing open. Equipment racks and
// gallery stairs are the climbs; the cache shafts are maintenance hatches.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, ARENA = 3000, CELLS = 4900;
  const RACK = [[420, 350, 100], [540, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                [3660, 350, 100], [3780, 270, 110]];
  const TERMS = [[700, 'AXIOM WAR — PHASE 1'], [1500, 'FRACTURE ACCELERATION'], [2450, 'WEAPONIZE DECAY'], [3500, 'RIVAL BRANCHES: DESTABILIZE'], [4200, 'AUTHORIZED: THE CREATOR']];
  const HATCH = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of RACK) _slLedge(P, x, y, w);
    _slLedge(P, ARENA - 340, 360, 100); _slLedge(P, ARENA + 240, 360, 100);
    _slLedge(P, ARENA - 200, 250, 400);          // observation gallery
    for (let k = 0; k < 4; k++) _slLedge(P, CELLS + k * 160, G - 60, 50);   // cell bunks
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0c0c0e'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // Corridor: concrete panels, hazard stripe skirting, ceiling pipes
    ctx.fillStyle = '#3a3c3e'; ctx.fillRect(x0, 70, x1 - x0, 370);
    for (let px = Math.floor(x0 / 160) * 160; px < x1; px += 160) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px, 70, 3, 370); }
    for (let px = Math.floor(x0 / 40) * 40; px < x1; px += 40) { ctx.fillStyle = (px / 40) % 2 ? '#d8b030' : '#1a1a1a'; ctx.fillRect(px, G - 26, 40, 10); }
    ctx.fillStyle = '#26282a'; ctx.fillRect(x0, 40, x1 - x0, 34);
    ctx.fillStyle = '#5a5c60'; ctx.fillRect(x0, 78, x1 - x0, 8); ctx.fillStyle = '#6a4a3a'; ctx.fillRect(x0, 90, x1 - x0, 6);
    // Fluorescent tubes: some steady, some flickering, some dead
    for (let k = Math.floor(x0 / 260); k * 260 < x1; k++) {
      const h = _slHash(k + 66), on = h < 0.45 ? true : h < 0.75 ? ((frameCount + k * 37) % 97) > 8 : false;
      ctx.fillStyle = on ? '#e8f0e8' : '#4a4c4e'; ctx.fillRect(k * 260 + 60, 100, 90, 5);
      if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 105, 0, G); g.addColorStop(0, 'rgba(220,240,230,0.14)'); g.addColorStop(1, 'rgba(220,240,230,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(k * 260 + 60, 105); ctx.lineTo(k * 260 + 150, 105); ctx.lineTo(k * 260 + 220, G); ctx.lineTo(k * 260 - 10, G); ctx.fill(); ctx.restore(); }
    }
    // Observation windows onto empty test rigs
    for (let k = Math.floor(x0 / 520); k * 520 < x1; k++) {
      const wx = k * 520 + 260;
      if (Math.abs(wx - ARENA) < 600 || wx > CELLS - 200) continue;
      ctx.fillStyle = '#1a2224'; ctx.fillRect(wx - 90, 150, 180, 110);
      ctx.strokeStyle = '#5a5c60'; ctx.lineWidth = 4; ctx.strokeRect(wx - 90, 150, 180, 110);
      ctx.strokeStyle = 'rgba(160,200,190,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(wx - 30, 190, 60, 60); ctx.beginPath(); ctx.moveTo(wx, 160); ctx.lineTo(wx, 190); ctx.stroke();
    }
    // Terminals with the logs
    for (const [tx, txt] of TERMS) {
      if (!_slVisible(v, tx - 80, tx + 80)) continue;
      ctx.fillStyle = '#26282a'; ctx.fillRect(tx - 60, G - 120, 120, 94);
      ctx.fillStyle = '#0a1a10'; ctx.fillRect(tx - 52, G - 112, 104, 50);
      ctx.fillStyle = '#5aff8a'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText(txt, tx, G - 90);
      if ((frameCount >> 5) % 2) ctx.fillRect(tx - 48, G - 80, 6, 8);
    }
    // Equipment racks
    for (const [x, y, w] of RACK) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#4a4c50'; ctx.fillRect(x, y, w, G - y);
      for (let dy = y + 10; dy < G - 30; dy += 22) { ctx.fillStyle = '#2a2c2e'; ctx.fillRect(x + 6, dy, w - 12, 16); ctx.fillStyle = (dy + frameCount >> 4) % 3 ? '#3aaa5a' : '#aa3a3a'; ctx.fillRect(x + 10, dy + 6, 4, 4); }
    }
    for (const hx of HATCH) if (_slVisible(v, hx - 80, hx + 80)) { ctx.fillStyle = '#d8b030'; ctx.fillRect(hx - 66, G - 6, 20, 6); ctx.fillRect(hx + 46, G - 6, 20, 6); }
    // The test arena and its observation gallery
    if (_slVisible(v, ARENA - 600, ARENA + 600)) {
      ctx.fillStyle = '#2e3032'; ctx.fillRect(ARENA - 560, 70, 1120, 370);
      ctx.fillStyle = '#4a4c50'; ctx.fillRect(ARENA - 200, 250, 400, 10);
      ctx.fillStyle = 'rgba(160,200,190,0.18)'; ctx.fillRect(ARENA - 200, 150, 400, 100);
      ctx.strokeStyle = '#5a5c60'; ctx.lineWidth = 3; ctx.strokeRect(ARENA - 200, 150, 400, 100);
      ctx.fillStyle = '#3a3c3e'; ctx.fillRect(ARENA - 196, 260, 12, G - 260); ctx.fillRect(ARENA + 184, 260, 12, G - 260);
      ctx.strokeStyle = 'rgba(216,176,48,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ARENA, G, 260, Math.PI, 0); ctx.stroke();
      for (const sx of [ARENA - 340, ARENA + 240]) { ctx.fillStyle = '#4a4c50'; ctx.fillRect(sx, 360, 100, G - 360); }
      ctx.fillStyle = '#d8b030'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('TRIAL FLOOR 3 — SUBJECT UNDEFEATED', ARENA, 140);
    }
    // The cell block: doors standing open
    if (_slVisible(v, CELLS - 100, CELLS + 700)) {
      for (let k = 0; k < 4; k++) {
        const cx = CELLS + k * 160;
        ctx.fillStyle = '#26282a'; ctx.fillRect(cx - 20, G - 180, 120, 180);
        ctx.fillStyle = '#1a1c1e'; ctx.fillRect(cx - 10, G - 170, 100, 170);
        ctx.fillStyle = '#5a5c60'; ctx.fillRect(cx, G - 60, 50, 8);
        ctx.save(); ctx.translate(cx + 90, G - 170); ctx.transform(1, 0.25, 0, 1, 0, 0);
        ctx.fillStyle = '#4a4c50'; ctx.fillRect(0, 0, 24, 170);
        ctx.restore();
        ctx.fillStyle = '#d8b030'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('C-' + (k + 1), cx + 40, G - 186);
      }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[66] = {
    sky: ['#0c0c0e', '#1a1c1e'],
    groundColor: '#14161a',
    platColor: '#4a4c50',
    layout, backdrop, back, surface,
  };
})();
