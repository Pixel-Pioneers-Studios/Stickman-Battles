'use strict';
// js/story/levels/ch115.js — Chapter 115 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 115 — What VAEL Saw Before (scavenge, 4 imprints)
// The Memory Tides: a long strand of the Fracture Coast where the tide leaves
// things from VAEL's past that "washed up and couldn't be reclaimed". Each
// imprint lies with the thing it remembers: a door standing on its own in
// the shallows, frame and all (the door that always opened first); a sphere
// of some other world's sky resting on a rock (the world before the tear);
// a shape in the sand where something hit and VAEL wasn't ready (the last
// thing they didn't see coming); and letters written in the wet sand on a
// spit of rock, half washed out, the same name started over and over (a
// name they keep misplacing). The tide line walks in and out, and its future
// line runs a little ahead of it. Rocks are the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const DOOR = 520, GLOBE = [1150, 380, 100], DENT = 2100, NAME = [2945, 370, 110];
  const ROCKS = [[780, 350, 110], [900, 270, 110], [1600, 340, 110], [2400, 350, 100], [2520, 270, 110], [3200, 340, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [GLOBE, NAME, ...ROCKS]) _slLedge(P, x, y, w);
    return P;
  }

  function rock(x, y, w) {
    ctx.fillStyle = '#3e4044';
    ctx.beginPath(); ctx.moveTo(x + 4, G); ctx.lineTo(x, y + 8); ctx.quadraticCurveTo(x + w / 2, y - 8, x + w, y + 6); ctx.lineTo(x + w - 4, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a5c62'; ctx.fillRect(x, y, w, 3);
  }

  function backdrop(v) { _slSkyAbove(v, '#020614'); _slTimeSea(v, 340); }

  function back(v) {
    // The tide line walking in and out, its future line a little ahead
    for (const [dt, a] of [[0, 0.5], [25, 0.2]]) {
      const tt = Math.sin((frameCount + dt) * 0.01);
      ctx.strokeStyle = `rgba(190,220,255,${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); for (let x = Math.floor(v.x / 30) * 30; x < v.x + v.w + 30; x += 30) ctx.lineTo(x, G - 18 + tt * 6 + Math.sin(x * 0.03) * 2); ctx.stroke();
    }
    // The door that always opened first, standing in the shallows
    if (_slVisible(v, DOOR - 60, DOOR + 120)) {
      ctx.fillStyle = '#5a4030'; ctx.fillRect(DOOR + 30, G - 120, 8, 120); ctx.fillRect(DOOR + 86, G - 120, 8, 120); ctx.fillRect(DOOR + 30, G - 126, 64, 8);
      ctx.save(); ctx.translate(DOOR + 38, G - 118); ctx.transform(0.55, 0.12, 0, 1, 0, 0);
      ctx.fillStyle = '#7a5a40'; ctx.fillRect(0, 0, 48, 118); ctx.fillStyle = '#c8b060'; ctx.fillRect(38, 60, 4, 4);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,230,180,0.25)'; ctx.fillRect(DOOR + 38, G - 118, 48, 118); ctx.restore();
    }
    // The world before the tear: a sphere of some other sky on a rock
    if (_slVisible(v, GLOBE[0] - 40, GLOBE[0] + GLOBE[2] + 40)) {
      rock(...GLOBE);
      const cx = GLOBE[0] + GLOBE[2] / 2, cy = GLOBE[1] - 60;
      const g = ctx.createLinearGradient(0, cy - 34, 0, cy + 34); g.addColorStop(0, '#6aa0e0'); g.addColorStop(0.6, '#f0d8a0'); g.addColorStop(0.62, '#5a8a40'); g.addColorStop(1, '#3a6a28');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // The last thing they didn't see coming: a shape pressed into the sand
    if (_slVisible(v, DENT - 120, DENT + 120)) {
      ctx.fillStyle = '#26282c'; ctx.beginPath(); ctx.ellipse(DENT, G - 3, 90, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a5850'; ctx.lineWidth = 2;
      for (let k = 0; k < 8; k++) { const a = Math.PI + k * Math.PI / 7; ctx.beginPath(); ctx.moveTo(DENT + Math.cos(a) * 90, G - 3); ctx.lineTo(DENT + Math.cos(a) * 140, G - 3 + Math.sin(a) * 30); ctx.stroke(); }
    }
    // A name they keep misplacing, written in the sand, started over and over
    if (_slVisible(v, NAME[0] - 60, NAME[0] + NAME[2] + 60)) {
      rock(...NAME);
      ctx.fillStyle = 'rgba(30,30,40,0.7)'; ctx.font = 'italic 12px Georgia'; ctx.textAlign = 'left';
      ['Va—', 'Va', 'V—', 'Va—'].forEach((s, k) => ctx.fillText(s, NAME[0] + 8 + k * 24, NAME[1] + 24 + (k % 2) * 10));
    }
    for (const [x, y, w] of ROCKS) if (_slVisible(v, x - 10, x + w + 10)) rock(x, y, w);
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3600, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#6a6858'; ctx.fillRect(x0, G - 14, x1 - x0, 14); ctx.fillStyle = 'rgba(120,150,190,0.25)'; ctx.fillRect(x0, G - 14, x1 - x0, 6); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 200); g.addColorStop(0, '#4a4840'); g.addColorStop(1, '#020614');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 200);
  }

  STORY_LEVELS[115] = {
    sky: ['#020614', '#06102a', '#0e1c3a'],
    groundColor: '#2a2a2c',
    platColor: '#3e4044',
    layout, backdrop, back, surface,
  };
})();
