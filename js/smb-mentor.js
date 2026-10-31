'use strict';
// Mentor: learning assist for a new player's first stretch of play.
// It watches every local fight against the computer and keeps one number,
// `level` (1 = full assist, 0 = the game as designed). Each crutch below
// switches off when the level drops past its threshold, so the assists leave
// one at a time and the player is told when each one goes.
//
// level = min(ceiling, need)
//   need    follows performance: share of damage dealt vs taken each match.
//   ceiling falls with experience (matches played, ladder rungs cleared) and
//           reaches 0 whatever the results, so the crutches always come off.
// At ceiling 0 the Mentor retires for good.
//
// Never runs online, in local 2-human matches, training or replays.
// Depends on: smb-globals.js, smb-combat.js (reads _assistTaken/_assistKb),
// smb-ladder.js, smb-tutorial.js (CONTEXT_TIPS, showContextTip).
// Ticked by smb-loop-core.js (updateMentor).

const MENTOR_KEY = 'smb_mentor';
const MENTOR_FULL_MATCHES = 4;    // full ceiling for this many matches
const MENTOR_LAST_MATCH   = 40;   // ceiling reaches 0 here
const MENTOR_LADDER_FREE  = 2;    // rungs cleared before the ladder starts cutting the ceiling
const MENTOR_LADDER_SPAN  = 5;    // rungs past that to cut it to 0

// Highest first: the crutch with the highest threshold is the first to go.
const MENTOR_CRUTCHES = [
  { id: 'botAbility', at: 0.60, gone: 'Opponents now use their abilities as often as they like.' },
  { id: 'botPause',   at: 0.35, gone: 'Opponents stop hesitating. Read their swings and punish the miss.' },
  { id: 'ledgeSave',  at: 0.20, gone: 'No more edge saves. Double jump back to the stage yourself.' },
];
const MENTOR_RETIRED_MSG = 'Training wheels off. From here you play the game as it is meant to be played.';

let _mentor = null;     // persisted record, loaded lazily
let _mentorMatch = null; // running match tally
let _mentorLevel = 0;   // level for the running match

function _mentorDefault() {
  return { v: 1, matches: 0, need: 1, retired: false, off: false, announced: [], pending: [] };
}

function _mentorVeteran() {
  try {
    if (typeof getLadderCleared === 'function' && getLadderCleared() >= MENTOR_LADDER_FREE + MENTOR_LADDER_SPAN) return true;
    if (typeof _story2 !== 'undefined' && _story2 && Array.isArray(_story2.defeated) && _story2.defeated.length >= 12) return true;
  } catch (e) {}
  return false;
}

function _mentorLoad() {
  if (_mentor) return _mentor;
  let o = null;
  try { o = JSON.parse(localStorage.getItem(MENTOR_KEY) || 'null'); } catch (e) {}
  if (!o || o.v !== 1) {
    o = _mentorDefault();
    // Players who were already deep in the game before the Mentor existed start without it.
    if (_mentorVeteran()) o.retired = true;
  }
  _mentor = Object.assign(_mentorDefault(), o);
  _mentorSave();
  return _mentor;
}

function _mentorSave() {
  try { localStorage.setItem(MENTOR_KEY, JSON.stringify(_mentor)); } catch (e) {}
}

function _mentorCeiling(m) {
  const t = Math.max(0, m.matches - MENTOR_FULL_MATCHES) / (MENTOR_LAST_MATCH - MENTOR_FULL_MATCHES);
  let c = 1 - t;
  const cleared = typeof getLadderCleared === 'function' ? getLadderCleared() : 0;
  c = Math.min(c, 1 - Math.max(0, cleared - MENTOR_LADDER_FREE) / MENTOR_LADDER_SPAN);
  return Math.max(0, Math.min(1, c));
}

/** Current assist level, 0 to 1. 0 once retired or switched off. */
function mentorLevel() {
  const m = _mentorLoad();
  if (m.retired || m.off) return 0;
  return Math.max(0, Math.min(m.need, _mentorCeiling(m)));
}

function mentorCrutchOn(id, lv) {
  const c = MENTOR_CRUTCHES.find(k => k.id === id);
  return !!c && (lv === undefined ? _mentorLevel : lv) >= c.at;
}

/** Settings toggle. Off keeps the record, so switching back on resumes where it was. */
function mentorSetOff(off) {
  _mentorLoad().off = !!off;
  _mentorSave();
}
function mentorIsOff() { return !!_mentorLoad().off; }

