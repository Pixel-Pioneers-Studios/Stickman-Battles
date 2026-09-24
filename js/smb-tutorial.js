'use strict';
// smb-tutorial.js — Guided onboarding tutorial
// -------------------------------------------------------
// Replaces the long-removed `tutorialMode` stub with a real, playable
// first-run tutorial. It runs ON TOP of training mode: the match is a normal
// training session (P1 + a Dummy, infinite lives), and this file adds a step
// gate, progress detection and an instruction HUD over it.
//
// Nothing here mutates health directly, spawns entities outside the existing
// training path, or blocks input — a player can leave at any time with Escape.
//
// Depends on: smb-globals.js, smb-fighter.js, smb-enemies-training.js (Dummy),
//             smb-menu-startcore.js (startGame), smb-input.js (keysDown)
// Ticked by:  smb-loop-core.js  → updateTutorial()
// Drawn by:   smb-loop-core.js  → drawTutorial(ctx)
// -------------------------------------------------------

let tutorialActive   = false;  // true while the guided tutorial is running
let tutorialStep     = 0;      // index into TUTORIAL_STEPS
let tutorialDone     = false;  // set when the final step clears
let _tutProgress     = 0;      // step-local progress counter (meaning is per-step)
let _tutStepFrames   = 0;      // frames spent on the current step
let _tutBannerTimer  = 0;      // "step complete" flash
let _tutDummyHp      = 0;      // dummy HP snapshot, for hit detection
let _tutWasGround    = true;   // previous-frame onGround, for jump detection
let _tutPrevAbilityCd = 0;     // previous-frame abilityCooldown, for rising edge
let _tutMeterGranted  = false; // super meter topped up once for the super step
let _tutPrevVy        = 0;     // previous-frame vy, for jump-launch detection

// Each step: `need` progress units to clear. `check` runs once per frame and
// returns how much progress to ADD this frame (0 for none).
const TUTORIAL_STEPS = [
  {
    id: 'move',
    title: 'MOVE',
    hint: 'Press  A  and  D  to walk left and right.',
    need: 220,   // total pixels walked
    check(p1) {
      return Math.min(Math.abs(p1.vx), 12);
    }
  },
  {
    id: 'jump',
    title: 'JUMP',
    hint: 'Press  W  to jump. Press it again in mid-air to double jump.',
    need: 3,     // three launches
    check(p1) {
      // Count any upward launch, not just ground takeoffs — the hint teaches the
      // double jump, so a mid-air jump has to register too.
      const launched = p1.vy < -4 && _tutPrevVy >= -1;
      _tutPrevVy = p1.vy;
      return launched ? 1 : 0;
    }
  },
  {
    id: 'attack',
    title: 'ATTACK',
    hint: 'Press  SPACE  to swing your weapon. Land 4 hits on the dummy.',
    need: 4,     // four landed hits
    check(p1, dummy) {
      if (!dummy) return 0;
      const hit = dummy.health < _tutDummyHp;
      _tutDummyHp = dummy.health;
      return hit ? 1 : 0;
    }
  },
  {
    id: 'shield',
    title: 'BLOCK',
    hint: 'Hold  S  on the ground to raise your shield. Blocking drains it — let go to recharge.',
    need: 70,    // frames held
    check(p1) {
      return p1.shielding ? 1 : 0;
    }
  },
  {
    id: 'ability',
    title: 'ABILITY',
    hint: 'Press  Q  for your class ability. Every class has a different one.',
    need: 1,
    check(p1) {
      // Ability fired = cooldown rose this frame. A rising edge is required so a
      // cooldown left running by an earlier step can't auto-clear this one.
      const rose = p1.abilityCooldown > _tutPrevAbilityCd;
      _tutPrevAbilityCd = p1.abilityCooldown;
      return rose ? 1 : 0;
    }
  },
  {
    id: 'super',
    title: 'SUPER',
    hint: 'Your super meter fills as you fight. At 100 press  E  to unleash it.',
    need: 1,
    grantMeter: true,   // top the meter up so the step is always reachable
    check(p1) {
      return (p1.superMeter < 100 && _tutStepFrames > 8) ? 1 : 0;
    }
  },
  {
    id: 'depth',
    title: "THAT'S THE CORE",
    hint: 'Weapons, classes and domains build on these six. Press  SPACE  to finish.',
    need: 1,
    check(p1) {
      return (_tutStepFrames > 40 && keysDown.has(' ')) ? 1 : 0;
    }
  }
];

/** Launch the tutorial. Runs a training match with the step gate enabled. */
function startTutorial() {
  if (typeof selectMode === 'function') selectMode('training');
  gameMode = 'training';

  tutorialStep    = 0;
  tutorialDone    = false;
  _tutProgress    = 0;
  _tutStepFrames  = 0;
  _tutBannerTimer = 0;
  _tutWasGround   = true;
  _tutPrevAbilityCd = 0;
  _tutMeterGranted  = false;

  if (typeof startGame === 'function') startGame();

  // Set AFTER startGame — _startGameCore forces tutorialMode/flags off.
  tutorialActive = true;
  tutorialMode   = true;
  _tutDummyHp = _tutDummy()?.health || 0;
}

/** The dummy the tutorial teaches against, if one is alive. */
function _tutDummy() {
  if (!Array.isArray(trainingDummies)) return null;
  return trainingDummies.find(d => d && d.health > 0) || null;
}

