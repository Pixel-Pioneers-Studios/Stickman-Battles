'use strict';
// js/story/levels/ch38.js — Chapter 38 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 38 — Residue (escape)
// "The chamber is destabilizing — fracture residue cascading from behind."
// The Quiet Chamber was where the rift entity kept what was left of itself:
// long galleries of pale stone, alcoves of sleeping fragment-light, silence.
// Now it's coming apart. The floor buckles into steps (each inside one jump,
// so the wall can be outrun), pillars lean and break into slanted ramps
// overhead, and slabs fall from the vault. Mid-run, the entity's voice
// carries through: "The fragment you're carrying — it's mine." Its old
// likeness is carved on the gallery wall there. The Stable Exit is a doorway
// still holding its shape at the far end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const PLATES = [
    [0, 700, 440], [700, 980, 410], [980, 1400, 440], [1400, 1560, 470], [1560, 2000, 440], [2000, 2200, 400],
    [2200, 2700, 440], [2700, 2860, 470], [2860, 3300, 440], [3300, 3480, 405], [3480, 4600, 440],
  ];
  // Broken pillars fallen across the gallery: slanted debris, standable tops
  const FALLEN = [[820, 300, 110], [1700, 320, 120], [2420, 320, 130], [3100, 320, 110], [3800, 320, 120]];
  const EXIT_X = 4250, LIKENESS = 2450;

  function floor() { return PLATES.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of FALLEN) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c0a10');
    _slParallax(v, 0.15, (l, r) => {
      // The vault far overhead, cracking open onto violet residue
      ctx.fillStyle = '#1a1620'; ctx.fillRect(l - 20, -300, r - l + 40, 360);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = Math.floor(l / 160); i * 160 < r; i++) {
        if (_slHash(i + 5) < 0.4) continue;
        ctx.strokeStyle = `rgba(170,110,255,${0.25 + 0.2 * Math.sin(frameCount * 0.05 + i)})`; ctx.lineWidth = 2;
        _slSkyCrack([[i * 160, -100], [i * 160 + 30, -20], [i * 160 + 10, 40], [i * 160 + 50, 60]], 0.6);
      }
      ctx.restore();
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(4800, v.x + v.w + 40);
    // Pale gallery wall with alcoves of sleeping fragment-light
    ctx.fillStyle = '#4a4652'; ctx.fillRect(x0, 60, x1 - x0, 380);
    for (let k = Math.floor(x0 / 180); k * 180 < x1; k++) {
      const ax = k * 180 + 60;
      if (Math.abs(ax - LIKENESS) < 200) continue;
      ctx.fillStyle = '#2a2830'; ctx.beginPath(); ctx.moveTo(ax, 380); ctx.lineTo(ax, 250); ctx.quadraticCurveTo(ax + 30, 210, ax + 60, 250); ctx.lineTo(ax + 60, 380); ctx.fill();
      const lit = _slHash(k + 3) < 0.5;
      if (lit) { ctx.fillStyle = `rgba(190,160,255,${0.35 + 0.2 * Math.sin(frameCount * 0.03 + k)})`; ctx.fillRect(ax + 26, 300, 8, 14); }
      // Cracks spreading through the wall
      ctx.strokeStyle = 'rgba(10,8,14,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ax + 90, 60); ctx.lineTo(ax + 104, 140 + _slHash(k) * 60); ctx.lineTo(ax + 92, 220 + _slHash(k + 1) * 80); ctx.stroke();
    }
    ctx.fillStyle = '#3a3640'; ctx.fillRect(x0, 54, x1 - x0, 10);
    // The entity's old likeness, carved: a fighter, fragment in its chest
    if (_slVisible(v, LIKENESS - 160, LIKENESS + 160)) {
      ctx.strokeStyle = '#4a4458'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(LIKENESS, 150, 22, 0, Math.PI * 2);
      ctx.moveTo(LIKENESS, 172); ctx.lineTo(LIKENESS, 270); ctx.moveTo(LIKENESS, 200); ctx.lineTo(LIKENESS - 50, 240); ctx.moveTo(LIKENESS, 200); ctx.lineTo(LIKENESS + 50, 240);
      ctx.moveTo(LIKENESS, 270); ctx.lineTo(LIKENESS - 30, 340); ctx.moveTo(LIKENESS, 270); ctx.lineTo(LIKENESS + 30, 340); ctx.stroke();
      ctx.fillStyle = `rgba(200,170,255,${0.5 + 0.3 * Math.sin(frameCount * 0.07)})`;
      ctx.beginPath(); ctx.moveTo(LIKENESS, 196); ctx.lineTo(LIKENESS + 7, 208); ctx.lineTo(LIKENESS, 220); ctx.lineTo(LIKENESS - 7, 208); ctx.fill();
    }
    // Fallen pillars, slanted across the gallery
    for (const [x, y, w] of FALLEN) {
      if (!_slVisible(v, x - 60, x + w + 60)) continue;
      ctx.fillStyle = '#3e3a46';
      ctx.beginPath(); ctx.moveTo(x - 50, 440); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 18, y + 22); ctx.lineTo(x - 20, 440); ctx.fill();
      ctx.fillStyle = '#4e4a58'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 1; k < 4; k++) ctx.fillRect(x + k * w / 4, y + 6, 2, 14);
    }
    // Slabs falling from the vault (decor: they shatter before reaching the floor)
    for (let k = 0; k < 6; k++) {
      const cyc = 160 + k * 23, t = (frameCount + k * 41) % cyc;
      const fx = (Math.floor((frameCount + k * 41) / cyc) * 977 + k * 613) % 4400 + 100;
      if (!_slVisible(v, fx - 30, fx + 30)) continue;
      const fy = 60 + t * t * 0.02;
      if (fy > 380) continue;
      ctx.fillStyle = '#4a4652'; ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * 0.04); ctx.fillRect(-14, -8, 28, 16); ctx.restore();
    }
    // The Stable Exit: a doorway still holding its shape
    if (_slVisible(v, EXIT_X - 200, EXIT_X + 200)) {
      ctx.fillStyle = '#3a3640'; ctx.fillRect(EXIT_X - 70, 240, 140, 200);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(EXIT_X, 260, EXIT_X, 440);
      g.addColorStop(0, 'rgba(220,240,255,0.7)'); g.addColorStop(1, 'rgba(160,200,255,0.25)');
      ctx.fillStyle = g; ctx.fillRect(EXIT_X - 50, 260, 100, 180);
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4800, kind: 'rubble', face: 'concrete' }]); }

  STORY_LEVELS[38] = {
    sky: ['#0c0a10', '#1e1826'],
    groundColor: '#14121a',
    platColor: '#3e3a46',
    floor, layout, backdrop, back, surface,
  };
})();
