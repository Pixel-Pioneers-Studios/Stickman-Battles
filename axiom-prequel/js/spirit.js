'use strict';

// ─── Sovereign's spirit ───────────────────────────────────────────────────────
// The main game's F7: Sovereign plays for you. Here it is his neural checkpoint
// (data/brain/latest.json, run by ../js/smb-brain.js) driving Axiom through the
// same keys a player presses. The net was trained on Stickman Evolution
// fighters, so this file shows it Axiom and the nearest enemy as if they were
// main-game fighters, and turns its picks back into this game's keys:
// attack = light, ability = heavy, super = E (super / pick up / grab),
// shield = S (dodge; held = brace in a Vanguard chapter), jump = W.
//
// The net never saw a level, only a 900 px arena. Positions are shown centred
// on the pair so it never thinks it is at an edge, and a far enemy, an empty
// street or a walking chapter is handled here: walk right (or toward the fight).
//
// F7 toggles. Dev only, like the main game's: standalone pages, or inside
// Stickman Evolution when the parent's admin check passes. ?spirit=1 engages
// it on load.

// smb-brain.js reads these main-game globals; nothing here defines them.
var players = [];
function isHostileTarget(a, b) { return !!a && !!b && a._team !== b._team; }

const SPIRIT_FAR = 520;   // further than this, walk to the fight instead of asking the net

let spiritOn    = false;
let _spNet      = null;
let _spLoading  = null;
let _spH        = null;
let _spT        = 0;
let _spAct      = [1, 0, 0, 0];
let _spPrev     = [1, 0, 0, 0];
let _spObs      = null;
let _spHeld     = {};      // keys this file is holding, so it only releases its own
let _spConfirmT = 0;
const _spShims  = new WeakMap();

function _spAllowed() {
  if (window.parent === window) return true;
  try { return typeof window.parent._adminPanelIsAllowed === 'function' && !!window.parent._adminPanelIsAllowed(); }
  catch (e) { return false; }
}

function _spLoad() {
  if (_spNet) return Promise.resolve(_spNet);
  if (_spLoading) return _spLoading;
  _spLoading = fetch('../data/brain/latest.json', { cache: 'no-cache' })
    .then(r => r.json())
    .catch(() => new Promise((res, rej) => {          // file:// (school zip): the script copy
      if (window.SOV_BRAIN_CKPT) return res(window.SOV_BRAIN_CKPT);
      const s = document.createElement('script');
      s.src = '../data/brain/latest.js';
      s.onload  = () => window.SOV_BRAIN_CKPT ? res(window.SOV_BRAIN_CKPT) : rej(new Error('no checkpoint'));
      s.onerror = () => rej(new Error('no checkpoint'));
      document.head.appendChild(s);
    }))
    .then(j => {
      _spNet = Brain.loadNet(j.pi || j);
      if (!_spNet) throw new Error('bad checkpoint');
      return _spNet;
    })
    .catch(e => { _spLoading = null; console.warn('[spirit]', e.message); return null; });
  return _spLoading;
}

function spiritToggle(on) {
  const want = on === undefined ? !spiritOn : !!on;
  if (!want) { spiritOn = false; _spReleaseAll(); return Promise.resolve(false); }
  if (!_spAllowed()) return Promise.resolve(false);
  return _spLoad().then(net => {
    if (!net) return false;
    spiritOn = true;
    _spH = Brain.newState(net);
    _spAct = [1, 0, 0, 0]; _spPrev = [1, 0, 0, 0];
    _spObs = new Float32Array(Brain.OBS_DIM);
    return true;
  });
}

window.addEventListener('keydown', e => { if (e.key === 'F7') { e.preventDefault(); spiritToggle(); } });
try { if (new URLSearchParams(location.search).get('spirit') === '1') spiritToggle(true); } catch (e) {}

// ── Keys ──────────────────────────────────────────────────────────────────────
function _spKey(k, on) {
  if (on) {
    if (!keys[k]) _frameKeys.push(k);
    keys[k] = true;
    _spHeld[k] = true;
  } else if (_spHeld[k]) {
    keys[k] = false;
    delete _spHeld[k];
  }
}
function _spReleaseAll() { for (const k in _spHeld) keys[k] = false; _spHeld = {}; }
function _spTap(k) { _spKey(k, false); _spKey(k, true); }

