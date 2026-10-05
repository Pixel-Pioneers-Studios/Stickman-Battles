'use strict';
// js/story/levels/ch41.js — Chapter 41 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 41 — The Third Key (scavenge, 4 shards)
// The sanctum's outer grove, where the Second Architect hid the closure
// protocol. Each shard sits somewhere a forest-dweller would hide a thing
// (positions mirrored in the chapter's scavengeItemDefs): the Extension
// Schema up on a high bough, the Anchor Blueprint down in a root vault (a
// sunken pit under the grove floor), the Fragment Log inside a hollow fallen
// log propped up on stumps, and the Fourth Step Data in the seed-pod archive
// hanging from the tallest tree — three climbs up. Glowing glyphs mark each
// hiding place once you're near; the patrols walk the grove floor.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 1000, 440], [1000, 1400, 500], [1400, 3400, 440]];
  const BOUGH = [[380, 350, 90], [490, 250, 120]];
  const LOG = { x: 1880, y: 280, w: 220 };
  const PODS = [[2640, 350, 100], [2760, 270, 100], [2860, 190, 120]];
  const EXTRA = [[1460, 340, 120], [700, 350, 100]];
  const SHARDS = [[540, 220], [1200, 470], [2020, 250], [2920, 160]];

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const L of [BOUGH, PODS, EXTRA]) for (const [x, y, w] of L) _slLedge(P, x, y, w);
    _slLedge(P, LOG.x - 110, 360, 90);      // stump step up to the log
    _slLedge(P, LOG.x, LOG.y, LOG.w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0a1405');
    _slParallax(v, 0.15, (l, r) => {
      for (let i = Math.floor(l / 120) - 1; i * 120 < r + 120; i++) {
        const x = i * 120 + _slHash(i + 8) * 50;
        ctx.fillStyle = '#16240e'; ctx.fillRect(x, -300, 30 + _slHash(i) * 20, 900);
        ctx.fillStyle = '#1a2e10'; ctx.beginPath(); ctx.ellipse(x + 20, -40 + _slHash(i + 2) * 120, 90, 50, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function back(v) {
    // High bough off a grove tree
    if (_slVisible(v, 300, 700)) {
      ctx.fillStyle = '#2a2016'; ctx.fillRect(330, v.y - 20, 60, 460 - v.y + 20);
      for (const [x, y, w] of BOUGH) { ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = '#2a4a22'; ctx.beginPath(); ctx.ellipse(x + w / 2, y - 18, w * 0.6, 22, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // Root vault: roots arching over the sunken pit
    if (_slVisible(v, 960, 1440)) {
      ctx.fillStyle = '#140e08'; ctx.fillRect(1000, 440, 400, 60);
      ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 12;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(990 + k * 30, 440); ctx.quadraticCurveTo(1200, 330 + k * 20, 1410 - k * 30, 440); ctx.stroke(); }
    }
    // Hollow fallen log on stumps
    if (_slVisible(v, LOG.x - 140, LOG.x + LOG.w + 40)) {
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(LOG.x - 110, 360, 90, 80); ctx.fillRect(LOG.x + LOG.w - 60, LOG.y + 30, 50, 440 - LOG.y - 30);
      ctx.fillStyle = '#4a3622'; ctx.fillRect(LOG.x - 112, 356, 94, 6);
      ctx.fillStyle = '#4a3622'; ctx.beginPath(); ctx.ellipse(LOG.x + LOG.w / 2, LOG.y + 16, LOG.w / 2, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.ellipse(LOG.x + LOG.w - 4, LOG.y + 16, 8, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
      for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.moveTo(LOG.x + k * 30, LOG.y + 2); ctx.lineTo(LOG.x + k * 30 + 6, LOG.y + 32); ctx.stroke(); }
    }
    // Seed-pod archive: hanging pods off the tallest tree, platforms of woven root
    if (_slVisible(v, 2560, 3100)) {
      ctx.fillStyle = '#2a2016'; ctx.fillRect(3000, v.y - 20, 80, 460 - v.y + 20);
      for (const [x, y, w] of PODS) {
        ctx.fillStyle = '#4a3a24'; ctx.fillRect(x, y, w, 8);
        ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2 + 40, v.y - 10); ctx.stroke();
      }
      for (let k = 0; k < 6; k++) {
        const px = 2680 + k * 60, py = 120 + _slHash(k) * 60 + Math.sin(frameCount * 0.02 + k) * 4;
        ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py - 20); ctx.lineTo(px, v.y - 10); ctx.stroke();
        ctx.fillStyle = '#6a7a3a'; ctx.beginPath(); ctx.ellipse(px, py, 10, 18, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const [x, y, w] of EXTRA) if (_slVisible(v, x - 10, x + w + 10)) { ctx.fillStyle = '#3a2c1c'; ctx.fillRect(x, y, w, 10); ctx.fillStyle = '#2a2016'; ctx.fillRect(x + w / 2 - 6, y + 10, 12, 440 - y - 10); }
    // Glyphs marking each hiding place
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [sx, sy] of SHARDS) {
      if (!_slVisible(v, sx - 60, sx + 60)) continue;
      ctx.strokeStyle = `rgba(150,255,150,${0.25 + 0.2 * Math.sin(frameCount * 0.05 + sx)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy - 6, 26, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 3600, kind: 'lawn', face: 'soil' }]); }

  STORY_LEVELS[41] = {
    sky: ['#0a1405', '#1e2a0e'],
    groundColor: '#122010',
    platColor: '#1e3018',
    floor, layout, backdrop, back, surface,
  };
})();
