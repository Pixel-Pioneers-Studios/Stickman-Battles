'use strict';
// js/story/levels/ch21.js — Chapter 21 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 21 — The Approach (stealth)
// The outer corridor of the Collector's domain: ribbed walls half machine,
// half grown, cables hanging, the void showing through the gaps. Each sentinel
// hangs from the ceiling as an eye whose searchlight lights exactly its
// detection zone on the floor. Every post has a high route that clears the
// zone (detection sits at guard y = 395): plate stairs to a cable tray, a
// transit rail, a drifting plate, an arch bridge, a catwalk. The arena
// entrance — a door into the collapsed dimension of chapter 22 — ends it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const POSTS = [[700, 90], [1300, 95], [2000, 100], [2800, 90], [3500, 100]];
  const ROUTES = {
    steps: [[520, G - 64, 60], [580, G - 128, 60], [1080, G - 74, 70], [1820, G - 84, 70], [2580, G - 76, 70], [3280, G - 84, 70]],
    high:  [[640, G - 150, 200], [1150, G - 162, 300], [2040, G - 172, 110], [2650, G - 152, 300], [3360, G - 172, 300]],
  };
  const DRIFT = { x: 1890, y: G - 172, w: 110 };
  const DOOR = 3850;

  function layout() {
    const P = [];
    for (const [x, y, w] of ROUTES.steps) _slLedge(P, x, y, w);
    for (const [x, y, w] of ROUTES.high) _slLedge(P, x, y, w);
    _slMover(P, 'drift', DRIFT.x, DRIFT.y, DRIFT.w, 30, 0, 0.015, 0);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05030a');
    _slParallax(v, 0.1, (l, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = Math.floor(l / 30); i * 30 < r; i++) if (_slHash(i + 41) < 0.25) ctx.fillRect(i * 30 + _slHash(i) * 20, -200 + _slHash(i + 3) * 600, 1.2, 1.2);
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(4400, v.x + v.w + 40);
    // Ribbed corridor: arching ribs, membranes between, gaps onto the void
    for (let k = Math.floor(x0 / 160); k * 160 < x1; k++) {
      const rx = k * 160;
      const gap = _slHash(k + 7) < 0.25;
      if (!gap) { ctx.fillStyle = '#1a1224'; ctx.fillRect(rx, G - 420, 160, 420); }
      ctx.fillStyle = '#2a1e38';
      ctx.beginPath(); ctx.moveTo(rx, G); ctx.quadraticCurveTo(rx - 10, G - 260, rx + 60, G - 420); ctx.lineTo(rx + 76, G - 420); ctx.quadraticCurveTo(rx + 8, G - 260, rx + 18, G); ctx.fill();
      ctx.fillStyle = 'rgba(190,140,255,0.10)'; ctx.fillRect(rx + 4, G - 300, 2, 260);
    }
    ctx.fillStyle = '#100a18'; ctx.fillRect(x0, G - 450, x1 - x0, 40);
    // Hanging cables
    ctx.strokeStyle = '#0c0812'; ctx.lineWidth = 2;
    for (let k = Math.floor(x0 / 90); k * 90 < x1; k++) {
      const cx = k * 90 + _slHash(k) * 40, len = 60 + _slHash(k + 3) * 120;
      ctx.beginPath(); ctx.moveTo(cx, G - 410); ctx.quadraticCurveTo(cx + Math.sin(frameCount * 0.01 + k) * 8, G - 410 + len * 0.6, cx + 6, G - 410 + len); ctx.stroke();
    }
    // Route furniture
    for (const [x, y, w] of ROUTES.steps) if (_slVisible(v, x, x + w)) {
      ctx.fillStyle = '#2e2440'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#4a3a66'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = 'rgba(190,140,255,0.4)'; ctx.fillRect(x + 6, y + 14, w - 12, 2);
    }
    for (const [x, y, w] of ROUTES.high) if (_slVisible(v, x, x + w)) {
      ctx.fillStyle = '#3a2e50'; ctx.fillRect(x, y, w, 8);
      ctx.strokeStyle = '#3a2e50'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + w, y - 20); ctx.stroke();
      for (let rx = x; rx <= x + w; rx += 16) { ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx, y - 20); ctx.stroke(); }
      ctx.strokeStyle = '#140e1e'; ctx.lineWidth = 1;
      for (const hx of [x + 12, x + w - 12]) { ctx.beginPath(); ctx.moveTo(hx, y); ctx.lineTo(hx, G - 410); ctx.stroke(); }
    }
    const d = _slPlat(currentArena, 'drift');
    if (d && _slVisible(v, d.x - 20, d.x + d.w + 20)) {
      ctx.fillStyle = '#4a3a66'; ctx.fillRect(d.x, d.y, d.w, 8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(190,140,255,0.3)'; ctx.fillRect(d.x + 10, d.y + 10, d.w - 20, 4); ctx.restore();
    }
    // Sentinel eyes with searchlights that cover their detection zones
    for (const [px, rad] of POSTS) {
      if (!_slVisible(v, px - 160, px + 160)) continue;
      const sweep = Math.sin(frameCount * 0.02 + px) * 0.12;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, G - 360, 0, G);
      g.addColorStop(0, 'rgba(255,80,120,0.20)'); g.addColorStop(1, 'rgba(255,80,120,0.04)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(px - 6, G - 360); ctx.lineTo(px + 6, G - 360);
      ctx.lineTo(px + rad + sweep * 200, G); ctx.lineTo(px - rad + sweep * 200, G); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#140e1e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, G - 410); ctx.lineTo(px, G - 372); ctx.stroke();
      ctx.fillStyle = '#2a1e38'; ctx.beginPath(); ctx.arc(px, G - 360, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4466'; ctx.beginPath(); ctx.arc(px + sweep * 30, G - 356, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd0d8'; ctx.beginPath(); ctx.arc(px + sweep * 30 + 1.5, G - 357.5, 2, 0, Math.PI * 2); ctx.fill();
    }
    // The arena entrance: a great door onto the collapsed dimension
    if (_slVisible(v, DOOR - 200, DOOR + 400)) {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(DOOR - 60, G - 360, 240, 360);
      ctx.fillStyle = '#3a2e50'; ctx.fillRect(DOOR - 80, G - 380, 280, 24); ctx.fillRect(DOOR - 80, G - 380, 24, 380); ctx.fillRect(DOOR + 176, G - 380, 24, 380);
      for (let k = 0; k < 7; k++) {
        const fy = G - 330 + k * 46;
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(DOOR - 40 + _slHash(k) * 200, fy + Math.sin(frameCount * 0.02 + k) * 4, 26 + _slHash(k + 2) * 30, 4);
      }
      ctx.fillStyle = '#c9a2ff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('COLLAPSED DIMENSION', DOOR + 60, G - 392);
    }
  }

  const ZONES = [{ x0: -200, x1: 4600, kind: 'tunnel', face: 'concrete' }];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[21] = {
    sky: ['#05030a', '#120a1e'],
    groundColor: '#0a0612',
    platColor: '#1e1630',
    layout, backdrop, back, surface,
  };
})();
