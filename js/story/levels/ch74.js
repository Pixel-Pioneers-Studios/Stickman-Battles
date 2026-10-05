'use strict';
// js/story/levels/ch74.js — Chapter 74 map (story ARENA, damnation). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 74 — Eternal Damnation (escape: three waves, eight anchors, one screen)
// The same loop as the first reset, now coming apart. The dimensional flaw you
// reached in the last chapter hangs over the centre of the arena — a seam of
// white light in the red, exactly where the exit portal opens — and it widens
// with every reality anchor you collect. Eight anchor sockets ring it and
// light in turn. The reset dial is broken, its pieces drifting; the back wall
// has lost whole courses of stone that float away upward into the dark. Each
// fall strips a slab ("every time you fall, a platform is gone forever") and
// the surviving slabs crack wider with every one. The six platforms are
// exactly the damnation arena's, in order: falls remove them by index.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460, FX = 450, FY = 200;
  const PL = [[300, 310, 300], [80, 240, 140], [680, 240, 140], [200, 160, 120], [580, 160, 120]];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of PL) P.push({ x, y, w, h: 16, isFloorDisabled: false, noDraw: true });
    return P;
  }

  const anchors = () => (typeof damnationAnchors !== 'undefined' ? Math.min(8, damnationAnchors) : 0);
  const falls = () => (typeof damnationDeaths !== 'undefined' ? damnationDeaths : 0);

  function backdrop(v) {
    _slSkyAbove(v, '#0a0000');
    // The back wall, missing courses — the stones drift up and away
    ctx.fillStyle = '#160404'; ctx.fillRect(v.x - 10, 40, v.w + 20, G - 40);
    for (let k = 0; k < 14; k++) {
      const bx = 20 + k * 64 + _slHash(k + 740) * 20, by = 120 + _slHash(k + 741) * 200;
      ctx.fillStyle = '#050000'; ctx.fillRect(bx, by, 48, 24);
      const t = ((frameCount * (0.2 + _slHash(k) * 0.3) + k * 60) % 300) / 300;
      ctx.save(); ctx.translate(bx + 24, by - t * 260); ctx.rotate(t * (k % 2 ? 1 : -1));
      ctx.fillStyle = `rgba(40,10,10,${1 - t})`; ctx.fillRect(-24, -12, 48, 24);
      ctx.restore();
    }
    // The broken reset dial, its pieces drifting off-centre
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + frameCount * 0.002, d = 70 + k * 6 + Math.sin(frameCount * 0.01 + k) * 8;
      ctx.strokeStyle = 'rgba(255,80,50,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(FX + Math.cos(a) * (d - 54), 80 + Math.sin(a) * (d - 54) * 0.5, 54, a - 0.3, a + 0.3); ctx.stroke();
    }
  }

  function back() {
    const n = anchors(), open = n / 8;
    // The flaw: a seam of white in the red, widening with every anchor
    const pts = _slJag(FX, 40, FX, 380, 16, 10 + open * 22, 74);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(FX, FY, 10, FX, FY, 140 + open * 160);
    g.addColorStop(0, `rgba(255,240,230,${0.18 + open * 0.3})`); g.addColorStop(1, 'rgba(255,120,90,0)');
    ctx.fillStyle = g; ctx.fillRect(FX - 320, FY - 320, 640, 640);
    ctx.strokeStyle = `rgba(255,250,245,${0.6 + 0.3 * Math.sin(frameCount * 0.1)})`; ctx.lineWidth = 2 + open * 6;
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    ctx.lineWidth = 12 + open * 30; ctx.strokeStyle = `rgba(255,170,140,${0.10 + open * 0.15})`; ctx.stroke();
    ctx.restore();
    // Eight anchor sockets around it
    for (let k = 0; k < 8; k++) {
      const a = Math.PI * (0.1 + 0.8 * k / 7) + Math.PI, sx = FX + Math.cos(a) * 190, sy = FY + 40 + Math.sin(a) * 120;
      ctx.fillStyle = '#2a0808'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,90,60,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (k < n) {
        ctx.fillStyle = '#ffe0c8'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,200,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(FX, FY); ctx.stroke();
      }
    }
  }

  // Slabs crack wider with every fall
  function slabs(a) {
    const f = falls(), pls = (a.platforms || []).slice(1, 6);
    for (let i = 0; i < pls.length; i++) {
      const p = pls[i];
      if (p.isFloorDisabled) continue;
      const sh = f > 0 ? Math.sin(frameCount * 0.6 + i) * f * 0.4 : 0;
      ctx.fillStyle = '#2a0608'; ctx.fillRect(p.x + sh, p.y, p.w, p.h);
      ctx.fillStyle = '#4a0c10'; ctx.fillRect(p.x + sh, p.y, p.w, 3);
      for (let c = 0; c <= f; c++) {
        const cx = p.x + p.w * (0.2 + 0.6 * _slHash(i * 5 + c + 7400));
        ctx.strokeStyle = `rgba(255,${120 - c * 20},60,${0.5 + 0.1 * c})`; ctx.lineWidth = 1 + c * 0.6;
        ctx.beginPath(); ctx.moveTo(cx + sh, p.y); ctx.lineTo(cx + 5 + sh, p.y + 8); ctx.lineTo(cx - 3 + sh, p.y + p.h); ctx.stroke();
      }
      ctx.fillStyle = '#1a0304';
      ctx.beginPath(); ctx.moveTo(p.x + 4, p.y + p.h); ctx.lineTo(p.x + p.w / 2, p.y + p.h + 14 + f * 3); ctx.lineTo(p.x + p.w - 4, p.y + p.h); ctx.fill();
      for (let k = 0; k < f * 2; k++) {
        const t = ((frameCount + k * 37 + i * 11) % 90) / 90;
        ctx.fillStyle = `rgba(60,10,10,${1 - t})`; ctx.fillRect(p.x + _slHash(k + i * 13) * p.w, p.y + p.h + t * 80, 4, 4);
      }
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#240607'; ctx.fillRect(-60, G - 12, 1020, 12);
      ctx.fillStyle = 'rgba(255,90,60,0.25)'; ctx.fillRect(-60, G - 12, 1020, 1);
      return;
    }
    slabs(a);
    const g = ctx.createLinearGradient(0, G, 0, G + 300);
    g.addColorStop(0, '#2a0606'); g.addColorStop(1, '#050000');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    ctx.fillStyle = '#ff3a1a'; ctx.fillRect(0, G, 900, 1.5);
    for (let k = 0; k < 12; k++) {
      const pts = _slJag(20 + k * 76, G + 2, 50 + k * 76, G + 70, 4, 10, 7400 + k);
      ctx.strokeStyle = 'rgba(255,80,30,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
  }

  STORY_LEVELS[74] = {
    sky: ['#0a0000', '#1a0000'],
    groundColor: '#1a0000',
    platColor: '#3a0010',
    platEdge: '#ff2200',
    sceneX: 450,
    arena: { base: 'damnation', platforms },
    backdrop, back, surface,
  };
})();
