'use strict';
// smb-story-interlude.js — Walking chapter system ported from Axiom Prequel
//
// Interlude chapters (type: 'interlude') let the player walk freely through
// a wide scrollable level while dialogue lines trigger based on X position.
// The chapter completes when the player reaches ch.endTriggerX.
//
// Chapter definition contract:
//   type: 'interlude'
//   worldWidth: <number>     — horizontal extent of the level in game units
//   endTriggerX: <number>    — player cx() must exceed this to complete
//   dialogues: [             — sorted by x (ascending); engine re-sorts on init
//     { x: <number>, speaker: <string|null>, text: <string>, duration?: <frames> },
//     ...
//   ]
//   platforms: [...]         — optional extra platforms (merged with arena defaults)
//
// Camera: when gameMode === 'story' and _interludeActive is true, smb-camera.js
// is patched via _storyInterlудeLeadCamera() which overrides the exploration branch.
// The lead camera is wired into updateCamera() at the exploration mode hook.

// ── State ─────────────────────────────────────────────────────────────────────
let _ilPending    = [];    // dialogue entries not yet triggered, sorted by x
let _ilQueue      = [];    // triggered, awaiting display
let _ilActive     = null;  // { speaker, text, timer, maxTimer }
let _ilDone       = false; // true when completion conditions are met
let _ilChapter    = null;  // reference to current interlude chapter object
let _interludeActive = false;

// ── Init ──────────────────────────────────────────────────────────────────────
function initInterlude(ch) {
  _ilChapter   = ch;
  _ilPending   = [...(ch.dialogues || [])].sort((a, b) => a.x - b.x);
  _ilQueue     = [];
  _ilActive    = null;
  _ilDone      = false;
  _interludeActive = true;

  // Set arena to wide layout (the story engine sets up the right arena separately)
  // Camera is handled by updateCamera()'s exploration branch — no changes needed there
}

function resetInterlude() {
  _ilPending       = [];
  _ilQueue         = [];
  _ilActive        = null;
  _ilDone          = false;
  _ilChapter       = null;
  _interludeActive = false;
}

// ── Update (call from per-frame story logic) ──────────────────────────────────
function updateInterlude() {
  if (!_interludeActive) return;
  const p1 = players && players[0];
  if (!p1 || p1.health <= 0) return;

  const ax = p1.cx();

  // Trigger lines as player walks past their x threshold
  for (let i = _ilPending.length - 1; i >= 0; i--) {
    if (ax >= _ilPending[i].x) {
      _ilQueue.push(_ilPending[i]);
      _ilPending.splice(i, 1);
    }
  }

  // Tick active speech
  if (_ilActive) {
    _ilActive.timer--;
    if (_ilActive.timer <= 0) _ilActive = null;
  }
  // Promote next queued line
  if (!_ilActive && _ilQueue.length > 0) {
    const raw      = _ilQueue.shift();
    const dur      = raw.duration !== undefined ? raw.duration : 240;
    _ilActive      = {
      speaker:  raw.speaker || null,
      text:     raw.text,
      timer:    dur,
      maxTimer: dur,
      isCaption: !raw.speaker,
    };
    if (window.StoryVoice) StoryVoice.speak(_ilActive.text, _ilActive.speaker || 'none');
  }

  // Completion check
  if (_ilChapter && _ilChapter.endTriggerX
      && ax >= _ilChapter.endTriggerX
      && _ilPending.length === 0
      && _ilQueue.length   === 0
      && !_ilActive) {
    _ilDone = true;
  }
}

function isInterludeComplete() { return _ilDone; }

// ── Draw (call during the HUD/overlay draw pass) ──────────────────────────────
function drawInterlude() {
  if (!_interludeActive) return;

  // Subtle right-edge cue when more lines are ahead
  if (_ilChapter && _ilChapter.endTriggerX && !_ilActive && _ilPending.length > 0) {
    const a = 0.22 + Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.04) * 0.10;
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#776655';
    ctx.font        = '13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText('→', GAME_W - 30, GAME_H / 2);
    ctx.globalAlpha = 1;
    ctx.textAlign   = 'left';
  }

  if (!_ilActive) return;
  if (_ilActive.isCaption) {
    _ilDrawCaption(_ilActive);
  } else {
    _ilDrawBubble(_ilActive);
  }
}

// ── Caption (no speaker — environmental / narrator) ───────────────────────────
function _ilDrawCaption(speech) {
  const t    = speech.maxTimer - speech.timer;
  const aIn  = Math.min(1, t / 22);
  const aOut = speech.timer < 35 ? speech.timer / 35 : 1;
  const a    = aIn * aOut * 0.88;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = '#b0a898';
  ctx.font        = 'italic 16px "Segoe UI", Arial, sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillText(speech.text, GAME_W / 2, GAME_H * 0.16);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

// ── Speech bubble (speaker attributed) ───────────────────────────────────────
function _ilDrawBubble(speech) {
  const t    = speech.maxTimer - speech.timer;
  const aIn  = Math.min(1, t / 16);
  const aOut = speech.timer < 28 ? speech.timer / 28 : 1;
  const a    = aIn * aOut;

  // Find the speaker entity by name
  const skey = speech.speaker ? speech.speaker.toLowerCase() : null;
  let entity = null;
  if (skey && players && players[0]) {
    // Check fighters by name
    const allF = [...(players || []), ...(minions || [])];
    entity = allF.find(f => f && f.name && f.name.toLowerCase() === skey);
    if (!entity && (skey === 'p1' || skey === 'kael' || skey === 'you')) entity = players[0];
    if (!entity && skey === 'p2') entity = players[1];
  }
  if (!entity) entity = players && players[0]; // fallback to P1

  // World→screen X (camera transform)
  const scale  = (typeof camZoomCur !== 'undefined') ? camZoomCur : 1;
  const anchorX = entity
    ? (entity.cx() - (typeof camXCur !== 'undefined' ? camXCur : 0)) * scale + GAME_W / 2
    : GAME_W / 2;
  const anchorY = entity ? entity.y : GAME_H * 0.35;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 8;

  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  const tw  = ctx.measureText(speech.text).width;
  const bw  = Math.max(tw + 34, 150);
  const bh  = 50;
  const bx  = Math.max(10, Math.min(GAME_W - bw - 10, anchorX - bw / 2));
  const by  = Math.max(10, anchorY - bh - 22);

  // Tail
  const tailX = Math.max(bx + 12, Math.min(bx + bw - 12, anchorX));
  ctx.fillStyle = 'rgba(10,8,6,0.96)';
  ctx.beginPath();
  ctx.moveTo(tailX - 7, by + bh);
  ctx.lineTo(anchorX,   anchorY - 5);
  ctx.lineTo(tailX + 7, by + bh);
  ctx.closePath();
  ctx.fill();

  // Bubble background
  ctx.fillStyle   = 'rgba(10,8,6,0.96)';
  ctx.strokeStyle = '#887755';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  const r = 5;
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  ctx.lineTo(bx + r, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Speaker name
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#997766';
  ctx.font        = 'bold 11px "Segoe UI", Arial, sans-serif';
  ctx.textAlign   = 'left';
  ctx.fillText(speech.speaker.toUpperCase(), bx + 10, by + 17);

  // Dialogue text
  ctx.fillStyle = '#ede5d8';
  ctx.font      = '14px "Segoe UI", Arial, sans-serif';
  ctx.fillText(speech.text, bx + 10, by + 38);

  ctx.restore();
  ctx.textAlign = 'left';
}
