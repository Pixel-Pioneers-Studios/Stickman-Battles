'use strict';
// js/story/levels/ch123.js — Chapter 123 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 123 — The Watcher (scavenge, 4 traces)
// The Threshold's fracture boundary: high, windswept ground at the edge of
// the world, grass flattened in one direction, with the Creator's fracture
// standing on the horizon — a seam of white geometry from the ground to the
// top of the sky. A cloaked figure has been here. Its traces are what you
// collect, and each one is a different kind of residue: footprints in the
// grass that still glow faintly (identity), a shape in the air that repeats
// the same three steps (movement), ripples in a pool of standing water that
// spell nothing but keep spreading (voice), and an outline of the figure
// pressed into the light on top of a boulder, as if it stood there a long
// time (presence). Boulders and a broken boundary wall are the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const ECHO = [1150, 370, 110], POOL = 2000, PRESENCE = [2945, 380, 110];
  const ROCKS = [[780, 350, 110], [900, 270, 110], [1550, 340, 110], [2350, 350, 100], [2470, 270, 110], [3300, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [ECHO, PRESENCE, ...ROCKS]) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e1220');
    // The Creator's fracture on the horizon, ground to sky
    _slParallax(v, 0.05, (l, r) => {
      const fx = 3800 * 0.05 + 600;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(fx - 60, 0, fx + 60, 0);
      g.addColorStop(0, 'rgba(230,230,255,0)'); g.addColorStop(0.5, 'rgba(240,240,255,0.55)'); g.addColorStop(1, 'rgba(230,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(fx - 60, -300, 120, 720);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      for (let k = 0; k < 10; k++) { const y = -200 + k * 60; ctx.strokeRect(fx - 20 + Math.sin(k) * 10, y, 40, 30); }
    });
    // Distant ridges
    _slParallax(v, 0.15, (l, r) => {
      ctx.fillStyle = '#1a2230';
      ctx.beginPath(); ctx.moveTo(l - 40, 440);
      for (let x = Math.floor(l / 80) * 80 - 80; x <= r + 80; x += 80) ctx.lineTo(x, 300 + _slHash(Math.floor(x / 80) + 1230) * 70);
      ctx.lineTo(r + 80, 440); ctx.closePath(); ctx.fill();
    });
  }

  function boulder(x, y, w) {
    ctx.fillStyle = '#4a4c54';
    ctx.beginPath(); ctx.moveTo(x + 4, G); ctx.lineTo(x, y + 10); ctx.quadraticCurveTo(x + w / 2, y - 10, x + w, y + 8); ctx.lineTo(x + w - 4, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a6c74'; ctx.fillRect(x, y, w, 3);
  }

  function back(v) {
    // Grass flattened by the wind toward the fracture
    ctx.strokeStyle = '#4a6a3a'; ctx.lineWidth = 1.5;
    for (let x = Math.floor(v.x / 12) * 12; x < v.x + v.w; x += 12) { const sw = 6 + Math.sin(frameCount * 0.04 + x * 0.05) * 3; ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x + sw, G - 10 - _slHash(x) * 6); ctx.stroke(); }
    // Identity: footprints in the grass that still glow
    if (_slVisible(v, 380, 640)) for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(200,220,255,${0.25 + 0.15 * Math.sin(frameCount * 0.05 + k)})`; ctx.beginPath(); ctx.ellipse(400 + k * 40, G - 2 - (k % 2) * 2, 8, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    // Movement: a shape in the air repeating the same three steps
    if (_slVisible(v, ECHO[0] - 60, ECHO[0] + ECHO[2] + 60)) {
      boulder(...ECHO);
      const st = Math.floor(frameCount / 20) % 3, cx = ECHO[0] + 20 + st * 30;
      ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, ECHO[1] - 70, 7, 0, Math.PI * 2); ctx.moveTo(cx, ECHO[1] - 63); ctx.lineTo(cx, ECHO[1] - 30); ctx.lineTo(cx - 8 + st * 6, ECHO[1]); ctx.moveTo(cx, ECHO[1] - 30); ctx.lineTo(cx + 8 - st * 6, ECHO[1]); ctx.stroke();
    }
    // Voice: ripples spreading across a pool of standing water
    if (_slVisible(v, POOL - 120, POOL + 120)) {
      ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.ellipse(POOL, G - 2, 100, 6, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 4; k++) { const t = ((frameCount + k * 30) % 120) / 120; ctx.strokeStyle = `rgba(200,220,255,${0.5 * (1 - t)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(POOL, G - 2, 10 + t * 90, 1 + t * 5, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    // Presence: an outline of the figure pressed into the light on a boulder
    if (_slVisible(v, PRESENCE[0] - 60, PRESENCE[0] + PRESENCE[2] + 60)) {
      boulder(...PRESENCE);
      const cx = PRESENCE[0] + PRESENCE[2] / 2, by = PRESENCE[1];
      ctx.fillStyle = 'rgba(200,220,255,0.15)';
      ctx.beginPath(); ctx.moveTo(cx - 22, by); ctx.lineTo(cx - 16, by - 70); ctx.quadraticCurveTo(cx, by - 104, cx + 16, by - 70); ctx.lineTo(cx + 22, by); ctx.fill();
    }
    for (const [x, y, w] of ROCKS) if (_slVisible(v, x - 10, x + w + 10)) boulder(x, y, w);
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 4000, kind: 'lawn', face: 'soil' }]); }

  STORY_LEVELS[123] = {
    sky: ['#0e1220', '#1c2438', '#2c3850'],
    groundColor: '#2a3a24',
    platColor: '#4a4c54',
    sceneX: 3000,
    layout, backdrop, back, surface,
  };
})();
