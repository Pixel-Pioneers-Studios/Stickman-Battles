'use strict';
// js/story/levels/ch47.js — Chapter 47 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 47 — The Last Army (walk → duel vs two Rift Echoes)
// The Multiversal Core's outer ring, now that the rift "generates fighters."
// Reality is coming loose: bands of the world slip sideways and split into
// colour, and in the haze behind the ring the last army stands in ranks —
// echoes of collapsed dimensions wearing combat forms, flickering apart and
// reassembling. Breach scaffolds (the old ring's repair rigging) are the high
// route. The two Alphas hold the ring's broken span at the midpoint. At the
// far end, the protocol is ready: Veran and the four Architects at their
// beacons around the rift core. Cache shafts are hull breaches.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SPAN = 3000, CORE = 5560;
  const RIG = [[420, 350, 100], [540, 270, 130], [1160, 340, 110], [1290, 260, 120], [2230, 350, 100], [2350, 270, 120],
               [3640, 350, 100], [3760, 270, 130], [4980, 340, 110]];
  const BEACONS = [[5300, '#88aacc'], [5420, '#88cc66'], [5700, '#88ccff'], [5820, '#ccaa66']];
  const BREACH = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of RIG) _slLedge(P, x, y, w);
    _slLedge(P, SPAN - 330, 350, 100); _slLedge(P, SPAN + 230, 350, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0a0214');
    _slParallax(v, 0.06, (l, r) => {
      const cx = l + (r - l) * 0.5;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, 200, 10, cx, 200, 500);
      g.addColorStop(0, 'rgba(200,60,255,0.35)'); g.addColorStop(1, 'rgba(80,0,140,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 500, -300, 1000, 900);
      ctx.restore();
    });
    // The last army: ranks of echoes in the haze, flickering apart and back
    _slParallax(v, 0.3, (l, r) => {
      for (let row = 0; row < 3; row++) {
        const y = 296 + row * 26, s = 0.9 + row * 0.25, sp = 34 + row * 12;
        for (let i = Math.floor(l / sp); i * sp < r; i++) {
          const x = i * sp + row * 13;
          const ph = Math.sin(frameCount * 0.05 + i * 1.7 + row);
          if (ph < -0.6) continue;
          const off = ph < -0.2 ? (_slHash(i + (frameCount >> 3)) - 0.5) * 10 : 0;
          ctx.fillStyle = `rgba(${170 + row * 20},40,${220 - row * 20},${0.25 + row * 0.1})`;
          // A combat form: head, torso, a weapon held up
          ctx.fillRect(x + off - 2.5 * s, y - 34 * s, 5 * s, 22 * s);
          ctx.fillRect(x + off - 6 * s, y - 13 * s, 4 * s, 13 * s); ctx.fillRect(x + off + 2 * s, y - 13 * s, 4 * s, 13 * s);
          ctx.fillRect(x + off + 4 * s, y - 52 * s, 2 * s, 26 * s);
          ctx.beginPath(); ctx.arc(x + off, y - 40 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
        }
      }
    });
  }

  function back(v) {
    // Ring hull and breach scaffolding
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(6200, v.x + v.w + 40);
    ctx.fillStyle = '#160a22'; ctx.fillRect(x0, G - 90, x1 - x0, 90);
    for (let px = Math.floor(x0 / 200) * 200; px < x1; px += 200) { ctx.fillStyle = '#22122e'; ctx.fillRect(px, G - 90, 12, 90); }
    for (const [x, y, w] of RIG) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.strokeStyle = '#3a2648'; ctx.lineWidth = 3;
      for (let k = 0; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * w / 2, y); ctx.lineTo(x + k * w / 2, G); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + w, G - 10); ctx.stroke();
      ctx.fillStyle = '#4a3058'; ctx.fillRect(x, y, w, 8);
      ctx.fillStyle = '#ffcc33'; for (let k = 0; k < w; k += 20) ctx.fillRect(x + k, y + 8, 10, 2);
    }
    // Hull breaches over the cache shafts: torn plate edges, sparks
    for (const bx of BREACH) {
      if (!_slVisible(v, bx - 80, bx + 80)) continue;
      ctx.fillStyle = '#4a3058';
      ctx.beginPath(); ctx.moveTo(bx - 70, G); ctx.lineTo(bx - 46, G - 22); ctx.lineTo(bx - 40, G); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 70, G); ctx.lineTo(bx + 50, G - 30); ctx.lineTo(bx + 42, G); ctx.fill();
      if ((frameCount + bx) % 40 < 6) { ctx.fillStyle = '#ffe080'; for (let k = 0; k < 5; k++) ctx.fillRect(bx - 46 + _slHash(k + frameCount) * 92, G - _slHash(k + 3) * 30, 2, 2); }
    }
    // The broken span: the ring's walkway cracked through, both halves heaved up
    if (_slVisible(v, SPAN - 500, SPAN + 500)) {
      for (const sx of [SPAN - 330, SPAN + 230]) {
        ctx.fillStyle = '#3a2648'; ctx.beginPath(); ctx.moveTo(sx - 30, G); ctx.lineTo(sx, 350); ctx.lineTo(sx + 100, 350); ctx.lineTo(sx + 130, G); ctx.fill();
        ctx.fillStyle = '#4a3058'; ctx.fillRect(sx, 350, 100, 6);
      }
      _slSkyCrack([[SPAN - 40, 80], [SPAN + 10, 180], [SPAN - 20, 260], [SPAN + 30, 340]], 0.5);
    }
    // The protocol, ready: four Architect beacons and Veran around the rift core
    if (_slVisible(v, CORE - 400, CORE + 400)) {
      _slPortal(CORE, G - 170, 80, 285, 47);
      for (const [bx, col] of BEACONS) {
        ctx.fillStyle = '#2a1a36'; ctx.fillRect(bx - 8, G - 120, 16, 120);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = col; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(frameCount * 0.05 + bx);
        ctx.beginPath(); ctx.arc(bx, G - 132, 10, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // Veran, steady, at the core's edge
      ctx.strokeStyle = '#4488dd'; ctx.lineWidth = 3;
      const vx = CORE - 110;
      ctx.beginPath(); ctx.arc(vx, G - 66, 8, 0, Math.PI * 2); ctx.moveTo(vx, G - 58); ctx.lineTo(vx, G - 26); ctx.lineTo(vx - 8, G); ctx.moveTo(vx, G - 26); ctx.lineTo(vx + 8, G); ctx.moveTo(vx, G - 48); ctx.lineTo(vx + 12, G - 36); ctx.stroke();
    }
    // Reality slipping: bands of the view shear sideways and split into colour
    const slot = Math.floor(frameCount / 12);
    if (_slHash(slot) < 0.35) {
      const by = v.y + _slHash(slot + 1) * v.h, bh = 6 + _slHash(slot + 2) * 18, dx = (_slHash(slot + 3) - 0.5) * 30;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,0,120,0.10)'; ctx.fillRect(v.x + dx, by, v.w, bh);
      ctx.fillStyle = 'rgba(0,200,255,0.10)'; ctx.fillRect(v.x - dx, by + 2, v.w, bh);
      ctx.restore();
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: 6200, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[47] = {
    sky: ['#0a0214', '#24083a'],
    groundColor: '#100616',
    platColor: '#4a3058',
    layout, backdrop, back, surface,
  };
})();
