'use strict';
// js/story/levels/ch141.js — Chapter 141 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 141 — Second Form (walk → duel vs the Creator, 1 life)
// The Final Combat Space: "everything the first one had learned. And then
// more." The domain stops pretending to be a building. The walk runs along a
// single white causeway through open lattice-space; the panels of the first
// form's hall drift past in pieces, and the lattice around you is armoured
// now — every node a hard violet stud. At the midpoint the causeway widens
// into a disc where the Creator waits under its own design drawings, huge
// and faint in the sky ("I designed it before I knew you"). Past it, at the
// far end, the rift: the last threshold. Floating hall panels are the climbs;
// the chest climbs at 1800 / 4680 are the engine's.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DISC = 3000, RIFT = 5650;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, DISC - 340, 360, 100); _slLedge(P, DISC + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    // Armoured lattice-space: every node a hard stud
    _slParallax(v, 0.2, (l, r) => {
      _slLattice(Math.floor(l / 40) * 40, -200, r - l + 80, 640, 0.12, 40);
      ctx.fillStyle = 'rgba(160,120,255,0.5)';
      for (let x = Math.floor(l / 40) * 40; x < r + 40; x += 40) for (let y = -200; y < 440; y += 40) ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    // Its design drawings, huge and faint in the sky over the disc
    _slParallax(v, 0.1, (l, r) => {
      const cx = DISC * 0.1 + 450;
      if (cx < l - 400 || cx > r + 400) return;
      ctx.strokeStyle = 'rgba(220,210,255,0.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, 100, 30, 0, Math.PI * 2); ctx.moveTo(cx, 130); ctx.lineTo(cx, 260); ctx.moveTo(cx - 80, 170); ctx.lineTo(cx + 80, 170); ctx.moveTo(cx, 260); ctx.lineTo(cx - 50, 360); ctx.moveTo(cx, 260); ctx.lineTo(cx + 50, 360); ctx.stroke();
      ctx.setLineDash([6, 6]); ctx.strokeRect(cx - 160, 40, 320, 340); ctx.setLineDash([]);
    });
  }

  function back(v) {
    // Pieces of the first form's hall drifting past
    for (let k = 0; k < 8; k++) {
      const x = v.x + ((frameCount * (0.4 + k * 0.05) + k * 300) % (v.w + 400)) - 200, y = 90 + (k % 4) * 50;
      ctx.save(); ctx.translate(x, y); ctx.rotate(frameCount * 0.002 * (k % 2 ? 1 : -1) + k);
      ctx.fillStyle = 'rgba(216,212,228,0.35)'; ctx.fillRect(-30, -8, 60, 16); ctx.restore();
    }
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, y, w, 14); ctx.strokeStyle = 'rgba(120,100,200,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 14);
    }
    if (_slVisible(v, DISC - 420, DISC + 420)) for (const x of [DISC - 340, DISC + 240]) { ctx.fillStyle = '#ece8f8'; ctx.fillRect(x, 360, 100, 14); ctx.fillStyle = 'rgba(120,100,200,0.5)'; ctx.fillRect(x + 44, 374, 12, G - 374); }
    // The rift at the far end
    if (_slVisible(v, RIFT - 200, RIFT + 300)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(RIFT + 60, 260, 6, RIFT + 60, 260, 220); g.addColorStop(0, 'rgba(255,250,255,0.85)'); g.addColorStop(1, 'rgba(180,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(RIFT - 160, 40, 440, 440); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(6020, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(x0, G - 10, x1 - x0, 10);
      if (_slVisible(v, DISC - 320, DISC + 320)) { ctx.strokeStyle = 'rgba(120,100,200,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(DISC, G - 5, 300, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    // A single white causeway through open lattice-space
    ctx.fillStyle = '#d8d4e4'; ctx.fillRect(x0, G, x1 - x0, 16);
    ctx.fillStyle = 'rgba(120,100,200,0.6)'; for (let x = Math.ceil(x0 / 200) * 200; x < x1; x += 200) ctx.fillRect(x - 4, G + 16, 8, 140);
  }

  STORY_LEVELS[141] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#080012',
    platColor: '#ece8f8',
    noGroundFill: true,
    layout, backdrop, back, surface,
  };
})();
