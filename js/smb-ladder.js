'use strict';
// Fight Ladder: 1v1 bot fights, harder each rung. A win pays coins and unlocks
// the next rung. Rung 0 is also the first-run fight (smb-tutorial.js adds prompts).
// Ladder matches never reach endGame(): checkDeaths() calls ladderOnOut() and the
// result card replaces the game-over screen.
// Depends on: smb-globals.js, smb-menu-ui.js, smb-menu-spawn.js.
// Ticked by smb-loop-core.js (updateLadder). smb-menu-startcore.js reads window._ladderNext.

// `tac` is the opponent's _btTune (smb-bot-tactics.js). The per-frame tactics
// layer is what makes a bot punish and land its Q/E, and against it newcomers
// won 0 of 16 headless duels, so it stays off until rung 9 (tools/bot-duel.js).
// `lesson` makes each rung a skill check: _ladderLessonTick shapes the opponent so the
// fight is hard to win without that skill, and the tip is shown at the start and on a loss.
// Rungs build on each other; the last two ask for all of them at once.
const LADDER_RUNGS = [
  { name: 'Sparring Partner', weapon: 'sword',  cls: 'none',       diff: 'easy',   arena: 'colosseum', lives: 2,
    lesson: { key: 'basics', title: 'Move and swing', tip: 'A and D move, W jumps, Space swings. Walk in and hit him.' } },
  { name: 'Street Brawler',   weapon: 'combat', cls: 'pugilist',   diff: 'easy',   arena: 'city',      lives: 2,
    lesson: { key: 'combo', title: 'String your hits', tip: 'He shakes off one or two hits: that health comes back. Land three in a row and it stays gone.' } },
  { name: 'Iron Knight',      weapon: 'flail',  cls: 'none',       diff: 'medium', arena: 'grass',     lives: 2, tac: { skill: 0 },
    lesson: { key: 'slam', title: 'Guard the big hit', tip: 'When he glows gold, a slam is coming. Hold S to guard it, or step out of reach.' } },
  { name: 'Axe Raider',       weapon: 'axe',    cls: 'kratos',     diff: 'medium', arena: 'forest',    lives: 3, tac: { skill: 0 },
    lesson: { key: 'punish', title: 'Punish the miss', tip: 'His guard is up until he swings. Stay just out of reach, let the axe miss, then hit him.' } },
  { name: 'The Wall',         weapon: 'sword',  cls: 'warrior',    diff: 'medium', arena: 'colosseum', lives: 3, tac: { skill: 0 },
    lesson: { key: 'wall', title: 'Break the guard', tip: 'Swings never break his guard. E shatters it. Q wears it down, so Q then E.' } },
  { name: 'Gunslinger',       weapon: 'gun',    cls: 'gunner',     diff: 'medium', arena: 'city',      lives: 3, tac: { skill: 0 },
    lesson: { key: 'kite', title: 'Close the distance', tip: 'He backs off and shoots. Jump his shots, guard the ones you cannot jump, and corner him.' }, kite: [200, 380] },
  { name: 'Spearhand',        weapon: 'spear',  cls: 'warrior',    diff: 'hard',   arena: 'grass',     lives: 3, tac: { skill: 0 },
    lesson: { key: 'kite', title: 'Get inside the reach', tip: 'His spear outranges you and he steps back to keep you on the tip. Bait a poke, then step in behind it.' }, kite: [110, 140], kiteSpeed: 4.4 },
  { name: 'Hammerfall',       weapon: 'hammer', cls: 'thor',       diff: 'hard',   arena: 'clouds',    lives: 3, tac: { skill: 0 }, kb: 1.35,
    lesson: { key: 'recover', title: 'Come back from the edge', tip: 'His hammer will knock you off. Double jump (W again in the air) and drift back toward the stage. Do not jump straight at him.' } },
  { name: 'Berserker',        weapon: 'axe',    cls: 'berserker',  diff: 'hard',   arena: 'ruins',     lives: 3, tac: { skill: 0.2, think: 10, hesitate: 70 },
    lesson: { key: 'super', title: 'Time your super', tip: 'He gets stronger as he gets hurt. Hold your super until he charges in, then use it.' } },
  { name: 'Champion',         weapon: 'katana', cls: 'ronin',      diff: 'expert', arena: 'colosseum', lives: 3, tac: { skill: 0.7, think: 3, hesitate: 14 },
    lesson: { key: 'all', title: 'Everything at once', tip: 'Guard his strings, punish his misses, break his guard with E, and save your super for his rush.' } },
];
const LADDER_DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };

