'use strict';
// js/story/levels/ch79.js — Chapter 79 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 79 — The Architect Before the Architects (scavenge, 4 records)
// The Fallen God's origin vault: one long hall of pale gold stone, older than
// anything the Architects built, holding the records of the first law — the
// walls between dimensions. Each record is kept where it belongs: the Law of
// Separation on a lectern under the law itself, cut the height of the wall;
// the First Wall Blueprint on its drafting table, the plan of concentric
// walls pinned above it; the Creator's Tutelage on a plinth in front of a
// relief of a tall figure guiding a smaller one's hand; the Fracture Proof
// in a reliquary, a slab of crystal split clean through. Archive stacks
// between them are the climbs. The vault door at the end has rolled aside;
// it is sealing — its rim lights segment by segment as you collect.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, DOOR = 3300;
  const LECTERN = 500, TABLE = [1130, 360, 140], PLINTH = [1955, 400, 90], RELIQ = [2845, 370, 110];
  const STACKS = [[700, 350, 110], [820, 270, 110], [1450, 350, 100], [1570, 270, 110], [2200, 350, 100], [2320, 270, 110], [2620, 330, 100]];

  function layout() {
    const P = [];
    for (const [x, y, w] of [TABLE, PLINTH, RELIQ, ...STACKS]) _slLedge(P, x, y, w);
    return P;
  }

  function collected() {
    return (typeof scavengeItems !== 'undefined' && scavengeItems) ? scavengeItems.filter(s => s.collected).length : 0;
  }

  function backdrop(v) { _slSkyAbove(v, '#1a140a'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3800, v.x + v.w + 40);
    // The hall: coursed gold stone, pilasters, a coffered ceiling
    ctx.fillStyle = '#6a5a3a'; ctx.fillRect(x0, v.y - 20, x1 - x0, G - v.y + 20);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let y = 80; y < G; y += 30) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    for (let px = Math.floor(x0 / 300) * 300; px < x1; px += 300) {
      ctx.fillStyle = '#7a6a48'; ctx.fillRect(px, 60, 34, G - 60);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(px + 28, 60, 6, G - 60);
    }
    ctx.fillStyle = '#4a3e28'; ctx.fillRect(x0, v.y - 20, x1 - x0, 80 - v.y + 20);
    for (let px = Math.floor(x0 / 75) * 75; px < x1; px += 75) { ctx.fillStyle = '#3a3020'; ctx.fillRect(px + 8, 64, 58, 12); }
    // The law, cut the height of the wall
    if (_slVisible(v, LECTERN - 300, LECTERN + 300)) {
      ctx.fillStyle = 'rgba(40,30,14,0.55)'; ctx.font = 'bold 22px Georgia'; ctx.textAlign = 'center';
      ['LET EACH WORLD', 'BE WALLED', 'THAT EACH', 'MAY BE KEPT'].forEach((t, k) => ctx.fillText(t, LECTERN, 140 + k * 46));
      ctx.fillStyle = '#4a3e28'; ctx.fillRect(LECTERN - 20, G - 70, 40, 70); ctx.fillRect(LECTERN - 34, G - 76, 68, 10);
    }
    // The blueprint: concentric walls pinned above the drafting table
    if (_slVisible(v, TABLE[0] - 100, TABLE[0] + TABLE[2] + 100)) {
      const cx = TABLE[0] + TABLE[2] / 2;
      ctx.fillStyle = '#d8ccaa'; ctx.fillRect(cx - 110, 110, 220, 160);
      ctx.strokeStyle = 'rgba(40,60,110,0.75)'; ctx.lineWidth = 1.2;
      for (let k = 1; k <= 5; k++) { ctx.beginPath(); ctx.arc(cx, 190, k * 14, 0, Math.PI * 2); ctx.stroke(); }
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 14, 190 + Math.sin(a) * 14); ctx.lineTo(cx + Math.cos(a) * 70, 190 + Math.sin(a) * 70); ctx.stroke(); }
      ctx.fillStyle = '#5a4a30'; ctx.fillRect(TABLE[0], TABLE[1], TABLE[2], 8);
      ctx.fillRect(TABLE[0] + 10, TABLE[1] + 8, 8, G - TABLE[1] - 8); ctx.fillRect(TABLE[0] + TABLE[2] - 18, TABLE[1] + 8, 8, G - TABLE[1] - 8);
    }
    // The relief: a tall figure guiding a smaller one's hand
    if (_slVisible(v, PLINTH[0] - 200, PLINTH[0] + 200)) {
      const rx = PLINTH[0] + PLINTH[2] / 2;
      ctx.fillStyle = '#7a6a48'; ctx.fillRect(rx - 120, 100, 240, 220);
      ctx.strokeStyle = 'rgba(40,30,14,0.55)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(rx - 40, 140, 14, 0, Math.PI * 2); ctx.moveTo(rx - 40, 154); ctx.lineTo(rx - 40, 240); ctx.lineTo(rx - 60, 300); ctx.moveTo(rx - 40, 240); ctx.lineTo(rx - 20, 300);
      ctx.moveTo(rx - 40, 175); ctx.lineTo(rx + 10, 205); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx + 30, 200, 10, 0, Math.PI * 2); ctx.moveTo(rx + 30, 210); ctx.lineTo(rx + 30, 260); ctx.lineTo(rx + 18, 300); ctx.moveTo(rx + 30, 260); ctx.lineTo(rx + 42, 300);
      ctx.moveTo(rx + 30, 222); ctx.lineTo(rx + 12, 207); ctx.stroke();
      ctx.fillStyle = '#5a4a30'; ctx.fillRect(PLINTH[0], PLINTH[1], PLINTH[2], G - PLINTH[1]);
      ctx.fillStyle = '#8a7a58'; ctx.fillRect(PLINTH[0] - 4, PLINTH[1], PLINTH[2] + 8, 6);
    }
    // The reliquary: a crystal slab split clean through
    if (_slVisible(v, RELIQ[0] - 100, RELIQ[0] + RELIQ[2] + 100)) {
      const cx = RELIQ[0] + RELIQ[2] / 2;
      ctx.fillStyle = '#5a4a30'; ctx.fillRect(RELIQ[0], RELIQ[1], RELIQ[2], G - RELIQ[1]);
      ctx.fillStyle = '#8a7a58'; ctx.fillRect(RELIQ[0] - 4, RELIQ[1], RELIQ[2] + 8, 6);
      for (const s of [-1, 1]) {
        ctx.fillStyle = 'rgba(190,170,255,0.55)';
        ctx.beginPath(); ctx.moveTo(cx + s * 4, 210); ctx.lineTo(cx + s * 36, 225); ctx.lineTo(cx + s * 30, 330); ctx.lineTo(cx + s * 4 + s * Math.sin(frameCount * 0.02) * 2, 340); ctx.closePath(); ctx.fill();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(220,200,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, 205); ctx.lineTo(cx + 2, 270); ctx.lineTo(cx - 2, 345); ctx.stroke();
      ctx.restore();
    }
    // Archive stacks: tablets on shelves (the climbs)
    for (const [x, y, w] of STACKS) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      _slBookshelf(x, y, w, G - y, '#4a3e28');
      ctx.fillStyle = '#8a7a58'; ctx.fillRect(x - 3, y, w + 6, 7);
    }
    // The vault door, rolled aside — its rim lights a segment per record taken
    if (_slVisible(v, DOOR - 260, DOOR + 260)) {
      const n = collected();
      ctx.fillStyle = '#1a140a'; ctx.beginPath(); ctx.arc(DOOR, G - 140, 140, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a7a58'; ctx.beginPath(); ctx.arc(DOOR + 190, G - 140, 130, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 3;
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; ctx.beginPath(); ctx.moveTo(DOOR + 190 + Math.cos(a) * 40, G - 140 + Math.sin(a) * 40); ctx.lineTo(DOOR + 190 + Math.cos(a) * 120, G - 140 + Math.sin(a) * 120); ctx.stroke(); }
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = k < n ? 'rgba(255,220,140,0.95)' : 'rgba(120,100,60,0.6)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(DOOR, G - 140, 146, Math.PI + k * Math.PI / 4 + 0.05, Math.PI + (k + 1) * Math.PI / 4 - 0.05); ctx.stroke();
      }
    }
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3800, v.x + v.w + 20);
    if (ph === 'back') {
      // Gold flagstones, worn smooth down the middle of the hall
      ctx.fillStyle = '#a89060'; ctx.fillRect(x0, G - 16, x1 - x0, 16);
      ctx.fillStyle = 'rgba(255,240,200,0.18)'; ctx.fillRect(x0, G - 10, x1 - x0, 3);
      ctx.strokeStyle = 'rgba(60,44,20,0.35)'; ctx.lineWidth = 1;
      for (let jx = Math.ceil(x0 / 80) * 80; jx < x1; jx += 80) { ctx.beginPath(); ctx.moveTo(jx, G - 16); ctx.lineTo(jx - 6, G); ctx.stroke(); }
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 160);
    g.addColorStop(0, '#6a5a3a'); g.addColorStop(1, '#1a140a');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 160);
    ctx.fillStyle = '#8a7a58'; ctx.fillRect(x0, G, x1 - x0, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x0, G + 8, x1 - x0, 2);
    for (let jx = Math.ceil(x0 / 160) * 160; jx < x1; jx += 160) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(jx, G + 10, 2, 150); }
  }

  STORY_LEVELS[79] = {
    sky: ['#1a140a', '#2a2214'],
    groundColor: '#1a140a',
    platColor: '#8a7a58',
    sceneX: 2000,
    layout, backdrop, back, surface,
  };
})();
