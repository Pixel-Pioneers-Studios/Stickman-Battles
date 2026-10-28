'use strict';
// smb-br-structures.js: Battle Royale structures. Buildings you walk into, a skyline that falls, a volcano that answers.
// Depends on: smb-globals.js, smb-combat.js, smb-particles-core.js, smb-battleroyale.js
//
// Office (The City): its floors are ordinary one-way platforms built with the map, so bots, chests and
// _brValidateReach() see a normal ledge stack. The side walls are solid (isWall) with a doorway at street level;
// the roof is walkable from the City ledges on the left and a fire escape on the right. The facade hides the
// interior, everyone in it and their name tags until the viewer walks in, then fades. Knocking someone out
// through the side, or a heavy hit inside, breaks a window.
// Skyline towers (The City): backdrop only, no collision. Heavy hits in front of one crack it; enough of them
// bring it down.
// Volcano: a mountain you can walk over. Slopes (ramp platforms, Fighter._checkRamp) climb to a rim on each
// side of an open crater: jump the crater, or drop into the pit, where the loot is. Ledges climb back out, and
// a shaft from the Volcano Depths comes up through the vent in the pit floor. The vent spits small eruptions
// into the pit; BR_VOLC_HEAT_MAX kills inside the pit set off the big one, raining bombs on the band and
// flooding the pit floor. The mountain's face hides the pit and everyone in it until the viewer is inside.
// Bomb and vent damage goes through dealDamage() with a null attacker.
// Temple (The Ruins): a portico on three pillars and a sealed vault with the best loot. The vault's stone door
// only rises while someone stands on a pressure plate (one outside under the portico, one just inside), and
// drops again a moment after: one player holds it, the other loots, and the holder can always step off. Heavy
// hits crack the pillars; a pillar that goes over crushes whoever is under it.
// Rope bridge (Frostline): the only way over a bottomless gorge. A sign on each anchor post says it holds
// BR_BRIDGE.holds and counts who is on it; one more and it snaps, dropping everyone on it. The halves hang from
// the posts until it is re-tied. A fall into the gorge is an elimination credited to whoever last hit the faller.

// Office
const BR_OFFICE = { x: 1810, w: 340, top: 510, ground: 900, floorH: 130, cols: 5 };
// Interior floors, [x0, x1, y]. Each one leaves a stairwell gap on alternating sides.
const BR_OFFICE_FLOORS = [
  [1810, 2050, 770],   // stairwell gap on the right, 2050-2110
  [1910, 2150, 640],   // stairwell gap on the left, 1850-1910
  [1810, 2150, 510],   // roof
];
// Walls are wider than a fighter's step: Fighter.checkPlatform resolves by least penetration, and a thin wall
// lets a fighter past its midpoint get pushed out the far side.
const BR_OFFICE_WALL_W = 40;
const BR_OFFICE_DOOR_H = 100;   // fighters are 84 tall
const BR_OFFICE_IN_L = BR_OFFICE.x + BR_OFFICE_WALL_W, BR_OFFICE_IN_R = BR_OFFICE.x + BR_OFFICE.w - BR_OFFICE_WALL_W;
const BR_OFFICE_LEVELS = [900, 770, 640, 510];   // street, first floor, second floor, roof
// Fire escape outside the right wall, [x0, x1, y]: the climb to the roof from the Plains side.
const BR_OFFICE_ESCAPE = [
  [2152, 2300, 770],
  [2152, 2260, 640],
];

var brOfficeWindows = [];   // { col, row, x, y, w, h, broken, lit }
var brOfficeReveal  = 0;    // 0 = facade solid, 1 = interior shown
var brGlass         = [];   // shards and chunks: { x, y, vx, vy, rot, vr, size, life, maxLife, color, kind }

// Skyline
const BR_TOWER_DEFS = [
  { x: 1140, w: 92,  h: 400, hp: 3.5 },
  { x: 1390, w: 70,  h: 330, hp: 3.0 },
  { x: 1585, w: 112, h: 450, hp: 4.0 },
];
var brTowers = [];

// Volcano
const BR_VOLC_X0 = 4300, BR_VOLC_X1 = 5600;
// The mountain: slopes from the base up to the rims, the crater between them, the pit below the crater.
const BR_VOLC = { baseL: 4420, rimL0: 4760, rimL1: 4870, rimR0: 5030, rimR1: 5140, baseR: 5480,
                  top: 560, ground: 900, pitL: 4800, pitR: 5100, ventL: 4910, ventR: 4990, wallW: 40 };
// Pit ledges against the walls, [x0, x1, y]: the climb out is floor -> left ledge -> right ledge -> right rim.
// Each drops back to its own side of the floor, never into the vent.
const BR_VOLC_LEDGES = [
  [4800, 4870, 790],
  [5030, 5100, 680],
];
const BR_VOLC_CRATER = { x: 4950, y: 560 };
const BR_VOLC_HEAT_MAX  = 10;    // kills inside the pit
const BR_VOLC_RUMBLE_F  = 150;
const BR_VOLC_ERUPT_F   = 600;
const BR_VOLC_COOL_F    = 900;
const BR_VOLC_BOMB_R    = 70;
// Small eruptions: the vent glows, then a lava column shoots up the middle of the pit.
const BR_VOLC_SPURT_GAP = [300, 480];
const BR_VOLC_SPURT_WARN = 60;
const BR_VOLC_SPURT_LEN  = 40;
const BR_VOLC_SPURT_TOP  = 640;
var brVolcHeat   = 0;
var brVolcState  = 'idle';   // 'idle' | 'rumble' | 'erupt' | 'cool'
var brVolcTimer  = 0;
var brVolcBombs  = [];       // { x, y, vx, vy, px, py }
var brVolcBanner = 0;
var brVolcSpurt  = { t: 0, phase: 'wait', hit: null };   // phase 'wait' | 'warn' | 'blow'
var brVolcReveal = 0;        // 0 = mountain face solid, 1 = pit shown
var brVolcFlood  = null;     // the lava hazard on the pit floor while it erupts

// Temple
const BR_TEMPLE = { x0: 7040, x1: 7400, ground: 900, roof: 690, vaultL: 7180, vaultR: 7400, wallW: 40, doorH: 100,
                    plateOut: [7080, 7140], plateIn: [7322, 7354], shelf: [7238, 7308, 882] };
// The inner plate is at the back wall, away from the door: someone shut in has to cross back to it, then make the
// door before it drops (about 1.7s). Next to the door it held the door open for anyone just walking out.
// The shelf is low enough that its chests break from the floor (chest contact reaches 52px above the feet).
const BR_TEMPLE_DOOR_HOLD = 100;   // frames the door stays up after the last foot leaves a plate (plate to vault is ~40)
const BR_PILLAR_DEFS = [ { x: 7056, w: 22 }, { x: 7104, w: 22 }, { x: 7152, w: 22 } ];
var brTempleDoor   = 0;      // 0 shut .. 1 open (drawn and solid from this)
var brTempleHold   = 0;      // frames left before the door starts to drop
var brTemplePlates = [false, false];
var brTempleReveal = 0;
var brPillars      = [];     // { x, w, hp, maxHp, state 'up'|'fall'|'down', t, dir, hitDone }
var _brsDoorPl     = null;   // the door's wall platform

// Rope bridge
// The gorge is Frostline's crust hole (rel 300-760). Wider than a running double jump, so the bridge is the crossing.
const BR_BRIDGE = { x0: 8000, x1: 8460, y: 900, holds: 4, killY: 1300, bandL: 7700, bandR: 8700 };
const BR_BRIDGE_SNAP_F    = 70;    // halves swinging down
const BR_BRIDGE_DOWN_F    = 840;   // hanging, before it is re-tied (~14s)
const BR_BRIDGE_TIE_F     = 60;    // halves swinging back up
var brBridge   = { state: 'up', t: 0, count: 0, sway: 0 };   // state 'up' | 'snap' | 'down' | 'tie'
var brBridgeBanner = 0;
var _brsBridgePl   = null;   // the deck platform

const BR_GLASS_MAX = 220;

function _brsFrame() { return typeof frameCount !== 'undefined' ? frameCount : 0; }

// Whoever the camera is following: the player, or who they spectate.
function _brsViewer() {
  if (typeof brSpectating !== 'undefined' && brSpectating && brSpectateTarget) return brSpectateTarget;
  return players && players[0];
}

function _brsOnScreen(x, y, pad) {
  if (typeof camXCur === 'undefined') return true;
  var zoom = (typeof camZoomCur !== 'undefined' && camZoomCur > 0) ? camZoomCur : 1;
  pad = pad || 120;
  return Math.abs(x - camXCur) < GAME_W / (2 * zoom) + pad && Math.abs(y - camYCur) < GAME_H / (2 * zoom) + pad;
}

function _brsInOffice(f) {
  if (!f || typeof f.cx !== 'function') return false;
  var x = f.cx(), y = f.cy();
  return x >= BR_OFFICE.x && x <= BR_OFFICE.x + BR_OFFICE.w && y >= BR_OFFICE.top - 10 && y <= BR_OFFICE.ground;
}

// Called by _makeBRArena() before reach validation.
function brStructurePlatforms(push) {
  var o = BR_OFFICE;
  BR_OFFICE_FLOORS.forEach(function (fl) {
    // Interior floors are one-way (jump up through them, stairwells between). The roof is solid: from inside, the
    // only way out is a door. It's still walkable from above, reached by the City ledges or the fire escape.
    var roof = fl[2] === o.top;
    push({ x: fl[0], y: fl[2], w: fl[1] - fl[0], h: 12, passUnder: !roof,
           color: '#59627a', edge: '#9aa6c4', _brBand: 'The City', _brOffice: true });
  });
  // Side walls: from under the roof down to the top of the doorway. No band, so no chests on them.
  var wy = o.top + 12, wh = (o.ground - BR_OFFICE_DOOR_H) - wy;
  [o.x, o.x + o.w - BR_OFFICE_WALL_W].forEach(function (wx) {
    push({ x: wx, y: wy, w: BR_OFFICE_WALL_W, h: wh, isWall: true, color: '#3c4f72', edge: '#5f7fb0', _brOffice: true });
  });
  BR_OFFICE_ESCAPE.forEach(function (fl) {
    push({ x: fl[0], y: fl[2], w: fl[1] - fl[0], h: 10, passUnder: true, color: '#4a5266', edge: '#8a93ad', _brBand: 'The City' });
  });

  // Volcano. All drawn by _brsDrawVolcano*, so noDraw. Slopes and rims carry no band: no chests on the outside.
  // A slope's y/h is a 1px sliver at the crust line, not its bounding box: every rect-based system (impacts,
  // AI ledge reads, Sovereign's perception) then sees only more crust. Slope-aware code reads yL/yR.
  var V = BR_VOLC;
  push({ ramp: true, x: V.baseL, w: V.rimL0 - V.baseL, yL: V.ground, yR: V.top, y: V.ground, h: 1, noDraw: true, _brVolc: true });
  push({ ramp: true, x: V.rimR1, w: V.baseR - V.rimR1, yL: V.top, yR: V.ground, y: V.ground, h: 1, noDraw: true, _brVolc: true });
  [[V.rimL0, V.rimL1], [V.rimR0, V.rimR1]].forEach(function (r) {
    push({ x: r[0], y: V.top, w: r[1] - r[0], h: 12, passUnder: true, noDraw: true, _brRampFed: true, _brVolc: true });
  });
  // The pit's side walls, under the rim lips: the pit is entered by the crater or the vent, not through the rock.
  [V.pitL - V.wallW, V.pitR].forEach(function (wx) {
    push({ x: wx, y: V.top + 12, w: V.wallW, h: V.ground - V.top - 12, isWall: true, noDraw: true, _brVolc: true });
  });
  // Temple. The portico roof is one-way (jump up onto it); the vault's roof and walls are solid, and the door is a
  // wall block that stops being solid while it is raised (isFloorDisabled, set in _brsUpdateTemple).
  var T = BR_TEMPLE;
  push({ x: T.x0, y: T.roof, w: T.vaultL - T.x0, h: 12, passUnder: true, noDraw: true, _brBand: 'The Ruins' });
  push({ x: T.vaultL, y: T.roof, w: T.vaultR - T.vaultL, h: 12, noDraw: true, _brTemple: true });
  push({ x: T.vaultL, y: T.roof + 12, w: T.wallW, h: (T.ground - T.doorH) - (T.roof + 12), isWall: true, noDraw: true, _brTemple: true });
  _brsDoorPl = push({ x: T.vaultL, y: T.ground - T.doorH, w: T.wallW, h: T.doorH, isWall: true, noDraw: true, _brTemple: true, _brDoor: true });
  push({ x: T.vaultR - T.wallW, y: T.roof + 12, w: T.wallW, h: T.ground - T.roof - 12, isWall: true, noDraw: true, _brTemple: true });
  push({ x: T.shelf[0], y: T.shelf[2], w: T.shelf[1] - T.shelf[0], h: 10, passUnder: true, noDraw: true,
         _brBand: 'The Ruins', _brLootW: 5, _brLootRarity: 1.0, _brVault: true });

  BR_VOLC_LEDGES.forEach(function (lg) {
    push({ x: lg[0], y: lg[2], w: lg[1] - lg[0], h: 12, passUnder: true, noDraw: true,
           _brBand: 'The Volcano', _brVolc: true, _brLootW: 4 });
  });
  // Rope bridge deck: level with the crust, one-way so a faller who recovers can jump back up through it.
  // No band, so no chests on it. Disabled while snapped.
  var B = BR_BRIDGE;
  _brsBridgePl = push({ x: B.x0, y: B.y, w: B.x1 - B.x0, h: 12, passUnder: true, noDraw: true, _brBridge: true });
}

