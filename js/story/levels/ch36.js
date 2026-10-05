'use strict';
// js/story/levels/ch36.js — Chapter 36 map. See smb-story-levels.js for the contract.

// ═════════════════════════════════════════════════════════════════════════════
// Chapter 36 — The Weight of the Core (defense)
// "The observation resonator is the only thing keeping the fragment stable.
// Creator probes are targeting it." A single-screen observation deck: the
// resonator (the nexus, x=450) hums on its tuning frame in front of a vast
// curved window onto the core's eye. Probes phase in through the window
// glass at both ends. The deck has a lower ring of instrument consoles, an
// upper ring of catwalks, and the window's crown arch on top. The resonator's
// standing wave is drawn on the window — it frays as the resonator is hit.
// ═════════════════════════════════════════════════════════════════════════════
(function () {
  const G = 440, NX = 450;
  const DECK = [[70, 350, 150], [680, 350, 150], [190, 255, 120], [590, 255, 120], [350, 165, 200]];

  function layout() {
    const P = [];
    for (const [x, y, w] of DECK) _slLedge(P, x, y, w);
    return P;
  }

  function backdrop(v) {
    _slSkyAbove(v, '#04020a');
    _slParallax(v, 0.04, (l, r) => {
      ctx.fillStyle = 'rgba(220,210,255,0.5)';
      for (let i = Math.floor(l / 22); i * 22 < r; i++) if (_slHash(i + 36) < 0.3) ctx.fillRect(i * 22 + _slHash(i) * 18, -200 + _slHash(i + 2) * 600, 1.2, 1.2);
      // The core's eye, filling the window
      const cx = l + (r - l) / 2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, 230, 20, cx, 230, 420);
      g.addColorStop(0, 'rgba(230,200,255,0.6)'); g.addColorStop(0.35, 'rgba(140,70,240,0.3)'); g.addColorStop(1, 'rgba(60,20,140,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 430, -190, 860, 840);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,160,255,0.3)'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cx, 230, 120 + k * 60, 40 + k * 18, frameCount * 0.002 * (k + 1), 0, Math.PI * 2); ctx.stroke(); }
    });
  }

  function back(v) {
    const hp = (typeof defenseNexusHP !== 'undefined' && typeof defenseNexusMaxHP !== 'undefined' && defenseNexusMaxHP) ? defenseNexusHP / defenseNexusMaxHP : 1;
    // Window frame: curved mullions over the core view
    ctx.strokeStyle = '#1e1830'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.ellipse(NX, G, 470, 420, 0, Math.PI, 0); ctx.stroke();
    ctx.lineWidth = 6;
    for (let k = 1; k < 8; k++) { const a = Math.PI + k / 8 * Math.PI; ctx.beginPath(); ctx.moveTo(NX + Math.cos(a) * 470, G + Math.sin(a) * 420); ctx.lineTo(NX + Math.cos(a) * 150, G + Math.sin(a) * 130); ctx.stroke(); }
    // Resonator's standing wave across the glass — frays as the resonator is hit
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(150,230,255,${0.25 + 0.3 * hp})`; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 900; x += 6) {
      const fray = (1 - hp) * 26 * (_slHash(x + (frameCount >> 2)) - 0.5);
      ctx.lineTo(x, 120 + Math.sin(x * 0.035 + frameCount * 0.08) * 26 * Math.sin(x / 900 * Math.PI) + fray);
    }
    ctx.stroke(); ctx.restore();
    // Probe entry points: the window glass rippling at both ends
    for (const ex of [30, 870]) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const t = ((frameCount + k * 20) % 80) / 80;
        ctx.strokeStyle = `rgba(200,140,255,${0.5 * (1 - t)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(ex, G - 70, 10 + t * 40, 30 + t * 60, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // Consoles (lower ring) and catwalks (upper ring, crown arch)
    for (const [x, y, w] of DECK) {
      ctx.fillStyle = '#2a2240'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = 'rgba(150,230,255,0.4)'; ctx.fillRect(x + 4, y + 10, w - 8, 2);
      if (y > 300) {
        ctx.fillStyle = '#1c1630'; ctx.fillRect(x + 10, y + 12, w - 20, G - y - 12);
        _slHolo(x + 20, y + 22, w - 40, 40, 200);
      } else {
        ctx.strokeStyle = '#2a2240'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, v.y - 10); ctx.moveTo(x + w - 10, y); ctx.lineTo(x + w - 10, v.y - 10); ctx.stroke();
      }
    }
    // The resonator's tuning frame (the nexus crystal itself is drawn by the mode)
    ctx.fillStyle = '#2a2240'; ctx.fillRect(NX - 44, G - 34, 88, 34);
    ctx.fillStyle = '#3a3058'; ctx.fillRect(NX - 52, G - 40, 104, 8);
    ctx.strokeStyle = '#3a3058'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(NX - 40, G - 40); ctx.lineTo(NX - 40, G - 130); ctx.moveTo(NX + 40, G - 40); ctx.lineTo(NX + 40, G - 130); ctx.stroke();
  }

  function surface(v, a, ph) { _slSurfaces(v, a, ph, [{ x0: -60, x1: 960, kind: 'tile', face: 'concrete' }]); }

  STORY_LEVELS[36] = {
    sky: ['#04020a', '#140a24'],
    groundColor: '#0a0614',
    platColor: '#2a2240',
    sceneX: 450,
    layout, backdrop, back, surface,
  };
})();
