'use strict';
// js/story/levels/ch158.js — Chapter 158 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 158 — The Architecture (escape, run right)
// The interior of God's domain: "built. Deliberately, with full knowledge of
// what it was", "by someone who understood load". Everything here carries
// weight visibly — arches stacked on arches, buttresses leaning in, columns
// whose capitals spread the load into the vaults, all in warm white stone
// lit gold from nowhere in particular. The domain "is braced around
// Axiom's every step": as you run, the nearest arches flex and their
// keystones glow, the structure tightening around the intruder. The floor is
// the great nave in sections with short gaps where floor slabs have lifted
// away. Sovereign's trail runs straight through it. The Center at the end is
// a vault of brighter light. Cornices are the high routes.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const NAVE = [[0, 1050, 440], [1110, 2000, 440], [2060, 3100, 432], [3160, 4100, 440], [4160, 4800, 440]];
  const CORN = [[700, 340, 110], [1500, 330, 110], [1630, 250, 110], [2500, 340, 110], [3500, 330, 110], [3630, 250, 110], [4400, 340, 110]];
  const CENTER = 4500;

  function floor() { return NAVE.map(([x0, x1, y]) => Object.assign(_slFloorSeg(x0, y, x1 - x0, 600 - y), { noDraw: true })); }
  function layout() {
    const P = [];
    for (const [x, y, w] of CORN) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#f0e4c0');
    // Arches stacked on arches, far back
    _slParallax(v, 0.2, (l, r) => {
      for (let tier = 0; tier < 3; tier++) {
        const y = 380 - tier * 120, span = 160 - tier * 30;
        for (let x = Math.floor(l / span) * span - span; x < r + span; x += span) {
          ctx.strokeStyle = `rgba(200,170,110,${0.25 + tier * 0.1})`; ctx.lineWidth = 10 - tier * 2;
          ctx.beginPath(); ctx.moveTo(x, y + 60); ctx.lineTo(x, y); ctx.arc(x + span / 2, y, span / 2, Math.PI, 0); ctx.lineTo(x + span, y + 60); ctx.stroke();
        }
      }
    });
  }

  function back(v) {
    const p1 = (typeof players !== 'undefined' && players[0]) || null;
    // Columns and arches of the nave; the nearest flex and their keystones glow
    for (let x = Math.floor(v.x / 260) * 260; x < v.x + v.w + 260; x += 260) {
      if (x < 0 || x > 4800) continue;
      const near = p1 ? Math.max(0, 1 - Math.abs(p1.cx() - (x + 130)) / 300) : 0, flex = near * Math.sin(frameCount * 0.3) * 2;
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 16, 140, 32, 300); ctx.fillRect(x + 244, 140, 32, 300);
      ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x - 26, 132, 52, 14);
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(x + 130, 140 + flex, 130, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = near > 0.2 ? `rgba(255,200,90,${0.5 + 0.5 * near})` : '#c8b080'; ctx.fillRect(x + 120, 2 + flex, 20, 18);
      // Buttress leaning in from outside
      ctx.fillStyle = 'rgba(216,200,160,0.5)'; ctx.beginPath(); ctx.moveTo(x - 16, 300); ctx.lineTo(x - 70, 440); ctx.lineTo(x - 40, 440); ctx.lineTo(x - 16, 340); ctx.fill();
    }
    // Sovereign's trail straight through the nave
    for (let x = Math.ceil((v.x - 40) / 70) * 70; x < v.x + v.w + 40; x += 70) { ctx.fillStyle = 'rgba(80,40,40,0.45)'; ctx.beginPath(); ctx.ellipse(x + ((x / 70) % 2 ? 8 : -8), 438, 9, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const [x, y, w] of CORN) if (_slVisible(v, x - 10, x + w + 10)) { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x, y, w, 14); ctx.fillStyle = '#c89820'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x + w / 2 - 8, y + 14, 16, 30); }
    if (_slVisible(v, CENTER - 200, CENTER + 400)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(CENTER + 150, 260, 10, CENTER + 150, 260, 300); g.addColorStop(0, 'rgba(255,250,220,0.6)'); g.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = g; ctx.fillRect(CENTER - 150, -40, 600, 520); ctx.restore();
    }
  }

  function surface(v, a, ph) {
    for (const [x0, x1, y] of NAVE) {
      if (!_slVisible(v, x0 - 20, x1 + 20)) continue;
      if (ph === 'back') { ctx.fillStyle = '#efe6cc'; ctx.fillRect(x0, y - 12, x1 - x0, 12); ctx.strokeStyle = 'rgba(160,130,80,0.35)'; ctx.lineWidth = 1; for (let x = Math.ceil(x0 / 80) * 80; x < x1; x += 80) { ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x - 6, y); ctx.stroke(); } continue; }
      const g = ctx.createLinearGradient(0, y, 0, y + 140); g.addColorStop(0, '#d8c8a0'); g.addColorStop(1, '#6a5a38');
      ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, 140);
      ctx.fillStyle = '#c89820'; ctx.fillRect(x0, y, x1 - x0, 3);
    }
  }

  STORY_LEVELS[158] = {
    sky: ['#f0e4c0', '#d8c090', '#8a6a3a'],
    groundColor: '#6a5a38',
    platColor: '#e8dcc0',
    noGroundFill: true,
    sceneX: 500,
    floor, layout, backdrop, back, surface,
  };
})();