// Standing height on the volcano for fall integrators that don't run platform physics (sleeping bots).
// null = not over the mountain, use the band's own floor.
function brStructureGroundY(x) {
  // The gorge: the deck while it stands, otherwise nothing (a faller never lands).
  if (x > BR_BRIDGE.x0 && x < BR_BRIDGE.x1) return brBridge.state === 'up' ? BR_BRIDGE.y : BR_DEATH_Y + 400;
  var V = BR_VOLC;
  if (x < V.baseL || x > V.baseR) return null;
  if (x < V.rimL0) return V.ground - (V.ground - V.top) * (x - V.baseL) / (V.rimL0 - V.baseL);
  if (x > V.rimR1) return V.top + (V.ground - V.top) * (x - V.rimR1) / (V.baseR - V.rimR1);
  if (x < V.rimL1 || x > V.rimR0) return V.top;
  return null;   // the crater: falls to the pit floor or down the vent
}

// Chest spots: the crust under the slopes is inside the rock.
function brStructureSpotOK(x, y) {
  var V = BR_VOLC;
  if (Math.abs(y - V.ground) > 2) return true;
  return !((x > V.baseL - 20 && x < V.pitL + 10) || (x > V.pitR - 10 && x < V.baseR + 20));
}

// The top of the shaft under the vent: the last two steps of the climb up from the Depths.
function _brsInShaft(x, y) {
  return x > BR_VOLC.ventL - 60 && x < BR_VOLC.ventR + 60 && y > BR_VOLC.ground + 6 && y < BR_VOLC.ground + 220;
}

function _brsInPit(x, y) {
  return x > BR_VOLC.pitL && x < BR_VOLC.pitR && y > BR_VOLC.top + 4 && y < BR_VOLC.ground + 6;
}

// Name tags of fighters inside stay hidden while the viewer is outside (drawEntityOverlays).
function brHiddenInStructure(f) {
  if (typeof brActive === 'undefined' || !brActive || !f || typeof f.cx !== 'function') return false;
  if (brOfficeReveal <= 0.5 && _brsInOffice(f)) return true;
  if (brTempleReveal <= 0.5 && _brsInVault(f.cx(), f.y + f.h)) return true;
  return brVolcReveal <= 0.5 && _brsInPit(f.cx(), f.y + f.h);
}

function _brsInVault(x, feet) {
  var T = BR_TEMPLE;
  return x > T.vaultL + T.wallW - 6 && x < T.vaultR - T.wallW + 6 && feet > T.roof + 20 && feet < T.ground + 6;
}

function brResetStructures() {
  brOfficeWindows = [];
  var o = BR_OFFICE, colW = o.w / o.cols;
  for (var row = 0; row < 3; row++) {
    for (var col = 0; col < o.cols; col++) {
      if (row === 0 && col === 2) continue;   // the door
      var fy = o.ground - (row + 1) * o.floorH;
      brOfficeWindows.push({ col: col, row: row, x: o.x + col * colW + 9, y: fy + 26, w: colW - 18, h: o.floorH - 50,
                             broken: 0, lit: ((col * 7 + row * 3) % 4) === 0 });
    }
  }
  brOfficeReveal = 0;
  brGlass = [];
  brTowers = BR_TOWER_DEFS.map(function (d, i) {
    return { x: d.x, w: d.w, h: d.h, hp: d.hp, maxHp: d.hp, state: 'up', t: 0, dir: i % 2 ? 1 : -1, seed: i * 97 + 13 };
  });
  brVolcHeat = 0; brVolcState = 'idle'; brVolcTimer = 0; brVolcBombs = []; brVolcBanner = 0; brVolcDeaths = [];
  brVolcSpurt = { t: 200, phase: 'wait', hit: null }; brVolcReveal = 0; brVolcFlood = null;
  brTempleDoor = 0; brTempleHold = 0; brTemplePlates = [false, false]; brTempleReveal = 0;
  brBridge = { state: 'up', t: 0, count: 0, sway: 0 }; brBridgeBanner = 0;
  if (_brsBridgePl) _brsBridgePl.isFloorDisabled = false;
  brPillars = BR_PILLAR_DEFS.map(function (d, i) { return { x: d.x, w: d.w, hp: 2.6, maxHp: 2.6, state: 'up', t: 0, dir: 1, hitDone: false, seed: i * 31 + 7 }; });
}

// Debris
function _brsShards(x, y, w, h, dir, n, color, kind) {
  for (var i = 0; i < n; i++) {
    if (brGlass.length >= BR_GLASS_MAX) brGlass.shift();
    var life = 70 + Math.floor(Math.random() * 50);
    brGlass.push({ x: x + Math.random() * w, y: y + Math.random() * h,
                   vx: dir * (1.5 + Math.random() * 6) + (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 5,
                   rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
                   size: kind === 'chunk' ? 5 + Math.random() * 9 : 3 + Math.random() * 6,
                   life: life, maxLife: life, color: color, kind: kind || 'glass' });
  }
}

function _brsShatter(win, dir) {
  if (!win || win.broken) return;
  win.broken = 1;
  _brsShards(win.x, win.y, win.w, win.h, dir, 16, '#bfeaff', 'glass');
  if (_brsOnScreen(win.x, win.y) && typeof SoundManager !== 'undefined' && SoundManager.hitSnap) SoundManager.hitSnap();
}

function _brsWindowAt(col, cy) {
  var row = Math.floor((BR_OFFICE.ground - cy) / BR_OFFICE.floorH);
  row = Math.max(0, Math.min(2, row));
  for (var i = 0; i < brOfficeWindows.length; i++) {
    var w = brOfficeWindows[i];
    if (w.col === col && w.row === row) return w;
  }
  return null;
}

// Hits: called from dealDamage() next to worldReactHit, only for hits the camera can see. Records state, triggers nothing else.
function brStructuresHit(attacker, target, dmg, kb, guarded) {
  if (typeof brActive === 'undefined' || !brActive || !attacker || !target || typeof target.cx !== 'function') return;
  if (guarded || dmg < 3) return;
  var power = dmg / 28;
  if (attacker.weapon && attacker.weapon.weaponType === 'heavy') power *= 1.25;
  if (power < 0.3) return;
  var tx = target.cx(), ty = target.cy();

  // A heavy blow inside the office takes out the nearest window on that floor.
  if (power >= 0.8 && _brsInOffice(target)) {
    var colW = BR_OFFICE.w / BR_OFFICE.cols;
    var col = Math.max(0, Math.min(BR_OFFICE.cols - 1, Math.floor((tx - BR_OFFICE.x) / colW)));
    var dir = tx >= attacker.cx() ? 1 : -1;
    var win = _brsWindowAt(col, ty) || _brsWindowAt(Math.max(0, Math.min(4, col + dir)), ty);
    _brsShatter(win, dir);
  }

  // Temple pillars: a heavy blow beside one cracks it.
  if (power >= 0.5 && ty < BR_TEMPLE.ground + 10 && ty > BR_TEMPLE.roof - 20) {
    for (var pi = 0; pi < brPillars.length; pi++) {
      var P = brPillars[pi];
      if (P.state !== 'up' || tx < P.x - 40 || tx > P.x + P.w + 40) continue;
      P.hp -= power; P.dir = tx >= attacker.cx() ? 1 : -1;
      _brsShards(P.x, BR_TEMPLE.roof + 40 + Math.random() * 120, P.w, 20, P.dir, 3, '#c8b48a', 'chunk');
      if (P.hp <= 0) _brsPillarFall(P);
    }
  }

  // Skyline towers behind the fight.
  if (ty > BR_OFFICE.ground + 40) return;   // underground hits don't reach the skyline
  for (var i = 0; i < brTowers.length; i++) {
    var T = brTowers[i];
    if (T.state !== 'up') continue;
    if (tx < T.x - 50 || tx > T.x + T.w + 50) continue;
    if (ty < BR_OFFICE.ground - T.h - 40) continue;
    T.hp -= power;
    T.dir = tx > attacker.cx() ? 1 : -1;
    _brsShards(T.x + T.w * 0.2, BR_OFFICE.ground - T.h * (0.3 + Math.random() * 0.5), T.w * 0.6, 20, T.dir, 4, '#55617a', 'chunk');
    if (T.hp <= 0) _brsTopple(T);
  }
}

// A blast at a point (Cataclysm meteors, the black hole, the Unmaking): towers in reach take power*1.6,
// office windows within reach shatter outward. State only, like brStructuresHit.
function brStructuresBlast(x, y, power) {
  if (typeof brActive === 'undefined' || !brActive) return;
  if (y > BR_OFFICE.ground + 40) return;
  var reach = 120 + power * 60;
  for (var i = 0; i < brTowers.length; i++) {
    var T = brTowers[i];
    if (T.state !== 'up' || x < T.x - reach || x > T.x + T.w + reach) continue;
    T.hp -= power * 1.6;
    T.dir = x < T.x + T.w / 2 ? 1 : -1;
    _brsShards(T.x, BR_OFFICE.ground - T.h * 0.6, T.w, 40, T.dir, 6, '#55617a', 'chunk');
    if (T.hp <= 0) _brsTopple(T);
  }
  for (var w = 0; w < brOfficeWindows.length; w++) {
    var W = brOfficeWindows[w], cx = W.x + W.w / 2, cy = W.y + W.h / 2;
    if (Math.hypot(cx - x, cy - y) < reach + 40) _brsShatter(W, cx >= x ? 1 : -1);
  }  for (var pi = 0; pi < brPillars.length; pi++) {
    var P = brPillars[pi];
    if (P.state !== 'up' || x < P.x - reach || x > P.x + P.w + reach) continue;
    P.dir = x < P.x ? 1 : -1;
    _brsPillarFall(P);
  }
}

function _brsPillarFall(P) {
  if (P.state !== 'up') return;
  P.state = 'fall'; P.t = 0; P.hitDone = false;
  var cx = P.x + P.w / 2;
  if (_brsOnScreen(cx, BR_TEMPLE.ground - 100, 300)) {
    if (typeof SoundManager !== 'undefined' && SoundManager.thud) SoundManager.thud();
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 6);
  }
}

function _brsTopple(T) {
  T.state = 'fall'; T.t = 0;
  var cx = T.x + T.w / 2;
  if (_brsOnScreen(cx, BR_OFFICE.ground - T.h / 2, 300)) {
    if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 9);
  }
}

