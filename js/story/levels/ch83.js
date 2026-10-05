'use strict';
// js/story/levels/ch83.js — Chapter 83 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 83 — What You Carry (defense)
// The Fragment Core: a chamber in the Void Between where the Fallen God shows
// you the fragment as it actually is. It hangs over the resonance point (the
// nexus, x=450) as a crystal the size of a house. While the Fallen God talks
// it changes: at first gold, the way you were told to see it — then the gold
// peels away from a black core rimmed in violet, "crystallized Void Mind
// emission". Far behind it, past the membrane, the Mind itself is a dark mass
// on the horizon with the emission rising off it like heat off a reactor, and
// where the membrane is thin on both sides the emissions bleed through (that
// is where the waves come from). Crystal shards grown out of the floor are
// the ledges, two low and two high.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const SHARDS = [[90, 345, 130], [680, 345, 130], [290, 255, 110], [500, 255, 110]];

  function layout() {
    const P = [];
    for (const [x, y, w] of SHARDS) _slLedge(P, x, y, w);
    return P;
  }

  // 0 → 1 through the fight script: how much of the gold has come away
  function truth() {
    const n = (typeof storyFightScript !== 'undefined' && storyFightScript.length) || 6;
    const i = (typeof storyFightScriptIdx !== 'undefined') ? storyFightScriptIdx : 0;
    return Math.max(0, Math.min(1, (i - 1) / (n - 2)));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04020a');
    // The Mind on the horizon, emission rising off it like heat
    _slParallax(v, 0.06, (l, r) => {
      const cx = 450;
      ctx.fillStyle = '#0a0612';
      ctx.beginPath(); ctx.ellipse(cx, 400, 420, 90, 0, Math.PI, 0); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 24; k++) {
        const t = ((frameCount * 0.4 + k * 30) % 300) / 300, x = cx - 300 + _slHash(k + 830) * 600;
        ctx.strokeStyle = `rgba(150,80,220,${0.18 * (1 - t)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + Math.sin(t * 8 + k) * 10, 380 - t * 300); ctx.lineTo(x + Math.sin(t * 8 + k + 1) * 10, 360 - t * 300); ctx.stroke();
      }
      ctx.restore();
    });
  }

  function back(v) {
    const t = truth();
    // The membrane, thin at both sides where the emissions bleed through
    for (const [ex, dir] of [[0, 1], [900, -1]]) {
      const g = ctx.createLinearGradient(ex, 0, ex + dir * 120, 0);
      g.addColorStop(0, 'rgba(120,60,200,0.35)'); g.addColorStop(1, 'rgba(120,60,200,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(ex, ex + dir * 120), 40, 120, G - 40);
      for (let k = 0; k < 10; k++) {
        const p = ((frameCount * 0.8 + k * 25) % 120) / 120;
        ctx.fillStyle = `rgba(200,140,255,${0.6 * (1 - p)})`; ctx.fillRect(ex + dir * p * 120, 120 + _slHash(k + 831) * 300, 3, 3);
      }
    }
    // The fragment over the resonance point: gold, then the truth under it
    const cy = 170, H = 150;
    const facets = [[0, -H], [46, -H * 0.45], [38, H * 0.5], [0, H * 0.75], [-40, H * 0.45], [-48, -H * 0.4]];
    ctx.save(); ctx.translate(NX, cy + Math.sin(frameCount * 0.02) * 4);
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 200);
    halo.addColorStop(0, t < 0.5 ? `rgba(255,210,120,${0.3 * (1 - t)})` : `rgba(160,80,255,${0.3 * t})`); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(-200, -200, 400, 400);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#08040e';
    ctx.beginPath(); facets.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(190,120,255,${0.3 + 0.6 * t})`; ctx.lineWidth = 2; ctx.stroke();
    // The gold skin, peeling away from the bottom up as the truth comes out
    ctx.save(); ctx.beginPath(); ctx.rect(-60, -H - 10, 120, (H * 1.85 + 10) * (1 - t)); ctx.clip();
    ctx.fillStyle = 'rgba(232,196,110,0.92)';
    ctx.beginPath(); facets.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -H); ctx.lineTo(0, H * 0.75); ctx.moveTo(-48, -H * 0.4); ctx.lineTo(38, H * 0.5); ctx.stroke();
    ctx.restore();
    for (let k = 0; k < Math.round(t * 10); k++) {
      const p = ((frameCount + k * 20) % 120) / 120;
      ctx.fillStyle = `rgba(232,196,110,${1 - p})`; ctx.fillRect(-40 + _slHash(k + 832) * 80, H * 0.6 + p * 120, 5, 3);
    }
    ctx.restore();
    // Crystal shards grown out of the floor (the ledges)
    for (let i = 0; i < SHARDS.length; i++) {
      const [x, y, w] = SHARDS[i];
      ctx.fillStyle = '#1a1028';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 18, G); ctx.lineTo(x + 18, G); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(190,120,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.moveTo(x + w * 0.4, y); ctx.lineTo(x + w * 0.55, G); ctx.stroke();
    }
    ctx.fillStyle = '#1a1028'; ctx.fillRect(NX - 46, G - 30, 92, 30);
    ctx.fillStyle = 'rgba(190,120,255,0.7)'; ctx.fillRect(NX - 46, G - 30, 92, 2);
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#140c1e'; ctx.fillRect(v.x - 20, G - 12, v.w + 40, 12);
      ctx.fillStyle = 'rgba(190,120,255,0.3)'; ctx.fillRect(v.x - 20, G - 12, v.w + 40, 1);
      return;
    }
    const g = ctx.createLinearGradient(0, G, 0, G + 300);
    g.addColorStop(0, '#140c1e'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(v.x - 20, G, v.w + 40, 300);
    ctx.fillStyle = 'rgba(190,120,255,0.6)'; ctx.fillRect(v.x - 20, G, v.w + 40, 1.5);
  }

  STORY_LEVELS[83] = {
    sky: ['#04020a', '#100818'],
    groundColor: '#04020a',
    platColor: '#1a1028',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
