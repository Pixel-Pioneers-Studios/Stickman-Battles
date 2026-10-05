'use strict';
// js/story/levels/ch144.js — Chapter 144 map (story ARENA, boss). See smb-story-levels.js.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 144 — The Creator's Gate (boss vs the Creator's final construct)
// The Multiversal Core. "The rift was open. Not as a tear — as a door." It
// stands at the back of the arena, a doorway of white light taller than the
// screen, and "the Creator's final construct is the lock": six heavy latches
// clamp the door's frame, and they swing open one by one as the construct
// weakens. The Architects are "in position" — four lights at the corners of
// the door, in their colours. The floor is the core's white disc; the
// stepping stones are the void-arena layout the boss floor hazard was tuned
// for. Built on the Creator arena's boss rules.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 460, DX = 450;
  const STONES = [[350, 225, 200], [80, 295, 140], [680, 295, 140], [205, 378, 110], [585, 378, 110], [150, 152, 110], [640, 152, 110]];
  const ARCH = ['#88aacc', '#88cc66', '#88ccff', '#ccaa66'];

  function platforms() {
    const P = [{ x: 0, y: G, w: 900, h: 60, isFloor: true, isFloorDisabled: false, noDraw: true }];
    for (const [x, y, w] of STONES) P.push({ x, y, w, h: 16, noDraw: true });
    return P;
  }

  // 0 → 1 as the construct's health falls: how many latches have opened
  function unlocked() {
    const b = (typeof players !== 'undefined' ? players : []).find(p => p && p.isBoss);
    return b && b.maxHealth ? Math.max(0, Math.min(1, 1 - b.health / b.maxHealth)) : 0;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#080012');
    _slLattice(-40, v.y - 20, 980, G - v.y + 20, 0.08, 40);
    // The door of light
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(DX - 130, 0, DX + 130, 0);
    g.addColorStop(0, 'rgba(230,220,255,0.05)'); g.addColorStop(0.5, `rgba(250,248,255,${0.55 + 0.3 * unlocked()})`); g.addColorStop(1, 'rgba(230,220,255,0.05)');
    ctx.fillStyle = g; ctx.fillRect(DX - 130, v.y - 20, 260, G - v.y + 20); ctx.restore();
    ctx.strokeStyle = '#ece8f8'; ctx.lineWidth = 8; ctx.strokeRect(DX - 140, v.y - 40, 280, G - v.y + 40);
    // The Architects in position at the corners
    [[DX - 140, 60], [DX + 140, 60], [DX - 140, G - 20], [DX + 140, G - 20]].forEach(([x, y], i) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const r = ctx.createRadialGradient(x, y, 2, x, y, 30); r.addColorStop(0, ARCH[i]); r.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = r; ctx.fillRect(x - 30, y - 30, 60, 60); ctx.restore();
    });
    // The lock: six latches clamping the frame, opening as the construct weakens
    const open = Math.floor(unlocked() * 6.999);
    for (let k = 0; k < 6; k++) {
      const y = 60 + k * 64, isOpen = k < open, s = k % 2 ? 1 : -1, x = DX + s * 140;
      ctx.save(); ctx.translate(x, y); ctx.rotate(isOpen ? s * -1.2 : 0);
      ctx.fillStyle = isOpen ? 'rgba(120,100,200,0.5)' : '#7864c8'; ctx.fillRect(s > 0 ? -60 : 0, -8, 60, 16);
      ctx.restore();
    }
  }

  function back() {
    for (let i = 0; i < STONES.length; i++) {
      const [x, y, w] = STONES[i];
      ctx.fillStyle = '#d8d4e4';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 10, y + 16); ctx.lineTo(x + w / 2, y + 28 + _slHash(i + 1440) * 10); ctx.lineTo(x + 10, y + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7864c8'; ctx.fillRect(x, y, w, 3);
    }
  }

  function surface(v, a, ph) {
    if (ph === 'back') {
      ctx.fillStyle = '#ece8f8'; ctx.fillRect(-60, G - 12, 1020, 12);
      ctx.strokeStyle = 'rgba(120,100,200,0.6)'; ctx.lineWidth = 1.5; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(DX, G - 6, k * 130, 5, 0, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    ctx.fillStyle = '#1a1030'; ctx.fillRect(-400, G, 1700, 300); _slLattice(-60, G, 1020, 160, 0.25, 20);
    ctx.fillStyle = '#b8b4c8'; ctx.fillRect(0, G, 900, 4);
    _slBossFloor(0, 900, G);
  }

  STORY_LEVELS[144] = {
    sky: ['#080012', '#180030', '#2a1048'],
    groundColor: '#1a1030',
    platColor: '#d8d4e4',
    sceneX: 450,
    arena: { base: 'creator', platforms, props: { hasLava: false, deathY: 640 } },
    backdrop, back, surface,
  };
})();
