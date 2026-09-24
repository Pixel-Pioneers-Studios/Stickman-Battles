'use strict';

// ============================================================
// SPORTS ARENA — minigameType 'sports'
// ============================================================
// One stadium, four sports. Nobody takes health damage (dealDamage zeroes it),
// but every hit still knocks back and stuns, so fighting the other player is
// how you win the ball. Each weapon's ability doubles as a signature ball move
// (fired when the ball is in range at the moment the ability goes off), and a
// super near the ball turns it into a burning homing shot that bowls people over.
//
// Load order: after smb-minigames.js (initMinigame calls initSports).

const SPORTS = {
  soccer:     { name: 'SOCCER',     win: 5,  balls: 1, r: 15, grav: 0.55, bounce: 0.75, maxSpd: 14,
                desc: 'Kick it into their goal' },
  basketball: { name: 'BASKETBALL', win: 11, balls: 1, r: 16, grav: 0.50, bounce: 0.80, maxSpd: 15,
                desc: 'Drop it through their hoop. Long shots are worth 3, dunks score big' },
  volleyball: { name: 'VOLLEYBALL', win: 7,  balls: 1, r: 16, grav: 0.30, bounce: 0.60, maxSpd: 13,
                desc: 'Land it on their side of the net' },
  dodgeball:  { name: 'DODGEBALL',  win: 7,  balls: 2, r: 14, grav: 0.50, bounce: 0.55, maxSpd: 18,
                desc: 'Hit them with a thrown ball. Shield to catch' },
};
const SPORT_KEYS = Object.keys(SPORTS);

const SPORTS_FLOOR_Y = 460;
const SPORTS_MID_X   = GAME_W / 2;
// Soccer goals sit inside the side walls; P1 (team 0) attacks the right goal.
const SPORTS_GOALS = [
  { x: 10,  y: 340, w: 26, h: 120, team: 1 },
  { x: 864, y: 340, w: 26, h: 120, team: 0 },
];
// Basketball hoops; rimFront is the open lip, rimBack meets the backboard.
const SPORTS_HOOPS = [
  { rimY: 250, rimFront: 114, rimBack: 58,  boardX: 50,  team: 1 },
  { rimY: 250, rimFront: 786, rimBack: 842, boardX: 850, team: 0 },
];
const SPORTS_NET = { x: 446, w: 8, top: 300 };
const SPORTS_THREE_DIST = 380;

const SPORTS_MOVES = {
  curve:  { name: 'BANANA SHOT',    color: '#ffe066' },
  smash:  { name: 'METEOR SMASH',   color: '#ff8844' },
  hook:   { name: 'REAPER HOOK',    color: '#b388ff' },
  snipe:  { name: 'LASER SHOT',     color: '#66e0ff' },
  chip:   { name: 'CHIP SHOT',      color: '#aaffaa' },
  bolt:   { name: 'THUNDER STRIKE', color: '#99ccff' },
  orbit:  { name: 'TORNADO',        color: '#ffaaee' },
  homing: { name: 'TRACKING SHOT',  color: '#ff66aa' },
  super:  { name: 'SUPER SHOT',     color: '#ff4400' },
};

let sportsType      = 'soccer';
let sportsBalls     = [];
let sportsScore     = [0, 0];
let sportsPause     = 0;   // frames left in the post-point freeze
let sportsWinnerIdx = -1;  // index into players[] once someone reaches the win score
let sportsBanner    = null; // { text, sub, color, t }
let sportsServeTeam = 0;    // volleyball: whoever won the last rally serves

function isSportsMode() {
  return typeof gameMode !== 'undefined' && gameMode === 'minigames' &&
         typeof minigameType !== 'undefined' && minigameType === 'sports';
}

function selectSport(key) {
  if (!SPORTS[key]) return;
  sportsType = key;
  document.querySelectorAll('#sportsOptions [data-sport]').forEach(b =>
    b.classList.toggle('active', b.dataset.sport === key));
  const d = document.getElementById('sportsDesc');
  if (d) d.textContent = SPORTS[key].desc + ' — first to ' + SPORTS[key].win + '.';
}

// ── Setup ────────────────────────────────────────────────────
function _sportsBuildPlatforms() {
  const pls = [
    { x: 0,   y: SPORTS_FLOOR_Y, w: 900, h: 60, isFloor: true },
    { x: 0,   y: 0, w: 10, h: SPORTS_FLOOR_Y },
    { x: 890, y: 0, w: 10, h: SPORTS_FLOOR_Y },
  ];
  // Volleyball and dodgeball keep each team on its own half. The divider is
  // full height so nobody hops the net; the ball ignores platforms entirely.
  if (sportsType === 'volleyball' || sportsType === 'dodgeball') {
    pls.push({ x: SPORTS_NET.x, y: 0, w: SPORTS_NET.w, h: SPORTS_FLOOR_Y, noDraw: true });
  }
  return pls;
}

function _sportsMakeBall(x, y) {
  const S = SPORTS[sportsType];
  return { x, y, vx: 0, vy: 0, r: S.r, spin: 0, lastTouched: null, touchTeam: -1, touchX: x,
           fx: null, heldBy: null, holdT: 0, fire: 0, charged: 0, live: false, liveTeam: -1,
           hitCd: new Map(), bowled: new Set(), trail: [], prevY: y };
}

function _sportsServe(servingTeam) {
  sportsBalls = [];
  if (sportsType === 'dodgeball') {
    sportsBalls.push(_sportsMakeBall(GAME_W * 0.30, 300), _sportsMakeBall(GAME_W * 0.70, 300));
  } else if (sportsType === 'volleyball') {
    const t = servingTeam >= 0 ? servingTeam : 0;
    sportsBalls.push(_sportsMakeBall(t === 0 ? 220 : 680, 140));
  } else {
    sportsBalls.push(_sportsMakeBall(SPORTS_MID_X, 180));
  }
}

function _sportsResetPositions() {
  players.forEach(p => {
    if (!p || p.isBoss) return;
    const left = p._sportsTeam === 0;
    p.x  = (left ? 170 : 730) - p.w / 2;
    p.y  = SPORTS_FLOOR_Y - p.h - 2;
    p.vx = 0; p.vy = 0;
    p.facing = left ? 1 : -1;
  });
}

