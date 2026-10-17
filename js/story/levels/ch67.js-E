'use strict';
// js/story/levels/ch67.js — Chapter 67 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 67 — The Sealed Section (traversal)
// Past the door at the back of the main corridor, "sealed with a different
// access protocol. Not Axiom's. Older." The architecture changes at the
// threshold: Axiom's concrete gives way to green enamel panels, brass-ringed
// portholes and riveted ducts. Two blast doors stand open overhead; between
// them the decontamination chamber is "still cycling on automatic" — mist
// and spray jets, the floor sunk into a grated basin. The ducts and pipe
// runs are the high route. At the end: the suspension chamber, a
// floor-to-ceiling glass column full of preservation fluid, a figure inside.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const FLOOR = [[0, 900, 440], [900, 1300, 420], [1300, 1700, 460], [1700, 2000, 440], [2000, 2400, 420], [2400, 3200, 440]];
  const DUCTS = [[600, 340, 140], [740, 260, 100], [1450, 350, 120], [1560, 270, 100], [2150, 330, 120], [2260, 250, 120]];
  const DOORS = [900, 2000];
  const THRESH = 300, COLUMN = 2850;
  const base = x => { const f = FLOOR.find(([a, b]) => x >= a && x < b); return f ? f[2] : 440; };

  function floor() { return FLOOR.map(([x0, x1, y]) => _slFloorSeg(x0, y, x1 - x0, 600 - y)); }
  function layout() {
    const P = [];
    for (const [x, y, w] of DUCTS) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) { _slSkyAbove(v, '#0a0e0c'); }

  function back(v) {
    const x0 = Math.max(-200, v.x - 40), x1 = Math.min(3400, v.x + v.w + 40);
    // Axiom's concrete up to the threshold, the older section's enamel after
    if (x0 < THRESH) { ctx.fillStyle = '#3a3c3e'; ctx.fillRect(x0, 70, Math.min(THRESH, x1) - x0, 370); }
    if (x1 > THRESH) {
      const a0 = Math.max(THRESH, x0);
      ctx.fillStyle = '#3a4a42'; ctx.fillRect(a0, 70, x1 - a0, 370);
      for (let px = Math.ceil(a0 / 100) * 100; px < x1; px += 100) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px, 70, 2, 370);
        ctx.fillStyle = 'rgba(200,170,90,0.6)'; for (let ry = 90; ry < 430; ry += 40) ctx.fillRect(px + 4, ry, 3, 3);
      }
      // Brass portholes
      for (let k = Math.ceil(a0 / 300); k * 300 < x1; k++) {
        const hx = k * 300 + 150; if (Math.abs(hx - COLUMN) < 300) continue;
        ctx.fillStyle = '#b08a40'; ctx.beginPath(); ctx.arc(hx, 180, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10201a'; ctx.beginPath(); ctx.arc(hx, 180, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,200,170,0.2)'; ctx.beginPath(); ctx.arc(hx - 6, 174, 8, 0, Math.PI * 2); ctx.fill();
      }
    }
    // The threshold: where Axiom's sweep logs end
    if (_slVisible(v, THRESH - 60, THRESH + 60)) {
      ctx.fillStyle = '#b08a40'; ctx.fillRect(THRESH - 6, 70, 12, 370);
      ctx.fillStyle = 'rgba(255,90,60,0.8)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('AXIOM SWEEP: END OF LOG', THRESH - 90, 140);
    }
    // Blast doors standing open overhead
    for (const dx of DOORS) {
      if (!_slVisible(v, dx - 80, dx + 80)) continue;
      ctx.fillStyle = '#2a3430'; ctx.fillRect(dx - 70, 70, 140, 60);
      ctx.fillStyle = '#d8b030'; for (let k = 0; k < 5; k++) ctx.fillRect(dx - 64 + k * 28, 120, 14, 8);
      ctx.fillStyle = '#4a5a52'; ctx.fillRect(dx - 76, 70, 10, base(dx) - 70); ctx.fillRect(dx + 66, 70, 10, base(dx) - 70);
    }
    // Decontamination chamber: grated basin, spray jets, mist
    if (_slVisible(v, 1260, 1740)) {
      ctx.fillStyle = '#1a2420'; ctx.fillRect(1300, 440, 400, 20);
      ctx.strokeStyle = '#4a5a52'; ctx.lineWidth = 1; for (let gx = 1300; gx < 1700; gx += 12) { ctx.beginPath(); ctx.moveTo(gx, 448); ctx.lineTo(gx, 460); ctx.stroke(); }
      const cyc = (frameCount % 300) < 150;
      for (let k = 0; k < 6; k++) {
        const jx = 1330 + k * 66;
        ctx.fillStyle = '#5a6a62'; ctx.fillRect(jx - 6, 100, 12, 14);
        if (cyc) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,240,230,0.14)'; ctx.beginPath(); ctx.moveTo(jx - 4, 114); ctx.lineTo(jx + 4, 114); ctx.lineTo(jx + 30, 460); ctx.lineTo(jx - 30, 460); ctx.fill(); ctx.restore(); }
      }
      ctx.fillStyle = `rgba(210,235,225,${cyc ? 0.16 : 0.06})`; ctx.fillRect(1300, 300, 400, 160);
      ctx.fillStyle = cyc ? '#ff6644' : '#44ff88'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText(cyc ? 'DECON CYCLE' : 'CLEAR', 1500, 92);
    }
    // Riveted ducts and pipe runs: the high route
    for (const [x, y, w] of DUCTS) {
      if (!_slVisible(v, x - 10, x + w + 10)) continue;
      ctx.fillStyle = '#5a6a62'; ctx.fillRect(x, y, w, 16);
      ctx.fillStyle = 'rgba(200,170,90,0.6)'; for (let rx = x + 6; rx < x + w; rx += 14) ctx.fillRect(rx, y + 6, 2, 2);
      ctx.fillStyle = '#4a5a52'; ctx.fillRect(x + w / 2 - 5, y + 16, 10, 70);
    }
    // The suspension chamber: glass column, preservation fluid, a figure
    if (_slVisible(v, COLUMN - 200, COLUMN + 200)) {
      ctx.fillStyle = '#2a3430'; ctx.fillRect(COLUMN - 70, 70, 140, 30); ctx.fillRect(COLUMN - 70, 400, 140, 40);
      ctx.fillStyle = 'rgba(120,220,200,0.35)'; ctx.fillRect(COLUMN - 50, 100, 100, 300);
      ctx.strokeStyle = 'rgba(220,255,245,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(COLUMN - 50, 100, 100, 300);
      for (let k = 0; k < 8; k++) { const t = ((frameCount * 0.7 + k * 40) % 300) / 300; ctx.fillStyle = 'rgba(220,255,245,0.5)'; ctx.beginPath(); ctx.arc(COLUMN - 30 + _slHash(k) * 60, 400 - t * 300, 2, 0, Math.PI * 2); ctx.fill(); }
      const bob = Math.sin(frameCount * 0.02) * 3;
      ctx.strokeStyle = 'rgba(20,40,40,0.75)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(COLUMN, 180 + bob, 11, 0, Math.PI * 2); ctx.moveTo(COLUMN, 191 + bob); ctx.lineTo(COLUMN, 260 + bob); ctx.lineTo(COLUMN - 10, 320 + bob); ctx.moveTo(COLUMN, 260 + bob); ctx.lineTo(COLUMN + 10, 320 + bob); ctx.moveTo(COLUMN, 210 + bob); ctx.lineTo(COLUMN - 18, 250 + bob); ctx.moveTo(COLUMN, 210 + bob); ctx.lineTo(COLUMN + 18, 250 + bob); ctx.stroke();
      ctx.fillStyle = '#44ff88'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('STASIS: STABLE   O2: NOMINAL', COLUMN, 92);
    }
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -200, x1: THRESH, kind: 'tile', face: 'concrete' }, { x0: THRESH, x1: 3400, kind: 'tunnel', face: 'concrete' }]); }

  STORY_LEVELS[67] = {
    sky: ['#0a0e0c', '#1a2420'],
    groundColor: '#121a16',
    platColor: '#5a6a62',
    floor, layout, backdrop, back, surface,
  };
})();
