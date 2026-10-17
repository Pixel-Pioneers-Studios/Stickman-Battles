'use strict';
// Menu helpers: chaos toggle, resize, refreshMenuFromAccount, edge indicators, home hub.
// Loads after smb-menu-startcore.js.

function toggleChaosMode() {
  if (typeof chaosMode === 'undefined') return;
  chaosMode = !chaosMode;
  const btn = document.getElementById('chaosModeBtn');
  if (btn) {
    btn.textContent = '⚡ Chaos Mode: ' + (chaosMode ? 'ON' : 'OFF');
    btn.classList.toggle('active', chaosMode);
  }
}

function resizeGame() {
  // Canvas CSS box matches the backing store 1:1, so getBoundingClientRect() pixels map straight to canvas coords.
  // No letterboxing and no HUD height subtraction: #hud is fixed and floats over the canvas. Shrinking the
  // box exposed black bars (32-41% of the frame at CrazyGames sizes).
  // gameLoop fit-scales and centres the world, so the aspect ratio is kept inside the frame.
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.style.width      = w + 'px';
  canvas.style.height     = h + 'px';
  canvas.style.marginLeft = '0px';
  canvas.style.marginTop  = '0px';
}

window.addEventListener('resize', resizeGame);

// Start the menu background animation on load.
currentArenaKey = ARENA_KEYS_ORDERED[menuBgArenaIdx];
currentArena    = ARENAS[currentArenaKey];
generateBgElements();
canvas.style.display = 'block';
resizeGame();
menuLoopRunning = true;
requestAnimationFrame(menuBgLoop);

// Home screen shows the build number (opens the changelog). Other version labels stay blank.
(function () { const el = document.getElementById('gameVersionLabel'); if (el && typeof GAME_VERSION !== 'undefined') el.textContent = 'v' + GAME_VERSION; })();
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
// Re-evaluates mode card visibility from the current account. Runs at startup and on account switch/delete.
function refreshMenuFromAccount() {
  const bossCard = document.getElementById('modeBoss');
  if (bossCard) bossCard.style.display = (typeof bossBeaten !== 'undefined' && bossBeaten) ? '' : 'none';

  const tfCard = document.getElementById('modeTrueForm');
  if (tfCard) tfCard.style.display = (typeof unlockedTrueBoss !== 'undefined' && unlockedTrueBoss) ? '' : 'none';

  const sovCard = document.getElementById('modeSovereign');
  if (sovCard) sovCard.style.display = (typeof sovereignBeaten !== 'undefined' && sovereignBeaten) ? '' : 'none';

  const brCard = document.getElementById('modeBossRush');
  if (brCard) brCard.style.display = (typeof bossRushUnlocked !== 'undefined' && bossRushUnlocked) ? '' : 'none';

  const aaCard = document.getElementById('modeAbsoluteAxiom');
  if (aaCard) aaCard.style.display = (typeof absoluteAxiomUnlocked !== 'undefined' && absoluteAxiomUnlocked) ? '' : 'none';

  // Cutscene Theater lists every scene, so it stays hidden until the player reaches the ending it would spoil.
  const csBtn = document.getElementById('cutsceneTheaterBtn');
  if (csBtn) {
    const tfSeen = !!(window.GameState && GameState.getActiveAccount &&
      GameState.getActiveAccount()?.data?.unlocks?.tfEndingSeen);
    const dev = (typeof debugMode !== 'undefined' && debugMode) ||
      (typeof _adminPanelIsAllowed === 'function' && _adminPanelIsAllowed());
    csBtn.style.display = (tfSeen || dev) ? '' : 'none';
  }


  if (typeof refreshCoinDisplay === 'function') refreshCoinDisplay();
  if (typeof syncCodeInput === 'function') syncCodeInput();
  if (typeof refreshMegaknightClassOption === 'function') refreshMegaknightClassOption();
  if (typeof refreshFragmentOptions === 'function') refreshFragmentOptions();
  // Home hub identity and Resume card. Defined below, so called through the typeof guard like other optional hooks.
  if (typeof refreshHomeHub === 'function') refreshHomeHub();
}

