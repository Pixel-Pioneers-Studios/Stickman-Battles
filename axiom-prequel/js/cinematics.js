'use strict';

// ─── Cinematic system ─────────────────────────────────────────────────────────
// Two modes:
//   'cards'   — sequential full-screen text cards (pre/post chapter)
//   'ending'  — the portal ending sequence (final chapter)

let cinState = null;
// {
//   mode: 'cards' | 'ending',
//   cards: [...],        // for 'cards' mode
//   cardIdx: 0,
//   cardTimer: 0,
//   cardPause: 2600,     // ms per card (overridden per card)
//   fadeAlpha: 0,
//   fadeDir: 1,          // 1=fade in | -1=fade out
//   onComplete: fn,
// }

let _endingPhase   = 0;   // 0-8 ending beats
let _endingTimer   = 0;
let _endingAlpha   = 0;
let _portalPulse   = 0;

// ─── Entry points ─────────────────────────────────────────────────────────────

function startPreText(chapterIdx, onComplete) {
  const ch = CHAPTERS[chapterIdx];
  if (!ch || !ch.preText || ch.preText.length === 0) { onComplete(); return; }
  _startCards(ch.preText, onComplete);
}

function startPostText(chapterIdx, onComplete) {
  const ch = CHAPTERS[chapterIdx];
  if (!ch) { onComplete(); return; }
  if (ch.isEnding) { startEnding(); return; }
  if (!ch.postText) { onComplete(); return; }
  _startCards(ch.postText, onComplete);
}

function startEnding() {
  gamePhase   = 'ending';
  _endingPhase = 0;
  _endingTimer = 0;
  _endingAlpha = 0;
}

// ─── Cards implementation ─────────────────────────────────────────────────────

function _startCards(cards, onComplete) {
  cinState = {
    mode:       'cards',
    cards,
    cardIdx:    0,
    cardTimer:  0,
    cardPause:  cards[0]?.pause ?? 2600,
    fadeAlpha:  0,
    fadeDir:    1,
    onComplete,
  };
  gamePhase = 'cinematic';
}

function updateCinematic() {
  if (gamePhase === 'ending') { _updateEnding(); return; }
  if (!cinState || cinState.mode !== 'cards') return;

  const c = cinState;
  c.cardTimer++;

  // Fade in
  if (c.fadeDir === 1) {
    c.fadeAlpha = Math.min(1, c.fadeAlpha + 0.04);
  }

  // Hold → fade out
  const holdFrames = Math.floor(c.cardPause / (1000 / 60));
  if (c.cardTimer > holdFrames) {
    c.fadeAlpha = Math.max(0, c.fadeAlpha - 0.05);
    if (c.fadeAlpha <= 0) {
      c.cardIdx++;
      if (c.cardIdx >= c.cards.length) {
        // Done
        cinState  = null;
        gamePhase = 'playing';
        c.onComplete();
        return;
      }
      c.cardTimer = 0;
      c.cardPause = c.cards[c.cardIdx]?.pause ?? 2600;
      c.fadeDir   = 1;
    }
  }

  // Skip with confirm
  if (just('confirm') && c.cardTimer > 15) {
    c.cardTimer = holdFrames + 1;
  }
}

function drawCinematic() {
  if (gamePhase === 'ending') { _drawEnding(); return; }
  if (!cinState || cinState.mode !== 'cards') return;

  const c    = cinState;
  const card = c.cards[c.cardIdx];
  if (!card) return;

  // Black overlay
  ctx.fillStyle   = '#000';
  ctx.globalAlpha = 0.94;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalAlpha = c.fadeAlpha;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur  = 18;

  // Main text — larger + high contrast
  ctx.fillStyle = '#f0eedd';
  ctx.font      = 'bold 30px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(card.text, GAME_W / 2, GAME_H / 2 - (card.sub ? 24 : 0));

  // Sub-line
  if (card.sub) {
    ctx.fillStyle = '#999988';
    ctx.font      = '17px Courier New';
    ctx.shadowBlur = 8;
    ctx.fillText(card.sub, GAME_W / 2, GAME_H / 2 + 22);
  }

  ctx.shadowBlur = 0;
  ctx.restore();

  // Skip hint — larger + more visible
  if (c.cardTimer > 30) {
    ctx.fillStyle = 'rgba(160,150,120,0.6)';
    ctx.font      = '13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('[J]  continue', GAME_W / 2, GAME_H - 28);
  }

  ctx.globalAlpha = 1;
}

