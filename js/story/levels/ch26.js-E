'use strict';
// js/story/levels/ch26.js — Chapter 26 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 26 — The Gate (walk → duel vs the Fragment Guardian)
// "The rift entity felt you coming. It sent its best." The approach to the
// Fracture Core is a processional: a causeway lined with the statues of
// bearers the Guardian consumed, past broken stands where the rift entity's
// Collectors watch, into the gate court where the Guardian holds the threshold.
// "She stays behind. You walk in alone." Veran stops at the last brazier; the
// gate itself — two vast doors with a seam of white light — closes the run.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  // Clear of the generated chest-perch climbs at x≈1705-1945 and 4585-4825.
  const STANDS = [[700, 3, 140], [1250, 4, 150], [4100, 4, 150], [4900, 3, 140]];
  const PLINTHS = [];
  for (let x = 260; x < 5400; x += 260) {
    if (Math.abs(x - 3000) <= 380) continue;
    if (STANDS.some(([sx, , w]) => x + 40 > sx && x - 40 < sx + w)) continue;
    if ((x > 1660 && x < 1990) || (x > 4540 && x < 4870)) continue;
    PLINTHS.push(x);
  }
  const GATE = 5650;

  function layout() {
    const P = [];
    for (const [x, tiers, w] of STANDS) for (let t = 0; t < tiers; t++) _slLedge(P, x + t * 40, G - 60 - t * 60, w - t * 40);
    for (const px of PLINTHS) _slLedge(P, px - 26, G - 70, 52);
    _slLedge(P, 2620, G - 150, 120); _slLedge(P, 3260, G - 150, 120);   // gate-court balconies
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#140808');
    _slParallax(v, 0.06, (l, r) => {
      const g = ctx.createRadialGradient(l + (r - l) / 2, G - 100, 40, l + (r - l) / 2, G - 100, 700);
      g.addColorStop(0, 'rgba(255,200,140,0.18)'); g.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, -300, r - l + 40, 900);
    });
    _slParallax(v, 0.22, (l, r) => {
      // The Fracture Core itself, a vast cracked sphere beyond the gate
      const cx = l + 1400, cy = 60;
      ctx.fillStyle = '#2a1414'; ctx.beginPath(); ctx.arc(cx, cy, 300, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 7; k++) _slSkyCrack(_slJag(cx - 200 + k * 60, cy - 250, cx - 180 + k * 70, cy + 250, 8, 18, k * 9), 0.35);
      // Ring of the colosseum, far wall
      for (let i = Math.floor(l / 60) - 1; i * 60 < r + 60; i++) {
        const x = i * 60;
        ctx.fillStyle = '#3a2420'; ctx.fillRect(x, G - 260, 50, 200);
        ctx.fillStyle = '#1a0e0c'; ctx.beginPath(); ctx.moveTo(x + 8, G - 120); ctx.lineTo(x + 8, G - 200); ctx.arc(x + 25, G - 200, 17, Math.PI, 0); ctx.lineTo(x + 42, G - 120); ctx.fill();
      }
    });
  }

  function _statue(x, seed) {
    ctx.fillStyle = '#4a3c34'; ctx.fillRect(x - 26, G - 70, 52, 70);
    ctx.fillStyle = '#5a4a40'; ctx.fillRect(x - 30, G - 74, 60, 8);
    const pose = seed % 3;
    ctx.fillStyle = '#6a5c52';
    ctx.beginPath(); ctx.arc(x, G - 150, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 6, G - 140, 12, 40); ctx.fillRect(x - 6, G - 100, 5, 26); ctx.fillRect(x + 1, G - 100, 5, 26);
    ctx.save(); ctx.translate(x, G - 134); ctx.rotate(pose === 0 ? -0.6 : pose === 1 ? 0.4 : -1.2);
    ctx.fillRect(0, -2, 26, 4); ctx.fillStyle = '#8a7c70'; ctx.fillRect(22, -12, 3, 40); ctx.restore();
    // Cracked: the bearer's fragment was torn out
    ctx.strokeStyle = '#1a0e0c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 2, G - 132); ctx.lineTo(x + 3, G - 120); ctx.lineTo(x - 1, G - 110); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,140,0.5)'; ctx.font = '7px Georgia'; ctx.textAlign = 'center'; ctx.fillText(['XIV', 'XXII', 'IX', 'XXXI', 'VII', 'XL'][seed % 6], x, G - 40);
  }

  function back(v) {
    for (const px of PLINTHS) if (_slVisible(v, px - 40, px + 40)) _statue(px, Math.floor(px / 260));
    // Stands: stepped stone, cloaked Collector watchers seated on them
    for (const [x, tiers, w] of STANDS) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      for (let t = 0; t < tiers; t++) {
        ctx.fillStyle = t % 2 ? '#4a3a32' : '#5a463c'; ctx.fillRect(x + t * 40, G - 60 - t * 60, w - t * 40, 60 + t * 60);
        ctx.fillStyle = '#6a5446'; ctx.fillRect(x + t * 40, G - 60 - t * 60, w - t * 40, 5);
      }
      const wx = x + (tiers - 1) * 40 + 20, wy = G - 60 - (tiers - 1) * 60;
      ctx.fillStyle = '#140a14'; ctx.beginPath(); ctx.moveTo(wx - 12, wy); ctx.lineTo(wx, wy - 46); ctx.lineTo(wx + 12, wy); ctx.fill();
      ctx.fillStyle = '#ff4466'; ctx.fillRect(wx - 3, wy - 34, 2, 2); ctx.fillRect(wx + 1, wy - 34, 2, 2);
    }
    // Gate court: banners, balconies, the threshold mosaic
    if (_slVisible(v, 2560, 3440)) {
      for (const [bx, bw] of [[2620, 120], [3260, 120]]) {
        ctx.fillStyle = '#4a3a32'; ctx.fillRect(bx, G - 150, bw, 12); ctx.fillRect(bx + 20, G - 138, 14, 138); ctx.fillRect(bx + bw - 34, G - 138, 14, 138);
        ctx.fillStyle = '#6a1a1a'; ctx.fillRect(bx + 40, G - 138, 40, 100);
        ctx.fillStyle = '#d8b070'; ctx.beginPath(); ctx.arc(bx + 60, G - 100, 10, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Veran's stopping point: the last brazier before the gate
    if (_slVisible(v, GATE - 400, GATE + 300)) {
      const bx = GATE - 300;
      ctx.fillStyle = '#3a2e28'; ctx.fillRect(bx - 10, G - 70, 20, 70); ctx.fillRect(bx - 22, G - 76, 44, 10);
      _slFire(bx - 18, G - 76, 36, 0.9);
      // The gate
      ctx.fillStyle = '#2a1e1a'; ctx.fillRect(GATE - 120, G - 460, 360, 460);
      ctx.fillStyle = '#4a3a32'; ctx.fillRect(GATE - 140, G - 480, 400, 30); ctx.fillRect(GATE - 140, G - 480, 30, 480); ctx.fillRect(GATE + 230, G - 480, 30, 480);
      ctx.fillStyle = '#3a2a24'; ctx.fillRect(GATE - 100, G - 440, 158, 440); ctx.fillRect(GATE + 62, G - 440, 158, 440);
      ctx.strokeStyle = '#5a463c'; ctx.lineWidth = 2;
      for (const dx of [GATE - 100, GATE + 62]) for (let y = G - 420; y < G; y += 60) ctx.strokeRect(dx + 14, y, 130, 46);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const p = 0.7 + 0.3 * Math.sin(frameCount * 0.05);
      const g = ctx.createLinearGradient(GATE + 40, 0, GATE + 80, 0);
      g.addColorStop(0, 'rgba(255,240,220,0)'); g.addColorStop(0.5, `rgba(255,240,220,${0.9 * p})`); g.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = g; ctx.fillRect(GATE + 30, G - 440, 60, 440);
      ctx.restore();
    }
  }

  const ZONES = [{ x0: -200, x1: 6200, kind: 'tile', face: 'brick', brick: '#4a3a32', windows: false }];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph !== 'back') return;
    // Threshold mosaic in the gate court
    if (_slVisible(v, 2700, 3300)) {
      ctx.fillStyle = 'rgba(216,176,112,0.35)';
      for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.moveTo(3000, G - 10); ctx.lineTo(3000 + Math.cos(k * Math.PI / 6) * 260, G - 10 + Math.sin(k * Math.PI / 6) * 8); ctx.lineTo(3000 + Math.cos(k * Math.PI / 6 + 0.12) * 260, G - 10 + Math.sin(k * Math.PI / 6 + 0.12) * 8); ctx.fill(); }
    }
  }

  STORY_LEVELS[26] = {
    sky: ['#140808', '#3a1c14'],
    groundColor: '#2a1c16',
    platColor: '#4a3a32',
    layout, backdrop, back, surface,
  };
})();
