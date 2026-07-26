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
  const hud   = document.getElementById('hud');
  const hudH  = (hud && hud.offsetHeight) || 0;
  const avW   = window.innerWidth;
  const avH   = window.innerHeight - hudH;
  const isMob = avW < 900 || avH < 600;

  let w, h, ml = 0, mt = 0;
  if (isMob) {
    // Letterbox: fit inside available space while keeping 900×520 ratio
    const aspect = GAME_W / GAME_H;
    if (avW / avH > aspect) {
      h  = avH;
      w  = Math.round(h * aspect);
      ml = Math.round((avW - w) / 2);
    } else {
      w  = avW;
      h  = Math.round(w / aspect);
      mt = Math.round((avH - h) / 2);
    }
  } else {
    w = avW;
    h = avH;
  }

  canvas.style.width      = w  + 'px';
  canvas.style.height     = h  + 'px';
  canvas.style.marginLeft = ml + 'px';
  canvas.style.marginTop  = mt + 'px';
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
(function() { const el = document.getElementById('gameVersionLabel'); if (el && typeof GAME_VERSION !== 'undefined') el.textContent = GAME_VERSION; })();
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

  if (typeof refreshCoinDisplay === 'function') refreshCoinDisplay();
  if (typeof syncCodeInput === 'function') syncCodeInput();
  if (typeof refreshMegaknightClassOption === 'function') refreshMegaknightClassOption();
}

refreshMenuFromAccount();
// Init cosmetic swatch lock state and coin display
(function() {
  _syncStoreSwatches();
  const coinEl = document.getElementById('coinDisplay');
  if (coinEl) coinEl.textContent = coinBalance + ' ⬡';
})();

// Init arena & lives dropdowns — default to random on first load
selectArena('random');
selectLives(chosenLives);
// Init public room browser hidden by default (private is default)
(function() {
  const browser = document.getElementById('publicRoomBrowser');
  if (browser) browser.style.display = 'none'; // hidden until "Public" selected
  // Also auto-refresh room list when Online mode is opened
})();

// First-time visit (or chapter 0 not yet beaten): open Story Mode and force Chapter 1
(function() {
  // _story2 is declared in smb-story-config.js, ~70 script tags after this file.
  // A fixed timer started here can fire before those have evaluated on a slow
  // connection, and a bare reference to a not-yet-created binding throws
  // ReferenceError rather than reading as undefined. Wait for it instead.
  var _s2Waits = 0;
  function _whenStory2Ready(fn) {
    var ready = false;
    try { ready = typeof _story2 !== 'undefined' && !!_story2; } catch (e) {}
    if (ready) { setTimeout(fn, 500); return; }
    if (_s2Waits++ > 100) return; // never arrived — skip the hook, don't crash
    setTimeout(function () { _whenStory2Ready(fn); }, 100);
  }
  try {
    _whenStory2Ready(() => {
      try {
        const ch0Beaten = (typeof _story2 !== 'undefined')
          ? (Array.isArray(_story2.defeated) && _story2.defeated.includes(0))
          : false;
        if (!ch0Beaten) {
          selectMode('story');
          setTimeout(() => {
            const _toCh0 = () => { if (typeof _beginChapter2 === 'function') _beginChapter2(0); };
            const _seamThenCh0 = () => {
              if (typeof _showPrologue === 'function') _showPrologue(_toCh0);
              else _toCh0();
            };
            // Tuesday plays first — the ordinary man, unattributed. The seam lines
            // then read as the bridge into the player's own story. Skipping
            // Tuesday skips straight past the seam text too.
            // Gated on a localStorage key as well as the save field: this runs
            // ~800ms after load, which can beat the save finishing, and reading
            // only _story2 replayed the cold open on every launch.
            let _tuesSeen = !!(typeof _story2 !== 'undefined' && _story2 && _story2.tuesdaySeen);
            try { if (localStorage.getItem('smb_tuesday_seen') === '1') _tuesSeen = true; } catch (e) {}
            if (typeof TuesdayPrologue !== 'undefined' && !_tuesSeen) {
              if (typeof _story2 !== 'undefined' && _story2) _story2.tuesdaySeen = true;
              try { localStorage.setItem('smb_tuesday_seen', '1'); } catch (e) {}
              if (typeof _saveStory2 === 'function') _saveStory2();
              TuesdayPrologue.play((skipped) => { if (skipped) _toCh0(); else _seamThenCh0(); });
            } else {
              _seamThenCh0();
            }
          }, 300);
        }
      } catch(e) {}
    });
  } catch(e) {}
})();

// ============================================================
// EDGE PLAYER INDICATORS
// ============================================================
function drawEdgeIndicators(scX, scY, camCX, camCY) {
  if (!gameRunning) return;
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