function initSports() {
  if (!SPORTS[sportsType]) sportsType = 'soccer';
  sportsScore     = [0, 0];
  sportsPause     = 0;
  sportsWinnerIdx = -1;
  sportsBanner    = { text: SPORTS[sportsType].name, sub: 'FIRST TO ' + SPORTS[sportsType].win, color: '#ffdd44', t: 120 };
  if (currentArena) {
    currentArena.platforms = _sportsBuildPlatforms();
    if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  }
  let humanIdx = 0;
  players.forEach(p => {
    if (!p || p.isBoss) return;
    p._sportsTeam    = (humanIdx++) % 2;
    p._sportsBot     = !!p.isAI;
    p._noWhiffGuard  = true; // bots swing at the ball, not only at the other fighter
    p._spPrevAbCd    = p.abilityCooldown || 0;
    p._spPrevSuper   = !!p.superReady;
    p._spPrevAtk     = 0;
    p._spHitCd       = 0;
  });
  _sportsResetPositions();
  _sportsServe(0);
}

// ── Geometry helpers ─────────────────────────────────────────
function _sportsTeamDir(team) { return team === 0 ? 1 : -1; }

function _sportsOpponent(p) {
  return players.find(o => o && o !== p && !o.isBoss && o._sportsTeam !== p._sportsTeam && o.health > 0) || null;
}

// Where `team` is trying to put the ball.
function _sportsAimPoint(team, fromP) {
  switch (sportsType) {
    case 'soccer':     return { x: team === 0 ? GAME_W - 22 : 22, y: 400 };
    case 'basketball': { const h = SPORTS_HOOPS[team === 0 ? 1 : 0];
                         return { x: (h.rimFront + h.rimBack) / 2, y: h.rimY }; }
    case 'volleyball': return { x: team === 0 ? 690 : 210, y: SPORTS_FLOOR_Y };
    case 'dodgeball':  { const o = fromP ? _sportsOpponent(fromP) : null;
                         return o ? { x: o.cx(), y: o.cy() } : { x: team === 0 ? 700 : 200, y: 400 }; }
  }
  return { x: SPORTS_MID_X, y: 300 };
}

// Ballistic launch that arrives at (tx,ty) after T frames under this sport's gravity.
function _sportsLobTo(b, tx, ty, T) {
  const g = SPORTS[sportsType].grav;
  b.vx = (tx - b.x) / T;
  b.vy = (ty - b.y - 0.5 * g * T * T) / T;
  b.fx = { type: 'lob', t: T };
}

// A lob that clears the volleyball net: stretch the flight until it passes over.
function _sportsLobOverNet(b, tx, T) {
  const g = SPORTS[sportsType].grav;
  for (let tt = T; tt <= 110; tt += 6) {
    const vx = (tx - b.x) / tt, vy = (SPORTS_FLOOR_Y - b.r - b.y - 0.5 * g * tt * tt) / tt;
    const tn = (SPORTS_MID_X - b.x) / (vx || 1e-6);
    if (tn < 0 || tn > tt) { _sportsLobTo(b, tx, SPORTS_FLOOR_Y - b.r, tt); return; }
    const yAtNet = b.y + vy * tn + 0.5 * g * tn * tn;
    if (yAtNet < SPORTS_NET.top - b.r - 16) { _sportsLobTo(b, tx, SPORTS_FLOOR_Y - b.r, tt); return; }
  }
  _sportsLobTo(b, tx, SPORTS_FLOOR_Y - b.r, 110);
}

function _sportsAimAngle(b, T) { return Math.atan2(T.y - b.y, T.x - b.x); }

function _sportsTouch(b, p) {
  b.lastTouched = p;
  b.touchTeam   = p ? p._sportsTeam : -1;
  b.touchX      = p ? p.cx() : b.x;
  b.touchY      = p ? p.cy() : b.y;
  if (b.heldBy && b.heldBy !== p) b.heldBy = null;
}

function _sportsMoveKind(p) {
  if (p.charClass === 'megaknight') return 'smash';
  const sw = (typeof WEAPON_SWINGS !== 'undefined') ? WEAPON_SWINGS[p.weaponKey] : null;
  switch (sw && sw.archetype) {
    case 'slash': case 'iai': case 'cleave': return 'curve';
    case 'smash':                            return 'smash';
    case 'sweep': case 'crack':              return 'hook';
    case 'thrust': case 'poke':              return 'snipe';
    case 'jab': case 'bash':                 return 'chip';
    case 'strike':                           return 'bolt';
    case 'whirl':                            return 'orbit';
    case 'point': case 'aim': case 'throw': case 'hose': return 'homing';
  }
  return (p.weapon && p.weapon.type === 'ranged') ? 'homing' : 'curve';
}

