'use strict';
// smb-menu-utils.js — toggleChaosMode, resizeGame, refreshMenuFromAccount, drawEdgeIndicators
// Depends on: smb-globals.js, smb-menu-startcore.js
// Must load AFTER smb-menu-startcore.js

function toggleChaosMode() {
  if (typeof chaosMode === 'undefined') return;
  chaosMode = !chaosMode;
  const btn = document.getElementById('chaosModeBtn');
  if (btn) {
    btn.textContent = '⚡ Chaos Mode: ' + (chaosMode ? 'ON' : 'OFF');
    btn.style.borderColor = chaosMode ? 'rgba(220,80,255,0.8)' : 'rgba(160,60,255,0.4)';
    btn.style.color       = chaosMode ? '#ff88ff' : '#cc88ff';
    btn.style.boxShadow   = chaosMode ? '0 0 12px rgba(200,60,255,0.5)' : '';
  }
}

// ============================================================
// FULLSCREEN / RESIZE
// ============================================================
function resizeGame() {
  // The canvas CSS box must match the backing store (canvas.width/height =
  // window.innerWidth/innerHeight, see resizeCanvas in smb-globals.js) 1:1 —
  // drawStorySubtitle() and the HUD camera clamp in smb-camera.js both map
  // getBoundingClientRect() CSS pixels straight to canvas coordinates.
  //
  // Do NOT letterbox here and do NOT subtract the HUD height: #hud is
  // position:fixed with a translucent scrim, so it floats over the canvas and
  // takes no layout space. Shrinking the box below the viewport exposed the
  // page background as black bars — 32% of the frame at a 1216x684 iframe and
  // 41% at 907x510, both sizes CrazyGames lists as primary.
  //
  // Aspect ratio is already preserved inside the frame: gameLoop fit-scales the
  // GAME_W x GAME_H world by min(canvas.width/GAME_W, canvas.height/GAME_H) and
  // centres it, painting the surround with the arena sky gradient.
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.style.width      = w + 'px';
  canvas.style.height     = h + 'px';
  canvas.style.marginLeft = '0px';
  canvas.style.marginTop  = '0px';
}

window.addEventListener('resize', resizeGame);

// ============================================================
// PAGE LOAD — start menu background animation immediately
// ============================================================
currentArenaKey = ARENA_KEYS_ORDERED[menuBgArenaIdx];
currentArena    = ARENAS[currentArenaKey];
generateBgElements();
canvas.style.display = 'block';
resizeGame();
menuLoopRunning = true;
requestAnimationFrame(menuBgLoop);

// Sync version labels from GAME_VERSION constant so they never drift
(function() { const el = document.getElementById('gameVersionLabel'); if (el && typeof GAME_VERSION !== 'undefined') el.textContent = 'v' + GAME_VERSION; })();
_initVersionLabels();

// Build weapon/class selection card grids
_initSelCardGrids();

// Restore secret letter state from localStorage on page load
syncCodeInput();
// Sync sound UI with saved state
(function() {
  const btn = document.getElementById('sfxMuteBtn');
  if (btn && SoundManager.isMuted()) btn.textContent = '🔇 Sound: Off';
  const vol = parseFloat(localStorage.getItem('smc_sfxVol') || '0.35');
  const slider = document.querySelector('input[oninput*="setSfxVolume"]');
  if (slider) slider.value = vol;
})();
// ── refreshMenuFromAccount ─────────────────────────────────────────────────────
// Re-evaluates which mode cards are visible based on the current account's state.
// Called at startup and after every account switch / delete.
function refreshMenuFromAccount() {
  const bossCard = document.getElementById('modeBoss');
  if (bossCard) bossCard.style.display = (typeof bossBeaten !== 'undefined' && bossBeaten) ? '' : 'none';

  const tfCard = document.getElementById('modeTrueForm');
  if (tfCard) tfCard.style.display = (typeof unlockedTrueBoss !== 'undefined' && unlockedTrueBoss) ? '' : 'none';

  const sovCard = document.getElementById('modeSovereign');
  if (sovCard) sovCard.style.display = (typeof sovereignBeaten !== 'undefined' && sovereignBeaten) ? '' : 'none';

  const soCard = document.getElementById('modeStoryOnline');
  if (soCard) soCard.style.display = (
    (typeof storyOnline !== 'undefined' && storyOnline) ||
    (typeof _story2 !== 'undefined' && _story2 && _story2.storyComplete)
  ) ? '' : 'none';

  const brCard = document.getElementById('modeBossRush');
  if (brCard) brCard.style.display = (typeof bossRushUnlocked !== 'undefined' && bossRushUnlocked) ? '' : 'none';

  const aaCard = document.getElementById('modeAbsoluteAxiom');
  if (aaCard) aaCard.style.display = (typeof absoluteAxiomUnlocked !== 'undefined' && absoluteAxiomUnlocked) ? '' : 'none';

  // Cutscene Theater lists every scene in the game with no per-entry gating, so
  // it stays hidden until the player has reached the ending it would spoil —
  // the same flag the boss replay tab uses.
  const csBtn = document.getElementById('cutsceneTheaterBtn');
  if (csBtn) {
    const tfSeen = !!(window.GameState && GameState.getActiveAccount &&
      GameState.getActiveAccount()?.data?.unlocks?.tfEndingSeen);
    const dev = (typeof debugMode !== 'undefined' && debugMode) ||
      (typeof _adminPanelIsAllowed === 'function' && _adminPanelIsAllowed());
    csBtn.style.display = (tfSeen || dev) ? '' : 'none';
  }

  // First-run tutorial offer — no-op once the player has played or dismissed it.
  if (typeof maybeOfferTutorial === 'function') maybeOfferTutorial();

  if (typeof refreshCoinDisplay === 'function') refreshCoinDisplay();
  if (typeof syncCodeInput === 'function') syncCodeInput();
  if (typeof refreshMegaknightClassOption === 'function') refreshMegaknightClassOption();
  // Home hub identity + Resume card. Defined below this function, so it is
  // referenced through the same typeof guard every other optional hook uses.
  if (typeof refreshHomeHub === 'function') refreshHomeHub();
}

