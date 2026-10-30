'use strict';
// smb-endless.js: Endless mode. A run through generated city areas. Every enemy in an area must fall before the
// teleporter at the far end opens; stepping into it builds the next, harder area. Lives, health and the weapon in
// hand carry over. Every third area a mini-boss guards the teleporter. Score is areas cleared; the best run is
// saved to the account.
// Area types: street (open-front buildings), rooftops (tall blocks, jump roof to roof), office (one building, the
// whole run is inside), construction (steel frames with girders). Each draws on a randomly picked backdrop.
// Depends on: smb-globals.js, smb-combat.js, smb-particles-core.js, smb-fighter.js, smb-pathfinding.js, smb-minigames.js

// Mega City's span and floor. Its skyline backdrop is cached for this span on first draw, so the span never changes.
const END_MAP_L   = -900, END_MAP_R = 2700;
const END_FLOOR_Y = 560;
// Storeys. A standing jump clears 175px, so every floor is one hop from the one below.
const END_STOREY  = 120;
const END_STAIR_W = 70;          // stairwell gap left in each interior floor
const END_START_X = END_MAP_L + 170;
const END_TP_X    = 2560;        // teleporter centre; its height depends on the area type
const END_TP_HOLD = 30;          // frames standing in an open teleporter before it fires
const END_FADE_F  = 36;
// Enemies hold their ground until the player is this close. The view is 900 wide at zoom 1.
const END_AGGRO_X = 480, END_AGGRO_Y = 300;
const END_WAKE_R  = 360;         // a woken enemy wakes others this close to it
const END_HEAL_FRAC = 0.35;      // health restored on each teleport
const END_DROP_WEAPON = 0.35, END_DROP_HEALTH = 0.25;
const END_HEALTH_ORB = 30;
const END_ENEMY_TEAM = 'endless_enemy';
const END_ENEMY_COLORS = ['#ff4b4b', '#ff8a2a', '#e8c440', '#c05cff', '#ff4fa3', '#4fd1ff'];

const END_TYPES = {
  street:       { label: 'STREET',            themes: ['megacity', 'city', 'cyberpunk'] },
  rooftops:     { label: 'ROOFTOPS',          themes: ['megacity', 'cyberpunk'] },
  office:       { label: 'OFFICE BLOCK',      themes: ['megacity'] },
  construction: { label: 'CONSTRUCTION SITE', themes: ['megacity', 'city'] },
};

// Mini-boss
const END_BOSS_EVERY  = 3;
const END_BOSS_SCALE  = 1.45;
const END_BOSS_NAMES  = ['THE FOREMAN', 'BLOCK CAPTAIN', 'THE WARDEN', 'IRON LANDLORD', 'THE DEBT COLLECTOR', 'NIGHT MANAGER'];
const END_BOSS_WEAPONS = ['hammer', 'axe', 'scythe', 'anchor', 'spear', 'flail', 'katana'];
const END_SLAM_WARN   = 45;      // telegraph frames: the boss plants and a ring grows on the ground
const END_SLAM_R      = 230;     // shockwave reach along the ground; jumping clears it
const END_SLAM_CD     = 240, END_SLAM_CD_ENRAGED = 150;

var endlessActive    = false;
var endlessArea      = 0;
var endlessType      = 'street';
var endlessEnemies   = [];
var endlessBoss      = null;
var endlessDecor     = [];       // backdrop pieces: { kind: 'shell'|'interior'|'frame', ... }
var endlessTp        = { x: END_TP_X, y: END_FLOOR_Y };
var endlessDrops     = [];       // { kind: 'weapon'|'health', x, y, vy, weaponKey, life }
var endlessKills     = 0;
var endlessOpen      = false;    // teleporter unlocked
var endlessTpHold    = 0;
var endlessFade      = 0;        // >0 fading out toward the next area, <0 fading in
var endlessBanner    = 0;
var endlessBest      = 0;
var endlessNewBest   = false;
var endlessSlamFX    = [];       // { x, y, t } expanding shockwave rings
var _endlessView     = null;     // world transform captured while drawing the world, for HUD arrows

function _endlessTier(n) {
  return {
    count: Math.min(4 + Math.floor((n - 1) / 2), 8),
    diff:  n <= 2 ? 'easy' : n <= 5 ? 'medium' : n <= 9 ? 'hard' : 'expert',
    // Fighters are 150 at full. Health keeps climbing after damage reaches 1x, so there is no ceiling.
    hp:    Math.round(90 + 12 * (n - 1)),
    dmg:   Math.min(0.55 + 0.05 * (n - 1), 1),
  };
}

function _endlessIsBossArea(n) { return n % END_BOSS_EVERY === 0; }

function _rnd(a, b) { return a + Math.random() * (b - a); }
function _rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

// Stored per account like the Fight Ladder's rung, with a localStorage fallback when no account is active.
function _endlessLoadBest() {
  var n = 0;
  try {
    var acct = (typeof GameState !== 'undefined' && GameState.getActiveAccount) ? GameState.getActiveAccount() : null;
    var v = acct && acct.data && acct.data.unlocks ? acct.data.unlocks.endlessBest : undefined;
    n = Number(v != null ? v : localStorage.getItem('smb_endlessBest')) || 0;
  } catch (e) {}
  return Math.max(0, n);
}

