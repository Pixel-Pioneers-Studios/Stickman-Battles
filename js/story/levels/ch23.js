'use strict';
// js/story/levels/ch23.js — Chapter 23 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 23 — Static from the Core (defense)
// "The Creator's frequency is broadcasting through the relay. Hold it open
// long enough for Veran to trace the source." A single-screen signal relay in
// the red static of the network: the relay (the nexus, x=450) sits on its
// plinth in the middle; core probes pour out of two static rifts at the left
// and right walls. Two tiers of gantries on each side let the defender cut
// them off high or low; the dish array overhead shows the trace progress.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const SIDES = [[70, 340, 150], [680, 340, 150], [150, 240, 120], [630, 240, 120], [380, 170, 140]];

  function layout() {
    const P = [];
    for (const [x, y, w] of SIDES) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0e0405');
    _slParallax(v, 0.05, (l, r) => {
      // Static: scrolling scanlines and noise
      for (let y = -200; y < 520; y += 6) {
        ctx.fillStyle = `rgba(255,60,80,${0.03 + 0.03 * _slHash(y + (frameCount >> 2))})`;
        ctx.fillRect(l - 20, y, r - l + 40, 2);
      }
      for (let k = 0; k < 80; k++) {
        ctx.fillStyle = `rgba(255,200,210,${0.25 * _slHash(k + frameCount)})`;
        ctx.fillRect(l + _slHash(k * 3 + frameCount) * (r - l), -200 + _slHash(k * 7 + frameCount) * 700, 2, 1);
      }
    });
  }

  function back(v) {
    // Ruined relay hall walls
    ctx.fillStyle = '#1c0a0e'; ctx.fillRect(-60, -200, 1020, G + 200);
    for (let px = 0; px < 900; px += 150) {
      ctx.fillStyle = '#2a1016'; ctx.fillRect(px, -200, 24, G + 200);
      ctx.fillStyle = 'rgba(255,90,110,0.06)'; ctx.fillRect(px + 24, -200, 2, G + 200);
    }
    // The two static rifts the probes come through
    for (const rx of [30, 870]) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(rx, G - 90, 6, rx, G - 90, 130);
      g.addColorStop(0, 'rgba(255,70,90,0.45)'); g.addColorStop(1, 'rgba(255,70,90,0)');
      ctx.fillStyle = g; ctx.fillRect(rx - 130, G - 220, 260, 220);
      ctx.restore();
      ctx.fillStyle = '#060204';
      ctx.beginPath(); ctx.ellipse(rx, G - 90, 30, 86, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,${120 + 80 * _slHash(frameCount >> 2)},140,0.9)`; ctx.lineWidth = 2; ctx.stroke();
      for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(255,200,210,0.6)'; ctx.fillRect(rx - 26 + _slHash(k + frameCount) * 52, G - 170 + _slHash(k * 3 + frameCount) * 160, 6, 1.5); }
    }
    // Gantries
    for (const [x, y, w] of SIDES) {
      ctx.fillStyle = '#3a1a20'; ctx.fillRect(x, y, w, 8);
      ctx.strokeStyle = '#3a1a20'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + w, y - 20); ctx.stroke();
      for (let rx = x; rx <= x + w; rx += 15) { ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx, y - 20); ctx.stroke(); }
      ctx.fillStyle = '#24101a'; ctx.fillRect(x + w / 2 - 5, y + 8, 10, G - y - 8);
    }
    // Dish array overhead, aimed at the Core — trace progress lights it
    const ws = (typeof storeSurvivalState !== 'undefined' && storeSurvivalState) ? storeSurvivalState : null;
    const prog = ws && ws.totalWaves ? Math.min(1, (ws.wave || 0) / ws.totalWaves) : 0;
    for (const [dx, f] of [[300, 1], [600, -1]]) {
      ctx.strokeStyle = '#3a1a20'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx, 100); ctx.lineTo(dx + f * 60, 240); ctx.stroke();
      _slDish(dx, 70, 34, f);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(120,240,220,${0.25 + prog * 0.6})`; ctx.lineWidth = 2 + prog * 3;
    ctx.beginPath(); ctx.moveTo(NX, G - 90); ctx.lineTo(NX, -200); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#88f0dc'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('TRACE ' + Math.round(prog * 100) + '%', NX, 40);
    // The relay plinth the nexus crystal sits on
    ctx.fillStyle = '#2a1016'; ctx.fillRect(NX - 46, G - 40, 92, 40);
    ctx.fillStyle = '#3a1a20'; ctx.fillRect(NX - 54, G - 46, 108, 8);
    _slConduit(NX - 300, NX - 54, G - 20, 350, 5); _slConduit(NX + 54, NX + 300, G - 20, 350, 5);
  }

  const ZONES = [{ x0: -60, x1: 960, kind: 'rubble', face: 'concrete' }];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[23] = {
    sky: ['#0e0405', '#220e12'],
    groundColor: '#150608',
    platColor: '#200a12',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
