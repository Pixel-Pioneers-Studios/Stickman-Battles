'use strict';
// smb-ladder.js — Fight Ladder: a run of 1v1 bot fights that get harder rung by rung
// -------------------------------------------------------
// Each rung is a fixed opponent (weapon, class, difficulty, arena). A win pays
// coins and unlocks the next rung; a loss offers a retry. Rung 0 doubles as the
// first-run fight: smb-tutorial.js layers its control prompts over it.
//
// A ladder match never reaches endGame(): checkDeaths() hands the final KO to
// ladderOnOut(), and the result card below replaces the game-over screen.
//
// Depends on: smb-globals.js, smb-menu-ui.js (selectMode, awardCoins),
//             smb-menu-spawn.js (startGame)
// Ticked by:  smb-loop-core.js  → updateLadder()
// Hooked by:  smb-drawing-arenas.js checkDeaths() → ladderOnOut(p)
//             smb-menu-startcore.js reads window._ladderNext for the match setup
// -------------------------------------------------------

const LADDER_RUNGS = [
  { name: 'Sparring Partner', weapon: 'sword',  cls: 'none',      diff: 'easy',   arena: 'colosseum', lives: 2 },
  { name: 'Street Brawler',   weapon: 'combat', cls: 'pugilist',  diff: 'easy',   arena: 'city',      lives: 2 },
  { name: 'Spearhand',        weapon: 'spear',  cls: 'warrior',   diff: 'medium', arena: 'grass',     lives: 2 },
  { name: 'Axe Raider',       weapon: 'axe',    cls: 'kratos',    diff: 'medium', arena: 'forest',    lives: 2 },
  { name: 'Shadow Blade',     weapon: 'sword',  cls: 'ninja',     diff: 'medium', arena: 'clouds',    lives: 3 },
  { name: 'Hammerfall',       weapon: 'hammer', cls: 'thor',      diff: 'hard',   arena: 'ruins',     lives: 3 },
  { name: 'The Reaper',       weapon: 'scythe', cls: 'reaper',    diff: 'hard',   arena: 'colosseum', lives: 3 },
  { name: 'Wandering Ronin',  weapon: 'katana', cls: 'ronin',     diff: 'hard',   arena: 'city',      lives: 3 },
  { name: 'Berserker',        weapon: 'axe',    cls: 'berserker', diff: 'expert', arena: 'ruins',     lives: 3 },
  { name: 'Champion',         weapon: 'katana', cls: 'ronin',     diff: 'expert', arena: 'colosseum', lives: 3 },
];
const LADDER_DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };

let ladderActive   = false; // a ladder match is running
let ladderRung     = 0;     // rung of the running (or last) match
let _ladderBotRef  = null;  // the opponent, pinned at match start
let _ladderInit    = false; // opponent configured for this match
let _ladderOver    = false; // the deciding KO has landed
let _ladderWon     = false;
let _ladderShownAt = 0;     // result card open time, for the input guard

/** Rungs beaten so far, 0 to LADDER_RUNGS.length. */
function getLadderCleared() {
  let n = 0;
  try {
    const acctVal = (window.GameState && GameState.getActiveAccount)
      ? GameState.getActiveAccount()?.data?.unlocks?.ladderRung : undefined;
    n = Number(acctVal ?? localStorage.getItem('smb_ladderRung')) || 0;
  } catch (e) {}
  return Math.max(0, Math.min(LADDER_RUNGS.length, n));
}

/** Highest rung open to fight (0-based): the first unbeaten one, or the last. */
function getLadderProgress() { return Math.min(LADDER_RUNGS.length - 1, getLadderCleared()); }

function _setLadderProgress(n) {
  n = Math.max(0, Math.min(LADDER_RUNGS.length, n));
  if (n <= getLadderCleared()) return;
  try {
    if (typeof setAccountFlagWithRuntime === 'function') {
      setAccountFlagWithRuntime(['unlocks', 'ladderRung'], n, function () {});
    }
  } catch (e) {}
  try { localStorage.setItem('smb_ladderRung', String(n)); } catch (e) {}
}