function _spApply(act) {
  _spKey(MAIN_KEYS.left,   act[0] === 0);
  _spKey(MAIN_KEYS.right,  act[0] === 2);
  _spKey(MAIN_KEYS.jump,   act[1] === 1);
  _spKey(MAIN_KEYS.shield, act[2] === 1);
  _spKey(MAIN_KEYS.attack,  act[3] === 1);
  _spKey(MAIN_KEYS.ability, act[3] === 2);
  _spKey(MAIN_KEYS.super,   act[3] === 3);
}

// ── What the net sees ─────────────────────────────────────────────────────────
// A main-game fighter's fields, read off an Axiom or an Enemy. `off` shifts x so
// the pair is centred in the 900 px arena the net knows.
function _spShim(src, team) {
  let s = _spShims.get(src);
  if (!s) {
    s = { _team: team, charClass: 'none', lives: 1, canDoubleJump: false, classSpeedMult: 1, _off: 0,
          cx() { return this._cx; }, cy() { return this._cy; } };
    _spShims.set(src, s);
  }
  return s;
}

function _spFillAxiom(a, off) {
  const s = _spShim(a, 'axiom');
  const W = a.weapon === 'sword' ? { range: 95, damage: 16, type: 'melee' }
          : a.weapon === 'chain' ? { range: 85, damage: 12, type: 'melee' }
          : { range: 55, damage: 10, type: 'melee' };
  s.weaponKey = a.weapon === 'chain' ? 'whip' : 'sword';
  s.weapon = W;
  s._cx = a.cx() + off; s._cy = a.cy();
  s.x = a.x + off; s.y = a.y; s.w = a.w; s.h = a.h;
  s.vx = a.vx; s.vy = a.vy; s.onGround = a.onGround; s.facing = a.facing;
  s.health = Math.max(0, a.health); s.maxHealth = a.maxHealth;
  s.attackTimer  = a.attackTimer > 0 ? a.attackTimer : 0;
  s.cooldown     = 0;
  s.attackEndlag = a.state === 'heavy' && a.heavyTimer > 13 ? 30 - a.heavyTimer : 0;
  s.abilityCooldown = 0;
  s.superMeter = a.superMeter; s.superReady = a.superMeter >= a.maxSuper;
  s.shielding  = !!a.bracing;
  s.shieldHP = 0; s.shieldStacks = 0; s.shieldBroken = false;
  s.stunTimer    = a.state === 'hurt' ? 20 : a.state === 'knockdown' ? (a.knockdownTimer || 40) : 0;
  s.ragdollTimer = a.state === 'knockdown' ? (a.knockdownTimer || 40) : 0;
  s.invincible   = a.invincibleFrames || 0;
  return s;
}

function _spFillEnemy(e, off) {
  const s = _spShim(e, 'enemy');
  s.weaponKey = 'sword';
  s.weapon = { range: e.attackRange || 55, damage: e.damage || 8, type: 'melee' };
  s._cx = e.cx() + off; s._cy = e.cy();
  s.x = e.x + off; s.y = e.y; s.w = e.w; s.h = e.h;
  s.vx = e.vx; s.vy = e.vy; s.onGround = e.onGround !== false; s.facing = e.facing || 1;
  s.health = Math.max(0, e.health); s.maxHealth = e.maxHealth || e.health || 1;
  s.attackTimer  = e.state === 'attack' ? Math.max(0, 28 - e.stateTimer) : 0;
  s.cooldown     = e.attackCooldown || 0;
  s.attackEndlag = e.state === 'attack' && e.stateTimer > 16 ? 28 - e.stateTimer : 0;
  s.abilityCooldown = 0;
  s.superMeter = 0; s.superReady = false;
  s.shielding  = !!e.blocking;
  s.shieldHP = 0; s.shieldStacks = 0; s.shieldBroken = false;
  s.stunTimer    = e.state === 'hurt' ? 20 : e.state === 'knockdown' ? (e.knockdownTimer || 40) : 0;
  s.ragdollTimer = e.state === 'knockdown' ? (e.knockdownTimer || 40) : 0;
  s.invincible   = e.invincibleFrames || 0;
  return s;
}

// The raised platform (not the floor) an entity is standing on, if any.
function _spLedgeUnder(e) {
  let floor = null;
  for (const p of platforms) if (!floor || p.w > floor.w) floor = p;
  for (const p of platforms) {
    if (p === floor) continue;
    if (e.x + e.w <= p.x || e.x >= p.x + p.w) continue;
    if (Math.abs(e.y + e.h - p.y) <= 4) return p;
  }
  return null;
}

function _spAlive(e) { return e && e.health > 0 && e.state !== 'dead'; }

