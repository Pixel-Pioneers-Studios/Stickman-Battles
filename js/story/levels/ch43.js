'use strict';
// js/story/levels/ch43.js — Chapter 43 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 43 — The Pessimist (walk → duel vs the Third Architect)
// "Come up here, and fight me yourself." The summit of the ice dimension:
// you're above the weather now — a sea of cloud below the ridge, wind
// tearing across it ("summit winds — knockback is amplified at altitude").
// The ridge path passes the Architect's instruments: frost-glass slates where
// the outcomes are computed. At the midpoint, the observatory platform under
// the spire, and the great slate counting the fight — 812, then 813, then
// 814 once you've won. Ice-cave mouths are the cache shafts.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SPIRE = 3000;
  const CRAG = [[420, 350, 110], [540, 260, 120], [1180, 340, 120], [1320, 250, 110], [2220, 350, 110], [2350, 270, 110],
                [3640, 350, 110], [3770, 260, 120], [5060, 340, 120], [5200, 250, 120]];
  const SLATES = [900, 1400, 2400, 3900, 4300, 5400];
  const CAVES = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of CRAG) _slLedge(P, x, y, w);
    _slLedge(P, SPIRE - 320, 350, 100); _slLedge(P, SPIRE + 220, 350, 100);
    _slLedge(P, SPIRE - 80, 250, 160);   // observatory gallery under the spire
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1a2e48');
    _slParallax(v, 0.03, (l, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = Math.floor(l / 40); i * 40 < r; i++) if (_slHash(i + 2) < 0.18) ctx.fillRect(i * 40 + _slHash(i) * 30, -300 + _slHash(i + 9) * 380, 1.4, 1.4);
    });
    // Sea of cloud below the ridge
    _slParallax(v, 0.18, (l, r) => {
      for (let i = Math.floor(l / 140) - 1; i * 140 < r + 140; i++) {
        const cx = i * 140 + ((frameCount * 0.2) % 140), cy = 380 + _slHash(i) * 30;
        ctx.fillStyle = 'rgba(220,232,245,0.85)'; ctx.beginPath(); ctx.ellipse(cx, cy, 110, 34, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(220,232,245,0.9)'; ctx.fillRect(l - 20, 400, r - l + 40, 200);
    });
  }

  function back(v) {
    // Wind tearing across the summit
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    for (let k = 0; k < 24; k++) {
      const wy = v.y + _slHash(k) * v.h * 0.8, len = 40 + _slHash(k + 1) * 80;
      const wx = v.x + ((_slHash(k + 2) * v.w * 2 + frameCount * (9 + _slHash(k + 3) * 6)) % (v.w + 200)) - 100;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + len, wy + 2); ctx.stroke();
    }
    // Ridge crags
    for (const [x, y, w] of CRAG) {
      if (!_slVisible(v, x - 40, x + w + 40)) continue;
      ctx.fillStyle = '#6a86a0';
      ctx.beginPath(); ctx.moveTo(x - 30, G); ctx.lineTo(x, y + 6); ctx.lineTo(x + w, y); ctx.lineTo(x + w + 30, G); ctx.fill();
      ctx.fillStyle = '#e8f2fa'; ctx.fillRect(x, y, w, 6);
    }
    // Frost-glass slates with outcome tallies
    for (const sx of SLATES) {
      if (!_slVisible(v, sx - 50, sx + 50)) continue;
      ctx.fillStyle = '#4a6280'; ctx.fillRect(sx - 3, G - 120, 6, 120);
      ctx.fillStyle = 'rgba(210,235,255,0.35)'; ctx.fillRect(sx - 36, G - 190, 72, 70);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(sx - 36, G - 190, 72, 70);
      ctx.fillStyle = 'rgba(30,50,80,0.7)';
      for (let t = 0; t < 12; t++) ctx.fillRect(sx - 30 + (t % 6) * 11, G - 182 + Math.floor(t / 6) * 16, t % 5 === 4 ? 9 : 2, 10);
    }
    // Ice-cave mouths over the cache shafts
    for (const cx of CAVES) {
      if (!_slVisible(v, cx - 100, cx + 100)) continue;
      ctx.fillStyle = '#6a86a0';
      ctx.beginPath(); ctx.moveTo(cx - 100, G); ctx.quadraticCurveTo(cx - 80, G - 90, cx, G - 96); ctx.quadraticCurveTo(cx + 80, G - 90, cx + 100, G); ctx.lineTo(cx + 46, G); ctx.quadraticCurveTo(cx, G - 50, cx - 46, G); ctx.fill();
      ctx.fillStyle = '#e8f2fa'; ctx.fillRect(cx - 60, G - 94, 120, 4);
    }
    // The observatory: spire, gallery, and the great slate counting the fight
    if (_slVisible(v, SPIRE - 520, SPIRE + 520)) {
      ctx.fillStyle = '#5a7896';
      ctx.beginPath(); ctx.moveTo(SPIRE - 90, 250); ctx.lineTo(SPIRE, -120); ctx.lineTo(SPIRE + 90, 250); ctx.fill();
      ctx.fillStyle = '#e8f2fa'; ctx.fillRect(SPIRE - 80, 250, 160, 6);
      ctx.fillStyle = '#4a6280'; ctx.fillRect(SPIRE - 70, 256, 12, G - 256); ctx.fillRect(SPIRE + 58, 256, 12, G - 256);
      for (const sx of [SPIRE - 320, SPIRE + 220]) { ctx.fillStyle = '#6a86a0'; ctx.fillRect(sx, 350, 100, G - 350); ctx.fillStyle = '#e8f2fa'; ctx.fillRect(sx, 350, 100, 5); }
      const won = typeof exploreGoalFound !== 'undefined' && (exploreGoalFound || (exploreCheckpoints || []).some(c => c.hit && !c.rest && !exploreArenaLock));
      const fighting = typeof exploreArenaLock !== 'undefined' && !!exploreArenaLock;
      const n = won ? 814 : fighting ? 813 : 812;
      ctx.fillStyle = 'rgba(210,235,255,0.55)'; ctx.fillRect(SPIRE - 170, 110, 340, 110);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(SPIRE - 170, 110, 340, 110);
      ctx.fillStyle = '#1a2e48'; ctx.font = 'bold 34px Georgia'; ctx.textAlign = 'center';
      ctx.fillText(String(n), SPIRE, 174);
      ctx.font = 'italic 11px Georgia'; ctx.fillText(won ? 'I was wrong.' : 'outcomes computed — none end with me losing', SPIRE, 202);
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'rubble', face: 'concrete' }]); }

  STORY_LEVELS[43] = {
    sky: ['#1a2e48', '#8aa8c8'],
    groundColor: '#3a4e64',
    platColor: '#6a86a0',
    layout, backdrop, back, surface,
  };
})();
