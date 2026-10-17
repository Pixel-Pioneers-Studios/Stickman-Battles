'use strict';
// js/story/levels/ch121.js — Chapter 121 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 121 — Shockwave Hold (defense, Trial of Control)
// The Anchor Point, "the only stable ground in the Collision Realm". A
// perfectly round, perfectly level disc of dark stone with the anchor pylon
// (the nexus, x=450) at its centre — and around it, everything else breaking:
// slabs of other worlds grinding past behind the disc, shockwave rings
// rolling out across the sky from impacts far off, debris tumbling through
// the air and never touching the disc. The impact constructs come in from
// both sides over the broken edge. Two low slabs that have wedged against
// the disc and one high one leaning across it are the ledges.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const WEDGE = [[90, 340, 140], [670, 340, 140], [360, 240, 180]];

  function layout() {
    const P = [];
    for (const [x, y, w] of WEDGE) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#100400');
    // Shockwave rings rolling across the sky
    for (let k = 0; k < 3; k++) {
      const t = ((frameCount + k * 80) % 240) / 240, cx = 150 + k * 300;
      ctx.strokeStyle = `rgba(255,160,90,${0.35 * (1 - t)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 180, 20 + t * 400, 6 + t * 90, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Slabs of other worlds grinding past behind the disc
    _slParallax(v, 0.25, (l, r) => {
      for (let k = 0; k < 6; k++) {
        const x = ((frameCount * (0.3 + k * 0.05) + k * 260) % 1600) - 300 + l, y = 220 + (k % 3) * 60;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(frameCount * 0.004 + k) * 0.2);
        ctx.fillStyle = ['#3a2416', '#4a3a30', '#2a2a30'][k % 3]; ctx.fillRect(-90, -24, 180, 48);
        ctx.restore();
      }
    });
  }

  function back(v) {
    // Debris tumbling past, never touching the disc
    for (let k = 0; k < 10; k++) {
      const t = ((frameCount * 0.7 + k * 43) % 200) / 200, x = -100 + t * 1100, y = 60 + _slHash(k + 1210) * 200 + Math.sin(t * 6 + k) * 20;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 8 + k); ctx.fillStyle = '#4a2e1e'; ctx.fillRect(-7, -5, 14, 10); ctx.restore();
    }
    // Wedged slabs
    for (let i = 0; i < WEDGE.length; i++) {
      const [x, y, w] = WEDGE[i];
      ctx.fillStyle = ['#4a2e1e', '#4a3a30', '#3a2a22'][i];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + 30); ctx.lineTo(x + 14, y + 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a4a32'; ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = '#2a160c'; ctx.fillRect(x + w / 2 - 8, y + 26, 16, G - y - 26);
    }
    // The anchor pylon (the nexus itself is drawn by the mode)
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(NX - 40, G - 40, 80, 40); ctx.fillRect(NX - 12, G - 150, 24, 110);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,200,140,${0.4 + 0.2 * Math.sin(frameCount * 0.05)})`; ctx.lineWidth = 2; ctx.strokeRect(NX - 12, G - 150, 24, 110);
    ctx.restore();
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#2a1a12'; ctx.fillRect(v.x - 20, G - 12, v.w + 40, 12);
      // The disc: level, round, unmoved
      ctx.strokeStyle = 'rgba(255,200,140,0.4)'; ctx.lineWidth = 1.5;
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(NX, G - 6, k * 130, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    // Under the disc's edge, the ground falls away in broken plates
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(v.x - 20, G, v.w + 40, 300);
    ctx.fillStyle = '#2e1a10'; ctx.beginPath(); ctx.moveTo(0, G); ctx.quadraticCurveTo(NX, G + 160, 900, G); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,140,0.5)'; ctx.fillRect(0, G, 900, 1.5);
  }

  STORY_LEVELS[121] = {
    sky: ['#100400', '#241006', '#44200c'],
    groundColor: '#1a0e08',
    platColor: '#4a2e1e',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