let ladderActive   = false; // a ladder match is running
let ladderRung     = 0;     // rung of the running (or last) match
let _ladderBotRef  = null;  // the opponent, pinned at match start
let _ladderInit    = false; // opponent configured for this match
let _ladderOver    = false; // the deciding KO has landed
let _ladderWon     = false;
let _ladderFirstRun = false; // the running match is the first-run fight
let _ladderShownAt = 0;     // result card open time, for the input guard
let _ladderWeekly  = false; // Weekly Challenge stage (smb-weekly.js)
let _ladderT0      = 0;     // fight start, for the weekly run clock

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

// Each loss in a row on a rung starts the next try with more health, so a stuck
// player always gets through. A win clears it.
const LADDER_ASSIST_STEP = 0.15, LADDER_ASSIST_MAX = 0.6;

function _ladderLosses(rung) {
  try {
    const o = JSON.parse(localStorage.getItem('smb_ladderLoss') || 'null');
    return o && o.rung === rung ? (o.n | 0) : 0;
  } catch (e) { return 0; }
}

function _setLadderLosses(rung, n) {
  try { localStorage.setItem('smb_ladderLoss', JSON.stringify({ rung, n })); } catch (e) {}
}

/** Extra max health (0 to LADDER_ASSIST_MAX) the player starts this rung with. */
function ladderAssist(rung) { return Math.min(LADDER_ASSIST_MAX, _ladderLosses(rung) * LADDER_ASSIST_STEP); }

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
 * Warrior); later rungs use the player's own 1v1 picks. `opts.def` replaces the
 * rung's opponent with a custom one (Weekly Challenge stages, `opts.weekly`).
 */
function startLadderRung(rung, opts) {
  rung = Math.max(0, Math.min(LADDER_RUNGS.length - 1, rung | 0));
  const def = (opts && opts.def) || LADDER_RUNGS[rung];
  _ladderWeekly = !!(opts && opts.weekly);
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
  _ladderFirstRun = !!(opts && opts.firstRun);

  const assist = (opts && opts.def) ? 0 : ladderAssist(rung);
  window._ladderNext = Object.assign({ rung, firstRun: !!(opts && opts.firstRun) }, def, assist ? { p1HpMul: 1 + assist } : null);
  if (typeof startGame === 'function') startGame();
}

/** Menu entry: fight the highest rung unlocked, or the Weekly Challenge once the ladder is beaten. */
function ladderFightNext() {
  if (typeof WeeklyChallenge !== 'undefined' && WeeklyChallenge.unlocked()) { WeeklyChallenge.fight(); return; }
  startLadderRung(getLadderProgress());
}

/** Per-frame tick. Safe to call every frame in every mode. */
function updateLadder() {
  if (!ladderActive) return;
  if (!gameRunning) { if (!_ladderOver) ladderActive = false; return; }
  if (typeof gameLoading !== 'undefined' && gameLoading) return;
  if (_ladderInit) { _ladderLessonTick(); return; }
  if (!Array.isArray(players) || players.length < 2) return;
  // Name and lives are set at spawn by _startGameCore; this only pins the opponent.
  _ladderBotRef = players[1];
  _ladderInit = true;
  _ladderT0 = performance.now();
  _ladderLS = {};
  if (_ladderFirstRun) _ladderStageFirstRun(players[0], players[1]);
  const L = !_ladderWeekly && !_ladderFirstRun && LADDER_RUNGS[ladderRung].lesson;
  if (L && L.key !== 'basics') _ladderToast('RUNG ' + (ladderRung + 1) + ': ' + L.title.toUpperCase() + '. ' + L.tip);
}

let _ladderLS = {};   // lesson state for the running match

function _ladderToast(text) {
  if (typeof CONTEXT_TIPS === 'undefined' || typeof showContextTip !== 'function') return;
  const id = 'ladder_' + Math.random().toString(36).slice(2, 8);
  CONTEXT_TIPS[id] = { text };
  showContextTip(id);
  delete CONTEXT_TIPS[id];
}

