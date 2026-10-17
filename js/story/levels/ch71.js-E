'use strict';
// js/story/levels/ch71.js — Chapter 71 map (story ARENA, damnation). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 71 — The First Reset (Eternal Damnation waves, one screen)
// The loop dimension Axiom built for you, dying from the edges in. "The loop
// resets. The exit you found — gone." The exit stands in the right wall as a
// lit doorway that keeps flickering back to blank stone. Over the arena hangs
// the reset dial: its hand sweeps and snaps back, and one tick lights for each
// reset cycle you survive. Along the back wall, constructs stand dormant in
// alcoves ("the constructs remember what you did") — their eyes open as the
// waves go on. The six platforms are exactly the
// damnation arena's, in order: falls remove them by index.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460;
  const PL = [[300, 310, 300], [80, 240, 140], [680, 240, 140], [200, 160, 120], [580, 160, 120]];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of PL) P.push({ x, y, w, h: 16, isFloorDisabled: false, noDraw: true });
    return P;
  }

  const wave = () => (typeof damnationWave !== 'undefined' ? damnationWave : 0);

  function backdrop(v) {
    _slSkyAbove(v, '#0a0000');
    // The back wall of the loop: basalt courses, alcoves of dormant constructs
    ctx.fillStyle = '#160404'; ctx.fillRect(v.x - 10, 40, v.w + 20, G - 40);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
    for (let y = 60; y < G; y += 26) { ctx.beginPath(); ctx.moveTo(v.x - 10, y); ctx.lineTo(v.x + v.w + 10, y); ctx.stroke(); }
    const w = wave();
    for (let k = 0; k < 8; k++) {
      const ax = 70 + k * 110, ay = 330;
      ctx.fillStyle = '#0a0202'; ctx.fillRect(ax - 26, ay - 90, 52, 100);
      ctx.beginPath(); ctx.arc(ax, ay - 90, 26, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2a0808';
      ctx.beginPath(); ctx.arc(ax, ay - 70, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(ax - 3, ay - 61, 6, 36); ctx.fillRect(ax - 14, ay - 54, 28, 4);
      ctx.fillRect(ax - 9, ay - 26, 4, 30); ctx.fillRect(ax + 5, ay - 26, 4, 30);
      if (k < 2 + w * 2) { ctx.fillStyle = `rgba(255,40,20,${0.6 + 0.3 * Math.sin(frameCount * 0.07 + k)})`; ctx.fillRect(ax - 5, ay - 72, 3, 2); ctx.fillRect(ax + 2, ay - 72, 3, 2); }
    }
    // The reset dial: the hand sweeps and snaps back; a tick per cycle survived
    const cx = 450, cy = 96, R = 54;
    ctx.strokeStyle = 'rgba(255,80,50,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + k * (Math.PI * 2 / 3);
      ctx.fillStyle = k < w ? '#ff5533' : 'rgba(255,80,50,0.25)';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, k < w ? 6 : 4, 0, Math.PI * 2); ctx.fill();
    }
    const sweep = (frameCount % 300) / 300, ha = -Math.PI / 2 + sweep * Math.PI * 2;
    ctx.strokeStyle = sweep > 0.97 ? '#ffffff' : 'rgba(255,120,90,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * (R - 8), cy + Math.sin(ha) * (R - 8)); ctx.stroke();
    if (sweep > 0.97) { ctx.fillStyle = 'rgba(255,200,180,0.08)'; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, v.h + 20); }
  }

  function back() {
    // The exit you found, set into the right wall — flickering back to stone
    const on = (frameCount % 160) < 40 && _slHash(frameCount >> 4) > 0.3;
    ctx.fillStyle = '#220606'; ctx.fillRect(838, G - 150, 62, 150);
    ctx.fillStyle = on ? 'rgba(255,220,190,0.75)' : '#1a0404'; ctx.fillRect(852, G - 130, 38, 130);
    ctx.strokeStyle = on ? '#ffd8c0' : 'rgba(255,60,30,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(852, G - 130, 38, 130);
    if (!on) for (let y = G - 126; y < G; y += 14) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(852, y); ctx.lineTo(890, y); ctx.stroke(); }
  }

  // Slabs: basalt with red veins; a faint copy of each, offset — the loop repeating it
  function slabs(a) {
    const pls = (a.platforms || []).slice(1, 6);
    for (let i = 0; i < pls.length; i++) {
      const p = pls[i];
      if (p.isFloorDisabled) continue;
      ctx.strokeStyle = 'rgba(255,60,30,0.14)'; ctx.lineWidth = 1; ctx.strokeRect(p.x + 6, p.y - 6, p.w, p.h);
      ctx.fillStyle = '#2a0608'; ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#4a0c10'; ctx.fillRect(p.x, p.y, p.w, 3);
      const pts = _slJag(p.x + 8, p.y + 9, p.x + p.w - 8, p.y + 8, 6, 3, 71 + i * 7);
      ctx.strokeStyle = `rgba(255,70,30,${0.5 + 0.3 * Math.sin(frameCount * 0.05 + i)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.fillStyle = '#1a0304';
      ctx.beginPath(); ctx.moveTo(p.x + 4, p.y + p.h); ctx.lineTo(p.x + p.w / 2, p.y + p.h + 18); ctx.lineTo(p.x + p.w - 4, p.y + p.h); ctx.fill();
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
    for (let k = 0; k < 9; k++) {
      const pts = _slJag(40 + k * 100, G + 2, 70 + k * 100, G + 60, 4, 8, 7100 + k);
      ctx.strokeStyle = 'rgba(255,60,20,0.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
  }

  STORY_LEVELS[71] = {
    sky: ['#0a0000', '#1a0000'],
    groundColor: '#1a0000',
    platColor: '#3a0010',
    platEdge: '#ff2200',
    sceneX: 450,
    arena: { base: 'damnation', platforms },
    backdrop, back, surface,
  };
})();
