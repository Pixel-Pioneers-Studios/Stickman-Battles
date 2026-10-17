'use strict';
// js/story/levels/ch88.js — Chapter 88 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 88 — A World That Never Stopped Fighting (escape, run right)
// The front lines, collapsing. "A shelling wave demolishing everything from
// behind." You run across no-man's land and through three trench lines cut
// into it — sixty pixels deep, duckboards on the floor, sandbag lips and
// wire on the parapets, a step out on each side. Behind the escape wall the
// ground is cratered and burning; just ahead of it, shells are landing (the
// flashes walk forward with the wall). Shattered watchtowers and a siege
// ladder thrown against a stretch of wall are the high routes. The far side
// of the front — where the ground is still unbroken — is the goal.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const TRENCH = [[900, 1200], [2000, 2250], [3000, 3300]];
  const DEEP = 500;
  const HIGH = [[600, 350, 110], [1450, 340, 110], [1580, 260, 110], [2600, 350, 110], [3600, 340, 110], [3730, 260, 110]];
  const GOAL = 4250;

  function floor(len) {
    const P = [];
    let x = 0;
    for (const [a, b] of TRENCH) {
      P.push(Object.assign(_slFloorSeg(x, 440, a - x, 160), { noDraw: true }));
      P.push(Object.assign(_slFloorSeg(a, DEEP, b - a, 100), { noDraw: true }));
      x = b;
    }
    P.push(Object.assign(_slFloorSeg(x, 440, (len || 4600) - x, 160), { noDraw: true }));
    return P;
  }

  function layout() {
    const P = [];
    for (const [x, y, w] of HIGH) _slLedge(P, x, y, w);
    for (const [a, b] of TRENCH) { _slLedge(P, a + 6, 470, 40); _slLedge(P, b - 46, 470, 40); }   // fire steps
    return P;
  }

  function backdrop(v) {
    _slWarSky(v, 88);
    _slWarLine(v, 0.2, 880, '#2a1810');
  }

  function back(v) {
    // Behind the wall: cratered, burning ground; ahead of it, shells landing
    const wx = (typeof escapeWallX !== 'undefined') ? escapeWallX : -200;
    for (let k = Math.max(0, Math.floor((v.x - 100) / 180)); k * 180 < Math.min(wx, v.x + v.w + 100); k++) {
      const cx = k * 180 + _slHash(k + 880) * 80;
      if (cx > wx) break;
      _slFire(cx - 20, 440, 40, 0.9); _slSmoke(cx, 410, 200, true, k);
    }
    const fk = Math.floor(frameCount / 17);
    for (let j = 0; j < 2; j++) {
      const sx = wx + 80 + _slHash(fk * 3 + j) * 260;
      if (!_slVisible(v, sx - 60, sx + 60) || _slHash(fk + j * 7) < 0.4) continue;
      const t = (frameCount % 17) / 17;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, 430, 4, sx, 430, 60 + t * 40);
      g.addColorStop(0, `rgba(255,220,150,${0.7 * (1 - t)})`); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 100, 330, 200, 200);
      ctx.restore();
    }
    // Watchtowers and a siege ladder (the high routes)
    for (let i = 0; i < HIGH.length; i++) {
      const [x, y, w] = HIGH[i];
      if (!_slVisible(v, x - 20, x + w + 20)) continue;
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x + 8, 440); ctx.lineTo(x + 14, y); ctx.moveTo(x + w - 8, 440); ctx.lineTo(x + w - 14, y + (i % 2 ? 6 : 0)); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, 430); ctx.lineTo(x + w - 12, y + 24); ctx.stroke();
      ctx.save(); ctx.translate(x + w / 2, y + 4); ctx.rotate(i % 2 ? 0.04 : -0.03);
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(-w / 2, -4, w, 8);
      ctx.restore();
    }
    // A stretch of wall with a siege ladder thrown against it, by the second watch post
    if (_slVisible(v, 1380, 1720)) {
      _slBrick(1400, 300, 60, 140, '#5a4a3a');
      ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(1380, 440); ctx.lineTo(1440, 290); ctx.moveTo(1400, 440); ctx.lineTo(1460, 290); ctx.stroke();
      ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { const t = k / 8; ctx.beginPath(); ctx.moveTo(1380 + t * 60, 440 - t * 150); ctx.lineTo(1400 + t * 60, 440 - t * 150); ctx.stroke(); }
    }
    for (const sx of [1250, 2400, 3450]) if (_slVisible(v, sx, sx + 100)) _slStakes(sx, 440, 90);
    for (const [cx, w] of [[500, 60], [1700, 70], [2800, 60], [3900, 80]]) if (_slVisible(v, cx - w, cx + w)) _slCrater(cx, 440, w);
    // The far side of the front: unbroken ground, a banner nobody has torn down
    if (_slVisible(v, GOAL - 200, GOAL + 400)) {
      _slBanner(GOAL + 80, 440, 170, '#5a4a14', 8);
      ctx.fillStyle = '#4a6a34'; for (let k = 0; k < 30; k++) ctx.fillRect(GOAL - 100 + k * 16, 432 - _slHash(k + 881) * 6, 3, 8);
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      // The trench's far wall: earth and revetting planks, not sky
      for (const [x0, x1] of TRENCH) {
        if (!_slVisible(v, x0, x1)) continue;
        ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x0, 438, x1 - x0, DEEP - 438);
        ctx.fillStyle = 'rgba(90,64,40,0.6)'; for (let y = 446; y < DEEP - 20; y += 12) ctx.fillRect(x0, y, x1 - x0, 8);
      }
    }
    _slSurfaces(v, a, ph, [{ x0: -200, x1: 4800, kind: 'mud', face: 'soil' }]);
    if (ph !== 'front') return;
    for (const [x0, x1] of TRENCH) {
      if (!_slVisible(v, x0 - 60, x1 + 60)) continue;
      // Revetted trench walls, duckboards, sandbag lips, wire on the parapet
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x0, 440, 6, DEEP - 440); ctx.fillRect(x1 - 6, 440, 6, DEEP - 440);
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1;
      for (let y = 446; y < DEEP; y += 10) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 6, y); ctx.moveTo(x1 - 6, y); ctx.lineTo(x1, y); ctx.stroke(); }
      for (let x = x0 + 8; x < x1 - 8; x += 22) { ctx.fillStyle = '#6a5038'; ctx.fillRect(x, DEEP - 4, 18, 4); }
      ctx.fillStyle = '#5a4a30'; ctx.fillRect(x0 + 6, 470, 40, 6); ctx.fillRect(x1 - 46, 470, 40, 6);
      for (const sx of [x0 - 40, x1 + 4]) for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#7a6a4a' : '#6a5a40'; ctx.fillRect(sx + (k % 2) * 6, 428 - k * 9, 30, 10); }
      ctx.strokeStyle = 'rgba(160,150,140,0.7)'; ctx.lineWidth = 1;
      for (const sx of [x0 - 44, x1 + 6]) { ctx.beginPath(); for (let k = 0; k < 8; k++) ctx.arc(sx + k * 5, 412, 4, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  STORY_LEVELS[88] = {
    sky: ['#1a0e08', '#3a1e10', '#6a3a1c'],
    groundColor: '#2e2016',
    platColor: '#5a3e26',
    floor, layout, backdrop, back, surface,
  };
})();