refreshMenuFromAccount();
// Init cosmetic swatch lock state and coin display
(function() {
  _syncStoreSwatches();
  const coinEl = document.getElementById('coinDisplay');
  if (coinEl) coinEl.textContent = coinBalance;   // corner badge — number only, see SMB.css
})();

// Init arena & lives dropdowns — default to random on first load
selectArena('random');
selectLives(chosenLives);
// The room list is always available — "Private" governs whether YOUR room is
// advertised, not whether you can see anyone else's. It used to start hidden,
// so the Online panel opened with no way to discover a room at all.

// Tuesday cold open — plays once ever, on the player's first Story open.
//
// It used to auto-play ~800ms after load, over the home screen. That made a dark,
// slow walking scene the first thing every visitor saw, including portal players
// who arrived for a fight and never opted into the narrative. It is a story
// opening, so it now gates the story: openStoryPath() calls this, and the panel
// opens when the scene finishes. Anyone who plays a chapter still sees it, since
// Story is the only route to the chapters.
//
// Returns true if the prologue took over (caller should defer its own UI to the
// callback), false if it was already seen or is unavailable (open UI normally).
function maybePlayTuesdayPrologue(onDone) {
  var seen = false;
  try { seen = !!(typeof _story2 !== 'undefined' && _story2 && _story2.tuesdaySeen); } catch (e) {}
  try { if (localStorage.getItem('smb_tuesday_seen') === '1') seen = true; } catch (e) {}
  if (seen || typeof TuesdayPrologue === 'undefined' || !TuesdayPrologue.play) return false;
  if (TuesdayPrologue.isRunning && TuesdayPrologue.isRunning()) return false;

  // Mark seen up front: if anything below throws, the scene must not re-arm and
  // trap the player behind it on every subsequent Story open.
  try { if (typeof _story2 !== 'undefined' && _story2) _story2.tuesdaySeen = true; } catch (e) {}
  try { localStorage.setItem('smb_tuesday_seen', '1'); } catch (e) {}
  try { if (typeof _saveStory2 === 'function') _saveStory2(); } catch (e) {}

  try {
    return !!TuesdayPrologue.play(function () {
      if (typeof onDone === 'function') onDone();
    });
  } catch (e) {
    if (typeof onDone === 'function') onDone();
    return false;
  }
}

