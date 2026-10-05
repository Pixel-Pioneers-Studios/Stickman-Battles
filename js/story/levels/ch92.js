'use strict';
// js/story/levels/ch92.js — Chapter 92 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 92 — The Ground Is a Suggestion (puzzle, 3 gravity nodes)
// The approach corridor to the Axis, unstable: its ground is broken into
// slabs floating at slightly different heights with short gaps between, and
// loose rubble hangs in the air over every gap. Three gravity nodes run the
// corridor — gyroscopes of stone rings on pedestals, each lock sitting on its
// pedestal at the height puzzleSwitchDefs gives it. Unactivated, a node's
// rings tumble on every axis and the rubble near it drifts; each one you
// activate locks its rings flat and pulls its rubble down into a neat stack.
// The Axis Core at the end is a sphere held between two stone horns. Floating
// slabs over the gaps are the high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const SLABS = [[0, 1040, 440], [1100, 1980, 430], [2040, 3400, 440]];
  const NODES = [[600, 390], [1500, 355], [2700, 370]];
  const HIGH = [[880, 330, 110], [1000, 250, 120], [1880, 320, 110], [2000, 250, 110], [2350, 340, 110]];
  const CORE = 3080;

  function floor() { return SLABS.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y] of NODES) _slLedge(P, x - 45, y, 90);
    _slLedge(P, 1400, 400, 50);                                      // step to node 2
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    return P;
  }

  const step = () => (typeof puzzleStep !== 'undefined' ? puzzleStep : 0);
  const base = x => { const s = SLABS.find(([a, b]) => x >= a && x < b); return s ? s[2] : 440; };

  function backdrop(v) {
    _slSkyAbove(v, '#0e1a26');
    _slParallax(v, 0.3, (l, r) => {
      ctx.fillStyle = '#2a2e2c';
      ctx.beginPath(); ctx.moveTo(l - 40, -400);
      for (let x = Math.floor(l / 40) * 40 - 40; x <= r + 40; x += 40) ctx.lineTo(x, 50 + _slHash(Math.floor(x / 40) + 920) * 40);
      ctx.lineTo(r + 40, -400); ctx.closePath(); ctx.fill();
    });
  }

  function node(x, y, on) {
    const b = base(x);
    ctx.fillStyle = '#3e3a36'; ctx.fillRect(x - 45, y, 90, b - y);
    ctx.fillStyle = '#6a6458'; ctx.fillRect(x - 49, y, 98, 5);
    const cy = y - 90;
    ctx.strokeStyle = on ? 'rgba(160,210,255,0.9)' : '#6a6458'; ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      const t = on ? 0 : frameCount * (0.02 + k * 0.013);
      ctx.beginPath(); ctx.ellipse(x, cy, 46 - k * 10, Math.abs(Math.cos(t + k)) * (46 - k * 10) + (on ? 6 : 2), on ? 0 : t * 0.7 + k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = on ? '#cfe6ff' : '#4a4640'; ctx.beginPath(); ctx.arc(x, cy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a4640'; ctx.fillRect(x - 3, cy + 8, 6, y - cy - 8);
    // The node's rubble: drifting while it's off, stacked once it's on
    for (let k = 0; k < 6; k++) {
      const s = 10 + _slHash(k + x) * 10;
      if (on) { ctx.fillStyle = '#4a4640'; ctx.fillRect(x + 60 + (k % 2) * 6, b - s - Math.floor(k / 2) * 14, s + 6, 12); }
      else { ctx.fillStyle = '#4a4640'; ctx.fillRect(x - 120 + _slHash(k + x + 1) * 240, cy - 60 + _slHash(k + x + 2) * 120 + Math.sin(frameCount * 0.03 + k) * 10, s, s * 0.7); }
    }
  }

  function back(v) {
    const n = step();
    NODES.forEach(([x, y], i) => { if (_slVisible(v, x - 130, x + 130)) node(x, y, i < n); });
    if (_slVisible(v, 1390, 1460)) { ctx.fillStyle = '#3e3a36'; ctx.fillRect(1400, 400, 50, 30); ctx.fillStyle = '#6a6458'; ctx.fillRect(1398, 400, 54, 4); }
    for (let i = 0; i < HIGH.length; i++) {
      const [x, y, w] = HIGH[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#4a4640';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 12, y + 18); ctx.lineTo(x + w * 0.5, y + 34); ctx.lineTo(x + 12, y + 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a6458'; ctx.fillRect(x, y, w, 4);
    }
    // The Axis Core held between two horns of stone
    if (_slVisible(v, CORE - 160, CORE + 160)) {
      ctx.fillStyle = '#4a4640';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(CORE + s * 40, 440); ctx.quadraticCurveTo(CORE + s * 110, 300, CORE + s * 50, 200); ctx.lineTo(CORE + s * 70, 210); ctx.quadraticCurveTo(CORE + s * 130, 320, CORE + s * 80, 440); ctx.fill(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CORE, 250, 6, CORE, 250, 70);
      g.addColorStop(0, `rgba(200,230,255,${n >= 3 ? 0.9 : 0.4})`); g.addColorStop(1, 'rgba(80,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(CORE - 70, 180, 140, 140);
      ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < SLABS.length; i++) {
      const [x0, x1, y] = SLABS[i];
      if (_slVisible(v, x0 - 20, x1 + 20)) _slIsland(x0, x1, y, 'ruins', ph, i * 92);
    }
  }

  STORY_LEVELS[92] = {
    sky: ['#0e1a26', '#1a2e40', '#2c4658'],
    groundColor: '#0e1a26',
    platColor: '#4a4640',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
