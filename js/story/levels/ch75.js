'use strict';
// js/story/levels/ch75.js — Chapter 75 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 75 — What the Scar Remembers (defense)
// Back at the Threshold where Axiom struck you down — the same black plain,
// the dimension wall at the left edge, the machinery turning on the horizon.
// What's new is on the right: the wound where the loop dimension collapsed,
// a red tear still bleeding echo constructs into the void. The Void Anchor
// (the nexus, x=450) stands between the two on a ring of threshold stones,
// and above it Veran's signal tries to resolve — static at first, a face's
// outline by the last wave. The stones from the Axiom fight are here, fewer
// now: low steps either side of the anchor and one high stone over it.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450, WOUND = 860;
  const STONES = [[110, 340, 140], [650, 340, 140], [370, 240, 160]];

  function layout() {
    const P = [];
    for (const [x, y, w] of STONES) _slLedge(P, x, y, w);
    return P;
  }

  function progress() {
    const s = (typeof storeSurvivalState !== 'undefined') ? storeSurvivalState : null;
    return s && s.totalWaves ? Math.min(1, s.wave / s.totalWaves) : 0;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#000000');
    _slParallax(v, 0.08, (l, r) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const R = 240 - k * 44, t = frameCount * 0.002 * (k % 2 ? -1 : 1) + k;
        ctx.strokeStyle = `rgba(220,210,255,${0.08 + 0.03 * k})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(420, 300, R, R * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
        for (let j = 0; j < 10; j++) { const a = t + j * Math.PI / 5; ctx.fillStyle = 'rgba(230,220,255,0.22)'; ctx.fillRect(420 + Math.cos(a) * R - 3, 300 + Math.sin(a) * R * 0.22 - 2, 6, 4); }
      }
      ctx.restore();
    });
    const g = ctx.createLinearGradient(0, 330, 0, G);
    g.addColorStop(0, 'rgba(40,30,60,0)'); g.addColorStop(1, 'rgba(40,30,60,0.55)');
    ctx.fillStyle = g; ctx.fillRect(v.x - 10, 330, v.w + 20, G - 330);
  }

  function back(v) {
    const p = progress();
    // The dimension wall at the left edge
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let y = 0; y < G; y += 6) {
      ctx.fillStyle = `rgba(220,210,255,${0.10 + 0.08 * Math.sin(y * 0.08 + frameCount * 0.07)})`;
      ctx.fillRect(30 + Math.sin(y * 0.05 + frameCount * 0.03) * 3, y, 3, 4);
    }
    // The wound where the loop collapsed, still bleeding echoes
    const wg = ctx.createRadialGradient(WOUND, 300, 6, WOUND, 300, 180);
    wg.addColorStop(0, 'rgba(255,60,40,0.45)'); wg.addColorStop(1, 'rgba(160,0,0,0)');
    ctx.fillStyle = wg; ctx.fillRect(WOUND - 180, 120, 360, 360);
    ctx.restore();
    const pts = _slJag(WOUND, 160, WOUND - 6, G, 12, 16, 75);
    ctx.fillStyle = '#100000';
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + 14, y) : ctx.moveTo(x + 14, y));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0] - 14 - Math.sin(Math.PI * i / (pts.length - 1)) * 18, pts[i][1]);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,90,60,${0.7 + 0.2 * Math.sin(frameCount * 0.12)})`; ctx.lineWidth = 2;
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    for (let k = 0; k < 8; k++) {
      const t = ((frameCount * 0.7 + k * 40) % 220) / 220;
      ctx.fillStyle = `rgba(204,68,255,${0.5 * (1 - t)})`; ctx.fillRect(WOUND - 10 - t * 200, 200 + _slHash(k + 750) * 220, 4, 4);
    }
    // Threshold stones
    for (let i = 0; i < STONES.length; i++) {
      const [x, y, w] = STONES[i];
      ctx.fillStyle = '#0a0810';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 10, y + 14);
      for (let k = 5; k >= 0; k--) ctx.lineTo(x + 10 + (w - 20) * k / 5, y + 14 + 8 + _slHash(i * 9 + k + 750) * 20);
      ctx.lineTo(x + 10, y + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(240,236,255,0.85)'; ctx.fillRect(x, y, w, 2);
    }
    // Veran's signal resolving above the anchor
    const sy = 150;
    ctx.fillStyle = 'rgba(80,140,200,0.10)'; ctx.fillRect(NX - 50, sy - 40, 100, 80);
    ctx.strokeStyle = 'rgba(140,200,255,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(NX - 50, sy - 40, 100, 80);
    for (let k = 0; k < 16; k++) {
      ctx.fillStyle = `rgba(160,210,255,${(1 - p) * 0.4 * _slHash(k + (frameCount >> 2))})`;
      ctx.fillRect(NX - 48, sy - 38 + k * 5, 96, 2);
    }
    if (p > 0.3) {
      ctx.strokeStyle = `rgba(170,220,255,${p})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(NX, sy - 6, 14, 0, Math.PI * 2); ctx.moveTo(NX - 22, sy + 34); ctx.quadraticCurveTo(NX, sy + 6, NX + 22, sy + 34); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(170,220,255,0.8)'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(p >= 1 ? 'VERAN — LINK' : 'SIGNAL ' + Math.round(p * 100) + '%', NX, sy + 52);
    // Anchor plinth (the nexus itself is drawn by the mode)
    ctx.fillStyle = '#14101c'; ctx.fillRect(NX - 46, G - 30, 92, 30);
    ctx.fillStyle = 'rgba(240,236,255,0.7)'; ctx.fillRect(NX - 46, G - 30, 92, 2);
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(v.x - 20, G - 12, v.w + 40, 12);
      ctx.fillStyle = 'rgba(240,236,255,0.3)'; ctx.fillRect(v.x - 20, G - 12, v.w + 40, 1);
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 300);
    g.addColorStop(0, '#120e1a'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(v.x - 20, G, v.w + 40, 300);
    ctx.fillStyle = 'rgba(240,236,255,0.6)'; ctx.fillRect(v.x - 20, G, v.w + 40, 1.5);
  }

  STORY_LEVELS[75] = {
    sky: ['#000000', '#0a0614'],
    groundColor: '#06040a',
    platColor: '#0a0810',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
