'use strict';

// ─── Post-chapter text ────────────────────────────────────────────────────────
let _postLines = null;
let _postIdx   = 0;
let _postTimer = 0;
let _postDone  = null;

function startPostText(lines, onDone) {
  if (!lines || !lines.length) { onDone(); return; }
  _postLines = lines; _postIdx = 0; _postTimer = 0; _postDone = onDone;
  gamePhase = 'posttext';
}

function _updatePostText() {
  _postTimer++;
  const hold = 210;
  if (_postTimer > hold || (just('confirm') && _postTimer > 30)) {
    _postIdx++; _postTimer = 0;
    if (_postIdx >= _postLines.length) {
      const done = _postDone;
      _postLines = null; _postDone = null;
      done();
    }
  }
}

function _drawPostText() {
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  if (!_postLines) return;
  const a = Math.min(1, _postTimer / 26) * (_postTimer > 180 ? (210 - _postTimer) / 30 : 1);
  ctx.save();
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b8b0a0';
  ctx.font      = 'italic 17px Courier New';
  ctx.fillText(_postLines[_postIdx], GAME_W / 2, GAME_H / 2);
  ctx.restore();
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);
  frameCount++;

  switch (gamePhase) {
    case 'menu':      updateMenu();               break;
    case 'interlude': _updateInterludeChapter();  break;
    case 'read':      _updateReadChapter();       break;
    case 'playing':   _updatePlaying();           break;
    case 'qte':       updateQTE();                break;
    case 'ledger':    updateLedgerChapter();      break;
    case 'posttext':  _updatePostText();          break;
  }

  ctx.save();
  applyScreenShake();
  switch (gamePhase) {
    case 'menu':
      drawMenu();
      break;
    case 'interlude':
      _drawWorld(); drawInterlude();
      // Chapters about the ledger keep it on screen. It is the same element the
      // player already knows from fights, with no highlight of any kind — the
      // omission in ch12 has to be noticed, never pointed at.
      if (CHAPTERS[currentChapter]?.showLedger) drawLedgerHUD();
      drawChapterTitle();
      break;
    case 'read':
      _drawWorld(); drawRead(); drawChapterTitle();
      break;
    case 'playing':
      _drawWorld(); drawLedgerActive(); drawFightHUD(); drawLedgerHUD(); drawChapterTitle();
      break;
    case 'qte':
      _drawWorld(); drawQTE();
      break;
    case 'ledger':
      _drawWorld();
      if (ledgerChapterStage === 'walk' && CHAPTERS[currentChapter]?.showLedger) drawLedgerHUD();
      drawLedgerChapter(); drawChapterTitle();
      break;
    case 'posttext':
      _drawPostText();
      break;
  }
  ctx.restore();

  clearFrameInput();
}

// ─── Phase updates ────────────────────────────────────────────────────────────
function _updateInterludeChapter() {
  if (just('pause')) paused = !paused;
  if (paused) return;

  updateChapterTitle();
  if (sov) sov.update();
  for (const a of actors) a.update();
  updateParticles();
  updateCamera();
  updateInterlude();

  if (isInterludeComplete()) _completeChapter();
}

function _updateReadChapter() {
  updateChapterTitle();
  // He stands still through a read, and takes no input at all — J is both
  // "commit" and "swing", so reading input here makes him lash out at nothing
  // on the frame the player chooses.
  if (sov) { sov.vx = 0; sov.frozen = true; sov.update(); }
  for (const a of actors) a.update();
  updateParticles();
  updateRead();
}

function _updatePlaying() {
  if (just('pause')) paused = !paused;
  if (paused) return;

  updateChapterTitle();

  // Revision QTEs fire at frame start from a flag-like condition, never from
  // inside damage resolution.
  const ch = CHAPTERS[currentChapter];
  if (ch?.qtes) {
    const standing = actors.filter(a => a.alive).length;
    for (const q of ch.qtes) {
      if (!q._fired && standing <= q.atStanding) {
        q._fired = true;
        startQTE(q.stages, result => {
          if (result === 'fail' && sov) dealDamage({ cx: () => sov.cx() + 40 }, sov, q.cost ?? 14, 0);
          gamePhase = 'playing';
        });
        return;
      }
    }
  }

  if (just('law') && !revoked.has('law')) ledgerInvoke();
  updateLedger();

  // Whatever is still standing decides what is currently true in this room.
  contested.clear();
  for (const a of actors) if (a.alive && a.asserts) contested.add(a.asserts);

  // Quarantine: the walls are options going missing, on a timer.
  if (ch?.revokes) {
    ch._frame = (ch._frame ?? 0) + 1;
    for (const r of ch.revokes) {
      if (!r._done && ch._frame >= r.atFrame) {
        r._done = true;
        revoked.add(r.verb);
        revokeNotice = { text: r.line, life: 190 };
        shake(6);
      }
    }
  }
  if (revokeNotice && --revokeNotice.life <= 0) revokeNotice = null;

  if (sov) sov.update();
  for (const a of actors) a.update();
  updateParticles();
  updateCamera();

  if (sov && !sov.alive) {
    if (just('confirm')) _restartChapter();
    return;
  }
  if (actors.length && actors.every(a => !a.alive) && titleCardTimer <= 0) {
    _completeChapter();
  }
}

