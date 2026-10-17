'use strict';
// js/story/levels/ch52.js — Chapter 52 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 52 — Rogue Faction (walk → duel vs two Preserved)
// The neutral dimension's outer perimeter, where the grey ground frays into
// the worlds the Preserved live in. "Not destroyed — integrated. They had
// built a life in there." Every few hundred pixels the paper-grey plain gives
// way to a patch of somewhere else, each patch tinted its own sky: a
// farmhouse yard, a terrace of terracotta roofs, a market awning, an orchard
// — homes from different dimensions grafted side by side. The roofs and
// porches are the climbs. At the midpoint the Preserved have planted their
// banner: "WE EXIST." The cache shafts are wells in their yards.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, CAMP = 3000;
  // Patches of absorbed worlds: [x0, x1, sky tint, kind]
  const PATCHES = [[300, 900, 'rgba(255,200,130,0.16)', 'farm'], [1050, 1550, 'rgba(255,150,120,0.14)', 'terrace'],
                   [2150, 2600, 'rgba(140,220,170,0.14)', 'orchard'], [3450, 4000, 'rgba(160,190,255,0.16)', 'market'],
                   [4950, 5550, 'rgba(255,220,160,0.16)', 'farm']];
  const ROOFS = [[420, 350, 140], [560, 270, 120], [1120, 340, 150], [1300, 260, 130], [2220, 350, 110], [2380, 270, 110],
                 [3520, 340, 140], [3700, 260, 120], [5040, 350, 140], [5200, 270, 120]];
  const WELLS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of ROOFS) _slLedge(P, x, y, w);
    _slLedge(P, CAMP - 330, 360, 100); _slLedge(P, CAMP + 230, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#9a9a9e');
    // Far off: the edge of the neutral plain, worlds showing through it
    _slParallax(v, 0.1, (l, r) => {
      for (let i = Math.floor(l / 240) - 1; i * 240 < r + 240; i++) {
        const x = i * 240 + _slHash(i + 52) * 100, w = 80 + _slHash(i + 53) * 80;
        ctx.fillStyle = `hsla(${Math.floor(_slHash(i + 54) * 360)},40%,60%,0.18)`;
        ctx.beginPath(); ctx.ellipse(x, 360, w, 60, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function patch(x0, x1, tint, kind) {
    // A window of another world's sky, frayed at the edges into the grey
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, tint); g.addColorStop(0.85, tint); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, 40, x1 - x0, G - 40);
    const m = (x0 + x1) / 2;
    if (kind === 'farm') {
      _slHouse(x0 + 110, G, 170, 90, 60, '#c8a878', '#f0e8d8', '#8a4a3a', { chimney: 120 });
      _slWindow(x0 + 140, G - 70, 30, 30, '#f0e8d8', true); _slWindow(x0 + 220, G - 70, 30, 30, '#f0e8d8', false);
      ctx.strokeStyle = '#6a5a4a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m + 60, G - 110); ctx.quadraticCurveTo(m + 130, G - 95, m + 200, G - 110); ctx.stroke();
      for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#cc6655', '#5588cc', '#eeeeee', '#88aa55'][k]; ctx.fillRect(m + 75 + k * 32, G - 104 + Math.sin(k) * 3, 16, 20); }
    } else if (kind === 'terrace') {
      for (let k = 0; k < 3; k++) _slHouse(x0 + 60 + k * 150, G, 120, 80 + k * 10, 40, '#e8d8c0', '#c87850', '#c0583a');
    } else if (kind === 'orchard') {
      for (let k = 0; k < 5; k++) _slTree(x0 + 30 + k * 95, G, 0.8 + _slHash(k) * 0.3, '#4a8a44');
      ctx.fillStyle = '#cc3333'; for (let k = 0; k < 14; k++) ctx.fillRect(x0 + 20 + _slHash(k + 3) * 420, G - 80 - _slHash(k + 4) * 50, 4, 4);
    } else if (kind === 'market') {
      _slShopfront(x0 + 40, G, 220, 140, '#8a7a9a', 'BREAD', '#ffe0a0', '#cc5555', true);
      _slShopfront(x0 + 280, G, 220, 130, '#7a8a6a', 'LAMPS', '#ffd27a', '#5577aa', true);
    }
  }

  function back(v) {
    for (const [x0, x1, tint, kind] of PATCHES) if (_slVisible(v, x0, x1)) patch(x0, x1, tint, kind);
    // Climbable roofs and porches over the patches
    for (const [x, y, w] of ROOFS) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#6a4a3a'; ctx.fillRect(x, y, w, 9);
      ctx.fillStyle = '#4a3428'; ctx.fillRect(x + 6, y + 9, 8, G - y - 9); ctx.fillRect(x + w - 14, y + 9, 8, G - y - 9);
    }
    // Wells over the cache shafts
    for (const wx of WELLS) if (_slVisible(v, wx - 80, wx + 80)) {
      ctx.fillStyle = '#8a8378'; ctx.fillRect(wx - 62, G - 26, 14, 26); ctx.fillRect(wx + 48, G - 26, 14, 26);
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(wx - 58, G - 70, 4, 44); ctx.fillRect(wx + 54, G - 70, 4, 44); ctx.fillRect(wx - 60, G - 72, 120, 5);
    }
    // The Preserved's camp and banner
    if (_slVisible(v, CAMP - 500, CAMP + 500)) {
      for (const sx of [CAMP - 330, CAMP + 230]) { ctx.fillStyle = '#7a6a5a'; ctx.fillRect(sx, 360, 100, 10); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(sx + 40, 370, 20, G - 370); }
      ctx.fillStyle = '#4a3a2c'; ctx.fillRect(CAMP - 4, G - 260, 8, 260);
      const wave = Math.sin(frameCount * 0.05) * 6;
      ctx.fillStyle = '#d8cfc0';
      ctx.beginPath(); ctx.moveTo(CAMP + 4, G - 256); ctx.quadraticCurveTo(CAMP + 70, G - 250 + wave, CAMP + 140, G - 256); ctx.lineTo(CAMP + 140, G - 196); ctx.quadraticCurveTo(CAMP + 70, G - 190 + wave, CAMP + 4, G - 196); ctx.fill();
      ctx.fillStyle = '#4a3a2c'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center'; ctx.fillText('WE EXIST', CAMP + 72, G - 220 + wave * 0.5);
    }
  }

  function surface(v, a, ph) {
    const Z = [{ x0: -200, x1: 6200, kind: 'sidewalk', face: 'soil' }];
    for (const [x0, x1, , kind] of PATCHES) Z.push({ x0: x0 + 60, x1: x1 - 60, kind: kind === 'market' ? 'tile' : 'lawn', face: 'soil' });
    _slSurfaces(v, a, ph, Z);
  }

  STORY_LEVELS[52] = {
    sky: ['#8a8a90', '#b8b4ae'],
    groundColor: '#5a5650',
    platColor: '#6a4a3a',
    layout, backdrop, back, surface,
  };
})();