function ladderReward(rung) { return 10 + rung * 5; }

function _ladderWeaponName(key) {
  const w = (typeof WEAPONS !== 'undefined') ? WEAPONS[key] : null;
  return (w && w.name) ? w.name : key;
}

/** The opponent of the running ladder match. */
function ladderBot() {
  if (_ladderBotRef && Array.isArray(players) && players.includes(_ladderBotRef)) return _ladderBotRef;
  return null;
}

/**
 * Start a ladder match. `opts.firstRun` locks P1 to the starter loadout (sword,
 * Warrior); later rungs use the player's own 1v1 picks.
 */
function startLadderRung(rung, opts) {
  rung = Math.max(0, Math.min(LADDER_RUNGS.length - 1, rung | 0));
  const def = LADDER_RUNGS[rung];
  _hideLadderResult();
  const sm = document.getElementById('storyModal');
  if (sm) sm.style.display = 'none';
  const ov = document.getElementById('prologueOverlay');
  if (ov) ov.style.display = 'none';

  if (typeof selectMode === 'function') selectMode('2p');
  p1IsBot  = false;
  p2IsBot  = true;
  p2IsNone = false;
  const b = document.getElementById('p2BotToggle');
  if (b) b.textContent = 'Bot';

  ladderActive  = true;
  ladderRung    = rung;
  _ladderBotRef = null;
  _ladderInit   = false;
  _ladderOver   = false;
  _ladderWon    = false;

  window._ladderNext = Object.assign({ rung, firstRun: !!(opts && opts.firstRun) }, def);
  if (typeof startGame === 'function') startGame();
}

/** Menu entry: fight the highest rung unlocked. */
function ladderFightNext() { startLadderRung(getLadderProgress()); }

/** Per-frame tick. Safe to call every frame in every mode. */
function updateLadder() {
  if (!ladderActive) return;
  if (!gameRunning) { if (!_ladderOver) ladderActive = false; return; }
  if (typeof gameLoading !== 'undefined' && gameLoading) return;
  if (_ladderInit) return;
  if (!Array.isArray(players) || players.length < 2) return;
  // Name and lives are set at spawn by _startGameCore; this only pins the opponent.
  _ladderBotRef = players[1];
  _ladderInit = true;
}

/**
 * Called from checkDeaths() when a fighter runs out of lives. Returns true when
 * the ladder takes over from endGame().
 */
function ladderOnOut(p) {
  if (!ladderActive || _ladderOver || !p || gameMode !== '2p') return false;
  const bot = ladderBot();
  if (!bot || (p !== bot && p !== players[0])) return false;
  _ladderOver = true;
  _ladderWon  = p === bot;
  // Let the KO land (death animation, finisher) before the card covers it.
  setTimeout(_ladderFinish, 1400);
  return true;
}

function _ladderFinish() {
  if (!ladderActive) return;
  ladderActive = false;
  const won = _ladderWon;
  const rung = ladderRung;

  if (typeof ReplaySystem !== 'undefined') ReplaySystem.stopRecording();
  if (typeof cgSdk !== 'undefined') cgSdk.gameplayStop();
  gameRunning = false;
  const hud = document.getElementById('hud');
  if (hud) hud.style.display = 'none';

  if (typeof tutorialActive !== 'undefined' && tutorialActive && typeof endTutorial === 'function') endTutorial(true);

  const coins = won ? ladderReward(rung) : 3;
  if (typeof awardCoins === 'function') awardCoins(coins);
  if (won) _setLadderProgress(rung + 1);
  if (typeof saveGame === 'function') saveGame();
  if (typeof AdManager !== 'undefined') AdManager.interstitial();

  _showLadderResult(won, rung, coins);
}

// ── Result card ──────────────────────────────────────────────────────────────