/** The single local human this match, or null when the Mentor stays out. */
function _mentorLearner() {
  if (typeof onlineMode !== 'undefined' && onlineMode) return null;
  if (gameMode === 'online') return null;
  if (typeof isTrainingMode !== 'undefined' && isTrainingMode) return null;
  if (!Array.isArray(players)) return null;
  const humans = players.filter(p => p && !p.isAI && !p.isRemote && !p.isBoss);
  if (humans.length !== 1) return null;
  return humans[0];
}

function _mentorFoes(me) {
  const out = [];
  const all = players.concat(typeof minions !== 'undefined' && Array.isArray(minions) ? minions : []);
  for (const p of all) if (p && p !== me && !areAlliedEntities(me, p)) out.push(p);
  return out;
}

function _mentorBegin(me) {
  const m = _mentorLoad();
  _mentorLevel = mentorLevel();
  _mentorMatch = { me, dealt: 0, taken: 0, hp: new Map(), lives: me.lives, cushion: 1, airSaved: false, below: false,
                   hitsTaken: 0, shielded: false, usedQ: false, frames: 0, prevCd: new Map(), tipped: new Set() };
  // A crutch removal announced at the end of the last match shows as this one starts.
  const msg = m.pending.shift();
  if (msg) { _mentorSave(); _mentorToast(msg); }
}

function _mentorToast(text) {
  if (typeof CONTEXT_TIPS === 'undefined' || typeof showContextTip !== 'function') return;
  const id = 'mentor_' + Math.random().toString(36).slice(2, 8);
  CONTEXT_TIPS[id] = { text };
  showContextTip(id);
  delete CONTEXT_TIPS[id];
}

// Mistake tips: each shows once per account (showContextTip remembers it).
Object.assign(typeof CONTEXT_TIPS !== 'undefined' ? CONTEXT_TIPS : {}, {
  mentorEdge:  { text: 'FELL OFF? Press W again in the air to double jump, and hold toward the stage. Your second jump is your way back.' },
  mentorBlock: { text: 'GETTING COMBOED? Hold S on the ground to raise your shield, then hit back the moment their swing ends.' },
  mentorQ:     { text: 'YOUR ABILITY: press Q. Every weapon has its own, and it is your biggest hit.' },
});

function _mentorTip(id) {
  const M = _mentorMatch;
  if (!M || M.tipped.has(id)) return;
  M.tipped.add(id);
  if (typeof tutorialActive !== 'undefined' && tutorialActive) return;
  if (typeof showContextTip === 'function') showContextTip(id);
}

/** Per-frame tick. Safe in every mode. */
function updateMentor() {
  const running = gameRunning && !(typeof gameLoading !== 'undefined' && gameLoading);
  if (!running) { if (_mentorMatch) _mentorEnd(); return; }
  const me = _mentorMatch ? _mentorMatch.me : _mentorLearner();
  if (!me) return;
  if (!_mentorMatch) _mentorBegin(me);
  if (!players.includes(me)) { _mentorMatch = null; return; }
  const M = _mentorMatch;
  M.frames++;
  const lv = _mentorLevel;

  // Damage tally from health changes. Rises (respawn, heals) are ignored.
  const foes = _mentorFoes(me);
  for (const f of [me, ...foes]) {
    const prev = M.hp.get(f);
    if (prev !== undefined && f.health < prev) {
      const d = prev - f.health;
      if (f === me) {
        M.taken += d / Math.max(0.1, me._assistTaken || 1);
        M.hitsTaken++;
      } else M.dealt += d;
    }
    M.hp.set(f, f.health);
  }
  if (me.shielding) M.shielded = true;
  if (me.abilityCooldown > (M.prevCd.get(me) || 0)) M.usedQ = true;
  M.prevCd.set(me, me.abilityCooldown || 0);

  const floor = currentArena && currentArena.platforms && currentArena.platforms.find(q => q && q.isFloor && !q.isFloorDisabled);
  // Lost a life: falling off gets its tip, and a one-sided life nudges the assist up for the rest of the match.
  if (me.lives < M.lives) {
    if (M.below) _mentorTip('mentorEdge');
    if (M.dealt < M.taken * 0.25 && lv > 0) _mentorLevel = Math.min(1, lv + 0.1);
    M.lives = me.lives;
  }
  M.below = !!floor && me.health > 0 && me.y > floor.y + 40;
  if (M.hitsTaken >= 6 && !M.shielded) _mentorTip('mentorBlock');
  if (M.frames === 60 * 40 && !M.usedQ) _mentorTip('mentorQ');

  const paused = (typeof activeCinematic !== 'undefined' && activeCinematic) || (typeof isCinematic !== 'undefined' && isCinematic);
  if (!paused) mentorAssistFrame(me, foes, lv, M, floor);
}

