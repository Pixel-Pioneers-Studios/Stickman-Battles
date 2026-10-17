'use strict';
// js/story/levels/ch106.js: Chapter 106 map (story ARENA). See smb-story-levels.js.

// Chapter 106, The Unseen Pattern (Trial of Sense: invisible foe, lantern).
// One sealed screen whose wall panels never settle. Dark and low on purpose, so the
// fight is read from the lantern's stale marks and the construct's signals.
(function () {
  const G = 460;
  const SLABS = [[100, 330, 140, 16], [660, 330, 140, 16], [370, 250, 160, 16], [170, 170, 120, 14], [610, 170, 120, 14]];

  function platforms() {
    const P = [{ x: -60, y: G, w: 1020, h: 60, isFloor: true, noDraw: true }];
    for (const [x, y, w, h] of SLABS) P.push({ x, y, w, h, noDraw: true });
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04030c');
    ctx.fillStyle = '#08061a'; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, G - v.y + 10);
    for (let k = 0; k < 9; k++) {
      const x = -40 + k * 120 + Math.sin(frameCount * 0.003 + k * 1.7) * 18, y = 30 + Math.cos(frameCount * 0.0025 + k) * 10;
      ctx.fillStyle = '#0e0c22'; ctx.fillRect(x, y, 104, 250);
      ctx.strokeStyle = 'rgba(120,110,200,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 103, 249);
    }
    ctx.fillStyle = 'rgba(170,160,240,0.18)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ENTRY 848 — TEST: WITHOUT SIGHT', 450, 22);
  }

  function back() {
    for (const [x, y, w, h] of SLABS) {
      ctx.fillStyle = '#16142a'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(170,160,240,0.35)'; ctx.fillRect(x, y, w, 1.5);
      ctx.strokeStyle = 'rgba(120,110,200,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 10, y + h); ctx.lineTo(x + w / 2, y + h + 26); ctx.lineTo(x + w - 10, y + h); ctx.stroke();
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#16142a'; ctx.fillRect(-60, G - 10, 1020, 10);
      // Lantern mark
      ctx.strokeStyle = 'rgba(200,190,255,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(450, G - 4, 26, 3, 0, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 300);
    g.addColorStop(0, '#12101e'); g.addColorStop(1, '#020108');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    ctx.fillStyle = 'rgba(170,160,240,0.35)'; ctx.fillRect(-60, G, 1020, 1.5);
  }

  STORY_LEVELS[106] = {
    sky: ['#04030c', '#080614', '#0c0a1e'],
    groundColor: '#12101e',
    platColor: '#16142a',
    sceneX: 450,
    arena: { base: 'storyNull', platforms },
    backdrop, back, surface,
  };
})();
