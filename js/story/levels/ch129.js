'use strict';
// js/story/levels/ch129.js: chapter 129 map. Contract in smb-story-levels.js.

// Chapter 129, Architecture Soldiers (walk, then duel two Architecture Soldiers).
// Inner corridor of the Creator's domain. Wall screens loop replays of your own wins.
(function () {
  const G = 440, CHAMBER = 3000;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const HATCHES = [1800, 4680];

  // Loot: a hidden cache off the route, and a better one with an optional elite.
  const STASH = [
    { id: 'a', x: 2060, y: 250, w: 140, steps: [[1990, 345, 90]] },
    { id: 'b', x: 4220, y: 250, w: 190, steps: [[4150, 345, 90]], gx: 60, guard: { name: 'Architecture Sentry', weaponKey: 'sword', classKey: 'warrior', health: 170, color: '#9a8ac8' } },
  ];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, CHAMBER - 340, 360, 100); _slLedge(P, CHAMBER + 240, 360, 100);
    _slStashPlats(P, STASH);
    return P;
  }

  function replay(x, y, k) {
    ctx.fillStyle = '#0c0818'; ctx.fillRect(x, y, 90, 60);
    ctx.strokeStyle = 'rgba(200,190,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 90, 60);
    const t = (frameCount * 0.05 + k) % (Math.PI * 2), ax = x + 30 + Math.sin(t) * 8, bx = x + 60 - Math.sin(t) * 8;
    ctx.strokeStyle = 'rgba(120,220,255,0.8)'; ctx.beginPath(); ctx.arc(ax, y + 22, 3, 0, Math.PI * 2); ctx.moveTo(ax, y + 25); ctx.lineTo(ax, y + 40); ctx.lineTo(ax - 4, y + 52); ctx.moveTo(ax, y + 40); ctx.lineTo(ax + 4, y + 52); ctx.moveTo(ax, y + 30); ctx.lineTo(ax + 10, y + 28 - Math.cos(t) * 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,140,140,0.6)'; ctx.beginPath(); ctx.arc(bx, y + 22, 3, 0, Math.PI * 2); ctx.moveTo(bx, y + 25); ctx.lineTo(bx, y + 40); ctx.lineTo(bx - 4, y + 52); ctx.moveTo(bx, y + 40); ctx.lineTo(bx + 4, y + 52); ctx.stroke();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 10, 60, v.w + 20, G - 60);
    for (let x = Math.floor(v.x / 160) * 160; x < v.x + v.w + 160; x += 160) {
      ctx.fillStyle = '#c4c0d4'; ctx.fillRect(x, 60, 4, G - 60);
      ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(x + 4, 60, 30, G - 60);
    }
    ctx.fillStyle = '#2a1048'; ctx.fillRect(v.x - 10, v.y - 20, v.w + 20, 80 - v.y + 20);
    for (let x = Math.floor(v.x / 60) * 60; x < v.x + v.w + 60; x += 60) { ctx.strokeStyle = 'rgba(200,190,255,0.4)'; ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x + 30, 30); ctx.lineTo(x + 60, 60); ctx.stroke(); }
    for (let k = Math.floor(v.x / 400); k * 400 < v.x + v.w + 400; k++) if (k >= 0) replay(k * 400 + 120, 150, k);
  }

  function back(v) {
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + w - 8, y, 8, G - y);
    }
    if (_slVisible(v, CHAMBER - 420, CHAMBER + 420)) {
      for (const sx of [CHAMBER - 90, CHAMBER + 90]) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, 60, 0, G); g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(1, 'rgba(220,210,255,0.25)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - 10, 60); ctx.lineTo(sx + 10, 60); ctx.lineTo(sx + 50, G); ctx.lineTo(sx - 50, G); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      for (const x of [CHAMBER - 340, CHAMBER + 240]) { ctx.fillStyle = '#b8b4c8'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, 360, 100, 5); }
    }
    for (const hx of HATCHES) if (_slVisible(v, hx - 70, hx + 70)) { ctx.fillStyle = '#7864c8'; ctx.fillRect(hx - 56, G - 4, 10, 4); ctx.fillRect(hx + 46, G - 4, 10, 4); }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]);
    if (ph === 'back' && _slVisible(v, CHAMBER - 200, CHAMBER + 200)) for (const sx of [CHAMBER - 90, CHAMBER + 90]) { ctx.strokeStyle = 'rgba(120,100,200,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(sx - 24, G - 14, 48, 10); }
  }

  function loot() { return _slStashLoot(STASH); }

  STORY_LEVELS[129] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#b8b4c8',
    layout, loot, backdrop, back, surface,
  };
})();