function _sportsNearestBall(p, maxD) {
  let best = null, bd = maxD;
  for (const b of sportsBalls) {
    const d = Math.hypot(b.x - p.cx(), b.y - p.cy());
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

function _sportsPopText(x, y, text, color) {
  if (typeof damageTexts !== 'undefined' && typeof DamageText === 'function') {
    damageTexts.push(new DamageText(x, y, text, color));
  }
}

// ── Signature moves (ability / super near the ball) ─────────
function _sportsApplyMove(p, kind) {
  const b = _sportsNearestBall(p, kind === 'super' ? 260 : 160);
  if (!b) return;
  const team = p._sportsTeam;
  const T    = _sportsAimPoint(team, p);
  const mv   = SPORTS_MOVES[kind];
  _sportsTouch(b, p);
  b.heldBy = null;
  b.fx = null;

  if (kind === 'super') {
    b.fire = 110;
    b.bowled.clear();
    if (sportsType === 'volleyball') { _sportsLobOverNet(b, T.x, 26); b.fx.t = 999; }
    else b.fx = { type: 'homing', t: 80, spd: 19, owner: p };
    if (settings.screenShake) screenShake = Math.max(screenShake, 12);
  } else if (sportsType === 'volleyball') {
    // Every move must clear the net; the weapon changes how.
    if (kind === 'hook') {
      b.heldBy = null;
      b.x = p.cx(); b.y = p.y - 60; b.vx = 0; b.vy = -6;
      b.fx = { type: 'set', t: 30 };
    } else if ((kind === 'smash' || kind === 'snipe') && b.y < SPORTS_NET.top + 10) {
      const a = Math.atan2(SPORTS_FLOOR_Y - b.y, T.x - b.x);
      b.vx = Math.cos(a) * 20; b.vy = Math.sin(a) * 20;
      b.fx = { type: 'nograv', t: 18 };
    } else {
      _sportsLobOverNet(b, T.x + (Math.random() - 0.5) * 80, kind === 'chip' ? 60 : 36);
      if (kind === 'curve') b.fx.curveVis = true;
    }
  } else if (sportsType === 'basketball' && kind !== 'hook' && kind !== 'orbit') {
    const dist = Math.abs(T.x - b.x);
    const err  = (Math.random() - 0.5) * Math.min(40, dist * 0.05);
    if (kind === 'homing' || kind === 'bolt') {
      b.fx = { type: 'homing', t: 60, spd: 14, owner: p, basket: true };
      if (kind === 'bolt') b.charged = 60;
    } else if (kind === 'smash' && b.y < p.y && Math.abs(T.x - b.x) < 160) {
      _sportsLobTo(b, T.x + err * 0.3, T.y, 16); // slam dunk from close
    } else {
      const flight = { snipe: 24, curve: 32, chip: 50, smash: 40 }[kind] || 36;
      _sportsLobTo(b, T.x + err, T.y - 4, Math.max(flight, Math.min(70, dist / 9)));
    }
  } else {
    switch (kind) {
      case 'curve': {
        const dir = T.x >= b.x ? 1 : -1;
        const a0  = _sportsAimAngle(b, T) - dir * 0.5;
        b.vx = Math.cos(a0) * 17; b.vy = Math.sin(a0) * 17;
        b.fx = { type: 'curve', t: 26, w: dir * 0.028 };
        break;
      }
      case 'smash': {
        if (b.y < p.y) {
          const a = Math.atan2(SPORTS_FLOOR_Y - b.y, T.x - b.x);
          b.vx = Math.cos(a) * 21; b.vy = Math.sin(a) * 21;
          b.fx = { type: 'nograv', t: 14 };
        } else {
          _sportsLobTo(b, T.x, T.y - 30, Math.max(34, Math.min(62, Math.abs(T.x - b.x) / 10)));
        }
        spawnParticles(b.x, b.y, '#ff8844', 16);
        break;
      }
      case 'hook':
        b.heldBy = p; b.holdT = 60;
        break;
      case 'snipe': {
        const a = _sportsAimAngle(b, T);
        b.vx = Math.cos(a) * 20; b.vy = Math.sin(a) * 20;
        b.fx = { type: 'nograv', t: 32 };
        break;
      }
      case 'chip':
        _sportsLobTo(b, T.x, T.y - 20, Math.max(30, Math.min(64, Math.abs(T.x - b.x) / 8)));
        break;
      case 'bolt':
        b.fx = { type: 'homing', t: 50, spd: 15, owner: p };
        b.charged = 55;
        break;
      case 'orbit':
        b.fx = { type: 'orbit', t: 36, ang: Math.atan2(b.y - p.cy(), b.x - p.cx()), owner: p };
        break;
      case 'homing':
        b.fx = { type: 'homing', t: 55, spd: 14, owner: p };
        break;
    }
  }
  if (sportsType === 'dodgeball' && !b.heldBy && (!b.fx || b.fx.type !== 'orbit')) { b.live = true; b.liveTeam = team; }
  spawnParticles(b.x, b.y, mv.color, 14);
  _sportsPopText(b.x, b.y - 26, mv.name, mv.color);
  if (SoundManager && SoundManager.heavyHit) SoundManager.heavyHit();
}

// Called from dealDamage for every hit in the sports arena. A fighter who gets
// hit coughs up whatever ball they were carrying or standing on.
function sportsOnHit(attacker, target, kb) {
  if (!isSportsMode() || !target) return;
  const dir = attacker ? (target.cx() >= attacker.cx() ? 1 : -1) : (target.facing || 1) * -1;
  for (const b of sportsBalls) {
    const held = b.heldBy === target;
    if (!held && Math.hypot(b.x - target.cx(), b.y - target.cy()) > 75) continue;
    b.heldBy = null;
    if (b.fx && (b.fx.type === 'orbit') && b.fx.owner === target) b.fx = null;
    b.vx = dir * (5 + (kb || 0) * 0.3);
    b.vy = -5 - Math.random() * 3;
    if (attacker && !attacker.isBoss) _sportsTouch(b, attacker);
    if (held) _sportsPopText(target.cx(), target.y - 10, 'STRIPPED!', '#ffffff');
  }
}

// ── Ball physics ─────────────────────────────────────────────
function _sportsStepBall(b) {
  const S = SPORTS[sportsType];
  b.prevY = b.y;

  // Carried: glued in front of the holder until they swing or time runs out.
  if (b.heldBy) {
    const h = b.heldBy;
    if (h.health <= 0 || h.stunTimer > 0 || h.ragdollTimer > 0 || --b.holdT <= 0) {
      b.heldBy = null;
      b.vx = (h.facing || 1) * 7; b.vy = -5;
    } else {
      b.x = h.cx() + (h.facing || 1) * (h.w / 2 + b.r + 4);
      b.y = h.cy() + 8;
      b.vx = h.vx; b.vy = h.vy;
      return;
    }
  }

  let noGrav = false, noCap = false;
  const fx = b.fx;
  if (fx) {
    fx.t--;
    if (fx.type === 'curve') {
      const c = Math.cos(fx.w), s = Math.sin(fx.w);
      const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx;
      noGrav = true; noCap = true;
    } else if (fx.type === 'nograv') {
      noGrav = true; noCap = true;
    } else if (fx.type === 'lob' || fx.type === 'set') {
      noCap = true;
    } else if (fx.type === 'homing') {
      const T = _sportsAimPoint(fx.owner ? fx.owner._sportsTeam : b.touchTeam, fx.owner);
      const ty = fx.basket ? T.y - 70 : T.y;
      const a  = Math.atan2(ty - b.y, T.x - b.x);
      b.vx += (Math.cos(a) * fx.spd - b.vx) * 0.14;
      b.vy += (Math.sin(a) * fx.spd - b.vy) * 0.14;
      noGrav = true; noCap = true;
      if (fx.basket && Math.hypot(T.x - b.x, ty - b.y) < 30) {
        b.vx = (T.x - b.x) * 0.06; b.vy = 1.5; fx.t = 0;
      }
    } else if (fx.type === 'orbit') {
      const o = fx.owner;
      if (!o || o.health <= 0) { fx.t = 0; }
      else {
        fx.ang += 0.32;
        const tx = o.cx() + Math.cos(fx.ang) * 58, ty = o.cy() + Math.sin(fx.ang) * 58;
        b.vx = tx - b.x; b.vy = ty - b.y;
        noGrav = true; noCap = true;
        if (fx.t <= 0) {
          const T = _sportsAimPoint(o._sportsTeam, o);
          if (sportsType === 'volleyball') _sportsLobOverNet(b, T.x, 34);
          else if (sportsType === 'basketball') _sportsLobTo(b, T.x, T.y - 4, 34);
          else { const a = _sportsAimAngle(b, T); b.vx = Math.cos(a) * 18; b.vy = Math.sin(a) * 18; b.fx = { type: 'nograv', t: 14 }; }
          if (sportsType === 'dodgeball') { b.live = true; b.liveTeam = o._sportsTeam; }
        }
      }
    }
    if (b.fx === fx && fx.t <= 0) b.fx = null;
  }

  if (!noGrav) b.vy += S.grav;
  b.x += b.vx;
  b.y += b.vy;
  b.spin += b.vx * 0.04;
  if (b.fire > 0) b.fire--;
  if (b.charged > 0) b.charged--;

  // Floor
  if (b.y + b.r > SPORTS_FLOOR_Y) {
    b.y  = SPORTS_FLOOR_Y - b.r;
    b.vy = -Math.abs(b.vy) * S.bounce;
    b.vx *= 0.9;
    if (Math.abs(b.vy) < 1.5) b.vy = 0;
    if (b.fx && b.fx.type !== 'orbit') b.fx = null;
    b.live = false;
    if (sportsType === 'volleyball' && sportsPause === 0) {
      _sportsPoint(b.x < SPORTS_MID_X ? 1 : 0, 'POINT!');
      return;
    }
  }
  // Ceiling
  if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.6; }

  // Side walls — soccer leaves the goal mouths open
  const inGoalY = sportsType === 'soccer' && b.y > SPORTS_GOALS[0].y + 4;
  if (b.x - b.r < 10 && !inGoalY)          { b.x = 10 + b.r;          b.vx =  Math.abs(b.vx) * 0.65; if (b.fx && b.fx.type !== 'orbit') b.fx = null; }
  if (b.x + b.r > GAME_W - 10 && !inGoalY) { b.x = GAME_W - 10 - b.r; b.vx = -Math.abs(b.vx) * 0.65; if (b.fx && b.fx.type !== 'orbit') b.fx = null; }
  if (inGoalY) {
    if (b.x - b.r < 0)      { b.x = b.r;          b.vx =  Math.abs(b.vx) * 0.3; }
    if (b.x + b.r > GAME_W) { b.x = GAME_W - b.r; b.vx = -Math.abs(b.vx) * 0.3; }
  }

  if (sportsType === 'soccer')     _sportsGoalFrame(b);
  if (sportsType === 'volleyball') _sportsNetCollide(b);
  if (sportsType === 'basketball') _sportsHoopCollide(b);

  // Drag + speed cap
  if (!noCap && !(b.fx && b.fx.type === 'lob')) b.vx *= 0.993;
  const cap = noCap ? 26 : S.maxSpd;
  const spd = Math.hypot(b.vx, b.vy);
  if (spd > cap) { b.vx = b.vx / spd * cap; b.vy = b.vy / spd * cap; }

  b.trail.push({ x: b.x, y: b.y });
  if (b.trail.length > 10) b.trail.shift();
}

// Crossbar + front post corner on the soccer goals.
function _sportsGoalFrame(b) {
  for (const g of SPORTS_GOALS) {
    const bx0 = g.x, bx1 = g.x + g.w, by = g.y;
    if (b.x + b.r > bx0 && b.x - b.r < bx1 && Math.abs(b.y - by) < b.r + 3) {
      if (b.y < by) { b.y = by - b.r - 3; b.vy = -Math.abs(b.vy) * 0.7; }
      else          { b.y = by + b.r + 3; b.vy =  Math.abs(b.vy) * 0.7; }
      b.fx = null;
    }
  }
}

function _sportsNetCollide(b) {
  const n = SPORTS_NET;
  if (b.y + b.r < n.top || b.x + b.r < n.x || b.x - b.r > n.x + n.w) return;
  if (b.prevY + b.r <= n.top + 2 && b.vy > 0) {
    b.y = n.top - b.r; b.vy = -Math.abs(b.vy) * 0.5; b.vx += (b.x < SPORTS_MID_X ? -1 : 1) * 1.5;
  } else if (b.x < SPORTS_MID_X) { b.x = n.x - b.r; b.vx = -Math.abs(b.vx) * 0.4; }
  else                           { b.x = n.x + n.w + b.r; b.vx = Math.abs(b.vx) * 0.4; }
  b.fx = null;
}

function _sportsHoopCollide(b) {
  for (const h of SPORTS_HOOPS) {
    // Backboard
    const bx0 = h.boardX - 3, bx1 = h.boardX + 3, by0 = h.rimY - 100, by1 = h.rimY + 10;
    if (b.y > by0 && b.y < by1 && b.x + b.r > bx0 && b.x - b.r < bx1) {
      b.x  = b.x < h.boardX ? bx0 - b.r : bx1 + b.r;
      b.vx = -b.vx * 0.7;
      if (b.fx && b.fx.type !== 'lob') b.fx = null;
    }
    // Rim lips are points the ball can clank off
    for (const lx of [h.rimFront, h.rimBack]) {
      const dx = b.x - lx, dy = b.y - h.rimY, d = Math.hypot(dx, dy);
      if (d < b.r + 3 && d > 0.01) {
        const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 1.6 * dot * nx; b.vy -= 1.6 * dot * ny; }
        b.x = lx + nx * (b.r + 3); b.y = h.rimY + ny * (b.r + 3);
        b.fx = null;
      }
    }
    // Scored when the ball's centre falls through the rim between the lips
    const lo = Math.min(h.rimFront, h.rimBack) + 4, hi = Math.max(h.rimFront, h.rimBack) - 4;
    if (sportsPause === 0 && b.vy > 0 && b.prevY < h.rimY && b.y >= h.rimY && b.x > lo && b.x < hi) {
      const shooter = b.lastTouched;
      const hoopX   = (h.rimFront + h.rimBack) / 2;
      let pts = 2, label = 'BUCKET!';
      if (shooter && Math.hypot(shooter.cx() - hoopX, shooter.cy() - h.rimY) < 95) { pts = 3; label = 'SLAM DUNK!'; }
      else if (Math.abs(b.touchX - hoopX) > SPORTS_THREE_DIST) { pts = 3; label = 'THREE!'; }
      _sportsPoint(h.team, label, pts);
      return;
    }
  }
}

