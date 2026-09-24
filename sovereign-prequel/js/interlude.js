'use strict';

// ─── Interlude walking chapters ───────────────────────────────────────────────
// He walks; lines trigger when his centre passes their x. The chapter completes
// once he reaches endTriggerX with nothing left pending — then an optional
// finalHold fades the world out before handing back to the loop.

let _ilPending = [];
let _ilQueue   = [];
let _ilActive  = null;
let _ilDone    = false;
let _ilHold    = 0;
let _ilHoldMax = 0;
let _ilGap     = 0;     // frames to wait before promoting the next line

function initInterlude(ch) {
  // Copy each line: `_waited` is per-playthrough state and writing it onto the
  // chapter's own data would make the pause in ch19 fire once, ever.
  _ilPending = (ch.dialogues ?? []).map(d => ({ ...d })).sort((a, b) => a.x - b.x);
  _ilQueue   = [];
  _ilActive  = null;
  _ilDone    = false;
  _ilHold    = 0;
  _ilHoldMax = ch.finalHold ?? 0;
  _ilGap     = 0;
}

function updateInterlude() {
  if (!sov) return;

  const ax = sov.cx();
  for (let i = _ilPending.length - 1; i >= 0; i--) {
    if (ax >= _ilPending[i].x) {
      _ilQueue.push(_ilPending[i]);
      _ilPending.splice(i, 1);
    }
  }
  _ilQueue.sort((a, b) => a.x - b.x);

  // The last line keeps ticking (its fade-IN is driven off the same timer) but
  // is floored once the hold starts, so it sits there while the world goes out
  // from under it instead of expiring into an empty fade.
  if (_ilActive) {
    const floor = _ilHold > 0 ? 45 : 0;
    _ilActive.timer = Math.max(floor, _ilActive.timer - 1);
    if (_ilActive.timer <= 0) _ilActive = null;
  }
  if (_ilGap > 0) _ilGap--;

  if (!_ilActive && _ilGap <= 0 && _ilQueue.length > 0) {
    const raw = _ilQueue[0];
    // `delayBefore` is silence the player has to sit through. Chapter 19's
    // whole meaning is a pause of exactly this kind, so it has to be real
    // timing and not a longer previous line.
    if (raw.delayBefore && !raw._waited) { raw._waited = true; _ilGap = raw.delayBefore; return; }
    _ilQueue.shift();
    const dur = raw.duration ?? 230;
    _ilActive = {
      speaker:   raw.speaker ?? null,
      voice:     raw.voice ?? null,
      text:      raw.text,
      timer:     dur,
      maxTimer:  dur,
      isCaption: !raw.speaker,
    };
  }

  const ch = CHAPTERS[currentChapter];
  const walkedOut = ch?.endTriggerX && sov.x + sov.w >= ch.endTriggerX;
  const spent     = _ilPending.length === 0 && _ilQueue.length === 0 && _ilGap <= 0;

  if (walkedOut && spent) {
    // The hold starts on the LAST line, not after it — otherwise the fade plays
    // to an empty screen and the closing line is gone before the dark arrives.
    if (_ilHoldMax > 0 && _ilHold < _ilHoldMax) { _ilHold++; return; }
    if (_ilHoldMax === 0 && _ilActive) return;
    _ilDone = true;
  }
}

function isInterludeComplete() { return _ilDone; }

function drawInterlude() {
  const ch = CHAPTERS[currentChapter];

  if (ch?.endTriggerX) {
    const tx = ch.endTriggerX - camX;
    if (tx > 20 && tx < GAME_W + 40) {
      const g = ctx.createLinearGradient(Math.max(0, tx - 90), 0, tx, 0);
      g.addColorStop(0, 'transparent');
      g.addColorStop(1, 'rgba(160,140,90,0.07)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }
  }

  if (!_ilActive && _ilPending.length > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(frameCount * 0.04) * 0.12;
    ctx.fillStyle   = '#777766';
    ctx.font        = '13px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText('→', GAME_W - 24, GAME_H / 2);
    ctx.restore();
  }

  // Final hold — the world goes first, so the last line is left holding alone
  // on black. Drawn BEFORE the line, never over it.
  if (_ilHoldMax > 0 && _ilHold > 0) {
    ctx.fillStyle = 'rgba(0,0,0,' + (_ilHold / _ilHoldMax * 0.96).toFixed(3) + ')';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  }

  if (_ilActive) {
    if (_ilActive.isCaption) _drawCaption(_ilActive);
    else                     _drawBubble(_ilActive);
  }
}

function _drawCaption(s) {
  const t    = s.maxTimer - s.timer;
  const aIn  = Math.min(1, t / 22);
  const aOut = s.timer < 35 ? s.timer / 35 : 1;
  // The thing he built speaks from inside his own head — cooler, lower, and
  // never in a bubble, because it has no body and never gets one.
  const inner = s.voice === 'inner';

  ctx.save();
  ctx.globalAlpha = aIn * aOut * 0.9;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = inner ? '#93a7b6' : '#b8b0a0';
  ctx.font        = (inner ? '16px' : 'italic 17px') + ' Courier New';
  ctx.textAlign   = 'center';
  ctx.fillText(s.text, GAME_W / 2, GAME_H * (inner ? 0.235 : 0.16));
  ctx.restore();
}

function _drawBubble(s) {
  const t    = s.maxTimer - s.timer;
  const aIn  = Math.min(1, t / 16);
  const aOut = s.timer < 28 ? s.timer / 28 : 1;

  const key    = s.speaker.toLowerCase();
  const entity = key === 'him' ? sov : actors.find(v => v.name?.toLowerCase() === key);
  if (!entity) return;

  const anchorX = entity.cx() - camX;
  const anchorY = entity.y;

  ctx.save();
  ctx.globalAlpha = aIn * aOut;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 8;

  // He gets no name label. Nobody in this game knows what to call him yet.
  const label = key === 'him' ? null : s.speaker.toUpperCase();

  ctx.font = '14px Courier New';
  const bw = Math.max(ctx.measureText(s.text).width + 30, 140);
  const bh = label ? 46 : 32;
  const bx = clamp(anchorX - bw / 2, 10, GAME_W - bw - 10);
  const by = Math.max(10, anchorY - bh - 22);

  const tailX = clamp(anchorX, bx + 14, bx + bw - 14);
  ctx.fillStyle = 'rgba(14,12,9,0.95)';
  ctx.beginPath();
  ctx.moveTo(tailX - 7, by + bh);
  ctx.lineTo(anchorX,   anchorY - 4);
  ctx.lineTo(tailX + 7, by + bh);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle   = 'rgba(14,12,9,0.95)';
  ctx.strokeStyle = label ? '#998866' : '#6f6753';
  ctx.lineWidth   = 1.5;
  roundedRect(bx, by, bw, bh, 5);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.textAlign  = 'left';
  if (label) {
    ctx.fillStyle = '#998877';
    ctx.font      = 'bold 11px Courier New';
    ctx.fillText(label, bx + 10, by + 17);
  }
  ctx.fillStyle = '#ece4d4';
  ctx.font      = '14px Courier New';
  ctx.fillText(s.text, bx + 10, by + bh - 10);

  ctx.restore();
}