/** Raise and hold the bot's guard at full, so swings can't wear it down. Q/E guard breaks still work. */
function _ladderHoldGuard(b) {
  if ((b.shieldCooldown || 0) > 0 || b.shieldBroken || b.attackTimer > 0) return;
  if (!b.shielding && typeof shieldRaise === 'function' && !shieldRaise(b)) return;
  b.shielding = true;
  if (typeof SHIELD_POOL_MAX !== 'undefined') b.shieldHP = SHIELD_POOL_MAX;
}

/** The lesson's rule for this frame. Runs after the fighters update, so it has the last word. */
function _ladderLessonTick() {
  const def = _ladderWeekly ? null : LADDER_RUNGS[ladderRung];
  const L = def && def.lesson;
  const b = ladderBot(), t = players[0];
  if (!L || !b || !t || _ladderOver || b.health <= 0 || t.health <= 0) return;
  if (typeof isCinematic !== 'undefined' && isCinematic) return;
  if (b._msScene || t._msScene) return;   // Q/E scenes own both fighters
  const S = _ladderLS, fc = frameCount;
  const dx = t.cx() - b.cx(), dist = Math.abs(dx), dir = Math.sign(dx) || 1;

  if (def.kb && !S.kbSet) { b.kbBonus = (b.kbBonus || 1) * def.kb; S.kbSet = true; }

  if (L.key === 'combo') {
    // Damage taken is grouped into strings (a hit within 60 frames continues one). A string
    // shorter than three hits flows back over 40 frames once it has gone cold.
    if (S.hp == null) { S.hp = b.health; S.dmg = 0; S.hits = 0; S.last = 0; S.back = 0; }
    if (b.health < S.hp) { if (fc - S.last > 60) { S.dmg = 0; S.hits = 0; } S.dmg += S.hp - b.health; S.hits++; S.last = fc; S.back = 0; }
    if (S.hits && S.hits < 3 && fc - S.last > 75) { S.back = S.dmg / 40; S.hits = 0; S.dmg = 0; S.backN = 40; }
    if (S.back > 0 && S.backN-- > 0) {
      b.health = Math.min(b.maxHealth, b.health + S.back);
      if (fc % 6 === 0) spawnParticles(b.cx(), b.cy(), '#55ff99', 3);
    }
    S.hp = b.health;
  }

  else if (L.key === 'slam') {
    // Every few seconds in close: plant, glow gold for 45 frames, then a powered swing.
    if (S.cd == null) S.cd = 150;
    if (S.wind > 0) {
      S.wind--; b.vx = 0; b.facing = dir;
      if (fc % 2 === 0) spawnParticles(b.cx(), b.cy() - 6, '#ffcc33', 2);
      if (S.wind === 0) {
        // The slam hits like a super: x2.2 damage and x1.4 knockback for the swing only.
        S.saved = { dm: b.dmgMult, kb: b.kbBonus }; S.restoreAt = fc + 24;
        b.dmgMult = (b.dmgMult || 1) * 2.2; b.kbBonus = (b.kbBonus || 1) * 1.4;
        b.cooldown = 0; b.attack(t); S.cd = 170 + Math.random() * 90;
      }
    } else if (--S.cd <= 0 && dist < 150 && b.onGround) S.wind = 45;
    if (S.saved && fc >= S.restoreAt) { b.dmgMult = S.saved.dm; b.kbBonus = S.saved.kb; S.saved = null; }
  }

  else if (L.key === 'punish' || L.key === 'wall') {
    // Guard up whenever he is not swinging. He swings from the edge of his reach on a timer,
    // and his guard stays down for a short window after: that window is the opening.
    const wall = L.key === 'wall';
    if (S.next == null) { S.next = fc + 90; S.open = 0; }
    if (b.attackTimer > 0) S.open = wall ? 22 : 40;
    else if (S.open > 0) S.open--;
    if (fc >= S.next && dist < b.weapon.range * 1.4 + 40 && b.cooldown <= 0) {
      b.shielding = false; b.facing = dir; b.attack(t);
      S.next = fc + (wall ? 150 + Math.random() * 80 : 70 + Math.random() * 50);
    } else if (S.open <= 0 && dist < 170) _ladderHoldGuard(b);
  }

  else if (L.key === 'kite') {
    // Step away when the player is inside the near range, but never off a ledge.
    const [lo] = def.kite;
    if (dist < lo && b.onGround && b.attackTimer <= 0) {
      const nx = b.x - dir * (def.kiteSpeed || 3.2);
      const ground = typeof _msGroundTop !== 'function' || _msGroundTop(nx + b.w / 2 - dir * 30, b.y + b.h, 60) !== null;
      if (ground) { b.x = nx; b.facing = dir; }
    }
  }
}

