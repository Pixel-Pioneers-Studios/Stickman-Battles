'use strict';
// js/story/levels/ch28.js — Chapter 28 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 28 — Into the Crucible (scavenge, 4 bearer records)
// The approach to the Crucible: a volcanic vault where the rift entity stores
// what it took from forty-seven failed bearers. Basalt terraces step up and
// down over magma channels (the channels are under the floor — read as heat,
// not hazard); reliquary niches line the walls. Records (positions mirrored
// in scavengeItemDefs): Log I in a low niche, Log II high on the obsidian
// spire, the Fragment Map across the chain bridge, the Signature Atlas on the
// Crucible's outer wall.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 700, 440], [700, 1000, 400], [1000, 1500, 440], [1500, 1700, 470], [1700, 2300, 440], [2300, 2600, 400], [2600, 3600, 440]];
  const SPIRE = [[1100, 360, 90], [1150, 280, 80], [1190, 200, 90]];
  const BRIDGE = { x: 1800, w: 380, y: 290 };
  const BRIDGE_UP = [[1700, 360, 90]];
  const WALL = [[2700, 340, 120], [2780, 260, 120]];
  const CRUCIBLE = 3200;

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 620 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of SPIRE) _slLedge(P, x, y, w);
    for (const [x, y, w] of BRIDGE_UP) _slLedge(P, x, y, w);
    _slLedge(P, BRIDGE.x, BRIDGE.y, BRIDGE.w);
    for (const [x, y, w] of WALL) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#1a0400');
    _slParallax(v, 0.12, (l, r) => {
      const g = ctx.createLinearGradient(0, 0, 0, 440);
      g.addColorStop(0, 'rgba(255,90,20,0)'); g.addColorStop(1, 'rgba(255,90,20,0.35)');
      ctx.fillStyle = g; ctx.fillRect(l - 20, 0, r - l + 40, 440);
      for (let i = Math.floor(l / 140) - 1; i * 140 < r + 140; i++) {
        const x = i * 140, h = 160 + _slHash(i) * 200;
        ctx.fillStyle = '#200806';
        ctx.beginPath(); ctx.moveTo(x - 20, 440); ctx.lineTo(x + 40, 440 - h); ctx.lineTo(x + 70, 440 - h + 20); ctx.lineTo(x + 140, 440); ctx.fill();
        if (_slHash(i + 3) < 0.3) { ctx.fillStyle = 'rgba(255,120,40,0.6)'; ctx.fillRect(x + 44, 440 - h + 4, 20, 3); }
      }
    });
    // Ash falling
    _slParallax(v, 0.5, (l, r) => {
      for (let k = 0; k < 40; k++) {
        const x = l + ((_slHash(k) * (r - l) + frameCount * 0.3) % (r - l)), y = ((_slHash(k + 9) * 500 + frameCount * 0.9) % 560) - 60;
        ctx.fillStyle = 'rgba(180,170,160,0.5)'; ctx.fillRect(x, y, 2, 2);
      }
    });
  }

  function _niche(x, y, lit) {
    ctx.fillStyle = '#140604'; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 50); ctx.arc(x, y - 50, 22, Math.PI, 0); ctx.lineTo(x + 22, y); ctx.fill();
    ctx.strokeStyle = '#4a2a1e'; ctx.lineWidth = 3; ctx.stroke();
    if (lit) { ctx.fillStyle = 'rgba(255,170,90,0.5)'; ctx.fillRect(x - 3, y - 40, 6, 10); }
    ctx.fillStyle = 'rgba(255,200,150,0.6)'; ctx.font = '7px Georgia'; ctx.textAlign = 'center'; ctx.fillText(String(Math.floor(_slHash(x) * 47) + 1), x, y + 10);
  }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3600, v.x + v.w + 40);
    ctx.fillStyle = '#240a06'; ctx.fillRect(x0, -300, x1 - x0, 740);
    // Basalt columns along the wall, niches between
    for (let px = Math.floor(x0 / 70) * 70; px < x1; px += 70) {
      ctx.fillStyle = px % 140 ? '#2e100a' : '#34140c'; ctx.fillRect(px, -300, 64, 740);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 60, -300, 4, 740);
    }
    for (let nx = 150; nx < 3000; nx += 230) if (_slVisible(v, nx - 30, nx + 30)) _niche(nx, 300 - (nx % 3) * 40, _slHash(nx) < 0.5);
    // Magma channel glow seeping up through floor cracks
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = Math.floor(x0 / 160); k * 160 < x1; k++) {
      const cx = k * 160 + _slHash(k) * 60;
      const g = ctx.createRadialGradient(cx, 440, 2, cx, 440, 60);
      g.addColorStop(0, 'rgba(255,120,40,0.35)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 60, 380, 120, 60);
    }
    ctx.restore();
    // Obsidian spire
    if (_slVisible(v, 1080, 1300)) for (const [x, y, w] of SPIRE) {
      ctx.fillStyle = '#120a10'; ctx.beginPath(); ctx.moveTo(x, 440); ctx.lineTo(x + 6, y); ctx.lineTo(x + w - 6, y); ctx.lineTo(x + w, 440); ctx.fill();
      ctx.fillStyle = 'rgba(180,150,220,0.25)'; ctx.fillRect(x + 10, y, 3, 440 - y);
      ctx.fillStyle = '#2a1a24'; ctx.fillRect(x, y, w, 5);
    }
    // Chain bridge
    if (_slVisible(v, 1680, 2200)) {
      for (const [x, y, w] of BRIDGE_UP) { ctx.fillStyle = '#3a1a10'; ctx.fillRect(x, y, w, 470 - y); ctx.fillStyle = '#4a2416'; ctx.fillRect(x, y, w, 5); }
      ctx.strokeStyle = '#4a4040'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(BRIDGE.x, BRIDGE.y - 30); ctx.quadraticCurveTo(BRIDGE.x + BRIDGE.w / 2, BRIDGE.y - 10, BRIDGE.x + BRIDGE.w, BRIDGE.y - 30); ctx.stroke();
      ctx.fillStyle = '#5a3a24'; for (let k = BRIDGE.x; k < BRIDGE.x + BRIDGE.w; k += 22) ctx.fillRect(k, BRIDGE.y, 18, 8);
      for (let k = BRIDGE.x; k <= BRIDGE.x + BRIDGE.w; k += 44) { ctx.beginPath(); ctx.moveTo(k, BRIDGE.y); ctx.lineTo(k, BRIDGE.y - 26); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(BRIDGE.x, BRIDGE.y - 30); ctx.lineTo(BRIDGE.x, -300); ctx.moveTo(BRIDGE.x + BRIDGE.w, BRIDGE.y - 30); ctx.lineTo(BRIDGE.x + BRIDGE.w, -300); ctx.stroke();
    }
    // The Crucible's outer wall and door
    if (_slVisible(v, 2660, 3600)) {
      for (const [x, y, w] of WALL) { ctx.fillStyle = '#3a1a10'; ctx.fillRect(x, y, w, 440 - y); ctx.fillStyle = '#4a2416'; ctx.fillRect(x, y, w, 6); }
      ctx.fillStyle = '#1a0806'; ctx.beginPath(); ctx.arc(CRUCIBLE + 120, 440, 260, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#5a2a18'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(CRUCIBLE + 120, 440, 260, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,60,0.6)'; ctx.font = 'bold 22px Georgia'; ctx.textAlign = 'center'; ctx.fillText('XLVII', CRUCIBLE + 120, 440 - 200);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CRUCIBLE + 120, 440, 10, CRUCIBLE + 120, 440, 220); g.addColorStop(0, 'rgba(255,140,60,0.45)'); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(CRUCIBLE - 100, 220, 440, 220); ctx.restore();
    }
  }

  const ZONES = [{ x0: -200, x1: 3800, kind: 'rubble', face: 'concrete' }];
  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, ZONES);
    if (ph !== 'front') return;
    // Magma veins in the slab face
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,110,40,0.55)'; ctx.lineWidth = 2;
    for (let k = Math.floor((v.x - 40) / 120); k * 120 < v.x + v.w + 40; k++) {
      const pts = _slJag(k * 120, 460, k * 120 + 90, 560, 5, 10, k);
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
    ctx.restore();
  }

  STORY_LEVELS[28] = {
    sky: ['#1a0400', '#3a0e04'],
    groundColor: '#1a0806',
    platColor: '#3a1a10',
    floor, layout, backdrop, back, surface,
  };
})();
