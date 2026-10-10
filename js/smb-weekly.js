'use strict';
// smb-weekly.js — Weekly Challenge: a three-fight gauntlet that changes every Monday
// -------------------------------------------------------
// Unlocked by clearing the Fight Ladder, and takes over the ladder's hero card
// on the home screen from then on. Every player gets the same week: the kit
// you must fight with, the three opponents and the week's twist are all rolled
// from the week number, so friends are racing the same gauntlet. The run is
// timed; your best time for the week is shown to friends (smb-friends.js).
//
// The fights themselves are ladder matches: this file only builds the rung
// definitions and keeps the week's progress. smb-ladder.js runs the match and
// calls back into onResult().
//
// Depends on: smb-ladder.js (startLadderRung, getLadderCleared, LADDER_RUNGS)
// Reads at call time: WEAPONS, CLASSES, FriendsManager
// -------------------------------------------------------

const WeeklyChallenge = (() => {
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const MONDAY_OFFSET = 4 * 24 * 3600 * 1000;   // 1 Jan 1970 was a Thursday; weeks turn over Monday 00:00 UTC
  const STAGES = 3;
  const STAGE_COINS = 25, CLEAR_BONUS = 150, RERUN_COINS = 10, LOSS_COINS = 3;

  // Fixed pools, so a week reads the same for everyone on every build.
  const KIT_WEAPONS = ['sword', 'hammer', 'axe', 'spear', 'scythe', 'fryingpan', 'broomstick', 'combat', 'flail',
    'whip', 'katana', 'electricstaff', 'glassblade', 'anchor', 'bow', 'boomerang', 'knives', 'crossbow'];
  const KIT_CLASSES = ['warrior', 'thor', 'kratos', 'ninja', 'archer', 'paladin', 'berserker', 'pugilist', 'ronin',
    'reaper', 'summoner', 'warden'];
  const ARENAS = ['colosseum', 'city', 'grass', 'forest', 'clouds', 'ruins'];
  const TWISTS = [
    { key: 'standard', text: '' },
    { key: 'giant',    text: 'Opponents have 50% more health.', p2HpMul: 1.5 },
    { key: 'lastlife', text: 'You fight on a single life.', p1Lives: 1 },
    { key: 'glass',    text: 'Everyone has half health.', p1HpMul: 0.5, p2HpMul: 0.5 },
  ];
  const STAGE_DIFF  = ['hard', 'hard', 'expert'];
  const STAGE_LIVES = [2, 3, 3];
  const DIFF_LABEL  = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };

  function week(now) { return Math.floor(((now || Date.now()) - MONDAY_OFFSET) / WEEK_MS); }
  function resetsInMs() { return (week() + 1) * WEEK_MS + MONDAY_OFFSET - Date.now(); }

  function _rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _wName(k) { return (typeof WEAPONS !== 'undefined' && WEAPONS[k] && WEAPONS[k].name) || k; }
  function _cName(k) { return (typeof CLASSES !== 'undefined' && CLASSES[k] && CLASSES[k].name) || k; }

  // A class that is built around one weapon brings it; the rest take any.
  function _loadout(rand, used) {
    const classes = KIT_CLASSES.filter(k => (typeof CLASSES === 'undefined' || CLASSES[k]) && !(used && used[k]));
    const weapons = KIT_WEAPONS.filter(k => typeof WEAPONS === 'undefined' || WEAPONS[k]);
    const cls = classes[Math.floor(rand() * classes.length)] || 'warrior';
    const roll = weapons[Math.floor(rand() * weapons.length)] || 'sword';
    if (used) used[cls] = true;
    const own = (typeof CLASSES !== 'undefined' && CLASSES[cls] && CLASSES[cls].weapon) || null;
    return { cls, weapon: (own && (typeof WEAPONS === 'undefined' || WEAPONS[own])) ? own : roll };
  }

  /** This week's gauntlet. Same result for every player in the same week. */
  function def(wk) {
    wk = wk === undefined ? week() : wk;
    const rand = _rng(wk);
    const used = {};               // no class twice in one week: kit and opponents all differ
    const kit = _loadout(rand, used);
    const twist = TWISTS[Math.floor(rand() * TWISTS.length)];
    const stages = [];
    for (let i = 0; i < STAGES; i++) {
      const foe = _loadout(rand, used);
      stages.push({
        name: i === STAGES - 1 ? 'Weekly Champion' : _cName(foe.cls),
        weapon: foe.weapon, cls: foe.cls,
        diff: STAGE_DIFF[i], lives: STAGE_LIVES[i],
        arena: ARENAS[Math.floor(rand() * ARENAS.length)],
      });
    }
    return { wk, kit, twist, stages, title: _cName(kit.cls) + ' + ' + _wName(kit.weapon) };
  }

  // ── Progress (per account, per week) ──────────────────────────────────────
  function _read() {
    let s = null;
    try {
      const a = (window.GameState && GameState.getActiveAccount) ? GameState.getActiveAccount() : null;
      s = a && a.data && a.data.unlocks ? a.data.unlocks.weekly : null;
      if (!s) s = JSON.parse(localStorage.getItem('smb_weekly') || 'null');
    } catch (e) {}
    if (!s || s.wk !== week()) s = { wk: week(), stage: 0, runMs: 0, best: null, paid: false };
    return s;
  }

  function _write(s) {
    try {
      if (typeof setAccountFlagWithRuntime === 'function') setAccountFlagWithRuntime(['unlocks', 'weekly'], s, function () {});
    } catch (e) {}
    try { localStorage.setItem('smb_weekly', JSON.stringify(s)); } catch (e) {}
  }

  function unlocked() {
    return typeof getLadderCleared === 'function' && typeof LADDER_RUNGS !== 'undefined'
      && getLadderCleared() >= LADDER_RUNGS.length;
  }

  /** { wk, ms } for this week's best full run, or null. Shared with friends. */
  function best() {
    const s = _read();
    return s.best ? { wk: s.wk, ms: s.best } : null;
  }

  function fmt(ms) {
    const t = Math.max(0, Math.round(ms / 1000));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  // ── Fights ────────────────────────────────────────────────────────────────
  /** Start the next stage of this week's run (or a fresh run once it is cleared). */
  function fight() {
    if (!unlocked() || typeof startLadderRung !== 'function') return;
    const s = _read();
    if (s.stage >= STAGES) { s.stage = 0; s.runMs = 0; _write(s); }
    const d = def();
    const st = d.stages[s.stage];
    startLadderRung(0, {
      weekly: true,
      def: Object.assign({}, st, {
        cardTitle: 'WEEKLY · STAGE ' + (s.stage + 1),
        p1Weapon: d.kit.weapon, p1Class: d.kit.cls,
        p1Lives: d.twist.p1Lives || 3,
        p1HpMul: d.twist.p1HpMul || 1, p2HpMul: d.twist.p2HpMul || 1,
      }),
    });
  }

  /**
   * A weekly fight ended. Returns what the ladder's result card should say:
   * { coins, head, sub, next, go }.
   */
  function onResult(won, ms) {
    const s = _read();
    const d = def();
    const stageNo = Math.min(STAGES, s.stage + 1);
    s.runMs += Math.max(0, ms || 0);
    let coins = LOSS_COINS, head, sub, next, go;
    if (!won) {
      head = 'DEFEATED';
      sub = 'Stage ' + stageNo + ' of ' + STAGES;
      next = 'The clock keeps running. Try again: ' + _stageLine(d.stages[s.stage]);
      go = 'Retry';
    } else {
      s.stage++;
      if (s.stage < STAGES) {
        coins = s.paid ? RERUN_COINS : STAGE_COINS;
        head = 'STAGE CLEARED';
        sub = 'Stage ' + stageNo + ' of ' + STAGES + ' · ' + fmt(s.runMs) + ' so far';
        next = 'Next: ' + _stageLine(d.stages[s.stage]);
        go = 'Next Fight';
      } else {
        const first = !s.paid;
        coins = first ? STAGE_COINS + CLEAR_BONUS : RERUN_COINS;
        const newBest = !s.best || s.runMs < s.best;
        if (newBest) s.best = Math.round(s.runMs);
        s.paid = true;
        head = 'WEEK CLEARED';
        sub = 'Run time ' + fmt(s.runMs) + (newBest ? ' · new best' : ' · best ' + fmt(s.best));
        next = (first ? 'First clear of the week. ' : '') + 'Run it again any time to beat your time — a new gauntlet arrives in ' + _countdown() + '.';
        go = 'Run Again';
        if (newBest && window.FriendsManager) FriendsManager.setWeekly({ wk: s.wk, ms: s.best });
      }
    }
    sub += '  ·  +' + coins + ' coins';
    _write(s);
    return { coins, head, sub, next, go };
  }

  function _stageLine(st) {
    return 'vs ' + st.name + ' (' + (DIFF_LABEL[st.diff] || st.diff) + ', ' + _wName(st.weapon) + ')';
  }

  function _countdown() {
    const ms = resetsInMs();
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return d + 'd ' + h + 'h';
    return h > 0 ? h + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm' : Math.max(1, Math.floor(ms / 60000)) + 'm';
  }

  // Fastest friend this week, for the card: something to chase.
  function _friendBest() {
    if (!window.FriendsManager) return null;
    let top = null;
    for (const f of FriendsManager.friends) {
      if (f.weekly && f.weekly.wk === week() && (!top || f.weekly.ms < top.ms)) top = { name: f.name, ms: f.weekly.ms };
    }
    return top;
  }

  // ── Home hub card (the ladder's hero card, once the ladder is beaten) ─────
  function refreshCard() {
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const s = _read();
    const d = def();
    const done = s.stage >= STAGES;
    set('hubLadderKicker', 'Weekly Challenge · new in ' + _countdown());
    set('hubLadderTitle', 'Fight as ' + d.title);
    let where;
    if (done) {
      where = 'Cleared in ' + fmt(s.best || s.runMs) + '. Run it again to beat your time.';
    } else {
      where = 'Stage ' + (s.stage + 1) + ' of ' + STAGES + ': ' + _stageLine(d.stages[s.stage]) + '. ' + (d.twist.text || 'Three fights against the clock.');
    }
    const fb = _friendBest();
    if (fb) where += ' Friends’ best: ' + fb.name + ' ' + fmt(fb.ms) + '.';
    else if (s.best && !done) where += ' Your best: ' + fmt(s.best) + '.';
    set('hubLadderWhere', where);
    const bar = document.getElementById('hubLadderBar');
    if (bar) bar.style.width = Math.round((Math.min(STAGES, s.stage) / STAGES) * 100) + '%';
    set('hubLadderLab', 'STAGES CLEARED');
    set('hubLadderCount', Math.min(STAGES, s.stage) + ' / ' + STAGES);
    set('hubLadderBtn', done ? 'Run Again' : 'Fight');
  }

  return { week, def, unlocked, best, fmt, fight, onResult, refreshCard, resetsInMs };
})();

window.WeeklyChallenge = WeeklyChallenge;