refreshMenuFromAccount();
// Init cosmetic swatch lock state and coin display
(function() {
  _syncStoreSwatches();
  const coinEl = document.getElementById('coinDisplay');
  if (coinEl) coinEl.textContent = coinBalance;   // corner badge — number only, see SMB.css
})();

// Init arena & lives dropdowns, default to random on first load
selectArena('random');
selectLives(chosenLives);
// The room list is always visible. Private only hides YOUR room, not other rooms.

// Tuesday cold open: plays once, on the first Story open.
// openStoryPath() calls this and the panel opens when the scene ends.
// Returns true if the prologue took over (caller defers UI to the callback), false if already seen or unavailable.
function maybePlayTuesdayPrologue(onDone) {
  var seen = false;
  try { seen = !!(typeof _story2 !== 'undefined' && _story2 && _story2.tuesdaySeen); } catch (e) {}
  try { if (localStorage.getItem('smb_tuesday_seen') === '1') seen = true; } catch (e) {}
  if (seen || typeof TuesdayPrologue === 'undefined' || !TuesdayPrologue.play) return false;
  if (TuesdayPrologue.isRunning && TuesdayPrologue.isRunning()) return false;

  // Mark seen first, so a throw below can't re-arm the scene and trap the player on every Story open.
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

// Red warning past each end of the floor, where the kill boundary is.
// Marks the strip past each end of the floor with no ground: the real kill boundary. On wide arenas that
// boundary can be off-screen, so this draws the lip and flares when someone is over it.
function drawStageBoundary(scX, scY, camCX, camCY) {
  if (!gameRunning || typeof currentArena === 'undefined' || !currentArena) return;
  // Arenas where the floor edge is not the kill boundary opt out. The Sewer's only isFloor platform is a
  // 210px barge, so its edge would flare permanently. There the hazard is the sewage.
  if (currentArena.noStageBoundary) return;
  // Union of every live floor segment. The Circuit has voids between plates, so .find() would flare the wrong edge.
  let minX = Infinity, maxX = -Infinity;
  for (const pl of (currentArena.platforms || [])) {
    if (!pl || !pl.isFloor || pl.isFloorDisabled) continue;
    if (pl.x < minX) minX = pl.x;
    if (pl.x + pl.w > maxX) maxX = pl.x + pl.w;
  }
  if (!isFinite(minX) || !isFinite(maxX)) return;
  const toScreenX = gx => (gx - camCX) * scX + canvas.width / 2;

  // Key off the nearest local fighter, not the boundary's screen position. The camera can zoom past 1.9x and
  // push the edge off-canvas just as someone is launched over it.
  const WARN_DIST = 210;
  let nearL = Infinity, nearR = Infinity;
  for (const p of players) {
    if (!p || p.health <= 0 || p.isAI) continue;   // warn the human, not the bot
    // Standing on any platform is not a ring-out threat, even past the isFloor union. Without this the band
    // stayed lit (AA Broken Branch).
    if (p.onGround) continue;
    // Only light the band when the edge is a live threat: already past the lip, or knocked toward it.
    const launched = (p.hurtTimer > 0 || p.stunTimer > 0 || p.ragdollTimer > 0) && !p.onGround;
    const dL = p.cx() - minX, dR = maxX - p.cx();
    if (dL < 0 || (launched && p.vx < -1)) nearL = Math.min(nearL, dL);
    if (dR < 0 || (launched && p.vx > 1))  nearR = Math.min(nearR, dR);
  }

  ctx.save();
  // Screen-space overlay, the caller's game transform is still live here.
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
  // Distance readout is measured from the fighter the camera follows.
  const _ref = (gameMode === 'online' && typeof localPlayerSlot !== 'undefined' && players[localPlayerSlot])
    ? players[localPlayerSlot] : players[0];
  for (const p of allP) {
    const sx = (p.cx() - camCX) * scX + canvas.width  / 2;
    const sy = (p.cy() - camCY) * scY + canvas.height / 2;
    const onScreen = sx > -p.w * scX && sx < canvas.width + p.w * scX &&
                     sy > -p.h * scY && sy < canvas.height + p.h * scY;
    if (onScreen) continue;
    const ix = Math.max(MARGIN, Math.min(canvas.width  - MARGIN, sx));
    let iy = Math.max(MARGIN, Math.min(canvas.height - MARGIN, sy));
    // Keep clear of the explore minimap and sidequest tracker, or the arrow slides below them.
    if (gameMode === 'exploration' && Array.isArray(window._hudAvoid)) {
      for (const r of window._hudAvoid) {
        if (ix > r.x - ARROW && ix < r.x + r.w + ARROW && iy > r.y - ARROW && iy < r.y + r.h + ARROW) {
          iy = Math.min(canvas.height - MARGIN, r.y + r.h + ARROW + 18);
        }
      }
    }
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
    ctx.rotate(-angle);
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 9px Arial';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 4;
    ctx.fillText(p.name || '?', 0, ARROW + 12);
    if (_ref && _ref !== p && _ref.health > 0) {
      const _dist = Math.round(Math.hypot(p.cx() - _ref.cx(), p.cy() - _ref.cy()));
      ctx.font = 'bold 10px Arial';
      ctx.fillText(_dist + ' px', 0, ARROW + 23);
    }
    ctx.restore();
  }
}

// Home hub: fills the identity bar and Resume card from the active account's save.
// Every lookup is guarded, so it renders sensibly with no account, save or story data.
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

  // Same source as the journey screen: DEFEATED chapters over the saga's chapter count. The current index
  // is not progress, and on a saga build it is not scoped to this build's chapters.
  const sagaScoped = typeof activeSagaChapterCount === 'function'
                  && typeof isChapterInActiveSaga  === 'function';
  const total = sagaScoped
    ? activeSagaChapterCount()
    : (typeof STORY_CHAPTERS2 !== 'undefined' ? STORY_CHAPTERS2.length : 0);
  // Count distinct in-range entries only. defeated can hold duplicates and mixes ids with indices, so its raw
  // length overcounts (a finished save read 373/186).
  const raw = (typeof _story2 !== 'undefined' && _story2 && Array.isArray(_story2.defeated))
    ? _story2.defeated : [];
  const seen = new Set(raw.filter(i => Number.isInteger(i) && i >= 0 && i < total));
  const done = Math.min(total, sagaScoped
    ? [...seen].filter(i => isChapterInActiveSaga(i)).length
    : seen.size);
  const pct  = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  // Current chapter, clamped into the active saga like the journey list. _story2 is the live state;
  // the account copy is only for saving.
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
    subEl.textContent = done > 0
      ? (done + (done === 1 ? ' CHAPTER' : ' CHAPTERS') + ' CLEARED')
      : 'New recruit';
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

  const storyDescEl = document.getElementById('hubStoryDesc');
  if (storyDescEl) {
    storyDescEl.textContent = complete ? 'Story complete. Replay any chapter.'
      : started ? ('Resume Chapter ' + (idx + 1) + ' · ' + pct + '% done')
      : 'Ninety-four bearers came before you. Start Chapter 1.';
  }
  if (typeof refreshLadderCard === 'function') refreshLadderCard();
}

// The story engine loads after this file, so STORY_CHAPTERS2 and _story2 don't exist during the module-level
// call below. Without a second pass the hub shows 0% even on a finished save.
window.addEventListener('load', function () {
  if (typeof refreshHomeHub === 'function') refreshHomeHub();
});

// Resume launches the saved chapter. If the chapter list isn't loaded yet, open the chapter menu instead.
function hubResume() {
  const idx = (typeof window._hubResumeIdx === 'number') ? window._hubResumeIdx : 0;
  if (typeof _beginChapter2 === 'function' &&
      typeof STORY_CHAPTERS2 !== 'undefined' && STORY_CHAPTERS2[idx]) {
    _beginChapter2(idx);
    return;
  }
  if (typeof openStoryPath === 'function') openStoryPath();
}
