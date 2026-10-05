'use strict';
// js/story/levels/ch22.js — Chapter 22 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 22 — The Void Arena (walk → duel vs the Void Collector)
// "A collapsed dimension. No sky. No ground. Just floating platforms and the
// silence of a dead universe. Here, something had set up camp." The run is a
// hop across drifting fragments over the void (the gaps are falls); the
// Collector's camp holds the one big slab at the midpoint — a debris throne,
// violet braziers, cages of stolen fragments. "The platforms are moving. It
// controls them." Past the camp, two plates slide and lift across the widest
// gap toward the far edge of the dead universe.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FR = [
    [0, 520, 440], [640, 820, 420], [960, 1120, 450], [1280, 1420, 400], [1560, 1760, 440],
    [1900, 2040, 410], [2180, 2400, 450], [2560, 3440, 440], [3600, 3760, 420], [3900, 4060, 450],
    [4560, 4720, 410], [4860, 5020, 440], [5160, 6000, 440],
  ];
  const MOVERS = [{ tag: 'm0', x: 4150, y: 430, w: 100, ax: 60, ay: 0, ph: 0 }, { tag: 'm1', x: 4370, y: 400, w: 100, ax: 0, ay: 50, ph: 1.4 }];
  const CAMP = 3000;

  function floor() { return FR.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const m of MOVERS) _slMover(P, m.tag, m.x, m.y, m.w, m.ax, m.ay, 0.016, m.ph);
    _slLedge(P, CAMP - 60, 440 - 96, 120);           // the throne's seat block
    _slLedge(P, 2660, 440 - 70, 80); _slLedge(P, 3260, 440 - 70, 80);   // fragment cages
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#020104');
    _slParallax(v, 0.03, (l, r) => {
      // Dead stars, a dead red sun, the ghost of a galaxy
      ctx.fillStyle = 'rgba(200,180,200,0.35)';
      for (let i = Math.floor(l / 24); i * 24 < r; i++) if (_slHash(i + 61) < 0.3) ctx.fillRect(i * 24 + _slHash(i) * 18, -400 + _slHash(i + 5) * 1000, 1, 1);
      const sx = l + 1100;
      const sg = ctx.createRadialGradient(sx, 140, 10, sx, 140, 160);
      sg.addColorStop(0, 'rgba(140,40,40,0.55)'); sg.addColorStop(0.5, 'rgba(90,20,30,0.25)'); sg.addColorStop(1, 'rgba(60,10,20,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - 160, -20, 320, 320);
      ctx.fillStyle = '#3a1416'; ctx.beginPath(); ctx.arc(sx, 140, 46, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(l + 400, 100); ctx.rotate(-0.4);
      ctx.strokeStyle = 'rgba(140,120,170,0.12)'; ctx.lineWidth = 6;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(0, 0, 160 - k * 40, 40 - k * 10, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    });
    _slParallax(v, 0.3, (l, r) => {
      for (let i = Math.floor(l / 220) - 1; i * 220 < r + 220; i++) {
        const x = i * 220 + _slHash(i) * 120, y = 100 + _slHash(i + 2) * 260, w = 30 + _slHash(i + 4) * 60;
        ctx.fillStyle = '#0e0c16';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.6, y + w * 0.6); ctx.fill();
      }
    });
  }

  function back(v) {
    // Camp: throne of debris, braziers, cages
    if (_slVisible(v, 2560, 3440)) {
      ctx.fillStyle = '#1a1622';
      ctx.beginPath(); ctx.moveTo(CAMP - 110, 440); ctx.lineTo(CAMP - 90, 440 - 260); ctx.lineTo(CAMP - 40, 440 - 300); ctx.lineTo(CAMP, 440 - 340); ctx.lineTo(CAMP + 40, 440 - 300); ctx.lineTo(CAMP + 90, 440 - 260); ctx.lineTo(CAMP + 110, 440); ctx.fill();
      ctx.fillStyle = '#2a2436'; ctx.fillRect(CAMP - 60, 440 - 96, 120, 96);
      ctx.fillStyle = '#3a3248'; ctx.fillRect(CAMP - 66, 440 - 100, 132, 8);
      // Embedded fragments, glowing in the throne's back
      for (let k = 0; k < 9; k++) {
        const fx = CAMP - 70 + _slHash(k) * 140, fy = 440 - 130 - _slHash(k + 4) * 190;
        ctx.fillStyle = `hsla(${200 + k * 20},80%,65%,${0.6 + 0.3 * Math.sin(frameCount * 0.05 + k)})`;
        ctx.beginPath(); ctx.moveTo(fx, fy - 8); ctx.lineTo(fx + 5, fy); ctx.lineTo(fx, fy + 8); ctx.lineTo(fx - 5, fy); ctx.fill();
      }
      for (const bx of [2620, 3380]) {
        ctx.fillStyle = '#2a2436'; ctx.fillRect(bx - 12, 440 - 60, 24, 60);
        ctx.fillStyle = '#3a3248'; ctx.fillRect(bx - 18, 440 - 66, 36, 8);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 5; k++) {
          const t = (frameCount * 1.2 + k * 14) % 70;
          ctx.fillStyle = `rgba(190,110,255,${0.6 * (1 - t / 70)})`;
          ctx.beginPath(); ctx.arc(bx + Math.sin(k + frameCount * 0.1) * 6, 440 - 70 - t, 7 - t * 0.08, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      for (const cx of [2660, 3260]) {
        ctx.strokeStyle = '#4a4258'; ctx.lineWidth = 2;
        ctx.strokeRect(cx, 440 - 70, 80, 70);
        for (let bx = cx + 10; bx < cx + 80; bx += 12) { ctx.beginPath(); ctx.moveTo(bx, 440 - 70); ctx.lineTo(bx, 440); ctx.stroke(); }
        ctx.fillStyle = '#4a4258'; ctx.fillRect(cx - 4, 440 - 74, 88, 6);
        ctx.fillStyle = `rgba(150,220,255,${0.5 + 0.4 * Math.sin(frameCount * 0.07 + cx)})`;
        ctx.beginPath(); ctx.moveTo(cx + 40, 440 - 50); ctx.lineTo(cx + 48, 440 - 32); ctx.lineTo(cx + 40, 440 - 14); ctx.lineTo(cx + 32, 440 - 32); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,180,230,0.5)'; ctx.font = 'italic 10px Georgia'; ctx.textAlign = 'center';
      ctx.fillText('thirty-seven', CAMP, 440 - 352);
    }
    for (const m of MOVERS) {
      const pl = _slPlat(currentArena, m.tag);
      if (!pl || !_slVisible(v, pl.x - 20, pl.x + pl.w + 20)) continue;
      ctx.fillStyle = '#2a2440';
      ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + pl.w, pl.y); ctx.lineTo(pl.x + pl.w * 0.65, pl.y + 40); ctx.lineTo(pl.x + pl.w * 0.3, pl.y + 34); ctx.fill();
      ctx.fillStyle = '#3e3658'; ctx.fillRect(pl.x, pl.y, pl.w, 6);
      // The Collector's control tether
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(190,110,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pl.x + pl.w / 2, pl.y + 30); ctx.quadraticCurveTo(pl.x + pl.w / 2 - 200, pl.y + 200, CAMP, 440 - 340); ctx.stroke();
      ctx.restore();
    }
    // The far edge: where the dead universe simply stops
    if (_slVisible(v, 5500, 6200)) {
      const g = ctx.createLinearGradient(5600, 0, 6000, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(230,220,255,0.35)');
      ctx.fillStyle = g; ctx.fillRect(5600, -300, 400, 900);
      _slPortal(5700, 440 - 140, 50, 270, 3);
    }
  }

  function surface(v, a, ph) {
    for (let i = 0; i < FR.length; i++) {
      const [x0, x1, y] = FR[i];
      if (_slVisible(v, x0 - 20, x1 + 20)) _slIsland(x0, x1, y, 'void', ph, i * 23);
    }
  }

  STORY_LEVELS[22] = {
    sky: ['#020104', '#0a0610'],
    groundColor: '#0a0610',
    platColor: '#1e1a2e',
    sceneX: 2800,
    noGroundFill: true,
    floor, layout, backdrop, back, surface,
  };
})();
