'use strict';
// js/story/levels/ch65.js — Chapter 65 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 65 — The Constant (assassination, scrolling)
// The Creator's signal station, cut into a cavern of the interference layer.
// "The signal anchor is broadcasting your position to every construct." The
// station climbs the cave wall in catwalk tiers strung between rock shelves,
// with dish arrays and cable runs everywhere; the Signal Anchor holds the
// broadcast dais at the far end under the main dish, and each pulse it sends
// rings out through the cave. The meter on the dish counts toward a lock on
// your position as the assassination timer runs. Late in the fight the rift
// entity's line — "You are the only thing that has not broken" — is etched
// into the rock where the light from the pulses catches it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const W = 2400, FLOOR = 470, DAIS = 2200;
  const WALKS = [[200, 360, 180], [480, 280, 140], [760, 360, 160], [1050, 250, 180], [1350, 350, 160], [1650, 270, 150], [1950, 360, 140]];

  function platforms() {
    const P = [{ x: -60, y: FLOOR, w: W + 120, h: 60, isFloor: true, noDraw: true }];
    for (const [x, y, w] of WALKS) _slLedge(P, x, y, w);
    _slLedge(P, DAIS - 80, 380, 160);
    return P;
  }

  function charge() {
    const ch = (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) || {};
    const total = ch.assassinationTimer || 5400;
    const left = (typeof assassinationTimer !== 'undefined') ? assassinationTimer : total;
    return Math.max(0, Math.min(1, 1 - left / total));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#06040a');
    _slParallax(v, 0.15, (l, r) => {
      // Cavern depths: stalactites and far rock
      ctx.fillStyle = '#100c16';
      for (let i = Math.floor(l / 70) - 1; i * 70 < r + 70; i++) {
        const x = i * 70 + _slHash(i + 65) * 30, h = 40 + _slHash(i + 66) * 120;
        ctx.beginPath(); ctx.moveTo(x - 20, -100); ctx.lineTo(x, -100 + h + 60); ctx.lineTo(x + 20, -100); ctx.fill();
      }
    });
  }

  function back(v) {
    const x0 = Math.max(-100, v.x - 40), x1 = Math.min(W + 100, v.x + v.w + 40);
    // The cave wall the station is built into
    ctx.fillStyle = '#1a1420'; ctx.fillRect(x0, 40, x1 - x0, FLOOR - 40);
    for (let k = Math.floor(x0 / 90); k * 90 < x1; k++) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.moveTo(k * 90, 40 + _slHash(k) * 60); ctx.lineTo(k * 90 + 50, 120 + _slHash(k + 1) * 200); ctx.lineTo(k * 90 + 20, FLOOR); ctx.lineTo(k * 90 - 10, FLOOR); ctx.fill();
    }
    // Cable runs along the wall
    ctx.strokeStyle = '#2a2232'; ctx.lineWidth = 3;
    for (let c = 0; c < 3; c++) { ctx.beginPath(); for (let x = Math.floor(x0 / 60) * 60; x <= x1; x += 60) ctx.lineTo(x, 110 + c * 40 + Math.sin(x * 0.01 + c) * 12); ctx.stroke(); }
    // Catwalk tiers on brackets, small dishes along them
    for (let i = 0; i < WALKS.length; i++) {
      const [x, y, w] = WALKS[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#3a3242'; ctx.fillRect(x, y, w, 8);
      ctx.strokeStyle = '#3a3242'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 30, y + 40); ctx.moveTo(x + w - 6, y + 8); ctx.lineTo(x + w - 30, y + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + w, y - 18); ctx.stroke();
      if (i % 2 === 0) _slDish(x + w / 2, y - 30, 16, 0.6);
    }
    // Broadcast pulses rippling out from the anchor's dais
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const t = ((frameCount + k * 45) % 180) / 180;
      ctx.strokeStyle = `rgba(220,90,200,${0.45 * (1 - t)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(DAIS, FLOOR - 260, 40 + t * 900, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // The etched line, where the pulse light catches the rock
    if (_slVisible(v, 1000, 1500)) {
      ctx.fillStyle = `rgba(230,200,255,${0.12 + 0.18 * Math.max(0, Math.sin(frameCount * 0.035))})`;
      ctx.font = 'italic 13px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('you are the only thing that has not broken', 1250, 150);
    }
    // The main dish over the dais, and the lock meter
    if (_slVisible(v, DAIS - 300, DAIS + 300)) {
      const c = charge();
      ctx.fillStyle = '#2a2232'; ctx.fillRect(DAIS - 8, FLOOR - 260, 16, 260);
      _slDish(DAIS, FLOOR - 280, 70, 0.8);
      ctx.fillStyle = '#3a3242'; ctx.fillRect(DAIS - 80, 380, 160, 10); ctx.fillStyle = '#2a2232'; ctx.fillRect(DAIS - 70, 390, 140, FLOOR - 390);
      ctx.fillStyle = '#100c16'; ctx.fillRect(DAIS - 70, FLOOR - 60, 140, 14);
      ctx.fillStyle = c > 0.8 ? '#ff4466' : '#dd66cc'; ctx.fillRect(DAIS - 68, FLOOR - 58, 136 * c, 10);
      ctx.fillStyle = '#f0d8f0'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('POSITION LOCK ' + Math.round(c * 100) + '%', DAIS, FLOOR - 66);
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-60, v.x - 20), x1 = Math.min(W + 60, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#2e2836'; ctx.fillRect(x0, FLOOR - 14, x1 - x0, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x0, FLOOR - 14, x1 - x0, 1.5);
      return;
    }
    // Deep fill: the camera zooms out to frame a fleeing target
    const g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 500);
    g.addColorStop(0, '#241e2a'); g.addColorStop(0.3, '#16121c'); g.addColorStop(1, '#0a080e');
    ctx.fillStyle = g; ctx.fillRect(x0 - 400, FLOOR, x1 - x0 + 800, 500);
    ctx.fillStyle = '#3a3242'; ctx.fillRect(x0, FLOOR, x1 - x0, 6);
  }

  STORY_LEVELS[65] = {
    sky: ['#06040a', '#140e1a'],
    groundColor: '#0a080e',
    platColor: '#3a3242',
    arena: { base: 'cave', platforms, props: { worldWidth: W, mapLeft: 0, mapRight: W, deathY: 640 } },
    backdrop, back, surface,
  };
})();