function _endlessSaveBest(n) {
  try {
    if (typeof setAccountFlagWithRuntime === 'function') setAccountFlagWithRuntime(['unlocks', 'endlessBest'], n, function () {});
  } catch (e) {}
  try { localStorage.setItem('smb_endlessBest', String(n)); } catch (e) {}
}

// Generation

// A building with `storeys` floors over the street. Interior floors leave a stairwell on alternating sides; the
// roof is whole. All are one-way, so the climb is straight up and the stairwells are the way down.
function _endlessBuilding(platforms, x, w, storeys, gapLeft) {
  var B = { kind: 'shell', x: x, w: w, top: END_FLOOR_Y - storeys * END_STOREY,
            hue: [210, 250, 280, 190, 330][_rndInt(0, 4)], wins: [] };
  for (var k = 1; k <= storeys; k++) {
    var y = END_FLOOR_Y - k * END_STOREY;
    if (k === storeys) {
      platforms.push({ x: x, y: y, w: w, h: 14, passUnder: true, color: '#3a3a6e', edge: '#7a7ad0' });
    } else if ((k % 2 === 0) === gapLeft) {
      platforms.push({ x: x + END_STAIR_W, y: y, w: w - END_STAIR_W, h: 12, passUnder: true });
    } else {
      platforms.push({ x: x, y: y, w: w - END_STAIR_W, h: 12, passUnder: true });
    }
  }
  for (var r = 0; r < storeys; r++) {
    for (var c = 0; c < Math.floor((w - 30) / 42); c++) B.wins.push({ r: r, c: c, lit: Math.random() < 0.55 });
  }
  endlessDecor.push(B);
  return B;
}

function _endlessGenStreet(platforms) {
  var x = _rnd(-560, -480);
  var gapLeft = Math.random() < 0.5;
  while (true) {
    var w = _rndInt(240, 390);
    if (x + w > 2330) break;
    _endlessBuilding(platforms, x, w, _rndInt(2, 4), gapLeft);
    gapLeft = !gapLeft;
    var gap = _rnd(150, 290);
    if (Math.random() < 0.5) {
      platforms.push({ x: x + w + gap / 2 - 50, y: END_FLOOR_Y - 100, w: 100, h: 12, passUnder: true });
    }
    x += w + gap;
  }
  return { x: END_TP_X, y: END_FLOOR_Y };
}

// Tall blocks close enough to jump between. Neighbouring roofs differ by at most one storey, and the last block
// holds the teleporter on its roof. The street below is the slow way round.
function _endlessGenRooftops(platforms) {
  var x = _rnd(-560, -500);
  var storeys = _rndInt(2, 3);
  var gapLeft = Math.random() < 0.5;
  var last = null;
  while (true) {
    var w = _rndInt(190, 300);
    if (x + w > 2200) break;
    last = _endlessBuilding(platforms, x, w, storeys, gapLeft);
    last.storeys = storeys;
    gapLeft = !gapLeft;
    x += w + _rnd(90, 160);
    storeys = Math.max(2, Math.min(4, storeys + _rndInt(-1, 1)));
  }
  var fw = Math.max(220, END_MAP_R - 20 - x);
  var fs = Math.max(2, Math.min(4, last ? last.storeys + _rndInt(-1, 1) : 3));
  _endlessBuilding(platforms, x, fw, fs, gapLeft);
  return { x: Math.min(END_TP_X, x + fw - 110), y: END_FLOOR_Y - fs * END_STOREY };
}

// One long building: the whole area is inside. Three floors over the street-level lobby, each with two or three
// stairwells at random spots, and desks to fight over. The teleporter sits at the far end of a random floor.
function _endlessGenOffice(platforms) {
  var x0 = _rnd(-640, -580), x1 = END_MAP_R - 10;
  var levels = 3;
  var floorCol = '#4b5068', floorEdge = '#9aa3c4';
  var gaps = [];
  for (var k = 1; k <= levels; k++) {
    var y = END_FLOOR_Y - k * END_STOREY;
    var cuts = [];
    var n = _rndInt(2, 3);
    for (var i = 0; i < n; i++) cuts.push(_rnd(x0 + 220, 2300));
    cuts.sort(function (a, b) { return a - b; });
    var cur = x0;
    cuts.forEach(function (c) {
      if (c - cur < 140) return;
      platforms.push({ x: cur, y: y, w: c - cur, h: 12, passUnder: true, color: floorCol, edge: floorEdge });
      gaps.push({ x: c, y: y });
      cur = c + 80;
    });
    platforms.push({ x: cur, y: y, w: x1 - cur, h: 12, passUnder: true, color: floorCol, edge: floorEdge });
  }
  // Desks: low one-way ledges on every level, clear of stairwells and the teleporter end.
  var desks = [];
  for (var lv = 0; lv <= levels; lv++) {
    var base = END_FLOOR_Y - lv * END_STOREY;
    var count = _rndInt(2, 4);
    for (var d = 0; d < count; d++) {
      var dx = _rnd(x0 + 120, 2300);
      if (gaps.some(function (g) { return Math.abs(g.x + 40 - dx) < 120; })) continue;
      platforms.push({ x: dx - 45, y: base - 48, w: 90, h: 10, passUnder: true, color: '#6b5a48', edge: '#a88f6c' });
      desks.push({ x: dx - 45, y: base - 48, base: base });
    }
  }
  endlessDecor.push({ kind: 'interior', x0: x0, x1: x1, top: END_FLOOR_Y - (levels + 1) * END_STOREY, levels: levels, desks: desks });
  return { x: END_TP_X, y: END_FLOOR_Y - _rndInt(0, levels) * END_STOREY };
}

