'use strict';

// ─── The Read ─────────────────────────────────────────────────────────────────
// A pre-fight phase. Combat input is off, the camera detaches and walks the
// encounter on a loop showing what the place actually does — patrol arcs, a
// man's temper, where a gate is. Then the player commits exactly ONE structural
// edit and the fight builds with that edit applied.
//
// One edit, always. The moment it is two this becomes a build menu and stops
// being a read.

let readStage   = 'observe';   // 'observe' | 'choose' | 'commit'
let readTimer   = 0;
let readFocus   = 0;           // index into ch.read.focus
let readSel     = 0;
let readData    = null;        // working copy the chosen edit mutates
let readChosen  = null;
let readCommit  = 0;

const READ_MIN_OBSERVE = 150;  // frames before the player may skip ahead

function initRead(ch) {
  readStage  = 'observe';
  readTimer  = 0;
  readFocus  = 0;
  readSel    = 0;
  readChosen = null;
  readCommit = 0;

  // Everything the edits are allowed to touch, deep-copied so a restart is clean
  readData = {
    enemies:   (ch.enemies   ?? []).map(e => ({ ...e })),
    platforms: (ch.platforms ?? []).map(p => ({ ...p })),
    props:     (ch.props     ?? []).map(p => ({ ...p })),
    notes:     [],
  };

  // The men are on screen DURING the read — a read that annotates an empty
  // patch of ground and then spawns the man afterwards teaches nothing. These
  // are plain Walkers: they patrol, they cannot fight, and they are thrown away
  // and rebuilt as Brawlers once the edit is committed.
  actors = readData.enemies.map(e => new Walker(e.x, e.y, {
    facing: e.facing ?? -1, tone: e.tone ?? '#2a2722',
    speed: e.speed ?? 2.4, patrol: e.patrol ?? null,
  }));
}

function updateRead() {
  const ch = CHAPTERS[currentChapter];
  const rd = ch?.read;
  if (!rd) return;

  readTimer++;

  if (readStage === 'observe') {
    const perFocus = Math.round((rd.loopFrames ?? 420) / rd.focus.length);
    readFocus = Math.min(rd.focus.length - 1, Math.floor(readTimer / perFocus));

    const f = rd.focus[readFocus];
    _camTarget = lerp(_camTarget, _focusX(f) - GAME_W / 2, 0.045);
    camX = clamp(_camTarget, 0, Math.max(0, levelWidth - GAME_W));

    const done = readTimer >= (rd.loopFrames ?? 420);
    if (done || (readTimer > READ_MIN_OBSERVE && just('confirm'))) {
      readStage = 'choose';
      readTimer = 0;
    }
    return;
  }

  if (readStage === 'choose') {
    // Drift back to where he is standing while the player decides
    _camTarget = lerp(_camTarget, sov.cx() - GAME_W / 2, 0.04);
    camX = clamp(_camTarget, 0, Math.max(0, levelWidth - GAME_W));

    if (just('left'))  readSel = (readSel - 1 + rd.edits.length) % rd.edits.length;
    if (just('right')) readSel = (readSel + 1) % rd.edits.length;
    if (just('confirm')) {
      readChosen = rd.edits[readSel];
      readChosen.apply(readData);
      readStage  = 'commit';
      readTimer  = 0;
    }
    return;
  }

  // 'commit' — a beat to let the edit land before the fight starts
  readCommit++;
  if (readCommit > 90) startFightFromRead();
}

function startFightFromRead() {
  sov.frozen = false;
  platforms = readData.platforms.map(p => ({ ...p }));
  props     = readData.props.map(p => ({ ...p }));
  actors    = readData.enemies.map(e => new Brawler(e.x, e.y, {
    name: e.name, facing: e.facing ?? -1, tone: e.tone ?? '#2a2722',
    health: e.health, damage: e.damage, aggression: e.aggression,
    speed: e.speed, delay: e.delay,
  }));
  gamePhase = 'playing';
  resetCamera();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawRead() {
  const ch = CHAPTERS[currentChapter];
  const rd = ch?.read;
  if (!rd) return;

  _letterbox(readStage === 'observe' ? 1 : 0.45);

  if (readStage === 'observe') {
    const f = rd.focus[readFocus];
    _annotate(f);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8b8069';
    ctx.font      = '12px Courier New';
    ctx.fillText(f.note, GAME_W / 2, GAME_H - 44);
    ctx.fillStyle = 'rgba(120,112,92,' + (0.4 + Math.sin(frameCount * 0.05) * 0.2).toFixed(2) + ')';
    ctx.font      = '10px Courier New';
    if (readTimer > READ_MIN_OBSERVE) ctx.fillText('[ J ]  seen enough', GAME_W / 2, GAME_H - 26);
    ctx.restore();
    return;
  }

  if (readStage === 'choose') { _drawEditPicker(rd); return; }

  // commit
  ctx.save();
  ctx.globalAlpha = clamp(1 - readCommit / 90, 0, 1);
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#d8cdb4';
  ctx.font        = 'italic 16px Courier New';
  ctx.fillText(readChosen.done, GAME_W / 2, GAME_H * 0.2);
  ctx.restore();
}

function _letterbox(amt) {
  const h = 46 * amt;
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, GAME_W, h);
  ctx.fillRect(0, GAME_H - h, GAME_W, h);
}