// ─── Flow ─────────────────────────────────────────────────────────────────────
function _restartChapter() {
  const ch = CHAPTERS[currentChapter];
  loadChapter(currentChapter);
  _enterChapter(ch);
}

let revokeNotice = null;

function _enterChapter(ch) {
  ledgerResetForFight();
  revoked.clear();
  contested.clear();
  revokeNotice = null;
  ch._frame = 0;
  if (ch.qtes)    for (const q of ch.qtes) q._fired = false;
  if (ch.revokes) for (const r of ch.revokes) r._done = false;
  if (ch.loses)   for (const id of [].concat(ch.loses)) ledgerLose(id);

  if (ch.type === 'read')        { initRead(ch);          gamePhase = 'read'; }
  else if (ch.type === 'play')   { gamePhase = 'playing'; }
  else if (ch.type === 'ledger') { initLedgerChapter(ch); gamePhase = 'ledger'; }
  else                           { initInterlude(ch);     gamePhase = 'interlude'; }
  showChapterTitle();
}

function _completeChapter() {
  const ch = CHAPTERS[currentChapter];
  gamePhase = 'transition';

  startPostText(ch.postText, () => {
    // Advance to the next BUILT chapter; unbuilt ones are skipped rather than
    // renumbered, so ids stay stable as the game fills in.
    let next = currentChapter + 1;
    while (next < CHAPTERS.length && !isChapterBuilt(next)) next++;

    if (next >= CHAPTERS.length) {
      gamePhase = 'menu';
      menuState = 'chapter_select';
      menuSel   = currentChapter;
      return;
    }
    currentChapter = next;
    loadChapter(next);
    _enterChapter(CHAPTERS[next]);
  });
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function _drawWorld() {
  const ch = CHAPTERS[currentChapter];
  if (!ch) return;

  drawBackground(ch.background);
  drawPlatforms();
  drawChannel(ch);
  drawProps();
  drawParticles();
  for (const a of actors) if (!a.alive) a.draw();
  for (const a of actors) if (a.alive)  a.draw();
  if (sov) sov.draw();

  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#aaa98a';
    ctx.font      = 'bold 22px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', GAME_W / 2, GAME_H / 2);
  }
}

function drawFightHUD() {
  if (!sov) return;

  const w = 210, x = 28, y = 26;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = '#b08850';
  ctx.fillRect(x, y, w * (sov.health / sov.maxHealth), 7);
  ctx.strokeStyle = '#4a4436';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, 7);

  const left = actors.filter(a => a.alive).length;
  ctx.fillStyle = '#6d6553';
  ctx.font      = '11px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText(left + ' standing', x, y + 24);

  if (contested.size) {
    ctx.fillStyle = '#8a6a5c';
    ctx.font      = '10px Courier New';
    ctx.fillText('SOMETHING ELSE IS RUNNING THE ROOM', x, y + 38);
  }

  if (revokeNotice) {
    const a = Math.min(1, revokeNotice.life / 40);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#c08a72';
    ctx.font        = 'italic 15px Courier New';
    ctx.fillText(revokeNotice.text, GAME_W / 2, GAME_H * 0.21);
    ctx.restore();
  }

  if (readChosen) {
    // Bottom-right: it is reference, not urgent, and at the top it collides
    // with the ledger's active-law banner.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#544d3e';
    ctx.fillText(readChosen.label.toLowerCase(), GAME_W - 28, GAME_H - 26);
  }

  if (!sov.alive) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.textAlign = 'center';
    // Chapter 7 has no read, and telling the player they read it wrong there
    // contradicts the one thing that chapter exists to say.
    const hadRead = CHAPTERS[currentChapter]?.type === 'read';
    ctx.fillStyle = '#b8ac92';
    ctx.font      = 'italic 17px Courier New';
    ctx.fillText(hadRead ? 'You read it wrong.'
                         : 'There was nothing to read.', GAME_W / 2, GAME_H / 2 - 10);
    ctx.fillStyle = '#5e5747';
    ctx.font      = '12px Courier New';
    ctx.fillText(hadRead ? '[ J ]  read it again'
                         : '[ J ]  again', GAME_W / 2, GAME_H / 2 + 22);
  }
}

gameLoop();
