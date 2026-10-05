'use strict';
// js/story/levels/ch68.js — Chapter 68 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 68 — Awakening (walk → duel vs two Breach Response Units)
// The stasis chamber in the sealed section. A long hall of preservation
// columns, numbered S-01 to S-19: most stand dark and empty, a few still
// glowing with fluid and nothing inside. At the midpoint is the column the
// fluid has drained from — glass swung open, a pool on the floor where Calix
// fell to their knees "coughing out preservation fluid." The breach alarm is
// sounding: red strobes sweep the hall, and the response units come out of
// the maintenance bays. Column caps and control galleries are the climbs; the
// cache shafts are drain sumps.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, OPEN = 3000;
  const GAL = [[420, 350, 100], [540, 270, 110], [1150, 340, 110], [1280, 260, 110], [2230, 350, 100], [2350, 270, 110],
               [3660, 350, 100], [3780, 270, 110], [5060, 340, 110], [5190, 260, 110]];
  const COLS = [];
  for (let k = 0; k < 19; k++) COLS.push({ x: 300 + k * 290, n: k + 1 });
  const SUMPS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of GAL) _slLedge(P, x, y, w);
    _slLedge(P, OPEN - 340, 360, 100); _slLedge(P, OPEN + 240, 360, 100);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0a0e0c'); }

  function column(x, n, state) {
    ctx.fillStyle = '#2a3430'; ctx.fillRect(x - 40, 90, 80, 24); ctx.fillRect(x - 40, G - 40, 80, 40);
    if (state === 'lit') { ctx.fillStyle = 'rgba(120,220,200,0.30)'; ctx.fillRect(x - 28, 114, 56, G - 154); }
    else { ctx.fillStyle = 'rgba(30,40,38,0.6)'; ctx.fillRect(x - 28, 114, 56, G - 154); }
    ctx.strokeStyle = 'rgba(200,240,230,0.45)'; ctx.lineWidth = 2; ctx.strokeRect(x - 28, 114, 56, G - 154);
    ctx.fillStyle = state === 'lit' ? '#44ff88' : '#3a4a42'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('S-' + String(n).padStart(2, '0'), x, 86);
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    ctx.fillStyle = '#2e3a34'; ctx.fillRect(x0, 60, x1 - x0, 380);
    ctx.fillStyle = '#1e2622'; ctx.fillRect(x0, 40, x1 - x0, 24);
    // The preservation columns, S-01 to S-19
    for (const c of COLS) {
      if (!_slVisible(v, c.x - 60, c.x + 60) || Math.abs(c.x - OPEN) < 200) continue;
      column(c.x, c.n, _slHash(c.n + 68) < 0.25 ? 'lit' : 'dark');
    }
    // Control galleries
    for (const [x, y, w] of GAL) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#5a6a62'; ctx.fillRect(x, y, w, 9);
      ctx.strokeStyle = '#4a5a52'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + w, y - 18); ctx.moveTo(x + 8, y); ctx.lineTo(x + 8, G); ctx.moveTo(x + w - 8, y); ctx.lineTo(x + w - 8, G); ctx.stroke();
    }
    for (const sx of SUMPS) if (_slVisible(v, sx - 80, sx + 80)) { ctx.fillStyle = 'rgba(120,220,200,0.3)'; ctx.fillRect(sx - 80, G - 4, 34, 4); ctx.fillRect(sx + 46, G - 4, 34, 4); }
    // The opened column: glass swung back, fluid pooled on the floor
    if (_slVisible(v, OPEN - 500, OPEN + 500)) {
      ctx.fillStyle = '#2a3430'; ctx.fillRect(OPEN - 50, 90, 100, 28); ctx.fillRect(OPEN - 50, G - 40, 100, 40);
      ctx.strokeStyle = 'rgba(200,240,230,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(OPEN - 34, 118, 68, G - 158);
      ctx.save(); ctx.translate(OPEN + 34, 118); ctx.transform(1, 0.3, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(160,230,215,0.18)'; ctx.fillRect(0, 0, 36, G - 158); ctx.strokeRect(0, 0, 36, G - 158); ctx.restore();
      ctx.fillStyle = 'rgba(120,220,200,0.35)'; ctx.beginPath(); ctx.ellipse(OPEN + 30, G - 2, 110, 5, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 5; k++) { const t = ((frameCount + k * 23) % 90) / 90; ctx.fillStyle = 'rgba(160,230,215,0.6)'; ctx.fillRect(OPEN - 20 + k * 10, G - 40 + t * 36, 2, 4); }
      ctx.fillStyle = '#ff4433'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('S-?? — BREACH', OPEN, 82);
      for (const sx of [OPEN - 340, OPEN + 240]) { ctx.fillStyle = '#5a6a62'; ctx.fillRect(sx, 360, 100, 9); ctx.fillStyle = '#2a3430'; ctx.fillRect(sx + 10, 369, 80, G - 369); }
    }
    // Breach alarm: red strobes sweeping the hall
    const ph = frameCount * 0.06;
    for (let k = Math.floor(x0 / 600); k * 600 < x1; k++) {
      const sx = k * 600 + 150;
      ctx.fillStyle = '#4a1a14'; ctx.fillRect(sx - 10, 42, 20, 14);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const a = Math.sin(ph + k) * 0.9;
      ctx.fillStyle = `rgba(255,50,30,${0.10 + 0.08 * Math.max(0, Math.sin(ph * 2 + k))})`;
      ctx.beginPath(); ctx.moveTo(sx, 56); ctx.lineTo(sx + Math.sin(a) * 400 - 60, G); ctx.lineTo(sx + Math.sin(a) * 400 + 60, G); ctx.fill();
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tunnel', face: 'concrete' }]); }

  STORY_LEVELS[68] = {
    sky: ['#0a0e0c', '#1a2420'],
    groundColor: '#121a16',
    platColor: '#5a6a62',
    layout, backdrop, back, surface,
  };
})();