// Steel frames between open lots. Every level of a frame has one girder at least half the frame wide, so any two
// girders a storey apart overlap and the climb always works; extra short beams vary it.
function _endlessGenConstruction(platforms) {
  var x = _rnd(-520, -440);
  var steel = '#8a6a2e', steelEdge = '#d8a548';
  while (true) {
    var w = _rndInt(260, 360);
    if (x + w > 2350) break;
    var levels = _rndInt(2, 4);
    var F = { kind: 'frame', x: x, w: w, levels: levels, top: END_FLOOR_Y - levels * END_STOREY, crane: Math.random() < 0.35 };
    for (var k = 1; k <= levels; k++) {
      var y = END_FLOOR_Y - k * END_STOREY;
      var mw = w * _rnd(0.5, 0.8);
      var mx = x + _rnd(0, w - mw);
      platforms.push({ x: mx, y: y, w: mw, h: 12, passUnder: true, color: steel, edge: steelEdge });
      if (Math.random() < 0.45) {
        var sw = _rnd(60, 100);
        var sx = mx > x + w / 2 ? x : x + w - sw;
        if (sx + sw < mx - 30 || sx > mx + mw + 30) platforms.push({ x: sx, y: y - 40, w: sw, h: 10, passUnder: true, color: steel, edge: steelEdge });
      }
    }
    endlessDecor.push(F);
    var gap = _rnd(160, 300);
    // Open lots get material stacks to stand on.
    if (Math.random() < 0.6) platforms.push({ x: x + w + gap / 2 - 40, y: END_FLOOR_Y - 55, w: 80, h: 12, passUnder: true, color: '#5c5f66', edge: '#9aa0aa' });
    x += w + gap;
  }
  return { x: END_TP_X, y: END_FLOOR_Y };
}

function _endlessPickType() {
  var keys = Object.keys(END_TYPES);
  // Area 1 is always the street, so the first look at the mode is the plainest.
  if (endlessArea <= 1) return 'street';
  var pool = keys.filter(function (k) { return k !== endlessType; });
  return pool[_rndInt(0, pool.length - 1)];
}

function endlessMakeArena() {
  var platforms = [];
  endlessDecor = [];
  endlessType = _endlessPickType();
  platforms.push({ x: END_MAP_L, y: END_FLOOR_Y, w: END_MAP_R - END_MAP_L, h: 40, isFloor: true });

  var gen = endlessType === 'rooftops' ? _endlessGenRooftops
          : endlessType === 'office' ? _endlessGenOffice
          : endlessType === 'construction' ? _endlessGenConstruction
          : _endlessGenStreet;
  endlessTp = gen(platforms);

  var themes = END_TYPES[endlessType].themes.filter(function (k) { return typeof ARENAS !== 'undefined' && ARENAS[k]; });
  var theme = themes.length ? themes[_rndInt(0, themes.length - 1)] : 'megacity';
  var src = (typeof ARENAS !== 'undefined' && ARENAS[theme]) || {};
  var arena = {
    id: '__endless__',
    name: 'Endless',
    sky: src.sky || ['#0a0a1a', '#1a0a2e', '#0d1a3a'],
    groundColor: src.groundColor || '#1a1a2e',
    platColor: '#2d2d5e', platEdge: '#4a4a9e',
    deathY: 700,
    worldWidth: END_MAP_R - END_MAP_L,
    mapLeft: END_MAP_L, mapRight: END_MAP_R,
    isBossArena: false,
    platforms: platforms,
  };
  if (theme === 'megacity') {
    // Mega City's own art is authored for this world span.
    arena.designerBase = 'megacity';
  } else {
    // Other arenas' art is 900 wide, so it tiles in viewport space the way story explore worlds use it.
    arena.isExploreArena = true;
    arena.themeKey = theme;
    var tf = (src.platforms || []).find(function (pl) { return pl.isFloor; });
    arena.themeFloorY = tf ? tf.y : null;
  }
  return arena;
}

// Enemies
function _endlessSpawnSpots(count) {
  var spots = [];
  (currentArena.platforms || []).forEach(function (pl) {
    if (pl.isFloor || pl.w < 70) return;
    // Long floors (the office) get a spot every 300px, not one in the middle.
    var n = Math.max(1, Math.floor(pl.w / 300));
    for (var i = 0; i < n; i++) spots.push({ x: pl.x + (i + 0.5) * pl.w / n, y: pl.y });
  });
  for (var sx = -300; sx < 2300; sx += 260) spots.push({ x: sx + Math.random() * 120, y: END_FLOOR_Y });
  for (var i2 = spots.length - 1; i2 > 0; i2--) {
    var j = Math.floor(Math.random() * (i2 + 1));
    var t = spots[i2]; spots[i2] = spots[j]; spots[j] = t;
  }
  // Keep them apart, so the area fights as a string of encounters rather than one pile.
  var picked = [];
  for (var s = 0; s < spots.length && picked.length < count; s++) {
    var sp = spots[s];
    if (sp.x < -350 || sp.x > 2350) continue;
    if (picked.some(function (q) { return Math.abs(q.x - sp.x) < 150 && Math.abs(q.y - sp.y) < 100; })) continue;
    picked.push(sp);
  }
  return picked;
}

