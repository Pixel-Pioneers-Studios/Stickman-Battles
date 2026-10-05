'use strict';
// js/story/levels/ch102.js — Chapter 102 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 102 — The Unformed World (escape, run right)
// Null Space's entry: a world that has not finished deciding what it is. The
// ground comes in plates of half-rendered geometry, solid at the top and
// wireframe below, with short gaps where the next plate hasn't resolved. All
// around, blocks of architecture flicker between outline and solid, slide a
// few metres and stop; corridors of wireframe slide across the background
// ("Corridors rearrange without warning"). Two of the high plates drift as
// you watch. Overhead, the catalogue: a counter written on the sky that ticks
// as you move ("it's counting everything you do") under ENTRY 848. Behind the
// collapse wall the world un-renders back to grid. The Pattern Core at the
// end is a lattice cube turning in place.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const PLATES = [[0, 1000, 440], [1080, 1900, 430], [1980, 2800, 440], [2880, 3500, 425], [3580, 4200, 440]];
  const HIGH = [[600, 340, 110, 0, 0], [1300, 330, 110, 0, 0], [1430, 250, 110, 40, 0], [2400, 340, 110, 0, 0], [3100, 320, 110, 0, 18], [3250, 240, 110, 0, 0]];
  const CORE = 3880;

  function floor() { return PLATES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    HIGH.forEach(([x, y, w, ax, ay], i) => (ax || ay) ? _slMover(P, 'h' + i, x, y, w, ax, ay, 0.015, i) : _slLedge(P, x, y, w));
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04030c');
    // The grid the world is drawn on
    _slParallax(v, 0.2, (l, r) => {
      ctx.strokeStyle = 'rgba(120,110,220,0.10)'; ctx.lineWidth = 1;
      for (let x = Math.floor(l / 60) * 60; x < r + 60; x += 60) { ctx.beginPath(); ctx.moveTo(x, -200); ctx.lineTo(x, 520); ctx.stroke(); }
      for (let y = -200; y < 520; y += 60) { ctx.beginPath(); ctx.moveTo(l - 20, y); ctx.lineTo(r + 20, y); ctx.stroke(); }
      // Wireframe corridors sliding across the background
      for (let i = Math.floor(l / 400) - 1; i * 400 < r + 400; i++) {
        const x = i * 400 + ((frameCount * (0.2 + _slHash(i + 1020) * 0.4)) % 400), y = 140 + _slHash(i + 1021) * 160;
        ctx.strokeStyle = 'rgba(160,150,255,0.25)'; ctx.strokeRect(x, y, 220, 70);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30, y + 20); ctx.lineTo(x + 190, y + 20); ctx.lineTo(x + 220, y); ctx.stroke();
      }
    });
    // The catalogue counting you
    ctx.fillStyle = 'rgba(190,180,255,0.4)'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    ctx.fillText('ENTRY 848 · OBSERVATIONS ' + String(Math.floor(frameCount / 7) + (p1 ? Math.floor(p1.x) : 0)).padStart(7, '0'), v.x + v.w / 2, Math.max(v.y + 30, 40));
  }

  function back(v, a) {
    // Behind the collapse wall the world un-renders back to grid
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) { ctx.fillStyle = 'rgba(4,3,12,0.75)'; ctx.fillRect(v.x - 40, v.y - 40, wx - v.x + 40, v.h + 80); }
    // Architecture that hasn't decided: blocks flicker outline/solid and slide
    for (let k = Math.floor(v.x / 230) - 1; k * 230 < v.x + v.w + 230; k++) {
      if (k < 0 || k * 230 > 4200) continue;
      const solid = ((frameCount >> 5) + k) % 5 > 1;
      const x = k * 230 + 40 + Math.sin(frameCount * 0.004 + k) * 30, h = 90 + _slHash(k + 1022) * 180;
      if (solid) { ctx.fillStyle = '#1a1830'; ctx.fillRect(x, 440 - h - 30, 120, h); }
      ctx.strokeStyle = 'rgba(160,150,255,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x, 440 - h - 30, 120, h);
    }
    // High plates (two of them drift)
    HIGH.forEach(([x0, y0, w], i) => {
      const p = _slPlat(a, 'h' + i) || { x: x0, y: y0 };
      if (!_slVisible(v, p.x - 20, p.x + w + 20)) return;
      ctx.fillStyle = '#262440'; ctx.fillRect(p.x, p.y, w, 10);
      ctx.strokeStyle = 'rgba(160,150,255,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(p.x, p.y + 10, w, 26); ctx.beginPath(); ctx.moveTo(p.x, p.y + 36); ctx.lineTo(p.x + w, p.y + 10); ctx.stroke();
    });
    // The Pattern Core: a lattice cube turning in place
    if (_slVisible(v, CORE - 150, CORE + 150)) {
      const t = frameCount * 0.01, cy = 260, s = 60;
      const pts = [];
      for (const X of [-1, 1]) for (const Y of [-1, 1]) for (const Z of [-1, 1]) {
        const x1 = X * Math.cos(t) - Z * Math.sin(t), z1 = X * Math.sin(t) + Z * Math.cos(t);
        const y1 = Y * Math.cos(t * 0.7) - z1 * Math.sin(t * 0.7);
        pts.push([CORE + x1 * s, cy + y1 * s]);
      }
      ctx.strokeStyle = 'rgba(200,190,255,0.85)'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if ([1, 2, 4].includes(i ^ j)) { ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[j]); ctx.stroke(); }
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < PLATES.length; i++) {
      const [x0, x1, y] = PLATES[i];
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#262440'; ctx.fillRect(x0, y - 12, x1 - x0, 12); ctx.fillStyle = 'rgba(200,190,255,0.35)'; ctx.fillRect(x0, y - 12, x1 - x0, 1); continue; }
      // Solid at the top, wireframe below
      ctx.fillStyle = '#1a1830'; ctx.fillRect(x0, y, x1 - x0, 20);
      ctx.strokeStyle = 'rgba(160,150,255,0.4)'; ctx.lineWidth = 1;
      for (let x = Math.ceil(x0 / 40) * 40; x < x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x, y + 90); ctx.stroke(); }
      for (let yy = y + 20; yy <= y + 90; yy += 23) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(200,190,255,0.6)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
    }
  }

  STORY_LEVELS[102] = {
    sky: ['#04030c', '#080614', '#0c0a1e'],
    groundColor: '#04030c',
    platColor: '#262440',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
