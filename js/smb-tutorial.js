'use strict';
// smb-tutorial.js — First-run fight (the guided tutorial)
// -------------------------------------------------------
// A first launch skips the menu entirely. The player drops into rung 1 of the
// Fight Ladder (smb-ladder.js) with the starter kit, and this file layers the
// controls over that live fight as prompts. The ladder owns the match and its
// result card; the Tutorial button replays the run.
//
// Nothing here mutates health directly. The bot is held idle with the existing
// _aiHoldUntil spawn-grace gate until the ATTACK prompt, or until it is hit.
//
// Depends on: smb-globals.js, smb-fighter.js, smb-ladder.js, smb-input.js (keysDown)
// Ticked by:  smb-loop-core.js  → updateTutorial()
// Drawn by:   smb-loop-core.js  → drawTutorial(ctx)
// Hooked by:  index.html dismissSplash() → maybeStartFirstRun()
// -------------------------------------------------------

let tutorialActive   = false;  // true while the first-run prompts are running
let tutorialStep     = 0;      // index into TUTORIAL_STEPS
let tutorialDone     = false;  // set when the first-run fight finishes
let _tutFrames       = 0;      // frames since the fight started
let _tutProgress     = 0;      // step-local progress counter (meaning is per-step)
let _tutStepFrames   = 0;      // frames spent on the current step
let _tutBannerTimer  = 0;      // "step complete" flash
let _tutBotHp        = 0;      // bot HP snapshot, for hit detection
let _tutBotLives     = 0;      // bot lives snapshot, for KO detection
let _tutPrevAbilityCd = 0;     // previous-frame abilityCooldown, for rising edge
let _tutMeterGranted  = false; // super meter topped up once for the super step
let _tutPrevVy        = 0;     // previous-frame vy, for jump-launch detection
let _tutFightInit     = false; // bot held for the opening steps

const FIRST_RUN_BOT_RELEASE = 900;  // the bot engages on its own after 15s regardless

// Each step: `need` progress units to clear. `check` runs once per frame and
// returns how much progress to ADD this frame (0 for none). The steps prompt;
// they never gate the fight — the bot fights back from the ATTACK step on.
const TUTORIAL_STEPS = [
  {
    id: 'move',
    title: 'MOVE',
    hint: 'Press  A  and  D  to walk left and right.',
    need: 160,   // total pixels walked
    check(p1) {
      return Math.min(Math.abs(p1.vx), 12);
    }
  },
  {
    id: 'jump',
    title: 'JUMP',
    hint: 'Press  W  to jump. Press it again in mid-air to double jump.',
    need: 2,     // two launches
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
    hint: 'Press  SPACE  to swing. Land 3 hits on the bot. It fights back now.',
    need: 3,     // three landed hits
    releaseBot: true,
    check(p1, bot) {
      if (!bot) return 0;
      const hit = bot.health < _tutBotHp;
      _tutBotHp = bot.health;
      return hit ? 1 : 0;
    }
  },
  {
    id: 'shield',
    title: 'BLOCK',
    hint: 'Hold  S  on the ground to raise your shield. Blocking drains it.',
    need: 45,    // frames held
    check(p1) {
      return p1.shielding ? 1 : 0;
    }
  },
  {
    id: 'ability',
    title: 'ABILITY',
    hint: 'Press  Q  for your weapon ability. Every weapon has a different one.',
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
    hint: 'Your super meter fills as you fight. It is full now: press  E.  Caught in a move? A full meter + E breaks out.',
    need: 1,
    grantMeter: true,   // top the meter up so the step is always reachable
    check(p1) {
      return (p1.superMeter < 100 && _tutStepFrames > 8) ? 1 : 0;
    }
  },
  {
    id: 'finish',
    title: 'KNOCK IT OUT',
    hint: 'Take both of its lives. Drain its health or knock it off the stage.',
    need: 2,
    check(p1, bot) {
      if (!bot) return 0;
      const lost = Math.max(0, _tutBotLives - bot.lives);
      _tutBotLives = bot.lives;
      return lost;
    }
  }
];

/** Launch the first-run fight: ladder rung 1 with the control prompts on top. */
function startTutorial() {
  // Starting counts as having seen it: a player who quits partway is not thrown
  // back in on the next launch. The Tutorial nav button replays it.
  markTutorialSeen();
  tutorialStep      = 0;
  tutorialDone      = false;
  _tutFrames        = 0;
  _tutProgress      = 0;
  _tutStepFrames    = 0;
  _tutBannerTimer   = 0;
  _tutPrevAbilityCd = 0;
  _tutMeterGranted  = false;
  _tutPrevVy        = 0;
  _tutFightInit     = false;
  tutorialActive    = true;
  if (typeof startLadderRung === 'function') startLadderRung(0, { firstRun: true });
}

/** The bot the first fight teaches against. */
function _tutBot() { return typeof ladderBot === 'function' ? ladderBot() : null; }

/** Per-frame tick. Safe to call every frame in every mode. */
function updateTutorial() {
  if (!tutorialActive) return;
  if (!gameRunning) {
    // The ladder stops the match itself and ends the prompts from its result
    // card; anything else stopping it (the Menu button) abandons the tutorial.
    if (!(typeof ladderActive !== 'undefined' && ladderActive)) endTutorial(false);
    return;
  }
  if (typeof gameLoading !== 'undefined' && gameLoading) return;
  _tutFrames++;
  _tutUpdateFight();
}

