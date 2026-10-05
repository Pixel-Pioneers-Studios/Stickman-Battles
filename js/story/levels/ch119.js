'use strict';
// js/story/levels/ch119.js — Chapter 119 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 119 — The Shattered Ground (escape, run right)
// The Collision Realm's impact field, fracturing "under Thresh's weight".
// The ground is slabs of different worlds jammed together at different
// heights with gaps between them — a strip of road, a block of bedrock, a
// tiled floor — each split by glowing cracks. Debris rains from the sky in
// slow arcs and the air flashes orange where something hits far off ("the air
// isn't much better"). Behind the escape wall the slabs are breaking up and
// falling away. Wedged boulders and the ends of upturned slabs are the high
// routes. The Stable Core at the far end is the only thing not moving: a
// pillar of dark stone that the debris curves around.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const SLABS = [[0, 900, 440, 'rubble'], [960, 1600, 425, 'asphalt'], [1660, 2460, 445, 'rubble'], [2520, 3200, 430, 'tile'],
                 [3260, 3900, 440, 'rubble'], [3960, 4800, 435, 'asphalt']];
  const HIGH = [[600, 345, 110], [1300, 330, 110], [1430, 250, 110], [2100, 340, 110], [2850, 330, 110], [3550, 340, 110], [4300, 330, 110]];
  const CORE = 4500;

  function floor() { return SLABS.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#100400');
    // Debris raining in slow arcs; flashes where it lands far off
    _slParallax(v, 0.15, (l, r) => {
      for (let k = 0; k < 14; k++) {
        const t = ((frameCount * 0.5 + k * 61) % 300) / 300, x = l + _slHash(k + 1190) * (r - l) + t * 80;
        ctx.fillStyle = 'rgba(40,20,10,0.8)'; ctx.fillRect(x, -100 + t * 520, 8 + _slHash(k) * 10, 6 + _slHash(k + 1) * 8);
      }
      const fk = Math.floor(frameCount / 29);
      if (_slHash(fk + 119) < 0.4) {
        const fx = l + _slHash(fk * 5) * (r - l);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(fx, 400, 4, fx, 400, 120); g.addColorStop(0, 'rgba(255,170,80,0.45)'); g.addColorStop(1, 'rgba(255,100,30,0)');
        ctx.fillStyle = g; ctx.fillRect(fx - 120, 280, 240, 240); ctx.restore();
      }
    });
  }

  function back(v) {
    // Behind the wall the slabs break up and fall away
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    for (let k = 0; k < 10; k++) {
      const t = ((frameCount * 0.8 + k * 29) % 120) / 120, x = wx - 40 - _slHash(k + 1191) * 300;
      if (!_slVisible(v, x - 20, x + 20)) continue;
      ctx.fillStyle = `rgba(74,46,30,${1 - t})`; ctx.save(); ctx.translate(x, 430 + t * 200); ctx.rotate(t * 2 * (k % 2 ? 1 : -1)); ctx.fillRect(-12, -6, 24, 12); ctx.restore();
    }
    for (const [x, y, w] of HIGH) if (_slVisible(v, x - 20, x + w + 20)) {
      ctx.fillStyle = '#4a2e1e';
      ctx.beginPath(); ctx.moveTo(x + 6, 440); ctx.lineTo(x, y + 6); ctx.lineTo(x + w * 0.4, y - 4); ctx.lineTo(x + w, y + 4); ctx.lineTo(x + w - 10, 440); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a4a32'; ctx.fillRect(x, y, w, 3);
    }
    // The Stable Core: the debris curves around it
    if (_slVisible(v, CORE - 200, CORE + 200)) {
      ctx.fillStyle = '#1a0e08'; ctx.fillRect(CORE - 30, 120, 60, 320);
      ctx.strokeStyle = 'rgba(255,170,80,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(CORE, 120 + k * 60, 80 + k * 10, 20, 0, Math.PI, 0); ctx.stroke(); }
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, , kind] of SLABS) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      _slSurfaces(v, { platforms: (a.platforms || []).filter(p => p.isFloor && p.x === x0) }, ph, [{ x0, x1, kind, face: 'soil' }]);
      if (ph !== 'front') continue;
      // Glowing cracks through every slab
      ctx.strokeStyle = 'rgba(255,140,60,0.6)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < (x1 - x0) / 220; k++) {
        const cx = x0 + 60 + k * 220 + _slHash(k + x0) * 80, fy = (a.platforms || []).find(p => p.isFloor && p.x === x0);
        const y = fy ? fy.y : 440;
        ctx.beginPath(); _slJag(cx, y + 2, cx + 18, y + 90, 5, 8, 1192 + k + x0).forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
      }
    }
  }

  STORY_LEVELS[119] = {
    sky: ['#100400', '#241006', '#44200c'],
    groundColor: '#100400',
    platColor: '#4a2e1e',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
