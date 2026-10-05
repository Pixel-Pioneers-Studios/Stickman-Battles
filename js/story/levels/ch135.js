'use strict';
// js/story/levels/ch135.js — Chapter 135 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 135 — Purge Sequence (walk → duel vs the purge, 2 lives)
// The Purge Zone: a section of the domain built to flush things out. The walls
// are banks of materialization frames — tall violet outlines where soldiers
// are assembled — and every so often one fills in from the bottom up,
// flickering. Warning chevrons run along the ceiling and the light pulses red
// on a thirty-second cycle ("It always feels longer than it is"); a counter
// over the midpoint counts the sequence down. The midpoint is the flush
// chamber itself, floor grates on both sides. Stacked frame housings are the
// climbs; the cache shafts are the purge drains.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, FLUSH = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const DRAINS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, FLUSH - 340, 360, 100); _slLedge(P, FLUSH + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#c8c4d8'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    // Materialization frames; now and then one fills in from the bottom up
    for (let k = Math.floor(v.x / 90); k * 90 < v.x + v.w + 90; k++) {
      const x = k * 90 + 20, fill = ((frameCount + k * 97) % 600) / 600;
      ctx.strokeStyle = 'rgba(120,100,200,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x, 150, 50, G - 160);
      if (fill > 0.8) { const f = (fill - 0.8) / 0.2; ctx.fillStyle = `rgba(120,100,200,${0.25 + 0.2 * Math.sin(frameCount * 0.5)})`; ctx.fillRect(x, G - 10 - (G - 160) * f, 50, (G - 160) * f); }
    }
    // Warning chevrons and the red pulse on a thirty-second cycle
    const red = ((frameCount % 1800) / 1800);
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
    for (let x = Math.floor(v.x / 40) * 40; x < v.x + v.w + 40; x += 40) { ctx.fillStyle = (x / 40) % 2 ? '#d8b030' : '#1a0a30'; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x + 20, 44); ctx.lineTo(x + 40, 60); ctx.fill(); }
    ctx.fillStyle = `rgba(255,40,40,${0.06 + 0.06 * Math.sin(red * Math.PI * 60)})`; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
  }

  function back(v) {
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 5);
      ctx.strokeStyle = 'rgba(120,100,200,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + 10, y + 14, w - 20, G - y - 20);
    }
    if (_slVisible(v, FLUSH - 440, FLUSH + 440)) {
      const left = 30 - Math.floor((frameCount % 1800) / 60);
      ctx.fillStyle = '#1a0a30'; ctx.fillRect(FLUSH - 70, 90, 140, 50);
      ctx.fillStyle = '#ff5050'; ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.fillText('00:' + String(left).padStart(2, '0'), FLUSH, 126);
      for (const x of [FLUSH - 340, FLUSH + 240]) { ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, 360, 100, 5); }
    }
    for (const dx of DRAINS) if (_slVisible(v, dx - 70, dx + 70)) { ctx.fillStyle = '#d8b030'; for (let k = -2; k <= 2; k++) ctx.fillRect(dx - 70 + (k + 2) * 30, G - 3, 18, 3); }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]);
    if (ph === 'back' && _slVisible(v, FLUSH - 300, FLUSH + 300)) { ctx.fillStyle = 'rgba(40,20,60,0.5)'; for (let x = FLUSH - 280; x < FLUSH + 280; x += 24) ctx.fillRect(x, G - 10, 16, 3); }
  }

  STORY_LEVELS[135] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#b8b4c8',
    layout, backdrop, back, surface,
  };
})();