function _sportsBallVsPlayers(b) {
  if (b.heldBy) return;
  for (const p of players) {
    if (!p || p.isBoss || p.health <= 0) continue;
    const cd = b.hitCd.get(p) || 0;
    if (cd > 0) b.hitCd.set(p, cd - 1);

    const nearX = Math.max(p.x, Math.min(b.x, p.x + p.w));
    const nearY = Math.max(p.y, Math.min(b.y, p.y + p.h));
    const touching = Math.hypot(b.x - nearX, b.y - nearY) < b.r;

    // Dodgeball: a live ball from the other team is a hit (or a catch)
    if (sportsType === 'dodgeball' && touching && b.live && b.liveTeam !== p._sportsTeam && !(p._spHitCd > 0)) {
      const thrower = b.lastTouched;
      p._spHitCd = 40;
      b.live = false;
      if (p.shielding) {
        b.heldBy = p; b.holdT = 45; _sportsTouch(b, p);
        _sportsPoint(p._sportsTeam, 'CATCH!', 1, true);
      } else {
        if (thrower) dealDamage(thrower, p, 0, 14);
        b.vx = -b.vx * 0.35; b.vy = -6;
        _sportsPoint(b.liveTeam, 'HIT!', 1, true);
      }
      continue;
    }

    // A burning or charged ball bowls over opponents of whoever last touched it
    if (touching && (b.fire > 0 || b.charged > 0) && b.lastTouched && b.lastTouched._sportsTeam !== p._sportsTeam && !b.bowled.has(p)) {
      b.bowled.add(p);
      dealDamage(b.lastTouched, p, 0, b.fire > 0 ? 20 : 10);
      if (b.charged > 0) p.stunTimer = Math.max(p.stunTimer || 0, 35);
      spawnParticles(b.x, b.y, b.fire > 0 ? '#ff6600' : '#99ccff', 12);
      continue; // it ploughs through instead of stopping
    }

    // Guarding fighters wall the ball back hard
    if (touching && p.shielding && cd <= 0) {
      const dir = b.x >= p.cx() ? 1 : -1;
      b.vx = dir * Math.max(6, Math.abs(b.vx) * 0.9); b.vy = -Math.abs(b.vy) * 0.5 - 3;
      b.fx = null; b.fire = 0;
      b.hitCd.set(p, 10);
      _sportsTouch(b, p);
      continue;
    }

    // Volleyball: a ball dropping onto a fighter is a bump back over the net
    if (sportsType === 'volleyball' && touching && b.vy > 0 && b.y < p.cy() && cd <= 0) {
      _sportsTouch(b, p);
      _sportsLobOverNet(b, _sportsAimPoint(p._sportsTeam).x + (Math.random() - 0.5) * 220, 50);
      b.hitCd.set(p, 14);
      continue;
    }

    // Body contact
    const ox = b.x - p.cx(), oy = b.y - p.cy();
    const d  = Math.hypot(ox, oy);
    const minD = p.w / 2 + b.r + 4;
    if (d < minD && d > 0.1 && !(b.fx && b.fx.owner === p)) {
      const nx = ox / d, ny = oy / d;
      const bx = nx * 0.45 + (p.facing || 1) * 0.55, by = ny * 0.45 - 0.15;
      const bl = Math.hypot(bx, by) || 1;
      const ux = bx / bl, uy = by / bl;
      const dot = (b.vx - p.vx) * -ux + (b.vy - p.vy) * -uy;
      const imp = Math.max(dot + 1.6 + Math.hypot(p.vx, p.vy) * 0.4, 1.0) * (sportsType === 'dodgeball' ? 0.5 : 1);
      b.vx += ux * imp; b.vy += uy * imp * 0.75;
      b.x  += nx * (minD - d) * 0.6; b.y += ny * (minD - d) * 0.6;
      if (b.fx && b.fx.type !== 'orbit') b.fx = null;
      b.live = false;
      _sportsTouch(b, p);
    }
  }
}