/** Per-frame tutorial tick. Safe to call every frame in every mode. */
function updateTutorial() {
  if (!tutorialActive) return;
  if (!gameRunning) { endTutorial(false); return; }
  if (_tutBannerTimer > 0) _tutBannerTimer--;

  const p1 = Array.isArray(players) ? players[0] : null;
  if (!p1 || p1.health <= 0) { _tutWasGround = p1 ? p1.onGround : true; return; }

  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) { endTutorial(true); return; }

  _tutStepFrames++;

  // Top the meter up ONCE so the super step is reachable regardless of how the
  // fight went. Granting every frame would mask the spend this step detects.
  if (step.grantMeter && !_tutMeterGranted) { p1.superMeter = 100; _tutMeterGranted = true; }

  // Keep a dummy alive to practise on.
  const dummy = _tutDummy();
  if (!dummy && typeof spawnTrainingDummy === 'function' && _tutStepFrames % 60 === 0) {
    spawnTrainingDummy();
    _tutDummyHp = _tutDummy()?.health || 0;
  }

  let gained = 0;
  try { gained = step.check(p1, dummy) || 0; } catch (e) { gained = 0; }
  _tutProgress += gained;

  _tutWasGround = p1.onGround;

  if (_tutProgress >= step.need) _advanceTutorialStep();
}

function _advanceTutorialStep() {
  _tutBannerTimer = 70;
  tutorialStep++;
  _tutProgress   = 0;
  _tutStepFrames = 0;

  if (typeof SoundManager !== 'undefined' && SoundManager.pickup) SoundManager.pickup();

  const p1 = Array.isArray(players) ? players[0] : null;
  if (p1) {
    spawnParticles && spawnParticles(p1.x + p1.w / 2, p1.y, '#66ddff', 14);
    _tutPrevAbilityCd = p1.abilityCooldown || 0;
  }

  if (tutorialStep >= TUTORIAL_STEPS.length) endTutorial(true);
  else _tutDummyHp = _tutDummy()?.health || 0;
}

/** Tear the tutorial down. `completed` marks it done and persists the flag. */
function endTutorial(completed) {
  if (!tutorialActive) return;
  tutorialActive = false;
  tutorialMode   = false;

  if (!completed) return;

  tutorialDone = true;
  markTutorialSeen();

  if (typeof unlockAchievement === 'function') unlockAchievement('tutorial_done');
  if (typeof cinScreenFlash !== 'undefined') {
    cinScreenFlash = { color: '#ffffff', alpha: 0.7, timer: 30, maxTimer: 30 };
  }
  if (typeof showToast === 'function') showToast('Tutorial complete — you know the controls.');

  // Drop back to the menu so the player can pick a real mode.
  setTimeout(function () {
    if (typeof backToMenu === 'function') backToMenu();
  }, 900);
}

// ── Persistence ──────────────────────────────────────────────────────────────

/** True once the player has finished (or explicitly dismissed) the tutorial. */
function hasSeenTutorial() {
  try {
    if (window.GameState && GameState.getActiveAccount) {
      return !!GameState.getActiveAccount()?.data?.unlocks?.tutorialSeen;
    }
  } catch (e) {}
  return localStorage.getItem('smb_tutorialSeen') === '1';
}

function markTutorialSeen() {
  try {
    if (typeof setAccountFlagWithRuntime === 'function') {
      setAccountFlagWithRuntime(['unlocks', 'tutorialSeen'], true, function () {});
    }
  } catch (e) {}
  try { localStorage.setItem('smb_tutorialSeen', '1'); } catch (e) {}
}

/** Dismiss the first-run prompt without playing. Never nags again. */
function skipTutorial() {
  markTutorialSeen();
  const el = document.getElementById('tutorialPrompt');
  if (el) el.style.display = 'none';
}

/**
 * Show the first-run tutorial offer. Called from the menu once the account
 * layer is ready; a no-op for anyone who has already seen it.
 */
function maybeOfferTutorial() {
  if (hasSeenTutorial()) return;
  const el = document.getElementById('tutorialPrompt');
  if (el) el.style.display = 'flex';
}

// This file loads near the end of index.html, after refreshMenuFromAccount() has
// already run once at load — so the first-run offer has to register itself here
// rather than relying only on the next menu refresh.
maybeOfferTutorial();

// ── HUD ──────────────────────────────────────────────────────────────────────

/** Draw the instruction panel. Called from the game loop after the world draws. */
function drawTutorial(ctx) {
  if (!tutorialActive || !ctx) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) return;

  // y sits below the player HP/super/cooldown HUD band, which occupies the top
  // ~70px of the canvas — drawing at the very top overlapped the P1 health bar.
  // Width fits the longest hint at 13px monospace (~7.8px/char) without spilling.
  const w = 640, h = 82, x = (GAME_W - w) / 2, y = 78;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(6,12,24,0.88)';
  ctx.strokeStyle = '#3fb6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#3fb6ff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${step.title}   (${Math.min(tutorialStep + 1, TUTORIAL_STEPS.length)}/${TUTORIAL_STEPS.length})`, GAME_W / 2, y + 24);

  ctx.fillStyle = '#e8f4ff';
  ctx.font = '13px monospace';
  ctx.fillText(step.hint, GAME_W / 2, y + 46);

  // Progress bar
  const pct = Math.max(0, Math.min(1, _tutProgress / step.need));
  const bw = w - 60, bx = x + 30, by = y + 58;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(bx, by, bw, 7);
  ctx.fillStyle = '#3fb6ff';
  ctx.fillRect(bx, by, bw * pct, 7);

  if (_tutBannerTimer > 0) {
    ctx.globalAlpha = Math.min(1, _tutBannerTimer / 30);
    ctx.fillStyle = '#66ffaa';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('GOOD', GAME_W / 2, y + h + 40);
  }

  ctx.restore();
  ctx.textAlign = 'left';
}
