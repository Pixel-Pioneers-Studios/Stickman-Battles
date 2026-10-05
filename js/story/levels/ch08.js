'use strict';
// js/story/levels/ch08.js — Chapter 8 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 8 — Cache Discovery (walk → duel)
// "Under a collapsed overpass: a door. Reinforced. Sealed with a fracture-lock.
// The fragment in you resonated with it — and the door opened. Inside: a cache."
// The run goes under (or over — a collapsed deck slab is a ramp up) the dead
// elevated highway, through the fracture-locked door into the cache vault where
// the guardian waits, out the back through a maintenance tunnel, and up into
// a storm channel where daylight comes in at the far end.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const DECK   = { x0: -200, x1: 1480, y: G - 262, h: 34 };   // overpass deck; its top is walkable
  const SLAB   = [[1040, G - 72, 80], [1110, G - 140, 80], [1180, G - 208, 80]];   // fallen deck section → ramp
  const CART   = { x: 520, w: 60 };
  const DOOR   = 2560;
  const VAULT  = { x0: 2580, x1: 3480 };
  const RACKS  = [[2700, G - 110, 120], [3180, G - 110, 140]];
  const CATWALK = { x: 2860, w: 280, y: G - 196 };
  const TUNNEL = { x0: 3480, x1: 4900 };
  const PIPE   = { x: 3480, w: 1420, y: G - 150 };   // pipe run along the whole tunnel
  const CHANNEL = 4900;

  function layout() {
    const P = [];
    _slLedge(P, DECK.x0, DECK.y, DECK.x1 - DECK.x0);
    for (const [x, y, w] of SLAB) _slLedge(P, x, y, w);
    _slLedge(P, CART.x, G - 40, CART.w);
    _slLedge(P, 1900, G - 56, 90);                  // concrete jersey block by the drain
    for (const [x, y, w] of RACKS) _slLedge(P, x, y, w);
    _slLedge(P, CATWALK.x, CATWALK.y, CATWALK.w);
    _slLedge(P, PIPE.x, PIPE.y, PIPE.w);
    _slLedge(P, 4300, G - 70, 80);                  // junction box
    _slLedge(P, 5300, G - 120, 160);                // outfall ledge
    _slLedge(P, 5500, G - 220, 120);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#0c0c14');
    _slParallax(v, 0.12, (l, r) => {
      const g = ctx.createLinearGradient(0, G - 360, 0, G);
      g.addColorStop(0, 'rgba(90,70,110,0)'); g.addColorStop(1, 'rgba(160,110,110,0.30)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, G - 360, r - l + 40, 360);
      for (let i = Math.floor(l / 70) - 1; i * 70 < r + 70; i++) {
        const h = 110 + _slHash(i) * 200, w = 44 + _slHash(i + 4) * 22, x = i * 70;
        ctx.fillStyle = '#16141e'; ctx.fillRect(x, G - h, w, h);
        ctx.fillStyle = 'rgba(255,200,140,0.35)';
        for (let wy = G - h + 8; wy < G - 20; wy += 13) for (let wx = x + 5; wx < x + w - 5; wx += 9)
          if (_slHash(wx * 3 + wy + i) < 0.06) ctx.fillRect(wx, wy, 3, 5);
      }
    });
  }

  // Concrete with formwork lines and water staining
  function _concrete(x, y, w, h, base) {
    ctx.fillStyle = base || '#5a5a5c'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let jx = Math.ceil(x / 120) * 120; jx < x + w; jx += 120) { ctx.beginPath(); ctx.moveTo(jx, y); ctx.lineTo(jx, y + h); ctx.stroke(); }
    for (let k = Math.floor(x / 90); k * 90 < x + w; k++) {
      if (_slHash(k + 3) < 0.5) continue;
      const sx = k * 90 + _slHash(k) * 40;
      const sg = ctx.createLinearGradient(0, y, 0, y + h * 0.7);
      sg.addColorStop(0, 'rgba(30,26,20,0.35)'); sg.addColorStop(1, 'rgba(30,26,20,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx, y, 10 + _slHash(k + 1) * 14, h * 0.7);
    }
  }

  function back(v) {
    // ── Under the overpass
    if (_slVisible(v, -200, 2580)) {
      // Retaining wall behind, graffiti, a camp under the deck
      _concrete(-200, G - 230, 2780, 230, '#4a4a4e');
      ctx.save(); ctx.globalAlpha = 0.5; ctx.font = 'italic bold 26px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = '#d84a6a'; ctx.fillText('WHO OPENED THE SKY', 420, G - 140);
      ctx.fillStyle = '#4ad8c8'; ctx.fillText('V WAS HERE', 1760, G - 160);
      ctx.restore();
      // Tents and a burn barrel
      for (const [tx, col] of [[160, '#3a5a7a'], [280, '#7a5a3a']]) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(tx - 50, G); ctx.lineTo(tx, G - 56); ctx.lineTo(tx + 50, G); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.moveTo(tx - 10, G); ctx.lineTo(tx, G - 30); ctx.lineTo(tx + 10, G); ctx.fill();
      }
      ctx.fillStyle = '#4a3a30'; ctx.fillRect(390, G - 40, 30, 40);
      ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2; for (let by = G - 34; by < G; by += 10) { ctx.beginPath(); ctx.moveTo(390, by); ctx.lineTo(420, by); ctx.stroke(); }
      _slFire(392, G - 40, 26, 0.8); _slSmoke(405, G - 60, 160, true, 1);
      // Shopping cart (standable)
      ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 2;
      ctx.strokeRect(CART.x, G - 40, CART.w, 26);
      for (let cx = CART.x + 8; cx < CART.x + CART.w; cx += 8) { ctx.beginPath(); ctx.moveTo(cx, G - 40); ctx.lineTo(cx, G - 14); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(CART.x + CART.w, G - 40); ctx.lineTo(CART.x + CART.w + 14, G - 52); ctx.stroke();
      ctx.fillStyle = '#16181a'; for (const wx of [CART.x + 6, CART.x + CART.w - 6]) { ctx.beginPath(); ctx.arc(wx, G - 5, 5, 0, Math.PI * 2); ctx.fill(); }
      // Overpass deck + piers
      _concrete(DECK.x0, DECK.y, DECK.x1 - DECK.x0, DECK.h, '#6a6a6c');
      ctx.fillStyle = '#7a7a7c'; ctx.fillRect(DECK.x0, DECK.y - 22, DECK.x1 - DECK.x0, 22);
      ctx.fillStyle = '#5a5a5c'; for (let px = DECK.x0 + 20; px < DECK.x1; px += 40) ctx.fillRect(px, DECK.y - 22, 6, 22);
      for (const px of [100, 560, 900]) _concrete(px, DECK.y + DECK.h, 60, G - DECK.y - DECK.h, '#5e5e60');
      // Torn end of the deck with rebar
      ctx.strokeStyle = '#6a4a3a'; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(DECK.x1, DECK.y + 4 + k * 5); ctx.lineTo(DECK.x1 + 20 + _slHash(k) * 20, DECK.y + 10 + k * 8); ctx.stroke(); }
      // The fallen deck section, leaning from the street up to the deck
      ctx.save(); ctx.translate(1020, G); ctx.rotate(-0.78);
      _concrete(0, -20, 330, 34, '#6a6a6c'); ctx.restore();
      // Hanging lights strung under the deck
      for (let k = 0; k < 8; k++) {
        const lx = 80 + k * 170;
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lx, DECK.y + DECK.h); ctx.lineTo(lx, DECK.y + DECK.h + 20); ctx.stroke();
        _slWallLamp(lx, DECK.y + DECK.h + 26, G, true);
      }
      // Approach to the door: blast-scored wall, the door itself
      _concrete(2300, G - 300, 300, 300, '#3e3e44');
      ctx.fillStyle = '#1a1c20'; ctx.fillRect(DOOR - 40, G - 150, 80, 150);
      ctx.fillStyle = '#5a6068'; ctx.fillRect(DOOR - 48, G - 158, 96, 8); ctx.fillRect(DOOR - 48, G - 158, 8, 158); ctx.fillRect(DOOR + 40, G - 158, 8, 158);
      // Door leaf swung inward; the lock ring still glowing
      ctx.fillStyle = '#4a5058';
      ctx.beginPath(); ctx.moveTo(DOOR + 40, G - 150); ctx.lineTo(DOOR + 80, G - 140); ctx.lineTo(DOOR + 80, G - 10); ctx.lineTo(DOOR + 40, G); ctx.fill();
      ctx.save(); ctx.shadowColor = '#c9a2ff'; ctx.shadowBlur = 14 + 4 * Math.sin(frameCount * 0.08);
      ctx.strokeStyle = '#d8c0ff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(DOOR + 60, G - 76, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(DOOR + 60, G - 88); ctx.lineTo(DOOR + 60, G - 64); ctx.moveTo(DOOR + 48, G - 76); ctx.lineTo(DOOR + 72, G - 76); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#d8d0c0'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText('FRAGMENT-GATED', DOOR, G - 166);
      _slStreetLamp(1600, G, false);
      ctx.fillStyle = '#8a8478'; ctx.fillRect(1900, G - 56, 90, 56);
      ctx.fillStyle = '#c8442a'; ctx.fillRect(1910, G - 40, 70, 5);
    }
    // ── The cache vault
    if (_slVisible(v, VAULT.x0, VAULT.x1)) {
      const V = VAULT;
      ctx.fillStyle = '#2a2e34'; ctx.fillRect(V.x0, G - 360, V.x1 - V.x0, 360);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      for (let px = V.x0; px < V.x1; px += 60) { ctx.beginPath(); ctx.moveTo(px, G - 360); ctx.lineTo(px, G); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let px = V.x0; px < V.x1; px += 60) ctx.fillRect(px + 2, G - 360, 2, 360);
      ctx.fillStyle = '#1e2126'; ctx.fillRect(V.x0, G - 380, V.x1 - V.x0, 24);
      // Ceiling strip lights
      for (let lx = V.x0 + 60; lx < V.x1; lx += 160) {
        ctx.fillStyle = '#e8f2f4'; ctx.fillRect(lx, G - 356, 70, 4);
        const lg = ctx.createLinearGradient(0, G - 352, 0, G);
        lg.addColorStop(0, 'rgba(200,230,240,0.18)'); lg.addColorStop(1, 'rgba(200,230,240,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(lx, G - 352); ctx.lineTo(lx + 70, G - 352); ctx.lineTo(lx + 120, G); ctx.lineTo(lx - 50, G); ctx.fill();
      }
      // Equipment racks (tops are standable)
      for (const [rx, ry, rw] of RACKS) {
        ctx.fillStyle = '#3a3e44'; ctx.fillRect(rx, ry, rw, G - ry);
        for (let sy = ry + 8; sy < G - 10; sy += 34) {
          ctx.fillStyle = '#1e2126'; ctx.fillRect(rx + 4, sy, rw - 8, 28);
          for (let k = 0; k < 4; k++) {
            const bx = rx + 10 + k * (rw - 20) / 4;
            ctx.fillStyle = ['#5a6a4a', '#6a5a3a', '#4a5a6a', '#6a4a4a'][(k + sy) % 4]; ctx.fillRect(bx, sy + 8, (rw - 30) / 4, 20);
          }
        }
        ctx.fillStyle = '#4a4e54'; ctx.fillRect(rx - 4, ry - 4, rw + 8, 6);
      }
      // Weapon wall: silhouettes on pegboard
      ctx.fillStyle = '#34383e'; ctx.fillRect(2870, G - 330, 260, 110);
      ctx.fillStyle = '#9aa2aa';
      for (let k = 0; k < 6; k++) {
        const wx = 2895 + k * 42;
        ctx.save(); ctx.translate(wx, G - 275); ctx.rotate(0.15 * (k % 2 ? 1 : -1));
        ctx.fillRect(-2, -42, 4, 70); ctx.fillRect(-10, 16, 20, 4);
        if (k % 3 === 1) { ctx.beginPath(); ctx.moveTo(-2, -42); ctx.lineTo(8, -56); ctx.lineTo(2, -42); ctx.fill(); }
        ctx.restore();
      }
      // Catwalk over the floor
      ctx.fillStyle = '#4a4e54'; ctx.fillRect(CATWALK.x, CATWALK.y, CATWALK.w, 8);
      ctx.strokeStyle = '#4a4e54'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(CATWALK.x, CATWALK.y - 24); ctx.lineTo(CATWALK.x + CATWALK.w, CATWALK.y - 24); ctx.stroke();
      for (let rx = CATWALK.x; rx <= CATWALK.x + CATWALK.w; rx += 14) { ctx.beginPath(); ctx.moveTo(rx, CATWALK.y); ctx.lineTo(rx, CATWALK.y - 24); ctx.stroke(); }
      ctx.strokeStyle = '#2a2e34'; ctx.lineWidth = 1;
      for (const hx of [CATWALK.x + 20, CATWALK.x + CATWALK.w - 20]) { ctx.beginPath(); ctx.moveTo(hx, CATWALK.y); ctx.lineTo(hx, G - 380); ctx.stroke(); }
      // Terminals with Veran's data scrolling
      for (const tx of [2620, 3420]) {
        ctx.fillStyle = '#1a1c20'; ctx.fillRect(tx - 24, G - 80, 48, 80);
        ctx.fillStyle = '#0c2a24'; ctx.fillRect(tx - 18, G - 74, 36, 26);
        ctx.fillStyle = '#5affc8';
        for (let k = 0; k < 4; k++) ctx.fillRect(tx - 15, G - 70 + k * 6, 6 + ((frameCount >> 2) * 7 + k * 11 + tx) % 24, 2);
      }
      for (const [cx, s] of [[2640, 40], [3300, 46], [3340, 34]]) _slCrate(cx, G - s, s, '#4a5048');
    }
    // ── Maintenance tunnel
    if (_slVisible(v, TUNNEL.x0, TUNNEL.x1)) {
      const T = TUNNEL;
      _concrete(T.x0, G - 260, T.x1 - T.x0, 260, '#3a3c40');
      ctx.fillStyle = '#26282c'; ctx.fillRect(T.x0, G - 280, T.x1 - T.x0, 24);
      // Pipe run (standable) and cable trays
      ctx.fillStyle = '#6a5a3a'; ctx.fillRect(T.x0, PIPE.y, T.x1 - T.x0, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(T.x0, PIPE.y + 2, T.x1 - T.x0, 2);
      ctx.fillStyle = '#4a5a6a'; ctx.fillRect(T.x0, G - 230, T.x1 - T.x0, 10);
      for (let bx = T.x0 + 40; bx < T.x1; bx += 120) { ctx.fillStyle = '#2a2c30'; ctx.fillRect(bx, PIPE.y - 4, 6, 24); }
      // Caged bulkhead lights, every few metres
      for (let lx = T.x0 + 80; lx < T.x1; lx += 220) _slWallLamp(lx, G - 200, G, (lx / 220 | 0) % 2 === 0);
      ctx.fillStyle = '#d0a020'; ctx.fillRect(4300, G - 70, 80, 70);
      ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('⚡ 11kV', 4340, G - 40);
    }
    // ── Storm channel and the way out
    if (_slVisible(v, CHANNEL - 40, 6200)) {
      _concrete(CHANNEL, G - 380, 1300, 380, '#4e5054');
      ctx.fillStyle = '#26282c'; ctx.fillRect(CHANNEL, G - 400, 260, 24);
      const mg = ctx.createLinearGradient(0, G - 110, 0, G);
      mg.addColorStop(0, 'rgba(60,90,50,0)'); mg.addColorStop(1, 'rgba(60,90,50,0.45)');
      ctx.fillStyle = mg; ctx.fillRect(CHANNEL, G - 110, 1300, 110);
      ctx.fillStyle = 'rgba(30,40,30,0.5)'; for (let k = 0; k < 30; k++) ctx.fillRect(CHANNEL + _slHash(k + 50) * 1300, G - 380 + _slHash(k + 90) * 260, 3, 20 + _slHash(k) * 50);
      // Daylight from the open end of the channel
      const dg = ctx.createLinearGradient(5300, 0, 6000, 0);
      dg.addColorStop(0, 'rgba(255,240,210,0)'); dg.addColorStop(1, 'rgba(255,240,210,0.45)');
      ctx.fillStyle = dg; ctx.fillRect(5300, G - 380, 700, 380);
      ctx.fillStyle = '#7a7a7c'; ctx.fillRect(5300, G - 120, 160, 10); ctx.fillRect(5500, G - 220, 120, 10);
      ctx.strokeStyle = '#3a3c40'; ctx.lineWidth = 2;
      for (const [lx, y0] of [[5320, G - 120], [5520, G - 220]]) for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(lx + k * 14, y0); ctx.lineTo(lx + k * 14, G); ctx.stroke(); }
      // Outfall pipe mouth trickling
      ctx.fillStyle = '#1a1c20'; ctx.beginPath(); ctx.arc(5100, G - 120, 50, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a6a6c'; ctx.lineWidth = 6; ctx.stroke();
      for (let k = 0; k < 10; k++) { const t = (frameCount * 1.5 + k * 13) % 120; ctx.fillStyle = `rgba(160,190,210,${0.5 * (1 - t / 120)})`; ctx.fillRect(5100 + t * 0.3, G - 74 + t * 0.6, 3, 4); }
    }
  }

  const ZONES = [
    { x0: -200, x1: VAULT.x0, kind: 'alley', face: 'concrete' },
    { x0: VAULT.x0, x1: VAULT.x1, kind: 'tile', face: 'concrete' },
    { x0: VAULT.x1, x1: 6200, kind: 'tunnel', face: 'concrete' },
  ];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph === 'front') return;
    // Run-off down the middle of the storm channel
    if (_slVisible(v, CHANNEL, 6200)) {
      const x0 = Math.max(CHANNEL, v.x - 20), x1 = Math.min(6200, v.x + v.w + 20);
      ctx.fillStyle = 'rgba(90,120,140,0.55)'; ctx.fillRect(x0, G - 12, x1 - x0, 8);
      ctx.fillStyle = 'rgba(220,235,245,0.35)';
      for (let k = Math.floor(x0 / 40); k * 40 < x1; k++) ctx.fillRect(k * 40 + ((frameCount * 1.2) % 40), G - 10 + (k % 2) * 3, 12, 1.5);
    }
    for (const r of (a.undergroundRects || []).filter(q => q.kind === 'shaft')) {
      if (!_slVisible(v, r.x - 30, r.x + r.w + 30)) continue;
      // Lifted storm-drain grate leaning against the opening
      ctx.save(); ctx.translate(r.x + r.w + 4, G); ctx.rotate(-1.2);
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(0, -4, r.w * 0.8, 8);
      ctx.fillStyle = '#4a4e54'; for (let k = 4; k < r.w * 0.8; k += 8) ctx.fillRect(k, -4, 3, 8);
      ctx.restore();
    }
  }

  STORY_LEVELS[8] = {
    sky: ['#0c0c14', '#2a2028'],
    groundColor: '#26262a',
    platColor: '#3a3a3e',
    layout, backdrop, back, surface,
  };
})();