// ─── Ending cinematic ─────────────────────────────────────────────────────────
// Beats:
//   0 — blackout fades up; portal glow and all four silhouettes at the edge
//   1 — "He stepped through."  — Axiom's silhouette enters the portal; burst flash
//   2 — darkness; only three companions remain at the edge; void cracks seep in
//   3 — "He kept his name."
//   4 — "That was all he kept."
//   5 — inside the void: a tiny figure falls; something distant resolves, already facing us
//   6 — "The void was not empty."
//   7 — "Something had been there first."
//   8 — "It watched him fall. It did not move."  — the watcher's eyes open
//   9 — "It saw a man who could build."
//  10 — "It filed him: useful."
//  11 — the watcher recedes into the dark (never gone — just unlit)
//  12 — "The others followed."  — silhouettes of the three companions one by one
//  13 — "They kept their names too."
//  14 — void fully present; long silence
//  15 — "None of them ever said each other's names again."
//  16 — "Something in the dark remembered every name."
//  17 — credits / restart prompt
//
// The watcher (beats 5–11) is the presence that was already in the void when
// they broke through — never named here. It did not wake, because it was never
// asleep. The main game will call it Sovereign.

const ENDING_BEATS = [
  { dur: 150, text: null },
  { dur: 200, text: 'He stepped through.' },
  { dur: 320, text: null },
  { dur: 230, text: 'He kept his name.' },
  { dur: 230, text: 'That was all he kept.' },
  { dur: 300, text: null },
  { dur: 220, text: 'The void was not empty.' },
  { dur: 230, text: 'Something had been there first.' },
  { dur: 260, text: 'It watched him fall. It did not move.' },
  { dur: 230, text: 'It saw a man who could build.' },
  { dur: 260, text: 'It filed him: useful.' },
  { dur: 180, text: null },
  { dur: 210, text: 'The others followed.' },
  { dur: 210, text: 'They kept their names too.' },
  { dur: 400, text: null },
  { dur: 300, text: 'None of them ever said each other\'s names again.' },
  { dur: 280, text: 'Something in the dark remembered every name.' },
  { dur: Infinity, text: null },   // credits
];

// Void crack segments — grow in during middle phases
const _voidCracks = [];
let _voidCrackSeed = 0;

function _initVoidCracks() {
  _voidCracks.length = 0;
  _voidCrackSeed = 0;
  const origins = [
    [0, 0], [GAME_W, 0], [0, GAME_H], [GAME_W, GAME_H],
    [GAME_W * 0.2, 0], [GAME_W * 0.8, 0],
    [0, GAME_H * 0.3], [GAME_W, GAME_H * 0.7],
  ];
  for (let i = 0; i < origins.length; i++) {
    const [ox, oy] = origins[i];
    const cx = GAME_W / 2, cy = GAME_H / 2;
    const angle = Math.atan2(cy - oy, cx - ox) + (Math.random() - 0.5) * 0.8;
    const segs = [];
    let x = ox, y = oy;
    for (let s = 0; s < 6; s++) {
      const len  = 28 + Math.random() * 42;
      const dev  = (Math.random() - 0.5) * 0.6;
      x += Math.cos(angle + dev) * len;
      y += Math.sin(angle + dev) * len;
      segs.push({ x, y });
    }
    _voidCracks.push({ ox, oy, segs, life: 0, maxLife: segs.length * 18 + 60 });
  }
}

function _updateEnding() {
  _endingTimer++;
  _portalPulse += 0.04;

  if (_endingPhase === 2 && _endingTimer === 1) _initVoidCracks();

  // Grow void cracks in phases 2–16
  if (_endingPhase >= 2 && _endingPhase <= 16) {
    for (const c of _voidCracks) { if (c.life < c.maxLife) c.life++; }
  }

  const beat = ENDING_BEATS[_endingPhase];
  if (!beat) return;

  if (beat.dur !== Infinity && _endingTimer >= beat.dur) {
    _endingPhase++;
    _endingTimer  = 0;
  }

  // Final beat has dur Infinity, so _endingPhase parks at length-1 — the credits.
  if (_endingPhase >= ENDING_BEATS.length - 1 && _endingTimer > 60) {
    if (just('confirm') || just('back')) {
      gamePhase = 'menu';
    }
  }
}

// ── Silhouette helpers ────────────────────────────────────────────────────────

