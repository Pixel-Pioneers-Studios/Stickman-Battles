'use strict';
// js/story/levels/ch10.js — Chapter 10 map (story ARENA). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 10 — The Lava Crossing (arena duel, scrolling)
// "The industrial quarter had been swallowed. Lava from a destabilized portal.
// The floor was literally melting. All you had to do was cross." A three-screen
// lava field over the dead foundry district, built on the lava arena's rules
// (lavaY / damage / AI lava avoidance). You cross on what is left of the
// industry: loading dock, containers, a swinging crane hook, catwalks, a pipe
// bridge, floor slabs bobbing on the melt, a freight lift, the high gantry —
// toward the relay station on the far bank. The Lava Gate Guardian fights you
// the whole way ("the platforms are shifting" — some of them really are).
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const W = 2700, LAVA = 490;
  const DOCK  = { x: 30, w: 270, y: 330 };
  const CONT  = [[340, 300, 130], [470, 340, 110]];
  const HOOK  = { x: 600, y: 250, w: 90, sway: 70 };
  const CATW  = { x: 720, w: 300, y: 320 };
  const CRANE = { x: 600, w: 330, y: 150 };
  const BELT  = { x: 1060, w: 210, y: 262 };
  const STACK = { x: 1120, w: 70, y: 150 };
  const SLABS = [[1300, 410, 110, 0.0], [1430, 420, 100, 1.7]];
  const PIPE  = { x: 1560, w: 300, y: 300 };
  const LIFT  = { x: 1890, w: 90, y: 300, travel: 80 };
  const GANT  = { x: 2000, w: 290, y: 220 };
  const BANK  = { x: 2310, w: 360, y: 330 };

  function platforms() {
    const P = [];
    _slLedge(P, DOCK.x, DOCK.y, DOCK.w);
    for (const [x, y, w] of CONT) _slLedge(P, x, y, w);
    _slMover(P, 'hook', HOOK.x, HOOK.y, HOOK.w, HOOK.sway, 0, 0.016, 0);
    _slLedge(P, CATW.x, CATW.y, CATW.w);
    _slLedge(P, CRANE.x, CRANE.y, CRANE.w);
    _slLedge(P, BELT.x, BELT.y, BELT.w);
    _slLedge(P, STACK.x, STACK.y, STACK.w);
    SLABS.forEach(([x, y, w, ph], i) => _slMover(P, 'slab' + i, x, y, w, 0, 7, 0.03, ph));
    _slLedge(P, PIPE.x, PIPE.y, PIPE.w);
    _slMover(P, 'lift', LIFT.x, LIFT.y, LIFT.w, 0, LIFT.travel, 0.014, 0);
    _slLedge(P, GANT.x, GANT.y, GANT.w);
    _slLedge(P, BANK.x, BANK.y, BANK.w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1a0000');
    _slParallax(v, 0.1, (l, r) => {
      const g = ctx.createLinearGradient(0, 120, 0, LAVA);
      g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(1, 'rgba(255,90,20,0.45)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, 120, r - l + 40, LAVA - 120);
      // Foundry skyline: sheds, stacks, cooling towers
      for (let i = Math.floor(l / 120) - 1; i * 120 < r + 120; i++) {
        const x = i * 120, h = 90 + _slHash(i) * 120;
        ctx.fillStyle = '#2a0e08'; ctx.fillRect(x, LAVA - 40 - h, 100, h + 40);
        ctx.beginPath(); ctx.moveTo(x - 4, LAVA - 40 - h); ctx.lineTo(x + 50, LAVA - 70 - h); ctx.lineTo(x + 104, LAVA - 40 - h); ctx.fill();
        if (_slHash(i + 3) < 0.5) {
          ctx.fillRect(x + 70, LAVA - 40 - h - 120, 14, 120);
          _slSmoke(x + 77, LAVA - 40 - h - 120, 220, true, i);
        }
        if (_slHash(i + 5) < 0.2) {
          ctx.beginPath(); ctx.moveTo(x + 10, LAVA - 40); ctx.quadraticCurveTo(x + 30, LAVA - 140, x + 20, LAVA - 200); ctx.lineTo(x + 80, LAVA - 200); ctx.quadraticCurveTo(x + 70, LAVA - 140, x + 90, LAVA - 40); ctx.fill();
        }
      }
    });
    // The destabilized portal: a volcanic dimension pouring through
    _slParallax(v, 0.3, (l, r) => {
      const px = 1500;
      if (px < l - 300 || px > r + 300) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pg = ctx.createRadialGradient(px, 120, 10, px, 120, 220);
      pg.addColorStop(0, 'rgba(255,170,60,0.55)'); pg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = pg; ctx.fillRect(px - 220, -100, 440, 440);
      ctx.restore();
      ctx.fillStyle = '#2a0800'; ctx.beginPath(); ctx.ellipse(px, 120, 60, 90, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.shadowColor = '#ffaa44'; ctx.shadowBlur = 20; ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(px, 120, 60, 90, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      // Lavafall out of the portal
      const lg = ctx.createLinearGradient(0, 160, 0, LAVA);
      lg.addColorStop(0, '#ffc860'); lg.addColorStop(1, '#ff5a1a');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(px - 26, 170); ctx.quadraticCurveTo(px - 40, 330, px - 70, LAVA); ctx.lineTo(px + 60, LAVA); ctx.quadraticCurveTo(px + 34, 330, px + 22, 170); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,180,0.5)';
      for (let k = 0; k < 6; k++) { const t = (frameCount * 3 + k * 50) % 320; ctx.fillRect(px - 10 + Math.sin(k) * 10, 170 + t, 4, 14); }
    });
  }

  function back(v) {
    // Loading dock on stilts
    if (_slVisible(v, 0, 340)) {
      ctx.fillStyle = '#5a5a5c'; ctx.fillRect(DOCK.x, DOCK.y, DOCK.w, 26);
      ctx.fillStyle = '#d0a020'; for (let k = 0; k < 9; k++) ctx.fillRect(DOCK.x + k * 30, DOCK.y, 15, 4);
      ctx.fillStyle = '#3a3a3c'; for (const px of [DOCK.x + 20, DOCK.x + DOCK.w / 2, DOCK.x + DOCK.w - 30]) ctx.fillRect(px, DOCK.y + 26, 12, LAVA - DOCK.y);
      ctx.fillStyle = '#efe9da'; ctx.fillRect(DOCK.x + 30, DOCK.y - 50, 110, 30);
      ctx.fillStyle = '#9c2a22'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('HALVERSEN STEEL', DOCK.x + 85, DOCK.y - 37);
      ctx.fillStyle = '#2b2b2b'; ctx.font = '7px Arial'; ctx.fillText('BAY 4 · LOADING', DOCK.x + 85, DOCK.y - 26);
      _slCrate(DOCK.x + 180, DOCK.y - 40, 40, '#7a5a3a');
    }
    // Containers, sinking unevenly
    if (_slVisible(v, 320, 600)) {
      const cols = ['#2a5a8a', '#8a3a2a'];
      CONT.forEach(([x, y, w], i) => {
        ctx.fillStyle = cols[i]; ctx.fillRect(x, y, w, LAVA - y);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let rx = x + 8; rx < x + w; rx += 10) ctx.fillRect(rx, y + 6, 3, LAVA - y - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, 4);
      });
      ctx.fillStyle = '#e8e2d0'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('MAERA', CONT[0][0] + 65, CONT[0][1] + 30);
    }
    // Overhead crane: arm (standable), trolley, the swinging hook block
    if (_slVisible(v, 560, 1060)) {
      ctx.fillStyle = '#c8a020'; ctx.fillRect(CRANE.x, CRANE.y, CRANE.w, 12);
      ctx.strokeStyle = '#c8a020'; ctx.lineWidth = 2;
      for (let k = 0; k < CRANE.w; k += 24) { ctx.beginPath(); ctx.moveTo(CRANE.x + k, CRANE.y + 12); ctx.lineTo(CRANE.x + k + 12, CRANE.y + 30); ctx.lineTo(CRANE.x + k + 24, CRANE.y + 12); ctx.stroke(); }
      ctx.fillStyle = '#c8a020'; ctx.fillRect(CRANE.x, CRANE.y + 28, CRANE.w, 4);
      ctx.fillStyle = '#4a4a4c'; ctx.fillRect(CRANE.x + CRANE.w - 30, CRANE.y + 32, 20, LAVA - CRANE.y - 32);
      const a = (typeof currentArena !== 'undefined') ? currentArena : null;
      const hk = _slPlat(a, 'hook');
      if (hk) {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hk.x + hk.w / 2, CRANE.y + 32); ctx.lineTo(hk.x + hk.w / 2, hk.y); ctx.stroke();
        ctx.fillStyle = '#3a3e42'; ctx.fillRect(hk.x, hk.y, hk.w, 12);
        ctx.fillStyle = '#d0a020'; ctx.fillRect(hk.x, hk.y, hk.w, 3);
        ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hk.x + hk.w / 2, hk.y + 24, 9, 0, Math.PI); ctx.stroke();
      }
      // Catwalk with railings and legs into the melt
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(CATW.x, CATW.y, CATW.w, 7);
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(CATW.x, CATW.y - 24); ctx.lineTo(CATW.x + CATW.w, CATW.y - 24); ctx.stroke();
      for (let rx = CATW.x; rx <= CATW.x + CATW.w; rx += 15) { ctx.beginPath(); ctx.moveTo(rx, CATW.y); ctx.lineTo(rx, CATW.y - 24); ctx.stroke(); }
      ctx.fillStyle = '#34383c'; for (const px of [CATW.x + 30, CATW.x + CATW.w - 40]) ctx.fillRect(px, CATW.y + 7, 8, LAVA - CATW.y);
    }
    // Conveyor gantry + furnace stack
    if (_slVisible(v, 1040, 1300)) {
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(BELT.x, BELT.y, BELT.w, 14);
      ctx.fillStyle = '#5a5e64';
      for (let k = 0; k < BELT.w; k += 14) ctx.fillRect(BELT.x + ((k + frameCount * 0.8) % BELT.w), BELT.y + 2, 6, 3);
      ctx.fillStyle = '#34383c'; ctx.fillRect(BELT.x + 20, BELT.y + 14, 10, LAVA - BELT.y); ctx.fillRect(BELT.x + BELT.w - 30, BELT.y + 14, 10, LAVA - BELT.y);
      ctx.fillStyle = '#4a2a1e'; ctx.fillRect(STACK.x + 10, STACK.y, STACK.w - 20, BELT.y - STACK.y);
      ctx.fillStyle = '#5a3424'; ctx.fillRect(STACK.x, STACK.y, STACK.w, 10);
      _slSmoke(STACK.x + STACK.w / 2, STACK.y, 200, true, 9);
    }
    // Pipe bridge and the freight lift
    if (_slVisible(v, 1540, 2000)) {
      ctx.fillStyle = '#6a5a3a'; ctx.fillRect(PIPE.x, PIPE.y, PIPE.w, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(PIPE.x, PIPE.y + 3, PIPE.w, 2);
      ctx.fillStyle = '#5a4a2e'; ctx.fillRect(PIPE.x, PIPE.y + 20, PIPE.w, 10);
      for (const px of [PIPE.x + 40, PIPE.x + PIPE.w - 50]) { ctx.fillStyle = '#34383c'; ctx.fillRect(px, PIPE.y + 30, 10, LAVA - PIPE.y); }
      // Steam venting from a cracked joint
      _slSmoke(PIPE.x + 160, PIPE.y, 120, false, 2);
      const a = (typeof currentArena !== 'undefined') ? currentArena : null;
      const lf = _slPlat(a, 'lift');
      ctx.fillStyle = '#3a3e44'; ctx.fillRect(LIFT.x - 8, LIFT.y - LIFT.travel - 60, 6, LAVA - (LIFT.y - LIFT.travel - 60)); ctx.fillRect(LIFT.x + LIFT.w + 2, LIFT.y - LIFT.travel - 60, 6, LAVA - (LIFT.y - LIFT.travel - 60));
      ctx.fillRect(LIFT.x - 8, LIFT.y - LIFT.travel - 66, LIFT.w + 18, 8);
      if (lf) {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(lf.x + 10, LIFT.y - LIFT.travel - 58); ctx.lineTo(lf.x + 10, lf.y); ctx.moveTo(lf.x + lf.w - 10, LIFT.y - LIFT.travel - 58); ctx.lineTo(lf.x + lf.w - 10, lf.y); ctx.stroke();
        ctx.fillStyle = '#5a5e64'; ctx.fillRect(lf.x, lf.y, lf.w, 10);
        ctx.fillStyle = '#d0a020'; for (let k = 0; k < lf.w; k += 18) ctx.fillRect(lf.x + k, lf.y, 9, 3);
        ctx.strokeStyle = '#5a5e64'; ctx.lineWidth = 1.5; ctx.strokeRect(lf.x, lf.y - 26, lf.w, 26);
      }
    }
    // High gantry and the far bank, with the relay station ahead
    if (_slVisible(v, 1980, 2700)) {
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(GANT.x, GANT.y, GANT.w, 8);
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 2;
      for (let k = 0; k < GANT.w; k += 30) { ctx.beginPath(); ctx.moveTo(GANT.x + k, GANT.y + 8); ctx.lineTo(GANT.x + k + 15, GANT.y + 30); ctx.lineTo(GANT.x + k + 30, GANT.y + 8); ctx.stroke(); }
      ctx.fillStyle = '#34383c'; ctx.fillRect(GANT.x + GANT.w - 20, GANT.y + 30, 10, LAVA - GANT.y);
      // Relay station: crystal pylons on the bank (chapter 11 starts here)
      ctx.fillStyle = '#4a4a4c'; ctx.fillRect(BANK.x, BANK.y, BANK.w, LAVA - BANK.y + 40);
      ctx.fillStyle = '#5a5a5c'; ctx.fillRect(BANK.x, BANK.y, BANK.w, 8);
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(BANK.x + 160, BANK.y - 220, 160, 220);
      ctx.fillStyle = '#3a3a4e'; ctx.fillRect(BANK.x + 150, BANK.y - 230, 180, 14);
      const p = 0.6 + 0.4 * Math.sin(frameCount * 0.05);
      for (const cx of [BANK.x + 190, BANK.x + 290]) {
        ctx.fillStyle = `rgba(150,230,255,${0.6 * p + 0.2})`;
        ctx.beginPath(); ctx.moveTo(cx, BANK.y - 300); ctx.lineTo(cx + 14, BANK.y - 240); ctx.lineTo(cx, BANK.y - 228); ctx.lineTo(cx - 14, BANK.y - 240); ctx.fill();
      }
      ctx.fillStyle = '#d8e8f0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('RELAY · ARCHITECT', BANK.x + 240, BANK.y - 200);
    }
    // Bobbing floor slabs (what is left of the foundry floor)
    for (let i = 0; i < SLABS.length; i++) {
      const s = _slPlat(currentArena, 'slab' + i);
      if (!s || !_slVisible(v, s.x - 10, s.x + s.w + 10)) continue;
      ctx.fillStyle = '#4a4440'; ctx.fillRect(s.x, s.y, s.w, 30);
      ctx.fillStyle = '#5a544e'; ctx.fillRect(s.x, s.y, s.w, 5);
      ctx.fillStyle = 'rgba(255,120,40,0.5)'; ctx.fillRect(s.x, s.y + 24, s.w, 6);
    }
  }

  // Lava surface drawn over every support (after platforms)
  function surface(v, a, ph) {
    if (ph !== 'front') return;
    const x0 = v.x - 20, x1 = v.x + v.w + 20;
    const g = ctx.createLinearGradient(0, LAVA - 6, 0, LAVA + 120);
    g.addColorStop(0, '#ffd070'); g.addColorStop(0.15, '#ff7a20'); g.addColorStop(1, '#5a1004');
    ctx.fillStyle = g; ctx.fillRect(x0, LAVA, x1 - x0, 400);
    ctx.fillStyle = 'rgba(255,240,170,0.7)';
    for (let k = Math.floor(x0 / 46); k * 46 < x1; k++) {
      const wx = k * 46 + Math.sin(frameCount * 0.03 + k) * 10;
      ctx.beginPath(); ctx.ellipse(wx, LAVA + 3 + Math.sin(frameCount * 0.05 + k * 1.3) * 2, 12, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Bubbles popping
    for (let k = 0; k < 6; k++) {
      const t = (frameCount + k * 37) % 90;
      const bx = v.x + _slHash(k + Math.floor((frameCount + k * 37) / 90)) * v.w;
      ctx.strokeStyle = `rgba(255,220,140,${1 - t / 90})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, LAVA + 4, 2 + t * 0.12, Math.PI, 0); ctx.stroke();
    }
  }

  STORY_LEVELS[10] = {
    sky: ['#1a0000', '#4a1004'],
    groundColor: '#2a0800',
    platColor: '#6b2b0a',
    arena: {
      base: 'lava', platforms,
      props: { worldWidth: W, mapLeft: 0, mapRight: W, lavaY: LAVA, deathY: 600 },
    },
    backdrop, back, surface,
  };
})();
