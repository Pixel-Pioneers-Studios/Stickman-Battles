'use strict';
// js/story/levels/ch62.js — Chapter 62 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 62 — Aftermath (scavenge, 5 components)
// The fallback workshop, where Veran salvages the fourth step. "Interference
// units are erasing them — move fast." A long workshop shed: benches, a
// travelling crane, a coolant tank sunk in the floor, crate stacks, a gantry
// under the roof. Each component sits on one of them (positions mirrored in
// the chapter's scavengeItemDefs): the blueprint on the drafting table, the
// conduit on the crane hook three climbs up, the catalyst at the bottom of
// the tank pit, the resonance core on top of the crates, the shard on the
// gantry. The erasure wave shows on the far wall — a white edge eating the
// shed from the left as the clock runs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const FLOOR = [[0, 1800, 440], [1800, 2050, 500], [2050, 4000, 440]];
  const TABLE = [440, 360, 120];
  const CRANE = [[1050, 350, 100], [1170, 270, 100], [1280, 190, 110]];
  const CRATES = [[2600, 360, 90], [2690, 280, 90]];
  const GANTRY = [[3300, 350, 100], [3420, 260, 140]];
  const SPOTS = [[500, 330], [1335, 160], [1925, 470], [2735, 250], [3490, 230]];

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    _slLedge(P, ...TABLE);
    for (const L of [CRANE, CRATES, GANTRY]) for (const [x, y, w] of L) _slLedge(P, x, y, w);
    _slLedge(P, 1800, 470, 40); _slLedge(P, 2010, 470, 40);   // tank pit rungs
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0c0e16'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(4200, v.x + v.w + 40);
    // Shed walls: corrugated panels under a truss roof
    ctx.fillStyle = '#2a2c34'; ctx.fillRect(x0, 80, x1 - x0, 360);
    for (let px = Math.floor(x0 / 16) * 16; px < x1; px += 16) { ctx.fillStyle = px % 32 ? '#30323a' : '#26282e'; ctx.fillRect(px, 80, 8, 360); }
    ctx.strokeStyle = '#3a3c46'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, 80); ctx.lineTo(x1, 80); ctx.stroke();
    for (let px = Math.floor(x0 / 120) * 120; px < x1; px += 120) { ctx.beginPath(); ctx.moveTo(px, 80); ctx.lineTo(px + 60, 40); ctx.lineTo(px + 120, 80); ctx.stroke(); }
    // The erasure wave on the far wall, eating the shed from the left
    const wave = Math.min(3800, (frameCount % 36000) / 36000 * 3800);
    if (wave > x0) {
      ctx.fillStyle = 'rgba(235,238,250,0.16)'; ctx.fillRect(x0, 80, Math.min(wave, x1) - x0, 360);
      if (wave < x1) { ctx.fillStyle = 'rgba(245,248,255,0.6)'; ctx.fillRect(wave - 2, 80, 4, 360); }
    }
    // Drafting table
    if (_slVisible(v, 400, 600)) { const [x, y, w] = TABLE; ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x, y, w, 8); ctx.fillRect(x + 8, y + 8, 6, G - y - 8); ctx.fillRect(x + w - 14, y + 8, 6, G - y - 8); ctx.fillStyle = '#c8d8e8'; ctx.fillRect(x + 20, y - 3, 60, 3); }
    // Travelling crane: a beam along the roof, a hook, climbing struts
    if (_slVisible(v, 1000, 1450)) {
      ctx.fillStyle = '#c8a030'; ctx.fillRect(1000, 100, 440, 14);
      ctx.strokeStyle = '#6a6c76'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1335, 114); ctx.lineTo(1335, 186); ctx.stroke();
      for (const [x, y, w] of CRANE) { ctx.fillStyle = '#c8a030'; ctx.fillRect(x, y, w, 8); ctx.fillStyle = '#4a4c56'; ctx.fillRect(x + w / 2 - 4, y + 8, 8, G - y - 8); }
    }
    // Coolant tank sunk in the floor
    if (_slVisible(v, 1760, 2100)) {
      ctx.fillStyle = '#1a2a30'; ctx.fillRect(1800, 440, 250, 60);
      ctx.fillStyle = 'rgba(80,200,220,0.25)'; ctx.fillRect(1800, 486, 250, 14);
      ctx.fillStyle = '#4a4c56'; ctx.fillRect(1800, 470, 40, 6); ctx.fillRect(2010, 470, 40, 6);
    }
    // Crate stack
    if (_slVisible(v, 2560, 2820)) { _slCrate(2600, 360, 80, '#6a5438'); _slCrate(2690, 360, 80, '#5e4a30'); _slCrate(2690, 280, 80, '#6a5438'); }
    // Roof gantry
    for (const [x, y, w] of GANTRY) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#4a4c56'; ctx.fillRect(x, y, w, 8);
      ctx.strokeStyle = '#4a4c56'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, 80); ctx.moveTo(x + w - 6, y); ctx.lineTo(x + w - 6, 80); ctx.stroke();
    }
    // A work lamp over each component's spot
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [sx, sy] of SPOTS) {
      if (!_slVisible(v, sx - 60, sx + 60)) continue;
      const g = ctx.createRadialGradient(sx, sy - 10, 2, sx, sy - 10, 60);
      g.addColorStop(0, 'rgba(255,230,170,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 60, sy - 70, 120, 120);
    }
    ctx.restore();
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4200, kind: 'tunnel', face: 'concrete' }]); }

  STORY_LEVELS[62] = {
    sky: ['#0c0e16', '#1a1c26'],
    groundColor: '#14161c',
    platColor: '#4a4c56',
    floor, layout, backdrop, back, surface,
  };
})();
