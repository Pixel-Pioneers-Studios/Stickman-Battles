'use strict';
// js/story/levels/ch130.js — Chapter 130 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 130 — The Offer (stealth)
// The Audience Corridor, under the Creator's direct attention. Overhead runs a
// line of lenses set into the lattice ceiling, all turning to follow the
// same slow sweep — the Creator watching. The construct patrols each stand
// in a pool of violet grid-light that is exactly their detection zone
// (detection sits at guard y = 395). Each post has a high route: a white
// plinth to step on, then a lattice catwalk over the grid-light. The walls
// are white panels with the lattice showing through the seams. The Inner
// Sanctum at the end is a tall doorway of light. (First post moved to x=750,
// clear of the x=450 spawn edge — mirrored in stealthGuardDefs and
// spawnEnemies.)
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SANCTUM = 3750;
  const POSTS = [[750, 90], [1300, 95], [2000, 100], [2700, 95], [3400, 100]];
  const ROUTES = POSTS.map(([x, r]) => ({ step: [x - r - 200, 360, 120], walk: [x - r - 90, 270, 2 * r + 180] }));

  function layout() {
    const P = [];
    for (const R of ROUTES) { _slLedge(P, ...R.step); _slLedge(P, ...R.walk); }
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    for (let x = Math.floor(v.x / 160) * 160; x < v.x + v.w + 160; x += 160) { ctx.fillStyle = '#2a1048'; ctx.fillRect(x, 60, 6, G - 60); _slLattice(x, 60, 6, G - 60, 0.5, 3); }
    // The lattice ceiling and its lenses, all following the same slow sweep
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
    _slLattice(Math.floor(v.x / 20) * 20, 20, v.w + 40, 40, 0.3, 20);
    const sweep = Math.sin(frameCount * 0.006) * 0.8;
    for (let x = Math.floor(v.x / 240) * 240 + 120; x < v.x + v.w + 240; x += 240) {
      ctx.fillStyle = '#1a0a30'; ctx.beginPath(); ctx.arc(x, 60, 18, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#e8e0ff'; ctx.beginPath(); ctx.arc(x + sweep * 10, 68, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function back(v) {
    for (let i = 0; i < POSTS.length; i++) {
      const [x, r] = POSTS[i], R = ROUTES[i];
      if (!_slVisible(v, R.step[0] - 20, R.walk[0] + R.walk[2] + 20)) continue;
      ctx.save(); ctx.beginPath(); ctx.arc(x, 395, r, Math.PI, 0); ctx.lineTo(x + r, G); ctx.lineTo(x - r, G); ctx.clip();
      ctx.fillStyle = 'rgba(120,100,220,0.12)'; ctx.fillRect(x - r, 395 - r, 2 * r, 2 * r);
      _slLattice(x - r, 395 - r, 2 * r, r + 45, 0.35, 12);
      ctx.restore();
      const [sx, sy, sw] = R.step, [wx, wy, ww] = R.walk;
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(sx, sy, sw, G - sy); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(sx + sw - 8, sy, 8, G - sy);
      ctx.fillStyle = 'rgba(120,100,200,0.45)'; ctx.fillRect(wx, wy, ww, 12); _slLattice(wx, wy, ww, 12, 0.7, 6);
      ctx.strokeStyle = 'rgba(200,190,255,0.35)'; ctx.beginPath(); ctx.moveTo(wx + 10, wy); ctx.lineTo(wx + 10, 60); ctx.moveTo(wx + ww - 10, wy); ctx.lineTo(wx + ww - 10, 60); ctx.stroke();
    }
    // The Inner Sanctum: a tall doorway of light
    if (_slVisible(v, SANCTUM - 120, SANCTUM + 120)) {
      ctx.fillStyle = '#2a1048'; ctx.fillRect(SANCTUM - 80, 100, 160, G - 100);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(SANCTUM - 60, 0, SANCTUM + 60, 0);
      g.addColorStop(0, 'rgba(230,220,255,0.2)'); g.addColorStop(0.5, 'rgba(250,245,255,0.85)'); g.addColorStop(1, 'rgba(230,220,255,0.2)');
      ctx.fillStyle = g; ctx.fillRect(SANCTUM - 60, 120, 120, G - 120); ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[130] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#ece8f8',
    layout, backdrop, back, surface,
  };
})();