// ============================================================
// EDGE PLAYER INDICATORS
// ============================================================
// Marks the strip past each end of the floor where there is no ground left —
// the stage's actual kill boundary. On arenas whose floor is wider than the
// viewport (The Circuit's floor runs x -60..960 against a 900-wide screen) that
// boundary sits off-screen, so players lose stocks at full HP to geometry they
// were never shown. This draws the lip, and flares when someone is over it.
function drawStageBoundary(scX, scY, camCX, camCY) {
  if (!gameRunning || typeof currentArena === 'undefined' || !currentArena) return;
  // Arenas where "the edge of the floor" is not the kill boundary opt out. The
  // Sewer is the case that forced this: its only isFloor platform is a drifting
  // trash barge 210px wide, so the union below was the barge itself, every
  // fighter was permanently inside the 210px warning distance, and the screen
  // sat under a full-strength red ring-out flare for the entire match. There the
  // hazard is the sewage, not the ledge.
  if (currentArena.noStageBoundary) return;
  // Union of every live floor segment, not just the first. The Circuit's plate is
  // several isFloor segments with voids between them, so `.find()` would have
  // reported only the leftmost segment's edge and flared the wrong boundary.
  let minX = Infinity, maxX = -Infinity;
  for (const pl of (currentArena.platforms || [])) {
    if (!pl || !pl.isFloor || pl.isFloorDisabled) continue;
    if (pl.x < minX) minX = pl.x;
    if (pl.x + pl.w > maxX) maxX = pl.x + pl.w;
  }
  if (!isFinite(minX) || !isFinite(maxX)) return;
  const toScreenX = gx => (gx - camCX) * scX + canvas.width / 2;

  // How close is the nearest LOCAL fighter to each end of the ground? The
  // warning has to key off proximity rather than the boundary's screen position:
  // the camera routinely zooms past 1.9x, which pushes the real edge hundreds of
  // pixels off-canvas precisely when a player is about to be launched over it.
  const WARN_DIST = 210;
  let nearL = Infinity, nearR = Infinity;
  for (const p of players) {
    if (!p || p.health <= 0 || p.isAI) continue;   // warn the human, not the bot
    nearL = Math.min(nearL, p.cx() - minX);
    nearR = Math.min(nearR, maxX - p.cx());
  }

  ctx.save();
  // Screen-space overlay — the caller's game transform is still live here.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const side of [-1, 1]) {
    const dist = side < 0 ? nearL : nearR;
    if (!isFinite(dist) || dist > WARN_DIST) continue;
    // 0 at the warning threshold, 1 at the lip, and past it stays pinned at 1.
    const t     = Math.max(0, Math.min(1, 1 - dist / WARN_DIST));
    const flash = dist < 0 ? 0.12 + Math.sin(frameCount * 0.3) * 0.06 : 0;
    const peak  = t * 0.34 + flash;
    const bandW = Math.min(canvas.width * 0.22, 190);
    const x0    = side < 0 ? 0 : canvas.width - bandW;
    const g = ctx.createLinearGradient(side < 0 ? 0 : canvas.width, 0,
                                       side < 0 ? bandW : canvas.width - bandW, 0);
    g.addColorStop(0, `rgba(255,45,30,${peak})`);
    g.addColorStop(1, 'rgba(255,45,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, bandW, canvas.height);

    // The exact lip, when it happens to be on-screen.
    const edgeX = side < 0 ? toScreenX(minX) : toScreenX(maxX);
    if (edgeX > 0 && edgeX < canvas.width) {
      ctx.strokeStyle = `rgba(255,100,70,${Math.min(0.85, peak + 0.4)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(edgeX, 0); ctx.lineTo(edgeX, canvas.height); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEdgeIndicators(scX, scY, camCX, camCY) {
  if (!gameRunning) return;
  drawStageBoundary(scX, scY, camCX, camCY);
  const MARGIN = 40; // px from screen edge before indicator shows
  const ARROW  = 14; // arrow half-size
  const allP   = [...players, ...minions].filter(p => p.health > 0 && !p.isBoss);
  for (const p of allP) {
    // Convert game coords to screen coords
    const sx = (p.cx() - camCX) * scX + canvas.width  / 2;
    const sy = (p.cy() - camCY) * scY + canvas.height / 2;
    const onScreen = sx > -p.w * scX && sx < canvas.width + p.w * scX &&
                     sy > -p.h * scY && sy < canvas.height + p.h * scY;
    if (onScreen) continue;
    // Clamp indicator to screen edge with margin
    const ix = Math.max(MARGIN, Math.min(canvas.width  - MARGIN, sx));
    const iy = Math.max(MARGIN, Math.min(canvas.height - MARGIN, sy));
    const angle = Math.atan2(sy - iy, sx - ix);
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle   = p.color || '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(ARROW, 0);
    ctx.lineTo(-ARROW * 0.6,  ARROW * 0.55);
    ctx.lineTo(-ARROW * 0.6, -ARROW * 0.55);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // Name label
    ctx.rotate(-angle);
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 9px Arial';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 4;
    ctx.fillText(p.name || '?', 0, ARROW + 12);
    ctx.restore();
  }
}

// ============================================================
// HOME HUB — populate the identity bar and the Resume card
// ------------------------------------------------------------
// The old home screen showed a returning player exactly what it showed a
// stranger. This reads the active account's save so the first thing on screen
// is the player's own progress. Every lookup is guarded: the hub must render
// something sensible when there is no account, no save, or no story data at
// all (first launch, private window, cleared storage).
// ============================================================
function refreshHomeHub() {
  const nameEl  = document.getElementById('hubPlayerName');
  if (!nameEl) return;   // not on the hub (sub-panel open, or older markup)

  const subEl    = document.getElementById('hubPlayerSub');
  const coinEl   = document.getElementById('hubCoins');
  const kickEl   = document.getElementById('hubResumeKicker');
  const titleEl  = document.getElementById('hubResumeTitle');
  const whereEl  = document.getElementById('hubResumeWhere');
  const barEl    = document.getElementById('hubProgBar');
  const pctEl    = document.getElementById('hubProgPct');
  const labEl    = document.getElementById('hubProgLabel');
  const btnEl    = document.getElementById('hubResumeBtn');

  const acct = (typeof AccountManager !== 'undefined' && AccountManager.getActiveAccount)
    ? AccountManager.getActiveAccount() : null;

  nameEl.textContent = (acct && acct.username) ? String(acct.username).toUpperCase() : 'PLAYER';

  if (coinEl) {
    const c = (typeof getCoins === 'function') ? getCoins()
            : (typeof coinBalance === 'number' ? coinBalance : 0);
    coinEl.textContent = Number(c || 0).toLocaleString();
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  // Read the SAME source the journey screen uses (smb-story-config.js): the
  // count of DEFEATED chapters over the active saga's chapter count. Deriving
  // a percentage from the current chapter index instead is wrong — the index
  // is where you are, not how much you have finished, and on a saga build it
  // is not even scoped to the chapters this build ships.
  const sagaScoped = typeof activeSagaChapterCount === 'function'
                  && typeof isChapterInActiveSaga  === 'function';
  const total = sagaScoped
    ? activeSagaChapterCount()
    : (typeof STORY_CHAPTERS2 !== 'undefined' ? STORY_CHAPTERS2.length : 0);
  // Distinct, in-range entries only. `defeated` can carry duplicates and mixes
  // chapter ids with array indices, so its raw length overcounts — a finished
  // save read 373/186 = 201%. Matches the guard in smb-story-config.js so the
  // hub and the journey screen can never disagree.
  const raw = (typeof _story2 !== 'undefined' && _story2 && Array.isArray(_story2.defeated))
    ? _story2.defeated : [];
  const seen = new Set(raw.filter(i => Number.isInteger(i) && i >= 0 && i < total));
  const done = Math.min(total, sagaScoped
    ? [...seen].filter(i => isChapterInActiveSaga(i)).length
    : seen.size);
  const pct  = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  // Current chapter, clamped into the active saga exactly as the journey list
  // clamps it. _story2 is the live normalised progress object; the account copy
  // is only its persistence target.
  let idx = (typeof _story2 !== 'undefined' && _story2 && typeof _story2.chapter === 'number')
    ? _story2.chapter : 0;
  if (typeof sagaClampChapter === 'function') idx = sagaClampChapter(idx);
  if (!(idx >= 0)) idx = 0;
  if (total && idx > total - 1) idx = total - 1;

  const ch = (typeof STORY_CHAPTERS2 !== 'undefined' && STORY_CHAPTERS2[idx])
    ? STORY_CHAPTERS2[idx] : null;
  const complete = total > 0 && done >= total;
  const started  = done > 0 || idx > 0;

  if (subEl) {
    subEl.textContent = total
      ? (done + ' / ' + total + ' CHAPTERS')
      : 'No save yet';
  }
  if (kickEl)  kickEl.textContent  = complete ? 'Story complete' : (started ? 'Continue' : 'Begin');
  if (titleEl) titleEl.textContent = ch && ch.title ? ch.title : 'Start the Story';
  if (whereEl) {
    // ch.world carries an emoji prefix in the registry; strip it for the hub.
    const w = ch && ch.world ? String(ch.world).replace(/^[^\w(]+/, '').trim() : '';
    whereEl.textContent = w || 'Ninety-four bearers came before you. None of them lasted.';
  }
  if (barEl) barEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (labEl) labEl.textContent = 'STORY PROGRESS';
  if (btnEl) {
    btnEl.textContent = complete
      ? ('Replay Chapter ' + (idx + 1))     // nothing left to resume
      : started ? ('Resume Chapter ' + (idx + 1))
                : 'Start Chapter 1';
  }

  window._hubResumeIdx = idx;
}

// The story engine loads AFTER this file, so STORY_CHAPTERS2 and _story2 do not
// exist during the module-level refreshMenuFromAccount() call at the bottom of
// this file. Without this second pass the hub renders a permanent "0% / Start
// the Story" even on a finished save.
window.addEventListener('load', function () {
  if (typeof refreshHomeHub === 'function') refreshHomeHub();
});

// Resume launches the saved chapter directly. If the story engine has not
// loaded its chapter list yet, fall back to opening the chapter menu rather
// than doing nothing.
function hubResume() {
  const idx = (typeof window._hubResumeIdx === 'number') ? window._hubResumeIdx : 0;
  if (typeof _beginChapter2 === 'function' &&
      typeof STORY_CHAPTERS2 !== 'undefined' && STORY_CHAPTERS2[idx]) {
    _beginChapter2(idx);
    return;
  }
  if (typeof openStoryPath === 'function') openStoryPath();
}
