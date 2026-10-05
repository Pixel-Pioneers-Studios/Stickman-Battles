'use strict';
// js/story/levels/ch73.js — Chapter 73 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 73 — The Crack (escape, run right)
// Inside the loop, running for its structural flaw. The loop is one stretch of
// corridor repeated: every plate carries the same arch, the same brazier, the
// same cracked pillar with the same number cut in it — and every repeat is
// more decayed than the last, until the geometry starts bending. Behind you
// the repair mechanism re-lays the corridor: a red lattice knitting the world
// shut as it comes. The plates are separated by repeat seams (a short jump
// each) and every arch's lintel is a climb. At the far end the corridor folds
// back on itself around the flaw — "dimensional geometry bending back on
// itself" — where the arches start to bend over and the floor tilts.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const PLATES = [[0, 1040, 440], [1120, 1700, 430], [1780, 2500, 440], [2580, 3200, 430], [3280, 3800, 440]];
  const ARCH_DX = 260;                       // the repeated arch sits this far into each plate
  const FLAW = 3460;

  function floor() { return PLATES.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function arches() { return PLATES.slice(0, 4).map(([x0, , y], i) => ({ x: x0 + ARCH_DX + (i === 0 ? 300 : 0), y, decay: i / 3 })); }

  function layout() {
    const P = [];
    for (const A of arches()) { _slLedge(P, A.x - 120, A.y - 80, 90); _slLedge(P, A.x - 10, A.y - 160, 150); }
    _slLedge(P, FLAW - 380, 360, 100);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0a0000');
    // The loop seen from inside: the same corridor receding, repeated
    _slParallax(v, 0.2, (l, r) => {
      for (let i = Math.floor(l / 240) - 1; i * 240 < r + 240; i++) {
        const x = i * 240;
        ctx.strokeStyle = 'rgba(255,60,40,0.10)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 40, 440); ctx.lineTo(x + 40, 220); ctx.arc(x + 120, 220, 80, Math.PI, 0); ctx.lineTo(x + 200, 440); ctx.stroke();
      }
    });
  }

  function arch(A) {
    const { x, y, decay } = A, bend = decay * 14;
    ctx.fillStyle = '#2a0808';
    ctx.fillRect(x - 10, y - 160, 16, 160); ctx.fillRect(x + 124, y - 160 + bend, 16, 160 - bend);
    ctx.fillStyle = '#3a0c0c';
    ctx.beginPath(); ctx.moveTo(x - 14, y - 160); ctx.lineTo(x + 144, y - 160 + bend); ctx.lineTo(x + 144, y - 150 + bend); ctx.lineTo(x - 14, y - 150); ctx.fill();
    // The step: the same broken pillar in every repeat, with the same number
    ctx.fillStyle = '#240606'; ctx.fillRect(x - 120, y - 80, 90, 80);
    ctx.fillStyle = '#3a0c0c'; ctx.fillRect(x - 124, y - 84, 98, 6);
    ctx.fillStyle = 'rgba(255,90,60,0.6)'; ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillText('VII', x - 75, y - 40);
    // The same brazier
    ctx.fillStyle = '#1a0404'; ctx.fillRect(x + 56, y - 36, 24, 36);
    _slFire(x + 54, y - 36, 28, 0.6 * (1 - decay * 0.6));
    // Decay: cracks spread down the arch with every repeat
    for (let k = 0; k < Math.round(decay * 6); k++) {
      const cx = x + _slHash(k + x) * 140;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, y - 160); ctx.lineTo(cx + 6, y - 120); ctx.lineTo(cx - 4, y - 90); ctx.stroke();
    }
  }

  function back(v) {
    // The repair mechanism: a red lattice re-laying the corridor behind the wall
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    if (wx > v.x - 40) {
      ctx.save(); ctx.beginPath(); ctx.rect(v.x - 40, v.y - 40, wx - v.x + 40, v.h + 80); ctx.clip();
      ctx.strokeStyle = 'rgba(255,50,30,0.35)'; ctx.lineWidth = 1;
      for (let gx = Math.floor((v.x - 40) / 30) * 30; gx < wx; gx += 30) for (let gy = 0; gy < 600; gy += 26) {
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 15, gy + 13); ctx.lineTo(gx + 30, gy); ctx.stroke();
      }
      ctx.restore();
    }
    for (const A of arches()) if (_slVisible(v, A.x - 140, A.x + 160)) arch(A);
    // The flaw: the corridor folding back on itself
    if (_slVisible(v, FLAW - 500, FLAW + 400)) {
      ctx.save(); ctx.translate(FLAW, 300);
      for (let k = 0; k < 7; k++) {
        ctx.rotate(0.12 + 0.02 * Math.sin(frameCount * 0.02));
        ctx.strokeStyle = `rgba(255,${90 + k * 20},${60 + k * 25},${0.35 - k * 0.03})`; ctx.lineWidth = 3;
        const s = 1 - k * 0.12;
        ctx.beginPath(); ctx.moveTo(-80 * s, 140 * s); ctx.lineTo(-80 * s, -20 * s); ctx.arc(0, -20 * s, 80 * s, Math.PI, 0); ctx.lineTo(80 * s, 140 * s); ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(FLAW, 280, 4, FLAW, 280, 120);
      g.addColorStop(0, `rgba(255,250,240,${0.7 + 0.2 * Math.sin(frameCount * 0.1)})`); g.addColorStop(1, 'rgba(255,120,90,0)');
      ctx.fillStyle = g; ctx.fillRect(FLAW - 120, 160, 240, 240);
      ctx.restore();
      ctx.fillStyle = '#240606'; ctx.fillRect(FLAW - 380, 360, 100, 80); ctx.fillStyle = '#3a0c0c'; ctx.fillRect(FLAW - 384, 356, 108, 6);
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < PLATES.length; i++) {
      const [x0, x1, y] = PLATES[i];
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') {
        ctx.fillStyle = '#300808'; ctx.fillRect(x0, y - 14, x1 - x0, 14);
        ctx.fillStyle = 'rgba(255,90,60,0.25)'; ctx.fillRect(x0, y - 14, x1 - x0, 1);
        continue;
      }
      ctx.fillStyle = '#3a0c0c';
      ctx.beginPath(); ctx.moveTo(x0, y);
      for (let k = 0; k <= 10; k++) ctx.lineTo(x0 + (x1 - x0) * k / 10, y + 40 + Math.sin(Math.PI * k / 10) * 110 * (0.7 + 0.3 * _slHash(k + i * 11 + 730)));
      ctx.lineTo(x1, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < (x1 - x0) / 50; k++) ctx.fillRect(x0 + 20 + k * 50, y + 18 + _slHash(k + i * 7) * 30, 3, 26);
      ctx.fillStyle = '#ff3a1a'; ctx.fillRect(x0, y, x1 - x0, 1.5);
      // Repeat seams glow where one copy of the corridor meets the next
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,120,80,0.5)'; ctx.fillRect(x0 - 1, y - 14, 2, 70); ctx.fillRect(x1 - 1, y - 14, 2, 70);
      ctx.restore();
    }
  }

  STORY_LEVELS[73] = {
    sky: ['#0a0000', '#1e0404'],
    groundColor: '#0a0000',
    platColor: '#3a0c0c',
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