function _endlessWeaponPool() {
  return WEAPON_KEYS.filter(function (k) { return k !== 'combat' && k !== 'lantern'; });
}

function _endlessMakeEnemy(x, footY, color, weaponKey, diff) {
  var bot = new Fighter(x, footY - 90, color, weaponKey,
    { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, diff);
  bot.x = x - bot.w / 2;
  bot.y = footY - bot.h - 2;
  bot.lives     = 1;
  bot._teamId   = END_ENEMY_TEAM;
  bot.playerNum = 2;
  bot.target    = players[0] || null;
  bot._endlessIdle = true;
  bot._botIQ    = 0;     // the tactics layer stays off until it wakes
  minions.push(bot);
  endlessEnemies.push(bot);
  return bot;
}

function _endlessSpawnEnemies() {
  var tier = _endlessTier(endlessArea);
  var boss = _endlessIsBossArea(endlessArea);
  var pool = _endlessWeaponPool();
  var spots = _endlessSpawnSpots(boss ? Math.max(2, tier.count - 2) : tier.count);
  endlessEnemies = [];
  endlessBoss = null;
  spots.forEach(function (sp, i) {
    var bot = _endlessMakeEnemy(sp.x, sp.y, END_ENEMY_COLORS[i % END_ENEMY_COLORS.length], randChoice(pool), tier.diff);
    bot.name      = 'Enemy';
    bot.maxHealth = tier.hp;
    bot.health    = tier.hp;
    bot.dmgMult   = tier.dmg;
    bot.personality = randChoice(['aggressive', 'defensive', 'trickster', 'sniper']);
  });
  if (boss) _endlessSpawnBoss(tier);
}

// Mini-boss: a scaled-up fighter guarding the teleporter, with a telegraphed ground slam and an enrage at half health.
function _endlessSpawnBoss(tier) {
  var diffs = ['easy', 'medium', 'hard', 'expert'];
  var diff = diffs[Math.min(diffs.length - 1, diffs.indexOf(tier.diff) + 1)];
  var wk = END_BOSS_WEAPONS.filter(function (k) { return WEAPONS[k]; });
  var b = _endlessMakeEnemy(endlessTp.x - 70, endlessTp.y, '#ff3355', randChoice(wk.length ? wk : WEAPON_KEYS), diff);
  var foot = b.y + b.h;
  b.w = Math.round(b.w * END_BOSS_SCALE); b.h = Math.round(b.h * END_BOSS_SCALE);
  b.drawScale = END_BOSS_SCALE;
  b.x = endlessTp.x - 70 - b.w / 2;
  b.y = foot - b.h;
  b.name      = END_BOSS_NAMES[_rndInt(0, END_BOSS_NAMES.length - 1)];
  b.maxHealth = tier.hp * 4;
  b.health    = b.maxHealth;
  b.dmgMult   = tier.dmg;
  b.kbResist  = 0.5;
  b.personality = 'aggressive';
  b._endlessBoss = true;
  b._endSlamCd   = 150;
  b._endSlamT    = 0;
  b._enraged     = false;
  endlessBoss = b;
}

function _endlessWake(bot) {
  if (!bot || !bot._endlessIdle) return;
  bot._endlessIdle = false;
  delete bot._botIQ;
  if (players[0] && players[0].health > 0) bot.target = players[0];
}

// Called from Fighter.updateAI while the bot is idle or winding up a slam. True = the bot holds still this tick.
function endlessIdleAI(bot) {
  if (bot._endSlamT > 0) { bot.vx *= 0.5; return true; }
  var p = players[0];
  var near = p && p.health > 0 &&
    Math.abs(p.cx() - bot.cx()) < END_AGGRO_X && Math.abs(p.cy() - bot.cy()) < END_AGGRO_Y;
  if (near || bot.health < bot.maxHealth) {
    _endlessWake(bot);
    endlessEnemies.forEach(function (e) {
      if (e._endlessIdle && e.health > 0 && Math.hypot(e.cx() - bot.cx(), e.cy() - bot.cy()) < END_WAKE_R) _endlessWake(e);
    });
    return false;
  }
  bot.vx *= 0.7;
  if (p) bot.facing = p.cx() > bot.cx() ? 1 : -1;
  return true;
}

function _endlessUpdateBoss(p) {
  var b = endlessBoss;
  if (!b || b.health <= 0 || b._endlessIdle) return;
  if (!b._enraged && b.health < b.maxHealth * 0.5) {
    b._enraged = true;
    if (typeof DamageText !== 'undefined') damageTexts.push(new DamageText(b.cx(), b.y - 30, 'ENRAGED', '#ff3355'));
    if (typeof spawnParticles === 'function') spawnParticles(b.cx(), b.cy(), '#ff3355', 20);
    screenShake = Math.max(screenShake, 8);
  }
  if (b._endSlamT > 0) {
    if (--b._endSlamT === 0) {
      var fx = b.cx(), fy = b.y + b.h;
      endlessSlamFX.push({ x: fx, y: fy, t: 0 });
      screenShake = Math.max(screenShake, 12);
      if (typeof spawnParticles === 'function') spawnParticles(fx, fy - 6, '#ffb070', 18);
      var dmg = Math.min(22, 12 + Math.floor(endlessArea / 2)) + (b._enraged ? 4 : 0);
      players.forEach(function (q) {
        if (q.health <= 0 || !q.onGround) return;
        if (Math.abs(q.cx() - fx) > END_SLAM_R || Math.abs((q.y + q.h) - fy) > 40) return;
        dealDamage(b, q, dmg, 14);
      });
      b._endSlamCd = b._enraged ? END_SLAM_CD_ENRAGED : END_SLAM_CD;
    }
    return;
  }
  if (b._endSlamCd > 0) { b._endSlamCd--; return; }
  if (p && p.health > 0 && b.onGround && b.stunTimer <= 0 &&
      Math.abs(p.cx() - b.cx()) < 300 && Math.abs(p.cy() - b.cy()) < 150) {
    b._endSlamT = END_SLAM_WARN;
  }
}

// Run lifecycle
function _endlessPlacePlayer(p) {
  p.spawnX = END_START_X;
  p.spawnY = END_FLOOR_Y;
  p.x = END_START_X - p.w / 2;
  p.y = END_FLOOR_Y - p.h;
  p.vx = 0; p.vy = 0;
  p.facing = 1;
  if (typeof camXCur !== 'undefined') {
    camXCur = camXTarget = p.cx();
    camYCur = camYTarget = p.cy() - 80;
  }
}

function _endlessEnterArea() {
  endlessOpen   = false;
  endlessTpHold = 0;
  endlessDrops  = [];
  endlessSlamFX = [];
  endlessBanner = 150;
  if (players[0]) _endlessPlacePlayer(players[0]);
  _endlessSpawnEnemies();
}

// Called by _startGameCore once players[] holds P1. The arena was built there too (currentArenaKey '__endless__').
function initEndless() {
  endlessActive  = true;
  endlessKills   = 0;
  endlessFade    = 0;
  endlessBest    = _endlessLoadBest();
  endlessNewBest = false;
  if (typeof minigameResult !== 'undefined') minigameResult = null;
  minions.length = 0;
  _endlessEnterArea();
}

// _startGameCore builds area 1's arena before players exist, so the run counter is set there.
function endlessBeginRun() {
  endlessArea = 1;
  endlessType = 'street';
}

function _endlessNextArea() {
  endlessArea++;
  ARENAS.__endless__ = endlessMakeArena();
  currentArena = ARENAS.__endless__;
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  minions.length = 0;
  projectiles = [];
  var p = players[0];
  if (p) p.health = Math.min(p.maxHealth, p.health + Math.round(p.maxHealth * END_HEAL_FRAC));
  _endlessEnterArea();
}

function _endlessRecordBest() {
  var cleared = endlessArea - 1;
  if (cleared > endlessBest) {
    endlessBest = cleared;
    endlessNewBest = true;
    _endlessSaveBest(cleared);
  }
}

// Per frame, after minions update.
function updateEndless() {
  if (!endlessActive || !gameRunning) return;
  var p = players[0];

  endlessEnemies.forEach(function (e) {
    if (e.health > 0 || e._endlessDead) return;
    e._endlessDead = true;
    endlessKills++;
    var fx = e.cx(), fy = e.y + e.h * 0.5;
    var roll = Math.random();
    // The mini-boss always drops its weapon.
    if (e._endlessBoss) roll = 0;
    if (roll < END_DROP_WEAPON && e.weaponKey && WEAPONS[e.weaponKey] && e.weaponKey !== 'combat') {
      endlessDrops.push({ kind: 'weapon', weaponKey: e.weaponKey, x: fx, y: fy, vy: -4, life: 1800 });
    } else if (roll < END_DROP_WEAPON + END_DROP_HEALTH) {
      endlessDrops.push({ kind: 'health', x: fx, y: fy, vy: -4, life: 1200 });
    }
  });

  _endlessUpdateBoss(p);
  for (var si = endlessSlamFX.length - 1; si >= 0; si--) if (++endlessSlamFX[si].t > 24) endlessSlamFX.splice(si, 1);

  if (!endlessOpen && endlessEnemies.length && endlessEnemies.every(function (e) { return e.health <= 0; })) {
    endlessOpen = true;
    if (typeof DamageText !== 'undefined' && p) damageTexts.push(new DamageText(p.cx(), p.y - 40, 'TELEPORTER OPEN', '#5fe8ff'));
    if (typeof SoundManager !== 'undefined' && SoundManager.waveStart) SoundManager.waveStart();
  }

  _endlessUpdateDrops(p);

  if (endlessBanner > 0) endlessBanner--;

  // The run ends when P1's last life goes. checkDeaths schedules endGame; the result card reads minigameResult.
  if (p && p.lives <= 0 && p.health <= 0 && typeof minigameResult !== 'undefined' && !minigameResult) {
    _endlessRecordBest();
    var cleared = endlessArea - 1;
    minigameResult = {
      text: 'RUN OVER', color: '#ff5a5a', winner: null,
      sub: 'Reached area ' + endlessArea + ' &bull; ' + cleared + ' cleared &bull; ' + endlessKills + ' KOs &bull; ' +
           (endlessNewBest ? 'NEW BEST!' : 'Best: ' + endlessBest),
    };
    return;
  }

  if (endlessFade > 0) {
    endlessFade--;
    if (p) p.invincible = Math.max(p.invincible, 2);
    if (endlessFade === 0) {
      _endlessRecordBest();
      _endlessNextArea();
      endlessFade = -END_FADE_F;
    }
    return;
  }
  if (endlessFade < 0) endlessFade++;

  if (endlessOpen && p && p.health > 0 && Math.abs(p.cx() - endlessTp.x) < 36 &&
      Math.abs(p.y + p.h - endlessTp.y) < 30) {
    if (++endlessTpHold >= END_TP_HOLD) {
      endlessTpHold = 0;
      endlessFade = END_FADE_F;
      if (typeof spawnParticles === 'function') spawnParticles(p.cx(), p.cy(), '#5fe8ff', 24);
    }
  } else {
    endlessTpHold = 0;
  }
}

function _endlessUpdateDrops(p) {
  var plats = currentArena && currentArena.platforms;
  for (var i = endlessDrops.length - 1; i >= 0; i--) {
    var d = endlessDrops[i];
    if (--d.life <= 0) { endlessDrops.splice(i, 1); continue; }
    if (d.vy !== 0 || !d._landed) {
      d.vy += 0.4;
      d.y += d.vy;
      for (var k = 0; plats && k < plats.length; k++) {
        var pl = plats[k];
        if (d.vy > 0 && d.y >= pl.y - 2 && d.y <= pl.y + 14 && d.x >= pl.x && d.x <= pl.x + pl.w) {
          d.y = pl.y - 10; d.vy = 0; d._landed = true; break;
        }
      }
      if (d.y > END_FLOOR_Y - 10) { d.y = END_FLOOR_Y - 10; d.vy = 0; d._landed = true; }
    }
    if (!p || p.health <= 0) continue;
    var near = Math.abs(p.cx() - d.x) < 40 && Math.abs(p.cy() - d.y) < 60;
    d._near = near;
    if (near && d.kind === 'health' && p.health < p.maxHealth) {
      p.health = Math.min(p.maxHealth, p.health + END_HEALTH_ORB);
      if (typeof spawnParticles === 'function') spawnParticles(d.x, d.y, '#44ff88', 12);
      if (typeof DamageText !== 'undefined') damageTexts.push(new DamageText(p.cx(), p.y - 30, '+' + END_HEALTH_ORB, '#44ff88'));
      endlessDrops.splice(i, 1);
    }
  }
}

// F: swap the weapon in hand for the one on the ground. The old one drops where the new one lay.
function endlessPickup() {
  var p = players[0];
  if (!endlessActive || !p || p.health <= 0) return false;
  var d = endlessDrops.find(function (q) { return q.kind === 'weapon' && q._near; });
  if (!d || !WEAPONS[d.weaponKey]) return false;
  var old = p.weaponKey;
  p.weaponKey = d.weaponKey;
  p.weapon    = WEAPONS[d.weaponKey];
  p.cooldown  = 0;
  if (old && WEAPONS[old] && old !== 'combat') {
    d.weaponKey = old; d.life = 1800; d.vy = -3; d._landed = false;
  } else {
    endlessDrops.splice(endlessDrops.indexOf(d), 1);
  }
  if (typeof DamageText !== 'undefined') damageTexts.push(new DamageText(p.cx(), p.y - 35, WEAPONS[p.weaponKey].name || p.weaponKey, '#ffd24a'));
  return true;
}

function endlessReset() {
  endlessActive  = false;
  endlessEnemies = [];
  endlessBoss    = null;
  endlessDrops   = [];
  endlessSlamFX  = [];
  endlessFade    = 0;
}

// Draw: world space, behind the platforms.
function drawEndlessBack() {
  if (!endlessActive) return;
  ctx.save();
  endlessDecor.forEach(function (D) {
    if (D.kind === 'shell') _endlessDrawShell(D);
    else if (D.kind === 'interior') _endlessDrawInterior(D);
    else if (D.kind === 'frame') _endlessDrawFrame(D);
  });
  ctx.restore();
}

// Open-front building: a back wall with windows behind each storey.
function _endlessDrawShell(B) {
  var h = END_FLOOR_Y - B.top;
  ctx.fillStyle = 'hsla(' + B.hue + ',30%,12%,0.92)';
  ctx.fillRect(B.x, B.top, B.w, h);
  ctx.strokeStyle = 'hsla(' + B.hue + ',60%,55%,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(B.x + 1, B.top + 1, B.w - 2, h - 2);
  B.wins.forEach(function (wn) {
    var wx = B.x + 18 + wn.c * 42, wy = END_FLOOR_Y - (wn.r + 1) * END_STOREY + 34;
    ctx.fillStyle = wn.lit ? 'rgba(255,214,130,0.22)' : 'rgba(120,140,220,0.08)';
    ctx.fillRect(wx, wy, 24, 40);
  });
}

// Office: drywall, a band of night windows on each floor, ceiling lights, and the outer walls.
function _endlessDrawInterior(D) {
  var w = D.x1 - D.x0, h = END_FLOOR_Y - D.top;
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  ctx.fillStyle = '#1f2233';
  ctx.fillRect(D.x0, D.top, w, h);
  for (var lv = 0; lv <= D.levels; lv++) {
    var base = END_FLOOR_Y - lv * END_STOREY;
    // Window band: dark glass with the city's lights through it.
    ctx.fillStyle = 'rgba(10,14,34,0.95)';
    ctx.fillRect(D.x0 + 20, base - 98, w - 40, 44);
    for (var x = D.x0 + 30; x < D.x1 - 30; x += 37) {
      var s = Math.sin(x * 12.9898 + lv * 78.233) * 43758.5453;
      var r = s - Math.floor(s);
      if (r < 0.55) continue;
      ctx.fillStyle = r > 0.85 ? 'rgba(255,214,130,0.55)' : 'rgba(150,180,255,0.35)';
      ctx.fillRect(x, base - 92 + (r * 20 | 0), 4, 5);
    }
    ctx.fillStyle = 'rgba(140,150,190,0.25)';
    for (var mx = D.x0 + 20; mx < D.x1 - 20; mx += 160) ctx.fillRect(mx, base - 98, 3, 44);
    // Ceiling strip lights.
    ctx.fillStyle = 'rgba(220,235,255,' + (0.35 + 0.05 * Math.sin(f * 0.05 + lv)) + ')';
    for (var lx = D.x0 + 60; lx < D.x1 - 60; lx += 220) ctx.fillRect(lx, base - END_STOREY + 14, 70, 3);
  }
  ctx.fillStyle = '#4a3d31';
  (D.desks || []).forEach(function (dk) {
    ctx.fillRect(dk.x + 6, dk.y, 5, dk.base - dk.y);
    ctx.fillRect(dk.x + 79, dk.y, 5, dk.base - dk.y);
  });
  ctx.fillStyle = '#2c3048';
  ctx.fillRect(D.x0, D.top, w, 10);
  ctx.fillRect(D.x0, D.top, 12, h - 110);   // left wall stops above the lobby door
  ctx.fillRect(D.x1 - 12, D.top, 12, h);
}

// Construction: steel columns, cross-bracing, and sometimes a tower crane over the frame.
function _endlessDrawFrame(F) {
  ctx.strokeStyle = 'rgba(216,165,72,0.55)';
  ctx.lineWidth = 6;
  var cols = [F.x + 6, F.x + F.w / 2, F.x + F.w - 6];
  cols.forEach(function (cx) { ctx.beginPath(); ctx.moveTo(cx, END_FLOOR_Y); ctx.lineTo(cx, F.top); ctx.stroke(); });
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(216,165,72,0.25)';
  for (var k = 0; k < F.levels; k++) {
    var y0 = END_FLOOR_Y - k * END_STOREY, y1 = y0 - END_STOREY;
    for (var c = 0; c < 2; c++) {
      ctx.beginPath(); ctx.moveTo(cols[c], y0); ctx.lineTo(cols[c + 1], y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cols[c + 1], y0); ctx.lineTo(cols[c], y1); ctx.stroke();
    }
  }
  if (F.crane) {
    var mx = F.x + F.w * 0.7, topY = F.top - 160;
    ctx.strokeStyle = 'rgba(230,190,70,0.6)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(mx, F.top); ctx.lineTo(mx, topY); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(mx - 260, topY); ctx.lineTo(mx + 90, topY); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mx - 180, topY); ctx.lineTo(mx - 180, topY + 120); ctx.stroke();
    ctx.fillStyle = 'rgba(230,190,70,0.6)';
    ctx.fillRect(mx - 196, topY + 120, 32, 14);
  }
}

// Draw: world space, above the platforms, behind the fighters.
function drawEndlessWorld() {
  if (!endlessActive) return;
  _endlessView = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  ctx.save();

  // Teleporter pad and column.
  var tx = endlessTp.x, ty = endlessTp.y;
  var col = endlessOpen ? '#5fe8ff' : '#ff5a5a';
  var pulse = 0.6 + 0.4 * Math.sin(f * 0.08);
  ctx.fillStyle = '#1b1f33';
  ctx.fillRect(tx - 46, ty - 10, 92, 10);
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.strokeRect(tx - 46, ty - 10, 92, 10);
  if (endlessOpen) {
    var g = ctx.createLinearGradient(0, ty - 170, 0, ty - 10);
    g.addColorStop(0, 'rgba(95,232,255,0)');
    g.addColorStop(1, 'rgba(95,232,255,' + (0.35 + 0.25 * pulse) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(tx - 36, ty - 170, 72, 160);
    if (endlessTpHold > 0) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx, ty - 90, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (endlessTpHold / END_TP_HOLD));
      ctx.stroke();
    }
  } else {
    ctx.globalAlpha = 0.5 + 0.3 * pulse;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(tx, ty - 14, 36, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = col;
  var left = endlessEnemies.filter(function (e) { return e.health > 0; }).length;
  ctx.fillText(endlessOpen ? 'TELEPORTER' : 'LOCKED: ' + left + ' LEFT', tx, ty - 182);

  // Slam telegraph: a ring on the ground that fills to the shockwave's reach.
  var b = endlessBoss;
  if (b && b.health > 0 && b._endSlamT > 0) {
    var prog = 1 - b._endSlamT / END_SLAM_WARN;
    var fy = b.y + b.h;
    ctx.strokeStyle = 'rgba(255,60,80,' + (0.35 + 0.5 * prog) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(b.cx(), fy, END_SLAM_R, 14, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,60,80,' + (0.12 + 0.18 * prog) + ')';
    ctx.beginPath(); ctx.ellipse(b.cx(), fy, END_SLAM_R * prog, 14 * prog, 0, 0, Math.PI * 2); ctx.fill();
  }
  endlessSlamFX.forEach(function (s) {
    var k = s.t / 24;
    ctx.strokeStyle = 'rgba(255,176,112,' + (1 - k) + ')';
    ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, END_SLAM_R * (0.3 + 0.7 * k), 10 + 10 * k, 0, 0, Math.PI * 2); ctx.stroke();
  });
  // Enraged glow.
  if (b && b.health > 0 && b._enraged) {
    ctx.fillStyle = 'rgba(255,40,70,' + (0.10 + 0.06 * Math.sin(f * 0.2)) + ')';
    ctx.beginPath(); ctx.ellipse(b.cx(), b.cy(), b.w * 0.9, b.h * 0.65, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Drops.
  endlessDrops.forEach(function (d) {
    var a = Math.min(1, d.life / 120);
    ctx.globalAlpha = a;
    var c = d.kind === 'health' ? '#44ff88' : '#ffd24a';
    ctx.shadowColor = c; ctx.shadowBlur = 10;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(d.x, d.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(d.x, d.y, 8, 0, Math.PI * 2); ctx.stroke();
    if (d.kind === 'health') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(d.x - 4, d.y - 1.5, 8, 3); ctx.fillRect(d.x - 1.5, d.y - 4, 3, 8);
    } else {
      var wn = (WEAPONS[d.weaponKey] && WEAPONS[d.weaponKey].name) || d.weaponKey;
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(d._near ? '[' + (typeof keyLabelFor === 'function' ? keyLabelFor('f') : 'F') + '] ' + wn : wn, d.x, d.y - 16);
    }
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

// Project a world point to GAME_W x GAME_H screen units through the transform captured in drawEndlessWorld.
function _endlessToScreen(x, y) {
  var m = _endlessView;
  if (!m) return null;
  var sx = canvas.width / GAME_W, sy = canvas.height / GAME_H;
  return { x: (m.a * x + m.c * y + m.e) / sx, y: (m.b * x + m.d * y + m.f) / sy };
}

function _endlessArrow(wx, wy, color, label) {
  var s = _endlessToScreen(wx, wy);
  if (!s) return;
  var M = 34;
  if (s.x > M && s.x < GAME_W - M && s.y > M + 40 && s.y < GAME_H - M) return;   // on screen
  var cx = GAME_W / 2, cy = GAME_H / 2;
  var ang = Math.atan2(s.y - cy, s.x - cx);
  var ax = Math.max(M, Math.min(GAME_W - M, s.x));
  var ay = Math.max(M + 40, Math.min(GAME_H - M, s.y));
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (label) {
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = color;
    ctx.fillText(label, ax - Math.cos(ang) * 24, ay - Math.sin(ang) * 24 + 4);
  }
}

// Draw: screen space, over everything.
function drawEndlessHUD() {
  if (!endlessActive || !gameRunning) return;
  ctx.save();
  ctx.setTransform(canvas.width / GAME_W, 0, 0, canvas.height / GAME_H, 0, 0);
  var p = players[0];
  var alive = endlessEnemies.filter(function (e) { return e.health > 0; });

  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Arial';
  ctx.fillStyle = '#ffdd44';
  ctx.fillText('AREA ' + endlessArea + '   •   ' + (endlessOpen ? 'Teleporter open' : 'Enemies left: ' + alive.length) +
               '   •   Best: ' + endlessBest, GAME_W / 2, GAME_H - 18);

  // Enemies already get the game's edge markers (drawEdgeIndicators). The exit needs its own.
  if (p && p.health > 0 && endlessFade === 0 && endlessOpen) _endlessArrow(endlessTp.x, endlessTp.y - 60, '#5fe8ff', 'EXIT');

  // Mini-boss bar, once it has woken.
  var b = endlessBoss;
  if (b && b.health > 0 && !b._endlessIdle) {
    var bw = 340, bx = GAME_W / 2 - bw / 2, by = 58;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = b._enraged ? '#ff2244' : '#ff6a3a';
    ctx.fillRect(bx, by, bw * Math.max(0, b.health / b.maxHealth), 8);
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#ffd0d0';
    ctx.fillText(b.name + (b._enraged ? '  •  ENRAGED' : ''), GAME_W / 2, by - 6);
  }

  if (endlessBanner > 0) {
    ctx.globalAlpha = endlessBanner > 120 ? (150 - endlessBanner) / 30 : Math.min(1, endlessBanner / 30);
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = _endlessIsBossArea(endlessArea) ? '#ff3355' : '#5fe8ff'; ctx.shadowBlur = 16;
    ctx.fillText('AREA ' + endlessArea, GAME_W / 2, GAME_H * 0.32);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#cfe9ff';
    var sub = END_TYPES[endlessType].label;
    if (endlessArea === 1) sub += '  •  Defeat every enemy to open the teleporter';
    else if (endlessBoss) sub += '  •  MINI-BOSS: ' + endlessBoss.name;
    ctx.fillText(sub, GAME_W / 2, GAME_H * 0.32 + 26);
    ctx.globalAlpha = 1;
  }

  if (endlessFade !== 0) {
    var fa = endlessFade > 0 ? 1 - endlessFade / END_FADE_F : -endlessFade / END_FADE_F;
    ctx.globalAlpha = Math.max(0, Math.min(1, fa));
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
