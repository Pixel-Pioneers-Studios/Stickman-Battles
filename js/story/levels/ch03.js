'use strict';
// js/story/levels/ch03.js — Chapter 3 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 3 — Disorientation (escape)
// "The block is shifting — reality collapsing inward from behind." The street
// itself has broken into slabs: some heaved up, some dropped, so the run east
// is a sequence of short climbs and drops with the collapse wall closing in.
// Buildings lean, one has been sheared and shifted sideways, debris floats up
// into the tear field. The run ends at Stable Ground: an intact plaza held
// together by a shimmering field.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  // [x0, x1, y] — the broken street. Steps stay inside one jump so the
  // collapse wall (up to 4.5 px/frame) is outrun by a player who keeps moving.
  const SLABS = [
    [0, 520, 440], [520, 760, 410], [760, 980, 440], [980, 1180, 472],
    [1180, 1500, 440], [1500, 1640, 392], [1640, 1900, 440], [1900, 2150, 480],
    [2150, 2400, 440], [2400, 2600, 404], [2600, 3700, 440],
  ];
  const BUS   = { x: 1250, w: 210, h: 64 };     // on its side on the 440 slab
  const CAR   = { x: 1950, w: 150 };            // nose-down in the dropped section
  const PLAZA = 2900;

  function floor() { return SLABS.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }

  function layout() {
    const P = [];
    _slLedge(P, BUS.x, G - BUS.h, BUS.w);
    _slLedge(P, CAR.x + 20, 480 - 40, CAR.w - 40);
    _slLedge(P, 2700, G - 96, 110);   // fallen billboard frame
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0d0d1e');
    _slParallax(v, 0.06, (l, r) => {
      // The tear field: the sky behind the collapse, fractured
      for (let i = Math.floor(l / 260) - 1; i * 260 < r + 260; i++) {
        const x = i * 260 + _slHash(i) * 140;
        _slSkyCrack(_slJag(x, -40, x + 60 + _slHash(i + 1) * 80, 160 + _slHash(i + 2) * 120, 7, 18, i * 13), 0.28 + 0.1 * Math.sin(frameCount * 0.03 + i));
      }
    });
    _slParallax(v, 0.22, (l, r) => {
      // Skyline, every tower leaning a different way
      for (let i = Math.floor(l / 80) - 1; i * 80 < r + 80; i++) {
        const h = 160 + _slHash(i) * 180, w = 50 + _slHash(i + 30) * 30, x = i * 80;
        const tilt = (_slHash(i + 60) - 0.5) * 0.12;
        ctx.save(); ctx.translate(x + w / 2, G); ctx.rotate(tilt);
        ctx.fillStyle = '#22203a'; ctx.fillRect(-w / 2, -h, w, h);
        ctx.fillStyle = 'rgba(255,200,140,0.35)';
        for (let wy = -h + 10; wy < -30; wy += 16) for (let wx = -w / 2 + 6; wx < w / 2 - 6; wx += 11)
          if (_slHash(wx * 5 + wy + i) < 0.1) ctx.fillRect(wx, wy, 4, 6);
        ctx.restore();
      }
    });
    // Debris drifting upward into the field
    _slParallax(v, 0.5, (l, r) => {
      for (let i = Math.floor(l / 70); i * 70 < r; i++) {
        const t = (frameCount * (0.3 + _slHash(i) * 0.5) + _slHash(i + 5) * 600) % 600;
        const x = i * 70 + Math.sin(t * 0.01 + i) * 20, y = G - t;
        const s = 3 + _slHash(i + 9) * 9;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.01 * (i % 2 ? 1 : -1));
        ctx.fillStyle = `rgba(${90 + _slHash(i) * 40},${86 + _slHash(i) * 30},${100 + _slHash(i) * 30},${1 - t / 600})`;
        ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
        ctx.restore();
      }
    });
  }

  // Facade drawn with a lean (rotated about its base)
  function _leanBldg(x, w, h, tilt, col, seed) {
    ctx.save(); ctx.translate(x, G); ctx.rotate(tilt);
    _slBrick(0, -h, w, h, col);
    _slWindowGrid(10, -h + 20, w - 20, h - 60, Math.max(2, Math.round(w / 70)), Math.max(1, Math.round((h - 60) / 70)), { lit: 0.15, seed, dark: '#14141e' });
    ctx.strokeStyle = 'rgba(10,8,14,0.8)'; ctx.lineWidth = 2;
    const cr = _slJag(w * 0.3, -h, w * 0.55, 0, 8, 14, seed);
    ctx.beginPath(); cr.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
    ctx.restore();
  }

  function back(v) {
    if (_slVisible(v, -100, 700)) { _leanBldg(-80, 300, 320, -0.03, '#4c3a3e', 1); _leanBldg(260, 260, 260, 0.05, '#3e3c48', 2); }
    if (_slVisible(v, 600, 1300)) {
      // The sheared building: its top half sits forty feet to the left of its base
      _slBrick(720, G - 180, 300, 180, '#5a4038');
      _slWindowGrid(730, G - 170, 280, 120, 4, 2, { lit: 0.1, seed: 9, dark: '#141418' });
      _slBrick(600, G - 380, 300, 196, '#5a4038');
      _slWindowGrid(610, G - 370, 280, 150, 4, 2, { lit: 0.25, seed: 10, dark: '#141418' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(200,160,255,0.5)'; ctx.fillRect(600, G - 186, 420, 4);
      ctx.restore();
      for (let k = 0; k < 6; k++) _slPortal(640 + k * 64, G - 184, 4, 270, k);
    }
    if (_slVisible(v, 1100, 1900)) {
      _leanBldg(1160, 280, 300, -0.07, '#3a4048', 3);
      _leanBldg(1560, 300, 340, 0.04, '#4a3a34', 4);
      // Bus on its side: roof facing us, wheels toward the buildings
      const B = BUS;
      ctx.fillStyle = '#c8a02a'; ctx.fillRect(B.x, G - B.h, B.w, B.h);
      ctx.fillStyle = '#a8841e'; ctx.fillRect(B.x, G - B.h, B.w, 6);
      ctx.fillStyle = '#26323c';
      for (let wx = B.x + 14; wx < B.x + B.w - 30; wx += 30) ctx.fillRect(wx, G - B.h + 14, 22, 16);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(B.x, G - B.h + 36, B.w, 3);
      ctx.fillStyle = '#16181a'; for (const wx of [B.x + 40, B.x + B.w - 40]) { ctx.beginPath(); ctx.ellipse(wx, G - B.h - 2, 14, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      _slFire(B.x + B.w - 60, G - B.h, 50, 0.8);
    }
    if (_slVisible(v, 1850, 2700)) {
      _leanBldg(1900, 260, 280, 0.08, '#3e3a46', 5);
      _leanBldg(2240, 320, 360, -0.04, '#4e4038', 6);
      // Car nose-down into the dropped slab
      ctx.save(); ctx.translate(CAR.x + CAR.w / 2, 480 - 20); ctx.rotate(0.22);
      _slCar(-CAR.w / 2, 20, CAR.w, '#6a3a34', { hazard: true });
      ctx.restore();
      // Burst water main
      for (let k = 0; k < 14; k++) {
        const t = (frameCount * 2.2 + k * 23) % 140;
        ctx.fillStyle = `rgba(170,200,230,${0.6 * (1 - t / 140)})`;
        ctx.beginPath(); ctx.arc(2180 + Math.sin(k) * (t * 0.25), 440 - t * (1.4 - t / 220), 3 + t * 0.03, 0, Math.PI * 2); ctx.fill();
      }
      // Bent streetlight
      ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(2470, 404); ctx.lineTo(2470, 300); ctx.quadraticCurveTo(2475, 250, 2540, 272); ctx.stroke();
    }
    if (_slVisible(v, 2600, 3700)) {
      // Fallen billboard
      ctx.fillStyle = '#3a3e44';
      ctx.fillRect(2700, G - 96, 110, 8);
      ctx.fillRect(2716, G - 88, 6, 88); ctx.fillRect(2788, G - 88, 6, 88);
      ctx.save(); ctx.translate(2650, G - 6); ctx.rotate(-0.35);
      ctx.fillStyle = '#d8d0c0'; ctx.fillRect(0, -70, 220, 70);
      ctx.fillStyle = '#c03a2a'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('MOVING SOON', 110, -28);
      ctx.restore();
      // Stable Ground: a plaza held whole by a field, buildings standing straight
      _slBrick(PLAZA + 60, G - 300, 300, 300, '#5a4a40');
      _slWindowGrid(PLAZA + 70, G - 290, 280, 200, 4, 3, { lit: 0.55, seed: 11, glow: true });
      _slBrick(PLAZA + 380, G - 260, 300, 260, '#4a4a52');
      _slWindowGrid(PLAZA + 390, G - 250, 280, 170, 4, 2, { lit: 0.5, seed: 12, glow: true });
      ctx.fillStyle = '#8a8478'; ctx.fillRect(PLAZA + 300, G - 46, 60, 46);
      ctx.fillStyle = '#a49e92'; ctx.fillRect(PLAZA + 296, G - 50, 68, 6);
      const br = 0.6 + 0.2 * Math.sin(frameCount * 0.05);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(150,230,255,${0.45 * br})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(PLAZA + 360, G, 420, 330, 0, Math.PI, 0); ctx.stroke();
      const dg = ctx.createRadialGradient(PLAZA + 360, G, 40, PLAZA + 360, G, 420);
      dg.addColorStop(0, 'rgba(150,230,255,0)'); dg.addColorStop(0.9, `rgba(150,230,255,${0.10 * br})`); dg.addColorStop(1, 'rgba(150,230,255,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(PLAZA + 360, G, 420, 330, 0, Math.PI, 0); ctx.fill();
      ctx.restore();
    }
  }

  const ZONES = [
    { x0: -200, x1: PLAZA - 60, kind: 'rubble', face: 'soil' },
    { x0: PLAZA - 60, x1: 3800, kind: 'tile', face: 'concrete' },
  ];
  function surface(v, a, ph) { _slSurfaces(v, a, ph, ZONES); }

  STORY_LEVELS[3] = { floor, layout, backdrop, back, surface };
})();
