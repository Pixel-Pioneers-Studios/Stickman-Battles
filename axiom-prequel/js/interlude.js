'use strict';

// ─── Interlude walking-chapter system ─────────────────────────────────────────
// In interlude chapters Axiom walks freely alongside companions.
// Dialogue lines trigger when Axiom's centre passes their x position.
// The chapter completes when Axiom reaches endTriggerX and all dialogue is done.

let _ilPending   = [];    // dialogue entries not yet triggered (sorted by x)
let _ilQueue     = [];    // triggered, waiting to display
let _ilActive    = null;  // { speaker, text, timer, maxTimer, isCaption }
let _ilDone      = false; // true once completion conditions met

// ── Init ──────────────────────────────────────────────────────────────────────
function initInterlude(ch) {
  _ilPending = [...(ch.dialogues ?? [])].sort((a, b) => a.x - b.x);
  _ilQueue   = [];
  _ilActive  = null;
  _ilDone    = false;
}

// ── Update ────────────────────────────────────────────────────────────────────
function updateInterlude() {
  if (!axiomPlayer) return;

  // Trigger lines as Axiom walks past their x threshold
  const ax = axiomPlayer.cx();
  for (let i = _ilPending.length - 1; i >= 0; i--) {
    if (ax >= _ilPending[i].x) {
      _ilQueue.push(_ilPending[i]);
      _ilPending.splice(i, 1);
    }
  }
  _ilQueue.sort((a, b) => a.x - b.x);

  // Tick active speech
  if (_ilActive) {
    _ilActive.timer--;
    if (_ilActive.timer <= 0) _ilActive = null;
  }
  // Promote next queued line (small gap between lines)
  if (!_ilActive && _ilQueue.length > 0) {
    const raw    = _ilQueue.shift();
    const dur    = raw.duration ?? 230;
    _ilActive    = {
      speaker:   raw.speaker ?? null,
      text:      raw.text,
      timer:     dur,
      maxTimer:  dur,
      isCaption: !raw.speaker,
    };
  }

  // Completion: Axiom past endTriggerX, nothing pending or active
  const ch = CHAPTERS[currentChapter];
  if (ch?.endTriggerX
      && axiomPlayer.x + axiomPlayer.w >= ch.endTriggerX
      && _ilPending.length === 0
      && _ilQueue.length   === 0
      && !_ilActive) {
    _ilDone = true;
  }
}

function isInterludeComplete() { return _ilDone; }

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawInterlude() {
  const ch = CHAPTERS[currentChapter];

  // Subtle right-edge cue when close to end trigger
  if (ch?.endTriggerX) {
    const tx = ch.endTriggerX - camX;
    if (tx > 20 && tx < GAME_W + 40) {
      const g = ctx.createLinearGradient(Math.max(0, tx - 80), 0, tx, 0);
      g.addColorStop(0, 'transparent');
      g.addColorStop(1, 'rgba(160,140,90,0.07)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }
  }

  // "Keep walking" breath hint when no active speech and lines still ahead
  if (!_ilActive && _ilPending.length > 0) {
    const a = 0.25 + Math.sin(frameCount * 0.04) * 0.12;
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#777766';
    ctx.font        = '13px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText('→', GAME_W - 24, GAME_H / 2);
    ctx.globalAlpha = 1;
  }

  if (_ilActive) {
    if (_ilActive.isCaption) {
      _drawCaption(_ilActive);
    } else {
      _drawBubble(_ilActive);
    }
  }
}

// ── Caption (environmental / narrator text) ───────────────────────────────────
function _drawCaption(speech) {
  const t    = speech.maxTimer - speech.timer;
  const aIn  = Math.min(1, t / 22);
  const aOut = speech.timer < 35 ? speech.timer / 35 : 1;
  const a    = aIn * aOut * 0.88;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = '#b8b0a0';
  ctx.font        = 'italic 17px Courier New';
  ctx.textAlign   = 'center';
  ctx.fillText(speech.text, GAME_W / 2, GAME_H * 0.16);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

// ── Speech bubble ─────────────────────────────────────────────────────────────
function _drawBubble(speech) {
  const t    = speech.maxTimer - speech.timer;
  const aIn  = Math.min(1, t / 16);
  const aOut = speech.timer < 28 ? speech.timer / 28 : 1;
  const a    = aIn * aOut;

  // Locate speaker
  const skey = speech.speaker?.toLowerCase();
  let entity  = null;
  if (skey === 'axiom') {
    entity = axiomPlayer;
  } else {
    entity = companions.find(c => c.name?.toLowerCase() === skey);
  }
  if (!entity) return;

  const anchorX = entity.cx() - camX;
  const anchorY = entity.y;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 8;

  // Measure
  ctx.font = '14px Courier New';
  const tw = ctx.measureText(speech.text).width;
  const bw = Math.max(tw + 30, 140);
  const bh = 46;
  const bx = clamp(anchorX - bw / 2, 10, GAME_W - bw - 10);
  const by = Math.max(10, anchorY - bh - 20);

  // Tail
  const tailX = clamp(anchorX, bx + 14, bx + bw - 14);
  ctx.fillStyle = 'rgba(14,12,9,0.95)';
  ctx.beginPath();
  ctx.moveTo(tailX - 7, by + bh);
  ctx.lineTo(anchorX,   anchorY - 4);
  ctx.lineTo(tailX + 7, by + bh);
  ctx.closePath();
  ctx.fill();

  // Bubble
  ctx.fillStyle   = 'rgba(14,12,9,0.95)';
  ctx.strokeStyle = '#665544';
  ctx.lineWidth   = 1.5;
  roundedRect(bx, by, bw, bh, 5);
  ctx.fill();
  ctx.stroke();

  // Speaker label
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#776655';
  ctx.font        = 'bold 10px Courier New';
  ctx.textAlign   = 'left';
  ctx.fillText(speech.speaker.toUpperCase(), bx + 10, by + 16);

  // Dialogue text — larger + higher contrast
  ctx.fillStyle = '#e8dfcc';
  ctx.font      = '14px Courier New';
  ctx.fillText(speech.text, bx + 10, by + 35);

  ctx.restore();
}