function _tutUpdateFight() {
  if (_tutBannerTimer > 0) _tutBannerTimer--;
  const p1  = Array.isArray(players) ? players[0] : null;
  const bot = _tutBot();
  if (!p1 || !bot) return;

  if (!_tutFightInit) {
    _tutFightInit = true;
    bot._aiHoldUntil = Infinity;
    _tutBotHp    = bot.health;
    _tutBotLives = bot.lives;
  }
  if (bot._aiHoldUntil && _tutFrames >= FIRST_RUN_BOT_RELEASE) bot._aiHoldUntil = 0;
  if (p1.health <= 0) return;

  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) return;
  _tutStepFrames++;

  // Top the meter up ONCE so the super step is reachable regardless of how the
  // fight went. Granting every frame would mask the spend this step detects.
  if (step.grantMeter && !_tutMeterGranted) { p1.superMeter = 100; _tutMeterGranted = true; }
  if (step.releaseBot && bot._aiHoldUntil) bot._aiHoldUntil = 0;

  let gained = 0;
  try { gained = step.check(p1, bot) || 0; } catch (e) { gained = 0; }
  _tutProgress += gained;

  // Track HP and lives every frame so a step that doesn't read them can't hand
  // a stale snapshot to the step that does.
  if (step.id !== 'attack') _tutBotHp = bot.health;
  if (step.id !== 'finish') _tutBotLives = bot.lives;

  if (_tutProgress >= step.need && tutorialStep < TUTORIAL_STEPS.length - 1) _advanceTutorialStep();
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
  const bot = _tutBot();
  if (bot) { _tutBotHp = bot.health; _tutBotLives = bot.lives; }
}

/** Tear the prompts down. `completed` marks the tutorial done; the ladder's
 *  result card decides what the player sees next. */
function endTutorial(completed) {
  if (!tutorialActive) return;
  tutorialActive = false;
  tutorialMode   = false;
  if (!completed) return;
  tutorialDone = true;
  markTutorialSeen();
  if (typeof unlockAchievement === 'function') unlockAchievement('tutorial_done');
}

// ── Persistence ──────────────────────────────────────────────────────────────

function _tutReadFlag(key, lsKey) {
  try {
    if (window.GameState && GameState.getActiveAccount) {
      return !!GameState.getActiveAccount()?.data?.unlocks?.[key];
    }
  } catch (e) {}
  return localStorage.getItem(lsKey) === '1';
}

function _tutWriteFlag(key, lsKey) {
  try {
    if (typeof setAccountFlagWithRuntime === 'function') {
      setAccountFlagWithRuntime(['unlocks', key], true, function () {});
    }
  } catch (e) {}
  try { localStorage.setItem(lsKey, '1'); } catch (e) {}
}

/** True once the player has started the first-run flow. */
function hasSeenTutorial() { return _tutReadFlag('tutorialSeen', 'smb_tutorialSeen'); }
function markTutorialSeen() { _tutWriteFlag('tutorialSeen', 'smb_tutorialSeen'); }

/**
 * Called when the splash screen clears. A first-time player goes straight into
 * the first-run fight instead of the menu, unless something else already owns
 * the session (an invite link, a running match).
 */
function maybeStartFirstRun() {
  if (hasSeenTutorial()) return;
  if (gameRunning || tutorialActive) return;
  if (typeof onlineMode !== 'undefined' && onlineMode) return;
  if (gameMode === 'online') return;
  if (typeof NetworkManager !== 'undefined' && NetworkManager.connected) return;
  startTutorial();
}

// ── HUD ──────────────────────────────────────────────────────────────────────

/** Draw the prompt panel. Called from the game loop after the world draws. */
function drawTutorial(ctx) {
  if (!tutorialActive || !ctx) return;
  const cw = ctx.canvas.width;

  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) return;

  // Drawn in screen pixels (identity transform), so centre on the real canvas
  // width, not GAME_W. y clears the player HUD band, which is ~115px tall.
  // Width fits the longest hint at 13px monospace (~7.8px/char) without spilling.
  const w = Math.min(640, cw - 24), h = 82, x = (cw - w) / 2, y = 124;
  // This is a live fight, so a fighter can jump up behind the panel: fade it out
  // of the way rather than hide the opponent behind the instructions.
  const panelAlpha = _tutFighterBehind(x, y, w, h) ? 0.5 : 1;

  ctx.save();
  ctx.globalAlpha = 0.92 * panelAlpha;
  ctx.fillStyle = 'rgba(6,12,24,0.88)';
  ctx.strokeStyle = '#3fb6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, 10) : ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = panelAlpha;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#3fb6ff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${step.title}   (${Math.min(tutorialStep + 1, TUTORIAL_STEPS.length)}/${TUTORIAL_STEPS.length})`, cw / 2, y + 24);

  ctx.fillStyle = '#e8f4ff';
  ctx.font = '13px monospace';
  ctx.fillText(step.hint, cw / 2, y + 46);

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
    ctx.fillText('GOOD', cw / 2, y + h + 40);
  }

  ctx.restore();
  ctx.textAlign = 'left';
}

/** True when any live fighter's on-screen box overlaps the given screen rect. */
function _tutFighterBehind(x, y, w, h) {
  if (!Array.isArray(players) || typeof camZoomCur === 'undefined') return false;
  const fX = (ctx.canvas.width / GAME_W) * camZoomCur;
  const fY = (ctx.canvas.height / GAME_H) * camZoomCur;
  for (const p of players) {
    if (!p || p.health <= 0) continue;
    const sx = (p.x - camXCur) * fX + ctx.canvas.width / 2;
    // Include the name tag and health bar drawn ~30px above the head.
    const sy = (p.y - 30 - camYCur) * fY + ctx.canvas.height / 2;
    const sw = p.w * fX, sh = (p.h + 30) * fY;
    if (sx < x + w && sx + sw > x && sy < y + h && sy + sh > y) return true;
  }
  return false;
}
