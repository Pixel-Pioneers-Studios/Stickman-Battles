'use strict';

// ─── Main game loop ───────────────────────────────────────────────────────────

function gameLoop() {
  requestAnimationFrame(gameLoop);

  frameCount++;

  // ── Update ──────────────────────────────────────────────────────────────────
  switch (gamePhase) {
    case 'menu':
      updateMenu();
      break;

    case 'cinematic':
    case 'ending':
      updateCinematic();
      break;

    case 'playing':
      _updatePlaying();
      break;

    case 'interlude':
      _updateInterludeChapter();
      break;
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  ctx.save();
  applyScreenShake();

  switch (gamePhase) {
    case 'menu':
      drawMenu();
      break;

    case 'cinematic':
    case 'ending':
      // Draw the game world faded behind the cinematic
      if (axiomPlayer) _drawWorld();
      drawCinematic();
      break;

    case 'playing':
      _drawWorld();
      drawSuperFlash();
      drawHUD();
      drawChapterTitle();
      drawGameOver();
      break;

    case 'interlude':
      _drawWorld();
      drawInterlude();
      drawHUD();
      drawChapterTitle();
      break;
  }

  ctx.restore();

  // Always clear just-pressed buffer last
  clearFrameInput();
}

// ─── Playing update ───────────────────────────────────────────────────────────
function _updatePlaying() {
  // Hit-stop — pause physics for a few frames on heavy impacts
  if (hitStopFrames > 0) {
    hitStopFrames--;
    // Still update camera and particles during hit-stop
    updateCamera();
    updateParticles();
    return;
  }

  // Pause
  if (just('pause')) { paused = !paused; }
  if (paused) return;

  updateChapterTitle();

  // Axiom
  if (axiomPlayer) axiomPlayer.update();

  // Companions
  for (const c of companions) c.update();

  // Enemies
  for (const e of enemies) e.update();

  // Weapon pickups
  updateWeaponPickups();

  // Particles
  updateParticles();

  // Camera
  updateCamera();

  // Check win / lose
  _checkChapterState();
}

function _checkChapterState() {
  if (!axiomPlayer) return;

  // Player dead — game over
  if (axiomPlayer.health <= 0 && axiomPlayer.state === 'dead') {
    // drawGameOver() handles the visual; restart on confirm
    if (just('confirm')) {
      _restartCurrentChapter();
    }
    return;
  }

  // All enemies defeated — chapter complete
  const aliveEnemies = enemies.filter(e => e.health > 0 && e.state !== 'dead');
  if (aliveEnemies.length === 0 && gamePhase === 'playing' && titleCardTimer <= 0) {
    _completeChapter();
  }
}

function _completeChapter() {
  // Prevent double-fire
  gamePhase = 'cinematic';

  startPostText(currentChapter, () => {
    const next = currentChapter + 1;
    if (next < CHAPTERS.length) {
      currentChapter = next;
      loadChapter(next);
      const nextCh = CHAPTERS[next];
      startPreText(next, () => {
        if (nextCh.type === 'interlude') {
          initInterlude(nextCh);
          gamePhase = 'interlude';
        } else {
          gamePhase = 'playing';
        }
        showChapterTitle();
      });
    } else {
      gamePhase = 'menu';
      menuState = 'title';
    }
  });
}

// ─── Interlude update ─────────────────────────────────────────────────────────
function _updateInterludeChapter() {
  if (hitStopFrames > 0) {
    hitStopFrames--;
    updateCamera();
    updateParticles();
    return;
  }

  if (just('pause')) { paused = !paused; }
  if (paused) return;

  updateChapterTitle();

  if (axiomPlayer) axiomPlayer.update();
  for (const c of companions) c.update();

  updateParticles();
  updateCamera();
  updateInterlude();

  if (isInterludeComplete()) {
    _completeChapter();
  }
}

function _restartCurrentChapter() {
  loadChapter(currentChapter);
  gamePhase = 'playing';
  showChapterTitle();
}

// ─── World draw ───────────────────────────────────────────────────────────────
function _drawWorld() {
  const ch = CHAPTERS[currentChapter];
  if (!ch) return;

  drawBackground(ch.background);
  drawPlatforms();
  drawWeaponPickups();
  drawParticles();

  // Companions
  for (const c of companions) c.draw();

  // Enemies (draw dead last for depth)
  const alive = enemies.filter(e => e.state !== 'dead');
  const dead  = enemies.filter(e => e.state === 'dead');
  for (const e of dead)  e.draw();
  for (const e of alive) e.draw();

  // Axiom on top
  if (axiomPlayer) axiomPlayer.draw();

  // Paused overlay
  if (paused) {
    ctx.fillStyle   = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle   = '#aaa98a';
    ctx.font        = 'bold 22px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText('PAUSED', GAME_W / 2, GAME_H / 2);
    ctx.fillStyle   = '#55534a';
    ctx.font        = '11px Courier New';
    ctx.fillText('[ESC] RESUME', GAME_W / 2, GAME_H / 2 + 30);
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
gameLoop();