// Update
function brUpdateStructures() {
  if (typeof brActive === 'undefined' || !brActive) return;
  var all = players.concat(minions);

  // Office: reveal for the viewer, and anyone slammed into a side wall breaks the window there.
  var viewer = _brsViewer();
  var want = _brsInOffice(viewer) ? 1 : 0;
  brOfficeReveal += (want - brOfficeReveal) * 0.14;
  var o = BR_OFFICE, wallTop = o.top + 12, wallBot = o.ground - BR_OFFICE_DOOR_H;
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (!f || f.health <= 0 || f._brSleep || f._brOnPlane) continue;
    f._brsInOffice = _brsInOffice(f);
    var pv = f._brsPrevVx || 0;
    if (Math.abs(pv) >= 8 && Math.abs(f.vx || 0) < 2 && f.y < wallBot && f.y + f.h > wallTop) {
      var L = f.x + f.w, R = f.x;
      var hitL = Math.abs(L - o.x) < 3 || Math.abs(R - BR_OFFICE_IN_L) < 3;            // left wall, either face
      var hitR = Math.abs(L - BR_OFFICE_IN_R) < 3 || Math.abs(R - (o.x + o.w)) < 3;     // right wall, either face
      if (hitL || hitR) _brsShatter(_brsWindowAt(hitL ? 0 : o.cols - 1, f.cy()), pv > 0 ? 1 : -1);
    }
    f._brsPrevVx = f.vx || 0;
  }

  // Towers coming down.
  for (var t = 0; t < brTowers.length; t++) {
    var T = brTowers[t];
    if (T.state !== 'fall') continue;
    T.t++;
    if (T.t % 4 === 0) _brsShards(T.x, BR_OFFICE.ground - 30, T.w, 20, (Math.random() < 0.5 ? -1 : 1), 2, '#8a8f9c', 'dust');
    if (T.t % 9 === 0) _brsShards(T.x, BR_OFFICE.ground - T.h + T.t * T.t * 0.035, T.w, 30, T.dir, 3, '#55617a', 'chunk');
    if (T.t >= 110) T.state = 'down';
  }

  // Debris physics. Lands on the surface crust, which is flat under the City.
  for (var g = brGlass.length - 1; g >= 0; g--) {
    var s = brGlass[g];
    s.life--;
    if (s.life <= 0) { brGlass.splice(g, 1); continue; }
    if (s.kind === 'dust') { s.x += s.vx * 0.3; s.y -= 0.6; s.size += 0.25; continue; }
    s.vy += 0.42; s.x += s.vx; s.y += s.vy; s.rot += s.vr;
    if (s.y > BR_OFFICE.ground - 2 && s.x > 0 && s.x < BR_WORLD_W) {
      s.y = BR_OFFICE.ground - 2; s.vy *= -0.28; s.vx *= 0.55; s.vr *= 0.5;
    }
  }

  _brsUpdateVolcano(all);
  _brsUpdateTemple(all);
  _brsUpdateBridge(all);
  if (brVolcBanner > 0) brVolcBanner--;
  if (brBridgeBanner > 0) brBridgeBanner--;
}

// Volcano
function _brsInVolcano(x) { return x >= BR_VOLC_X0 && x <= BR_VOLC_X1; }

// Called from _brCreditElimination() (inside dealDamage) on every contender death: records only.
// Kills inside the pit feed the big eruption.
var brVolcDeaths = [];   // { x, y }
function brStructuresNoteDeath(f) {
  if (!f || typeof f.cx !== 'function') return;
  if (!_brsInPit(f.cx(), f.y + f.h)) return;
  brVolcDeaths.push({ x: f.cx(), y: f.cy() });
}

function _brsUpdateVolcano(all) {
  // Reveal the pit for a viewer inside it.
  // Reveal the pit for a viewer inside it, or climbing the shaft up to it (they need to see where they're going).
  var vw = _brsViewer();
  var inPit = vw && typeof vw.cx === 'function' && (_brsInPit(vw.cx(), vw.y + vw.h) || _brsInShaft(vw.cx(), vw.y + vw.h));
  brVolcReveal += ((inPit ? 1 : 0) - brVolcReveal) * 0.14;

  // Heat: pit kills. Only while idle, so one eruption can't chain into the next.
  while (brVolcDeaths.length) {
    var d = brVolcDeaths.shift();
    if (brVolcState !== 'idle') continue;
    brVolcHeat++;
    if (_brsOnScreen(d.x, d.y)) {
      if (typeof spawnParticles === 'function') spawnParticles(d.x, d.y, '#ff5a1a', 18);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 4);
    }
    if (brVolcHeat >= BR_VOLC_HEAT_MAX) { brVolcState = 'rumble'; brVolcTimer = BR_VOLC_RUMBLE_F; brVolcBanner = 210; }
  }

  var v = _brsViewer();
  var near = v && typeof v.cx === 'function' && Math.abs(v.cx() - BR_VOLC_CRATER.x) < 1600;

  if (brVolcState === 'rumble') {
    if (near && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 2.5);
    if (--brVolcTimer <= 0) {
      brVolcState = 'erupt'; brVolcTimer = BR_VOLC_ERUPT_F;
      if (near && typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
      if (near && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
    }
  } else if (brVolcState === 'erupt') {
    var age = BR_VOLC_ERUPT_F - brVolcTimer;
    if (age % 7 === 0) {
      brVolcBombs.push({ x: BR_VOLC_CRATER.x + (Math.random() - 0.5) * 60, y: BR_VOLC_CRATER.y,
                         vx: (Math.random() - 0.5) * 17, vy: -17 - Math.random() * 9, px: 0, py: 0 });
    }
    if (near && age % 3 === 0 && typeof spawnParticles === 'function') spawnParticles(BR_VOLC_CRATER.x, BR_VOLC_CRATER.y, '#ff8a2a', 3);
    _brsFlood(Math.min(1, age / 60));
    if (--brVolcTimer <= 0) { brVolcState = 'cool'; brVolcTimer = BR_VOLC_COOL_F; }
  } else if (brVolcState === 'cool') {
    _brsFlood(Math.max(0, brVolcTimer - (BR_VOLC_COOL_F - 90)) / 90);
    if (--brVolcTimer <= 0) { brVolcState = 'idle'; brVolcHeat = 0; }
  }

  _brsUpdateSpurt(all, near);
  _brsUpdateBombs(all);
}

// The big eruption floods the pit floor with lava (an ordinary BR lava hazard, so the usual burn and bounce).
// k 0..1 is how far it has risen; at 0 the hazard is removed.
function _brsFlood(k) {
  if (typeof brHazards === 'undefined') return;
  var V = BR_VOLC;
  if (k <= 0) {
    if (brVolcFlood) { var i = brHazards.indexOf(brVolcFlood); if (i >= 0) brHazards.splice(i, 1); brVolcFlood = null; }
    return;
  }
  if (!brVolcFlood) { brVolcFlood = { x: V.pitL, y: V.ground - 16, w: V.pitR - V.pitL, h: 34, type: 'lava', _brVolcFlood: true }; brHazards.push(brVolcFlood); }
  var depth = 4 + 30 * k;
  brVolcFlood.y = V.ground - depth; brVolcFlood.h = depth + 18;
}

// Small eruptions inside the pit: the vent glows for a second, then a lava column shoots up through the middle.
// Anyone in the column takes one hit and is thrown up and out to the side.
function _brsUpdateSpurt(all, near) {
  var S = brVolcSpurt, V = BR_VOLC;
  if (--S.t > 0) return;
  if (S.phase === 'wait') { S.phase = 'warn'; S.t = BR_VOLC_SPURT_WARN; return; }
  if (S.phase === 'warn') {
    S.phase = 'blow'; S.t = BR_VOLC_SPURT_LEN; S.hit = [];
    if (near && _brsOnScreen(BR_VOLC_CRATER.x, 800, 200)) {
      if (typeof SoundManager !== 'undefined' && SoundManager.thud) SoundManager.thud();
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 5);
    }
    return;
  }
  // phase 'blow' ended
  S.phase = 'wait'; S.hit = null;
  S.t = BR_VOLC_SPURT_GAP[0] + Math.floor(Math.random() * (BR_VOLC_SPURT_GAP[1] - BR_VOLC_SPURT_GAP[0]));
}

function _brsSpurtTick(all) {
  var S = brVolcSpurt, V = BR_VOLC;
  if (S.phase !== 'blow' || !S.hit) return;
  var top = V.ground - (V.ground - BR_VOLC_SPURT_TOP) * Math.min(1, (BR_VOLC_SPURT_LEN - S.t) / 8);
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (!f || f.health <= 0 || f._brSleep || f._brOnPlane || typeof f.cx !== 'function') continue;
    if (S.hit.indexOf(f) >= 0) continue;
    var x = f.cx();
    // Only above the pit floor: someone climbing the shaft below is never hit by the column they're climbing into.
    if (x < V.ventL - 6 || x > V.ventR + 6 || f.y + f.h < top || f.y + f.h > V.ground + 6) continue;
    S.hit.push(f);
    if (typeof dealDamage === 'function') dealDamage(null, f, 10, 0);
    f.vx = (x < BR_VOLC_CRATER.x ? -1 : 1) * 6;
    f.vy = Math.min(f.vy || 0, -15);
    if (typeof spawnParticles === 'function') spawnParticles(x, f.cy(), '#ff7722', 10);
  }
}

function _brsUpdateBombs(all) {
  _brsSpurtTick(all);
  if (!brVolcBombs.length) return;
  var pls = (currentArena && currentArena.platforms) || [];
  for (var b = brVolcBombs.length - 1; b >= 0; b--) {
    var B = brVolcBombs[b];
    B.px = B.x; B.py = B.y;
    B.vy += 0.45; B.x += B.vx; B.y += B.vy;
    if (B.y > BR_WORLD_H) { brVolcBombs.splice(b, 1); continue; }
    if (B.vy <= 0) continue;
    var hit = null, hy = 0;
    for (var p = 0; p < pls.length; p++) {
      var pl = pls[p];
      if (pl.isFloorDisabled || pl.isWall || B.x < pl.x || B.x > pl.x + pl.w) continue;
      var top = pl.ramp ? pl.yL + (pl.yR - pl.yL) * ((B.x - pl.x) / pl.w) : pl.y;
      if (B.py <= top && B.y >= top) { hit = pl; hy = top; break; }
    }
    if (!hit) continue;
    brVolcBombs.splice(b, 1);
    _brsBombBlast(B.x, hy, hit.ramp ? null : hit, all);
  }
}

function _brsBombBlast(x, y, pl, all) {
  var seen = _brsOnScreen(x, y, 200);
  if (seen) {
    if (typeof spawnParticles === 'function') { spawnParticles(x, y - 6, '#ff7722', 12); spawnParticles(x, y - 6, '#ffd27a', 6); }
    if (typeof spawnImpact === 'function' && pl && !pl.noDraw) spawnImpact(x, y, 0.9, { pl: pl, shake: 0 });
    if (typeof SoundManager !== 'undefined' && SoundManager.thud) SoundManager.thud();
  }
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (!f || f.health <= 0 || f._brSleep || f._brOnPlane || typeof f.cx !== 'function') continue;
    var dx = f.cx() - x, dy = f.cy() - (y - 20);
    if (dx * dx + dy * dy > BR_VOLC_BOMB_R * BR_VOLC_BOMB_R) continue;
    // Knockback is set here: with a null attacker dealDamage always pushes to the right.
    if (typeof dealDamage === 'function') dealDamage(null, f, 12, 0);
    f.vx = (dx >= 0 ? 1 : -1) * 8;
    f.vy = Math.min(f.vy || 0, -9);
  }
}

// Drawing
// Behind the platforms: skyline towers, the volcano cone, the office interior.
function drawBRStructuresBack() {
  if (typeof brActive === 'undefined' || !brActive) return;
  ctx.save();
  _brsDrawVolcano();
  _brsDrawTemple();
  _brsDrawBridge();
  for (var i = 0; i < brTowers.length; i++) _brsDrawTower(brTowers[i]);
  _brsDrawOfficeInterior();
  ctx.restore();
}