function _drawSilhouette(sx, sy, scale, alpha, color) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 2.5 * scale;
  ctx.lineCap     = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(sx, sy - 22 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(sx, sy - 15 * scale);
  ctx.lineTo(sx, sy + 5 * scale);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(sx, sy - 10 * scale);
  ctx.lineTo(sx - 12 * scale, sy - 1 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy - 10 * scale);
  ctx.lineTo(sx + 12 * scale, sy - 1 * scale);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(sx, sy + 5 * scale);
  ctx.lineTo(sx - 9 * scale, sy + 24 * scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy + 5 * scale);
  ctx.lineTo(sx + 9 * scale, sy + 24 * scale);
  ctx.stroke();

  ctx.restore();
}

// ── Void crack draw ───────────────────────────────────────────────────────────

function _drawVoidCracks(alpha) {
  if (!_voidCracks.length) return;
  ctx.save();
  ctx.strokeStyle = `rgba(100,60,200,${alpha * 0.55})`;
  ctx.lineWidth   = 1.2;
  ctx.shadowColor = `rgba(80,40,180,${alpha * 0.7})`;
  ctx.shadowBlur  = 6;

  for (const c of _voidCracks) {
    if (c.life <= 0) continue;
    const segsDrawn = Math.min(c.segs.length, Math.floor(c.life / 18));
    if (segsDrawn === 0) continue;
    ctx.beginPath();
    ctx.moveTo(c.ox, c.oy);
    for (let s = 0; s < segsDrawn; s++) ctx.lineTo(c.segs[s].x, c.segs[s].y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function _drawEnding() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  const phase = _endingPhase;
  const GCX   = GAME_W / 2;
  const GCY   = GAME_H * 0.52;

  // ── Phase 0: Portal glow grows + four silhouettes at the edge ────────────────
  if (phase === 0) {
    const progress = _endingTimer / ENDING_BEATS[0].dur;
    const glow     = progress;
    const pr       = 90 + Math.sin(_portalPulse) * 12;

    ctx.save();
    const gr = ctx.createRadialGradient(GCX, GCY, 0, GCX, GCY, 240);
    gr.addColorStop(0, `rgba(100,70,220,${glow * 0.8})`);
    gr.addColorStop(0.4, `rgba(40,20,100,${glow * 0.45})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    for (let r = 0; r < 4; r++) {
      const radius = pr + r * 38 + Math.sin(_portalPulse + r * 0.8) * 10;
      ctx.globalAlpha = glow * (0.35 - r * 0.07);
      ctx.strokeStyle = r % 2 === 0 ? '#8866ff' : '#6644cc';
      ctx.lineWidth   = 2 - r * 0.3;
      ctx.beginPath();
      ctx.arc(GCX, GCY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Four silhouettes: Axiom closest, companions behind
    const sAlpha = glow * 0.85;
    const ground = GAME_H * 0.73;
    _drawSilhouette(GCX - 10,      ground, 1.0, sAlpha, '#c8c0d0');
    _drawSilhouette(GCX - 70,      ground, 0.85, sAlpha * 0.8, '#887799');
    _drawSilhouette(GCX + 55,      ground, 0.82, sAlpha * 0.8, '#887799');
    _drawSilhouette(GCX - 30,      ground - 4, 0.78, sAlpha * 0.75, '#776688');
  }

  // ── Phase 1: "He stepped through." — Axiom entering the portal ──────────────
  if (phase === 1) {
    const t       = _endingTimer / ENDING_BEATS[1].dur;
    const enterPr = Math.min(1, _endingTimer / 60);   // how far he's gone in
    const burst   = _endingTimer < 25 ? (1 - _endingTimer / 25) : 0;

    // Portal glow (fades as he enters)
    const glow = 1 - enterPr * 0.5;
    ctx.save();
    const gr = ctx.createRadialGradient(GCX, GCY, 0, GCX, GCY, 200);
    gr.addColorStop(0, `rgba(140,100,255,${glow * 0.9})`);
    gr.addColorStop(0.5, `rgba(50,30,140,${glow * 0.5})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Portal burst flash
    if (burst > 0) {
      ctx.fillStyle = `rgba(200,180,255,${burst * 0.55})`;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    // Axiom walking into portal — silhouette fades as he enters
    const axiomAlpha = Math.max(0, 1 - enterPr * 1.4);
    const ground = GAME_H * 0.73;
    _drawSilhouette(GCX - 10 + enterPr * 22, ground, 1.0, axiomAlpha, '#c8c0d0');

    // Three companions watching
    _drawSilhouette(GCX - 70,  ground, 0.85, 0.7, '#887799');
    _drawSilhouette(GCX + 55,  ground, 0.82, 0.7, '#887799');
    _drawSilhouette(GCX - 30,  ground - 4, 0.78, 0.65, '#776688');

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Phases 2–4: Void seeps in; three companions at the edge ─────────────────
  if (phase >= 2 && phase <= 4) {
    const voidAlpha = Math.min(0.9, (phase - 2) * 0.22 + _endingTimer * 0.0006);
    _drawVoidCracks(voidAlpha);

    // Three companions — slightly dimmer each phase
    const cAlpha = Math.max(0.15, 0.65 - (phase - 2) * 0.12);
    const ground = GAME_H * 0.73;
    _drawSilhouette(GCX - 70,  ground, 0.85, cAlpha, '#887799');
    _drawSilhouette(GCX + 55,  ground, 0.82, cAlpha, '#887799');
    _drawSilhouette(GCX - 30,  ground - 4, 0.78, cAlpha * 0.9, '#776688');
  }

  // ── Phases 5–11: inside the void — something was already there ──────────────
  if (phase >= 5 && phase <= 11) {
    _drawVoidCracks(0.4);

    // Deep interior: near-black with a cold violet breath at the centre
    const iv = ctx.createRadialGradient(GCX, GCY, 0, GCX, GCY, GAME_H * 0.9);
    iv.addColorStop(0, 'rgba(30,18,55,0.30)');
    iv.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = iv;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Axiom falling — a tiny drifting figure, phases 5–8
    if (phase <= 8) {
      const fallProg = Math.min(1, ((phase - 5) + _endingTimer / ENDING_BEATS[phase].dur) / 4);
      const fx = GCX - GAME_W * 0.16 + Math.sin(fallProg * 5.2) * 14;
      const fy = GAME_H * 0.16 + fallProg * GAME_H * 0.5;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(fallProg * 1.9);
      _drawSilhouette(0, 0, 0.42, 0.32, '#c8c0d0');
      ctx.restore();
    }

    // The watcher — still, distant, already facing this way. Resolves through
    // phase 5, holds, recedes in phase 11. It does not move. That is the point.
    const t = _endingTimer / ENDING_BEATS[phase].dur;
    let wAlpha;
    if (phase === 5)       wAlpha = Math.min(0.5, t * 0.6);
    else if (phase === 11) wAlpha = Math.max(0, 0.5 - t * 0.6);
    else                   wAlpha = 0.5;

    if (wAlpha > 0.01) {
      const wx = GCX + GAME_W * 0.21;
      const wy = GAME_H * 0.40;
      // Faint aura — barely there, like the dark is slightly denser around it
      const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, 70);
      wg.addColorStop(0, `rgba(120,20,40,${wAlpha * 0.16})`);
      wg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(wx, wy, 70, 0, Math.PI * 2);
      ctx.fill();

      _drawSilhouette(wx, wy, 0.9, wAlpha, '#3a1420');

      // Eyes open at "It watched him fall." — two ember points, unblinking
      if (phase >= 8) {
        const eA = phase === 8 ? Math.min(1, t * 3) : (phase === 11 ? wAlpha * 2 : 1);
        // "It filed him: useful." — the embers sharpen once
        const eBright = phase === 10 ? 0.85 + Math.min(0.15, t * 0.4) : 0.7;
        ctx.save();
        ctx.shadowColor = `rgba(255,60,80,${eA * 0.9})`;
        ctx.shadowBlur  = 7;
        ctx.fillStyle   = `rgba(255,80,95,${eA * eBright})`;
        ctx.beginPath(); ctx.arc(wx - 2.6, wy - 20, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wx + 2.6, wy - 20, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  // ── Phases 12–13: "The others followed." — silhouettes entering one by one ──
  if (phase === 12 || phase === 13) {
    _drawVoidCracks(0.75);
    const t = _endingTimer / ENDING_BEATS[phase].dur;
    const ground = GAME_H * 0.73;
    // Show progressively fewer companions as they step through
    const remaining = phase === 12 ? (t < 0.45 ? 3 : t < 0.75 ? 2 : 1) : 0;
    if (remaining >= 3) _drawSilhouette(GCX - 70, ground, 0.85, 0.55, '#887799');
    if (remaining >= 2) _drawSilhouette(GCX + 55, ground, 0.82, 0.55, '#887799');
    if (remaining >= 1) _drawSilhouette(GCX - 30, ground - 4, 0.78, 0.5, '#776688');

    // Brief portal flash each time one steps through
    if (phase === 12) {
      const flashThresholds = [0.45, 0.75];
      for (const ft of flashThresholds) {
        const diff = Math.abs(t - ft);
        if (diff < 0.06) {
          const f = 1 - diff / 0.06;
          ctx.fillStyle = `rgba(120,90,220,${f * 0.35})`;
          ctx.fillRect(0, 0, GAME_W, GAME_H);
        }
      }
    }
  }

  // ── Phases 14–16: Complete void; long silence ────────────────────────────────
  if (phase >= 14 && phase <= 16) {
    _drawVoidCracks(0.85);
    // Deep void vignette
    const vg = ctx.createRadialGradient(GCX, GCY, 80, GCX, GCY, GAME_H * 0.8);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(8,4,18,0.65)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // The last line earns two ember points in the far dark — still watching
    if (phase === 16) {
      const t  = _endingTimer / ENDING_BEATS[16].dur;
      const eA = Math.min(0.8, t * 1.6);
      ctx.save();
      ctx.shadowColor = `rgba(255,60,80,${eA})`;
      ctx.shadowBlur  = 6;
      ctx.fillStyle   = `rgba(255,80,95,${eA})`;
      ctx.beginPath(); ctx.arc(GCX + GAME_W * 0.30 - 2.4, GAME_H * 0.30, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(GCX + GAME_W * 0.30 + 2.4, GAME_H * 0.30, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Text beats ───────────────────────────────────────────────────────────────
  const beat = ENDING_BEATS[Math.min(phase, ENDING_BEATS.length - 1)];
  if (beat && beat.text) {
    const fadeIn  = Math.min(1, _endingTimer / 45);
    const dur     = beat.dur !== Infinity ? beat.dur : 9999;
    const fadeOut = _endingTimer > dur - 35 ? (_endingTimer - (dur - 35)) / 35 : 0;
    const alpha   = fadeIn * (1 - Math.min(1, fadeOut));

    ctx.save();
    ctx.globalAlpha  = alpha;
    ctx.shadowColor  = 'rgba(0,0,0,1)';
    ctx.shadowBlur   = 16;
    // Final lines get extra weight; the watcher's beats run colder
    const isFinal   = phase === 15 || phase === 16;
    const isWatcher = phase >= 6 && phase <= 10;
    ctx.fillStyle = isFinal ? '#eeecdd' : isWatcher ? '#c8b4bc' : '#d8d5c8';
    ctx.font      = `${isFinal ? 'bold ' : ''}${isFinal ? 22 : 24}px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText(beat.text, GCX, GAME_H * 0.47);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Credits ───────────────────────────────────────────────────────────────────
  if (phase >= ENDING_BEATS.length - 1) {
    const fadeIn = Math.min(1, _endingTimer / 90);
    ctx.save();
    ctx.globalAlpha = fadeIn;
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur  = 12;
    ctx.textAlign   = 'center';

    ctx.fillStyle = `rgba(180,170,150,${fadeIn * 0.85})`;
    ctx.font      = 'bold 44px Courier New';
    ctx.fillText('A X I O M', GCX, GAME_H * 0.42);

    ctx.fillStyle = `rgba(100,90,70,${fadeIn * 0.7})`;
    ctx.font      = '14px Courier New';
    ctx.fillText('a prequel', GCX, GAME_H * 0.42 + 32);

    ctx.fillStyle = 'rgba(50,40,30,0.9)';
    ctx.fillRect(GCX - 90, GAME_H * 0.42 + 50, 180, 1);

    if (fadeIn > 0.5) {
      ctx.globalAlpha = (fadeIn - 0.5) * 2 * 0.45;
      ctx.fillStyle   = '#665544';
      ctx.font        = '11px Courier New';
      ctx.fillText('Anders.  Seraph.  VAEL.', GCX, GAME_H * 0.42 + 72);
    }

    if (_endingTimer > 130) {
      ctx.globalAlpha = Math.min(1, (_endingTimer - 130) / 40) * 0.45;
      ctx.fillStyle   = 'rgba(120,110,90,0.8)';
      ctx.font        = '11px Courier New';
      ctx.fillText('[J]  RETURN TO MENU', GCX, GAME_H - 30);
    }
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─── Chapter title card state (drawn in rendering.js) ────────────────────────
let titleCardTimer = 0;

function showChapterTitle() { titleCardTimer = 180; }
function updateChapterTitle() { if (titleCardTimer > 0) titleCardTimer--; }