// Basic swings: one strike per swing, direction depends on the sport.
function _sportsSwingHits(b) {
  if (b.heldBy) return;
  for (const p of players) {
    if (!p || p.isBoss || p.health <= 0 || p.attackTimer <= 0) continue;
    if (!p.weapon || p.weapon.type !== 'melee') continue;
    if ((b.hitCd.get(p) || 0) > 0) continue;
    const pts = typeof p._getMeleeArcPoints === 'function' ? p._getMeleeArcPoints() : [];
    const tip = p._weaponTip || (typeof p.getWeaponTipPos === 'function' ? p.getWeaponTipPos() : null);
    if (tip) pts.push(tip);
    let hit = false;
    for (const pt of pts) { if (pt && Math.hypot(pt.x - b.x, pt.y - b.y) < b.r + 14) { hit = true; break; } }
    if (!hit) continue;
    _sportsStrike(b, p);
    b.hitCd.set(p, 14);
  }
}

function _sportsStrike(b, p) {
  const team  = p._sportsTeam;
  const T     = _sportsAimPoint(team, p);
  const power = (1 + (p.weapon?.damage || 10) / 18) * (1 + Math.hypot(p.vx, p.vy) * 0.06);
  b.fx = null; b.fire = 0;
  _sportsTouch(b, p);
  if (sportsType === 'volleyball') {
    if (!p.onGround && b.y < SPORTS_NET.top + 20 && Math.abs(b.x - SPORTS_MID_X) < 260) {
      const a = Math.atan2(SPORTS_FLOOR_Y - b.y, T.x - b.x);
      b.vx = Math.cos(a) * 16; b.vy = Math.sin(a) * 16;
      b.fx = { type: 'nograv', t: 10 };
      _sportsPopText(b.x, b.y - 24, 'SPIKE!', '#ffdd44');
    } else {
      _sportsLobOverNet(b, T.x + (Math.random() - 0.5) * 160, 44);
    }
  } else if (sportsType === 'basketball') {
    // Jump shot: accuracy falls off with range and is better in the air
    const dist = Math.abs(T.x - b.x);
    const err  = (Math.random() - 0.5) * dist * (p.onGround ? 0.16 : 0.10);
    _sportsLobTo(b, T.x + err, T.y - 4, Math.max(26, Math.min(64, dist / 9)));
  } else if (sportsType === 'dodgeball') {
    const a = _sportsAimAngle(b, T) - 0.06 * (T.x >= b.x ? 1 : -1);
    const s = 11 + power * 2.5;
    b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
    b.fx = { type: 'nograv', t: 12 };
    b.live = true; b.liveTeam = team;
  } else {
    // Soccer: kick blends where you face with where the goal is
    const f  = p.facing || 1;
    const ga = _sportsAimAngle(b, T);
    let kx = f * 0.55 + Math.cos(ga) * 0.45;
    let ky = -0.30 + Math.sin(ga) * 0.45;
    const kl = Math.hypot(kx, ky) || 1;
    b.vx = kx / kl * 7 * power; b.vy = ky / kl * 6 * power;
  }
  spawnParticles(b.x, b.y, '#ffffff', 6);
  if (SoundManager && SoundManager.hit) SoundManager.hit();
}

