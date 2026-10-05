'use strict';
// js/story/levels/ch70.js — Chapter 70 map (story ARENA, boss). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 70 — The Weight of What's Coming (boss teaser vs Axiom, one screen)
// The Threshold. "You step through the dimension wall. And stop. It's already
// there." The wall you came through stands at the left edge, a sheet of light
// with the tear still open in it. Ahead is a flat black plain to a horizon
// where the machinery turns — rings of white geometry, slow, enormous, the
// hum "you feel in your teeth before you hear it". The threshold stones float
// in the void-arena layout the boss floor hazard was tuned for. Seventeen
// hairline fractures run through the floor ("seventeen fractures of growth");
// they light as the encounter goes on, and when "the air pressure drops" the
// horizon rings close in. Built on the Creator arena's boss rules.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460, WALL = 34;
  const STONES = [[350, 225, 200], [80, 295, 140], [680, 295, 140], [205, 378, 110], [585, 378, 110], [150, 152, 110], [640, 152, 110]];
  const CRACKS = Array.from({ length: 17 }, (_, i) => 40 + i * 49 + _slHash(i + 700) * 20);

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of STONES) P.push({ x, y, w, h: 16, noDraw: true });
    return P;
  }

  // 0..1 through the fight script: lights the fractures, tightens the rings.
  function stage() {
    const n = (typeof storyFightScript !== 'undefined' && storyFightScript.length) || 6;
    const i = (typeof storyFightScriptIdx !== 'undefined') ? storyFightScriptIdx : 0;
    return Math.max(0, Math.min(1, i / n));
  }

  function backdrop(v) {
    _slSkyAbove(v, '#000000');
    const s = stage();
    // The machinery on the horizon: rings of white geometry turning
    _slParallax(v, 0.08, (l, r) => {
      const cx = 560, cy = 300 - s * 30;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const R = (260 - k * 38) * (1 - s * 0.25), t = frameCount * 0.002 * (k % 2 ? -1 : 1) + k;
        ctx.strokeStyle = `rgba(220,210,255,${0.10 + 0.04 * k + s * 0.08})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
        for (let j = 0; j < 12; j++) {
          const a = t + j * Math.PI / 6;
          ctx.fillStyle = `rgba(230,220,255,${0.25 + s * 0.2})`;
          ctx.fillRect(cx + Math.cos(a) * R - 3, cy + Math.sin(a) * R * 0.22 - 2, 6, 4);
        }
      }
      // The hum: faint vertical interference over the horizon
      for (let k = 0; k < 40; k++) {
        const x = l + _slHash(k + 70) * (r - l);
        ctx.fillStyle = `rgba(200,180,255,${0.03 + 0.03 * Math.sin(frameCount * 0.05 + k)})`;
        ctx.fillRect(x, 120, 1, 300);
      }
      ctx.restore();
    });
    // The plain running to the horizon
    const g = ctx.createLinearGradient(0, 330, 0, G);
    g.addColorStop(0, 'rgba(40,30,60,0)'); g.addColorStop(1, 'rgba(40,30,60,0.6)');
    ctx.fillStyle = g; ctx.fillRect(v.x - 10, 330, v.w + 20, G - 330);
    ctx.strokeStyle = 'rgba(200,190,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(v.x - 10, 330); ctx.lineTo(v.x + v.w + 10, 330); ctx.stroke();
  }

  function back(v) {
    const s = stage();
    // The dimension wall you stepped through, the tear still open
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const wg = ctx.createLinearGradient(0, 0, WALL + 40, 0);
    wg.addColorStop(0, 'rgba(180,160,255,0.35)'); wg.addColorStop(1, 'rgba(180,160,255,0)');
    ctx.fillStyle = wg; ctx.fillRect(0, -40, WALL + 40, G + 40);
    for (let y = 0; y < G; y += 6) {
      ctx.fillStyle = `rgba(220,210,255,${0.12 + 0.1 * Math.sin(y * 0.08 + frameCount * 0.07)})`;
      ctx.fillRect(WALL - 4 + Math.sin(y * 0.05 + frameCount * 0.03) * 3, y, 3, 4);
    }
    ctx.restore();
    ctx.fillStyle = '#05030a';
    ctx.beginPath(); ctx.ellipse(WALL, G - 70, 16, 64, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(230,220,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Pressure: the air itself bending in toward the centre of the arena
    if (s > 0.7) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const t = ((frameCount + k * 40) % 120) / 120;
        ctx.strokeStyle = `rgba(255,90,90,${0.25 * t})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(450, 300, 520 * (1 - t), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // Threshold stones: black slabs with white rim light, fractured undersides
    for (let i = 0; i < STONES.length; i++) {
      const [x, y, w] = STONES[i];
      ctx.fillStyle = '#0a0810';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 10, y + 16);
      for (let k = 5; k >= 0; k--) ctx.lineTo(x + 10 + (w - 20) * k / 5, y + 16 + 8 + _slHash(i * 9 + k) * 22);
      ctx.lineTo(x + 10, y + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(240,236,255,0.85)'; ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = 'rgba(200,190,255,0.15)'; ctx.fillRect(x, y + 2, w, 4);
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(-60, G - 12, 1020, 12);
      ctx.fillStyle = 'rgba(240,236,255,0.35)'; ctx.fillRect(-60, G - 12, 1020, 1);
      return;
    }
    const s = stage();
    const g = ctx.createLinearGradient(0, G, 0, G + 300);
    g.addColorStop(0, '#120e1a'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(-400, G, 1700, 300);
    ctx.fillStyle = 'rgba(240,236,255,0.6)'; ctx.fillRect(0, G, 900, 1.5);
    // The seventeen fractures, lighting one by one as it measures you
    const lit = Math.round(s * 17);
    for (let i = 0; i < 17; i++) {
      const pts = _slJag(CRACKS[i], G + 2, CRACKS[i] + 14, G + 56, 5, 6, 710 + i);
      ctx.strokeStyle = i < lit ? `rgba(210,120,255,${0.55 + 0.3 * Math.sin(frameCount * 0.08 + i)})` : 'rgba(120,110,150,0.35)';
      ctx.lineWidth = i < lit ? 2 : 1;
      ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
    _slBossFloor(0, 900, G);
  }

  STORY_LEVELS[70] = {
    sky: ['#000000', '#0a0614'],
    groundColor: '#06040a',
    platColor: '#0a0810',
    platEdge: '#f0ecff',
    sceneX: 450,
    arena: { base: 'creator', platforms, props: { hasLava: false, deathY: 640 } },
    backdrop, back, surface,
  };
})();