// ── Per frame (gameLoop calls this before anything reads input) ──────────────
function spiritTick() {
  if (!spiritOn || !_spNet) return;
  const ax = axiomPlayer;

  // Screens that wait on a key: retry after a death or a fallen Vanguard,
  // cinematic text. One tap a second.
  const waiting = gamePhase === 'cinematic' || gamePhase === 'ending'
    || (gamePhase === 'playing' && ax && ((ax.health <= 0 && ax.state === 'dead')
        || (typeof isVanguardFailed === 'function' && isVanguardFailed())));
  if (waiting) {
    _spApply([1, 0, 0, 0]);
    if (++_spConfirmT % 60 === 0) _spTap(MAIN_KEYS.attack);
    return;
  }
  if (!ax || (gamePhase !== 'playing' && gamePhase !== 'interlude')) { _spReleaseAll(); return; }

  // Nearest living enemy.
  let foe = null, fd = Infinity;
  if (gamePhase === 'playing') {
    for (const e of enemies) {
      if (!_spAlive(e)) continue;
      const d = Math.abs(e.cx() - ax.cx()) + Math.abs(e.cy() - ax.cy()) * 0.5;
      if (d < fd) { fd = d; foe = e; }
    }
  }

  // No fight in reach: walk to it, or on to the end of the street.
  if (!foe || Math.abs(foe.cx() - ax.cx()) > SPIRIT_FAR) {
    const dir = foe ? Math.sign(foe.cx() - ax.cx()) || 1 : 1;
    // A ledge or a box in the way: hop when stalled while walking.
    const stalled = Math.abs(ax.vx) < 0.4 && ax.onGround && _spT % 30 === 0;
    _spAct = [dir > 0 ? 2 : 0, stalled ? 1 : 0, 0, 0];
    _spApply(_spAct);
    _spT++;
    return;
  }

  // A foe standing on a ledge above: the net trained on a flat arena and waits
  // underneath forever. Platforms are solid from below, so walk out past the
  // nearer edge, jump, and steer in over the top. The net takes over once level.
  const ledge = _spLedgeUnder(foe);
  if (ledge && foe.y + foe.h < ax.y + ax.h - 30) {
    const side    = ax.cx() < ledge.x + ledge.w / 2 ? -1 : 1;
    const launchX = side < 0 ? ledge.x - 30 : ledge.x + ledge.w + 30;
    const inward  = -side;
    if (ax.onGround) {
      const d = launchX - ax.cx();
      _spAct = Math.abs(d) > 16 ? [d > 0 ? 2 : 0, 0, 0, 0]
                                : [inward > 0 ? 2 : 0, 1, 0, 0];
    } else {
      _spAct = [inward > 0 ? 2 : 0, 1, 0, 0];
    }
    _spApply(_spAct);
    _spT++;
    return;
  }

  // The fight: centre the pair in the arena the net knows.
  const off = 450 - (ax.cx() + foe.cx()) / 2;
  const me  = _spFillAxiom(ax, off);
  const opp = _spFillEnemy(foe, off);
  players.length = 0;
  players.push(me, opp);
  for (const e of enemies) {
    if (e !== foe && _spAlive(e) && Math.abs(e.cx() - ax.cx()) < 700) players.push(_spFillEnemy(e, off));
  }

  if (_spT++ % Brain.REPEAT === 0) {
    Brain.observe(me, opp, _spPrev, _spObs);
    Brain.sample(Brain.forward(_spNet, _spObs, _spH), _spAct, true);
    for (let k = 0; k < 4; k++) _spPrev[k] = _spAct[k];
  }
  // Its shield head mostly taps when nothing is coming (main-game guard is cheap).
  // Here S is a dodge roll, or a standing brace in a Vanguard chapter, so only
  // pass it on while an enemy in reach is actually swinging.
  const threat = enemies.some(e => _spAlive(e) && e.state === 'attack'
    && Math.abs(e.cx() - ax.cx()) < (e.attackRange || 55) + 50);
  const act = threat ? _spAct : [_spAct[0], _spAct[1], 0, _spAct[3]];
  _spApply(act);
}

// Faint corner tag so a screenshot says who was playing.
function drawSpiritTag() {
  if (!spiritOn) return;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle   = '#c9b8ff';
  ctx.font        = '10px Courier New';
  ctx.textAlign   = 'left';
  ctx.fillText('SOVEREIGN PLAYS  [F7]', 12, GAME_H - 8);
  ctx.restore();
}