function _sportsProjectileHits(b) {
  if (typeof projectiles === 'undefined' || !projectiles) return;
  for (const pr of projectiles) {
    if (!pr || !pr.active || !pr.owner || pr.owner.isBoss) continue;
    if (Math.hypot(pr.x - b.x, pr.y - b.y) > b.r + 10) continue;
    b.heldBy = null;
    pr.active = false;
    // Over a net or up at a hoop a raw shove is useless, so a shot that hits
    // the ball plays it like a swing would (bump over / jump shot).
    if ((sportsType === 'volleyball' || sportsType === 'basketball') && (b.hitCd.get(pr.owner) || 0) <= 0) {
      _sportsStrike(b, pr.owner);
      b.hitCd.set(pr.owner, 14);
      continue;
    }
    b.vx += pr.vx * 0.55; b.vy += pr.vy * 0.55 - 1.5;
    b.fx = null;
    _sportsTouch(b, pr.owner);
    if (sportsType === 'dodgeball') { b.live = true; b.liveTeam = pr.owner._sportsTeam; }
    spawnParticles(b.x, b.y, pr.color || '#ffffff', 6);
  }
}

function _sportsSoccerGoals(b) {
  if (sportsPause > 0) return;
  for (const g of SPORTS_GOALS) {
    const inside = g.team === 1 ? b.x < g.x + g.w * 0.55 : b.x > g.x + g.w * 0.45;
    if (inside && b.y > g.y + 2) { _sportsPoint(g.team, 'GOAL!'); return; }
  }
}

// ── Scoring ──────────────────────────────────────────────────
function _sportsPoint(team, label, pts, noReset) {
  if (sportsWinnerIdx >= 0) return;
  sportsScore[team] += (pts || 1);
  const scorer = players.find(p => p && !p.isBoss && p._sportsTeam === team);
  const color  = scorer ? scorer.color : '#ffdd44';
  sportsBanner = { text: label, sub: (scorer ? scorer.name : 'P' + (team + 1)) + (pts > 1 ? '  +' + pts : ''), color, t: noReset ? 60 : 100 };
  if (SoundManager && SoundManager.explosion) SoundManager.explosion();
  if (settings.screenShake) screenShake = Math.max(screenShake, noReset ? 6 : 10);
  const src = sportsBalls[0];
  if (src) spawnParticles(src.x, src.y, color, 24);

  if (sportsScore[team] >= SPORTS[sportsType].win) {
    sportsWinnerIdx = scorer ? players.indexOf(scorer) : team;
    sportsBanner = { text: (scorer ? scorer.name : 'P' + (team + 1)) + ' WINS!', sub: sportsScore[0] + ' – ' + sportsScore[1], color, t: 240 };
    sportsPause = 9999;
    setTimeout(() => { if (gameRunning && isSportsMode()) endGame(); }, 2000);
    return;
  }
  if (!noReset) {
    sportsPause = 100;
    sportsBalls.forEach(b => { b.hidden = true; });
    sportsServeTeam = team;
  }
}

// ── Bots ─────────────────────────────────────────────────────
// Driven every frame from updateSports (the stock brain only ticks every 15
// frames, far too slow to play a moving ball). updateAI() stands down while
// `_sportsBot` is set.
function _sportsBotStep(p) {
  if (p.health <= 0 || p.stunTimer > 0 || p.ragdollTimer > 0) return;
  if (typeof isCinematic !== 'undefined' && isCinematic) return;
  const skill = { easy: 0.55, medium: 0.75, hard: 0.92, expert: 1.0 }[p.aiDiff] || 0.8;
  const spd   = 5.2 * (p.classSpeedMult || 1) * (0.78 + 0.22 * skill);
  const team  = p._sportsTeam;
  const gdir  = _sportsTeamDir(team);
  const reach = Math.max(60, Math.min(110, (p.weapon && p.weapon.range) || 70));
  let wantX, jump = false, swing = false, useAb = false, useSup = false, guard = false;

  // Ball to play: dodgeball prefers a threat, then a free ball on our side
  let b = null;
  if (sportsType === 'dodgeball') {
    const threat = sportsBalls.find(x => x.live && x.liveTeam !== team &&
      Math.abs(x.x - p.cx()) < 220 && Math.sign(p.cx() - x.x) === Math.sign(x.vx));
    if (threat) {
      if (Math.random() < 0.08 * skill) {
        if (Math.random() < 0.45 * skill) guard = true; else jump = true;
      }
      p._spGuardHold = guard ? 14 : Math.max(0, (p._spGuardHold || 0) - 1);
      b = threat;
    }
    if (!threat) {
      const mine = sportsBalls.filter(x => !x.live && (team === 0 ? x.x < SPORTS_MID_X : x.x > SPORTS_MID_X));
      b = mine.sort((a, c) => Math.abs(a.x - p.cx()) - Math.abs(c.x - p.cx()))[0] || null;
    }
  } else {
    b = sportsBalls[0];
  }
  const d = b ? Math.hypot(b.x - p.cx(), b.y - p.cy()) : 9999;

  if (!b) {
    wantX = team === 0 ? 220 : 680;
  } else if (sportsType === 'volleyball' || (sportsType === 'dodgeball' && b.live)) {
    // Stand under the ball's landing point if it is coming to our half
    let lx = b.x, ly = b.y, vx = b.vx, vy = b.vy;
    const g = SPORTS[sportsType].grav;
    for (let i = 0; i < 90 && ly < SPORTS_FLOOR_Y - 60; i++) { vy += g; lx += vx; ly += vy; }
    const lo = team === 0 ? 30 : SPORTS_MID_X + 30, hi = team === 0 ? SPORTS_MID_X - 30 : GAME_W - 30;
    if (sportsType === 'dodgeball') {
      wantX = team === 0 ? 200 : 700; // keep distance from a live throw
      if (Math.abs(lx - p.cx()) < 50) wantX = p.cx() + (lx < p.cx() ? 80 : -80);
    } else {
      wantX = Math.max(lo, Math.min(hi, lx - gdir * 10));
      if (lx < lo - 20 || lx > hi + 20) wantX = (lo + hi) / 2;
      if (d < 130 && b.y < p.y && b.vy > -2) jump = true;
      if (d < reach) swing = true;
      if (d < 150 && Math.random() < 0.05 * skill) useAb = true;
    }
  } else {
    const T = _sportsAimPoint(team, p);
    const behind = (b.x - p.cx()) * gdir < -8; // ball is between us and our own goal
    if (behind) {
      wantX = b.x - gdir * 45;
      if (Math.abs(b.x - p.cx()) < 70 && b.y > p.y && p.onGround) jump = true;
    } else {
      wantX = b.x - gdir * 18;
    }
    const lead = (sportsType === 'basketball') ? 0 : b.vx * 6 * skill;
    wantX += lead;
    if (b.y < p.y - 20 && Math.abs(b.x - p.cx()) < 70 && b.vy > -3) jump = true;
    if (!behind && d < reach) swing = true;
    if (!behind && d < 150 && Math.random() < 0.06 * skill) useAb = true;
    if (sportsType === 'basketball' && Math.abs(T.x - p.cx()) > 420 && !(p.abilityCooldown <= 0)) swing = swing && Math.random() < 0.15;
    if (d < 220 && p.superReady && Math.random() < 0.03 * skill) useSup = true;
    // Defend: sprint back when a shot is heading at our end
    if ((b.vx * gdir) < -6 && behind) wantX = b.x - gdir * 30;
    if (sportsType === 'dodgeball') {
      const opp = _sportsOpponent(p);
      if (opp && d < reach + 10) { swing = true; p.facing = opp.cx() > p.cx() ? 1 : -1; }
      if (opp && d < 150 && Math.random() < 0.06 * skill) useAb = true;
    }
  }

  // Keep to our half where the divider exists
  if (sportsType === 'volleyball' || sportsType === 'dodgeball') {
    wantX = team === 0 ? Math.min(wantX, SPORTS_MID_X - 30) : Math.max(wantX, SPORTS_MID_X + 30);
  }

  if (p._spGuardHold > 0) { p.shielding = p.onGround; p.vx *= 0.6; return; }
  p.shielding = false;

  const dx = wantX - p.cx();
  if (Math.abs(dx) > 8) { p.vx = Math.sign(dx) * spd; p.facing = Math.sign(dx); }
  else p.vx *= 0.7;
  if (swing || useAb) p.facing = sportsType === 'dodgeball' ? p.facing : gdir;

  if (jump && p.onGround && Math.random() < 0.35 + 0.5 * skill) {
    p.vy = p.charClass === 'megaknight' ? -22 : -17;
    p.canDoubleJump = true;
  } else if (jump && !p.onGround && p.canDoubleJump && b && b.y < p.y - 40 && p.vy > 0 && Math.random() < 0.1 * skill) {
    p.vy = -13; p.canDoubleJump = false;
  }
  const tgt = p.target || _sportsOpponent(p);
  if (useSup && p.superReady && typeof p.useSuper === 'function') p.useSuper(tgt);
  else if (useAb && p.abilityCooldown <= 0 && tgt) p.ability(tgt);
  else if (swing && p.cooldown <= 0 && Math.random() < 0.25 + 0.5 * skill && tgt) p.attack(tgt);
}

