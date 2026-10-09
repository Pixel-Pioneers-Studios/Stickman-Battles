'use strict';
// smb-tutorial.js — First-run fight (the guided tutorial)
// -------------------------------------------------------
// A first launch skips the menu entirely. The player drops into rung 1 of the
// Fight Ladder (smb-ladder.js) with the starter kit, and this file layers the
// controls over that live fight as prompts. The ladder owns the match and its
// result card; the Tutorial button replays the run.
//
// Nothing here mutates health directly. The bot fights from the first frame and
// both fighters spawn close together (smb-ladder.js), so the first hit is seconds in.
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

// Each step: `need` progress units to clear. `check` runs once per frame and
// returns how much progress to ADD this frame (0 for none). The steps prompt;
// they never gate the fight — the bot fights back from the ATTACK step on.
const TUTORIAL_STEPS = [
  {
    id: 'attack',
    title: 'FIGHT',
    hint: 'A / D move   W jump   SPACE swing. Land 3 hits.',
    need: 3,     // three landed hits
    check(p1, bot) {
      if (!bot) return 0;
      const hit = bot.health < _tutBotHp;
      _tutBotHp = bot.health;
      return hit ? 1 : 0;
    }
  },
  {
    id: 'jump',
    title: 'JUMP',
    hint: 'Press  W  to jump, and again in mid-air to double jump.',
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
    hint: 'Press  Q  for your weapon ability. Every weapon has its own.',
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
    hint: 'Your super meter is full: press  E.  (Full meter + E also breaks a hold.)',
    need: 1,
    grantMeter: true,   // top the meter up so the step is always reachable
    check(p1) {
      return (p1.superMeter < 100 && _tutStepFrames > 8) ? 1 : 0;
    }
  },
  {
    id: 'finish',
    title: 'KNOCK IT OUT',
    hint: 'Take both of its lives. Drain its health or knock it off.',
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
  _tipTick();
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
    // No hold: the bot engages straight away so the first hit lands in seconds.
    // It is the Easy rung-1 opponent, and the prompts never gate the fight.
    _tutBotHp    = bot.health;
    _tutBotLives = bot.lives;
  }
  if (p1.health <= 0) return;

  const step = TUTORIAL_STEPS[tutorialStep];
  if (!step) return;
  _tutStepFrames++;

  // Top the meter up ONCE so the super step is reachable regardless of how the
  // fight went. Granting every frame would mask the spend this step detects.
  if (step.grantMeter && !_tutMeterGranted) { p1.superMeter = 100; _tutMeterGranted = true; }

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
// A first-time player does not need the full 3s splash: clear it early so the
// fight starts sooner. dismissSplash() is idempotent, so the 3s timer is harmless.
try {
  if (!hasSeenTutorial()) setTimeout(function () { if (typeof window.dismissSplash === 'function') window.dismissSplash(); }, 900);
} catch (e) {}

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
  // Compact on short frames (the portal's 918x470): the panel must not eat the arena.
  const ch = ctx.canvas.height;
  const compact = ch < 600;
  const w = Math.min(compact ? 560 : 640, cw - 24), h = compact ? 52 : 82;
  const x = (cw - w) / 2, y = compact ? 84 : 124;
  // The KO is the payoff: once the deciding blow lands (finisher playing, result
  // card pending) the prompts get out of the way.
  if ((typeof activeFinisher !== 'undefined' && activeFinisher) ||
      (typeof _ladderOver !== 'undefined' && _ladderOver)) return;
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

  const tY = compact ? 19 : 24, hY = compact ? 37 : 46;
  ctx.fillStyle = '#3fb6ff';
  ctx.font = compact ? 'bold 14px monospace' : 'bold 15px monospace';
  ctx.fillText(`${step.title}   (${Math.min(tutorialStep + 1, TUTORIAL_STEPS.length)}/${TUTORIAL_STEPS.length})`, cw / 2, y + tY);

  ctx.fillStyle = '#e8f4ff';
  ctx.font = compact ? '12.5px monospace' : '13px monospace';
  ctx.fillText(step.hint, cw / 2, y + hY);

  // Progress bar
  const pct = Math.max(0, Math.min(1, _tutProgress / step.need));
  const bw = w - 60, bx = x + 30, by = y + (compact ? 43 : 58);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(bx, by, bw, compact ? 4 : 7);
  ctx.fillStyle = '#3fb6ff';
  ctx.fillRect(bx, by, bw * pct, compact ? 4 : 7);

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

// ── Contextual tips ──────────────────────────────────────────────────────────
// Toast-only (never a modal, never pauses). Each tip fires once, the first time
// it is relevant, and is remembered per account (localStorage fallback). They
// stay silent during the first-run fight and ladder first run, so that flow is
// untouched. Tap a toast to dismiss; "tips off" silences the rest.

const CONTEXT_TIPS = {
  class:    { text: 'CLASS PERK: your class changes health, speed and passive perks. Read its card in the loadout screen.' },
  super:    { text: 'SUPER READY: press E (SUP). Land 4 supers and the next one opens a DOMAIN.' },
  finisher: { text: 'FINISHER: a KO can trigger a cinematic finisher, set by your weapon, class or move. Turn them off in Settings.' },
  mastery:  { text: 'WEAPON MASTERY: every weapon levels up on its own in Story. Spend EXP in the Skill Tree.' },
};
let _tipFrames = 0, _tipShownAt = -9999, _tipEl = null, _tipHide = 0, _tipWasFin = false;

function _tipSeen(id) { return _tutReadFlag('tip_' + id, 'smb_tip_' + id); }
function _tipMark(id) { _tutWriteFlag('tip_' + id, 'smb_tip_' + id); }

/** Show a tip once. Returns true if it was shown. */
function showContextTip(id) {
  const tip = CONTEXT_TIPS[id];
  if (!tip || _tipSeen(id) || _tutReadFlag('tipsOff', 'smb_tipsOff')) return false;
  if (typeof document === 'undefined' || !document.body) return false;
  _tipMark(id);
  if (!_tipEl) {
    _tipEl = document.createElement('div');
    _tipEl.id = 'ctxTip';
    _tipEl.style.cssText = 'position:fixed;top:128px;left:50%;transform:translateX(-50%);max-width:min(520px,90vw);' +
      'background:rgba(6,12,24,0.92);border:2px solid #3fb6ff;border-radius:10px;color:#e8f4ff;padding:10px 16px;' +
      'font:13px/1.35 monospace;text-align:center;z-index:9000;cursor:pointer;transition:opacity .4s;opacity:0;pointer-events:auto';
    _tipEl.addEventListener('click', function (e) {
      if (e.target && e.target.dataset && e.target.dataset.off) _tutWriteFlag('tipsOff', 'smb_tipsOff');
      _tipEl.style.opacity = '0'; _tipEl.style.pointerEvents = 'none'; _tipHide = 0;
    });
    document.body.appendChild(_tipEl);
  }
  _tipEl.innerHTML = '';
  const t = document.createElement('div'); t.textContent = tip.text; _tipEl.appendChild(t);
  const off = document.createElement('div');
  off.textContent = 'tap to dismiss  |  tips off'; off.dataset.off = '1';
  off.style.cssText = 'margin-top:5px;font-size:10px;opacity:.55';
  _tipEl.appendChild(off);
  _tipEl.style.opacity = '1'; _tipEl.style.pointerEvents = 'auto';
  _tipShownAt = _tipFrames; _tipHide = _tipFrames + 60 * 8;
  return true;
}

function _tipTick() {
  if (_tipHide && _tipFrames > _tipHide && _tipEl) { _tipEl.style.opacity = '0'; _tipEl.style.pointerEvents = 'none'; _tipHide = 0; }
  if (!gameRunning || (typeof gameLoading !== 'undefined' && gameLoading)) return;
  _tipFrames++;
  if (tutorialActive || (typeof ladderActive !== 'undefined' && ladderActive && !hasSeenTutorial())) return;
  if (typeof onlineMode !== 'undefined' && onlineMode) return;
  if ((typeof activeCinematic !== 'undefined' && activeCinematic) || (typeof isCinematic !== 'undefined' && isCinematic)) return;
  const fin = (typeof activeFinisher !== 'undefined') && !!activeFinisher;
  const finRise = fin && !_tipWasFin; _tipWasFin = fin;
  if (_tipFrames - _tipShownAt < 60 * 10) return;   // one toast at a time, spaced out
  const p1 = Array.isArray(players) ? players[0] : null;
  if (!p1 || p1.isAI || p1.isRemote || p1.health <= 0) return;
  if (finRise) { if (showContextTip('finisher')) return; }
  if (_tipFrames < 90) return;
  if ((p1.superReady || p1.superMeter >= 100) && showContextTip('super')) return;
  if (p1.charClass && p1.charClass !== 'none' && _tipFrames > 240 && typeof CLASSES !== 'undefined' && CLASSES[p1.charClass]) {
    if (!_tipSeen('class')) {
      const c = CLASSES[p1.charClass];
      CONTEXT_TIPS.class.text = 'CLASS: ' + c.name.toUpperCase() + ' - ' + c.desc;
      if (showContextTip('class')) return;
    }
  }
  if (typeof storyModeActive !== 'undefined' && storyModeActive && _tipFrames > 600 && p1.weaponKey && p1.weaponKey !== 'fists' && showContextTip('mastery')) return;
}
