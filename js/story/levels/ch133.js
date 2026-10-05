'use strict';
// js/story/levels/ch133.js — Chapter 133 map (story ARENA, gauntlet). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 133 — The First Creation (3-round gauntlet, one screen)
// The Memory Chamber: where the Creator keeps the oldest thing it made. The
// room is dim and old by this domain's standards — the white panels have
// yellowed, the lattice is hand-drawn rather than perfect. Memory frames hang
// in the dark around the walls, each showing one early, clumsy attempt at
// making something: a cube that doesn't close, a sphere with a dent, a stick
// figure with too many joints. In the centre, under glass, the first thing
// that worked: a single small, perfect ring, turning. The ledges keep the
// haunted arena's layout this chapter was built on.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 480;
  const LEDGES = [[345, 185, 210, 18], [130, 268, 155, 18], [615, 268, 155, 18], [18, 158, 112, 16], [770, 158, 112, 16]];
  const FRAMES = [[90, 60, 0], [250, 50, 1], [610, 50, 2], [770, 60, 3], [80, 340, 2], [800, 340, 0]];

  function platforms() {
    const P = [{ x: -60, y: G, w: 1020, h: 40, isFloor: true, noDraw: true }];
    for (const [x, y, w, h] of LEDGES) P.push({ x, y, w, h, noDraw: true });
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c0812');
    ctx.fillStyle = '#1a1420'; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, G - v.y + 10);
    // Yellowed panels, hand-drawn lattice
    for (let x = -40; x < 960; x += 120) { ctx.fillStyle = 'rgba(200,190,150,0.08)'; ctx.fillRect(x + 4, 20, 112, 440); }
    ctx.strokeStyle = 'rgba(200,190,150,0.15)'; ctx.lineWidth = 1;
    for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(-40, 30 + k * 32 + _slHash(k + 1330) * 6); ctx.lineTo(960, 30 + k * 32 + _slHash(k + 1331) * 10); ctx.stroke(); }
    // Memory frames: early, clumsy attempts
    for (const [x, y, k] of FRAMES) {
      ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 36, y, 72, 60); ctx.strokeStyle = '#8a7a58'; ctx.lineWidth = 2; ctx.strokeRect(x - 36, y, 72, 60);
      ctx.strokeStyle = 'rgba(220,210,180,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
      if (k === 0) { ctx.moveTo(x - 14, y + 44); ctx.lineTo(x - 14, y + 18); ctx.lineTo(x + 14, y + 18); ctx.lineTo(x + 14, y + 44); ctx.lineTo(x - 6, y + 44); }
      else if (k === 1) { ctx.arc(x, y + 30, 16, 0.4, Math.PI * 2 - 0.2); }
      else if (k === 2) { ctx.arc(x, y + 14, 4, 0, Math.PI * 2); ctx.moveTo(x, y + 18); ctx.lineTo(x + 4, y + 26); ctx.lineTo(x - 2, y + 34); ctx.lineTo(x + 3, y + 42); ctx.lineTo(x - 6, y + 52); ctx.moveTo(x + 3, y + 42); ctx.lineTo(x + 10, y + 52); }
      else { ctx.moveTo(x - 16, y + 46); ctx.lineTo(x, y + 14); ctx.lineTo(x + 18, y + 42); }
      ctx.stroke();
    }
    // The first thing that worked: a small, perfect ring under glass
    ctx.fillStyle = 'rgba(200,220,255,0.06)'; ctx.fillRect(420, 70, 60, 70); ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.strokeRect(420, 70, 60, 70);
    ctx.strokeStyle = '#f0e8c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(450, 105, 14, 14 * Math.abs(Math.cos(frameCount * 0.02)), 0, 0, Math.PI * 2); ctx.stroke();
  }

  function back() {
    for (const [x, y, w, h] of LEDGES) {
      ctx.fillStyle = '#3a3040'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(220,210,180,0.35)'; ctx.fillRect(x, y, w, 2);
      ctx.strokeStyle = 'rgba(200,190,150,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + h); ctx.lineTo(x + w / 2, y + h + 16); ctx.lineTo(x + w - 10, y + h); ctx.stroke();
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') { ctx.fillStyle = '#4a4050'; ctx.fillRect(-60, G - 10, 1020, 10); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 200); g.addColorStop(0, '#2a2230'); g.addColorStop(1, '#06040a');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    ctx.fillStyle = 'rgba(220,210,180,0.35)'; ctx.fillRect(-60, G, 1020, 1.5);
  }

  STORY_LEVELS[133] = {
    sky: ['#0c0812', '#1a1420', '#2a2230'],
    groundColor: '#2a2230',
    platColor: '#3a3040',
    sceneX: 450,
    arena: { base: 'haunted', platforms },
    backdrop, back, surface,
  };
})();