// ── Per-frame update ─────────────────────────────────────────
function updateSports() {
  if (!isSportsMode() || !gameRunning) return;
  if (sportsBanner && --sportsBanner.t <= 0) sportsBanner = null;

  // Detect abilities / supers the moment they fire (humans and bots alike)
  for (const p of players) {
    if (!p || p.isBoss) continue;
    if (p._spHitCd > 0) p._spHitCd--;
    const ab = p.abilityCooldown || 0;
    if (ab > (p._spPrevAbCd || 0) + 4) _sportsApplyMove(p, _sportsMoveKind(p));
    p._spPrevAbCd = ab;
    const sr = !!p.superReady;
    if (p._spPrevSuper && !sr) _sportsApplyMove(p, 'super');
    p._spPrevSuper = sr;
    // Carrying: the holder's own swing lets the ball fly
    for (const b of sportsBalls) {
      if (b.heldBy === p && p.attackTimer > 0 && (p._spPrevAtk || 0) <= 0) {
        b.heldBy = null;
        _sportsStrike(b, p);
        const s = Math.hypot(b.vx, b.vy) || 1;
        if (sportsType !== 'basketball' && sportsType !== 'volleyball') { b.vx *= 17 / s; b.vy *= 17 / s; b.fx = { type: 'nograv', t: 14 }; }
        _sportsPopText(b.x, b.y - 20, 'POWER SHOT!', '#ffcc44');
        b.hitCd.set(p, 14);
      }
    }
    p._spPrevAtk = p.attackTimer || 0;
    if (p._sportsBot && p.isAI) _sportsBotStep(p);
  }

  if (sportsPause > 0) {
    sportsPause--;
    if (sportsPause === 0 && sportsWinnerIdx < 0) {
      _sportsResetPositions();
      _sportsServe(sportsType === 'volleyball' ? sportsServeTeam : -1);
    }
    return;
  }

  for (const b of sportsBalls) {
    _sportsStepBall(b);
    if (sportsPause > 0) return;
    _sportsBallVsPlayers(b);
    _sportsSwingHits(b);
    _sportsProjectileHits(b);
    if (sportsType === 'soccer') _sportsSoccerGoals(b);
    if (sportsPause > 0) return;
  }
  // Dodgeball balls knock into each other instead of overlapping
  if (sportsBalls.length === 2) {
    const [a, c] = sportsBalls, dx = c.x - a.x, dy = c.y - a.y, dd = Math.hypot(dx, dy);
    if (dd < a.r + c.r && dd > 0.01) {
      const nx = dx / dd, ny = dy / dd, pen = (a.r + c.r - dd) / 2;
      a.x -= nx * pen; a.y -= ny * pen; c.x += nx * pen; c.y += ny * pen;
      const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny; }
    }
  }
}

