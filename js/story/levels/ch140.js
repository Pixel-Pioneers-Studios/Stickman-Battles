'use strict';
// js/story/levels/ch140.js — Chapter 140 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 140 — The Cost (defense, 4 waves)
// The Gate Approach: the Creator's gate terminal (the nexus, x=450), the last
// unlock point, standing in front of the gate itself — a door of white light
// as tall as the domain, still sealed. While you hold, the rift entity is
// transmitting the closure sequence into the fragment: a thread of light
// runs from the terminal up into the gate, and the gate's seal shows the
// transmission as a ring filling segment by segment, one per wave held.
// Gate constructs come in from the domain on both sides. Two white plinths
// and a lattice bridge between them are the ledges.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const LEDGES = [[100, 340, 140], [660, 340, 140], [340, 240, 220]];

  function layout() {
    const P = [];
    for (const [x, y, w] of LEDGES) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    // The gate: a door of white light as tall as the domain, sealed
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(NX - 160, 0, NX + 160, 0);
    g.addColorStop(0, 'rgba(230,220,255,0)'); g.addColorStop(0.5, 'rgba(245,240,255,0.5)'); g.addColorStop(1, 'rgba(230,220,255,0)');
    ctx.fillStyle = g; ctx.fillRect(NX - 160, v.y - 20, 320, G - v.y + 20); ctx.restore();
    ctx.strokeStyle = '#ece8f8'; ctx.lineWidth = 6; ctx.strokeRect(NX - 150, v.y - 40, 300, G - v.y + 40);
  }

  function back(v) {
    const s = (typeof storeSurvivalState !== 'undefined') ? storeSurvivalState : null;
    const n = s ? Math.min(s.totalWaves || 4, s.wave) : 0, total = (s && s.totalWaves) || 4;
    // The seal: a ring filling one segment per wave held
    const cy = 140;
    for (let k = 0; k < total; k++) {
      ctx.strokeStyle = k < n ? '#f0e8ff' : 'rgba(120,100,200,0.5)'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(NX, cy, 54, -Math.PI / 2 + k * (Math.PI * 2 / total) + 0.08, -Math.PI / 2 + (k + 1) * (Math.PI * 2 / total) - 0.08); ctx.stroke();
    }
    // The transmission thread from the terminal up into the gate
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(200,180,255,${0.4 + 0.3 * Math.sin(frameCount * 0.2)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(NX, G - 60); ctx.lineTo(NX, cy + 54); ctx.stroke(); ctx.restore();
    for (const [x, y, w] of LEDGES) {
      if (y > 300) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + w - 8, y, 8, G - y); }
      else { ctx.fillStyle = 'rgba(120,100,200,0.5)'; ctx.fillRect(x, y, w, 12); _slLattice(x, y, w, 12, 0.7, 6); }
    }
    ctx.fillStyle = '#b8b4c8'; ctx.fillRect(NX - 46, G - 30, 92, 30); ctx.fillStyle = '#ece8f8'; ctx.fillRect(NX - 50, G - 34, 100, 6);
  }

  function surface(v, a, ph) {
    if (ph === 'back') { ctx.fillStyle = '#d8d4e4'; ctx.fillRect(v.x - 20, G - 10, v.w + 40, 10); return; }
    ctx.fillStyle = '#1a1030'; ctx.fillRect(v.x - 20, G, v.w + 40, 300); _slLattice(Math.floor((v.x - 20) / 20) * 20, G, v.w + 60, 120, 0.25, 20);
    ctx.fillStyle = '#b8b4c8'; ctx.fillRect(v.x - 20, G, v.w + 40, 4);
  }

  STORY_LEVELS[140] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#ece8f8',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
