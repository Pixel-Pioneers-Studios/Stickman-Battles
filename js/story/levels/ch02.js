'use strict';
// js/story/levels/ch02.js — Chapter 2 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 2 — The Seams (walk → duel)
// "Within an hour, there were hundreds. The air itself was bleeding light."
// The suburb an hour after chapter 0: residents gone, cars abandoned with the
// doors open, and small tears hanging over every lawn. The Seam Enforcer holds
// the cul-de-sac where the biggest tear opened ("Secure the fracture point").
// Vertical play: a backyard trampoline onto a garage roof and the house ridge,
// a treehouse, the playground frame, a moving truck, the school bus, and the
// old church bell tower at the end of the street.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, SLAB_B = 528;
  const VAN      = { x: 420, w: 190 };
  const TRAMP    = { x: 840, w: 110, y: G - 22 };
  const GARAGE   = { x: 960, w: 200, y: G - 150 };
  const HOUSE    = { x: 1160, w: 330 };
  const RIDGE    = { x: 1290, w: 80, y: G - 262 };
  const FENCE    = { x: 1500, w: 110, y: G - 80 };
  const TREEHSE  = { x: 1560, w: 150, y: G - 172 };
  const SWING    = { x: 2120, w: 150, y: G - 150 };
  const SLIDE    = { x: 2330, w: 70, y: G - 112 };
  const DOME     = { x: 2440, w: 110, y: G - 66 };
  const RIFT_X   = 3000;
  const LOG      = { x: 3460, w: 260 };
  const TRUCK    = { x: 3860, w: 250, y: G - 128 };
  const BUS      = { x: 5000, w: 300, y: G - 104 };
  const TOWER    = { x: 5420, w: 120 };
  const TOWER_YS = [G - 120, G - 220, G - 320, G - 420];

  function layout() {
    const P = [];
    _slLedge(P, VAN.x + 10, G - 40, VAN.w - 20);
    _slLedge(P, VAN.x + 40, G - 86, VAN.w - 70);
    P.push({ x: TRAMP.x, y: TRAMP.y, w: TRAMP.w, h: 10, passUnder: true, noDraw: true, isBouncy: true });
    _slLedge(P, GARAGE.x, GARAGE.y, GARAGE.w);
    _slLedge(P, RIDGE.x, RIDGE.y, RIDGE.w);
    _slLedge(P, FENCE.x, FENCE.y, FENCE.w);
    _slLedge(P, TREEHSE.x, TREEHSE.y, TREEHSE.w);
    _slLedge(P, SWING.x, SWING.y, SWING.w);
    _slLedge(P, SLIDE.x, SLIDE.y, SLIDE.w);
    _slLedge(P, DOME.x, DOME.y, DOME.w);
    _slLedge(P, LOG.x, G - 44, LOG.w);
    _slLedge(P, LOG.x + 150, G - 120, 90);
    _slLedge(P, TRUCK.x - 70, G - 56, 70);   // the tail-lift, folded down
    _slLedge(P, TRUCK.x, TRUCK.y, TRUCK.w);
    _slLedge(P, BUS.x, BUS.y, BUS.w);
    for (const y of TOWER_YS) _slLedge(P, TOWER.x, y, TOWER.w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#5e5a7c');
    // Overcast sky shot through with light: the sky is torn in a hundred places
    _slParallax(v, 0.05, (l, r) => {
      for (let i = Math.floor(l / 120) - 1; i * 120 < r + 120; i++) {
        const x = i * 120 + _slHash(i) * 80, y = -60 + _slHash(i + 3) * 240;
        _slPortal(x, y, 6 + _slHash(i + 7) * 10, 260 + _slHash(i + 9) * 60, i);
      }
    });
    _slParallax(v, 0.14, (l, r) => {
      ctx.fillStyle = 'rgba(70,64,96,0.35)';
      for (let i = Math.floor(l / 300) - 1; i * 300 < r + 300; i++) {
        const cx = i * 300 + _slHash(i * 5) * 100, cy = 40 + _slHash(i * 7) * 90;
        ctx.beginPath(); ctx.ellipse(cx, cy, 140, 24, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Light bleeding down through the cloud
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = Math.floor(l / 420); i * 420 < r + 420; i++) {
        const bx = i * 420 + _slHash(i + 40) * 200;
        const g = ctx.createLinearGradient(bx, -100, bx + 60, G);
        g.addColorStop(0, 'rgba(210,170,255,0.18)'); g.addColorStop(1, 'rgba(210,170,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(bx - 10, -100); ctx.lineTo(bx + 20, -100); ctx.lineTo(bx + 120, G); ctx.lineTo(bx + 40, G); ctx.fill();
      }
      ctx.restore();
    });
    _slParallax(v, 0.3, (l, r) => {
      // Roofs of the next streets over, with a few columns of smoke
      for (let i = Math.floor(l / 110) - 1; i * 110 < r + 110; i++) {
        const x = i * 110, w = 86, h = 40 + _slHash(i * 3) * 30;
        ctx.fillStyle = '#7e7a8a';
        ctx.beginPath(); ctx.moveTo(x - 6, G - 40 - h); ctx.lineTo(x + w / 2, G - 70 - h); ctx.lineTo(x + w + 6, G - 40 - h); ctx.fill();
        ctx.fillStyle = '#9a96a4'; ctx.fillRect(x, G - 40 - h, w, h + 40);
        if (_slHash(i + 11) < 0.12) _slSmoke(x + w / 2, G - 60 - h, 220, true, i);
      }
    });
  }

  function _house(x, w, wall, roof, lit) {
    _slHouse(x, G - 18, w, 150, 70, wall, '#ece9e2', roof, { chimney: w * 0.7 });
    _slWindow(x + 26, G - 140, 52, 46, '#ece9e2', lit, null);
    _slWindow(x + w - 78, G - 140, 52, 46, '#ece9e2', false, null);
    _slWindow(x + 26, G - 82, 52, 46, '#ece9e2', false, 'rgba(120,90,70,0.5)');
    ctx.fillStyle = '#ece9e2'; ctx.fillRect(x + w / 2 - 22, G - 104, 44, 86);
    ctx.fillStyle = '#3a4a5a'; ctx.fillRect(x + w / 2 - 18, G - 100, 36, 82);
  }

  function back(v) {
    // ── Street: houses along the block, each with a lawn running to the walk
    if (_slVisible(v, 0, 380)) _house(60, 300, '#cfc6b4', '#5a4c46', true);
    // Abandoned minivan, both doors open, engine still running
    if (_slVisible(v, VAN.x - 40, VAN.x + VAN.w + 40)) {
      _slCar(VAN.x, G, VAN.w, '#8a8e94', { hazard: true, doorOpen: true });
      ctx.fillStyle = '#8a8e94';
      ctx.fillRect(VAN.x + VAN.w * 0.22, G - 86, VAN.w * 0.6, 30);
      ctx.fillStyle = '#26323c'; ctx.fillRect(VAN.x + VAN.w * 0.3, G - 80, VAN.w * 0.42, 18);
      _slSmoke(VAN.x + 4, G - 14, 40, false, 3);
      ctx.fillStyle = '#d8b04a'; ctx.fillRect(VAN.x + 150, G - 6, 20, 6); // a dropped lunchbox
    }
    // ── Backyard: trampoline → garage → house ridge
    if (_slVisible(v, 780, 1520)) {
      ctx.fillStyle = '#5c7a44'; ctx.fillRect(780, G - 18, 740, 18);
      // Garage (flat roof is the ledge)
      ctx.fillStyle = '#d4ccbc'; ctx.fillRect(GARAGE.x, GARAGE.y, GARAGE.w, G - 18 - GARAGE.y);
      ctx.fillStyle = '#4a4440'; ctx.fillRect(GARAGE.x - 6, GARAGE.y, GARAGE.w + 12, 10);
      ctx.fillStyle = '#ebe6dc'; ctx.fillRect(GARAGE.x + 22, GARAGE.y + 40, GARAGE.w - 44, G - 18 - GARAGE.y - 40);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      for (let gy = GARAGE.y + 60; gy < G - 18; gy += 20) { ctx.beginPath(); ctx.moveTo(GARAGE.x + 22, gy); ctx.lineTo(GARAGE.x + GARAGE.w - 22, gy); ctx.stroke(); }
      // The garage door is buckled — something came through from inside
      ctx.fillStyle = '#18141c';
      ctx.beginPath(); ctx.moveTo(GARAGE.x + 70, G - 18); ctx.lineTo(GARAGE.x + 90, G - 80); ctx.lineTo(GARAGE.x + 120, G - 70); ctx.lineTo(GARAGE.x + 132, G - 18); ctx.fill();
      _slPortal(GARAGE.x + 100, G - 50, 14, 280, 4);
      _house(HOUSE.x, HOUSE.w, '#d8cfae', '#6a4a40', false);
      // Ridge: the chimney cap you can stand on
      ctx.fillStyle = '#6d4c3e'; ctx.fillRect(RIDGE.x, RIDGE.y, RIDGE.w, 50);
      ctx.fillStyle = '#4e352b'; ctx.fillRect(RIDGE.x - 4, RIDGE.y, RIDGE.w + 8, 7);
      // Trampoline: mat, springs, legs, safety net posts
      ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(TRAMP.x + 8, G); ctx.lineTo(TRAMP.x + 16, TRAMP.y + 4); ctx.moveTo(TRAMP.x + TRAMP.w - 8, G); ctx.lineTo(TRAMP.x + TRAMP.w - 16, TRAMP.y + 4); ctx.stroke();
      ctx.fillStyle = '#222428'; ctx.fillRect(TRAMP.x + 6, TRAMP.y, TRAMP.w - 12, 5);
      ctx.fillStyle = '#3a7ac0'; ctx.fillRect(TRAMP.x, TRAMP.y - 2, 8, 7); ctx.fillRect(TRAMP.x + TRAMP.w - 8, TRAMP.y - 2, 8, 7);
      ctx.strokeStyle = 'rgba(40,40,46,0.45)'; ctx.lineWidth = 1;
      for (let nx = TRAMP.x + 4; nx <= TRAMP.x + TRAMP.w - 4; nx += 7) { ctx.beginPath(); ctx.moveTo(nx, TRAMP.y - 2); ctx.lineTo(nx, TRAMP.y - 60); ctx.stroke(); }
      ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2e';
      ctx.beginPath(); ctx.moveTo(TRAMP.x + 2, TRAMP.y - 60); ctx.lineTo(TRAMP.x + TRAMP.w - 2, TRAMP.y - 60); ctx.stroke();
      // A swing-ball and a kid's bike dropped on the lawn
      ctx.strokeStyle = '#c03a2a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(1120, G - 10, 8, 0, Math.PI * 2); ctx.arc(1146, G - 10, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1120, G - 10); ctx.lineTo(1132, G - 24); ctx.lineTo(1146, G - 10); ctx.stroke();
    }
    // ── Fence → treehouse in the old oak
    if (_slVisible(v, 1480, 1760)) {
      _slTree(1640, G - 18, 1.9, '#4e6a42');
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(TREEHSE.x + 14, TREEHSE.y - 64, TREEHSE.w - 28, 64);
      ctx.fillStyle = '#6a4e30';
      ctx.beginPath(); ctx.moveTo(TREEHSE.x + 4, TREEHSE.y - 64); ctx.lineTo(TREEHSE.x + TREEHSE.w / 2, TREEHSE.y - 96); ctx.lineTo(TREEHSE.x + TREEHSE.w - 4, TREEHSE.y - 64); ctx.fill();
      ctx.fillStyle = '#2a1e14'; ctx.fillRect(TREEHSE.x + 60, TREEHSE.y - 46, 30, 46);
      ctx.fillStyle = '#e8e0d0'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('KEEP OUT', TREEHSE.x + 40, TREEHSE.y - 50);
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(TREEHSE.x, TREEHSE.y, TREEHSE.w, 9);
      ctx.fillStyle = '#9a7a54';
      for (let fx = FENCE.x; fx < FENCE.x + FENCE.w; fx += 14) ctx.fillRect(fx, FENCE.y, 12, G - FENCE.y);
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(FENCE.x, FENCE.y + 14, FENCE.w, 6);
    }
    // ── Storm drain at the first shaft (drawn in the surface pass), lamp
    if (_slVisible(v, 1760, 2080)) { _slStreetLamp(1960, G - 18, false); _slHydrant(2020, G - 18); }
    // ── Playground
    if (_slVisible(v, 2080, 2620)) {
      ctx.fillStyle = '#8a7a5a'; ctx.fillRect(2090, G - 18, 500, 18);
      // Swing frame — the top bar is the ledge
      ctx.strokeStyle = '#c0442e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(SWING.x - 10, G - 18); ctx.lineTo(SWING.x + 10, SWING.y); ctx.lineTo(SWING.x + SWING.w - 10, SWING.y); ctx.lineTo(SWING.x + SWING.w + 10, G - 18); ctx.stroke();
      ctx.strokeStyle = '#6a6e72'; ctx.lineWidth = 1.5;
      for (const [sx, ph] of [[SWING.x + 45, 0], [SWING.x + 105, 1.3]]) {
        const a = Math.sin(frameCount * 0.035 + ph) * 0.35;
        const ex = sx + Math.sin(a) * 90, ey = SWING.y + Math.cos(a) * 90;
        ctx.beginPath(); ctx.moveTo(sx - 8, SWING.y); ctx.lineTo(ex - 8, ey); ctx.moveTo(sx + 8, SWING.y); ctx.lineTo(ex + 8, ey); ctx.stroke();
        ctx.fillStyle = '#2a2a2e'; ctx.fillRect(ex - 12, ey, 24, 4);
      }
      // Slide tower
      ctx.fillStyle = '#3a7ac0'; ctx.fillRect(SLIDE.x, SLIDE.y, SLIDE.w, 8);
      ctx.fillStyle = '#5a5e62'; ctx.fillRect(SLIDE.x + 4, SLIDE.y + 8, 5, G - 18 - SLIDE.y - 8); ctx.fillRect(SLIDE.x + SLIDE.w - 9, SLIDE.y + 8, 5, G - 18 - SLIDE.y - 8);
      ctx.fillStyle = '#e8b830';
      ctx.beginPath(); ctx.moveTo(SLIDE.x + SLIDE.w, SLIDE.y + 2); ctx.quadraticCurveTo(SLIDE.x + SLIDE.w + 40, SLIDE.y + 20, SLIDE.x + SLIDE.w + 70, G - 22); ctx.lineTo(SLIDE.x + SLIDE.w + 70, G - 14); ctx.quadraticCurveTo(SLIDE.x + SLIDE.w + 34, SLIDE.y + 30, SLIDE.x + SLIDE.w, SLIDE.y + 12); ctx.fill();
      ctx.fillStyle = '#c0442e';
      ctx.beginPath(); ctx.moveTo(SLIDE.x - 4, SLIDE.y); ctx.lineTo(SLIDE.x + SLIDE.w / 2, SLIDE.y - 34); ctx.lineTo(SLIDE.x + SLIDE.w + 4, SLIDE.y); ctx.fill();
      // Climbing dome
      ctx.strokeStyle = '#3a8a5a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(DOME.x + DOME.w / 2, G - 18, DOME.w / 2, Math.PI, 0); ctx.stroke();
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(DOME.x + DOME.w / 2, G - 18, DOME.w / 2 * (1 - k * 0.22), DOME.w / 2 * Math.sqrt(1 - Math.pow(1 - k * 0.22, 2)) + 10, 0, Math.PI, 0); ctx.stroke(); }
      _slPortal(2260, G - 230, 18, 300, 2);
    }
    // ── The cul-de-sac and the fracture point
    if (_slVisible(v, 2620, 3400)) {
      _house(2660, 280, '#c6c0d0', '#4a4458', false);
      _house(3080, 280, '#d0c4b0', '#5a4840', true);
      // Seam crew kit: glyph-marked crates and a field pylon
      for (const [cx, s] of [[2870, 40], [2910, 34], [3120, 40]]) {
        _slCrate(cx, G - s, s, '#3a3e48');
        ctx.fillStyle = 'rgba(190,150,255,0.8)'; ctx.fillRect(cx + s / 2 - 5, G - s / 2 - 1, 10, 2); ctx.fillRect(cx + s / 2 - 1, G - s / 2 - 5, 2, 10);
      }
      ctx.fillStyle = '#2a2c34'; ctx.fillRect(3170, G - 110, 8, 110);
      ctx.fillStyle = (frameCount % 40) < 20 ? '#c9a2ff' : '#6a4a9a'; ctx.fillRect(3166, G - 118, 16, 10);
      _slPortal(RIFT_X, G - 210, 64, 275, 0);
    }
    // ── Fallen oak across the road
    if (_slVisible(v, LOG.x - 80, LOG.x + LOG.w + 80)) {
      ctx.fillStyle = '#4e3a2a';
      ctx.save(); ctx.translate(LOG.x, G - 22); ctx.rotate(-0.04);
      ctx.fillRect(0, -22, LOG.w, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let bx = 10; bx < LOG.w; bx += 22) ctx.fillRect(bx, -20, 3, 26);
      ctx.restore();
      ctx.fillStyle = '#3e2e22';
      ctx.beginPath(); ctx.arc(LOG.x - 4, G - 18, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a5038'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(LOG.x - 4, G - 18, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#4e3a2a'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(LOG.x + 150, G - 40); ctx.lineTo(LOG.x + 170, G - 120); ctx.moveTo(LOG.x + 210, G - 42); ctx.lineTo(LOG.x + 236, G - 120); ctx.stroke();
      ctx.fillStyle = '#4a6a3a';
      for (const [bx, by, r] of [[LOG.x + 200, G - 132, 44], [LOG.x + 250, G - 110, 34], [LOG.x + 160, G - 124, 30]]) { ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#5a4436'; ctx.fillRect(LOG.x + 150, G - 124, 90, 8);
    }
    // ── Moving truck, tail-lift down, boxes spilled
    if (_slVisible(v, TRUCK.x - 120, TRUCK.x + TRUCK.w + 120)) {
      ctx.fillStyle = '#e6e2d8'; ctx.fillRect(TRUCK.x, TRUCK.y, TRUCK.w, G - 26 - TRUCK.y);
      ctx.fillStyle = '#d24a2a'; ctx.fillRect(TRUCK.x, TRUCK.y + 30, TRUCK.w, 22);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.fillText('U-MOVE', TRUCK.x + TRUCK.w / 2, TRUCK.y + 47);
      ctx.fillStyle = '#26292c'; ctx.fillRect(TRUCK.x + TRUCK.w, G - 92, 70, 66);
      ctx.fillStyle = '#d24a2a'; ctx.fillRect(TRUCK.x + TRUCK.w, G - 100, 76, 74);
      ctx.fillStyle = '#26323c'; ctx.fillRect(TRUCK.x + TRUCK.w + 30, G - 92, 40, 26);
      ctx.fillStyle = '#16181a';
      for (const wx of [TRUCK.x + 50, TRUCK.x + 90, TRUCK.x + TRUCK.w + 40]) { ctx.beginPath(); ctx.arc(wx, G - 12, 13, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#7a7e84'; ctx.fillRect(TRUCK.x - 70, G - 56, 70, 6);
      ctx.fillStyle = '#1a1c1e'; ctx.fillRect(TRUCK.x - 2, TRUCK.y + 4, 4, G - 30 - TRUCK.y);
      for (const [bx, by, s] of [[TRUCK.x - 120, G - 30, 30], [TRUCK.x - 92, G - 24, 24], [TRUCK.x - 110, G - 54, 24]]) _slCrate(bx, by, s, '#b08a5a');
    }
    if (_slVisible(v, 4200, 4950)) {
      _house(4300, 300, '#b8c2c8', '#4a5058', false);
      _slCar(4640, G, 160, '#4a5a3a', {});
      _slFire(4650, G - 30, 140, 1.1);
      _slSmoke(4720, G - 80, 300, true, 7);
    }
    // ── School bus, then the church bell tower
    if (_slVisible(v, BUS.x - 40, BUS.x + BUS.w + 60)) {
      ctx.fillStyle = '#e0a82a'; ctx.fillRect(BUS.x, BUS.y, BUS.w, G - 20 - BUS.y);
      ctx.fillStyle = '#26323c';
      for (let wx = BUS.x + 20; wx < BUS.x + BUS.w - 60; wx += 34) ctx.fillRect(wx, BUS.y + 12, 26, 24);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(BUS.x, BUS.y + 44, BUS.w, 4);
      ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('SCHOOL BUS', BUS.x + BUS.w / 2, BUS.y + 62);
      ctx.fillStyle = '#e0a82a'; ctx.fillRect(BUS.x + BUS.w, G - 70, 40, 50);
      ctx.fillStyle = '#c0302a'; ctx.fillRect(BUS.x - 18, BUS.y + 50, 18, 16);
      ctx.fillStyle = '#16181a'; for (const wx of [BUS.x + 50, BUS.x + BUS.w - 30]) { ctx.beginPath(); ctx.arc(wx, G - 12, 14, 0, Math.PI * 2); ctx.fill(); }
    }
    if (_slVisible(v, 5300, 5800)) {
      // Church nave
      ctx.fillStyle = '#b8b0a2'; ctx.fillRect(5540, G - 200, 240, 182);
      ctx.fillStyle = '#5a4a44';
      ctx.beginPath(); ctx.moveTo(5530, G - 200); ctx.lineTo(5660, G - 270); ctx.lineTo(5790, G - 200); ctx.fill();
      for (const wx of [5580, 5650, 5720]) {
        ctx.fillStyle = '#3a4a6a'; ctx.beginPath(); ctx.moveTo(wx, G - 60); ctx.lineTo(wx, G - 140); ctx.arc(wx + 14, G - 140, 14, Math.PI, 0); ctx.lineTo(wx + 28, G - 60); ctx.fill();
      }
      // Bell tower: four floors, each with a landing you climb to
      const T = TOWER;
      ctx.fillStyle = '#c4bcae'; ctx.fillRect(T.x + 10, G - 470, T.w - 20, 452);
      ctx.fillStyle = '#5a4a44';
      ctx.beginPath(); ctx.moveTo(T.x, G - 470); ctx.lineTo(T.x + T.w / 2, G - 560); ctx.lineTo(T.x + T.w, G - 470); ctx.fill();
      ctx.fillStyle = '#8a7a6a'; ctx.fillRect(T.x + T.w / 2 - 2, G - 590, 4, 32); ctx.fillRect(T.x + T.w / 2 - 12, G - 580, 24, 4);
      for (const y of TOWER_YS) {
        ctx.fillStyle = '#7a6e62'; ctx.fillRect(T.x, y, T.w, 8);
        ctx.fillStyle = '#2a2420';
        ctx.beginPath(); ctx.moveTo(T.x + 34, y); ctx.lineTo(T.x + 34, y - 54); ctx.arc(T.x + 60, y - 54, 26, Math.PI, 0); ctx.lineTo(T.x + 86, y); ctx.fill();
      }
      // The bell, swinging in a wind nobody can feel
      const sw = Math.sin(frameCount * 0.05) * 0.25;
      ctx.save(); ctx.translate(T.x + 60, TOWER_YS[3] - 74); ctx.rotate(sw);
      ctx.fillStyle = '#9a7a3a';
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-16, 26, -24, 34); ctx.lineTo(24, 34); ctx.quadraticCurveTo(16, 26, 14, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      _slPortal(T.x + 60, G - 640, 30, 290, 8);
    }
    // Portals at street level: the "hundreds" also hang just over the lawns
    for (let i = 0; i < 18; i++) {
      const px = 200 + i * 320 + _slHash(i + 200) * 120;
      if (Math.abs(px - RIFT_X) < 300 || !_slVisible(v, px - 40, px + 40)) continue;
      _slPortal(px, G - 140 - _slHash(i + 300) * 160, 8 + _slHash(i + 400) * 10, 255 + _slHash(i) * 70, i);
    }
  }

  const ZONES = [{ x0: -200, x1: 6200, kind: 'sidewalk', face: 'soil' }];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph !== 'back') return;
    // Storm drain + sinkhole dressing around the two shafts
    for (const r of (a.undergroundRects || []).filter(q => q.kind === 'shaft')) {
      if (!_slVisible(v, r.x - 60, r.x + r.w + 60)) continue;
      _slCone(r.x - 18, G - 2); _slCone(r.x + r.w + 18, G - 2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(r.x + r.w / 2, G, 4, r.x + r.w / 2, G, 70);
      g.addColorStop(0, 'rgba(200,150,255,0.35)'); g.addColorStop(1, 'rgba(200,150,255,0)');
      ctx.fillStyle = g; ctx.fillRect(r.x - 30, G - 70, r.w + 60, 70);
      ctx.restore();
    }
  }

  STORY_LEVELS[2] = {
    sky: ['#6a6688', '#c8b2b6'],
    groundColor: '#3a3029',
    platColor: '#4a4038',
    layout, backdrop, back, surface,
  };
})();