/**
 * First-run only: start both fighters on the arena floor, close together, so the
 * opening seconds are a fight rather than a walk across a randomised layout.
 * Placement only: no stats, health or AI state change.
 */
function _ladderStageFirstRun(p1, p2) {
  const plats = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
  const fl = plats.find(q => q && q.isFloor);
  if (!fl || !p1 || !p2) return;
  const cx = fl.x + fl.w / 2;
  p1.x = cx - 140 - p1.w / 2; p1.y = fl.y - p1.h; p1.vx = 0; p1.vy = 0; p1.facing = 1;
  p2.x = cx + 140 - p2.w / 2; p2.y = fl.y - p2.h; p2.vx = 0; p2.vy = 0; p2.facing = -1;
  p1.spawnX = p1.x; p1.spawnY = fl.y;
  p2.spawnX = p2.x; p2.spawnY = fl.y;
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
  if (typeof mentorResult === 'function') mentorResult(_ladderWon);
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

  // Weekly Challenge stages keep their own progress and write their own card.
  const weekly = (_ladderWeekly && typeof WeeklyChallenge !== 'undefined')
    ? WeeklyChallenge.onResult(won, performance.now() - _ladderT0) : null;
  const coins = weekly ? weekly.coins : (won ? ladderReward(rung) : 3);
  if (typeof awardCoins === 'function') awardCoins(coins);
  if (won && !weekly) _setLadderProgress(rung + 1);
  if (!weekly) _setLadderLosses(rung, won ? 0 : _ladderLosses(rung) + 1);
  if (typeof saveGame === 'function') saveGame();
  if (typeof AdManager !== 'undefined') AdManager.interstitial();

  _showLadderResult(won, rung, coins, weekly);
}


function _showLadderResult(won, rung, coins, weekly) {
  const el = document.getElementById('ladderResult');
  if (!el) { if (typeof backToMenu === 'function') backToMenu(); return; }
  if (weekly) {
    const set = (id, text) => { const n = document.getElementById(id); if (n) n.textContent = text; return n; };
    const h = set('ladderResultHead', weekly.head);
    if (h) h.style.color = won ? 'var(--ember)' : 'var(--ui-muted)';
    set('ladderResultSub', weekly.sub);
    set('ladderResultNext', weekly.next);
    const g = set('ladderResultGo', weekly.go);
    if (g) g.dataset.weekly = '1';
    el.style.display = 'flex';
    _ladderShownAt = performance.now();
    return;
  }
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
    nx.style.whiteSpace = 'pre-line';
    nx.textContent = won && last
      ? 'You beat the whole ladder. The Champion will take a rematch any time.'
      : `${won ? 'Next' : 'Try again'}: Rung ${nextRung + 1}, ${next.name} (${LADDER_DIFF_LABEL[next.diff] || next.diff}, ${_ladderWeaponName(next.weapon)})` +
        (won ? '' : `. You start with +${Math.round(ladderAssist(rung) * 100)}% health.`) +
        (!won && LADDER_RUNGS[rung].lesson ? `\n${LADDER_RUNGS[rung].lesson.title}: ${LADDER_RUNGS[rung].lesson.tip}` : '');
  }
  if (go) {
    go.textContent = won ? (last ? 'Rematch' : 'Next Fight') : 'Retry';
    go.dataset.rung = String(nextRung);
    go.dataset.weekly = '';
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
  if (go && go.dataset.weekly === '1' && typeof WeeklyChallenge !== 'undefined') { WeeklyChallenge.fight(); return; }
  const rung = go && go.dataset.rung ? Number(go.dataset.rung) : getLadderProgress();
  startLadderRung(rung);
}

function ladderToMenu() {
  _hideLadderResult();
  if (typeof backToMenu === 'function') backToMenu();
  if (typeof refreshHomeHub === 'function') refreshHomeHub();
}

