'use strict';
// js/story/levels/ch29.js — Chapter 29 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 29 — Deep Fragment (walk → duel vs the Crucible Champion)
// "The Crucible. Where the rift entity tested and broke fragment bearers who
// made it this far. The last forty-seven had failed here." Through the door
// from chapter 28 into a round pit-arena carved in basalt. Forty-seven marks
// are cut into the ring wall, one per failed bearer, with an empty space for
// the forty-eighth. Spectator ledges spiral up the wall; the champion's
// dais is the midpoint. On victory the 47 signatures release — the far side
// is the open core, the compass burning white.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, PIT = 3000;
  const RING_LEDGES = [[2380, G - 90, 140], [2300, G - 190, 140], [2400, G - 290, 160], [3480, G - 90, 140], [3560, G - 190, 140], [3440, G - 290, 160]];
  const ENTRY = [[600, G - 70, 120], [1500, G - 110, 160], [1680, G - 210, 120], [4600, G - 100, 160], [4800, G - 200, 140]];

  function layout() {
    const P = [];
    for (const [x, y, w] of RING_LEDGES) _slLedge(P, x, y, w);
    for (const [x, y, w] of ENTRY) _slLedge(P, x, y, w);
    _slLedge(P, PIT - 80, G - 40, 160);           // the dais
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#140200');
    _slParallax(v, 0.2, (l, r) => {
      const g = ctx.createRadialGradient(l + (r - l) / 2, G, 40, l + (r - l) / 2, G, 800);
      g.addColorStop(0, 'rgba(255,110,30,0.35)'); g.addColorStop(1, 'rgba(255,110,30,0)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, -300, r - l + 40, 900);
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    ctx.fillStyle = '#200806'; ctx.fillRect(x0, -300, x1 - x0, 740);
    // Entry tunnel (left) and exit (right) are rough basalt; the pit is cut stone
    for (let px = Math.floor(x0 / 70) * 70; px < x1; px += 70) {
      const inPit = Math.abs(px - PIT) < 900;
      ctx.fillStyle = inPit ? (px % 140 ? '#3a160c' : '#40180e') : (px % 140 ? '#2a0e08' : '#30120a');
      ctx.fillRect(px, -300, 66, 740);
    }
    for (const [x, y, w] of ENTRY) if (_slVisible(v, x, x + w)) { ctx.fillStyle = '#3a1a10'; ctx.fillRect(x, y, w, G - y); ctx.fillStyle = '#4a2416'; ctx.fillRect(x, y, w, 6); }
    // The ring wall: 47 marks and one blank space
    if (_slVisible(v, PIT - 900, PIT + 900)) {
      ctx.fillStyle = '#4a2010'; ctx.fillRect(PIT - 900, G - 470, 1800, 24);
      for (let k = 0; k < 48; k++) {
        const mx = PIT - 840 + k * 35;
        if (!_slVisible(v, mx - 10, mx + 10)) continue;
        if (k === 47) {
          ctx.strokeStyle = `rgba(150,230,255,${0.4 + 0.3 * Math.sin(frameCount * 0.06)})`; ctx.lineWidth = 2; ctx.strokeRect(mx - 8, G - 430, 16, 40);
        } else {
          ctx.fillStyle = 'rgba(255,170,90,0.55)';
          ctx.fillRect(mx - 1.5, G - 430, 3, 40); ctx.fillRect(mx - 8, G - 412, 16, 3);
        }
      }
      for (const [x, y, w] of RING_LEDGES) {
        ctx.fillStyle = '#4a2214'; ctx.fillRect(x, y, w, 12);
        ctx.fillStyle = '#5a2c1a'; ctx.fillRect(x, y, w, 4);
        ctx.fillStyle = '#2a0e08'; ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + w, y + 12); ctx.lineTo(x + w - 20, y + 40); ctx.lineTo(x + 20, y + 40); ctx.fill();
      }
      // Braziers ringing the pit
      for (const bx of [PIT - 500, PIT - 250, PIT + 250, PIT + 500]) {
        ctx.fillStyle = '#3a2216'; ctx.fillRect(bx - 8, G - 60, 16, 60); ctx.fillRect(bx - 18, G - 66, 36, 8);
        _slFire(bx - 15, G - 66, 30, 0.9);
      }
      // The dais
      ctx.fillStyle = '#4a2214'; ctx.fillRect(PIT - 80, G - 40, 160, 40);
      ctx.fillStyle = '#6a3420'; ctx.fillRect(PIT - 86, G - 44, 172, 6);
      ctx.fillStyle = 'rgba(255,170,90,0.6)'; ctx.font = 'bold 10px Georgia'; ctx.textAlign = 'center'; ctx.fillText('XLVIII ?', PIT, G - 18);
    }
    // Beyond: the open core, waiting for the released signatures
    if (_slVisible(v, 4900, 6200)) {
      const p = 0.7 + 0.3 * Math.sin(frameCount * 0.04);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(5600, G - 180, 10, 5600, G - 180, 320);
      g.addColorStop(0, `rgba(240,250,255,${0.55 * p})`); g.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.fillStyle = g; ctx.fillRect(5280, G - 500, 640, 500);
      ctx.restore();
      ctx.fillStyle = 'rgba(250,252,255,0.85)'; ctx.beginPath(); ctx.ellipse(5600, G - 180, 50, 120, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 47; k++) {
        const a = k / 47 * Math.PI * 2 + frameCount * 0.004, r = 160 + (k % 5) * 14;
        ctx.fillStyle = 'rgba(255,220,160,0.7)'; ctx.fillRect(5600 + Math.cos(a) * r, G - 180 + Math.sin(a) * r * 0.6, 3, 3);
      }
    }
  }

  const ZONES = [
    { x0: -200, x1: PIT - 900, kind: 'rubble', face: 'concrete' },
    { x0: PIT - 900, x1: PIT + 900, kind: 'tile', face: 'brick', brick: '#3a160c', windows: false },
    { x0: PIT + 900, x1: 6200, kind: 'rubble', face: 'concrete' },
  ];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[29] = {
    sky: ['#140200', '#3a0a02'],
    groundColor: '#1a0604',
    platColor: '#3a1a10',
    layout, backdrop, back, surface,
  };
})();
