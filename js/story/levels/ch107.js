'use strict';
// js/story/levels/ch107.js — Chapter 107 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 107 — Null (walk → duel vs Null, 1 life)
// Pattern Zero: the centre of Null's catalogue. The walk passes through the
// catalogue itself — 847 entries hung in the air as pale cards in columns,
// each with a stick-figure pose drawn on it, the habit Null recorded for that
// being. Thin threads run from every card toward the midpoint, where they
// converge on the point of origin, a single bright node over a floor of
// concentric rings ("All 847 entries. All 4,200 years. Against you."). Past
// the midpoint, the threads hang loose and the cards are blank — what the
// model could not fit. At the very end, off to one side, a chair and a lamp
// nobody has sat at for a long time. Floating catalogue frames are the climbs;
// the engine's chest perches at 1800 / 4680 stand clear of them.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, ORIGIN = 3000, CHAIR = 5500;
  const CLIMB = [[520, 350, 100], [650, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3790, 270, 110], [5050, 340, 110], [5180, 260, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, ORIGIN - 340, 360, 100); _slLedge(P, ORIGIN + 240, 360, 100);
    return P;
  }

  function pose(x, y, k) {
    const a = _slHash(k * 3 + 1070) - 0.5, b = _slHash(k * 3 + 1071) - 0.5;
    ctx.beginPath(); ctx.arc(x, y - 12, 2.5, 0, Math.PI * 2);
    ctx.moveTo(x, y - 9); ctx.lineTo(x + a * 4, y);
    ctx.moveTo(x, y - 6); ctx.lineTo(x + 6 * Math.cos(a * 3), y - 6 - 6 * Math.sin(a * 3));
    ctx.moveTo(x + a * 4, y); ctx.lineTo(x - 4 + b * 3, y + 7); ctx.moveTo(x + a * 4, y); ctx.lineTo(x + 4 + b * 3, y + 7);
    ctx.stroke();
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04030c');
    const x0 = v.x - 40, x1 = v.x + v.w + 40;
    ctx.lineWidth = 1;
    for (let c = Math.floor(x0 / 60); c * 60 < x1; c++) for (let r = 0; r < 5; r++) {
      const k = c * 5 + r, x = c * 60 + 20, y = 70 + r * 56 + Math.sin(frameCount * 0.01 + k) * 3;
      if (x < 0 || x > 6000) continue;
      const past = x > ORIGIN + 400;
      ctx.fillStyle = past ? 'rgba(60,58,90,0.5)' : 'rgba(200,196,230,0.55)'; ctx.fillRect(x - 12, y - 18, 24, 32);
      // Thread to the origin
      if (!past) { ctx.strokeStyle = 'rgba(170,160,240,0.08)'; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(ORIGIN, 220); ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(170,160,240,0.08)'; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x - 10, y + 70); ctx.stroke(); }
      if (!past) { ctx.strokeStyle = 'rgba(30,26,60,0.85)'; pose(x, y, k); }
    }
  }

  function back(v) {
    for (const [x, y, w] of CLIMB) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = 'rgba(200,196,230,0.12)'; ctx.fillRect(x, y, w, 46);
      ctx.strokeStyle = 'rgba(200,196,230,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, 46);
      ctx.fillStyle = 'rgba(220,215,255,0.8)'; ctx.fillRect(x, y, w, 2);
    }
    // The point of origin over its rings
    if (_slVisible(v, ORIGIN - 420, ORIGIN + 420)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(ORIGIN, 220, 4, ORIGIN, 220, 90);
      g.addColorStop(0, `rgba(240,236,255,${0.8 + 0.15 * Math.sin(frameCount * 0.06)})`); g.addColorStop(1, 'rgba(150,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(ORIGIN - 90, 130, 180, 180);
      ctx.restore();
      for (const x of [ORIGIN - 340, ORIGIN + 240]) { ctx.fillStyle = '#1a1830'; ctx.fillRect(x, 360, 100, G - 360); ctx.fillStyle = 'rgba(220,215,255,0.7)'; ctx.fillRect(x, 360, 100, 2); }
    }
    // A chair and a lamp nobody has sat at for a long time
    if (_slVisible(v, CHAIR - 80, CHAIR + 120)) {
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(CHAIR, G - 36, 30, 5); ctx.fillRect(CHAIR + 2, G - 31, 4, 31); ctx.fillRect(CHAIR + 24, G - 31, 4, 31); ctx.fillRect(CHAIR + 24, G - 70, 4, 39);
      ctx.fillRect(CHAIR + 70, G - 110, 4, 110); ctx.fillRect(CHAIR + 58, G - 116, 28, 8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CHAIR + 72, G - 104, 2, CHAIR + 72, G - 104, 70);
      g.addColorStop(0, 'rgba(255,210,140,0.35)'); g.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = g; ctx.fillRect(CHAIR, G - 180, 150, 180);
      ctx.restore();
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(6020, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#262440'; ctx.fillRect(x0, G - 12, x1 - x0, 12);
      if (_slVisible(v, ORIGIN - 300, ORIGIN + 300)) { ctx.strokeStyle = 'rgba(200,190,255,0.4)'; ctx.lineWidth = 1; for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.ellipse(ORIGIN, G - 6, k * 60, 4, 0, 0, Math.PI * 2); ctx.stroke(); } }
      return;
    }
    ctx.fillStyle = '#12101e'; ctx.fillRect(x0, G, x1 - x0, 200);
    ctx.strokeStyle = 'rgba(160,150,255,0.25)'; ctx.lineWidth = 1;
    for (let x = Math.ceil(x0 / 40) * 40; x < x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, G); ctx.lineTo(x, G + 80); ctx.stroke(); }
    ctx.fillStyle = 'rgba(200,190,255,0.6)'; ctx.fillRect(x0, G, x1 - x0, 1.5);
  }

  STORY_LEVELS[107] = {
    sky: ['#04030c', '#080614', '#0c0a1e'],
    groundColor: '#04030c',
    platColor: '#262440',
    noGroundFill: true,
    layout, backdrop, back, surface,
  };
})();
