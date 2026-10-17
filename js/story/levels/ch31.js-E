'use strict';
// js/story/levels/ch31.js — Chapter 31 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 31 — Core Entry (walk → duel vs The Eye)
// Starts in the Eye Antechamber, "a chamber of silence" — the stone benches
// where Veran told you the truth (chapter 30's scene plays here). A causeway
// of crystal pylons crosses the Core's open well; the Eye's iris — "a door
// that tests who deserves to open it" — fills the midpoint, and its keeper
// stands in front of it. Past the iris the corridor runs on into the rift's
// light. One life: no falls anywhere on this map, only steps.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, EYE = 3000;
  const FLOOR = [[0, 900, 440], [900, 1300, 420], [1300, 2200, 440], [2200, 2500, 420], [2500, 3500, 440], [3500, 3800, 460], [3800, 6000, 440]];
  const BENCH = [[300, 120], [620, 120]];
  const PYLON = [[1000, 340, 80], [1120, 250, 90], [2080, 340, 80], [2230, 250, 100], [3920, 350, 90], [4060, 270, 120], [5020, 340, 100], [5160, 260, 90]];
  const BALC = [[2600, 330, 100], [3300, 330, 100]];

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const [x, w] of BENCH) _slLedge(P, x, G - 36, w);
    for (const [x, y, w] of PYLON) _slLedge(P, x, y, w);
    for (const [x, y, w] of BALC) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#05020c');
    _slParallax(v, 0.08, (l, r) => {
      // The Core's well: a violet glow far below the causeway, motes rising
      const g = ctx.createLinearGradient(0, 120, 0, 520);
      g.addColorStop(0, 'rgba(60,20,110,0)'); g.addColorStop(1, 'rgba(120,60,220,0.35)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, 120, r - l + 40, 420);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = Math.floor(l / 26); i * 26 < r; i++) {
        if (_slHash(i + 9) < 0.55) continue;
        const y = 520 - ((frameCount * (0.3 + _slHash(i) * 0.5) + _slHash(i + 3) * 600) % 640);
        ctx.fillStyle = `rgba(190,150,255,${0.25 + 0.3 * _slHash(i + 5)})`;
        ctx.fillRect(i * 26 + _slHash(i + 1) * 20, y, 2, 2);
      }
      ctx.restore();
    });
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    // Antechamber: closed stone room, a high slit of light, the two benches
    if (_slVisible(v, -200, 900)) {
      ctx.fillStyle = '#16121e'; ctx.fillRect(Math.max(x0, -200), -300, Math.min(x1, 900) - Math.max(x0, -200), 740);
      for (let px = -160; px < 900; px += 120) { ctx.fillStyle = '#1e1828'; ctx.fillRect(px, -300, 14, 740); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sl = ctx.createLinearGradient(480, -40, 480, G);
      sl.addColorStop(0, 'rgba(200,180,255,0.30)'); sl.addColorStop(1, 'rgba(200,180,255,0)');
      ctx.fillStyle = sl; ctx.beginPath(); ctx.moveTo(470, -40); ctx.lineTo(490, -40); ctx.lineTo(560, G); ctx.lineTo(400, G); ctx.fill();
      ctx.restore();
      for (const [x, w] of BENCH) {
        ctx.fillStyle = '#3a3246'; ctx.fillRect(x, G - 36, w, 10);
        ctx.fillStyle = '#2a2434'; ctx.fillRect(x + 8, G - 26, 12, 26); ctx.fillRect(x + w - 20, G - 26, 12, 26);
      }
      // The antechamber's far doorway, open onto the causeway
      ctx.fillStyle = '#0a0612'; ctx.fillRect(840, G - 220, 60, 220);
      ctx.strokeStyle = '#3a3048'; ctx.lineWidth = 6; ctx.strokeRect(836, G - 224, 68, 224);
    }
    // Causeway: walkway edge rails and crystal pylons over the well
    if (_slVisible(v, 900, 2600) || _slVisible(v, 3800, 5600)) {
      for (const [x, y, w] of PYLON) {
        if (!_slVisible(v, x - 40, x + w + 40)) continue;
        ctx.fillStyle = '#241c34'; ctx.fillRect(x + w / 2 - 10, y, 20, G - y);
        ctx.fillStyle = '#3a2e52'; ctx.fillRect(x, y, w, 8);
        _slCrystal(x + w / 2, y, 40, 270, x);
      }
      for (let rx = Math.max(900, Math.floor(x0 / 60) * 60); rx < Math.min(x1, 5600); rx += 60) {
        if (rx > 2500 && rx < 3800) continue;
        ctx.fillStyle = '#2e2440'; ctx.fillRect(rx, G - 34, 4, 34);
      }
      ctx.fillStyle = '#3a2e52';
      ctx.fillRect(Math.max(900, x0), G - 36, Math.min(2500, x1) - Math.max(900, x0), 3);
      ctx.fillRect(Math.max(3800, x0), G - 36, Math.min(5600, x1) - Math.max(3800, x0), 3);
    }
    // The Eye: a colossal iris door, its aperture breathing, the keeper's dais
    if (_slVisible(v, EYE - 700, EYE + 700)) {
      const p = 0.5 + 0.5 * Math.sin(frameCount * 0.025);
      ctx.fillStyle = '#120a1e'; ctx.fillRect(EYE - 520, -300, 1040, G + 300);
      ctx.save(); ctx.translate(EYE, G - 230);
      ctx.fillStyle = '#20142e'; ctx.beginPath(); ctx.arc(0, 0, 250, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * Math.PI * 2 + frameCount * 0.002;
        ctx.strokeStyle = `hsla(${265 + (k % 3) * 12},70%,${45 + 10 * p}%,0.55)`; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (60 + 20 * p), Math.sin(a) * (60 + 20 * p)); ctx.lineTo(Math.cos(a + 0.5) * 230, Math.sin(a + 0.5) * 230); ctx.stroke();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ig = ctx.createRadialGradient(0, 0, 4, 0, 0, 90 + 20 * p);
      ig.addColorStop(0, 'rgba(240,220,255,0.9)'); ig.addColorStop(1, 'rgba(140,80,255,0)');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#3a2a52'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, 0, 252, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      for (const [x, y, w] of BALC) {
        ctx.fillStyle = '#2a2040'; ctx.fillRect(x, y, w, 10);
        ctx.fillStyle = '#1a1228'; ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + w - 10, y + 10); ctx.lineTo(x + w / 2, y + 60); ctx.fill();
      }
      ctx.fillStyle = '#2a2040'; ctx.fillRect(EYE - 140, G - 14, 280, 14);
      ctx.fillStyle = 'rgba(200,170,255,0.45)'; ctx.fillRect(EYE - 140, G - 14, 280, 2);
    }
    // Beyond the iris: the corridor runs on into the rift's light
    if (_slVisible(v, 5300, 6200)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(5640, G - 150, 10, 5640, G - 150, 360);
      g.addColorStop(0, 'rgba(255,240,255,0.55)'); g.addColorStop(1, 'rgba(160,100,255,0)');
      ctx.fillStyle = g; ctx.fillRect(5280, G - 520, 720, 520);
      ctx.restore();
      _slPortal(5640, G - 150, 70, 280, 31);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [
      { x0: -200, x1: 900, kind: 'tile', face: 'brick', brick: '#241c30', windows: false },
      { x0: 900, x1: 6200, kind: 'tunnel', face: 'concrete' },
    ]);
  }

  STORY_LEVELS[31] = {
    sky: ['#05020c', '#1a0a2e'],
    groundColor: '#100818',
    platColor: '#2a2040',
    floor, layout, backdrop, back, surface,
  };
})();
