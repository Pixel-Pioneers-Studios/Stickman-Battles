'use strict';
// js/story/levels/ch103.js — Chapter 103 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 103 — Pattern Vaults (scavenge, 4 records)
// Null's archive layer: walls of drawers numbered 0001 to 0847, one for every
// being it has catalogued, running the whole length of the level. Four vaults
// stand out from the wall as glass cells. The first holds Movement Pattern
// 001 — a figure frozen mid-stride with its motion smeared behind it. The
// second, Bearer 22, a figure in a column of record strips (the record sits
// on the vault's plinth). The third, the partial anomalous signature, is a
// waveform that breaks off halfway across its screen. The fourth is not like
// the others: a desk under a warm lamp, a chair pushed back, a page in
// handwriting — "Personal Log — Before" — the only warm light in Null Space.
// Drawer stacks are the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const V1 = 500, V2 = [1250, 370, 100], V3 = 2200, V4 = [2945, 380, 110];
  const STACKS = [[800, 350, 100], [920, 270, 110], [1650, 350, 100], [1770, 270, 110], [2550, 340, 110], [3300, 350, 100]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [V2, V4, ...STACKS]) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04030c');
    // The drawer wall: every being catalogued, numbered
    ctx.fillStyle = '#0e0c1c'; ctx.fillRect(v.x - 10, 40, v.w + 20, G - 40);
    ctx.font = '7px monospace'; ctx.textAlign = 'center';
    for (let c = Math.max(0, Math.floor(v.x / 44)); c * 44 < Math.min(3800, v.x + v.w + 44); c++) for (let r = 0; r < 9; r++) {
      const n = c * 9 + r + 1;
      if (n > 847) continue;
      const x = c * 44 + 4, y = 50 + r * 42;
      ctx.fillStyle = '#16142a'; ctx.fillRect(x, y, 40, 38);
      ctx.strokeStyle = 'rgba(120,110,200,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 39, 37);
      ctx.fillStyle = 'rgba(170,160,240,0.45)'; ctx.fillText(String(n).padStart(4, '0'), x + 20, y + 22);
    }
  }

  function cell(x, w, h) {
    ctx.fillStyle = 'rgba(30,28,60,0.85)'; ctx.fillRect(x - w / 2, G - h, w, h);
    ctx.strokeStyle = 'rgba(180,170,255,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, G - h, w, h);
    ctx.fillStyle = 'rgba(200,190,255,0.08)'; ctx.fillRect(x - w / 2 + 6, G - h + 6, 10, h - 12);
  }
  function figure(x, y, a) {
    ctx.strokeStyle = `rgba(200,190,255,${a})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - 60, 8, 0, Math.PI * 2); ctx.moveTo(x, y - 52); ctx.lineTo(x + 4, y - 26);
    ctx.lineTo(x - 10, y); ctx.moveTo(x + 4, y - 26); ctx.lineTo(x + 16, y - 4); ctx.moveTo(x + 1, y - 44); ctx.lineTo(x + 16, y - 36); ctx.moveTo(x + 1, y - 44); ctx.lineTo(x - 12, y - 38); ctx.stroke();
  }

  function back(v) {
    // Vault 1: Pattern 001, frozen mid-stride, motion smeared behind
    if (_slVisible(v, V1 - 90, V1 + 90)) { cell(V1, 150, 200); for (let k = 4; k >= 0; k--) figure(V1 - k * 14, G - 20, k ? 0.12 : 0.9); }
    // Vault 2: Bearer 22 in a column of record strips (record on the plinth)
    if (_slVisible(v, V2[0] - 60, V2[0] + V2[2] + 60)) {
      const cx = V2[0] + V2[2] / 2;
      cell(cx, 170, 300);
      for (let k = 0; k < 14; k++) { ctx.fillStyle = `rgba(170,160,240,${0.2 + 0.3 * _slHash(k + 1030)})`; ctx.fillRect(cx - 60 + (k % 2) * 90, G - 280 + k * 16, 30, 3); }
      figure(cx, V2[1] - 30, 0.85);
      ctx.fillStyle = '#262440'; ctx.fillRect(V2[0], V2[1], V2[2], G - V2[1]); ctx.fillStyle = 'rgba(200,190,255,0.6)'; ctx.fillRect(V2[0], V2[1], V2[2], 2);
    }
    // Vault 3: a waveform that breaks off halfway
    if (_slVisible(v, V3 - 100, V3 + 100)) {
      cell(V3, 180, 230);
      ctx.strokeStyle = 'rgba(200,190,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = -70; x <= 0; x += 4) ctx.lineTo(V3 + x, G - 140 + Math.sin(x * 0.2 + frameCount * 0.1) * 24 * Math.sin(x * 0.05));
      ctx.stroke();
      ctx.fillStyle = 'rgba(200,190,255,0.5)'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillText('SIGNATURE — PARTIAL', V3, G - 60);
    }
    // Vault 4: the desk under the warm lamp
    if (_slVisible(v, V4[0] - 120, V4[0] + V4[2] + 120)) {
      const [x, y, w] = V4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x + w - 20, y - 50, 4, x + w - 20, y - 50, 170);
      g.addColorStop(0, 'rgba(255,210,140,0.45)'); g.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 160, y - 220, w + 320, 300);
      ctx.restore();
      ctx.fillStyle = '#4a3424'; ctx.fillRect(x, y, w, 8); ctx.fillRect(x + 8, y + 8, 8, G - y - 8); ctx.fillRect(x + w - 16, y + 8, 8, G - y - 8);
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x + w - 26, y - 46, 4, 46); ctx.fillRect(x + w - 40, y - 52, 30, 8);
      ctx.fillStyle = '#efe4c8'; ctx.save(); ctx.translate(x + 30, y - 2); ctx.rotate(-0.08); ctx.fillRect(0, -3, 34, 3); ctx.restore();
      ctx.save(); ctx.translate(x - 30, G); ctx.rotate(-0.2); ctx.fillStyle = '#4a3424'; ctx.fillRect(-14, -36, 28, 5); ctx.fillRect(-12, -31, 4, 31); ctx.fillRect(8, -31, 4, 31); ctx.fillRect(8, -66, 4, 35); ctx.restore();
    }
    // Drawer stacks (the climbs)
    for (const [x, y, w] of STACKS) if (_slVisible(v, x - 10, x + w + 10)) {
      ctx.fillStyle = '#1a1830'; ctx.fillRect(x, y, w, G - y);
      for (let yy = y + 8; yy < G - 10; yy += 22) { ctx.strokeStyle = 'rgba(120,110,200,0.35)'; ctx.strokeRect(x + 6, yy, w - 12, 18); ctx.fillStyle = 'rgba(170,160,240,0.4)'; ctx.fillRect(x + w / 2 - 6, yy + 8, 12, 2); }
      ctx.fillStyle = 'rgba(200,190,255,0.6)'; ctx.fillRect(x, y, w, 2);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 4000, kind: 'tunnel', face: 'concrete' }]);
    if (ph === 'front') { ctx.fillStyle = 'rgba(20,16,50,0.55)'; ctx.fillRect(Math.max(-200, v.x - 20), 452, v.w + 40, 120); }
  }

  STORY_LEVELS[103] = {
    sky: ['#04030c', '#080614', '#0c0a1e'],
    groundColor: '#12101e',
    platColor: '#262440',
    sceneX: 3000,
    layout, backdrop, back, surface,
  };
})();
