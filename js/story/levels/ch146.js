'use strict';
// js/story/levels/ch146.js — Chapter 146 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 146 — What It Built Here (scavenge, 4 echoes)
// Cosmic Axiom's domain, where "the absorbed fragment energies of every
// bearer who came before" are kept: ninety-four small lights set into the
// black ground and hanging in the air along the whole level, each a
// slightly different colour, each with a number — 1 to 94 — in faint light
// beside it. The echoes you collect stand with their own: the first
// bearer's echo by light number 1 at the entry; the forty-seventh's mark, a
// scratch cut into a dark shard by hand; a choice not made, two paths of
// light leading off the ground that both stop short; what remained, on a
// shard above the last light, 94. Dark shards are the climbs.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440;
  const MARK = [1150, 370, 110], FORK = 2000, LAST = [2745, 375, 110];
  const SHARDS = [[780, 350, 110], [900, 270, 110], [1600, 340, 110], [2300, 350, 100], [2420, 270, 110], [3150, 340, 110]];
  // Each bearer's light: x along the level, height, hue
  const LIGHTS = Array.from({ length: 94 }, (_, i) => [420 + i * 33, 140 + _slHash(i + 1460) * 260, Math.floor(_slHash(i + 1461) * 360)]);

  function layout() {
    const P = [];
    for (const [x, y, w] of [MARK, LAST, ...SHARDS]) _slLedge(P, x, y, w);
    return P;
  }

  function shard(x, y, w) {
    ctx.fillStyle = '#16121e'; ctx.beginPath(); ctx.moveTo(x + 6, G); ctx.lineTo(x, y + 4); ctx.lineTo(x + w * 0.4, y - 6); ctx.lineTo(x + w, y + 2); ctx.lineTo(x + w - 6, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,255,0.45)'; ctx.fillRect(x, y, w, 2);
  }

  function backdrop(v) {
    _slSkyAbove(v, '#000000');
    for (let k = 0; k < 80; k++) { ctx.fillStyle = `rgba(200,195,255,${0.15 + 0.3 * _slHash(k + 1462)})`; ctx.fillRect(v.x + _slHash(k + 1463) * v.w, v.y + _slHash(k + 1464) * (G - v.y), 1.5, 1.5); }
  }

  function back(v) {
    // Ninety-four lights, numbered
    ctx.font = '8px monospace'; ctx.textAlign = 'center';
    LIGHTS.forEach(([x, y, hue], i) => {
      if (!_slVisible(v, x - 20, x + 20)) return;
      const p = 0.6 + 0.4 * Math.sin(frameCount * 0.03 + i);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 1, x, y, 16); g.addColorStop(0, `hsla(${hue},80%,80%,${0.8 * p})`); g.addColorStop(1, `hsla(${hue},80%,60%,0)`);
      ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, 32, 32); ctx.restore();
      ctx.fillStyle = `hsla(${hue},40%,80%,0.35)`; ctx.fillText(String(i + 1), x, y + 22);
    });
    // The forty-seventh's mark: a scratch cut into a shard by hand
    if (_slVisible(v, MARK[0] - 20, MARK[0] + MARK[2] + 20)) {
      shard(...MARK);
      ctx.strokeStyle = 'rgba(230,220,255,0.7)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(MARK[0] + 30 + k * 8, MARK[1] + 12); ctx.lineTo(MARK[0] + 34 + k * 8, MARK[1] + 34); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(MARK[0] + 26, MARK[1] + 30); ctx.lineTo(MARK[0] + 66, MARK[1] + 16); ctx.stroke();
    }
    // A choice not made: two paths of light that both stop short
    if (_slVisible(v, FORK - 200, FORK + 200)) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,190,255,0.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(FORK - 160, G - 2); ctx.lineTo(FORK, G - 2); ctx.quadraticCurveTo(FORK + 40, G - 60, FORK + 70, G - 120); ctx.moveTo(FORK, G - 2); ctx.quadraticCurveTo(FORK + 60, G - 10, FORK + 150, G - 40); ctx.stroke();
      ctx.restore();
    }
    if (_slVisible(v, LAST[0] - 20, LAST[0] + LAST[2] + 20)) shard(...LAST);
    for (const [x, y, w] of SHARDS) if (_slVisible(v, x - 10, x + w + 10)) shard(x, y, w);
  }

  function surface(v, a, ph) {
    const x0 = Math.max(-200, v.x - 20), x1 = Math.min(3800, v.x + v.w + 20);
    if (ph === 'back') { ctx.fillStyle = '#1e1a2e'; ctx.fillRect(x0, G - 12, x1 - x0, 12); ctx.fillStyle = 'rgba(200,190,255,0.25)'; ctx.fillRect(x0, G - 12, x1 - x0, 1); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 220); g.addColorStop(0, '#16121e'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(x0, G, x1 - x0, 220);
  }

  STORY_LEVELS[146] = {
    sky: ['#000000', '#050505', '#0a0814'],
    groundColor: '#0a0814',
    platColor: '#16121e',
    sceneX: 3200,
    layout, backdrop, back, surface,
  };
})();
