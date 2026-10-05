'use strict';
// js/story/levels/ch142.js — Chapter 142 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 142 — The Last Request (assassination, scrolling)
// The Gate Threshold. The Gate Overseer is jamming the rift entity's final
// message: a tower of stacked transmitter rings at the far end of the
// threshold, each ring pulsing a wave of interference out across the space
// (the waves scramble the air — you can see the noise in them). The threshold
// is a series of white terraces climbing toward the gate, connected by
// lattice bridges, with the gate itself behind everything, sealed. A meter
// on the tower base counts down to the gate locking permanently as the
// assassination timer runs. Built on the null arena's neutral rules (the
// Creator arena would bring boss-floor behaviour with it).
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const W = 2200, FLOOR = 470, TOWER = 2020;
  const TERR = [[150, 380, 200], [430, 320, 160], [680, 380, 180], [950, 290, 160], [1230, 360, 180], [1500, 280, 160], [1760, 350, 160]];

  function platforms() {
    const P = [{ x: -60, y: FLOOR, w: W + 120, h: 60, isFloor: true, noDraw: true }];
    for (const [x, y, w] of TERR) _slLedge(P, x, y, w);
    _slLedge(P, TOWER - 80, 390, 160);
    return P;
  }

  function lockLeft() {
    const ch = (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) || {};
    const total = ch.assassinationTimer || 5400, left = (typeof assassinationTimer !== 'undefined') ? assassinationTimer : total;
    return Math.max(0, Math.min(1, left / total));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    // The gate behind everything, sealed
    _slParallax(v, 0.1, (l, r) => {
      const gx = 1100 * 0.1 + 450;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(gx - 200, 0, gx + 200, 0);
      g.addColorStop(0, 'rgba(230,220,255,0)'); g.addColorStop(0.5, 'rgba(240,235,255,0.35)'); g.addColorStop(1, 'rgba(230,220,255,0)');
      ctx.fillStyle = g; ctx.fillRect(gx - 200, -200, 400, 700); ctx.restore();
      ctx.strokeStyle = 'rgba(236,232,248,0.5)'; ctx.lineWidth = 4; ctx.strokeRect(gx - 180, -180, 360, 650);
    });
  }

  function back(v) {
    // Interference waves rolling out from the tower
    for (let k = 0; k < 4; k++) {
      const t = ((frameCount + k * 40) % 160) / 160;
      ctx.strokeStyle = `rgba(255,110,160,${0.35 * (1 - t)})`; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(TOWER, 200, 40 + t * 1000, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    // White terraces climbing toward the gate, lattice bridges between them
    for (let i = 0; i < TERR.length; i++) {
      const [x, y, w] = TERR[i];
      if (!_slVisible(v, x - 20, x + w + 120)) continue;
      const tg = ctx.createLinearGradient(0, y, 0, FLOOR); tg.addColorStop(0, '#b8b4cc'); tg.addColorStop(1, '#4a4068');
      ctx.fillStyle = tg; ctx.fillRect(x, y, w, FLOOR - y); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 5);
      if (i + 1 < TERR.length) { const [nx, ny] = TERR[i + 1]; ctx.strokeStyle = 'rgba(160,140,240,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w, y + 4); ctx.lineTo(nx, ny + 4); ctx.stroke(); }
    }
    // The jamming tower: stacked transmitter rings over a base with the lock meter
    if (_slVisible(v, TOWER - 200, TOWER + 200)) {
      ctx.fillStyle = '#2a1048'; ctx.fillRect(TOWER - 10, 100, 20, 290);
      for (let k = 0; k < 5; k++) { const pulse = Math.sin(frameCount * 0.15 + k) * 4; ctx.strokeStyle = '#ff7aa8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(TOWER, 130 + k * 50, 50 + pulse, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(TOWER - 80, 390, 160, FLOOR - 390); ctx.fillStyle = '#ece8f8'; ctx.fillRect(TOWER - 84, 386, 168, 8);
      const left = lockLeft();
      ctx.fillStyle = '#1a0a30'; ctx.fillRect(TOWER - 66, 420, 132, 14);
      ctx.fillStyle = left < 0.25 ? '#ff4466' : '#a088ff'; ctx.fillRect(TOWER - 64, 422, 128 * left, 10);
      ctx.fillStyle = '#1a0a30'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('GATE LOCK', TOWER, 414);
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-60, v.x - 20), x1 = Math.min(W + 60, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#d8d4e4'; ctx.fillRect(x0, FLOOR - 12, x1 - x0, 12); return; }
    // Deep fill: the camera zooms out to frame a fleeing target
    ctx.fillStyle = '#1a1030'; ctx.fillRect(x0 - 400, FLOOR, x1 - x0 + 800, 500);
    _slLattice(Math.floor((x0 - 400) / 20) * 20, FLOOR, x1 - x0 + 820, 200, 0.2, 20);
    ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x0, FLOOR, x1 - x0, 5);
  }

  STORY_LEVELS[142] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#ece8f8',
    arena: { base: 'storyNull', platforms, props: { worldWidth: W, mapLeft: 0, mapRight: W, deathY: 640 } },
    backdrop, back, surface,
  };
})();
