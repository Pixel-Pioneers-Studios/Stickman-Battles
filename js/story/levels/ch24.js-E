'use strict';
// js/story/levels/ch24.js — Chapter 24 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 24 — Army of Echoes (walk → duel vs two echo fighters)
// "The echo corridor was full of fracture-born fighters. Some looked like
// people from your world. All of them had the same hollow eyes." A cathedral
// of a corridor: tall arches lined with echo-pods — glass capsules, each with a
// fighter standing inside, hollow-eyed. Some pods have cracked open and their
// bases are standable; balconies run along the walls; hanging pod clusters
// sway overhead. Veran waits at the far end, battered but alive, at the rift
// into the Multiversal Core.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  // Kept clear of the generated chest-perch climbs at x≈1705-1945 and 4585-4825.
  const BALC = [[380, G - 140, 360], [1300, G - 160, 380], [2400, G - 150, 300], [3640, G - 140, 380], [4920, G - 160, 360]];
  const PODS = [];
  for (let x = 160; x < 5600; x += 120) PODS.push({ x, open: _slHash(x) < 0.18 });
  const SWING = [{ tag: 'h0', x: 1950, y: G - 230, w: 80 }, { tag: 'h1', x: 4150, y: G - 230, w: 80 }];
  const VERAN_X = 5600;

  function layout() {
    const P = [];
    for (const [x, y, w] of BALC) _slLedge(P, x, y, w);
    for (const p of PODS) if (p.open && !(p.x > 2700 && p.x < 3300)) _slLedge(P, p.x - 26, G - 60, 52);
    for (const s of SWING) _slMover(P, s.tag, s.x, s.y, s.w, 60, 0, 0.02, s.x);
    for (const [x] of BALC) _slLedge(P, x - 70, G - 72, 60);    // stair landings up to each balcony
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0c0a14'); }

  function _pod(x, open, seed) {
    ctx.fillStyle = '#1e1a2a'; ctx.fillRect(x - 28, G - 60, 56, 60);
    ctx.fillStyle = '#2e2840'; ctx.fillRect(x - 32, G - 64, 64, 8);
    if (open) {
      ctx.fillStyle = 'rgba(160,190,220,0.25)';
      ctx.beginPath(); ctx.moveTo(x - 26, G - 64); ctx.lineTo(x - 30, G - 150); ctx.lineTo(x - 14, G - 120); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 26, G - 64); ctx.lineTo(x + 34, G - 130); ctx.lineTo(x + 16, G - 110); ctx.fill();
      ctx.fillStyle = 'rgba(200,230,255,0.6)'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 40 + _slHash(k + seed) * 80, G - 3, 3, 2);
      return;
    }
    ctx.fillStyle = 'rgba(140,170,210,0.16)';
    ctx.beginPath(); ctx.moveTo(x - 26, G - 64); ctx.lineTo(x - 26, G - 190); ctx.quadraticCurveTo(x, G - 220, x + 26, G - 190); ctx.lineTo(x + 26, G - 64); ctx.fill();
    ctx.strokeStyle = 'rgba(180,200,230,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    // The echo inside: dim silhouette, hollow eyes
    const sway = Math.sin(frameCount * 0.01 + seed) * 1.5;
    ctx.fillStyle = 'rgba(30,26,40,0.95)';
    ctx.beginPath(); ctx.arc(x + sway, G - 168, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 5 + sway, G - 158, 10, 46); ctx.fillRect(x - 5, G - 112, 4, 46); ctx.fillRect(x + 1, G - 112, 4, 46);
    ctx.fillStyle = 'rgba(220,240,255,0.85)'; ctx.fillRect(x - 4 + sway, G - 170, 3, 2); ctx.fillRect(x + 2 + sway, G - 170, 3, 2);
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    ctx.fillStyle = '#14101e'; ctx.fillRect(x0, -300, x1 - x0, G + 300);
    // Arches
    for (let ax = Math.floor(x0 / 360) * 360; ax < x1; ax += 360) {
      ctx.fillStyle = '#1e182c';
      ctx.beginPath(); ctx.moveTo(ax, G); ctx.lineTo(ax, G - 340); ctx.quadraticCurveTo(ax + 180, G - 560, ax + 360, G - 340); ctx.lineTo(ax + 360, G); ctx.lineTo(ax + 330, G); ctx.lineTo(ax + 330, G - 330); ctx.quadraticCurveTo(ax + 180, G - 510, ax + 30, G - 330); ctx.lineTo(ax + 30, G); ctx.fill();
      ctx.fillStyle = 'rgba(160,140,220,0.08)'; ctx.fillRect(ax + 30, G - 330, 3, 330);
    }
    // Haunted light: cold shafts from high windows
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = Math.floor(x0 / 720); k * 720 < x1; k++) {
      const lx = k * 720 + 200;
      const g = ctx.createLinearGradient(0, G - 480, 0, G);
      g.addColorStop(0, 'rgba(170,160,230,0.16)'); g.addColorStop(1, 'rgba(170,160,230,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, G - 480); ctx.lineTo(lx + 50, G - 480); ctx.lineTo(lx + 180, G); ctx.lineTo(lx + 60, G); ctx.fill();
    }
    ctx.restore();
    // Balconies with stair landings
    for (const [x, y, w] of BALC) {
      if (!_slVisible(v, x - 80, x + w + 20)) continue;
      ctx.fillStyle = '#2a2238'; ctx.fillRect(x, y, w, 12); ctx.fillRect(x - 70, G - 72, 60, G - (G - 72));
      ctx.fillStyle = '#3a3050'; ctx.fillRect(x - 70, G - 72, 60, 5);
      ctx.strokeStyle = '#3a3050'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + w, y - 26); ctx.stroke();
      for (let bx = x; bx <= x + w; bx += 18) { ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y - 26); ctx.stroke(); }
      for (const px of [x + 30, x + w - 40]) { ctx.fillStyle = '#1e182c'; ctx.fillRect(px, y + 12, 12, G - y - 12); }
    }
    // Pods along the floor (the duel ground at 2700–3300 is kept clear)
    for (const p of PODS) {
      if (p.x > 2700 && p.x < 3300) continue;
      if (_slVisible(v, p.x - 40, p.x + 40)) _pod(p.x, p.open, p.x);
    }
    // Hanging pod clusters (live swinging ledges)
    for (const s of SWING) {
      const pl = _slPlat(currentArena, s.tag);
      if (!pl || !_slVisible(v, pl.x - 60, pl.x + pl.w + 60)) continue;
      ctx.strokeStyle = '#0c0a14'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x + s.w / 2, -300); ctx.lineTo(pl.x + pl.w / 2, pl.y - 40); ctx.stroke();
      ctx.fillStyle = '#2e2840'; ctx.fillRect(pl.x, pl.y, pl.w, 10);
      ctx.fillStyle = 'rgba(140,170,210,0.2)'; ctx.fillRect(pl.x + 6, pl.y - 40, pl.w - 12, 40);
      ctx.fillStyle = 'rgba(220,240,255,0.7)'; ctx.fillRect(pl.x + pl.w / 2 - 5, pl.y - 26, 3, 2); ctx.fillRect(pl.x + pl.w / 2 + 2, pl.y - 26, 3, 2);
    }
    // Veran at the end, by the rift
    if (_slVisible(v, VERAN_X - 200, VERAN_X + 300)) {
      _slPortal(VERAN_X + 120, G - 160, 70, 30, 2);
      ctx.fillStyle = 'rgba(255,190,120,0.5)'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('MULTIVERSAL CORE', VERAN_X + 120, G - 250);
    }
  }

  const ZONES = [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[24] = {
    sky: ['#0c0a14', '#1a1428'],
    groundColor: '#100c18',
    platColor: '#241e34',
    layout, backdrop, back, surface,
  };
})();