function _brsDrawTower(T) {
  var G = BR_OFFICE.ground;
  if (!_brsOnScreen(T.x + T.w / 2, G - T.h / 2, T.h)) return;
  if (T.state === 'down') {
    // Rubble with a thin smoke column.
    ctx.fillStyle = '#2a3242';
    ctx.beginPath(); ctx.moveTo(T.x - 20, G);
    for (var k = 0; k <= 8; k++) ctx.lineTo(T.x - 20 + (T.w + 40) * k / 8, G - 18 - ((k * 37 + T.seed) % 29));
    ctx.lineTo(T.x + T.w + 20, G); ctx.closePath(); ctx.fill();
    var a = 0.10 + 0.05 * Math.sin(_brsFrame() * 0.05 + T.seed);
    ctx.fillStyle = 'rgba(150,150,160,' + a.toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(T.x + T.w / 2, G - 90, 26, 80, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  var sink = T.state === 'fall' ? T.t * T.t * 0.035 : 0;
  var tilt = T.state === 'fall' ? T.dir * Math.min(0.5, T.t * 0.0045) : 0;
  ctx.save();
  ctx.beginPath(); ctx.rect(T.x - T.h, G - T.h - 200, T.w + T.h * 2, T.h + 200); ctx.clip();   // never below the crust
  ctx.translate(T.x + T.w / 2, G + sink);
  ctx.rotate(tilt);
  var x0 = -T.w / 2, y0 = -T.h;
  ctx.fillStyle = '#1e2a3e';
  ctx.fillRect(x0, y0, T.w, T.h);
  ctx.strokeStyle = 'rgba(120,170,230,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, T.w, T.h);
  ctx.fillStyle = '#1e2a3e'; ctx.fillRect(-3, y0 - 34, 6, 34);   // antenna
  ctx.fillStyle = (_brsFrame() >> 5) % 2 ? '#ff4040' : '#5a1a1a'; ctx.fillRect(-3, y0 - 38, 6, 5);
  for (var wy = y0 + 14; wy < -16; wy += 22) {
    for (var wx = x0 + 9; wx < -x0 - 12; wx += 17) {
      var lit = ((Math.floor(wx) * 13 + Math.floor(wy) * 7 + T.seed) % 5) === 0;
      ctx.fillStyle = lit ? 'rgba(255,214,130,0.85)' : 'rgba(80,120,170,0.35)';
      ctx.fillRect(wx, wy, 8, 11);
    }
  }
  // Cracks grow as it takes damage.
  var dmg = 1 - Math.max(0, T.hp) / T.maxHp;
  var n = T.state === 'fall' ? 7 : Math.floor(dmg * 7);
  ctx.strokeStyle = 'rgba(10,12,18,0.95)'; ctx.lineWidth = 2;
  for (var c = 0; c < n; c++) {
    var sx = x0 + ((c * 53 + T.seed) % T.w), sy = y0 + ((c * 131 + T.seed * 3) % (T.h - 40)) + 20;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + ((c % 2) ? 14 : -12), sy + 18);
    ctx.lineTo(sx + ((c % 2) ? 6 : -20), sy + 36);
    ctx.stroke();
  }
  ctx.restore();
}

function _brsDrawOfficeInterior() {
  var o = BR_OFFICE;
  if (!_brsOnScreen(o.x + o.w / 2, (o.top + o.ground) / 2, 400)) return;
  ctx.fillStyle = '#161d2b';
  ctx.fillRect(o.x, o.top, o.w, o.ground - o.top);
  for (var row = 0; row < 3; row++) {
    var fy = o.ground - row * o.floorH;   // floor line of this storey
    // Ceiling lights.
    for (var lx = o.x + 30; lx < o.x + o.w - 20; lx += 80) {
      ctx.fillStyle = 'rgba(220,240,255,0.85)'; ctx.fillRect(lx, fy - o.floorH + 14, 34, 4);
      ctx.fillStyle = 'rgba(200,230,255,0.06)';
      ctx.beginPath(); ctx.moveTo(lx, fy - o.floorH + 18); ctx.lineTo(lx + 34, fy - o.floorH + 18);
      ctx.lineTo(lx + 60, fy); ctx.lineTo(lx - 26, fy); ctx.closePath(); ctx.fill();
    }
    // Desks with monitors, a plant, a water cooler.
    for (var d = 0; d < 3; d++) {
      var dx = o.x + 40 + d * 100 + (row % 2) * 30;
      if (dx + 50 > o.x + o.w - 10) continue;
      ctx.fillStyle = '#3a3f52'; ctx.fillRect(dx, fy - 26, 50, 5);
      ctx.fillRect(dx + 4, fy - 21, 4, 21); ctx.fillRect(dx + 42, fy - 21, 4, 21);
      ctx.fillStyle = '#0d1018'; ctx.fillRect(dx + 14, fy - 46, 24, 18);
      ctx.fillStyle = 'rgba(120,210,255,0.75)'; ctx.fillRect(dx + 16, fy - 44, 20, 13);
    }
    ctx.fillStyle = '#2e6a3a';
    ctx.beginPath(); ctx.ellipse(o.x + o.w - 26, fy - 34, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(o.x + o.w - 32, fy - 20, 12, 20);
  }
  ctx.fillStyle = 'rgba(160,210,255,0.5)';
  ctx.fillRect(o.x + o.w - 70, o.ground - 46, 12, 30);   // water cooler
}

// Behind the fighters: the pit's interior (cavern wall, vent glow, ledges, the vent's column).
function _brsDrawVolcano() {
  var V = BR_VOLC, G = V.ground, fc = _brsFrame();
  if (!_brsOnScreen(BR_VOLC_CRATER.x, 730, 700)) return;
  var heat = brVolcState === 'idle' ? brVolcHeat / BR_VOLC_HEAT_MAX : 1;
  // Cavern: dark rock lit from below by the vent.
  var x0 = V.pitL - V.wallW, x1 = V.pitR + V.wallW;
  var g = ctx.createLinearGradient(0, V.top, 0, G);
  g.addColorStop(0, '#1a0c09'); g.addColorStop(1, '#3a160c');
  ctx.fillStyle = g; ctx.fillRect(x0, V.top, x1 - x0, G - V.top);
  var S = brVolcSpurt;
  var warn = S.phase === 'warn' ? 1 - S.t / BR_VOLC_SPURT_WARN : 0;
  var vg = ctx.createRadialGradient(BR_VOLC_CRATER.x, G, 6, BR_VOLC_CRATER.x, G, 170 + warn * 60 + heat * 40);
  vg.addColorStop(0, 'rgba(255,150,50,' + (0.45 + warn * 0.4 + heat * 0.2).toFixed(3) + ')');
  vg.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = vg; ctx.fillRect(x0, V.top, x1 - x0, G - V.top);
  // Strata on the back wall.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (var y = V.top + 40; y < G; y += 46) {
    ctx.beginPath(); ctx.moveTo(x0, y);
    for (var x = x0; x <= x1; x += 38) ctx.lineTo(x, y + ((x * 7 + y) % 13) - 6);
    ctx.stroke();
  }
  // Side walls of the pit.
  ctx.fillStyle = '#2a120c';
  ctx.fillRect(V.pitL - V.wallW, V.top, V.wallW, G - V.top);
  ctx.fillRect(V.pitR, V.top, V.wallW, G - V.top);
  // Ledges: basalt shelves.
  BR_VOLC_LEDGES.forEach(function (lg) {
    ctx.fillStyle = '#4a2a22'; ctx.fillRect(lg[0], lg[2], lg[1] - lg[0], 12);
    ctx.fillStyle = '#9a4a28'; ctx.fillRect(lg[0], lg[2], lg[1] - lg[0], 3);
  });
  // The vent mouth.
  ctx.fillStyle = 'rgba(255,120,40,' + (0.5 + warn * 0.5).toFixed(3) + ')';
  ctx.fillRect(V.ventL, G - 3, V.ventR - V.ventL, 5);
  if (S.phase === 'warn' && fc % 4 === 0 && typeof spawnParticles === 'function' && brVolcReveal > 0.3) {
    spawnParticles(V.ventL + Math.random() * (V.ventR - V.ventL), G - 4, '#ff8a2a', 2);
  }
  _brsDrawSpurt();
}

// The vent's lava column.
function _brsDrawSpurt() {
  var S = brVolcSpurt, V = BR_VOLC, G = V.ground;
  if (S.phase !== 'blow') return;
  var age = BR_VOLC_SPURT_LEN - S.t;
  var top = G - (G - BR_VOLC_SPURT_TOP) * Math.min(1, age / 8);
  var fade = S.t < 10 ? S.t / 10 : 1;
  var w = V.ventR - V.ventL, fc = _brsFrame();
  var g = ctx.createLinearGradient(0, top, 0, G);
  g.addColorStop(0, 'rgba(255,230,120,' + (0.9 * fade).toFixed(3) + ')');
  g.addColorStop(0.4, 'rgba(255,130,30,' + (0.95 * fade).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(160,30,0,' + (0.9 * fade).toFixed(3) + ')');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(V.ventL, G);
  for (var k = 0; k <= 6; k++) ctx.lineTo(V.ventL + w * 0.12 + (k / 6) * w * 0.1 + Math.sin(fc * 0.4 + k) * 4, G - (G - top) * (k / 6));
  ctx.quadraticCurveTo(V.ventL + w / 2, top - 30, V.ventR - w * 0.22, top);
  for (var j = 6; j >= 0; j--) ctx.lineTo(V.ventR - w * 0.12 - (j / 6) * w * 0.1 + Math.sin(fc * 0.37 + j) * 4, G - (G - top) * (j / 6));
  ctx.lineTo(V.ventR, G);
  ctx.closePath(); ctx.fill();
  if (fc % 2 === 0 && typeof spawnParticles === 'function' && brVolcReveal > 0.3) {
    spawnParticles(V.ventL + Math.random() * w, top + Math.random() * 30, '#ffb040', 2);
  }
}

// In front of the fighters: the mountain. The flanks are solid rock (no one is ever inside them); the face over
// the pit fades out while the viewer is in the pit, like the office facade.
function _brsDrawVolcanoFront() {
  var V = BR_VOLC, G = V.ground, T = V.top, fc = _brsFrame();
  if (!_brsOnScreen(BR_VOLC_CRATER.x, 730, 700)) return;
  var heat = brVolcState === 'idle' ? brVolcHeat / BR_VOLC_HEAT_MAX : 1;
  var body = ctx.createLinearGradient(0, T, 0, G);
  body.addColorStop(0, '#5a3226'); body.addColorStop(1, '#24120d');
  // Flanks: base -> slope -> under the rim -> straight down the pit wall.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(V.baseL, G); ctx.lineTo(V.rimL0, T); ctx.lineTo(V.rimL1, T); ctx.lineTo(V.pitL, T + 40); ctx.lineTo(V.pitL, G);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(V.baseR, G); ctx.lineTo(V.rimR1, T); ctx.lineTo(V.rimR0, T); ctx.lineTo(V.pitR, T + 40); ctx.lineTo(V.pitR, G);
  ctx.closePath(); ctx.fill();
  // The face over the pit.
  var a = 1 - brVolcReveal;
  if (a > 0.02) {
    ctx.globalAlpha = a;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(V.pitL - 1, G); ctx.lineTo(V.pitL - 1, T + 40); ctx.lineTo(V.rimL1, T);
    ctx.quadraticCurveTo(BR_VOLC_CRATER.x, T + 46, V.rimR0, T);
    ctx.lineTo(V.pitR + 1, T + 40); ctx.lineTo(V.pitR + 1, G);
    ctx.closePath(); ctx.fill();
    // The crater mouth: a dark bowl, glowing with heat.
    var cg = ctx.createRadialGradient(BR_VOLC_CRATER.x, T + 6, 4, BR_VOLC_CRATER.x, T + 6, 110);
    cg.addColorStop(0, 'rgba(255,' + Math.round(120 + heat * 80) + ',40,' + (0.35 + heat * 0.5).toFixed(3) + ')');
    cg.addColorStop(1, 'rgba(40,10,5,0)');
    ctx.fillStyle = '#140705';
    ctx.beginPath(); ctx.moveTo(V.rimL1, T); ctx.quadraticCurveTo(BR_VOLC_CRATER.x, T + 46, V.rimR0, T); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.moveTo(V.rimL1, T); ctx.quadraticCurveTo(BR_VOLC_CRATER.x, T + 46, V.rimR0, T); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Revealed: the cut edges of the face.
    ctx.strokeStyle = 'rgba(255,140,80,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(V.pitL, T + 40); ctx.lineTo(V.pitL, G); ctx.moveTo(V.pitR, T + 40); ctx.lineTo(V.pitR, G); ctx.stroke();
  }
  // Lava veins down the flanks: brighter with heat, pulsing while it rumbles.
  var va = 0.12 + heat * 0.55 + (brVolcState === 'rumble' ? 0.25 * Math.sin(fc * 0.5) : 0);
  ctx.strokeStyle = 'rgba(255,120,40,' + Math.max(0, Math.min(1, va)).toFixed(3) + ')';
  ctx.lineWidth = 1.5 + heat * 2; ctx.lineJoin = 'round';
  [[V.rimL0 + 20, -1], [V.rimL0 + 60, -1], [V.rimR1 - 20, 1], [V.rimR1 - 60, 1]].forEach(function (s0, vi) {
    var x = s0[0], y = T + 14, side = s0[1];
    ctx.beginPath(); ctx.moveTo(x, y);
    for (var seg = 1; seg <= 6; seg++) {
      x += side * (22 + ((seg * 37 + vi * 11) % 17)); y += 40 + ((seg * 23 + vi * 7) % 19);
      if (y > G - 8) break;
      ctx.lineTo(x + ((seg % 2) ? 5 : -5), y);
    }
    ctx.stroke();
  });
  // Slope surfaces and rim lips: the walkable edge, like a platform's top.
  ctx.strokeStyle = '#9a4a28'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(V.baseL, G); ctx.lineTo(V.rimL0, T); ctx.lineTo(V.rimL1, T);
  ctx.moveTo(V.rimR0, T); ctx.lineTo(V.rimR1, T); ctx.lineTo(V.baseR, G); ctx.stroke();
  // While erupting, lava pours down both slopes.
  if (brVolcState === 'erupt' || (brVolcState === 'cool' && brVolcTimer > BR_VOLC_COOL_F - 90)) {
    // A thick, glowing flow down each slope, its head creeping to the foot over two seconds. (Cooling fades it.)
    var age = BR_VOLC_ERUPT_F - brVolcTimer, run = brVolcState === 'erupt' ? Math.min(1, age / 120) : 1;
    var fadeA = brVolcState === 'cool' ? (brVolcTimer - (BR_VOLC_COOL_F - 90)) / 90 : 1;
    [[V.rimL0, V.baseL], [V.rimR1, V.baseR]].forEach(function (sl) {
      var x0 = sl[0], x1 = x0 + (sl[1] - x0) * run, y1 = T + (G - T) * run;
      ctx.save(); ctx.lineCap = 'round';
      ctx.globalAlpha = 0.35 * fadeA; ctx.strokeStyle = '#ff6a10'; ctx.lineWidth = 30;
      ctx.beginPath(); ctx.moveTo(x0, T + 6); ctx.lineTo(x1, y1 + 4); ctx.stroke();
      ctx.globalAlpha = 0.95 * fadeA; ctx.strokeStyle = '#ff8a1a'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(x0, T + 5); ctx.lineTo(x1, y1 + 3); ctx.stroke();
      ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x0, T + 3); ctx.lineTo(x1, y1 + 1); ctx.stroke();
      ctx.restore();
    });
  }
  // Ash column over the crater while it erupts.
  if (brVolcState === 'erupt') {
    for (var p = 0; p < 5; p++) {
      var py = T - 40 - p * 55 - ((fc * 2) % 55);
      ctx.fillStyle = 'rgba(60,40,36,' + (0.45 - p * 0.07).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(BR_VOLC_CRATER.x + Math.sin(fc * 0.03 + p) * 12, py, 34 + p * 14, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// After the fighters: the office facade (hides the interior and anyone inside), glass, bombs, the heat gauge.
function drawBRStructuresFront() {
  if (typeof brActive === 'undefined' || !brActive) return;
  ctx.save();
  _brsDrawFacade();
  _brsDrawVolcanoFront();
  _brsDrawTempleFront();
  _brsDrawBridgeFront();
  _brsDrawBombs();
  _brsDrawGlass();
  _brsDrawHeatGauge();
  ctx.restore();
}

function _brsDrawFacade() {
  var o = BR_OFFICE;
  if (!_brsOnScreen(o.x + o.w / 2, (o.top + o.ground) / 2, 400)) return;
  var a = 1 - brOfficeReveal;
  if (a > 0.02) {
    ctx.globalAlpha = a;
    ctx.fillStyle = '#2b3a55';
    ctx.fillRect(o.x, o.top, o.w, o.ground - o.top);
    // Floor bands.
    ctx.fillStyle = '#3c4f72';
    for (var r = 1; r < 3; r++) ctx.fillRect(o.x, o.ground - r * o.floorH - 6, o.w, 10);
    for (var i = 0; i < brOfficeWindows.length; i++) {
      var w = brOfficeWindows[i];
      if (w.broken) {
        ctx.fillStyle = '#0c1220'; ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = 'rgba(190,234,255,0.7)';
        ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + w.w * 0.35, w.y); ctx.lineTo(w.x, w.y + w.h * 0.3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(w.x + w.w, w.y + w.h); ctx.lineTo(w.x + w.w * 0.6, w.y + w.h); ctx.lineTo(w.x + w.w, w.y + w.h * 0.55); ctx.fill();
        continue;
      }
      var g = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
      if (w.lit) { g.addColorStop(0, '#ffe2a0'); g.addColorStop(1, '#d9933a'); }
      else       { g.addColorStop(0, '#8fdcff'); g.addColorStop(1, '#2a5a8a'); }
      ctx.fillStyle = g; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.moveTo(w.x + 4, w.y + w.h - 4); ctx.lineTo(w.x + w.w * 0.45, w.y + 4); ctx.lineTo(w.x + w.w * 0.6, w.y + 4); ctx.lineTo(w.x + 12, w.y + w.h - 4); ctx.fill();
    }
    // Doorways in the side walls, at street level.
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(o.x, o.ground - BR_OFFICE_DOOR_H, BR_OFFICE_WALL_W, BR_OFFICE_DOOR_H);
    ctx.fillRect(o.x + o.w - BR_OFFICE_WALL_W, o.ground - BR_OFFICE_DOOR_H, BR_OFFICE_WALL_W, BR_OFFICE_DOOR_H);
    ctx.fillStyle = '#3ddc84';
    ctx.fillRect(o.x + 8, o.ground - BR_OFFICE_DOOR_H - 8, BR_OFFICE_WALL_W - 16, 5);
    ctx.fillRect(o.x + o.w - BR_OFFICE_WALL_W + 8, o.ground - BR_OFFICE_DOOR_H - 8, BR_OFFICE_WALL_W - 16, 5);
    // Front door.
    var colW = o.w / o.cols, dx = o.x + 2 * colW + 8;
    ctx.fillStyle = '#10161f'; ctx.fillRect(dx, o.ground - 84, colW - 16, 84);
    ctx.fillStyle = 'rgba(143,220,255,0.55)';
    ctx.fillRect(dx + 4, o.ground - 80, (colW - 24) / 2, 80); ctx.fillRect(dx + 8 + (colW - 24) / 2, o.ground - 80, (colW - 24) / 2, 80);
    ctx.fillStyle = '#ffd27a'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText('OFFICES', o.x + o.w / 2, o.ground - 96);
    ctx.globalAlpha = 1;
  }
  // The outline stays when revealed, so the walls still read.
  ctx.strokeStyle = 'rgba(140,180,240,' + (0.35 + 0.5 * a).toFixed(3) + ')';
  ctx.lineWidth = 3;
  ctx.strokeRect(o.x, o.top, o.w, o.ground - o.top);
  ctx.fillStyle = '#3c4f72'; ctx.fillRect(o.x - 6, o.top - 8, o.w + 12, 8);   // parapet
}

function _brsDrawGlass() {
  for (var i = 0; i < brGlass.length; i++) {
    var s = brGlass[i];
    var a = Math.min(1, s.life / 30);
    if (s.kind === 'dust') {
      ctx.fillStyle = 'rgba(140,140,150,' + (a * 0.28).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.color;
    if (s.kind === 'glass') {
      ctx.beginPath(); ctx.moveTo(-s.size / 2, s.size / 2); ctx.lineTo(0, -s.size / 2); ctx.lineTo(s.size / 2, s.size / 3); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 0.7);
    }
    ctx.restore();
  }
}

function _brsDrawBombs() {
  for (var i = 0; i < brVolcBombs.length; i++) {
    var B = brVolcBombs[i];
    if (!_brsOnScreen(B.x, B.y, 100)) continue;
    var tr = ctx.createLinearGradient(B.x - B.vx * 4, B.y - B.vy * 4, B.x, B.y);
    tr.addColorStop(0, 'rgba(255,120,30,0)'); tr.addColorStop(1, 'rgba(255,170,60,0.75)');
    ctx.strokeStyle = tr; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(B.x - B.vx * 4, B.y - B.vy * 4); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,140,40,0.35)';
    ctx.beginPath(); ctx.arc(B.x, B.y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a1a10';
    ctx.beginPath(); ctx.arc(B.x, B.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 3; ctx.stroke();
  }
}

// Over the crater: one ember per pit kill toward the eruption.
function _brsDrawHeatGauge() {
  var cx = BR_VOLC_CRATER.x, y = BR_VOLC.top - 70;
  if (!_brsOnScreen(cx, y, 200)) return;
  ctx.textAlign = 'center';
  if (brVolcState !== 'idle') {
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = brVolcState === 'cool' ? 'rgba(255,170,90,0.35)' : 'rgba(255,90,30,0.85)';
    ctx.fillText(brVolcState === 'cool' ? 'COOLING' : 'ERUPTING', cx, y + 5);
    return;
  }
  for (var i = 0; i < BR_VOLC_HEAT_MAX; i++) {
    var x = cx + (i - (BR_VOLC_HEAT_MAX - 1) / 2) * 18, on = i < brVolcHeat;
    ctx.fillStyle = on ? '#ff6a1a' : 'rgba(255,140,60,0.18)';
    ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
  }
  ctx.font = 'bold 11px Arial'; ctx.fillStyle = 'rgba(255,150,90,0.45)';
  ctx.fillText('KILLS IN THE PIT FEED IT', cx, y + 22);
}

// Screen space, from drawBattleRoyaleHUD.
function drawBRStructuresHUD() {
  if (brBridgeBanner > 0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, brBridgeBanner / 30, (150 - brBridgeBanner) / 10));
    ctx.textAlign = 'center'; ctx.font = 'bold 26px Arial';
    ctx.fillStyle = '#bfefff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.fillText('THE BRIDGE SNAPPED', GAME_W / 2, GAME_H * 0.3);
    ctx.restore();
  }
  if (brVolcBanner <= 0) return;
  var a = Math.min(1, brVolcBanner / 30, (210 - brVolcBanner) / 12);
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = '#ff6a1a'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
  ctx.fillText('THE VOLCANO IS ERUPTING', GAME_W / 2, GAME_H * 0.3);
  ctx.restore();
}

// Bot routes through the office
// The platform graph links ledges by simulated arcs, so it can't see a doorway in a wall or the stairwell
// inside. pfGetNextWaypoint() asks here first in Battle Royale. Fighters inside climb by jumping up through
// the one-way floors, steering in the air to a landing spot on the floor they want, and go
// down through the stairwell gaps. Waypoints carry brs: true, so _brNavStep doesn't add its usual double jump.
// Outside the building this returns null and the graph routes as usual.
function _brsLevelAt(y) {
  for (var k = BR_OFFICE_LEVELS.length - 1; k >= 0; k--) if (BR_OFFICE_LEVELS[k] >= y - 6) return k;
  return 0;
}

// Inside the building, below the roof. The roof is solid, so standing on it is outside.
function _brsOfficeHas(x, y) {
  return x >= BR_OFFICE.x && x <= BR_OFFICE.x + BR_OFFICE.w && y > BR_OFFICE.top + 12 && y <= BR_OFFICE.ground + 5;
}

function brStructureWaypoint(bot, tx, ty) {
  if (typeof brActive === 'undefined' || !brActive || !bot || typeof bot.cx !== 'function') return null;
  var vw = _brsVolcanoWaypoint(bot, tx, ty);
  if (vw) return vw;
  var tw = _brsTempleWaypoint(bot, tx, ty);
  if (tw) return tw;
  var bw = _brsBridgeWaypoint(bot, tx, ty);
  if (bw) return bw;
  var o = BR_OFFICE, bx = bot.cx(), feet = bot.y + bot.h;
  var botIn = bx >= o.x && bx <= o.x + o.w && feet > o.top + 20 && feet <= o.ground + 5;
  var tIn = _brsOfficeHas(tx, ty);
  var tRoof = Math.abs(ty + 25 - o.top) < 30 && tx >= o.x - 20 && tx <= o.x + o.w + 20;
  if (!botIn && !tIn && !(tRoof && bx > o.x + o.w - 10 && bx < 2340)) return null;

  // Mid-climb: keep the launch plan until the bot lands (a hop to the roof rises above the walls), or the drift
  // changes direction in the air.
  if (!bot.onGround && bot._brsAir && bx >= o.x - 40 && bx <= o.x + o.w + 40) return bot._brsAir;
  if (bot.onGround) bot._brsAir = null;

  var lv = _brsLevelAt(feet), side = tx < o.x + o.w / 2 ? -1 : 1;
  // ty is the target's mid-body: +42 for a fighter, but a fake target (a chest, a goal point) sits ~17px lower,
  // which read as the floor below. +25 lands both on the right level (floors are 130 apart).
  var tLv = tIn ? _brsLevelAt(ty + 25) : -1;
  // Headed for the roof: leave by the right door, beside the fire escape that climbs to it.
  if (Math.abs(ty + 25 - o.top) < 30 && tx >= o.x - 20 && tx <= o.x + o.w + 20) side = 1;
  if (!botIn) {
    // On the roof, heading inside: off the right edge onto the fire escape, then down it like any ledge.
    if (Math.abs(feet - o.top) < 8 && bx >= o.x - 20 && bx <= o.x + o.w + 20) {
      if (!tIn) return null;   // on the roof, going elsewhere (or staying): the graph has the roof's edges
      return { x: o.x + o.w + 40, y: 640, action: 'drop', brs: true };
    }
    if (tRoof && bx > o.x + o.w - 10 && bx < 2340) {
      // Up the fire escape: street -> 770 -> 640, then a jump that stays outside the wall until the feet clear the
      // roof's edge before drifting over it (the roof is solid; rising into its side would stop the bot dead).
      if (!bot.onGround && bot._brsRoofHop) return { x: feet > o.top - 6 ? 2205 : o.x + o.w - 60, y: o.top, action: 'walk', brs: true };
      if (bot.onGround) bot._brsRoofHop = false;
      if (feet > 840) {
        if (Math.abs(bx - 2240) > 12) return { x: 2240, y: feet, action: 'walk', brs: true };
        return { x: 2250, y: 770, action: 'jump', vy: 15, brs: true };
      }
      if (feet > 700) return { x: 2215, y: 640, action: 'jump', vy: 15, brs: true };
      bot._brsRoofHop = true;
      return { x: 2205, y: o.top, action: 'jump', vy: 16, brs: true };
    }
    // Outside, heading in: through the doorway on the near side, at street level.
    var near = bx < o.x + o.w / 2 ? -1 : 1;
    if (feet >= o.ground - 8) {
      bot._brsStepX = undefined;
      return { x: near < 0 ? BR_OFFICE_IN_L + 30 : BR_OFFICE_IN_R - 30, y: o.ground, action: 'walk', brs: true };
    }
    // Up on a ledge beside it: step off the ledge's far edge (away from the building) until on the street.
    // The City ledges on the left and the fire escape on the right both stair down that way.
    var under = null, pls = currentArena && currentArena.platforms || [];
    for (var i = 0; i < pls.length; i++) {
      var pl = pls[i];
      // Any overlap with the feet counts: a bot whose centre is past a ledge's end is still standing on it.
      if (pl.isWall || pl.isFloorDisabled || bot.x >= pl.x + pl.w || bot.x + bot.w <= pl.x || Math.abs(feet - pl.y) > 8) continue;
      under = pl; break;
    }
    // In the air (stepped off, or _brNavStep's unstick hop): keep steering to the same step-off point, never past it.
    if (!under) return { x: bot._brsStepX !== undefined ? bot._brsStepX : bx + near * 40, y: o.ground, action: 'drop', brs: true };
    var clear = bot.w / 2 + 22;   // the whole body past the edge, beyond _brNavStep's 14px slow-down
    bot._brsStepX = near < 0 ? under.x - clear : under.x + under.w + clear;
    return { x: bot._brsStepX, y: o.ground, action: 'drop', brs: true };
  }

  // Inside. Where to?
  if (!tIn) tLv = 0;
  if (tLv === lv) {
    if (tIn || lv !== 0) return { x: tx, y: BR_OFFICE_LEVELS[lv], action: 'walk', brs: true };
    return { x: side < 0 ? o.x - 40 : o.x + o.w + 40, y: o.ground, action: 'walk', brs: true };   // out the door
  }
  if (tLv < lv) {
    // Down through this floor's stairwell gap, as far in as the wall allows.
    return lv === 2 ? { x: 1866, y: 770, action: 'drop', brs: true } : { x: 2095, y: o.ground, action: 'drop', brs: true };
  }
  // Up: one level at a time, a short hop (vy 15 rises ~170px, a floor is 130) steered in the air to a landing
  // spot on the next floor. Floors are one-way, so the hop passes up through the one overhead. A full jump
  // would clear two floors and could carry the bot over the roof.
  if (lv >= 2) return { x: tx, y: BR_OFFICE_LEVELS[lv], action: 'walk', brs: true };   // top floor: the roof is solid overhead
  var land = lv === 0 ? 1950 : 2010;
  if (!bot.onGround) return { x: bx, y: BR_OFFICE_LEVELS[lv], action: 'walk', brs: true };
  bot._brsAir = { x: land, y: BR_OFFICE_LEVELS[lv + 1], action: 'jump', vy: 15, brs: true };
  return bot._brsAir;
}

// Bot routes over and into the volcano
// The graph sees the crust under the mountain as one floor, so without this a bot walks "through" the rock,
// which in practice means up a slope and off the rim into the pit. Anyone on or around the mountain (or headed
// for the pit) is routed here instead: walk the slopes, jump the crater from a rim, step off a rim into the
// pit, and climb out floor -> left ledge -> right ledge -> right rim. 'walk' waypoints carry the bot's own feet
// height, so _brNavStep doesn't read an uphill slope as a reason to jump.
function _brsVolcZone(x, feet) {
  var V = BR_VOLC;
  return x > V.baseL - 40 && x < V.baseR + 40 && feet > V.top - 40 && feet < V.ground + 8;
}

function _brsVolcanoWaypoint(bot, tx, ty) {
  var V = BR_VOLC, bx = bot.cx(), feet = bot.y + bot.h, tFeet = ty + 42;
  var botZone = _brsVolcZone(bx, feet);
  // ty is a mid-body height, and a fake target (a chest, a goal) sits a little lower than a fighter would: clamp
  // the feet estimate to the pit floor so something standing on it still reads as in the pit.
  var tPit = ty > V.top && _brsInPit(tx, Math.min(tFeet, V.ground)), botPit = _brsInPit(bx, feet);
  var tDeep = ty > V.ground + 60;
  var surface = feet > V.ground - 60 && feet < V.ground + 8;

  // Mid-jump: keep the plan until landing. The last hop up the shaft steers: straight up the vent until the
  // feet clear the crust, then over onto the pit floor.
  if (!bot.onGround && bot._brsVolcAir) {
    var A = bot._brsVolcAir;
    if (A.shaft) return { x: feet > V.ground - 4 ? BR_VOLC_CRATER.x : V.pitL + 70, y: V.ground, action: 'walk', brs: true };
    return A;
  }
  if (bot.onGround) bot._brsVolcAir = null;
  var hop = function (x, y, vy, extra) {
    bot._brsVolcAir = Object.assign({ x: x, y: y, action: 'jump', vy: vy || 15, spd: 6, brs: true }, extra || {});
    return bot._brsVolcAir;
  };

  // Up the shaft from the Volcano Depths into the pit: depths floor -> 1380 -> 1240 -> 1100 -> 1000 -> pit floor.
  var inShaft = bx > V.ventL - 140 && bx < V.ventR + 140 && feet > V.ground + 60 && feet < BR_CAVE_FLOOR_Y + 8;
  var inDepths = bx > BR_VOLC_X0 && bx < BR_VOLC_X1 && feet > V.ground + 60 && feet < BR_CAVE_FLOOR_Y + 8;
  var tUp = tPit || (!tDeep && (_brsVolcZone(tx, Math.min(tFeet, V.ground)) || (ty < V.ground && Math.abs(tx - BR_VOLC_CRATER.x) < 1300)));
  // In the Volcano Depths, headed up to the mountain or the ground around it: the way up is the shaft.
  if (inDepths && !inShaft && tUp && bot.onGround) return { x: 4935, y: feet, action: 'walk', brs: true };
  // In the shaft, headed down: walk off the steps' left ends, one after another, to the cavern floor.
  if (inShaft && tDeep && !tPit) {
    if (feet > BR_CAVE_FLOOR_Y - 20) return null;   // down: the graph takes it from the cavern floor
    return { x: 4830, y: BR_CAVE_FLOOR_Y, action: 'drop', brs: true };
  }
  if (inShaft && tUp) {
    // Airborne without a plan (thrown, bounced): keep heading for the bottom of the climb.
    if (!bot.onGround) return { x: feet > 1450 ? 4935 : bx, y: feet, action: 'walk', brs: true };
    if (feet > 1450) {
      if (Math.abs(bx - 4935) > 50) return { x: 4935, y: feet, action: 'walk', brs: true };   // under the first step
      return hop(4935, 1380);
    }
    if (feet > 1310) return hop(5015, 1255);
    if (feet > 1200) return hop(4935, 1155);
    if (feet > 1110) return hop(4950, 1066);
    // On the top step, under the vent. Line up under its left half, then jump and steer onto the floor.
    if (Math.abs(bx - BR_VOLC_CRATER.x) > 10) return { x: BR_VOLC_CRATER.x, y: feet, action: 'walk', brs: true };
    return hop(BR_VOLC_CRATER.x, V.ground, 18, { shaft: true });   // 166px up to the pit floor, then over onto it
  }

  // Crossing the mountain from off it: head for its foot (the graph sees no surface path over the vent).
  if (!botZone && !botPit && surface && !tPit && !tDeep) {
    var across = (bx < V.baseL && tx > V.baseR) || (bx > V.baseR && tx < V.baseL);
    if (across && Math.abs(bx - BR_VOLC_CRATER.x) < 1700) return { x: bx < V.baseL ? V.baseL + 40 : V.baseR - 40, y: feet, action: 'walk', brs: true };
  }
  if (!botZone && !tPit) return null;
  if (botPit && tDeep) return { x: BR_VOLC_CRATER.x, y: V.ground + 100, action: 'drop', brs: true };
  if (!botZone && !botPit) return null;   // approaching from elsewhere toward the pit: the graph's job until on the mountain

  if (botPit) {
    // Same shelf or lower: walk to it. Higher, or out: climb.
    var tFloor = Math.min(tFeet, V.ground);
    if (tPit && tFloor > feet + 40 && bot.onGround) {
      // Below this ledge: step off its open side (the left ledge's right end, the right ledge's left end).
      if (feet < 730) return { x: 4995, y: V.ground, action: 'drop', brs: true };
      if (feet < 840) return { x: 4895, y: V.ground, action: 'drop', brs: true };
    }
    if (tPit && tFloor >= feet - 20) return { x: tx, y: feet, action: 'walk', brs: true };
    if (!bot.onGround) return { x: bx, y: feet, action: 'walk', brs: true };
    if (feet > 840) return bx < V.ventL ? hop(4835, 790, 15) : hop(4840, 790, 17);   // floor -> left ledge (across the vent from the right)
    if (feet > 730) return hop(5065, 680, 17);                                       // left ledge -> right ledge
    return hop(5080, V.top, 15);                                                      // right ledge -> up through the rim's lip
  }

  // Outside: on a slope, a rim, or the ground at the foot.
  var side = bx < BR_VOLC_CRATER.x ? -1 : 1;
  var rimEdge = side < 0 ? V.rimL1 - 8 : V.rimR0 + 8;          // the crater-side end of this rim
  var onRim = Math.abs(feet - V.top) < 6 && (side < 0 ? bx >= V.rimL0 - 4 : bx <= V.rimR1 + 4);
  if (tPit) {
    // Into the pit: up to this side's rim, then step off its crater edge.
    if (onRim && Math.abs(bx - rimEdge) < 26) return { x: side < 0 ? V.rimL1 + 40 : V.rimR0 - 40, y: V.ground, action: 'drop', brs: true };   // clear of the lip, onto the floor beside the vent
    return { x: rimEdge, y: feet, action: 'walk', brs: true };
  }
  var tSide = tx < BR_VOLC_CRATER.x ? -1 : 1;
  if (tSide === side) {
    // Same side: walk to it along the slope. Off the mountain entirely: let the graph take over at the foot.
    if (!_brsVolcZone(tx, tFeet) && (side < 0 ? bx < V.baseL : bx > V.baseR)) return null;
    return { x: tx, y: feet, action: 'walk', brs: true };
  }
  // Other side: up to the rim's crater edge and jump the crater to the far rim.
  // A full jump: the crater is 180px, and the slowest bots (3.6px/frame) need a jump's whole airtime to clear it.
  // Jump as soon as within 50px of the edge: an AI decision can come several frames apart, and waiting for the
  // last few px walked bots off the rim before the jump fired.
  if (onRim && (side < 0 ? bx > V.rimL1 - 50 : bx < V.rimR0 + 50)) return hop(side < 0 ? V.rimR0 + 25 : V.rimL1 - 25, V.top, 20);
  return { x: rimEdge, y: feet, action: 'walk', brs: true };
}

// Temple
const BR_PILLAR_H = 198;   // pillar height: the ground (900) up to the portico roof's underside (702)

function _brsUpdateTemple(all) {
  var T = BR_TEMPLE;
  // Plates: anyone standing on one (feet on its surface, centre over it).
  var plates = [false, false];
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (!f || f.health <= 0 || f._brSleep || f._brOnPlane || typeof f.cx !== 'function' || !f.onGround) continue;
    var x = f.cx(), feet = f.y + f.h;
    if (x >= T.plateOut[0] && x <= T.plateOut[1] && Math.abs(feet - T.ground) < 6) plates[0] = true;
    if (x >= T.plateIn[0] && x <= T.plateIn[1] && Math.abs(feet - T.ground) < 6) plates[1] = true;
  }
  if ((plates[0] && !brTemplePlates[0]) || (plates[1] && !brTemplePlates[1])) {
    if (_brsOnScreen(T.vaultL, 850, 200) && typeof SoundManager !== 'undefined' && SoundManager.thud) SoundManager.thud();
  }
  brTemplePlates = plates;
  if (plates[0] || plates[1]) brTempleHold = BR_TEMPLE_DOOR_HOLD;
  else if (brTempleHold > 0) brTempleHold--;
  var want = brTempleHold > 0 ? 1 : 0;
  brTempleDoor += Math.max(-0.05, Math.min(0.08, want - brTempleDoor));
  if (_brsDoorPl) {
    // The slab's drawing slides; its collision box stays in the doorway and is only solid once fully down. Someone
    // standing in the doorway as it lands is pushed out to whichever side is nearer (least penetration).
    _brsDoorPl.isFloorDisabled = brTempleDoor > 0.08;
  }
  // Reveal the vault to a viewer inside.
  var v = _brsViewer();
  var inV = v && typeof v.cx === 'function' && _brsInVault(v.cx(), v.y + v.h);
  brTempleReveal += ((inV ? 1 : 0) - brTempleReveal) * 0.14;

  // Pillars going over: they swing down from the base; at the moment they hit the ground, anyone under the
  // sweep is crushed (dealDamage, null attacker) and thrown along the fall.
  for (var p = 0; p < brPillars.length; p++) {
    var P = brPillars[p];
    if (P.state !== 'fall') continue;
    P.t++;
    if (P.t === 26 && !P.hitDone) {
      P.hitDone = true;
      var base = P.x + P.w / 2, end = base + P.dir * BR_PILLAR_H;
      var lo = Math.min(base, end), hi = Math.max(base, end);
      for (var k = 0; k < all.length; k++) {
        var g = all[k];
        if (!g || g.health <= 0 || g._brSleep || g._brOnPlane || typeof g.cx !== 'function') continue;
        var gx = g.cx(), gf = g.y + g.h;
        if (gx < lo - 12 || gx > hi + 12 || gf < T.ground - 60 || gf > T.ground + 6) continue;
        if (typeof dealDamage === 'function') dealDamage(null, g, 16, 0);
        g.vx = P.dir * 9; g.vy = Math.min(g.vy || 0, -8);
      }
      _brsShards(lo, T.ground - 20, hi - lo, 14, P.dir, 10, '#c8b48a', 'chunk');
      _brsShards(lo, T.ground - 10, hi - lo, 10, P.dir, 6, '#a89470', 'dust');
      if (_brsOnScreen(base, T.ground - 60, 300)) {
        if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
      }
    }
    if (P.t >= 40) P.state = 'down';
  }
}

// Behind the fighters: back wall, pediment, pillars, the vault's interior.
function _brsDrawTemple() {
  var T = BR_TEMPLE, G = T.ground, R = T.roof, fc = _brsFrame();
  if (!_brsOnScreen((T.x0 + T.x1) / 2, 790, 500)) return;
  // Back wall of the portico.
  ctx.fillStyle = '#5e4f38';
  ctx.fillRect(T.x0, R, T.vaultL - T.x0, G - R);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
  for (var by = R + 22; by < G; by += 22) { ctx.beginPath(); ctx.moveTo(T.x0, by); ctx.lineTo(T.vaultL, by); ctx.stroke(); }
  // Pediment above the roof line.
  ctx.fillStyle = '#9a865f';
  ctx.beginPath(); ctx.moveTo(T.x0 - 12, R); ctx.lineTo((T.x0 + T.x1) / 2, R - 70); ctx.lineTo(T.x1 + 12, R); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6e5d40'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,214,120,0.55)'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
  ctx.fillText('THE VAULT', (T.x0 + T.x1) / 2, R - 22);
  // Vault interior: dark stone lit gold by the treasure.
  var ix0 = T.vaultL + T.wallW, ix1 = T.vaultR - T.wallW;
  ctx.fillStyle = '#2a2117'; ctx.fillRect(T.vaultL, R + 12, ix1 - T.vaultL, G - R - 12);   // from the doorway in, so an open door shows the vault, not sky
  var gg = ctx.createRadialGradient((T.shelf[0] + T.shelf[1]) / 2, T.shelf[2], 4, (T.shelf[0] + T.shelf[1]) / 2, T.shelf[2], 120);
  gg.addColorStop(0, 'rgba(255,200,90,' + (0.35 + 0.08 * Math.sin(fc * 0.06)).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = gg; ctx.fillRect(ix0, R + 12, ix1 - ix0, G - R - 12);
  ctx.fillStyle = '#7a6440'; ctx.fillRect(T.shelf[0], T.shelf[2], T.shelf[1] - T.shelf[0], 10);
  // Inner plate.
  _brsDrawPlate(T.plateIn[0], T.plateIn[1], G, brTemplePlates[1]);
  // Pillars.
  for (var i = 0; i < brPillars.length; i++) _brsDrawPillar(brPillars[i]);
}

function _brsDrawPlate(x0, x1, y, on) {
  ctx.fillStyle = on ? '#ffd27a' : '#8a7550';
  ctx.fillRect(x0, y - (on ? 2 : 5), x1 - x0, on ? 2 : 5);
  if (on) { ctx.fillStyle = 'rgba(255,210,120,0.25)'; ctx.fillRect(x0 - 6, y - 14, x1 - x0 + 12, 12); }
}

function _brsDrawPillar(P) {
  var T = BR_TEMPLE, top = T.ground, base = P.x + P.w / 2;
  if (P.state === 'down') {
    // Drums lying where it fell.
    ctx.fillStyle = '#b8a47a';
    for (var d = 0; d < 4; d++) {
      var dx = base + P.dir * (20 + d * 40);
      ctx.beginPath(); ctx.ellipse(dx, T.ground - 9, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  var ang = P.state === 'fall' ? P.dir * Math.min(Math.PI / 2, (P.t / 26) * (P.t / 26) * Math.PI / 2) : 0;
  ctx.save();
  ctx.translate(base, top); ctx.rotate(ang);
  var H = BR_PILLAR_H;
  ctx.fillStyle = '#cdb98c'; ctx.fillRect(-P.w / 2, -H, P.w, H);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (var f = -P.w / 2 + 4; f < P.w / 2; f += 6) ctx.fillRect(f, -H, 2, H);      // fluting
  ctx.fillStyle = '#b09c70'; ctx.fillRect(-P.w / 2 - 4, -H - 8, P.w + 8, 8); ctx.fillRect(-P.w / 2 - 3, -6, P.w + 6, 6);
  // Cracks as it takes hits.
  var n = Math.floor((1 - Math.max(0, P.hp) / P.maxHp) * 5);
  ctx.strokeStyle = 'rgba(40,30,20,0.9)'; ctx.lineWidth = 1.6;
  for (var c = 0; c < n; c++) {
    var cy = -H + 20 + ((c * 37 + P.seed) % (H - 40));
    ctx.beginPath(); ctx.moveTo(-P.w / 2, cy); ctx.lineTo(0, cy + 8); ctx.lineTo(P.w / 2, cy + 3); ctx.stroke();
  }
  ctx.restore();
}

// In front of the fighters: the roof slab, the vault's face (fades when the viewer is inside), the door, the plate.
function _brsDrawTempleFront() {
  var T = BR_TEMPLE, G = T.ground, R = T.roof;
  if (!_brsOnScreen((T.x0 + T.x1) / 2, 790, 500)) return;
  // Vault face.
  var a = 1 - brTempleReveal;
  if (a > 0.02) {
    ctx.globalAlpha = a;
    ctx.fillStyle = '#8a7652';
    ctx.fillRect(T.vaultL + T.wallW, R + 12, T.vaultR - T.vaultL - T.wallW * 2, G - R - 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5;
    for (var by = R + 30; by < G; by += 24) { ctx.beginPath(); ctx.moveTo(T.vaultL, by); ctx.lineTo(T.vaultR, by); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,200,90,0.5)'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText('◆', (T.vaultL + T.vaultR) / 2, (R + G) / 2 + 8);
    ctx.globalAlpha = 1;
  }
  // Walls.
  ctx.fillStyle = '#7a6848';
  ctx.fillRect(T.vaultL, R + 12, T.wallW, G - T.doorH - R - 12);
  ctx.fillRect(T.vaultR - T.wallW, R + 12, T.wallW, G - R - 12);
  // Door: a slab that slides up into the wall.
  var dy = G - T.doorH - brTempleDoor * (T.doorH - 6);   // slides up into the wall above
  ctx.fillStyle = '#5a4a32'; ctx.fillRect(T.vaultL, dy, T.wallW, T.doorH);
  ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.strokeRect(T.vaultL + 4, dy + 4, T.wallW - 8, T.doorH - 8);
  // Roof slab over everything.
  ctx.fillStyle = '#a8946a'; ctx.fillRect(T.x0 - 12, R, T.x1 - T.x0 + 24, 12);
  ctx.fillStyle = '#c8b48a'; ctx.fillRect(T.x0 - 12, R, T.x1 - T.x0 + 24, 3);
  _brsDrawPlate(T.plateOut[0], T.plateOut[1], G, brTemplePlates[0]);
}

// Bot routes into and out of the vault: stand on a plate until the door is up, then walk through.
function _brsTempleWaypoint(bot, tx, ty) {
  var T = BR_TEMPLE, bx = bot.cx(), feet = bot.y + bot.h;
  var near = bx > T.x0 - 200 && bx < T.x1 + 200 && feet > T.roof && feet < T.ground + 6;
  if (!near) return null;
  var botV = _brsInVault(bx, feet), tV = _brsInVault(tx, Math.min(ty + 25, T.ground));
  if (botV === tV) return null;
  var open = brTempleDoor > 0.75;
  if (!botV) {
    // Outside, going in: onto the plate under the portico, then through the door once it's up.
    if (open && bx > T.x0 - 20) return { x: (T.vaultL + T.vaultR) / 2, y: T.ground, action: 'walk', brs: true };
    return { x: (T.plateOut[0] + T.plateOut[1]) / 2, y: feet, action: 'walk', brs: true };
  }
  // Inside, going out: the inner plate, then out the door.
  if (open) return { x: T.x0 - 60, y: T.ground, action: 'walk', brs: true };
  return { x: (T.plateIn[0] + T.plateIn[1]) / 2, y: T.ground, action: 'walk', brs: true };
}

// Rope bridge
function _brsInGorge(x) { return x > BR_BRIDGE.x0 && x < BR_BRIDGE.x1; }

function _brsUpdateBridge(all) {
  var B = BR_BRIDGE, st = brBridge;
  // Who is on the deck: feet on it, centre over it. Sleeping bots don't count (they never fall), and they are
  // kept off it while it's down.
  var on = [];
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (!f || f.health <= 0 || f._brOnPlane || typeof f.cx !== 'function') continue;
    var x = f.cx(), feet = f.y + f.h;
    if (f._brSleep) {
      if (st.state !== 'up' && _brsInGorge(x) && Math.abs(feet - B.y) < 10) {
        f.x = (x < (B.x0 + B.x1) / 2 ? B.x0 - 30 : B.x1 + 30) - f.w / 2;
      }
      continue;
    }
    if (st.state === 'up' && _brsInGorge(x) && Math.abs(feet - B.y) < 8 && (f.vy || 0) >= -0.5) on.push(f);
  }
  st.count = on.length;
  st.sway += ((st.count >= B.holds ? 1 : st.count / B.holds * 0.4) - st.sway) * 0.08;

  if (st.state === 'up') {
    if (st.count > B.holds) {
      st.state = 'snap'; st.t = 0;
      if (_brsBridgePl) _brsBridgePl.isFloorDisabled = true;
      for (var k = 0; k < on.length; k++) { on[k].onGround = false; on[k].vy = Math.max(on[k].vy || 0, 3); }
      _brsShards(B.x0 + 40, B.y - 6, B.x1 - B.x0 - 80, 10, 0, 18, '#8a6a44', 'chunk');
      var mid = (B.x0 + B.x1) / 2;
      if (_brsOnScreen(mid, B.y, 300)) {
        if (typeof SoundManager !== 'undefined' && SoundManager.hitSnap) SoundManager.hitSnap();
        if (typeof SoundManager !== 'undefined' && SoundManager.thud) SoundManager.thud();
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 7);
        brBridgeBanner = 150;
      }
    }
  } else {
    st.t++;
    if (st.state === 'snap' && st.t >= BR_BRIDGE_SNAP_F) { st.state = 'down'; st.t = 0; }
    else if (st.state === 'down' && st.t >= BR_BRIDGE_DOWN_F) { st.state = 'tie'; st.t = 0; }
    else if (st.state === 'tie' && st.t >= BR_BRIDGE_TIE_F) {
      st.state = 'up'; st.t = 0;
      if (_brsBridgePl) _brsBridgePl.isFloorDisabled = false;
    }
  }

  // The gorge has no floor. Past killY a faller is gone, credited to whoever last hit them (as a lethal tick would be).
  for (var j = 0; j < all.length; j++) {
    var g = all[j];
    if (!g || g.health <= 0 || g._brOnPlane || typeof g.cx !== 'function') continue;
    var gx = g.cx();
    if (gx < B.bandL || gx > B.bandR || g.y < B.killY || g.y > BR_CAVE_FLOOR_Y) continue;
    if (typeof spawnParticles === 'function' && _brsOnScreen(gx, B.killY, 200)) spawnParticles(gx, B.killY, '#bfefff', 14);
    g.health = 0;   // falling out of the world, like _brCheckVoidDeaths: not a hit, so not dealDamage()
    if (typeof _brCreditElimination === 'function') _brCreditElimination(null, g);
  }
}

// Halves' hang angle: 0 = level, PI/2 = hanging straight down from the post.
function _brsBridgeAngle() {
  var st = brBridge, t = st.t;
  if (st.state === 'up') return 0;
  if (st.state === 'snap') return Math.PI / 2 * (1 - Math.exp(-t / 9) * Math.cos(t / 5));
  if (st.state === 'down') return Math.PI / 2 + Math.sin(t * 0.05) * 0.04 * Math.exp(-t / 300);
  var k = t / BR_BRIDGE_TIE_F;
  return Math.PI / 2 * (1 - k * k * (3 - 2 * k));
}

// Bot routes: with the bridge down, wait at your own edge instead of walking into the gorge. _brNavStep bans a
// goal that stops getting closer, so a waiting bot soon picks something else.
function _brsBridgeWaypoint(bot, tx, ty) {
  if (brBridge.state === 'up') return null;
  var B = BR_BRIDGE, bx = bot.cx(), feet = bot.y + bot.h;
  if (bx < B.x0 - 260 || bx > B.x1 + 260 || Math.abs(feet - B.y) > 40) return null;
  if (Math.abs(ty - B.y) > 320) return null;
  var crossing = (bx <= B.x0 && tx > B.x0) || (bx >= B.x1 && tx < B.x1);
  if (!crossing) return null;
  return { x: bx <= B.x0 ? B.x0 - 40 : B.x1 + 40, y: B.y, action: 'walk', brs: true };
}

// Behind the fighters: the gorge, the posts, the far rope and the deck.
function _brsDrawBridge() {
  var B = BR_BRIDGE, mid = (B.x0 + B.x1) / 2, fc = _brsFrame();
  if (!_brsOnScreen(mid, B.y + 100, 600)) return;
  // The gorge: ice walls falling away into dark, mist hiding the bottom.
  var gg = ctx.createLinearGradient(0, B.y, 0, B.killY + 160);
  gg.addColorStop(0, '#24465c'); gg.addColorStop(0.45, '#0e1d2a'); gg.addColorStop(1, '#03070c');
  ctx.fillStyle = gg;
  ctx.fillRect(B.x0, B.y, B.x1 - B.x0, BR_DEATH_Y + 200 - B.y);
  ctx.fillStyle = '#6aa8c4';
  [[B.x0, 1], [B.x1, -1]].forEach(function (side) {
    var sx = side[0], d = side[1];
    ctx.beginPath(); ctx.moveTo(sx, B.y);
    for (var y = B.y; y <= B.killY + 200; y += 40) ctx.lineTo(sx + d * (10 + ((y * 7 + sx) % 23)), y + 20);
    ctx.lineTo(sx, B.killY + 220); ctx.closePath();
    ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
  });
  var mg = ctx.createLinearGradient(0, B.killY - 140, 0, B.killY + 40);
  mg.addColorStop(0, 'rgba(190,235,255,0)'); mg.addColorStop(1, 'rgba(190,235,255,0.35)');
  ctx.fillStyle = mg; ctx.fillRect(B.x0, B.killY - 140, B.x1 - B.x0, 180);
  ctx.fillStyle = '#03070c'; ctx.fillRect(B.x0, B.killY + 40, B.x1 - B.x0, BR_DEATH_Y - B.killY);

  _brsDrawBridgePosts();
  _brsDrawBridgeRope(-6, 'rgba(120,90,60,0.8)');
  // Deck: two halves hinged at the posts.
  var ang = _brsBridgeAngle(), half = (B.x1 - B.x0) / 2;
  var sag = brBridge.state === 'up' ? brBridge.sway * 1.5 * Math.sin(fc * 0.21) : 0;
  [[B.x0, 1], [B.x1, -1]].forEach(function (side) {
    ctx.save();
    // Hanging, the planks sit inside the gorge, not over the rock face.
    ctx.translate(side[0] + side[1] * 8 * Math.min(1, ang / (Math.PI / 2)), B.y);
    ctx.rotate(side[1] * ang);
    ctx.scale(side[1], 1);
    for (var px = 2; px < half - 1; px += 15) {
      var bend = brBridge.state === 'up' ? Math.sin(px / half * Math.PI / 2) * sag : 0;
      ctx.fillStyle = (Math.floor(px / 15) % 3 === 1) ? '#7a5a3a' : '#8e6a44';
      ctx.fillRect(px, bend - 1, 12, 8);
    }
    ctx.restore();
  });
}

function _brsDrawBridgePosts() {
  var B = BR_BRIDGE;
  [B.x0 - 14, B.x1 + 4].forEach(function (px) {
    ctx.fillStyle = '#5e4128'; ctx.fillRect(px, B.y - 74, 10, 78);
    ctx.fillStyle = '#7a5636'; ctx.fillRect(px - 2, B.y - 78, 14, 6);
  });
}

// A handrail: sags between the post tops while the bridge stands, hangs with the halves when it's down.
function _brsDrawBridgeRope(dy, color) {
  var B = BR_BRIDGE, ang = _brsBridgeAngle(), top = B.y - 64 + dy, fc = _brsFrame();
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  if (ang < 0.02) {
    var mid = (B.x0 + B.x1) / 2, sway = brBridge.sway * 3 * Math.sin(fc * 0.21);
    ctx.beginPath(); ctx.moveTo(B.x0 - 9, top); ctx.quadraticCurveTo(mid, top + 70 + sway, B.x1 + 9, top); ctx.stroke();
    // Hangers down to the deck.
    ctx.lineWidth = 1;
    for (var x = B.x0 + 30; x < B.x1 - 20; x += 46) {
      var u = (x - B.x0) / (B.x1 - B.x0);
      ctx.beginPath(); ctx.moveTo(x, top + (70 + sway) * 2 * u * (1 - u)); ctx.lineTo(x, B.y); ctx.stroke();
    }
    return;
  }
  // Snapped: each half of the rope follows its half of the deck down.
  var half = (B.x1 - B.x0) / 2;
  [[B.x0, 1, B.x0 - 9], [B.x1, -1, B.x1 + 9]].forEach(function (side) {
    var ex = side[0] + side[1] * Math.cos(ang) * half, ey = B.y + Math.sin(ang) * half;
    ctx.beginPath(); ctx.moveTo(side[2], top);
    ctx.quadraticCurveTo(side[0] + side[1] * 20, (top + ey) / 2, ex, ey - 20);
    ctx.stroke();
  });
}

// In front of the fighters: the near rope and the signs.
function _brsDrawBridgeFront() {
  var B = BR_BRIDGE;
  if (!_brsOnScreen((B.x0 + B.x1) / 2, B.y, 600)) return;
  _brsDrawBridgeRope(4, '#a07a50');
  _brsDrawBridgeSign(B.x0 - 9);
  _brsDrawBridgeSign(B.x1 + 9);
}

// "HOLDS 4" and one pip per person on the deck. Full = red and pulsing; snapped = the count is gone.
function _brsDrawBridgeSign(cx) {
  var B = BR_BRIDGE, st = brBridge, fc = _brsFrame();
  var w = 80, h = 52, x = cx - w / 2, y = B.y - 150;
  ctx.fillStyle = '#5e4128'; ctx.fillRect(cx - 3, y + h, 6, B.y - 78 - (y + h));
  ctx.fillStyle = '#d9c39a'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5e4128'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3a2614'; ctx.font = 'bold 15px Arial';
  ctx.fillText('HOLDS ' + B.holds, cx, y + 19);
  if (st.state !== 'up') {
    ctx.fillStyle = '#c0281e'; ctx.font = 'bold 14px Arial';
    ctx.fillText('SNAPPED', cx, y + 41);
    return;
  }
  var full = st.count >= B.holds;
  for (var i = 0; i < B.holds; i++) {
    var lit = i < st.count;
    ctx.fillStyle = !lit ? 'rgba(58,38,20,0.25)' : full ? (fc % 20 < 10 ? '#ff2a1a' : '#a8140c') : '#2a7a3a';
    ctx.beginPath(); ctx.arc(cx - 27 + i * 18, y + 37, 6, 0, Math.PI * 2); ctx.fill();
  }
}
