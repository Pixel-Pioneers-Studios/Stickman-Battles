'use strict';
// js/story/levels/ch117.js — Chapter 117 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 117 — Thirty-Four Frames (Trial of Self-Knowledge, one screen)
// The Standing Tide: a tidal flat where "the water in front of you stood up
// and took your shape". The sea here doesn't move the way water should. Its
// surface hangs in still sheets; around the edges of the flat the water
// stands in walls, each one holding a faint reflection that lags behind
// everything in the arena by a beat. The rocks are the coast arena's own
// layout (the mirror's pathing is tuned on it). The flat is mirror-wet:
// everything above it is reflected below the floor line, a fraction late.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460;
  const LAG = new WeakMap();                       // fighter → recent feet positions
  const ROCKS = [[220, 340, 150, 16], [600, 330, 150, 16], [400, 240, 160, 16], [240, 160, 110, 14], [660, 170, 110, 14]];

  function platforms() {
    const P = [{ x: -60, y: G, w: 1020, h: 60, isFloor: true, noDraw: true }];
    for (const [x, y, w, h] of ROCKS) P.push({ x, y, w, h, noDraw: true });
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020614');
    _slTimeSea(v, 300);
    // Walls of standing water at both edges
    for (const [x, w] of [[-60, 120], [840, 120]]) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, 'rgba(90,140,200,0.10)'); g.addColorStop(0.5, 'rgba(140,190,240,0.28)'); g.addColorStop(1, 'rgba(90,140,200,0.10)');
      ctx.fillStyle = g; ctx.fillRect(x, 120, w, G - 120);
      ctx.strokeStyle = 'rgba(200,230,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let y = 120; y <= G; y += 20) ctx.lineTo(x + w / 2 + Math.sin(y * 0.05 + frameCount * 0.01) * 4, y);
      ctx.stroke();
    }
  }

  function back() {
    for (const [x, y, w, h] of ROCKS) {
      ctx.fillStyle = '#3e4044';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 12, y + h + 10); ctx.quadraticCurveTo(x + w / 2, y + h + 26, x + 12, y + h + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a5c62'; ctx.fillRect(x, y, w, 3);
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') { ctx.fillStyle = '#3a4250'; ctx.fillRect(-60, G - 10, 1020, 10); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 220); g.addColorStop(0, '#1a2a40'); g.addColorStop(1, '#020614');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    // Mirror-wet flat: fighters reflected below the line, a beat late
    ctx.save(); ctx.beginPath(); ctx.rect(-60, G, 1020, 120); ctx.clip();
    for (const p of (typeof players !== 'undefined' ? players : [])) {
      if (!p || p.health <= 0) continue;
      if (!LAG.has(p)) LAG.set(p, []);
      const lag = LAG.get(p); lag.push([p.cx(), p.y + p.h]); if (lag.length > 12) lag.shift();
      const [rx, ry] = lag[0], d = G - ry;
      ctx.fillStyle = 'rgba(140,190,240,0.18)'; ctx.fillRect(rx - 10, G + d, 20, 70);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(200,230,255,0.45)'; ctx.fillRect(-60, G, 1020, 1.5);
  }

  STORY_LEVELS[117] = {
    sky: ['#020614', '#06102a', '#0e1c3a'],
    groundColor: '#1a2a40',
    platColor: '#3e4044',
    sceneX: 450,
    arena: { base: 'storyCoast', platforms },
    backdrop, back, surface,
  };
})();