// A focus that names a man follows that man. Bracketing the patch of ground he
// started on while he walks out of it is worse than not bracketing anything.
function _focusX(f) {
  const a = f.actor != null ? actors[f.actor] : null;
  return a ? a.cx() : f.x;
}

function _focusY(f) {
  const a = f.actor != null ? actors[f.actor] : null;
  return a ? a.cy() : f.y;
}

function _annotate(f) {
  const sx = _focusX(f) - camX;
  const sy = _focusY(f);
  const pulse = 0.5 + Math.sin(frameCount * 0.07) * 0.22;

  ctx.save();
  ctx.strokeStyle = 'rgba(214,190,140,' + pulse.toFixed(2) + ')';
  ctx.lineWidth   = 1.2;

  // Bracket rather than a ring — it reads as a note taken, not a target lock
  const w = f.w ?? 78, h = f.h ?? 96;
  const x = sx - w / 2, y = sy - h / 2;
  const c = 14;
  ctx.beginPath();
  ctx.moveTo(x, y + c);         ctx.lineTo(x, y);         ctx.lineTo(x + c, y);
  ctx.moveTo(x + w - c, y);     ctx.lineTo(x + w, y);     ctx.lineTo(x + w, y + c);
  ctx.moveTo(x + w, y + h - c); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - c, y + h);
  ctx.moveTo(x + c, y + h);     ctx.lineTo(x, y + h);     ctx.lineTo(x, y + h - c);
  ctx.stroke();

  // Arc showing a loop the thing repeats, when the focus declares one
  if (f.arc) {
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(214,190,140,0.30)';
    ctx.beginPath();
    ctx.moveTo(f.arc[0] - camX, sy + h / 2);
    ctx.lineTo(f.arc[1] - camX, sy + h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = '#cdbe98';
  ctx.font      = 'bold 11px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(f.label.toUpperCase(), sx, y - 10);
  ctx.restore();
}

function _drawEditPicker(rd) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,7,6,0.72)';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b8069';
  ctx.font      = 'bold 12px Courier New';
  ctx.fillText('ONE THING', GAME_W / 2, 74);
  ctx.fillStyle = '#5e5747';
  ctx.font      = '11px Courier New';
  ctx.fillText('change it before anyone is looking', GAME_W / 2, 92);

  const n = rd.edits.length;
  const cardW = 196, gap = 16;
  const totalW = n * cardW + (n - 1) * gap;
  const y = 150, cardH = 150;

  for (let i = 0; i < n; i++) {
    const e  = rd.edits[i];
    const x  = GAME_W / 2 - totalW / 2 + i * (cardW + gap);
    const on = i === readSel;

    ctx.fillStyle   = on ? '#231f18' : '#15130f';
    ctx.strokeStyle = on ? '#a08e64' : '#332e24';
    ctx.lineWidth   = on ? 2 : 1;
    roundedRect(x, y, cardW, cardH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = on ? '#e6dcc4' : '#8d846e';
    ctx.font      = 'bold 13px Courier New';
    _wrapText(e.label, x + cardW / 2, y + 30, cardW - 24, 17);

    ctx.fillStyle = on ? '#9a9079' : '#5c5748';
    ctx.font      = '11px Courier New';
    _wrapText(e.detail, x + cardW / 2, y + 78, cardW - 24, 15);
  }

  ctx.fillStyle = '#4a4436';
  ctx.font      = '11px Courier New';
  ctx.fillText('← →  CHOOSE     J  COMMIT', GAME_W / 2, y + cardH + 40);

  ctx.fillStyle = '#3f3a2f';
  ctx.font      = 'italic 11px Courier New';
  ctx.fillText('You only get one. You always only got one.', GAME_W / 2, GAME_H - 34);
  ctx.restore();
}

function _wrapText(text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', ly = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) {
      ctx.fillText(line.trim(), cx, ly);
      line = ''; ly += lh;
    }
    line += w + ' ';
  }
  ctx.fillText(line.trim(), cx, ly);
}
