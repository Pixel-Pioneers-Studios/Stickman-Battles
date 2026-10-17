'use strict';
// js/story/levels/ch76.js — Chapter 76 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 76 — The First Gate (walk → duel vs two Void Guardians)
// The Void Between's outer threshold: a causeway of pale gold stone laid across
// nothing, built by the Fallen God. A colonnade runs along it, half fallen —
// broken drums and toppled lintels are the climbs. The outer gate (a pair of
// obelisks bridged by a bar of light) marks the first checkpoint. At the
// midpoint the First Gate itself: two pylons, each with an empty guardian
// niche, under the one word cut in the lintel — the guardians who test you
// are "questions", and they step down out of those niches. Behind everything
// a vast dim halo hangs in the void; it brightens past the gate as the voice
// "returns — closer now, more present". Beyond, the causeway runs on toward
// the remnant space, its edges starting to crumble. The chest climbs at
// 1800 / 4680 are the engine's; the colonnade keeps clear of them.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, OUTER = 1500, GATE = 3000, END = 5650;
  const CLIMB = [[520, 350, 100], [640, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
                 [3660, 350, 100], [3780, 270, 110], [5050, 340, 110], [5180, 260, 110]];
  const COLS = [300, 460, 900, 1050, 2050, 2500, 3500, 3950, 4250, 4950, 5400];

  function layout() {
    const P = [];
    for (const [x, y, w] of CLIMB) _slLedge(P, x, y, w);
    _slLedge(P, GATE - 340, 360, 100); _slLedge(P, GATE + 240, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05040a');
    // Gold dust drifting in the void
    _slParallax(v, 0.05, (l, r) => {
      for (let i = Math.floor(l / 40); i * 40 < r; i++) {
        const y = -200 + _slHash(i + 760) * 640, a = 0.2 + 0.4 * _slHash(i + 761);
        ctx.fillStyle = `rgba(255,220,140,${a * (0.6 + 0.4 * Math.sin(frameCount * 0.02 + i))})`;
        ctx.fillRect(i * 40 + _slHash(i) * 30, y, 1.5, 1.5);
      }
    });
    // The halo: the Fallen God's presence, brighter past the gate
    _slParallax(v, 0.12, (l, r) => {
      const near = Math.max(0, Math.min(1, (v.x + v.w / 2 - 1500) / 3000));
      const cx = 3000 * 0.12 + 450, cy = 150;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `rgba(255,210,120,${(0.06 + near * 0.16) / (k + 1)})`; ctx.lineWidth = 6 - k * 2;
        ctx.beginPath(); ctx.arc(cx, cy, 200 + k * 40, 0, Math.PI * 2); ctx.stroke();
      }
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 240);
      g.addColorStop(0, `rgba(255,220,150,${0.05 + near * 0.12})`); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 240, cy - 240, 480, 480);
      ctx.restore();
    });
  }

  function column(x, h, broken) {
    ctx.fillStyle = '#b8a070'; ctx.fillRect(x - 14, G - h, 28, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = -8; k <= 8; k += 6) ctx.fillRect(x + k, G - h, 2, h);
    ctx.fillStyle = '#cbb486'; ctx.fillRect(x - 20, G - 12, 40, 12);
    if (!broken) { ctx.fillRect(x - 20, G - h - 10, 40, 10); return; }
    ctx.fillStyle = '#b8a070';
    ctx.beginPath(); ctx.moveTo(x - 14, G - h); ctx.lineTo(x - 4, G - h - 14); ctx.lineTo(x + 6, G - h - 4); ctx.lineTo(x + 14, G - h - 10); ctx.lineTo(x + 14, G - h); ctx.fill();
  }

  function pylon(x, w, h) {
    ctx.fillStyle = '#a89060'; ctx.fillRect(x, G - h, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, G - h, 6, h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + w - 8, G - h, 8, h);
    // Empty guardian niche
    ctx.fillStyle = '#4a3c24'; ctx.fillRect(x + w / 2 - 26, G - 150, 52, 130);
    ctx.beginPath(); ctx.arc(x + w / 2, G - 150, 26, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#cbb486'; ctx.fillRect(x + w / 2 - 32, G - 22, 64, 8);
  }

  function back(v) {
    for (let i = 0; i < COLS.length; i++) if (_slVisible(v, COLS[i] - 30, COLS[i] + 30)) column(COLS[i], 170 + _slHash(i + 76) * 60, i % 3 === 1);
    // Colonnade climbs: broken drums (steps) and toppled lintels (high ledges)
    for (let i = 0; i < CLIMB.length; i++) {
      const [x, y, w] = CLIMB[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      if (y > 300) {
        ctx.fillStyle = '#b8a070'; ctx.fillRect(x + 8, y, w - 16, G - y);
        ctx.fillStyle = '#cbb486'; ctx.fillRect(x, y, w, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = x + 16; k < x + w - 12; k += 14) ctx.fillRect(k, y + 8, 2, G - y - 8);
      } else {
        ctx.fillStyle = '#cbb486'; ctx.fillRect(x, y, w, 14);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x, y + 10, w, 4);
        ctx.fillStyle = '#a89060'; ctx.fillRect(x + w - 24, y + 14, 16, G - y - 14);
      }
    }
    // The outer gate: two obelisks bridged by a bar of light
    if (_slVisible(v, OUTER - 160, OUTER + 160)) {
      for (const ox of [OUTER - 120, OUTER + 100]) {
        ctx.fillStyle = '#a89060';
        ctx.beginPath(); ctx.moveTo(ox, G); ctx.lineTo(ox + 4, G - 230); ctx.lineTo(ox + 10, G - 250); ctx.lineTo(ox + 16, G - 230); ctx.lineTo(ox + 20, G); ctx.fill();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,220,140,${0.5 + 0.2 * Math.sin(frameCount * 0.05)})`; ctx.fillRect(OUTER - 106, G - 222, 212, 4);
      ctx.restore();
    }
    // The First Gate
    if (_slVisible(v, GATE - 420, GATE + 420)) {
      ctx.fillStyle = '#cbb486'; ctx.fillRect(GATE - 360, 360, 100, 8); ctx.fillRect(GATE + 240, 360, 100, 8);
      ctx.fillStyle = '#a89060'; ctx.fillRect(GATE - 350, 368, 80, G - 368); ctx.fillRect(GATE + 250, 368, 80, G - 368);
      pylon(GATE - 250, 110, 300); pylon(GATE + 140, 110, 300);
      ctx.fillStyle = '#b8a070'; ctx.fillRect(GATE - 270, G - 330, 540, 40);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(GATE - 270, G - 294, 540, 4);
      ctx.fillStyle = '#5a4628'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center'; ctx.fillText('ANSWER', GATE, G - 304);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(GATE - 140, 0, GATE + 140, 0);
      g.addColorStop(0, 'rgba(255,220,150,0)'); g.addColorStop(0.5, 'rgba(255,220,150,0.18)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(GATE - 140, G - 290, 280, 290);
      ctx.restore();
    }
    // The far end: the causeway runs on into remnant space
    if (_slVisible(v, END - 300, END + 400)) {
      for (let k = 0; k < 10; k++) {
        const bx = END - 100 + _slHash(k + 7600) * 400, by = 160 + _slHash(k + 7601) * 200 + Math.sin(frameCount * 0.02 + k) * 6;
        ctx.fillStyle = k % 2 ? '#b8a070' : '#8a7a5a'; ctx.fillRect(bx, by, 20 + _slHash(k) * 30, 10 + _slHash(k + 1) * 12);
      }
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-20, v.x - 20), x1 = Math.min(6020, v.x + v.w + 20);
    if (ph === 'back') {
      ctx.fillStyle = '#d0bc90'; ctx.fillRect(x0, G - 14, x1 - x0, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x0, G - 14, x1 - x0, 1.5);
      ctx.strokeStyle = 'rgba(80,60,30,0.25)'; ctx.lineWidth = 1;
      for (let jx = Math.ceil(x0 / 64) * 64; jx < x1; jx += 64) { ctx.beginPath(); ctx.moveTo(jx, G - 14); ctx.lineTo(jx - 5, G); ctx.stroke(); }
      return;
    }
    // Causeway cross-section tapering into the void; crumbling past the last checkpoint
    ctx.fillStyle = '#8a7650';
    ctx.beginPath(); ctx.moveTo(x0, G);
    for (let x = Math.floor(x0 / 60) * 60; x <= x1 + 60; x += 60) ctx.lineTo(x, G + 60 + _slHash(Math.floor(x / 60) + 7700) * 50);
    ctx.lineTo(x1 + 60, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a89060'; ctx.fillRect(x0, G, x1 - x0, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0, G + 10, x1 - x0, 2);
    for (let k = Math.floor(Math.max(x0, 4600) / 50); k * 50 < x1; k++) {
      const t = ((frameCount * 0.5 + k * 23) % 160) / 160;
      ctx.fillStyle = `rgba(168,144,96,${1 - t})`; ctx.fillRect(k * 50 + _slHash(k) * 40, G + 50 + t * 160, 5, 5);
    }
  }

  STORY_LEVELS[76] = {
    sky: ['#05040a', '#16120c'],
    groundColor: '#05040a',
    platColor: '#cbb486',
    noGroundFill: true,
    layout, backdrop, back, surface,
  };
})();
