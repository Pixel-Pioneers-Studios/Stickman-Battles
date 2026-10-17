'use strict';
// Chapter 32 map. Contract in smb-story-levels.js.

// Chapter 32, Gravity Anomaly (walk, then duel a Flux Veteran).
// Segments 32-35 are one stitched world: draw in local 0..6000, read geometry from `a`, not currentArena.
(function () {
  const G = 440, PLAZA = 3000;
  // Hanging slabs keep clear of the flux wells at 1800 and 4680.
  const HANG = [[600, 350, 100], [740, 270, 110], [1200, 340, 120], [2300, 350, 90], [2420, 260, 140],
                [2690, 330, 90], [3220, 330, 90], [3700, 340, 100], [3840, 260, 120], [5200, 350, 100], [5340, 270, 110]];
  const PYLONS = [400, 1450, 2150, 3900, 4300, 5600];
  const WELLS = [1800, 4680];

  function layout() {
    const P = [];
    for (const [x, y, w] of HANG) _slLedge(P, x, y, w);
    return P;
  }

  // 0..1 over the 90-second flux cycle. Decor only.
  const cyc = () => (frameCount % 5400) / 5400;

  function backdrop(v) {
    _slParallax(v, 0.06, (l, r) => {
      ctx.fillStyle = 'rgba(255,220,180,0.5)';
      for (let i = Math.floor(l / 28); i * 28 < r; i++) if (_slHash(i + 3) < 0.3) ctx.fillRect(i * 28 + _slHash(i) * 20, -300 + _slHash(i + 8) * 700, 1.2, 1.2);
      const cx = l + (r - l) * 0.62;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, 160, 6, cx, 160, 210);
      g.addColorStop(0, 'rgba(255,190,120,0.45)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 220, -60, 440, 440);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,150,60,0.18)'; ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx, 160, 150 + k * 40, 26 + k * 8, 0.2 * k - 0.2, 0, Math.PI * 2); ctx.stroke(); }
    });
    _slParallax(v, 0.35, (l, r) => {
      for (let i = Math.floor(l / 110) - 1; i * 110 < r + 110; i++) {
        const x = i * 110 + _slHash(i + 40) * 30, w = 60 + _slHash(i + 41) * 50, bot = 20 + _slHash(i + 42) * 130;
        ctx.fillStyle = '#1c1420'; ctx.fillRect(x, -500, w, bot + 500);
        ctx.fillStyle = '#2a1e26'; ctx.fillRect(x - 4, bot - 6, w + 8, 6);
        _slWindowGrid(x + 6, bot - 70, w - 12, 60, Math.max(2, Math.floor(w / 18)), 3, { lit: 0.3, seed: i * 7, litColor: '#ffb070', sill: false });
      }
    });
  }

  function back(v, a) {
    for (const [x, y, w] of HANG) {
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.fillStyle = '#3a2a24'; ctx.fillRect(x, y, w, 14);
      ctx.fillStyle = '#4e3a30'; ctx.fillRect(x, y, w, 4);
      ctx.strokeStyle = '#2a201c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, v.y - 20); ctx.moveTo(x + w - 10, y); ctx.lineTo(x + w - 10, v.y - 20); ctx.stroke();
      ctx.fillStyle = 'rgba(255,190,120,0.35)';
      for (let wx = x + 8; wx < x + w - 8; wx += 16) ctx.fillRect(wx, y + 6, 8, 5);
    }
    for (const px of PYLONS) {
      if (!_slVisible(v, px - 30, px + 30)) continue;
      ctx.fillStyle = '#2a2230'; ctx.fillRect(px - 6, G - 150, 12, 150); ctx.fillRect(px - 14, G - 8, 28, 8);
      const t = cyc();
      ctx.strokeStyle = '#3a2e3e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(px, G - 170, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = t > 0.85 ? '#ff4422' : '#ff9a3c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(px, G - 170, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - t)); ctx.stroke();
      ctx.fillStyle = 'rgba(255,190,120,0.8)';
      ctx.beginPath(); ctx.moveTo(px - 6, G - 176); ctx.lineTo(px + 6, G - 176); ctx.lineTo(px, G - 164); ctx.fill();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const wx of WELLS) {
      if (!_slVisible(v, wx - 60, wx + 60)) continue;
      for (let k = 0; k < 16; k++) {
        const t = ((frameCount * 1.6 + k * 37) % 300) / 300;
        ctx.fillStyle = `rgba(255,170,80,${0.5 * (1 - t)})`;
        ctx.fillRect(wx - 40 + _slHash(k + wx) * 80, G - t * 300, 2, 6);
      }
      ctx.fillStyle = 'rgba(255,140,50,0.25)'; ctx.fillRect(wx - 46, G - 6, 92, 6);
    }
    ctx.restore();
    if (_slVisible(v, PLAZA - 500, PLAZA + 500)) {
      const sp = frameCount * 0.01;
      ctx.save(); ctx.translate(PLAZA, G - 300);
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = k ? 'rgba(255,150,60,0.45)' : '#3a2a30'; ctx.lineWidth = k ? 3 : 14;
        ctx.beginPath(); ctx.ellipse(0, 0, 320, 60, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const ang = sp + k / 12 * Math.PI * 2;
        ctx.fillStyle = 'rgba(255,200,140,0.8)'; ctx.fillRect(Math.cos(ang) * 320 - 3, Math.sin(ang) * 60 - 3, 6, 6);
      }
      ctx.restore();
      for (const [x, y, w] of [[2690, 330, 90], [3220, 330, 90]]) {
        ctx.fillStyle = '#2a2026'; ctx.fillRect(x + w / 2 - 8, y + 14, 16, G - y - 14);
      }
      ctx.fillStyle = 'rgba(255,190,120,0.5)'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('↓  ↑  FLUX ' + Math.ceil(90 * (1 - cyc())) + 's', PLAZA, G - 390);
    }
  }

  function surface(v, a, ph) {
    _slSurfaces(v, a, ph, [{ x0: -400, x1: 6400, kind: 'tunnel', face: 'concrete' }]);
  }

  STORY_LEVELS[32] = {
    sky: ['#0a0406', '#2a1208'],
    groundColor: '#140a08',
    platColor: '#3a2a24',
    layout, backdrop, back, surface,
  };
})();