/**
 * Apply every crutch for one frame at assist level `lv`. `st` carries
 * { airSaved, prevCd: Map } between frames. tools/bot-duel.js calls this
 * directly to measure the assist.
 */
function mentorAssistFrame(me, foes, lv, st, floor) {
  // Cushion on the learner. dealDamage() reads these.
  me._assistTaken = lv > 0 ? 1 - 0.30 * lv : 1;
  me._assistKb    = lv > 0 ? 1 - 0.25 * lv : 1;
  if (lv <= 0) return;
  const M = st;

  // Ledge save: once per airtime, a learner below the stage gets the double jump back.
  if (me.onGround) M.airSaved = false;
  else if (mentorCrutchOn('ledgeSave', lv) && !M.airSaved && !me.canDoubleJump && me.vy > 2 && me.health > 0) {
    if (floor && me.y > floor.y + 10) {
      me.canDoubleJump = true;
      M.airSaved = true;
      if (typeof spawnParticles === 'function') spawnParticles(me.cx(), me.cy(), '#66ddff', 12);
    }
  }

  // Opponents: brief hesitations, and slower ability casts. Bosses keep their own pacing.
  for (const f of foes) {
    if (!f || f.isBoss || f.health <= 0) continue;
    // Grounded only: a pause during an off-stage recovery is a free ring-out.
    // _aiHoldUntil is in frames and ends the moment the bot is hit (Fighter.update).
    if (mentorCrutchOn('botPause', lv) && f.onGround && !f._aiHoldUntil && Math.random() < 0.008 * lv) {
      f._aiHoldUntil = frameCount + 12 + Math.floor(Math.random() * 18 * lv);
    }
    const cd = f.abilityCooldown || 0, pcd = M.prevCd.get(f) || 0;
    if (mentorCrutchOn('botAbility', lv) && cd > pcd + 1) f.abilityCooldown = Math.round(cd * (1 + lv));
    M.prevCd.set(f, f.abilityCooldown || 0);
  }
}

function _mentorEnd() {
  const M = _mentorMatch; _mentorMatch = null;
  if (M && M.me) { M.me._assistTaken = 1; M.me._assistKb = 1; }
  const m = _mentorLoad();
  if (!M || m.retired || m.off) return;
  if (M.dealt + M.taken < 60) return; // quit before the fight really started
  const before = mentorLevel();
  const r = M.dealt / (M.dealt + M.taken);
  m.need = Math.max(0, Math.min(1, m.need + (0.5 - r) * 0.5 + (M.result === true ? -0.05 : M.result === false ? 0.05 : 0)));
  m.matches++;
  const after = mentorLevel();
  for (const c of MENTOR_CRUTCHES) {
    if (before >= c.at && after < c.at && !m.announced.includes(c.id)) { m.announced.push(c.id); m.pending.push(c.gone); }
  }
  if (_mentorCeiling(m) <= 0) { m.retired = true; m.pending.push(MENTOR_RETIRED_MSG); }
  _mentorSave();
}

/** Called by modes that know the winner (ladder) before the match tally closes. */
function mentorResult(won) { if (_mentorMatch) _mentorMatch.result = !!won; }

/** Console readout for tuning. */
function mentorDebug() {
  const m = _mentorLoad();
  return { level: +mentorLevel().toFixed(2), need: +m.need.toFixed(2), ceiling: +_mentorCeiling(m).toFixed(2),
           matches: m.matches, retired: m.retired, off: m.off,
           crutches: MENTOR_CRUTCHES.filter(c => mentorLevel() >= c.at).map(c => c.id) };
}

// The game loop stops ticking updateMentor once gameRunning drops, so close the tally from here.
setInterval(function () { if (_mentorMatch && !gameRunning) _mentorEnd(); }, 250);

try {
  const el = document.getElementById('settingMentor');
  if (el) el.checked = !mentorIsOff();
} catch (e) {}
