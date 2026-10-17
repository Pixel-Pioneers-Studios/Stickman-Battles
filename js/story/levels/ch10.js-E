'use strict';
// js/story/levels/ch10.js — Chapter 10 map (walk→fight world over lava). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 10 — The Lava Crossing (walkFight, one continuous 6000px world)
// "The industrial quarter had been swallowed. Lava from a destabilized portal.
// The floor was literally melting. All you had to do was cross." The foundry
// district is gone; what is left of its floor stands as five decks in a lava
// field, joined by what the industry left behind: containers, a swinging crane
// hook, a catwalk, bobbing floor slabs, a pipe bridge, a freight lift, a gantry.
// The lava bites (exploreProps.hasLava — the same rules as the lava arena), so
// every deck is a real safe spot. Layout, west to east:
//   dock (spawn) -> containers/hook/catwalk -> foundry remnant (rest beacon)
//   -> slab hop -> the Lava Gate yard (the Guardian's duel) -> pipe bridge,
//   lift, gantry -> cooling plant (rest beacon, optional elite cache)
//   -> slab hop -> the far bank and the Architect's relay (exit).
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  // The lava line sits well under the decks: pickSafeSpawn keeps spawns 120px above
  // lavaY, so a deck at 440 only counts as spawn-safe if the melt is below 560.
  const LAVA = 562, FY = 440, FH = 34;
  // Decks (isFloor, y=440): the only solid ground. Gaps between are lava.
  const DECKS = [[0, 430], [1130, 920], [2210, 1230], [4100, 850], [5240, 760]];
  const CONT  = [[470, 392, 110], [610, 350, 110]];
  const HOOK  = { x: 770, y: 340, w: 90, sway: 60 };
  const CRANE = { x: 660, w: 330, y: 200 };            // overhead arm: standable, off the path
  const CATW  = { x: 960, w: 170, y: 380 };
  const SLAB1 = [2078, 430, 100];
  const PIPE  = { x: 3470, w: 260, y: 390 };
  const LIFT  = { x: 3760, w: 90, y: 340, travel: 70 };
  const GANT  = { x: 3880, w: 150, y: 330 };
  const SLABS2 = [[4980, 432, 100, 0.0], [5110, 424, 100, 1.7]];
  const ROOF  = { x: 4250, w: 190, y: 330 };           // pump-house roof (elite cache)
  const NOOK  = { x: 2990, w: 120, y: 300 };           // yard watch-ledge

  function floor() {
    return DECKS.map(([x, w]) => ({ x, y: FY, w, h: FH, isFloor: true }));
  }

  function layout() {
    const P = [];
    for (const [x, y, w] of CONT) _slLedge(P, x, y, w);
    _slMover(P, 'hook', HOOK.x, HOOK.y, HOOK.w, HOOK.sway, 0, 0.016, 0);
    _slLedge(P, CRANE.x, CRANE.y, CRANE.w);
    _slLedge(P, CATW.x, CATW.y, CATW.w);
    _slMover(P, 'slab0', SLAB1[0], SLAB1[1], SLAB1[2], 0, 7, 0.03, 0);
    _slLedge(P, NOOK.x, NOOK.y, NOOK.w);
    _slLedge(P, PIPE.x, PIPE.y, PIPE.w);
    _slMover(P, 'lift', LIFT.x, LIFT.y, LIFT.w, 0, LIFT.travel, 0.014, 0);
    _slLedge(P, GANT.x, GANT.y, GANT.w);
    _slLedge(P, ROOF.x, ROOF.y, ROOF.w);
    SLABS2.forEach(([x, y, w, ph], i) => _slMover(P, 'slabB' + i, x, y, w, 0, 7, 0.03, ph));
    return P;
  }

  // Optional loot (see level.loot in smb-story-engine-explore.js). The crane arm
  // is the hidden cache: hook -> arm is one jump, nothing on the path points at it.
  // The pump-house roof holds the better cache, watched by an optional Slag
  // Warden that holds its post — the exit never waits on it.
  function loot() {
    return [
      { id: 'crane', tier: 'minor', x: CRANE.x + 250, y: CRANE.y - 16 },
      { id: 'roof', tier: 'elite', x: ROOF.x + 130, y: ROOF.y - 16,
        contents: { tokens: 45, exp: 50, heal: 100 },
        guards: [{ x: ROOF.x + 70, floorY: ROOF.y, elite: true, name: 'Slag Warden', weaponKey: 'hammer', classKey: 'warrior', color: '#cc5a1a', health: 150 }] },
    ];
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
      const px = 3000;
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

  function support(x, y, w) {                           // steel leg into the melt
    ctx.fillStyle = '#34383c'; ctx.fillRect(x, y, w || 10, LAVA - y + 10);
  }

  function back(v, a) {
    // Deck undersides: rusted foundry floor slabs, rivets, a sagging edge
    for (const [dx, dw] of DECKS) {
      if (!_slVisible(v, dx - 10, dx + dw + 10)) continue;
      ctx.fillStyle = '#4a4440'; ctx.fillRect(dx, FY, dw, FH);
      ctx.fillStyle = '#5a544e'; ctx.fillRect(dx, FY, dw, 5);
      ctx.fillStyle = 'rgba(255,120,40,0.45)'; ctx.fillRect(dx, FY + FH - 6, dw, 6);
      ctx.fillStyle = '#2a2624'; for (let rx = dx + 14; rx < dx + dw - 6; rx += 34) ctx.fillRect(rx, FY + 12, 3, 3);
      for (const lx of [dx + 18, dx + dw - 28]) support(lx, FY + FH, 10);
    }
    // ── Dock (spawn)
    if (_slVisible(v, 0, 440)) {
      ctx.fillStyle = '#d0a020'; for (let k = 0; k < 14; k++) ctx.fillRect(10 + k * 30, FY, 15, 4);
      ctx.fillStyle = '#efe9da'; ctx.fillRect(40, FY - 70, 120, 32);
      ctx.fillStyle = '#9c2a22'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('HALVERSEN STEEL', 100, FY - 56);
      ctx.fillStyle = '#2b2b2b'; ctx.font = '7px Arial'; ctx.fillText('BAY 4 · LOADING', 100, FY - 45);
      _slCrate(240, FY - 44, 44, '#7a5a3a'); _slCrate(300, FY - 34, 34, '#6a4a2e');
    }
    // ── Containers, sinking unevenly
    if (_slVisible(v, 440, 760)) {
      const cols = ['#2a5a8a', '#8a3a2a'];
      CONT.forEach(([x, y, w], i) => {
        ctx.fillStyle = cols[i]; ctx.fillRect(x, y, w, LAVA - y);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let rx = x + 8; rx < x + w; rx += 10) ctx.fillRect(rx, y + 6, 3, LAVA - y - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, 4);
      });
      ctx.fillStyle = '#e8e2d0'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('MAERA', CONT[0][0] + 55, CONT[0][1] + 30);
    }
    // ── Overhead crane arm (standable), trolley and the swinging hook block
    if (_slVisible(v, 640, 1020)) {
      ctx.fillStyle = '#c8a020'; ctx.fillRect(CRANE.x, CRANE.y, CRANE.w, 12);
      ctx.strokeStyle = '#c8a020'; ctx.lineWidth = 2;
      for (let k = 0; k < CRANE.w; k += 24) { ctx.beginPath(); ctx.moveTo(CRANE.x + k, CRANE.y + 12); ctx.lineTo(CRANE.x + k + 12, CRANE.y + 30); ctx.lineTo(CRANE.x + k + 24, CRANE.y + 12); ctx.stroke(); }
      ctx.fillStyle = '#c8a020'; ctx.fillRect(CRANE.x, CRANE.y + 28, CRANE.w, 4);
      support(CRANE.x + CRANE.w - 30, CRANE.y + 32, 20);
      ctx.fillStyle = '#4a4a4c'; ctx.fillRect(CRANE.x + 60, CRANE.y - 30, 28, 30);  // operator cab
      ctx.fillStyle = 'rgba(170,220,255,0.35)'; ctx.fillRect(CRANE.x + 64, CRANE.y - 26, 20, 12);
      const hk = _slPlat(a, 'hook');
      if (hk) {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hk.x + hk.w / 2, CRANE.y + 32); ctx.lineTo(hk.x + hk.w / 2, hk.y); ctx.stroke();
        ctx.fillStyle = '#3a3e42'; ctx.fillRect(hk.x, hk.y, hk.w, 12);
        ctx.fillStyle = '#d0a020'; ctx.fillRect(hk.x, hk.y, hk.w, 3);
        ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hk.x + hk.w / 2, hk.y + 24, 9, 0, Math.PI); ctx.stroke();
      }
    }
    // ── Catwalk with railings and legs into the melt
    if (_slVisible(v, 940, 1150)) {
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(CATW.x, CATW.y, CATW.w, 7);
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(CATW.x, CATW.y - 24); ctx.lineTo(CATW.x + CATW.w, CATW.y - 24); ctx.stroke();
      for (let rx = CATW.x; rx <= CATW.x + CATW.w; rx += 15) { ctx.beginPath(); ctx.moveTo(rx, CATW.y); ctx.lineTo(rx, CATW.y - 24); ctx.stroke(); }
      support(CATW.x + 20, CATW.y + 7, 8);
    }
    // ── Foundry remnant (deck 2): conveyor gantry, furnace stack
    if (_slVisible(v, 1130, 2060)) {
      ctx.fillStyle = '#4a2a1e'; ctx.fillRect(1500, FY - 190, 70, 190);
      ctx.fillStyle = '#5a3424'; ctx.fillRect(1490, FY - 190, 90, 10);
      _slSmoke(1535, FY - 190, 200, true, 9);
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(1300, FY - 40, 180, 14);
      ctx.fillStyle = '#5a5e64'; for (let k = 0; k < 180; k += 14) ctx.fillRect(1300 + ((k + frameCount * 0.8) % 180), FY - 38, 6, 3);
      ctx.fillStyle = '#34383c'; ctx.fillRect(1310, FY - 26, 8, 26); ctx.fillRect(1460, FY - 26, 8, 26);
      ctx.fillStyle = '#d8d2c0'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('LINE 2 · POUR', 1390, FY - 46);
      _slCrate(1760, FY - 40, 40, '#6a4a2e'); _slCrate(1812, FY - 30, 30, '#7a5a3a'); _slCrate(1930, FY - 44, 44, '#6a4a2e');
    }
    // ── Slab hop 1 (the floor that is left of the foundry)
    {
      const s = _slPlat(a, 'slab0');
      if (s && _slVisible(v, s.x - 10, s.x + s.w + 10)) {
        ctx.fillStyle = '#4a4440'; ctx.fillRect(s.x, s.y, s.w, 30);
        ctx.fillStyle = '#5a544e'; ctx.fillRect(s.x, s.y, s.w, 5);
        ctx.fillStyle = 'rgba(255,120,40,0.5)'; ctx.fillRect(s.x, s.y + 24, s.w, 6);
      }
    }
    // ── The Lava Gate yard (deck 3, fight at x=3000): the Guardian's gate and the watch-ledge
    if (_slVisible(v, 2700, 3400)) {
      ctx.fillStyle = '#3a3a3e'; ctx.fillRect(2750, FY - 210, 16, 210); ctx.fillRect(3320, FY - 210, 16, 210);
      ctx.fillStyle = '#4a4a4e'; ctx.fillRect(2740, FY - 220, 606, 18);
      ctx.fillStyle = '#d0a020'; for (let k = 0; k < 20; k++) ctx.fillRect(2744 + k * 30, FY - 220, 15, 5);
      ctx.fillStyle = '#c8321a'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillText('LAVA GATE · NO ENTRY', 3043, FY - 226);
      // watch-ledge (standable): railing, a dead control box
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(NOOK.x, NOOK.y, NOOK.w, 6);
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(NOOK.x, NOOK.y - 22); ctx.lineTo(NOOK.x + NOOK.w, NOOK.y - 22); ctx.stroke();
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(NOOK.x + 8, NOOK.y - 26, 22, 26);
      ctx.fillStyle = '#c8321a'; ctx.fillRect(NOOK.x + 14, NOOK.y - 20, 6, 6);
      ctx.fillStyle = '#3a3e44'; ctx.fillRect(NOOK.x + 54, NOOK.y + 6, 8, FY - NOOK.y - 6);
      _slCrate(2860, FY - 36, 36, '#6a4a2e'); _slCrate(3240, FY - 40, 40, '#7a5a3a');
    }
    // ── Pipe bridge, freight lift, high gantry
    if (_slVisible(v, 3440, 4060)) {
      ctx.fillStyle = '#6a5a3a'; ctx.fillRect(PIPE.x, PIPE.y, PIPE.w, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(PIPE.x, PIPE.y + 3, PIPE.w, 2);
      ctx.fillStyle = '#5a4a2e'; ctx.fillRect(PIPE.x, PIPE.y + 20, PIPE.w, 10);
      for (const px of [PIPE.x + 30, PIPE.x + PIPE.w - 40]) support(px, PIPE.y + 30, 10);
      _slSmoke(PIPE.x + 140, PIPE.y, 120, false, 2);
      const lf = _slPlat(a, 'lift');
      const top = LIFT.y - LIFT.travel - 60;
      ctx.fillStyle = '#3a3e44'; ctx.fillRect(LIFT.x - 8, top, 6, LAVA - top); ctx.fillRect(LIFT.x + LIFT.w + 2, top, 6, LAVA - top);
      ctx.fillRect(LIFT.x - 8, top - 6, LIFT.w + 18, 8);
      if (lf) {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(lf.x + 10, top + 2); ctx.lineTo(lf.x + 10, lf.y); ctx.moveTo(lf.x + lf.w - 10, top + 2); ctx.lineTo(lf.x + lf.w - 10, lf.y); ctx.stroke();
        ctx.fillStyle = '#5a5e64'; ctx.fillRect(lf.x, lf.y, lf.w, 10);
        ctx.fillStyle = '#d0a020'; for (let k = 0; k < lf.w; k += 18) ctx.fillRect(lf.x + k, lf.y, 9, 3);
        ctx.strokeStyle = '#5a5e64'; ctx.lineWidth = 1.5; ctx.strokeRect(lf.x, lf.y - 26, lf.w, 26);
      }
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(GANT.x, GANT.y, GANT.w, 8);
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 2;
      for (let k = 0; k < GANT.w; k += 30) { ctx.beginPath(); ctx.moveTo(GANT.x + k, GANT.y + 8); ctx.lineTo(GANT.x + k + 15, GANT.y + 30); ctx.lineTo(GANT.x + k + 30, GANT.y + 8); ctx.stroke(); }
      support(GANT.x + GANT.w - 20, GANT.y + 30, 10);
    }
    // ── Cooling plant (deck 4): tower and the pump house with the roof cache
    if (_slVisible(v, 4080, 4980)) {
      ctx.fillStyle = '#3a2820';
      ctx.beginPath(); ctx.moveTo(4830, FY); ctx.quadraticCurveTo(4850, FY - 110, 4840, FY - 200); ctx.lineTo(4940, FY - 200); ctx.quadraticCurveTo(4930, FY - 110, 4955, FY); ctx.fill();
      _slSmoke(4890, FY - 200, 200, true, 4);
      ctx.fillStyle = '#4a4a4c'; ctx.fillRect(ROOF.x - 6, ROOF.y, ROOF.w + 12, FY - ROOF.y);        // pump house
      ctx.fillStyle = '#5a5a5c'; ctx.fillRect(ROOF.x - 10, ROOF.y - 4, ROOF.w + 20, 10);
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(ROOF.x + 20, ROOF.y + 40, 40, FY - ROOF.y - 40);
      ctx.fillStyle = '#d8d2c0'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('PUMP 3', ROOF.x + 130, ROOF.y + 30);
      ctx.fillStyle = '#7a8088'; ctx.fillRect(4140, FY - 22, 60, 22); ctx.fillRect(4150, FY - 36, 8, 14);
    }
    // ── Slab hop 2
    for (let i = 0; i < SLABS2.length; i++) {
      const s = _slPlat(a, 'slabB' + i);
      if (!s || !_slVisible(v, s.x - 10, s.x + s.w + 10)) continue;
      ctx.fillStyle = '#4a4440'; ctx.fillRect(s.x, s.y, s.w, 30);
      ctx.fillStyle = '#5a544e'; ctx.fillRect(s.x, s.y, s.w, 5);
      ctx.fillStyle = 'rgba(255,120,40,0.5)'; ctx.fillRect(s.x, s.y + 24, s.w, 6);
    }
    // ── The far bank: the Architect's relay (chapter 11 starts here)
    if (_slVisible(v, 5220, 6000)) {
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(5640, FY - 230, 150, 230);
      ctx.fillStyle = '#3a3a4e'; ctx.fillRect(5630, FY - 240, 170, 14);
      const p = 0.6 + 0.4 * Math.sin(frameCount * 0.05);
      for (const cx of [5670, 5750]) {
        ctx.fillStyle = `rgba(150,230,255,${0.6 * p + 0.2})`;
        ctx.beginPath(); ctx.moveTo(cx, FY - 320); ctx.lineTo(cx + 14, FY - 256); ctx.lineTo(cx, FY - 244); ctx.lineTo(cx - 14, FY - 256); ctx.fill();
      }
      ctx.fillStyle = '#d8e8f0'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('RELAY · ARCHITECT', 5715, FY - 206);
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
    // Glow licking up the deck edges
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createLinearGradient(0, LAVA - 60, 0, LAVA);
    gg.addColorStop(0, 'rgba(255,100,20,0)'); gg.addColorStop(1, 'rgba(255,100,20,0.22)');
    ctx.fillStyle = gg; ctx.fillRect(x0, LAVA - 60, x1 - x0, 60);
    ctx.restore();
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
    noGroundFill: true,
    startX: 120,
    // Same rules as the lava arena: the melt burns and bounces. The explore
    // generator does not inherit hazards from the theme, so they are set here.
    exploreProps: { hasLava: true, lavaY: LAVA, deathY: 640, noVoidFog: true },
    floor, layout, loot, backdrop, back, surface,
  };
})();
