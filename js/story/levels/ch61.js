'use strict';
// js/story/levels/ch61.js — Chapter 61 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 61 — Against the Architect (walk → duel vs the Third Architect + a
// Creator construct)
// The confrontation point. "Just long enough for the trade to finalize." The
// walk passes the Third Architect's last frost-glass slates, each one a model
// of this exact moment; the duel ground is the open square in front of the
// trade itself — a tall portal in the Creator's white, with the fifty-two
// absorbed dimensions rising out of it as points of light, one by one, while
// the fight runs. Once the duel is won the portal finishes: all fifty-two
// lights are free. Slate stands and ice terraces are the climbs; the cache
// shafts are frost-cut vents.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SQUARE = 3000, PORTAL = 3000;
  const TERR = [[420, 350, 100], [540, 270, 120], [1150, 340, 110], [1280, 260, 110], [2220, 350, 100], [2340, 270, 120],
                [3660, 350, 100], [3780, 270, 120], [5060, 340, 110], [5190, 260, 120]];
  const SLATES = [[800, 'model 1,397'], [1450, 'model 1,398'], [2500, 'model 1,399'], [3500, 'model 1,400'], [4300, '1,401?'], [5450, 'cost ≠ 0']];
  const VENTS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of TERR) _slLedge(P, x, y, w);
    _slLedge(P, SQUARE - 330, 360, 100); _slLedge(P, SQUARE + 230, 360, 100);
    return P;
  }

  function freed() {
    if (typeof exploreArenaLock === 'undefined') return 0;
    const fought = (exploreCheckpoints || []).some(c => c.hit && !c.rest);
    if (!fought) return 6;
    if (!exploreArenaLock) return 52;
    return Math.min(51, 6 + Math.floor((frameCount - (exploreArenaLock.bornFrame || frameCount)) / 90));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c1220');
    _slParallax(v, 0.06, (l, r) => {
      ctx.fillStyle = 'rgba(220,235,255,0.5)';
      for (let i = Math.floor(l / 30); i * 30 < r; i++) if (_slHash(i + 61) < 0.2) ctx.fillRect(i * 30 + _slHash(i) * 20, -200 + _slHash(i + 3) * 560, 1.2, 1.2);
    });
  }

  function back(v) {
    for (const [x, y, w] of TERR) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = 'rgba(150,190,225,0.5)'; ctx.fillRect(x, y, w, G - y);
      ctx.fillStyle = '#d8eefc'; ctx.fillRect(x, y, w, 5);
    }
    for (const [sx, txt] of SLATES) {
      if (!_slVisible(v, sx - 60, sx + 60)) continue;
      ctx.fillStyle = '#3a4a60'; ctx.fillRect(sx - 3, G - 120, 6, 120);
      ctx.fillStyle = 'rgba(200,225,250,0.35)'; ctx.fillRect(sx - 45, G - 200, 90, 80);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(sx - 45, G - 200, 90, 80);
      ctx.fillStyle = 'rgba(20,30,60,0.8)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(txt, sx, G - 158);
      ctx.fillText('outcome: same', sx, G - 144);
    }
    for (const vx of VENTS) if (_slVisible(v, vx - 80, vx + 80)) {
      ctx.fillStyle = 'rgba(150,190,225,0.6)'; ctx.beginPath(); ctx.moveTo(vx - 90, G); ctx.lineTo(vx - 70, G - 40); ctx.lineTo(vx - 46, G); ctx.moveTo(vx + 90, G); ctx.lineTo(vx + 66, G - 50); ctx.lineTo(vx + 46, G); ctx.fill();
    }
    // The trade: a white portal, the absorbed dimensions rising free from it
    if (_slVisible(v, PORTAL - 500, PORTAL + 500)) {
      const n = freed();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(PORTAL, G - 200, 10, PORTAL, G - 200, 260);
      g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(PORTAL - 270, G - 470, 540, 470);
      ctx.restore();
      ctx.strokeStyle = '#f0f4ff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(PORTAL, G - 200, 70, 150, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(240,244,255,0.5)'; ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + frameCount * 0.004; ctx.beginPath(); ctx.moveTo(PORTAL + Math.cos(a) * 70, G - 200 + Math.sin(a) * 150); ctx.lineTo(PORTAL + Math.cos(a) * 110, G - 200 + Math.sin(a) * 200); ctx.stroke(); }
      for (let k = 0; k < n; k++) {
        const t = ((frameCount * 0.6 + k * 47) % 400) / 400;
        const lx = PORTAL + Math.sin(k * 2.3) * (40 + t * 260), ly = G - 200 - t * 320;
        ctx.fillStyle = `hsla(${(k * 37) % 360},70%,75%,${0.85 * (1 - t * 0.6)})`;
        ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(230,236,255,0.85)'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TRADE  ' + n + ' / 52', PORTAL, G - 380);
      for (const sx of [SQUARE - 330, SQUARE + 230]) { ctx.fillStyle = 'rgba(150,190,225,0.6)'; ctx.fillRect(sx, 360, 100, G - 360); ctx.fillStyle = '#d8eefc'; ctx.fillRect(sx, 360, 100, 5); }
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[61] = {
    sky: ['#0c1220', '#2a3a58'],
    groundColor: '#121a28',
    platColor: '#7aa0c0',
    layout, backdrop, back, surface,
  };
})();