// Enter continues, Escape goes to the menu. Space is not bound: it is the attack key,
// and mashing it through the KO would skip the card.
window.addEventListener('keydown', function (e) {
  if (!_ladderResultOpen()) return;
  if (performance.now() - _ladderShownAt < 500) return;
  if (e.key === 'Enter') { e.preventDefault(); ladderContinue(); }
  else if (e.key === 'Escape') { e.preventDefault(); ladderToMenu(); }
});


/** List every rung; the ones reached so far can be fought again. */
function openLadderRungs() {
  const el = document.getElementById('ladderRungs'), list = document.getElementById('ladderRungsList');
  if (!el || !list) return;
  const cleared = getLadderCleared();
  list.textContent = '';
  LADDER_RUNGS.forEach(function (def, i) {
    const open = i <= cleared;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'b b-secondary';
    row.disabled = !open;
    row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 14px;text-align:left;' + (open ? '' : 'opacity:0.4;cursor:default;');
    const name = document.createElement('span');
    name.textContent = (i + 1) + '. ' + def.name;
    const info = document.createElement('span');
    info.style.cssText = 'color:var(--ui-muted);font-size:0.78rem;font-weight:600;';
    info.textContent = (def.lesson ? def.lesson.title + ' · ' : '') + (LADDER_DIFF_LABEL[def.diff] || def.diff) + ' · ' + _ladderWeaponName(def.weapon) + (i < cleared ? ' · beaten' : open ? '' : ' · locked');
    row.appendChild(name); row.appendChild(info);
    if (open) row.onclick = function () { closeLadderRungs(); startLadderRung(i); };
    list.appendChild(row);
  });
  el.style.display = 'flex';
}

function closeLadderRungs() {
  const el = document.getElementById('ladderRungs');
  if (el) el.style.display = 'none';
}

window.addEventListener('keydown', function (e) {
  const el = document.getElementById('ladderRungs');
  if (e.key === 'Escape' && el && el.style.display !== 'none') { e.preventDefault(); closeLadderRungs(); }
});


/**
 * Draw the hero card's numbered tile row: `cleared` tiles beaten, the next one
 * lit, the rest chained. `onPick(i)` makes the reached tiles clickable.
 */
function hubRungTiles(total, cleared, onPick) {
  const row = document.getElementById('hubRungs');
  if (!row) return;
  row.textContent = '';
  for (let i = 0; i < total; i++) {
    const open = i <= cleared;
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'hub-rung' + (i === cleared ? ' is-next' : open ? '' : ' is-locked') + (onPick ? '' : ' is-static');
    t.textContent = String(i + 1);
    t.disabled = !open || !onPick;
    if (open && onPick) t.onclick = function () { onPick(i); };
    row.appendChild(t);
  }
}

/** Fill the ladder hero card on the home hub. Called from refreshHomeHub(). */
function refreshLadderCard() {
  const titleEl = document.getElementById('hubLadderTitle');
  if (!titleEl) return;
  // The list is the only way back to beaten rungs.
  const rungsBtn = document.getElementById('hubLadderRungsBtn');
  if (rungsBtn) rungsBtn.style.display = getLadderCleared() > 0 ? '' : 'none';
  // A beaten ladder has nothing left to show: the card becomes the Weekly Challenge.
  if (typeof WeeklyChallenge !== 'undefined' && WeeklyChallenge.unlocked()) { WeeklyChallenge.refreshCard(); return; }
  const n = getLadderProgress();
  const def = LADDER_RUNGS[n];
  titleEl.textContent = `Rung ${n + 1}: ${def.name}`;
  const whereEl = document.getElementById('hubLadderWhere');
  if (whereEl) whereEl.textContent = `${def.lesson ? 'Lesson: ' + def.lesson.title + '. ' : ''}${LADDER_DIFF_LABEL[def.diff] || def.diff} bot, ${_ladderWeaponName(def.weapon)}. Win to climb; clear all ten to unlock the Weekly Challenge.`;
  const cleared = getLadderCleared();
  const barEl = document.getElementById('hubLadderBar');
  if (barEl) barEl.style.width = Math.round((cleared / LADDER_RUNGS.length) * 100) + '%';
  const pctEl = document.getElementById('hubLadderCount');
  if (pctEl) pctEl.textContent = `${cleared} / ${LADDER_RUNGS.length}`;
  hubRungTiles(LADDER_RUNGS.length, cleared, function (i) { startLadderRung(i); });
}
