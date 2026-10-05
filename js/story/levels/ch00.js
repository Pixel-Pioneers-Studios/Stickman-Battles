'use strict';
// js/story/levels/ch00.js — Chapter 0 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 0 — Fracture Point
// "You were crossing the street when the air ripped." Kael walks out of his
// front yard, down the sidewalk and into the crosswalk at 5th & Elm, where the
// Fracture Scout steps through a tear above the road. The far side of the
// street is the shop block; its end opens into the alley chapter 1 is set in.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const SLAB_B = 528;      // floor slab bottom (_EXP_CEIL_B)
  // Zone boundaries (world x)
  const YARD_END   = 1180;   // lawn → sidewalk
  const ROAD_L     = 2380;   // near curb
  const ROAD_R     = 3640;   // far curb
  const XWALK_L    = 2860, XWALK_R = 3140;   // crosswalk; the duel checkpoint is at 3000
  const TEAR_X     = 3000;
  // Props with standable tops (shared by layout + art)
  const PORCH      = { x: 330, w: 170, h: 26 };
  const PORCH_ROOF = { x: 316, w: 198, y: G - 126 };
  const MY_CAR     = { x: 690, w: 170 };
  const CAR_A      = { x: 2440, w: 170 };          // stalled sedan, near lane
  const TAXI       = { x: 3420, w: 176 };          // stalled taxi, far lane
  const SHELTER    = { x: 3730, w: 150, y: G - 118 };
  const AWNING     = { x: 3960, w: 400, y: G - 100 };
  const SCAFFOLD   = { x: 4790, w: 120 };
  const FIRE_ESC   = { x: 5040, w: 110 };
  const DUMPSTER   = { x: 5420, w: 88, h: 54 };
  const ALLEY_X    = 5560;   // alley mouth (exit beacon sits just inside)
  const CAR_H      = 56;     // sedan body + cabin collision height

  function layout() {
    const P = [];
    // Everything is a one-way top: the props are drawn behind the fighters, so
    // a solid block would stop the player at something they appear to walk in
    // front of (and the porch sits beside spawn, before the tutorial teaches jump).
    const ledge = (x, y, w) => P.push({ x, y, w, h: 10, passUnder: true, noDraw: true });
    ledge(PORCH.x, G - PORCH.h, PORCH.w);
    ledge(PORCH_ROOF.x, PORCH_ROOF.y, PORCH_ROOF.w);
    ledge(MY_CAR.x + 4, G - 34, MY_CAR.w - 8);
    ledge(MY_CAR.x + MY_CAR.w * 0.26, G - CAR_H, MY_CAR.w * 0.5);
    ledge(CAR_A.x + 4, G - 34, CAR_A.w - 8);
    ledge(CAR_A.x + CAR_A.w * 0.26, G - CAR_H, CAR_A.w * 0.5);
    ledge(TAXI.x + 4, G - 34, TAXI.w - 8);
    ledge(TAXI.x + TAXI.w * 0.26, G - CAR_H, TAXI.w * 0.5);
    ledge(SHELTER.x, SHELTER.y, SHELTER.w);
    ledge(AWNING.x, AWNING.y, AWNING.w);
    ledge(SCAFFOLD.x, G - 96, SCAFFOLD.w);
    ledge(SCAFFOLD.x, G - 186, SCAFFOLD.w);
    ledge(FIRE_ESC.x, G - 128, FIRE_ESC.w);
    ledge(FIRE_ESC.x, G - 226, FIRE_ESC.w);
    ledge(FIRE_ESC.x, G - 324, FIRE_ESC.w);
    ledge(DUMPSTER.x, G - DUMPSTER.h, DUMPSTER.w);
    return P;
  }

  function backdrop(v) {
    // Late-afternoon haze over the city skyline, then a suburb roofline
    _slParallax(v, 0.08, (l, r) => {
      const sx = l + 700;
      const sg = ctx.createRadialGradient(sx, 110, 6, sx, 110, 180);
      sg.addColorStop(0, 'rgba(255,238,200,0.75)'); sg.addColorStop(0.25, 'rgba(255,226,170,0.25)'); sg.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - 180, -80, 360, 380);
      ctx.fillStyle = '#fff6e2'; ctx.beginPath(); ctx.arc(sx, 110, 22, 0, Math.PI * 2); ctx.fill();
    });
    _slParallax(v, 0.12, (l, r) => {
      for (let i = Math.floor(l / 260) - 1; i * 260 < r + 260; i++) {
        const cx = i * 260 + _slHash(i * 3) * 120, cy = 50 + _slHash(i * 5) * 70;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.ellipse(cx, cy, 60, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 26, cy - 8, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
    _slParallax(v, 0.18, (l, r) => {
      // Downtown towers — the city chapter 3/4 move into
      for (let i = Math.floor(l / 70) - 1; i * 70 < r + 70; i++) {
        const h = 120 + _slHash(i) * 170, w = 44 + _slHash(i + 99) * 34;
        const x = i * 70;
        ctx.fillStyle = '#9fb0c0'; ctx.fillRect(x, G - 30 - h, w, h + 30);
        ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x, G - 30 - h, 4, h + 30);
        ctx.fillStyle = 'rgba(70,90,110,0.20)';
        for (let wy = G - 24 - h; wy < G - 40; wy += 12) ctx.fillRect(x + 6, wy, w - 12, 3);
        if (_slHash(i + 7) < 0.15) { ctx.fillStyle = '#8899aa'; ctx.fillRect(x + w / 2 - 1, G - 30 - h - 26, 2, 26); }
      }
      const hz = ctx.createLinearGradient(0, G - 170, 0, G);
      hz.addColorStop(0, 'rgba(222,226,224,0)'); hz.addColorStop(1, 'rgba(222,226,224,0.7)');
      ctx.fillStyle = hz; ctx.fillRect(l - 50, G - 170, r - l + 100, 170);
    });
    _slParallax(v, 0.42, (l, r) => {
      // Rooftops of the next street over + tree line
      for (let i = Math.floor(l / 120) - 1; i * 120 < r + 120; i++) {
        const x = i * 120 + _slHash(i * 11) * 30, w = 80 + _slHash(i * 13) * 30, h = 34 + _slHash(i * 17) * 22;
        ctx.fillStyle = '#7d8a86';
        ctx.beginPath(); ctx.moveTo(x - 8, G - 26 - h); ctx.lineTo(x + w / 2, G - 26 - h - 26); ctx.lineTo(x + w + 8, G - 26 - h); ctx.fill();
        ctx.fillStyle = '#a7aea4'; ctx.fillRect(x, G - 26 - h, w, h + 26);
        ctx.fillStyle = '#6f7f7a';
        ctx.beginPath(); ctx.arc(x + w + 20, G - 40, 26 + _slHash(i) * 10, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  function back(v) {
    // ── Kael's house ──────────────────────────────────────────────────────
    if (_slVisible(v, 40, 1180)) {
      _slTree(110, G - 16, 1.25, '#55714a');
      _slHouse(180, G - 16, 470, 196, 92, '#d8d2c2', '#f1ede4', '#5c4a44', { chimney: 360 });
      // The house sits back from the path; its yard runs down to G
      ctx.fillStyle = '#c9c1ae'; ctx.fillRect(PORCH.x + 40, G - 16, 90, 16); // front walk
      _slWindow(212, G - 190, 62, 54, '#f1ede4', false, 'rgba(180,90,70,0.55)');
      _slWindow(300, G - 190, 62, 54, '#f1ede4', true, 'rgba(180,90,70,0.55)');
      _slWindow(546, G - 190, 62, 54, '#f1ede4', false, 'rgba(180,90,70,0.55)');
      _slWindow(212, G - 104, 62, 54, '#f1ede4', false, null);
      _slWindow(546, G - 104, 62, 54, '#f1ede4', true, null);
      // Front door — left ajar, he'd only just stepped out
      ctx.fillStyle = '#f1ede4'; ctx.fillRect(PORCH.x + 54, G - 110, 62, 84);
      ctx.fillStyle = '#1e2124'; ctx.fillRect(PORCH.x + 60, G - 104, 50, 78);
      ctx.fillStyle = '#3b5566';
      ctx.beginPath(); ctx.moveTo(PORCH.x + 60, G - 104); ctx.lineTo(PORCH.x + 92, G - 98); ctx.lineTo(PORCH.x + 92, G - 30); ctx.lineTo(PORCH.x + 60, G - 26); ctx.fill();
      ctx.fillStyle = '#c9a54a'; ctx.beginPath(); ctx.arc(PORCH.x + 87, G - 68, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#efe9da'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('95', PORCH.x + 30, G - 84);
      // Porch roof + posts (collidable roof ledge)
      ctx.fillStyle = '#4f403b';
      ctx.fillRect(PORCH_ROOF.x, PORCH_ROOF.y, PORCH_ROOF.w, 10);
      ctx.fillStyle = '#f1ede4'; ctx.fillRect(PORCH_ROOF.x, PORCH_ROOF.y + 10, PORCH_ROOF.w, 4);
      ctx.fillRect(PORCH.x + 6, PORCH_ROOF.y + 14, 7, G - PORCH.h - PORCH_ROOF.y - 14);
      ctx.fillRect(PORCH.x + PORCH.w - 13, PORCH_ROOF.y + 14, 7, G - PORCH.h - PORCH_ROOF.y - 14);
      // Porch deck + steps
      ctx.fillStyle = '#9b8a76'; ctx.fillRect(PORCH.x, G - PORCH.h, PORCH.w, PORCH.h);
      ctx.fillStyle = '#b6a48e'; ctx.fillRect(PORCH.x, G - PORCH.h, PORCH.w, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let rx = PORCH.x + 14; rx < PORCH.x + PORCH.w; rx += 14) ctx.fillRect(rx, G - PORCH.h + 8, 6, PORCH.h - 8);
      ctx.fillStyle = '#b6a48e'; ctx.fillRect(PORCH.x + 50, G - 12, 70, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(PORCH.x + 50, G - 12, 70, 2);
      // Porch light (on — it's getting late)
      const pg = ctx.createRadialGradient(PORCH.x + 140, G - 92, 1, PORCH.x + 140, G - 92, 34);
      pg.addColorStop(0, 'rgba(255,220,150,0.6)'); pg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = pg; ctx.fillRect(PORCH.x + 106, G - 126, 68, 68);
      ctx.fillStyle = '#ffe7b0'; ctx.fillRect(PORCH.x + 137, G - 98, 6, 9);
      // Garage
      ctx.fillStyle = '#cfc8b8'; ctx.fillRect(650, G - 136, 230, 136);
      ctx.fillStyle = '#5c4a44';
      ctx.beginPath(); ctx.moveTo(640, G - 136); ctx.lineTo(890, G - 136); ctx.lineTo(880, G - 156); ctx.lineTo(650, G - 156); ctx.fill();
      ctx.fillStyle = '#e6e1d6'; ctx.fillRect(672, G - 112, 186, 112);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      for (let gy = G - 112 + 22; gy < G; gy += 22) { ctx.beginPath(); ctx.moveTo(672, gy); ctx.lineTo(858, gy); ctx.stroke(); }
      // Driveway
      ctx.fillStyle = '#9a958c'; ctx.fillRect(660, G - 16, 214, 16);
      // Mailbox
      ctx.fillStyle = '#5a4032'; ctx.fillRect(952, G - 46, 5, 46);
      ctx.fillStyle = '#2f4a5c'; ctx.fillRect(938, G - 62, 34, 18);
      ctx.beginPath(); ctx.arc(955, G - 62, 17, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#c03a2a'; ctx.fillRect(970, G - 74, 3, 16); ctx.fillRect(970, G - 74, 9, 6);
      ctx.fillStyle = '#efe9da'; ctx.font = 'bold 7px Arial'; ctx.fillText('95', 955, G - 51);
      // Low picket fence along the lawn's edge
      ctx.fillStyle = '#ece7dc';
      for (let fx = 990; fx < YARD_END - 10; fx += 16) {
        ctx.beginPath(); ctx.moveTo(fx, G); ctx.lineTo(fx, G - 34); ctx.lineTo(fx + 4, G - 40); ctx.lineTo(fx + 8, G - 34); ctx.lineTo(fx + 8, G); ctx.fill();
      }
      ctx.fillRect(990, G - 28, YARD_END - 1000, 4); ctx.fillRect(990, G - 14, YARD_END - 1000, 4);
      _slCar(MY_CAR.x, G, MY_CAR.w, '#4e6878');
    }
    // ── Neighbour's house + sidewalk block ────────────────────────────────
    if (_slVisible(v, 1180, ROAD_L)) {
      _slHouse(1240, G - 20, 380, 150, 74, '#b9c3c4', '#e9ecea', '#4c5258', { chimney: 60 });
      _slWindow(1280, G - 130, 56, 48, '#e9ecea', false, null);
      _slWindow(1420, G - 130, 56, 48, '#e9ecea', false, 'rgba(90,110,140,0.5)');
      _slWindow(1530, G - 130, 56, 48, '#e9ecea', true, null);
      ctx.fillStyle = '#e9ecea'; ctx.fillRect(1356, G - 108, 46, 88);
      ctx.fillStyle = '#6e3a34'; ctx.fillRect(1361, G - 103, 36, 83);
      ctx.fillStyle = '#4f6a4a';
      for (let hx = 1640; hx < 1720; hx += 26) { ctx.beginPath(); ctx.arc(hx, G - 30, 20, 0, Math.PI * 2); ctx.fill(); }
      _slTree(1960, G - 18, 1.1, '#5d7a50');
      // Corner: lamp, hydrant, bin, pedestrian signal
      _slStreetLamp(2160, G - 20, false);
      _slHydrant(2230, G - 20);
      ctx.fillStyle = '#2d5a3c'; ctx.fillRect(2276, G - 66, 30, 46);
      ctx.fillStyle = '#244a31'; ctx.fillRect(2272, G - 70, 38, 6);
    }
    // ── The intersection ──────────────────────────────────────────────────
    if (_slVisible(v, ROAD_L - 80, ROAD_R + 80)) {
      // Signal mast: pole on the near corner, arm reaching over the road
      const px = ROAD_L - 26;
      ctx.fillStyle = '#3a3f46'; ctx.fillRect(px - 4, G - 270, 8, 270);
      ctx.fillRect(px, G - 266, 520, 6);
      ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px, G - 220); ctx.lineTo(px + 120, G - 262); ctx.stroke();
      for (const hx of [px + 240, px + 470]) {
        ctx.fillStyle = '#d8ae32'; ctx.fillRect(hx - 11, G - 262, 22, 64);
        ctx.fillStyle = '#1c1e20'; ctx.fillRect(hx - 8, G - 258, 16, 56);
        // The lights stopped cycling when the air ripped: red, stuck, flickering
        const fl = (frameCount % 97) < 6 ? 0.25 : 1;
        ctx.fillStyle = `rgba(230,50,40,${fl})`; ctx.beginPath(); ctx.arc(hx, G - 248, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(hx, G - 230, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e2a1e'; ctx.beginPath(); ctx.arc(hx, G - 212, 6, 0, Math.PI * 2); ctx.fill();
      }
      // Street name blade
      ctx.fillStyle = '#2d6b45'; ctx.fillRect(px - 40, G - 292, 80, 16);
      ctx.fillStyle = '#f2f2ea'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('5TH  AVE', px, G - 280);
      ctx.fillStyle = '#2d6b45'; ctx.fillRect(px - 6, G - 312, 12, 18);
      // Pedestrian signals on both corners
      for (const [sx, face] of [[ROAD_L - 26, 1], [ROAD_R + 26, -1]]) {
        if (sx !== px) { ctx.fillStyle = '#3a3f46'; ctx.fillRect(sx - 3, G - 130, 6, 130); }
        ctx.fillStyle = '#d8ae32'; ctx.fillRect(sx + face * 4 - (face < 0 ? 22 : 0), G - 128, 22, 26);
        ctx.fillStyle = '#121314'; ctx.fillRect(sx + face * 4 - (face < 0 ? 22 : 0) + 3, G - 125, 16, 20);
        const walk = (frameCount % 140) < 90;
        const cx = sx + face * 4 + (face < 0 ? -11 : 11);
        ctx.fillStyle = walk ? '#eef4f0' : '#e2622e';
        if (walk) {
          ctx.beginPath(); ctx.arc(cx, G - 121, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(cx - 1, G - 119, 2, 7);
          ctx.fillRect(cx - 4, G - 112, 2, 5); ctx.fillRect(cx + 2, G - 112, 2, 5);
        } else ctx.fillRect(cx - 4, G - 121, 8, 10);
      }
      _slCar(CAR_A.x, G, CAR_A.w, '#7a3a34', { hazard: true, doorOpen: true });
      _slCar(TAXI.x, G, TAXI.w, '#d9b23a', { hazard: true, taxi: true });
    }
    // ── The far block: bus stop, Corner Mart, laundromat ──────────────────
    if (_slVisible(v, ROAD_R, 4700)) {
      // Bus shelter
      const S = SHELTER;
      ctx.fillStyle = 'rgba(160,190,200,0.28)'; ctx.fillRect(S.x + 8, S.y + 10, S.w - 16, G - 22 - S.y - 10);
      ctx.fillStyle = '#4a5058'; ctx.fillRect(S.x + 4, S.y, 5, G - 22 - S.y); ctx.fillRect(S.x + S.w - 9, S.y, 5, G - 22 - S.y);
      ctx.fillStyle = '#3a3f46'; ctx.fillRect(S.x - 4, S.y - 4, S.w + 8, 12);
      ctx.fillStyle = '#2f6a9a'; ctx.fillRect(S.x + 20, S.y + 22, 50, 64);
      ctx.fillStyle = '#e8eef2'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
      ctx.fillText('ROUTE 9', S.x + 45, S.y + 40); ctx.fillText('ELM ST', S.x + 45, S.y + 52);
      ctx.fillStyle = '#5b4a3c'; ctx.fillRect(S.x + 84, G - 48, 54, 6); ctx.fillRect(S.x + 88, G - 42, 4, 20); ctx.fillRect(S.x + 130, G - 42, 4, 20);
      // Storefronts
      _slShopfront(AWNING.x - 10, G - 20, AWNING.w + 20, 230, '#8c6b58', 'CORNER  MART  · 24H', '#ffd266', null, true);
      ctx.fillStyle = '#7a2e28';
      ctx.beginPath(); ctx.moveTo(AWNING.x, AWNING.y); ctx.lineTo(AWNING.x + AWNING.w, AWNING.y); ctx.lineTo(AWNING.x + AWNING.w + 8, AWNING.y + 18); ctx.lineTo(AWNING.x - 8, AWNING.y + 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(240,230,210,0.85)';
      for (let s = AWNING.x; s < AWNING.x + AWNING.w; s += 26) ctx.fillRect(s, AWNING.y, 12, 18);
      ctx.fillStyle = '#5a1e1a'; ctx.fillRect(AWNING.x - 8, AWNING.y + 18, AWNING.w + 16, 3);
      _slShopfront(4380, G - 20, 230, 200, '#6f7880', 'SUDS  LAUNDRY', '#9fe6ff', '#3c6a7a', false);
      // Newspaper box + bike rack
      ctx.fillStyle = '#2f5b8a'; ctx.fillRect(3920, G - 58, 26, 38);
      ctx.fillStyle = '#d6dde2'; ctx.fillRect(3924, G - 52, 18, 10);
      ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 3;
      for (let bx = 4640 - 290; bx < 4640 - 230; bx += 18) { ctx.beginPath(); ctx.arc(bx, G - 30, 9, Math.PI, 0); ctx.stroke(); }
      _slStreetLamp(3700, G - 20, false);
    }
    // ── Construction lot, apartments, the alley ───────────────────────────
    if (_slVisible(v, 4600, 6000)) {
      // Plywood hoarding behind the dig
      ctx.fillStyle = '#b08a5a'; ctx.fillRect(4610, G - 120, 170, 100);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      for (let hx = 4610; hx < 4780; hx += 34) { ctx.beginPath(); ctx.moveTo(hx, G - 120); ctx.lineTo(hx, G - 20); ctx.stroke(); }
      ctx.fillStyle = '#efe9da'; ctx.fillRect(4640, G - 102, 110, 30);
      ctx.fillStyle = '#9c2a22'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText('DANGER', 4695, G - 90); ctx.fillStyle = '#2b2b2b'; ctx.font = '8px Arial'; ctx.fillText('KEEP OUT · DEEP EXCAVATION', 4695, G - 78);
      // Scaffold tower (two collidable decks)
      const SC = SCAFFOLD;
      ctx.strokeStyle = '#7a828a'; ctx.lineWidth = 3;
      for (const sx of [SC.x + 4, SC.x + SC.w - 4]) { ctx.beginPath(); ctx.moveTo(sx, G); ctx.lineTo(sx, G - 206); ctx.stroke(); }
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(SC.x + 4, G); ctx.lineTo(SC.x + SC.w - 4, G - 96); ctx.lineTo(SC.x + 4, G - 186); ctx.stroke();
      for (const dy of [96, 186]) {
        ctx.fillStyle = '#9a7a4a'; ctx.fillRect(SC.x, G - dy, SC.w, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(SC.x, G - dy + 8, SC.w, 2);
        ctx.strokeStyle = '#7a828a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(SC.x, G - dy - 26); ctx.lineTo(SC.x + SC.w, G - dy - 26); ctx.stroke();
      }
      // Apartment block with fire escape
      ctx.fillStyle = '#7c4e3e'; ctx.fillRect(4930, G - 380, 400, 380);
      ctx.strokeStyle = 'rgba(0,0,0,0.10)';
      for (let by = G - 380 + 8; by < G; by += 8) { ctx.beginPath(); ctx.moveTo(4930, by); ctx.lineTo(5330, by); ctx.stroke(); }
      ctx.fillStyle = '#5a382c'; ctx.fillRect(4924, G - 386, 412, 10);
      for (let fl = 0; fl < 4; fl++) for (let wx = 4952; wx < 5310; wx += 64) {
        if (wx > FIRE_ESC.x - 40 && wx < FIRE_ESC.x + FIRE_ESC.w) continue;
        _slWindow(wx, G - 360 + fl * 92, 36, 50, '#d6cfc0', _slHash(wx * 7 + fl) < 0.35, null);
      }
      const FE = FIRE_ESC;
      for (const dy of [128, 226, 324]) {
        _slWindow(FE.x + 30, G - dy - 70, 40, 56, '#d6cfc0', dy === 226, null);
        ctx.fillStyle = '#2a2d31'; ctx.fillRect(FE.x, G - dy, FE.w, 6);
        ctx.strokeStyle = '#2a2d31'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(FE.x, G - dy - 28); ctx.lineTo(FE.x + FE.w, G - dy - 28); ctx.stroke();
        for (let rx = FE.x; rx <= FE.x + FE.w; rx += 11) { ctx.beginPath(); ctx.moveTo(rx, G - dy); ctx.lineTo(rx, G - dy - 28); ctx.stroke(); }
      }
      ctx.strokeStyle = '#2a2d31'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(FE.x + 10, G - 128); ctx.lineTo(FE.x + FE.w - 10, G - 226); ctx.moveTo(FE.x + FE.w - 10, G - 226); ctx.lineTo(FE.x + 10, G - 324); ctx.stroke();
      ctx.fillStyle = '#2b2522'; ctx.fillRect(5180, G - 104, 54, 84);
      ctx.fillStyle = '#d6cfc0'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('1140', 5207, G - 110);
      // The alley mouth: a gap between brick walls, darker the deeper it goes
      ctx.fillStyle = '#5e3a30'; ctx.fillRect(5330, G - 330, 200, 330);
      ctx.fillStyle = '#4a2e26'; ctx.fillRect(ALLEY_X + 260, G - 360, 240, 360);
      const ag = ctx.createLinearGradient(ALLEY_X - 30, 0, ALLEY_X + 260, 0);
      ag.addColorStop(0, '#2a2624'); ag.addColorStop(1, '#0e0d10');
      ctx.fillStyle = ag; ctx.fillRect(ALLEY_X - 30, G - 330, 290, 330);
      ctx.strokeStyle = 'rgba(30,30,34,0.9)'; ctx.lineWidth = 1.5;
      for (let wy = G - 300; wy < G - 120; wy += 30) { ctx.beginPath(); ctx.moveTo(ALLEY_X - 30, wy); ctx.quadraticCurveTo(ALLEY_X + 115, wy + 18, ALLEY_X + 260, wy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,190,120,0.18)'; ctx.fillRect(ALLEY_X + 150, G - 200, 18, 26);
      // Dumpster (collidable)
      const D = DUMPSTER;
      ctx.fillStyle = '#2e5a46'; ctx.fillRect(D.x, G - D.h, D.w, D.h);
      ctx.fillStyle = '#244a39'; ctx.fillRect(D.x - 4, G - D.h - 6, D.w + 8, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(D.x + 6, G - D.h + 10, D.w - 12, 3);
      ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.arc(D.x + 12, G - 3, 4, 0, Math.PI * 2); ctx.arc(D.x + D.w - 12, G - 3, 4, 0, Math.PI * 2); ctx.fill();
      _slStreetLamp(5370, G - 20, true);
    }
    // ── The tear ──────────────────────────────────────────────────────────
    if (_slVisible(v, TEAR_X - 260, TEAR_X + 260)) _drawTear(TEAR_X, G - 200);
  }

  // A vertical rip in the air above the crosswalk — purple and white, "like
  // cracks in porcelain". Points are fixed; only the glow breathes.
  const _TEAR_PTS = [[0, -118], [10, -92], [-6, -70], [14, -40], [-10, -6], [12, 28], [-4, 60], [8, 92], [0, 122]];
  function _drawTear(cx, cy) {
    const t = frameCount * 0.05;
    const breathe = 0.75 + 0.25 * Math.sin(t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 190);
    halo.addColorStop(0, `rgba(190,140,255,${0.35 * breathe})`);
    halo.addColorStop(0.4, `rgba(140,90,230,${0.12 * breathe})`);
    halo.addColorStop(1, 'rgba(120,80,220,0)');
    ctx.fillStyle = halo; ctx.fillRect(cx - 200, cy - 200, 400, 400);
    // Light spill on the asphalt below
    const sp = ctx.createRadialGradient(cx, G - 6, 4, cx, G - 6, 160);
    sp.addColorStop(0, `rgba(190,150,255,${0.22 * breathe})`); sp.addColorStop(1, 'rgba(190,150,255,0)');
    ctx.fillStyle = sp; ctx.fillRect(cx - 170, G - 60, 340, 80);
    ctx.restore();
    // Opening
    ctx.beginPath();
    _TEAR_PTS.forEach(([dx, dy], i) => { const w = 16 * Math.sin(Math.PI * i / (_TEAR_PTS.length - 1)); if (i === 0) ctx.moveTo(cx + dx, cy + dy); else ctx.lineTo(cx + dx - w, cy + dy); });
    for (let i = _TEAR_PTS.length - 1; i >= 0; i--) { const [dx, dy] = _TEAR_PTS[i]; const w = 16 * Math.sin(Math.PI * i / (_TEAR_PTS.length - 1)); ctx.lineTo(cx + dx + w, cy + dy); }
    ctx.closePath();
    const ig = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    ig.addColorStop(0, '#2a1048'); ig.addColorStop(0.5, '#08040f'); ig.addColorStop(1, '#2a1048');
    ctx.fillStyle = ig; ctx.fill();
    ctx.save();
    ctx.shadowColor = '#c9a2ff'; ctx.shadowBlur = 18 * breathe;
    ctx.strokeStyle = '#f4ecff'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.restore();
    // Hairline cracks running out of it
    ctx.strokeStyle = `rgba(225,205,255,${0.55 * breathe})`; ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) {
      const [dx, dy] = _TEAR_PTS[1 + (k % 7)];
      const dir = k % 2 ? 1 : -1, len = 30 + _slHash(k) * 50;
      ctx.beginPath(); ctx.moveTo(cx + dx, cy + dy);
      ctx.lineTo(cx + dx + dir * len * 0.5, cy + dy - 8 + _slHash(k + 4) * 16);
      ctx.lineTo(cx + dx + dir * len, cy + dy - 14 + _slHash(k + 9) * 28);
      ctx.stroke();
    }
    // Shards of sky drifting off the edges
    for (let k = 0; k < 7; k++) {
      const a = t * 0.6 + k * 0.9;
      const r = 34 + (k * 13) % 40;
      const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a * 1.3) * 90;
      ctx.fillStyle = k % 2 ? 'rgba(244,236,255,0.75)' : 'rgba(170,130,255,0.7)';
      ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 4, sy); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 3, sy); ctx.fill();
    }
  }

  // Floor surface: the slab's top face, drawn in shallow perspective so the
  // fighters stand IN the street rather than on a strip below it.
  function surface(v, a, ph) {
    const front = ph === 'front';
    // The far half of the pavement runs on behind a hole; only the lip and the
    // slab face are cut by it.
    const holes = front ? (a.undergroundRects || []).filter(r => r.kind === 'shaft').map(r => [r.x, r.x + r.w]) : [];
    const y0 = front ? G : G - 40, y1 = front ? SLAB_B : G;
    const band = (x0, x1, fn) => {
      x0 = Math.max(x0, v.x - 20); x1 = Math.min(x1, v.x + v.w + 20);
      if (x1 <= x0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0);
      for (const [h0, h1] of holes) if (h1 > x0 && h0 < x1) ctx.rect(Math.max(h0, x0), y0, Math.min(h1, x1) - Math.max(h0, x0), y1 - y0);
      ctx.clip('evenodd');
      fn(x0, x1);
      ctx.restore();
    };
    // Slab cross-section under every surface: topsoil over packed clay with
    // stones, so the floor reads as ground rather than a green block.
    if (front) band(-200, 6200, (x0, x1) => {
      const sg = ctx.createLinearGradient(0, G + 8, 0, SLAB_B);
      sg.addColorStop(0, '#5a4a3a'); sg.addColorStop(0.35, '#4a3d31'); sg.addColorStop(1, '#2e2620');
      ctx.fillStyle = sg; ctx.fillRect(x0, G + 8, x1 - x0, SLAB_B - G - 8);
      ctx.fillStyle = 'rgba(20,16,12,0.35)';
      for (let k = Math.floor(x0 / 37); k * 37 < x1; k++) {
        const sx = k * 37 + _slHash(k) * 30, sy = G + 22 + _slHash(k + 77) * 56, r = 2 + _slHash(k + 13) * 4;
        ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0, SLAB_B - 4, x1 - x0, 4);
    });
    // Lawn edge: turf over the soil
    if (front) band(-200, YARD_END, (x0, x1) => {
      ctx.fillStyle = '#5b7a3e'; ctx.fillRect(x0, G, x1 - x0, 12);
      ctx.fillStyle = '#486332'; ctx.fillRect(x0, G + 10, x1 - x0, 4);
      ctx.strokeStyle = 'rgba(40,62,26,0.6)'; ctx.lineWidth = 1;
      for (let gx = Math.ceil(x0 / 7) * 7; gx < x1; gx += 7) { ctx.beginPath(); ctx.moveTo(gx, G + 12); ctx.lineTo(gx + 2, G + 17 + _slHash(gx) * 4); ctx.stroke(); }
    });
    if (!front) band(-200, YARD_END, (x0, x1) => {
      ctx.fillStyle = '#6a8a48'; ctx.fillRect(x0, G - 16, x1 - x0, 16);
      ctx.fillStyle = 'rgba(255,255,220,0.08)'; ctx.fillRect(x0, G - 16, x1 - x0, 3);
    });
    // Sidewalks (both sides of the road)
    const sidewalk = (x0, x1) => {
      ctx.fillStyle = '#b4b0a6'; ctx.fillRect(x0, G - 18, x1 - x0, 18);
      ctx.fillStyle = '#c9c5bb'; ctx.fillRect(x0, G - 2, x1 - x0, 2);
      ctx.fillStyle = '#9c988e'; ctx.fillRect(x0, G, x1 - x0, 10);
      ctx.strokeStyle = 'rgba(60,56,50,0.35)'; ctx.lineWidth = 1;
      for (let jx = Math.ceil(x0 / 48) * 48; jx < x1; jx += 48) {
        ctx.beginPath(); ctx.moveTo(jx, G - 18); ctx.lineTo(jx - 6, G); ctx.lineTo(jx - 6, G + 10); ctx.stroke();
      }
    };
    band(YARD_END, ROAD_L, sidewalk);
    band(ROAD_R, ALLEY_X - 30, sidewalk);
    // Front walk + driveway cross the lawn
    band(PORCH.x + 40, PORCH.x + 130, (x0, x1) => { ctx.fillStyle = '#c9c1ae'; ctx.fillRect(x0, G - 16, x1 - x0, 16); ctx.fillStyle = '#a8a08e'; ctx.fillRect(x0, G, x1 - x0, 8); });
    band(660, 874, (x0, x1) => { ctx.fillStyle = '#9a958c'; ctx.fillRect(x0, G - 16, x1 - x0, 16); ctx.fillStyle = '#85807a'; ctx.fillRect(x0, G, x1 - x0, 8); });
    band(874, YARD_END, (x0, x1) => { ctx.fillStyle = '#b4b0a6'; ctx.fillRect(x0, G - 10, x1 - x0, 10); ctx.fillStyle = '#9c988e'; ctx.fillRect(x0, G, x1 - x0, 6); });
    // Alley floor: cracked concrete running into the dark
    band(ALLEY_X - 30, 6100, (x0, x1) => {
      ctx.fillStyle = '#56524c'; ctx.fillRect(x0, G - 18, x1 - x0, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(ALLEY_X + 60, G - 18, x1 - ALLEY_X, 30);
    });
    // Road
    band(ROAD_L, ROAD_R, (x0, x1) => {
      const ag = ctx.createLinearGradient(0, G - 26, 0, G + 18);
      ag.addColorStop(0, '#4a4c50'); ag.addColorStop(1, '#2f3134');
      ctx.fillStyle = ag; ctx.fillRect(x0, G - 26, x1 - x0, 44);
      // Lane lines: far edge, double yellow centre (behind the feet), near edge
      ctx.fillStyle = 'rgba(230,230,220,0.55)'; ctx.fillRect(x0, G - 24, x1 - x0, 1.5);
      ctx.fillStyle = '#c9a43a'; ctx.fillRect(x0, G - 9, x1 - x0, 1.6); ctx.fillRect(x0, G - 6, x1 - x0, 1.6);
      ctx.fillStyle = 'rgba(230,230,220,0.6)';
      for (let dx = Math.ceil(x0 / 60) * 60; dx < x1; dx += 60) ctx.fillRect(dx, G + 9, 30, 2);
      // Crosswalk stripes, skewed for the road's perspective
      ctx.fillStyle = 'rgba(236,234,226,0.9)';
      for (let sx = XWALK_L; sx < XWALK_R; sx += 34) {
        ctx.beginPath(); ctx.moveTo(sx + 10, G - 24); ctx.lineTo(sx + 28, G - 24); ctx.lineTo(sx + 20, G + 16); ctx.lineTo(sx, G + 16); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = 'rgba(236,234,226,0.9)'; ctx.fillRect(XWALK_L - 30, G - 24, 6, 40); ctx.fillRect(XWALK_R + 24, G - 24, 6, 40);
      // Tire marks where the sedan stopped hard
      ctx.fillStyle = 'rgba(15,15,15,0.35)'; ctx.fillRect(CAR_A.x - 120, G - 2, 140, 2.5); ctx.fillRect(CAR_A.x - 110, G + 6, 130, 2.5);
      // Glass from the taxi's shattered mirror + a dropped grocery bag
      ctx.fillStyle = 'rgba(220,235,245,0.8)';
      for (let k = 0; k < 12; k++) ctx.fillRect(TAXI.x - 40 + _slHash(k) * 60, G - 4 + _slHash(k + 30) * 10, 2, 2);
      ctx.fillStyle = '#c9b48a'; ctx.fillRect(2780, G - 14, 14, 16);
      ctx.fillStyle = '#d8462a'; ctx.beginPath(); ctx.arc(2802, G - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8d06a'; ctx.beginPath(); ctx.arc(2812, G + 2, 3.5, 0, Math.PI * 2); ctx.fill();
    });
    // Curbs: the step down off each sidewalk
    for (const cx of [ROAD_L, ROAD_R]) band(cx - 4, cx + 4, (x0, x1) => { ctx.fillStyle = '#d6d2c8'; ctx.fillRect(x0, G - 20, x1 - x0, 32); });
    // Hazards around the two openings in the ground
    const shafts = (a.undergroundRects || []).filter(r => r.kind === 'shaft').map(r => [r.x, r.x + r.w]);
    if (!front) for (const [h0, h1] of shafts) {
      if (!_slVisible(v, h0 - 60, h1 + 60)) continue;
      if (h0 < ROAD_L) {
        // Sidewalk cave-in — the first fracture tremor split the pavement
        _slCone(h0 - 22, G - 4); _slCone(h1 + 24, G - 4);
        ctx.fillStyle = '#8a867c';
        ctx.beginPath(); ctx.moveTo(h0 - 4, G); ctx.lineTo(h0 + 10, G + 10); ctx.lineTo(h0 - 4, G + 18); ctx.fill();
        ctx.beginPath(); ctx.moveTo(h1 + 4, G); ctx.lineTo(h1 - 8, G + 12); ctx.lineTo(h1 + 4, G + 22); ctx.fill();
      } else {
        _slBarricade(h0 - 70, G - 2, 56, 'DIG SITE');
        _slCone(h1 + 20, G - 4);
      }
    }
  }

  STORY_LEVELS[0] = {
    sky: ['#79a7cc', '#e4d6bc'],
    groundColor: '#3a3029',
    platColor: '#4a4038',
    layout, backdrop, back, surface,
  };
})();