// ── Drawing (world space, above platforms) ───────────────────
function drawSports() {
  if (!isSportsMode()) return;
  ctx.save();
  const fy = SPORTS_FLOOR_Y;

  // Court surface over the pitch
  const surf = { soccer: null, basketball: ['#b9783f', '#9a6233'], volleyball: ['#d9b77a', '#c29d5e'], dodgeball: ['#2b4a8c', '#223b70'] }[sportsType];
  if (surf) {
    const g = ctx.createLinearGradient(0, fy, 0, fy + 60);
    g.addColorStop(0, surf[0]); g.addColorStop(1, surf[1]);
    ctx.fillStyle = g; ctx.fillRect(0, fy, GAME_W, 60);
    if (sportsType === 'basketball') {
      ctx.strokeStyle = 'rgba(60,30,10,0.25)'; ctx.lineWidth = 1;
      for (let x = 0; x < GAME_W; x += 36) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x, fy + 60); ctx.stroke(); }
    }
  }
  if (surf) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(SPORTS_MID_X, fy); ctx.lineTo(SPORTS_MID_X, fy + 60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, fy + 1); ctx.lineTo(GAME_W, fy + 1); ctx.stroke();
  }

  if (sportsType === 'soccer') {
    // Pitch markings come from drawSoccerArena; only the goals are drawn here
    for (const g of SPORTS_GOALS) {
      const tint = players.find(p => p && p._sportsTeam !== g.team);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
      for (let yy = g.y; yy < g.y + g.h; yy += 10) { ctx.beginPath(); ctx.moveTo(g.x, yy); ctx.lineTo(g.x + g.w, yy); ctx.stroke(); }
      for (let xx = g.x; xx < g.x + g.w; xx += 8) { ctx.beginPath(); ctx.moveTo(xx, g.y); ctx.lineTo(xx, g.y + g.h); ctx.stroke(); }
      ctx.strokeStyle = tint ? tint.color : '#ffffff'; ctx.lineWidth = 4;
      const mouth = g.team === 1 ? g.x + g.w : g.x;
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.w, g.y); ctx.moveTo(mouth, g.y); ctx.lineTo(mouth, fy); ctx.stroke();
    }
  } else if (sportsType === 'basketball') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (const h of SPORTS_HOOPS) {
      const hx = (h.rimFront + h.rimBack) / 2;
      const tx = hx + (h.team === 0 ? -SPORTS_THREE_DIST : SPORTS_THREE_DIST);
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(tx, fy - 8); ctx.lineTo(tx, fy + 20); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const h of SPORTS_HOOPS) {
      const side = h.boardX < SPORTS_MID_X ? -1 : 1;
      const tint = players.find(p => p && p._sportsTeam !== h.team);
      // Pole + arm
      ctx.fillStyle = '#3b3f4a';
      ctx.fillRect(h.boardX + side * 18 - 4, h.rimY - 60, 8, fy - h.rimY + 60);
      ctx.fillRect(Math.min(h.boardX, h.boardX + side * 18), h.rimY - 40, 18, 6);
      // Backboard
      ctx.fillStyle = 'rgba(230,240,255,0.85)';
      ctx.fillRect(h.boardX - 3, h.rimY - 100, 6, 110);
      ctx.strokeStyle = tint ? tint.color : '#ff4444'; ctx.lineWidth = 2;
      ctx.strokeRect(h.boardX - 3, h.rimY - 100, 6, 110);
      // Net
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
      const x0 = Math.min(h.rimFront, h.rimBack), x1 = Math.max(h.rimFront, h.rimBack);
      for (let i = 0; i <= 4; i++) {
        const xa = x0 + (x1 - x0) * i / 4, xb = x0 + 10 + (x1 - x0 - 20) * i / 4;
        ctx.beginPath(); ctx.moveTo(xa, h.rimY); ctx.lineTo(xb, h.rimY + 34); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(x0 + 5, h.rimY + 17); ctx.lineTo(x1 - 5, h.rimY + 17); ctx.stroke();
      // Rim
      ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(h.rimFront, h.rimY); ctx.lineTo(h.rimBack, h.rimY); ctx.stroke();
    }
  } else if (sportsType === 'volleyball') {
    const n = SPORTS_NET;
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(n.x + 2, n.top - 10, 4, fy - n.top + 10);
    ctx.fillStyle = 'rgba(20,20,20,0.35)'; ctx.fillRect(n.x - 2, n.top, n.w + 4, 120);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
    for (let yy = n.top; yy < n.top + 120; yy += 8) { ctx.beginPath(); ctx.moveTo(n.x - 2, yy); ctx.lineTo(n.x + n.w + 2, yy); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(n.x - 3, n.top - 3, n.w + 6, 6);
  } else if (sportsType === 'dodgeball') {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(SPORTS_NET.x, 0, SPORTS_NET.w, fy);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(SPORTS_MID_X, 40); ctx.lineTo(SPORTS_MID_X, fy); ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const b of sportsBalls) if (!b.hidden) _sportsDrawBall(b);

  // Banner (GOAL! / BUCKET! / etc.)
  if (sportsBanner) {
    const a = Math.min(1, sportsBanner.t / 20);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Arial';
    ctx.fillStyle = sportsBanner.color || '#ffdd44';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 16;
    ctx.fillText(sportsBanner.text, GAME_W / 2, GAME_H / 2 - 50);
    if (sportsBanner.sub) {
      ctx.font = 'bold 20px Arial'; ctx.fillStyle = '#ffffff';
      ctx.fillText(sportsBanner.sub, GAME_W / 2, GAME_H / 2 - 18);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function _sportsDrawBall(b) {
  const r = b.r;
  // Trail for anything moving under a move effect
  if (b.fx || b.fire > 0 || b.charged > 0 || b.live) {
    const col = b.fire > 0 ? '255,110,20' : b.charged > 0 ? '150,200,255' : b.live ? '255,80,80' : '255,255,255';
    b.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / b.trail.length) * 0.35;
      ctx.fillStyle = `rgb(${col})`;
      ctx.beginPath(); ctx.arc(t.x, t.y, r * (0.4 + 0.6 * i / b.trail.length), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  // Ground shadow
  const h = Math.max(0, SPORTS_FLOOR_Y - b.y);
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.35 - h / 900)})`;
  ctx.beginPath(); ctx.ellipse(b.x, SPORTS_FLOOR_Y + 2, r * Math.max(0.4, 1 - h / 500), 4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.spin);
  if (b.fire > 0)    { ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 22; }
  else if (b.charged > 0) { ctx.shadowColor = '#88bbff'; ctx.shadowBlur = 18; }
  else if (b.live && b.lastTouched) { ctx.shadowColor = b.lastTouched.color; ctx.shadowBlur = 14; }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  if (sportsType === 'basketball') {
    ctx.fillStyle = '#e8741e'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3a1a06'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.1, 0, r * 0.8, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 1.1, 0, r * 0.8, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  } else if (sportsType === 'volleyball') {
    ctx.fillStyle = '#f8f4e6'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#2e6bd6';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -0.4, 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2c230';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, 2.0, 3.3); ctx.closePath(); ctx.fill();
  } else if (sportsType === 'dodgeball') {
    ctx.fillStyle = b.live ? '#ff4040' : '#c83232'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#222';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.22, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  if (b.heldBy) {
    ctx.strokeStyle = b.heldBy.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(b.x, b.y, r + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// Screen-space scoreboard (called from drawMinigameHUD)
function drawSportsHUD() {
  const p1 = players.find(p => p && p._sportsTeam === 0), p2 = players.find(p => p && p._sportsTeam === 1);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const y = (typeof _hudBottom === 'function' ? _hudBottom() : 0) + 8;
  const cx = canvas.width / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(cx - 90, y, 180, 46);
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#bbbbbb';
  ctx.fillText(SPORTS[sportsType].name + '  ·  FIRST TO ' + SPORTS[sportsType].win, cx, y + 13);
  ctx.font = 'bold 24px Arial'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillStyle = (p1 && p1.color) || '#00d4ff'; ctx.textAlign = 'left';  ctx.fillText(sportsScore[0], cx - 76, y + 39);
  ctx.fillStyle = '#ffffff';                     ctx.textAlign = 'center'; ctx.fillText('–', cx, y + 39);
  ctx.fillStyle = (p2 && p2.color) || '#ff4444'; ctx.textAlign = 'right'; ctx.fillText(sportsScore[1], cx + 76, y + 39);
  ctx.restore();
}
