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
//   0 — blackout, portal glow grows
//   1 — "He stepped through."
//   2 — darkness  (long beat)
//   3 — "He kept his name."
//   4 — "That was all he kept."
//   5 — (long silence)
//   6 — "The others followed."
//   7 — "They kept their names too."
//   8 — (very long silence)
//   9 — "None of them ever said each other's names again."
//  10 — credits / restart prompt

const ENDING_BEATS = [
  { dur: 120, text: null },
  { dur: 200, text: 'He stepped through.' },
  { dur: 300, text: null },
  { dur: 220, text: 'He kept his name.' },
  { dur: 220, text: 'That was all he kept.' },
  { dur: 380, text: null },
  { dur: 200, text: 'The others followed.' },
  { dur: 200, text: 'They kept their names too.' },
  { dur: 460, text: null },
  { dur: 280, text: 'None of them ever said each other\'s names again.' },
  { dur: Infinity, text: null },   // credits
];

function _updateEnding() {
  _endingTimer++;
  _portalPulse += 0.04;

  const beat = ENDING_BEATS[_endingPhase];
  if (!beat) return;

  if (beat.dur !== Infinity && _endingTimer >= beat.dur) {
    _endingPhase++;
    _endingTimer  = 0;
  }

  // In credits phase, allow restart
  if (_endingPhase >= ENDING_BEATS.length) {
    if (just('confirm') || just('back')) {
      gamePhase = 'menu';
    }
  }
}

function _drawEnding() {
  // Full black canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  const phase = _endingPhase;

  // Portal glow (phases 0–1 only)
  if (phase <= 1) {
    const progress = phase === 0
      ? _endingTimer / ENDING_BEATS[0].dur
      : 1;
    _portalPulse = _endingTimer * 0.04;

    const glow = progress;
    ctx.save();
    const gr = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 0, GAME_W / 2, GAME_H / 2, 200);
    gr.addColorStop(0, `rgba(80,60,180,${glow * 0.7})`);
    gr.addColorStop(0.5, `rgba(30,20,80,${glow * 0.4})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Portal rings
    for (let r = 0; r < 3; r++) {
      const radius = 60 + r * 45 + Math.sin(_portalPulse + r) * 8;
      ctx.globalAlpha = glow * (0.3 - r * 0.08);
      ctx.strokeStyle = '#8866ff';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(GAME_W / 2, GAME_H / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Text beats
  const beat = ENDING_BEATS[Math.min(phase, ENDING_BEATS.length - 1)];
  if (beat && beat.text) {
    const progress = Math.min(1, _endingTimer / 40);
    ctx.globalAlpha = progress;
    ctx.fillStyle   = '#dddccc';
    ctx.font        = 'bold 24px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText(beat.text, GAME_W / 2, GAME_H / 2);
    ctx.globalAlpha = 1;
  }

  // Credits / restart
  if (phase >= ENDING_BEATS.length - 1) {
    const t  = _endingTimer / 80;
    const a  = Math.min(1, t);
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#555544';
    ctx.font        = '13px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText('A X I O M', GAME_W / 2, GAME_H / 2 - 40);
    ctx.fillStyle = '#333322';
    ctx.font      = '11px Courier New';
    ctx.fillText('a prequel', GAME_W / 2, GAME_H / 2 - 20);
    if (_endingTimer > 120) {
      ctx.fillStyle = 'rgba(100,100,80,0.5)';
      ctx.font      = '11px Courier New';
      ctx.fillText('[J] RETURN TO MENU', GAME_W / 2, GAME_H - 30);
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Chapter title card state (drawn in rendering.js) ────────────────────────
let titleCardTimer = 0;

function showChapterTitle() { titleCardTimer = 180; }
function updateChapterTitle() { if (titleCardTimer > 0) titleCardTimer--; }
