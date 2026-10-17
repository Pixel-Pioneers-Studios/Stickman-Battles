'use strict';
// js/story/levels/ch81.js — Chapter 81 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 81 — What Was Before (puzzle, 3 memory locks)
// The Last Threshold before the Creator's domain: a gold walkway in the void
// with the Fallen God's final understanding sealed into three memory locks,
// each a shrine standing under one panel of a mural. Unlit, the panels are
// outlines; each lock lights its panel. The first shows what was before the
// walls — worlds overlapping, bleeding into each other. The second, the one
// failure that taught it why — a world coming apart where it touched another.
// The third, the walls — every world held in its own ring. Lock 1 sits on a
// low dais, lock 2 on a raised pedestal, lock 3 on a stepped plinth (their
// heights match puzzleSwitchDefs). Floating stair fragments are the climbs.
// The Separation Seal at the end is a gold disc, half dark and half light.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SEAL = 2900;
  const LOCKS = [[600, 385], [1400, 350], [2500, 370]];
  const STAIRS = [[800, 350, 100], [920, 270, 110], [1650, 350, 100], [1770, 270, 110], [2150, 340, 110], [2280, 260, 110]];

  function layout() {
    const P = [];
    for (const [x, y] of LOCKS) _slLedge(P, x - 50, y, 100);
    _slLedge(P, 1300, 395, 60);                                   // step up to the pedestal
    for (const [x, y, w] of STAIRS) _slLedge(P, x, y, w);
    return P;
  }

  const step = () => (typeof puzzleStep !== 'undefined' ? puzzleStep : 0);

  function panel(cx, k, lit) {
    const y0 = 90, w = 260, h = 170;
    ctx.fillStyle = lit ? 'rgba(60,46,20,0.85)' : 'rgba(20,16,10,0.85)'; ctx.fillRect(cx - w / 2, y0, w, h);
    ctx.strokeStyle = lit ? '#e8c878' : 'rgba(200,170,110,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(cx - w / 2, y0, w, h);
    const col = (a) => lit ? `rgba(255,220,140,${a})` : `rgba(200,170,110,${a * 0.35})`;
    ctx.lineWidth = 1.5;
    if (k === 0) {
      // Before: worlds overlapping, bleeding into each other
      for (let j = 0; j < 4; j++) {
        ctx.strokeStyle = col(0.8); ctx.fillStyle = col(0.12);
        ctx.beginPath(); ctx.arc(cx - 60 + j * 40, y0 + 85 + (j % 2 ? -14 : 14), 38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (k === 1) {
      // The failure: a world coming apart where it touched another
      ctx.strokeStyle = col(0.8); ctx.fillStyle = col(0.12);
      ctx.beginPath(); ctx.arc(cx - 40, y0 + 85, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let j = 0; j < 7; j++) {
        const a = -0.9 + j * 0.3, d = 50 + _slHash(j + 810) * 40;
        ctx.fillStyle = col(0.7); ctx.fillRect(cx + 30 + Math.cos(a) * d * 0.6, y0 + 85 + Math.sin(a) * d, 8 + _slHash(j) * 10, 6);
      }
      ctx.beginPath(); _slJag(cx, y0 + 30, cx + 6, y0 + 140, 6, 8, 81).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    } else {
      // The walls: every world held in its own ring
      for (let j = 0; j < 3; j++) {
        const x = cx - 80 + j * 80;
        ctx.strokeStyle = col(0.9); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y0 + 85, 36, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.fillStyle = col(0.15); ctx.beginPath(); ctx.arc(x, y0 + 85, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05040a');
    _slParallax(v, 0.06, (l, r) => {
      for (let i = Math.floor(l / 36); i * 36 < r; i++) {
        ctx.fillStyle = `rgba(255,220,150,${0.15 + 0.3 * _slHash(i + 811)})`;
        ctx.fillRect(i * 36 + _slHash(i) * 30, -200 + _slHash(i + 812) * 640, 1.5, 1.5);
      }
    });
  }

  function back(v) {
    const n = step();
    for (let k = 0; k < 3; k++) {
      const [x, y] = LOCKS[k];
      if (!_slVisible(v, x - 160, x + 160)) continue;
      panel(x, k, k < n);
      // The shrine the lock stands in
      ctx.fillStyle = '#5a4a28'; ctx.fillRect(x - 50, y, 100, G - y);
      ctx.fillStyle = '#d8c088'; ctx.fillRect(x - 54, y, 108, 5);
      ctx.fillStyle = '#3a3020'; ctx.fillRect(x - 40, y - 110, 8, 110); ctx.fillRect(x + 32, y - 110, 8, 110);
      ctx.fillStyle = '#5a4a28'; ctx.beginPath(); ctx.moveTo(x - 50, y - 110); ctx.lineTo(x, y - 140); ctx.lineTo(x + 50, y - 110); ctx.fill();
      if (k < n) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y - 50, 4, x, y - 50, 90);
        g.addColorStop(0, 'rgba(255,220,140,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, y - 140, 180, 180);
        ctx.restore();
      }
    }
    if (_slVisible(v, 1290, 1370)) { ctx.fillStyle = '#5a4a28'; ctx.fillRect(1300, 395, 60, G - 395); ctx.fillStyle = '#d8c088'; ctx.fillRect(1298, 395, 64, 4); }
    // Floating stair fragments
    for (let i = 0; i < STAIRS.length; i++) {
      const [x, y, w] = STAIRS[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#5a4a28';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 14, y + 22); ctx.lineTo(x + w * 0.5, y + 34 + _slHash(i + 813) * 14); ctx.lineTo(x + 12, y + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8c088'; ctx.fillRect(x, y, w, 4);
    }
    // The Separation Seal: a gold disc, half dark, half light
    if (_slVisible(v, SEAL - 160, SEAL + 160)) {
      const cy = G - 150, R = 110, open = n >= 3;
      ctx.fillStyle = '#0a0806'; ctx.beginPath(); ctx.arc(SEAL, cy, R, Math.PI / 2, Math.PI * 1.5); ctx.fill();
      ctx.fillStyle = '#e8d8a8'; ctx.beginPath(); ctx.arc(SEAL, cy, R, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.strokeStyle = '#d8c088'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(SEAL, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SEAL, cy - R); ctx.lineTo(SEAL, cy + R); ctx.stroke();
      if (open) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,230,160,${0.5 + 0.3 * Math.sin(frameCount * 0.08)})`; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(SEAL, cy, R + 10, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(3220, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#b8a070'; ctx.fillRect(x0, G - 12, x1 - x0, 12);
      ctx.fillStyle = 'rgba(255,240,200,0.3)'; ctx.fillRect(x0, G - 12, x1 - x0, 1.5);
      return;
    }
    ctx.fillStyle = '#6a5a38';
    ctx.beginPath(); ctx.moveTo(x0, G);
    for (let x = Math.floor(x0 / 60) * 60; x <= x1 + 60; x += 60) ctx.lineTo(x, G + 40 + _slHash(Math.floor(x / 60) + 8100) * 40);
    ctx.lineTo(x1 + 60, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8c088'; ctx.fillRect(x0, G, x1 - x0, 3);
  }

  STORY_LEVELS[81] = {
    sky: ['#05040a', '#16120c'],
    groundColor: '#05040a',
    platColor: '#5a4a28',
    noGroundFill: true,
    sceneX: 2700,
    layout, backdrop, back, surface,
  };
})();