function _showLadderResult(won, rung, coins) {
  const el = document.getElementById('ladderResult');
  if (!el) { if (typeof backToMenu === 'function') backToMenu(); return; }
  const last = rung >= LADDER_RUNGS.length - 1;
  const nextRung = won ? Math.min(rung + 1, LADDER_RUNGS.length - 1) : rung;
  const next = LADDER_RUNGS[nextRung];

  const head = document.getElementById('ladderResultHead');
  const sub  = document.getElementById('ladderResultSub');
  const nx   = document.getElementById('ladderResultNext');
  const go   = document.getElementById('ladderResultGo');
  if (head) {
    head.textContent = won ? (last ? 'CHAMPION' : 'VICTORY') : 'DEFEATED';
    head.style.color = won ? 'var(--ember)' : 'var(--ui-muted)';
  }
  if (sub) sub.textContent = (won ? `Rung ${rung + 1} cleared` : `Rung ${rung + 1}: ${LADDER_RUNGS[rung].name}`) + `  ·  +${coins} coins`;
  if (nx) {
    nx.textContent = won && last
      ? 'You beat the whole ladder. The Champion will take a rematch any time.'
      : `${won ? 'Next' : 'Try again'}: Rung ${nextRung + 1}, ${next.name} (${LADDER_DIFF_LABEL[next.diff] || next.diff}, ${_ladderWeaponName(next.weapon)})`;
  }
  if (go) {
    go.textContent = won ? (last ? 'Rematch' : 'Next Fight') : 'Retry';
    go.dataset.rung = String(nextRung);
  }
  el.style.display = 'flex';
  _ladderShownAt = performance.now();
}

function _hideLadderResult() {
  const el = document.getElementById('ladderResult');
  if (el) el.style.display = 'none';
}

function _ladderResultOpen() {
  const el = document.getElementById('ladderResult');
  return !!el && el.style.display !== 'none';
}

/** "Next Fight" / "Retry" on the result card. */
function ladderContinue() {
  const go = document.getElementById('ladderResultGo');
  const rung = go && go.dataset.rung ? Number(go.dataset.rung) : getLadderProgress();
  startLadderRung(rung);
}

function ladderToMenu() {
  _hideLadderResult();
  if (typeof backToMenu === 'function') backToMenu();
  if (typeof refreshHomeHub === 'function') refreshHomeHub();
}

// Enter continues, Escape goes to the menu. Space is deliberately not bound:
// it is the attack key, and a player still mashing it through the KO would skip
// the card. Input in the first half-second is ignored for the same reason.
window.addEventListener('keydown', function (e) {
  if (!_ladderResultOpen()) return;
  if (performance.now() - _ladderShownAt < 500) return;
  if (e.key === 'Enter') { e.preventDefault(); ladderContinue(); }
  else if (e.key === 'Escape') { e.preventDefault(); ladderToMenu(); }
});

// ── Home hub card ────────────────────────────────────────────────────────────

/** Fill the ladder hero card on the home hub. Called from refreshHomeHub(). */
function refreshLadderCard() {
  const titleEl = document.getElementById('hubLadderTitle');
  if (!titleEl) return;
  const n = getLadderProgress();
  const def = LADDER_RUNGS[n];
  titleEl.textContent = `Rung ${n + 1}: ${def.name}`;
  const whereEl = document.getElementById('hubLadderWhere');
  if (whereEl) whereEl.textContent = `${LADDER_DIFF_LABEL[def.diff] || def.diff} bot, ${_ladderWeaponName(def.weapon)}. Win to climb; every rung pays coins.`;
  const cleared = getLadderCleared();
  const barEl = document.getElementById('hubLadderBar');
  if (barEl) barEl.style.width = Math.round((cleared / LADDER_RUNGS.length) * 100) + '%';
  const pctEl = document.getElementById('hubLadderCount');
  if (pctEl) pctEl.textContent = `${cleared} / ${LADDER_RUNGS.length}`;
}
